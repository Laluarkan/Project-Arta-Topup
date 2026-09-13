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
            'icon' => 'sometimes|nullable|url',
            'is_active' => 'required|boolean',
        ]);

        $category = Category::findOrFail($id);

        $updateData = ['is_active' => $request->is_active];

        // Cuma update icon kalau field-nya memang dikirim di request ini.
        // Kalau tidak dikirim sama sekali (misal form cuma ubah status aktif),
        // JANGAN timpa icon yang sudah ada (misal hasil upload) jadi kosong.
        if ($request->has('icon')) {
            $updateData['icon'] = $request->icon;
        }

        $category->update($updateData);

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

    public function uploadIcon(Request $request, $id)
    {
        $request->validate([
            'icon' => 'required|image|mimes:png,jpg,jpeg,webp,svg|max:1024', // maks 1MB
        ]);

        $category = Category::findOrFail($id);

        // Hapus file lama kalau itu file lokal (bukan URL eksternal), supaya storage tidak menumpuk sampah
        if ($category->icon && !str_starts_with($category->icon, 'http')) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($category->icon);
        }

        $path = $request->file('icon')->store('categories', 'public');

        $category->update(['icon' => $path]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Upload Icon Kategori (Self-Hosted)',
            'target' => 'Kategori: ' . $category->name
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Icon berhasil diupload dan disimpan di server sendiri',
            'data' => $category
        ]);
    }

    /**
     * Migrasi massal: download semua icon yang masih berupa URL eksternal (hotlink),
     * simpan ke storage sendiri, lalu update kolom icon ke path lokal.
     * Best practice: hindari hotlink pihak ketiga demi kecepatan & keandalan jangka panjang.
     */
    public function migrateExternalIcons(Request $request)
    {
        $categories = Category::where('icon', 'like', 'http%')->get();
        $migrated = 0;
        $failed = 0;

        foreach ($categories as $category) {
            try {
                $response = Http::timeout(10)->get($category->icon);

                if (!$response->successful()) {
                    $failed++;
                    continue;
                }

                $contentType = $response->header('Content-Type');
                $extension = match (true) {
                    str_contains($contentType, 'svg') => 'svg',
                    str_contains($contentType, 'webp') => 'webp',
                    str_contains($contentType, 'png') => 'png',
                    default => 'jpg',
                };

                $filename = 'categories/' . $category->id . '-' . time() . '.' . $extension;
                \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $response->body());

                $category->update(['icon' => $filename]);
                $migrated++;
            } catch (\Throwable $e) {
                $failed++;
                \Illuminate\Support\Facades\Log::error("Gagal migrasi icon kategori {$category->id}: " . $e->getMessage());
            }
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Migrasi Icon ke Self-Hosted Storage',
            'target' => "{$migrated} berhasil, {$failed} gagal"
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Migrasi selesai. {$migrated} icon berhasil dipindah ke storage sendiri, {$failed} gagal (kemungkinan URL sudah mati)."
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
                    // Langsung download & simpan lokal, JANGAN simpan URL Clearbit-nya
                    // (kalau disimpan sebagai URL, ini jadi hotlink baru yang lambat/rapuh lagi).
                    $filename = 'categories/' . $category->id . '-' . time() . '.png';
                    \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $response->body());
                    $category->update(['icon' => $filename]);
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