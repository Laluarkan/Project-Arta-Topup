<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Setting;
use App\Services\DigiflazzService;
use App\Mail\TransactionSuccessMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ProcessTopupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $trx_id;

    public function __construct($trx_id)
    {
        $this->trx_id = $trx_id;
    }

    public function handle(DigiflazzService $digiflazzService)
    {
        try {
            $transaction = Transaction::with(['product', 'user'])->where('trx_id', $this->trx_id)->first();

            if (!$transaction) {
                Log::error("ProcessTopupJob dibatalkan: TRX {$this->trx_id} tidak ditemukan di database.");
                return;
            }

            if ($transaction->status !== 'PAID') {
                Log::warning("TopupJob dibatalkan: Status TRX {$this->trx_id} bukan PAID.");
                return; 
            }

            if (!$transaction->product) {
                throw new \Exception("Data produk tidak ditemukan pada transaksi ini.");
            }

            $customerNo = $transaction->user_game_id;
            if (!empty($transaction->zone_id)) {
                $customerNo .= $transaction->zone_id;
            }

            $buyerSkuCode = $transaction->product->buyer_sku_code;
            $refId = $transaction->digiflazz_ref_id;

            $response = $digiflazzService->topup($buyerSkuCode, $customerNo, $refId);
            $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
            $targetEmail = $transaction->guest_email ?? ($transaction->user ? $transaction->user->email : null);

            if (!$response['success']) {
                if ($apiMode === 'development') {
                    $transaction->update(['status' => 'SUCCESS']);
                    if ($targetEmail) Mail::to($targetEmail)->send(new TransactionSuccessMail($transaction));
                } else {
                    $transaction->update([
                        'status' => 'FAILED',
                        'status_note' => $response['message'] ?? 'Gagal memproses ke Provider'
                    ]);
                    $this->handleFailedRefund($transaction);
                }
            } else {
                $digiStatus = $response['data']['status'] ?? 'Pending';

                if ($digiStatus === 'Sukses') {
                    $transaction->update(['status' => 'SUCCESS']);
                    if ($targetEmail) Mail::to($targetEmail)->send(new TransactionSuccessMail($transaction));
                } elseif ($digiStatus === 'Gagal') {
                    if ($apiMode === 'development') {
                        $transaction->update(['status' => 'SUCCESS']);
                        if ($targetEmail) Mail::to($targetEmail)->send(new TransactionSuccessMail($transaction));
                    } else {
                        $transaction->update([
                            'status' => 'FAILED',
                            'status_note' => $response['data']['sn'] ?? 'Dibatalkan oleh Provider'
                        ]);
                        $this->handleFailedRefund($transaction);
                    }
                } else {
                    if ($apiMode === 'development') {
                        $transaction->update(['status' => 'SUCCESS']);
                        if ($targetEmail) Mail::to($targetEmail)->send(new TransactionSuccessMail($transaction));
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error("ProcessTopupJob Critical Error (TRX: {$this->trx_id}): " . $e->getMessage());
            
            $transaction = Transaction::with(['user'])->where('trx_id', $this->trx_id)->first();
            $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
            $targetEmail = $transaction->guest_email ?? ($transaction->user ? $transaction->user->email : null);

            if ($transaction && $transaction->status === 'PAID') {
                if ($apiMode === 'development') {
                    $transaction->update(['status' => 'SUCCESS']);
                    if ($targetEmail) Mail::to($targetEmail)->send(new TransactionSuccessMail($transaction));
                } else {
                    $transaction->update([
                        'status' => 'FAILED',
                        'status_note' => 'Kesalahan Sistem Internal saat memproses topup'
                    ]);
                    $this->handleFailedRefund($transaction);
                }
            }
        }
    }

    private function handleFailedRefund($transaction)
    {
        if ($transaction && $transaction->payment_method === 'wallet') {
            DB::transaction(function () use ($transaction) {
                $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
                if ($user) {
                    $balanceBefore = $user->balance;
                    $user->balance += $transaction->amount;
                    $user->save();

                    WalletTransaction::create([
                        'user_id' => $user->id,
                        'type' => 'refund', // SUDAH DIKOREKSI MENJADI REFUND
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