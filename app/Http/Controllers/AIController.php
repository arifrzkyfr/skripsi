<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\GestureProfile;
use App\Models\GestureSample;

class AIController extends Controller
{
    // NILAI KALIBRASI MIN-MAX
    private $calibration = [
        'f1' => ['min' => 200, 'max' => 900],
        'f2' => ['min' => 200, 'max' => 900],
        'ax' => ['min' => -10, 'max' => 10],
        'ay' => ['min' => -10, 'max' => 10],
        'az' => ['min' => 0,   'max' => 19.6],
    ];

    // =====================================
    // NORMALISASI MIN-MAX
    // Rumus: X_norm = (X - X_min) / (X_max - X_min)
    // =====================================
    private function normalize($value, $min, $max)
    {
        if ($max == $min) return 0;
        $normalized = ($value - $min) / ($max - $min);
        return max(0, min(1, round($normalized, 4)));
    }

    // =====================================
    // HITUNG RATA-RATA
    // Rumus: X_avg = (1/N) * sum(X_i)
    // =====================================
    private function average($values)
    {
        if (count($values) == 0) return 0;
        return round(array_sum($values) / count($values), 4);
    }

    // =====================================
    // HITUNG STANDAR DEVIASI
    // Rumus: s = sqrt((1/N) * sum((Xi - X_avg)^2))
    // =====================================
    private function stdDev($values)
    {
        $n = count($values);
        if ($n < 2) return 0;
        $mean = array_sum($values) / $n;
        $variance = array_sum(
            array_map(fn($x) => pow($x - $mean, 2), $values)
        ) / $n;
        return round(sqrt($variance), 4);
    }

    // =====================================
    // ANALISIS GESTURE OLEH GEMMA-2B
    // Dipanggil dari GestureController
    // setelah dataset disimpan
    // =====================================
    public function analyze(Request $request)
    {
        try {
            // =====================================
            // VALIDASI INPUT
            // =====================================
            $request->validate([
                'gesture_profile_id' => 'required|exists:gesture_profiles,id',
            ]);

            $gestureProfile = GestureProfile::with('samples')
                ->findOrFail($request->gesture_profile_id);

            $samples = $gestureProfile->samples;

            if ($samples->count() < 30) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sampel kurang dari 30. Tambahkan sampel terlebih dahulu.'
                ], 422);
            }

            // =====================================
            // STEP 1: NORMALISASI SEMUA SAMPEL
            // =====================================
            $normalizedSamples = $samples->map(function ($sample) {
                return [
                    'f1' => $this->normalize($sample->f1, $this->calibration['f1']['min'], $this->calibration['f1']['max']),
                    'f2' => $this->normalize($sample->f2, $this->calibration['f2']['min'], $this->calibration['f2']['max']),
                    'ax' => $this->normalize($sample->ax, $this->calibration['ax']['min'], $this->calibration['ax']['max']),
                    'ay' => $this->normalize($sample->ay, $this->calibration['ay']['min'], $this->calibration['ay']['max']),
                    'az' => $this->normalize($sample->az, $this->calibration['az']['min'], $this->calibration['az']['max']),
                ];
            })->toArray();

            // =====================================
            // STEP 2: HITUNG RATA-RATA
            // Rumus: avg = (1/N) * sum(X_i)
            // =====================================
            $avgF1 = $this->average(array_column($normalizedSamples, 'f1'));
            $avgF2 = $this->average(array_column($normalizedSamples, 'f2'));
            $avgAx = $this->average(array_column($normalizedSamples, 'ax'));
            $avgAy = $this->average(array_column($normalizedSamples, 'ay'));
            $avgAz = $this->average(array_column($normalizedSamples, 'az'));

            // =====================================
            // STEP 3: HITUNG STANDAR DEVIASI
            // Rumus: s = sqrt((1/N) * sum((Xi - avg)^2))
            // =====================================
            $stdF1 = $this->stdDev(array_column($normalizedSamples, 'f1'));
            $stdF2 = $this->stdDev(array_column($normalizedSamples, 'f2'));
            $stdAx = $this->stdDev(array_column($normalizedSamples, 'ax'));
            $stdAy = $this->stdDev(array_column($normalizedSamples, 'ay'));
            $stdAz = $this->stdDev(array_column($normalizedSamples, 'az'));

            // =====================================
            // STEP 4: HITUNG MIN-MAX NORMALIZED
            // =====================================
            $normMinF1 = round(min(array_column($normalizedSamples, 'f1')), 4);
            $normMaxF1 = round(max(array_column($normalizedSamples, 'f1')), 4);
            $normMinF2 = round(min(array_column($normalizedSamples, 'f2')), 4);
            $normMaxF2 = round(max(array_column($normalizedSamples, 'f2')), 4);
            $normMinAx = round(min(array_column($normalizedSamples, 'ax')), 4);
            $normMaxAx = round(max(array_column($normalizedSamples, 'ax')), 4);
            $normMinAy = round(min(array_column($normalizedSamples, 'ay')), 4);
            $normMaxAy = round(max(array_column($normalizedSamples, 'ay')), 4);
            $normMinAz = round(min(array_column($normalizedSamples, 'az')), 4);
            $normMaxAz = round(max(array_column($normalizedSamples, 'az')), 4);

            // =====================================
            // STEP 5: BENTUK PROMPT UNTUK GEMMA-2B
            // =====================================
            $gestureName  = $gestureProfile->gesture_name;
            $totalSample  = $samples->count();

            $prompt = "
