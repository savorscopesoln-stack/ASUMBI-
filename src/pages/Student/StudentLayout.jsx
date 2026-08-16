import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* =====================================================
     ROUTE MATCHING UTILITY
  ===================================================== */
  const isActive = (path) => {
    if (path === "/student") return location.pathname === "/student";
    return location.pathname.startsWith(path);
  };

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

  /* =====================================================
     CATEGORIZED ARCHITECTURE
  ===================================================== */
  const navigationGroups = [
    {
      groupTitle: "Core Portal",
      items: [
        { 
          label: "Dashboard", 
          path: "/student", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg> 
        },
        { 
          label: "Profile", 
          path: "/student/profile", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> 
        },
        { 
          label: "Notifications", 
          path: "/student/notifications", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> 
        },
      ]
    },
    {
      groupTitle: "Academics",
      items: [
        { 
          label: "Marks & Grades", 
          path: "/student/marks", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg> 
        },
        { 
          label: "Report Card", 
          path: "/student/report", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> 
        },
        { 
          label: "E-Assessments", 
          path: "/student/e-assessments", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /><path d="M16.5 9.4 11.5 14l-2.3-2.3" /></svg> 
        },
        { 
          label: "Results Summary", 
          path: "/student/results", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> 
        },
        { 
          label: "Class Timetable", 
          path: "/student/timetable", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="11" y2="10" /><line x1="3" y1="14" x2="21" y2="14" /><line x1="3" y1="18" x2="21" y2="18" /><line x1="11" y1="6" x2="11" y2="22" /></svg> 
        },
      ]
    },
    {
      groupTitle: "Management",
      items: [
        { 
          label: "Attendance", 
          path: "/student/attendance-report", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> 
        },
        { 
          label: "Fees & Finance", 
          path: "/student/fees", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> 
        },
        { 
          label: "Meals & Dining", 
          path: "/student/meals", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 2.42 1.72 4.44 4 4.9V22h2v-8.1c2.28-.46 4-2.48 4-4.9V2h-2v7H9V2H7v7H5V2H3zm15 6V2h-2v6c0 1.66 1.34 3 3 3h1v11h2V11h1c1.66 0 3-1.34 3-3V2h-2v6c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1z"/></svg> 
        },
        { 
          label: "Leave Requests", 
          path: "/student/leave", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> 
        },
        { 
          label: "Settings", 
          path: "/student/settings", 
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> 
        },
      ]
    }
  ];

  return (
    <div style={styles.container}>
      <style>{customEngineStyles}</style>

      {/* =================================================
          MOBILE TOPBAR — hamburger trigger, hidden on desktop
      ================================================= */}
      <header className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="student-sidebar"
        >
          <span className={`hamburger-lines${mobileOpen ? " open" : ""}`}>
            <span /><span /><span />
          </span>
        </button>
        <span className="mobile-topbar-title">Student Portal</span>
        <span style={{ width: 34 }} />
      </header>

      {/* backdrop for the off-canvas drawer */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* =================================================
          PREMIUM SIDEBAR
      ================================================= */}
      <aside id="student-sidebar" style={styles.sidebar} className={`app-sidebar${mobileOpen ? " mobile-open" : ""}`}>
        {/* BRAND IDENTITY */}
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <svg className="brand-cap" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <div>
            <h2 style={styles.portalTitle}>Student Portal</h2>
            <p style={styles.portalSub}>Smart Campus</p>
          </div>
          <button className="drawer-close-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* COMPACT ACCOUNT PREVIEW */}
        <div style={styles.userBadge}>
          <div style={styles.avatarMini}>ST</div>
          <div style={{ overflow: "hidden" }}>
            <div style={styles.userName}>Active Student</div>
            <div style={styles.userRole}>ID: #2026-09431</div>
          </div>
        </div>

        {/* SCROLLABLE CATEGORIZED NAVIGATION */}
        <div className="custom-sidebar-menu" style={styles.menuContainer}>
          {navigationGroups.map((group) => (
            <div key={group.groupTitle} style={styles.groupBlock}>
              <span style={styles.groupHeading}>{group.groupTitle}</span>
              
              {group.items.map((item) => {
                const active = isActive(item.path);
                const isHovered = hoveredItem === item.path;

                let btnStyle = { ...styles.navBtn };
                let iconWrapperStyle = { ...styles.iconContainer };

                if (active) {
                  btnStyle = { ...btnStyle, ...styles.activeNavBtn };
                  iconWrapperStyle = { ...iconWrapperStyle, ...styles.activeIcon };
                } else if (isHovered) {
                  btnStyle = { ...btnStyle, ...styles.hoverNavBtn };
                  iconWrapperStyle = { ...iconWrapperStyle, ...styles.hoverIcon };
                }

                return (
                  <button
                    key={item.path}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => go(item.path)}
                    style={btnStyle}
                    className={`nav-item-btn${active ? " nav-btn-active" : ""}`}
                  >
                    <span style={iconWrapperStyle}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* FOOTER ACTION */}
        <div style={styles.logoutWrap}>
          <button
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            onClick={logout}
            className="nav-item-btn"
            style={{
              ...styles.logoutBtn,
              ...(isLogoutHovered ? styles.logoutBtnHover : {}),
            }}
          >
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            System Logout
          </button>
        </div>
      </aside>

      {/* =================================================
          WORKSPACE VIEWPORT
      ================================================= */}
      <main style={styles.contentViewport} className="content-viewport">
        <div key={location.pathname} style={styles.viewAnimator}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   UX DESIGN DESIGN SYSTEM (CRIMSON, GOLD, SLATE)
========================================================= */
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#020617",
    overflow: "hidden",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    textRendering: "optimizeLegibility",
    WebkitFontSmoothing: "antialiased",
  },

  /* --- SIDEBAR BASE --- */
  sidebar: {
    width: 290,
    background: "linear-gradient(180deg, #1e0000 0%, #0a0000 100%)",
    padding: "28px 20px 20px 20px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(255, 255, 255, 0.04)",
    boxShadow: "15px 0 40px rgba(0, 0, 0, 0.7)",
    zIndex: 10,
  },

  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingLeft: 4,
    marginBottom: 20,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "linear-gradient(135deg, #e11d48 0%, #9f1239 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(225, 29, 72, 0.25)",
    flexShrink: 0,
  },

  portalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#f8fafc",
  },

  portalSub: {
    margin: "1px 0 0",
    color: "#fda4af",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.7,
  },

  /* --- USER ACCOUNT ANCHOR --- */
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    marginBottom: 24,
  },

  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "#334155",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.1)",
  },

  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#f1f5f9",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  userRole: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },

  /* --- NAVIGATION GROUPS --- */
  menuContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    flex: 1,
    overflowY: "auto",
    paddingRight: 6,
  },

  groupBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  groupHeading: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: "0.05em",
    paddingLeft: 12,
    marginBottom: 6,
  },

  /* --- COMPONENT BUTTON STATES --- */
  navBtn: {
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: 9,
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13.5,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative",
    transition: "all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
  },

  iconContainer: {
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    transition: "color 0.2s ease",
  },

  hoverNavBtn: {
    background: "rgba(255, 255, 255, 0.03)",
    color: "#f1f5f9",
  },

  hoverIcon: {
    color: "#cbd5e1",
  },

  activeNavBtn: {
    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.03) 100%)",
    color: "#fbbf24",
    fontWeight: 600,
    boxShadow: "inset 0 0 12px rgba(245, 158, 11, 0.05)",
  },

  activeIcon: {
    color: "#fbbf24",
  },

  /* --- TERMINATION BUTTON --- */
  logoutWrap: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
  },

  logoutBtn: {
    width: "100%",
    padding: "11px 16px",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    borderRadius: 9,
    background: "rgba(244, 63, 94, 0.02)",
    color: "#f43f5e",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    transition: "all 0.2s ease",
  },

  logoutBtnHover: {
    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
    color: "#fff",
    borderColor: "transparent",
    boxShadow: "0 4px 20px rgba(225, 29, 72, 0.2)",
  },

  /* --- APP VIEWPORT CONTAINER --- */
  contentViewport: {
    flex: 1,
    padding: "40px",
    background: "radial-gradient(circle at 50% 0%, #0f172a 0%, #020617 100%)",
    color: "#f8fafc",
    overflowY: "auto",
  },

  viewAnimator: {
    animation: "premiumStageView 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
  },
};

