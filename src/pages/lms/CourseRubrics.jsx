import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher rubrics screen /teacher/courses/:courseId/rubrics (L5.3b, S78). Frontend only. Backend (course staff; writes need `lms.course.manage`):
     GET  /lms/courses/:id/rubrics?page&pageSize          GET /lms/courses/:id/rubrics/:rid      -> { rubric }
     POST /lms/courses/:id/rubrics                         PUT /lms/courses/:id/rubrics/:rid       (full replace; 409 once marked work exists)
     DELETE /lms/courses/:id/rubrics/:rid                  POST /lms/courses/:id/rubrics/copy {fromRubricId,title?}
     GET  /lms/rubric-library                              (school library, read only here)
     GET|PUT /lms/courses/:id/assignments/:aid/rubric      PUT {rubricId|null}  (refused once work is handed in)
   The server validates the whole rubric (best level = weight, distinct points...) and its sentences are shown as they come.
   Outcome tags (outcomeIds) are not edited here but are SENT BACK unchanged, because a save replaces the whole rubric. */

const PAGE_SIZE = 20;
const blankLevel = (label, points) => ({ label, description: "", points: String(points) });
const newCriterion = () => ({ title: "", description: "", weight: "4", outcomeIds: [], levels: [blankLevel("Excellent", 4), blankLevel("Good", 3), blankLevel("Fair", 2), blankLevel("Weak", 1)] });
const fromServer = (r) => ({
  id: r.id, title: r.title, description: r.description || "",
  criteria: r.criteria.map((c) => ({ title: c.title, description: c.description || "", weight: String(c.weight), outcomeIds: (c.outcomes || []).map((o) => o.id), levels: c.levels.map((l) => ({ label: l.label, description: l.description || "", points: String(l.points) })) })),
});
const num = (v) => (String(v).trim() === "" ? NaN : Number(v));

