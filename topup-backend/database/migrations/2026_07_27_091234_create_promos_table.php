<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promos', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // Wajib string
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('code')->unique();
            $table->enum('type', ['percent', 'nominal']);
            $table->decimal('value', 12, 2);
            $table->integer('limit')->nullable(); 
            $table->integer('used')->default(0);
            $table->date('expired_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promos');
    }
};