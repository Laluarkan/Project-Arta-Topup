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
            if (Str::contains($game, 'MOBILE LEGENDS')) {
                $response = Http::timeout(10)->get("https://api.isan.eu.org/nickname/ml", [
                    'id' => $userId,
                    'zone' => $zoneId
                ]);
                
                if ($response->successful() && isset($response->json()['name'])) {
                    $nickname = $response->json()['name'];
                }
            } elseif (Str::contains($game, 'FREE FIRE')) {
                $response = Http::timeout(10)->get("https://api.isan.eu.org/nickname/ff", [
                    'id' => $userId
                ]);
                
                if ($response->successful() && isset($response->json()['name'])) {
                    $nickname = $response->json()['name'];
                }
            } 
            
            if ($nickname) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'nickname' => urldecode($nickname)
                    ]
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'ID tidak ditemukan atau game belum didukung pengecekan otomatis.'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Layanan pengecekan sedang gangguan, silakan coba lagi nanti.'
            ], 500);
        }
    }
}