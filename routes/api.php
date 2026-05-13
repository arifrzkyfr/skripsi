<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GestureController;
use App\Http\Controllers\SensorController;

// DATASET GESTURE
Route::get('/gestures', [GestureController::class, 'index']);

Route::post('/gestures', [GestureController::class, 'store']);

// REALTIME SENSOR
Route::post('/sensor/live', [SensorController::class, 'update']);

Route::get('/live', [SensorController::class, 'live']);

Route::post('/sensor/reset', [SensorController::class, 'reset']);

Route::post('/gesture/save', [GestureController::class, 'save']);
