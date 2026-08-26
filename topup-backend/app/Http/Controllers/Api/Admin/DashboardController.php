<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
// use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Ticket;
use App\Models\AuditLog;
use App\Models\User;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();

        $omzetHariIni = Transaction::whereIn('status', ['PAID', 'SUCCESS'])
            ->whereDate('created_at', $today)
            ->sum('amount');

        $stats = [
            'omzet' => (int) $omzetHariIni,
            'profit' => (int) ($omzetHariIni * 0.08), 
            'pending_trx' => Transaction::where('status', 'PENDING')->count(),
            'active_users' => User::count(),
        ];

        $recentTransactions = Transaction::with(['user', 'product'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $recentTickets = Ticket::with('user')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $recentLogs = AuditLog::with('user')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'stats' => $stats,
                'transactions' => $recentTransactions,
                'tickets' => $recentTickets,
                'audit_logs' => $recentLogs
            ]
        ]);
    }
}