Anda adalah AI penganalisis sensor gesture tangan berbasis IoT.
Tugas Anda adalah menganalisis karakteristik gesture dan menentukan
rentang threshold yang valid berdasarkan data sensor ternormalisasi.

Gesture: {$gestureName}
Total sampel: {$totalSample}

Rata-rata sensor (skala 0.0 - 1.0):
F1 (flex ibu jari): {$avgF1} (std: {$stdF1})
F2 (flex telunjuk): {$avgF2} (std: {$stdF2})
AX (akselerasi X) : {$avgAx} (std: {$stdAx})
AY (akselerasi Y) : {$avgAy} (std: {$stdAy})
AZ (akselerasi Z) : {$avgAz} (std: {$stdAz})

Rentang nilai yang terekam (normalized):
F1: {$normMinF1} - {$normMaxF1}
F2: {$normMinF2} - {$normMaxF2}
AX: {$normMinAx} - {$normMaxAx}
AY: {$normMinAy} - {$normMaxAy}
AZ: {$normMinAz} - {$normMaxAz}

ATURAN WAJIB:
1. Deskripsi WAJIB menggunakan BAHASA INDONESIA.
2. Threshold WAJIB dalam skala 0.0 - 1.0.
3. Balas HANYA dengan format berikut tanpa tambahan apapun:

