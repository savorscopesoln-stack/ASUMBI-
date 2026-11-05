import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Per-learner deadline extensions panel (L5.5 UI, S105). Frontend only. Backend under /lms/courses/:id/assignments/:aid/extensions (read = course staff; grant/revoke = lms.course.manage):
   GET -> {extensions:[{studentId,studentName,admissionNo,dueAt,cutoffAt,reason,grantedAt}]} (max 500); PUT /:studentId {dueAt, cutoffAt?, reason?} (grant OR replace; ISO 8601 with time zone;
   dueAt later than the assignment's own due date and in the future; cutoffAt later than dueAt, REQUIRED when the assignment has a cut-off that dueAt reaches; reason <= 500); DELETE /:studentId.
   Learners are found with GET /lms/courses/:id/enrolments?status=active&q&page=1&pageSize=10 -> {students:[{studentId,name,admissionNo,className}], total}. The client checks the shape of the dates only;
   the server decides and its message is shown. An assignment with no due date has nothing to extend. */
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);
const pad = (n) => String(n).padStart(2, "0");
const toLocal = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
const ms = (v) => { const t = v ? new Date(v).getTime() : NaN; return Number.isNaN(t) ? null : t; };
const show = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };
const label = (x) => `${x.studentName || x.name || "Learner"}${x.admissionNo ? ` (${x.admissionNo})` : ""}`;

