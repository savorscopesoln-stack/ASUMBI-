import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../api";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";



/* ================= DTE GRADING SYSTEM SWITCH ================= */
const GRADING_SYSTEMS = {
  DTE1: { total: 1900, referredLimit: 4 },
  DTE2: { total: 1700, referredLimit: 3 },
};

/* ================= GRADE SYSTEM (UNCHANGED) ================= */
const getKnecGrade = (score) => {
  if (score >= 80) return { grade: 1, label: "Distinction" };
  if (score >= 75) return { grade: 2, label: "Distinction" };
  if (score >= 70) return { grade: 3, label: "Credit" };
  if (score >= 60) return { grade: 4, label: "Credit" };
  if (score >= 50) return { grade: 5, label: "Pass" };
  if (score >= 40) return { grade: 6, label: "Pass" };
  return { grade: 7, label: "Fail" };
};

const getOverallResult = (avg) => {
  if (avg >= 75) return "DISTINCTION";
  if (avg >= 60) return "CREDIT";
  if (avg >= 40) return "PASS";
  return "REFERRED";
};

/* ================= OFFICIAL LETTERHEAD ================= */
const LetterHead = ({ mode }) => (
  <div style={styles.letterheadBox}>

    <div style={styles.letterheadInner}>

      {/* LEFT SIDE - INSTITUTION INFO */}
      <div style={styles.schoolBlock}>
        <h1 style={styles.schoolName}>
          ASUMBI TEACHERS TRAINING COLLEGE
        </h1>

        <h3 style={styles.subTitle}>
          DIPLOMA IN TEACHER EDUCATION (DTE)
        </h3>

        <p style={styles.subTitleSmall}>
          INTERNAL FORMATIVE ASSESSMENT REPORT (IFA) — 2026
        </p>

        <p style={styles.metaLine}>
          OFFICIAL ACADEMIC TRANSCRIPT SYSTEM
        </p>
      </div>

      {/* RIGHT SIDE - META INFO */}
      <div style={styles.letterMetaRight}>

        <div style={styles.dateBox}>
          <p><b>DATE OF ISSUE:</b></p>
          <span>{new Date().toLocaleDateString()}</span>
        </div>

        <div style={styles.modeBox}>
          <p><b>GRADING MODE</b></p>
          <span>{mode}</span>
        </div>

        

      </div>

    </div>

    

  </div>
  
);

/* ================= REMARK SYSTEM ================= */
const getRemark = (score) => {
  if (score >= 80) return "Excellent Performance";
  if (score >= 70) return "Good Performance";
  if (score >= 60) return "Fair Performance";
  if (score >= 50) return "Weak Performance";
  return "Needs Improvement";
};

const COLORS = ["#16a34a", "#facc15", "#f97316", "#dc2626"];

export default function Reports() {
  const [printClass, setPrintClass] = useState("ALL");
  const [assessmentId, setAssessmentId] = useState("");
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);

  const [mode, setMode] = useState("DTE1");
  const [tab, setTab] = useState("dashboard");

  const reportRefs = useRef({});
  const meritRef = useRef();
  const allReportsRef = useRef();

  const config = GRADING_SYSTEMS[mode];
  const classOptions = useMemo(() => {
  const set = new Set();

  students.forEach((s) => {
    if (s.studentClass) set.add(s.studentClass);
  });

  return ["ALL", ...Array.from(set)];
}, [students]);

  /* ================= LOAD ================= */
  useEffect(() => {
    (async () => {
      const [a, s, sub] = await Promise.all([
        API.get("/assessments"),
        API.get("/students"),
        API.get("/subjects"),
      ]);

      setAssessments(a.data || []);
      setStudents(s.data || []);
      setSubjects(sub.data || []);
    })();
  }, []);

  const load = async () => {
    if (!assessmentId) return;
    const res = await API.get(`/marks/${assessmentId}`);
    setMarks(res.data || []);
  };

  useEffect(() => {
    load();
  }, [assessmentId]);

  /* ================= MAP ================= */
  const studentMap = useMemo(() => {
    const m = {};
    students.forEach((s) => (m[s.id] = s));
    return m;
  }, [students]);

  /* ================= REPORTS (UNCHANGED LOGIC) ================= */
  const reports = useMemo(() => {
  const map = {};

  marks.forEach((m) => {
    if (!map[m.studentId]) map[m.studentId] = {};
    map[m.studentId][m.subjectId] = Number(m.score);
  });

  const list = Object.keys(map).map((studentId) => {
    const studentScores = map[studentId];

    let total = 0;
    let count = 0;

    const subjectBreakdown = subjects.map((sub) => {
      const score =
        studentScores[sub.id] !== undefined
          ? Number(studentScores[sub.id])
          : 0;

      total += score;
      count++;

      const grade = getKnecGrade(score);

      return {
        subject: sub.name,
        score,
        grade: grade.label,
        remark: getRemark(score),
      };
    });

    const avg = Math.round(total / (count || 1));

    return {
      studentId,
      student: studentMap[studentId],
      avg,
      subjects: subjectBreakdown,
      grade: getKnecGrade(avg),
      result: getOverallResult(avg),
    };
  });

  // 🔥 SORT BY PERFORMANCE (THIS FIXES EVERYTHING)
  return list.sort((a, b) => b.avg - a.avg);
}, [marks, students, subjects, studentMap]);

  /* ================= MERIT LIST ================= */
  const meritList = useMemo(() => {
    return [...reports]
      .sort((a, b) => b.avg - a.avg)
      .map((r, i) => ({
        ...r,
        position: i + 1,
        medal: i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "",
      }));
  }, [reports]);

  /* ================= ANALYTICS ================= */
  const analytics = useMemo(() => {
    if (!meritList.length) return {};

    const avg =
      meritList.reduce((a, b) => a + b.avg, 0) / meritList.length;

    const pass = meritList.filter((s) => s.avg >= 40).length;

    return {
      avg: Math.round(avg),
      highest: Math.max(...meritList.map((r) => r.avg)),
      lowest: Math.min(...meritList.map((r) => r.avg)),
      total: meritList.length,
      passRate: Math.round((pass / meritList.length) * 100),
    };
  }, [meritList]);

  /* ================= DISTRIBUTION CHART ================= */
  const distribution = useMemo(() => {
    return [
      { name: "Distinction", value: meritList.filter(s => s.avg >= 75).length },
      { name: "Credit", value: meritList.filter(s => s.avg >= 60 && s.avg < 75).length },
      { name: "Pass", value: meritList.filter(s => s.avg >= 40 && s.avg < 60).length },
      { name: "Fail", value: meritList.filter(s => s.avg < 40).length },
    ];
  }, [meritList]);


