<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\WalletTransaction;
use App\Models\Setting;
use App\Models\User;
use App\Mail\TransactionSuccessMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DigiflazzWebhookController extends Controller
{
    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $data = $request->all();
        
        $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
        $secret = $apiMode === 'production' 
            ? env('DIGIFLAZZ_WEBHOOK_SECRET_PROD', env('DIGIFLAZZ_WEBHOOK_SECRET')) 
            : env('DIGIFLAZZ_WEBHOOK_SECRET_DEV', env('DIGIFLAZZ_WEBHOOK_SECRET'));

                $signature = $request->header('X-Hub-Signature');

        if (empty($secret)) {
            Log::critical('DIGIFLAZZ_WEBHOOK_SECRET belum diset di .env — webhook ditolak demi keamanan.');
            return response()->json(['message' => 'Server misconfigured'], 500);
        }

        $expectedSignature = 'sha1=' . hash_hmac('sha1', $payload, $secret);
        if (!hash_equals($expectedSignature, (string) $signature)) {
            Log::warning('Digiflazz webhook signature tidak valid.', ['ip' => $request->ip()]);
            return response()->json(['message' => 'Invalid signature'], 403);
        }

        if (!isset($data['data'])) {
            return response()->json(['message' => 'Invalid payload format'], 400);
        }

        $webhookData = $data['data'];
        $refId = $webhookData['ref_id'] ?? null;
        $status = $webhookData['status'] ?? null; 

        if (!$refId || !$status) {
            return response()->json(['message' => 'Missing reference or status'], 400);
        }

        $transaction = Transaction::with(['user', 'product'])->where('digiflazz_ref_id', $refId)->first();

        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        if (!in_array($transaction->status, ['SUCCESS', 'FAILED'])) {
            if ($status === 'Sukses') {
                $transaction->update(['status' => 'SUCCESS']);
                
                $targetEmail = $transaction->guest_email ?? ($transaction->user ? $transaction->user->email : null);
                if ($targetEmail) {
                    Mail::to($targetEmail)->queue(new TransactionSuccessMail($transaction));
                }
                
            } elseif ($status === 'Gagal') {
                $transaction->update(['status' => 'FAILED']);
                
                // 1. Jika bayar pakai Saldo Web ArTa Zone
                if ($transaction->payment_method === 'wallet') {
                    DB::transaction(function () use ($transaction) {
                        $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
                        if ($user) {
                            $balanceBefore = $user->balance;
                            $user->balance += $transaction->amount;
                            $user->save();

                            WalletTransaction::create([
                                'user_id' => $user->id,
                                'type' => 'refund',
                                'amount' => $transaction->amount,
                                'balance_before' => $balanceBefore,
                                'balance_after' => $user->balance,
                                'reference_id' => $transaction->trx_id
                            ]);
                            
                            $transaction->update(['status_note' => 'Gagal di server. Dana otomatis dikembalikan ke Saldo ArTa Zone.']);
                        }
                    });
                } 
                // 2. Jika bayar pakai Midtrans (QRIS/E-Wallet dll) -> Tembak Refund API Secara Dinamis
                else {
                    try {
                        $serverKey = $apiMode === 'production' 
                            ? env('MIDTRANS_SERVER_KEY_PROD', env('MIDTRANS_SERVER_KEY')) 
                            : env('MIDTRANS_SERVER_KEY_DEV', env('MIDTRANS_SERVER_KEY'));
                            
                        $midtransBaseUrl = $apiMode === 'production' 
                            ? 'https://api.midtrans.com/v2' 
                            : 'https://api.sandbox.midtrans.com/v2';

                        $refundResponse = Http::withBasicAuth($serverKey, '')
                            ->timeout(10)
                            ->post("{$midtransBaseUrl}/{$transaction->trx_id}/refund", [
                                'refund_key' => 'ref-' . $transaction->trx_id . '-' . time(),
                                'amount' => $transaction->amount,
                                'reason' => 'Stok produk kosong / Gangguan Server Provider'
                            ]);

                        // Jika Midtrans menyetujui Refund
                        if ($refundResponse->successful()) {
                            $transaction->update(['status_note' => 'Gagal di server. Uang berhasil di-Refund otomatis via Midtrans.']);
                        } 
                        // Jika Midtrans menolak (misal: fitur Refund API belum diaktifkan)
                        else {
                            $errorMsg = $refundResponse->json('status_message') ?? 'Fitur belum aktif / Ditolak Midtrans';
                            Log::warning("Midtrans Refund Ditolak (TRX: {$transaction->trx_id}): {$errorMsg}");
                            
                            $transaction->update(['status_note' => "Gagal server. AUTO-REFUND DITOLAK ({$errorMsg}). HARAP REFUND MANUAL DI DASHBOARD MIDTRANS!"]);
                        }
                    } catch (\Exception $e) {
                        // Jika koneksi internet ke Midtrans putus atau timeout
                        Log::error('Midtrans Refund Exception: ' . $e->getMessage());
                        $transaction->update(['status_note' => 'Gagal server. Sistem gagal menghubungi Midtrans. HARAP REFUND MANUAL DI DASHBOARD MIDTRANS!']);
                    }
                }
            }
        }

        return response()->json(['message' => 'Webhook processed successfully']);
    }
}