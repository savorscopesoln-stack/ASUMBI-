import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

/* =========================================================
   COMPLETE PROFILE (STUDENTS)
   Shown right after a student's first (forced) password change —
   see App.jsx's ProtectedRoute and api.js's response interceptor,
   both of which bounce here whenever the logged-in account has
   profileIncomplete=true. They're stuck here until they fill in
   their details, then they're sent on to their normal dashboard.

   Name and admission number are set by staff at registration and
   are never editable here — everything else on the Students row
   is fair game.
========================================================= */
export default function CompleteProfile() {
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assessmentNumber, setAssessmentNumber] = useState("");

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

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!studentClass.trim() || !gender.trim() || !email.trim() || !phone.trim()) {
      setError("Class, gender, email, and phone are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.put("/student/profile", {
        studentClass: studentClass.trim(),
        gender: gender.trim(),
        email: email.trim(),
        phone: phone.trim(),
        assessmentNumber: assessmentNumber.trim(),
      });

      // Fresh token/user (old token still had profileIncomplete
      // baked in) — swap both in so we stop being bounced back here.
      const { token, user: freshUser } = res.data || {};
      if (token) localStorage.setItem("token", token);

      const user = freshUser || { ...getUser(), profileIncomplete: false };
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/student", { replace: true });
    } catch (err) {
      console.log("COMPLETE PROFILE ERROR:", err);
      setError(err.response?.data?.message || "Could not save profile. Try again.");
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
        <h1 style={styles.heading}>Complete your profile</h1>
        <p style={styles.subtext}>
          Before you continue, fill in your details below. Your name and
          admission number were set by the school and can't be changed here.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label} htmlFor="studentClass">Class</label>
          <input
            id="studentClass"
            type="text"
            placeholder="e.g. Form 2 East"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={styles.input}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="email"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
            autoComplete="tel"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="assessmentNumber">
            Assessment Number <span style={styles.optional}>(optional)</span>
          </label>
          <input
            id="assessmentNumber"
            type="text"
            value={assessmentNumber}
            onChange={(e) => setAssessmentNumber(e.target.value)}
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Saving..." : "Save & continue"}
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
    width: 440,
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
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-secondary, #C7CCD6)",
  },
  optional: {
    textTransform: "none",
    fontWeight: 500,
    color: "var(--text-muted, #9198A6)",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 11,
    border: "1px solid var(--border, #323844)",
    background: "var(--bg, #0F1115)",
    color: "var(--text, #fff)",
    fontSize: 13.5,
    boxSizing: "border-box",
    fontFamily: "inherit",
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
