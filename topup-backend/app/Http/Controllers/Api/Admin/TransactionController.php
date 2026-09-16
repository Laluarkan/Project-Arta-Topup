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
            Log::error('Gagal memuat daftar transaksi admin: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat daftar transaksi.',
                'debug' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function retryTopup(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $transaction = Transaction::where('trx_id', $id)->lockForUpdate()->firstOrFail();

            if ($transaction->status === 'SUCCESS') {
                DB::rollBack();
                return response()->json(['status' => 'error', 'message' => 'Transaksi sudah sukses, tidak dapat di-retry'], 400);
            }

            if ($transaction->status === 'FAILED') {
                $transaction->update(['status' => 'PAID']);
                
                if ($transaction->payment_method === 'wallet') {
                    $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
                    if ($user) {
                        if ($user->balance < $transaction->amount) {
                            $transaction->update(['status' => 'FAILED']);
                            DB::rollBack();
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

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'RETRY_TRANSACTION',
                'target' => 'Mencoba ulang TRX ' . $transaction->trx_id . ' ke Provider'
            ]);

            DB::commit();

            ProcessTopupJob::dispatch($transaction->trx_id);

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi sedang diproses ulang ke Digiflazz'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
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

            $transaction = Transaction::where('trx_id', $id)->lockForUpdate()->firstOrFail();
            
            $oldStatus = $transaction->status;
            $newStatus = $request->status;

            if ($oldStatus === $newStatus) {
                DB::rollBack();
                return response()->json(['status' => 'success', 'message' => 'Status tidak ada perubahan', 'data' => $transaction]);
            }

            if ($oldStatus === 'FAILED') {
                DB::rollBack();
                return response()->json([
                    'status' => 'error', 
                    'message' => 'Transaksi yang sudah FAILED (dan direfund) tidak boleh diubah manual. Gunakan fitur Retry untuk memproses ulang dengan menarik saldo.'
                ], 400);
            }

            $transaction->update(['status' => $newStatus]);

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
                'message' => 'Terjadi kesalahan pada server saat memperbarui status.'
            ], 500);
        }
    }

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