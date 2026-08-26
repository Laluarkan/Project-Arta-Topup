<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
// use Illuminate\Http\Request;
use App\Models\AuditLog;

class AuditLogController extends Controller
{
    public function index()
    {
        $logs = AuditLog::with('user')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'status' => 'success',
            'data' => $logs
        ]);
    }
}