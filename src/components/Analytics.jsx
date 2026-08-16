import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from "recharts";

/* ================= AI ENGINE (UNCHANGED) ================= */
const computeStudentAI = (scores = []) => {
  if (!scores.length) {
    return {
      avg: 0,
      risk: 0,
      trend: 0,
      consistency: 0,
      performanceIndex: 0,
      status: "NO DATA"
    };
  }

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance =
    scores.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / scores.length;

  const std = Math.sqrt(variance);

  const trend =
    scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

  const consistency = Math.max(0, 100 - std);

  const performanceIndex =
    avg * 0.5 + consistency * 0.3 + (trend + 50) * 0.2;

  let risk =
    (100 - avg) * 0.5 + std * 0.3 + Math.abs(trend) * 0.2;

  risk = Math.max(0, Math.min(100, risk));

  const status =
    risk > 65 ? "HIGH RISK" :
    risk > 35 ? "MEDIUM RISK" :
    "LOW RISK";

  return {
    avg: Math.round(avg),
    risk: Math.round(risk),
    trend,
    consistency: Math.round(consistency),
    performanceIndex: Math.round(performanceIndex),
    status
  };
};

/* ================= STATS ENGINE (UNCHANGED) ================= */
const computeStats = (data) => {
  const scores = data.map(d => d.score || 0);

  const mean = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  const max = Math.max(...scores, 0);
  const min = Math.min(...scores, 0);

  const passRate = scores.length
    ? (scores.filter(s => s >= 40).length / scores.length) * 100
    : 0;

  return { mean, max, min, passRate };
};

/* ================= MAIN ================= */
export default function SchoolAIAnalytics() {
  const [assessmentId, setAssessmentId] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [filterClass, setFilterClass] = useState(""); // FIXED CONTROLLED
  const [live, setLive] = useState(Date.now());
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      const [a, s, sub] = await Promise.all([
        API.get("/assessments"),
        API.get("/students"),
        API.get("/subjects"),
      ]);

      setAssessments(a.data || []);
      setStudents(s.data || []);
      setSubjects(sub.data || []);
    };

    load();
  }, []);

  /* ================= LIVE ================= */
  useEffect(() => {
    const t = setInterval(() => setLive(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  /* ================= MARKS ================= */
  useEffect(() => {
    if (!assessmentId) return;

    API.get(`/marks/${assessmentId}`).then(res =>
      setMarks(res.data || [])
    );
  }, [assessmentId, live]);

  /* ================= MAPS ================= */
  const studentMap = useMemo(
    () => Object.fromEntries(students.map(s => [s.id, s])),
    [students]
  );

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map(s => [s.id, s])),
    [subjects]
  );

  /* ================= DATA ================= */
  const data = useMemo(() => {
    return marks.map(m => ({
      ...m,
      score: Number(m.score || 0),
      student: studentMap[m.studentId],
      subject: subjectMap[m.subjectId]
    }));
  }, [marks, studentMap, subjectMap]);

  /* ================= FILTER (FIXED CLASS DROPDOWN LOGIC) ================= */
  const filtered = useMemo(() => {
    return data.filter(d => {
      const student = d.student;

      if (!student) return false;

      if (!filterClass || filterClass === "ALL") return true;

      return student.classLevel === filterClass;
    });
  }, [data, filterClass]);

  /* ================= SUBJECT CHART ================= */
  const subjectChart = useMemo(() => {
    const map = {};

    filtered.forEach(d => {
      const name = d.subject?.name || "Unknown";
      if (!map[name]) map[name] = [];
      map[name].push(d.score);
    });

    return Object.entries(map).map(([name, arr]) => ({
      name,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length
    }));
  }, [filtered]);

  /* ================= STUDENT AI ================= */
  const studentAnalytics = useMemo(() => {
    const map = {};

    filtered.forEach(d => {
      if (!map[d.studentId]) map[d.studentId] = [];
      map[d.studentId].push(d.score);
    });

    return Object.entries(map).map(([id, scores]) => {
      const ai = computeStudentAI(scores);

      return {
        id,
        name: studentMap[id]?.name || "Unknown",
        classLevel: studentMap[id]?.classLevel || "Unknown",
        ...ai
      };
    });
  }, [filtered, studentMap]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#991b1b"];

  /* ================= UI ================= */
  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h2 style={styles.title}>📊 School AI Analytics System</h2>

        <div style={styles.controls}>

          {/* CLASS DROPDOWN FIXED */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={styles.select}
          >
            <option value="">All Classes</option>
            <option value="ALL">All (Override)</option>

            {[...new Set(students.map(s => s.classLevel))]
              .filter(Boolean)
              .map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          {/* ASSESSMENT */}
          <select
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            style={styles.select}
          >
            <option value="">Select Assessment</option>
            {assessments.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

        </div>

        <div style={styles.live}>🟢 Live Sync Active</div>
      </div>

      {/* KPI */}
      <div style={styles.kpiRow}>
        <KPI title="Mean" value={stats.mean.toFixed(1)} />
        <KPI title="Max" value={stats.max} />
        <KPI title="Min" value={stats.min} />
        <KPI title="Pass Rate" value={stats.passRate.toFixed(1) + "%"} />
      </div>

      {/* CHARTS */}
      <div style={styles.grid}>
        <Card title="Subject Performance">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={subjectChart}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Performance Overview">
          <div style={styles.placeholder}>
            Analytics space ready for expansion
          </div>
        </Card>
      </div>

      {/* TABLE */}
      <Card title="Student Performance">
        {studentAnalytics.map(s => (
          <div
            key={s.id}
            onClick={() => setSelectedStudent(s)}
            style={styles.row}
          >
            <span style={styles.name}>{s.name}</span>
            <span>{s.classLevel}</span>
            <span>{s.avg}</span>

            <span style={gradeStyle(s.status)}>
              {s.status}
            </span>
          </div>
        ))}
      </Card>

      {/* DRILL DOWN */}
      {selectedStudent && (
        <Card title="Student Drilldown">
          <p><b>Name:</b> {selectedStudent.name}</p>
          <p><b>Risk:</b> {selectedStudent.risk}</p>
          <p><b>Consistency:</b> {selectedStudent.consistency}</p>
          <p><b>Performance Index:</b> {selectedStudent.performanceIndex}</p>
        </Card>
      )}

    </div>
  );
}

/* ================= UI ================= */
const KPI = ({ title, value }) => (
  <div style={styles.kpi}>
    <h4>{title}</h4>
    <h2>{value}</h2>
  </div>
);

const Card = ({ title, children }) => (
  <div style={styles.card}>
    <h3>{title}</h3>
    {children}
  </div>
);

/* ================= FIXED SaaS UI ================= */
const styles = {
  page: {
    padding: 20,
    background: "#f4f6fb",
    color: "#111",
    minHeight: "100vh"
  },

  header: {
    background: "#fff",
    padding: 16,
    borderRadius: 14,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: 16
  },

  title: { marginBottom: 10 },

  controls: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },

  select: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    minWidth: 180
  },

  live: {
    marginTop: 8,
    fontSize: 12,
    color: "#16a34a"
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 10
  },

  kpi: {
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 15
  },

  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    marginTop: 15
  },

  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    padding: 10,
    borderBottom: "1px solid #eee",
    cursor: "pointer"
  },

  name: { fontWeight: 600 },

  placeholder: {
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280"
  }
};

const gradeStyle = (g) => ({
  padding: "4px 10px",
  borderRadius: 20,
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  background:
    g === "HIGH RISK"
      ? "#dc2626"
      : g === "MEDIUM RISK"
      ? "#f59e0b"
      : "#16a34a",
});