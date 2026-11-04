import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher quiz attempts + marking /teacher/courses/:courseId/quizzes/:quizId/attempts (L6.2f, S83). Frontend only. Backend (flag lms_quizzes + lms.submission.grade + course membership):
     GET /lms/courses/:id/quizzes/:qid/attempts?filter=all|needs_marking|graded&page&pageSize -> { quiz:{id,title}, items:[{id,studentName,admissionNo,attemptNo,status,submittedAt,autoPoints,manualPoints,totalPoints,maxPoints,needsMarking}], total, page, pageSize }
     GET  .../attempts/:aid -> { attempt:{..., answers:[{quizQuestionId,number,type,stem,maxPoints,status,points,comment,needsMarking,yourAnswer,key,explanation}]} }
     PUT  .../attempts/:aid/answers/:quizQuestionId/mark {points, comment?} -> { graded, attempt }   (only written answers; a graded attempt cannot be re-marked)
   The server owns the rules and its sentences are shown as they come. Student text is rendered as plain text only. NOT here: publishing results to the gradebook (needs lms.gradebook.publish). */

const PAGE_SIZE = 20;
const FILTERS = { needs_marking: "Needs marking", graded: "Graded", all: "All submitted" };
const when = (iso) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(); };
const show = (v) => (v === null || v === undefined ? "" : typeof v === "string" ? v : typeof v.text === "string" ? v.text : JSON.stringify(v));

