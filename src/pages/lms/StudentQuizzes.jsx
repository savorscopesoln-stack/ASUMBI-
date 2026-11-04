import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";
import * as U from "../../utils/lmsQuizUi";
import OfflineStrip from "./OfflineStrip";
import useOfflineQueue from "../../hooks/useOfflineQueue";
import { noResponse, queueQuizAnswers } from "../../utils/lmsOfflineEnqueue";

/* Student quizzes (S62, D-126). Routes: /student/courses/:courseId/quizzes (list) and .../quizzes/:quizId (detail, take, result). Offline (L10.3f step 3, D-127, only when `lms_offline` is sold): when an autosave gets NO answer, changed answers of a PRACTICE quiz (no timer, not graded) are saved on this device and replayed later; starting and handing in are online only.
   Backend (student only, ACTIVE enrolment, licence flag `lms_quizzes`; see backend/routes/lms.js and utils/lmsQuizAttempts.js):
   GET  /lms/courses/:id/learn/quizzes?page&pageSize&mode  -> { items:[{id,title,mode,dueAt,timeLimitMinutes,attemptsUsed,attemptsLeft,status,canStart,closedReason}], total, page, pageSize }
   GET  .../learn/quizzes/:qid -> { quiz:{...item, instructions, feedbackTiming, attempts:[{id,attemptNo,status,submittedAt,score|null}]} }
   POST .../:qid/attempts -> 201|200 { attempt }   (starting again while one is open RESUMES it)    GET .../:qid/attempts/:aid -> { attempt } (in progress = take view, else result view)
   PUT  .../:qid/attempts/:aid/answers {answers:{<questionId>:answer|null}} -> { saved }       POST .../submit {} -> { attempt (result view), alreadySubmitted?, autoSubmitted? }
   The server never sends the answer key while an attempt is open. Time is the SERVER's: the screen counts down from `secondsLeft` using elapsed time only and the server closes the attempt itself.
   Flashcard decks (mode "flashcards") are not taken here; they are listed with their reason. Everything the learner or teacher typed is rendered as text (React escapes it). */

const PAGE_SIZE = 20, AUTOSAVE_MS = 1200;
const STATUS = { not_started: "Not started", in_progress: "In progress", attempted: "Attempted" };
const when = (iso) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };

function useGate(setState) {
  return useCallback((e) => {
    if (isModuleNotLicensed(e)) setState("unlicensed");
    else if ([403, 404].includes(e?.response?.status)) setState("forbidden");
    else setState("error");
  }, [setState]);
}
const Forbidden = ({ courseId }) => <div style={S.page}><p>You are not enrolled in this course, or this quiz is not available.</p><Link to={`/student/courses/${courseId}/learn`}>Back to the course</Link></div>;

