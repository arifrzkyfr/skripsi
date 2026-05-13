<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('gestures', function (Blueprint $table) {

            $table->id();

            $table->integer('f1');
            $table->integer('f2');

            $table->integer('ax');
            $table->integer('ay');

            $table->string('label');

            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gestures');
    }
};