import { useState } from "react";

export default function RemotRobot() {
    const [isConnected, setIsConnected] = useState(false);
    const [robotStatus, setRobotStatus] = useState("idle");
    const [commands, setCommands] = useState([]);

    const handleConnect = () => {
        setIsConnected(true);
        setRobotStatus("ready");
        setCommands([
            ...commands,
            {
                id: commands.length + 1,
                cmd: "Koneksi Terhubung",
                time: new Date().toLocaleTimeString(),
            },
        ]);
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setRobotStatus("idle");
        setCommands([
            ...commands,
            {
                id: commands.length + 1,
                cmd: "Koneksi Terputus",
                time: new Date().toLocaleTimeString(),
            },
        ]);
    };

    const sendCommand = (command) => {
        if (!isConnected) {
            alert("Robot belum terhubung!");
            return;
        }
        setCommands([
            ...commands,
            {
                id: commands.length + 1,
                cmd: command,
                time: new Date().toLocaleTimeString(),
            },
        ]);
        setRobotStatus("executing");
        setTimeout(() => setRobotStatus("ready"), 2000);
    };

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-[#276678] mb-2">
                    Remot Robot
                </h2>
                <p className="text-gray-600">
                    Kontrol robot menggunakan gesture yang terdeteksi
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Connection Panel */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Panel Kontrol
                    </h3>

                    {/* Status Display */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-600 text-sm mb-1">
                                    Status Koneksi
                                </p>
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-3 h-3 rounded-full ${
                                            isConnected
                                                ? "bg-green-500"
                                                : "bg-red-500"
                                        }`}
                                    ></div>
                                    <span className="font-medium text-gray-700">
                                        {isConnected ? "Terhubung" : "Terputus"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm mb-1">
                                    Status Robot
                                </p>
                                <p className="font-medium text-gray-700 capitalize">
                                    {robotStatus}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Connection Buttons */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={handleConnect}
                            disabled={isConnected}
                            className="flex-1 px-4 py-3 bg-[#1687A7] text-white rounded-lg font-medium hover:bg-[#276678] disabled:opacity-50 transition-colors"
                        >
                            Hubungkan
                        </button>
                        <button
                            onClick={handleDisconnect}
                            disabled={!isConnected}
                            className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                            Putus Koneksi
                        </button>
                    </div>

                    {/* Command Buttons */}
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                            Perintah Robot
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => sendCommand("Move Forward")}
                                disabled={!isConnected}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                Maju
                            </button>
                            <button
                                onClick={() => sendCommand("Move Backward")}
                                disabled={!isConnected}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                Mundur
                            </button>
                            <button
                                onClick={() => sendCommand("Turn Left")}
                                disabled={!isConnected}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                Belok Kiri
                            </button>
                            <button
                                onClick={() => sendCommand("Turn Right")}
                                disabled={!isConnected}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                Belok Kanan
                            </button>
                            <button
                                onClick={() => sendCommand("Grab")}
                                disabled={!isConnected}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                                Ambil
                            </button>
                            <button
                                onClick={() => sendCommand("Release")}
                                disabled={!isConnected}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                            >
                                Lepas
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Informasi
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-gray-600">Robot Model:</p>
                            <p className="font-medium text-gray-700">
                                RoboDK v8.0
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">IP Address:</p>
                            <p className="font-medium text-gray-700">
                                192.168.1.100
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Port:</p>
                            <p className="font-medium text-gray-700">5000</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Total Perintah:</p>
                            <p className="text-2xl font-bold text-[#1687A7]">
                                {commands.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Command History */}
            {commands.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Riwayat Perintah
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {commands.map((command) => (
                            <div
                                key={command.id}
                                className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg text-sm"
                            >
                                <span className="text-gray-700 font-medium">
                                    {command.cmd}
                                </span>
                                <span className="text-gray-500">
                                    {command.time}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