/* ------------------------------ list ------------------------------ */
export function StudentQuizList() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/learn`;
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState(null);
  const gate = useGate(setState);
  const fetchPage = useCallback((p) => API.get(`${base}/quizzes`, { params: { page: p, pageSize: PAGE_SIZE } }), [base]);
  const onOk = useCallback((r) => { setData(r.data); setState("ready"); }, []);
  const onFail = useCallback((e) => { if (isModuleNotLicensed(e) || [403, 404].includes(e?.response?.status)) gate(e); else { setMsg({ ok: false, text: errText(e) }); setState("error"); } }, [gate]);
  useEffect(() => { let alive = true; fetchPage(page).then((r) => { if (alive) onOk(r); }).catch((e) => { if (alive) onFail(e); }); return () => { alive = false; }; }, [fetchPage, page, onOk, onFail]);
  const retry = () => { setState("loading"); setMsg(null); fetchPage(page).then(onOk).catch(onFail); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "forbidden") return <Forbidden courseId={courseId} />;
  if (state === "loading" && !data) return <div style={S.page}><Skeleton rows={3} /></div>;
  if (state === "error") return <div style={S.page}><Notice msg={msg} /><button type="button" style={S.btn} onClick={retry}>Try again</button></div>;
  const items = data.items || [];
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/learn`}>← Lessons</Link></p>
      <h1 style={S.h1}>Quizzes</h1>
      {items.length === 0 && <p style={{ color: C.muted }}>Your teacher has not published any quizzes yet.</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 8 }}>
        {items.map((z) => (
          <li key={z.id} style={S.box}>
            {z.mode === "flashcards" ? <span style={{ fontWeight: 700, fontSize: 16 }}>{z.title}</span> : <Link to={`/student/courses/${courseId}/quizzes/${z.id}`} style={{ fontWeight: 700, fontSize: 16 }}>{z.title}</Link>}
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              {z.dueAt ? `Due ${when(z.dueAt)}` : "No due date"}
              {z.timeLimitMinutes ? ` · ${z.timeLimitMinutes} min` : ""}
              {" · "}<strong style={{ color: C.text }}>{STATUS[z.status] || z.status}</strong>
              {z.mode !== "flashcards" ? ` · ${z.attemptsLeft} of ${z.maxAttempts} attempts left` : ""}
            </div>
            {!z.canStart && z.closedReason && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{z.closedReason.message}</div>}
          </li>
        ))}
      </ul>
      <Pager page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPage={(p) => { setState("loading"); setPage(p); }} busy={state === "loading"} />
    </div>
  );
}

