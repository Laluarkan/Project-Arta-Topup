<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Category;
use App\Models\Provider;
use App\Models\Product;
use App\Models\Setting;

class DigiflazzService
{
    private function getApiConfig()
    {
        $dbMode = Setting::where('key', 'api_mode')->value('value');
        $apiMode = $dbMode ?? (env('APP_ENV') === 'production' ? 'production' : 'development');

        return [
            'mode' => $apiMode,
            'username' => env('DIGIFLAZZ_USERNAME'),
            'key' => $apiMode === 'production' 
                ? env('DIGIFLAZZ_KEY_PROD', env('DIGIFLAZZ_KEY')) 
                : env('DIGIFLAZZ_KEY_DEV', env('DIGIFLAZZ_KEY')),
        ];
    }

    private function calculatePrice($basePrice, $role = 'member')
    {
        $dbMargin = Setting::where('key', 'margin')->value('value');
        $marginPercent = $dbMargin !== null ? (float)$dbMargin : 5;
        
        $persentaseMargin = ($role === 'member') ? ($marginPercent / 100) : (($marginPercent - 2) / 100); 
        $margin = $basePrice * $persentaseMargin;

        if ($margin < 1000) {
            $margin = 1000;
        }

        return ceil($basePrice + $margin);
    }

    public function cekSaldo()
    {
        $config = $this->getApiConfig();
        $sign = md5($config['username'] . $config['key'] . "depo");

        $response = Http::post('https://api.digiflazz.com/v1/cek-saldo', [
            'cmd' => 'deposit',
            'username' => $config['username'],
            'sign' => $sign
        ]);

        if ($response->successful()) {
            return ['status' => true, 'data' => $response->json('data')];
        }

        return ['status' => false, 'message' => 'Gagal menarik saldo'];
    }

