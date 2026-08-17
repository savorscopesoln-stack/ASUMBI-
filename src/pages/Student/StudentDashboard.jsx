import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import QRCode from "react-qr-code";
import {
  BarChart3, DoorOpen, Utensils, Percent, Award, TrendingUp, TrendingDown,
  CheckCircle2, Clock, AlertTriangle, Inbox, Sun, Moon,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/* ─── design-token stylesheet ───
   Identical to the admin Dashboard's token sheet (same variable
   names/values, same helper classes) so the two pages share one
   visual language. Injected under the same id — if the admin
   dashboard has already mounted this run, this is a no-op.
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

    .dash-spin { animation: spin 0.8s linear infinite; }
    .dash-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: softPulse 1.4s ease-in-out infinite; border-radius: 8px; }

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-icon-btn:hover { background: var(--bg); }

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
      .dash-two-col { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 1180px) and (min-width: 901px) {
      .dash-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 640px) {
      .dash-stats-grid { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── page-specific additive rules (leave rows / meal card stack
   on narrow screens). Kept in its own stylesheet id so it never
   collides with the shared token sheet above. ─── */
const injectStudentStyles = () => {
  if (document.getElementById("student-dash-styles")) return;
  const el = document.createElement("style");
  el.id = "student-dash-styles";
  el.textContent = `
    @media (max-width: 640px) {
      .sdash-leave-card { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
      .sdash-meal-wrap { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .sdash-qr-box { align-self: center; }
    }
  `;
  document.head.appendChild(el);
};

/* ================= GRADING ================= */
const getKnecGrade = (score = 0) => {
  const s = Number(score || 0);

  if (s >= 80) return { grade: 1, label: "Distinction" };
  if (s >= 75) return { grade: 2, label: "Distinction" };
  if (s >= 70) return { grade: 3, label: "Credit" };
  if (s >= 60) return { grade: 4, label: "Credit" };
  if (s >= 50) return { grade: 5, label: "Pass" };
  if (s >= 40) return { grade: 6, label: "Pass" };
  return { grade: 7, label: "Fail" };
};

const scoreColor = (v) => {
  if (v >= 70) return "var(--success)";
  if (v >= 50) return "var(--warning)";
  return "var(--destructive)";
};

/* ─── custom recharts tooltip, token-driven (matches admin) ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--card-elevated)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 14px", color:"var(--text)", fontSize:13, boxShadow:"var(--shadow)" }}>
      <div style={{ color:"var(--text-secondary)", fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ fontWeight:700 }}>{payload[0].value}% score</div>
    </div>
  );
};

export default function StudentDashboard() {
  injectStyles();
  injectStudentStyles();

  const { theme, toggleTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = user.id;

  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [mealCard, setMealCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /* ================= LOAD ================= */
  const load = async () => {
    try {
      setLoading(true);
      const [m, s, l, meal] = await Promise.all([
        API.get("/student/marks", { params: { studentId } }),
        API.get("/subjects"),
        API.get("/leave-outs/student", { params: { studentId } }),
        API.get(`/meals/my/${studentId}`),
      ]);

      setMarks(m.data || []);
      setSubjects(s.data || []);
      setLeaves(l.data || []);
      setMealCard(meal.data || null);
      setLoadError(false);
    } catch (err) {
      console.log(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  /* ================= ANALYTICS ================= */
  const analytics = useMemo(() => {
    const scores = marks.map((m) => Number(m.percentage || 0));

    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    return {
      avg: Math.round(avg),
      highest: Math.max(...scores, 0),
      lowest: scores.length ? Math.min(...scores) : 0,
      grade: getKnecGrade(avg),
    };
  }, [marks]);

  /* ================= CHART ================= */
  const chartData = subjects.map((s) => {
    const match = marks.find((m) => m.subjectName === s.name);
    return {
      subject: s.name,
      score: Number(match?.percentage || 0),
    };
  });

  /* ================= LEAVES ================= */
  const activeLeaves = leaves.filter((l) => l.status === "approved");
  const pendingLeaves = leaves.filter((l) => l.status === "pending");

  /* ================= MEAL ================= */
  const mealsPerDay = mealCard?.meals_per_day || 4;

  const createdDate = mealCard?.created_at
    ? new Date(mealCard.created_at)
    : new Date();

  const totalDays = Math.max(
    1,
    Math.ceil((mealCard?.meals_remaining || 0) / mealsPerDay)
  );

  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + totalDays - 1);

  const mealNames = ["Breakfast", "Tea Break", "Lunch", "Supper"];

  const lastMealIndex =
    (mealCard?.meals_remaining % mealsPerDay) || mealsPerDay;

  const lastMeal = mealNames[lastMealIndex - 1];

  /* ================= STAT CARDS (same pattern as admin) ================= */
  const statCards = [
    { label: "Average",         value: `${analytics.avg}%`,           Icon: Percent,     tint: "primary" },
    { label: "Grade",           value: analytics.grade.label,         Icon: Award,       tint: "info" },
    { label: "Highest",         value: `${analytics.highest}%`,       Icon: TrendingUp,  tint: "success" },
    { label: "Lowest",          value: `${analytics.lowest}%`,        Icon: TrendingDown,tint: "warning" },
    { label: "Meals Remaining", value: mealCard?.meals_remaining ?? 0,Icon: Utensils,    tint: "neutral" },
  ];
  const tintStyles = {
    primary:  { bg:"var(--primary-tint)",  fg:"var(--primary)" },
    info:     { bg:"var(--info-tint)",     fg:"var(--info)" },
    success:  { bg:"var(--success-tint)",  fg:"var(--success)" },
    warning:  { bg:"var(--warning-tint)",  fg:"var(--warning)" },
    neutral:  { bg:"var(--bg)",            fg:"var(--text-secondary)" },
  };

  /* ================= UI ================= */
  return (
    <main className="dash-main" style={D.main}>

      {/* ── Header (matches admin pageHeader) ── */}
      <header style={D.pageHeader}>
        <div>
          <h1 style={D.pageTitle}>Dashboard</h1>
          <p style={D.pageSub}>
            Welcome back, <span style={{ color: "var(--primary)", fontWeight: 700 }}>{user.name || "there"}</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={D.clock}>
            {new Date().toLocaleDateString("en-KE", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </span>
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

      {/* ── Load error banner ── */}
      {loadError && !loading && (
        <div style={D.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Unable to load your dashboard data.</span>
          <button onClick={load} style={D.retryBtn} className="dash-btn-secondary">Retry</button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <section className="dash-stats-grid" style={D.statsGrid} aria-label="Summary statistics">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={D.statCard} className="dash-card">
                <div className="dash-skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div className="dash-skeleton" style={{ width: "70%", height: 11, marginBottom: 8 }} />
                  <div className="dash-skeleton" style={{ width: "45%", height: 22 }} />
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
                    <div style={D.statValue}>{sc.value}</div>
                  </div>
                </div>
              );
            })}
      </section>

      {/* ── Performance chart ── */}
      <section style={D.panel} aria-label="Performance overview">
        <div style={D.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={17} color="var(--text-secondary)" />
            <h3 style={D.panelTitle}>Performance Overview</h3>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div style={D.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No marks recorded yet</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={26}>
              <XAxis dataKey="subject" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg)" }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={scoreColor(d.score)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Bottom two-col: Leave Status + Meal Card ── */}
      <div className="dash-two-col" style={D.twoCol}>

        {/* Leave Status */}
        <section style={D.panel} aria-label="Leave status">
          <div style={D.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DoorOpen size={17} color="var(--text-secondary)" />
              <h3 style={D.panelTitle}>Leave Status</h3>
            </div>
            <span style={D.panelBadge}>{activeLeaves.length + pendingLeaves.length}</span>
          </div>

          {activeLeaves.length === 0 && pendingLeaves.length === 0 ? (
            <div style={D.emptyState}>
              <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
              <div>No leave requests yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeLeaves.map((l) => (
                <div key={l.id} className="sdash-leave-card" style={D.leaveCard}>
                  <div>
                    <p style={D.leaveReason}>{l.reason}</p>
                    <small style={{ color: "var(--text-muted)" }}>Approved request</small>
                  </div>
                  <span style={{ ...D.badge, background: "var(--success-tint)", color: "var(--success)" }}>
                    <CheckCircle2 size={13} /> Approved
                  </span>
                </div>
              ))}

              {pendingLeaves.map((l) => (
                <div key={l.id} className="sdash-leave-card" style={D.leaveCard}>
                  <div>
                    <p style={D.leaveReason}>{l.reason}</p>
                    <small style={{ color: "var(--text-muted)" }}>Waiting approval</small>
                  </div>
                  <span style={{ ...D.badge, background: "var(--warning-tint)", color: "var(--warning)" }}>
                    <Clock size={13} /> Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Meal Card */}
        <section style={D.panel} aria-label="Meal card">
          <div style={D.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Utensils size={17} color="var(--text-secondary)" />
              <h3 style={D.panelTitle}>Meal Card</h3>
            </div>
          </div>

          {!mealCard ? (
            <div style={D.emptyState}>
              <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
              <div>No meal card assigned</div>
            </div>
          ) : (
            <div className="sdash-meal-wrap" style={D.mealWrap}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ ...D.badge, background: "var(--primary-tint)", color: "var(--primary)" }}>
                    {mealCard.status}
                  </span>
                  <span style={{ ...D.badge, background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {mealCard.meals_remaining} remaining
                  </span>
                </div>

                <p style={D.mealLine}><b>Start:</b> {createdDate.toDateString()}</p>
                <p style={D.mealLine}><b>Expiry:</b> {expiryDate.toDateString()}</p>
                <p style={D.mealLine}><b>Last Meal:</b> {lastMeal}</p>
              </div>

              <div className="sdash-qr-box" style={D.qrBox}>
                <div style={D.qrInner}>
                  <QRCode
                    value={JSON.stringify({
                      id: studentId,
                      name: user.name,
                      status: mealCard.status,
                    })}
                    size={90}
                  />
                </div>
                <small style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.04em" }}>SECURE ID</small>
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

/* ════════════════════════════════
   STYLES — mirrors the admin
   Dashboard's "D" token object
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

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
    flexWrap: "wrap",
    gap: 14,
  },
  pageTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "4px 0 0", fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 },
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },
  panelBadge: {
    background: "var(--primary-tint)",
    color: "var(--primary)",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
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

  /* ── two col ── */
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  /* ── leave list ── */
  leaveCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: "var(--radius-sm)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    gap: 10,
  },
  leaveReason: { margin: 0, fontWeight: 700, color: "var(--text)", fontSize: 13.5 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  /* ── meal card ── */
  mealWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  mealLine: { margin: "0 0 6px", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },
  qrBox: {
    textAlign: "center",
    padding: 12,
    borderRadius: "var(--radius-sm)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  qrInner: {
    background: "#fff",
    padding: 8,
    borderRadius: 8,
  },
};