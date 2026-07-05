<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Profile;
use App\Models\GestureProfile;
use App\Models\GestureSample;

class GestureController extends Controller
{
    // =====================================
    // SIMPAN SAMPEL DATASET GESTURE
    // Hanya urusan CRUD, tidak ada logika AI
    // =====================================
    public function save(Request $request)
    {
        try {
            // VALIDASI
            $request->validate([
                'profile_name' => 'required|string',
                'gesture_name' => 'required|string',
                'samples'      => 'required|array|min:30',
            ]);

            $profileName = $request->profile_name;
            $gestureName = $request->gesture_name;
            $samples     = $request->samples;

            // BUAT ATAU AMBIL PROFILE
            $profile = Profile::firstOrCreate([
                'name' => $profileName
            ]);

            // BUAT GESTURE PROFILE
            // Kosong dulu, nanti diisi oleh AIController
            $gestureProfile = GestureProfile::create([
                'profile_id'   => $profile->id,
                'gesture_name' => $gestureName,
                'total_sample' => count($samples),
            ]);

            // SIMPAN RAW SAMPEL KE DATABASE
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
                'success'            => true,
                'message'            => 'Dataset gesture berhasil disimpan',
                'gesture_profile_id' => $gestureProfile->id,
                'profile'            => $profileName,
                'gesture'            => $gestureName,
                'total_sample'       => count($samples),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // =====================================
    // AMBIL SEMUA DATASET
    // =====================================
    public function index()
    {
        $profiles = GestureProfile::with(['profile', 'samples'])
            ->get()
            ->map(function ($gp) {
                return [
                    'id'           => $gp->id,
                    'profile_name' => $gp->profile->name ?? '-',
                    'gesture_name' => $gp->gesture_name,
                    'total_sample' => $gp->total_sample,
                    'ai_analyzed'  => !is_null($gp->ai_analysis),
                    'avg_f1'       => $gp->avg_f1,
                    'avg_f2'       => $gp->avg_f2,
                    'threshold'    => [
                        'f1' => ['min' => $gp->min_f1, 'max' => $gp->max_f1],
                        'f2' => ['min' => $gp->min_f2, 'max' => $gp->max_f2],
                        'ax' => ['min' => $gp->min_ax, 'max' => $gp->max_ax],
                        'ay' => ['min' => $gp->min_ay, 'max' => $gp->max_ay],
                        'az' => ['min' => $gp->min_az, 'max' => $gp->max_az],
                    ],
                    'ai_analysis'  => $gp->ai_analysis,
                ];
            });

        return response()->json([
            'success'  => true,
            'profiles' => $profiles
        ]);
    }

    // =====================================
    // HAPUS GESTURE PROFILE + SAMPELNYA
    // =====================================
    public function destroy($id)
    {
        try {
            $gestureProfile = GestureProfile::findOrFail($id);

            // Hapus sampel dulu
            GestureSample::where('gesture_profile_id', $id)->delete();

            // Hapus profile
            $gestureProfile->delete();

            return response()->json([
                'success' => true,
                'message' => 'Gesture profile berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // =====================================
    // AMBIL DETAIL SAMPEL PER GESTURE
    // =====================================
    public function samples($id)
    {
        $gestureProfile = GestureProfile::with('samples')
            ->findOrFail($id);

        return response()->json([
            'success'  => true,
            'gesture'  => $gestureProfile->gesture_name,
            'total'    => $gestureProfile->samples->count(),
            'samples'  => $gestureProfile->samples
        ]);
    }
}
