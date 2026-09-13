<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\WalletTopup;
use Illuminate\Http\Request;

class WalletTopupController extends Controller
{
    public function index(Request $request)
    {
        $query = WalletTopup::with('user:id,name,email')
            ->orderBy('created_at', 'desc');

        // Filter opsional: kalau tidak dikirim, tampilkan SEMUA metode (manual/midtrans/pakasir)
        // supaya admin bisa lihat & audit seluruh riwayat top up, bukan cuma yang butuh review manual.
        if ($request->payment_method) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->paginate(20)
        ]);
    }

    public function approve(Request $request, $id)
    {
        $topup = WalletTopup::findOrFail($id);

        if ($topup->payment_method !== 'manual') {
            return response()->json(['status' => 'error', 'message' => 'Top up via payment gateway otomatis tidak bisa di-approve manual. Statusnya mengikuti konfirmasi pembayaran asli.'], 400);
        }

        if ($topup->status !== 'PENDING') {
            return response()->json(['status' => 'error', 'message' => 'Permintaan ini sudah diproses sebelumnya.'], 400);
        }

        WalletController::markTopupPaid($topup->id);

        $topup->update([
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'admin_note' => $request->admin_note,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'approve_wallet_topup',
            'target' => "Top up manual {$topup->id} sebesar Rp" . number_format($topup->amount, 0, ',', '.'),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Top up disetujui, saldo user sudah ditambahkan.']);
    }

    public function reject(Request $request, $id)
    {
        $request->validate(['admin_note' => 'required|string|max:500']);

        $topup = WalletTopup::findOrFail($id);

        if ($topup->status !== 'PENDING') {
            return response()->json(['status' => 'error', 'message' => 'Permintaan ini sudah diproses sebelumnya.'], 400);
        }

        $topup->update([
            'status' => 'REJECTED',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'admin_note' => $request->admin_note,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'reject_wallet_topup',
            'target' => "Top up manual {$topup->id}: {$request->admin_note}",
        ]);

        return response()->json(['status' => 'success', 'message' => 'Top up ditolak.']);
    }
}