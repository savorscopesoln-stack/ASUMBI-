import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { CalendarDays, Loader2, AlertTriangle, Inbox, LogIn, MapPin } from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the student portal; a no-op if already mounted elsewhere. ─── */
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
  `;
  document.head.appendChild(el);
};

const STATUS_TONE = {
  active: { bg: "var(--success-tint)", fg: "var(--success)", label: "Active" },
  completed: { bg: "var(--info-tint)", fg: "var(--info)", label: "Completed" },
  absent: { bg: "var(--destructive-tint)", fg: "var(--destructive)", label: "Absent" },
  upcoming: { bg: "var(--bg)", fg: "var(--text-secondary)", label: "Upcoming" },
};

/* ═══════════════════════════════════════════════════════════
   STUDENT MAIN-EXAM TIMETABLE (§40, Phase 14)
   Backed by:
     GET /student/main-exams/dashboard              (which main
       examinations this student currently has a stake in — used
       here only to build the picker, same endpoint the Dashboard's
       "Active Examination" card already calls)
     GET /student/main-exams/:mainExamId/timetable   (the actual
       ordered schedule for the chosen examination)
   Both already exist on the backend (mainExamStudent.controller.js) —
   this page and its route are what was missing (item 3 in
   NOT_DONE.md); the "Class Timetable" sidebar link previously 404'd.
═══════════════════════════════════════════════════════════ */
export default function StudentMainExamTimetable() {
  injectStyles();
  const navigate = useNavigate();

  const [examOptions, setExamOptions] = useState([]); // [{id, name}]
  const [mainExamId, setMainExamId] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [examName, setExamName] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingOptions(true);
        setError("");
        const res = await API.get("/student/main-exams/dashboard");
        const all = [...(res.data?.active || []), ...(res.data?.upcoming || []), ...(res.data?.completed || [])];
        const seen = new Map();
        all.forEach((s) => {
          if (s.main_examination_id && !seen.has(s.main_examination_id)) {
            seen.set(s.main_examination_id, s.main_examination_name);
          }
        });
        const options = [...seen.entries()].map(([id, name]) => ({ id, name }));
        setExamOptions(options);
        if (options.length > 0) setMainExamId(String(options[0].id));
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load your examinations");
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!mainExamId) return;
    (async () => {
      try {
        setLoadingTimetable(true);
        setError("");
        const res = await API.get(`/student/main-exams/${mainExamId}/timetable`);
        setTimetable(res.data?.timetable || []);
        setExamName(res.data?.examination?.name || "");
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load the timetable");
        setTimetable([]);
      } finally {
        setLoadingTimetable(false);
      }
    })();
  }, [mainExamId]);

  // timeZone: "UTC" — see the matching note on fmtTime/fmtDate in
  // components/mainExams/shared.jsx. Without it this showed students a
  // start time shifted by their own device's timezone instead of the
  // actual scheduled wall-clock time.
  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  };
  const fmtTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  };

  return (
    <main className="dash-main" style={D.main}>
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarDays size={20} color="var(--primary)" />
          <h1 style={D.pageTitle}>Class Timetable</h1>
        </div>
        <p style={D.pageSub}>Your personal schedule for each Main Examination you're sitting.</p>
      </header>

      {loadingOptions ? (
        <div style={D.loadingState}><Loader2 size={18} className="dash-spin" /> Loading your examinations…</div>
      ) : error && examOptions.length === 0 ? (
        <div style={D.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      ) : examOptions.length === 0 ? (
        <section style={D.panel}>
          <div style={D.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No Main Examination timetable has been published for you yet.</div>
          </div>
        </section>
      ) : (
        <>
          {examOptions.length > 1 && (
            <div style={{ marginBottom: 18, maxWidth: 360 }}>
              <label style={D.selectLabel}>Examination</label>
              <select value={mainExamId} onChange={(e) => setMainExamId(e.target.value)} style={D.select}>
                {examOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <section style={D.panel}>
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>{examName || "Timetable"}</h3>
            </div>

            {loadingTimetable ? (
              <div style={D.loadingState}><Loader2 size={18} className="dash-spin" /> Loading timetable…</div>
            ) : error ? (
              <div style={D.errorBanner} role="alert">
                <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            ) : timetable.length === 0 ? (
              <div style={D.emptyState}>
                <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div>No subjects scheduled for you in this examination yet.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {timetable.map((s) => {
                  const tone = STATUS_TONE[s.status] || STATUS_TONE.upcoming;
                  return (
                    <div key={s.session_id} style={D.row}>
                      <div style={{ minWidth: 0 }}>
                        <div style={D.rowTitle}>{s.subject}</div>
                        <div style={D.rowSub}>
                          {fmtDate(s.exam_date)} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                          {s.venue && <> · <MapPin size={11} style={{ verticalAlign: -1 }} /> {s.venue}</>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ ...D.badge, background: tone.bg, color: tone.fg }}>{tone.label}</span>
                        {s.status === "active" && s.e_assessment_id && (
                          <button style={D.enterBtn} onClick={() => navigate(`/take-assessment/${s.e_assessment_id}`)}>
                            <LogIn size={13} /> Enter
                          </button>
                        )}
                      </div>
                    </div>
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

const D = {
  main: {
    padding: "24px 32px 56px", background: "var(--bg)", color: "var(--text)",
    minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", boxSizing: "border-box",
  },
  pageHeader: { marginBottom: 20 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },
  loadingState: {
    display: "flex", alignItems: "center", gap: 10, padding: "36px 0",
    color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600,
  },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 10, background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, color: "var(--text)", marginBottom: 18,
  },
  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "20px 22px", boxShadow: "var(--shadow-sm)",
  },
  panelHeader: { marginBottom: 16 },
  emptyState: {
    padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5,
    fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center",
  },
  selectLabel: { display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" },
  select: {
    width: "100%", padding: "10px 13px", borderRadius: 9, border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", fontSize: 14, outline: "none", cursor: "pointer",
  },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
  },
  rowTitle: { fontSize: 14, fontWeight: 700, color: "var(--text)" },
  rowSub: { fontSize: 12, color: "var(--text-secondary)", marginTop: 3 },
  badge: { display: "inline-flex", alignItems: "center", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" },
  enterBtn: {
    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7,
    border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
  },
};
