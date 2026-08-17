import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, GraduationCap } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import PasswordInput, { authStyles } from "../components/PasswordInput";

/* ─── design tokens ───
   Same variable names/values as Dashboard.jsx so the app looks
   seamless whether a user lands on /login or /dashboard first.
   Injected under its own id so it's safe to mount before or
   alongside Dashboard's stylesheet.
*/
const injectAuthStyles = () => {
  if (document.getElementById("auth-tokens")) return;
  const el = document.createElement("style");
  el.id = "auth-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); }

    @keyframes authFadeUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
    @keyframes authSpin { to { transform: rotate(360deg); } }

    .auth-spin { animation: authSpin 0.8s linear infinite; }
    .auth-card { animation: authFadeUp 0.28s ease both; }

    .auth-input:focus, .auth-btn:focus-visible, .theme-toggle-btn:focus-visible, button:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .auth-input:focus {
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 3px var(--primary-tint);
    }

    .auth-submit-btn:hover:not(:disabled) { background: var(--primary-dark) !important; border-color: var(--primary-dark) !important; }

    .auth-visual-caption {
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    @media (max-width: 980px) {
      .auth-visual { display: none !important; }
      .auth-visual-mobile { display: flex !important; }
    }
    @media (min-width: 981px) {
      .auth-visual-mobile { display: none !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/*
  Hero photo: reference a PUBLIC path (not a static import) so a
  missing file degrades to a designed gradient panel instead of
  crashing the Vite build.

  Add the real photo at:  frontend/public/assets/student-hero.jpg
  (a college student holding books, portrait/vertical orientation
  works best — see the redesign brief for full guidance).
*/
const HERO_IMAGE_SRC = "/assets/student-hero.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [heroImageOk, setHeroImageOk] = useState(true);

  const navigate = useNavigate();
  const { theme } = useTheme();

  /* ================= ROUTE MAP (unchanged) ================= */
  const routes = {
    student: "/student",
    teacher: "/teacher-dashboard",
    admin: "/dashboard",
    staff: "/dashboard",
  };

  /* ================= AUTO REDIRECT (unchanged) ================= */
  useEffect(() => {
    injectAuthStyles();

    const token = localStorage.getItem("token");

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch {
      user = null;
    }

    if (token && user?.role) {
      const role = (user.role || "").toLowerCase();
      navigate(routes[role] || "/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  /* ================= LOGOUT (unchanged) ================= */
  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* ================= LOGIN (unchanged) ================= */
  const login = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await API.post("/auth/login", {
        username,
        password,
      });

      const { token, user } = res.data;

      if (!token || !user) {
        setError("Invalid server response.");
        return;
      }

      const role = (user.role || "").toLowerCase();

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate(routes[role] || "/dashboard", { replace: true });

    } catch (err) {
      console.log("LOGIN ERROR:", err);

      const status = err.response?.status;

      if (status === 401) {
        logout();
        setError("Invalid username or password.");
        return;
      }

      if (status === 403) {
        setError("You do not have permission to access this system.");
        return;
      }

      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* ── Left: visual panel (desktop/tablet) ── */}
      <div className="auth-visual" style={S.visual}>
        <div style={S.visualGlow} aria-hidden="true" />
        {heroImageOk && (
          <img
            src={HERO_IMAGE_SRC}
            alt="Asumbi student carrying books on campus"
            style={S.visualImg}
            onError={() => setHeroImageOk(false)}
          />
        )}
        <div style={S.visualOverlay} aria-hidden="true" />
        <div className="auth-visual-caption" style={S.visualCaption}>
          <div style={S.visualCaptionTitle}>Asumbi Teachers Training College</div>
          <div style={S.visualCaptionSub}>Smart Campus Management System</div>
        </div>
      </div>

      {/* ── Compact banner (mobile only) ── */}
      <div className="auth-visual-mobile" style={S.visualMobile}>
        {heroImageOk && (
          <img
            src={HERO_IMAGE_SRC}
            alt="Asumbi student carrying books on campus"
            style={S.visualImg}
            onError={() => setHeroImageOk(false)}
          />
        )}
        <div style={S.visualOverlay} aria-hidden="true" />
      </div>

      {/* ── Right: form panel ── */}
      <div style={S.formPanel}>
        <div className="auth-card" style={S.formCard}>

          {/* Brand + theme toggle */}
          <div style={S.brandRow}>
            <div style={S.brandMark}>
              <div style={S.logoSquare}>
                <GraduationCap size={20} color="#fff" strokeWidth={2.25} />
              </div>
              <div>
                <div style={S.brandName}>ASUMBI</div>
                <div style={S.brandSub}>Smart Campus</div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div style={{ marginTop: 34 }}>
            <h1 style={S.heading}>Welcome back</h1>
            <p style={S.subheading}>Sign in to continue to your account.</p>
          </div>

          {error && (
            <div role="alert" style={S.errorBanner}>
              <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={login} style={S.form} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="username" style={authStyles.label}>Username</label>
              <input
                id="username"
                type="text"
                className="auth-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                style={authStyles.input}
              />
            </div>

            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputStyle={{}}
            />

            <button
              type="submit"
              disabled={loading}
              className="auth-btn auth-submit-btn"
              style={{
                ...S.submitBtn,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="auth-spin" />
                  Signing in…
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>

          <p style={S.footerNote}>
            © {new Date().getFullYear()} Asumbi Teachers Training College
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   STYLES
════════════════════════════════ */
const S = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
    background: "var(--bg)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  /* ── visual panel (desktop) ── */
  visual: {
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(160deg, #3A0E15 0%, #6F1725 45%, #8B1E2D 100%)",
    minHeight: "100vh",
  },
  visualGlow: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)",
    filter: "blur(10px)",
  },
  visualImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
  },
  visualOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(15,8,9,0.55) 0%, rgba(15,8,9,0.05) 45%, transparent 70%)",
  },
  visualCaption: {
    position: "absolute",
    left: 28,
    bottom: 28,
    right: 28,
    background: "rgba(15,8,9,0.35)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 14,
    padding: "14px 18px",
    color: "#fff",
  },
  visualCaptionTitle: { fontSize: 15, fontWeight: 700, letterSpacing: "0.01em" },
  visualCaptionSub: { fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.82)", marginTop: 2 },

  /* ── compact banner (mobile) ── */
  visualMobile: {
    display: "none",
    position: "relative",
    height: 180,
    overflow: "hidden",
    background: "linear-gradient(160deg, #3A0E15 0%, #6F1725 45%, #8B1E2D 100%)",
  },

  /* ── form panel ── */
  formPanel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    background: "var(--bg)",
  },
  formCard: {
    width: "100%",
    maxWidth: 400,
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandMark: { display: "flex", alignItems: "center", gap: 10 },
  logoSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: { fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "0.02em" },
  brandSub: { fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" },

  heading: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  subheading: {
    margin: "6px 0 0",
    fontSize: 14.5,
    color: "var(--text-secondary)",
    fontWeight: 500,
  },

  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)",
    borderRadius: 11,
    padding: "11px 14px",
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--text)",
    marginTop: 22,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    marginTop: 26,
  },

  submitBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    minHeight: 50,
    background: "var(--primary)",
    color: "#fff",
    border: "1px solid var(--primary)",
    borderRadius: 11,
    fontSize: 14.5,
    fontWeight: 700,
    letterSpacing: "0.03em",
    fontFamily: "inherit",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },

  footerNote: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 11.5,
    color: "var(--text-muted)",
    fontWeight: 500,
  },
};