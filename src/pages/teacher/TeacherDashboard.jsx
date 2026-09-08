import React, { useEffect, useMemo, useState, useRef } from "react";
import API from "../../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell
} from "recharts";

/* ================= GRADE CONFIGURATION ================= */
const getGrade = (score) => {
  if (score >= 80) return "Distinction";
  if (score >= 60) return "Credit";
  if (score >= 40) return "Pass";
  return "Fail";
};

/* ─── design-token stylesheet ───
   Copied verbatim from Dashboard.jsx (same id guard — if the user
   already visited /dashboard this is a no-op and both pages share
   one injected <style>). This is what makes this page's colors
   actually match Dashboard instead of the old standalone dark
   "crimson slate" palette. */
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

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }
    .dash-btn-secondary:hover { background: var(--bg) !important; }

    button:focus-visible, a:focus-visible, select:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ================= MAIN MODULE ================= */
export default function TeacherReports() {
  injectStyles();

  const [assessmentId, setAssessmentId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const reportRef = useRef();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const teacherSubject = user.subject || "";

  /* ================= LOAD SEED INDICES ================= */
  useEffect(() => {
    (async () => {
      try {
        const [a, sub, s] = await Promise.all([
          API.get("/assessments"),
          API.get("/subjects"),
          API.get("/students"),
        ]);
        setAssessments(a.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
      } catch (err) {
        console.error("Error booting report metadata arrays:", err);
      }
    })();
  }, []);

  /* ================= LOAD TARGET RECORDS ================= */
  useEffect(() => {
    if (!assessmentId) {
      setMarks([]);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/marks/${assessmentId}`);
        setMarks(res.data || []);
      } catch (err) {
        console.error("Error gathering mark indexes:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [assessmentId]);

  /* ================= SUBJECT PARSING METRICS ================= */
  const activeSubject = selectedSubject || teacherSubject;

  const subjectObj = useMemo(
    () => subjects.find((s) => s.name === activeSubject),
    [subjects, activeSubject]
  );

  const subjectMarks = useMemo(() => {
    if (!subjectObj) return [];
    return marks.filter(
      (m) => String(m.subjectId) === String(subjectObj.id)
    );
  }, [marks, subjectObj]);

  /* ================= COMPILE TRANSACTIONS ================= */
  const reports = useMemo(() => {
    const map = {};

    subjectMarks.forEach((m) => {
      if (!map[m.studentId]) map[m.studentId] = [];
      map[m.studentId].push(m);
    });

    return Object.keys(map).map((id) => {
      const scores = map[id];
      const avg = Math.round(
        scores.reduce((a, b) => a + Number(b.score), 0) / (scores.length || 1)
      );

      const student = students.find((s) => String(s.id) === String(id)) || {};

      return {
        student,
        avg,
        grade: getGrade(avg),
      };
    });
  }, [subjectMarks, students]);

  /* ================= SYSTEM DATA CORES ================= */
  const analytics = useMemo(() => {
    if (!reports.length)
      return { avg: 0, highest: 0, lowest: 0, total: 0, passRate: 0 };

    const scores = reports.map((r) => r.avg);

    return {
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      total: reports.length,
      passRate: Math.round(
        (reports.filter((r) => r.avg >= 40).length / reports.length) * 100
      ),
    };
  }, [reports]);

  /* ================= CHART LOGISTIC DATA ================= */
  const chartData = useMemo(() => {
    return reports.map((r) => ({
      name: r.student?.name || "Unknown",
      score: r.avg,
    }));
  }, [reports]);

  /* ================= COMPREHENSIVE PDF RENDER ENGINE ================= */
  const printReport = async () => {
    try {
      setIsPrinting(true);
      // Brief DOM yield execution to render accurate calculations
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2.5,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${activeSubject.toUpperCase()}_OFFICIAL_REPORT.pdf`);
    } catch (err) {
      console.error("Critical fault executing transcript export logic:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{customEngineStyles}</style>

      {/* DASHBOARD TOP HEADER BAR */}
      <div style={styles.hero}>
        <div>
          <h2 style={styles.pageTitle}>Performance Analytics</h2>
          <p style={styles.pageSubtitle}>Review examination metrics, grade indexes, and generated student reports.</p>
        </div>

        <div style={styles.actions}>
          <div style={styles.selectContainer}>
            <select
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              style={styles.select}
            >
              <option value="">Choose Assessment</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div style={styles.selectContainer}>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={styles.select}
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={printReport} 
            disabled={reports.length === 0 || isPrinting} 
            className="premium-action-btn dash-btn"
            style={{
              ...styles.btn, 
              opacity: (reports.length === 0 || isPrinting) ? 0.4 : 1,
              cursor: (reports.length === 0 || isPrinting) ? "not-allowed" : "pointer"
            }}
          >
            {isPrinting ? "Compiling PDF..." : "📥 Download Document"}
          </button>
        </div>
      </div>

      {/* ANALYTICS KPI SUMMARY ROW */}
      <div style={styles.grid}>
        <KPI label="Average Score" value={`${analytics.avg}%`} color="var(--info)" />
        <KPI label="Highest Grade" value={`${analytics.highest}%`} color="var(--success)" />
        <KPI label="Lowest Mark" value={`${analytics.lowest}%`} color="var(--destructive)" />
        <KPI label="Pass Vector" value={`${analytics.passRate}%`} color="var(--warning)" />
        <KPI label="Roster Total" value={analytics.total} color="var(--primary)" />
      </div>

      {/* DATAVIZ VECTOR MAP BLOCK */}
      <div style={styles.layoutSplits}>
        <div style={{ ...styles.card, flex: 2 }} className="dash-card">
          <h3 style={styles.cardTitle}>Distribution Metrics</h3>
          {chartData.length === 0 ? (
            <div style={styles.emptyChartBlock}>Awaiting specific structural metric updates.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)" }}
                  labelStyle={{ color: "var(--text)", fontWeight: 600, fontSize: 12 }}
                  itemStyle={{ color: "var(--text-secondary)", fontSize: 12 }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={28}>
                  {chartData.map((_, i) => (
                    <Cell key={i} style={{ fill: "var(--primary)" }} className="bar-hover-cell" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* TOP PERFORMERS ROSTER MINI LIST */}
        <div style={{ ...styles.card, flex: 1.2 }} className="dash-card">
          <h3 style={styles.cardTitle}>Roster Leadership Preview</h3>
          <div style={styles.rowContainerStack}>
            {reports.length === 0 ? (
              <div style={styles.emptyChartBlock}>No evaluations parsed.</div>
            ) : (
              reports.slice(0, 5).sort((x, y) => y.avg - x.avg).map((r, i) => (
                <Row key={i} rank={i + 1} name={r.student?.name} value={`${r.avg}%`} grade={r.grade} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ================= INVISIBLE COMPREHENSIVE REGISTRY OUTFLOW ================= */}
      <div style={printStyles.hiddenWrapper}>
        <div ref={reportRef} style={printStyles.page}>
          <div style={printStyles.watermark}>OFFICIAL MASTER COPY</div>

          <div style={printStyles.header}>
            <h2 style={printStyles.collegeTitle}>ASUMBI TEACHERS TRAINING COLLEGE</h2>
            <p style={printStyles.collegeMeta}>P.O. BOX 1 - 40301, ASUMBI, KENYA</p>
            <div style={printStyles.divider} />
            <h3 style={printStyles.reportTitle}>OFFICIAL INSTITUTIONAL PERFORMANCE LEGER</h3>
            <p style={printStyles.dateLabel}><b>Generated:</b> {new Date().toLocaleDateString("en-GB")}</p>
          </div>

          <div style={printStyles.metaGrid}>
            <div style={printStyles.metaItem}><b>Instructor:</b> {user.name || "System Admin"}</div>
            <div style={printStyles.metaItem}><b>Subject Domain:</b> {activeSubject}</div>
            <div style={printStyles.metaItem}><b>Roster Count:</b> {analytics.total} Registered Students</div>
            <div style={printStyles.metaItem}><b>Global Class Mean:</b> {analytics.avg}% Aggregate</div>
          </div>

          <table style={printStyles.table}>
            <thead>
              <tr>
                <th style={printStyles.th}>Idx</th>
                <th style={{ ...printStyles.th, textAlign: "left" }}>Student Identity Card</th>
                <th style={printStyles.th}>Score Index</th>
                <th style={printStyles.th}>System Grade</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i} style={{ pageBreakInside: "avoid" }}>
                  <td style={printStyles.td}>{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ ...printStyles.td, textAlign: "left", fontWeight: "600" }}>{r.student?.name || "Unknown Identity"}</td>
                  <td style={{ ...printStyles.td, fontFamily: "monospace" }}>{r.avg}%</td>
                  <td style={{ ...printStyles.td, fontWeight: "600" }}>{r.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={printStyles.signatures}>
            <div style={printStyles.sigBlock}>
              <div style={printStyles.sigLine} />
              <p style={printStyles.sigTitle}>Department Course Instructor</p>
            </div>
            <div style={printStyles.sigBlock}>
              <div style={printStyles.sigLine} />
              <p style={printStyles.sigTitle}>Head of Department (HOD)</p>
            </div>
            <div style={printStyles.sigBlock}>
              <div style={printStyles.sigLine} />
              <p style={printStyles.sigTitle}>College Registrar Office</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT EXTRACTIONS ================= */
function KPI({ label, value, color }) {
  return (
    <div style={styles.kpi} className="dash-card">
      <span style={styles.kpiLabel}>{label}</span>
      <div style={styles.kpiValueRow}>
        <h2 style={styles.kpiVal}>{value}</h2>
        <span style={{ ...styles.kpiPulse, background: color }} />
      </div>
    </div>
  );
}

function Row({ rank, name, value, grade }) {
  return (
    <div style={styles.row} className="premium-data-row">
      <div style={styles.rowLeftGroup}>
        <span style={styles.rankBadge}>{rank}</span>
        <span style={styles.studentNameStr}>{name}</span>
      </div>
      <div style={styles.rowRightGroup}>
        <span style={styles.scoreText}>{value}</span>
        <span style={{ ...styles.gradeTag, color: grade === "Fail" ? "var(--destructive)" : "var(--success)" }}>{grade}</span>
      </div>
    </div>
  );
}

/* =========================================================
   APPLICATION UI STYLES — reads Dashboard.jsx's CSS variables
   directly, so this page matches its light background, white
   cards, borders, and maroon accent exactly (and stays in sync
   if [data-theme='dark'] is toggled).
========================================================= */
const styles = {
  page: {
    padding: "0px 10px 40px 10px",
    background: "transparent",
    color: "var(--text)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 22,
    borderBottom: "1px solid var(--border)",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 16,
  },

  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "var(--text)",
  },

  pageSubtitle: {
    margin: "5px 0 0 0",
    fontSize: 13.5,
    color: "var(--text-secondary)",
    fontWeight: 500,
  },

  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  selectContainer: {
    position: "relative",
  },

  select: {
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "9px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
    minWidth: 160,
    minHeight: 38,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  btn: {
    background: "var(--primary)",
    color: "#ffffff",
    border: "1px solid var(--primary)",
    padding: "9px 18px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    minHeight: 38,
    boxSizing: "border-box",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 26,
  },

  kpi: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: "16px 18px",
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "var(--shadow-sm)",
  },

  kpiLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
  },

  kpiValueRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  kpiVal: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "var(--text)",
  },

  kpiPulse: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },

  layoutSplits: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
  },

  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: 22,
    borderRadius: "var(--radius)",
    minWidth: 300,
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow 0.15s ease",
  },

  cardTitle: {
    margin: "0 0 18px 0",
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
  },

  emptyChartBlock: {
    height: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    fontSize: 13.5,
  },

  rowContainerStack: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "11px 14px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s ease",
  },

  rowLeftGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },

  rankBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 22,
    height: 22,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  studentNameStr: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  rowRightGroup: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  scoreText: {
    fontSize: 13.5,
    fontFamily: "monospace",
    color: "var(--text)",
    fontWeight: 700,
  },

  gradeTag: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    width: 75,
    textAlign: "right",
  },
};

/* =========================================================
   MASTER PRINT MANIFEST STYLING — kept as a standalone white
   printed document (that's the point of an official PDF report,
   regardless of the app's light/dark theme), just recolored to
   the Dashboard's actual maroon (#8B1E2D) instead of the old
   unrelated crimson (#9f1239) so the brand is consistent.
========================================================= */
const printStyles = {
  hiddenWrapper: {
    position: "absolute",
    left: "-9999px",
    top: 0,
    width: "210mm",
  },

  page: {
    background: "#ffffff",
    color: "#0f172a",
    padding: "25mm 20mm",
    boxSizing: "border-box",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    position: "relative",
  },

  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-35deg)",
    fontSize: "76pt",
    fontWeight: "900",
    color: "#f1f5f9",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 0,
  },

  header: {
    textAlign: "center",
    position: "relative",
    zIndex: 1,
    marginBottom: "24px",
  },

  collegeTitle: {
    fontSize: "20pt",
    fontWeight: "800",
    margin: "0 0 6px 0",
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },

  collegeMeta: {
    fontSize: "10pt",
    color: "#475569",
    margin: 0,
    fontWeight: "500",
  },

  divider: {
    height: "2px",
    background: "#0f172a",
    margin: "18px 0 16px 0",
  },

  reportTitle: {
    fontSize: "12pt",
    fontWeight: "700",
    letterSpacing: "0.06em",
    margin: "0 0 6px 0",
    color: "#8B1E2D",
  },

  dateLabel: {
    fontSize: "9.5pt",
    margin: 0,
    color: "#475569",
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    background: "#f8fafc",
    padding: "14px 18px",
    borderRadius: "6px",
    marginBottom: "24px",
    fontSize: "10pt",
    position: "relative",
    zIndex: 1,
    border: "1px solid #e2e8f0",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    position: "relative",
    zIndex: 1,
    marginBottom: "40px",
  },

  th: {
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 14px",
    fontSize: "9.5pt",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "center",
  },

  td: {
    padding: "11px 14px",
    fontSize: "10pt",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    textAlign: "center",
  },

  signatures: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "60px",
    position: "relative",
    zIndex: 1,
  },

  sigBlock: {
    width: "52mm",
    textAlign: "center",
  },

  sigLine: {
    height: "1px",
    background: "#94a3b8",
    marginBottom: "8px",
  },

  sigTitle: {
    fontSize: "9pt",
    color: "#475569",
    margin: 0,
    fontWeight: "600",
  }
};

/* Micro structural stylesheet injects */
const customEngineStyles = `
  .premium-action-btn:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 4px 12px rgba(139, 30, 45, 0.25);
  }
  .premium-data-row:hover {
    background: var(--primary-tint) !important;
    border-color: var(--primary) !important;
  }
  .bar-hover-cell {
    transition: opacity 0.15s ease;
  }
  .bar-hover-cell:hover {
    opacity: 0.85;
  }
`;