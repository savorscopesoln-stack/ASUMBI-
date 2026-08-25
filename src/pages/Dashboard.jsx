import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Users, UserRound, BarChart3, ShieldCheck,
  FileText, MonitorCheck, FolderOpen, DoorOpen, FlaskConical, Utensils,
  CalendarCheck, GraduationCap, ChevronLeft, ChevronRight, ChevronDown,
  Sun, Moon, Menu, X, LogOut, Search, Download, RefreshCw, Upload,
  Pencil, Trash2, Save, AlertTriangle, CheckCircle2, XCircle, Loader2,
  Award, Activity, Inbox, KeyRound, Bell, Settings, Vote, SlidersHorizontal,
  UserRoundCog,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { hasPage } from "../permissions";
import useUnreadNotifications from "../hooks/useUnreadNotifications";

/* ─── design-token stylesheet (light default, dark override) ───
   Text tokens were bumped up in contrast/saturation — the old
   --text-secondary/--text-muted greys (#6B7280 / #9CA3AF) read as
   faded since most labels, descriptions, and nav items use them.
*/
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes softPulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
    @keyframes countUp { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }

    .dash-spin { animation: spin 0.8s linear infinite; }
    .dash-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: softPulse 1.4s ease-in-out infinite; border-radius: 8px; }

    .dash-nav-btn { transition: background 0.15s ease, color 0.15s ease; }
    .dash-nav-btn:hover { background: var(--primary-tint); color: var(--primary-dark); }
    .dash-nav-btn.active-nav { background: var(--primary-tint); color: var(--primary); font-weight: 700; }

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }
    .dash-btn-secondary:hover { background: var(--bg) !important; }
    .dash-row:hover { background: var(--primary-tint) !important; cursor: pointer; }
    .dash-row.selected-row { background: var(--primary-tint) !important; }
    .dash-icon-btn:hover { background: var(--bg); }
    .dash-profile-card:hover { background: var(--bg); }

    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .dash-mobile-toggle { display: none; }
    .dash-backdrop { display: none; }

    @media (max-width: 900px) {
      .dash-sidebar { position: fixed !important; top: 0; left: 0; height: 100vh; width: 250px !important; transform: translateX(-100%); transition: transform .25s ease; z-index: 60; }
      .dash-sidebar.mobile-open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,0.25); }
      .dash-mobile-toggle { display: inline-flex !important; }
      .dash-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(15,17,21,0.45); z-index: 55; }
      .dash-main { padding: 20px 16px 48px !important; }
      .dash-two-col { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 1180px) and (min-width: 901px) {
      .dash-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 640px) {
      .dash-stats-grid { grid-template-columns: 1fr !important; }
      .dash-tool-row { flex-direction: column; align-items: stretch !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── nav items grouped, professional icon set ─── */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", Icon: LayoutDashboard }],
  },
  {
    label: "Academics",
    items: [
      { name: "Students", Icon: Users },
      { name: "Teachers", Icon: UserRound },
      { name: "Marks", Icon: BarChart3 },
      { name: "Assessments", Icon: FileText },
      { name: "E-Assessments", Icon: MonitorCheck },
      { name: "Practicum", Icon: FlaskConical },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Registration", Icon: ClipboardList },
      { name: "Users", Icon: ShieldCheck },
      { name: "Password Reset", Icon: KeyRound },
      { name: "Leave-out", Icon: DoorOpen },
      { name: "Meals", Icon: Utensils },
      { name: "AttendanceReport", Icon: CalendarCheck },
      { name: "Reports", Icon: FolderOpen },
      { name: "Graduation", Icon: GraduationCap },
      { name: "Notifications", Icon: Bell },
      { name: "Student Council", Icon: Vote },
      { name: "Gate", Icon: DoorOpen },
      { name: "Kitchen", Icon: Utensils },
      { name: "Profile Change Requests", Icon: UserRoundCog },
      // Not part of the grantable sub-admin PAGE_KEYS list (see
      // permissions.js) on purpose — hasPage() only returns true for
      // this key when role === "admin" (its unconditional bypass), so
      // a sub_admin can never see or reach it even if granted every
      // other page. API credentials are more sensitive than the
      // broadcast-notifications feature itself.
      { name: "Notification Settings", Icon: Settings },
      // Same admin-only treatment as above — controls which pages
      // exist in the Student/Teacher portals at all, so it's kept
      // out of the sub-admin-grantable list on purpose.
      { name: "Portal Pages", Icon: SlidersHorizontal },
    ],
  },
];
const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const ROUTES = {
  Dashboard:"/dashboard", Registration:"/registration", Students:"/students",
  Teachers:"/teachers", Marks:"/marks", Users:"/users", Assessments:"/assessments",
  "E-Assessments":"/e-assessments", Reports:"/reports", "Leave-out":"/leave-out",
  Practicum:"/practicum", Meals:"/meals", AttendanceReport:"/attendance-report",
  Graduation:"/graduation", "Password Reset":"/password-reset",
  Notifications:"/notifications", "Notification Settings":"/notification-settings",
  "Student Council":"/student-council",
  Gate:"/gate", Kitchen:"/kitchen",
  "Profile Change Requests":"/profile-change-requests",
  "Portal Pages":"/portal-pages",
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

const healthStatusColor = (v) => {
  if (v >= 90) return "var(--success)";
  if (v >= 75) return "var(--warning)";
  return "var(--destructive)";
};

/* ─── custom recharts tooltip, token-driven ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--card-elevated)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 14px", color:"var(--text)", fontSize:13, boxShadow:"var(--shadow)" }}>
      <div style={{ color:"var(--text-secondary)", fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ fontWeight:700 }}>{payload[0].value}% health</div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   Entry point — ThemeProvider now lives at the app root
   (see src/main.jsx), so this page just renders Dashboard
   and consumes theme via useTheme().
════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  return <Dashboard />;
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
function Dashboard() {
  injectStyles();

  const { theme, toggleTheme } = useTheme();
  const { count: unreadNotifCount } = useUnreadNotifications();
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const location = useLocation();

  /* ─ sidebar nav, filtered to whatever this account was granted ─
     "admin" passes hasPage() for everything; a sub_admin only sees
     the pages selected when their account was set up. */
  const visibleNavGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.name === "Portal Pages" ? String(user?.role || "").toLowerCase() === "admin" : hasPage(user, item.name)
      ),
    }))
    .filter((group) => group.items.length > 0);

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
  const [mobileOpen, setMobileOpen]             = useState(false);
  const [toast, setToast]                       = useState(null);
  const [animatedStats, setAnimatedStats]       = useState({ users:0, students:0, teachers:0, activeStudents:0 });
  const [statsLoading, setStatsLoading]         = useState(true);
  const [statsError, setStatsError]             = useState(false);
  const [graduatedLoading, setGraduatedLoading] = useState(true);
  const [graduatedError, setGraduatedError]     = useState(false);
  const [confirmDelete, setConfirmDelete]       = useState(false);
  const firstStatsLoad = useRef(true);
  const firstGradLoad  = useRef(true);

  const isAdmin = user.role === "admin";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── animate numbers (subtle, respects reduced motion via CSS) ── */
  useEffect(() => {
    const keys = Object.keys(stats);
    const duration = 500;
    const steps = 24;
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
    setMobileOpen(false);
  }, [location.pathname]);

  /* ─── all original API logic (endpoints unchanged) ─── */
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
      setStatsError(false);
    } catch (err) {
      console.log(err);
      setStatsError(true);
    } finally {
      if (firstStatsLoad.current) { setStatsLoading(false); firstStatsLoad.current = false; }
    }
  }, []);

  const fetchGraduated = async () => {
    try {
      const res = await API.get("/graduations");
      setGraduated(res.data.data || []);
      setGraduatedError(false);
    } catch (err) {
      console.log(err);
      setGraduatedError(true);
    } finally {
      if (firstGradLoad.current) { setGraduatedLoading(false); firstGradLoad.current = false; }
    }
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
    } catch (err) { console.log(err); showToast("Search failed", "error"); }
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

  const handleSelect = (i) => { setSelectedIndex(i); setEditMode(false); setConfirmDelete(false); };

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
      setConfirmDelete(false);
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

  const retryStats = () => { setStatsLoading(true); firstStatsLoad.current = true; loadStats(); };
  const retryGraduated = () => { setGraduatedLoading(true); firstGradLoad.current = true; fetchGraduated(); };

  /* ─── system health (existing static indicator data, unchanged) ─── */
  const healthData = [
    { name: "CPU",      health: 96 },
    { name: "Memory",   health: 94 },
    { name: "Server",   health: 98 },
    { name: "Database", health: 95 },
  ];
  const avgHealth = Math.round(healthData.reduce((s, h) => s + h.health, 0) / healthData.length);
  const overallHealthy = avgHealth >= 90;

  /* ─── stat card definitions — real data only ─── */
  const statCards = [
    { label:"Students",           value: animatedStats.students,       Icon: GraduationCap, tint:"primary" },
    { label:"Teachers",           value: animatedStats.teachers,       Icon: UserRound,     tint:"info" },
    { label:"Active Students",    value: animatedStats.activeStudents, Icon: Activity,      tint:"success" },
    { label:"Total Users",        value: animatedStats.users,          Icon: Users,         tint:"neutral" },
    { label:"Graduated Students", value: graduated.length,            Icon: Award,         tint:"warning" },
  ];
  const tintStyles = {
    primary:  { bg:"var(--primary-tint)",  fg:"var(--primary)" },
    info:     { bg:"var(--info-tint)",     fg:"var(--info)" },
    success:  { bg:"var(--success-tint)",  fg:"var(--success)" },
    warning:  { bg:"var(--warning-tint)",  fg:"var(--warning)" },
    neutral:  { bg:"var(--bg)",            fg:"var(--text-secondary)" },
  };

  const sidebarWidth = sidebarCollapsed ? 68 : 252;

  /* ══ RENDER ══ */
  return (
    <div style={D.layout}>

      {/* ── Toast (minimal, semantic left accent) ── */}
      {toast && (
        <div role="status" aria-live="polite" style={D.toast}>
          <span style={{ color: toast.type === "error" ? "var(--destructive)" : "var(--success)", display:"flex", flexShrink:0 }}>
            {toast.type === "error" ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          </span>
          <span style={{ color:"var(--text)", fontSize:14, fontWeight:600 }}>{toast.msg}</span>
        </div>
      )}

      {/* ── Mobile backdrop ── */}
      <div
        className={`dash-backdrop${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ════════ SIDEBAR ════════ */}
      <aside
        className={`dash-sidebar${mobileOpen ? " mobile-open" : ""}`}
        style={{ ...D.sidebar, width: sidebarWidth }}
        aria-label="Sidebar navigation"
      >
        {/* Logo row */}
        <div style={D.logoRow}>
          <div style={D.logoMark}>
            <GraduationCap size={20} color="#fff" strokeWidth={2.25} />
          </div>
          {!sidebarCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={D.logoName}>Asumbi Smart Campus</div>
              <div style={D.logoSub}>Administration</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed((p) => !p)}
            className="dash-icon-btn"
            style={D.collapseToggle}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Profile card */}
        
        <div style={D.divider} />

        {/* Grouped nav */}
        <nav aria-label="Main navigation" style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
          {visibleNavGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 14 }}>
              {!sidebarCollapsed && <div style={D.groupLabel}>{group.label}</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {group.items.map(({ name, Icon }) => (
                  <button
                    key={name}
                    className={`dash-nav-btn${activeMenu === name ? " active-nav" : ""}`}
                    onClick={() => { setActiveMenu(name); navigate(ROUTES[name] || "/dashboard"); }}
                    aria-current={activeMenu === name ? "page" : undefined}
                    title={sidebarCollapsed ? name : undefined}
                    style={D.navBtn}
                  >
                    <span style={D.navIcon}>
                      <Icon size={17} strokeWidth={2} />
                      {name === "Notifications" && unreadNotifCount > 0 && sidebarCollapsed && (
                        <span style={D.navIconDot} />
                      )}
                    </span>
                    {!sidebarCollapsed && (
                      <span style={D.navLabel}>
                        {name}
                        {name === "Notifications" && unreadNotifCount > 0 && (
                          <span style={D.navBadge}>{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
                        )}
                      </span>
                    )}
                  </button>
                  
                ))}
                
              </div>
            </div>
          ))}
          <button
          onClick={logout}
          className="dash-btn"
          aria-label="Log out of your account"
          title="Log out"
          style={{
            ...D.logoutBtn,
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
          }}
        >
          <LogOut size={17} strokeWidth={2.25} />
          {!sidebarCollapsed && <span>Log out</span>}
        </button>
        </nav>

        <div style={D.divider} />

        {/* Accessible logout */}
        
      </aside>

      {/* ════════ MAIN ════════ */}
      <main className="dash-main" style={D.main}>

        {/* ── Header ── */}
        <header style={D.pageHeader}>
          <button
          type="button"
          className="dash-profile-card"
          style={D.profileCard}
          onClick={() => navigate("/profile")}
          aria-label={`Signed in as ${user.username || "User"}, role ${user.role || "sub_admin"}. Open profile.`}
          title={sidebarCollapsed ? `${user.username || "User"} · ${user.role || "sub_admin"}` : undefined}
        >
          <div style={D.profileAvatar}>{(user.username || "U")[0].toUpperCase()}</div>
          {!sidebarCollapsed && (
            <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
              <div style={D.profileName}>{user.username || "User"}</div>
              <span style={D.profileRoleBadge}>{user.role || "sub_admin"}</span>
            </div>
          )}
          {!sidebarCollapsed && <ChevronDown size={15} color="var(--text-muted)" style={{ flexShrink:0 }} />}
        </button>

          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <button
              className="dash-mobile-toggle dash-icon-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              style={D.mobileToggleBtn}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={D.pageTitle}>Dashboard</h1>
              <p style={D.pageSub}>Welcome back, <span style={{ color:"var(--primary)", fontWeight:700 }}>{user.username || "there"}</span></p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={D.livePill}>
              <span style={D.liveDot} />
              Live
            </div>
            <span style={D.clock}>{new Date().toLocaleDateString("en-KE", { weekday:"short", year:"numeric", month:"short", day:"numeric" })}</span>
            <button
              onClick={toggleTheme}
              className="dash-icon-btn"
              style={D.themeToggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* ── Stats error banner ── */}
        {statsError && !statsLoading && (
          <div style={D.errorBanner} role="alert">
            <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink:0 }} />
            <span style={{ flex:1 }}>Unable to load dashboard statistics.</span>
            <button onClick={retryStats} style={D.retryBtn} className="dash-btn-secondary">Retry</button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <section className="dash-stats-grid" style={D.statsGrid} aria-label="Summary statistics">
          {statsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={D.statCard} className="dash-card">
                  <div className="dash-skeleton" style={{ width:44, height:44, borderRadius:12 }} />
                  <div style={{ flex:1 }}>
                    <div className="dash-skeleton" style={{ width:"70%", height:11, marginBottom:8 }} />
                    <div className="dash-skeleton" style={{ width:"45%", height:22 }} />
                  </div>
                </div>
              ))
            : statCards.map((sc) => {
                const t = tintStyles[sc.tint];
                return (
                  <div key={sc.label} className="dash-card" style={D.statCard}>
                    <div style={{ ...D.statIconWrap, background: t.bg }}>
                      <sc.Icon size={20} color={t.fg} strokeWidth={2} />
                    </div>
                    <div style={D.statInfo}>
                      <div style={D.statLabel}>{sc.label}</div>
                      <div style={D.statValue}>{sc.value.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
        </section>

        {/* ── Admin: Data Manager ── */}
        {isAdmin && (
          <section style={D.panel} aria-label="Data manager">
            <div style={D.panelHeader}>
              <div>
                <h3 style={D.panelTitle}>Data Manager</h3>
                <p style={D.panelDesc}>Import, review and manage institutional records.</p>
              </div>
              <span style={D.panelBadge}>Admin</span>
            </div>

            <div className="dash-tool-row" style={D.toolRow}>
              <label style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <span style={D.fieldLabel}>Record type</span>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  style={D.select}
                  aria-label="Record type"
                >
                  <option value="students">Students</option>
                  <option value="teachers">Teachers</option>
                  <option value="users">Users</option>
                </select>
              </label>

              <label style={{ display:"flex", flexDirection:"column", gap:4, flex:"1 1 200px", minWidth: 180 }}>
                <span style={D.fieldLabel}>Search records</span>
                <div style={{ display:"flex", gap:6 }}>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") quickSearch(); }}
                    placeholder="Name, admission no…"
                    style={D.textInput}
                    aria-label="Search records"
                  />
                  <button
                    onClick={quickSearch}
                    className="dash-btn dash-btn-secondary"
                    style={D.secondaryBtn}
                    aria-label="Run search"
                    disabled={searchLoading}
                  >
                    {searchLoading ? <Loader2 size={14} className="dash-spin" /> : <Search size={14} />}
                  </button>
                </div>
              </label>
            </div>

            <div className="dash-tool-row" style={{ ...D.toolRow, marginTop: 12 }}>
              <SecondaryBtn onClick={downloadTemplate} Icon={Download}>Template</SecondaryBtn>
              <SecondaryBtn onClick={pullRecords} Icon={RefreshCw}>Load</SecondaryBtn>
              <SecondaryBtn onClick={promoteYear} Icon={GraduationCap}>Promote Year</SecondaryBtn>

              <label style={D.fileLabel} className="dash-btn dash-btn-secondary">
                <FolderOpen size={14} />
                Choose file
                <input
                  type="file"
                  style={{ position:"absolute", width:1, height:1, overflow:"hidden", clip:"rect(0 0 0 0)" }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  aria-label="Choose file to upload"
                />
              </label>
              {file && <span style={D.fileName}>{file.name}</span>}
              <PrimaryBtn onClick={handleUpload} disabled={uploading} Icon={Upload}>
                {uploading ? "Uploading…" : "Upload"}
              </PrimaryBtn>
            </div>

            {/* Selection actions */}
            {selectedIndex !== null && !confirmDelete && (
              <div style={D.selectionBar}>
                <span style={D.selectionInfo}>Row {selectedIndex + 1} selected</span>
                <SecondaryBtn onClick={() => setEditMode((p) => !p)} Icon={Pencil}>{editMode ? "Lock" : "Edit"}</SecondaryBtn>
                <DestructiveBtn onClick={() => setConfirmDelete(true)} Icon={Trash2}>Delete</DestructiveBtn>
                <PrimaryBtn onClick={pushRecords} Icon={Save}>Save to DB</PrimaryBtn>
              </div>
            )}

            {/* Inline delete confirmation */}
            {selectedIndex !== null && confirmDelete && (
              <div style={D.confirmBar} role="alertdialog" aria-label="Confirm delete">
                <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:600, color:"var(--text)", flex:1 }}>
                  Delete row {selectedIndex + 1}? This can't be undone.
                </span>
                <SecondaryBtn onClick={() => setConfirmDelete(false)}>Cancel</SecondaryBtn>
                <DestructiveBtn onClick={handleDelete} Icon={Trash2}>Delete</DestructiveBtn>
              </div>
            )}
          </section>
        )}

        {/* ── Data table ── */}
        {activeData.length > 0 && (
          <section style={D.panel} aria-label="Records table">
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>Records <span style={{ color:"var(--text-muted)", fontWeight:500 }}>— {activeData.length} rows</span></h3>
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
                      className={`dash-row${selectedIndex === i ? " selected-row" : ""}`}
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
                              aria-label={`Edit ${h}`}
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
                          aria-label={selectedIndex === i ? `Row ${i + 1} selected` : `Select row ${i + 1}`}
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
        <div className="dash-two-col" style={D.twoCol}>

          {/* Graduation table */}
          <section style={D.panel} aria-label="Graduation records">
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>Graduation Records</h3>
              <span style={D.panelBadge}>{graduated.length}</span>
            </div>

            {graduatedError && !graduatedLoading && (
              <div style={{ ...D.errorBanner, marginBottom: 14 }} role="alert">
                <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink:0 }} />
                <span style={{ flex:1 }}>Unable to load graduation records.</span>
                <button onClick={retryGraduated} style={D.retryBtn} className="dash-btn-secondary">Retry</button>
              </div>
            )}

            <div style={D.tableWrap}>
              {graduatedLoading ? (
                <div style={{ padding: 16, display:"flex", flexDirection:"column", gap:8 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="dash-skeleton" style={{ height: 20 }} />
                  ))}
                </div>
              ) : graduated.length === 0 ? (
                <div style={D.emptyState}>
                  <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                  <div>No graduation records yet</div>
                </div>
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
                      <tr key={g.id} className="dash-row">
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
          <section style={D.panel} aria-label="System health">
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>System Health</h3>
              <span style={{
                ...D.panelBadge,
                background: overallHealthy ? "var(--success-tint)" : "var(--warning-tint)",
                color: overallHealthy ? "var(--success)" : "var(--warning)",
              }}>
                {overallHealthy ? "Operational" : "Degraded"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={healthData} barSize={26}>
                <XAxis dataKey="name" tick={{ fill:"var(--text-muted)", fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:"var(--bg)" }} />
                <Bar dataKey="health" radius={[6,6,0,0]}>
                  {healthData.map((d, i) => <Cell key={i} fill={healthStatusColor(d.health)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={D.healthFooter}>
              <span style={{ ...D.healthDot, background: overallHealthy ? "var(--success)" : "var(--warning)" }} />
              {overallHealthy ? "All systems operational" : "Some systems need attention"} — avg {avgHealth}%
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

/* ── button helpers (Primary / Secondary / Destructive hierarchy) ── */
function PrimaryBtn({ children, onClick, disabled=false, Icon }) {
  return (
    <button onClick={onClick} disabled={disabled} className="dash-btn"
      aria-label={typeof children === "string" ? children : undefined}
      style={{ ...D.btnBase, background:"var(--primary)", color:"#fff", border:"1px solid var(--primary)", opacity: disabled?0.55:1, cursor: disabled?"not-allowed":"pointer" }}>
      {Icon && <Icon size={14} strokeWidth={2.5} />}{children}
    </button>
  );
}
function SecondaryBtn({ children, onClick, disabled=false, Icon }) {
  return (
    <button onClick={onClick} disabled={disabled} className="dash-btn dash-btn-secondary"
      aria-label={typeof children === "string" ? children : undefined}
      style={{ ...D.btnBase, background:"var(--card)", color:"var(--text)", border:"1px solid var(--border)", opacity: disabled?0.55:1, cursor: disabled?"not-allowed":"pointer" }}>
      {Icon && <Icon size={14} strokeWidth={2.5} />}{children}
    </button>
  );
}
function DestructiveBtn({ children, onClick, disabled=false, Icon }) {
  return (
    <button onClick={onClick} disabled={disabled} className="dash-btn"
      aria-label={typeof children === "string" ? children : undefined}
      style={{ ...D.btnBase, background:"var(--destructive)", color:"#fff", border:"1px solid var(--destructive)", opacity: disabled?0.55:1, cursor: disabled?"not-allowed":"pointer" }}>
      {Icon && <Icon size={14} strokeWidth={2.5} />}{children}
    </button>
  );
}

/* ════════════════════════════════
   STYLES (reference CSS variables so
   light/dark swap without re-render)
════════════════════════════════ */
const D = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  /* ── sidebar ── */
  sidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    position: "sticky",
    top: 0,
    background: "var(--card)",
    borderRight: "1px solid var(--border)",
    padding: "18px 12px",
    transition: "width 0.2s ease",
    overflow: "hidden",
    zIndex: 10,
    boxSizing: "border-box",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    padding: "0 2px",
    minHeight: 40,
  },
  logoMark: {
    width: 36,
    height: 36,
    minWidth: 36,
    background: "var(--primary)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoName: { fontSize: 13.5, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  logoSub:  { fontSize: 10.5, color: "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 600 },
  collapseToggle: {
    marginLeft: "auto",
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    flexShrink: 0,
  },
  mobileToggleBtn: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px",
    marginBottom: 12,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    cursor: "pointer",
    transition: "background 0.15s ease",
    fontFamily: "inherit",
  },
  profileAvatar: {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: "50%",
    background: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    color: "#fff",
    flexShrink: 0,
  },
  profileName: { fontSize: 20, fontWeight: 900, color: "var(--text)", alignItems: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  profileRoleBadge: {
    display: "inline-block",
    marginTop: 2,
    fontSize: 10,
    fontWeight: 700,
    alignItems: "center",
    justifyContent: "center",
    textTransform: "capitalize",
    color: "var(--primary)",
    background: "var(--primary-tint)",
    borderRadius: 20,
    padding: "1px 7px",
  },

  divider: { height: 1, background: "var(--border)", margin: "10px 0" },

  groupLabel: {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    padding: "4px 10px",
    marginBottom: 2,
  },
  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 9,
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    width: "100%",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  navIcon:  { display: "flex", flexShrink: 0, width: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  navIconDot: {
    position: "absolute", top: -1, right: 0, width: 7, height: 7, borderRadius: "50%",
    background: "var(--destructive)", border: "1.5px solid var(--card)",
  },
  navLabel: {
    display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1,
    overflow: "hidden", textOverflow: "ellipsis",
  },
  navBadge: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18,
    padding: "0 5px", borderRadius: 999, background: "var(--destructive)", color: "#fff",
    fontSize: 10.5, fontWeight: 800, flexShrink: 0, marginLeft: 8,
  },

  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--destructive)",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    minHeight: 42,
    padding: "0 12px",
  },

  /* ── main ── */
  main: {
    flex: 1,
    padding: "24px 32px 56px",
    overflowY: "auto",
    minWidth: 0,
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
    flexWrap: "wrap",
    gap: 14,
  },
  pageTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  pageSub: { margin: "4px 0 0", fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 },

  livePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--success-tint)",
    borderRadius: 20,
    padding: "5px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--success)",
  },
  liveDot: {
    width: 6,
    height: 6,
    background: "var(--success)",
    borderRadius: "50%",
    display: "inline-block",
  },
  clock: { fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  themeToggle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 34,
    height: 34,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--text)",
    marginBottom: 18,
  },
  retryBtn: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  /* ── stat cards ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 14,
    marginBottom: 26,
  },
  statCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow 0.15s ease",
  },
  statIconWrap: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 3 },
  statValue: { fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },

  /* ── panels ── */
  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    marginBottom: 20,
    boxShadow: "var(--shadow-sm)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },
  panelDesc: { margin: "3px 0 0", fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 },
  panelBadge: {
    background: "var(--primary-tint)",
    color: "var(--primary)",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },

  toolRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-end",
  },
  fieldLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)" },
  select: {
    padding: "9px 12px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    outline: "none",
    minHeight: 38,
  },
  textInput: {
    flex: 1,
    padding: "9px 12px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    minHeight: 38,
    boxSizing: "border-box",
  },
  btnBase: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 12.5,
    whiteSpace: "nowrap",
    fontFamily: "Inter, sans-serif",
    minHeight: 38,
    boxSizing: "border-box",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "var(--radius-sm)",
    minHeight: 38,
    minWidth: 38,
    cursor: "pointer",
  },
  fileLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap",
    position: "relative",
    minHeight: 38,
    boxSizing: "border-box",
  },
  fileName: { fontSize: 12, color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", alignSelf: "center", fontWeight: 600 },

  selectionBar: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    padding: "10px 14px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
  selectionInfo: { fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 700, marginRight: 4 },

  confirmBar: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: "10px 14px",
    background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)",
    borderRadius: "var(--radius-sm)",
  },

  /* ── table ── */
  tableWrap: { overflowX: "auto", maxHeight: 320, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "9px 14px", background: "var(--bg)", color: "var(--text-secondary)", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0 },
  td: { padding: "10px 14px", color: "var(--text)", borderBottom: "1px solid var(--border)", verticalAlign: "middle", background: "var(--card)" },
  cellInput: {
    background: "var(--bg)",
    border: "1px solid var(--primary)",
    borderRadius: 6,
    color: "var(--text)",
    padding: "5px 8px",
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  selectBtn: {
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    borderRadius: 6,
    padding: "3px 8px",
    cursor: "pointer",
    fontSize: 13,
  },
  yearPill: {
    background: "var(--primary-tint)",
    color: "var(--primary)",
    borderRadius: 20,
    padding: "2px 9px",
    fontSize: 11,
    fontWeight: 700,
  },
  emptyState: { padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600, display:"flex", flexDirection:"column", alignItems:"center" },

  /* ── two col ── */
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  /* ── health ── */
  healthFooter: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "var(--text-secondary)",
    fontWeight: 700,
  },
  healthDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },

  /* ── toast ── */
  toast: {
    position: "fixed",
    top: 18,
    right: 20,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 16px",
    boxShadow: "var(--shadow)",
    maxWidth: 340,
    animation: "fadeUp 0.2s ease both",
  },
};