import axios from "axios";

// ================================
// BASE URL
// In dev, "/api" is proxied to localhost:5000 by vite.config.js.
// In production there is no such proxy, so we need the real backend
// URL — set VITE_API_URL in your frontend .env / Vercel env vars,
// e.g. VITE_API_URL=https://your-backend.onrender.com/api
// ================================
const BASE_URL = import.meta.env.VITE_API_URL || "/api";
export { BASE_URL };

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

// Same resolution logic as resolvePhotoUrl above, just named for what it's
// actually used for elsewhere (cover page PDFs, question diagram images) —
// kept as a separate export so call sites read clearly, not because the
// logic differs.
export const resolveFileUrl = resolvePhotoUrl;

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
// Describes this device to the server for the exam "Desktop only" switch
// (backend/utils/deviceRestriction.js). The User-Agent alone can't tell an
// iPad from a MacBook (iPadOS sends a Mac UA), so we also report touch
// support, which real Macs don't have.
// A stable id for THIS browser (same key the exam page uses to bind a token to
// a device). Sent so that when a phone is rejected, an admin can allow that
// one device from the Device Locks tab.
const examDeviceId = () => {
  try {
    let id = localStorage.getItem("exam_device_id");
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem("exam_device_id", id);
    }
    return id;
  } catch {
    return "";
  }
};

const clientDeviceHeader = () => {
  try {
    return JSON.stringify({
      deviceId: examDeviceId(),
      platform: navigator.platform || "",
      uaPlatform: navigator.userAgentData?.platform || "",
      mobile: navigator.userAgentData?.mobile === true,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    });
  } catch {
    return "";
  }
};

API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem("token");

    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    // Only exam traffic needs it — keeps every other request unchanged.
    if (String(req.url || "").startsWith("/e-assessments")) {
      const dev = clientDeviceHeader();
      if (dev) req.headers["X-Client-Device"] = dev;
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
    // MANDATORY PROFILE COMPLETION (students)
    // Same idea as above — stay logged in, bounce to the forced
    // "complete your profile" screen instead of wiping the session.
    // ============================
    if (status === 403 && error.response?.data?.code === "PROFILE_INCOMPLETE") {
      if (window.location.pathname !== "/complete-profile") {
        window.location.href = "/complete-profile";
      }
      return Promise.reject(error);
    }

    // ============================
    // DEVICE NOT ALLOWED (exam "Desktop only" switch)
    // A 403, but NOT an auth failure — the session is fine, this phone/
    // tablet just isn't permitted. Must not wipe the token or bounce to
    // ?expired=1 (the block below does both for any other 403): the exam
    // page shows its own "use a laptop" screen, and if the admin switches
    // the restriction off the student can carry straight on.
    // ============================
    if (status === 403 && error.response?.data?.code === "DEVICE_NOT_ALLOWED") {
      return Promise.reject(error);
    }

    // ============================
    // AUTH ISSUES (401 + 403 FIX)
    // A failed /auth/login POST itself is never a "session expired,
    // force logout" event — it's just wrong credentials, and every
    // login form (the main portal Login page, the student exam
    // Picker's own inline login) already catches this and shows its
    // own inline error. Letting this block run for that request was
    // hijacking the response before the form's own catch could ever
    // render anything, bouncing the user to /login mid-attempt.
    // ============================
    const isLoginAttempt = error.config?.url === "/auth/login";

    if (!isLoginAttempt && (status === 401 || status === 403)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // A student on the standalone exam flow never went through the
      // normal /login screen — if their exam-scoped session expires or
      // gets rejected mid-exam (or while browsing the assessment list
      // on the picker itself, before an id is chosen), send them back
      // to that same page (which re-shows its own login/expired gate)
      // instead of dumping them on the full portal login they may not
      // have credentials for. Matches both /take-assessment (the
      // picker, no id yet) and /take-assessment/:id (a specific exam).
      const onExamPage =
        window.location.pathname === "/take-assessment" ||
        window.location.pathname.startsWith("/take-assessment/");

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