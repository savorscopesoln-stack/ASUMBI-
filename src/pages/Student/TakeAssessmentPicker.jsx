import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  MonitorCheck, Clock, Loader2, Inbox, AlertTriangle, FileText,
  CalendarClock, PlayCircle, Timer, BookOpen, CalendarDays, Eye,
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
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── page-specific rules (separate id so they always load, even when
   the shared token sheet was already mounted by another page) ─── */
const injectPickerStyles = () => {
  if (document.getElementById("picker-page-styles")) return;
  const el = document.createElement("style");
  el.id = "picker-page-styles";
  el.textContent = `
    .pick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }
    .pick-card { transition: border-color .15s ease, box-shadow .15s ease; }
    .pick-card:hover { border-color: var(--primary) !important; box-shadow: var(--shadow); }
    .pick-take:hover { filter: brightness(0.93); }
    .pick-ghost:hover { background: var(--bg) !important; }

    .up-row {
      display: grid;
      grid-template-columns: 84px minmax(0, 1fr) auto;
      align-items: center;
      gap: 22px;
    }
    @media (max-width: 860px) {
      .up-row { grid-template-columns: 72px minmax(0, 1fr); }
      .up-row > .up-clock { grid-column: 1 / -1; justify-content: flex-start !important; }
    }
    @media (max-width: 480px) {
      .pick-grid { grid-template-columns: 1fr; }
      .up-row { grid-template-columns: 1fr; }
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

const pad2 = (n) => String(n).padStart(2, "0");

// Splits a millisecond gap into display parts.
const splitCountdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
};

// Compact single-line countdown, used for "time left" on open papers.
const fmtCountdown = (ms) => {
  if (ms <= 0) return "0s";
  const { d, h, m, s } = splitCountdown(ms);
  if (d > 0) return `${d}d ${pad2(h)}h ${pad2(m)}m`;
  if (h > 0) return `${h}h ${pad2(m)}m ${pad2(s)}s`;
  return `${m}m ${pad2(s)}s`;
};

const fmtWhen = (t) =>
  new Date(t).toLocaleString([], { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function TakeAssessmentPicker() {
  injectStyles();
  injectPickerStyles();

  const navigate = useNavigate();

  const [data, setData] = useState({ active: [], upcoming: [], fetchedAt: Date.now() });
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
        fetchedAt: Date.now(),
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
    // The server sends "seconds from now" (computed by the database, so
    // timezone-proof); anchor them to the moment the list was fetched.
    const rel = (secs) => (secs === null || secs === undefined ? null : data.fetchedAt + Number(secs) * 1000);
    const withTimes = (r) => ({
      ...r,
      _start: rel(r.seconds_until_start) ?? pickTime(r, START_KEYS),
      _end: rel(r.seconds_until_end) ?? pickTime(r, END_KEYS),
    });
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
        <div style={S.headerIcon}>
          <MonitorCheck size={26} color="var(--primary)" aria-hidden="true" />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={S.pageTitle}>Take an Assessment</h1>
          <p style={S.pageSub}>Choose an assessment that is open, then sign in with your username and exam password.</p>
        </div>
      </header>

      {error && !loading && (
        <div style={S.errorBanner} role="alert">
          <AlertTriangle size={18} color="var(--destructive)" style={{ flexShrink: 0 }} aria-hidden="true" />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchAssessments} style={S.retryBtn}>Retry</button>
        </div>
      )}

      {loading && data.active.length === 0 && data.upcoming.length === 0 ? (
        <div style={S.loadingState}>
          <Loader2 size={20} className="dash-spin" aria-hidden="true" />
          Loading assessments…
        </div>
      ) : (
        <>
          {/* ── ACTIVE ASSESSMENTS ── */}
          <section style={S.section} aria-labelledby="active-heading">
            <div style={S.sectionHead}>
              <span className="live-dot" style={S.liveDot} aria-hidden="true" />
              <h2 id="active-heading" style={S.sectionTitle}>Open now</h2>
              <span style={S.countPill}>{active.length}</span>
            </div>

            {active.length === 0 ? (
              <div style={S.emptyBox}>
                <Inbox size={30} color="var(--text-muted)" aria-hidden="true" />
                <div style={S.emptyTitle}>No assessment is open right now</div>
                <div style={S.emptySub}>When your teacher starts one, it appears here automatically.</div>
              </div>
            ) : (
              <div className="pick-grid">
                {active.map((a) => {
                  const isSel = selected && String(selected.id) === String(a.id);
                  const left = a._end ? a._end - now : null;
                  const urgent = left !== null && left < 10 * 60 * 1000;
                  return (
                    <article
                      key={a.id}
                      className="pick-card"
                      style={{ ...S.activeCard, ...(isSel ? S.activeCardSel : null) }}
                      onClick={() => setSelectedId(a.id)}
                    >
                      <div style={S.activeAccent} aria-hidden="true" />
                      <div style={S.activeBody}>
                        <div style={S.cardTopRow}>
                          <span style={S.openChip}>
                            <span className="live-dot" style={S.chipDot} aria-hidden="true" />
                            Open now
                          </span>
                          {a.duration_minutes ? (
                            <span style={S.durationChip}>
                              <Clock size={13} aria-hidden="true" /> {a.duration_minutes} minutes
                            </span>
                          ) : null}
                        </div>

                        <h3 style={S.cardTitle}>{a.title}</h3>
                        {a.subject && (
                          <p style={S.cardSubject}>
                            <BookOpen size={15} aria-hidden="true" /> {a.subject}
                          </p>
                        )}

                        <div style={{ ...S.timeBox, ...(urgent ? S.timeBoxUrgent : null) }}>
                          <Timer size={20} color={urgent ? "var(--warning)" : "var(--success)"} aria-hidden="true" />
                          <div>
                            <div style={S.timeLabel}>{a._end ? "Closes in" : "Time allowed"}</div>
                            <div style={{ ...S.timeValue, color: urgent ? "var(--warning)" : "var(--text)" }}>
                              {a._end ? fmtCountdown(left) : `${a.duration_minutes || "Not set"}${a.duration_minutes ? " minutes" : ""}`}
                            </div>
                          </div>
                        </div>

                        <div style={S.cardActions}>
                          <button
                            className="pick-take"
                            style={S.takeBtn}
                            onClick={(e) => { e.stopPropagation(); navigate(`/take-assessment/${a.id}`); }}
                          >
                            <PlayCircle size={18} aria-hidden="true" /> Take assessment
                          </button>
                          {a.cover_page_url && (
                            <button
                              className="pick-ghost"
                              style={{ ...S.ghostBtn, ...(isSel ? S.ghostBtnSel : null) }}
                              aria-pressed={!!isSel}
                              onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); }}
                            >
                              <Eye size={16} aria-hidden="true" /> Cover page
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── COVER PAGE of the selected active assessment ── */}
          {selected?.cover_page_url && (
            <section style={S.section} aria-label="Cover page">
              <div style={S.sectionHead}>
                <FileText size={18} color="var(--primary)" aria-hidden="true" />
                <h2 style={S.sectionTitle}>Cover page</h2>
                <span style={S.sectionNote}>{selected.title}</span>
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
          <section style={S.section} aria-labelledby="upcoming-heading">
            <div style={S.sectionHead}>
              <CalendarClock size={18} color="var(--primary)" aria-hidden="true" />
              <h2 id="upcoming-heading" style={S.sectionTitle}>Coming up</h2>
              <span style={S.countPill}>{upcoming.length}</span>
            </div>

            {upcoming.length === 0 ? (
              <div style={S.emptyBox}>
                <CalendarDays size={30} color="var(--text-muted)" aria-hidden="true" />
                <div style={S.emptyTitle}>No upcoming papers</div>
                <div style={S.emptySub}>Scheduled assessments show here with a countdown to their start.</div>
              </div>
            ) : (
              <div style={S.upList}>
                {upcoming.map((u) => {
                  const parts = u._start ? splitCountdown(u._start - now) : null;
                  const dateObj = u._start ? new Date(u._start) : null;
                  const tiles = parts
                    ? [
                        ...(parts.d > 0 ? [["Days", parts.d]] : []),
                        ["Hours", pad2(parts.h)],
                        ["Minutes", pad2(parts.m)],
                        ["Seconds", pad2(parts.s)],
                      ]
                    : null;
                  return (
                    <article key={u.id} className="up-row" style={S.upRow}>
                      <div style={S.dateBlock} aria-hidden="true">
                        {dateObj ? (
                          <>
                            <span style={S.dateDay}>{dateObj.getDate()}</span>
                            <span style={S.dateMonth}>{dateObj.toLocaleString([], { month: "short" })}</span>
                          </>
                        ) : (
                          <CalendarDays size={28} color="var(--primary)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <h3 style={S.upTitle}>{u.title}</h3>
                        <p style={S.upMeta}>
                          {u.subject && (<span style={S.metaItem}><BookOpen size={14} aria-hidden="true" /> {u.subject}</span>)}
                          <span style={S.metaItem}>
                            <CalendarClock size={14} aria-hidden="true" />{" "}
                            {u.start_label ? u.start_label.replace("T", " at ") : u._start ? fmtWhen(u._start) : "Date to be announced"}
                          </span>
                          {u.duration_minutes ? (
                            <span style={S.metaItem}><Clock size={14} aria-hidden="true" /> {u.duration_minutes} minutes</span>
                          ) : null}
                        </p>
                      </div>

                      <div className="up-clock" style={S.clock}>
                        {tiles ? (
                          <>
                            <span style={S.clockLead}>Starts in</span>
                            {tiles.map(([label, value]) => (
                              <div key={label} style={S.clockTile}>
                                <span style={S.clockNum}>{value}</span>
                                <span style={S.clockLabel}>{label}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <span style={S.awaiting}>Waiting for a start time</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
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
  // Full width of the page (no max-width cap).
  main: {
    padding: "28px 40px 64px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
    width: "100%",
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28 },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, background: "var(--primary-tint)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" },
  pageSub: { margin: "4px 0 0", fontSize: 14.5, color: "var(--text-secondary)", fontWeight: 500, lineHeight: 1.5 },

  errorBanner: {
    display: "flex", alignItems: "center", gap: 10, background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)", borderRadius: 12, padding: "12px 16px",
    fontSize: 14, color: "var(--text)", marginBottom: 20,
  },
  retryBtn: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8,
    padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  },
  loadingState: {
    display: "flex", alignItems: "center", gap: 10, padding: "48px 0",
    color: "var(--text-secondary)", fontSize: 15, fontWeight: 600,
  },

  section: { marginBottom: 36 },
  sectionHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  sectionNote: { fontSize: 14, color: "var(--text-secondary)", fontWeight: 600, marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  liveDot: { width: 10, height: 10, borderRadius: "50%", background: "var(--success)", display: "inline-block", flexShrink: 0 },
  countPill: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20,
    padding: "2px 11px", fontSize: 13, fontWeight: 800, color: "var(--text-secondary)",
  },

  emptyBox: {
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8,
    padding: "44px 24px", background: "var(--card)", border: "1px dashed var(--border)",
    borderRadius: "var(--radius)",
  },
  emptyTitle: { fontSize: 16, fontWeight: 800, color: "var(--text)" },
  emptySub: { fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 },

  /* ── open now: large cards that fill the row ── */
  activeCard: {
    display: "flex", background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow-sm)",
  },
  activeCardSel: { borderColor: "var(--primary)", boxShadow: "0 0 0 2px var(--primary-tint)" },
  activeAccent: { width: 6, background: "var(--success)", flexShrink: 0 },
  activeBody: { flex: 1, minWidth: 0, padding: "22px 24px 24px", display: "flex", flexDirection: "column" },
  cardTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  openChip: {
    display: "inline-flex", alignItems: "center", gap: 7, background: "var(--success-tint)",
    color: "var(--success)", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 800,
  },
  chipDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" },
  durationChip: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--text-secondary)" },
  cardTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.3, letterSpacing: "-0.01em", wordBreak: "break-word" },
  cardSubject: { display: "flex", alignItems: "center", gap: 7, margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" },
  timeBox: {
    display: "flex", alignItems: "center", gap: 14, marginTop: 20, padding: "14px 16px",
    background: "var(--success-tint)", borderRadius: 12,
  },
  timeBoxUrgent: { background: "var(--warning-tint)" },
  timeLabel: { fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" },
  timeValue: { marginTop: 2, fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" },
  cardActions: { display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" },
  takeBtn: {
    flex: "1 1 180px", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
    padding: "14px 20px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff",
    fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  },
  ghostBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px 18px",
    borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)",
    color: "var(--text-secondary)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  ghostBtnSel: { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--primary-tint)" },

  /* ── cover page ── */
  coverWrap: {
    height: "75vh", minHeight: 360, borderRadius: 16, overflow: "hidden",
    border: "1px solid var(--border)", boxShadow: "var(--shadow)", background: "var(--card)",
  },
  coverFrame: { width: "100%", height: "100%", border: "none", display: "block" },

  /* ── coming up: full-width rows with a date block and countdown tiles ── */
  upList: { display: "flex", flexDirection: "column", gap: 14 },
  upRow: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16,
    padding: "20px 24px", boxShadow: "var(--shadow-sm)",
  },
  dateBlock: {
    width: 84, height: 84, borderRadius: 14, background: "var(--primary-tint)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
  },
  dateDay: { fontSize: 32, fontWeight: 800, color: "var(--primary)", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  dateMonth: { fontSize: 14, fontWeight: 700, color: "var(--primary)" },
  upTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1.3, letterSpacing: "-0.01em", wordBreak: "break-word" },
  upMeta: { margin: "8px 0 0", display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  clock: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  clockLead: { fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginRight: 4 },
  clockTile: {
    minWidth: 72, padding: "10px 12px", borderRadius: 12, background: "var(--bg)",
    border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  },
  clockNum: { fontSize: 26, fontWeight: 800, color: "var(--primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 },
  clockLabel: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" },
  awaiting: {
    padding: "10px 16px", borderRadius: 12, background: "var(--warning-tint)", color: "var(--warning)",
    fontSize: 14, fontWeight: 700,
  },
};