    /**
     * Cek ulang status transaksi yang SUDAH PERNAH dikirim ke Digiflazz, dipakai oleh
     * ReconcileTransactionJob saat status awalnya ambigu (timeout/putus koneksi).
     * Digiflazz mengidentifikasi transaksi berdasarkan ref_id, jadi memanggil endpoint
     * yang sama ini dengan ref_id yang sudah ada TIDAK membuat transaksi baru / tidak
     * mengirim ulang topup — cuma menanyakan status transaksi yang sudah ada.
     *
     * Return value membedakan dua hal penting:
     * - 'ambiguous' => true  : kita masih TIDAK TAHU status sebenarnya (network error lagi).
     *                          Jangan diputuskan apa-apa, coba lagi nanti.
     * - 'ambiguous' => false : Digiflazz benar-benar merespons (meski isinya "belum ketemu"
     *                          data transaksinya, itu tetap jawaban pasti, bukan ambigu).
     */
    public function cekStatus($buyerSkuCode, $customerNo, $refId)
    {
        $config = $this->getApiConfig();
        $sign = md5($config['username'] . $config['key'] . $refId);

        try {
            $response = Http::timeout(30)->post('https://api.digiflazz.com/v1/transaction', [
                'username' => $config['username'],
                'buyer_sku_code' => $buyerSkuCode,
                'customer_no' => $customerNo,
                'ref_id' => $refId,
                'sign' => $sign
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::warning("DigiflazzService::cekStatus timeout/putus koneksi untuk ref_id {$refId}: " . $e->getMessage());
            return ['status' => false, 'ambiguous' => true, 'message' => 'Tidak bisa menghubungi Digiflazz untuk cek status.'];
        }

        if ($response->successful()) {
            return ['status' => true, 'ambiguous' => false, 'data' => $response->json('data')];
        }

        return ['status' => false, 'ambiguous' => false, 'message' => 'Gagal mengecek status transaksi'];
    }

    public function requestDeposit($amount, $bank, $ownerName)
    {
        $config = $this->getApiConfig();
        $sign = md5($config['username'] . $config['key'] . "deposit");

        $response = Http::post('https://api.digiflazz.com/v1/deposit', [
            'username' => $config['username'],
            'amount' => $amount,
            'Bank' => $bank,
            'owner_name' => $ownerName,
            'sign' => $sign
        ]);

        if ($response->successful()) {
            return ['status' => true, 'data' => $response->json('data')];
        }

        return ['status' => false, 'message' => 'Gagal request deposit'];
    }

    public function syncProducts()
    {
        ini_set('max_execution_time', 0);
        ini_set('memory_limit', '-1');

        $config = $this->getApiConfig();
        $sign = md5($config['username'] . $config['key'] . "pricelist");

        $response = Http::timeout(120)->post('https://api.digiflazz.com/v1/price-list', [
            'cmd' => 'prepaid',
            'username' => $config['username'],
            'sign' => $sign
        ]);

        if (!$response->successful()) {
            $errorData = $response->json();
            $errorMsg = $response->body();
            
            if (is_array($errorData)) {
                if (isset($errorData['data']) && is_string($errorData['data'])) {
                    $errorMsg = $errorData['data'];
                } elseif (isset($errorData['data']['message'])) {
                    $errorMsg = $errorData['data']['message'];
                } else {
                    $errorMsg = json_encode($errorData);
                }
            }
                
            return ['status' => false, 'message' => 'API Error: ' . $errorMsg];
        }

        $data = $response->json('data');

        if (isset($data['rc']) || (isset($data['message']) && !isset($data[0]['buyer_sku_code']))) {
            return [
                'status' => false, 
                'message' => 'Digiflazz Menolak: ' . ($data['message'] ?? json_encode($data))
            ];
        }

        if (!$data || !is_array($data)) {
            return ['status' => false, 'message' => 'Tidak ada data produk yang diterima'];
        }

        $provider = Provider::firstOrCreate(
            ['name' => 'Digiflazz'],
            ['is_active' => true, 'api_config' => []]
        );

        $syncedCount = 0;

        DB::beginTransaction();
        
        try {
            foreach ($data as $item) {
                if (!isset($item['brand']) || !isset($item['buyer_sku_code'])) {
                    continue;
                }

                $category = Category::firstOrCreate(
                    ['name' => $item['brand']],
                    ['is_active' => true]
                );

                $stockStatus = $item['seller_product_status'] ? 'available' : 'empty';

                Product::updateOrCreate(
                    [
                        'buyer_sku_code' => $item['buyer_sku_code'],
                        'provider_id' => $provider->id,
                    ],
                    [
                        'category_id' => $category->id,
                        'product_name' => $item['product_name'],
                        'provider_price' => $item['price'],
                        'price_member' => $this->calculatePrice($item['price'], 'member'),
                        'price_reseller' => $this->calculatePrice($item['price'], 'reseller'),
                        'stock_status' => $stockStatus,
                        'is_active' => $stockStatus === 'available' ? true : false,
                    ]
                );
                
                $syncedCount++;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error sync Digiflazz: ' . $e->getMessage());
            return ['status' => false, 'message' => 'Gagal sinkronisasi karena masalah database.'];
        }

        return ['status' => true, 'message' => "Berhasil sinkronisasi $syncedCount produk asli"];
    }

    public function topup($buyerSkuCode, $customerNo, $refId)
    {
        $config = $this->getApiConfig();

        if ($config['mode'] === 'development') {
            $buyerSkuCode = 'xld10';
            $customerNo = '087800001233';
            Log::info("Sandbox Interceptor AKTIF: Mengganti SKU pesanan menjadi {$buyerSkuCode} dan Tujuan menjadi {$customerNo} untuk memancing Webhook.");
        }

        $sign = md5($config['username'] . $config['key'] . $refId);

        try {
            $response = Http::timeout(60)->post('https://api.digiflazz.com/v1/transaction', [
                'username' => $config['username'],
                'buyer_sku_code' => $buyerSkuCode,
                'customer_no' => $customerNo,
                'ref_id' => $refId,
                'sign' => $sign,
                'testing' => $config['mode'] === 'development'
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // PENTING: di titik ini kita TIDAK TAHU apakah Digiflazz sempat menerima &
            // memproses request topup ini sebelum koneksinya putus. Jangan pernah anggap
            // ini "gagal pasti" — itu bisa berarti refund uang user padahal barangnya
            // sebenarnya sudah terkirim oleh Digiflazz (kerugian ganda buat kita).
            // Caller (ProcessTopupJob) WAJIB menahan status ini dan memverifikasi ulang
            // lewat cekStatus() sebelum memutuskan apa pun.
            Log::critical("DigiflazzService::topup TIMEOUT/PUTUS KONEKSI untuk ref_id {$refId} — status transaksi di sisi Digiflazz TIDAK DIKETAHUI. Wajib direkonsiliasi, JANGAN auto-refund.", [
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'ambiguous' => true,
                'message' => 'Tidak ada respons dari Digiflazz (timeout/putus koneksi). Status transaksi belum bisa dipastikan.',
                'data' => null,
            ];
        }

        if (!$response->successful()) {
            $errorData = $response->json();
            $errorMsg = $response->body();
            
            if (is_array($errorData)) {
                if (isset($errorData['data']) && is_string($errorData['data'])) {
                    $errorMsg = $errorData['data'];
                } elseif (isset($errorData['data']['message'])) {
                    $errorMsg = $errorData['data']['message'];
                } else {
                    $errorMsg = json_encode($errorData);
                }
            }
                
            // Digiflazz MERESPONS (walau isinya error, misal SKU salah/saldo kurang) —
            // ini jawaban pasti dari mereka, bukan ambigu. Aman untuk dianggap gagal final.
            return [
                'success' => false,
                'ambiguous' => false,
                'message' => 'API Error: ' . $errorMsg,
                'data' => $errorData
            ];
        }

        $responseData = $response->json('data');

        return [
            'success' => true,
            'ambiguous' => false,
            'message' => $responseData['message'] ?? 'Berhasil menembak API',
            'data' => $responseData
        ];
    }
}