<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Jobs\ProcessTopupJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Transaction::with(['user', 'product'])->orderBy('created_at', 'desc');

            if ($request->boolean('needs_manual_refund')) {
                $query->where('needs_manual_refund', true);
            }

            $transactions = $query->paginate(100);

            return response()->json([
                'status' => 'success',
                'data' => $transactions->items(),
                'meta' => [
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'total' => $transactions->total(),
                    'pending_manual_refund_count' => Transaction::where('needs_manual_refund', true)->count(),
                ],
            ]);
        } catch (\Exception $e) {
            // Dicatat lengkap di log server supaya penyebab 500 bisa dilihat dari Render logs,
            // bukan cuma "status 500" tanpa keterangan seperti sebelumnya.
            Log::error('Gagal memuat daftar transaksi admin: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat daftar transaksi.',
                // Detail error hanya ditampilkan kalau APP_DEBUG=true (aman untuk admin, tidak untuk publik).
                'debug' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function retryTopup(Request $request, $id)
    {
        try {
            $transaction = Transaction::where('trx_id', $id)->firstOrFail();

            if ($transaction->status === 'SUCCESS') {
                return response()->json(['status' => 'error', 'message' => 'Transaksi sudah sukses, tidak dapat di-retry'], 400);
            }

            // Jika statusnya FAILED, kita kembalikan dulu ke PAID agar Job bisa memprosesnya
            if ($transaction->status === 'FAILED') {
                $transaction->update(['status' => 'PAID']);
                
                // Jika ini adalah transaksi FAILED yang sebelumnya di-refund (Wallet), kita ambil saldonya kembali sebelum proses ulang
                if ($transaction->payment_method === 'wallet') {
                    $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
                    if ($user) {
                        if ($user->balance < $transaction->amount) {
                            $transaction->update(['status' => 'FAILED']);
                            return response()->json(['status' => 'error', 'message' => 'Gagal Retry: Saldo user tidak cukup untuk ditarik ulang.'], 400);
                        }
                        $balanceBefore = $user->balance;
                        $user->balance -= $transaction->amount;
                        $user->save();

                        WalletTransaction::create([
                            'user_id' => $user->id,
                            'type' => 'deduction',
                            'amount' => $transaction->amount,
                            'balance_before' => $balanceBefore,
                            'balance_after' => $user->balance,
                            'reference_id' => $transaction->trx_id . '_RETRY'
                        ]);
                    }
                }
            }

            Log::info("Admin melakukan Retry Topup untuk TRX: " . $transaction->trx_id);
            ProcessTopupJob::dispatch($transaction->trx_id);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'RETRY_TRANSACTION',
                'target' => 'Mencoba ulang TRX ' . $transaction->trx_id . ' ke Provider'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi sedang diproses ulang ke Digiflazz'
            ]);

        } catch (\Exception $e) {
            Log::error("Error Retry Topup: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Terjadi kesalahan sistem.'], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        if ($id === 'undefined') {
            return response()->json(['status' => 'error', 'message' => 'ID Transaksi tidak valid'], 400);
        }

        $request->validate([
            'status' => 'required|string|in:PENDING,PAID,SUCCESS,FAILED'
        ]);

        try {
            DB::beginTransaction();

            $transaction = Transaction::where('trx_id', $id)->firstOrFail();
            
            $oldStatus = $transaction->status;
            $newStatus = $request->status;

            // Jangan update jika statusnya sama
            if ($oldStatus === $newStatus) {
                return response()->json(['status' => 'success', 'message' => 'Status tidak ada perubahan', 'data' => $transaction]);
            }

            $transaction->update(['status' => $newStatus]);

            // Refund/kredit otomatis lewat RefundService yang sama dipakai di seluruh sistem
            // (wallet dikembalikan, midtrans dicoba refund API asli, pakasir & fallback dikreditkan
            // sebagai Saldo ArTa Zone, guest tanpa akun ditandai untuk refund manual).
            if ($newStatus === 'FAILED') {
                app(\App\Services\RefundService::class)->handle($transaction);
            }

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'MANUAL_STATUS_UPDATE',
                'target' => $transaction->trx_id . ' (' . $oldStatus . ' -> ' . $newStatus . ')'
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Status transaksi berhasil diperbarui',
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin klik ini SETELAH benar-benar transfer manual ke rekening/e-wallet guest
     * di luar sistem (WA konfirmasi, dsb). Ini cuma menandai supaya tidak nyangkut
     * selamanya di daftar "Perlu Refund Manual" — TIDAK memindahkan uang otomatis.
     */
    public function markManualRefundDone(Request $request, $id)
    {
        $transaction = Transaction::where('trx_id', $id)->firstOrFail();

        if (!$transaction->needs_manual_refund) {
            return response()->json(['status' => 'error', 'message' => 'Transaksi ini tidak sedang ditandai perlu refund manual.'], 400);
        }

        $transaction->update([
            'needs_manual_refund' => false,
            'manual_refund_completed_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'MANUAL_REFUND_COMPLETED',
            'target' => 'TRX ' . $transaction->trx_id . ' ditandai sudah direfund manual ke guest'
        ]);

        return response()->json(['status' => 'success', 'message' => 'Ditandai sudah direfund manual.']);
    }
}