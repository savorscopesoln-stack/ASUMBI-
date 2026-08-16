import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import API from "../../api";

export default function StudentEAssessments() {
  const navigate =
    useNavigate();

  const [assessments, setAssessments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* =====================================================
     FETCH ASSESSMENTS
  ===================================================== */

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const res = await API.get(
        "/e-assessments",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "ASSESSMENTS:",
        res.data
      );

      const data =
        res.data?.assessments ||
        res.data?.data ||
        res.data ||
        [];

      /* =========================================
         ONLY APPROVED
      ========================================= */

      const approved =
        data.filter(
          (a) =>
            String(
              a.status || ""
            ).toLowerCase() ===
            "approved"
        );

      setAssessments(approved);

    } catch (err) {
      console.log(err);

      alert(
        err?.response?.data
          ?.message ||
          "Failed to load assessments"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.loader}></div>

        <h2>
          Loading Assessments...
        </h2>
      </div>
    );
  }

  /* =====================================================
     EMPTY
  ===================================================== */

  if (assessments.length === 0) {
    return (
      <div style={styles.empty}>
        No available assessments
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div style={styles.page}>
      <div style={styles.top}>
        <h1 style={styles.title}>
          Student E-Assessments
        </h1>

        <p style={styles.subtitle}>
          Available exams and tests
        </p>
      </div>

      <div style={styles.grid}>
        {assessments.map((a) => (
          <div
            key={a.id}
            style={styles.card}
          >
            <div style={styles.cardTop}>
              <div>
                <h2 style={styles.cardTitle}>
                  {a.title}
                </h2>

                <p style={styles.subject}>
                  {a.subject}
                </p>
              </div>

              <div style={styles.badge}>
                {a.status}
              </div>
            </div>

            <div style={styles.info}>
              <div style={styles.infoBox}>
                <span
                  style={styles.infoLabel}
                >
                  Duration
                </span>

                <strong>
                  {
                    a.duration_minutes
                  }{" "}
                  mins
                </strong>
              </div>

              <div style={styles.infoBox}>
                <span
                  style={styles.infoLabel}
                >
                  Teacher
                </span>

                <strong>
                  {a.teacher_name ||
                    "Teacher"}
                </strong>
              </div>
            </div>

            <button
              style={styles.takeBtn}
              onClick={() =>
                navigate(
                  `/student/e-assessments/${a.id}`
                )
              }
            >
              Take Assessment
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100%",
    maxWidth: "100%",
    padding: 30,
    background:
      "linear-gradient(135deg,#020617,#0f172a,#111827)",
    color: "#fff",
  },

  top: {
    marginBottom: 30,
  },

  title: {
    fontSize: 38,
    fontWeight: 800,
    marginBottom: 10,
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(320px,1fr))",
    gap: 24,
  },

  card: {
    background:
      "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 24,
    border:
      "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
    transition: "0.3s",
  },

  cardTop: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 20,
    marginBottom: 20,
  },

  cardTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },

  subject: {
    color: "#93c5fd",
    marginTop: 8,
  },

  badge: {
    background:
      "linear-gradient(135deg,#15803d,#22c55e)",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    height: "fit-content",
    textTransform: "capitalize",
  },

  info: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
  },

  infoBox: {
    flex: 1,
    background:
      "rgba(255,255,255,0.04)",
    padding: 16,
    borderRadius: 16,
  },

  infoLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 8,
  },

  takeBtn: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#3b82f6)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },

  loaderWrap: {
    minHeight: "100vh",
    background: "#020617",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
  },

  loader: {
    width: 70,
    height: 70,
    border:
      "6px solid rgba(255,255,255,0.1)",
    borderTop:
      "6px solid #3b82f6",
    borderRadius: "50%",
    marginBottom: 20,
  },

  empty: {
    minHeight: "100vh",
    background: "#020617",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
  },
};