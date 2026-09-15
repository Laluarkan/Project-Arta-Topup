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
    /**
     * Titik masuk tunggal untuk semua refund transaksi gagal, dipanggil dari:
     * - ProcessTopupJob (gagal saat pertama kali coba topup)
     * - DigiflazzWebhookController (gagal dilaporkan belakangan oleh Digiflazz)
     * - Admin\TransactionController (admin paksa ubah status ke FAILED)
     *
     * Supaya perilaku refund SELALU sama persis di mana pun dipanggil, tidak ada lagi
     * logika refund yang tercecer/berbeda-beda di beberapa file.
     */
    public function handle(Transaction $transaction): void
    {
        switch ($transaction->payment_method) {
            case 'wallet':
                $this->creditWallet($transaction, 'refund');
                $this->appendNote($transaction, 'Dana otomatis dikembalikan ke Saldo ArTa Zone.');
                break;

            case 'qris':
            case 'va':
            case 'ewallet':
                // Ini payment_method yang lewat Midtrans. Coba refund API resmi dulu (real
                // uang balik ke kartu/e-wallet/bank asal) — tapi tidak semua channel didukung.
                if ($this->attemptMidtransRefund($transaction)) {
                    $this->appendNote($transaction, 'Uang berhasil di-refund otomatis via Midtrans.');
                } else {
                    $this->fallbackToWalletOrManual($transaction, 'Midtrans');
                }
                break;

            case 'pakasir':
                // Pakasir belum menyediakan endpoint refund resmi di integrasi kita saat ini,
                // jadi langsung fallback ke kredit saldo (atau manual kalau guest).
                $this->fallbackToWalletOrManual($transaction, 'Pakasir');
                break;

            default:
                Log::warning("RefundService: payment_method tidak dikenali untuk TRX {$transaction->trx_id}: {$transaction->payment_method}");
                $this->flagManualRefund($transaction, $transaction->payment_method ?? 'unknown');
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

    /**
     * Kalau refund API asli tidak berhasil/tidak tersedia: kredit Saldo ArTa Zone (kalau user
     * punya akun terdaftar), atau tandai untuk refund manual oleh admin (kalau transaksi guest).
     */
    private function fallbackToWalletOrManual(Transaction $transaction, string $gatewayName): void
    {
        if ($transaction->user_id) {
            $this->creditWallet($transaction, 'refund');
            $this->appendNote($transaction, "Refund via {$gatewayName} tidak tersedia untuk channel ini — dana Rp" . number_format($transaction->amount, 0, ',', '.') . ' otomatis dikonversi menjadi Saldo ArTa Zone.');
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
            'status_note' => $existing ? ($existing . ' ' . $note) : $note,
        ]);
    }
}
