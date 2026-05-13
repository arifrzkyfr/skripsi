import { useEffect, useMemo, useRef, useState } from "react";

export default function Gestur() {
    // =================================================
    // STATE
    // =================================================

    const [recording, setRecording] = useState(false);
    const [gestureLabel, setGestureLabel] = useState("open_hand");
    const [profileName, setProfileName] = useState("");
    const [status, setStatus] = useState("OFFLINE");
    const [tempDataset, setTempDataset] = useState([]);
    const [message, setMessage] = useState("");

    // State untuk UI Loading & Modal AI
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [aiResults, setAiResults] = useState([]);

    const [sensor, setSensor] = useState({
        f1: 0,
        f2: 0,
        ax: 0,
        ay: 0,
        az: 0,
    });

    // BUFFER
    const datasetBuffer = useRef([]);

    // =================================================
    // CONFIG
    // =================================================

    const RECORD_INTERVAL = 500;
    const MAX_PREVIEW = 100;

    // =================================================
    // GESTURE LIST
    // =================================================

    const gestures = [
        "open_hand",
        "close_hand",
        "half_close",
        "tilt_left",
        "tilt_right",
    ];

    // =================================================
    // GESTURE INFO
    // =================================================

    const gestureTutorial = {
        open_hand: {
            icon: "🖐",
            title: "Tangan Terbuka",
            desc: "Buka seluruh jari tangan.",
        },
        close_hand: {
            icon: "✊",
            title: "Menggenggam",
            desc: "Tekuk seluruh jari.",
        },
        half_close: {
            icon: "👌",
            title: "Setengah Tekuk",
            desc: "Tekuk sebagian jari.",
        },
        tilt_left: {
            icon: "↩️",
            title: "Miring Kiri",
            desc: "Miringkan tangan ke kiri.",
        },
        tilt_right: {
            icon: "↪️",
            title: "Miring Kanan",
            desc: "Miringkan tangan ke kanan.",
        },
    };

    // =================================================
    // FETCH SENSOR
    // =================================================

    const fetchSensor = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/live");
            const result = await res.json();

            if (result.status === "online" && result.data) {
                setSensor({
                    f1: result.data.f1 ?? 0,
                    f2: result.data.f2 ?? 0,
                    ax: result.data.ax ?? 0,
                    ay: result.data.ay ?? 0,
                    az: result.data.az ?? 0,
                });
                setStatus("ONLINE");
            } else {
                setStatus("OFFLINE");
            }
        } catch (err) {
            console.log(err);
            setStatus("OFFLINE");
        }
    };

    // =================================================
    // LIVE MONITORING
    // =================================================

    useEffect(() => {
        fetchSensor();

        const interval = setInterval(() => {
            fetchSensor();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // =================================================
    // START RECORD
    // =================================================

    const handleStartRecording = () => {
        if (profileName.trim() === "") {
            setMessage("❌ Masukkan nama profile terlebih dahulu");
            return;
        }

        if (status !== "ONLINE") {
            setMessage("❌ ESP32 offline");
            return;
        }

        datasetBuffer.current = [];
        setRecording(true);
        setMessage(`🔴 Recording ${gestureLabel} dimulai`);
    };

    // =================================================
    // STOP RECORD
    // =================================================

    const handleStopRecording = () => {
        setRecording(false);

        if (datasetBuffer.current.length === 0) {
            setMessage("⚠ Tidak ada data yang direkam");
            return;
        }

        setTempDataset((prev) => [...prev, ...datasetBuffer.current]);
        setMessage(
            `✅ ${datasetBuffer.current.length} sample berhasil direkam`,
        );
    };

    // =================================================
    // RECORDING LOOP
    // =================================================

    useEffect(() => {
        let interval;

        if (recording) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch("http://127.0.0.1:8000/api/live");
                    const result = await res.json();

                    if (result.status !== "online" || !result.data) {
                        setStatus("OFFLINE");
                        return;
                    }

                    const liveSensor = result.data;

                    setSensor({
                        f1: liveSensor.f1 ?? 0,
                        f2: liveSensor.f2 ?? 0,
                        ax: liveSensor.ax ?? 0,
                        ay: liveSensor.ay ?? 0,
                        az: liveSensor.az ?? 0,
                    });

                    // RECORD RAW DATA
                    datasetBuffer.current.push({
                        id: Date.now() + Math.random(),
                        profile: profileName,
                        label: gestureLabel,
                        f1: liveSensor.f1 ?? 0,
                        f2: liveSensor.f2 ?? 0,
                        ax: liveSensor.ax ?? 0,
                        ay: liveSensor.ay ?? 0,
                        az: liveSensor.az ?? 0,
                        created_at: new Date().toLocaleTimeString(),
                    });
                } catch (err) {
                    console.log(err);
                }
            }, RECORD_INTERVAL);
        }

        return () => clearInterval(interval);
    }, [recording, gestureLabel, profileName]);

    // =================================================
    // SAVE DATASET (WITH LOADING & MODAL)
    // =================================================

    const saveDataset = async () => {
        if (tempDataset.length === 0) {
            alert("Dataset kosong");
            return;
        }

        // Tampilkan modal dan aktifkan status loading
        setIsSaving(true);
        setShowModal(true);
        setAiResults([]);

        try {
            const grouped = {};

            // GROUP BERDASARKAN GESTURE
            tempDataset.forEach((item) => {
                if (!grouped[item.label]) {
                    grouped[item.label] = [];
                }
                grouped[item.label].push(item);
            });

            const currentResults = [];

            // KIRIM SATU PERSATU DAN SIMPAN RESPONS AI
            for (const gesture in grouped) {
                const res = await fetch(
                    "http://127.0.0.1:8000/api/gesture/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            profile_name: profileName,
                            gesture_name: gesture,
                            samples: grouped[gesture],
                        }),
                    },
                );

                const result = await res.json();

                // Masukkan hasil ke array sementara
                currentResults.push({
                    gesture: gesture,
                    success: result.success,
                    analysis: result.analysis,
                    llm_data: result.llm_data, // Rentang data min max dari PHP
                    message: result.message,
                });
            }

            // Setelah semua selesai, matikan loading dan update state hasil
            setAiResults(currentResults);
            setIsSaving(false);
            setTempDataset([]); // Clear dataset otomatis jika berhasil
            setMessage("✅ Semua gesture berhasil dianalisis AI dan disimpan");
        } catch (err) {
            console.log(err);
            setIsSaving(false);
            setAiResults([
                {
                    gesture: "Error System",
                    success: false,
                    message:
                        "Gagal mengirim data ke server. Pastikan Backend dan Ollama berjalan.",
                },
            ]);
        }
    };

    // =================================================
    // CLEAR DATASET
    // =================================================

    const clearDataset = () => {
        const confirmDelete = confirm("Hapus dataset sementara?");
        if (!confirmDelete) return;

        setTempDataset([]);
        datasetBuffer.current = [];
        setMessage("🗑 Dataset sementara dihapus");
    };

    // =================================================
    // STATS
    // =================================================

    const gestureStats = useMemo(() => {
        return gestures.reduce((acc, gesture) => {
            acc[gesture] = tempDataset.filter(
                (item) => item.label === gesture,
            ).length;
            return acc;
        }, {});
    }, [tempDataset]);

    const totalSample = tempDataset.length + datasetBuffer.current.length;

    // =================================================
    // UI
    // =================================================

    return (
        <div className="p-8 bg-slate-100 min-h-screen relative">
            {/* ================= MODAL POPUP AI ================= */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
                        {/* LOADING STATE */}
                        {isSaving ? (
                            <div className="p-16 flex flex-col items-center justify-center text-center">
                                <div className="relative w-24 h-24 mb-6">
                                    <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                        🤖
                                    </div>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                                    AI sedang menganalisis...
                                </h2>
                                <p className="text-slate-500 text-lg animate-pulse">
                                    Memproses gesture Anda dengan Ollama
                                    (Gemma:2b). Mohon tunggu sebentar.
                                </p>
                            </div>
                        ) : (
                            /* RESULT STATE */
                            <>
                                <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                                    <div>
                                        <h2 className="text-2xl font-bold">
                                            ✨ Hasil Analisis AI
                                        </h2>
                                        <p className="text-cyan-100 text-sm">
                                            Profile: {profileName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-white hover:text-red-300 transition-colors text-2xl font-bold bg-white/20 w-10 h-10 rounded-full flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
                                    {aiResults.map((res, index) => (
                                        <div
                                            key={index}
                                            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="text-3xl">
                                                    {gestureTutorial[
                                                        res.gesture
                                                    ]?.icon || "📌"}
                                                </div>
                                                <h3 className="text-2xl font-bold capitalize text-slate-800">
                                                    {res.gesture.replace(
                                                        "_",
                                                        " ",
                                                    )}
                                                </h3>
                                                {res.success ? (
                                                    <span className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                                                        Berhasil
                                                    </span>
                                                ) : (
                                                    <span className="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold border border-red-200">
                                                        Gagal
                                                    </span>
                                                )}
                                            </div>

                                            {res.success ? (
                                                <div className="space-y-5">
                                                    {/* Deskripsi AI */}
                                                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <span>💡</span>{" "}
                                                            Insight
                                                            Karakteristik
                                                        </h4>
                                                        <p className="text-slate-700 leading-relaxed italic">
                                                            "{res.analysis}"
                                                        </p>
                                                    </div>

                                                    {/* Rentang Min Max dari LLM */}
                                                    {res.llm_data && (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                                Rentang Sensor
                                                                Rekomendasi (Min
                                                                - Max)
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                                <div className="bg-slate-100 p-3 rounded-xl text-center">
                                                                    <span className="block text-xs font-bold text-slate-400 mb-1">
                                                                        F1
                                                                    </span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .min_f1
                                                                        }{" "}
                                                                        <span className="text-slate-400 font-normal">
                                                                            ~
                                                                        </span>{" "}
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .max_f1
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="bg-slate-100 p-3 rounded-xl text-center">
                                                                    <span className="block text-xs font-bold text-slate-400 mb-1">
                                                                        F2
                                                                    </span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .min_f2
                                                                        }{" "}
                                                                        <span className="text-slate-400 font-normal">
                                                                            ~
                                                                        </span>{" "}
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .max_f2
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="bg-slate-100 p-3 rounded-xl text-center">
                                                                    <span className="block text-xs font-bold text-slate-400 mb-1">
                                                                        AX
                                                                    </span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .min_ax
                                                                        }{" "}
                                                                        <span className="text-slate-400 font-normal">
                                                                            ~
                                                                        </span>{" "}
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .max_ax
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="bg-slate-100 p-3 rounded-xl text-center">
                                                                    <span className="block text-xs font-bold text-slate-400 mb-1">
                                                                        AY
                                                                    </span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .min_ay
                                                                        }{" "}
                                                                        <span className="text-slate-400 font-normal">
                                                                            ~
                                                                        </span>{" "}
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .max_ay
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="bg-slate-100 p-3 rounded-xl text-center">
                                                                    <span className="block text-xs font-bold text-slate-400 mb-1">
                                                                        AZ
                                                                    </span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .min_az
                                                                        }{" "}
                                                                        <span className="text-slate-400 font-normal">
                                                                            ~
                                                                        </span>{" "}
                                                                        {
                                                                            res
                                                                                .llm_data
                                                                                .max_az
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 mt-2">
                                                    {res.message}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="p-5 border-t bg-white flex justify-end">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="bg-slate-800 text-white px-8 py-3 rounded-xl hover:bg-slate-900 transition-colors font-semibold"
                                    >
                                        Tutup & Lanjutkan
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* ================================================== */}

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-cyan-700">
                    Smart Glove Dataset Recorder
                </h1>
                <p className="text-gray-500 mt-2">
                    Dataset gesture realtime berbasis ESP32
                </p>
            </div>

            {/* TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* TUTORIAL */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="text-center">
                        <div className="text-7xl mb-4">
                            {gestureTutorial[gestureLabel].icon}
                        </div>
                        <h1 className="text-2xl font-bold">
                            {gestureTutorial[gestureLabel].title}
                        </h1>
                        <p className="text-gray-500 mt-3">
                            {gestureTutorial[gestureLabel].desc}
                        </p>
                    </div>
                </div>

                {/* SENSOR */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-5">Live Sensor</h2>
                    <div className="space-y-4">
                        <div className="bg-slate-100 rounded-xl p-4">
                            F1 : {sensor.f1}
                        </div>
                        <div className="bg-slate-100 rounded-xl p-4">
                            F2 : {sensor.f2}
                        </div>
                        <div className="bg-slate-100 rounded-xl p-4">
                            AX : {sensor.ax}
                        </div>
                        <div className="bg-slate-100 rounded-xl p-4">
                            AY : {sensor.ay}
                        </div>
                        <div className="bg-slate-100 rounded-xl p-4">
                            AZ : {sensor.az}
                        </div>
                    </div>
                </div>

                {/* CONTROL */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-5">Recording Panel</h2>

                    {/* PROFILE */}
                    <input
                        type="text"
                        placeholder="Nama profile"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 mb-4"
                    />

                    {/* GESTURE */}
                    <select
                        value={gestureLabel}
                        onChange={(e) => setGestureLabel(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 mb-4"
                    >
                        {gestures.map((gesture) => (
                            <option key={gesture} value={gesture}>
                                {gesture.replace("_", " ")}
                            </option>
                        ))}
                    </select>

                    {/* STATUS */}
                    <div className="mb-4">
                        STATUS :
                        <span
                            className={`ml-2 font-bold ${
                                status === "ONLINE"
                                    ? "text-green-600"
                                    : "text-red-500"
                            }`}
                        >
                            {status}
                        </span>
                    </div>

                    {/* RECORD STATUS */}
                    <div className="mb-5 bg-slate-100 rounded-xl p-4">
                        <p className="font-bold">
                            {recording ? "🔴 RECORDING" : "⚪ STANDBY"}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            Current Gesture : {gestureLabel}
                        </p>
                        <p className="text-sm text-gray-600">
                            Total Sample : {totalSample}
                        </p>
                    </div>

                    {/* BUTTON */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleStartRecording}
                            disabled={recording}
                            className="bg-cyan-600 text-white rounded-xl py-3 disabled:opacity-50"
                        >
                            ▶ Record
                        </button>
                        <button
                            onClick={handleStopRecording}
                            disabled={!recording}
                            className="bg-red-500 text-white rounded-xl py-3 disabled:opacity-50"
                        >
                            ■ Stop
                        </button>
                        <button
                            onClick={saveDataset}
                            disabled={isSaving || tempDataset.length === 0}
                            className="bg-green-600 text-white rounded-xl py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                "💾 Save AI"
                            )}
                        </button>
                        <button
                            onClick={clearDataset}
                            className="bg-gray-500 text-white rounded-xl py-3"
                        >
                            🗑 Clear
                        </button>
                    </div>

                    {/* MESSAGE */}
                    {message && (
                        <div className="mt-5 bg-slate-100 rounded-xl p-4 text-sm font-medium">
                            {message}
                        </div>
                    )}
                </div>
            </div>

            {/* STATS */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                {gestures.map((gesture) => (
                    <div
                        key={gesture}
                        className="bg-white rounded-xl p-5 shadow"
                    >
                        <p className="text-gray-500">
                            {gesture.replace("_", " ")}
                        </p>
                        <h1 className="text-4xl font-bold text-cyan-700 mt-2">
                            {gestureStats[gesture] || 0}
                        </h1>
                    </div>
                ))}
            </div>

            {/* TABLE */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-5">Dataset Sementara</h2>
                <div className="overflow-auto max-h-[500px]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50 sticky top-0">
                                <th className="p-3 text-left">No</th>
                                <th className="p-3 text-left">Profile</th>
                                <th className="p-3 text-left">Gesture</th>
                                <th className="p-3 text-left">F1</th>
                                <th className="p-3 text-left">F2</th>
                                <th className="p-3 text-left">AX</th>
                                <th className="p-3 text-left">AY</th>
                                <th className="p-3 text-left">AZ</th>
                                <th className="p-3 text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tempDataset
                                .slice(-MAX_PREVIEW)
                                .map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className="border-b hover:bg-slate-50"
                                    >
                                        <td className="p-3">{index + 1}</td>
                                        <td className="p-3">{item.profile}</td>
                                        <td className="p-3 font-semibold text-cyan-700">
                                            {item.label}
                                        </td>
                                        <td className="p-3">{item.f1}</td>
                                        <td className="p-3">{item.f2}</td>
                                        <td className="p-3">{item.ax}</td>
                                        <td className="p-3">{item.ay}</td>
                                        <td className="p-3">{item.az}</td>
                                        <td className="p-3">
                                            {item.created_at}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
