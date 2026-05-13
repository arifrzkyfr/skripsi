import { useEffect, useState } from "react";

export default function Monitoring() {
    const [sensor, setSensor] = useState({
        f1: 0,
        f2: 0,

        ax: 0,
        ay: 0,
        az: 0,

        label: "-",
    });

    const [lastUpdate, setLastUpdate] = useState(null);
    const [status, setStatus] = useState("Offline");

    useEffect(() => {
        const checker = setInterval(() => {
            if (lastUpdate && Date.now() - lastUpdate > 3000) {
                setStatus("Offline");
            }
        }, 1000);

        return () => clearInterval(checker);
    }, [lastUpdate]);
    // FETCH REALTIME
    const fetchSensor = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/live");

            const result = await res.json();

            if (result.status === "online") {
                setSensor(result.data);

                setStatus("Online");
            } else {
                setStatus("Offline");
            }
        } catch (err) {
            console.log(err);

            setStatus("Offline");
        }
    };

    // REALTIME LOOP
    useEffect(() => {
        fetchSensor();

        const interval = setInterval(() => {
            fetchSensor();
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // DETEKSI GESTURE SEDERHANA
    const detectGesture = () => {
        if (sensor.f1 > 700 && sensor.f2 > 700) {
            return "✊ Genggam";
        }

        if (sensor.f1 < 500 && sensor.f2 < 500) {
            return "🖐 Terbuka";
        }

        return "👌 Semi";
    };

    const stopMonitoring = async () => {
        try {
            await fetch("http://127.0.0.1:8000/api/sensor/reset", {
                method: "POST",
            });

            // RESET SENSOR
            setSensor({
                f1: 0,
                f2: 0,

                ax: 0,
                ay: 0,
                az: 0,

                label: "-",
            });

            setStatus("Offline");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="p-8 bg-slate-100 min-h-screen">
            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-cyan-700">
                    Smart Glove Monitoring
                </h1>

                <p className="text-gray-500 mt-2">
                    Monitoring realtime sensor ESP32
                </p>
            </div>

            <div className="flex gap-4 mb-6">
                {/* STOP */}
                <button
                    onClick={stopMonitoring}
                    className="
            px-5
            py-3
            bg-red-500
            hover:bg-red-600
            text-white
            rounded-xl
            font-semibold
        "
                >
                    ■ Stop Monitoring
                </button>
            </div>

            {/* STATUS */}
            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Device Status</h2>

                        <p className="text-gray-500">
                            Monitoring koneksi device
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div
                            className={`
                            w-4 h-4 rounded-full
                            ${
                                status === "Online"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                            }
                        `}
                        ></div>

                        <span className="font-semibold">{status}</span>
                    </div>
                </div>
            </div>

            {/* SENSOR CARD */}
            <div
                className="
                grid
                grid-cols-1
                md:grid-cols-2
                lg:grid-cols-5
                gap-5
            "
            >
                {/* F1 */}
                <div
                    className="
                    bg-white
                    rounded-2xl
                    shadow-lg
                    p-6
                "
                >
                    <h3 className="text-gray-500">Flex Sensor 1</h3>

                    <p
                        className="
                        text-4xl
                        font-bold
                        text-cyan-700
                        mt-3
                    "
                    >
                        {sensor.f1}
                    </p>
                </div>

                {/* F2 */}
                <div
                    className="
                    bg-white
                    rounded-2xl
                    shadow-lg
                    p-6
                "
                >
                    <h3 className="text-gray-500">Flex Sensor 2</h3>

                    <p
                        className="
                        text-4xl
                        font-bold
                        text-cyan-700
                        mt-3
                    "
                    >
                        {sensor.f2}
                    </p>
                </div>

                {/* AX */}
                <div
                    className="
                    bg-white
                    rounded-2xl
                    shadow-lg
                    p-6
                "
                >
                    <h3 className="text-gray-500">MPU AX</h3>

                    <p
                        className="
                        text-3xl
                        font-bold
                        text-blue-600
                        mt-3
                    "
                    >
                        {sensor.ax}
                    </p>
                </div>

                {/* AY */}
                <div
                    className="
                    bg-white
                    rounded-2xl
                    shadow-lg
                    p-6
                "
                >
                    <h3 className="text-gray-500">MPU AY</h3>

                    <p
                        className="
                        text-3xl
                        font-bold
                        text-blue-600
                        mt-3
                    "
                    >
                        {sensor.ay}
                    </p>
                </div>

                {/* AZ */}
                <div
                    className="
                    bg-white
                    rounded-2xl
                    shadow-lg
                    p-6
                "
                >
                    <h3 className="text-gray-500">MPU AZ</h3>

                    <p
                        className="
                        text-3xl
                        font-bold
                        text-blue-600
                        mt-3
                    "
                    >
                        {sensor.az}
                    </p>
                </div>
            </div>

            {/* GESTURE */}
            <div
                className="
                mt-8
                bg-white
                rounded-2xl
                shadow-lg
                p-8
            "
            >
                <h2
                    className="
                    text-2xl
                    font-bold
                    text-cyan-700
                    mb-3
                "
                >
                    Gesture Detection
                </h2>

                <p className="text-gray-500">Interpretasi gesture realtime</p>

                <div
                    className="
                    mt-6
                    text-5xl
                    font-bold
                    text-center
                    text-cyan-700
                "
                >
                    {detectGesture()}
                </div>
            </div>
        </div>
    );
}
