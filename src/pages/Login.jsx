import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, GraduationCap } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import PasswordInput, { authStyles } from "../components/PasswordInput";
import { getDefaultRoute } from "../permissions";

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
      --text-secondary: #000000;
      --text-muted: #000307;
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

    * { box-sizing: border-box; }
    html, body { overflow-x: hidden; width: 100%; }
    body { background: var(--bg); }

    @keyframes authFadeUp { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:translateY(0);} }
    @keyframes authSpin { to { transform: rotate(360deg); } }
    @keyframes authDrift {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(14px, -18px) rotate(6deg); }
    }

    .auth-spin { animation: authSpin 0.8s linear infinite; }
    .auth-card { animation: authFadeUp 0.32s ease both; }
    .auth-blob { animation: authDrift 9s ease-in-out infinite; }

    .auth-input:focus, .auth-btn:focus-visible, .theme-toggle-btn:focus-visible, button:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .auth-input:focus {
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 3px var(--primary-tint);
    }

    /* 16px min font-size on inputs prevents iOS Safari from
       auto-zooming the viewport when a field gets focus. */
    .auth-input, input[type="text"], input[type="password"] {
      font-size: 16px !important;
    }

    .auth-submit-btn:hover:not(:disabled) { background: var(--primary-dark) !important; border-color: var(--primary-dark) !important; }

    .auth-card-shell {
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }

    /* ── phone-specific spacing/type tightening ── */
    @media (max-width: 480px) {
      .auth-card-shell { padding: 26px 22px !important; }
      .auth-heading { font-size: 23px !important; }
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
  /* ================= ROUTE MAP =================
     sub_admin isn't listed here on purpose — getDefaultRoute()
     below sends it to whichever page was granted at setup. */
  const routes = {
    student: "/student",
    teacher: "/teacher-dashboard",
    admin: "/dashboard",
  };

  /* ================= SESSION-EXPIRED MESSAGE ================= */
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("expired");
    if (reason === "idle") {
      setError("You were logged out after 5 minutes of inactivity. Please log in again.");
    } else if (reason === "session") {
      setError("Your session expired after 24 hours. Please log in again.");
    }
  }, []);

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
      if (user.mustChangePassword) {
        navigate("/force-password-change", { replace: true });
        return;
      }
      const role = (user.role || "").toLowerCase();
      navigate(routes[role] || getDefaultRoute(user), { replace: true });
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
      // Marks the start of this session for the 5-min-idle / 24-hr
      // absolute session-timeout checks in useSessionTimeout.
      const now = String(Date.now());
      localStorage.setItem("loginAt", now);
      localStorage.setItem("lastActivityAt", now);

      if (user.mustChangePassword) {
        navigate("/force-password-change", { replace: true });
        return;
      }

      navigate(routes[role] || getDefaultRoute(user), { replace: true });

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
    <div className="auth-stage" style={S.stage}>
      {/* ── hero photo, dimmed under the gradient so it reads as
           texture rather than competing with the card ── */}
      {heroImageOk && (
        <img
          src={HERO_IMAGE_SRC}
          alt=""
          aria-hidden="true"
          style={S.heroImg}
          onError={() => setHeroImageOk(false)}
        />
      )}

      {/* ── decorative gradient + blob backdrop ── */}
      <div style={S.glowTop} aria-hidden="true" />
      <div style={S.glowBottom} aria-hidden="true" />
      <svg
        className="auth-blob"
        aria-hidden="true"
        viewBox="0 0 200 200"
        style={{ ...S.blob, top: "8%", left: "8%", width: 160, animationDelay: "0s" }}
      >
        <path
          fill="rgba(255,255,255,0.10)"
          d="M45,-58C59,-49,71,-35,75,-19C79,-3,75,15,66,30C57,45,43,57,26,64C9,71,-11,73,-29,66C-47,59,-63,43,-70,24C-77,5,-75,-17,-64,-33C-53,-49,-33,-59,-13,-63C7,-67,31,-67,45,-58Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg
        className="auth-blob"
        aria-hidden="true"
        viewBox="0 0 200 200"
        style={{ ...S.blob, bottom: "10%", right: "10%", width: 200, animationDelay: "2.5s" }}
      >
        <path
          fill="rgba(251, 251, 251, 0.08)"
          d="M39,-51C51,-42,61,-30,66,-15C71,0,71,17,64,32C57,47,43,60,26,66C9,72,-11,71,-28,64C-45,57,-59,44,-67,27C-75,10,-77,-11,-69,-27C-61,-43,-43,-54,-25,-62C-7,-70,13,-75,39,-51Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* ── centered glass card. Fixed comfortable width instead of
           the old 90%-shell/40vh split so it reads the same, and
           legibly, on every screen size ── */}
      <div className="auth-card auth-card-shell" style={S.cardShell}>
        <div style={S.cardInner}>
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

        <div style={{ marginTop: 26, textAlign: "center" }}>
          <h1 className="auth-heading" style={S.heading}>Welcome back</h1>
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
              "Sign in"
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
  /* full-bleed gradient stage that hosts the centered card,
     built from the same maroon tones as the old split-panel
     visual, so the brand feel carries over 1:1 */
  stage: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    background: "linear-gradient(160deg, #3A0E15 66%, #6F1725 99%, #8B1E2D 100%)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  heroImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
    opacity: 0.50,
  },
  glowTop: {
    position: "absolute",
    top: -140,
    left: -120,
    width: 380,
    height: 380,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)",
    filter: "blur(10px)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    right: -140,
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)",
    filter: "blur(10px)",
  },
  blob: {
    position: "absolute",
    pointerEvents: "none",
  },

  /* ── centered glassmorphic card ──
     FIXED: was `position: "CENTER"` (not a real CSS value) and
     `width: 70%` fighting `maxWidth: 60%`, which made the card's
     effective size unpredictable across breakpoints. Also bumped
     the fill opacity from 10% -> 94% (light) so body text keeps
     proper contrast instead of the maroon gradient bleeding
     through and muddying it. */
  cardShell: {
    position: "relative",
    width: "100%",
    maxWidth: 1200,
    height: "90%",
    MaxHeight: 700,
  display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "color-mix(in srgb, var(--card) 1%, transparent)",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: 20,
    boxShadow: "0 24px 60px -20px rgba(15,8,9,0.55)",
    padding: "32px 28px",
  },
  /* content block inside the card.
     FIXED: was `maxWidth: "90"` — a number with no unit is invalid
     CSS and silently does nothing, so the block never actually
     constrained itself. */
  cardInner: {
    width: "100%",
    maxWidth: 400,
    margin: "0 auto",
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
    fontSize: 27,
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
    marginTop: 24,
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
    letterSpacing: "0.01em",
    fontFamily: "inherit",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },

  footerNote: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 11.5,
    color: "var(--text-muted)",
    fontWeight: 500,
  },
};