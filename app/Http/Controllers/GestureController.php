<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Profile;
use App\Models\GestureProfile;
use App\Models\GestureSample;

class GestureController extends Controller
{
    public function save(Request $request)
    {
        try {
            // =====================================
            // VALIDASI
            // =====================================
            $request->validate([
                'profile_name' => 'required',
                'gesture_name' => 'required',
                'samples'      => 'required|array|min:1',
            ]);

            $profileName = $request->profile_name;
            $gestureName = $request->gesture_name;
            $samples     = $request->samples;

            // =====================================
            // CREATE PROFILE
            // =====================================
            $profile = Profile::firstOrCreate([
                'name' => $profileName
            ]);

            // =====================================
            // RAW SENSOR DATA SEBAGAI KONTEKS LLM
            // =====================================
            $rMinF1 = collect($samples)->min('f1');
            $rMaxF1 = collect($samples)->max('f1');
            $rMinF2 = collect($samples)->min('f2');
            $rMaxF2 = collect($samples)->max('f2');
            $rMinAx = collect($samples)->min('ax');
            $rMaxAx = collect($samples)->max('ax');
            $rMinAy = collect($samples)->min('ay');
            $rMaxAy = collect($samples)->max('ay');
            $rMinAz = collect($samples)->min('az');
            $rMaxAz = collect($samples)->max('az');

            // =====================================
            // AI PROMPT (FORMAT TEKS KETAT)
            // =====================================
            $prompt = "
Anda adalah AI penganalisis sensor. Tugas Anda adalah memberikan deskripsi gesture dan menentukan rentang nilai akhirnya berdasarkan data kasar berikut:
Gesture: {$gestureName}
F1: {$rMinF1} - {$rMaxF1}
F2: {$rMinF2} - {$rMaxF2}
AX: {$rMinAx} - {$rMaxAx}
AY: {$rMinAy} - {$rMaxAy}
AZ: {$rMinAz} - {$rMaxAz}

ATURAN WAJIB:
1. Deskripsi WAJIB menggunakan BAHASA INDONESIA.
2. ANDA WAJIB membalas dengan format TEPAT seperti di bawah ini, tanpa awalan atau akhiran apapun:

DESKRIPSI: [Tulis deskripsi bahasa indonesia Anda di sini]
MIN_F1: [angka_keputusan_anda]
MAX_F1: [angka_keputusan_anda]
MIN_F2: [angka_keputusan_anda]
MAX_F2: [angka_keputusan_anda]
MIN_AX: [angka_keputusan_anda]
MAX_AX: [angka_keputusan_anda]
MIN_AY: [angka_keputusan_anda]
MAX_AY: [angka_keputusan_anda]
MIN_AZ: [angka_keputusan_anda]
MAX_AZ: [angka_keputusan_anda]
";

            // =====================================
            // OLLAMA
            // =====================================
            $rawResponse = "";
            $aiData = [
                'deskripsi' => 'Analisis gagal diproses',
                'min_f1' => null,
                'max_f1' => null,
                'min_f2' => null,
                'max_f2' => null,
                'min_ax' => null,
                'max_ax' => null,
                'min_ay' => null,
                'max_ay' => null,
                'min_az' => null,
                'max_az' => null,
            ];

            try {
                $response = Http::timeout(120)->post(
                    'http://localhost:11434/api/generate',
                    [
                        'model'  => 'gemma:2b',
                        'prompt' => $prompt,
                        'stream' => false
                    ]
                );

                if ($response->successful()) {
                    $rawResponse = $response->json()['response'] ?? '';

                    // PARSING HASIL TEKS DARI LLM MENGGUNAKAN REGEX
                    // Ekstrak Deskripsi
                    if (preg_match('/DESKRIPSI:\s*(.*?)(?=\nMIN_F1:)/is', $rawResponse, $match)) {
                        $aiData['deskripsi'] = trim($match[1]);
                    }

                    // Fungsi helper untuk ekstrak angka berdasarkan key
                    $extractNumber = function ($key, $text) {
                        if (preg_match("/{$key}:\s*([0-9\.\-]+)/i", $text, $m)) {
                            return floatval($m[1]);
                        }
                        return null;
                    };

                    // Ekstrak Angka dari LLM
                    $aiData['min_f1'] = $extractNumber('MIN_F1', $rawResponse);
                    $aiData['max_f1'] = $extractNumber('MAX_F1', $rawResponse);
                    $aiData['min_f2'] = $extractNumber('MIN_F2', $rawResponse);
                    $aiData['max_f2'] = $extractNumber('MAX_F2', $rawResponse);
                    $aiData['min_ax'] = $extractNumber('MIN_AX', $rawResponse);
                    $aiData['max_ax'] = $extractNumber('MAX_AX', $rawResponse);
                    $aiData['min_ay'] = $extractNumber('MIN_AY', $rawResponse);
                    $aiData['max_ay'] = $extractNumber('MAX_AY', $rawResponse);
                    $aiData['min_az'] = $extractNumber('MIN_AZ', $rawResponse);
                    $aiData['max_az'] = $extractNumber('MAX_AZ', $rawResponse);
                }
            } catch (\Exception $e) {
                $aiData['deskripsi'] = "Ollama error: " . $e->getMessage();
            }

            // =====================================
            // SAVE GESTURE PROFILE (USING LLM DATA)
            // =====================================
            $gestureProfile = GestureProfile::create([
                'profile_id'   => $profile->id,
                'gesture_name' => $gestureName,

                // Murni dari output LLM
                'ai_analysis'  => $aiData['deskripsi'],
                'min_f1' => $aiData['min_f1'],
                'max_f1' => $aiData['max_f1'],
                'min_f2' => $aiData['min_f2'],
                'max_f2' => $aiData['max_f2'],
                'min_ax' => $aiData['min_ax'],
                'max_ax' => $aiData['max_ax'],
                'min_ay' => $aiData['min_ay'],
                'max_ay' => $aiData['max_ay'],
                'min_az' => $aiData['min_az'],
                'max_az' => $aiData['max_az'],
            ]);

            // =====================================
            // SAVE RAW DATASET
            // =====================================
            foreach ($samples as $sample) {
                GestureSample::create([
                    'gesture_profile_id' => $gestureProfile->id,
                    'f1' => $sample['f1'],
                    'f2' => $sample['f2'],
                    'ax' => $sample['ax'],
                    'ay' => $sample['ay'],
                    'az' => $sample['az'],
                ]);
            }

            return response()->json([
                'success'  => true,
                'message'  => 'Gesture profile saved based on LLM output',
                'analysis' => $aiData['deskripsi'],
                'llm_data' => [
                    'min_f1' => $aiData['min_f1'],
                    'max_f1' => $aiData['max_f1'],
                    'min_f2' => $aiData['min_f2'],
                    'max_f2' => $aiData['max_f2'],
                    'min_ax' => $aiData['min_ax'],
                    'max_ax' => $aiData['max_ax'],
                    'min_ay' => $aiData['min_ay'],
                    'max_ay' => $aiData['max_ay'],
                    'min_az' => $aiData['min_az'],
                    'max_az' => $aiData['max_az'],
                ],
                'raw_llm_response' => $rawResponse // Berguna jika ingin di-debug
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
