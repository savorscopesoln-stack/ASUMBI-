import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import {
  BarChart3, Percent, TrendingUp, TrendingDown, BookOpen,
  AlertTriangle, Loader2, Inbox, Sparkles, BrainCircuit,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app, so this page renders from the same system.
   Injected under "dash-tokens"; a no-op if already mounted by the
   layout or another page. ─── */
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

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-row:hover { background: var(--primary-tint) !important; }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 1180px) and (min-width: 901px) {
      .marks-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 640px) {
      .marks-stats-grid { grid-template-columns: 1fr !important; }
      .marks-insight-grid { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ================= GRADE → TOKEN COLOR =================
   FIX: the old version compared grade.includes("Distinction")
   against grades that actually arrive as "DISTINCTION" (see
   predictGrade below / backend values) — case mismatch meant
   this never matched and every badge fell through to red.
   Now case-insensitive, and returns tint/fg pairs from the same
   token palette the rest of the app uses instead of hardcoded hex. */
const gradeTint = (grade) => {
  if (!grade) return { bg: "var(--bg)", fg: "var(--text-muted)" };
  const g = String(grade).toUpperCase();
  if (g.includes("DISTINCTION")) return { bg: "var(--success-tint)", fg: "var(--success)" };
  if (g.includes("CREDIT"))      return { bg: "var(--info-tint)",    fg: "var(--info)" };
  if (g.includes("PASS"))        return { bg: "var(--warning-tint)", fg: "var(--warning)" };
  return { bg: "var(--destructive-tint)", fg: "var(--destructive)" }; // FAIL / REFER / CRNM
};

/* ================= GRADE PREDICTION (unchanged) ================= */
const predictGrade = (avg) => {
  if (avg >= 75) return "DISTINCTION";
  if (avg >= 60) return "CREDIT";
  if (avg >= 40) return "PASS";
  return "REFER";
};

/* ================= INSIGHTS ENGINE (unchanged logic) =================
   FIX: this was fully built but never called anywhere — the UI had
   its own hardcoded 2-tier message instead. Now actually wired up
   below so its 3-tier advice text is what's shown. */
const generateInsights = (marks, avg) => {
  const crnmSubjects = marks
    .filter((m) => m.score === null || m.percentage === null)
    .map((m) => m.subjectName)
    .filter(Boolean);

  const weakSubjects = marks
    .filter(
      (m) =>
        m.percentage !== null &&
        m.percentage !== undefined &&
        Number(m.percentage) < 50
    )
    .map((m) => m.subjectName)
    .filter(Boolean);

  const strongSubjects = marks
    .filter(
      (m) =>
        m.percentage !== null &&
        m.percentage !== undefined &&
        Number(m.percentage) >= 70
    )
    .map((m) => m.subjectName)
    .filter(Boolean);

  return {
    weakSubjects,
    strongSubjects,
    crnmSubjects,
    advice:
      avg >= 70
        ? "Excellent performance. Keep consistency."
        : avg >= 50
        ? "Average performance. Improve weak subjects."
        : "Critical performance. Immediate intervention required.",
  };
};

/* color for the advice line, tied to the same 70/50 tiers the
   advice text itself uses (previously this used a separate <50
   "isBelowAverage" check that didn't line up with the 3-tier text) */
const adviceColor = (avg) => {
  if (avg >= 70) return "var(--success)";
  if (avg >= 50) return "var(--warning)";
  return "var(--destructive)";
};

export default function StudentMarks() {
  injectStyles();

  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admissionNo = user?.admissionNo || user?.id;

  /* ================= LOAD (unchanged) ================= */
  const loadMarks = async () => {
    try {
      setLoading(true);
      setError("");

      if (!admissionNo) {
        setError("Admission number not found");
        setLoading(false);
        return;
      }

      const [marksRes, subjectsRes] = await Promise.all([
        API.get("/student/marks", {
          params: { studentId: admissionNo },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }),
        API.get("/subjects"),
      ]);

      setMarks(marksRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.log(err);
      setError("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionNo]);

  /* ================= FULL SUBJECT MAP (unchanged) ================= */
  const fullSubjectMap = useMemo(() => {
    const map = {};

    marks.forEach((m) => {
      map[m.subjectName] = m;
    });

    return subjects.map((s) => {
      const m = map[s.name];

      return {
        subjectName: s.name,
        score: m?.score ?? null,
        percentage: m?.percentage ?? null,
        grade: m?.grade ?? "CRNM",
      };
    });
  }, [marks, subjects]);

  /* ================= STRICT CLASSIFICATION (unchanged) ================= */
  const classified = useMemo(() => {
    const crnm = [];
    const weak = [];
    const strong = [];

    fullSubjectMap.forEach((m) => {
      const hasNoMark =
        m.score === null || m.percentage === null || m.percentage === undefined;

      const pct = Number(m.percentage || 0);

      if (hasNoMark) crnm.push(m.subjectName);
      else if (pct >= 70) strong.push(m.subjectName);
      else if (pct < 50) weak.push(m.subjectName);
    });

    return { crnm, weak, strong };
  }, [fullSubjectMap]);

  /* ================= ANALYTICS (unchanged) ================= */
  const analytics = useMemo(() => {
    const scoredSubjects = fullSubjectMap.filter(
      (m) => m.percentage !== null && m.percentage !== undefined
    );

    const validScores = scoredSubjects
      .map((m) => Number(m.percentage || 0))
      .filter((s) => s > 0);

    const avg =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;

    const highestItem = scoredSubjects.reduce(
      (max, curr) =>
        Number(curr.percentage || 0) > Number(max.percentage || 0)
          ? curr
          : max,
      scoredSubjects[0] || {}
    );

    const lowestItem = scoredSubjects.reduce(
      (min, curr) =>
        Number(curr.percentage || 0) < Number(min.percentage || 0)
          ? curr
          : min,
      scoredSubjects[0] || {}
    );

    return {
      avg: Math.round(avg),
      highest: highestItem,
      lowest: lowestItem,
      total: subjects.length,
      attempted: marks.length,
      predictedGrade: predictGrade(avg),
    };
  }, [fullSubjectMap, subjects, marks]);

  /* FIX: generateInsights was defined but never invoked — now it
     drives the advice line instead of the old hardcoded 2-tier text */
  const insights = useMemo(
    () => generateInsights(fullSubjectMap, analytics.avg),
    [fullSubjectMap, analytics.avg]
  );

  const predictionTint = gradeTint(analytics.predictedGrade);

  return (
    <main className="dash-main" style={D.main}>

      {/* ── Header ── */}
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={20} color="var(--primary)" />
          <div>
            <h1 style={D.pageTitle}>Marks & Prediction</h1>
            <p style={D.pageSub}>
              Admission No: <span style={{ color: "var(--primary)", fontWeight: 700 }}>{admissionNo || "N/A"}</span>
            </p>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && !loading && (
        <div style={D.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={loadMarks} style={D.retryBtn}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={D.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading marks and prediction…
        </div>
      ) : (
        <>
          {/* ── KPI cards ── */}
          <section className="marks-stats-grid" style={D.statsGrid} aria-label="Summary statistics">
            <StatCard
              label="Average Score"
              value={`${analytics.avg}%`}
              Icon={Percent}
              tint="primary"
            />
            <StatCard
              label="Highest"
              value={
                analytics.highest?.subjectName
                  ? `${analytics.highest.percentage}% · ${analytics.highest.subjectName}`
                  : "N/A"
              }
              Icon={TrendingUp}
              tint="success"
            />
            <StatCard
              label="Lowest"
              value={
                analytics.lowest?.subjectName
                  ? `${analytics.lowest.percentage}% · ${analytics.lowest.subjectName}`
                  : "N/A"
              }
              Icon={TrendingDown}
              tint="destructive"
            />
            <StatCard
              label="Subjects"
              value={analytics.total}
              Icon={BookOpen}
              tint="info"
            />
          </section>

          {/* ── AI Prediction ── */}
          <section style={D.panel} className="dash-card" aria-label="AI prediction">
            <div style={D.panelHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={17} color="var(--text-secondary)" />
                <h3 style={D.panelTitle}>AI Prediction</h3>
              </div>
            </div>
            <span style={{ ...D.badge, background: predictionTint.bg, color: predictionTint.fg, fontSize: 15, padding: "8px 16px" }}>
              {analytics.predictedGrade}
            </span>
          </section>

          {/* ── AI Insights ── */}
          <section style={D.panel} className="dash-card" aria-label="AI insights">
            <div style={D.panelHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BrainCircuit size={17} color="var(--text-secondary)" />
                <h3 style={D.panelTitle}>AI Insights</h3>
              </div>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: 13.5, fontWeight: 600, color: adviceColor(analytics.avg) }}>
              {insights.advice}
            </p>

            <div className="marks-insight-grid" style={D.insightGrid}>
              <div>
                <div style={D.insightLabel}>Strong Subjects</div>
                <SubjectList items={classified.strong} tone="success" />
              </div>
              <div>
                <div style={D.insightLabel}>Weak Subjects</div>
                <SubjectList items={classified.weak} tone="destructive" />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={D.insightLabel}>CRNM (Missing Marks)</div>
              <SubjectList items={classified.crnm} tone="neutral" />
            </div>
          </section>

          {/* ── Subject breakdown table ── */}
          <section style={D.panel} className="dash-card" aria-label="Subject breakdown">
            <div style={D.panelHeader}>
              <h3 style={D.panelTitle}>Subject Breakdown</h3>
            </div>

            {fullSubjectMap.length === 0 ? (
              <div style={D.emptyState}>
                <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div>No subjects found</div>
              </div>
            ) : (
              <div style={D.tableWrap}>
                <table style={D.table}>
                  <thead>
                    <tr>
                      <th style={D.th}>Subject</th>
                      <th style={D.th}>Score</th>
                      <th style={D.th}>%</th>
                      <th style={D.th}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullSubjectMap.map((m, i) => {
                      const t = gradeTint(m.grade);
                      return (
                        <tr key={i} className="dash-row">
                          <td style={D.td}>{m.subjectName}</td>
                          <td style={D.td}>{m.score ?? "CRNM"}</td>
                          <td style={D.td}>{m.percentage ?? "CRNM"}</td>
                          <td style={D.td}>
                            <span style={{ ...D.badge, background: t.bg, color: t.fg }}>{m.grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

/* ── small helpers ── */
function StatCard({ label, value, Icon, tint }) {
  const tints = {
    primary:     { bg: "var(--primary-tint)",     fg: "var(--primary)" },
    success:     { bg: "var(--success-tint)",     fg: "var(--success)" },
    destructive: { bg: "var(--destructive-tint)", fg: "var(--destructive)" },
    info:        { bg: "var(--info-tint)",        fg: "var(--info)" },
  };
  const t = tints[tint] || tints.primary;
  return (
    <div className="dash-card" style={D.statCard}>
      <div style={{ ...D.statIconWrap, background: t.bg }}>
        <Icon size={20} color={t.fg} strokeWidth={2} />
      </div>
      <div style={D.statInfo}>
        <div style={D.statLabel}>{label}</div>
        <div style={D.statValue}>{value}</div>
      </div>
    </div>
  );
}

function SubjectList({ items, tone }) {
  const tones = {
    success:     { bg: "var(--success-tint)",     fg: "var(--success)" },
    destructive: { bg: "var(--destructive-tint)", fg: "var(--destructive)" },
    neutral:     { bg: "var(--bg)",               fg: "var(--text-secondary)" },
  };
  const t = tones[tone] || tones.neutral;
  if (!items.length) {
    return <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 }}>None</div>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((s, i) => (
        <span key={i} style={{ ...D.badge, background: t.bg, color: t.fg }}>{s}</span>
      ))}
    </div>
  );
}

/* ════════════════════════════════
   STYLES — token-driven, mirrors the
   panel/statCard/table patterns used
   across the rest of the app
════════════════════════════════ */
const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },

  pageHeader: { marginBottom: 22 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

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

  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "36px 0",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
  },

  /* ── stat cards ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginBottom: 20,
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
  statValue: { fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis" },

  /* ── panels ── */
  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    marginBottom: 20,
    boxShadow: "var(--shadow-sm)",
  },
  panelHeader: { marginBottom: 14 },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },

  insightGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  insightLabel: {
    fontSize: 11.5,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-secondary)",
    marginBottom: 8,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  emptyState: {
    padding: "36px 0",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  /* ── table ── */
  tableWrap: { overflowX: "auto", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 },
  th: {
    padding: "9px 14px",
    background: "var(--bg)",
    color: "var(--text-secondary)",
    fontWeight: 800,
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  td: { padding: "10px 14px", color: "var(--text)", borderBottom: "1px solid var(--border)", verticalAlign: "middle", background: "var(--card)" },
};