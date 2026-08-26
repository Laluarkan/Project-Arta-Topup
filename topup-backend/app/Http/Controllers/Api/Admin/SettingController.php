<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Setting;
use App\Models\AuditLog;
use App\Services\DigiflazzService;
use Throwable;

class SettingController extends Controller
{
    public function index(DigiflazzService $digiflazzService)
    {
        try {
            $settings = Setting::pluck('value', 'key')->toArray();
            
            $saldoResponse = $digiflazzService->cekSaldo();
            $settings['digiflazz_balance'] = $saldoResponse['status'] ? ($saldoResponse['data']['deposit'] ?? 0) : 0;
            
            return response()->json([
                'status' => 'success',
                'data' => $settings
            ]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'settings' => 'required|array',
                'settings.*.key' => 'required|string',
                'settings.*.value' => 'required'
            ]);

            foreach ($request->settings as $setting) {
                Setting::updateOrCreate(
                    ['key' => $setting['key']], 
                    ['value' => $setting['value']]
                );
            }

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Mengubah Pengaturan Sistem',
                'target' => 'Memperbarui ' . count($request->settings) . ' pengaturan'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Pengaturan sistem berhasil disimpan'
            ]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }
}