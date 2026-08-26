<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Setting;
use App\Jobs\ProcessTopupJob;
use Illuminate\Support\Facades\Log;

class MidtransWebhookController extends Controller
{
    public function handleWebhook(Request $request)
    {
        $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
        
        $serverKey = $apiMode === 'production' 
            ? env('MIDTRANS_SERVER_KEY_PROD', env('MIDTRANS_SERVER_KEY')) 
            : env('MIDTRANS_SERVER_KEY_DEV', env('MIDTRANS_SERVER_KEY'));
        
        $orderId = $request->order_id;
        $statusCode = $request->status_code;
        $grossAmount = $request->gross_amount;
        $signatureKey = $request->signature_key;

        Log::info("Midtrans Webhook Masuk -> Order ID: {$orderId} | Status: {$request->transaction_status} | Mode: {$apiMode}");

        // Proteksi jika env gagal terbaca (kosong)
        if (!$serverKey) {
            Log::error("CRITICAL ERROR: Midtrans Server Key KOSONG! Pastikan variabel di .env sudah diatur dan jalankan 'php artisan optimize:clear'");
            return response()->json(['message' => 'Server key not configured'], 500);
        }

        $calculatedSignature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        if ($calculatedSignature !== $signatureKey) {
            Log::warning("Midtrans Webhook Gagal Validasi Signature! Order ID: {$orderId}. Server Key yang digunakan tidak cocok dengan Midtrans.");
            return response()->json(['message' => 'Invalid signature'], 200);
        }

        $transaction = Transaction::where('trx_id', $orderId)->first();

        if (!$transaction) {
            Log::warning("Midtrans Webhook: TRX {$orderId} tidak ditemukan di database.");
            return response()->json(['message' => 'Transaction not found'], 200);
        }

        $transactionStatus = $request->transaction_status;
        $fraudStatus = $request->fraud_status;

        if ($transactionStatus == 'capture' || $transactionStatus == 'settlement') {
            if ($fraudStatus != 'challenge') {
                if ($transaction->status === 'PENDING') {
                    $transaction->update(['status' => 'PAID']);
                    Log::info("Status transaksi {$orderId} diupdate ke PAID. Memasukkan ke Queue Digiflazz...");
                    ProcessTopupJob::dispatch($transaction->trx_id);
                }
            }
        } else if ($transactionStatus == 'cancel' || $transactionStatus == 'deny' || $transactionStatus == 'expire') {
            $transaction->update(['status' => 'FAILED', 'status_note' => 'Payment ' . $transactionStatus]);
            Log::info("Status transaksi {$orderId} gagal/expired.");
        }

        return response()->json(['message' => 'OK'], 200);
    }
}