/* High-fidelity CSS systems injected into DOM rendering context */
const customEngineStyles = `
  .custom-sidebar-menu::-webkit-scrollbar {
    width: 4px;
  }
  .custom-sidebar-menu::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-sidebar-menu::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.06);
    border-radius: 20px;
  }
  .custom-sidebar-menu::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  .brand-cap {
    width: 22px;
    height: 22px;
    color: #ffffff;
  }

  .nav-item-btn:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
  }

  .nav-btn-active::before {
    content: "";
    position: absolute;
    left: -20px;
    top: 20%;
    height: 60%;
    width: 3px;
    background: #f59e0b;
    border-radius: 0 4px 4px 0;
    box-shadow: 2px 0 10px #f59e0b;
  }

  @keyframes premiumStageView {
    0% {
      opacity: 0;
      transform: scale(0.99) translateY(6px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* =====================================================
     MOBILE TOPBAR + HAMBURGER — hidden by default, shown
     only under the drawer breakpoint
  ===================================================== */
  .mobile-topbar {
    display: none;
  }
  .drawer-close-btn {
    display: none;
  }
  .mobile-overlay {
    display: none;
  }

  @media (max-width: 880px) {
    .mobile-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      background: #0a0000;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      position: sticky;
      top: 0;
      z-index: 30;
    }
    .mobile-topbar-title {
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .hamburger-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .hamburger-btn:focus-visible {
      outline: 2px solid #fbbf24;
      outline-offset: 2px;
    }
    .hamburger-lines {
      width: 16px;
      height: 12px;
      position: relative;
      display: block;
    }
    .hamburger-lines span {
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      background: #f1f5f9;
      border-radius: 2px;
      transition: transform .25s ease, opacity .2s ease, top .25s ease;
    }
    .hamburger-lines span:nth-child(1) { top: 0; }
    .hamburger-lines span:nth-child(2) { top: 5px; }
    .hamburger-lines span:nth-child(3) { top: 10px; }
    .hamburger-lines.open span:nth-child(1) { top: 5px; transform: rotate(45deg); }
    .hamburger-lines.open span:nth-child(2) { opacity: 0; }
    .hamburger-lines.open span:nth-child(3) { top: 5px; transform: rotate(-45deg); }

    .app-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: min(82vw, 300px) !important;
      transform: translateX(-100%);
      transition: transform .3s cubic-bezier(0.25, 0.8, 0.25, 1);
      z-index: 50;
      box-shadow: 25px 0 60px rgba(0,0,0,0.6);
    }
    .app-sidebar.mobile-open {
      transform: translateX(0);
    }
    .drawer-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      margin-left: auto;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: #94a3b8;
      cursor: pointer;
      flex-shrink: 0;
    }
    .drawer-close-btn svg {
      width: 15px;
      height: 15px;
    }
    .mobile-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.6);
      backdrop-filter: blur(2px);
      z-index: 40;
      animation: mkpOverlayFade .2s ease;
    }
    .content-viewport {
      padding: 22px 16px !important;
    }
  }

  @keyframes mkpOverlayFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .app-sidebar, .hamburger-lines span, .mobile-overlay, [style*="premiumStageView"] {
      transition: none !important;
      animation: none !important;
    }
  }
`;