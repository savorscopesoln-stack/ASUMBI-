import React from "react";
import { C, S } from "./lmsUtil";

/* Small shared components for the LMS screens (L2.6). Helpers live in lmsUtil.js. */

const BADGE = {
  draft: ["Draft", C.muted], pending: ["Waiting for approval", C.warn], published: ["Published", C.ok],
  archived: ["Archived", C.muted], active: ["Enrolled", C.ok],
};
export function StatusBadge({ status }) {
  const [text, colour] = BADGE[status] || [status, C.muted];
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: colour, border: `1px solid ${colour}` }}>{text}</span>;
}

export function Pager({ page, pageSize, total, onPage, busy }) {
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
      <button type="button" style={S.btn} disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span style={{ fontSize: 13, color: C.muted }}>Page {page} of {pages}</span>
      <button type="button" style={S.btn} disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

/* Screen-reader friendly status line: success is polite, errors are assertive. */
export function Notice({ msg }) {
  if (!msg) return <div aria-live="polite" style={{ minHeight: 0 }} />;
  return (
    <div role={msg.ok ? "status" : "alert"} aria-live={msg.ok ? "polite" : "assertive"}
      style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 8, fontSize: 14, border: `1px solid ${msg.ok ? C.ok : C.bad}`, color: msg.ok ? C.ok : C.bad, background: C.card }}>
      {msg.text}
    </div>
  );
}

export function Skeleton({ rows = 3 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} style={{ height: 72, borderRadius: 12, marginBottom: 10, background: C.border, opacity: 0.5 }} />)}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 8, margin: "0 0 14px", flexWrap: "wrap" }}>
      {tabs.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          style={{ ...S.btn, fontWeight: value === id ? 700 : 400, borderColor: value === id ? C.accent : C.border, color: value === id ? C.accent : C.text }}>{label}</button>
      ))}
    </div>
  );
}