const printPDF = async (ref, name) => {
  const element = ref.current;

  if (!element) return;

  // 🔥 Backup original styles
  const originalStyle = element.style.cssText;

  // 🔥 FORCE A4 LAYOUT BEFORE CAPTURE
  element.style.width = "210mm";
  element.style.minHeight = "297mm";
  element.style.padding = "15mm";
  element.style.boxSizing = "border-box";
  element.style.background = "#ffffff";

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  // 🔥 Restore original styles
  element.style.cssText = originalStyle;

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  // 🔥 FULL PAGE (NO MARGINS, NO CENTERING)
  pdf.addImage(imgData, "PNG", 0, 0, 210, 297);

  pdf.save(name);
};
/* ================= MASTER PRINT (CLASS FILTER + EXACT A4 MARGINS) ================= */
const printAllReports = async () => {
  const pdf = new jsPDF("p", "mm", "a4");

  const filteredReports =
    printClass === "ALL"
      ? reports
      : reports.filter((r) => r.student?.studentClass === printClass);

  for (let i = 0; i < filteredReports.length; i++) {
    const r = filteredReports[i];
    const el = reportRefs.current[r.studentId];
    if (!el) continue;

    // 🔥 Backup styles
    const originalStyle = el.style.cssText;

    // 🔥 FORCE A4 LAYOUT
    el.style.width = "210mm";
    el.style.minHeight = "297mm";
    el.style.padding = "15mm";
    el.style.boxSizing = "border-box";
    el.style.background = "#ffffff";

    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // 🔥 Restore styles
    el.style.cssText = originalStyle;

    const imgData = canvas.toDataURL("image/png");

    if (i !== 0) pdf.addPage();

    // 🔥 FULL PAGE FIT
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
  }

  pdf.save(
    printClass === "ALL"
      ? "ALL_STUDENT_REPORTS.pdf"
      : `${printClass}_REPORTS.pdf`
  );
};
  /* ================= UI ================= */
  return (
    <div style={styles.page}>

      {/* TOPBAR */}
      <div style={styles.topbar}>
        <h2>📘 ASUMBI TTC EXAM SYSTEM</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
            <option value="">Select Assessment</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <button onClick={() => setMode("DTE1")}>DTE1</button>
          <button onClick={() => setMode("DTE2")}>DTE2</button>
        </div>
      </div>

      {/* NAV */}
      <div style={styles.nav}>
        <button onClick={() => setTab("dashboard")}>Dashboard</button>
        <button onClick={() => setTab("merit")}>Merit</button>
        <button onClick={() => setTab("reports")}>Reports</button>
      </div>
{/* ================= DASHBOARD ================= */}
{tab === "dashboard" && (
  <div
    style={{
      ...styles.dashboardWrapper,
      paddingLeft: 28,
      paddingRight: 20,
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      background: "#ffffff"
    }}
  >

    {/* ================= HEADER ================= */}
    <div style={styles.dashboardHeader}>
      <div>
        <h2 style={styles.pageTitle}>
          Academic Performance Dashboard
        </h2>
        <p style={styles.pageSubTitle}>
          ASUMBI TTC • Examination & Results Analysis System
        </p>
      </div>
    </div>

    {/* ================= KPI STRIP ================= */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 10
      }}
    >
      {[
        ["Students", analytics.total],
        ["Average", analytics.avg],
        ["Pass Rate", `${analytics.passRate}%`],
        ["Highest", analytics.highest],
        ["Lowest", analytics.lowest]
      ].map(([label, value], i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "10px 12px",
            border: "1px solid #eee",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: "#000000" }}>
            {label}
          </p>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, color: "#7f1d1d" }}>
            {value}
          </h2>
        </div>
      ))}
    </div>

    {/* ================= MAIN GRID ================= */}
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: 12,
        minHeight: 0
      }}
    >{/* ================= LEFT COLUMN ================= */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 12
  }}
