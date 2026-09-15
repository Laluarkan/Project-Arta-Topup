<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->boolean('needs_manual_refund')->default(false)->after('status_note');
            $table->timestamp('manual_refund_completed_at')->nullable()->after('needs_manual_refund');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['needs_manual_refund', 'manual_refund_completed_at']);
        });
    }
};