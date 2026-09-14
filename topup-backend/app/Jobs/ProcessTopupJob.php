<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Transaction;
use App\Models\Setting;
use App\Services\DigiflazzService;
use App\Services\RefundService;
use App\Mail\TransactionSuccessMail;
use Illuminate\Support\Facades\Log;
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
            try {
                Log::error("ProcessTopupJob Critical Error (TRX: {$this->trx_id}): " . $e->getMessage());
            } catch (\Throwable $logError) {
                // Logging gagal (misal storage penuh/permission) TIDAK BOLEH menggagalkan
                // proses refund di bawah ini — itu jauh lebih penting daripada catatan log.
            }
            
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

    /**
     * Refund/kredit otomatis saat topup gagal. Logikanya sekarang terpusat di RefundService
     * supaya perilakunya identik dengan webhook Digiflazz dan force-refund oleh admin.
     */
    private function handleFailedRefund($transaction)
    {
        if (!$transaction) return;
        app(RefundService::class)->handle($transaction);
    }
}