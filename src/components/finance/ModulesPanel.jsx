import React, { useEffect, useState } from "react";

/* Finance -> "LMS Licence" tab: switch the separately licensed LMS on or off for this institution, choose
   its tier (base / standard) and add-ons. Until it is switched on the school sees no LMS menu items
   (Admin "LMS", Teacher/Student "Courses") and the API refuses LMS requests. Switching it off hides it
   again but never deletes data. Talks to /api/finance/institutions/:tenantKey/modules (financeOnly). */

const ADDON_LABELS = { lms_offline: "Offline use", lms_guardian: "Guardian view", lms_live: "Live classes", lms_scorm: "SCORM packages" };
const btn = (kind) => ({
  padding: "9px 16px", borderRadius: 10, border: kind === "ghost" ? "1px solid var(--border)" : "none", fontWeight: 700, cursor: "pointer", fontSize: 14,
  background: kind === "danger" ? "var(--destructive)" : kind === "ghost" ? "var(--card-elevated)" : "var(--primary)",
  color: kind === "ghost" ? "var(--text-secondary)" : "#fff",
});
const field = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, marginBottom: 10 };

export default function ModulesPanel({ api, tenantKey }) {
  const [info, setInfo] = useState(null);       // { status, tiers, addons }
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState("base");
  const [addons, setAddons] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const apply = (data) => {
    const st = data?.modules?.lms || { enabled: false, flags: [] };
    const reg = data?.registry?.lms || { tiers: ["base", "standard"], addons: [] };
    const flags = st.flags || [];
    setInfo({ status: st, tiers: reg.tiers, addons: reg.addons });
    setEnabled(!!st.enabled);
    setTier(flags.includes("lms_discussions") ? "standard" : "base");
    setAddons(flags.filter((f) => reg.addons.includes(f)));
    setNote(st.note || "");
  };

  useEffect(() => { // the parent remounts this panel per institution (key=tenantKey)
    let alive = true;
    api.get(`/finance/institutions/${tenantKey}/modules`)
      .then((r) => { if (alive) apply(r.data); })
      .catch((err) => { if (alive) setMsg({ tone: "error", text: err.response?.data?.message || "Could not load the licence" }); });
    return () => { alive = false; };
  }, [api, tenantKey]);

  const save = async (nextEnabled) => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put(`/finance/institutions/${tenantKey}/modules/lms`, { enabled: nextEnabled, tier, addons, note: note.trim() || undefined });
      apply({ ...r.data, registry: { lms: { tiers: info.tiers, addons: info.addons } } });
      setMsg({ tone: "ok", text: nextEnabled ? "LMS is ON for this institution. Users see it after their next page load." : "LMS is OFF for this institution. Nothing was deleted." });
    } catch (err) {
      setMsg({ tone: "error", text: err.response?.data?.message || "Could not save the licence" });
    } finally { setBusy(false); }
  };

  const toggleAddon = (a) => setAddons((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 14 }}>LMS licence</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        The LMS is licensed separately. While it is off, this institution sees no LMS pages in the Admin, Teacher or Student portals. Only Finance can change this.
      </p>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13,
          background: msg.tone === "error" ? "var(--destructive-tint)" : "var(--success-tint)",
          color: msg.tone === "error" ? "var(--destructive)" : "var(--success)" }}>{msg.text}</div>
      )}

      {!info ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div> : (
        <>
          <div style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Status</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
              {enabled ? `ON — ${tier === "standard" ? "Standard" : "Base"} tier` : "OFF"}
            </div>
          </div>

          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Tier</label>
          <select style={field} value={tier} onChange={(e) => setTier(e.target.value)} disabled={busy}>
            {info.tiers.map((t) => (
              <option key={t} value={t}>
                {t === "standard" ? "Standard — + discussions, learning paths, competencies, analytics" : "Base — courses, assignments, quizzes, gradebook"}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Add-ons</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
            {info.addons.map((a) => (
              <label key={a} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={addons.includes(a)} disabled={busy} onChange={() => toggleAddon(a)} />
                {ADDON_LABELS[a] || a}
              </label>
            ))}
          </div>

          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Note (optional)</label>
          <input style={field} type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Standard tier agreed, invoice INV-0042" />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btn()} disabled={busy} onClick={() => save(true)}>{enabled ? "Save changes (keep ON)" : "Switch LMS ON"}</button>
            {enabled && <button style={btn("ghost")} disabled={busy} onClick={() => save(false)}>Switch LMS OFF</button>}
          </div>
        </>
      )}
    </div>
  );
}
