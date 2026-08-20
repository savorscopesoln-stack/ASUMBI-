import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

/* =========================================================
   ICON SET — replaces the previous emoji glyphs with a
   consistent stroke-based SVG set
========================================================= */
function Icon({ children, size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const IconDashboard = (p) => (
  <Icon {...p}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></Icon>
);
const IconPencil = (p) => (
  <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
);
const IconCalendar = (p) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>
);
const IconFileText = (p) => (
  <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Icon>
);
const IconBarChart = (p) => (
  <Icon {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>
);
const IconGradCap = (p) => (
  <Icon {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></Icon>
);
const IconUser = (p) => (
  <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>
);
const IconClipboardCheck = (p) => (
  <Icon {...p}><rect x="6" y="3" width="12" height="4" rx="1" /><path d="M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1" /><path d="M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1" /><path d="M9 14l2 2 4-4" /></Icon>
);
const IconMonitor = (p) => (
  <Icon {...p}><rect x="2" y="4" width="20" height="13" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></Icon>
);
const IconWrench = (p) => (
  <Icon {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2Z" /></Icon>
);
const IconLogout = (p) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>
);
const IconClose = (p) => (
  <Icon {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
);

export default function TeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    localStorage.clear();
    setMobileOpen(false);
    navigate("/login");
  };

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  /* =====================================================
     MOBILE DRAWER BEHAVIOR — close on route change, lock
     background scroll while open, close on Escape
  ===================================================== */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const menu = [
    { name: "Dashboard", path: "/teacher/dashboard", icon: <IconDashboard /> },
    { name: "Marks Entry", path: "/teacher/marks", icon: <IconPencil /> },
    { name: "Class register", path: "/teacher/attendance", icon: <IconCalendar /> },
    { name: "Attendance Report", path: "/teacher/attendance-report", icon: <IconFileText /> },
    { name: "Reports", path: "/teacher/reports", icon: <IconBarChart /> },
    { name: "Students", path: "/teacher/students", icon: <IconGradCap /> },
    { name: "Profile", path: "/teacher/profile", icon: <IconUser /> },
    { name: "Assessments", path: "/teacher/assessments", icon: <IconClipboardCheck /> },
    { name: "E-Assessments", path: "/teacher/e-assessments", icon: <IconMonitor /> },
    { name: "Practicum", path: "/teacher/practicum", icon: <IconWrench /> },
  ];

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  const current =
    menu.find((m) => isActive(m.path))?.name || "Dashboard";

  return (
    <div style={styles.container}>
      <style>{customStyles}</style>

      {/* MOBILE TOPBAR — hidden on desktop */}
      <header className="tl-mobile-topbar">
        <button
          className="tl-hamburger-btn"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="teacher-sidebar"
        >
          <span className={`tl-hamburger-lines${mobileOpen ? " open" : ""}`}>
            <span /><span /><span />
          </span>
        </button>
        <span className="tl-mobile-title">{current}</span>
        <span style={{ width: 34 }} />
      </header>

      {mobileOpen && (
        <div className="tl-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside id="teacher-sidebar" style={styles.sidebar} className={`tl-sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div style={styles.logo}>
          <span style={{ display: "flex" }}><IconGradCap size={20} /></span> Teacher Portal
          <button className="tl-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <IconClose size={15} />
          </button>
        </div>

        <div style={styles.menu}>
          {menu.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className="tl-nav-btn"
                style={{
                  ...styles.item,
                  ...(active ? styles.active : {}),
                }}
              >
                <span style={styles.icon}>{item.icon}</span>
                {item.name}
                {active && <span style={styles.glow} />}
              </button>
            );
          })}
          <button className="tl-nav-btn" style={styles.logout} onClick={logout}>
            <IconLogout size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main style={styles.main}>
        <div style={styles.topbar} className="tl-desktop-topbar">
          <h2 style={styles.title}>{current}</h2>
          <div style={styles.badge}>Teacher Mode</div>
        </div>

        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #1a0000, #0b0000 60%, #000)",
    color: "#fff",
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },

  /* ================= SIDEBAR ================= */
  sidebar: {
    width: 260,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,

    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",

    borderRight: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 0 30px rgba(0,0,0,0.4)",
  },

  logo: {
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflowY: "auto",
  },

  item: {
    position: "relative",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    color: "#ccc",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 10,

    transition: "all 0.25s ease",
    overflow: "hidden",
  },

  active: {
    background: "linear-gradient(135deg,#7f1d1d,#b91c1c)",
    color: "#fff",
    transform: "scale(1.03)",
    boxShadow: "0 10px 25px rgba(127,29,29,0.4)",
  },

  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  glow: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    background: "rgba(255,255,255,0.15)",
    filter: "blur(20px)",
    borderRadius: "50%",
    animation: "tlPulse 2s infinite",
  },

  logout: {
    marginTop: "auto",
    padding: 12,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg,#7f1d1d,#991b1b)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    transition: "0.2s",
  },

  /* ================= MAIN ================= */
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  topbar: {
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
  },

  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 0.3,
  },

  badge: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 20,
    background: "rgba(127,29,29,0.3)",
    border: "1px solid rgba(127,29,29,0.5)",
  },

  content: {
    padding: 20,
  },
};

