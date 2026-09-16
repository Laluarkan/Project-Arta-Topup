<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\WalletTopup;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Laporan rekonsiliasi keuangan untuk admin: uang masuk, modal ke Digiflazz, profit,
 * refund yang sudah/belum selesai, dan transaksi yang butuh review manual.
 *
 * Semua angka dihitung real-time dari tabel transactions & wallet_topups (tidak ada
 * tabel ringkasan terpisah), supaya selalu konsisten dengan data transaksi yang
 * sebenarnya -- konsekuensinya query agak lebih berat untuk rentang tanggal yang
 * sangat panjang, makanya rentang custom dibatasi maksimal 92 hari (lihat resolveDateRange).
 */
class ReconciliationController extends Controller
{
    private const TIMEZONE = 'Asia/Jakarta';
    private const MAX_CUSTOM_RANGE_DAYS = 92;

    public function index(Request $request)
    {
        [$start, $end, $label] = $this->resolveDateRange($request);

        $summary = $this->buildSummary($start, $end);
        $timeseries = $this->buildTimeseries($start, $end);

        return response()->json([
            'status' => 'success',
            'data' => [
                'period' => [
                    'start' => $start->clone()->setTimezone(self::TIMEZONE)->toDateString(),
                    'end' => $end->clone()->setTimezone(self::TIMEZONE)->toDateString(),
                    'label' => $label,
                ],
                'summary' => $summary,
                'timeseries' => $timeseries,
            ],
        ]);
    }

    /**
     * Export detail transaksi pada rentang terpilih sebagai CSV, untuk dibuka di
     * Excel/Google Sheets kalau admin butuh audit manual lebih detail dari yang
     * ditampilkan di dashboard.
     */
    public function export(Request $request)
    {
        [$start, $end] = $this->resolveDateRange($request);

        $filename = 'rekonsiliasi_' . $start->clone()->setTimezone(self::TIMEZONE)->format('Ymd')
            . '_' . $end->clone()->setTimezone(self::TIMEZONE)->format('Ymd') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($start, $end) {
            $handle = fopen('php://output', 'w');

            // BOM UTF-8 supaya Excel menampilkan "Rp" dan karakter non-ASCII dengan benar
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Trx ID', 'Tanggal (WIB)', 'User/Guest', 'Produk', 'Metode Bayar', 'Status',
                'Harga Jual', 'Harga Modal (Digiflazz)', 'Margin', 'Perlu Refund Manual',
                'Refund Manual Selesai', 'Perlu Review Reconciliation',
            ]);

            // cursor() dipakai (bukan get()) supaya tidak menarik seluruh baris ke memori
            // sekaligus -- rentang sebulan penuh bisa berisi ribuan transaksi.
            Transaction::with(['product', 'user'])
                ->whereBetween('created_at', [$start, $end])
                ->orderBy('created_at')
                ->cursor()
                ->each(function (Transaction $trx) use ($handle) {
                    $modal = $trx->provider_price_snapshot ?? optional($trx->product)->provider_price ?? 0;
                    $margin = $trx->status === 'SUCCESS' ? ((float) $trx->amount - (float) $modal) : 0;

                    fputcsv($handle, [
                        $trx->trx_id,
                        $trx->created_at->clone()->setTimezone(self::TIMEZONE)->format('Y-m-d H:i:s'),
                        $trx->user->email ?? (($trx->guest_email ?? '-') . ' (Guest)'),
                        optional($trx->product)->product_name ?? 'Produk Dihapus',
                        $trx->payment_method,
                        $trx->status,
                        $trx->amount,
                        $modal,
                        $margin,
                        $trx->needs_manual_refund ? 'YA' : '-',
                        $trx->manual_refund_completed_at ? 'YA' : '-',
                        $trx->needs_reconciliation_review ? 'YA' : '-',
                    ]);
                });

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Resolve rentang tanggal [start, end] dalam UTC (siap dipakai whereBetween ke
     * kolom created_at yang disimpan UTC), dari input period Asia/Jakarta.
     * Ini PENTING: kalau langsung pakai UTC untuk "hari ini", transaksi jam 00:00-06:59
     * WIB akan salah masuk ke tanggal kemarin (karena itu masih "kemarin" dalam UTC).
     */
    private function resolveDateRange(Request $request): array
    {
        $period = $request->input('period', 'today');
        $tz = self::TIMEZONE;

        switch ($period) {
            case 'week':
                $start = Carbon::now($tz)->startOfWeek();
                $end = Carbon::now($tz)->endOfDay();
                $label = 'Minggu Ini';
                break;

            case 'month':
                $start = Carbon::now($tz)->startOfMonth();
                $end = Carbon::now($tz)->endOfDay();
                $label = 'Bulan Ini';
                break;

            case 'custom':
                $request->validate([
                    'start_date' => 'required|date',
                    'end_date' => 'required|date|after_or_equal:start_date',
                ]);
                $start = Carbon::parse($request->input('start_date'), $tz)->startOfDay();
                $end = Carbon::parse($request->input('end_date'), $tz)->endOfDay();

                if ($start->diffInDays($end) > self::MAX_CUSTOM_RANGE_DAYS) {
                    abort(422, 'Rentang tanggal custom maksimal ' . self::MAX_CUSTOM_RANGE_DAYS . ' hari. Silakan pecah jadi beberapa kali export.');
                }

                $label = $start->format('d M Y') . ' - ' . $end->format('d M Y');
                break;

            case 'today':
            default:
                $start = Carbon::now($tz)->startOfDay();
                $end = Carbon::now($tz)->endOfDay();
                $label = 'Hari Ini';
                break;
        }

        return [$start->clone()->setTimezone('UTC'), $end->clone()->setTimezone('UTC'), $label];
    }

