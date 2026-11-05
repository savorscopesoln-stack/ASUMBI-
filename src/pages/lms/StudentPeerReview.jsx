import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Student peer review (L8.3d, S99). Frontend only. Backend (L8.3b), under /lms/courses/:id/learn/peer-reviews:
   GET ?page -> {items:[{id,status:assigned|done,roundTitle,closesAt,anonymous}], total} (open rounds only);
   GET /:id -> {review:{id,status,hidden,roundTitle,closesAt,anonymous,author:{name|null}}, submission:{text}, rubric:{title,maxPoints,criteria:[{id,title,description,weight,levels:[{position?,label,description,points}]}]}|null, mine:{comment,totalPoints,scores:[{criterionId,levelPosition,points}]}};
   PUT /:id {scores:[{criterionId,levelPosition}] (rubric rounds, every criterion) , comment} (no rubric: comment required, no scores) -> {saved,totalPoints}; 409 ROUND_CLOSED / REVIEW_HIDDEN / ROUND_NOT_OPEN;
   GET /received?page -> {items:[{id,roundTitle,anonymous,reviewer:{name|null},comment,totalPoints,scores:[{criterion,level,points}]}], total} (closed rounds, done and not hidden only).
   Plain text only. The server decides what can be seen or saved; points always come from the stored level. Online only. */

const PS = 20, COMMENT_MAX = 2000;
const when = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };

function Form({ base, id, onBack, setMsg }) {
  const [d, setD] = useState(null), [state, setState] = useState("loading"), [pick, setPick] = useState({}), [comment, setComment] = useState(""), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  useEffect(() => {
    let alive = true;
    API.get(`${base}/${id}`).then((r) => {
      if (!alive) return; const x = r.data; setD(x); setComment((x.mine && x.mine.comment) || "");
      const p = {}; ((x.mine && x.mine.scores) || []).forEach((s) => { p[s.criterionId] = s.levelPosition; }); setPick(p); setState("ready");
    }).catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not open this review.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base, id, setMsg]);
  if (state === "loading") return <Skeleton />;
  if (state === "error" || !d) return <button type="button" style={S.btn} onClick={onBack}>Back to my reviews</button>;
  const rub = d.rubric, crit = rub ? rub.criteria || [] : [], locked = d.review.hidden;
  const complete = rub ? crit.every((c) => pick[c.id]) : comment.trim().length > 0;
  const save = async (e) => {
    e.preventDefault(); if (!complete || busy || locked) return; setBusy(true);
    const body = { comment: comment.trim() || null, ...(rub ? { scores: crit.map((c) => ({ criterionId: c.id, levelPosition: pick[c.id] })) } : {}) };
    try { const r = await API.put(`${base}/${id}`, body); setDirty(false); setMsg({ ok: true, text: `Review saved${r.data.totalPoints !== null && r.data.totalPoints !== undefined ? `: ${r.data.totalPoints} points` : ""}. You can change it until the round closes.` }); }
    catch (er) { setMsg({ ok: false, text: errText(er, "Could not save your review.") }); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} aria-label="Review form">
      <p style={{ margin: "0 0 6px" }}><button type="button" style={S.btn} onClick={() => { if (!dirty || (typeof window.confirm !== "function" || window.confirm("Leave without saving your changes?"))) onBack(); }}>← My reviews</button></p>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{d.review.roundTitle}</h2>
      <p style={S.sub}>Work by {d.review.anonymous ? "a classmate" : (d.review.author && d.review.author.name) || "a classmate"}{d.review.closesAt ? ` · closes ${when(d.review.closesAt)}` : ""}</p>
      {locked && <p role="alert" style={{ color: C.bad }}>Your teacher hid this review. It can no longer be changed.</p>}
      <section aria-label="Submission" style={{ ...S.box, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{d.submission && d.submission.text ? d.submission.text : "This learner submitted no text."}</section>
      {rub && crit.map((c) => (
        <fieldset key={c.id} disabled={locked} style={{ ...S.box, margin: "10px 0 0" }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>{c.title}{c.weight ? ` (${c.weight})` : ""}</legend>
          {c.description && <p style={{ margin: "0 0 6px", fontSize: 13, color: C.muted }}>{c.description}</p>}
          {(c.levels || []).map((l, i) => { const pos = l.position || i + 1; return (
            <label key={pos} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", fontSize: 14 }}>
              <input type="radio" name={`c${c.id}`} checked={pick[c.id] === pos} onChange={() => { setPick({ ...pick, [c.id]: pos }); setDirty(true); }} />
              <span><strong>{l.label}</strong> · {l.points} points{l.description ? `: ${l.description}` : ""}</span>
            </label>); })}
        </fieldset>))}
      <label style={S.label} htmlFor="pr-c">{rub ? "Comment (optional)" : "Your feedback"}</label>
      <textarea id="pr-c" rows={5} maxLength={COMMENT_MAX} disabled={locked} style={{ ...S.input, width: "100%" }} value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); }} />
      <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 8px" }}>{comment.length}/{COMMENT_MAX}. {dirty ? "Not saved yet." : "Saved."} Be kind and specific.</p>
      <button type="submit" style={S.btnPrimary} disabled={busy || locked || !complete}>{d.review.status === "done" ? "Save changes" : "Submit review"}</button>
      {!complete && !locked && <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>{rub ? "Choose a level for every criterion." : "Write your feedback first."}</span>}
    </form>
  );
}

