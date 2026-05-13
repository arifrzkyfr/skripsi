<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $fillable = [
        'name',
        'description'
    ];

    public function gestures()
    {
        return $this->hasMany(GestureProfile::class);
    }
}
