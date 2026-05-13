<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SensorController extends Controller
{
    // RECEIVE SENSOR FROM ESP32
    public function update(Request $request)
    {
        $sensor = [

            'f1' => $request->f1,
            'f2' => $request->f2,

            'ax' => $request->ax,
            'ay' => $request->ay,
            'az' => $request->az,

            'timestamp' => now()->toDateTimeString()
        ];

        // SIMPAN KE CACHE
        Cache::put('live_sensor', $sensor, 60);

        return response()->json([
            'status' => 'success',
            'data' => $sensor
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
            'data' => $sensor
        ]);
    }
    public function reset()
    {
        \Illuminate\Support\Facades\Cache::forget('live_sensor');

        return response()->json([
            'status' => 'reset',
            'message' => 'Monitoring berhasil dihentikan'
        ]);
    }
}
