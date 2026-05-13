export default function Sidebar({ menu, setMenu }) {
    const menus = [
        {
            id: "monitoring",
            title: "Monitoring",
        },
        {
            id: "gestur",
            title: "Gestur",
        },
        {
            id: "remot_robot",
            title: "Remot Robot",
        },
        {
            id: "setup_device",
            title: "Setup Device",
        },
    ];

    return (
        <div className="w-72 bg-[#D3E0EA] min-h-screen p-6 rounded-r-xl shadow-lg">
            {/* TITLE */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-[#276678]">
                    Smart Glove
                </h1>

                <p className="text-slate-400 text-sm mt-2">
                    IoT Gesture Control System
                </p>
            </div>

            {/* MENU */}
            <div className="flex flex-col gap-2">
                {menus.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setMenu(item.id)}
                        className={`
              px-4 py-3 rounded-lg
              transition-all duration-200
              text-center font-medium text-sm
              border-none

              ${
                  menu === item.id
                      ? "bg-[#1687A7] text-white shadow-md"
                      : "bg-white text-[#1687A7] hover:bg-[#f0f0f0]"
              }
            `}
                    >
                        {item.title}
                    </button>
                ))}
            </div>

            {/* FOOTER */}
            <div className="absolute bottom-6 left-6 text-slate-500 text-sm">
                Smart Glove Research Dashboard
            </div>
        </div>
    );
}
