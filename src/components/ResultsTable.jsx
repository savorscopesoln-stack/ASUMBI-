import React, { useEffect, useMemo, useState } from "react";
import API from "../api";

/* ================= GRADE SYSTEM ================= */
const getGrade = (avg) => {
  if (avg >= 75) return { g: "A", c: "#22c55e" };
  if (avg >= 60) return { g: "B", c: "#16a34a" };
  if (avg >= 50) return { g: "C", c: "#facc15" };
  if (avg >= 40) return { g: "D", c: "#f97316" };
  return { g: "E", c: "#ef4444" };
};

/* ================= MAIN ================= */
export default function ResultsDashboard() {
  const [assessmentId, setAssessmentId] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);

  const [loading, setLoading] = useState(false);

  /* ================= LOAD DATA ================= */
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

  /* ================= LOAD MARKS ================= */
  const load = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);

      const res = await API.get(
        `/marks/${assessmentId}?classLevel=${classFilter}&subjectId=${subjectFilter}`
      );

      setMarks(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assessmentId, classFilter, subjectFilter]);

  /* ================= MAPS ================= */
  const studentMap = useMemo(() => {
    const m = {};
    students.forEach((s) => (m[s.id] = s));
    return m;
  }, [students]);

  const subjectMap = useMemo(() => {
    const m = {};
    subjects.forEach((s) => (m[s.id] = s));
    return m;
  }, [subjects]);

  /* ================= GROUP STUDENTS ================= */
  const studentResults = useMemo(() => {
    const map = {};

    marks.forEach((m) => {
      if (!map[m.studentId]) map[m.studentId] = [];
      map[m.studentId].push(Number(m.score || 0));
    });

    return Object.keys(map).map((id) => {
      const scores = map[id];
      const avg =
        scores.reduce((a, b) => a + b, 0) / scores.length;

      const grade = getGrade(avg);
      const s = studentMap[id];

      return {
        id,
        name: s?.name || "Unknown",
        adm: s?.admissionNo || "-",
        class: s?.studentClass || s?.classLevel,
        avg: Math.round(avg),
        grade: grade.g,
        color: grade.c,
        total: scores.length,
      };
    });
  }, [marks, studentMap]);

  /* ================= CLASS OPTIONS ================= */
  const classOptions = useMemo(() => {
    const set = new Set(
      students.map((s) => s.studentClass || s.classLevel).filter(Boolean)
    );
    return Array.from(set);
  }, [students]);

  /* ================= CLASS RESULTS ================= */
  const classResults = useMemo(() => {
    const map = {};

    marks.forEach((m) => {
      const student = studentMap[m.studentId];
      const cls = student?.studentClass || student?.classLevel;

      if (!cls) return;

      if (!map[cls]) map[cls] = { total: 0, count: 0 };

      map[cls].total += Number(m.score || 0);
      map[cls].count += 1;
    });

    return Object.entries(map).map(([cls, v]) => ({
      class: cls,
      mean: v.count ? v.total / v.count : 0,
    }));
  }, [marks, studentMap]);

  const bestClass = classResults.reduce(
    (a, b) => (b.mean > (a?.mean || 0) ? b : a),
    null
  );

  /* ================= SUBJECT RESULTS ================= */
  const subjectResults = useMemo(() => {
    const map = {};

    marks.forEach((m) => {
      const sub = subjectMap[m.subjectId]?.name || "Unknown";

      if (!map[sub]) map[sub] = { total: 0, count: 0 };

      map[sub].total += Number(m.score || 0);
      map[sub].count += 1;
    });

    return Object.entries(map).map(([sub, v]) => ({
      subject: sub,
      mean: v.count ? v.total / v.count : 0,
    }));
  }, [marks, subjectMap]);

  const bestSubject = subjectResults.reduce(
    (a, b) => (b.mean > (a?.mean || 0) ? b : a),
    null
  );

  /* ================= SORTED RANK ================= */
  const ranked = [...studentResults].sort(
    (a, b) => b.avg - a.avg
  ).map((s, i) => ({
    ...s,
    rank:
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : `#${i + 1}`,
  }));

  /* ================= SUMMARY ================= */
  const avg =
    marks.reduce((a, b) => a + Number(b.score || 0), 0) /
    (marks.length || 1);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>📄 STUDENT RESULTS DASHBOARD</h1>

      {/* ================= FILTERS ================= */}
      <div style={styles.filters}>
        <select style={styles.select} value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
          <option value="">📅 Assessment</option>
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select style={styles.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">🏫 Class</option>
          {classOptions.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>

        <select style={styles.select} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="">📘 Subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <button style={styles.button} onClick={load}>🔄 LOAD RESULTS</button>
      </div>

      {loading && <p style={{ color: "#facc15" }}>Loading results...</p>}

      {/* ================= SUMMARY CARDS ================= */}
      <div style={styles.summary}>
        <div style={styles.cardRed}>📊 Average: {avg.toFixed(1)}</div>
        <div style={styles.cardYellow}>🏆 Best Class: {bestClass?.class}</div>
        <div style={styles.cardGreen}>📘 Best Subject: {bestSubject?.subject}</div>
      </div>

      {/* ================= CLASS / SUBJECT ================= */}
      <div style={styles.box}>
        🏫 Class Result Leader: <b>{bestClass?.class}</b> ({bestClass?.mean?.toFixed(1)})
      </div>

      <div style={styles.box}>
        📘 Subject Top: <b>{bestSubject?.subject}</b> ({bestSubject?.mean?.toFixed(1)})
      </div>

      {/* ================= LEADERBOARD ================= */}
      <h2 style={styles.section}>🏆 CLASS RANKING</h2>

      <div style={styles.grid}>
        {ranked.map((s, i) => (
          <div key={i} style={styles.card}>
            <div style={styles.rank}>{s.rank}</div>
            <h3>{s.name}</h3>

            <p>ADM: {s.adm}</p>
            <p>Class: {s.class}</p>

            <p style={{ color: s.color }}>
              Avg: {s.avg} | Grade: {s.grade}
            </p>

            <div style={styles.bar}>
              <div style={{
                width: `${s.avg}%`,
                background: s.color,
                height: "100%",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= STYLES (RESULT DASHBOARD THEME) ================= */
const styles = {
  page: {
    background: "#0a0a0a",
    minHeight: "100vh",
    padding: 20,
    color: "#fff",
    fontFamily: "Arial",
  },

  title: {
    color: "#7f1d1d",
    fontWeight: 900,
  },

  filters: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 15,
  },

  select: {
    padding: 10,
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    border: "1px solid #7f1d1d",
  },

  button: {
    background: "#7f1d1d",
    color: "#fff",
    padding: "10px 15px",
    borderRadius: 8,
    border: "none",
  },

  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
    gap: 10,
    marginTop: 20,
  },

  cardRed: { background: "#7f1d1d", padding: 15, borderRadius: 10 },
  cardYellow: { background: "#facc15", color: "#000", padding: 15, borderRadius: 10 },
  cardGreen: { background: "#22c55e", padding: 15, borderRadius: 10 },

  box: {
    marginTop: 10,
    padding: 10,
    background: "#111",
    borderLeft: "4px solid #7f1d1d",
  },

  section: {
    marginTop: 20,
    color: "#facc15",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: 10,
    marginTop: 10,
  },

  card: {
    background: "#111",
    padding: 15,
    borderRadius: 10,
    border: "1px solid #7f1d1d",
  },

  rank: {
    fontSize: 18,
    fontWeight: 900,
  },

  bar: {
    height: 6,
    background: "#333",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
};