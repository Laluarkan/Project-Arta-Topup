<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Category;
use App\Models\AuditLog;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount('products')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $categories
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'icon' => 'nullable|url',
            'is_active' => 'required|boolean',
        ]);

        $category = Category::findOrFail($id);
        
        $category->update([
            'icon' => $request->icon,
            'is_active' => $request->is_active,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Mengedit Kategori Manual',
            'target' => 'Kategori: ' . $category->name
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Data kategori berhasil diperbarui',
            'data' => $category
        ]);
    }

    public function autoFetchLogos(Request $request)
    {
        // Ambil kategori yang belum punya icon/logo
        $categories = Category::whereNull('icon')->orWhere('icon', '')->get();
        $updatedCount = 0;

        foreach ($categories as $category) {
            // Bersihkan nama kategori untuk menebak domain (misal: "Free Fire" jadi "freefire.com")
            $cleanName = strtolower(preg_replace('/[^A-Za-z0-9]/', '', $category->name));
            
            // Kita coba tebak dengan ekstensi .com dan .co.id
            $domains = [$cleanName . '.com', $cleanName . '.co.id', $cleanName . '.id'];
            $found = false;

            foreach ($domains as $domain) {
                $url = "https://logo.clearbit.com/" . $domain;
                
                // Cek apakah API Clearbit memiliki logo untuk domain tebakan ini
                $response = Http::timeout(5)->get($url);
                
                if ($response->successful()) {
                    $category->update(['icon' => $url]);
                    $updatedCount++;
                    $found = true;
                    break; 
                }
            }
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Auto-Fetch Logo Kategori',
            'target' => $updatedCount . ' Logo Berhasil Ditemukan'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Proses Auto-Fetch selesai. {$updatedCount} logo baru berhasil ditemukan dan dipasang!"
        ]);
    }
}