function Answer({ a, canMark, onSave, busy }) {
  const [points, setPoints] = useState(a.points === null || a.points === undefined ? "" : String(a.points));
  const [comment, setComment] = useState(a.comment || "");
  const [err, setErr] = useState(null);
  const submit = () => {
    const n = Number(points);
    if (points.trim() === "" || !Number.isFinite(n) || n < 0 || n > a.maxPoints) { setErr(`Give points between 0 and ${a.maxPoints}.`); return; }
    setErr(null); onSave(a, n, comment);
  };
  return (
    <li style={{ ...S.box, margin: 0 }}>
      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>{a.number}. {a.stem}</p>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: C.muted }}>{a.type} · {a.points === null || a.points === undefined ? "not marked" : `${a.points}`} / {a.maxPoints} pt · {a.status}</p>
      <p style={{ margin: "0 0 6px", fontSize: 14, whiteSpace: "pre-wrap" }}><span style={{ color: C.muted }}>Answer: </span>{show(a.yourAnswer) || "No answer"}</p>
      {a.key !== null && a.key !== undefined && a.type !== "essay" && <p style={{ margin: "0 0 6px", fontSize: 13, color: C.muted }}>Key: {show(a.key)}</p>}
      {a.comment && !a.needsMarking && <p style={{ margin: "0 0 6px", fontSize: 13 }}>Comment: {a.comment}</p>}
      {a.needsMarking && canMark && (
        <div role="group" aria-label={`Mark answer ${a.number}`}>
          {err && <div role="alert" style={{ color: C.bad, fontSize: 13, marginBottom: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div><label style={S.label} htmlFor={`pt-${a.quizQuestionId}`}>Points (out of {a.maxPoints})</label>
              <input id={`pt-${a.quizQuestionId}`} type="number" inputMode="decimal" min="0" max={a.maxPoints} step="0.25" style={{ ...S.input, width: 110 }} value={points} onChange={(e) => setPoints(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 200 }}><label style={S.label} htmlFor={`cm-${a.quizQuestionId}`}>Comment (optional)</label>
              <input id={`cm-${a.quizQuestionId}`} maxLength={2000} style={{ ...S.input, width: "100%" }} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={submit} aria-label={`Save mark for answer ${a.number}`}>Save mark</button>
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({ base, attemptId, onBack, onChanged }) {
  const [att, setAtt] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    API.get(`${base}/${attemptId}`).then((r) => { if (live) setAtt(r.data.attempt); }).catch((e) => { if (live) setMsg({ ok: false, text: errText(e, "Could not open the attempt.") }); });
    return () => { live = false; };
  }, [base, attemptId]);
  const mark = async (a, points, comment) => {
    setBusy(true); setMsg(null);
    try {
      const r = await API.put(`${base}/${attemptId}/answers/${a.quizQuestionId}/mark`, { points, comment: comment.trim() ? comment.trim() : null });
      if (r.data.attempt) setAtt(r.data.attempt);
      setMsg({ ok: true, text: r.data.graded ? "Mark saved. All written answers are marked, so the attempt is now graded." : "Mark saved." }); onChanged();
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not save the mark. Your entries are still here.") }); }
    setBusy(false);
  };
  if (!att) return <div style={S.box}><Notice msg={msg} />{!msg && <Skeleton rows={2} />}<button type="button" style={S.btn} onClick={onBack}>Back to attempts</button></div>;
  const graded = att.status === "graded";
  return (
    <section aria-label="Attempt" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{att.studentName || "Learner"}{att.admissionNo ? ` (${att.admissionNo})` : ""} · attempt {att.attemptNo}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.muted }}>{graded ? "Graded" : att.needsMarking ? "Needs marking" : "Submitted"} · {att.totalPoints === null || att.totalPoints === undefined ? "total not final" : `${att.totalPoints} / ${att.maxPoints}`} points{att.autoSubmitted ? " · submitted automatically when time ran out" : ""}{att.submittedAt ? ` · ${when(att.submittedAt)}` : ""}</p>
      <Notice msg={msg} />
      {graded && <p style={{ fontSize: 13, color: C.muted }}>This attempt is graded and cannot be changed.</p>}
      <ol aria-label="Answers" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {(att.answers || []).map((a) => <Answer key={`${a.quizQuestionId}-${a.status}-${a.points}`} a={a} canMark={!graded} onSave={mark} busy={busy} />)}
      </ol>
      <div style={{ marginTop: 14 }}><button type="button" style={S.btn} onClick={onBack}>Back to attempts</button></div>
    </section>
  );
}

export default function CourseQuizAttempts() {
  const { courseId, quizId } = useParams();
  const base = `/lms/courses/${courseId}/quizzes/${quizId}/attempts`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE, quiz: null });
  const [filter, setFilter] = useState("needs_marking");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { filter, page, pageSize: PAGE_SIZE } }); setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE, quiz: r.data.quiz || null }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the attempts.") }); setState("error"); } }
  }, [base, filter, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, tick]);

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Quiz attempts{data.quiz ? `: ${data.quiz.title}` : ""}</h1>
      <p style={S.sub}>Mark written answers. Questions that mark themselves are already scored.</p>
      <p style={{ margin: "0 0 10px" }}><Link to={`/teacher/courses/${courseId}/quizzes`} style={{ fontSize: 14 }}>Back to quizzes</Link></p>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <><Notice msg={msg} /><button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button></>
      ) : openId ? <Detail base={base} attemptId={openId} onBack={() => setOpenId(null)} onChanged={() => setTick((t) => t + 1)} /> : (
        <>
          <div role="group" aria-label="Filter attempts" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.entries(FILTERS).map(([k, v]) => <button key={k} type="button" style={filter === k ? S.btnPrimary : S.btn} aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }}>{v}</button>)}
          </div>
          {data.items.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>{filter === "needs_marking" ? "Nothing is waiting to be marked." : "No attempts here yet."}</p> : (
            <ul aria-label="Attempts" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.items.map((x) => (
                <li key={x.id} style={{ ...S.box, margin: 0, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 14 }}>{x.studentName || "Learner"}{x.admissionNo ? ` (${x.admissionNo})` : ""} · attempt {x.attemptNo}<br />
                    <span style={{ fontSize: 12, color: C.muted }}>{x.status === "graded" ? "Graded" : x.needsMarking ? "Needs marking" : "Submitted"} · {x.totalPoints === null || x.totalPoints === undefined ? "total not final" : `${x.totalPoints} / ${x.maxPoints}`} pt{x.submittedAt ? ` · ${when(x.submittedAt)}` : ""}</span></span>
                  <button type="button" style={S.btn} onClick={() => { setMsg(null); setOpenId(x.id); }} aria-label={`Open attempt ${x.id}`}>{x.needsMarking ? "Mark" : "View"}</button>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
