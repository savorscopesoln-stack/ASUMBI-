import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { useNavigate, useLocation } from "react-router-dom";

/* ─── keyframe injection ─── */
const injectStyles = () => {
  if (document.getElementById("dash-keyframes")) return;
  const el = document.createElement("style");
  el.id = "dash-keyframes";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); }
      70%  { box-shadow: 0 0 0 10px rgba(220,38,38,0); }
      100% { box-shadow: 0 0 0 0  rgba(220,38,38,0); }
    }
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    @keyframes slideIn { from { transform:translateX(-100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
    @keyframes countUp { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
    .dash-nav-btn { transition: background 0.2s, transform 0.15s, box-shadow 0.2s !important; }
    .dash-nav-btn:hover { background: rgba(220,38,38,0.18) !important; transform: translateX(4px) !important; }
    .dash-nav-btn.active-nav { background: linear-gradient(135deg,#991b1b,#dc2626) !important; box-shadow: 0 6px 20px rgba(220,38,38,0.35) !important; }
    .dash-stat-card { transition: transform 0.2s, box-shadow 0.2s; }
    .dash-stat-card:hover { transform: translateY(-4px) !important; box-shadow: 0 16px 40px rgba(220,38,38,0.2) !important; }
    .dash-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
    .dash-btn:active { filter: brightness(0.95); transform: translateY(0); }
    .dash-row-select:hover { background: rgba(220,38,38,0.08) !important; cursor:pointer; }
    .dash-row-select.selected-row { background: rgba(220,38,38,0.14) !important; }
  `;
  document.head.appendChild(el);
};

/* ─── nav items with emoji icons ─── */
const NAV_ITEMS = [
  { name: "Dashboard",       icon: "🏠" },
  { name: "Registration",    icon: "📋" },
  { name: "Students",        icon: "🎒" },
  { name: "Teachers",        icon: "👩‍🏫" },
  { name: "Marks",           icon: "📊" },
  { name: "Users",           icon: "👥" },
  { name: "Assessments",     icon: "📝" },
  { name: "E-Assessments",   icon: "💻" },
  { name: "Reports",         icon: "📁" },
  { name: "Leave-out",       icon: "🚪" },
  { name: "Practicum",       icon: "🔬" },
  { name: "Meals",           icon: "🍽️" },
  { name: "AttendanceReport",icon: "✅" },
  { name: "Graduation",      icon: "🎓" },
];

const ROUTES = {
  Dashboard:"/dashboard", Registration:"/registration", Students:"/students",
  Teachers:"/teachers", Marks:"/marks", Users:"/users", Assessments:"/assessments",
  "E-Assessments":"/e-assessments", Reports:"/reports", "Leave-out":"/leave-out",
  Practicum:"/practicum", Meals:"/meals", AttendanceReport:"/attendance-report",
  Graduation:"/graduation",
};

const formatYear = (y) => {
  if (!y) return "—";
  if (y === 4) return "Graduated";
  return `Year ${y}`;
};

const getMenuFromPath = (path) => {
  const found = NAV_ITEMS.find((n) => path.includes(n.name.toLowerCase().replace("-", "-")));
  return found?.name || "Dashboard";
};

/* ─── custom tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1a0a0a", border:"1px solid rgba(220,38,38,0.3)", borderRadius:10, padding:"8px 14px", color:"#fff", fontSize:13 }}>
      <div style={{ color:"#fca5a5", fontWeight:700 }}>{label}</div>
      <div>{payload[0].value}% health</div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
export default function Dashboard() {
  injectStyles();

  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const location = useLocation();

  /* ─ all original state ─ */
  const [activeMenu, setActiveMenu]           = useState(getMenuFromPath(location.pathname));
  const [stats, setStats]                     = useState({ users:0, students:0, teachers:0, activeStudents:0 });
  const [roles, setRoles]                     = useState([]);
  const [uploadType, setUploadType]           = useState("students");
  const [file, setFile]                       = useState(null);
  const [uploading, setUploading]             = useState(false);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [previewData, setPreviewData]         = useState([]);
  const [previewHeaders, setPreviewHeaders]   = useState([]);
  const [searchTerm, setSearchTerm]           = useState("");
  const [activeData, setActiveData]           = useState([]);
  const [selectedIndex, setSelectedIndex]     = useState(null);
  const [editMode, setEditMode]               = useState(false);
  const [graduated, setGraduated]             = useState([]);
  const [graduationSearch]                    = useState("");
  const [graduationStats]                     = useState([]);

  /* ─ ui-only state ─ */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast]                       = useState(null);
  const [animatedStats, setAnimatedStats]       = useState({ users:0, students:0, teachers:0, activeStudents:0 });

  const isAdmin = user.role === "admin";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── animate numbers ── */
  useEffect(() => {
    const keys = Object.keys(stats);
    const duration = 800;
    const steps = 40;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = {};
      keys.forEach((k) => { next[k] = Math.round(eased * stats[k]); });
      setAnimatedStats(next);
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [stats]);

  useEffect(() => {
    setActiveMenu(getMenuFromPath(location.pathname));
  }, [location.pathname]);

  /* ─── all original API logic ─── */
  const loadStats = useCallback(async () => {
    try {
      const res = await API.get("/stats");
      setStats({
        users:          res.data.users         || 0,
        students:       res.data.students      || 0,
        teachers:       res.data.teachers      || 0,
        activeStudents: res.data.activeStudents|| 0,
      });
      setRoles((res.data.roles || []).map((r) => ({ name: r.role, value: r.count })));
    } catch (err) { console.log(err); }
  }, []);

  const fetchGraduated = async () => {
    try {
      const res = await API.get("/graduations");
      setGraduated(res.data.data || []);
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    loadStats();
    fetchGraduated();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleFileSelect = (f) => {
    setFile(f);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb   = XLSX.read(e.target.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json  = XLSX.utils.sheet_to_json(sheet);
      setPreviewHeaders(json.length ? Object.keys(json[0]) : []);
      setPreviewData(json);
      setActiveData(JSON.parse(JSON.stringify(json)));
      setSelectedIndex(null);
      setEditMode(false);
    };
    reader.readAsBinaryString(f);
  };

  const quickSearch = async () => {
    try {
      setSearchLoading(true);
      const res = await API.get("/search", { params: { type: uploadType, q: searchTerm } });
      const data = res.data || [];
      setPreviewData(data);
      setActiveData(JSON.parse(JSON.stringify(data)));
      setPreviewHeaders(data.length ? Object.keys(data[0]) : []);
      setSelectedIndex(null);
      setEditMode(false);
    } catch (err) { console.log(err); }
    finally { setSearchLoading(false); }
  };

  const pullRecords = async () => {
    try {
      const res  = await API.get("/records", { params: { type: uploadType, page: 1, limit: 100 } });
      const data = res.data.records || [];
      setPreviewData(data);
      setActiveData(JSON.parse(JSON.stringify(data)));
      setPreviewHeaders(data.length ? Object.keys(data[0]) : []);
      setSelectedIndex(null);
      setEditMode(false);
    } catch (err) { console.log(err); showToast("Failed to load records", "error"); }
  };

  const handleEdit = (i, key, value) => {
    const updated = [...activeData];
    updated[i] = { ...updated[i], [key]: value };
    setActiveData(updated);
  };

  const handleSelect = (i) => { setSelectedIndex(i); setEditMode(false); };

  const handleDelete = async () => {
    if (selectedIndex === null) return;
    const record = activeData[selectedIndex];
    try {
      await API.post("/update-records/delete", { type: uploadType, id: record.id || record._id });
      const updated = [...activeData];
      updated.splice(selectedIndex, 1);
      setActiveData(updated);
      setSelectedIndex(null);
      setEditMode(false);
      showToast("Record deleted successfully");
    } catch (err) { console.log(err); showToast("Delete failed", "error"); }
  };

  const pushRecords = async () => {
    try {
      if (!activeData.length) { showToast("No records to update", "error"); return; }
      const res = await API.post("/update-records", { type: uploadType, data: activeData });
      showToast(res.data?.message || "Database updated successfully");
      await pullRecords();
    } catch (err) {
      console.error("PUSH ERROR:", err.response?.data || err.message || err);
      showToast(err.response?.data?.message || "Push failed", "error");
    }
  };

  const handleUpload = async () => {
    if (!file) { showToast("Please select a file first", "error"); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", uploadType);
    try {
      setUploading(true);
      const res = await API.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      showToast(`Upload successful: ${res.data.inserted || 0} records`);
    } catch (err) {
      console.error("UPLOAD ERROR:", err.response?.data || err.message || err);
      showToast(err.response?.data?.message || "Upload failed", "error");
    } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const template = [{ name:"", admissionNo:"", studentClass:"", gender:"", yearOfStudy:"", phone:"" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${uploadType}_template.xlsx`);
  };

  const promoteYear = async () => {
    try {
      const res = await API.post("/promote-years");
      showToast(res.data?.message || "Students promoted successfully");
      pullRecords();
      loadStats();
      fetchGraduated();
    } catch (err) { console.log(err); showToast("Promotion failed", "error"); }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  /* ─── health chart data ─── */
  const healthData = [
    { name: "CPU",      health: 96 },
    { name: "Memory",   health: 94 },
    { name: "Server",   health: 98 },
    { name: "Database", health: 95 },
  ];
  const healthColors = ["#ef4444","#f97316","#dc2626","#b91c1c"];

  /* ─── stat card definitions ─── */
  const statCards = [
    { label:"Total Users",        value: animatedStats.users,          icon:"👥", accent:"#dc2626" },
    { label:"Students",           value: animatedStats.students,       icon:"🎒", accent:"#b91c1c" },
    { label:"Teachers",           value: animatedStats.teachers,       icon:"👩‍🏫", accent:"#991b1b" },
    { label:"Active Students",    value: animatedStats.activeStudents, icon:"⚡", accent:"#7f1d1d" },
    { label:"Graduated Students", value: graduated.length,            icon:"🎓", accent:"#dc2626" },
  ];

  /* ══ RENDER ══ */
  return (
    <div style={D.layout}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          ...D.toast,
          background: toast.type === "error" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "linear-gradient(135deg,#14532d,#16a34a)",
          boxShadow: toast.type === "error" ? "0 8px 30px rgba(220,38,38,0.4)" : "0 8px 30px rgba(22,163,74,0.4)",
        }}>
          {toast.type === "error" ? "✗" : "✓"} {toast.msg}
        </div>
      )}

      {/* ════════ SIDEBAR ════════ */}
      <aside style={{ ...D.sidebar, width: sidebarCollapsed ? 72 : 230 }}>
        {/* Logo */}
        <div style={D.logoRow}>
          <div style={D.logoMark}>
            <span style={{ fontSize: 22 }}>🏫</span>
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={D.logoName}>EduAdmin</div>
              <div style={D.logoSub}>Management System</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed((p) => !p)}
            style={D.collapseToggle}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Divider */}
        <div style={D.divider} />

        {/* Nav items */}
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:4, overflowY:"auto", overflowX:"hidden" }}>
          {NAV_ITEMS.map(({ name, icon }) => (
            <button
              key={name}
              className={`dash-nav-btn${activeMenu === name ? " active-nav" : ""}`}
              onClick={() => { setActiveMenu(name); navigate(ROUTES[name] || "/dashboard"); }}
              title={sidebarCollapsed ? name : undefined}
              style={D.navBtn}
            >
              <span style={D.navIcon}>{icon}</span>
              {!sidebarCollapsed && <span style={D.navLabel}>{name}</span>}
            </button>
          ))}
        </nav>

        <div style={D.divider} />

        {/* User + logout */}
        <div style={D.userBlock}>
          <div style={D.avatar}>{(user.username || "U")[0].toUpperCase()}</div>
          {!sidebarCollapsed && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={D.userName}>{user.username || "User"}</div>
              <div style={D.userRole}>{user.role || "staff"}</div>
            </div>
          )}
          <button onClick={logout} title="Logout" style={D.logoutBtn} className="dash-btn">⏻</button>
        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <main style={D.main}>

        {/* ── Page header ── */}
        <header style={D.pageHeader}>
          <div>
            <h1 style={D.pageTitle}>Dashboard</h1>
            <p style={D.pageSub}>Welcome back, <span style={{ color:"#fca5a5", fontWeight:700 }}>{user.username}</span></p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={D.livePill}>
              <span style={D.liveDot} />
              Live
            </div>
            <div style={D.clock}>{new Date().toLocaleDateString("en-KE", { weekday:"short", year:"numeric", month:"short", day:"numeric" })}</div>
          </div>
        </header>

        {/* ── Stat cards ── */}
        <section style={D.statsGrid}>
          {statCards.map((sc, i) => (
            <div
              key={sc.label}
              className="dash-stat-card"
              style={{ ...D.statCard, animationDelay: `${i * 80}ms` }}
            >
              <div style={{ ...D.statIconWrap, background: `${sc.accent}22`, border:`1px solid ${sc.accent}44` }}>
                <span style={{ fontSize: 22 }}>{sc.icon}</span>
              </div>
              <div style={D.statInfo}>
                <div style={D.statLabel}>{sc.label}</div>
                <div style={{ ...D.statValue, color: sc.accent === "#dc2626" ? "#fca5a5" : "#f87171" }}>
                  {sc.value.toLocaleString()}
                </div>
              </div>
              {/* subtle accent bar */}
              <div style={{ ...D.accentBar, background: sc.accent }} />
            </div>
          ))}
        </section>

        {/* ── Admin: Data Manager ── */}
        {isAdmin && (
          <section style={D.panel}>
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>🗄️ Data Manager</h3>
              <span style={D.panelBadge}>Admin</span>
            </div>

            <div style={D.toolRow}>
              {/* Type select */}
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                style={D.select}
              >
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="users">Users</option>
              </select>

              {/* Actions */}
              <ActionBtn onClick={downloadTemplate} color="#854d0e">⬇ Template</ActionBtn>
              <ActionBtn onClick={pullRecords} color="#1d4ed8">⟳ Load</ActionBtn>
              <ActionBtn
                onClick={promoteYear}
                color="#15803d"
                pulse
              >
                🎓 Promote Year
              </ActionBtn>

              {/* File upload */}
              <label style={D.fileLabel} className="dash-btn">
                📂 Choose File
                <input type="file" style={{ display:"none" }} onChange={(e) => handleFileSelect(e.target.files[0])} />
              </label>
              {file && <span style={D.fileName}>✓ {file.name}</span>}
              <ActionBtn onClick={handleUpload} color="#dc2626" disabled={uploading}>
                {uploading ? "Uploading…" : "⬆ Upload"}
              </ActionBtn>
            </div>

            {/* Selection actions */}
            {selectedIndex !== null && (
              <div style={D.selectionBar}>
                <span style={D.selectionInfo}>Row {selectedIndex + 1} selected</span>
                <ActionBtn onClick={() => setEditMode((p) => !p)} color="#4338ca">{editMode ? "Lock" : "✏ Edit"}</ActionBtn>
                <ActionBtn onClick={handleDelete} color="#dc2626">🗑 Delete</ActionBtn>
                <ActionBtn onClick={pushRecords} color="#15803d">💾 Save to DB</ActionBtn>
              </div>
            )}
          </section>
        )}

        {/* ── Data table ── */}
        {activeData.length > 0 && (
          <section style={D.panel}>
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>📋 Records — {activeData.length} rows</h3>
            </div>
            <div style={D.tableWrap}>
              <table style={D.table}>
                <thead>
                  <tr>
                    {previewHeaders.map((h) => (
                      <th key={h} style={D.th}>{h}</th>
                    ))}
                    <th style={D.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {activeData.map((row, i) => (
                    <tr
                      key={i}
                      className={`dash-row-select${selectedIndex === i ? " selected-row" : ""}`}
                      onClick={() => handleSelect(i)}
                    >
                      {previewHeaders.map((h) => (
                        <td key={h} style={D.td}>
                          {editMode && selectedIndex === i ? (
                            <input
                              value={row[h] || ""}
                              onChange={(e) => handleEdit(i, h, e.target.value)}
                              style={D.cellInput}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span>{row[h] ?? "—"}</span>
                          )}
                        </td>
                      ))}
                      <td style={D.td}>
                        <button
                          style={D.selectBtn}
                          onClick={(e) => { e.stopPropagation(); handleSelect(i); }}
                        >
                          {selectedIndex === i ? "✓" : "○"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Bottom two-col: Graduation + Health ── */}
        <div style={D.twoCol}>

          {/* Graduation table */}
          <section style={D.panel}>
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>🎓 Graduation Records</h3>
              <span style={D.panelBadge}>{graduated.length}</span>
            </div>
            <div style={D.tableWrap}>
              {graduated.length === 0 ? (
                <div style={D.emptyState}>No graduation records yet</div>
              ) : (
                <table style={D.table}>
                  <thead>
                    <tr>
                      {["Name","Admission No","Class","Year","Grad Year"].map((h) => (
                        <th key={h} style={D.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {graduated.map((g) => (
                      <tr key={g.id} className="dash-row-select">
                        <td style={D.td}>{g.name}</td>
                        <td style={D.td}>{g.admissionNo}</td>
                        <td style={D.td}>{g.studentClass}</td>
                        <td style={D.td}>
                          <span style={D.yearPill}>{formatYear(g.yearOfStudy)}</span>
                        </td>
                        <td style={D.td}>{g.graduationYear || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* System Health */}
          <section style={D.panel}>
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>💚 System Health</h3>
              <span style={{ ...D.panelBadge, background:"rgba(22,163,74,0.15)", color:"#4ade80", border:"1px solid #16a34a44" }}>
                Online
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={healthData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill:"#9ca3af", fontSize:13 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:"rgba(220,38,38,0.06)" }} />
                <Bar dataKey="health" radius={[6,6,0,0]}>
                  {healthData.map((_, i) => <Cell key={i} fill={healthColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={D.healthFooter}>
              <span style={D.healthDot} />
              All systems operational — avg 95.75%
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

/* ── ActionBtn helper ── */
function ActionBtn({ children, onClick, color="#dc2626", disabled=false, pulse=false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="dash-btn"
      style={{
        padding: "9px 16px",
        background: `linear-gradient(135deg, ${color}cc, ${color})`,
        border: "none",
        borderRadius: 10,
        color: "#fff",
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
        transition: "filter 0.15s, transform 0.15s",
        animation: pulse ? "pulse-ring 2s infinite" : "none",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════
   STYLES
════════════════════════════════ */
const D = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0d0d0d 0%,#1a0505 50%,#0d0d0d 100%)",
    color: "#f3f4f6",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  /* ── sidebar ── */
  sidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    position: "sticky",
    top: 0,
    background: "rgba(20,5,5,0.97)",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(220,38,38,0.12)",
    padding: "20px 12px",
    transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
    overflow: "hidden",
    zIndex: 10,
    boxSizing: "border-box",
  },

  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    padding: "0 4px",
    minHeight: 48,
  },
  logoMark: {
    width: 42,
    height: 42,
    minWidth: 42,
    background: "linear-gradient(135deg,#7f1d1d,#dc2626)",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(220,38,38,0.4)",
    flexShrink: 0,
  },
  logoName: { fontSize: 15, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" },
  logoSub:  { fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" },
  collapseToggle: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    padding: "4px 6px",
    borderRadius: 6,
    flexShrink: 0,
  },

  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" },

  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "#d1d5db",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    width: "100%",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  navIcon:  { fontSize: 16, flexShrink: 0, width: 20, textAlign: "center" },
  navLabel: { overflow: "hidden", textOverflow: "ellipsis" },

  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 4px 0",
  },
  avatar: {
    width: 34,
    height: 34,
    minWidth: 34,
    background: "linear-gradient(135deg,#991b1b,#dc2626)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 700, color: "#f3f4f6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { fontSize: 11, color: "#9ca3af", textTransform: "capitalize" },
  logoutBtn: {
    marginLeft: "auto",
    background: "rgba(220,38,38,0.12)",
    border: "1px solid rgba(220,38,38,0.2)",
    color: "#f87171",
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.2s",
  },

  /* ── main ── */
  main: {
    flex: 1,
    padding: "28px 32px 60px",
    overflowY: "auto",
    minWidth: 0,
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16,
    animation: "fadeUp 0.4s ease both",
  },
  pageTitle: {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  pageSub: { margin: "6px 0 0", fontSize: 14, color: "#9ca3af" },

  livePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(22,163,74,0.1)",
    border: "1px solid rgba(22,163,74,0.25)",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#4ade80",
  },
  liveDot: {
    width: 7,
    height: 7,
    background: "#22c55e",
    borderRadius: "50%",
    boxShadow: "0 0 0 0 rgba(34,197,94,0.5)",
    animation: "pulse-ring 2s infinite",
    display: "inline-block",
  },
  clock: { fontSize: 12, color: "#6b7280", fontVariantNumeric: "tabular-nums" },

  /* ── stat cards ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))",
    gap: 18,
    marginBottom: 28,
  },
  statCard: {
    position: "relative",
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: "20px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
    animation: "fadeUp 0.5s ease both",
  },
  statIconWrap: {
    width: 46,
    height: 46,
    minWidth: 46,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", animation: "countUp 0.5s ease both" },
  accentBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, opacity: 0.6 },

  /* ── panels ── */
  panel: {
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: "20px 24px",
    marginBottom: 22,
    animation: "fadeUp 0.5s ease both",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: "#f3f4f6" },
  panelBadge: {
    background: "rgba(220,38,38,0.12)",
    color: "#f87171",
    border: "1px solid rgba(220,38,38,0.25)",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
  },

  toolRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  select: {
    padding: "9px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    outline: "none",
  },
  fileLabel: {
    padding: "9px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#d1d5db",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },
  fileName: { fontSize: 12, color: "#4ade80", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  selectionBar: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: "12px 16px",
    background: "rgba(220,38,38,0.06)",
    border: "1px solid rgba(220,38,38,0.18)",
    borderRadius: 12,
  },
  selectionInfo: { fontSize: 13, color: "#fca5a5", fontWeight: 600, marginRight: 4 },

  /* ── table ── */
  tableWrap: { overflowX: "auto", maxHeight: 320, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 14px", background: "rgba(220,38,38,0.1)", color: "#fca5a5", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0 },
  td: { padding: "10px 14px", color: "#d1d5db", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle" },
  cellInput: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(220,38,38,0.35)",
    borderRadius: 6,
    color: "#fff",
    padding: "5px 8px",
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
  },
  selectBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#9ca3af",
    borderRadius: 6,
    padding: "3px 8px",
    cursor: "pointer",
    fontSize: 13,
  },
  yearPill: {
    background: "rgba(220,38,38,0.12)",
    color: "#fca5a5",
    border: "1px solid rgba(220,38,38,0.2)",
    borderRadius: 20,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  emptyState: { padding: "30px 0", textAlign: "center", color: "#4b5563", fontSize: 14 },

  /* ── two col ── */
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 22,
  },

  /* ── health ── */
  healthFooter: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "#4ade80",
    fontWeight: 600,
  },
  healthDot: {
    width: 8,
    height: 8,
    background: "#22c55e",
    borderRadius: "50%",
    display: "inline-block",
    animation: "pulse-ring 2s infinite",
  },

  /* ── toast ── */
  toast: {
    position: "fixed",
    top: 20,
    right: 24,
    zIndex: 9999,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    padding: "14px 22px",
    borderRadius: 14,
    animation: "fadeUp 0.3s ease both",
    maxWidth: 340,
    border: "1px solid rgba(255,255,255,0.1)",
  },
};