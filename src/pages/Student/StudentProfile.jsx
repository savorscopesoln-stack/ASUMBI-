import React, { useState, useEffect } from "react";
import API from "../../api";

export default function StudentProfile() {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);

  // password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

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

      await API.put("/student/change-password", {
        oldPassword,
        newPassword,
      });

      setMsg("Password updated successfully ✅");
      setOldPassword("");
      setNewPassword("");

    } catch (err) {
      console.log(err);
      setMsg(err.response?.data?.message || "Failed to update password");
    }
  };

  /* ================= UI ================= */
  return (
    <div style={styles.container}>
      <h2>👤 My Profile</h2>

      {loading ? (
        <p>Loading profile...</p>
      ) : (
        <div style={styles.card}>
          <p><b>Name:</b> {user.name}</p>
          <p><b>Admission No:</b> {user.admissionNo}</p>
          <p><b>Role:</b> {user.role}</p>
        </div>
      )}

      {/* ================= PASSWORD CHANGE ================= */}
      <div style={styles.card}>
        <h3>🔐 Change Password</h3>

        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={changePassword} style={styles.button}>
          Update Password
        </button>

        {msg && <p style={styles.msg}>{msg}</p>}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    color: "white",
    padding: 20,
  },

  card: {
    background: "#1a0000",
    padding: 20,
    marginTop: 15,
    borderRadius: 10,
  },

  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: "none",
  },

  button: {
    padding: 10,
    width: "100%",
    background: "#800000",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  msg: {
    marginTop: 10,
    color: "#22c55e",
  },
};