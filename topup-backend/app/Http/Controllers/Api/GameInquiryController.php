<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

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
            
            // 2. Jika API Gratis Mengembalikan Data
            if ($nickname) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'nickname' => urldecode($nickname)
                    ]
                ]);
            }

            // 3. FALLBACK MOCK (Jaring Pengaman saat API Down)
            // Jika API mati/error 522, kita buatkan nickname palsu agar UI Frontend tetap bisa dites
            $dummyName = "Player_" . substr($userId, 0, 4) . "_Pro";
            
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nickname' => $dummyName . " (Mode Simulasi)"
                ]
            ]);

        } catch (\Exception $e) {
            // Jika terjadi Timeout atau Server Down, tetap kembalikan data Dummy
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