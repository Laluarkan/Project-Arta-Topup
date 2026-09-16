<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('wallet_topups')) {
            Schema::create('wallet_topups', function (Blueprint $table) {
                $table->string('id', 30)->primary();
                $table->string('user_id', 50);
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

                $table->decimal('amount', 15, 2);
                $table->enum('payment_method', ['midtrans', 'pakasir', 'manual']);
                $table->enum('status', ['PENDING', 'PAID', 'REJECTED', 'EXPIRED'])->default('PENDING');

                $table->string('idempotency_key')->nullable()->unique();
                $table->string('midtrans_transaction_id')->nullable();

                // Khusus metode manual (transfer bank)
                $table->string('proof_image_path')->nullable();
                $table->string('sender_bank')->nullable();
                $table->string('sender_name')->nullable();
                $table->string('sender_account_number')->nullable();

                // Review admin (khusus manual)
                $table->text('admin_note')->nullable();
                $table->string('reviewed_by', 50)->nullable();
                $table->timestamp('reviewed_at')->nullable();

                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_topups');
    }
};