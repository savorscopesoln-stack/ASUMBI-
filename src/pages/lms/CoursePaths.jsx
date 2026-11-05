import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useDebounced } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher learning-path editor (L9.3d, S114) at /teacher/courses/:courseId/paths. Frontend only. Backend (flag lms_paths; write needs `lms.course.manage`, 403 message shown):
   GET /lms/courses/:id/paths?pageSize -> {items:[{id,title,description,kind,itemCount,learnerCount}],total}; POST {title,description?,kind} -> 201; GET /:p -> {path:{...,items:[{lessonId,position,title,status}]}};
   PATCH /:p {title?,description?,kind?}; DELETE /:p; PUT /:p/items {lessonIds:[<=50 distinct]} (replaces the order); GET /:p/learners?page -> {items:[{studentId,name,reason,lessonsCompleted,lessonTotal}],total};
   PUT /:p/learners {studentIds:[1-100],reason?} -> {assigned,alreadyAssigned,skipped}; DELETE /:p/learners/:studentId. Lessons to add: GET /lms/courses/:id/lessons. Learners to add: GET .../enrolments?status=active&q.
   A path only suggests an order; it never hides or locks a lesson. Plain text only. */

const KINDS = [["core", "Core"], ["remedial", "Extra practice"], ["enrichment", "Stretch"]];
const kindText = (k) => (KINDS.find((x) => x[0] === k) || [k, k])[1];
const PS = 20, MAX_ITEMS = 50;
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);