/* --------------------------- question inputs --------------------------- */
function QuestionInput({ q, value, onChange, disabled }) {
  const name = `q${q.id}`;
  const row = { display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", minHeight: 40, cursor: disabled ? "default" : "pointer" };
  switch (q.type) {
    case "mcq_single":
      return <div role="radiogroup" aria-label={`Question ${q.number}`}>{(q.options || []).map((o) => (
        <label key={o.position} style={row}><input type="radio" name={name} disabled={disabled} checked={value?.selected === o.position} onChange={() => onChange({ selected: o.position })} /><span>{o.text}</span></label>))}</div>;
    case "mcq_multi":
      return <div role="group" aria-label={`Question ${q.number}`}><p style={{ margin: "0 0 4px", fontSize: 13, color: C.muted }}>Choose all that apply.</p>{(q.options || []).map((o) => (
        <label key={o.position} style={row}><input type="checkbox" disabled={disabled} checked={Array.isArray(value?.selected) && value.selected.includes(o.position)} onChange={() => onChange(U.toggleSelected(value, o.position))} /><span>{o.text}</span></label>))}</div>;
    case "true_false":
      return <div role="radiogroup" aria-label={`Question ${q.number}`}>{[[true, "True"], [false, "False"]].map(([b, t]) => (
        <label key={t} style={row}><input type="radio" name={name} disabled={disabled} checked={value?.selected === b} onChange={() => onChange({ selected: b })} /><span>{t}</span></label>))}</div>;
    case "short_answer":
      return <input style={{ ...S.input, width: "100%" }} aria-label={`Answer to question ${q.number}`} maxLength={500} disabled={disabled} value={value?.text || ""} onChange={(e) => onChange(U.textAnswer(e.target.value))} />;
    case "numeric":
      return <div><input style={{ ...S.input, width: 180 }} inputMode="decimal" aria-label={`Answer to question ${q.number}`} disabled={disabled} value={value?.value ?? ""} onChange={(e) => onChange(U.valueAnswer(e.target.value))} />{q.unit ? <span style={{ marginLeft: 8, color: C.muted }}>{q.unit}</span> : null}</div>;
    case "essay":
      return <div><textarea style={{ ...S.input, width: "100%", minHeight: 140 }} aria-label={`Answer to question ${q.number}`} maxLength={20000} disabled={disabled} value={value?.text || ""} onChange={(e) => onChange(U.textAnswer(e.target.value))} />{q.maxWords ? <div style={{ fontSize: 12, color: C.muted }}>Up to {q.maxWords} words.</div> : null}</div>;
    case "matching": {
      const lefts = q.lefts || [], rights = q.rights || [];
      return <div>{lefts.map((l, i) => (
        <div key={l.position} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0" }}>
          <span style={{ flex: "1 1 160px" }}>{l.text}</span>
          <select style={{ ...S.input, flex: "1 1 160px" }} aria-label={`Match for ${l.text}`} disabled={disabled} value={value?.pairs?.[i] ?? ""} onChange={(e) => onChange(U.setPair(value, i, e.target.value, lefts.length))}>
            <option value="">Choose…</option>{rights.map((r) => <option key={r.ref} value={r.ref}>{r.text}</option>)}
          </select>
        </div>))}</div>;
    }
    case "ordering": {
      const items = q.items || [], order = U.currentOrder(value, items), byRef = new Map(items.map((i) => [i.ref, i.text]));
      return <div><p style={{ margin: "0 0 4px", fontSize: 13, color: C.muted }}>Put the items in the right order using the arrows.{!value ? " (Shown in a mixed order; move one to save an order.)" : ""}</p>
        <ol style={{ margin: 0, paddingLeft: 22 }}>{order.map((ref, i) => (
          <li key={ref} style={{ padding: "4px 0" }}><span style={{ marginRight: 8 }}>{byRef.get(ref)}</span>
            <button type="button" style={{ ...S.btn, minWidth: 40, padding: "4px 8px" }} disabled={disabled || i === 0} aria-label={`Move ${byRef.get(ref)} up`} onClick={() => onChange(U.moveItem(value, items, i, -1))}>↑</button>{" "}
            <button type="button" style={{ ...S.btn, minWidth: 40, padding: "4px 8px" }} disabled={disabled || i === order.length - 1} aria-label={`Move ${byRef.get(ref)} down`} onClick={() => onChange(U.moveItem(value, items, i, 1))}>↓</button>
          </li>))}</ol></div>;
    }
    default: return <p style={{ color: C.muted }}>This question type is not supported on this screen yet.</p>;
  }
}

/* ------------------------------ result ------------------------------ */
const showAnswer = (q) => {
  const a = q.yourAnswer; if (!a) return "No answer";
  const k = q.key || {};
  if (a.selected !== undefined && Array.isArray(k.options)) { const sel = [].concat(a.selected); return k.options.filter((o) => sel.includes(o.position)).map((o) => o.text).join(", ") || "No answer"; }
  if (a.selected !== undefined) return a.selected === true ? "True" : a.selected === false ? "False" : "No answer";
  if (a.text !== undefined) return a.text; if (a.value !== undefined) return String(a.value);
  if (a.pairs && k.pairs) return a.pairs.map((p, i) => `${k.pairs[i]?.left ?? "?"} → ${k.pairs[p - 1]?.right ?? "—"}`).join("; ");
  if (a.order && k.items) return a.order.map((p) => k.items[p - 1]?.text ?? "?").join(" → ");
  return "No answer";
};
const showKey = (q) => {
  const k = q.key || {};
  if (k.options) return k.options.filter((o) => o.correct).map((o) => o.text).join(", ");
  if (k.correct !== undefined) return k.correct ? "True" : "False";
  if (k.accepted) return k.accepted.join(" / ");
  if (k.value !== undefined) return `${k.value}${k.tolerance ? ` (±${k.tolerance})` : ""}${k.unit ? ` ${k.unit}` : ""}`;
  if (k.pairs) return k.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
  if (k.items) return k.items.map((p) => p.text).join(" → ");
  return "";
};
function Result({ r }) {
  const fb = r.feedback || {};
  return (
    <div>
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{r.title} · attempt {r.attemptNo}</h2>
      <p style={{ margin: "0 0 10px" }}>
        {r.status === "submitted" ? "Handed in. Some answers still need your teacher to mark them." : "Marked."}
        {r.autoSubmitted ? " The time ran out, so your saved answers were handed in." : ""}
        {r.score ? <> Score: <strong>{r.score.points} / {r.score.max}</strong>{r.score.pending ? " so far (written answers not marked yet)" : ""}</> : null}
      </p>
      {!fb.visible && <p style={{ color: C.muted }}>{fb.message || "Your answers and the correct answers are not shown for this quiz."}</p>}
      {fb.visible && <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>{(r.questions || []).map((q) => (
        <li key={q.id} style={S.box}>
          <div style={{ fontWeight: 600 }}>{q.number}. {q.stem}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>Your answer: {showAnswer(q)}</div>
          <div style={{ fontSize: 14 }}>Result: <strong>{q.status}</strong>{q.points != null ? ` · ${q.points} / ${q.maxPoints}` : ""}</div>
          {q.status !== "correct" && showKey(q) && <div style={{ fontSize: 14 }}>Correct answer: {showKey(q)}</div>}
          {q.comment && <div style={{ fontSize: 14, color: C.muted }}>Teacher: {q.comment}</div>}
          {q.explanation && <div style={{ fontSize: 14, color: C.muted }}>{q.explanation}</div>}
        </li>))}</ol>}
    </div>
  );
}

/* ------------------------------ detail / take ------------------------------ */
export default function StudentQuiz() {
  const { courseId, quizId } = useParams();
  const base = `/lms/courses/${courseId}/learn/quizzes/${quizId}`;
  const [state, setState] = useState("loading");
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);     // take view (in progress) or result view
  const [answers, setAnswers] = useState({});
  const [saveState, setSaveState] = useState("saved"); // saved | unsaved | saving | failed
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(null);
  const savedRef = useRef({}); const answersRef = useRef({}); const timer = useRef(null); const gotAt = useRef(0); const closing = useRef(false);
  const queue = useOfflineQueue();
  const gate = useGate(setState);
  const failLoad = useCallback((e) => { if (isModuleNotLicensed(e) || [403, 404].includes(e?.response?.status)) gate(e); else { setMsg({ ok: false, text: errText(e) }); setState("error"); } }, [gate]);

  const load = useCallback(() => API.get(base).then((r) => { setQuiz(r.data.quiz); setState("ready"); }).catch(failLoad), [base, failLoad]);
  useEffect(() => { let alive = true; Promise.resolve().then(() => { if (alive) { setState("loading"); setAttempt(null); } }); load(); return () => { alive = false; clearTimeout(timer.current); }; }, [load]);

  const enter = useCallback((a) => {
    setAttempt(a); closing.current = false;
    if (a.status === "in_progress") {
      const m = {}; for (const q of a.questions || []) m[q.id] = q.answer ?? null;
      answersRef.current = m; savedRef.current = { ...m }; setAnswers(m); setSaveState("saved"); gotAt.current = performance.now(); setLeft(a.secondsLeft ?? null);
    }
  }, []);

  const ids = useMemo(() => (attempt?.status === "in_progress" ? (attempt.questions || []).map((q) => q.id) : []), [attempt]);

  /* Send every changed answer. Returns true when nothing is left unsaved, "device" when the changes were kept on this device (offline), false otherwise. */
  const flush = useCallback(async () => {
    if (!attempt || attempt.status !== "in_progress") return true;
    const batches = U.dirtyBatches(answersRef.current, savedRef.current, ids); if (!batches.length) { setSaveState("saved"); return true; }
    setSaveState("saving");
    try {
      for (const b of batches) { await API.put(`${base}/attempts/${attempt.id}/answers`, b); for (const k of Object.keys(b.answers)) savedRef.current[k] = b.answers[k]; }
      setSaveState(U.dirtyBatches(answersRef.current, savedRef.current, ids).length ? "unsaved" : "saved"); return true;
    } catch (e) {
      if (noResponse(e)) {
        const dirty = U.dirtyBatches(answersRef.current, savedRef.current, ids).reduce((m, b) => ({ ...m, ...b.answers }), {});
        const q = queueQuizAnswers(queue, Number(courseId), { quiz, quizId: Number(quizId), attemptId: attempt.id, answers: dirty, saved: savedRef.current }, e);
        if (q.queued && q.ok) { setSaveState("device"); setMsg(null); return "device"; }
        if (q.queued) { setSaveState("failed"); setMsg({ ok: false, text: q.message || "Could not save on this device." }); return false; }
      }
      setSaveState("failed");
      if (["TIME_UP", "ATTEMPT_CLOSED"].includes(e?.response?.data?.code)) { setMsg({ ok: false, text: errText(e) }); API.get(`${base}/attempts/${attempt.id}`).then((r) => enter(r.data.attempt)).catch(() => {}); }
      else setMsg({ ok: false, text: errText(e, "Your answers could not be saved. They are still on the screen; try again.") });
      return false;
    }
  }, [attempt, base, ids, enter, queue, quiz, courseId, quizId]);

  const change = (qid, v) => {
    answersRef.current = { ...answersRef.current, [qid]: v }; setAnswers(answersRef.current); setSaveState("unsaved");
    clearTimeout(timer.current); timer.current = setTimeout(() => { flush(); }, AUTOSAVE_MS);
  };

  const submit = useCallback(async (auto = false) => {
    if (busy || !attempt) return; setBusy(true); setMsg(null); clearTimeout(timer.current);
    try {
      const ok = await flush();
      if (ok !== true && !auto) { if (ok === "device") setMsg({ ok: false, text: "You are offline. Your answers are saved on this device. Hand in when you are back online." }); setBusy(false); return; }
      const r = await API.post(`${base}/attempts/${attempt.id}/submit`, {});
      setAttempt(r.data.attempt); setSaveState("saved"); load();
      setMsg({ ok: true, text: r.data.autoSubmitted ? "Time was up, so your saved answers were handed in." : "Your quiz has been handed in." });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not hand in the quiz. Your answers are still on the screen; try again.") }); }
    setBusy(false);
  }, [attempt, base, busy, flush, load]);

  /* Countdown: elapsed time only. At zero we hand in once (the server also closes it by itself). */
  useEffect(() => {
    if (attempt?.status !== "in_progress" || attempt.secondsLeft == null) return undefined;
    const id = setInterval(() => {
      const s = U.secondsLeftNow(attempt.secondsLeft, gotAt.current, performance.now()); setLeft(s);
      if (s === 0 && !closing.current) { closing.current = true; submit(true); }
    }, 1000);
    return () => clearInterval(id);
  }, [attempt, submit]);

  const start = async () => {
    setBusy(true); setMsg(null);
    try { const r = await API.post(`${base}/attempts`, {}); enter(r.data.attempt); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); load(); }
    setBusy(false);
  };
  const open = (id) => { setBusy(true); setMsg(null); API.get(`${base}/attempts/${id}`).then((r) => enter(r.data.attempt)).catch((e) => setMsg({ ok: false, text: errText(e) })).finally(() => setBusy(false)); };
  /* After queued answers were sent: show what the server now holds, but only when nothing was typed since (saveState "device" = the last change was kept on the device). */
  const synced = useCallback(() => {
    if (!attempt || attempt.status !== "in_progress" || saveState !== "device") return;
    API.get(`${base}/attempts/${attempt.id}`).then((r) => { if (r.data?.attempt?.status === "in_progress") enter(r.data.attempt); else setAttempt(r.data.attempt); }).catch(() => {});
  }, [attempt, saveState, base, enter]);
  const back = () => { setAttempt(null); setMsg(null); load(); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "forbidden") return <Forbidden courseId={courseId} />;
  if (state === "loading") return <div style={S.page}><Skeleton rows={2} /></div>;
  if (state === "error") return <div style={S.page}><Notice msg={msg} /><button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button></div>;

  const crumb = <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/quizzes`}>← Quizzes</Link></p>;

  if (attempt?.status === "in_progress") {
    const qs = attempt.questions || []; const n = U.answeredCount(qs, answers);
    const SAVE = { saved: "All answers saved", unsaved: "Unsaved changes…", saving: "Saving…", failed: "Not saved. Check your connection.", device: "Saved on this device, will send when online" };
    return (
      <div style={S.page}>
        {queue && <OfflineStrip queue={queue} courseId={Number(courseId)} onSynced={synced} />}
        {crumb}
        <h1 style={S.h1}>{attempt.title}</h1>
        <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "8px 0", background: C.card, borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
          <span>{n} of {qs.length} answered</span>
          {left !== null && <strong role="timer" aria-label="Time left" style={{ color: left <= 60 ? C.bad : C.text }}>Time left {U.clock(left)}</strong>}
          <span role="status" aria-live="polite" style={{ color: saveState === "failed" ? C.bad : C.muted }}>{SAVE[saveState]}</span>
        </div>
        {attempt.instructions && <p style={{ whiteSpace: "pre-wrap", color: C.muted }}>{attempt.instructions}</p>}
        <Notice msg={msg} />
        <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: 10, margin: "10px 0" }}>{qs.map((q) => (
          <li key={q.id} style={S.box}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{q.number}. {q.stem} <span style={{ fontWeight: 400, color: C.muted, fontSize: 13 }}>({q.points} {q.points === 1 ? "mark" : "marks"})</span></div>
            <QuestionInput q={q} value={answers[q.id] ?? null} onChange={(v) => change(q.id, v)} disabled={busy} />
          </li>))}</ol>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={S.btn} disabled={busy || saveState === "saved"} onClick={flush}>Save now</button>
          <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => { if (n === qs.length || window.confirm(`You have answered ${n} of ${qs.length} questions. Hand in anyway?`)) submit(false); }}>Hand in</button>
        </div>
      </div>
    );
  }

  if (attempt) return <div style={S.page}>{crumb}<Notice msg={msg} /><Result r={attempt} /><button type="button" style={{ ...S.btn, marginTop: 12 }} onClick={back}>Back to this quiz</button></div>;

  const z = quiz;
  return (
    <div style={S.page}>
      {crumb}
      <h1 style={S.h1}>{z.title}</h1>
      <p style={S.sub}>{z.dueAt ? `Due ${when(z.dueAt)}` : "No due date"}{z.timeLimitMinutes ? ` · ${z.timeLimitMinutes} minutes` : ""} · {z.questionCount} questions · {z.totalPoints} marks · {z.attemptsLeft} of {z.maxAttempts} attempts left</p>
      {z.instructions && <p style={{ whiteSpace: "pre-wrap" }}>{z.instructions}</p>}
      <Notice msg={msg} />
      {z.canStart
        ? <button type="button" style={S.btnPrimary} disabled={busy} onClick={start}>{z.hasOpenAttempt ? "Continue your attempt" : "Start quiz"}</button>
        : <p style={{ color: C.muted }}>{z.closedReason?.message || "This quiz cannot be started."}</p>}
      {z.timeLimitMinutes && z.canStart && !z.hasOpenAttempt ? <p style={{ fontSize: 13, color: C.muted }}>The clock starts when you press Start and cannot be paused.</p> : null}
      <h2 style={{ fontSize: 16, margin: "18px 0 6px" }}>Your attempts</h2>
      {(z.attempts || []).length === 0 && <p style={{ color: C.muted }}>No attempts yet.</p>}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>{(z.attempts || []).map((a) => (
        <li key={a.id} style={{ ...S.box, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span>Attempt {a.attemptNo} · {a.status === "in_progress" ? "In progress" : a.status === "graded" ? "Marked" : "Handed in"}{a.submittedAt ? ` · ${when(a.submittedAt)}` : ""}{a.score ? ` · ${a.score.points} / ${a.score.max}` : ""}</span>
          {a.status !== "in_progress" && <button type="button" style={S.btn} disabled={busy} onClick={() => open(a.id)}>View result</button>}
        </li>))}</ul>
    </div>
  );
}
