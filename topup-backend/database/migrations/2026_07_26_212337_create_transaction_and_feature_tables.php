<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets_transactions', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            
            $table->string('user_id', 50);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->enum('type', ['topup', 'deduction', 'refund']);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference_id')->nullable();
            $table->timestamps();
        });

        Schema::create('vouchers', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('code')->unique();
            $table->enum('type', ['percent', 'fixed']);
            $table->decimal('value', 15, 2);
            $table->decimal('min_transaction', 15, 2)->default(0);
            $table->decimal('max_discount', 15, 2)->default(0);
            $table->integer('usage_limit')->default(0);
            $table->integer('used_count')->default(0);
            $table->timestamp('expired_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->string('trx_id', 50)->primary();
            
            $table->string('user_id', 50)->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            
            $table->string('guest_email')->nullable(); // Saya gabungkan guest_email langsung ke sini
            
            $table->string('product_id', 50);
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            
            $table->string('user_game_id');
            $table->string('zone_id')->nullable();
            $table->decimal('amount', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->string('voucher_code')->nullable();
            $table->enum('payment_method', ['wallet', 'qris', 'va', 'ewallet']);
            $table->string('midtrans_transaction_id')->nullable();
            $table->string('digiflazz_ref_id')->unique();
            $table->enum('status', ['PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'COMPLAINED'])->default('PENDING');
            $table->text('status_note')->nullable();
            $table->timestamps();
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            
            $table->string('trx_id', 50);
            $table->foreign('trx_id')->references('trx_id')->on('transactions')->onDelete('cascade');
            
            $table->string('user_id', 50);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->text('message');
            $table->enum('status', ['open', 'in_progress', 'resolved-refund', 'resolved-resend', 'rejected'])->default('open');
            $table->text('admin_response')->nullable();
            
            $table->string('handled_by', 50)->nullable();
            $table->foreign('handled_by')->references('id')->on('users')->onDelete('set null');
            
            $table->timestamps();
        });

        // Hapus migration AuditLog terpisah yang kamu miliki, pakai yang ada di dalam blok ini saja
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            
            $table->string('user_id', 50)->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            
            $table->string('action');
            $table->string('target_table')->nullable();
            $table->string('target_id')->nullable();
            $table->string('target')->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            
            $table->string('user_id', 50)->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->enum('type', ['transaction', 'promo', 'system']);
            $table->enum('channel', ['email', 'wa', 'in-app']);
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('wallets_transactions');
    }
};