function Lessons({ base, courseId, path, setMsg, onChanged }) {
  const [items, setItems] = useState(null), [saved, setSaved] = useState([]), [all, setAll] = useState([]), [add, setAdd] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([API.get(`${base}/${path.id}`), API.get(`/lms/courses/${courseId}/lessons`)]).then(([p, l]) => {
      if (!alive) return; const it = (p.data.path?.items || []).map((x) => ({ lessonId: x.lessonId, title: x.title, status: x.status }));
      setItems(it); setSaved(it.map((x) => x.lessonId)); setAll(l.data.lessons || []);
    }).catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not load the lessons of this path.") }); setItems([]); } });
    return () => { alive = false; };
  }, [base, courseId, path.id, setMsg]);
  if (!items) return <Skeleton rows={2} />;
  const ids = items.map((x) => x.lessonId), dirty = ids.length !== saved.length || ids.some((v, i) => v !== saved[i]);
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = items.slice(); [n[i], n[j]] = [n[j], n[i]]; setItems(n); };
  const free = all.filter((l) => !ids.includes(l.id));
  const addOne = () => { const l = all.find((x) => String(x.id) === add); if (!l || items.length >= MAX_ITEMS) return; setItems([...items, { lessonId: l.id, title: l.title, status: l.status }]); setAdd(""); };
  const save = async () => {
    setBusy(true);
    try { await API.put(`${base}/${path.id}/items`, { lessonIds: ids }); setSaved(ids); setMsg({ ok: true, text: "Lessons saved." }); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not save the lessons.") }); } finally { setBusy(false); }
  };
  return (
    <div>
      <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>Lessons in order</h3>
      {items.length === 0 ? <p style={{ color: C.muted, fontSize: 14, margin: "0 0 8px" }}>No lessons yet. Add one below.</p> : (
        <ol aria-label="Lessons in this path" style={{ margin: "0 0 8px", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((x, i) => (
            <li key={x.lessonId} style={{ fontSize: 14 }}>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span>{x.title}{x.status === "draft" ? <span style={{ color: C.muted }}> (draft: learners will not see it yet)</span> : null}</span>
                <button type="button" style={S.btn} aria-label={`Move ${x.title} up`} disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
                <button type="button" style={S.btn} aria-label={`Move ${x.title} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>Down</button>
                <button type="button" style={S.btn} aria-label={`Remove ${x.title} from path`} onClick={() => setItems(items.filter((y) => y.lessonId !== x.lessonId))}>Remove</button>
              </span>
            </li>))}
        </ol>)}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><label style={S.label} htmlFor={`pa-add-${path.id}`}>Add a lesson</label>
          <select id={`pa-add-${path.id}`} style={S.input} value={add} onChange={(e) => setAdd(e.target.value)} disabled={items.length >= MAX_ITEMS}>
            <option value="">Choose a lesson</option>{free.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select></div>
        <button type="button" style={S.btn} disabled={!add} onClick={addOne}>Add</button>
        <button type="button" style={S.btnPrimary} disabled={!dirty || busy} onClick={save}>Save lessons</button>
        <span role="status" style={{ fontSize: 13, color: dirty ? C.bad : C.muted }}>{dirty ? "Unsaved changes" : "Saved"}</span>
      </div>
      {items.length >= MAX_ITEMS && <p style={{ fontSize: 13, color: C.muted }}>A path can hold at most {MAX_ITEMS} lessons.</p>}
    </div>
  );
}

function Learners({ base, courseId, path, setMsg, onChanged }) {
  const [page, setPage] = useState(1), [data, setData] = useState({ items: [], total: 0 }), [tick, setTick] = useState(0), [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""), dq = useDebounced(q, 300), [cand, setCand] = useState([]), [pick, setPick] = useState({}), [reason, setReason] = useState("");
  useEffect(() => {
    let alive = true;
    API.get(`${base}/${path.id}/learners`, { params: { page, pageSize: PS } }).then((r) => { if (alive) setData({ items: r.data.items || [], total: r.data.total || 0 }); })
      .catch((e) => { if (alive) setMsg({ ok: false, text: errText(e, "Could not load the learners.") }); });
    return () => { alive = false; };
  }, [base, path.id, page, tick, setMsg]);
  useEffect(() => {
    if (!dq.trim()) { setCand([]); return undefined; }
    let alive = true;
    API.get(`/lms/courses/${courseId}/enrolments`, { params: { status: "active", q: dq.trim(), page: 1, pageSize: 10 } }).then((r) => { if (alive) setCand(r.data.students || []); }).catch(() => { if (alive) setCand([]); });
    return () => { alive = false; };
  }, [courseId, dq]);
  const ids = Object.keys(pick).filter((k) => pick[k]).map(Number);
  const assign = async () => {
    setBusy(true);
    try {
      const body = { studentIds: ids }; if (reason.trim()) body.reason = reason.trim();
      const r = await API.put(`${base}/${path.id}/learners`, body);
      setMsg({ ok: true, text: `Assigned ${r.data.assigned || 0}${r.data.alreadyAssigned ? `, already on it ${r.data.alreadyAssigned}` : ""}${r.data.skipped ? `, skipped ${r.data.skipped}` : ""}.` });
      setPick({}); setQ(""); setReason(""); setTick((t) => t + 1); onChanged();
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not assign the learners.") }); } finally { setBusy(false); }
  };
  const withdraw = async (l) => {
    if (!ask(`Take ${l.name} off this path? Their progress in the lessons is kept.`)) return;
    setBusy(true);
    try { await API.delete(`${base}/${path.id}/learners/${l.studentId}`); setMsg({ ok: true, text: "Learner taken off the path." }); setTick((t) => t + 1); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not take the learner off the path.") }); } finally { setBusy(false); }
  };
  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>Learners on this path ({data.total})</h3>
      {data.items.length === 0 ? <p style={{ color: C.muted, fontSize: 14, margin: "0 0 8px" }}>No learners yet.</p> : (
        <ul aria-label="Learners on this path" style={{ margin: "0 0 8px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {data.items.map((l) => (
            <li key={l.studentId} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 14 }}>
              <span>{l.name} · {l.lessonsCompleted} of {l.lessonTotal} lessons{l.reason ? ` · ${l.reason}` : ""}</span>
              <button type="button" style={S.btn} aria-label={`Take ${l.name} off this path`} disabled={busy} onClick={() => withdraw(l)}>Remove</button>
            </li>))}
        </ul>)}
      <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={busy} />
      <label style={S.label} htmlFor={`pa-find-${path.id}`}>Find learners to add</label>
      <input id={`pa-find-${path.id}`} style={{ ...S.input, width: "100%", maxWidth: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" />
      {cand.length > 0 && (
        <ul aria-label="Matching learners" style={{ margin: "6px 0", padding: 0 }}>
          {cand.map((s) => (
            <li key={s.studentId} style={{ listStyle: "none", fontSize: 14, padding: "4px 0" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={!!pick[s.studentId]} onChange={(e) => setPick({ ...pick, [s.studentId]: e.target.checked })} />{s.name}{s.admissionNo ? ` (${s.admissionNo})` : ""}</label>
            </li>))}
        </ul>)}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
        <div><label style={S.label} htmlFor={`pa-why-${path.id}`}>Reason (optional, the learner sees it)</label>
          <input id={`pa-why-${path.id}`} style={{ ...S.input, width: 280 }} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <button type="button" style={S.btnPrimary} disabled={busy || ids.length === 0} onClick={assign}>Assign {ids.length || ""} selected</button>
      </div>
    </div>
  );
}

function PathCard({ base, courseId, path, setMsg, reload }) {
  const [open, setOpen] = useState(false), [title, setTitle] = useState(path.title), [desc, setDesc] = useState(path.description || ""), [kind, setKind] = useState(path.kind), [busy, setBusy] = useState(false);
  const changed = title.trim() !== path.title || desc.trim() !== (path.description || "") || kind !== path.kind;
  const saveInfo = async () => {
    setBusy(true);
    try { await API.patch(`${base}/${path.id}`, { title: title.trim(), description: desc.trim() || null, kind }); setMsg({ ok: true, text: "Path saved." }); reload(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not save the path.") }); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!ask(`Delete the path “${path.title}”? Learners will no longer see it. The lessons are not deleted.`)) return;
    setBusy(true);
    try { await API.delete(`${base}/${path.id}`); setMsg({ ok: true, text: "Path deleted." }); reload(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not delete the path.") }); setBusy(false); }
  };
  return (
    <li style={{ ...S.box, listStyle: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span><strong>{path.title}</strong><br /><span style={{ fontSize: 13, color: C.muted }}>{kindText(path.kind)} · {path.itemCount} lesson{path.itemCount === 1 ? "" : "s"} · {path.learnerCount} learner{path.learnerCount === 1 ? "" : "s"}</span></span>
        <button type="button" style={S.btn} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}><label style={S.label} htmlFor={`pa-t-${path.id}`}>Title</label><input id={`pa-t-${path.id}`} style={{ ...S.input, width: "100%" }} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label style={S.label} htmlFor={`pa-k-${path.id}`}>Type</label><select id={`pa-k-${path.id}`} style={S.input} value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
            <div style={{ flexBasis: "100%" }}><label style={S.label} htmlFor={`pa-d-${path.id}`}>Description (optional)</label><textarea id={`pa-d-${path.id}`} style={{ ...S.input, width: "100%" }} rows={2} maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <button type="button" style={S.btnPrimary} disabled={busy || !changed || !title.trim()} onClick={saveInfo}>Save details</button>
            <button type="button" style={S.btn} disabled={busy} onClick={del}>Delete path</button>
          </div>
          <Lessons base={base} courseId={courseId} path={path} setMsg={setMsg} onChanged={reload} />
          <Learners base={base} courseId={courseId} path={path} setMsg={setMsg} onChanged={reload} />
        </div>)}
    </li>
  );
}

export default function CoursePaths() {
  const { courseId } = useParams(), base = `/lms/courses/${courseId}/paths`;
  const [data, setData] = useState({ items: [], total: 0 }), [state, setState] = useState("loading"), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(""), [kind, setKind] = useState("core");
  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { page: 1, pageSize: 50 } }); setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the learning paths.") }); setState("error"); } }
  }, [base]);
  useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault(); const t = title.trim(); if (!t) return; setBusy(true);
    try { await API.post(base, { title: t, kind }); setTitle(""); setMsg({ ok: true, text: "Path created. Open it to add lessons." }); await load(); }
    catch (er) { setMsg({ ok: false, text: errText(er, "Could not create the path.") }); } finally { setBusy(false); }
  };
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/teacher/courses">← My courses</Link></p>
      <h1 style={S.h1}>Learning paths</h1>
      <p style={S.sub}>Suggest an order of lessons for chosen learners, such as extra practice or a stretch track. A path never hides or locks a lesson.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button> : (
        <>
          <form style={{ ...S.box, margin: "0 0 12px", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }} onSubmit={create}>
            <div style={{ flex: 1, minWidth: 180 }}><label style={S.label} htmlFor="pa-new">New path title</label><input id="pa-new" style={{ ...S.input, width: "100%" }} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label style={S.label} htmlFor="pa-newk">Type</label><select id="pa-newk" style={S.input} value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
            <button type="submit" style={S.btnPrimary} disabled={busy || !title.trim()}>Add path</button>
          </form>
          {data.items.length === 0 ? <p style={{ color: C.muted }}>No learning paths yet. Add one above.</p> : (
            <ul aria-label="Paths" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
              {data.items.map((p) => <PathCard key={`${p.id}-${p.updatedAt || ""}`} base={base} courseId={courseId} path={p} setMsg={setMsg} reload={load} />)}
            </ul>)}
        </>)}
    </div>
  );
}
