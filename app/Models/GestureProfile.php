<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GestureProfile extends Model
{
    protected $fillable = [
        'profile_id',
        'gesture_name',
        'total_sample',

        // Hasil analisis Gemma-2B
        'ai_analysis',

        // Rata-rata normalized
        'avg_f1',
        'avg_f2',
        'avg_ax',
        'avg_ay',
        'avg_az',

        // Standar deviasi
        'std_f1',
        'std_f2',
        'std_ax',
        'std_ay',
        'std_az',

        // Threshold dari Gemma-2B (skala 0.0 - 1.0)
        'min_f1',
        'max_f1',
        'min_f2',
        'max_f2',
        'min_ax',
        'max_ax',
        'min_ay',
        'max_ay',
        'min_az',
        'max_az',
    ];

    // Relasi ke Profile
    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }

    // Relasi ke GestureSample
    public function samples()
    {
        return $this->hasMany(GestureSample::class);
    }

    // Helper: cek apakah sudah dianalisis AI
    public function isAnalyzed()
    {
        return !is_null($this->ai_analysis);
    }
}
