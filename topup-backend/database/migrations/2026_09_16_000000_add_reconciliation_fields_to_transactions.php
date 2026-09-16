<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom-kolom ini dipakai untuk alur reconciliation: saat request topup ke Digiflazz
     * timeout/putus koneksi.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'reconciliation_attempts')) {
                $table->unsignedTinyInteger('reconciliation_attempts')->default(0)->after('manual_refund_completed_at');
            }
            if (!Schema::hasColumn('transactions', 'last_reconciliation_at')) {
                $table->timestamp('last_reconciliation_at')->nullable()->after('reconciliation_attempts');
            }
            if (!Schema::hasColumn('transactions', 'needs_reconciliation_review')) {
                $table->boolean('needs_reconciliation_review')->default(false)->after('last_reconciliation_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'reconciliation_attempts')) {
                $table->dropColumn('reconciliation_attempts');
            }
            if (Schema::hasColumn('transactions', 'last_reconciliation_at')) {
                $table->dropColumn('last_reconciliation_at');
            }
            if (Schema::hasColumn('transactions', 'needs_reconciliation_review')) {
                $table->dropColumn('needs_reconciliation_review');
            }
        });
    }
};