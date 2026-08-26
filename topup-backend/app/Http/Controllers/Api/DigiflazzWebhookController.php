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
// use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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

        if ($secret) {
            $expectedSignature = 'sha1=' . hash_hmac('sha1', $payload, $secret);
            if (!hash_equals($expectedSignature, (string)$signature)) {
                return response()->json(['message' => 'Invalid signature'], 403);
            }
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
                
                if ($transaction->payment_method === 'wallet') {
                    DB::transaction(function () use ($transaction) {
                        $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
                        if ($user) {
                            $balanceBefore = $user->balance;
                            $user->balance += $transaction->amount;
                            $user->save();

                            WalletTransaction::create([
                                'user_id' => $user->id,
                                'type' => 'addition',
                                'amount' => $transaction->amount,
                                'balance_before' => $balanceBefore,
                                'balance_after' => $user->balance,
                                'reference_id' => $transaction->trx_id
                            ]);
                        }
                    });
                }
            }
        }

        return response()->json(['message' => 'Webhook processed successfully']);
    }
}