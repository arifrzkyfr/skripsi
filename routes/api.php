<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SensorController;
use App\Http\Controllers\GestureController;
use App\Http\Controllers\AIController;

// =====================================
// SENSOR ROUTES
// ESP32 kirim data → Laravel
// =====================================
Route::post('/sensor/live', [SensorController::class, 'update']);
Route::get('/live', [SensorController::class, 'live']);
Route::post('/sensor/reset', [SensorController::class, 'reset']);

// =====================================
// GESTURE ROUTES
// CRUD dataset gesture
// =====================================
Route::get('/gestures', [GestureController::class, 'index']);
Route::post('/gestures', [GestureController::class, 'save']);
Route::delete('/gestures/{id}', [GestureController::class, 'destroy']);
Route::get('/gestures/{id}/samples', [GestureController::class, 'samples']);

// =====================================
// AI ROUTES
// Analisis Gemma-2B via Ollama
// =====================================
Route::post('/ai/analyze', [AIController::class, 'analyze']);
