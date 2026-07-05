import { useState } from "react";

export default function DeviceSetup() {
    const [sensor, setSensor] = useState(null);
    const [status, setStatus] = useState("Offline");

    // Fungsi utama untuk menangkap aliran data dari USB
    const connectGlove = async () => {
        // Cek dukungan browser
        if (!("serial" in navigator)) {
            alert(
                "Browser Anda tidak mendukung Web Serial API. Gunakan Google Chrome atau Microsoft Edge.",
            );
            return;
        }

        try {
            // 1. Meminta izin memilih COM Port
            const port = await navigator.serial.requestPort();

            // 2. Membuka koneksi (Baud rate wajib sama dengan Serial.begin di ESP32/Arduino)
            await port.open({ baudRate: 115200 });
            setStatus("Connected");

            // 3. Menyiapkan penerjemah teks (mengubah sinyal biner jadi string)
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(
                textDecoder.writable,
            );
            const reader = textDecoder.readable.getReader();

            let buffer = "";

            // 4. Looping tanpa henti untuk membaca data secara real-time
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    // Berhenti jika koneksi diputus
                    reader.releaseLock();
                    break;
                }

                if (value) {
                    buffer += value;
                    // Arduino menggunakan println yang menghasilkan karakter baris baru (\n)
                    const lines = buffer.split("\n");

                    // Potongan data terakhir mungkin belum lengkap, simpan kembali ke buffer
                    buffer = lines.pop();

                    for (const line of lines) {
                        const cleanLine = line.trim();

                        if (cleanLine) {
                            const dataArray = cleanLine.split(",");

                            // Pastikan urutan data yang masuk ada 5 (f1, f2, ax, ay, az)
                            if (dataArray.length === 5) {
                                setSensor({
                                    flex1: parseInt(dataArray[0]),
                                    flex2: parseInt(dataArray[1]),
                                    ax: parseInt(dataArray[2]),
                                    ay: parseInt(dataArray[3]),
                                    az: parseInt(dataArray[4]),
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Koneksi terputus atau gagal:", error);
            setStatus("Offline");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Device Setup</h1>

            {/* Panel Status & Kontrol */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <span className="font-semibold text-gray-700">
                            Device Status:{" "}
                        </span>
                        <span
                            className={`ml-2 font-bold ${status === "Connected" ? "text-green-600" : "text-red-500"}`}
                        >
                            {status}
                        </span>
                    </div>

                    {/* Tombol Pemicu Koneksi USB */}
                    <button
                        onClick={connectGlove}
                        className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                        {status === "Connected"
                            ? "Membaca Data..."
                            : "Hubungkan Smart Glove"}
                    </button>
                </div>
            </div>

            {/* Panel Visualisasi Data */}
            {sensor && status === "Connected" && (
                <div className="bg-white rounded-xl shadow p-6 border-t-4 border-blue-500">
                    <h2 className="font-semibold text-gray-800 mb-4">
                        Live Sensor Data (20Hz)
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm text-center">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                Flex 1
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                                {sensor.flex1}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm text-center">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                Flex 2
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                                {sensor.flex2}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm text-center">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                Accel X
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                                {sensor.ax}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm text-center">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                Accel Y
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                                {sensor.ay}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm text-center">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                Accel Z
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                                {sensor.az}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
