import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Fingerprint, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { passkeysAvailable, registerThisDevice } from "../utils/passkey";

/* After a user signs in on a MOBILE phone/tablet, offer to turn on fingerprint / face
   sign-in for that device. Shown once per login. Buttons:
     - "Turn on"         -> registers this device (same call as the profile page)
     - "Not now"         -> closes it; it comes back at the next login
     - "Don't show again"-> never asked again for this account on this device
   Skipped for: exam-only sessions, finance accounts (password + authenticator code),
   accounts that must change their password, the login/exam pages, desktops, and
   devices that already have fingerprint/face sign-in turned on from this prompt. */

const isMobileDevice = () => {
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPadOS reports a Mac user agent
};

const SKIP_PATHS = ["/login", "/take-assessment", "/force-password-change", "/register", "/complete-profile"];

const readUser = () => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } };
const keyFor = (kind, u) => `doravo_bio_${kind}_${String(u?.role || "").toLowerCase()}_${u?.id}`;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export default function BiometricPrompt() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }

  useEffect(() => {
    if (open) return undefined;
    if (SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return undefined;
    const token = store.get("token");
    const user = readUser();
    if (!token || !user?.id || !user?.role) return undefined;
    if (user.examOnly || user.mustChangePassword || String(user.role).toLowerCase() === "finance") return undefined;
    if (!isMobileDevice()) return undefined;
    if (store.get(keyFor("off", user)) === "1" || store.get(keyFor("done", user)) === "1") return undefined;

    // once per login: loginAt changes every time the user signs in
    const loginAt = store.get("loginAt") || "";
    try { if (sessionStorage.getItem("doravo_bio_seen") === loginAt) return undefined; } catch { /* ignore */ }

    let cancelled = false;
    passkeysAvailable().then((ok) => {
      if (cancelled || !ok) return;
      try { sessionStorage.setItem("doravo_bio_seen", loginAt); } catch { /* ignore */ }
      setMsg(null);
      setOpen(true);
    });
    return () => { cancelled = true; };
  }, [pathname, open]);

  if (!open) return null;
  const user = readUser();

  const turnOn = async () => {
    setBusy(true); setMsg(null);
    try {
      const ua = navigator.userAgent || "";
      const label = /iPhone|iPod/.test(ua) ? "iPhone" : /iPad|Macintosh/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android phone" : "This device";
      await registerThisDevice(label);
      store.set(keyFor("done", user), "1");
      setMsg({ tone: "ok", text: "Done. Next time use “Sign in with fingerprint / face” on the login page." });
      setTimeout(() => setOpen(false), 2200);
    } catch (e) {
      setMsg({ tone: "err", text: e.message });
    } finally { setBusy(false); }
  };
  const never = () => { store.set(keyFor("off", user), "1"); setOpen(false); };

  const btn = { width: "100%", padding: "13px 16px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="bio-title"
        style={{ width: "100%", maxWidth: 480, background: "var(--card, #fff)", color: "var(--text, #0B0F19)", borderRadius: "18px 18px 0 0", padding: "24px 20px calc(20px + env(safe-area-inset-bottom, 0px))", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Fingerprint size={26} color="var(--primary, #8B1E2D)" aria-hidden="true" />
          <h2 id="bio-title" style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Sign in faster next time</h2>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.6, color: "var(--text-muted, #64748B)" }}>
          Use this phone's fingerprint, face or screen lock instead of typing your password. Your fingerprint or face never leaves the phone. Only turn it on for a phone that is yours.
        </p>

        {msg && (
          <div role="status" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, fontSize: 14, color: msg.tone === "ok" ? "var(--success, #15803D)" : "var(--destructive, #DC2626)" }}>
            {msg.tone === "ok" ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
            <span>{msg.text}</span>
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <button type="button" onClick={turnOn} disabled={busy}
            style={{ ...btn, border: "none", background: "var(--primary, #8B1E2D)", color: "#fff", opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {busy ? <Loader2 size={16} className="spin" /> : <Fingerprint size={16} />} Turn on fingerprint / face
          </button>
          <button type="button" onClick={() => setOpen(false)} disabled={busy}
            style={{ ...btn, border: "1px solid var(--border, #E2E5EA)", background: "transparent", color: "var(--text, #0B0F19)" }}>
            Not now
          </button>
          <button type="button" onClick={never} disabled={busy}
            style={{ ...btn, border: "none", background: "transparent", color: "var(--text-muted, #64748B)", fontWeight: 600, fontSize: 14 }}>
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
}
