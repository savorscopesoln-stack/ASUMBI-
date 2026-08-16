import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

/* ─────────────────────────────────────────────
   Design tokens — strict black & white system,
   light and dark, via CSS custom properties so
   toggling repaints instantly with no re-render.
───────────────────────────────────────────── */
const C = {
  bg:         "var(--bg)",
  surface:    "var(--surface)",
  card:       "var(--card)",
  cardHover:  "var(--card-hover)",
  elevated:   "var(--elevated)",
  border:     "var(--border)",
  borderHi:   "var(--border-hi)",
  white:      "var(--invert)",
  invertText: "var(--invert-text)",
  textPri:    "var(--text-pri)",
  textSec:    "var(--text-sec)",
  textMuted:  "var(--text-muted)",
};

const FONT_UI   = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SF Mono', ui-monospace, monospace";
const THEME_KEY = "tv_theme_preference";

/* ─────────────────────────────────────────────
   Icon set — thin, single-stroke, one family.
───────────────────────────────────────────── */
const Icon = ({ children, size = 16, style }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

const IconSearch     = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>;
const IconX           = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>;
const IconRefresh     = (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5" /></Icon>;
const IconArrowLeft   = (p) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Icon>;
const IconFilter      = (p) => <Icon {...p}><path d="M4 5h16M7 12h10M10.5 19h3" /></Icon>;
const IconSun         = (p) => <Icon {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.6M12 18.9v2.6M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8" /></Icon>;
const IconMoon        = (p) => <Icon {...p}><path d="M20.2 14.7A8.5 8.5 0 1 1 9.3 3.8a7 7 0 0 0 10.9 10.9z" /></Icon>;
const IconLayers      = (p) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5M3 17.5l9 5 9-5" /></Icon>;
const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></Icon>;
const IconClock       = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
const IconAlert       = (p) => <Icon {...p}><path d="M12 3.5L2.5 20h19L12 3.5z" /><path d="M12 10v4.2" /><circle cx="12" cy="17.3" r="0.6" fill="currentColor" stroke="none" /></Icon>;
const IconInbox       = (p) => <Icon {...p}><path d="M4 12h4l2 3h4l2-3h4" /><path d="M5 12L4 5.5a1 1 0 0 1 1-1.1h14a1 1 0 0 1 1 1.1L19 12v6.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V12z" /></Icon>;
const IconUsers       = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" /><path d="M16 8.3a3.2 3.2 0 1 1 0 6.1M21.5 19c0-2.6-1.9-4.6-4.5-5.3" /></Icon>;
const IconCheckSquare = (p) => <Icon {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 12.2l2.3 2.3 4.7-4.9" /></Icon>;
const IconClockDash   = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12h7" /></Icon>;
const IconBook        = (p) => <Icon {...p}><path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H20v15.5H6.2A2.2 2.2 0 0 0 4 20.7z" /><path d="M4 5.2v15.5" /></Icon>;
const IconFileText    = (p) => <Icon {...p}><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" /><path d="M14 3.5V8h4M9 13h6M9 16.5h6" /></Icon>;
const IconUpload      = (p) => <Icon {...p}><path d="M12 15.5V4.5m0 0l-4 4m4-4l4 4" /><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></Icon>;
const IconEdit         = (p) => <Icon {...p}><path d="M4 20l.9-3.6L15.6 5.7a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1L7.6 19.1z" /><path d="M14 7.5l2.5 2.5" /></Icon>;

export default function TeacherEAssessments() {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ── Theme ── */
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch { /* ignore */ }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  });
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  /* ── Fetch ── */
  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/e-assessments");
      const data = res?.data?.data || res?.data || [];
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load assessments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssessments(); }, []);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        String(a.title || "").toLowerCase().includes(q) ||
        String(a.subject || "").toLowerCase().includes(q) ||
        String(a.teacher_name || "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" ||
        String(a.status || "pending").toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [assessments, search, statusFilter]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const s = (a, v) => String(a.status || "").toLowerCase() === v;
    return {
      total: assessments.length,
      approved: assessments.filter((a) => s(a, "approved")).length,
      pending: assessments.filter((a) => s(a, "pending")).length,
      rejected: assessments.filter((a) => s(a, "rejected")).length,
    };
  }, [assessments]);

  /* ── Loading ── */
  if (loading) return (
    <div style={S.splash} data-theme={theme}>
      <GlobalStyle />
      <div style={S.spinRing} />
      <p style={S.splashText}>Loading assessments…</p>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={S.splash} data-theme={theme}>
      <GlobalStyle />
      <IconAlert size={30} style={{ color: C.textMuted }} />
      <p style={S.splashText}>{error}</p>
      <button className="tv-btn tv-btn-ghost" onClick={fetchAssessments}>Try again</button>
    </div>
  );

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div style={S.page} data-theme={theme}>
      <GlobalStyle />

      {/* ── PAGE HEADER ── */}
      <header style={S.pageHeader}>
        <div style={S.pageHeaderLeft}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="tv-btn tv-btn-ghost tv-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => navigate(-1)}>
              <IconArrowLeft size={14} /> Back
            </button>
            <div>
              <h1 style={S.pageTitle}>E-Assessments</h1>
              <p style={S.pageSubtitle}>Manage assessments, questions & submissions</p>
            </div>
          </div>
        </div>

        <div style={S.controls}>
          <div style={S.searchWrap}>
            <IconSearch size={15} style={{ position: "absolute", left: 12, color: C.textMuted }} />
            <input
              type="text"
              placeholder="Search by title, subject or teacher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={S.searchInput}
              className="tv-input"
            />
            {search && (
              <button style={S.clearIconBtn} onClick={() => setSearch("")} aria-label="Clear search">
                <IconX size={13} />
              </button>
            )}
          </div>

          <div style={S.selectWrap}>
            <IconFilter size={13} style={{ position: "absolute", left: 12, color: C.textMuted, pointerEvents: "none" }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={S.select}
              className="tv-input"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button className="tv-btn tv-btn-icon" onClick={fetchAssessments} title="Refresh" aria-label="Refresh">
            <IconRefresh size={15} />
          </button>

          <button
            className="tv-btn tv-btn-icon"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div style={S.statsRow}>
        <StatCard label="Total"    value={stats.total}    icon={<IconLayers size={17} />} />
        <StatCard label="Approved" value={stats.approved} icon={<IconCheckCircle size={17} />} />
        <StatCard label="Pending"  value={stats.pending}  icon={<IconClock size={17} />} />
        <StatCard label="Rejected" value={stats.rejected} icon={<IconX size={17} />} />
      </div>

      {/* ── RESULTS META ── */}
      <div style={S.resultsMeta}>
        <span style={S.resultsCount}>
          {filtered.length} assessment{filtered.length !== 1 ? "s" : ""}
          {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
          {search ? ` · "${search}"` : ""}
        </span>
        {(search || statusFilter !== "all") && (
          <button
            className="tv-btn tv-btn-ghost tv-btn-sm"
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── EMPTY ── */}
      {filtered.length === 0 ? (
        <div style={S.empty}>
          <IconInbox size={30} style={{ color: C.textMuted, marginBottom: 4 }} />
          <h3 style={S.emptyTitle}>No assessments found</h3>
          <p style={S.emptyText}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map((a) => (
            <AssessmentCard key={a.id} a={a} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ASSESSMENT CARD
========================================================= */
function AssessmentCard({ a, navigate }) {
  const status = String(a.status || "pending").toLowerCase();
  const statusIcon = {
    approved: IconCheckCircle,
    pending:  IconClock,
    rejected: IconX,
  }[status] || IconClock;
  const StatusIcon = statusIcon;
  const statusFilled = status === "approved";
  const isActive = a.active_status !== "Inactive";

  // These counts require the backend to include them in the /e-assessments
  // response — until then we show "—" instead of a misleading 0.
  const hasStudentData = a.total_students != null;
  const hasSubmissionData = a.total_submissions != null;
  const hasPendingData = a.pending_students != null;

  return (
    <div className="tv-card" style={S.card}>
      {/* Card top */}
      <div style={S.cardTop}>
        <div style={S.cardTopLeft}>
          <h3 style={S.cardTitle}>{a.title}</h3>
          <span style={S.cardSubject}><IconBook size={12} style={{ marginRight: 5, position: "relative", top: 2 }} />{a.subject || "—"}</span>
        </div>
        <div style={S.badgeStack}>
          <span style={{
            ...S.statusBadge,
            background: statusFilled ? "var(--invert)" : "transparent",
            color: statusFilled ? "var(--invert-text)" : C.textSec,
            border: `1px solid ${statusFilled ? "var(--invert)" : C.border}`,
          }}>
            <StatusIcon size={11} /> {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span style={{ ...S.activeBadge, color: isActive ? C.textPri : C.textMuted }}>
            <span style={{ fontSize: 8 }}>{isActive ? "●" : "○"}</span> {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div style={S.miniStats}>
        <MiniStat icon={<IconUsers size={15} />} label="Students"     value={hasStudentData ? a.total_students : "—"} />
        <MiniStat icon={<IconCheckSquare size={15} />} label="Submitted"    value={hasSubmissionData ? a.total_submissions : "—"} />
        <MiniStat icon={<IconClockDash size={15} />} label="Not Submitted" value={hasPendingData ? a.pending_students : "—"} />
      </div>

      {/* Info rows */}
      <div style={S.infoBlock}>
        <InfoRow label="Class"    value={a.class_name || a.class_id || "N/A"} />
        <InfoRow label="Duration" value={`${a.duration_minutes || 30} min`} />
        <InfoRow label="Teacher"  value={a.teacher_name || "N/A"} />
      </div>

      <div style={S.actionsRow}>
        <button className="tv-btn tv-btn-ghost" style={S.actionBtn} onClick={() => navigate(`/teacher/e-assessments/${a.id}/questions`)}>
          <IconFileText size={14} /> Questions
        </button>
        <button className="tv-btn tv-btn-ghost" style={S.actionBtn} onClick={() => navigate(`/teacher/e-assessments/${a.id}/submissions`)}>
          <IconUpload size={14} /> Submissions
        </button>
      </div>

      <button
        className="tv-btn tv-btn-solid"
        style={{ ...S.actionBtn, width: "100%", padding: "12px 8px" }}
        onClick={() => navigate(`/teacher/e-assessments/${a.id}/all-questions-marking`)}
      >
        <IconEdit size={14} /> Mark submissions
      </button>
    </div>
  );
}

/* =========================================================
   SUB-COMPONENTS
========================================================= */
function StatCard({ label, value, icon }) {
  return (
    <div className="tv-stat" style={S.statCard}>
      <div style={S.statIconWrap}>{icon}</div>
      <div>
        <p style={S.statLabel}>{label}</p>
        <p style={S.statValue}>{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div style={S.miniStat}>
      <div style={S.miniStatIcon}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={S.miniStatLabel}>{label}</p>
        <p style={S.miniStatValue}>{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={S.infoRow}>
      <span style={S.infoLabel}>{label}</span>
      <span style={S.infoValue}>{value}</span>
    </div>
  );
}

/* ── Global stylesheet: theme variables + interaction
      states, kept out of React state entirely. ── */
function GlobalStyle() {
  return (
    <style>{`
      [data-theme='dark'] {
        --bg:#000000; --surface:#0a0a0a; --card:#0d0d0d; --card-hover:#161616; --elevated:#161616;
        --border:#1c1c1c; --border-hi:#2e2e2e;
        --text-pri:#f5f5f5; --text-sec:#8a8a8a; --text-muted:#4a4a4a;
        --invert:#ffffff; --invert-text:#000000;
        --selection: rgba(255,255,255,0.2);
        --shadow-card: 0 16px 40px rgba(0,0,0,0.35);
      }
      [data-theme='light'] {
        --bg:#fafafa; --surface:#f1f1f1; --card:#ffffff; --card-hover:#f2f2f2; --elevated:#ffffff;
        --border:#e6e6e6; --border-hi:#d1d1d1;
        --text-pri:#111111; --text-sec:#6b6b6b; --text-muted:#a8a8a8;
        --invert:#000000; --invert-text:#ffffff;
        --selection: rgba(0,0,0,0.12);
        --shadow-card: 0 10px 28px rgba(0,0,0,0.06);
      }

      @keyframes tv-spin { to { transform: rotate(360deg); } }
      * { box-sizing: border-box; }
      ::selection { background: var(--selection); }

      .tv-card { transition: border-color 0.15s ease, transform 0.12s ease; }
      .tv-card:hover { border-color: var(--border-hi); }

      .tv-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        border: 1px solid var(--border); background: transparent; color: var(--text-pri);
        padding: 9px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
        font-family: ${FONT_UI}; cursor: pointer; white-space: nowrap;
        transition: background-color 0.12s ease, border-color 0.12s ease, opacity 0.12s ease, transform 0.08s ease;
      }
      .tv-btn:hover { background: var(--card-hover); border-color: var(--border-hi); }
      .tv-btn:active { transform: scale(0.97); }
      .tv-btn-sm { padding: 6px 11px; font-size: 12.5px; border-radius: 7px; }
      .tv-btn-icon { padding: 8px; width: 36px; height: 36px; }
      .tv-btn-ghost { border-color: var(--border); }
      .tv-btn-solid { background: var(--invert); color: var(--invert-text); border-color: var(--invert); font-weight: 600; }
      .tv-btn-solid:hover { filter: brightness(0.88); }

      .tv-input {
        background: var(--surface); border: 1px solid var(--border); color: var(--text-pri);
        font-family: ${FONT_UI}; outline: none; transition: border-color 0.12s ease;
      }
      .tv-input:focus { border-color: var(--border-hi); }
      .tv-input::placeholder { color: var(--text-muted); }
      select.tv-input { appearance: none; -webkit-appearance: none; cursor: pointer; }

      .tv-stat { transition: border-color 0.15s ease, background-color 0.15s ease; }
      .tv-stat:hover { border-color: var(--border-hi); background: var(--card-hover); }
    `}</style>
  );
}

/* =========================================================
   STYLES
========================================================= */
const S = {
  page: {
    minHeight: "100vh",
    padding: "32px 36px 80px",
    background: C.bg,
    color: C.textPri,
    fontFamily: FONT_UI,
    maxWidth: 1320,
    margin: "0 auto",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },

  splash: {
    minHeight: "100vh",
    background: C.bg,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: "0 24px",
    textAlign: "center",
    fontFamily: FONT_UI,
  },
  spinRing: {
    width: 30,
    height: 30,
    border: `2px solid ${C.border}`,
    borderTopColor: C.textPri,
    borderRadius: "50%",
    animation: "tv-spin 0.7s linear infinite",
  },
  splashText: { color: C.textSec, fontSize: 14, margin: 0 },

  /* Page header */
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 30,
  },
  pageHeaderLeft: { display: "flex", alignItems: "center", gap: 18 },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em", color: C.textPri },
  pageSubtitle: { margin: "4px 0 0", color: C.textSec, fontSize: 13.5 },

  /* Controls */
  controls: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchInput: {
    padding: "9px 34px 9px 34px",
    borderRadius: 8,
    fontSize: 13.5,
    minWidth: 260,
  },
  clearIconBtn: { position: "absolute", right: 9, background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 3, display: "flex" },
  selectWrap: { position: "relative", display: "flex", alignItems: "center" },
  select: {
    padding: "9px 14px 9px 32px",
    borderRadius: 8,
    fontSize: 13.5,
    cursor: "pointer",
  },

  /* Stats row */
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 10,
    marginBottom: 26,
  },
  statCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 9,
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: C.textPri,
    flexShrink: 0,
  },
  statLabel: { margin: 0, fontSize: 10.5, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },
  statValue: { margin: "5px 0 0", fontSize: 24, fontWeight: 600, lineHeight: 1, color: C.textPri, letterSpacing: "-0.01em" },

  /* Results meta */
  resultsMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  resultsCount: { fontSize: 13, color: C.textMuted, fontWeight: 500 },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
    gap: 16,
  },

  /* Card */
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 22,
    display: "flex",
    flexDirection: "column",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },
  cardTopLeft: { flex: 1, minWidth: 0 },
  cardTitle: { margin: "0 0 6px", fontSize: 16.5, fontWeight: 600, lineHeight: 1.3, color: C.textPri, letterSpacing: "-0.01em" },
  cardSubject: { fontSize: 12.5, color: C.textSec, fontWeight: 500, display: "inline-flex", alignItems: "center" },
  badgeStack: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 },
  statusBadge: {
    padding: "4px 10px 4px 8px",
    borderRadius: 20,
    fontSize: 11.5,
    fontWeight: 500,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  activeBadge: {
    padding: "2px 2px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },

  /* Mini stats */
  miniStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 8,
    marginBottom: 16,
  },
  miniStat: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 11,
    padding: "11px 10px",
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },
  miniStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: C.textPri,
    flexShrink: 0,
  },
  miniStatLabel: { margin: 0, fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  miniStatValue: { margin: "2px 0 0", fontSize: 17, fontWeight: 600, lineHeight: 1, color: C.textPri, fontFamily: FONT_MONO },

  /* Info block */
  infoBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 18,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: C.surface,
    padding: "10px 13px",
    borderRadius: 9,
    border: `1px solid ${C.border}`,
  },
  infoLabel: { fontSize: 12.5, color: C.textMuted, fontWeight: 500 },
  infoValue: { fontSize: 13, fontWeight: 600, color: C.textPri },

  /* Actions */
  actionsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    width: "100%",
    padding: "10px 8px",
  },

  /* Empty */
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "64px 40px",
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    gap: 8,
    textAlign: "center",
  },
  emptyTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: C.textPri },
  emptyText: { margin: 0, fontSize: 13.5, color: C.textMuted },
};