function Received({ base, setMsg }) {
  const [page, setPage] = useState(1), [data, setData] = useState({ items: [], total: 0 }), [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    API.get(`${base}/received`, { params: { page, pageSize: PS } }).then((r) => { if (alive) { setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); } })
      .catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not load your feedback.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base, page, setMsg]);
  if (state === "loading") return <Skeleton />;
  if (state === "error") return null;
  return (
    <>
      {data.items.length === 0 ? <p style={{ color: C.muted }}>No feedback yet. It appears here after a review round closes.</p> : (
        <ul aria-label="Feedback received" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
          {data.items.map((x) => (
            <li key={x.id} style={{ ...S.box, listStyle: "none" }}>
              <strong>{x.roundTitle}</strong> <span style={{ fontSize: 13, color: C.muted }}>· from {x.anonymous ? "a classmate" : (x.reviewer && x.reviewer.name) || "a classmate"}{x.totalPoints !== null && x.totalPoints !== undefined ? ` · ${x.totalPoints} points` : ""}</span>
              {(x.scores || []).length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14 }}>{x.scores.map((s, i) => <li key={i}>{s.criterion}: {s.level || "level"} ({s.points})</li>)}</ul>}
              {x.comment && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14 }}>{x.comment}</p>}
            </li>))}
        </ul>)}
      <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={false} />
    </>
  );
}

export default function StudentPeerReview() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/learn/peer-reviews`;
  const [tab, setTab] = useState("todo"), [page, setPage] = useState(1), [data, setData] = useState({ items: [], total: 0 }), [state, setState] = useState("loading"), [msg, setMsg] = useState(null), [openId, setOpenId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    API.get(base, { params: { page, pageSize: PS } }).then((r) => { if (alive) { setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); } })
      .catch((e) => { if (!alive) return; if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load your reviews.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base, page, tick]);
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const tabBtn = (k, t) => <button type="button" role="tab" aria-selected={tab === k} style={tab === k ? S.btnPrimary : S.btn} onClick={() => { setTab(k); setOpenId(null); setMsg(null); }}>{t}</button>;
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}`}>← Back to the course</Link></p>
      <h1 style={S.h1}>Peer review</h1>
      <p style={S.sub}>Review classmates' work and read the feedback on yours. Peer scores do not count in your grade.</p>
      <div role="tablist" style={{ display: "flex", gap: 8, margin: "0 0 12px" }}>{tabBtn("todo", "Reviews to do")}{tabBtn("got", "Feedback I received")}</div>
      <Notice msg={msg} />
      {tab === "got" ? <Received base={base} setMsg={setMsg} /> : openId ? <Form base={base} id={openId} onBack={() => { setOpenId(null); setMsg(null); setTick((n) => n + 1); }} setMsg={setMsg} /> :
        state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); setTick((n) => n + 1); }}>Try again</button> : (
          <>
            {data.items.length === 0 ? <p style={{ color: C.muted }}>You have no reviews to do right now.</p> : (
              <ul aria-label="Reviews to do" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
                {data.items.map((x) => (
                  <li key={x.id} style={{ ...S.box, listStyle: "none", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span><strong>{x.roundTitle}</strong> <span style={{ fontSize: 13, color: C.muted }}>· {x.status === "done" ? "Done" : "Not done yet"}{x.closesAt ? ` · closes ${when(x.closesAt)}` : ""}</span></span>
                    <button type="button" style={S.btn} aria-label={`${x.status === "done" ? "Edit" : "Start"} review: ${x.roundTitle}`} onClick={() => { setOpenId(x.id); setMsg(null); }}>{x.status === "done" ? "Edit" : "Start"}</button>
                  </li>))}
              </ul>)}
            <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={false} />
          </>)}
    </div>
  );
}
