import React, { useEffect, useMemo, useState, useRef } from "react";
import API from "../../api";
import html2canvas from "html2canvas";
import QRCode from "react-qr-code";
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

/* ================= GRADE ================= */
const getGrade = (score) => {
  if (score >= 80) return "Distinction";
  if (score >= 60) return "Credit";
  if (score >= 40) return "Pass";
  return "Fail";
};

/* ================= THEME TOKENS ================= */
const theme = {
  primary: "#7f1d1d", // maroon
  accent: "#f59e0b",
  danger: "#ef4444",
  glass: "rgba(255,255,255,0.06)",
};

/* ================= MAIN ================= */
export default function TeacherReports() {
  const [assessmentId, setAssessmentId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(""); // ✅ NEW
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const teacherSubject = user.subject;

 /* ================= LOAD ================= */
useEffect(() => {
  (async () => {
    const [a, sub, s] = await Promise.all([
      API.get("/assessments"),
      API.get("/subjects"),
      API.get("/students"),
    ]);

    setAssessments(a.data || []);
    setSubjects(sub.data || []);   // ✅ FIXED
    setStudents(s.data || []);     // ✅ FIXED
  })();
}, []);

/* ================= LOAD MARKS ================= */
useEffect(() => {
  if (!assessmentId) return setMarks([]);

  const load = async () => {
    setLoading(true);
    const res = await API.get(`/marks/${assessmentId}`);
    setMarks(res.data || []);
    setLoading(false);
  };

  load();
}, [assessmentId]);

/* ================= ACTIVE SUBJECT ================= */
const activeSubject = useMemo(() => {
  return selectedSubject || teacherSubject;
}, [selectedSubject, teacherSubject]);

const subjectObj = useMemo(() => {
  return subjects.find((s) => s.name === activeSubject);
}, [subjects, activeSubject]);

/* ================= FILTER MARKS BY SUBJECT ================= */
const subjectMarks = useMemo(() => {
  if (!subjectObj) return [];

  return marks.filter((m) =>
    String(m.subjectId) === String(subjectObj.id) // ✅ safer compare
  );
}, [marks, subjectObj]);

/* ================= REPORTS ================= */
const reports = useMemo(() => {
  const map = {};

  subjectMarks.forEach((m) => {
    if (!map[m.studentId]) map[m.studentId] = [];
    map[m.studentId].push(m);
  });

  return Object.keys(map).map((id) => {
    const scores = map[id];

    const total = scores.reduce((s, m) => s + Number(m.score || 0), 0);
    const avg = Math.round(total / (scores.length || 1));

    const student =
      students.find((s) => String(s.id) === String(id)) ||
      students.find((s) => String(s._id) === String(id)); // ✅ fallback safe

    return {
      student,
      avg,
      grade: getGrade(avg),
    };
  });
}, [subjectMarks, students]);

/* ================= ANALYTICS ================= */
const analytics = useMemo(() => {
  if (!reports.length) return {};

  const avg =
    reports.reduce((a, b) => a + b.avg, 0) / reports.length;

  return {
    avg: Math.round(avg),
    highest: Math.max(...reports.map((r) => r.avg)),
    lowest: Math.min(...reports.map((r) => r.avg)),
    total: reports.length,
    passRate: Math.round(
      (reports.filter((r) => r.avg >= 40).length / reports.length) * 100
    ),
  };
}, [reports]);

/* ================= INSIGHTS ================= */
const insights = useMemo(() => {
  if (!reports.length) return [];

  const risk = reports.filter((r) => r.avg < 40).length;
  const top = reports.filter((r) => r.avg >= 75).length;

  return [
    risk > 0
      ? `⚠ ${risk} students are at academic risk`
      : "All students are performing above pass level",

    top > 0
      ? `🏆 ${top} high-performing students detected`
      : "No outstanding top performers yet",

    analytics.passRate > 70
      ? "📈 Strong overall class performance"
      : "📉 Class needs intervention support",
  ];
}, [reports, analytics]);
  /* ================= CHART ================= */
  const subjectStats = useMemo(() => {
    if (!subjectObj) return [];

    const avg =
      subjectMarks.reduce((s, m) => s + Number(m.score), 0) /
      (subjectMarks.length || 1);

    return [{ name: subjectObj.name, avg: Math.round(avg) }];
  }, [subjectMarks, subjectObj]);

  /* ================= PDF ================= */
  const printReport = async () => {
    const canvas = await html2canvas(reportRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
    pdf.save(`${activeSubject}_OFFICIAL_REPORT.pdf`);
  };

  /* ================= UI ================= */
  return (
    <div style={styles.page}>

      {/* HERO */}
      <div style={styles.hero}>
        <div>
          <h1>🏫 School ERP Analytics</h1>
          <p>{activeSubject} • Ministry-Grade Performance System</p>
        </div>

        <div style={styles.actions}>

          {/* ASSESSMENT */}
          <select
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            style={styles.select}
          >
            <option value="">Select Assessment</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* SUBJECT FILTER (NEW) */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={styles.select}
          >
            <option value="">Teacher Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <button onClick={printReport} style={styles.button}>
            Generate Official Report
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={styles.kpiGrid}>
        <KPI title="Average" value={analytics.avg} />
        <KPI title="Pass Rate" value={`${analytics.passRate || 0}%`} />
        <KPI title="Highest" value={analytics.highest} />
        <KPI title="Lowest" value={analytics.lowest} />
      </div>

      {/* INSIGHTS */}
      <div style={styles.glassCard}>
        <h3>🧠 AI Academic Insights</h3>
        {insights.map((i, idx) => (
          <p key={idx} style={{ opacity: 0.85 }}>{i}</p>
        ))}
      </div>

      {/* CHART */}
      <div style={styles.glassCard}>
        <h3>📊 Performance Analytics</h3>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={subjectStats}>
            <XAxis dataKey="name" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
              {subjectStats.map((_, i) => (
                <Cell key={i} fill={theme.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABLE */}
      <div style={styles.grid}>
        <div style={styles.glassCard}>
          <h3>🏆 Top Performers</h3>
          {reports.sort((a, b) => b.avg - a.avg).slice(0, 5).map((r, i) => (
            <Row key={i} name={r.student?.name} value={r.avg} />
          ))}
        </div>

        <div style={styles.glassCard}>
          <h3>⚠ At Risk</h3>
          {reports.filter(r => r.avg < 40).map((r, i) => (
            <Row key={i} name={r.student?.name} value={r.avg} danger />
          ))}
        </div>
      </div>

      {/* ================= REPORT ================= */}
{/* ================= REPORT ================= */}
<div ref={reportRef} style={printStyles.page}>

  {/* WATERMARK */}
  <div style={printStyles.watermark}>ASUMBI TTC OFFICIAL</div>

  {/* ================= HEADER ================= */}
  <div style={printStyles.header}>

    <div style={printStyles.logoRow}>
      <div style={printStyles.logoCircle}>🎓</div>

      <div>
        <h1 style={printStyles.title}>
          ASUMBI TEACHERS TRAINING COLLEGE
        </h1>

        <p style={printStyles.subtitle}>
          P.O BOX XXX - KENYA | TEL: 07XX XXX XXX | EMAIL: info@asumbi.ac.ke
        </p>

        <h3 style={printStyles.reportTitle}>
          TEACHER OFFICIAL PERFORMANCE REPORT
        </h3>
      </div>
    </div>

    <hr style={printStyles.hr} />
  </div>

  {/* ================= REPORT META ================= */}
  <div style={printStyles.metaGrid}>

    <div><b>Teacher Name:</b> {user.name}</div>
    <div><b>Subject:</b> {activeSubject}</div>
    <div><b>Assessment:</b> {assessmentId || "N/A"}</div>
    <div><b>Total Students:</b> {analytics.total}</div>
    <div><b>Average Score:</b> {analytics.avg}%</div>
    <div><b>Highest:</b> {analytics.highest}</div>
    <div><b>Lowest:</b> {analytics.lowest}</div>
    <div><b>Pass Rate:</b> {analytics.passRate || 0}%</div>

  </div>

  {/* ================= PERFORMANCE SUMMARY ================= */}
  <div style={printStyles.summaryBox}>

    <div style={printStyles.summaryCard}>
      <h4>Class Performance</h4>
      <h2>{analytics.avg}%</h2>
    </div>

    <div style={printStyles.summaryCard}>
      <h4>Students</h4>
      <h2>{analytics.total}</h2>
    </div>

    <div style={printStyles.summaryCard}>
      <h4>Pass Rate</h4>
      <h2>{analytics.passRate || 0}%</h2>
    </div>

    <div style={printStyles.summaryCard}>
      <h4>Grade</h4>
      <h2>{getGrade(analytics.avg)}</h2>
    </div>

  </div>

  {/* ================= TABLE ================= */}
  <div style={printStyles.tableWrap}>

    <table style={printStyles.table}>

      <thead>
        <tr>
          <th>#</th>
          <th>Student Name</th>
          <th>Score</th>
          <th>Grade</th>
        </tr>
      </thead>

      <tbody>
        {reports.map((r, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{r.student?.name}</td>
            <td>{r.avg}</td>
            <td>{r.grade}</td>
          </tr>
        ))}
      </tbody>

    </table>
  </div>

  {/* ================= GRADING LEGEND ================= */}
  <div style={printStyles.legend}>
    <h4>Grading Key</h4>
    <p>80+ Distinction | 60-79 Credit | 40-59 Pass | Below 40 Fail</p>
  </div>

  {/* ================= SIGNATURES ================= */}
  <div style={printStyles.signatures}>

    <div style={printStyles.signBlock}>
      <div style={printStyles.line}></div>
      <p>Class Teacher</p>
    </div>

    <div style={printStyles.signBlock}>
      <div style={printStyles.line}></div>
      <p>Head of Department</p>
    </div>

    <div style={printStyles.signBlock}>
      <div style={printStyles.line}></div>
      <p>Principal</p>
    </div>

  </div>

  {/* ================= QR ================= */}
  <div style={printStyles.qr}>
    <QRCode
      value={JSON.stringify({
        teacher: user.name,
        subject: activeSubject,
        avg: analytics.avg,
        students: analytics.total
      })}
      size={120}
    />
  </div>

</div>
    </div>
  );
}

/* ================= COMPONENTS ================= */
function KPI({ title, value }) {
  return (
    <div style={styles.kpi}>
      <h4>{title}</h4>
      <h2>{value || 0}</h2>
    </div>
  );
}

function Row({ name, value, danger }) {
  return (
    <div style={styles.row}>
      <span>{name}</span>
      <b style={{ color: danger ? theme.danger : "#fff" }}>{value}</b>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    background: "radial-gradient(circle at top,#1a0b0b,#000)",
    color: "#fff",
    fontFamily: "Poppins"
  },

  hero: { display: "flex", justifyContent: "space-between" },

  actions: { display: "flex", gap: 10 },

  select: {
    padding: 10,
    borderRadius: 10,
    background: "#111",
    color: "#fff",
    border: "1px solid #333"
  },

  button: {
    background: theme.primary,
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 10
  },
  summaryBox: {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 10,
  marginTop: 15,
},

summaryCard: {
  border: "1px solid #ddd",
  padding: 10,
  textAlign: "center",
  borderRadius: 6,
  background: "#f8fafc",
},

tableWrap: {
  marginTop: 15,
},

legend: {
  marginTop: 15,
  fontSize: 12,
  borderTop: "1px solid #ccc",
  paddingTop: 10,
},

qr: {
  marginTop: 20,
  display: "flex",
  justifyContent: "center",
},

  kpi: {
    background: "rgba(255,255,255,0.06)",
    padding: 16,
    borderRadius: 16
  },

  glassCard: {
    marginTop: 15,
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(12px)"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: 10
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 8
  }
};

const printStyles = {
  page: {
    background: "#fff",
    color: "#000",
    padding: 40,
    position: "relative",
    overflow: "hidden",
    fontFamily: "Times New Roman",
  },

  /* ================= WATERMARK (FIXED) ================= */
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 90,
    fontWeight: 700,
    color: "#000",
    opacity: 0.06,
    zIndex: 0,
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },

  /* ================= CONTENT LAYER ================= */
  content: {
    position: "relative",
    zIndex: 1,
  },

  /* ================= HEADER ================= */
  header: {
    textAlign: "center",
    marginBottom: 20,
    borderBottom: "2px solid #000",
  },

  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    marginBottom: 10,
  },

  logoBox: {
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoCircle: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    background: "#0b3d91",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: "bold",
  },

  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: "bold",
  },

  subtitle: {
    margin: 0,
    fontSize: 11,
    opacity: 0.8,
  },

  reportTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  date: {
    fontSize: 12,
    marginTop: 5,
  },

  hr: {
    border: "1px solid #000",
    marginTop: 10,
  },

  /* ================= STAMP ================= */
  stamp: {
    position: "absolute",
    right: 40,
    top: 160,
    border: "2px dashed #000",
    borderRadius: 8,
    padding: 10,
    fontSize: 10,
    textAlign: "center",
    opacity: 0.6,
  },

  /* ================= META ================= */
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    fontSize: 12,
    marginBottom: 15,
  },

  /* ================= TABLE ================= */
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },

  /* ================= SIGNATURES ================= */
  signatures: {
    marginTop: 50,
    display: "flex",
    justifyContent: "space-between",
  },

  signBlock: {
    textAlign: "center",
    width: "30%",
  },

  line: {
    borderTop: "1px solid #000",
    marginBottom: 5,
  },

  meta: { fontSize: 12, marginTop: 10 },

  signature: { marginTop: 40, textAlign: "center" }
};