import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";
import AssignmentExtensions from "./AssignmentExtensions";
import AssignmentGradeRelease from "./AssignmentGradeRelease";
import AssignmentAttachments from "./AssignmentAttachments";

/* Teacher assignments (L5.1c, S102). Frontend only. Backend (L5.1a, `lms.course.manage` + membership for writes), under /lms/courses/:id/assignments:
   GET ?page&pageSize -> {items:[{id,title,instructions,status:draft|published,availableFrom,dueAt,cutoffAt,submissionType:text|files|both,maxAttempts,maxPoints,workMode:individual|group,
     latePolicy|null,latePenaltyPercent|null,effective:{latePolicy,latePenaltyPercent}, ...}], total};
   POST {title,instructions,status?,availableFrom?,dueAt?,cutoffAt?,submissionType?,maxAttempts?,maxPoints?,workMode?,latePolicy?,latePenaltyPercent?} -> 201; PATCH /:id (changed fields only); DELETE /:id (409 HAS_SUBMISSIONS).
   Dates are sent as ISO 8601 with a time zone (UTC "Z"); shown and typed in the browser's local time. Group work = exactly one attempt and text only (the form enforces it, the server too);
   the work mode cannot change once work exists (server message shown). FILE RULES (S104): allowedExtensions (null = school list, else 1-20 of letters/digits, max 8 chars), maxFileMb (null = school limit, else 1-200), maxFiles (1-10, default 5); shown only when learners may hand in files; the server also checks them against the school limits (message shown). Attachments are not edited here and are left unchanged. Instructions are plain text.
   RUBRIC (S103): per assignment, GET .../assignments/:id/rubric -> {rubric|null}, PUT {rubricId|null} attaches/changes/removes (server refuses once work is handed in: HAS_SUBMISSIONS, message shown);
   choices come from GET /lms/courses/:id/rubrics?pageSize=100 -> {items:[{id,title,criteriaCount,maxPoints}], total}. Only this course's rubrics can be attached (copy from the library on the Rubrics screen).
   EXTENSIONS (S105): per assignment, an Extensions panel (AssignmentExtensions.jsx), one panel (rubric, extensions or grade release) open at a time.
   GRADE RELEASE (S106): AssignmentGradeRelease.jsx (return all now, schedule for everyone, release times for single learners). */

const PS = 20;
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);
const pad = (n) => String(n).padStart(2, "0");
const toLocal = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
const toIso = (v) => (v ? new Date(v).toISOString() : null);
const show = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };
const BLANK = { title: "", instructions: "", status: "draft", availableFrom: "", dueAt: "", cutoffAt: "", submissionType: "both", maxAttempts: "1", maxPoints: "100", workMode: "individual", latePolicy: "", latePenaltyPercent: "", allowedExtensions: "", maxFileMb: "", maxFiles: "5", attachments: [] };
const fromItem = (a) => ({ title: a.title || "", instructions: a.instructions || "", status: a.status || "draft", availableFrom: toLocal(a.availableFrom), dueAt: toLocal(a.dueAt), cutoffAt: toLocal(a.cutoffAt), submissionType: a.submissionType || "both",
  maxAttempts: String(a.maxAttempts ?? 1), maxPoints: String(a.maxPoints ?? 100), workMode: a.workMode || "individual", latePolicy: a.latePolicy || "", latePenaltyPercent: a.latePenaltyPercent === null || a.latePenaltyPercent === undefined ? "" : String(a.latePenaltyPercent),
  allowedExtensions: Array.isArray(a.allowedExtensions) ? a.allowedExtensions.join(", ") : "", maxFileMb: a.maxFileMb === null || a.maxFileMb === undefined ? "" : String(a.maxFileMb), maxFiles: String(a.maxFiles ?? 5), attachments: Array.isArray(a.attachments) ? a.attachments.map((x) => ({ url: x.url, name: x.name })) : [] });
