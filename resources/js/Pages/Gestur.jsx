import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export default function Gestur() {
    // =====================================
    // STATE KONEKSI LOKAL (TANPA CONTEXT)
    // =====================================
    const [status, setStatus] = useState("Offline");
    const [wsInstance, setWsInstance] = useState(null);
    const [sensor, setSensor] = useState({ f1: 0, f2: 0, ax: 0, ay: 0, az: 0 });

    // =====================================
    // STATE LOKAL & PARAMETER KNN
    // =====================================
    const [recording, setRecording] = useState(false);
    const [gestureLabel, setGestureLabel] = useState("open_hand");
    const [profileName, setProfileName] = useState("");
    const [tempDataset, setTempDataset] = useState([]);
    const [trainedDataset, setTrainedDataset] = useState([]);
    const [kValue, setKValue] = useState(5);
    const [message, setMessage] = useState("");
    const [recordCount, setRecordCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [knnLogs, setKnnLogs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [activeTab, setActiveTab] = useState("tabel");

    const datasetBuffer = useRef([]);
    const recordingRef = useRef(false);
    const profileRef = useRef("");
    const gestureRef = useRef("open_hand");

    useEffect(() => {
        recordingRef.current = recording;
    }, [recording]);
    useEffect(() => {
        profileRef.current = profileName;
    }, [profileName]);
    useEffect(() => {
        gestureRef.current = gestureLabel;
    }, [gestureLabel]);

    const MIN_SAMPLE = 30;
    const gestures = [
        "open_hand",
        "close_hand",
        "half_close",
        "tilt_left",
        "tilt_right",
    ];
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

    // =====================================
    // FUNGSI KONEKSI WEBSOCKET LOKAL
    // =====================================
    const connectViaWiFi = () => {
        if (status === "Online") return;

        // PASTIKAN IP INI SESUAI DENGAN IP ESP32 DI SERIAL MONITOR ANDA
        const esp32IP = "172.20.10.3";
        const wsUrl = `ws://${esp32IP}:81`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setStatus("Online");
            setWsInstance(ws);
            setMessage("✅ Terhubung ke Smart Glove!");
        };

        ws.onmessage = (event) => {
            const cleanLine = event.data.trim();
            if (cleanLine) {
                const data = cleanLine.split(",");
                if (data.length === 5) {
                    const newSensor = {
                        f1: parseInt(data[0]) || 0,
                        f2: parseInt(data[1]) || 0,
                        ax: parseInt(data[2]) || 0,
                        ay: parseInt(data[3]) || 0,
                        az: parseInt(data[4]) || 0,
                    };
                    setSensor(newSensor);

                    // Update Grafik
                    setChartData((prev) => {
                        const updated = [
                            ...prev,
                            {
                                time: new Date().toLocaleTimeString(),
                                ...newSensor,
                            },
                        ];
                        return updated.slice(-50);
                    });

                    // Update Perekaman
                    if (recordingRef.current) {
                        datasetBuffer.current.push({
                            id: Date.now() + Math.random(),
                            profile: profileRef.current,
                            label: gestureRef.current,
                            ...newSensor,
                            created_at: new Date().toLocaleTimeString(),
                        });
                        setRecordCount(datasetBuffer.current.length);
                    }
                }
            }
        };

        ws.onclose = () => {
            setStatus("Offline");
            setWsInstance(null);
            setMessage("❌ Koneksi terputus.");
        };

        ws.onerror = () => {
            setStatus("Offline");
            setMessage("❌ Gagal terhubung. Pastikan IP ESP32 benar.");
        };
    };

    const stopConnection = () => {
        if (wsInstance) wsInstance.close();
        setStatus("Offline");
    };

    // =====================================
    // CORE MACHINE LEARNING: ALGORITMA KNN
    // =====================================
    const classifyLiveGestureKNN = () => {
        if (status === "Offline") return "⚠️ Perangkat Offline";
        if (trainedDataset.length === 0) return "💡 Model Belum Dilatih";

        const distances = trainedDataset.map((sample) => {
            const dFlex1 = (sensor.f1 - sample.f1) / 4095;
            const dFlex2 = (sensor.f2 - sample.f2) / 4095;
            const dAx = (sensor.ax - sample.ax) / 32768;
            const dAy = (sensor.ay - sample.ay) / 32768;
            const dAz = (sensor.az - sample.az) / 32768;

            const euclideanDistance = Math.sqrt(
                Math.pow(dFlex1, 2) +
                    Math.pow(dFlex2, 2) +
                    Math.pow(dAx, 2) +
                    Math.pow(dAy, 2) +
                    Math.pow(dAz, 2),
            );

            return { label: sample.label, distance: euclideanDistance };
        });

        distances.sort((a, b) => a.distance - b.distance);
        const nearestNeighbors = distances.slice(0, kValue);

        const votes = {};
        nearestNeighbors.forEach((neighbor) => {
            votes[neighbor.label] = (votes[neighbor.label] || 0) + 1;
        });

        let bestGesture = "-";
        let maxVotes = -1;
        Object.entries(votes).forEach(([label, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                bestGesture = label;
            }
        });

        const gestureInfo = gestureTutorial[bestGesture];
        return gestureInfo
            ? `${gestureInfo.icon} ${gestureInfo.title}`
            : bestGesture;
    };

    // =====================================
    // EVENT HANDLERS
    // =====================================
    const handleToggleRecording = () => {
        if (!recording) {
            if (!profileName.trim())
                return setMessage("❌ Masukkan nama profile!");
            if (status !== "Online")
                return setMessage("❌ Hubungkan device terlebih dahulu!");

            datasetBuffer.current = [];
            setRecordCount(0);
            setRecording(true);
            setMessage(`🔴 Merekam gesture: ${gestureLabel}...`);
        } else {
            setRecording(false);
            if (datasetBuffer.current.length === 0)
                return setMessage("⚠ Tidak ada data terekam");
            setTempDataset((prev) => [...prev, ...datasetBuffer.current]);
            setMessage(`✅ ${datasetBuffer.current.length} sampel ditambahkan`);
            setRecordCount(0);
        }
    };

    const handleClearDataset = () => {
        setTempDataset([]);
        setTrainedDataset([]);
        datasetBuffer.current = [];
        setRecordCount(0);
        setMessage("🗑 Dataset dan Model KNN dikosongkan");
    };

    const handleTrainAndSaveKNN = async () => {
        const insufficient = gestures.filter((g) => {
            const count = tempDataset.filter((i) => i.label === g).length;
            return count > 0 && count < MIN_SAMPLE;
        });

        if (insufficient.length > 0)
            return setMessage(`❌ Sampel kurang: ${insufficient.join(", ")}`);
        if (tempDataset.length === 0) return setMessage("❌ Dataset kosong");

        setIsSaving(true);
        setShowModal(true);
        setTrainedDataset([...tempDataset]);

        try {
            const grouped = {};
            tempDataset.forEach((i) => {
                if (!grouped[i.label]) grouped[i.label] = [];
                grouped[i.label].push(i);
            });

            const currentLogs = [];
            for (const gesture in grouped) {
                const saveRes = await fetch(
                    "http://192.168.0.110:8000/api/gestures",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            profile_name: profileName,
                            gesture_name: gesture,
                            samples: grouped[gesture],
                        }),
                    },
                );
                const saveResult = await saveRes.json();
                currentLogs.push({
                    gesture,
                    success: saveResult.success,
                    total_samples: grouped[gesture].length,
                    message: saveResult.success
                        ? "Arsip DB sukses"
                        : "Gagal arsip DB",
                });
            }
            setKnnLogs(currentLogs);
            setIsSaving(false);
            setMessage("✅ Model KNN lokal aktif!");
        } catch {
            setIsSaving(false);
            setMessage("⚠ Model KNN aktif, gagal arsip ke Laravel.");
        }
    };

    const exportToExcel = () => {
        if (tempDataset.length === 0) return alert("Dataset kosong");
        const worksheet = XLSX.utils.json_to_sheet(
            tempDataset.map((i, idx) => ({
                No: idx + 1,
                Profile: i.profile,
                Gesture: i.label,
                F1: i.f1,
                F2: i.f2,
                AX: i.ax,
                AY: i.ay,
                AZ: i.az,
                Waktu: i.created_at,
            })),
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, "Dataset KNN");
        XLSX.writeFile(wb, `Dataset_KNN_${profileName}.xlsx`);
    };

    const gestureStats = useMemo(
        () =>
            gestures.reduce(
                (acc, g) => ({
                    ...acc,
                    [g]: tempDataset.filter((i) => i.label === g).length,
                }),
                {},
            ),
        [tempDataset],
    );

    const tutorial = gestureTutorial[gestureLabel];

    return (
        <div className="p-6 bg-slate-100 min-h-screen">
            {/* KONTROL KONEKSI */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center border-l-4 border-cyan-500">
                <div>
                    <h2 className="font-bold text-slate-700">
                        Koneksi ESP32 (Independen)
                    </h2>
                    <p className="text-xs text-slate-400">
                        Status:{" "}
                        <span
                            className={
                                status === "Online"
                                    ? "text-green-500 font-bold"
                                    : "text-red-500 font-bold"
                            }
                        >
                            {status}
                        </span>
                    </p>
                </div>
                <div>
                    {status === "Offline" ? (
                        <button
                            onClick={connectViaWiFi}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            📶 Hubungkan
                        </button>
                    ) : (
                        <button
                            onClick={stopConnection}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            ■ Putuskan
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-3">{tutorial.icon}</div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        {tutorial.title}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {tutorial.desc}
                    </p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h2 className="font-semibold text-slate-700 mb-3">
                        Live Sensor
                    </h2>
                    {[
                        {
                            label: "F1 (Ibu Jari)",
                            value: sensor.f1,
                            color: "bg-blue-500",
                        },
                        {
                            label: "F2 (Telunjuk)",
                            value: sensor.f2,
                            color: "bg-indigo-500",
                        },
                        {
                            label: "AX",
                            value: sensor.ax,
                            color: "bg-green-500",
                        },
                        {
                            label: "AY",
                            value: sensor.ay,
                            color: "bg-yellow-500",
                        },
                        { label: "AZ", value: sensor.az, color: "bg-red-500" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 mb-2"
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${s.color}`}
                                />
                                <span className="text-sm text-slate-500">
                                    {s.label}
                                </span>
                            </div>
                            <span className="font-mono font-semibold text-slate-800">
                                {s.value}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h2 className="font-semibold text-slate-700 mb-2">
                        Kendali ML
                    </h2>

                    <div className="flex items-center gap-2 mb-3">
                        <label className="text-xs text-slate-500 font-medium">
                            Nilai K (KNN):
                        </label>
                        <input
                            type="number"
                            value={kValue}
                            onChange={(e) =>
                                setKValue(
                                    Math.max(1, parseInt(e.target.value) || 1),
                                )
                            }
                            disabled={recording}
                            className="w-16 border rounded px-2 py-0.5 text-sm text-center"
                        />
                    </div>

                    <input
                        type="text"
                        placeholder="Nama Profile"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        disabled={recording}
                        className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                    />
                    <select
                        value={gestureLabel}
                        onChange={(e) => setGestureLabel(e.target.value)}
                        disabled={recording}
                        className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                    >
                        {gestures.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleToggleRecording}
                        className={`w-full py-2 rounded-lg font-semibold text-white text-sm mb-2 ${recording ? "bg-red-500" : "bg-blue-600"}`}
                    >
                        {recording ? "■ Stop Perekaman" : "▶ Ambil Sampel"}
                    </button>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            onClick={handleTrainAndSaveKNN}
                            disabled={tempDataset.length === 0 || recording}
                            className="bg-green-600 disabled:opacity-40 text-white rounded-lg py-2 text-xs font-semibold"
                        >
                            ⚡ Train KNN
                        </button>
                        <button
                            onClick={exportToExcel}
                            disabled={tempDataset.length === 0 || recording}
                            className="bg-orange-500 disabled:opacity-40 text-white rounded-lg py-2 text-xs font-semibold"
                        >
                            📊 Export
                        </button>
                    </div>
                    <button
                        onClick={handleClearDataset}
                        disabled={tempDataset.length === 0 || recording}
                        className="w-full bg-slate-200 text-slate-700 rounded-lg py-2 text-xs"
                    >
                        🗑 Reset
                    </button>
                </div>
            </div>

            {/* BAR PROGRES VALIDASI SAMPEL */}
            <div className="grid grid-cols-5 gap-3 mb-4">
                {gestures.map((g) => {
                    const count = gestureStats[g];
                    const isEnough = count >= MIN_SAMPLE;
                    return (
                        <div
                            key={g}
                            className={`bg-white rounded-xl p-3 shadow-sm text-center border-2 ${isEnough ? "border-green-400" : count > 0 ? "border-yellow-400" : "border-transparent"}`}
                        >
                            <div className="text-xl mb-1">
                                {gestureTutorial[g].icon}
                            </div>
                            <div className="text-xs text-slate-500 capitalize">
                                {g.replace("_", " ")}
                            </div>
                            <div
                                className={`font-bold mt-1 ${isEnough ? "text-green-600" : "text-slate-800"}`}
                            >
                                {count}
                            </div>
                        </div>
                    );
                })}
            </div>

            {message && (
                <div className="mb-4 bg-white rounded-xl p-3 text-sm text-slate-700 shadow-sm border">
                    {message}
                </div>
            )}

            <div className="mb-4 bg-white rounded-2xl shadow-lg p-6 border-t-4 border-cyan-600 text-center">
                <h2 className="text-xl font-bold text-slate-700 mb-1">
                    Live KNN Prediction
                </h2>
                <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-dashed inline-block min-w-[320px]">
                    <div className="text-4xl font-bold text-cyan-700">
                        {classifyLiveGestureKNN()}
                    </div>
                </div>
            </div>

            {(tempDataset.length > 0 || chartData.length > 0) && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
                    <div className="flex border-b border-slate-100">
                        {["grafik", "tabel"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 text-sm font-semibold capitalize ${activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400"}`}
                            >
                                {tab === "grafik" ? "📈 Grafik" : "📋 Tabel"}
                            </button>
                        ))}
                    </div>

                    {activeTab === "grafik" && (
                        <div className="p-5">
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-600 mb-2">
                                    Sensor Flex
                                </h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={chartData}>
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fontSize: 10 }}
                                        />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="f1"
                                            stroke="#3b82f6"
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="f2"
                                            stroke="#6366f1"
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-600 mb-2">
                                    MPU6050
                                </h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={chartData}>
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fontSize: 10 }}
                                        />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="ax"
                                            stroke="#22c55e"
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="ay"
                                            stroke="#eab308"
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="az"
                                            stroke="#ef4444"
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === "tabel" && (
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th>No</th>
                                        <th>Target</th>
                                        <th>F1</th>
                                        <th>F2</th>
                                        <th>AX</th>
                                        <th>AY</th>
                                        <th>AZ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tempDataset.slice(-100).map((row, idx) => (
                                        <tr
                                            key={row.id}
                                            className="border-t hover:bg-slate-50"
                                        >
                                            <td className="py-2">{idx + 1}</td>
                                            <td className="py-2">
                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                                    {row.label}
                                                </span>
                                            </td>
                                            <td className="py-2 font-mono">
                                                {row.f1}
                                            </td>
                                            <td className="py-2 font-mono">
                                                {row.f2}
                                            </td>
                                            <td className="py-2 font-mono">
                                                {row.ax}
                                            </td>
                                            <td className="py-2 font-mono">
                                                {row.ay}
                                            </td>
                                            <td className="py-2 font-mono">
                                                {row.az}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL LAPORAN */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
                        <h2 className="text-lg font-bold mb-4">
                            {isSaving ? "⏳ Sinkronisasi..." : "✅ Laporan KNN"}
                        </h2>
                        <div className="space-y-3">
                            {!isSaving &&
                                knnLogs.map((log, i) => (
                                    <div
                                        key={i}
                                        className="p-3 bg-slate-50 border rounded-lg text-sm flex justify-between"
                                    >
                                        <span className="font-semibold capitalize">
                                            {log.gesture.replace("_", " ")}
                                        </span>
                                        <span>{log.total_samples} Smp</span>
                                    </div>
                                ))}
                        </div>
                        {!isSaving && (
                            <button
                                onClick={() => setShowModal(false)}
                                className="mt-4 w-full bg-slate-800 text-white rounded-lg py-2"
                            >
                                Tutup
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
