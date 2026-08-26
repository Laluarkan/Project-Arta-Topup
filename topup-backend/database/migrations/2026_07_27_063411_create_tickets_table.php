<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // Wajib string
            
            $table->string('user_id', 50); // Menyesuaikan ID User yang baru
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->string('subject');
            $table->text('message');
            $table->enum('status', ['OPEN', 'REPLIED', 'CLOSED'])->default('OPEN');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};