const normExt = (v) => String(v || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase().replace(/^\./, "")).filter(Boolean);
const whole = (v, lo, hi) => /^\d+$/.test(String(v).trim()) && Number(v) >= lo && Number(v) <= hi;
const wire = (k, v) => {
  if (["availableFrom", "dueAt", "cutoffAt"].includes(k)) return toIso(v);
  if (k === "maxAttempts") return Number(v);
  if (k === "maxPoints") return Number(v);
  if (k === "latePolicy") return v || null;
  if (k === "latePenaltyPercent") return v === "" ? null : Number(v);
  if (k === "allowedExtensions") { const x = normExt(v); return x.length ? x : null; }
  if (k === "maxFileMb") return v === "" ? null : Number(v);
  if (k === "maxFiles") return Number(v);
  return k === "title" || k === "instructions" ? v.trim() : v;
};

function Editor({ courseId, item, busy, onSave, onCancel }) {
  const [f, setF] = useState(item ? fromItem(item) : BLANK), [dirty, setDirty] = useState(false);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const group = f.workMode === "group";
  const points = Number(f.maxPoints), okPoints = f.maxPoints.trim() !== "" && Number.isFinite(points) && points >= 1 && points <= 1000;
  const files = !group && f.submissionType !== "text", exts = normExt(f.allowedExtensions);
  const extErr = files && (exts.length > 20 || exts.some((x) => !/^[a-z0-9]{1,8}$/.test(x))) ? "Use 1-20 file types, letters and digits only (for example pdf, docx)." : "";
  const mbErr = files && f.maxFileMb.trim() !== "" && !whole(f.maxFileMb, 1, 200) ? "Whole number from 1 to 200, or leave empty." : "";
  const nfErr = files && !whole(f.maxFiles, 1, 10) ? "Whole number from 1 to 10." : "";
  const valid = f.title.trim() && f.instructions.trim() && okPoints && !extErr && !mbErr && !nfErr;
  const submit = (e) => {
    e.preventDefault(); if (!valid || busy) return;
    const eff = { ...(group ? { ...f, submissionType: "text", maxAttempts: "1" } : f), allowedExtensions: exts.join(", ") };
    const base = item ? fromItem(item) : null, body = {};
    Object.keys(BLANK).forEach((k) => { if (k !== "attachments" && (!base || eff[k] !== base[k])) body[k] = wire(k, eff[k]); });
    if (JSON.stringify(f.attachments) !== JSON.stringify(base ? base.attachments : [])) body.attachments = f.attachments.map((x) => ({ url: x.url, name: x.name }));
    if (item && Object.keys(body).length === 0) { onCancel(); return; }
    onSave(body);
  };
  const row = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" };
  return (
    <form aria-label={item ? "Edit assignment" : "New assignment"} onSubmit={submit} style={{ ...S.box, margin: "0 0 12px" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>{item ? "Edit assignment" : "New assignment"}</h2>
      <label style={S.label} htmlFor="as-t">Title</label>
      <input id="as-t" style={{ ...S.input, width: "100%" }} maxLength={200} value={f.title} onChange={(e) => set("title", e.target.value)} />
      <label style={S.label} htmlFor="as-i">Instructions (plain text)</label>
      <textarea id="as-i" rows={5} maxLength={8000} style={{ ...S.input, width: "100%" }} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} />
      <div style={row}>
        <div><label style={S.label} htmlFor="as-wm">Work</label>
          <select id="as-wm" style={S.input} value={f.workMode} onChange={(e) => set("workMode", e.target.value)}><option value="individual">Each learner on their own</option><option value="group">By group</option></select></div>
        <div><label style={S.label} htmlFor="as-st">Hand in as</label>
          <select id="as-st" style={S.input} disabled={group} value={group ? "text" : f.submissionType} onChange={(e) => set("submissionType", e.target.value)}><option value="text">Text</option><option value="files">Files</option><option value="both">Text or files</option></select></div>
        <div><label style={S.label} htmlFor="as-ma">Attempts (1-10)</label>
          <input id="as-ma" type="number" min={1} max={10} style={{ ...S.input, width: 90 }} disabled={group} value={group ? "1" : f.maxAttempts} onChange={(e) => set("maxAttempts", e.target.value)} /></div>
        <div><label style={S.label} htmlFor="as-mp">Points (1-1000)</label>
          <input id="as-mp" type="number" min={1} max={1000} step="0.01" style={{ ...S.input, width: 110 }} value={f.maxPoints} onChange={(e) => set("maxPoints", e.target.value)} /></div>
      </div>
      {group && <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0" }}>Group work is handed in once per group, as text, with one attempt.</p>}
      {files && (
        <div style={row} data-testid="file-rules">
          <div style={{ flex: "1 1 240px" }}><label style={S.label} htmlFor="as-ex">Allowed file types (empty = school list)</label>
            <input id="as-ex" style={{ ...S.input, width: "100%" }} placeholder="pdf, docx, jpg" aria-invalid={!!extErr} aria-describedby={extErr ? "as-ex-e" : undefined} value={f.allowedExtensions} onChange={(e) => set("allowedExtensions", e.target.value)} />
            {extErr && <div id="as-ex-e" role="alert" style={{ fontSize: 13, color: C.bad }}>{extErr}</div>}</div>
          <div><label style={S.label} htmlFor="as-mb">Max size per file, MB</label>
            <input id="as-mb" inputMode="numeric" style={{ ...S.input, width: 110 }} placeholder="School limit" aria-invalid={!!mbErr} aria-describedby={mbErr ? "as-mb-e" : undefined} value={f.maxFileMb} onChange={(e) => set("maxFileMb", e.target.value)} />
            {mbErr && <div id="as-mb-e" role="alert" style={{ fontSize: 13, color: C.bad }}>{mbErr}</div>}</div>
          <div><label style={S.label} htmlFor="as-nf">Max files (1-10)</label>
            <input id="as-nf" type="number" min={1} max={10} style={{ ...S.input, width: 90 }} aria-invalid={!!nfErr} aria-describedby={nfErr ? "as-nf-e" : undefined} value={f.maxFiles} onChange={(e) => set("maxFiles", e.target.value)} />
            {nfErr && <div id="as-nf-e" role="alert" style={{ fontSize: 13, color: C.bad }}>{nfErr}</div>}</div>
        </div>
      )}
      <div style={row}>
        <div><label style={S.label} htmlFor="as-af">Opens</label><input id="as-af" type="datetime-local" style={S.input} value={f.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} /></div>
        <div><label style={S.label} htmlFor="as-du">Due</label><input id="as-du" type="datetime-local" style={S.input} value={f.dueAt} onChange={(e) => set("dueAt", e.target.value)} /></div>
        <div><label style={S.label} htmlFor="as-co">Final cut-off</label><input id="as-co" type="datetime-local" style={S.input} value={f.cutoffAt} onChange={(e) => set("cutoffAt", e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={S.label} htmlFor="as-lp">Late work</label>
          <select id="as-lp" style={S.input} value={f.latePolicy} onChange={(e) => set("latePolicy", e.target.value)}><option value="">School default</option><option value="accept">Accept</option><option value="penalise">Accept with a penalty</option><option value="block">Do not accept</option></select></div>
        {f.latePolicy === "penalise" && <div><label style={S.label} htmlFor="as-pp">Penalty % (0-100)</label><input id="as-pp" type="number" min={0} max={100} style={{ ...S.input, width: 100 }} value={f.latePenaltyPercent} onChange={(e) => set("latePenaltyPercent", e.target.value)} /></div>}
        <div><label style={S.label} htmlFor="as-sv">Visible to learners</label>
          <select id="as-sv" style={S.input} value={f.status} onChange={(e) => set("status", e.target.value)}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></div>
      </div>
      <AssignmentAttachments courseId={courseId} value={f.attachments} onChange={(v) => set("attachments", v)} />
      {dirty && <div role="status" style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Not saved yet</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="submit" style={S.btnPrimary} disabled={busy || !valid}>{item ? "Save changes" : "Create assignment"}</button>
        <button type="button" style={S.btn} onClick={() => { if (!dirty || ask("Discard your changes?")) onCancel(); }}>Cancel</button>
      </div>
    </form>
  );
}

function RubricPanel({ courseId, base, a, onClose }) {
  const [st, setSt] = useState("loading"), [cur, setCur] = useState(null), [opts, setOpts] = useState({ items: [], total: 0 }), [pick, setPick] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([API.get(`${base}/${a.id}/rubric`), API.get(`/lms/courses/${courseId}/rubrics`, { params: { page: 1, pageSize: 100 } })]);
        if (!live) return; const c = r1.data.rubric || null; setCur(c); setPick(c ? String(c.id) : ""); setOpts({ items: r2.data.items || [], total: r2.data.total || 0 }); setSt("ready");
      } catch (e) { if (live) { setMsg({ ok: false, text: errText(e, "Could not load the rubric.") }); setSt("error"); } }
    })();
    return () => { live = false; };
  }, [base, courseId, a.id]);
  const put = async (rubricId, okText) => {
    setBusy(true); setMsg(null);
    try { const r = await API.put(`${base}/${a.id}/rubric`, { rubricId }); const c = r.data.rubric || null; setCur(c); setPick(c ? String(c.id) : ""); setMsg({ ok: true, text: okText }); }
    catch (e) { setMsg({ ok: false, text: errText(e, "That did not work. Please try again.") }); }
    finally { setBusy(false); }
  };
  const changed = pick !== "" && (!cur || String(cur.id) !== pick);
  return (
    <section aria-label={`Rubric for ${a.title}`} style={{ borderTop: `1px solid ${C.border || "#ddd"}`, marginTop: 10, paddingTop: 10 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>Rubric</h3>
      <Notice msg={msg} />
      {st === "loading" ? <Skeleton rows={1} /> : st === "error" ? null : (
        <>
          <p style={{ margin: "0 0 8px", fontSize: 14 }} data-testid="rubric-current">{cur ? <>Attached: <strong>{cur.title}</strong>{cur.criteria ? ` (${cur.criteria.length} criteria)` : ""}</> : "No rubric attached. This assignment is marked with a single grade."}</p>
          {opts.items.length === 0 ? (
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>This course has no rubrics yet. <Link to={`/teacher/courses/${courseId}/rubrics`}>Create or copy one on the Rubrics screen</Link>, then come back.</p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div><label style={S.label} htmlFor={`rb-${a.id}`}>{cur ? "Change to" : "Attach a rubric"}</label>
                <select id={`rb-${a.id}`} style={S.input} value={pick} disabled={busy} onChange={(e) => { setPick(e.target.value); setMsg(null); }}>
                  <option value="">Choose a rubric…</option>
                  {opts.items.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.criteriaCount} criteria, {r.maxPoints} points)</option>)}
                </select></div>
              <button type="button" style={S.btnPrimary} disabled={busy || !changed} onClick={() => put(Number(pick), cur ? "Rubric changed." : "Rubric attached.")}>{cur ? "Change rubric" : "Attach rubric"}</button>
              {cur && <button type="button" style={S.btn} disabled={busy} onClick={() => { if (ask(`Remove the rubric from "${a.title}"? Marking goes back to a single grade.`)) put(null, "Rubric removed."); }}>Remove rubric</button>}
            </div>)}
          {opts.total > opts.items.length && <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0" }}>Showing the first {opts.items.length} of {opts.total} rubrics.</p>}
          <p style={{ fontSize: 13, color: C.muted, margin: "8px 0 0" }}>The rubric cannot be changed once a learner has handed in work.</p>
        </>)}
      <div style={{ marginTop: 8 }}><button type="button" style={S.btn} onClick={onClose}>Close rubric</button></div>
    </section>
  );
}