DESKRIPSI: [deskripsi karakteristik gesture]
MIN_F1: [angka 0.0-1.0]
MAX_F1: [angka 0.0-1.0]
MIN_F2: [angka 0.0-1.0]
MAX_F2: [angka 0.0-1.0]
MIN_AX: [angka 0.0-1.0]
MAX_AX: [angka 0.0-1.0]
MIN_AY: [angka 0.0-1.0]
MAX_AY: [angka 0.0-1.0]
MIN_AZ: [angka 0.0-1.0]
MAX_AZ: [angka 0.0-1.0]
";

            // =====================================
            // STEP 6: KIRIM KE OLLAMA GEMMA-2B
            // =====================================
            $rawResponse = "";
            $aiData = [
                'deskripsi' => 'Analisis gagal diproses',
                'min_f1' => $normMinF1,
                'max_f1' => $normMaxF1,
                'min_f2' => $normMinF2,
                'max_f2' => $normMaxF2,
                'min_ax' => $normMinAx,
                'max_ax' => $normMaxAx,
                'min_ay' => $normMinAy,
                'max_ay' => $normMaxAy,
                'min_az' => $normMinAz,
                'max_az' => $normMaxAz,
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

                    // PARSING OUTPUT LLM
                    if (preg_match('/DESKRIPSI:\s*(.*?)(?=\nMIN_F1:)/is', $rawResponse, $match)) {
                        $aiData['deskripsi'] = trim($match[1]);
                    }

                    $extractNumber = function ($key, $text) {
                        if (preg_match("/{$key}:\s*([0-9\.\-]+)/i", $text, $m)) {
                            return floatval($m[1]);
                        }
                        return null;
                    };

                    $aiData['min_f1'] = $extractNumber('MIN_F1', $rawResponse) ?? $normMinF1;
                    $aiData['max_f1'] = $extractNumber('MAX_F1', $rawResponse) ?? $normMaxF1;
                    $aiData['min_f2'] = $extractNumber('MIN_F2', $rawResponse) ?? $normMinF2;
                    $aiData['max_f2'] = $extractNumber('MAX_F2', $rawResponse) ?? $normMaxF2;
                    $aiData['min_ax'] = $extractNumber('MIN_AX', $rawResponse) ?? $normMinAx;
                    $aiData['max_ax'] = $extractNumber('MAX_AX', $rawResponse) ?? $normMaxAx;
                    $aiData['min_ay'] = $extractNumber('MIN_AY', $rawResponse) ?? $normMinAy;
                    $aiData['max_ay'] = $extractNumber('MAX_AY', $rawResponse) ?? $normMaxAy;
                    $aiData['min_az'] = $extractNumber('MIN_AZ', $rawResponse) ?? $normMinAz;
                    $aiData['max_az'] = $extractNumber('MAX_AZ', $rawResponse) ?? $normMaxAz;
                }
            } catch (\Exception $e) {
                $aiData['deskripsi'] = "Ollama error: " . $e->getMessage();
            }

            // =====================================
            // STEP 7: UPDATE GESTURE PROFILE
            // dengan hasil analisis AI
            // =====================================
            $gestureProfile->update([
                'total_sample' => $totalSample,
                'avg_f1' => $avgF1,
                'avg_f2' => $avgF2,
                'avg_ax' => $avgAx,
                'avg_ay' => $avgAy,
                'avg_az' => $avgAz,
                'std_f1' => $stdF1,
                'std_f2' => $stdF2,
                'std_ax' => $stdAx,
                'std_ay' => $stdAy,
                'std_az' => $stdAz,
                'ai_analysis' => $aiData['deskripsi'],
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
            // STEP 8: UPDATE NORMALIZED DATA
            // di tabel gesture_samples
            // =====================================
            foreach ($samples as $index => $sample) {
                $sample->update([
                    'f1_norm' => $normalizedSamples[$index]['f1'],
                    'f2_norm' => $normalizedSamples[$index]['f2'],
                    'ax_norm' => $normalizedSamples[$index]['ax'],
                    'ay_norm' => $normalizedSamples[$index]['ay'],
                    'az_norm' => $normalizedSamples[$index]['az'],
                ]);
            }

            return response()->json([
                'success'      => true,
                'message'      => 'Analisis gesture berhasil',
                'gesture'      => $gestureName,
                'total_sample' => $totalSample,
                'statistics'   => [
                    'avg' => [
                        'f1' => $avgF1,
                        'f2' => $avgF2,
                        'ax' => $avgAx,
                        'ay' => $avgAy,
                        'az' => $avgAz
                    ],
                    'std' => [
                        'f1' => $stdF1,
                        'f2' => $stdF2,
                        'ax' => $stdAx,
                        'ay' => $stdAy,
                        'az' => $stdAz
                    ],
                ],
                'threshold' => [
                    'f1' => ['min' => $aiData['min_f1'], 'max' => $aiData['max_f1']],
                    'f2' => ['min' => $aiData['min_f2'], 'max' => $aiData['max_f2']],
                    'ax' => ['min' => $aiData['min_ax'], 'max' => $aiData['max_ax']],
                    'ay' => ['min' => $aiData['min_ay'], 'max' => $aiData['max_ay']],
                    'az' => ['min' => $aiData['min_az'], 'max' => $aiData['max_az']],
                ],
                'analysis'         => $aiData['deskripsi'],
                'raw_llm_response' => $rawResponse
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
