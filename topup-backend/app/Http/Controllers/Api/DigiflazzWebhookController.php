<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Setting;
use App\Mail\TransactionSuccessMail;
use Illuminate\Support\Facades\Mail;
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
                app(\App\Services\RefundService::class)->handle($transaction);
            }
        }

        return response()->json(['message' => 'Webhook processed successfully']);
    }
}