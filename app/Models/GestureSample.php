<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GestureSample extends Model
{
    protected $fillable = [
        'gesture_profile_id',

        // Raw data dari ESP32
        'f1',
        'f2',
        'ax',
        'ay',
        'az',

        // Normalized data (skala 0.0 - 1.0)
        // Diisi oleh AIController saat analisis
        'f1_norm',
        'f2_norm',
        'ax_norm',
        'ay_norm',
        'az_norm',
    ];

    // Relasi ke GestureProfile
    public function gestureProfile()
    {
        return $this->belongsTo(GestureProfile::class);
    }
}
