<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\Setting;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Provider;
use Throwable;

class ProductController extends Controller
{
    public function index()
    {
        try {
            $products = Product::with('category')->orderBy('category_id')->get();
            return response()->json(['status' => 'success', 'data' => $products]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $request->validate([
                'price_member' => 'required|numeric|min:0',
                'is_active' => 'required|boolean',
            ]);

            $product = Product::findOrFail($id);
            
            $product->update([
                'price_member' => $request->price_member,
                'is_active' => $request->is_active,
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Mengedit Harga Produk Manual',
                'target' => 'SKU: ' . $product->buyer_sku_code
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Data produk berhasil diperbarui',
                'data' => $product
            ]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }

    public function syncProducts(Request $request)
    {
        try {
            ini_set('max_execution_time', 0);
            ini_set('memory_limit', '-1');

            // Cek Mode API dari Setting
            $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
            
            // Ambil Kredensial secara dinamis mengikuti API Mode
            $username = $apiMode === 'production' 
                ? env('DIGIFLAZZ_USERNAME_PROD', env('DIGIFLAZZ_USERNAME')) 
                : env('DIGIFLAZZ_USERNAME_DEV', env('DIGIFLAZZ_USERNAME'));
                
            $apiKey = $apiMode === 'production' 
                ? env('DIGIFLAZZ_KEY_PROD', env('DIGIFLAZZ_KEY')) 
                : env('DIGIFLAZZ_KEY_DEV', env('DIGIFLAZZ_KEY'));

            if (empty($username) || empty($apiKey)) {
                return response()->json(['status' => 'error', 'message' => 'Kredensial Digiflazz kosong. Silakan isi konfigurasi di file .env'], 400);
            }

            $marginSetting = Setting::where('key', 'margin')->first();
            $marginPercent = $marginSetting ? (float) $marginSetting->value : 0;

            $sign = md5($username . $apiKey . 'depo');
            
            $response = Http::timeout(120)->post('https://api.digiflazz.com/v1/price-list', [
                'cmd' => 'prepaid',
                'username' => $username,
                'sign' => $sign
            ]);

            $responseData = $response->json();

            if (!$response->successful() || !$responseData || !isset($responseData['data'])) {
                return response()->json(['status' => 'error', 'message' => 'Gagal menghubungi server Digiflazz. Periksa koneksi internet.'], 400);
            }

            // Mencegah crash jika Digiflazz menolak kredensial kita
            if (isset($responseData['data']['rc']) || isset($responseData['data']['message'])) {
                $errorMsg = $responseData['data']['message'] ?? 'API Key atau Username Digiflazz ditolak.';
                return response()->json(['status' => 'error', 'message' => 'Digiflazz Menolak: ' . $errorMsg], 400);
            }

            $digiProducts = $responseData['data'];
            $updatedCount = 0;

            $provider = Provider::firstOrCreate(
                ['name' => 'Digiflazz'],
                ['is_active' => true, 'api_config' => []]
            );

            DB::beginTransaction();
            
            foreach ($digiProducts as $item) {
                $category = Category::firstOrCreate(
                    ['name' => $item['brand']],
                    ['is_active' => true]
                );

                $providerPrice = $item['price'];
                $keuntungan = $providerPrice * ($marginPercent / 100);
                $finalPrice = ceil($providerPrice + $keuntungan); 
                $stockStatus = $item['seller_product_status'] ? 'available' : 'empty';

                Product::updateOrCreate(
                    [
                        'buyer_sku_code' => $item['buyer_sku_code'],
                        'provider_id' => $provider->id,
                    ],
                    [
                        'category_id' => $category->id,
                        'product_name' => $item['product_name'],
                        'provider_price' => $providerPrice,
                        'price_member' => $finalPrice,
                        'price_reseller' => $finalPrice,
                        'stock_status' => $stockStatus,
                        'is_active' => $stockStatus === 'available' ? true : false,
                    ]
                );
                
                $updatedCount++;
            }
            
            DB::commit();

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Sinkronisasi Digiflazz & Terapkan Margin',
                'target' => $updatedCount . ' Produk Diperbarui/Ditambahkan (Margin: ' . $marginPercent . '%)'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Sukses! {$updatedCount} produk berhasil ditarik dan diperbarui dengan margin {$marginPercent}%."
            ]);
        } catch (Throwable $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Sistem Error: ' . $e->getMessage()], 500);
        }
    }
}