import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import PasswordInput, { authStyles } from "../components/PasswordInput";
import { getDefaultRoute } from "../permissions";

/* =========================================================
   FORCE PASSWORD CHANGE
   Shown when the logged-in account has mustChangePassword=true —
   either it's brand new, or an admin reset it to the default
   password. The person is stuck here (see App.jsx's ProtectedRoute
   and api.js's response interceptor) until they set their own
   password, then they're sent on to their normal dashboard.
========================================================= */
export default function ForcePasswordChange() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const routes = {
    student: "/student",
    teacher: "/teacher",
    admin: "/dashboard",
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("Choose a password different from your current one.");
      return;
    }

    try {
      setLoading(true);

      await API.put("/auth/change-password", {
        oldPassword,
        newPassword,
      });

      // clear the flag locally so ProtectedRoute stops bouncing us here
      const user = getUser();
      user.mustChangePassword = false;
      localStorage.setItem("user", JSON.stringify(user));

      const role = (user.role || "").toLowerCase();
      navigate(routes[role] || getDefaultRoute(user), { replace: true });

    } catch (err) {
      console.log("FORCE PASSWORD CHANGE ERROR:", err);
      setError(err.response?.data?.message || "Could not update password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.heading}>Set a new password</h1>
        <p style={styles.subtext}>
          Your account is using a temporary password. Choose a new one before
          you continue.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <PasswordInput
          id="oldPassword"
          label="Current (temporary) password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoComplete="current-password"
        />

        <PasswordInput
          id="newPassword"
          label="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Updating..." : "Update password & continue"}
        </button>

        <button type="button" onClick={logout} style={styles.logoutBtn}>
          Log out instead
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg, #0F1115)",
    padding: 20,
  },
  card: {
    width: 420,
    maxWidth: "100%",
    background: "var(--card, #171A21)",
    border: "1px solid var(--border, #323844)",
    borderRadius: 16,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "var(--text, #fff)",
  },
  subtext: {
    margin: "0 0 6px 0",
    fontSize: 14,
    color: "var(--text-muted, #9198A6)",
    lineHeight: 1.5,
  },
  error: {
    background: "var(--destructive-tint, rgba(220,38,38,0.18))",
    color: "var(--destructive, #FB7185)",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
  },
  submitBtn: {
    marginTop: 6,
    padding: "12px 16px",
    borderRadius: 11,
    border: "none",
    background: "var(--primary, #8B1E2D)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  logoutBtn: {
    padding: "10px 16px",
    borderRadius: 11,
    border: "1px solid var(--border, #323844)",
    background: "transparent",
    color: "var(--text-secondary, #C7CCD6)",
    fontWeight: 600,
    cursor: "pointer",
  },
};
