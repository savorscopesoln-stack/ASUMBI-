import React, { useRef, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";

/* Assignment attachments editor (L5.4c, S107). Frontend only; used inside the CourseAssignments form.
   Backend (L5.1a): body.attachments = [{url,name}], at most 10, each must be a file already in THIS course's LMS media library
   (otherwise the server refuses). Upload: POST /lms/courses/:id/media (multipart "file") -> {file:{url,name}}.
   Pick existing: GET /lms/courses/:id/media?pageSize=50 -> {items:[{id,url,name}]}. The parent keeps the list and decides what is saved. */
export const MAX_ATTACHMENTS = 10;

export default function AssignmentAttachments({ courseId, value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null), [opts, setOpts] = useState(null);
  const fileRef = useRef(null);
  const full = list.length >= MAX_ATTACHMENTS;
  const add = (f) => {
    if (!f || !f.url) return false;
    if (list.some((a) => a.url === f.url)) { setMsg({ ok: false, text: "That file is already attached." }); return false; }
    if (full) { setMsg({ ok: false, text: `At most ${MAX_ATTACHMENTS} files.` }); return false; }
    onChange([...list, { url: f.url, name: f.name || String(f.url).split("/").pop() || "file" }]);
    return true;
  };
  const upload = async (file) => {
    if (!file || busy || full) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await API.post(`/lms/courses/${courseId}/media`, fd);
      setOpts(null); if (add(r.data.file)) setMsg({ ok: true, text: `Uploaded ${r.data.file.name}.` });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Upload failed.") }); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const load = async () => {
    setMsg(null);
    try { const r = await API.get(`/lms/courses/${courseId}/media`, { params: { pageSize: 50 } }); setOpts(r.data.items || []); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load uploaded files.") }); }
  };
  const free = (opts || []).filter((f) => !list.some((a) => a.url === f.url));
  return (
    <fieldset style={{ border: `1px solid ${C.border || "#ddd"}`, borderRadius: 8, padding: 10, marginTop: 10 }}>
      <legend style={{ fontSize: 14, fontWeight: 600 }}>Files for learners (optional)</legend>
      {list.length === 0 ? <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px" }}>No files attached.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px" }} aria-label="Attached files">
          {list.map((a, i) => (
            <li key={a.url} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
              <span style={{ flex: 1, wordBreak: "break-word" }}>{a.name}</span>
              <button type="button" style={S.btn} onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label={`Remove ${a.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input ref={fileRef} type="file" disabled={busy || full} onChange={(e) => upload(e.target.files?.[0])} aria-label="Upload a file to attach" />
        <button type="button" style={S.btn} onClick={load} disabled={full}>Choose from uploaded</button>
        {busy && <span role="status" style={{ fontSize: 13, color: C.muted }}>Uploading…</span>}
      </div>
      {full && <p style={{ fontSize: 13, color: C.muted }}>Limit of {MAX_ATTACHMENTS} files reached.</p>}
      {opts && (free.length === 0 ? <p style={{ fontSize: 13, color: C.muted }}>No other uploaded files.</p> : (
        <select aria-label="Uploaded files" style={{ ...S.input, width: "100%", marginTop: 8 }} defaultValue="" onChange={(e) => { const f = free.find((x) => String(x.id) === e.target.value); if (f) { add(f); setOpts(null); } }}>
          <option value="">Choose a file…</option>
          {free.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      ))}
      {msg && <div role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, marginTop: 6, color: msg.ok ? C.muted : (C.danger || "#b00020") }}>{msg.text}</div>}
    </fieldset>
  );
}
