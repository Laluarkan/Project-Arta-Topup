<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefundService
{
    public function handle(Transaction $transaction): void
    {
        // 1. Cek apakah transaksi ini SUDAH PERNAH di-refund ke wallet
        // Ini mencegah celah ganda-refund jika Admin melakukan "Retry" berulang kali.
        $alreadyRefunded = WalletTransaction::where('reference_id', $transaction->trx_id)
            ->where('type', 'refund')
            ->exists();

        if ($alreadyRefunded) {
            Log::info("RefundService: TRX {$transaction->trx_id} sudah pernah di-refund sebelumnya. Mencegah double-refund.");
            return;
        }

        // 2. Normalisasi nama gateway agar kebal dari salah ketik huruf besar/kecil
        $method = strtolower(trim($transaction->payment_method ?? 'unknown'));

        switch ($method) {
            case 'wallet':
                $this->creditWallet($transaction, 'refund');
                $this->appendNote($transaction, 'Dana otomatis dikembalikan ke Saldo ArTa Zone.');
                break;

            case 'midtrans':
            case 'qris':
            case 'va':
            case 'ewallet':
            case 'pakasir':
                // Bypass API Refund Midtrans karena sering delay (1-14 hari) dan menipu respons sistem.
                // Langsung konversi ke Saldo ArTa Zone agar uang instan kembali dan user bisa belanja lagi.
                $this->fallbackToWalletOrManual($transaction, strtoupper($method));
                break;

            default:
                Log::warning("RefundService: payment_method tidak dikenali untuk TRX {$transaction->trx_id}: {$method}");
                $this->fallbackToWalletOrManual($transaction, strtoupper($method));
                break;
        }
    }

    private function fallbackToWalletOrManual(Transaction $transaction, string $gatewayName): void
    {
        if ($transaction->user_id) {
            $this->creditWallet($transaction, 'refund');
            $this->appendNote($transaction, "Dana otomatis dikonversi menjadi Saldo ArTa Zone (Pengembalian instan dari {$gatewayName}).");
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