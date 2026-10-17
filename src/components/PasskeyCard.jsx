import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { Fingerprint, Loader2, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { passkeysAvailable, registerThisDevice } from "../utils/passkey";

/* Turn on / manage fingerprint, face or screen-lock sign-in for this account.
   Self-contained (inline styles + the app's CSS variables) so it can be dropped
   into any page: student profile, teacher profile, admin profile. */
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "never");

export default function PasskeyCard() {
  const [supported, setSupported] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }

  const load = useCallback(async () => {
    try { const r = await API.get("/auth/passkey/list"); setItems(Array.isArray(r.data) ? r.data : []); } catch { /* ignore */ }
  }, []);

  useEffect(() => { passkeysAvailable().then(setSupported); load(); }, [load]);

  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      const ua = navigator.userAgent || "";
      const label = /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android phone" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : "This device";
      await registerThisDevice(label);
      try { const u = JSON.parse(localStorage.getItem("user") || "{}"); localStorage.setItem(`doravo_bio_done_${String(u?.role || "").toLowerCase()}_${u?.id}`, "1"); } catch { /* ignore */ }
      setMsg({ tone: "ok", text: "Done. Next time, use “Sign in with fingerprint / face” on the login page." });
      await load();
    } catch (e) { setMsg({ tone: "err", text: e.message }); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Stop using fingerprint / face sign-in on this device?")) return;
    try { await API.delete(`/auth/passkey/${id}`); await load(); } catch { setMsg({ tone: "err", text: "Could not remove it." }); }
  };

  const box = { background: "var(--card, #fff)", border: "1px solid var(--border, #E2E5EA)", borderRadius: 14, padding: 22, marginTop: 20 };
  return (
    <section style={box} aria-label="Fingerprint and face sign-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Fingerprint size={22} color="var(--primary, #8B1E2D)" aria-hidden="true" />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text, #0B0F19)" }}>Fingerprint / face sign-in</h3>
      </div>
      <p style={{ margin: "0 0 14px", color: "var(--text-muted, #64748B)", fontSize: 13.5, lineHeight: 1.6 }}>
        Sign in with this device's fingerprint, face or screen-lock PIN instead of typing your password. Your fingerprint or face never leaves the device.
        Only turn this on for a device that is yours, not a shared computer.
      </p>

      {supported === false && (
        <div style={{ color: "var(--text-muted, #64748B)", fontSize: 13.5 }}>This browser or device doesn't support fingerprint / face sign-in.</div>
      )}
      {supported && (
        <button type="button" onClick={enable} disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", border: "none", borderRadius: 10, background: "var(--primary, #8B1E2D)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? <Loader2 size={16} className="spin" /> : <Fingerprint size={16} />}
          {items.length ? "Add this device" : "Turn on for this device"}
        </button>
      )}

      {msg && (
        <div role="status" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, fontSize: 13.5, color: msg.tone === "ok" ? "var(--success, #15803D)" : "var(--destructive, #DC2626)" }}>
          {msg.tone === "ok" ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
          <span>{msg.text}</span>
        </div>
      )}

      {items.length > 0 && (
        <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {items.map((p) => (
            <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border, #E2E5EA)", borderRadius: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #0B0F19)" }}>{p.label || "Device"}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)" }}>Added {fmt(p.createdAt)} · last used {fmt(p.lastUsedAt)}</div>
              </div>
              <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${p.label || "device"}`}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--destructive, #DC2626)", padding: 6 }}>
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
