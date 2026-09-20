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
  Bar
} from "recharts";

/* ================= GRADE ================= */
const getGrade = (score) => {
  if (score >= 80) return "Distinction";
  if (score >= 60) return "Credit";
  if (score >= 40) return "Pass";
  return "Fail";
};

export default function TeacherReports() {
  const [assessments, setAssessments] = useState([]);
  const [assessmentId, setAssessmentId] = useState("");

  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(false);

  const reportRef = useRef();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const teacherSubject = user.subject;

  /* ================= LOAD INITIAL DATA ================= */
  useEffect(() => {
    const load = async () => {
      try {
        const [a, s, sub] = await Promise.all([
          API.get("/assessments"),
          API.get("/students"),
          API.get("/subjects"),
        ]);

        setAssessments(a.data || []);
        setStudents(s.data || []);
        setSubjects(sub.data || []);
      } catch (err) {
        console.log(err);
      }
    };

    load();
  }, []);

  /* ================= LOAD MARKS ================= */
  useEffect(() => {
    if (!assessmentId) {
      setMarks([]);
      return;
    }

    const loadMarks = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/marks/${assessmentId}`);
        setMarks(res.data || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadMarks();
  }, [assessmentId]);

  /* ================= TEACHER SUBJECT ================= */
  const teacherSub = useMemo(() => {
    return subjects.find(
      (s) =>
        s.name?.toLowerCase() === teacherSubject?.toLowerCase()
    );
  }, [subjects, teacherSubject]);

  /* ================= FILTER MARKS (FIXED) ================= */
  const filteredMarks = useMemo(() => {
    if (!teacherSub || !assessmentId) return [];

    return marks.filter(
      (m) =>
        String(m.subjectId) === String(teacherSub.id) &&
        String(m.assessmentId) === String(assessmentId)
    );
  }, [marks, teacherSub, assessmentId]);

  /* ================= REPORTS (FIXED AGGREGATION) ================= */
  const reports = useMemo(() => {
    if (!filteredMarks.length) return [];

    const map = {};

    filteredMarks.forEach((m) => {
      const id = m.studentId;

      if (!map[id]) {
        map[id] = { total: 0, count: 0 };
      }

      map[id].total += Number(m.score || 0);
      map[id].count += 1;
    });

    return Object.keys(map).map((id) => {
      const data = map[id];
      const avg = data.total / data.count;

      return {
        student: students.find(
          (s) => String(s.id) === String(id)
        ),
        avg: Math.round(avg),
        grade: getGrade(avg),
      };
    });
  }, [filteredMarks, students]);

  /* ================= ANALYTICS ================= */
  const analytics = useMemo(() => {
    const scores = reports.map((r) => r.avg || 0);

    if (!scores.length) {
      return {
        avg: 0,
        highest: 0,
        lowest: 0,
        total: 0,
        passRate: 0,
      };
    }

    const avg =
      scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      avg: Math.round(avg),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      total: scores.length,
      passRate: Math.round(
        (scores.filter((s) => s >= 40).length /
          scores.length) *
          100
      ),
    };
  }, [reports]);

  /* ================= CHART ================= */
  const subjectStats = useMemo(() => {
    if (!teacherSub || !assessmentId) return [];

    const avg =
      filteredMarks.reduce(
        (s, m) => s + Number(m.score || 0),
        0
      ) / (filteredMarks.length || 1);

    return [
      {
        name: teacherSub.name,
        avg: Math.round(avg),
      },
    ];
  }, [filteredMarks, teacherSub, assessmentId]);

  /* ================= PRINT ================= */
  const printReport = async () => {
    const element = reportRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      210,
      297
    );

    pdf.save(`${teacherSubject}_Report.pdf`);
  };

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h2>📊 {teacherSubject} Subject Analytics</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={assessmentId}
            onChange={(e) =>
              setAssessmentId(e.target.value)
            }
          >
            <option value="">Select Assessment</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <button onClick={printReport}>🖨 Print</button>
        </div>
      </div>

      {loading && <p>Loading data...</p>}

      {/* KPI */}
      <div style={styles.grid}>
        <Card title="Average" value={analytics.avg} />
        <Card title="Highest" value={analytics.highest} />
        <Card title="Lowest" value={analytics.lowest} />
        <Card title="Students" value={analytics.total} />
        <Card
          title="Pass Rate"
          value={`${analytics.passRate}%`}
        />
      </div>

      {/* CHART */}
      <div style={styles.card}>
        <h3>{teacherSubject} Performance</h3>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={subjectStats}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avg" fill="#7f1d1d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TOP STUDENTS */}
      <div style={styles.card}>
        <h3>🏆 Top Students</h3>

        {[...reports]
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 5)
          .map((r, i) => (
            <div key={i} style={styles.row}>
              <span>{r.student?.name || "Unknown"}</span>
              <b>{r.avg}</b>
            </div>
          ))}
      </div>

      {/* AT RISK */}
      <div style={styles.card}>
        <h3>⚠ At Risk Students</h3>

        {reports.filter((r) => r.avg < 40).length === 0 ? (
          <p>No at-risk students</p>
        ) : (
          reports
            .filter((r) => r.avg < 40)
            .map((r, i) => (
              <div key={i} style={styles.row}>
                <span>{r.student?.name || "Unknown"}</span>
                <b style={{ color: "red" }}>
                  {r.avg}
                </b>
              </div>
            ))
        )}
      </div>

      {/* PRINT AREA */}
      <div ref={reportRef} style={printStyles.page}>
        <h2>ASUMBI TTC</h2>
        <h3>{teacherSubject} Report</h3>

        <table style={printStyles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Score</th>
              <th>Grade</th>
            </tr>
          </thead>

          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td>{r.student?.name}</td>
                <td>{r.avg}</td>
                <td>{r.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

/* ================= CARD ================= */
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    background: "#0b0000",
    color: "#fff",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(150px,1fr))",
    gap: 10,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 8,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
};

const printStyles = {
  page: {
    background: "#fff",
    color: "#000",
    padding: 30,
    width: "210mm",
    minHeight: "297mm",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
};