>

  {/* ================= PERFORMANCE OVERVIEW ================= */}
  <div
    style={{
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #eee"
    }}
  >
    <h4 style={{ marginBottom: 10, color: "#7f1d1d" }}>
      Academic Performance Intelligence
    </h4>

    {!assessmentId ? (
      <p style={{ color: "#6b7280" }}>
        Select an assessment to view analytics
      </p>
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12
        }}
      >

        {/* ================= SUBJECT PERFORMANCE ================= */}
        <div style={{ height: 220 }}>
          <h5 style={{ margin: "0 0 6px", color: "#111827" }}>
            Subject Performance
          </h5>

          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={subjects.map((sub) => {
                const avg =
                  reports.reduce((sum, r) => {
                    const s = r.subjects.find(x => x.subject === sub.name);
                    return sum + (s ? s.score : 0);
                  }, 0) / (reports.length || 1);

                return {
                  name: sub.name,
                  avg: Math.round(avg)
                };
              })}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg" fill="#7f1d1d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ================= CLASS PERFORMANCE ================= */}
        <div style={{ height: 220 }}>
          <h5 style={{ margin: "0 0 6px", color: "#111827" }}>
            Class Performance
          </h5>

          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={[
                {
                  name: "DTE1",
                  avg:
                    reports
                      .filter(r => r.student?.studentClass === "DTE1")
                      .reduce((s, r) => s + r.avg, 0) /
                    (reports.filter(r => r.student?.studentClass === "DTE1").length || 1)
                },
                {
                  name: "DTE2",
                  avg:
                    reports
                      .filter(r => r.student?.studentClass === "DTE2")
                      .reduce((s, r) => s + r.avg, 0) /
                    (reports.filter(r => r.student?.studentClass === "DTE2").length || 1)
                }
              ]}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    )}
  </div>

  {/* ================= GENERAL TREND ================= */}
  <div
    style={{
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #eee"
    }}
  >
    <h4 style={{ marginBottom: 10, color: "#7f1d1d" }}>
      General Performance Trend
    </h4>

    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={assessments.map((a) => {
            const related = marks.filter(m => m.assessmentId === a.id);

            const avg =
              related.reduce((s, m) => s + Number(m.score), 0) /
              (related.length || 1);

            return {
              name: a.name,
              avg: Math.round(avg)
            };
          })}
        >
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#16a34a"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* ================= STRENGTHS & WEAKNESSES ================= */}
  <div
    style={{
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #eee"
    }}
  >
    <h4 style={{ marginBottom: 10, color: "#7f1d1d" }}>
      Strengths & Weaknesses
    </h4>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10
      }}
    >

      {/* STRENGTHS */}
      <div
        style={{
          background: "#ecfdf5",
          padding: 10,
          borderRadius: 10,
          border: "1px solid #a7f3d0"
        }}
      >
        <h5 style={{ color: "#16a34a", margin: "0 0 6px" }}>
          Strengths
        </h5>

        {subjects
          .map(sub => {
            const avg =
              reports.reduce((sum, r) => {
                const s = r.subjects.find(x => x.subject === sub.name);
                return sum + (s ? s.score : 0);
              }, 0) / (reports.length || 1);

            return { name: sub.name, avg };
          })
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 3)
          .map((s, i) => (
            <p key={i} style={{ margin: 0, fontSize: 12 }}>
              ✔ {s.name} ({Math.round(s.avg)})
            </p>
          ))}
      </div>

      {/* WEAKNESSES */}
      <div
        style={{
          background: "#fef2f2",
          padding: 10,
          borderRadius: 10,
          border: "1px solid #fecaca"
        }}
      >
        <h5 style={{ color: "#dc2626", margin: "0 0 6px" }}>
          Weaknesses
        </h5>

        {subjects
          .map(sub => {
            const avg =
              reports.reduce((sum, r) => {
                const s = r.subjects.find(x => x.subject === sub.name);
                return sum + (s ? s.score : 0);
              }, 0) / (reports.length || 1);

            return { name: sub.name, avg };
          })
          .sort((a, b) => a.avg - b.avg)
          .slice(0, 3)
          .map((s, i) => (
            <p key={i} style={{ margin: 0, fontSize: 12 }}>
              ⚠ {s.name} ({Math.round(s.avg)})
            </p>
          ))}
      </div>

    </div>
  </div>
{/* ================= PRINTING CENTER ================= */}
<div
  style={{
    background: "#fff",
    borderRadius: 12,
    padding: 10,
    border: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    gap: 8
  }}
