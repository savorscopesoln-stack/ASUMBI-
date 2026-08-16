import React, { useEffect, useState } from "react";
import API from "../../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

/* ================= COLORS ================= */
const COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#ef4444"];

export default function TeacherAnalytics() {
  const [data, setData] = useState([]);
  const [grades, setGrades] = useState([]);
  const [trend, setTrend] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await API.get("/analytics/teacher");
      const d = res.data || {};

      setData(d.classPerformance || []);
      setGrades(d.gradeDistribution || []);
      setTrend(d.assessmentTrend || []);
      setTopStudents(d.topStudents || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 5000); // live refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.page}>

      <h2 style={styles.title}>📊 Teacher Analytics Dashboard</h2>

      {loading && <p style={{ color: "#aaa" }}>Loading analytics...</p>}

      {/* ================= CLASS PERFORMANCE ================= */}
      <div style={styles.card}>
        <h3>📚 Class Performance</h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="class" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="average" fill="#800000" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ================= GRADE DISTRIBUTION ================= */}
      <div style={styles.card}>
        <h3>🎯 Grade Distribution</h3>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={grades}
              dataKey="value"
              nameKey="grade"
              outerRadius={120}
              label
            >
              {grades.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ================= TREND ================= */}
      <div style={styles.card}>
        <h3>📈 Assessment Trend</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="average" stroke="#16a34a" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ================= TOP STUDENTS ================= */}
      <div style={styles.card}>
        <h3>🏆 Top Performers</h3>

        <div style={styles.grid}>
          {topStudents.map((s, i) => (
            <div key={i} style={styles.studentCard}>
              <h4>{s.name}</h4>
              <p>{s.class}</p>
              <strong style={{ color: "#16a34a" }}>
                {s.average}%
              </strong>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 24,
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    background: "#1e293b",
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },

  studentCard: {
    background: "#3b0a0a",
    padding: 12,
    borderRadius: 10,
  },
};