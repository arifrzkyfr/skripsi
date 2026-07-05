<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SensorController extends Controller
{
    // =====================================
    // NILAI KALIBRASI MIN-MAX (SUDAH DIPERBAIKI)
    // =====================================
    // Didapat dari hasil kalibrasi sensor (sub-bab 3.4.2)
    private $calibration = [
        'f1' => ['min' => 200, 'max' => 900],
        'f2' => ['min' => 200, 'max' => 900],
        // MPU6050 Raw Data Range
        'ax' => ['min' => -32768, 'max' => 32768],
        'ay' => ['min' => -32768, 'max' => 32768],
        'az' => ['min' => -32768, 'max' => 32768],
    ];

    // WINDOW SIZE MOVING AVERAGE
    private $windowSize = 5;

    // NORMALISASI MIN-MAX
    // Rumus: X_norm = (X - X_min) / (X_max - X_min)
    private function normalize($value, $min, $max)
    {
        if ($max == $min) return 0;
        $normalized = ($value - $min) / ($max - $min);
        // Clamp antara 0 dan 1
        return max(0, min(1, round($normalized, 4)));
    }

    // MOVING AVERAGE FILTER
    // Rumus: X_avg = (1/N) * sum(X_i) untuk i = 1 sampai N
    private function movingAverage($key, $newValue)
    {
        // Ambil buffer dari cache
        $buffer = Cache::get("buffer_{$key}", []);

        // Tambahkan nilai baru ke buffer
        array_push($buffer, $newValue);

        // Pertahankan hanya N nilai terakhir
        if (count($buffer) > $this->windowSize) {
            array_shift($buffer);
        }

        // Simpan buffer kembali ke cache
        Cache::put("buffer_{$key}", $buffer, 60);

        // Kembalikan rata-rata
        return array_sum($buffer) / count($buffer);
    }

    // RECEIVE SENSOR FROM ESP32
    public function update(Request $request)
    {
        // VALIDASI INPUT
        $request->validate([
            'f1' => 'required|numeric',
            'f2' => 'required|numeric',
            'ax' => 'required|numeric',
            'ay' => 'required|numeric',
            'az' => 'required|numeric',
        ]);

        // NILAI MENTAH DARI ESP32
        $raw = [
            'f1' => $request->f1,
            'f2' => $request->f2,
            'ax' => $request->ax,
            'ay' => $request->ay,
            'az' => $request->az,
        ];

        // STEP 1: MOVING AVERAGE FILTER
        $filtered = [
            'f1' => $this->movingAverage('f1', $raw['f1']),
            'f2' => $this->movingAverage('f2', $raw['f2']),
            'ax' => $this->movingAverage('ax', $raw['ax']),
            'ay' => $this->movingAverage('ay', $raw['ay']),
            'az' => $this->movingAverage('az', $raw['az']),
        ];

        // STEP 2: NORMALISASI MIN-MAX
        $normalized = [
            'f1' => $this->normalize($filtered['f1'], $this->calibration['f1']['min'], $this->calibration['f1']['max']),
            'f2' => $this->normalize($filtered['f2'], $this->calibration['f2']['min'], $this->calibration['f2']['max']),
            'ax' => $this->normalize($filtered['ax'], $this->calibration['ax']['min'], $this->calibration['ax']['max']),
            'ay' => $this->normalize($filtered['ay'], $this->calibration['ay']['min'], $this->calibration['ay']['max']),
            'az' => $this->normalize($filtered['az'], $this->calibration['az']['min'], $this->calibration['az']['max']),
        ];

        // SIMPAN KE CACHE (raw + filtered + normalized)
        $sensor = [
            'raw'        => $raw,
            'filtered'   => $filtered,
            'normalized' => $normalized,
            'timestamp'  => now()->toDateTimeString()
        ];

        Cache::put('live_sensor', $sensor, 60);

        return response()->json([
            'status' => 'success',
            'data'   => $sensor
        ]);
    }

    // GET REALTIME SENSOR
    public function live()
    {
        $sensor = Cache::get('live_sensor');

        if (!$sensor) {
            return response()->json([
                'status' => 'offline'
            ]);
        }

        return response()->json([
            'status' => 'online',
            'data'   => $sensor
        ]);
    }

    // RESET MONITORING
    public function reset()
    {
        Cache::forget('live_sensor');

        // Reset semua buffer moving average
        foreach (['f1', 'f2', 'ax', 'ay', 'az'] as $key) {
            Cache::forget("buffer_{$key}");
        }

        return response()->json([
            'status'  => 'reset',
            'message' => 'Monitoring berhasil dihentikan'
        ]);
    }
}
