import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import {
  MonitorCheck, Clock, UserRound, Loader2, Inbox, AlertTriangle,
  User, Lock, LogIn, ClipboardList,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted elsewhere. ─── */
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

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
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



const hasUsablePortalSession = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || payload.role !== "student") return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) return false;
  if (payload.examOnly) return false;
  return true;
};

export default function TakeAssessmentPicker() {
  injectStyles();

  const navigate = useNavigate();

  // login | list
  const [phase, setPhase] = useState(hasUsablePortalSession() ? "list" : "login");

  // login step
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // list step
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (phase === "list") fetchAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/e-assessments");
      const data = res.data?.assessments || res.data?.data || res.data || [];

      const approved = data.filter(
        (a) => String(a.status || "").toLowerCase() === "approved"
      );

      setAssessments(approved);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loggingIn) return;
    if (!username.trim() || !password.trim()) {
      setLoginError("Enter both your username and password.");
      return;
    }
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await API.post("/auth/login", {
        username: username.trim(),
        password: password.trim(),
      });

      const { token, user } = res.data || {};
      if (!token || !user) {
        setLoginError("Invalid server response.");
        return;
      }
      if (String(user.role || "").toLowerCase() !== "student") {
        setLoginError("This login is for students only.");
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.mustChangePassword) {
        navigate("/force-password-change", { replace: true });
        return;
      }

      setPhase("list");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setLoginError("Invalid username or password.");
      } else {
        setLoginError(err?.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  /* ═══════════════════ LOGIN GATE ═══════════════════ */
  if (phase === "login") {
    return (
      <div style={S.stateWrap}>
        <div style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--primary-tint)", marginBottom: 16 }}>
            <ClipboardList size={26} color="var(--primary)" />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "var(--text)" }}>
            Take an Assessment
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "var(--text-secondary)", textAlign: "center" }}>
            Log in with your student account to see the assessments available to you.
          </p>

          <form onSubmit={handleLogin} style={{ width: "100%" }}>
            <label style={S.fieldLabel}>Username</label>
            <div style={{ ...S.inputWithIcon, marginBottom: 14 }}>
              <User size={16} color="var(--text-muted)" />
              <input
                style={S.iconInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                autoComplete="username"
              />
            </div>

            <label style={S.fieldLabel}>Password</label>
            <div style={{ ...S.inputWithIcon, marginBottom: 14 }}>
              <Lock size={16} color="var(--text-muted)" />
              <input
                type="password"
                style={S.iconInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div style={S.errorBanner} role="alert">
                <AlertTriangle size={15} color="var(--destructive)" style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" style={S.primaryBtn} disabled={loggingIn}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loggingIn ? <Loader2 size={16} className="dash-spin" /> : <LogIn size={16} />}
                {loggingIn ? "Logging in…" : "Log In"}
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ═══════════════════ ASSESSMENT LIST ═══════════════════ */
  return (
    <main className="dash-main" style={S.main}>
      <header style={S.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MonitorCheck size={20} color="var(--primary)" />
          <div>
            <h1 style={S.pageTitle}>Take an Assessment</h1>
            <p style={S.pageSub}>Pick an assessment below to begin</p>
          </div>
        </div>
      </header>

      {error && !loading && (
        <div style={S.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchAssessments} style={S.retryBtn}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={S.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading assessments…
        </div>
      ) : assessments.length === 0 ? (
        <section style={S.panel}>
          <div style={S.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No available assessments right now</div>
          </div>
        </section>
      ) : (
        <div className="assess-grid" style={S.grid}>
          {assessments.map((a) => (
            <div key={a.id} className="assess-card" style={S.card}>
              <div style={S.cardTop}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={S.cardTitle}>{a.title}</h2>
                  <p style={S.subject}>{a.subject}</p>
                </div>
                <span style={S.badge}>{a.status}</span>
              </div>

              <div className="assess-info" style={S.info}>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>
                    <Clock size={12} /> Duration
                  </span>
                  <strong style={S.infoValue}>{a.duration_minutes} mins</strong>
                </div>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>
                    <UserRound size={12} /> Teacher
                  </span>
                  <strong style={S.infoValue}>{a.teacher_name || "Teacher"}</strong>
                </div>
              </div>

              <button
                className="assess-take-btn"
                style={S.takeBtn}
                onClick={() => navigate(`/take-assessment/${a.id}`)}
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
   STYLES
========================================================= */
const S = {
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

  /* login gate */
  stateWrap: {
    minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 16, padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  panelCard: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "34px 30px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", boxShadow: "var(--shadow)",
  },
  iconCircle: {
    width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
  },
  fieldLabel: {
    display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6,
  },
  inputWithIcon: {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)",
    boxSizing: "border-box",
  },
  iconInput: {
    flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit",
  },
  primaryBtn: {
    width: "100%", padding: "13px 18px", border: "none", borderRadius: "var(--radius-sm)",
    background: "var(--primary)", color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer",
    marginTop: 8,
  },
};
