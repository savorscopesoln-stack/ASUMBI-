import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  /* ================= ROUTE MAP ================= */
  const routes = {
    student: "/student",
    teacher: "/teacher-dashboard",
    admin: "/dashboard",
    staff: "/dashboard",
  };

  /* ================= AUTO REDIRECT ================= */
  useEffect(() => {
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
  }, [navigate]);

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* ================= LOGIN ================= */
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
    <div className="login-container">
      <form onSubmit={login} className="login-card">

        <h1>School Login</h1>
        <p>Enter your credentials</p>

        {error && <div className="error">{error}</div>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

      </form>

      <style>{`
        .login-container {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #0a0f1c, #1a0004);
        }

        .login-card {
          width: 360px;
          padding: 30px;
          border-radius: 12px;
          background: rgba(0,0,0,0.7);
          color: white;
          text-align: center;
        }

        input {
          width: 100%;
          padding: 12px;
          margin-bottom: 12px;
          border-radius: 8px;
          border: none;
          outline: none;
        }

        button {
          width: 100%;
          padding: 12px;
          background: #7f1d1d;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error {
          background: #b91c1c;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}