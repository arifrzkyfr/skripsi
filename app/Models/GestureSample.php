<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GestureSample extends Model
{
    protected $fillable = [

        'gesture_profile_id',

        'f1',
        'f2',

        'ax',
        'ay',
        'az',
    ];
}
