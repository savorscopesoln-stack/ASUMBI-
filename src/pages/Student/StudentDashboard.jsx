import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import QRCode from "react-qr-code";

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

export default function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = user.id;

  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [mealCard, setMealCard] = useState(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      try {
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
      } catch (err) {
        console.log(err);
      }
    };

    if (studentId) load();
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

  /* ================= UI ================= */
  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h2>🎓 Student Dashboard</h2>
        <p>Welcome back, <b>{user.name}</b></p>
      </div>

      {/* TOP CARDS */}
      <div style={styles.grid}>
        <Card title="Average" value={`${analytics.avg}%`} />
        <Card title="Grade" value={analytics.grade.label} />
        <Card title="Highest" value={analytics.highest} />
        <Card title="Lowest" value={analytics.lowest} />
      </div>

      {/* CHART */}
      <div style={styles.card}>
        <h3>📊 Performance Overview</h3>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <XAxis dataKey="subject" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip />
            <Bar
              dataKey="score"
              fill="url(#grad)"
              radius={[6, 6, 0, 0]}
            />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff4d4d" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ================= ENHANCED LEAVE STATUS (10/10) ================= */}
      <div style={styles.card}>
        <h3>🚪 Leave Status</h3>

        <div style={styles.leaveContainer}>
          {activeLeaves.map((l) => (
            <div key={l.id} style={{ ...styles.leaveCard, ...styles.leaveApproved }}>
              <div>
                <p style={styles.leaveReason}>{l.reason}</p>
                <small>Approved Request</small>
              </div>
              <span style={styles.badgeGood}>✓ Approved</span>
            </div>
          ))}

          {pendingLeaves.map((l) => (
            <div key={l.id} style={{ ...styles.leaveCard, ...styles.leavePending }}>
              <div>
                <p style={styles.leaveReason}>{l.reason}</p>
                <small>Waiting Approval</small>
              </div>
              <span style={styles.badgePending}>⏳ Pending</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= ENHANCED MEAL CARD (10/10) ================= */}
      <div style={styles.card}>
        <h3>🍽 Meal Card</h3>

        {!mealCard ? (
          <p style={{ opacity: 0.7 }}>No meal card assigned</p>
        ) : (
          <div style={styles.mealWrap}>

            <div style={styles.mealInfo}>
              <div style={styles.mealBadgeRow}>
                <span style={styles.mealBadge}>{mealCard.status}</span>
                <span style={styles.mealBadgeSoft}>
                  {mealCard.meals_remaining} Remaining
                </span>
              </div>

              <p><b>Start:</b> {createdDate.toDateString()}</p>
              <p><b>Expiry:</b> {expiryDate.toDateString()}</p>
              <p><b>Last Meal:</b> {lastMeal}</p>
            </div>

            <div style={styles.qrBox}>
              <QRCode
                value={JSON.stringify({
                  id: studentId,
                  name: user.name,
                  status: mealCard.status,
                })}
                size={90}
              />
              <small>SECURE ID</small>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ================= CARD ================= */
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}

/* ================= STYLES (UPGRADED ONLY WHERE NEEDED) ================= */
const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    color: "#fff",
    background: "linear-gradient(135deg,#0b0000,#1a0a0a,#000000)",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 15,
  },

  card: {
    marginTop: 15,
    padding: 18,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },

  /* ===== LEAVE UPGRADE ===== */
  leaveContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 10,
  },

  leaveCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    transition: "0.3s ease",
  },

  leaveApproved: {
    boxShadow: "0 0 15px rgba(34,197,94,0.2)",
  },

  leavePending: {
    boxShadow: "0 0 15px rgba(245,158,11,0.2)",
  },

  leaveReason: {
    margin: 0,
    fontWeight: "bold",
  },

  badgeGood: {
    color: "#22c55e",
    fontWeight: "bold",
  },

  badgePending: {
    color: "#f59e0b",
    fontWeight: "bold",
  },

  /* ===== MEAL UPGRADE ===== */
  mealWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  mealInfo: {
    flex: 1,
  },

  mealBadgeRow: {
    display: "flex",
    gap: 10,
    marginBottom: 8,
  },

  mealBadge: {
    background: "linear-gradient(135deg,#ff4d4d,#7f1d1d)",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  mealBadgeSoft: {
    background: "rgba(255,255,255,0.1)",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
  },

  qrBox: {
    textAlign: "center",
    padding: 10,
    borderRadius: 10,
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
};