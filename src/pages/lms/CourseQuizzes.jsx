import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton, StatusBadge } from "./lmsUi";

/* Teacher quizzes screen /teacher/courses/:courseId/quizzes (L6.2d, S81). Frontend only. Backend (flag lms_quizzes; read = course staff, write = lms.course.manage):
     GET   /lms/courses/:id/quizzes?page&pageSize       -> { items, total, page, pageSize }
     POST  /lms/courses/:id/quizzes                      PATCH /lms/courses/:id/quizzes/:qid   (settings, status draft|published)
     DELETE /lms/courses/:id/quizzes/:qid                GET   /lms/courses/:id/quizzes/:qid   -> { quiz: { ..., questions: [{id,position,type,stem,points}] } }
     PUT   /lms/courses/:id/quizzes/:qid/questions/order {ids}      DELETE /lms/courses/:id/quizzes/:qid/questions/:qqid   (draft only)
   The server owns the rules (practice never counts to a grade, revision/flashcards no timer or due date, mock needs a timer, publish needs questions,
   no edit/delete once attempts exist) and its sentences are shown as they come. Adding bank questions is on the Questions screen (S82); random rules are in RandomRules (S82). NOT here yet: marking attempts, analytics. Dates are typed in the browser's time zone and sent as ISO 8601 with a zone. */

const PAGE_SIZE = 20;
const TYPE = { practice: "Practice", coursework: "Coursework" };
const MODE = { quiz: "Quiz", revision: "Revision", mock: "Mock test", flashcards: "Flashcards" };
const FEEDBACK = { immediate: "Right after each answer", after_close: "After the due date", never: "Never" };
const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toIso = (local) => { if (!local) return null; const d = new Date(local); return Number.isNaN(d.getTime()) ? undefined : d.toISOString(); };
const blank = () => ({ id: null, title: "", instructions: "", assessmentType: "practice", mode: "quiz", timeLimitMinutes: "", maxAttempts: "1", shuffleQuestions: false, shuffleOptions: false, feedbackTiming: "immediate", countsToGrade: false, availableFrom: "", dueAt: "" });
const fromServer = (q) => ({ id: q.id, title: q.title, instructions: q.instructions || "", assessmentType: q.assessmentType, mode: q.mode, timeLimitMinutes: q.timeLimitMinutes === null || q.timeLimitMinutes === undefined ? "" : String(q.timeLimitMinutes), maxAttempts: String(q.maxAttempts), shuffleQuestions: !!q.shuffleQuestions, shuffleOptions: !!q.shuffleOptions, feedbackTiming: q.feedbackTiming, countsToGrade: !!q.countsToGrade, availableFrom: toLocalInput(q.availableFrom), dueAt: toLocalInput(q.dueAt) });