>
  <h4 style={{ marginBottom: 4, color: "#7f1d1d" }}>
    Printing Center
  </h4>

  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
    Generate official academic documents for exams, administration, and student reporting.
  </p>

  {/* ================= CLASS OPTIONS (DYNAMIC) ================= */}
  <div>
    <label style={{ fontSize: 11, color: "#374151" }}>
      Print per Class:
    </label>

    <select
      value={printClass}
      onChange={(e) => setPrintClass(e.target.value)}
      style={{
        width: "100%",
        padding: "8px",
        borderRadius: 8,
        border: "1px solid #ddd",
        fontSize: 12,
        marginTop: 4
      }}
    >
      {classOptions.map((cls) => (
        <option key={cls} value={cls}>
          {cls}
        </option>
      ))}
    </select>
  </div>

  {/* ================= BUTTON GRID ================= */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8
    }}
  >
    {/* MERIT LIST */}
    <button
      onClick={() => printMeritList()}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #7f1d1d",
        background: "#7f1d1d",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      🏆 Merit List
    </button>

    {/* TRANSCRIPTS */}
    <button
      onClick={() => printAllTranscripts()}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #0ea5e9",
        background: "#0ea5e9",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      📄 Transcripts
    </button>

    {/* INDIVIDUAL REPORT */}
    <button
      onClick={() => setTab("reports")}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #16a34a",
        background: "#16a34a",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      👤 Student Report
    </button>

    {/* CLASS PRINT */}
    <button
      onClick={() => printAllReports()}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #f59e0b",
        background: "#f59e0b",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      🏫 Print Class
    </button>
  </div>

  {/* ================= STATUS ================= */}
  <div
    style={{
      marginTop: 4,
      padding: 6,
      borderRadius: 6,
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
      fontSize: 11,
      color: "#374151"
    }}
  >
    📌 Printing:{" "}
    <b>
      {printClass === "ALL" ? "All Classes" : printClass}
    </b>{" "}
    • PDF generation enabled • Asumbi TTC Exam System
  </div>
</div>
</div>
      {/* ================= RIGHT COLUMN ================= */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 0,
          overflow: "hidden"
        }}
      >

        {/* HEATMAP */}
        <div
        
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 12,
            border: "1px solid #eee",
            flex: 1,
            overflow: "auto"
            
          }}
        >
          <h4 style={{ marginBottom: 8, color: "#7f1d1d" }}>
            Subject Heatmap
            
          </h4>
          

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {subjects.map((sub, i) => {
              const avg =
                reports.reduce((sum, r) => {
                  const s = r.subjects.find(x => x.subject === sub.name);
                  return sum + (s ? s.score : 0);
                }, 0) / (reports.length || 1);
                

              return (
                <div
                  key={i}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    color: "#680606",
                    fontSize: 12,
                    background:
                      avg >= 75 ? "#16a34a"
                      : avg >= 60 ? "#0ea5e9"
                      : avg >= 40 ? "#f59e0b"
                      : "#dc2626"
                  }}
                >
                  <b>{sub.name}</b>
                  <div>{Math.round(avg)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP STUDENTS */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 12,
            border: "1px solid #7a0f0f"
          }}
        >
          <h4 style={{ marginBottom: 8, color: "#000000", fontWeight: 700 }}>
  Top Students
</h4>

          {[...reports]
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5)
            .map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 8,
                  borderBottom: "1px solid #000000"
                }}
              >
                <span>{s.student?.name}</span>
                <b style={{ color: "#7f1d1d" }}>{s.avg}</b>
              </div>
            ))}
        </div>

        {/* ================= AT RISK ================= */}
<div
  style={{
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    border: "1px solid #eee"
  }}
>
  <h4 style={{ marginBottom: 8, color: "#820909" }}>
    At Risk
  </h4>

  {reports.filter(r => r.avg < 40).length === 0 ? (
    <p style={{ color: "#16a34a", fontWeight: 600 }}>
      No at-risk students
    </p>
  ) : (
    reports
      .filter(r => r.avg < 40)
      .slice(0, 5)
      .map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: 8,
            background: "#fff5f5",
            borderRadius: 8,
            marginBottom: 6,
            border: "1px solid #fee2e2"
          }}
        >
          <span style={{ color: "#111827", fontSize: 13 }}>
            {s.student?.name}
          </span>

          <b style={{ color: "#dc2626", fontSize: 13 }}>
            {s.avg}
          </b>
        </div>
      ))
  )}
</div>

      </div>

    </div>
  </div>
)}
{/* ================= BEST INSIGHTS ================= */}
<div
  style={{
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    border: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    gap: 12
  }}
>

  <h4 style={{ margin: 0, color: "#7f1d1d" }}>
    Performance Insights
  </h4>

  {/* ================= CARDS GRID ================= */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }}
  >

    {/* BEST CLASS CARD */}
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #e5e7eb"
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: "#111827" }}>
        Best Performing Class
      </p>

      <b style={{ fontSize: 14, color: "#7f1d1d" }}>
        {(() => {
          const classes = {};

          reports.forEach(r => {
            const cls = r.student?.studentClass || "Unknown";
            if (!classes[cls]) classes[cls] = { total: 0, count: 0 };

            classes[cls].total += r.avg;
            classes[cls].count += 1;
          });

          const best = Object.entries(classes)
            .map(([name, v]) => ({
              name,
              avg: v.total / v.count
            }))
            .sort((a, b) => b.avg - a.avg)[0];

          return best ? `${best.name} (${Math.round(best.avg)})` : "N/A";
        })()}
      </b>
    </div>

    {/* BEST SUBJECT CARD */}
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #e5e7eb"
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: "#111827" }}>
        Best Performing Subject
      </p>

      <b style={{ fontSize: 14, color: "#7f1d1d" }}>
        {(() => {
          const subjectScores = {};

          reports.forEach(r => {
            r.subjects.forEach(s => {
              if (!subjectScores[s.subject]) {
                subjectScores[s.subject] = { total: 0, count: 0 };
              }

              subjectScores[s.subject].total += s.score;
              subjectScores[s.subject].count += 1;
            });
          });

          const best = Object.entries(subjectScores)
            .map(([name, v]) => ({
              name,
              avg: v.total / v.count
            }))
            .sort((a, b) => b.avg - a.avg)[0];

          return best ? `${best.name} (${Math.round(best.avg)})` : "N/A";
        })()}
      </b>
    </div>

  </div>

  {/* ================= BOTTOM 5 STUDENTS ================= */}
  <div
    style={{
      marginTop: 10,
      padding: 12,
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#fff"
    }}
  >
    <h4 style={{ margin: "0 0 8px", color: "#111827" }}>
      Bottom 5 Students
    </h4>

    {[...reports]
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5)
      .map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 0",
            borderBottom: "1px solid #f1f5f9"
          }}
        >
          <span style={{ fontSize: 13, color: "#111827" }}>
            {s.student?.name}
          </span>

          <b style={{ color: "#dc2626", fontSize: 13 }}>
            {s.avg}
          </b>
        </div>
      ))}
  </div>

