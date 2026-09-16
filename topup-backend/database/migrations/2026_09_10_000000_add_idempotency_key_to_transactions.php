<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('transactions', 'idempotency_key')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->string('idempotency_key')->nullable()->unique()->after('trx_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('transactions', 'idempotency_key')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropColumn('idempotency_key');
            });
        }
    }
};