export default function CourseAssignments() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/assignments`;
  const [data, setData] = useState({ items: [], total: 0 }), [page, setPage] = useState(1), [state, setState] = useState("loading"), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [edit, setEdit] = useState(null), [rubricFor, setRubricFor] = useState(null), [extFor, setExtFor] = useState(null), [relFor, setRelFor] = useState(null);
  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { page, pageSize: PS } }); setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load assignments.") }); setState("error"); } }
  }, [base, page]);
  useEffect(() => { load(); }, [load]);
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const act = async (fn, okText) => { setBusy(true); try { await fn(); setMsg({ ok: true, text: okText }); await load(); return true; } catch (e) { setMsg({ ok: false, text: errText(e, "That did not work. Please try again.") }); return false; } finally { setBusy(false); } };
  const save = async (body) => { const ok = await act(() => (edit === "new" ? API.post(base, body) : API.patch(`${base}/${edit.id}`, body)), edit === "new" ? "Assignment created." : "Assignment saved."); if (ok) setEdit(null); };
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/teacher/courses">← My courses</Link></p>
      <h1 style={S.h1}>Assignments</h1>
      <p style={S.sub}>Learners only see an assignment when it is published and its opening time has passed.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); load(); }}>Try again</button> : (
        <>
          {edit ? <Editor key={edit === "new" ? "new" : edit.id} courseId={courseId} item={edit === "new" ? null : edit} busy={busy} onSave={save} onCancel={() => setEdit(null)} /> : <p><button type="button" style={S.btnPrimary} onClick={() => { setEdit("new"); setMsg(null); }}>New assignment</button></p>}
          {data.items.length === 0 ? <p style={{ color: C.muted }}>No assignments yet.</p> : (
            <ul aria-label="Assignments" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
              {data.items.map((a) => (
                <li key={a.id} style={{ ...S.box, listStyle: "none" }}>
                  <strong>{a.title}</strong> <span style={{ fontSize: 13, color: C.muted }}>· {a.status === "published" ? "Published" : "Draft"} · {a.workMode === "group" ? "Group" : "Individual"} · {a.maxPoints} points{a.dueAt ? ` · due ${show(a.dueAt)}` : ""}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button type="button" style={S.btn} disabled={busy} aria-label={`Edit ${a.title}`} onClick={() => { setEdit(a); setMsg(null); }}>Edit</button>
                    <button type="button" style={S.btn} disabled={busy} aria-label={`${a.status === "published" ? "Unpublish" : "Publish"} ${a.title}`} onClick={() => act(() => API.patch(`${base}/${a.id}`, { status: a.status === "published" ? "draft" : "published" }), a.status === "published" ? "Assignment hidden from learners." : "Assignment published.")}>{a.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button type="button" style={S.btn} disabled={busy} aria-label={`Rubric for ${a.title}`} aria-expanded={rubricFor === a.id} onClick={() => { setExtFor(null); setRelFor(null); setRubricFor(rubricFor === a.id ? null : a.id); }}>Rubric</button>
                    <button type="button" style={S.btn} disabled={busy} aria-label={`Extensions for ${a.title}`} aria-expanded={extFor === a.id} onClick={() => { setRubricFor(null); setRelFor(null); setExtFor(extFor === a.id ? null : a.id); }}>Extensions</button>
                    <button type="button" style={S.btn} disabled={busy} aria-label={`Grade release for ${a.title}`} aria-expanded={relFor === a.id} onClick={() => { setRubricFor(null); setExtFor(null); setRelFor(relFor === a.id ? null : a.id); }}>Grade release</button>
                    <button type="button" style={S.btn} disabled={busy} aria-label={`Delete ${a.title}`} onClick={() => { if (ask(`Delete the assignment "${a.title}"? This is not possible once learners have handed in work.`)) act(() => API.delete(`${base}/${a.id}`), "Assignment deleted."); }}>Delete</button>
                  </div>
                  {rubricFor === a.id && <RubricPanel key={a.id} courseId={courseId} base={base} a={a} onClose={() => setRubricFor(null)} />}
                  {extFor === a.id && <AssignmentExtensions key={a.id} courseId={courseId} base={base} a={a} onClose={() => setExtFor(null)} />}
                  {relFor === a.id && <AssignmentGradeRelease key={a.id} courseId={courseId} base={base} a={a} onClose={() => setRelFor(null)} />}
                </li>))}
            </ul>)}
          <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={false} />
        </>)}
    </div>
  );
}