</div>
      {/* ================= MERIT ================= */}
      {tab === "merit" && (
        <div style={styles.card} ref={meritRef}>
          <LetterHead mode={mode} />

          <h2>MERIT LIST</h2>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Name</th>
                <th>Avg</th>
                <th>Result</th>
                <th>Medal</th>
              </tr>
            </thead>

            <tbody>
              {meritList.map((r) => (
                <tr key={r.studentId}>
                  <td>{r.position}</td>
                  <td>{r.student?.name}</td>
                  <td>{r.avg}</td>
                  <td>{r.result}</td>
                  <td>{r.medal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.signatureBox}>
              <div>
                <p>Prepared by</p>
                <div style={styles.signLine}></div>
                <small>Assessment Officer</small>
              </div>

              <div>
                <p>Approved by</p>
                <div style={styles.signLine}></div>
                <small>Chief Principal</small>
              </div>
            </div>
          <div style={styles.stampBox}>
          OFFICIAL<br />COLLEGE<br />STAMP
        </div>
{/* 🔥 SECURITY LINE (adds authenticity feel) */}
    <div style={styles.securityLine}>
      This document is system-generated and valid only when verified by Asumbi TTC Examination Office
    </div>

          <button onClick={() => printPDF(meritRef, "MERIT.pdf")}>
            Download Merit PDF
          </button>
        </div>
      )}

   {/* ================= REPORTS ================= */}
{tab === "reports" && (
  <div style={styles.card}>

    {/* ================= MASTER WRAPPER ================= */}
    <div ref={allReportsRef}>

      {/* ================= LETTERHEAD ================= */}
      <div style={styles.letterheadBox}>
        <div style={styles.letterheadInner}>

          {/* LEFT SIDE */}
          <div style={styles.schoolBlock}>
            <h1 style={styles.schoolName}>
              ASUMBI TEACHERS TRAINING COLLEGE
            </h1>

            <h3 style={styles.subTitle}>
              DIPLOMA IN TEACHER EDUCATION (DTE)
            </h3>

            <p style={styles.subTitleSmall}>
              INTERNAL FORMATIVE ASSESSMENT REPORT (IFA) — 2026
            </p>

            <p style={styles.metaLine}>
              P.O. BOX 32 - 40100, KISII, KENYA
            </p>
          </div>

          {/* RIGHT SIDE */}
          <div style={styles.letterMetaRight}>

            <div style={styles.dateBox}>
              <b>DATE OF ISSUE</b>
              <div>{new Date().toLocaleDateString()}</div>
            </div>

            <div style={styles.modeBox}>
              <b>EXAM MODE</b>
              <div>{mode}</div>
            </div>


          </div>

        </div>

        
      </div>

      {/* ================= CLASS SELECT ================= */}
<div>
  <label style={{ fontSize: 11, color: "#374151" }}>
    Select Class:
  </label>

  <select
    value={printClass}
    onChange={(e) => setPrintClass(e.target.value)}
    style={{
      width: "100%",
      padding: "8px",
      borderRadius: 8,
      border: "1px solid #ddd",
      fontSize: 12,
      marginTop: 4
    }}
  >
    {classOptions.map((cls) => (
      <option key={cls} value={cls}>
        {cls === "ALL" ? "All Classes" : cls}
      </option>
    ))}
  </select>
</div>

<button
  onClick={printAllReports}
  style={{
    ...styles.masterBtn,

    /* ================= SIZE ================= */
    width: "100%",
    minHeight: 120,

    /* ================= LAYOUT ================= */
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,

    /* ================= SPACING ================= */
    padding: "24px 30px",

    /* ================= DESIGN ================= */
    borderRadius: 24,
    border: "none",

    background:
      "linear-gradient(135deg,#7f1d1d 0%, #991b1b 40%, #dc2626 100%)",

    color: "#ffffff",

    boxShadow:
      "0 12px 30px rgba(127,29,29,0.28)",

    /* ================= TYPOGRAPHY ================= */
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 0.5,

    /* ================= EFFECTS ================= */
    transition: "all 0.25s ease",
    transform: "scale(1)",

    cursor: "pointer",
    userSelect: "none",
    position: "relative",
    overflow: "hidden",
  }}

  /* ================= HOVER ================= */
  onMouseEnter={(e) => {
    e.currentTarget.style.transform =
      "translateY(-3px) scale(1.02)";

    e.currentTarget.style.boxShadow =
      "0 18px 40px rgba(127,29,29,0.38)";
  }}

  /* ================= LEAVE ================= */
  onMouseLeave={(e) => {
    e.currentTarget.style.transform =
      "translateY(0px) scale(1)";

    e.currentTarget.style.boxShadow =
      "0 12px 30px rgba(127,29,29,0.28)";
  }}

  /* ================= CLICK ================= */
  onMouseDown={(e) => {
    e.currentTarget.style.transform =
      "scale(0.98)";
  }}

  /* ================= RELEASE ================= */
  onMouseUp={(e) => {
    e.currentTarget.style.transform =
      "translateY(-3px) scale(1.02)";
  }}
>
  {/* ================= ICON ================= */}
  <div
    style={{
      fontSize: 34,
      lineHeight: 1,
      filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.2))",
    }}
  >
    🖨
  </div>

  {/* ================= TITLE ================= */}
  <span
    style={{
      fontSize: 24,
      fontWeight: 900,
      letterSpacing: 1,
      textTransform: "uppercase",
    }}
  >
    MASTER PRINT
  </span>

  {/* ================= SUBTITLE ================= */}
  <span
    style={{
      fontSize: 13,
      opacity: 0.9,
      fontWeight: 500,
      letterSpacing: 1.2,
    }}
  >
    {printClass === "ALL"
      ? "PRINTING ALL CLASSES"
      : `PRINTING ${printClass}`}
  </span>

  {/* ================= GLOW EFFECT ================= */}
  <div
    style={{
      position: "absolute",
      top: -40,
      right: -40,
      width: 120,
      height: 120,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.08)",
    }}
  />
</button>




INDIVIDUAL CARDS
      {/* ================= REPORT GRID ================= */}
<div
  style={{
    ...styles.reportGrid,
    gridTemplateColumns: "1fr",
    gap: 40,
    padding: 30,
    background: "#f1f5f9",
  }}
>
  {reports.map((r, index) => (
    <div
      key={r.studentId}
      ref={(el) => (reportRefs.current[r.studentId] = el)}
      style={{
        background: "#ffffff",
        borderRadius: 28,
        overflow: "hidden",
        border: "1px solid #dbe4ee",
        boxShadow: "0 15px 40px rgba(15,23,42,0.08)",
        maxWidth: 1100,
        margin: "0 auto",
        position: "relative",
      }}
    >

      {/* =========================================================
          TOP ACCENT BAR
      ========================================================= */}
      <div
        style={{
          height: 10,
          background:
            "linear-gradient(90deg,#7f1d1d,#991b1b,#dc2626)",
        }}
      />

      {/* =========================================================
          HEADER
      ========================================================= */}
      <div
        style={{
          padding: "30px 35px 20px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >

        {/* LOGO */}
        <div
          style={{
            width: 95,
            height: 95,
            borderRadius: 24,
            background: "#7f1d1d",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 800,
            boxShadow: "0 10px 25px rgba(127,29,29,0.25)",
          }}
        >
          🎓
        </div>

        {/* CENTER */}
        <div style={{ flex: 1, textAlign: "center" }}>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 900,
              color: "#7f1d1d",
              letterSpacing: 1,
            }}
          >
            ASUMBI TEACHERS TRAINING COLLEGE
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 8,
              color: "#475569",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            DIPLOMA IN TEACHER EDUCATION (DTE)
          </p>

          <div
            style={{
              display: "inline-block",
              background: "#0f172a",
              padding: "10px 22px",
              borderRadius: 999,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            INTERNAL FORMATIVE ASSESSMENT REPORT (IFA) — 2026
          </div>
        </div>

        {/* RIGHT INFO */}
        <div
          style={{
            minWidth: 220,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 18,
            lineHeight: 1.9,
            fontSize: 13,
            color: "#0f172a",
          }}
        >
          <div>
            <b>Date:</b>{" "}
            {new Date().toLocaleDateString()}
          </div>

          <div>
            <b>Class:</b>{" "}
            {r.student?.studentClass || "N/A"}
          </div>

          <div>
            <b>Admission:</b>{" "}
            {r.student?.id || "N/A"}
          </div>

          <div>
            <b>Position:</b> #{index + 1}
          </div>
        </div>
      </div>

      {/* =========================================================
          BODY
      ========================================================= */}
      <div style={{ padding: 35 }}>

        {/* =========================================================
            STUDENT PROFILE
        ========================================================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: 18,
            marginBottom: 30,
          }}
        >

          {[
            ["Student Name", r.student?.name],
            ["Admission Number", r.student?.id],
            ["Class", r.student?.studentClass],
            ["Average Score", `${r.avg}%`],
            ["Overall Grade", r.grade?.label],
            ["Final Result", r.result],
          ].map(([label, value], i) => (
            <div
              key={i}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginBottom: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </div>

              <div
                style={{
                  fontSize: 16,
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                {value || "N/A"}
              </div>
            </div>
          ))}
        </div>

        {/* =========================================================
            PERFORMANCE SUMMARY
        ========================================================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 18,
            marginBottom: 35,
          }}
        >

          {/* MEAN */}
          <div
            style={{
              background: "#0f172a",
              color: "#fff",
              padding: 24,
              borderRadius: 22,
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                opacity: 0.8,
                letterSpacing: 1,
              }}
            >
              MEAN SCORE
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: 34,
              }}
            >
              {r.avg}%
            </h1>
          </div>

          {/* GRADE */}
          <div
            style={{
              background: "#7f1d1d",
              color: "#fff",
              padding: 24,
              borderRadius: 22,
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                opacity: 0.8,
                letterSpacing: 1,
              }}
            >
              OVERALL GRADE
            </p>

            <h2
              style={{
                margin: "12px 0 0",
                fontSize: 28,
              }}
            >
              {r.grade?.label}
            </h2>
          </div>

          {/* RESULT */}
          <div
            style={{
              background:
                r.result === "DISTINCTION"
                  ? "#dcfce7"
                  : r.result === "CREDIT"
                  ? "#dbeafe"
                  : r.result === "PASS"
                  ? "#fef9c3"
                  : "#fee2e2",

              color:
                r.result === "DISTINCTION"
                  ? "#166534"
                  : r.result === "CREDIT"
                  ? "#1d4ed8"
                  : r.result === "PASS"
                  ? "#92400e"
                  : "#b91c1c",

              padding: 24,
              borderRadius: 22,
              textAlign: "center",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              RESULT STATUS
            </p>

            <h2
              style={{
                margin: "12px 0 0",
                fontSize: 28,
              }}
            >
              {r.result}
            </h2>
          </div>

          {/* POSITION */}
          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              padding: 24,
              borderRadius: 22,
              textAlign: "center",
              border: "1px solid #e2e8f0",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              CLASS POSITION
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: 34,
              }}
            >
              #{index + 1}
            </h1>
          </div>
        </div>

        {/* =========================================================
            SUBJECT TABLE
        ========================================================= */}
        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            marginBottom: 35,
          }}
        >

          {/* TABLE HEADER */}
          <div
            style={{
              background: "#0f172a",
              color: "#fff",
              padding: "18px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
              }}
            >
              Subject Performance Analysis
            </h3>

            <span
              style={{
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              Official Examination Record
            </span>
          </div>

          {/* TABLE */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead
              style={{
                background: "#f8fafc",
              }}
            >
              <tr>
                <th style={styles.proTableHead}>Subject</th>
                <th style={styles.proTableHead}>Score</th>
                <th style={styles.proTableHead}>Grade</th>
                <th style={styles.proTableHead}>Remark</th>
              </tr>
            </thead>

            <tbody>
              {r.subjects.map((s, i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      i % 2 === 0
                        ? "#ffffff"
                        : "#f8fafc",
                  }}
                >
                  <td style={styles.proTableCell}>
                    {s.subject}
                  </td>

                  <td
                    style={{
                      ...styles.proTableCell,
                      fontWeight: 700,
                    }}
                  >
                    {s.score}%
                  </td>

                  <td style={styles.proTableCell}>
                    <span
                      style={{
                        padding: "7px 14px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          s.score >= 80
                            ? "#dcfce7"
                            : s.score >= 70
                            ? "#dbeafe"
                            : s.score >= 60
                            ? "#fef3c7"
                            : "#fee2e2",

                        color:
                          s.score >= 80
                            ? "#166534"
                            : s.score >= 70
                            ? "#1d4ed8"
                            : s.score >= 60
                            ? "#92400e"
                            : "#b91c1c",
                      }}
                    >
                      {s.grade}
                    </span>
                  </td>

                  <td style={styles.proTableCell}>
                    {s.remark}
                  </td>
                </tr>
              ))}

              {/* TOTAL */}
              <tr
                style={{
                  background: "#e2e8f0",
                  fontWeight: 800,
                }}
              >
                <td style={styles.proTableCell}>
                  OVERALL AVERAGE
                </td>

                <td style={styles.proTableCell}>
                  {r.avg}%
                </td>

                <td style={styles.proTableCell}>
                  {r.grade?.label}
                </td>

                <td style={styles.proTableCell}>
                  {r.result}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* =========================================================
            SIGNATURE SECTION
        ========================================================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 25,
            marginBottom: 35,
          }}
        >

          {/* REMARKS */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#0f172a",
              }}
            >
              Lecturer Remarks
            </h3>

            <div
              style={{
                minHeight: 110,
                border: "2px dashed #cbd5e1",
                borderRadius: 16,
                padding: 16,
                color: "#64748b",
                marginBottom: 20,
              }}
            >
              Class Lecturer’s remarks and recommendations.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 18,
              }}
            >
              {["Lecturer", "Signature", "Date"].map(
                (item, i) => (
                  <div key={i}>
                    <p
                      style={{
                        marginBottom: 28,
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {item}
                    </p>

                    <div
                      style={{
                        borderBottom:
                          "1px solid #0f172a",
                      }}
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* APPROVAL */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#0f172a",
              }}
            >
              Approval & Authentication
            </h3>

            <div style={{ marginTop: 25 }}>
              <h2
                style={{
                  margin: 0,
                  color: "#7f1d1d",
                }}
              >
                Kaunda K.M
              </h2>

              <p
                style={{
                  marginTop: 6,
                  color: "#475569",
                }}
              >
                Dean of Curriculum
              </p>

              <p
                style={{
                  marginTop: -5,
                  color: "#64748b",
                }}
              >
                For: Chief Principal
              </p>

              <div
                style={{
                  marginTop: 50,
                }}
              >
                <small
                  style={{
                    color: "#64748b",
                  }}
                >
                  Authorized Signature
                </small>

                <div
                  style={{
                    marginTop: 10,
                    borderBottom:
                      "1px solid #0f172a",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            FOOTER SECTION
        ========================================================= */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 30,
            flexWrap: "wrap",
          }}
        >

          {/* STAMP */}
          <div
            style={{
              width: 160,
              height: 160,
              border: "50%",
              border: "5px dashed #7f1d1d21",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#7f1d1d3b",
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: 1,
            }}
          >
            OFFICIAL
            <br />
            COLLEGE
            <br />
            STAMP
          </div>

          {/* SECURITY TEXT */}
          <div
            style={{
              flex: 1,
              minWidth: 250,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              This transcript is an official academic
              document generated by the Asumbi TTC
              Examination Management System. Any
              alteration renders this document invalid.
            </p>
          </div>

          {/* DOWNLOAD */}
          <button
            onClick={() =>
              printPDF(
                {
                  current:
                    reportRefs.current[r.studentId],
                },
                `${r.student?.name}_TRANSCRIPT.pdf`
              )
            }
            style={{
              background:
                "linear-gradient(135deg,#7f1d1d,#991b1b)",
              color: "#fff",
              border: "none",
              padding: "16px 26px",
              borderRadius: 18,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              boxShadow:
                "0 10px 25px rgba(127,29,29,0.25)",
            }}
          >
            📥 Download Transcript
          </button>
        </div>

      </div>
    </div>
  ))}
</div>
    </div>
  </div>
)}

    </div>
  );
}
const styles = {
  /* ================= APP LAYOUT ================= */
  page: {
    background: "#0b0b0b",
    color: "#fff",
    minHeight: "100vh",
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    padding: 15,
    background: "#7f1d1d",
    color: "#fff",
  },

  nav: {
    display: "flex",
    gap: 10,
    padding: 10,
    background: "#111",
    color: "#fff",
  },

  /* ================= DASHBOARD ================= */
  dashboardWrapper: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    color: "#111",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 15,
  },

  kpiCard: {
    background: "#fff",
    color: "#111",
    padding: 15,
    borderRadius: 12,
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  },

  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 15,
    color: "#111",
  },

  insightGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 15,
    color: "#111",
  },

  chartCard: {
    background: "#fff",
    padding: 15,
    margin: 10,
    borderRadius: 10,
    color: "#111",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },

  heatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 10,
  },

  heatBox: {
    padding: 10,
    borderRadius: 10,
    color: "#fff",
    textAlign: "center",
  },

  /* ================= CARDS ================= */
  card: {
    background: "#fff",
    color: "#111",
    padding: 20,
    margin: 10,
    borderRadius: 10,
  },

  report: {
    background: "#f9f9f9",
    padding: 15,
    margin: 10,
    borderRadius: 10,
    color: "#111",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#111",
  },

  /* ================= BUTTONS ================= */
  masterBtn: {
    padding: 12,
    margin: 10,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    width: "100%",
    fontWeight: "bold",
    cursor: "pointer",
  },

  downloadBtn: {
    marginTop: 15,
    background: "#16a34a",
    color: "#fff",
    padding: 10,
    border: "none",
    width: "100%",
    cursor: "pointer",
  },

  /* ================= LETTERHEAD ================= */
  letterheadBox: {
    background: "#fff",
    color: "#111",
    padding: 20,
    borderBottom: "3px solid #7f1d1d",
    marginBottom: 10,
    breakInside: "avoid",
  },

  letterheadInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingLeft: "1in",
  },

  schoolBlock: {
    textAlign: "left",
    color: "#111",
  },

  schoolName: {
    margin: 0,
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
    color: "#7f1d1d",
  },

  subTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },

  subTitleSmall: {
    margin: 0,
    fontSize: 12,
    color: "#333",
  },

  metaLine: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "bold",
    color: "#111",
  },

  letterMetaRight: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    color: "#111",
  },

  dateBox: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111",
  },

  stampBox: {
    width: 250,
    height: 200,  
    border: "2px dashed #7f1d1d3c",
    padding: 10,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 25,
    marginLeft: "40%",
  marginRight: "50%",
    color: "#7f1d1d75",
  },

  /* ================= REPORT GRID ================= */
  reportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 15,
    padding: 10,
  },

  officialReport: {
    background: "#fff",
    color: "#111",
    padding: 25,
    marginBottom: 20,
    border: "1px solid #ddd",
    borderRadius: 6,

    /* PDF SAFE */
    breakInside: "avoid",
    pageBreakInside: "avoid",
    overflow: "hidden",
  },

  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "2px solid #7f1d1d",
    paddingBottom: 10,
    marginBottom: 15,
    color: "#111",
  },

  studentName: {
    margin: 0,
    fontSize: 18,
    fontWeight: "bold",
    color: "#7f1d1d",
  },

  metaText: {
    fontSize: 12,
    marginTop: 5,
    color: "#111",
  },

  positionBadge: {
    textAlign: "center",
    background: "#7f1d1d",
    color: "#fff",
    padding: 10,
    borderRadius: 6,
    minWidth: 80,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 15,
  },

  summaryCard: {
    background: "#f4f4f4",
    padding: 10,
    textAlign: "center",
    borderRadius: 6,
    border: "1px solid #ddd",
    color: "#111",
  },

  officialTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    marginTop: 10,
    color: "#111",
  },

  sectionTitle: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: "bold",
    color: "#111",
  },

  signatureBox: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 30,
    paddingTop: 20,
    color: "#111",
  },

  signLine: {
    borderBottom: "1px solid #000",
    width: 150,
    marginTop: 20,
  },
};