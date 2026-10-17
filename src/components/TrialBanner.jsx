import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import API from "../api";

/* Trial-period countdown for the institution's own staff.

   Doravo Finance sets the trial (Finance dashboard -> Trial Period); this only
   reads it (GET /api/tenant/license) and counts down to its end. It sits as a
   small fixed pill at the top centre so it never shifts any page layout, and is
   hidden for students (exam takers should not be distracted), finance accounts
   (they manage trials, they aren't on one) and signed-out visitors.

   When the trial has ENDED the whole screen is greyed out and made inert, with
   a message and a sign-out button, for everyone except Finance and the master
   admin. An exam already in progress (/take-assessment/...) is left alone so a
   student never loses a paper when the trial ends mid-exam. The server enforces
   the same thing for staff (middleware/authMiddleware.js, trialGate), so
   greying out is not the only protection.

   The countdown ticks from the server's own clock: the offset between the
   server's time and this device's clock is measured when the license loads, so
   a wrong device clock cannot make the trial look longer or shorter. */

const REFRESH_MS = 5 * 60 * 1000;
const NO_COUNTDOWN_ROLES = new Set(["student", "finance"]); // they don't see the pill
const LOCK_EXEMPT_ROLES = new Set(["finance"]);

const readUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

const pad = (n) => String(n).padStart(2, "0");

export function splitRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function TrialBanner() {
  const [trial, setTrial] = useState(null);
  const [offsetMs, setOffsetMs] = useState(0); // server time - device time
  const [now, setNow] = useState(Date.now());
  const [role, setRole] = useState(() => (localStorage.getItem("token") ? String(readUser().role || "").toLowerCase() : ""));
  const [isMaster, setIsMaster] = useState(() => !!readUser().isMaster);
  const { pathname } = useLocation();

  // sign-in / sign-out happen without a reload, so re-check who is signed in
  useEffect(() => {
    const iv = setInterval(() => {
      setRole(localStorage.getItem("token") ? String(readUser().role || "").toLowerCase() : "");
      setIsMaster(!!readUser().isMaster);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const signedIn = !!role && !LOCK_EXEMPT_ROLES.has(role);
  const showPill = signedIn && !NO_COUNTDOWN_ROLES.has(role);

  useEffect(() => {
    if (!signedIn) { setTrial(null); return undefined; }
    let alive = true;
    const load = async () => {
      try {
        const r = await API.get("/tenant/license");
        if (!alive) return;
        const t = r.data?.trial;
        setTrial(t && t.hasTrial ? t : null);
        if (r.data?.serverTime) setOffsetMs(new Date(r.data.serverTime).getTime() - Date.now());
      } catch {
        /* a banner must never get in the way — stay as we were */
      }
    };
    load();
    const iv = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(iv); };
  }, [signedIn, role]);

  useEffect(() => {
    if (!trial) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [trial]);

  const msLeft = trial ? new Date(trial.endsAt).getTime() - (now + offsetMs) : 1;
  const expired = !!trial && msLeft <= 0;
  const inExam = pathname.startsWith("/take-assessment");
  const locked = signedIn && expired && !isMaster && !inExam;

  // grey everything out and stop it taking clicks/keys (the page underneath is inert)
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    if (locked) { root.setAttribute("inert", ""); root.style.filter = "grayscale(1)"; root.style.opacity = "0.55"; }
    return () => { root.removeAttribute("inert"); root.style.filter = ""; root.style.opacity = ""; };
  }, [locked]);

  if (!signedIn || !trial) return null;

  const { days, hours, minutes, seconds } = splitRemaining(msLeft);
  const urgent = !expired && msLeft < 3 * 86400 * 1000;

  const tone = expired
    ? { bg: "#FEF2F2", fg: "#B91C1C", border: "#FCA5A5" }
    : urgent
      ? { bg: "#FFFBEB", fg: "#92400E", border: "#FCD34D" }
      : { bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" };

  const signOut = () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    window.location.href = "/login";
  };

  if (locked) {
    // portalled to <body>, outside #root, so the greying/inert on #root doesn't apply to the message itself
    return createPortal(
      <div role="alertdialog" aria-modal="true" aria-labelledby="trial-ended-title"
        style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(90,90,90,.25)" }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "#fff", color: "#111827", borderRadius: 16, padding: 28, boxShadow: "0 10px 40px rgba(0,0,0,.25)", fontFamily: "Inter, system-ui, sans-serif" }}>
          <h2 id="trial-ended-title" style={{ margin: "0 0 8px", fontSize: 20 }}>Your trial period has ended</h2>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "#4B5563", lineHeight: 1.5 }}>
            This system is paused until the subscription is renewed. Please contact Doravo to continue. Your data is safe and will be there when access is restored.
          </p>
          <button onClick={signOut} style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#F9FAFB", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Sign out</button>
        </div>
      </div>,
      document.body
    );
  }

  if (!showPill) return null;

  return (
    <div
      role="status"
      aria-live="off"
      style={{ position: "fixed", top: 8, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 2000, pointerEvents: "none", padding: "0 8px" }}
    >
      <div
        title={trial.note || undefined}
        style={{
          pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center",
          padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif",
          background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`, boxShadow: "0 2px 8px rgba(16,24,40,.12)",
        }}
      >
        {expired ? (
          <span>Your trial period has ended. Please contact Doravo to continue.</span>
        ) : (
          <>
            <span>Trial period ends in</span>
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
              {days}d {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
            </span>
          </>
        )}
      </div>
    </div>
  );
}
