<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\Setting;

class GameInquiryController extends Controller
{
    public function check(Request $request)
    {
        $request->validate([
            'game' => 'required|string',
            'user_id' => 'required|string',
            'zone_id' => 'nullable|string'
        ]);

        $game = strtoupper($request->game);
        $userId = $request->user_id;
        $zoneId = $request->zone_id;
        $nickname = null;

        // Cek mode aplikasi (production / development)
        $dbMode = Setting::where('key', 'api_mode')->value('value');
        $apiMode = $dbMode ?? (env('APP_ENV') === 'production' ? 'production' : 'development');

        try {
            // 1. Mencoba menembak API Gratisan Komunitas
            if (Str::contains($game, 'MOBILE LEGENDS')) {
                $response = Http::timeout(5)->get("https://api.isan.eu.org/nickname/ml", [
                    'id' => $userId,
                    'zone' => $zoneId
                ]);
                
                if ($response->successful() && isset($response->json()['name'])) {
                    $nickname = $response->json()['name'];
                }
            } elseif (Str::contains($game, 'FREE FIRE')) {
                $response = Http::timeout(5)->get("https://api.isan.eu.org/nickname/ff", [
                    'id' => $userId
                ]);
                
                if ($response->successful() && isset($response->json()['name'])) {
                    $nickname = $response->json()['name'];
                }
            } 
            
            // 2. Jika API Gratis Mengembalikan Data Asli
            if ($nickname) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'nickname' => urldecode($nickname)
                    ]
                ]);
            }

            // 3. PENCEGAHAN DI MODE PRODUCTION
            // Jika mode API adalah production dan tidak ada nama yang ditemukan, lempar error.
            if ($apiMode === 'production') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nickname tidak ditemukan. Pastikan ID Anda sudah benar atau layanan pengecekan sedang gangguan.'
                ], 404);
            }

            // 4. FALLBACK MOCK (Jaring Pengaman KHUSUS mode Development)
            $dummyName = "Player_" . substr($userId, 0, 4) . "_Pro";
            
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nickname' => $dummyName . " (Mode Simulasi)"
                ]
            ]);

        } catch (\Exception $e) {
            // Cegah fallback nama palsu jika terjadi timeout di production
            if ($apiMode === 'production') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal menghubungi server pengecekan nickname. Silakan cek kembali ID Anda.'
                ], 500);
            }

            // Jika terjadi Timeout atau Server Down di Development, kembalikan data Dummy
            $dummyName = "Player_" . substr($userId, 0, 4) . "_Pro";
            
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nickname' => $dummyName . " (Mode Simulasi)"
                ]
            ]);
        }
    }
}