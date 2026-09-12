<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Jobs\ProcessTopupJob;
use App\Services\PakasirService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PakasirWebhookController extends Controller
{
    public function handleWebhook(Request $request, PakasirService $pakasirService)
    {
        $orderId = $request->input('order_id');
        $amount = $request->input('amount');
        $incomingStatus = $request->input('status');

        if (!$orderId || !$amount) {
            return response()->json(['message' => 'Payload tidak lengkap'], 400);
        }

        if ($incomingStatus !== 'completed') {
            return response()->json(['message' => 'Status bukan completed, diabaikan']);
        }

        // WAJIB sesuai anjuran resmi Pakasir: webhook tidak bertanda tangan,
        // jadi selalu double-check ke Transaction Detail API sebelum bertindak.
        $detail = $pakasirService->getTransactionDetail($orderId, $amount);

        if (!$detail || ($detail['status'] ?? null) !== 'completed') {
            Log::warning('Pakasir webhook: gagal diverifikasi ulang ke server Pakasir', [
                'order_id' => $orderId,
                'detail' => $detail,
            ]);
            return response()->json(['message' => 'Verifikasi status gagal'], 202);
        }

        // Cabang khusus top up saldo wallet (bukan transaksi produk game)
        if (str_starts_with($orderId, 'WTP-')) {
            $topup = \App\Models\WalletTopup::where('id', $orderId)->first();

            if (!$topup) {
                Log::error('Pakasir webhook: wallet topup tidak ditemukan', ['order_id' => $orderId]);
                return response()->json(['message' => 'Topup tidak ditemukan'], 404);
            }

            if ((float) $topup->amount !== (float) $amount) {
                Log::critical('Pakasir webhook (topup): nominal tidak cocok!', [
                    'order_id' => $orderId,
                    'expected' => $topup->amount,
                    'received' => $amount,
                ]);
                return response()->json(['message' => 'Nominal tidak cocok'], 400);
            }

            \App\Http\Controllers\Api\WalletController::markTopupPaid($orderId);
            Log::info("Top up saldo {$orderId} berhasil diproses via Pakasir.");

            return response()->json(['message' => 'OK']);
        }

        $transaction = Transaction::where('trx_id', $orderId)->first();

        if (!$transaction) {
            Log::error('Pakasir webhook: transaksi tidak ditemukan', ['order_id' => $orderId]);
            return response()->json(['message' => 'Transaksi tidak ditemukan'], 404);
        }

        if (in_array($transaction->status, ['PAID', 'SUCCESS'])) {
            return response()->json(['message' => 'Sudah diproses sebelumnya']);
        }

        if ((float) $transaction->amount !== (float) $amount) {
            Log::critical('Pakasir webhook: nominal tidak cocok!', [
                'order_id' => $orderId,
                'expected' => $transaction->amount,
                'received' => $amount,
            ]);
            return response()->json(['message' => 'Nominal tidak cocok'], 400);
        }

        $transaction->update(['status' => 'PAID']);

        ProcessTopupJob::dispatch($transaction->trx_id);

        return response()->json(['message' => 'OK']);
    }
}