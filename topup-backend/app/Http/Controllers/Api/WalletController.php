<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use App\Models\WalletTopup;
use App\Models\WalletTransaction;
use App\Services\MidtransService;
use App\Services\PakasirService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    private function isGatewayEnabled(string $gateway): bool
    {
        $raw = Setting::where('key', 'active_payment_gateways')->value('value');
        $gateways = $raw ? json_decode($raw, true) : ['wallet' => true, 'midtrans' => true, 'pakasir' => true];
        return $gateways[$gateway] ?? true;
    }

    /**
     * Riwayat mutasi saldo user yang sedang login (isi ulang, potongan checkout, refund).
     */
    public function history(Request $request)
    {
        $transactions = WalletTransaction::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $transactions
        ]);
    }

    /**
     * Buat permintaan top up via Midtrans.
     */
    public function topupMidtrans(Request $request, MidtransService $midtransService)
    {
        if (!$this->isGatewayEnabled('midtrans')) {
            return response()->json(['status' => 'error', 'message' => 'Metode pembayaran ini sedang tidak tersedia'], 503);
        }

        $request->validate([
            'amount' => 'required|numeric|min:10000|max:10000000',
            'idempotency_key' => 'nullable|string|max:100'
        ]);

        $user = $request->user();

        if ($request->idempotency_key) {
            $existing = WalletTopup::where('idempotency_key', $request->idempotency_key)->first();
            if ($existing) {
                return response()->json(['status' => 'success', 'message' => 'Permintaan sudah pernah dibuat sebelumnya', 'data' => ['topup' => $existing]]);
            }
        }

        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => $request->amount,
            'payment_method' => 'midtrans',
            'status' => 'PENDING',
            'idempotency_key' => $request->idempotency_key,
        ]);

        $snapToken = $midtransService->createSnapTokenGeneric(
            $topup->id,
            $topup->amount,
            'Top Up Saldo ArTa Zone',
            $user,
            $user->email,
            $user->phone
        );

        if (!$snapToken) {
            $topup->update(['status' => 'REJECTED', 'admin_note' => 'Gagal membuat token Midtrans']);
            return response()->json(['status' => 'error', 'message' => 'Gagal membuat transaksi pembayaran. Coba lagi.'], 500);
        }

        $apiMode = Setting::where('key', 'api_mode')->value('value') ?? 'development';
        $clientKey = $apiMode === 'production'
            ? env('MIDTRANS_CLIENT_KEY_PROD', env('MIDTRANS_CLIENT_KEY'))
            : env('MIDTRANS_CLIENT_KEY_DEV', env('MIDTRANS_CLIENT_KEY'));

        return response()->json([
            'status' => 'success',
            'data' => [
                'topup' => $topup,
                'snap_token' => $snapToken,
                'api_mode' => $apiMode,
                'client_key' => $clientKey
            ]
        ]);
    }

    /**
     * Buat permintaan top up via Pakasir.
     */
    public function topupPakasir(Request $request, PakasirService $pakasirService)
    {
        if (!$this->isGatewayEnabled('pakasir')) {
            return response()->json(['status' => 'error', 'message' => 'Metode pembayaran ini sedang tidak tersedia'], 503);
        }

        $request->validate([
            'amount' => 'required|numeric|min:10000|max:10000000',
            'idempotency_key' => 'nullable|string|max:100'
        ]);

        $user = $request->user();

        if ($request->idempotency_key) {
            $existing = WalletTopup::where('idempotency_key', $request->idempotency_key)->first();
            if ($existing) {
                return response()->json(['status' => 'success', 'message' => 'Permintaan sudah pernah dibuat sebelumnya', 'data' => ['topup' => $existing]]);
            }
        }

        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => $request->amount,
            'payment_method' => 'pakasir',
            'status' => 'PENDING',
            'idempotency_key' => $request->idempotency_key,
        ]);

        $pakasirResponse = $pakasirService->createTransaction($topup->id, $topup->amount, 'qris');

        if (!$pakasirResponse) {
            $topup->update(['status' => 'REJECTED', 'admin_note' => 'Gagal membuat transaksi Pakasir']);
            return response()->json(['status' => 'error', 'message' => 'Gagal membuat transaksi pembayaran. Coba lagi.'], 500);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'topup' => $topup,
                'payment_number' => $pakasirResponse['payment_number'] ?? null,
                'total_payment' => $pakasirResponse['total_payment'] ?? null,
                'expired_at' => $pakasirResponse['expired_at'] ?? null,
            ]
        ]);
    }

    /**
     * Ajukan top up manual (transfer bank), menunggu review admin.
     */
    public function topupManual(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:10000|max:50000000',
            'sender_bank' => 'required|string|max:50',
            'sender_name' => 'required|string|max:100',
            'sender_account_number' => 'required|string|max:30',
            'proof_image' => 'required|image|mimes:jpg,jpeg,png|max:5120',
        ]);

        $user = $request->user();

        $path = $request->file('proof_image')->store('wallet-topup-proofs', config('filesystems.uploads_disk'));

        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => $request->amount,
            'payment_method' => 'manual',
            'status' => 'PENDING',
            'sender_bank' => $request->sender_bank,
            'sender_name' => $request->sender_name,
            'sender_account_number' => $request->sender_account_number,
            'proof_image_path' => $path,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Permintaan top up manual sudah dikirim. Saldo akan ditambahkan setelah admin memverifikasi bukti transfer (biasanya dalam 1x24 jam).',
            'data' => ['topup' => $topup]
        ]);
    }

    /**
     * Cek status satu permintaan top up (untuk polling di frontend).
     */
    public function show(Request $request, $id)
    {
        $topup = WalletTopup::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return response()->json(['status' => 'success', 'data' => $topup]);
    }

    /**
     * Info rekening tujuan transfer manual (diatur admin lewat Setting).
     */
    public function manualTransferInfo()
    {
        $raw = Setting::where('key', 'manual_transfer_info')->value('value');
        $info = $raw ? json_decode($raw, true) : null;

        return response()->json(['status' => 'success', 'data' => $info]);
    }

    /**
     * Dipanggil oleh webhook Midtrans/Pakasir ketika trx_id berawalan WTP-.
     * Menambah saldo user + catat ledger, idempotent (aman dipanggil berkali-kali).
     */
    public static function markTopupPaid(string $topupId): void
    {
        DB::transaction(function () use ($topupId) {
            $topup = WalletTopup::where('id', $topupId)->lockForUpdate()->first();

            if (!$topup || $topup->status === 'PAID') {
                return; // sudah diproses sebelumnya atau tidak ditemukan
            }

            $user = User::where('id', $topup->user_id)->lockForUpdate()->first();
            if (!$user) return;

            $balanceBefore = $user->balance;
            $user->increment('balance', $topup->amount);

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => 'topup',
                'amount' => $topup->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceBefore + $topup->amount,
                'reference_id' => $topup->id,
            ]);

            $topup->update(['status' => 'PAID']);
        });
    }
}