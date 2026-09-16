<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * provider_price di tabel products itu NILAI TERKINI (berubah tiap sync harga
     * Digiflazz). Untuk laporan rekonsiliasi/margin yang akurat, kita butuh harga
     * modal PERSIS SAAT transaksi itu terjadi, bukan harga modal hari ini.
     *
     * Kolom ini diisi otomatis di TransactionController saat checkout (snapshot dari
     * $product->provider_price pada saat itu). Transaksi lama (sebelum migration ini)
     * akan NULL -- ReconciliationController fallback ke provider_price product saat
     * ini untuk transaksi lama tersebut (kurang akurat tapi lebih baik dari tidak ada
     * data sama sekali, dan sudah dijelaskan sebagai keterbatasan di laporan).
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'provider_price_snapshot')) {
                $table->decimal('provider_price_snapshot', 15, 2)->nullable()->after('amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'provider_price_snapshot')) {
                $table->dropColumn('provider_price_snapshot');
            }
        });
    }
};