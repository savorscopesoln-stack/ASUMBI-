import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const linkStyle = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200
     ${
       isActive
         ? "bg-[#7f1d1d] text-white shadow-lg shadow-red-900/30"
         : "text-white/70 hover:bg-white/10 hover:text-white"
     }`;

  return (
    <nav className="flex flex-col space-y-2 p-3">
      <h2 className="text-white font-bold text-sm mb-2 opacity-70">
        MENU
      </h2>

      <NavLink to="/dashboard" className={linkStyle}>
        📊 <span>Dashboard</span>
      </NavLink>

      <NavLink to="/students" className={linkStyle}>
        🎓 <span>Students</span>
      </NavLink>

      <NavLink to="/teachers" className={linkStyle}>
        🧑‍🏫 <span>Teachers</span>
      </NavLink>

      <NavLink to="/fees" className={linkStyle}>
        💰 <span>Fees</span>
      </NavLink>

      <NavLink to="/attendance" className={linkStyle}>
        📡 <span>Attendance</span>
      </NavLink>

      <NavLink to="/users" className={linkStyle}>
        👥 <span>Users</span>
      </NavLink>

      {/* Optional upgrade section */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-4 py-2 rounded-xl
                     text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          ⚙️ <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}