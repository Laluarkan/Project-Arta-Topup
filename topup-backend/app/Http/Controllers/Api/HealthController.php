<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class HealthController extends Controller
{
    /**
     * Endpoint untuk dimonitor oleh UptimeRobot.
     * Mengecek apakah ada transaksi PAID yang macet > 5 menit karena worker mati.
     */
    public function checkWorker()
    {
        $stuckTransactionsCount = Transaction::where('status', 'PAID')
            ->where('created_at', '<', Carbon::now()->subMinutes(5))
            ->count();

        if ($stuckTransactionsCount > 0) {
            Log::critical("HEALTH CHECK GAGAL: Terdapat {$stuckTransactionsCount} transaksi PAID yang nyangkut lebih dari 5 menit. Queue worker kemungkinan besar mati atau crash!");
            
            return response()->json([
                'status' => 'error',
                'message' => "Worker down atau lag parah. {$stuckTransactionsCount} transaksi nyangkut."
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Worker berjalan normal. Tidak ada transaksi yang nyangkut.'
        ], 200);
    }
}