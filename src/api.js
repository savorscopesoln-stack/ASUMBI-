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
// FILE BASE URL
// Uploaded photos are served from the backend origin at /uploads/...,
// not under /api — strip the trailing /api (if any) from BASE_URL so
// a stored photoUrl like "/uploads/photos/xyz.jpg" resolves correctly
// both in dev (proxied) and production (VITE_API_URL set explicitly).
// ================================
export const FILE_BASE_URL = BASE_URL.replace(/\/api\/?$/, "");

export const resolvePhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${FILE_BASE_URL}${photoUrl}`;
};

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
    // MANDATORY PASSWORD CHANGE
    // Stay logged in (the token is still valid) but bounce to the
    // forced change-password screen instead of wiping the session.
    // ============================
    if (status === 403 && error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED") {
      if (window.location.pathname !== "/force-password-change") {
        window.location.href = "/force-password-change";
      }
      return Promise.reject(error);
    }

    // ============================
    // AUTH ISSUES (401 + 403 FIX)
    // ============================
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // A student on the standalone exam page never went through the
      // normal /login screen — if their exam-scoped session expires or
      // gets rejected mid-exam, send them back to that same page (which
      // re-shows the username + exam-password gate) instead of dumping
      // them on the full portal login they may not have credentials for.
      const onExamPage = window.location.pathname.startsWith("/take-assessment/");

      if (onExamPage) {
        if (!window.location.search.includes("expired=1")) {
          window.location.href = `${window.location.pathname}?expired=1`;
        }
      } else if (window.location.pathname !== "/login") {
        // avoid redirect loop
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;