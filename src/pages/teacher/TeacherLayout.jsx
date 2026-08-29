import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { usePortalPageAccess } from "../../hooks/usePortalPageAccess";
import {
  LayoutDashboard, UserRound, Bell, BarChart3, FileText, MonitorCheck,
  PenSquare, CalendarCheck, GraduationCap, ClipboardCheck, Wrench,
  ChevronLeft, ChevronRight, ChevronDown, Menu, LogOut, Sun, Moon,
} from "lucide-react";
import useUnreadNotifications from "../../hooks/useUnreadNotifications";

/* ─── self-contained theme hook — mirrors StudentLayout's so both
   portals read/write the same "theme" key and stay in sync. ─── */
const useTheme = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
};

/* ─── shared design-token stylesheet — identical id/tokens to the
   student and admin dashboards so all three portals render from
   one consistent system and only ever inject once per page load ─── */
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

    .dash-nav-btn { transition: background 0.15s ease, color 0.15s ease; }
    .dash-nav-btn:hover { background: var(--primary-tint); color: var(--primary-dark); }
    .dash-nav-btn.active-nav { background: var(--primary-tint); color: var(--primary); font-weight: 700; }

    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }
    .dash-icon-btn:hover { background: var(--bg); }
    .dash-profile-card:hover { background: var(--bg); }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
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

      .dash-page-header {
        position: sticky;
        top: 0;
        z-index: 45;
        margin: -20px -16px 16px !important;
        padding: 14px 16px !important;
        background: var(--card);
        border-bottom: 1px solid var(--border);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── teacher nav, grouped — same shape as StudentLayout's NAV_GROUPS ─── */
// Exported so the admin Portal Pages control screen can read the
// exact same live nav registry that renders this sidebar — add a
// page here and it automatically becomes controllable there too.
export const NAV_GROUPS = [
  {
    label: "Core Portal",
    items: [
      { name: "Dashboard",     path: "/teacher/dashboard",     Icon: LayoutDashboard },
      { name: "Notifications", path: "/teacher/notifications", Icon: Bell, badgeKey: "notifications" },
      { name: "Profile",       path: "/teacher/profile",       Icon: UserRound },
    ],
  },
  {
    label: "Academics",
    items: [
      { name: "Marks Entry",   path: "/teacher/marks",         Icon: PenSquare },
      { name: "Assessments",   path: "/teacher/assessments",   Icon: ClipboardCheck },
      { name: "E-Assessments", path: "/teacher/e-assessments", Icon: MonitorCheck },
      { name: "Practicum",     path: "/teacher/practicum",     Icon: Wrench },
    ],
  },
  {
    label: "Classes & Reports",
    items: [
      { name: "Class Register",     path: "/teacher/attendance",        Icon: CalendarCheck },
      { name: "Attendance Report",  path: "/teacher/attendance-report", Icon: FileText },
      { name: "Students",           path: "/teacher/students",          Icon: GraduationCap },
      { name: "Reports",            path: "/teacher/reports",           Icon: BarChart3 },
    ],
  },
];

export default function TeacherLayout() {
  injectStyles();

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { count: unreadCount } = useUnreadNotifications();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pages an Admin has switched off for this portal. Hides them from
  // the sidebar below, and bounces the teacher back to the dashboard
  // if they land on a disabled page's URL directly.
  const { loaded: pagesLoaded, isEnabled, isPathDisabled } = usePortalPageAccess("teacher");

  useEffect(() => {
    if (!pagesLoaded) return;
    if (isPathDisabled(location.pathname)) {
      navigate("/teacher/dashboard", { replace: true });
    }
  }, [location.pathname, pagesLoaded, isPathDisabled, navigate]);

  // Before the disabled-pages list has loaded, isEnabled() would say
  // "yes" to everything — showing every nav item for a moment even if
  // an admin turned some off. Show nothing until we actually know.
  const visibleNavGroups = pagesLoaded
    ? NAV_GROUPS
        .map((group) => ({ ...group, items: group.items.filter((item) => isEnabled(item.path)) }))
        .filter((group) => group.items.length > 0)
    : [];

  const isActive = (path) => location.pathname.startsWith(path);

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* close the mobile drawer on route change, same as student layout */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarWidth = sidebarCollapsed ? 68 : 252;

  const currentName =
    NAV_GROUPS.flatMap((g) => g.items).find((m) => isActive(m.path))?.name || "Dashboard";

  return (
    <div style={S.layout}>
      {/* mobile backdrop */}
      <div
        className={`dash-backdrop${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ════════ SIDEBAR ════════ */}
      <aside
        className={`dash-sidebar${mobileOpen ? " mobile-open" : ""}`}
        style={{ ...S.sidebar, width: sidebarWidth }}
        aria-label="Sidebar navigation"
      >
        {/* logo row */}
        <div style={S.logoRow}>
          <div style={S.logoMark}>
            <GraduationCap size={20} color="#fff" strokeWidth={2.25} />
          </div>
          {!sidebarCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={S.logoName}>Teacher Portal</div>
              <div style={S.logoSub}>Smart Campus</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed((p) => !p)}
            className="dash-icon-btn"
            style={S.collapseToggle}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* profile card */}
        <button
          type="button"
          className="dash-profile-card"
          style={S.profileCard}
          onClick={() => go("/teacher/profile")}
          aria-label="Signed in as Teacher. Open profile."
          title={sidebarCollapsed ? "Teacher" : undefined}
        >
          <div style={S.profileAvatar}>TC</div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={S.profileName}>Teacher</div>
              <span style={S.profileRoleBadge}>Staff</span>
            </div>
          )}
          {!sidebarCollapsed && <ChevronDown size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
        </button>

        <div style={S.divider} />

        {/* grouped nav */}
        <nav aria-label="Main navigation" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {visibleNavGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 14 }}>
              {!sidebarCollapsed && <div style={S.groupLabel}>{group.label}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.items.map(({ name, path, Icon, badgeKey }) => {
                  const active = isActive(path);
                  const showBadge = badgeKey === "notifications" && unreadCount > 0;
                  return (
                    <button
                      key={path}
                      className={`dash-nav-btn${active ? " active-nav" : ""}`}
                      onClick={() => go(path)}
                      aria-current={active ? "page" : undefined}
                      title={sidebarCollapsed ? name : undefined}
                      style={S.navBtn}
                    >
                      <span style={S.navIcon}><Icon size={17} strokeWidth={2} /></span>
                      {!sidebarCollapsed && <span style={S.navLabel}>{name}</span>}
                      {showBadge && (
                        <span style={{ ...S.navBadge, marginLeft: sidebarCollapsed ? 0 : "auto", ...(sidebarCollapsed ? S.navBadgeCollapsed : {}) }}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={logout}
            className="dash-btn"
            aria-label="Log out of your account"
            title="Log out"
            style={{ ...S.logoutBtn, justifyContent: sidebarCollapsed ? "center" : "flex-start" }}
          >
            <LogOut size={17} strokeWidth={2.25} />
            {!sidebarCollapsed && <span>Log out</span>}
          </button>
        </nav>
      </aside>

      {/* ════════ MAIN ════════ */}
      <main className="dash-main" style={S.main}>
        <header className="dash-page-header" style={S.pageHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="dash-mobile-toggle dash-icon-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              style={S.mobileToggleBtn}
            >
              <Menu size={20} />
            </button>
            <span style={S.mobileTitle}>{currentName}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="dash-icon-btn"
            style={S.themeToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        <div key={location.pathname} style={S.viewAnimator}>
          {/* Don't mount the routed page until we know whether this
              path is actually enabled — otherwise a disabled page's
              content renders for one frame before the redirect effect
              above kicks it back to /teacher/dashboard. */}
          {pagesLoaded && !isPathDisabled(location.pathname) ? <Outlet /> : null}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════
   STYLES — same token-driven approach as the student/admin
   dashboards, so light/dark and collapse/expand swap without
   re-render
════════════════════════════════ */
const S = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

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
  logoName: { fontSize: 13.5, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoSub: { fontSize: 10.5, color: "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 600 },
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
  profileName: { fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  profileRoleBadge: {
    display: "inline-block",
    marginTop: 2,
    fontSize: 10,
    fontWeight: 700,
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
  navIcon: { display: "flex", flexShrink: 0, width: 20, alignItems: "center", justifyContent: "center" },
  navLabel: { overflow: "hidden", textOverflow: "ellipsis" },
  navBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    background: "var(--destructive)",
    color: "#fff",
    fontSize: 10.5,
    fontWeight: 800,
    flexShrink: 0,
  },
  navBadgeCollapsed: {
    position: "absolute",
    top: 4,
    right: 4,
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

  main: {
    flex: 1,
    padding: "24px 32px 56px",
    overflowY: "auto",
    minWidth: 0,
  },

  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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
  mobileTitle: { fontSize: 15, fontWeight: 800, color: "var(--text)" },
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

  viewAnimator: {
    animation: "fadeUp 0.3s ease both",
  },
};
