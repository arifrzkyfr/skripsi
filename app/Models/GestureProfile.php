<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GestureProfile extends Model
{
    protected $fillable = [

        'profile_id',

        'gesture_name',

        'ai_analysis',

        'avg_f1',
        'avg_f2',

        'avg_ax',
        'avg_ay',
        'avg_az',
    ];
}
