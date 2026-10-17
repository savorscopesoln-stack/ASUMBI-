import React, { useEffect, useState, useCallback } from "react";

/* Finance -> "Trial Period" tab: start, extend or end an institution's trial.
   The institution sees a live countdown (components/TrialBanner.jsx). Talks to
   /api/finance/institutions/:tenantKey/trial (financeOnly). */

const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

const field = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, marginBottom: 10 };
const btn = (kind) => ({
  padding: "9px 16px", borderRadius: 10, border: kind === "ghost" ? "1px solid var(--border)" : "none", fontWeight: 700, cursor: "pointer", fontSize: 14,
  background: kind === "danger" ? "var(--destructive)" : kind === "ghost" ? "var(--card-elevated)" : "var(--primary)",
  color: kind === "ghost" ? "var(--text-secondary)" : "#fff",
});

export default function TrialPanel({ api, tenantKey, onChanged }) {
  const [trial, setTrial] = useState(null);
  const [maxDays, setMaxDays] = useState(365);
  const [days, setDays] = useState("14");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }
  const [confirmEnd, setConfirmEnd] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/finance/institutions/${tenantKey}/trial`);
      setTrial(r.data?.trial || null);
      if (r.data?.maxDays) setMaxDays(r.data.maxDays);
    } catch (err) {
      setMsg({ tone: "error", text: err.response?.data?.message || "Could not load the trial" });
    }
  }, [api, tenantKey]);

  useEffect(() => { setMsg(null); setConfirmEnd(false); load(); }, [load]);

  const save = async (mode) => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/finance/institutions/${tenantKey}/trial`, { mode, days: Number(days), note: note.trim() || undefined });
      setTrial(r.data?.trial || null);
      setMsg({ tone: "ok", text: mode === "extend" ? `Trial extended by ${days} day(s).` : `Trial started for ${days} day(s).` });
      onChanged && onChanged();
    } catch (err) {
      setMsg({ tone: "error", text: err.response?.data?.message || "Could not save the trial" });
    } finally { setBusy(false); }
  };

  const endTrial = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.delete(`/finance/institutions/${tenantKey}/trial`);
      setTrial(r.data?.trial || null);
      setConfirmEnd(false);
      setMsg({ tone: "ok", text: "Trial removed. The countdown no longer shows for this institution." });
      onChanged && onChanged();
    } catch (err) {
      setMsg({ tone: "error", text: err.response?.data?.message || "Could not end the trial" });
    } finally { setBusy(false); }
  };

  const status = !trial?.hasTrial ? "No trial set" : trial.active ? `Running — ${trial.daysLeft} day(s) left` : "Expired";
  const daysOk = Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= maxDays;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 14 }}>Trial period</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        While a trial is set, everyone at this institution except students sees a live countdown to its end. Only Finance can change it.
      </p>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13,
          background: msg.tone === "error" ? "var(--destructive-tint)" : "var(--success-tint)",
          color: msg.tone === "error" ? "var(--destructive)" : "var(--success)" }}>{msg.text}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[["Status", status], ["Started", fmt(trial?.startsAt)], ["Ends", fmt(trial?.endsAt)], ["Note", trial?.note || "—"]].map(([k, v]) => (
          <div key={k} style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{k}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Number of days (1–{maxDays})</label>
      <input style={field} type="number" min="1" max={maxDays} step="1" value={days} onChange={(e) => setDays(e.target.value)} />
      <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Note (optional, shown as a tooltip on the countdown)</label>
      <input style={field} type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 30-day evaluation agreed on 17 Oct" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={btn()} disabled={busy || !daysOk} onClick={() => save("start")}>
          {trial?.hasTrial ? "Restart trial from today" : "Start trial"}
        </button>
        {trial?.hasTrial && (
          <button style={btn("ghost")} disabled={busy || !daysOk} onClick={() => save("extend")}>Extend by {daysOk ? days : "…"} day(s)</button>
        )}
        {trial?.hasTrial && !confirmEnd && (
          <button style={btn("ghost")} disabled={busy} onClick={() => setConfirmEnd(true)}>End trial</button>
        )}
        {trial?.hasTrial && confirmEnd && (
          <>
            <button style={btn("danger")} disabled={busy} onClick={endTrial}>Yes, remove the trial</button>
            <button style={btn("ghost")} disabled={busy} onClick={() => setConfirmEnd(false)}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
