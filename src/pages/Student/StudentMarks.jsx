import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";

/* ================= GRADING COLOR ================= */
const getGradeColor = (grade) => {
  if (!grade) return "#fff";
  if (grade.includes("Distinction")) return "#22c55e";
  if (grade.includes("Credit")) return "#3b82f6";
  if (grade.includes("Pass")) return "#f59e0b";
  return "#ef4444";
};

/* ================= GRADE PREDICTION ================= */
const predictGrade = (avg) => {
  if (avg >= 75) return "DISTINCTION";
  if (avg >= 60) return "CREDIT";
  if (avg >= 40) return "PASS";
  return "REFER";
};

/* ================= INSIGHTS ENGINE ================= */
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

export default function StudentMarks() {
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admissionNo = user?.admissionNo || user?.id;

  /* ================= LOAD ================= */
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
  }, [admissionNo]);

  /* ================= FULL SUBJECT MAP ================= */
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

  /* ================= STRICT CLASSIFICATION ================= */
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

  /* ================= ANALYTICS (UPDATED FOR SUBJECT LINKS) ================= */
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

  const isBelowAverage = analytics.avg < 50;

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h2>📊 MARKS TABLE AND PREDICTION</h2>
        <p>
          Admission No: <b>{admissionNo || "N/A"}</b>
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading marks and prediction...</div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div style={styles.grid}>
            <Kpi title="Average Score" value={`${analytics.avg}%`} />

            {/* 🔥 HIGHEST WITH SUBJECT */}
            <Kpi
              title="Highest"
              value={
                analytics.highest?.subjectName
                  ? `${analytics.highest.percentage}% (${analytics.highest.subjectName})`
                  : "N/A"
              }
              color="#22c55e"
            />

            {/* 🔥 LOWEST WITH SUBJECT */}
            <Kpi
              title="Lowest"
              value={
                analytics.lowest?.subjectName
                  ? `${analytics.lowest.percentage}% (${analytics.lowest.subjectName})`
                  : "N/A"
              }
              color="#ef4444"
            />

            <Kpi title="Subjects" value={analytics.total} />
          </div>

          {/* PREDICTION */}
          <div style={styles.card}>
            <h3>🤖 AI Prediction</h3>

            <p
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: isBelowAverage ? "#ef4444" : "#22c55e",
              }}
            >
              {analytics.predictedGrade}
            </p>
          </div>

          {/* INSIGHTS */}
          <div style={styles.card}>
            <h3>🧠 AI Insights</h3>

            <p style={{ color: isBelowAverage ? "#ef4444" : "#fff" }}>
              {isBelowAverage
                ? "⚠️ Student is below average and requires intervention"
                : "Performance within acceptable range"}
            </p>

            <div style={styles.insightGrid}>
              <div>
                <b>Strong Subjects</b>
                <ul>
                  {classified.strong.length ? (
                    classified.strong.map((s, i) => <li key={i}>{s}</li>)
                  ) : (
                    <li>None</li>
                  )}
                </ul>
              </div>

              <div>
                <b>Weak Subjects</b>
                <ul>
                  {classified.weak.length ? (
                    classified.weak.map((s, i) => <li key={i}>{s}</li>)
                  ) : (
                    <li>None</li>
                  )}
                </ul>
              </div>
            </div>

            <div style={{ marginTop: 15 }}>
              <b>📌 CRNM (Missing Marks)</b>
              <ul>
                {classified.crnm.length ? (
                  classified.crnm.map((s, i) => <li key={i}>{s}</li>)
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
          </div>

          {/* TABLE */}
          <div style={styles.card}>
            <h3>📚 Subject Breakdown</h3>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Grade</th>
                  </tr>
                </thead>

                <tbody>
                  {fullSubjectMap.map((m, i) => (
                    <tr key={i} style={styles.row}>
                      <td>{m.subjectName}</td>
                      <td>{m.score ?? "CRNM"}</td>
                      <td>{m.percentage ?? "CRNM"}</td>
                      <td>
                        <span
                          style={{
                            ...styles.badge,
                            background: getGradeColor(m.grade),
                          }}
                        >
                          {m.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= KPI ================= */
function Kpi({ title, value, color }) {
  return (
    <div style={{ ...styles.kpi, borderLeft: `4px solid ${color || "#fff"}` }}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    color: "#fff",
    background: "linear-gradient(135deg,#0b0000,#1a0a0a,#000000)",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    padding: 18,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    marginBottom: 15,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 15,
  },

  kpi: {
    padding: 15,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },

  card: {
    marginTop: 15,
    padding: 18,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
  },

  tableWrap: {
    overflowX: "auto",
    marginTop: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 500,
  },

  row: {
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  badge: {
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
    display: "inline-block",
  },

  error: {
    background: "#7f1d1d",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  loading: {
    padding: 20,
    opacity: 0.7,
  },

  insightGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginTop: 10,
  },
};