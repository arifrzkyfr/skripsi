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

            // Relasi ke tabel profiles
            $table->foreignId('profile_id')
                ->constrained('profiles')
                ->onDelete('cascade');

            $table->string('gesture_name');

            // Jumlah sampel yang direkam
            $table->integer('total_sample')->default(0);

            // Hasil analisis deskripsi dari Gemma-2B
            $table->text('ai_analysis')->nullable();

            // =====================================
            // STATISTIK DATASET (dari AIController)
            // Rata-rata nilai normalized per channel
            // =====================================
            $table->float('avg_f1')->nullable();
            $table->float('avg_f2')->nullable();
            $table->float('avg_ax')->nullable();
            $table->float('avg_ay')->nullable();
            $table->float('avg_az')->nullable();

            // Standar deviasi per channel
            $table->float('std_f1')->nullable();
            $table->float('std_f2')->nullable();
            $table->float('std_ax')->nullable();
            $table->float('std_ay')->nullable();
            $table->float('std_az')->nullable();

            // =====================================
            // THRESHOLD (hasil analisis Gemma-2B)
            // Dalam skala normalized 0.0 - 1.0
            // =====================================
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
