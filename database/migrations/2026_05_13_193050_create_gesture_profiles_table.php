<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gesture_profiles', function (Blueprint $table) {
            $table->id();

            // Relasi ke table profiles
            $table->foreignId('profile_id')->constrained('profiles')->onDelete('cascade');

            $table->string('gesture_name');
            $table->text('ai_analysis')->nullable(); // Diubah menjadi khusus menyimpan deskripsi

            // Rentang Sensor (Hasil dari LLM)
            $table->float('min_f1')->nullable();
            $table->float('max_f1')->nullable();

            $table->float('min_f2')->nullable();
            $table->float('max_f2')->nullable();

            $table->float('min_ax')->nullable();
            $table->float('max_ax')->nullable();

            $table->float('min_ay')->nullable();
            $table->float('max_ay')->nullable();

            $table->float('min_az')->nullable();
            $table->float('max_az')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gesture_profiles');
    }
};
