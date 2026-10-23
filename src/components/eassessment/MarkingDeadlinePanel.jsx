import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api";

/* Admin: set (or clear) the marking deadline per assessment.
   Teachers see a live countdown to it on their marking screens. */

// ISO (UTC) -> value for <input type="datetime-local"> in the admin's own time zone
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function leftLabel(sec) {
  if (sec == null) return null;
  const over = sec <= 0;
  const s = Math.abs(sec);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const txt = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return over ? `passed ${txt} ago` : `${txt} left`;
}

export default function MarkingDeadlinePanel({ showToast, C }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [value, setValue] = useState(""); // datetime-local, applied to the ticked assessments

  const load = useCallback(() => {
    setLoading(true);
    return API.get("/e-assessments/admin/marking-deadlines")
      .then((r) => setItems(r.data?.items || []))
      .catch(() => showToast && showToast("Could not load marking deadlines", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((a) => !t || `${a.title || ""} ${a.subject || ""}`.toLowerCase().includes(t));
  }, [items, q]);

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allTicked = list.length > 0 && list.every((a) => picked.has(a.id));
  const toggleAll = () => setPicked(allTicked ? new Set() : new Set(list.map((a) => a.id)));

  const save = async (ids, local) => {
    if (!ids.length) return showToast && showToast("Tick at least one assessment", "error");
    if (local && Number.isNaN(new Date(local).getTime())) return showToast && showToast("Choose a date and time", "error");
    setBusy(true);
    try {
      const r = await API.put("/e-assessments/admin/marking-deadlines", {
        assessmentIds: ids,
        deadline: local ? new Date(local).toISOString() : null,
      });
      showToast && showToast(r.data?.message || "Saved");
      await load();
    } catch (e) {
      showToast && showToast(e?.response?.data?.message || "Could not save marking deadline", "error");
    } finally { setBusy(false); }
  };

  const btn = (primary) => ({
    padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${primary ? C.accent : C.border}`, background: primary ? C.accent : C.card, color: primary ? "#fff" : C.textPri,
  });
  const input = { padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 13 };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: C.textPri }}>Marking deadline</p>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
        Set the date and time by which marking must be finished. Teachers see a live countdown at the top of their marking screen for that assessment.
        It is a reminder only — marking is not blocked once the deadline passes.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assessments…" aria-label="Search assessments" style={{ ...input, minWidth: 200 }} />
        <span style={{ flex: 1 }} />
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Deadline date and time" style={input} />
        <button type="button" disabled={busy || !picked.size || !value} onClick={() => save([...picked], value)} style={{ ...btn(true), opacity: busy || !picked.size || !value ? 0.55 : 1 }}>
          Set for {picked.size || 0} selected
        </button>
        <button type="button" disabled={busy || !picked.size} onClick={() => save([...picked], null)} style={{ ...btn(false), opacity: busy || !picked.size ? 0.55 : 1 }}>
          Clear selected
        </button>
      </div>

      {loading ? <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p> : list.length === 0 ? (
        <p style={{ color: C.textMuted, fontSize: 13 }}>No assessments found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", fontSize: 12.5, color: C.textMuted, cursor: "pointer" }}>
            <input type="checkbox" checked={allTicked} onChange={toggleAll} /> Select all shown
          </label>
          {list.map((a) => {
            const lbl = leftLabel(a.seconds_left);
            const over = a.seconds_left != null && a.seconds_left <= 0;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <input type="checkbox" checked={picked.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${a.title}`} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textPri }}>{a.title || `Assessment #${a.id}`}</div>
                  {a.subject && <div style={{ fontSize: 12, color: C.textMuted }}>{a.subject}</div>}
                </div>
                {a.deadline ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: over ? "#b91c1c" : "#15803d" }}>
                    {new Date(a.deadline).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {lbl}
                  </span>
                ) : <span style={{ fontSize: 12, color: C.textMuted }}>No deadline</span>}
                <button type="button" disabled={busy} style={btn(false)} onClick={() => { setValue(toLocalInput(a.deadline)); setPicked(new Set([a.id])); }}>
                  {a.deadline ? "Edit" : "Set"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