export default function AssignmentExtensions({ courseId, base, a, onClose }) {
  const [st, setSt] = useState("loading"), [list, setList] = useState([]), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""), [found, setFound] = useState(null), [searching, setSearching] = useState(false);
  const [target, setTarget] = useState(null), [f, setF] = useState({ dueAt: "", cutoffAt: "", reason: "" });
  const url = `${base}/${a.id}/extensions`;
  const load = useCallback(async () => {
    try { const r = await API.get(url); setList(r.data.extensions || []); setSt("ready"); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the extensions.") }); setSt("error"); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  const search = async (e) => {
    e.preventDefault(); setSearching(true); setMsg(null);
    try { const r = await API.get(`/lms/courses/${courseId}/enrolments`, { params: { status: "active", q: q.trim(), page: 1, pageSize: 10 } }); setFound({ students: r.data.students || [], total: r.data.total || 0 }); }
    catch (er) { setMsg({ ok: false, text: errText(er, "Could not search the learners.") }); }
    finally { setSearching(false); }
  };
  const pick = (t, ex) => { setTarget(t); setMsg(null); setF(ex ? { dueAt: toLocal(ex.dueAt), cutoffAt: toLocal(ex.cutoffAt), reason: ex.reason || "" } : { dueAt: "", cutoffAt: "", reason: "" }); };
  const due = ms(f.dueAt), cut = ms(f.cutoffAt), own = ms(a.dueAt), ownCut = ms(a.cutoffAt);
  const err = !target ? "" : due === null ? "Choose the new due date and time."
    : own !== null && due <= own ? "The new due date must be later than the assignment's own due date."
    : due <= Date.now() ? "The new due date must be in the future."
    : f.cutoffAt && (cut === null || cut <= due) ? "The cut-off must be later than the new due date."
    : !f.cutoffAt && ownCut !== null && due >= ownCut ? "This assignment has a cut-off that the new due date reaches: set a later cut-off for this learner."
    : f.reason.length > 500 ? "The reason is too long: at most 500 characters." : "";
  const grant = async (e) => {
    e.preventDefault(); if (!target || err || busy) return;
    const body = { dueAt: new Date(f.dueAt).toISOString() }; if (f.cutoffAt) body.cutoffAt = new Date(f.cutoffAt).toISOString(); if (f.reason.trim()) body.reason = f.reason.trim();
    setBusy(true); setMsg(null);
    try { await API.put(`${url}/${target.studentId}`, body); setMsg({ ok: true, text: "Extension saved." }); setTarget(null); setFound(null); setQ(""); await load(); }
    catch (er) { setMsg({ ok: false, text: errText(er, "That did not work. Please try again.") }); }
    finally { setBusy(false); }
  };
  const revoke = async (x) => {
    if (!ask(`Remove the extension for ${label(x)}? They go back to the normal deadline.`)) return;
    setBusy(true); setMsg(null);
    try { await API.delete(`${url}/${x.studentId}`); setMsg({ ok: true, text: "Extension removed." }); await load(); }
    catch (er) { setMsg({ ok: false, text: errText(er, "That did not work. Please try again.") }); }
    finally { setBusy(false); }
  };
  return (
    <section aria-label={`Extensions for ${a.title}`} style={{ borderTop: `1px solid ${C.border || "#ddd"}`, marginTop: 10, paddingTop: 10 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Extensions</h2>
      <Notice msg={msg} />
      {st === "loading" ? <Skeleton rows={2} /> : st === "error" ? <button type="button" style={S.btn} onClick={() => { setSt("loading"); setMsg(null); load(); }}>Try again</button> : (
        <>
          {list.length === 0 ? <p style={{ fontSize: 14, color: C.muted, margin: "0 0 8px" }} data-testid="ext-empty">No extensions yet. Everyone has the normal deadline.</p> : (
            <ul aria-label="Granted extensions" style={{ padding: 0, margin: "0 0 8px", display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((x) => (
                <li key={x.studentId} style={{ listStyle: "none", fontSize: 14 }}>
                  <strong>{label(x)}</strong>: due {show(x.dueAt)}{x.cutoffAt ? `, cut-off ${show(x.cutoffAt)}` : ""}{x.reason ? ` · ${x.reason}` : ""}{" "}
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Change extension for ${label(x)}`} onClick={() => pick(x, x)}>Change</button>{" "}
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Remove extension for ${label(x)}`} onClick={() => revoke(x)}>Remove</button>
                </li>))}
            </ul>)}
          {!a.dueAt ? <p style={{ fontSize: 14, color: C.muted, margin: 0 }} data-testid="ext-nodue">This assignment has no due date, so there is nothing to extend. Set a due date first.</p> : (
            <>
              {!target && (
                <form aria-label="Find a learner" onSubmit={search} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div><label style={S.label} htmlFor={`ex-q-${a.id}`}>Find a learner (name or admission number)</label>
                    <input id={`ex-q-${a.id}`} style={S.input} maxLength={60} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                  <button type="submit" style={S.btn} disabled={searching}>Search</button>
                </form>)}
              {!target && found && (found.students.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No active learner matches.</p> : (
                <>
                  <ul aria-label="Matching learners" style={{ padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                    {found.students.map((s) => (
                      <li key={s.studentId} style={{ listStyle: "none", fontSize: 14 }}>{label(s)}{s.className ? ` · ${s.className}` : ""}{" "}
                        <button type="button" style={S.btn} aria-label={`Give ${label(s)} an extension`} onClick={() => pick({ studentId: s.studentId, studentName: s.name, admissionNo: s.admissionNo }, list.find((x) => x.studentId === s.studentId))}>Give extension</button></li>))}
                  </ul>
                  {found.total > found.students.length && <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0" }}>Showing the first {found.students.length} of {found.total} learners. Narrow the search.</p>}
                </>))}
              {target && (
                <form aria-label="Grant extension" onSubmit={grant} style={{ ...S.box, margin: "4px 0 0" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 14 }}>Extension for <strong>{label(target)}</strong>. The assignment is due {show(a.dueAt)}{a.cutoffAt ? `, cut-off ${show(a.cutoffAt)}` : ""}.</p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div><label style={S.label} htmlFor={`ex-d-${a.id}`}>New due date</label><input id={`ex-d-${a.id}`} type="datetime-local" style={S.input} value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></div>
                    <div><label style={S.label} htmlFor={`ex-c-${a.id}`}>New cut-off (optional)</label><input id={`ex-c-${a.id}`} type="datetime-local" style={S.input} value={f.cutoffAt} onChange={(e) => setF({ ...f, cutoffAt: e.target.value })} /></div>
                  </div>
                  <label style={S.label} htmlFor={`ex-r-${a.id}`}>Reason (optional, 500 characters)</label>
                  <textarea id={`ex-r-${a.id}`} rows={2} maxLength={500} style={{ ...S.input, width: "100%" }} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
                  {err && <div role="alert" style={{ fontSize: 13, color: C.bad, marginTop: 4 }}>{err}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="submit" style={S.btnPrimary} disabled={busy || !!err}>Save extension</button>
                    <button type="button" style={S.btn} onClick={() => setTarget(null)}>Cancel</button>
                  </div>
                </form>)}
            </>)}
        </>)}
      <div style={{ marginTop: 8 }}><button type="button" style={S.btn} onClick={onClose}>Close extensions</button></div>
    </section>
  );
}
