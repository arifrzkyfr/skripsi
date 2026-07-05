import { useState, useRef, useEffect } from "react";

export default function Monitoring() {
    const [sensor, setSensor] = useState({
        f1: 0,
        f2: 0,
        ax: 0,
        ay: 0,
        az: 0,
        label: "-",
    });

    const [status, setStatus] = useState("Offline");
    const ws = useRef(null);

    const connectViaWiFi = () => {
        const esp32IP = "172.20.10.3";
        const wsUrl = `ws://${esp32IP}:81`;

        console.log("Mencoba menghubungkan ke: " + wsUrl);
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            setStatus("Online");
            console.log("Koneksi WebSocket berhasil!");
        };

        ws.current.onmessage = (event) => {
            const cleanLine = event.data.trim();
            // Tambahkan baris ini untuk melihat apa isi datanya di Console F12:
            console.log("Data diterima dari ESP32:", cleanLine);

            if (cleanLine) {
                const data = cleanLine.split(",");
                if (data.length === 5) {
                    setSensor({
                        f1: parseInt(data[0]) || 0,
                        f2: parseInt(data[1]) || 0,
                        ax: parseInt(data[2]) || 0,
                        ay: parseInt(data[3]) || 0,
                        az: parseInt(data[4]) || 0,
                        label: "-",
                    });
                }
            }
        };

        ws.current.onclose = () => {
            setStatus("Offline");
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
            setStatus("Offline");
        };
    };

    const stopMonitoring = () => {
        if (ws.current) ws.current.close();
        setStatus("Offline");
        setSensor({ f1: 0, f2: 0, ax: 0, ay: 0, az: 0, label: "-" });
    };

    const detectGesture = () => {
        if (status === "Offline") return "⚠️ Perangkat Offline";
        // Sesuaikan angka ambang batas (threshold) ini dengan data sensor Anda
        if (sensor.f1 > 700 && sensor.f2 > 700) return "✊ Genggam";
        if (sensor.f1 < 500 && sensor.f2 < 500) return "🖐 Terbuka";
        return "👌 Semi";
    };

    useEffect(() => {
        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    return (
        <div className="p-8 bg-slate-100 min-h-screen">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-cyan-700">
                    Smart Glove Monitoring
                </h1>
            </div>

            <div className="flex gap-4 mb-6">
                {status === "Offline" ? (
                    <button
                        onClick={connectViaWiFi}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-xl font-semibold shadow-md flex items-center gap-2"
                    >
                        📶 Hubungkan via Wi-Fi
                    </button>
                ) : (
                    <button
                        onClick={stopMonitoring}
                        className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold shadow-md flex items-center gap-2"
                    >
                        ■ Stop Monitoring
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Device Status</h2>
                    <span
                        className={`px-4 py-1 rounded-full font-bold ${status === "Online" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                        {status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                {[
                    { title: "Flex Sensor 1", value: sensor.f1 },
                    { title: "Flex Sensor 2", value: sensor.f2 },
                    { title: "MPU AX", value: sensor.ax },
                    { title: "MPU AY", value: sensor.ay },
                    { title: "MPU AZ", value: sensor.az },
                ].map((item, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-cyan-600"
                    >
                        <h3 className="text-gray-500 font-medium">
                            {item.title}
                        </h3>
                        <p className="text-4xl font-bold text-cyan-700 mt-3">
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-cyan-700 mb-3">
                    Gesture Detection
                </h2>
                <div className="text-5xl font-bold text-cyan-700">
                    {detectGesture()}
                </div>
            </div>
        </div>
    );
}
