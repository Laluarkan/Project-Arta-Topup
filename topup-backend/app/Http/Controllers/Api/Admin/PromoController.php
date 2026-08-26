<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Promo;

class PromoController extends Controller
{
    public function index()
    {
        $promos = Promo::orderBy('created_at', 'desc')->get();
        return response()->json(['status' => 'success', 'data' => $promos]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'code' => 'required|string|unique:promos',
            'type' => 'required|in:percent,nominal',
            'value' => 'required|numeric|min:0',
            'limit' => 'nullable|numeric|min:1',
            'expired_at' => 'nullable|date',
            'is_active' => 'boolean'
        ]);

        $promo = Promo::create($validated);
        return response()->json(['status' => 'success', 'data' => $promo]);
    }

    public function update(Request $request, $id)
    {
        $promo = Promo::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'code' => 'required|string|unique:promos,code,'.$id,
            'type' => 'required|in:percent,nominal',
            'value' => 'required|numeric|min:0',
            'limit' => 'nullable|numeric|min:1',
            'expired_at' => 'nullable|date',
            'is_active' => 'boolean'
        ]);

        $promo->update($validated);
        return response()->json(['status' => 'success', 'data' => $promo]);
    }

    public function destroy($id)
    {
        Promo::destroy($id);
        return response()->json(['status' => 'success', 'message' => 'Promo dihapus']);
    }
}