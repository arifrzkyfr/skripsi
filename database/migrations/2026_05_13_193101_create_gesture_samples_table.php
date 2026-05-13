<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gesture_samples', function (Blueprint $table) {

            $table->id();

            $table->foreignId('gesture_profile_id')
                ->constrained()
                ->onDelete('cascade');

            $table->integer('f1');
            $table->integer('f2');

            $table->integer('ax');
            $table->integer('ay');
            $table->integer('az');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gesture_samples');
    }
};
