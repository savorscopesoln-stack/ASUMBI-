import { useNavigate } from "react-router-dom";

import { wipeOfflineDeviceData } from "../utils/lmsOfflineWipe";
export default function LogoutButton() {
  const navigate = useNavigate();

  const logout = () => {
    wipeOfflineDeviceData(); // L10.2b step 4: offline packs + remembered licence leave this device
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <button
      onClick={logout}
      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition"
    >
      Logout
    </button>
  );
}