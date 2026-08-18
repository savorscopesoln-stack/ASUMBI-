import React, { useState, useEffect } from "react";
import API from "../../api";
import { UserRound, KeyRound, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

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

    input:focus-visible, button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .profile-btn:hover { filter: brightness(0.95); }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .profile-two-col { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(el);
};

export default function StudentProfile() {
  injectStyles();

  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);

  // password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState("success");
  const [saving, setSaving] = useState(false);

  /* ================= LOAD PROFILE ================= */
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get("/student/profile");
      setUser(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  /* ================= CHANGE PASSWORD ================= */
  const changePassword = async () => {
    try {
      setMsg("");
      setSaving(true);

      await API.put("/auth/change-password", {
        oldPassword,
        newPassword,
      });

      setMsgTone("success");
      setMsg("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      console.log(err);
      setMsgTone("error");
      setMsg(err.response?.data?.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */
  return (
    <main className="dash-main" style={D.main}>
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserRound size={20} color="var(--primary)" />
          <div>
            <h1 style={D.pageTitle}>My Profile</h1>
            <p style={D.pageSub}>Your account details and security settings</p>
          </div>
        </div>
      </header>

      <div className="profile-two-col" style={D.twoCol}>
        {/* Profile info */}
        <section style={D.panel} aria-label="Profile information">
          <div style={D.panelHeader}>
            <h3 style={D.panelTitle}>Account Details</h3>
          </div>

          {loading ? (
            <div style={D.loadingState}>
              <Loader2 size={18} className="dash-spin" />
              Loading profile…
            </div>
          ) : (
            <div>
              <div style={D.infoRow}>
                <span style={D.infoLabel}>Name</span>
                <span style={D.infoValue}>{user.name || "—"}</span>
              </div>
              <div style={D.infoRow}>
                <span style={D.infoLabel}>Admission No</span>
                <span style={D.infoValue}>{user.admissionNo || "—"}</span>
              </div>
              <div style={{ ...D.infoRow, borderBottom: "none" }}>
                <span style={D.infoLabel}>Role</span>
                <span style={D.infoValue}>{user.role || "—"}</span>
              </div>
            </div>
          )}
        </section>

        {/* Password change */}
        <section style={D.panel} aria-label="Change password">
          <div style={D.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={17} color="var(--text-secondary)" />
              <h3 style={D.panelTitle}>Change Password</h3>
            </div>
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>Old Password</label>
            <input
              type="password"
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={D.input}
            />
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={D.input}
            />
          </div>

          <button
            onClick={changePassword}
            disabled={saving || !oldPassword || !newPassword}
            className="profile-btn"
            style={{ ...D.button, opacity: saving || !oldPassword || !newPassword ? 0.6 : 1 }}
          >
            {saving ? <Loader2 size={15} className="dash-spin" /> : null}
            {saving ? "Updating…" : "Update Password"}
          </button>

          {msg && (
            <div style={{ ...D.msg, color: msgTone === "success" ? "var(--success)" : "var(--destructive)" }}>
              {msgTone === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {msg}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ================= STYLES ================= */
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

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    alignItems: "start",
  },

  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  panelHeader: { marginBottom: 14 },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },

  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "20px 0",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
    gap: 12,
  },
  infoLabel: { fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 700 },
  infoValue: { fontSize: 13.5, color: "var(--text)", fontWeight: 600, textAlign: "right" },

  formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-secondary)",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 13.5,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  button: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "11px 16px",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13.5,
    fontFamily: "inherit",
    marginTop: 4,
  },

  msg: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    fontSize: 12.5,
    fontWeight: 600,
  },
};