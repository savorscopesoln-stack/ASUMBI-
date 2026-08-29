import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";

/* =========================================================
   SESSION TIMEOUT
   Mounted once at the app root (inside <BrowserRouter>).

   Two independent rules, either one logs the user out:
   1. INACTIVITY  — 5 minutes with no mouse/keyboard/touch/scroll
      activity anywhere in the app.
   2. ABSOLUTE    — 24 hours since the user actually logged in,
      no matter how active they've been. Login.jsx stamps
      "loginAt" in localStorage the moment a login succeeds.

   The exam-taking flow (/take-assessment...) is a standalone,
   self-timed gate with its own short-lived token — it's
   deliberately left alone here so this doesn't fight with a
   student mid-exam.
========================================================= */

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const ABSOLUTE_SESSION_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHECK_INTERVAL_MS = 10 * 1000; // how often we check the clocks
const ACTIVITY_WRITE_THROTTLE_MS = 5000; // don't hammer localStorage on every mousemove

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
  "click",
];

export default function useSessionTimeout() {
  const navigate = useNavigate();
  const lastWriteRef = useRef(0);

  useEffect(() => {
    const isExamPage = () =>
      window.location.pathname.startsWith("/take-assessment");

    const clearSessionKeys = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginAt");
      localStorage.removeItem("lastActivityAt");
    };

    const forceLogout = (reason) => {
      clearSessionKeys();
      if (window.location.pathname !== "/login") {
        navigate(`/login?expired=${reason}`, { replace: true });
      }
    };

    const markActivity = () => {
      if (isExamPage()) return;
      const now = Date.now();
      if (now - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWriteRef.current = now;
      localStorage.setItem("lastActivityAt", String(now));
    };

    const tick = () => {
      if (isExamPage()) return;
      if (!isLoggedIn()) return;

      const now = Date.now();

      const loginAtRaw = localStorage.getItem("loginAt");
      const loginAt = loginAtRaw ? Number(loginAtRaw) : now;
      if (now - loginAt > ABSOLUTE_SESSION_LIMIT_MS) {
        forceLogout("session");
        return;
      }

      const lastActivityRaw = localStorage.getItem("lastActivityAt");
      const lastActivityAt = lastActivityRaw ? Number(lastActivityRaw) : now;
      if (now - lastActivityAt > INACTIVITY_LIMIT_MS) {
        forceLogout("idle");
      }
    };

    // Seed activity immediately so a freshly-loaded tab isn't treated
    // as already idle before the user has done anything.
    markActivity();

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, markActivity, { passive: true })
    );
    const interval = setInterval(tick, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, markActivity)
      );
      clearInterval(interval);
    };
  }, [navigate]);
}
