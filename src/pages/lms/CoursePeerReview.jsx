import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher peer review rounds (L8.3c, S98). Frontend only. Backend (L8.3a, flag `lms_discussions`), under /lms/courses/:id/peer-rounds:
   GET ?page -> {items:[{id,assignmentId,title,reviewsPerLearner,anonymous,rubricId,status:draft|open|closed,reviews,done}], total};
   POST {assignmentId,title,reviewsPerLearner,anonymous,rubricId?} -> 201 {id} (409 ROUND_EXISTS / GROUP_ASSIGNMENT);
   POST /:r/open {dryRun?,seed?} -> {seed,authors,reviewsPerLearner,requested,reviews,dryRun?} (409 NOT_ENOUGH_SUBMISSIONS); POST /:r/close; DELETE /:r (draft only);
   GET /:r/reviews?status&page -> {items:[{id,status,totalPoints,hidden,reviewer:{name,admissionNumber},author:{...}}], total}.
   Assignments: GET /lms/courses/:id/assignments -> {items:[{id,title}]}; rubrics: GET /lms/courses/:id/rubrics -> {items:[{id,title}]}.
   GET /:r/reviews/:v -> {review:{status,comment,totalPoints,hidden,hiddenReason?,reviewer:{name},author:{name},scores:[{criterion,level,points}]}}; PUT /:r/reviews/:v/moderation {hidden:true,reason?<=300} | {hidden:false} (needs `lms.course.manage`; text is never edited or deleted).
   Opening is always an explicit, confirmed action. Peer scores never enter the gradebook. Plain text only. A draft round cannot be edited here (delete and create again). */

const PS = 20;
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);
const LABEL = { draft: "Draft", open: "Open", closed: "Closed" };

function Detail({ base, round, id, onChanged, setMsg }) {
  const [v, setV] = useState(null), [state, setState] = useState("loading"), [tick, setTick] = useState(0), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    API.get(`${base}/${round.id}/reviews/${id}`).then((r) => { if (alive) { setV(r.data.review); setState("ready"); } })
      .catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not open this review.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base, round.id, id, tick, setMsg]);
  if (state === "loading") return <Skeleton rows={2} />;
  if (state === "error" || !v) return null;
  const moderate = async (hidden) => {
    if (hidden && !ask("Hide this review? The author will not see it. The text is kept and you can show it again.")) return;
    setBusy(true);
    try { await API.put(`${base}/${round.id}/reviews/${id}/moderation`, hidden ? { hidden: true, ...(reason.trim() ? { reason: reason.trim() } : {}) } : { hidden: false });
      setMsg({ ok: true, text: hidden ? "Review hidden." : "Review shown again." }); setReason(""); setTick((n) => n + 1); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not change this review.") }); } finally { setBusy(false); }
  };
  return (
    <div role="region" aria-label="Review detail" style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8, fontSize: 14 }}>
      <p style={{ margin: "0 0 4px" }}><strong>{(v.reviewer && v.reviewer.name) || "Unknown"}</strong> reviewed <strong>{(v.author && v.author.name) || "Unknown"}</strong> · {v.status === "done" ? `done${v.totalPoints !== null && v.totalPoints !== undefined ? `, ${v.totalPoints} points` : ""}` : "not done yet"}</p>
      {(v.scores || []).length > 0 && <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>{v.scores.map((x, i) => <li key={i}>{x.criterion}: {x.level || "level"} ({x.points})</li>)}</ul>}
      {v.comment ? <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{v.comment}</p> : <p style={{ color: C.muted }}>No comment.</p>}
      {v.hidden ? (
        <>
          <p style={{ margin: "0 0 6px", color: C.warn }}>Hidden from the author{v.hiddenReason ? `. Reason: ${v.hiddenReason}` : "."}</p>
          <button type="button" style={S.btn} disabled={busy} onClick={() => moderate(false)}>Show again</button>
        </>) : (
        <>
          <label style={S.label} htmlFor="pr-why">Reason for hiding (optional, kept in the record)</label>
          <input id="pr-why" style={{ ...S.input, width: "100%" }} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" style={{ ...S.btn, marginTop: 8 }} disabled={busy} onClick={() => moderate(true)}>Hide this review</button>
        </>)}
    </div>
  );
}

