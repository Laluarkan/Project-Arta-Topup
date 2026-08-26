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

    // FUNGSI BARU: Logika Margin Berjenjang (Tiered Pricing)
    private function calculatePrice($basePrice, $role = 'member')
    {
        $margin = 0;

        if ($basePrice < 10000) {
            $margin = 1500;       // Modal di bawah 10rb -> Untung Rp1.500
        } elseif ($basePrice < 30000) {
            $margin = 2000;       // Modal 10rb - 30rb -> Untung Rp2.000
        } elseif ($basePrice < 60000) {
            $margin = 3000;       // Modal 30rb - 60rb -> Untung Rp3.000
        } elseif ($basePrice < 100000) {
            $margin = 4000;       // Modal 60rb - 100rb -> Untung Rp4.000
        } else {
            $margin = 5500;       // Modal 100rb ke atas -> Untung Rp5.500
        }

        // Reseller mendapat diskon harga (potong margin)
        if ($role === 'reseller') {
            $margin -= 500;
        }

        return $basePrice + $margin;
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

    public function cekStatus($buyerSkuCode, $customerNo, $refId)
    {
        $config = $this->getApiConfig();
        $sign = md5($config['username'] . $config['key'] . $refId);

        $response = Http::post('https://api.digiflazz.com/v1/transaction', [
            'username' => $config['username'],
            'buyer_sku_code' => $buyerSkuCode,
            'customer_no' => $customerNo,
            'ref_id' => $refId,
            'sign' => $sign
        ]);

        if ($response->successful()) {
            return ['status' => true, 'data' => $response->json('data')];
        }

        return ['status' => false, 'message' => 'Gagal mengecek status transaksi'];
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
                        
                        // Memanggil fungsi logika berjenjang
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

        $response = Http::timeout(60)->post('https://api.digiflazz.com/v1/transaction', [
            'username' => $config['username'],
            'buyer_sku_code' => $buyerSkuCode,
            'customer_no' => $customerNo,
            'ref_id' => $refId,
            'sign' => $sign,
            'testing' => $config['mode'] === 'development'
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
                
            return [
                'success' => false,
                'message' => 'API Error: ' . $errorMsg,
                'data' => $errorData
            ];
        }

        $responseData = $response->json('data');

        return [
            'success' => true,
            'message' => $responseData['message'] ?? 'Berhasil menembak API',
            'data' => $responseData
        ];
    }
}