    private function buildSummary(Carbon $start, Carbon $end): array
    {
        // Revenue & cost HANYA dihitung dari transaksi SUCCESS (benar-benar terkirim &
        // benar-benar dipotong dari saldo Digiflazz) -- transaksi PENDING/PAID/PROCESSING
        // belum final jadi sengaja tidak dihitung sebagai profit/modal di sini.
        $successAgg = Transaction::query()
            ->join('products', 'transactions.product_id', '=', 'products.id')
            ->whereBetween('transactions.created_at', [$start, $end])
            ->where('transactions.status', 'SUCCESS')
            ->selectRaw('
                COALESCE(SUM(transactions.amount), 0) as revenue,
                COALESCE(SUM(COALESCE(transactions.provider_price_snapshot, products.provider_price)), 0) as cost,
                COUNT(*) as count
            ')
            ->first();

        $revenue = (float) $successAgg->revenue;
        $cost = (float) $successAgg->cost;

        $walletTopupTotal = (float) WalletTopup::whereBetween('created_at', [$start, $end])
            ->where('status', 'PAID')
            ->sum('amount');

        $failedBase = fn () => Transaction::whereBetween('created_at', [$start, $end])->where('status', 'FAILED');

        $refundedAutoTotal = (float) $failedBase()->where('needs_manual_refund', false)->sum('amount');
        $refundedManualCompletedTotal = (float) $failedBase()
            ->where('needs_manual_refund', true)
            ->whereNotNull('manual_refund_completed_at')
            ->sum('amount');

        $pendingManualRefundQuery = $failedBase()->where('needs_manual_refund', true)->whereNull('manual_refund_completed_at');
        $pendingManualRefundTotal = (float) (clone $pendingManualRefundQuery)->sum('amount');
        $pendingManualRefundCount = (clone $pendingManualRefundQuery)->count();

        $needsReviewCount = Transaction::whereBetween('created_at', [$start, $end])
            ->where('needs_reconciliation_review', true)
            ->count();

        $statusBreakdown = Transaction::whereBetween('created_at', [$start, $end])
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        return [
            'revenue' => $revenue,
            'cost' => $cost,
            'profit' => $revenue - $cost,
            'success_count' => (int) $successAgg->count,
            'wallet_topup_total' => $walletTopupTotal,
            'refunded_auto_total' => $refundedAutoTotal,
            'refunded_manual_completed_total' => $refundedManualCompletedTotal,
            'refunded_total' => $refundedAutoTotal + $refundedManualCompletedTotal,
            'pending_manual_refund_total' => $pendingManualRefundTotal,
            'pending_manual_refund_count' => $pendingManualRefundCount,
            'needs_reconciliation_review_count' => $needsReviewCount,
            'status_breakdown' => $statusBreakdown,
        ];
    }

    private function buildTimeseries(Carbon $start, Carbon $end): array
    {
        // Grouping per hari WIB (bukan UTC), supaya batas hari di grafik sesuai dengan
        // yang dilihat admin di Indonesia. AT TIME ZONE cuma didukung Postgres (dipakai
        // di production/Supabase) -- untuk driver lain (SQLite/MySQL, biasanya cuma
        // dipakai saat development/testing lokal) fallback ke tanggal UTC apa adanya,
        // yang cukup akurat untuk kebutuhan development, hanya bisa meleset di sekitar
        // jam pergantian hari.
        $driver = DB::connection()->getDriverName();
        $dateExpr = $driver === 'pgsql'
            ? "(transactions.created_at AT TIME ZONE 'UTC' AT TIME ZONE '" . self::TIMEZONE . "')::date"
            : 'DATE(transactions.created_at)';

        $rows = Transaction::query()
            ->join('products', 'transactions.product_id', '=', 'products.id')
            ->whereBetween('transactions.created_at', [$start, $end])
            ->where('transactions.status', 'SUCCESS')
            ->selectRaw("
                {$dateExpr} as date,
                COALESCE(SUM(transactions.amount), 0) as revenue,
                COALESCE(SUM(COALESCE(transactions.provider_price_snapshot, products.provider_price)), 0) as cost
            ")
            ->groupBy(DB::raw($dateExpr))
            ->orderBy('date')
            ->get();

        return $rows->map(function ($row) {
            $revenue = (float) $row->revenue;
            $cost = (float) $row->cost;

            return [
                'date' => (string) $row->date,
                'revenue' => $revenue,
                'cost' => $cost,
                'profit' => $revenue - $cost,
            ];
        })->values()->all();
    }
}