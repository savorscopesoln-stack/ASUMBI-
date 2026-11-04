import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher quiz results /teacher/courses/:courseId/quizzes/:quizId/results (L6.4b + L6.5b, S84). Frontend only. Backend (flag lms_quizzes):
     GET  /lms/courses/:id/quizzes/:qid/analytics?page&pageSize   (lms.course.manage OR lms.submission.grade) -> { quiz, summary, note, questions:[{key,type,stem,points,responses,unansweredRate,difficulty,difficultyLabel,discrimination:{value,rating,reason},options?:[{text,correct,chosen}]}], total, page, pageSize }
     POST /lms/courses/:id/quizzes/:qid/publish-results {dryRun?}  (lms.gradebook.publish) -> { dryRun?, eligible | inserted, updated, unchanged, assessmentId, skipped:[{studentId,reason}], skippedCount, totalMarks }
   Publishing is an explicit staff action and is safe to repeat (the server updates, never duplicates). Every server sentence (not a coursework quiz, no class/subject mapping,
   nothing to publish, no permission) is shown as it comes. The figures are prompts to look at a question again, not verdicts. NOT here: per-question drill-down by bank id. */

const PAGE_SIZE = 20;
const REASON = { NEEDS_MARKING: "has an attempt still waiting for marking", NO_POINTS: "attempt has no points to score" };
const DISC = { NEEDS_20_GRADED_ATTEMPTS: "needs 20 graded attempts", TOO_FEW_RESPONSES: "too few responses" };
const pc = (v) => (v === null || v === undefined ? "n/a" : `${Math.round(Number(v) * 100)}%`);
const num = (v) => (v === null || v === undefined ? "n/a" : String(v));

function Publish({ base }) {
  const [res, setRes] = useState(null); // { kind: "check" | "done", data }
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (dryRun) => {
    if (!dryRun && !window.confirm("Publish these marks to the school's formal results? You can publish again later if marks change.")) return;
    setBusy(true); setMsg(null);
    try { const r = await API.post(`${base}/publish-results`, { dryRun }); setRes({ kind: dryRun ? "check" : "done", data: r.data }); }
    catch (e) { setRes(null); setMsg({ ok: false, text: errText(e, dryRun ? "Could not check the results." : "Could not publish the results. Nothing was changed.") }); }
    setBusy(false);
  };
  const d = res && res.data;
  const reasons = {}; (d && d.skipped ? d.skipped : []).forEach((s) => { reasons[s.reason] = (reasons[s.reason] || 0) + 1; });
  return (
    <section aria-label="Publish results" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Publish to formal results</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.muted }}>For coursework quizzes. Each learner's best marked attempt becomes a mark out of 100 in the school's results. Learners with an attempt still waiting for marking are left out until it is marked.</p>
      <Notice msg={msg} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={S.btn} disabled={busy} onClick={() => run(true)}>Check who will be published</button>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => run(false)}>Publish results</button>
      </div>
      {d && (
        <div role="status" aria-live="polite" style={{ marginTop: 10, fontSize: 14 }}>
          {res.kind === "check"
            ? <p style={{ margin: 0 }}>Nothing was written. {d.eligible} learner{d.eligible === 1 ? "" : "s"} would be published.</p>
            : <p style={{ margin: 0 }}>Published. {d.inserted} added, {d.updated} changed, {d.unchanged} unchanged (marks out of {d.totalMarks}).</p>}
          {d.skippedCount > 0 && (
            <p style={{ margin: "6px 0 0", color: C.muted }}>{d.skippedCount} learner{d.skippedCount === 1 ? "" : "s"} left out: {Object.entries(reasons).map(([k, n]) => `${n} ${REASON[k] || k}`).join("; ")}.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Question({ q }) {
  return (
    <li style={{ ...S.box, margin: 0 }}>
      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>{q.position ? `${q.position}. ` : ""}{q.stem}</p>
      <p style={{ margin: "0 0 4px", fontSize: 13, color: C.muted }}>
        {q.type} · {q.points} pt · {q.responses} response{q.responses === 1 ? "" : "s"} · {pc(q.unansweredRate)} left blank
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 13 }}>Difficulty: {q.difficulty === null || q.difficulty === undefined ? "n/a" : `${pc(q.difficulty)} got it right`}{q.difficultyLabel ? ` (${q.difficultyLabel})` : ""}
        {" · "}Separates strong from weak: {q.discrimination && q.discrimination.value !== null && q.discrimination.value !== undefined ? `${num(q.discrimination.value)}${q.discrimination.rating ? ` (${q.discrimination.rating})` : ""}` : (q.discrimination && DISC[q.discrimination.reason]) || "n/a"}</p>
      {Array.isArray(q.options) && q.options.length > 0 && (
        <ul aria-label="Chosen options" style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>
          {q.options.map((o) => <li key={o.key || o.text}>{o.text}{o.correct ? " (correct)" : ""}: chosen {o.chosen} time{o.chosen === 1 ? "" : "s"}</li>)}
        </ul>
      )}
    </li>
  );
}

export default function CourseQuizResults() {
  const { courseId, quizId } = useParams();
  const base = `/lms/courses/${courseId}/quizzes/${quizId}`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try { const r = await API.get(`${base}/analytics`, { params: { page, pageSize: PAGE_SIZE } }); setData(r.data); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the quiz figures.") }); setState("error"); } }
  }, [base, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const sm = data && data.summary;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Quiz results{data && data.quiz ? `: ${data.quiz.title}` : ""}</h1>
      <p style={{ margin: "0 0 10px" }}>
        <Link to={`/teacher/courses/${courseId}/quizzes`} style={{ fontSize: 14 }}>Back to quizzes</Link>{" · "}
        <Link to={`/teacher/courses/${courseId}/quizzes/${quizId}/attempts`} style={{ fontSize: 14 }}>Attempts and marking</Link>
      </p>
      <Publish base={base} />
      <h2 style={{ fontSize: 18, margin: "18px 0 6px" }}>How the quiz went</h2>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <><Notice msg={msg} /><button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button></>
      ) : (
        <>
          <section aria-label="Summary" style={S.box}>
            {sm.gradedAttempts === 0 ? <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No graded attempts yet, so there are no figures to show.{sm.waitingForMarking ? ` ${sm.waitingForMarking} waiting for marking.` : ""}</p> : (
              <p style={{ margin: 0, fontSize: 14 }}>{sm.gradedAttempts} graded attempt{sm.gradedAttempts === 1 ? "" : "s"}{sm.waitingForMarking ? `, ${sm.waitingForMarking} waiting for marking` : ""}. Average {num(sm.meanPercent)}%, middle {num(sm.medianPercent)}%, lowest {num(sm.lowestPercent)}%, highest {num(sm.highestPercent)}%.</p>
            )}
            {sm.truncated && <p style={{ margin: "6px 0 0", fontSize: 13, color: C.warn }}>This quiz has more data than the report can read, so the figures cover only part of it.</p>}
            {data.note && <p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted }}>{data.note}</p>}
          </section>
          {(data.questions || []).length > 0 && (
            <ul aria-label="Questions" style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.questions.map((q) => <Question key={q.key} q={q} />)}
            </ul>
          )}
          <Pager page={page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}
