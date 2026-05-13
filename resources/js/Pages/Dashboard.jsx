import { useState } from "react";
import Sidebar from "../Component/Sidebar";
import Monitoring from "./Monitoring";
import Gestur from "./Gestur";
import RemotRobot from "./RemotRobot";
import DeviceSetup from "./DeviceSetup";

export default function Dashboard() {
    const [menu, setMenu] = useState("monitoring");

    const renderContent = () => {
        switch (menu) {
            case "monitoring":
                return <Monitoring />;
            case "gestur":
                return <Gestur />;
            case "remot_robot":
                return <RemotRobot />;
            case "setup_device":
                return <DeviceSetup />;
            default:
                return <Monitoring />;
        }
    };

    return (
        <div className="bg-[#F6F5F5] min-h-screen flex">
            <Sidebar menu={menu} setMenu={setMenu} />
            <div className="flex-1">{renderContent()}</div>
        </div>
    );
}
