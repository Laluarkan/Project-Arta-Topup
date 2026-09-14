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
    public function index()
    {
        $transactions = Transaction::with(['user', 'product'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'status' => 'success',
            'data' => $transactions
        ]);
    }

    public function retryTopup(Request $request, $id)
    {
        try {
            $transaction = Transaction::where('id', $id)->orWhere('trx_id', $id)->firstOrFail();

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

            $transaction = Transaction::where('id', $id)->orWhere('trx_id', $id)->firstOrFail();
            
            $oldStatus = $transaction->status;
            $newStatus = $request->status;

            // Jangan update jika statusnya sama
            if ($oldStatus === $newStatus) {
                return response()->json(['status' => 'success', 'message' => 'Status tidak ada perubahan', 'data' => $transaction]);
            }

            $transaction->update(['status' => $newStatus]);

            // Refund otomatis hanya jika status dipaksa ke FAILED dari status selain FAILED, DAN metode bayar wallet
            if ($newStatus === 'FAILED' && $transaction->payment_method === 'wallet') {
                $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();
                if ($user) {
                    $balanceBefore = $user->balance;
                    $user->balance += $transaction->amount;
                    $user->save();

                    WalletTransaction::create([
                        'user_id' => $user->id,
                        'type' => 'refund',
                        'amount' => $transaction->amount,
                        'balance_before' => $balanceBefore,
                        'balance_after' => $user->balance,
                        'reference_id' => $transaction->trx_id
                    ]);
                }
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
}