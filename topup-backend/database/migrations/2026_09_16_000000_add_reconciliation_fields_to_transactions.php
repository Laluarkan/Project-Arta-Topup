<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom-kolom ini dipakai untuk alur reconciliation: saat request topup ke Digiflazz
     * timeout/putus koneksi (kita TIDAK tahu apakah mereka sempat memproses atau tidak),
     * transaksi ditahan di status PROCESSING dan dicek ulang berkala lewat cekStatus(),
     * bukan langsung diasumsikan gagal lalu direfund begitu saja.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedTinyInteger('reconciliation_attempts')->default(0)->after('manual_refund_completed_at');
            $table->timestamp('last_reconciliation_at')->nullable()->after('reconciliation_attempts');

            // Dinaikkan jadi true kalau sudah mencoba cekStatus() berkali-kali tapi Digiflazz
            // tetap tidak memberi kepastian (misal API mereka down berkepanjangan).
            // Admin HARUS cek manual (lewat dashboard Digiflazz/CS mereka) sebelum memutuskan
            // status akhir transaksi ini — sistem sengaja tidak menebak/auto-refund di kondisi ini.
            $table->boolean('needs_reconciliation_review')->default(false)->after('last_reconciliation_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['reconciliation_attempts', 'last_reconciliation_at', 'needs_reconciliation_review']);
        });
    }
};