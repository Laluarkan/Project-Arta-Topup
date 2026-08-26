<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('name');
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('providers', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('name');
            $table->text('api_config')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            
            $table->string('category_id', 50);
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('cascade');
            
            $table->string('provider_id', 50);
            $table->foreign('provider_id')->references('id')->on('providers')->onDelete('cascade');
            
            $table->string('buyer_sku_code')->unique();
            $table->string('product_name');
            $table->decimal('price_member', 15, 2);
            $table->decimal('price_reseller', 15, 2);
            $table->decimal('provider_price', 15, 2);
            $table->enum('stock_status', ['available', 'empty', 'disturbed'])->default('available');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
        Schema::dropIfExists('providers');
        Schema::dropIfExists('categories');
    }
};