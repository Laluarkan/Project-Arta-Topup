<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Sebelumnya migration ini pakai `ALTER TABLE ... DROP CONSTRAINT ... CHECK (...)`,
     * yaitu sintaks CHECK constraint khusus PostgreSQL. Cocok untuk database produksi
     * (Render pakai Postgres), tapi bikin migration ini gagal total kalau dijalankan
     * di SQLite (dipakai untuk automated testing) atau MySQL, dengan error:
     * "syntax error near CONSTRAINT". Akibatnya `php artisan migrate` tidak bisa
     * jalan sama sekali di luar Postgres.
     *
     * Diperbaiki jadi driver-aware: cek DB::getDriverName() dulu, baru jalankan
     * statement yang sesuai. SQLite dilewati saja karena tidak punya mekanisme
     * ALTER CHECK constraint yang sama, dan validasi nilai payment_method yang
     * valid tetap dijaga di level controller (lihat validasi request).
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check");
            DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('wallet', 'qris', 'va', 'ewallet', 'pakasir'))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE transactions MODIFY payment_method ENUM('wallet', 'qris', 'va', 'ewallet', 'pakasir') NOT NULL");
        }
        // SQLite: tidak ada CHECK constraint native yang perlu diubah di sini.
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check");
            DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('wallet', 'qris', 'va', 'ewallet'))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE transactions MODIFY payment_method ENUM('wallet', 'qris', 'va', 'ewallet') NOT NULL");
        }
    }
};