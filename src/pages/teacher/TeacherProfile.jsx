import React, { useState, useEffect, useRef } from "react";
import API, { resolvePhotoUrl } from "../../api";
import { Camera, Loader2 } from "lucide-react";

/* ─── design-token stylesheet ───
   Copied verbatim from Dashboard.jsx (same id guard — if the user
   already visited /dashboard this is a no-op and both pages share
   one injected <style>). Replaces the old page-local "teacher-
   profile-tokens" stylesheet, which only carried a spin keyframe
   and left everything else as one-off hex values disconnected
   from the rest of the app. */
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

    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }

    input:focus-visible, button:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

export default function TeacherProfile() {
  injectStyles();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [user, setUser] = useState(storedUser);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // profile photo
  const [photoMsg, setPhotoMsg] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Refresh from the server on mount so photoUrl reflects the latest
  // upload (localStorage's copy is only as fresh as the last login).
  useEffect(() => {
    API.get("/teacher/profile")
      .then((res) => {
        setUser((u) => ({ ...u, ...res.data }));
      })
      .catch((err) => console.log(err));
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setPhotoMsg("");
      setUploadingPhoto(true);

      const fd = new FormData();
      fd.append("photo", file);

      const res = await API.put("/teacher/profile/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = { ...user, photoUrl: res.data.photoUrl };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setPhotoMsg("✅ Profile photo updated");
    } catch (err) {
      console.log(err);
      setPhotoMsg(`❌ ${err.response?.data?.message || "Failed to upload photo"}`);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const changePassword = async () => {
    if (!oldPass || !newPass) {
      setMsg("⚠️ Fill all fields");
      return;
    }

    try {
      setLoading(true);
      await API.put("/auth/change-password", {
        oldPassword: oldPass,
        newPassword: newPass,
      });

      setMsg("✅ Password updated successfully");
      setOldPass("");
      setNewPass("");
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to update password"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>👤 Teacher Profile</h2>

      {/* ================= ID CARD ================= */}
      <div style={styles.idCard}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.school}>ASUMBI TTC</h3>
            <span style={styles.subtitle}>STAFF IDENTIFICATION</span>
          </div>

          <span style={styles.badge}>STAFF ID</span>
        </div>

        <div style={styles.body}>
          {/* LEFT SIDE */}
          <div style={styles.info}>
            <h2 style={styles.name}>{user.name || "Teacher Name"}</h2>

            <p style={styles.meta}>
              <b>ID:</b> {user.username || "N/A"}
            </p>

            <p style={styles.meta}>
              <b>Subject:</b> {user.subject || "N/A"}
            </p>

            <span style={styles.tutorBadge}>
              {user.isClassTeacher
                ? "🎓 Class Teacher"
                : "📘 Subject Teacher"}
            </span>
          </div>

          {/* RIGHT SIDE */}
          <div style={styles.avatarWrap}>
            {user.photoUrl ? (
              <img src={resolvePhotoUrl(user.photoUrl)} alt="Profile" style={styles.avatarImg} />
            ) : (
              <div style={styles.avatar}>{user.name?.charAt(0) || "T"}</div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={styles.avatarEditBtn}
              className="dash-btn"
              aria-label="Change profile photo"
            >
              {uploadingPhoto ? <Loader2 size={12} className="dash-spin" /> : <Camera size={12} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {!user.photoUrl && (
          <p style={styles.photoNudge}>⚠️ No profile photo on file — tap the camera icon to add one.</p>
        )}
        {photoMsg && <p style={styles.message}>{photoMsg}</p>}
      </div>

      {/* ================= PASSWORD ================= */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>🔒 Change Password</h3>

        <input
          type="password"
          placeholder="Old Password"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={changePassword}
          disabled={loading}
          className="dash-btn"
          style={{
            ...styles.btn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        {msg && <p style={styles.message}>{msg}</p>}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES — reads Dashboard.jsx's CSS variables directly, so
   this page matches its light background, white cards, borders,
   and maroon accent exactly (and stays in sync with the theme
   toggle via [data-theme='dark']).
========================================================= */
const styles = {
  page: {
    color: "var(--text)",
    padding: 20,
    background: "var(--bg)",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  title: {
    marginBottom: 16,
    fontWeight: 800,
    fontSize: 20,
    color: "var(--text)",
  },

  /* ===== ID CARD ===== */
  idCard: {
    background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
    padding: 20,
    borderRadius: "var(--radius)",
    marginBottom: 20,
    boxShadow: "var(--shadow)",
    border: "1px solid var(--border)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  school: {
    margin: 0,
    fontWeight: 800,
    letterSpacing: 1,
    color: "#fff",
  },

  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    fontWeight: 600,
  },

  badge: {
    background: "rgba(255,255,255,0.92)",
    color: "var(--primary-dark)",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
  },

  body: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  info: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  name: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#fff",
  },

  meta: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: 500,
  },

  tutorBadge: {
    marginTop: 8,
    padding: "4px 10px",
    borderRadius: 20,
    background: "var(--warning-tint)",
    color: "var(--warning)",
    fontWeight: 800,
    fontSize: 11,
    width: "fit-content",
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "#fff",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 800,
    boxShadow: "var(--shadow)",
  },

  avatarWrap: { position: "relative", width: 70, height: 70, flexShrink: 0 },
  avatarImg: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    objectFit: "cover",
    boxShadow: "var(--shadow)",
    border: "2px solid rgba(255,255,255,0.5)",
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--success)",
    color: "#fff",
    border: "2px solid var(--card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  photoNudge: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: 600,
  },

  /* ===== PASSWORD CARD ===== */
  card: {
    background: "var(--card)",
    padding: 20,
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
  },

  sectionTitle: {
    marginBottom: 4,
    fontWeight: 800,
    fontSize: 15,
    color: "var(--text)",
  },

  input: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  btn: {
    background: "var(--primary)",
    color: "#fff",
    padding: 10,
    border: "1px solid var(--primary)",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontFamily: "inherit",
    fontSize: 14,
  },

  message: {
    marginTop: 8,
    fontSize: 13,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
};