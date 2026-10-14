import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  MonitorCheck, Clock, Loader2, Inbox, AlertTriangle, FileText,
  CalendarClock, PlayCircle,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted elsewhere. ─── */
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

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    .assess-card:hover { box-shadow: var(--shadow); border-color: var(--primary) !important; }
    .assess-take-btn:hover { filter: brightness(0.95); }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .live-dot { animation: pulse 1.4s ease-in-out infinite; }

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .upcoming-row { flex-direction: column !important; align-items: flex-start !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── Field helpers ───────────────────────────────────────────
   The public list is read without any login. These helpers read the
   schedule defensively so the page keeps working whichever of these
   names the backend sends. */
const START_KEYS = ["start_time", "starts_at", "scheduled_start", "scheduled_at", "start_at", "available_from", "opens_at", "exam_date"];
const END_KEYS = ["end_time", "ends_at", "scheduled_end", "end_at", "available_until", "closes_at"];

const pickTime = (row, keys) => {
  for (const k of keys) {
    if (row?.[k]) {
      const t = new Date(row[k]).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return null;
};

const fmtCountdown = (ms) => {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  return `${m}m ${pad(sec)}s`;
};

const fmtWhen = (t) =>
  new Date(t).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function TakeAssessmentPicker() {
  injectStyles();

  const navigate = useNavigate();

  const [data, setData] = useState({ active: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // No portal login here: the list comes from the public endpoint. A
  // student only signs in (username + exam password) on the exam page
  // itself, after choosing an assessment.
  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/e-assessments/public/covers");
      const d = res.data || {};
      setData({
        active: Array.isArray(d.active) ? d.active : [],
        upcoming: Array.isArray(d.upcoming) ? d.upcoming : [],
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
    // refresh the list every minute so a newly started paper appears
    const poll = setInterval(fetchAssessments, 60000);
    return () => clearInterval(poll);
  }, []);

  // one-second tick for the live countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Active papers: drop any whose live session has already ended.
  // Upcoming papers: soonest first; one that has just reached its start
  // time simply drops off once the next refresh moves it to Active.
  const { active, upcoming } = useMemo(() => {
    const withTimes = (r) => ({ ...r, _start: pickTime(r, START_KEYS), _end: pickTime(r, END_KEYS) });
    return {
      active: data.active.map(withTimes).filter((r) => r._end === null || r._end > now),
      upcoming: data.upcoming
        .map(withTimes)
        .filter((r) => r._start === null || r._start > now - 60000),
    };
  }, [data, now]);

  const selected =
    active.find((a) => String(a.id) === String(selectedId)) ||
    active.find((a) => a.cover_page_url) ||
    active[0] ||
    null;

  return (
    <main className="dash-main" style={S.main}>
      <header style={S.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MonitorCheck size={20} color="var(--primary)" />
          <div>
            <h1 style={S.pageTitle}>Take an Assessment</h1>
            <p style={S.pageSub}>Choose an active assessment, then sign in with your exam password</p>
          </div>
        </div>
      </header>

      {error && !loading && (
        <div style={S.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchAssessments} style={S.retryBtn}>Retry</button>
        </div>
      )}

      {loading && data.active.length === 0 && data.upcoming.length === 0 ? (
        <div style={S.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading assessments…
        </div>
      ) : (
        <>
          {/* ── ACTIVE ASSESSMENTS — held to about a quarter of the
              page height (scrolls inside) so the cover page below
              stays in view ── */}
          <section style={S.activePanel} aria-label="Active assessments">
            <div style={S.sectionHead}>
              <span className="live-dot" style={S.liveDot} />
              Active assessments
              <span style={S.countPill}>{active.length}</span>
            </div>
            {active.length === 0 ? (
              <div style={S.emptyInline}>
                <Inbox size={18} color="var(--text-muted)" />
                No assessment is active right now
              </div>
            ) : (
              <div style={S.activeList}>
                {active.map((a) => {
                  const isSel = selected && String(selected.id) === String(a.id);
                  return (
                    <div
                      key={a.id}
                      className="assess-card"
                      style={{ ...S.activeRow, ...(isSel ? S.activeRowSel : null) }}
                      onClick={() => setSelectedId(a.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedId(a.id); }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={S.rowTitle}>{a.title}</div>
                        <div style={S.rowMeta}>
                          {a.subject ? `${a.subject} · ` : ""}
                          <Clock size={11} style={{ verticalAlign: "-1px" }} />{" "}
                          {a._end ? `Ends in ${fmtCountdown(a._end - now)}` : `${a.duration_minutes || "—"} mins`}
                        </div>
                      </div>
                      <button
                        className="assess-take-btn"
                        style={S.takeBtn}
                        onClick={(e) => { e.stopPropagation(); navigate(`/take-assessment/${a.id}`); }}
                      >
                        <PlayCircle size={14} /> Take
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── COVER PAGE of the selected active assessment ── */}
          {selected?.cover_page_url && (
            <section style={S.coverSection} aria-label="Cover page">
              <div style={S.coverHead}>
                <FileText size={14} /> Cover page · {selected.title}
              </div>
              <div style={S.coverWrap}>
                <iframe
                  key={selected.id}
                  src={`${resolveFileUrl(selected.cover_page_url)}#toolbar=0&navpanes=0&view=FitH`}
                  title={`${selected.title} cover page`}
                  style={S.coverFrame}
                />
              </div>
            </section>
          )}

          {/* ── UPCOMING PAPERS with time remaining ── */}
          <section style={S.upcomingPanel} aria-label="Upcoming papers">
            <div style={S.sectionHead}>
              <CalendarClock size={15} color="var(--primary)" />
              Upcoming papers
              <span style={S.countPill}>{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div style={S.emptyInline}>No upcoming papers</div>
            ) : (
              upcoming.map((u) => (
                <div key={u.id} className="upcoming-row" style={S.upcomingRow}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={S.rowTitle}>{u.title}</div>
                    <div style={S.rowMeta}>
                      {u.subject ? `${u.subject} · ` : ""}
                      {u._start ? fmtWhen(u._start) : "Date to be announced"}
                      {u.duration_minutes ? ` · ${u.duration_minutes} mins` : ""}
                    </div>
                  </div>
                  <div style={S.countdown}>
                    {u._start ? (
                      <>
                        <span style={S.countdownLabel}>Starts in</span>
                        <strong style={S.countdownValue}>{fmtCountdown(u._start - now)}</strong>
                      </>
                    ) : (
                      <span style={S.countdownLabel}>Awaiting start</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}

/* =========================================================
   STYLES
========================================================= */
const S = {
  main: {
    padding: "20px 32px 48px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
    maxWidth: 980,
    margin: "0 auto",
  },
  pageHeader: { marginBottom: 14 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  errorBanner: {
    display: "flex", alignItems: "center", gap: 10, background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, color: "var(--text)", marginBottom: 14,
  },
  retryBtn: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8,
    padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  },
  loadingState: {
    display: "flex", alignItems: "center", gap: 10, padding: "36px 0",
    color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600,
  },

  sectionHead: {
    display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)", marginBottom: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" },
  countPill: {
    marginLeft: 2, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 20,
    padding: "1px 8px", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
  },

  // Active assessments: a quarter of the viewport, scrolling inside.
  activePanel: {
    height: "25vh",
    minHeight: 150,
    width: "95%",
    minWidth: "250",
    display: "flex",
    flexDirection: "column",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px 16px 12px",
    boxShadow: "var(--shadow-sm)",
    boxSizing: "border-box",
    marginBottom: 16,
  },
  activeList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 2 },
  activeRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "9px 12px",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)",
    cursor: "pointer", transition: "box-shadow .15s ease, border-color .15s ease",
  },
  activeRowSel: { borderColor: "var(--primary)", background: "var(--primary-tint)" },
  rowTitle: { fontSize: 14, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowMeta: { marginTop: 3, fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 },
  takeBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-sm)",
    border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  emptyInline: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600,
  },

  coverSection: { marginBottom: 16 },
  coverHead: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
    color: "var(--text-secondary)", marginBottom: 8,
  },
  coverWrap: {
    height: "62vh",
    minHeight: 320,
    borderRadius: "var(--radius)",
    overflow: "hidden",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
    background: "var(--card)",
  },
  coverFrame: { width: "100%", height: "100%", border: "none", display: "block" },

  upcomingPanel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "14px 16px", boxShadow: "var(--shadow-sm)",
  },
  upcomingRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    padding: "10px 0", borderTop: "1px solid var(--border)",
  },
  countdown: { display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 },
  countdownLabel: { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" },
  countdownValue: { fontSize: 16, fontWeight: 800, color: "var(--primary)", fontVariantNumeric: "tabular-nums", marginTop: 2 },
};