function Editor({ draft, setDraft, onSave, onCancel, busy, msg }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <section aria-label="Quiz settings" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{draft.id ? "Quiz settings" : "New quiz"}</h2>
      <Notice msg={msg} />
      <label style={S.label} htmlFor="qz-title">Title</label>
      <input id="qz-title" style={{ ...S.input, width: "100%" }} maxLength={200} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
      <label style={S.label} htmlFor="qz-ins">Instructions for learners (optional, plain text)</label>
      <textarea id="qz-ins" rows={3} maxLength={4000} style={{ ...S.input, width: "100%" }} value={draft.instructions} onChange={(e) => set({ instructions: e.target.value })} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <label style={S.label} htmlFor="qz-type">Counts as</label>
          <select id="qz-type" style={S.input} value={draft.assessmentType} onChange={(e) => set({ assessmentType: e.target.value, ...(e.target.value === "practice" ? { countsToGrade: false } : {}) })}>
            {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label} htmlFor="qz-mode">Kind</label>
          <select id="qz-mode" style={S.input} value={draft.mode} onChange={(e) => set({ mode: e.target.value })}>
            {Object.entries(MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label} htmlFor="qz-time">Time limit (minutes, empty = none)</label>
          <input id="qz-time" type="number" inputMode="numeric" min="1" max="600" step="1" style={{ ...S.input, width: 130 }} value={draft.timeLimitMinutes} onChange={(e) => set({ timeLimitMinutes: e.target.value })} />
        </div>
        <div>
          <label style={S.label} htmlFor="qz-att">Attempts allowed</label>
          <input id="qz-att" type="number" inputMode="numeric" min="1" max="20" step="1" style={{ ...S.input, width: 100 }} value={draft.maxAttempts} onChange={(e) => set({ maxAttempts: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <label style={S.label} htmlFor="qz-from">Opens (optional)</label>
          <input id="qz-from" type="datetime-local" style={S.input} value={draft.availableFrom} onChange={(e) => set({ availableFrom: e.target.value })} />
        </div>
        <div>
          <label style={S.label} htmlFor="qz-due">Due (optional)</label>
          <input id="qz-due" type="datetime-local" style={S.input} value={draft.dueAt} onChange={(e) => set({ dueAt: e.target.value })} />
        </div>
        <div>
          <label style={S.label} htmlFor="qz-fb">Show answers</label>
          <select id="qz-fb" style={S.input} value={draft.feedbackTiming} onChange={(e) => set({ feedbackTiming: e.target.value })}>
            {Object.entries(FEEDBACK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0", fontSize: 14 }}>
        <label><input type="checkbox" checked={draft.shuffleQuestions} onChange={(e) => set({ shuffleQuestions: e.target.checked })} /> Shuffle the order of questions</label>
        <label><input type="checkbox" checked={draft.shuffleOptions} onChange={(e) => set({ shuffleOptions: e.target.checked })} /> Shuffle the answer options</label>
        <label><input type="checkbox" checked={draft.countsToGrade} disabled={draft.assessmentType === "practice"} onChange={(e) => set({ countsToGrade: e.target.checked })} /> Counts towards the grade{draft.assessmentType === "practice" ? " (coursework only)" : ""}</label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={onSave}>Save quiz</button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

const RTYPES = { mcq_single: "Multiple choice (one)", mcq_multi: "Multiple choice (many)", true_false: "True or false", short_answer: "Short answer", numeric: "Number", matching: "Matching", ordering: "Ordering", essay: "Essay" };
const RBLANK = { id: null, count: "5", pointsEach: "1", type: "", difficulty: "", subject: "", topic: "" };

/* Random-pick rules (L6.2e, S82). GET/POST /rules, PATCH/DELETE /rules/:id; every answer is { rules:[{id,count,pointsEach,type,subject,topic,difficulty,available,enough}] }.
   Write only while the quiz is a draft; the server's sentences are shown as they come. */
function RandomRules({ base, quizId, draft, onChanged }) {
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const rb = `${base}/${quizId}/rules`;
  useEffect(() => {
    let live = true;
    API.get(rb).then((r) => { if (live) setRules(r.data.rules || []); }).catch((e) => { if (live) { setRules([]); setMsg({ ok: false, text: errText(e, "Could not load the random rules.") }); } });
    return () => { live = false; };
  }, [rb]);
  const done = (r, text) => { setRules(r.data.rules || []); setForm(null); setMsg({ ok: true, text }); onChanged(); };
  const save = async () => {
    const count = Number(form.count), pointsEach = Number(form.pointsEach);
    if (!Number.isInteger(count) || count < 1 || count > 50) { setMsg({ ok: false, text: "How many questions must be a whole number from 1 to 50." }); return; }
    if (!Number.isFinite(pointsEach) || pointsEach <= 0) { setMsg({ ok: false, text: "Points each must be a number above 0." }); return; }
    const body = { count, pointsEach, type: form.type || null, difficulty: form.difficulty || null, subject: form.subject.trim() || null, topic: form.topic.trim() || null };
    setBusy(true); setMsg(null);
    try { const r = form.id ? await API.patch(`${rb}/${form.id}`, body) : await API.post(rb, body); done(r, "Rule saved."); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not save the rule. Your entries are still here.") }); }
    setBusy(false);
  };
  const remove = async (r) => {
    if (!window.confirm("Remove this random rule?")) return;
    setBusy(true); setMsg(null);
    try { done(await API.delete(`${rb}/${r.id}`), "Rule removed."); } catch (e) { setMsg({ ok: false, text: errText(e, "Could not remove the rule.") }); }
    setBusy(false);
  };
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const label = (r) => [r.type ? RTYPES[r.type] : "Any type", r.difficulty || "any difficulty", r.subject || "any subject", r.topic || "any topic"].join(" · ");
  return (
    <section aria-label="Random questions" style={{ marginTop: 18 }}>
      <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>Random questions</h3>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: C.muted }}>Pick questions from the question bank at random for each learner.</p>
      <Notice msg={msg} />
      {rules === null ? <Skeleton rows={1} /> : rules.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No random rules yet.</p> : (
        <ul aria-label="Random rules" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map((r) => (
            <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 14 }}>
              <span>Pick {r.count} at {r.pointsEach} pt each · {label(r)}<br /><span style={{ fontSize: 12, color: r.enough ? C.muted : C.bad }}>{r.available} in the bank now{r.enough ? "" : ", not enough for this rule"}</span></span>
              {draft && <span style={{ display: "flex", gap: 6 }}>
                <button type="button" style={S.btn} disabled={busy} aria-label={`Edit rule ${r.position}`} onClick={() => { setMsg(null); setForm({ id: r.id, count: String(r.count), pointsEach: String(r.pointsEach), type: r.type || "", difficulty: r.difficulty || "", subject: r.subject || "", topic: r.topic || "" }); }}>Edit</button>
                <button type="button" style={S.btn} disabled={busy} aria-label={`Remove rule ${r.position}`} onClick={() => remove(r)}>Remove</button></span>}
            </li>
          ))}
        </ul>
      )}
      {draft && !form && <div style={{ marginTop: 8 }}><button type="button" style={S.btn} onClick={() => { setMsg(null); setForm({ ...RBLANK }); }}>Add random rule</button></div>}
      {draft && form && (
        <div role="group" aria-label="Rule form" style={{ ...S.box, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div><label style={S.label} htmlFor="rr-count">How many questions</label><input id="rr-count" type="number" inputMode="numeric" min="1" max="50" style={{ ...S.input, width: 100 }} value={form.count} onChange={(e) => set({ count: e.target.value })} /></div>
            <div><label style={S.label} htmlFor="rr-pts">Points each</label><input id="rr-pts" type="number" inputMode="decimal" min="0.01" step="0.25" style={{ ...S.input, width: 100 }} value={form.pointsEach} onChange={(e) => set({ pointsEach: e.target.value })} /></div>
            <div><label style={S.label} htmlFor="rr-type">Type</label><select id="rr-type" style={S.input} value={form.type} onChange={(e) => set({ type: e.target.value })}><option value="">Any</option>{Object.entries(RTYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={S.label} htmlFor="rr-diff">Difficulty</label><select id="rr-diff" style={S.input} value={form.difficulty} onChange={(e) => set({ difficulty: e.target.value })}><option value="">Any</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
            <div><label style={S.label} htmlFor="rr-sub">Subject</label><input id="rr-sub" maxLength={100} style={{ ...S.input, width: 140 }} value={form.subject} onChange={(e) => set({ subject: e.target.value })} /></div>
            <div><label style={S.label} htmlFor="rr-top">Topic</label><input id="rr-top" maxLength={100} style={{ ...S.input, width: 140 }} value={form.topic} onChange={(e) => set({ topic: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={save}>Save rule</button>
            <button type="button" style={S.btn} disabled={busy} onClick={() => { setForm(null); setMsg(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Questions({ base, quizId, onBack, onChanged }) {
  const [quiz, setQuiz] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const r = await API.get(`${base}/${quizId}`); setQuiz(r.data.quiz); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not open the quiz.") }); }
  }, [base, quizId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  if (!quiz) return <div style={S.box}><Notice msg={msg} />{!msg && <Skeleton rows={2} />}<button type="button" style={S.btn} onClick={onBack}>Back to quizzes</button></div>;
  const draft = quiz.status === "draft", qs = quiz.questions || [];
  const move = async (i, d) => {
    const ids = qs.map((q) => q.id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]]; setBusy(true); setMsg(null);
    try { const r = await API.put(`${base}/${quizId}/questions/order`, { ids }); setQuiz((q) => ({ ...q, ...(r.data.quiz || {}) })); if (!r.data.quiz) await load(); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not change the order.") }); }
    setBusy(false);
  };
  const remove = async (q) => {
    if (!window.confirm("Remove this question from the quiz? The question bank copy is not touched.")) return;
    setBusy(true); setMsg(null);
    try { await API.delete(`${base}/${quizId}/questions/${q.id}`); setMsg({ ok: true, text: "Question removed." }); await load(); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not remove the question.") }); }
    setBusy(false);
  };
  return (
    <section aria-label="Quiz questions" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{quiz.title}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.muted }}>{qs.length} question{qs.length === 1 ? "" : "s"} · {quiz.totalPoints} points{quiz.ruleCount ? ` · ${quiz.ruleCount} random-pick rule${quiz.ruleCount === 1 ? "" : "s"}` : ""}{draft ? "" : " · published, so questions are locked"}</p>
      <Notice msg={msg} />
      {qs.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No fixed questions yet. Add some from the Questions screen of this course.</p> : (
        <ol aria-label="Questions" style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          {qs.map((q, i) => (
            <li key={q.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 14 }}>{q.stem.length > 140 ? `${q.stem.slice(0, 140)}…` : q.stem} <span style={{ color: C.muted, fontSize: 12 }}>· {q.type} · {q.points} pt</span></span>
                {draft && (
                  <span style={{ display: "flex", gap: 6 }}>
                    <button type="button" style={S.btn} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move question ${i + 1} up`}>Up</button>
                    <button type="button" style={S.btn} disabled={busy || i === qs.length - 1} onClick={() => move(i, 1)} aria-label={`Move question ${i + 1} down`}>Down</button>
                    <button type="button" style={S.btn} disabled={busy} onClick={() => remove(q)} aria-label={`Remove question ${i + 1}`}>Remove</button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <RandomRules base={base} quizId={quizId} draft={draft} onChanged={() => { load(); onChanged(); }} />
      <div style={{ marginTop: 14 }}><button type="button" style={S.btn} onClick={onBack}>Back to quizzes</button></div>
    </section>
  );
}

export default function CourseQuizzes() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/quizzes`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState(null);
  const [draft, setDraft] = useState(null);
  const [emsg, setEmsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { page, pageSize: PAGE_SIZE } }); setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the quizzes.") }); setState("error"); } }
  }, [base, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, tick]);
  const retry = () => { setState("loading"); setMsg(null); load(); };

  const edit = async (id) => {
    setMsg(null);
    try { const r = await API.get(`${base}/${id}`); setEmsg(null); setDraft(fromServer(r.data.quiz)); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not open the quiz.") }); }
  };
  const save = async () => {
    const maxAttempts = Number(draft.maxAttempts), tl = draft.timeLimitMinutes.trim() === "" ? null : Number(draft.timeLimitMinutes);
    const af = toIso(draft.availableFrom), due = toIso(draft.dueAt);
    if (!draft.title.trim()) { setEmsg({ ok: false, text: "Give the quiz a title." }); return; }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) { setEmsg({ ok: false, text: "Attempts must be a whole number from 1 to 20." }); return; }
    if (tl !== null && (!Number.isInteger(tl) || tl < 1 || tl > 600)) { setEmsg({ ok: false, text: "Time limit must be a whole number of minutes from 1 to 600, or empty." }); return; }
    if (af === undefined || due === undefined) { setEmsg({ ok: false, text: "Check the opening and due dates." }); return; }
    const body = { title: draft.title.trim(), instructions: draft.instructions, assessmentType: draft.assessmentType, mode: draft.mode, timeLimitMinutes: tl, maxAttempts,
      shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions, feedbackTiming: draft.feedbackTiming, countsToGrade: draft.assessmentType === "practice" ? false : draft.countsToGrade, availableFrom: af, dueAt: due };
    setBusy(true); setEmsg(null);
    try { if (draft.id) await API.patch(`${base}/${draft.id}`, body); else await API.post(base, body); setDraft(null); setMsg({ ok: true, text: "Quiz saved." }); setTick((t) => t + 1); }
    catch (e) { setEmsg({ ok: false, text: errText(e, "Could not save the quiz. Your entries are still here.") }); }
    setBusy(false);
  };
  const setStatus = async (q, status) => {
    setMsg(null);
    try { await API.patch(`${base}/${q.id}`, { status }); setMsg({ ok: true, text: status === "published" ? `"${q.title}" published.` : `"${q.title}" moved back to draft.` }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, status === "published" ? "Could not publish the quiz." : "Could not move the quiz back to draft.") }); }
  };
  const del = async (q) => {
    if (!window.confirm(`Delete the quiz "${q.title}"?`)) return;
    try { await API.delete(`${base}/${q.id}`); setMsg({ ok: true, text: "Quiz deleted." }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not delete the quiz.") }); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Quizzes</h1>
      <p style={S.sub}>Set up practice quizzes and coursework quizzes. Learners see a quiz only once it is published.</p>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <><Notice msg={msg} /><button type="button" style={S.btn} onClick={retry}>Try again</button></>
      ) : openId ? (
        <Questions base={base} quizId={openId} onBack={() => setOpenId(null)} onChanged={() => setTick((t) => t + 1)} />
      ) : draft ? (
        <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} msg={emsg} />
      ) : (
        <>
          <Notice msg={msg} />
          <div style={{ marginBottom: 12 }}><button type="button" style={S.btnPrimary} onClick={() => { setEmsg(null); setDraft(blank()); }}>New quiz</button></div>
          {data.items.length === 0 ? <p style={{ color: C.muted, fontSize: 14 }}>No quizzes in this course yet.</p> : (
            <ul aria-label="Course quizzes" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.items.map((q) => (
                <li key={q.id} style={{ ...S.box, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <strong>{q.title}</strong> <StatusBadge status={q.status} />
                    <div style={{ fontSize: 13, color: C.muted }}>{TYPE[q.assessmentType] || q.assessmentType} · {MODE[q.mode] || q.mode} · {q.questionCount} question{q.questionCount === 1 ? "" : "s"} · {q.totalPoints} points{q.countsToGrade ? " · counts to grade" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={S.btn} onClick={() => setOpenId(q.id)} aria-label={`Questions of ${q.title}`}>Questions</button>
                    {q.status === "published" && <Link to={`/teacher/courses/${courseId}/quizzes/${q.id}/attempts`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }} aria-label={`Attempts of ${q.title}`}>Attempts</Link>}
                    {q.status === "published" && <Link to={`/teacher/courses/${courseId}/quizzes/${q.id}/results`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }} aria-label={`Results of ${q.title}`}>Results</Link>}
                    <button type="button" style={S.btn} onClick={() => edit(q.id)} aria-label={`Settings of ${q.title}`}>Settings</button>
                    {q.status === "draft"
                      ? <button type="button" style={S.btn} onClick={() => setStatus(q, "published")} aria-label={`Publish ${q.title}`}>Publish</button>
                      : <button type="button" style={S.btn} onClick={() => setStatus(q, "draft")} aria-label={`Back to draft ${q.title}`}>Back to draft</button>}
                    <button type="button" style={S.btn} onClick={() => del(q)} aria-label={`Delete ${q.title}`}>Delete</button>
                  </div>
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
