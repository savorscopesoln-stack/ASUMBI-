import React, { useEffect, useState, useMemo } from "react";
import { PAGES as ADMIN_PAGES } from "../../permissions";
import { NAV_GROUPS as STUDENT_NAV_GROUPS } from "../../pages/Student/StudentLayout";
import { NAV_GROUPS as TEACHER_NAV_GROUPS } from "../../pages/teacher/TeacherLayout";

/* Finance -> "Page Access" tab: choose which pages this institution gets in the Admin, Student and
   Teacher portals. Switched-off pages vanish from the menus and cannot be opened by URL, and the
   school's own admin cannot switch them back on. Talks to /api/finance/institutions/:tenantKey/pages
   (financeOnly). Nothing is deleted. */

// Landing pages are always on (the backend refuses to switch them off too).
const LOCKED = new Set(["admin:Dashboard", "student:/student", "teacher:/teacher/dashboard"]);

const flat = (groups) => groups.flatMap((g) => g.items.map((i) => ({ key: i.path, label: i.name, group: g.label })));
const PORTALS = [
  { id: "admin", title: "Admin portal", pages: ADMIN_PAGES.map((p) => ({ key: p.key, label: p.label, group: "Pages" })) },
  { id: "student", title: "Student portal", pages: flat(STUDENT_NAV_GROUPS) },
  { id: "teacher", title: "Teacher portal", pages: flat(TEACHER_NAV_GROUPS) },
];

const cleanMap = (d = {}) => ({ admin: d.admin || [], student: d.student || [], teacher: d.teacher || [] });
const btn = (kind) => ({
  padding: "9px 16px", borderRadius: 10, border: kind === "ghost" ? "1px solid var(--border)" : "none", fontWeight: 700, cursor: "pointer", fontSize: 14,
  background: kind === "ghost" ? "var(--card-elevated)" : "var(--primary)", color: kind === "ghost" ? "var(--text-secondary)" : "var(--card)",
});

export default function PageAccessPanel({ api, tenantKey }) {
  const [saved, setSaved] = useState(null);   // { admin:[off keys], student:[...], teacher:[...] }
  const [draft, setDraft] = useState(null);   // same shape, unsaved edits
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { // the parent remounts this panel per institution (key=tenantKey)
    let alive = true;
    api.get(`/finance/institutions/${tenantKey}/pages`)
      .then((r) => { if (alive) { const c = cleanMap(r.data?.disabled); setSaved(c); setDraft(c); } })
      .catch((err) => { if (alive) setMsg({ tone: "error", text: err.response?.data?.message || "Could not load page access" }); });
    return () => { alive = false; };
  }, [api, tenantKey]);

  const changes = useMemo(() => {
    if (!saved || !draft) return [];
    const out = [];
    for (const p of PORTALS) {
      const was = new Set(saved[p.id]); const now = new Set(draft[p.id]);
      p.pages.forEach((pg) => {
        if (was.has(pg.key) !== now.has(pg.key)) out.push({ portal: p.id, page_key: pg.key, enabled: !now.has(pg.key) });
      });
    }
    return out;
  }, [saved, draft]);

  const flip = (portal, key) => setDraft((d) => ({
    ...d, [portal]: d[portal].includes(key) ? d[portal].filter((k) => k !== key) : [...d[portal], key],
  }));
  const setAll = (portal, pages, off) => setDraft((d) => ({
    ...d, [portal]: off ? pages.filter((p) => !LOCKED.has(`${portal}:${p.key}`)).map((p) => p.key) : [],
  }));

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put(`/finance/institutions/${tenantKey}/pages`, { changes });
      const c = cleanMap(r.data?.disabled);
      setSaved(c); setDraft(c);
      setMsg({ tone: "ok", text: `Saved ${changes.length} change(s). Users see them on their next page load.` });
    } catch (err) {
      setMsg({ tone: "error", text: err.response?.data?.message || "Could not save page access" });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 14 }}>Page access</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Choose which pages this institution can use. Switched-off pages disappear from the Admin, Student and Teacher menus and cannot be opened,
        and the school cannot turn them back on. No data is deleted. Only Finance can change this.
      </p>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13,
          background: msg.tone === "error" ? "var(--destructive-tint)" : "var(--success-tint)",
          color: msg.tone === "error" ? "var(--destructive)" : "var(--success)" }}>{msg.text}</div>
      )}

      {!draft ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 16 }}>
            {PORTALS.map((p) => (
              <div key={p.id} style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{p.title}</strong>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.pages.length - draft[p.id].length}/{p.pages.length} on</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button style={{ ...btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => setAll(p.id, p.pages, false)}>All on</button>
                  <button style={{ ...btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => setAll(p.id, p.pages, true)}>All off</button>
                </div>
                {p.pages.map((pg) => {
                  const locked = LOCKED.has(`${p.id}:${pg.key}`);
                  const on = !draft[p.id].includes(pg.key);
                  return (
                    <label key={pg.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                      <input type="checkbox" checked={on} disabled={locked || busy} onChange={() => flip(p.id, pg.key)} />
                      <span>{pg.label}{locked ? " (always on)" : ""}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={btn()} disabled={busy || !changes.length} onClick={save}>{busy ? "Saving…" : `Save changes${changes.length ? ` (${changes.length})` : ""}`}</button>
            <button style={btn("ghost")} disabled={busy || !changes.length} onClick={() => setDraft(saved)}>Discard</button>
          </div>
        </>
      )}
    </div>
  );
}
