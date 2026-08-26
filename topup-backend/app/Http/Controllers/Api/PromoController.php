<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Promo;

class PromoController extends Controller
{
    public function index()
    {
        $promos = Promo::where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expired_at')
                      ->orWhere('expired_at', '>', now());
            })
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json(['status' => 'success', 'data' => $promos]);
    }

    public function validateCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);
        
        $promo = Promo::where('code', $request->code)->where('is_active', true)->first();

        if (!$promo) {
            return response()->json(['status' => 'error', 'message' => 'Kode promo tidak ditemukan.'], 404);
        }
        if ($promo->expired_at && $promo->expired_at < now()) {
            return response()->json(['status' => 'error', 'message' => 'Kode promo sudah kedaluwarsa.'], 400);
        }
        if ($promo->limit !== null && $promo->limit <= 0) {
            return response()->json(['status' => 'error', 'message' => 'Batas penggunaan promo sudah habis.'], 400);
        }

        return response()->json(['status' => 'success', 'data' => $promo]);
    }
}