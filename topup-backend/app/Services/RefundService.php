<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RefundService
{
    public function handle(Transaction $transaction): void
    {
        switch ($transaction->payment_method) {
            case 'wallet':
                $this->creditWallet($transaction, 'refund');
                $this->appendNote($transaction, 'Dana otomatis dikembalikan ke Saldo ArTa Zone.');
                break;

            case 'midtrans': // <-- Perbaikan UTAMA ada di sini
            case 'qris':
            case 'va':
            case 'ewallet':
                if ($this->attemptMidtransRefund($transaction)) {
                    $this->appendNote($transaction, 'Uang berhasil di-refund otomatis via Midtrans.');
                } else {
                    $this->fallbackToWalletOrManual($transaction, 'Midtrans');
                }
                break;

            case 'pakasir':
                $this->fallbackToWalletOrManual($transaction, 'Pakasir');
                break;

            default:
                Log::warning("RefundService: payment_method tidak dikenali untuk TRX {$transaction->trx_id}: {$transaction->payment_method}");
                // Fallback diubah: selama user login/punya akun, tetap jadikan saldo ArTa Zone. 
                // Hanya jadikan "manual refund" jika dia benar-benar guest.
                $this->fallbackToWalletOrManual($transaction, $transaction->payment_method ?? 'Unknown Gateway');
                break;
        }
    }

    private function attemptMidtransRefund(Transaction $transaction): bool
    {
        try {
            $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
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

            if ($refundResponse->successful()) {
                return true;
            }

            $errorMsg = $refundResponse->json('status_message') ?? 'Ditolak Midtrans';
            Log::warning("Midtrans Refund Ditolak (TRX: {$transaction->trx_id}): {$errorMsg}");
            return false;
        } catch (\Exception $e) {
            Log::error('Midtrans Refund Exception: ' . $e->getMessage());
            return false;
        }
    }

    private function fallbackToWalletOrManual(Transaction $transaction, string $gatewayName): void
    {
        if ($transaction->user_id) {
            $this->creditWallet($transaction, 'refund');
            $this->appendNote($transaction, "Refund via {$gatewayName} tidak tersedia/ditolak untuk metode bayar ini — dana Rp" . number_format($transaction->amount, 0, ',', '.') . ' otomatis dikonversi menjadi Saldo ArTa Zone.');
        } else {
            $this->flagManualRefund($transaction, $gatewayName);
        }
    }

    private function flagManualRefund(Transaction $transaction, string $gatewayName): void
    {
        $transaction->update(['needs_manual_refund' => true]);
        $this->appendNote($transaction, "[PERLU REFUND MANUAL: transaksi guest via {$gatewayName}, tidak ada akun untuk auto-credit.]");
    }

    private function creditWallet(Transaction $transaction, string $type): void
    {
        DB::transaction(function () use ($transaction, $type) {
            $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
            if (!$user) return;

            $balanceBefore = $user->balance;
            $user->balance += $transaction->amount;
            $user->save();

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => $type,
                'amount' => $transaction->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $user->balance,
                'reference_id' => $transaction->trx_id
            ]);
        });
    }

    private function appendNote(Transaction $transaction, string $note): void
    {
        $existing = $transaction->fresh()->status_note;
        $transaction->update([
            'status_note' => $existing ? ($existing . ' | ' . $note) : $note,
        ]);
    }
}