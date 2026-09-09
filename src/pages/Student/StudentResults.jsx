import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { Loader2, AlertTriangle, Trophy, ChevronRight, Inbox } from "lucide-react";

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
    .sr-row:hover { border-color: var(--primary); box-shadow: var(--shadow); }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
  `;
  document.head.appendChild(el);
};

const gradeFor = (pct) => {
  if (pct === null) return { label: "—", bg: "var(--bg)", fg: "var(--text-muted)" };
  if (pct >= 75) return { label: "DISTINCTION", bg: "var(--success-tint)", fg: "var(--success)" };
  if (pct >= 60) return { label: "CREDIT", bg: "var(--info-tint)", fg: "var(--info)" };
  if (pct >= 40) return { label: "PASS", bg: "var(--warning-tint)", fg: "var(--warning)" };
  return { label: "REFER", bg: "var(--destructive-tint)", fg: "var(--destructive)" };
};

/* This is the landing page behind the "Results Summary" sidebar link —
   the item already existed in StudentLayout's NAV_GROUPS (and therefore
   in the admin Portal Pages toggle, which reads that same registry), but
   had no route/component behind it. It rounds up every assessment this
   student has actually been marked+released on and links each one into
   the full per-question breakdown (StudentMarkedPaper). */
export default function StudentResults() {
  injectStyles();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/e-assessments");
      const data = res.data?.assessments || res.data?.data || res.data || [];
      const released = data.filter(
        (a) => String(a.my_submission_status || "").toLowerCase() === "released"
      );
      setResults(released);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load your results");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dash-main" style={D.main}>
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Trophy size={20} color="var(--primary)" />
          <h1 style={D.pageTitle}>Results Summary</h1>
        </div>
        <p style={D.pageSub}>Every assessment you've been marked and released on, in one place.</p>
      </header>

      {loading ? (
        <div style={D.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading your results…
        </div>
      ) : error ? (
        <div style={D.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={load} style={D.retryBtn}>Retry</button>
        </div>
      ) : results.length === 0 ? (
        <section style={D.panel}>
          <div style={D.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No released results yet.</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Once a teacher releases your marks for an e-assessment, it'll show up here.
            </div>
          </div>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map((r) => {
            const total = Number(r.total_marks) || 0;
            const score = Number(r.my_score) || 0;
            const pct = total ? Math.round((score / total) * 100) : null;
            const grade = gradeFor(pct);
            return (
              <button
                key={r.id}
                className="sr-row"
                onClick={() => navigate(`/student/e-assessments/${r.id}/result`)}
                style={D.row}
              >
                <div style={{ minWidth: 0, textAlign: "left" }}>
                  <div style={D.rowTitle}>{r.title}</div>
                  <div style={D.rowSub}>{r.subject || "—"} · {r.teacher_name || "Teacher"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={D.rowScore}>{score} / {total || "—"}</div>
                    {pct !== null && <div style={D.rowPct}>{pct}%</div>}
                  </div>
                  <span style={{ ...D.gradeBadge, background: grade.bg, color: grade.fg }}>{grade.label}</span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
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
  retryBtn: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  },
  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "20px 22px", boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5,
    fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center",
  },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "14px 18px", boxShadow: "var(--shadow-sm)", transition: "border-color .15s ease, box-shadow .15s ease",
  },
  rowTitle: { fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowSub: { fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 },
  rowScore: { fontSize: 14, fontWeight: 800, color: "var(--text)" },
  rowPct: { fontSize: 11.5, color: "var(--text-muted)", fontWeight: 700, marginTop: 1 },
  gradeBadge: { display: "inline-flex", alignItems: "center", borderRadius: 20, padding: "4px 12px", fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" },
};
