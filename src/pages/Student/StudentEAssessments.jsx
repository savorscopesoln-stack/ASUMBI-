import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { MonitorCheck, Clock, UserRound, Loader2, Inbox, AlertTriangle } from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted by the layout or
   another page. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    .assess-card:hover { box-shadow: var(--shadow); border-color: var(--primary) !important; }
    .assess-take-btn:hover { filter: brightness(0.95); }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .assess-grid { grid-template-columns: 1fr !important; }
      .assess-info { flex-direction: column !important; }
    }
  `;
  document.head.appendChild(el);
};

export default function StudentEAssessments() {
  injectStyles();

  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const res = await API.get("/e-assessments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.assessments || res.data?.data || res.data || [];

      const approved = data.filter(
        (a) => String(a.status || "").toLowerCase() === "approved"
      );

      setAssessments(approved);
    } catch (err) {
      console.log(err);
      setError(err?.response?.data?.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dash-main" style={D.main}>
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MonitorCheck size={20} color="var(--primary)" />
          <div>
            <h1 style={D.pageTitle}>E-Assessments</h1>
            <p style={D.pageSub}>Available exams and tests</p>
          </div>
        </div>
      </header>

      {error && !loading && (
        <div style={D.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchAssessments} style={D.retryBtn}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={D.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading assessments…
        </div>
      ) : assessments.length === 0 ? (
        <section style={D.panel}>
          <div style={D.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No available assessments</div>
          </div>
        </section>
      ) : (
        <div className="assess-grid" style={D.grid}>
          {assessments.map((a) => (
            <div key={a.id} className="assess-card" style={D.card}>
              <div style={D.cardTop}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={D.cardTitle}>{a.title}</h2>
                  <p style={D.subject}>{a.subject}</p>
                </div>
                <span style={D.badge}>{a.status}</span>
              </div>

              <div className="assess-info" style={D.info}>
                <div style={D.infoBox}>
                  <span style={D.infoLabel}>
                    <Clock size={12} /> Duration
                  </span>
                  <strong style={D.infoValue}>{a.duration_minutes} mins</strong>
                </div>
                <div style={D.infoBox}>
                  <span style={D.infoLabel}>
                    <UserRound size={12} /> Teacher
                  </span>
                  <strong style={D.infoValue}>{a.teacher_name || "Teacher"}</strong>
                </div>
              </div>

              <button
                className="assess-take-btn"
                style={D.takeBtn}
                onClick={() => navigate(`/student/e-assessments/${a.id}`)}
              >
                Take Assessment
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

/* =========================================================
   STYLES — token-driven, mirrors the panel/card patterns
   used across the rest of the app
========================================================= */
const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  pageHeader: { marginBottom: 22 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--text)",
    marginBottom: 18,
  },
  retryBtn: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "36px 0",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
  },

  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)" },
  subject: { margin: "6px 0 0", fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600 },
  badge: {
    background: "var(--success-tint)",
    color: "var(--success)",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    height: "fit-content",
    textTransform: "capitalize",
    flexShrink: 0,
  },
  info: { display: "flex", gap: 10, marginBottom: 18 },
  infoBox: {
    flex: 1,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    padding: 12,
    borderRadius: "var(--radius-sm)",
    minWidth: 0,
  },
  infoLabel: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  infoValue: { fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" },
  takeBtn: {
    width: "100%",
    padding: 12,
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};