function Editor({ draft, setDraft, onSave, onCancel, busy, msg }) {
  const setC = (i, patch) => setDraft((d) => ({ ...d, criteria: d.criteria.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const setL = (i, k, patch) => setDraft((d) => ({ ...d, criteria: d.criteria.map((c, j) => (j === i ? { ...c, levels: c.levels.map((l, m) => (m === k ? { ...l, ...patch } : l)) } : c)) }));
  return (
    <section aria-label="Rubric editor" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{draft.id ? "Edit rubric" : "New rubric"}</h2>
      <Notice msg={msg} />
      <label style={S.label} htmlFor="rb-title">Title</label>
      <input id="rb-title" style={{ ...S.input, width: "100%" }} maxLength={200} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
      <label style={S.label} htmlFor="rb-desc">Description (optional)</label>
      <textarea id="rb-desc" rows={2} maxLength={1000} style={{ ...S.input, width: "100%" }} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      {draft.criteria.map((c, i) => (
        <fieldset key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, margin: "14px 0 0", padding: 12 }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Criterion {i + 1}</legend>
          <label style={S.label} htmlFor={`c-t-${i}`}>Criterion title</label>
          <input id={`c-t-${i}`} style={{ ...S.input, width: "100%" }} maxLength={200} value={c.title} onChange={(e) => setC(i, { title: e.target.value })} />
          <label style={S.label} htmlFor={`c-d-${i}`}>What it looks at (optional)</label>
          <input id={`c-d-${i}`} style={{ ...S.input, width: "100%" }} maxLength={500} value={c.description} onChange={(e) => setC(i, { description: e.target.value })} />
          <label style={S.label} htmlFor={`c-w-${i}`}>Points for this criterion (the best level must be worth exactly this)</label>
          <input id={`c-w-${i}`} type="number" inputMode="decimal" step="0.01" min="0.01" style={{ ...S.input, width: 120 }} value={c.weight} onChange={(e) => setC(i, { weight: e.target.value })} />
          {c.levels.map((l, k) => (
            <div key={k} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
              <div style={{ flex: "2 1 140px" }}>
                <label style={{ ...S.label, marginTop: 0 }} htmlFor={`l-n-${i}-${k}`}>Level {k + 1} name</label>
                <input id={`l-n-${i}-${k}`} style={{ ...S.input, width: "100%" }} maxLength={100} value={l.label} onChange={(e) => setL(i, k, { label: e.target.value })} />
              </div>
              <div style={{ flex: "0 0 100px" }}>
                <label style={{ ...S.label, marginTop: 0 }} htmlFor={`l-p-${i}-${k}`}>Points</label>
                <input id={`l-p-${i}-${k}`} type="number" inputMode="decimal" step="0.01" min="0" style={{ ...S.input, width: "100%" }} value={l.points} onChange={(e) => setL(i, k, { points: e.target.value })} />
              </div>
              <button type="button" style={S.btn} disabled={c.levels.length <= 2} onClick={() => setC(i, { levels: c.levels.filter((_, m) => m !== k) })} aria-label={`Remove level ${k + 1} of criterion ${i + 1}`}>Remove</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" style={S.btn} disabled={c.levels.length >= 8} onClick={() => setC(i, { levels: [...c.levels, blankLevel("", 0)] })}>Add level</button>
            <button type="button" style={S.btn} disabled={draft.criteria.length <= 1} onClick={() => setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, j) => j !== i) }))}>Remove criterion {i + 1}</button>
          </div>
        </fieldset>
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button type="button" style={S.btn} disabled={draft.criteria.length >= 20} onClick={() => setDraft((d) => ({ ...d, criteria: [...d.criteria, newCriterion()] }))}>Add criterion</button>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={onSave}>Save rubric</button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function UsePanel({ courseId, rubrics }) {
  const [assignments, setAssignments] = useState(null);
  const [aid, setAid] = useState("");
  const [current, setCurrent] = useState(undefined); // undefined = unknown, null = none
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    API.get(`/lms/courses/${courseId}/assignments`, { params: { pageSize: 50 } }).then((r) => { if (alive) setAssignments(r.data.items || []); }).catch(() => { if (alive) setAssignments([]); });
    return () => { alive = false; };
  }, [courseId]);
  const choose = (v) => {
    setAid(v); setCurrent(undefined); setPick(""); setMsg(null);
    if (!v) return;
    API.get(`/lms/courses/${courseId}/assignments/${v}/rubric`).then((r) => setCurrent(r.data.rubric || null)).catch((e) => setMsg({ ok: false, text: errText(e, "Could not read this assignment's rubric.") }));
  };
  const set = async (rubricId) => {
    setBusy(true); setMsg(null);
    try {
      const r = await API.put(`/lms/courses/${courseId}/assignments/${aid}/rubric`, { rubricId });
      setCurrent(r.data.rubric || null); setMsg({ ok: true, text: rubricId === null ? "Rubric removed from the assignment." : "Rubric attached to the assignment." });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not change the rubric.") }); }
    setBusy(false);
  };
  if (!assignments || assignments.length === 0) return null;
  return (
    <section aria-label="Use a rubric in an assignment" style={{ ...S.box, marginTop: 16 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Use a rubric in an assignment</h2>
      <Notice msg={msg} />
      <label style={S.label} htmlFor="use-a">Assignment</label>
      <select id="use-a" style={S.input} value={aid} onChange={(e) => choose(e.target.value)}>
        <option value="">Choose an assignment</option>
        {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>
      {aid && current !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14 }}>{current ? <>Now using: <strong>{current.title}</strong></> : "No rubric: this assignment is marked with points."}</div>
          <label style={S.label} htmlFor="use-r">Rubric</label>
          <select id="use-r" style={S.input} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a rubric</option>
            {rubrics.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" style={S.btnPrimary} disabled={busy || !pick} onClick={() => set(Number(pick))}>Attach</button>
            <button type="button" style={S.btn} disabled={busy || !current} onClick={() => set(null)}>Remove rubric</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CourseRubrics() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/rubrics`;
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [emsg, setEmsg] = useState(null);
  const [lib, setLib] = useState(null); // null = closed, array = school library
  const [libPick, setLibPick] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await API.get(base, { params: { page, pageSize: PAGE_SIZE } });
      setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE }); setState("ready"); // the status line ("Rubric saved") must survive this reload
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the rubrics.") }); setState("error"); }
    }
  }, [base, page]);
  // load() sets state only after the await (same as StudentCourses); the rule flags the call anyway.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, tick]);
  const retry = () => { setState("loading"); setMsg(null); load(); };

  const edit = async (id) => {
    setMsg(null);
    try { const r = await API.get(`${base}/${id}`); setEmsg(null); setDraft(fromServer(r.data.rubric)); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not open the rubric.") }); }
  };
  const save = async () => {
    const criteria = [];
    for (const c of draft.criteria) {
      const w = num(c.weight), levels = c.levels.map((l) => ({ label: l.label, description: l.description, points: num(l.points) }));
      if (Number.isNaN(w) || levels.some((l) => Number.isNaN(l.points))) { setEmsg({ ok: false, text: "Fill in the points for every criterion and level." }); return; }
      criteria.push({ title: c.title, description: c.description, weight: w, outcomeIds: c.outcomeIds, levels });
    }
    setBusy(true); setEmsg(null);
    try {
      const body = { title: draft.title, description: draft.description, criteria };
      if (draft.id) await API.put(`${base}/${draft.id}`, body); else await API.post(base, body);
      setDraft(null); setMsg({ ok: true, text: "Rubric saved." }); setTick((t) => t + 1);
    } catch (e) { setEmsg({ ok: false, text: errText(e, "Could not save the rubric. Your entries are still here.") }); }
    setBusy(false);
  };
  const del = async (r) => {
    if (!window.confirm(`Delete the rubric "${r.title}"?`)) return;
    try { await API.delete(`${base}/${r.id}`); setMsg({ ok: true, text: "Rubric deleted." }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not delete the rubric.") }); }
  };
  const openLib = async () => {
    setMsg(null);
    try { const r = await API.get("/lms/rubric-library", { params: { pageSize: 100 } }); setLib(r.data.items || []); setLibPick(""); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the school library.") }); }
  };
  const copy = async () => {
    try { await API.post(`${base}/copy`, { fromRubricId: Number(libPick) }); setLib(null); setMsg({ ok: true, text: "Copied into this course. You can edit the copy." }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not copy the rubric.") }); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Rubrics</h1>
      <p style={S.sub}>Criteria and levels you can mark with. Attach a rubric to an assignment before learners hand in work.</p>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <><Notice msg={msg} /><button type="button" style={S.btn} onClick={retry}>Try again</button></>
      ) : draft ? (
        <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} msg={emsg} />
      ) : (
        <>
          <Notice msg={msg} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" style={S.btnPrimary} onClick={() => { setEmsg(null); setDraft({ id: null, title: "", description: "", criteria: [newCriterion()] }); }}>New rubric</button>
            <button type="button" style={S.btn} onClick={openLib}>Copy from school library</button>
          </div>
          {lib && (
            <section aria-label="School library" style={{ ...S.box, marginBottom: 12 }}>
              {lib.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: C.muted }}>The school library has no rubrics yet.</p> : (
                <>
                  <label style={{ ...S.label, marginTop: 0 }} htmlFor="lib-pick">School rubric</label>
                  <select id="lib-pick" style={S.input} value={libPick} onChange={(e) => setLibPick(e.target.value)}>
                    <option value="">Choose a rubric</option>
                    {lib.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.criteriaCount} criteria, {r.maxPoints} points)</option>)}
                  </select>
                  <button type="button" style={{ ...S.btnPrimary, marginLeft: 8 }} disabled={!libPick} onClick={copy}>Copy into this course</button>
                </>
              )}
              <button type="button" style={{ ...S.btn, marginLeft: 8 }} onClick={() => setLib(null)}>Close</button>
            </section>
          )}
          {data.items.length === 0 ? <p style={{ color: C.muted, fontSize: 14 }}>No rubrics in this course yet.</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }} aria-label="Course rubrics">
              {data.items.map((r) => (
                <li key={r.id} style={{ ...S.box, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <strong>{r.title}</strong>
                    <div style={{ fontSize: 13, color: C.muted }}>{r.criteriaCount} criteria · {r.maxPoints} points{r.attachedCount ? ` · used in ${r.attachedCount} assignment${r.attachedCount === 1 ? "" : "s"}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" style={S.btn} onClick={() => edit(r.id)} aria-label={`Edit ${r.title}`}>Edit</button>
                    <button type="button" style={S.btn} onClick={() => del(r)} aria-label={`Delete ${r.title}`}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          <UsePanel courseId={courseId} rubrics={data.items} />
        </>
      )}
    </div>
  );
}
