import React, { useState, useEffect, useRef } from "react";
import API, { resolvePhotoUrl } from "../../api";
import { Camera, Loader2 } from "lucide-react";

/* Teacher portal has no shared "dash-spin" keyframe of its own —
   inject the tiny bit this page's spinner needs, no-op if already
   mounted by another teacher page. */
const injectSpinKeyframe = () => {
  if (document.getElementById("teacher-profile-tokens")) return;
  const el = document.createElement("style");
  el.id = "teacher-profile-tokens";
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }
  `;
  document.head.appendChild(el);
};

export default function TeacherProfile() {
  injectSpinKeyframe();

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

/* ================= STYLES ================= */
const styles = {
  page: {
    color: "#fff",
    padding: 20,
    background: "#0b0000",
    minHeight: "100vh",
    fontFamily: "Segoe UI, sans-serif",
  },

  title: {
    marginBottom: 15,
    fontWeight: 600,
  },

  /* ===== ID CARD (same size, refined look) ===== */
  idCard: {
    background: "linear-gradient(135deg,#7f1d1d,#0b0000)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.05)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  school: {
    margin: 0,
    fontWeight: 700,
    letterSpacing: 1,
  },

  subtitle: {
    fontSize: 11,
    opacity: 0.7,
  },

  badge: {
    background: "#fff",
    color: "#000",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: "bold",
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
    fontWeight: 700,
  },

  meta: {
    margin: 0,
    fontSize: 13,
    opacity: 0.85,
  },

  tutorBadge: {
    marginTop: 8,
    padding: "4px 10px",
    borderRadius: 20,
    background: "gold",
    color: "#000",
    fontWeight: "bold",
    fontSize: 11,
    width: "fit-content",
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#ffffff,#e5e5e5)",
    color: "#7f1d1d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: "bold",
    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
  },

  avatarWrap: { position: "relative", width: 70, height: 70, flexShrink: 0 },
  avatarImg: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    objectFit: "cover",
    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
    border: "2px solid rgba(255,255,255,0.15)",
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#16a34a",
    color: "#fff",
    border: "2px solid #0b0000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  photoNudge: {
    marginTop: 4,
    fontSize: 12,
    color: "#facc15",
  },

  /* ===== PASSWORD CARD ===== */
  card: {
    background: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    border: "1px solid rgba(255,255,255,0.08)",
  },

  sectionTitle: {
    marginBottom: 5,
    fontWeight: 600,
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.1)",
    outline: "none",
    background: "rgba(0,0,0,0.4)",
    color: "#fff",
  },

  btn: {
    background: "#16a34a",
    color: "#fff",
    padding: 10,
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    transition: "0.3s",
  },

  message: {
    marginTop: 8,
    fontSize: 13,
  },
};