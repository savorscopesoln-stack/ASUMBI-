import React, { useEffect, useState } from "react";
import API from "../api";

export default function LeaveOutAdmin() {
  const [leaves, setLeaves] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [duration, setDuration] = useState(120);
  const [denyReason, setDenyReason] = useState("");
  const [search, setSearch] = useState("");

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */
  useEffect(() => {
    instantLoad();
  }, []);

  const instantLoad = async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadLeaves(),
        loadAnalytics(),
        loadStudents(),
      ]);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaves = async () => {
    const res = await API.get("/leave-outs");
    setLeaves(res.data || []);
  };

  const loadAnalytics = async () => {
    const res = await API.get("/leave-outs/analytics");
    setAnalytics(res.data || []);
  };

  const loadStudents = async () => {
    try {
      const res = await API.get("/students");
      setStudents(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const getStudentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? s.name : `Student ${id}`;
  };

  /* ================= ACTIONS ================= */

  const approve = async (id) => {
    try {
      // instant UI update
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: "approved",
              }
            : l
        )
      );

      await API.put(`/leave-outs/${id}/approve`, {
        approvedAt: new Date(),
        duration,
      });

      loadAnalytics();
    } catch (err) {
      console.log(err);
      loadLeaves();
    }
  };

  const deny = async (id) => {
    try {
      // instant UI update
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: "denied",
              }
            : l
        )
      );

      await API.put(`/leave-outs/${id}/deny`, {
        reason: denyReason,
      });

      setDenyReason("");
      loadAnalytics();
    } catch (err) {
      console.log(err);
      loadLeaves();
    }
  };

  const revoke = async (leave) => {
    try {
      // instant UI update
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === leave.id
            ? {
                ...l,
                status: "revoked",
              }
            : l
        )
      );

      await API.put(`/leave-outs/${leave.id}/revoke`);

      await API.post("/notifications/whatsapp", {
        student_id: leave.student_id,
        message:
          "🚨 Leave revoked. You are expected back in school within the next hour.",
      });

      loadAnalytics();
    } catch (err) {
      console.log(err);
      loadLeaves();
    }
  };

  /* ================= FILTER ================= */

  const filteredLeaves = leaves.filter((l) => {
    const term = search.toLowerCase();

    return (
      getStudentName(l.student_id).toLowerCase().includes(term) ||
      String(l.student_id).includes(term)
    );
  });

  const statusColor = (s) => {
    if (s === "approved") return "#22c55e";
    if (s === "denied") return "#ef4444";
    if (s === "expired") return "#9ca3af";
    if (s === "revoked") return "#6b7280";
    return "#facc15";
  };

  /* ================= UI ================= */

  return (
    <div style={styles.layout}>
      {/* ================= SIDEBAR ================= */}

    
      {/* ================= MAIN ================= */}

      <div style={styles.main}>
        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Leave-Out Administration</h1>

            <p style={styles.subtitle}>
              Manage approvals, revocations, and monitor leave activity.
            </p>
            <button
  onClick={() => window.history.back()}
  style={{
    padding: "12px 20px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#991b1b,#dc2626)",
    boxShadow: "0 8px 20px rgba(220,38,38,0.25)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  }}
>
  ← Back
</button>
          </div>

          <div style={styles.headerRight}>
            <input
              placeholder="🔍 Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.search}
            />
          </div>
        </div>

        {/* ================= LOADER ================= */}

        {loading ? (
          <div style={styles.loaderWrap}>
            <div style={styles.loader}></div>
            <p style={{ marginTop: 20 }}>Loading Leave Dashboard...</p>
          </div>
        ) : (
          <>
            {/* ================= TOP GRID ================= */}

            <div style={styles.topGrid}>
              {/* SETTINGS */}

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3>⚙️ Approval Settings</h3>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Return Time</label>

                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    style={styles.input}
                  >
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                    <option value={360}>6 Hours</option>
                    <option value={720}>12 Hours</option>
                    <option value={1440}>1 Day</option>
                    <option value={2880}>2 Days</option>
                    <option value={4320}>3 Days</option>
                    <option value={7200}>5 Days</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Denial Reason</label>

                  <textarea
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Reason for denying request..."
                    style={styles.textarea}
                  />
                </div>
              </div>

              {/* ANALYTICS */}

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3>📊 Leave Analytics</h3>
                </div>

                <div style={styles.analyticsGrid}>
                  {analytics.map((a) => (
                    <div key={a.student_id} style={styles.analyticsCard}>
                      <h4 style={styles.analyticsName}>
                        {getStudentName(a.student_id)}
                      </h4>

                      <div style={styles.analyticsRow}>
                        <span>Total Leaves</span>
                        <strong>{a.totalLeaves}</strong>
                      </div>

                      <div style={styles.analyticsRow}>
                        <span style={{ color: "#22c55e" }}>
                          Approved
                        </span>

                        <strong>{a.approvedLeaves}</strong>
                      </div>

                      <div style={styles.analyticsRow}>
                        <span style={{ color: "#facc15" }}>
                          Pending
                        </span>

                        <strong>{a.pendingLeaves}</strong>
                      </div>

                      <div style={styles.analyticsRow}>
                        <span style={{ color: "#ef4444" }}>
                          Denied
                        </span>

                        <strong>{a.deniedLeaves}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ================= REQUESTS ================= */}

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3>📋 Leave Requests</h3>

                <div style={styles.badge}>
                  {filteredLeaves.length} Requests
                </div>
              </div>

              <div style={styles.requestsWrap}>
                {filteredLeaves.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      ...styles.leaveCard,

                      ...(l.status === "revoked"
                        ? styles.revokedCard
                        : {}),

                      ...(l.status === "expired"
                        ? styles.expiredCard
                        : {}),
                    }}
                  >
                    {/* LEFT */}

                    <div style={styles.leaveLeft}>
                      <div
                        style={{
                          ...styles.avatar,

                          ...(l.status === "revoked"
                            ? styles.revokedAvatar
                            : {}),
                        }}
                      >
                        {getStudentName(l.student_id)
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div>
                        <div style={styles.studentName}>
                          {getStudentName(l.student_id)}
                        </div>

                        <div style={styles.studentId}>
                          Student ID: {l.student_id}
                        </div>

                        <div style={styles.reason}>
                          {l.reason || "No reason provided"}
                        </div>
                      </div>
                    </div>

                    {/* STATUS */}

                    <div
                      style={{
                        ...styles.status,
                        color: statusColor(l.status),
                        border: `1px solid ${statusColor(l.status)}`,
                      }}
                    >
                      {l.status}
                    </div>

                    {/* ACTIONS */}

                    <div style={styles.actions}>
                      {l.status === "pending" && (
                        <>
                          <button
                            onClick={() => approve(l.id)}
                            style={styles.approve}
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => deny(l.id)}
                            style={styles.deny}
                          >
                            Deny
                          </button>
                        </>
                      )}

                      {/* revoke disappears after click */}

                      {l.status !== "revoked" && (
                        <button
                          onClick={() => revoke(l)}
                          style={styles.revoke}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#0f0f0f 0%, #1b0a0a 45%, #090909 100%)",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
  },

  /* ================= SIDEBAR ================= */

  sidebar: {
    width: 260,
    background: "rgba(20,20,20,0.92)",
    backdropFilter: "blur(14px)",
    padding: 25,
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "0 0 25px rgba(0,0,0,0.4)",
  },

  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 30,
  },

  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#7f1d1d,#dc2626)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 28,
    boxShadow: "0 10px 25px rgba(220,38,38,0.35)",
  },

  logoText: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },

  logoSub: {
    margin: 0,
    color: "#9ca3af",
    fontSize: 13,
  },

  menuBtn: {
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "rgba(255,255,255,0.04)",
    color: "#d1d5db",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 600,
    transition: "0.3s",
  },

  menuBtnActive: {
    padding: 15,
    borderRadius: 14,
    border: "none",
    background:
      "linear-gradient(135deg,#991b1b,#dc2626)",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 8px 22px rgba(220,38,38,0.35)",
  },

  /* ================= MAIN ================= */

  main: {
    flex: 1,
    padding: 35,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    flexWrap: "wrap",
    gap: 20,
  },

  title: {
    margin: 0,
    fontSize: 36,
    fontWeight: 800,
  },

  subtitle: {
    marginTop: 8,
    color: "#9ca3af",
    fontSize: 15,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 15,
  },

  search: {
    width: 320,
    padding: 15,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    outline: "none",
    fontSize: 14,
  },

  /* ================= GRID ================= */

  topGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 24,
    marginBottom: 28,
  },

  /* ================= CARDS ================= */

  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    padding: 24,
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  badge: {
    background: "rgba(220,38,38,0.15)",
    color: "#fca5a5",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },

  /* ================= FORM ================= */

  field: {
    marginBottom: 20,
  },

  label: {
    display: "block",
    marginBottom: 8,
    color: "#d1d5db",
    fontSize: 13,
    fontWeight: 600,
  },

  input: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    outline: "none",
    fontSize: 14,
  },

  textarea: {
    width: "100%",
    minHeight: 120,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    outline: "none",
    resize: "none",
    fontSize: 14,
  },

  /* ================= ANALYTICS ================= */

  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 18,
  },

  analyticsCard: {
    background: "rgba(0,0,0,0.28)",
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.05)",
  },

  analyticsName: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: 700,
  },

  analyticsRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
    color: "#d1d5db",
    fontSize: 14,
  },

  /* ================= REQUESTS ================= */

  requestsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  leaveCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    padding: 20,
    borderRadius: 20,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "0.3s",
  },

  revokedCard: {
    opacity: 0.45,
    filter: "grayscale(100%)",
    background: "rgba(120,120,120,0.08)",
    border: "1px solid rgba(180,180,180,0.15)",
  },

  expiredCard: {
    opacity: 0.6,
    filter: "grayscale(70%)",
  },

  leaveLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 260,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#991b1b,#ef4444)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 800,
    fontSize: 20,
    boxShadow: "0 8px 18px rgba(239,68,68,0.3)",
  },

  revokedAvatar: {
    background:
      "linear-gradient(135deg,#4b5563,#9ca3af)",
    boxShadow: "none",
  },

  studentName: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 4,
  },

  studentId: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 6,
  },

  reason: {
    color: "#d1d5db",
    fontSize: 14,
  },

  status: {
    padding: "10px 18px",
    borderRadius: 999,
    textTransform: "uppercase",
    fontWeight: 700,
    fontSize: 12,
    background: "rgba(255,255,255,0.03)",
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  approve: {
    padding: "12px 18px",
    border: "none",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#15803d,#22c55e)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(34,197,94,0.25)",
  },

  deny: {
    padding: "12px 18px",
    border: "none",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#991b1b,#ef4444)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(239,68,68,0.25)",
  },

  revoke: {
    padding: "12px 18px",
    border: "none",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#c2410c,#f97316)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(249,115,22,0.25)",
  },

  /* ================= LOADER ================= */

  loaderWrap: {
    height: "60vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  loader: {
    width: 70,
    height: 70,
    border: "6px solid rgba(255,255,255,0.08)",
    borderTop: "6px solid #dc2626",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};