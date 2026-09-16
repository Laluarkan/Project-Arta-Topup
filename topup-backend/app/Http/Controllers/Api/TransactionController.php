<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\User;
use App\Models\Promo;
use App\Models\Transaction;
use App\Models\WalletTransaction;
use App\Models\Setting;
use App\Jobs\ProcessTopupJob;
use App\Services\MidtransService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionController extends Controller
{
    private function isGatewayEnabled(string $gateway): bool
    {
        $raw = Setting::where('key', 'active_payment_gateways')->value('value');
        $gateways = $raw ? json_decode($raw, true) : ['wallet' => true, 'midtrans' => true, 'pakasir' => true];

        return $gateways[$gateway] ?? true;
    }

    /**
     * Cek apakah request checkout dengan idempotency_key ini sudah pernah diproses.
     * Kalau sudah, kembalikan transaksi lama (bukan bikin baru) untuk cegah checkout dobel
     * akibat double-klik atau retry otomatis dari frontend.
     */
    private function findExistingByIdempotencyKey(?string $key): ?Transaction
    {
        if (!$key) return null;
        return Transaction::where('idempotency_key', $key)->first();
    }

    public function checkoutWallet(Request $request)
    {
        if (!$this->isGatewayEnabled('wallet')) {
            return response()->json(['status' => 'error', 'message' => 'Metode pembayaran ini sedang tidak tersedia'], 503);
        }

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'user_game_id' => 'required|string',
            'zone_id' => 'nullable|string',
            'promo_code' => 'nullable|string',
            'email' => 'required|email',
            'idempotency_key' => 'nullable|string|max:100'
        ]);

        if ($existing = $this->findExistingByIdempotencyKey($request->idempotency_key)) {
            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi sudah pernah dibuat sebelumnya',
                'data' => $existing
            ]);
        }

        $product = Product::findOrFail($request->product_id);

        if (!$product->is_active || $product->stock_status !== 'available') {
            return response()->json(['status' => 'error', 'message' => 'Produk sedang tidak tersedia'], 400);
        }

        $user = $request->user();
        $price = $product->price_member;

        try {
            $transaction = DB::transaction(function () use ($request, $product, $user, $price) {
                $discount = 0;
                $promo = null;
                
                if ($request->promo_code) {
                    $promo = Promo::where('code', $request->promo_code)
                        ->where('is_active', true)
                        ->lockForUpdate()
                        ->first();
                        
                    if (!$promo) throw new \App\Exceptions\CheckoutException('Kode voucher tidak valid.');
                    if ($promo->expired_at && $promo->expired_at < now()) throw new \App\Exceptions\CheckoutException('Kode voucher sudah kedaluwarsa.');
                    if ($promo->limit !== null && $promo->limit <= 0) throw new \App\Exceptions\CheckoutException('Batas penggunaan voucher sudah habis.');
                    
                    $discount = $promo->type === 'percent' ? ($price * $promo->value / 100) : $promo->value;
                }

                $finalPrice = max(0, $price - $discount);

                $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

                if ($lockedUser->balance < $finalPrice) {
                    throw new \App\Exceptions\CheckoutException('Saldo wallet tidak mencukupi');
                }

                if ($promo && $promo->limit !== null) {
                    $promo->decrement('limit');
                }

                $balanceBefore = $lockedUser->balance;
                $lockedUser->balance -= $finalPrice;
                $lockedUser->save();

                // Generate Custom ID untuk Transaksi: TRX-Diikuti20KarakterAcak
                $trxId = 'TRX-' . Str::random(20);

                WalletTransaction::create([
                    'user_id' => $lockedUser->id,
                    'type' => 'deduction',
                    'amount' => $finalPrice,
                    'provider_price_snapshot' => $product->provider_price,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $lockedUser->balance,
                    'reference_id' => $trxId
                ]);

                // Menambahkan pencatatan discount_amount dan voucher_code
                return Transaction::create([
                    'trx_id' => $trxId,
                    'idempotency_key' => $request->idempotency_key,
                    'user_id' => $lockedUser->id,
                    'guest_email' => $request->email,
                    'product_id' => $product->id,
                    'user_game_id' => $request->user_game_id,
                    'zone_id' => $request->zone_id,
                    'amount' => $finalPrice,
                    'provider_price_snapshot' => $product->provider_price,
                    'discount_amount' => $discount,
                    'voucher_code' => $promo ? $promo->code : null,
                    'payment_method' => 'wallet',
                    'digiflazz_ref_id' => 'TRX-' . strtoupper(Str::random(10)),
                    'status' => 'PAID',
                ]);
            });

            ProcessTopupJob::dispatch($transaction->trx_id);

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi berhasil dibuat',
                'data' => $transaction
            ]);

        } catch (\App\Exceptions\CheckoutException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('Checkout system error: ' . $e->getMessage());
            } catch (\Throwable $logError) {
                // Kalau logging pun gagal (misal storage penuh/permission), jangan sampai ikut menjatuhkan response.
            }
            return response()->json(['status' => 'error', 'message' => 'Terjadi kesalahan sistem. Silakan coba lagi beberapa saat lagi.'], 500);
        }
    }

    public function checkoutMidtrans(Request $request, MidtransService $midtransService)
    {
        if (!$this->isGatewayEnabled('midtrans')) {
            return response()->json(['status' => 'error', 'message' => 'Metode pembayaran ini sedang tidak tersedia'], 503);
        }

        $request->validate([
            'idempotency_key' => 'nullable|string|max:100'
        ]);

        if ($existing = $this->findExistingByIdempotencyKey($request->idempotency_key)) {
            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi sudah pernah dibuat sebelumnya',
                'data' => ['transaction' => $existing]
            ]);
        }

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'user_game_id' => 'required|string',
            'zone_id' => 'nullable|string',
            'promo_code' => 'nullable|string',
            'email' => 'required|email'
        ]);

        $product = Product::findOrFail($request->product_id);

        if (!$product->is_active || $product->stock_status !== 'available') {
            return response()->json(['status' => 'error', 'message' => 'Produk sedang tidak tersedia'], 400);
        }

        $user = auth('sanctum')->user();
        $price = $product->price_member;

        try {
            $transaction = DB::transaction(function () use ($request, $product, $user, $price) {
                $discount = 0;
                $promo = null;
                
                if ($request->promo_code) {
                    $promo = Promo::where('code', $request->promo_code)
                        ->where('is_active', true)
                        ->lockForUpdate()
                        ->first();
                        
                    if (!$promo) throw new \App\Exceptions\CheckoutException('Kode voucher tidak valid.');
                    if ($promo->expired_at && $promo->expired_at < now()) throw new \App\Exceptions\CheckoutException('Kode voucher sudah kedaluwarsa.');
                    if ($promo->limit !== null && $promo->limit <= 0) throw new \App\Exceptions\CheckoutException('Batas penggunaan voucher sudah habis.');
                    
                    $discount = $promo->type === 'percent' ? ($price * $promo->value / 100) : $promo->value;
                }

                $finalPrice = max(0, $price - $discount);

                if ($promo && $promo->limit !== null) {
                    $promo->decrement('limit');
                }

                // Generate Custom ID untuk Transaksi: TRX-Diikuti20KarakterAcak
                $trxId = 'TRX-' . Str::random(20);

                // Menambahkan pencatatan discount_amount dan voucher_code
                return Transaction::create([
                    'idempotency_key' => $request->idempotency_key,
                    'trx_id' => $trxId,
                    'user_id' => $user ? $user->id : null,
                    'guest_email' => $request->email,
                    'product_id' => $product->id,
                    'user_game_id' => $request->user_game_id,
                    'zone_id' => $request->zone_id,
                    'amount' => $finalPrice,
                    'provider_price_snapshot' => $product->provider_price,
                    'discount_amount' => $discount,
                    'voucher_code' => $promo ? $promo->code : null,
                    'payment_method' => 'qris', 
                    'digiflazz_ref_id' => 'TRX-' . strtoupper(Str::random(10)),
                    'status' => 'PENDING',
                ]);
            });

            $snapToken = $midtransService->createSnapToken($transaction, $user);

            if (!$snapToken) {
                throw new \App\Exceptions\CheckoutException('Gagal mendapatkan token Midtrans');
            }

            $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
            $clientKey = $apiMode === 'production' 
                ? env('MIDTRANS_CLIENT_KEY_PROD', env('MIDTRANS_CLIENT_KEY')) 
                : env('MIDTRANS_CLIENT_KEY_DEV', env('MIDTRANS_CLIENT_KEY'));

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi berhasil dibuat',
                'data' => [
                    'transaction' => $transaction,
                    'snap_token' => $snapToken,
                    'api_mode' => $apiMode,
                    'client_key' => $clientKey
                ]
            ]);

        } catch (\App\Exceptions\CheckoutException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('Checkout system error: ' . $e->getMessage());
            } catch (\Throwable $logError) {
                // Kalau logging pun gagal (misal storage penuh/permission), jangan sampai ikut menjatuhkan response.
            }
            return response()->json(['status' => 'error', 'message' => 'Terjadi kesalahan sistem. Silakan coba lagi beberapa saat lagi.'], 500);
        }
    }

    public function show($trxId)
    {
        $transaction = Transaction::with('product')->where('trx_id', $trxId)->first();

        if (!$transaction) {
            return response()->json(['status' => 'error', 'message' => 'Transaksi tidak ditemukan'], 404);
        }

        // Endpoint ini sengaja publik (tanpa wajib login) supaya guest checkout tetap bisa
        // cek status pakai link trx_id-nya. Tapi kalau yang buka BUKAN pemilik transaksi
        // (atau belum login), sembunyikan sebagian emailnya demi privasi.
        $authUser = auth('sanctum')->user();
        $isOwner = $authUser && $transaction->user_id && $authUser->id === $transaction->user_id;

        if (!$isOwner && $transaction->guest_email) {
            $transaction->guest_email = $this->maskEmail($transaction->guest_email);
        }

        return response()->json([
            'status' => 'success',
            'data' => $transaction
        ]);
    }

    private function maskEmail(string $email): string
    {
        if (!str_contains($email, '@')) {
            return $email;
        }

        [$name, $domain] = explode('@', $email, 2);
        $visible = min(2, strlen($name));
        $masked = substr($name, 0, $visible) . str_repeat('*', max(strlen($name) - $visible, 3));

        return $masked . '@' . $domain;
    }

    public function getUserTransactions(Request $request)
    {
        $transactions = Transaction::with('product')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $transactions
        ]);
    }

    public function checkoutPakasir(Request $request, \App\Services\PakasirService $pakasirService)
    {
        if (!$this->isGatewayEnabled('pakasir')) {
            return response()->json(['status' => 'error', 'message' => 'Metode pembayaran ini sedang tidak tersedia'], 503);
        }

        $request->validate([
            'idempotency_key' => 'nullable|string|max:100'
        ]);

        if ($existing = $this->findExistingByIdempotencyKey($request->idempotency_key)) {
            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi sudah pernah dibuat sebelumnya',
                'data' => ['transaction' => $existing]
            ]);
        }

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'user_game_id' => 'required|string',
            'zone_id' => 'nullable|string',
            'promo_code' => 'nullable|string',
            'email' => 'required|email'
        ]);

        $product = Product::findOrFail($request->product_id);

        if (!$product->is_active || $product->stock_status !== 'available') {
            return response()->json(['status' => 'error', 'message' => 'Produk sedang tidak tersedia'], 400);
        }

        $user = auth('sanctum')->user();
        $price = $product->price_member;

        try {
            $transaction = DB::transaction(function () use ($request, $product, $user, $price) {
                $discount = 0;
                $promo = null;

                if ($request->promo_code) {
                    $promo = Promo::where('code', $request->promo_code)
                        ->where('is_active', true)
                        ->lockForUpdate()
                        ->first();

                    if (!$promo) throw new \App\Exceptions\CheckoutException('Kode voucher tidak valid.');
                    if ($promo->expired_at && $promo->expired_at < now()) throw new \App\Exceptions\CheckoutException('Kode voucher sudah kedaluwarsa.');
                    if ($promo->limit !== null && $promo->limit <= 0) throw new \App\Exceptions\CheckoutException('Batas penggunaan voucher sudah habis.');

                    $discount = $promo->type === 'percent' ? ($price * $promo->value / 100) : $promo->value;
                }

                $finalPrice = max(0, $price - $discount);

                if ($promo && $promo->limit !== null) {
                    $promo->decrement('limit');
                }

                $trxId = 'TRX-' . Str::random(20);

                return Transaction::create([
                    'idempotency_key' => $request->idempotency_key,
                    'trx_id' => $trxId,
                    'user_id' => $user ? $user->id : null,
                    'guest_email' => $request->email,
                    'product_id' => $product->id,
                    'user_game_id' => $request->user_game_id,
                    'zone_id' => $request->zone_id,
                    'amount' => $finalPrice,
                    'provider_price_snapshot' => $product->provider_price,
                    'discount_amount' => $discount,
                    'voucher_code' => $promo ? $promo->code : null,
                    'payment_method' => 'pakasir',
                    'digiflazz_ref_id' => 'TRX-' . strtoupper(Str::random(10)),
                    'status' => 'PENDING',
                ]);
            });

            $pakasirResponse = $pakasirService->createTransaction(
                $transaction->trx_id,
                $transaction->amount,
                'qris' // atau method lain sesuai pilihan user
            );

            if (!$pakasirResponse) {
                throw new \App\Exceptions\CheckoutException('Gagal membuat transaksi Pakasir');
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi berhasil dibuat',
                'data' => [
                    'transaction' => $transaction,
                    'payment_number' => $pakasirResponse['payment_number'] ?? null, // QR string / nomor VA
                    'total_payment' => $pakasirResponse['total_payment'] ?? null,   // amount + fee
                    'fee' => $pakasirResponse['fee'] ?? null,
                    'expired_at' => $pakasirResponse['expired_at'] ?? null,
                ]
            ]);

        } catch (\App\Exceptions\CheckoutException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('Checkout system error: ' . $e->getMessage());
            } catch (\Throwable $logError) {
                // Kalau logging pun gagal (misal storage penuh/permission), jangan sampai ikut menjatuhkan response.
            }
            return response()->json(['status' => 'error', 'message' => 'Terjadi kesalahan sistem. Silakan coba lagi beberapa saat lagi.'], 500);
        }
    }
}