/* High-fidelity CSS systems injected into DOM rendering context */
const customStyles = `
  @keyframes tlPulse {
    0% { transform: scale(1); opacity: .6; }
    50% { transform: scale(1.3); opacity: .2; }
    100% { transform: scale(1); opacity: .6; }
  }

  .tl-nav-btn:hover {
    background: rgba(255,255,255,0.07) !important;
    color: #fff !important;
  }
  .tl-nav-btn:focus-visible {
    outline: 2px solid #fca5a5;
    outline-offset: 2px;
  }
  .tl-logout-btn:hover {
    filter: brightness(1.1);
  }

  /* =====================================================
     MOBILE TOPBAR + HAMBURGER — hidden by default, shown
     only under the drawer breakpoint
  ===================================================== */
  .tl-mobile-topbar { display: none; }
  .tl-drawer-close { display: none; }
  .tl-overlay { display: none; }

  @media (max-width: 880px) {
    .tl-mobile-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 30;
    }
    .tl-mobile-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .tl-hamburger-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .tl-hamburger-btn:focus-visible {
      outline: 2px solid #fca5a5;
      outline-offset: 2px;
    }
    .tl-hamburger-lines {
      width: 16px;
      height: 12px;
      position: relative;
      display: block;
    }
    .tl-hamburger-lines span {
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      background: #fff;
      border-radius: 2px;
      transition: transform .25s ease, opacity .2s ease, top .25s ease;
    }
    .tl-hamburger-lines span:nth-child(1) { top: 0; }
    .tl-hamburger-lines span:nth-child(2) { top: 5px; }
    .tl-hamburger-lines span:nth-child(3) { top: 10px; }
    .tl-hamburger-lines.open span:nth-child(1) { top: 5px; transform: rotate(45deg); }
    .tl-hamburger-lines.open span:nth-child(2) { opacity: 0; }
    .tl-hamburger-lines.open span:nth-child(3) { top: 5px; transform: rotate(-45deg); }

    .tl-desktop-topbar { display: none; }

    .tl-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: min(82vw, 280px) !important;
      transform: translateX(-100%);
      transition: transform .3s cubic-bezier(0.25, 0.8, 0.25, 1);
      z-index: 50;
      box-shadow: 25px 0 60px rgba(0,0,0,0.6);
    }
    .tl-sidebar.mobile-open {
      transform: translateX(0);
    }
    .tl-drawer-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-left: auto;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #ccc;
      cursor: pointer;
      flex-shrink: 0;
    }
    .tl-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(2px);
      z-index: 40;
      animation: tlOverlayFade .2s ease;
    }
    .content { padding: 16px !important; }
  }

  @keyframes tlOverlayFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .tl-sidebar, .tl-hamburger-lines span, .tl-overlay {
      transition: none !important;
      animation: none !important;
    }
  }
`;