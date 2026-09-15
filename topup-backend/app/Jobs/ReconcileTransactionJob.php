<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Transaction;
use App\Services\DigiflazzService;
use App\Services\RefundService;
use App\Mail\TransactionSuccessMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\Request;

/**
 * Dipanggil ULANG-ULANG (bukan sekali) untuk transaksi berstatus PROCESSING, yaitu
 * transaksi yang saat dikirim ke Digiflazz mengalami timeout/putus koneksi sehingga
 * status aslinya di sisi Digiflazz tidak diketahui.
 *
 * Tujuannya SATU: pastikan status sebenarnya via cekStatus() sebelum sistem memutuskan
 * SUCCESS (kirim email) atau FAILED (refund). Tidak pernah menebak.
 *
 * Kalau setelah beberapa kali percobaan Digiflazz tetap tidak bisa memastikan (API
 * mereka down berkepanjangan), transaksi ditandai needs_reconciliation_review = true
 * dan BERHENTI di situ — menunggu admin cek manual, bukan auto-refund/auto-sukseskan.
 */
class ReconcileTransactionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $trx_id;

    /**
     * Jeda (menit) sebelum masing-masing percobaan ulang, index ke-0 = percobaan pertama.
     * Setelah semua elemen array ini habis dan masih ambigu, transaksi di-eskalasi ke admin.
     */
    private const RETRY_DELAY_MINUTES = [2, 5, 15, 30, 60];

    public function __construct($trx_id)
    {
        $this->trx_id = $trx_id;
    }

    public function handle(DigiflazzService $digiflazzService)
    {
        $transaction = Transaction::with(['product', 'user'])->where('trx_id', $this->trx_id)->first();

        if (!$transaction) {
            Log::error("ReconcileTransactionJob dibatalkan: TRX {$this->trx_id} tidak ditemukan.");
            return;
        }

        // Kalau statusnya sudah bukan PROCESSING lagi (misal admin sudah turun tangan
        // manual lewat updateStatus), hentikan reconciliation — tidak perlu lanjut.
        if ($transaction->status !== 'PROCESSING') {
            Log::info("ReconcileTransactionJob dihentikan: TRX {$this->trx_id} sudah berubah status jadi {$transaction->status} (kemungkinan ditangani manual oleh admin).");
            return;
        }

        $customerNo = $transaction->user_game_id;
        if (!empty($transaction->zone_id)) {
            $customerNo .= $transaction->zone_id;
        }

        $result = $digiflazzService->cekStatus(
            $transaction->product->buyer_sku_code,
            $customerNo,
            $transaction->digiflazz_ref_id
        );

        $transaction->increment('reconciliation_attempts');
        $transaction->update(['last_reconciliation_at' => now()]);
        $attempt = $transaction->reconciliation_attempts;

        // Masih ambigu (Digiflazz tetap tidak bisa dihubungi) -> coba lagi nanti atau eskalasi.
        if (!empty($result['ambiguous'])) {
            $this->retryOrEscalate($transaction, $attempt, 'Digiflazz masih belum bisa dihubungi saat reconciliation.');
            return;
        }

        // Digiflazz merespons pasti tapi transaksi dengan ref_id ini belum/tidak pernah
        // tercatat di sisi mereka (misal request awal memang tidak pernah sampai).
        // Ini jawaban PASTI: aman dianggap gagal dan direfund.
        if (!$result['status']) {
            $this->finalizeAsFailed($transaction, $result['message'] ?? 'Transaksi tidak ditemukan di Digiflazz setelah dicek ulang.');
            return;
        }

        $digiStatus = $result['data']['status'] ?? null;

        if ($digiStatus === 'Sukses') {
            $this->finalizeAsSuccess($transaction, $result['data']);
        } elseif ($digiStatus === 'Gagal') {
            $this->finalizeAsFailed($transaction, $result['data']['sn'] ?? 'Dibatalkan oleh Provider (dikonfirmasi ulang via reconciliation).');
        } else {
            // Masih "Pending" beneran di sisi Digiflazz (bukan network error) -> wajar,
            // provider mereka sendiri belum selesai memproses. Coba cek lagi nanti.
            $this->retryOrEscalate($transaction, $attempt, "Status Digiflazz masih Pending saat reconciliation ke-{$attempt}.");
        }
    }

    private function retryOrEscalate(Transaction $transaction, int $attempt, string $reason): void
    {
        if ($attempt >= count(self::RETRY_DELAY_MINUTES)) {
            $transaction->update([
                'needs_reconciliation_review' => true,
                'status_note' => trim(($transaction->status_note ?? '') . " [PERLU REVIEW MANUAL: setelah {$attempt}x percobaan, status transaksi di Digiflazz masih belum bisa dipastikan sistem. Cek manual via dashboard/CS Digiflazz sebelum memutuskan status akhir.]"),
            ]);

            Log::critical("ReconcileTransactionJob: TRX {$transaction->trx_id} DIESKALASI ke admin setelah {$attempt}x percobaan gagal dipastikan. Alasan terakhir: {$reason}");
            return;
        }

        $delays = self::RETRY_DELAY_MINUTES;
        $delayMinutes = $delays[$attempt - 1] ?? end($delays);

        Log::warning("ReconcileTransactionJob: TRX {$transaction->trx_id} masih ambigu (percobaan ke-{$attempt}), dijadwalkan cek ulang {$delayMinutes} menit lagi. Alasan: {$reason}");

        self::dispatch($transaction->trx_id)->delay(now()->addMinutes($delayMinutes));
    }

    private function finalizeAsSuccess(Transaction $transaction, $digiflazzData): void
    {
        $transaction->update([
            'status' => 'SUCCESS',
            'status_note' => trim(($transaction->status_note ?? '') . ' [Dikonfirmasi SUKSES via reconciliation setelah request awal timeout.]'),
        ]);

        // fresh() bisa saja return null kalau row-nya somehow sudah tidak ada lagi,
        // jadi fallback ke $transaction yang sudah ter-update di memori (update() di
        // atas sudah menyinkronkan atribut lokalnya juga, jadi ini aman & tetap akurat).
        /** @var Transaction $freshTransaction */
        $freshTransaction = $transaction->fresh() ?? $transaction;

        $targetEmail = $freshTransaction->guest_email ?? ($freshTransaction->user ? $freshTransaction->user->email : null);
        if ($targetEmail) {
            Mail::to($targetEmail)->queue(new TransactionSuccessMail($freshTransaction));
        }

        Log::info("ReconcileTransactionJob: TRX {$transaction->trx_id} dikonfirmasi SUKSES via reconciliation. Barang sudah terkirim oleh Digiflazz sebelum koneksi kita putus tadi.");
    }

    private function finalizeAsFailed(Transaction $transaction, string $note): void
    {
        $transaction->update([
            'status' => 'FAILED',
            'status_note' => trim(($transaction->status_note ?? '') . " [Dikonfirmasi GAGAL via reconciliation: {$note}]"),
        ]);

        // fresh() bisa saja return null kalau row-nya somehow sudah tidak ada lagi,
        // jadi fallback ke $transaction yang sudah ter-update di memori (update() di
        // atas sudah menyinkronkan atribut lokalnya juga, jadi ini aman & tetap akurat).
        // Dipecah ke variabel + PHPDoc eksplisit supaya IDE tidak lagi menandai ini
        // sebagai "Transaction|null" walau secara runtime sudah pasti non-null.
        /** @var Transaction $freshTransaction */
        $freshTransaction = $transaction->fresh() ?? $transaction;

        $refundRequest = Request::create('/refund', 'POST', [
            'trx_id' => $freshTransaction->trx_id,
        ]);
        app(RefundService::class)->handle($refundRequest);

        Log::info("ReconcileTransactionJob: TRX {$transaction->trx_id} dikonfirmasi GAGAL via reconciliation, refund diproses. Catatan: {$note}");
    }
}