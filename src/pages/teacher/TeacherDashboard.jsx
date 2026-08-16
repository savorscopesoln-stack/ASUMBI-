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

/* ================= SYSTEM THEME CONFIG ================= */
const theme = {
  primary: "#9f1239", // Deep Crimson
  primaryHover: "#e11d48",
  accent: "#fbbf24",  // Amber
  danger: "#f43f5e",
  surface: "#0f172a", // Dark Slate Blue-Gray
  border: "rgba(255, 255, 255, 0.06)"
};

/* ================= MAIN MODULE ================= */
export default function TeacherReports() {
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
            className="premium-action-btn"
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
        <KPI label="Average Score" value={`${analytics.avg}%`} color="#3b82f6" />
        <KPI label="Highest Grade" value={`${analytics.highest}%`} color="#10b981" />
        <KPI label="Lowest Mark" value={`${analytics.lowest}%`} color="#f43f5e" />
        <KPI label="Pass Vector" value={`${analytics.passRate}%`} color="#fbbf24" />
        <KPI label="Roster Total" value={analytics.total} color="#8b5cf6" />
      </div>

      {/* DATAVIZ VECTOR MAP BLOCK */}
      <div style={styles.layoutSplits}>
        <div style={{ ...styles.card, flex: 2 }}>
          <h3 style={styles.cardTitle}>Distribution Metrics</h3>
          {chartData.length === 0 ? (
            <div style={styles.emptyChartBlock}>Awaiting specific structural metric updates.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#0b0f19", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}
                  labelStyle={{ color: "#ffffff", fontWeight: 600, fontSize: 12 }}
                  itemStyle={{ color: "#cbd5e1", fontSize: 12 }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={28}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={theme.primary} className="bar-hover-cell" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* TOP PERFORMERS ROSTER MINI LIST */}
        <div style={{ ...styles.card, flex: 1.2 }}>
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
    <div style={styles.kpi}>
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
        <span style={{ ...styles.gradeTag, color: grade === "Fail" ? "#f43f5e" : "#10b981" }}>{grade}</span>
      </div>
    </div>
  );
}

/* ================= APPLICATION UI STYLES ================= */
const styles = {
  page: {
    padding: "0px 10px 40px 10px",
    background: "transparent",
    color: "#f1f5f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 24,
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16,
  },

  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#ffffff",
  },

  pageSubtitle: {
    margin: "6px 0 0 0",
    fontSize: 13.5,
    color: "#94a3b8",
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
    background: "#0f172a",
    color: "#f8fafc",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "11px 16px",
    borderRadius: 8,
    fontSize: 13.5,
    outline: "none",
    cursor: "pointer",
    minWidth: 160,
  },

  btn: {
    background: theme.primary,
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: "11px 20px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 28,
  },

  kpi: {
    background: "rgba(255,255,255,0.01)",
    border: `1px solid ${theme.border}`,
    padding: "16px 20px",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  kpiLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#64748b",
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
    fontWeight: 700,
    color: "#ffffff",
  },

  kpiPulse: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },

  layoutSplits: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
  },

  card: {
    background: "rgba(255,255,255,0.01)",
    border: `1px solid ${theme.border}`,
    padding: 24,
    borderRadius: 14,
    minWidth: 300,
  },

  cardTitle: {
    margin: "0 0 20px 0",
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#cbd5e1",
    letterSpacing: "0.04em",
  },

  emptyChartBlock: {
    height: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#475569",
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
    padding: "12px 14px",
    background: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.03)",
    borderRadius: 8,
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
    background: "rgba(255,255,255,0.04)",
    color: "#94a3b8",
    width: 22,
    height: 22,
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  studentNameStr: {
    fontSize: 13.5,
    fontWeight: 500,
    color: "#e2e8f0",
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
    color: "#ffffff",
    fontWeight: 600,
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

/* ================= MASTER PRINT MANIFEST STYLING ================= */
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
    color: "#9f1239",
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
    background: ${theme.primaryHover} !important;
    box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2);
  }
  .premium-data-row:hover {
    background: rgba(255,255,255,0.02) !important;
    border-color: rgba(255,255,255,0.06) !important;
  }
  .bar-hover-cell {
    transition: opacity 0.15s ease;
  }
  .bar-hover-cell:hover {
    opacity: 0.85;
  }
`;