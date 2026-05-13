import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function DeviceSetup() {
    const [device, setDevice] = useState(null);

    const [server, setServer] = useState("http://192.168.1.5/api/sensor");

    const [ssid, setSsid] = useState("");

    const [password, setPassword] = useState("");

    const [connected, setConnected] = useState(false);

    const [characteristic, setCharacteristic] = useState(null);

    // UUID BLE
    const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

    const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

    // CONNECT BLE
    const connectBluetooth = async () => {
        try {
            const bleDevice = await navigator.bluetooth.requestDevice({
                filters: [{ name: "smartglove" }],
                optionalServices: [SERVICE_UUID],
            });

            setDevice(bleDevice);

            toast.loading("Menghubungkan ESP32...");

            const gattServer = await bleDevice.gatt.connect();

            const service = await gattServer.getPrimaryService(SERVICE_UUID);

            const charac = await service.getCharacteristic(CHARACTERISTIC_UUID);

            setCharacteristic(charac);

            // ========================================
            // READ CONFIG FROM ESP32
            // ========================================

            const value = await charac.readValue();

            const decoder = new TextDecoder();

            const text = decoder.decode(value);

            console.log("CONFIG:", text);

            const parts = text.split("|");

            if (parts.length === 3) {
                setSsid(parts[0]);

                setPassword(parts[1]);

                setServer(parts[2]);
            }

            setConnected(true);

            toast.dismiss();

            toast.success("ESP32 berhasil terhubung");
        } catch (err) {
            console.log(err);

            toast.dismiss();

            toast.error("Gagal connect Bluetooth");
        }
    };

    // SAVE CONFIG
    const saveConfig = async () => {
        try {
            if (!characteristic) {
                toast.error("Bluetooth belum connect");

                return;
            }

            const payload = `${ssid}|${password}|${server}`;

            const encoder = new TextEncoder();

            await characteristic.writeValue(encoder.encode(payload));

            toast.success("Konfigurasi berhasil dikirim");
        } catch (err) {
            console.log(err);

            toast.error("Gagal mengirim konfigurasi");
        }
    };

    return (
        <div className="p-8">
            <Toaster />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-cyan-600">
                    Smart Glove Device Setup
                </h1>

                <p className="text-gray-500 mt-2">
                    Konfigurasi WiFi dan API ESP32 via BLE
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FORM */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">
                            Konfigurasi ESP32
                        </h2>

                        <div className="flex items-center gap-2">
                            <div
                                className={`w-3 h-3 rounded-full ${
                                    connected ? "bg-green-500" : "bg-red-500"
                                }`}
                            />

                            <span className="text-sm">
                                {connected ? "Connected" : "Disconnected"}
                            </span>
                        </div>
                    </div>

                    {/* BUTTON CONNECT */}
                    <button
                        onClick={connectBluetooth}
                        className="
                            w-full
                            py-3
                            rounded-xl
                            bg-cyan-600
                            hover:bg-cyan-700
                            text-white
                            font-semibold
                            transition
                        "
                    >
                        Connect Smart Glove
                    </button>

                    {/* INPUT */}
                    <div className="mt-6 space-y-5">
                        <div>
                            <label className="block mb-2 font-medium">
                                WiFi SSID
                            </label>

                            <input
                                type="text"
                                value={ssid}
                                onChange={(e) => setSsid(e.target.value)}
                                className="
                                    w-full
                                    border
                                    rounded-xl
                                    px-4
                                    py-3
                                "
                                placeholder="Nama WiFi"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-medium">
                                Password WiFi
                            </label>

                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="
                                    w-full
                                    border
                                    rounded-xl
                                    px-4
                                    py-3
                                "
                                placeholder="Password WiFi"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-medium">
                                API URL
                            </label>

                            <input
                                type="text"
                                value={server}
                                onChange={(e) => setServer(e.target.value)}
                                className="
                                    w-full
                                    border
                                    rounded-xl
                                    px-4
                                    py-3
                                "
                                placeholder="http://192.168..."
                            />
                        </div>

                        <button
                            onClick={saveConfig}
                            className="
                                w-full
                                py-3
                                rounded-xl
                                bg-green-500
                                hover:bg-green-600
                                text-white
                                font-semibold
                            "
                        >
                            Simpan Konfigurasi
                        </button>
                    </div>
                </div>

                {/* INFO */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-5">
                        Informasi Device
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-500">Device Name</p>

                            <p className="font-semibold">smartglove</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Microcontroller</p>

                            <p className="font-semibold">ESP32</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Communication</p>

                            <p className="font-semibold">BLE + WiFi</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
