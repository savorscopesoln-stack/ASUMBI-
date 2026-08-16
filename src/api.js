import axios from "axios";

// ================================
// BASE URL
// In dev, "/api" is proxied to localhost:5000 by vite.config.js.
// In production there is no such proxy, so we need the real backend
// URL — set VITE_API_URL in your frontend .env / Vercel env vars,
// e.g. VITE_API_URL=https://your-backend.onrender.com/api
// ================================
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ================================
// AXIOS INSTANCE
// ================================
const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// ================================
// REQUEST INTERCEPTOR (TOKEN)
// ================================
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem("token");

    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    return req;
  },
  (error) => Promise.reject(error)
);

// ================================
// RESPONSE INTERCEPTOR (AUTH FIXED)
// ================================
API.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;

    // ============================
    // AUTH ISSUES (401 + 403 FIX)
    // ============================
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // avoid redirect loop
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;