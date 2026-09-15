<?php

namespace App\Console\Commands;

use App\Jobs\ReconcileTransactionJob;
use App\Models\Transaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Jaring pengaman: cari transaksi yang "macet" di status PROCESSING lebih lama dari
 * wajar (artinya ReconcileTransactionJob yang seharusnya sudah jalan entah kenapa
 * belum/tidak jalan — misal karena `php artisan queue:clear` di start.sh sempat
 * menghapusnya saat deploy, atau worker sempat mati) dan mendorong pengecekan ulang.
 *
 * Dijadwalkan jalan tiap 5 menit lewat Console/Kernel.php.
 */
class ReconcileStuckTransactions extends Command
{
    protected $signature = 'transactions:reconcile-stuck';
    protected $description = 'Cari transaksi PROCESSING yang macet dan dorong pengecekan ulang status ke Digiflazz';

    public function handle(): int
    {
        $stuckTransactions = Transaction::where('status', 'PROCESSING')
            ->where('needs_reconciliation_review', false)
            ->where(function ($query) {
                $query->whereNull('last_reconciliation_at')
                    ->orWhere('last_reconciliation_at', '<', now()->subMinutes(3));
            })
            ->where('updated_at', '<', now()->subMinutes(3))
            ->get();

        if ($stuckTransactions->isEmpty()) {
            $this->info('Tidak ada transaksi PROCESSING yang macet.');
            return self::SUCCESS;
        }

        foreach ($stuckTransactions as $transaction) {
            Log::warning("ReconcileStuckTransactions: TRX {$transaction->trx_id} macet di PROCESSING, mendorong reconciliation ulang.");
            ReconcileTransactionJob::dispatch($transaction->trx_id);
        }

        $this->info("Mendorong reconciliation untuk {$stuckTransactions->count()} transaksi yang macet.");

        return self::SUCCESS;
    }
}