function Reviews({ base, round, setMsg }) {
  const [page, setPage] = useState(1), [st, setSt] = useState(""), [data, setData] = useState({ items: [], total: 0 }), [state, setState] = useState("loading"), [sel, setSel] = useState(null), [rt, setRt] = useState(0);
  useEffect(() => {
    let alive = true;
    API.get(`${base}/${round.id}/reviews`, { params: { page, pageSize: PS, ...(st ? { status: st } : {}) } })
      .then((r) => { if (alive) { setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); } })
      .catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not load the reviews.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base, round.id, page, st, rt, setMsg]);
  const who = (p) => `${(p && p.name) || "Unknown"}${p && p.admissionNumber ? ` (${p.admissionNumber})` : ""}`;
  return (
    <section aria-label={`Reviews in ${round.title}`} style={{ ...S.box, marginTop: 12 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>{round.title}: who reviews whom</h2>
      <label style={S.label} htmlFor="pr-st">Show</label>
      <select id="pr-st" style={S.input} value={st} onChange={(e) => { setSt(e.target.value); setPage(1); setState("loading"); }}>
        <option value="">All reviews</option><option value="assigned">Not done yet</option><option value="done">Done</option>
      </select>
      {state === "loading" ? <Skeleton rows={2} /> : data.items.length === 0 ? <p style={{ color: C.muted }}>No reviews to show.</p> : (
        <ul aria-label="Reviews" style={{ padding: 0, margin: "8px 0 0" }}>
          {data.items.map((v) => (
            <li key={v.id} style={{ listStyle: "none", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
              <span>{who(v.reviewer)} reviews {who(v.author)} · {v.status === "done" ? `done${v.totalPoints !== null && v.totalPoints !== undefined ? `, ${v.totalPoints} points` : ""}` : "not done yet"}{v.hidden ? " · hidden" : ""}</span>{" "}
              {v.status === "done" && <button type="button" style={{ ...S.btn, minHeight: 32 }} aria-expanded={sel === v.id} aria-label={`${sel === v.id ? "Close" : "View"} review by ${(v.reviewer && v.reviewer.name) || "Unknown"} of ${(v.author && v.author.name) || "Unknown"}`} onClick={() => setSel(sel === v.id ? null : v.id)}>{sel === v.id ? "Close" : "View"}</button>}
              {sel === v.id && <Detail base={base} round={round} id={v.id} onChanged={() => setRt((n) => n + 1)} setMsg={setMsg} />}
            </li>))}
        </ul>)}
      <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={false} />
    </section>
  );
}

export default function CoursePeerReview() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/peer-rounds`;
  const [data, setData] = useState({ items: [], total: 0 }), [page, setPage] = useState(1), [state, setState] = useState("loading"), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [asg, setAsg] = useState([]), [rub, setRub] = useState([]);
  const [f, setF] = useState({ assignmentId: "", title: "", k: "2", anonymous: true, rubricId: "" });
  const [plan, setPlan] = useState(null), [view, setView] = useState(null);

  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { page, pageSize: PS } }); setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load peer review rounds.") }); setState("error"); } }
  }, [base, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let alive = true;
    API.get(`/lms/courses/${courseId}/assignments`, { params: { pageSize: 100 } }).then((r) => { if (alive) setAsg(r.data.items || []); }).catch(() => {});
    API.get(`/lms/courses/${courseId}/rubrics`, { params: { pageSize: 100 } }).then((r) => { if (alive) setRub(r.data.items || []); }).catch(() => {});
    return () => { alive = false; };
  }, [courseId]);

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  const titleOf = (id) => { const a = asg.find((x) => x.id === id); return a ? a.title : `Assignment ${id}`; };
  const act = async (fn, okText) => { setBusy(true); try { const r = await fn(); setMsg({ ok: true, text: okText }); await load(); return r; } catch (e) { setMsg({ ok: false, text: errText(e, "That did not work. Please try again.") }); return null; } finally { setBusy(false); } };
  const k = Number(f.k), valid = Number(f.assignmentId) > 0 && f.title.trim() && Number.isInteger(k) && k >= 1 && k <= 5;
  const create = async (e) => {
    e.preventDefault(); if (!valid) return;
    const body = { assignmentId: Number(f.assignmentId), title: f.title.trim(), reviewsPerLearner: k, anonymous: f.anonymous, ...(f.rubricId ? { rubricId: Number(f.rubricId) } : {}) };
    const r = await act(() => API.post(base, body), "Round created as a draft. Nothing is shared with learners until you open it.");
    if (r) setF({ assignmentId: "", title: "", k: "2", anonymous: true, rubricId: "" });
  };
  const preview = async (r) => { setBusy(true); try { const x = await API.post(`${base}/${r.id}/open`, { dryRun: true }); setPlan({ id: r.id, ...x.data }); setMsg(null); } catch (e) { setPlan(null); setMsg({ ok: false, text: errText(e, "Could not preview the round.") }); } finally { setBusy(false); } };
  const openRound = async (r) => {
    if (!ask(`Open "${r.title}"? Reviews are assigned now and cannot be changed afterwards.`)) return;
    const x = await act(() => API.post(`${base}/${r.id}/open`, plan && plan.id === r.id ? { seed: plan.seed } : {}), "Round opened. Reviews have been assigned.");
    if (x) setPlan(null);
  };

  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/teacher/courses">← My courses</Link></p>
      <h1 style={S.h1}>Peer review</h1>
      <p style={S.sub}>Learners who have submitted review each other's work. Peer scores never count in the gradebook.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); load(); }}>Try again</button> : (
        <>
          <form aria-label="New round" style={{ ...S.box, margin: "0 0 12px" }} onSubmit={create}>
            <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>New round</h2>
            <label style={S.label} htmlFor="pr-a">Assignment</label>
            <select id="pr-a" style={{ ...S.input, width: "100%" }} value={f.assignmentId} onChange={(e) => setF({ ...f, assignmentId: e.target.value })}>
              <option value="">Choose an assignment</option>{asg.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            <label style={S.label} htmlFor="pr-t">Round title</label>
            <input id="pr-t" style={{ ...S.input, width: "100%" }} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div><label style={S.label} htmlFor="pr-k">Reviews each learner does (1-5)</label><input id="pr-k" type="number" min={1} max={5} style={{ ...S.input, width: 110 }} value={f.k} onChange={(e) => setF({ ...f, k: e.target.value })} /></div>
              <div><label style={S.label} htmlFor="pr-r">Rubric (optional)</label>
                <select id="pr-r" style={S.input} value={f.rubricId} onChange={(e) => setF({ ...f, rubricId: e.target.value })}><option value="">No rubric</option>{rub.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, minHeight: 40 }}><input type="checkbox" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} />Hide names from learners</label>
            </div>
            <div style={{ marginTop: 10 }}><button type="submit" style={S.btnPrimary} disabled={busy || !valid}>Create draft round</button></div>
          </form>
          {data.items.length === 0 ? <p style={{ color: C.muted }}>No peer review rounds yet.</p> : (
            <ul aria-label="Rounds" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
              {data.items.map((r) => (
                <li key={r.id} style={{ ...S.box, listStyle: "none" }}>
                  <strong>{r.title}</strong> <span style={{ fontSize: 13, color: C.muted }}>· {LABEL[r.status] || r.status} · {titleOf(r.assignmentId)} · {r.reviewsPerLearner} each{r.status !== "draft" ? ` · ${r.done} of ${r.reviews} reviews done` : ""}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {r.status === "draft" && <button type="button" style={S.btn} disabled={busy} aria-label={`Preview ${r.title}`} onClick={() => preview(r)}>Preview</button>}
                    {r.status === "draft" && <button type="button" style={S.btnPrimary} disabled={busy} aria-label={`Open ${r.title}`} onClick={() => openRound(r)}>Open round</button>}
                    {r.status === "open" && <button type="button" style={S.btn} disabled={busy} aria-label={`Close ${r.title}`} onClick={() => { if (ask(`Close "${r.title}"? Learners can no longer submit reviews and authors will see their feedback.`)) act(() => API.post(`${base}/${r.id}/close`, {}), "Round closed."); }}>Close round</button>}
                    {r.status !== "draft" && <button type="button" style={S.btn} aria-expanded={view === r.id} onClick={() => setView(view === r.id ? null : r.id)}>{view === r.id ? `Hide reviews of ${r.title}` : `Reviews of ${r.title}`}</button>}
                    {r.status === "draft" && <button type="button" style={S.btn} disabled={busy} aria-label={`Delete ${r.title}`} onClick={() => { if (ask(`Delete the draft round "${r.title}"?`)) act(() => API.delete(`${base}/${r.id}`), "Round deleted."); }}>Delete</button>}
                  </div>
                  {plan && plan.id === r.id && (
                    <p role="status" style={{ fontSize: 14, margin: "8px 0 0" }}>Preview (nothing saved): {plan.authors} learners, {plan.reviewsPerLearner} review{plan.reviewsPerLearner === 1 ? "" : "s"} each, {plan.reviews} reviews in all. Seed: <code>{plan.seed}</code></p>)}
                  {view === r.id && <Reviews base={base} round={r} setMsg={setMsg} />}
                </li>))}
            </ul>)}
          <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={false} />
        </>)}
    </div>
  );
}
