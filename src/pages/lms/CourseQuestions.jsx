import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";
import QuestionCsv from "./QuestionCsv";
import QuestionVersions from "./QuestionVersions";

/* Teacher question bank /teacher/courses/:courseId/questions (L6.1c, S82). Frontend only. Backend (flag lms_quizzes + lms.course.manage):
     GET /lms/questions?scope&type&difficulty&subject&topic&page&pageSize -> { items:[{id,scope,type,stem,points,difficulty,subject,topic,mine,canEdit}], total, page, pageSize }
     GET /lms/questions/:id -> { question:{..., spec} }   POST /lms/questions {scope, courseId?, type, stem, ...type fields}   PUT /lms/questions/:id (no scope)
     DELETE /lms/questions/:id   POST /lms/questions/:id/copy {scope, courseId?}
     POST /lms/courses/:cid/quizzes/:qid/questions {questionIds}  (draft quizzes only; server decides)
   The server validates everything and its sentences are shown as they come. CSV import/export is in QuestionCsv.jsx (S88); version history in QuestionVersions.jsx (S89). NOT here: outcome tags (no question-level backend exists), random-pick rules. */

const PAGE_SIZE = 20;
const TYPES = { mcq_single: "Multiple choice (one answer)", mcq_multi: "Multiple choice (many answers)", true_false: "True or false", short_answer: "Short answer", numeric: "Number", matching: "Matching", ordering: "Ordering", essay: "Essay (marked by hand)" };
const SCOPES = { private: "Private (only me)", course: "Course staff / Department", school: "School" };
const DIFF = { easy: "Easy", medium: "Medium", hard: "Hard" };
const lines = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
const blank = () => ({ id: null, scope: "private", type: "mcq_single", stem: "", explanation: "", points: "1", difficulty: "", subject: "", topic: "", options: [{ text: "", correct: true, feedback: "" }, { text: "", correct: false, feedback: "" }],
  correct: true, accepted: "", caseSensitive: false, value: "", tolerance: "0", unit: "", pairs: [{ left: "", right: "" }, { left: "", right: "" }], items: "", partialCredit: false, maxWords: "" });
const fromServer = (q) => { const s = q.spec || {}; return { ...blank(), id: q.id, version: q.version, scope: q.scope, type: q.type, stem: q.stem, explanation: q.explanation || "", points: String(q.points), difficulty: q.difficulty || "", subject: q.subject || "", topic: q.topic || "",
  options: (s.options || []).map((o) => ({ text: o.text, correct: !!o.correct, feedback: o.feedback || "" })).concat(s.options ? [] : blank().options), correct: s.correct !== false, accepted: (s.accepted || []).join("\n"), caseSensitive: !!s.caseSensitive,
  value: s.value === undefined || s.value === null ? "" : String(s.value), tolerance: s.tolerance === undefined ? "0" : String(s.tolerance), unit: s.unit || "", pairs: s.pairs ? s.pairs.map((p) => ({ left: p.left, right: p.right })) : blank().pairs,
  items: (s.items || []).map((i) => i.text).join("\n"), partialCredit: !!s.partialCredit, maxWords: s.maxWords ? String(s.maxWords) : "" }; };

function buildBody(d, courseId) {
  const pts = Number(d.points);
  if (!d.stem.trim()) return { error: "Write the question." };
  if (!Number.isFinite(pts) || pts <= 0) return { error: "Points must be a number above 0." };
  const b = { type: d.type, stem: d.stem, explanation: d.explanation, points: pts, subject: d.subject, topic: d.topic };
  if (d.difficulty) b.difficulty = d.difficulty;
  if (!d.id) { b.scope = d.scope; if (d.scope === "course") b.courseId = Number(courseId); }
  if (d.type === "mcq_single" || d.type === "mcq_multi") { b.options = d.options.map((o) => ({ text: o.text, correct: o.correct, feedback: o.feedback })); if (d.type === "mcq_multi") b.partialCredit = d.partialCredit; }
  else if (d.type === "true_false") b.correct = d.correct;
  else if (d.type === "short_answer") { b.accepted = lines(d.accepted); b.caseSensitive = d.caseSensitive; }
  else if (d.type === "numeric") { if (d.value.trim() === "" || !Number.isFinite(Number(d.value))) return { error: "Give the correct number." }; b.value = Number(d.value); b.tolerance = d.tolerance.trim() === "" ? 0 : Number(d.tolerance); b.unit = d.unit; }
  else if (d.type === "matching") { b.pairs = d.pairs.map((p) => ({ left: p.left, right: p.right })); b.partialCredit = d.partialCredit; }
  else if (d.type === "ordering") { b.items = lines(d.items); b.partialCredit = d.partialCredit; }
  else if (d.type === "essay") { if (d.maxWords.trim() !== "") b.maxWords = Number(d.maxWords); }
  return { body: b };
}

function Editor({ draft, setDraft, onSave, onCancel, busy, msg, onRestored }) {
  const set = (p) => setDraft((d) => ({ ...d, ...p }));
  const setOpt = (i, p) => set({ options: draft.options.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setPair = (i, p) => set({ pairs: draft.pairs.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const single = draft.type === "mcq_single", t = draft.type;
  return (
    <section aria-label="Question editor" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{draft.id ? "Edit question" : "New question"}</h2>
      <Notice msg={msg} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div><label style={S.label} htmlFor="qb-type">Type</label>
          <select id="qb-type" style={S.input} value={t} onChange={(e) => set({ type: e.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        {!draft.id && <div><label style={S.label} htmlFor="qb-scope">Who can use it</label>
          <select id="qb-scope" style={S.input} value={draft.scope} onChange={(e) => set({ scope: e.target.value })}>{Object.entries(SCOPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>}
        <div><label style={S.label} htmlFor="qb-pts">Points</label><input id="qb-pts" type="number" inputMode="decimal" min="0.25" step="0.25" style={{ ...S.input, width: 90 }} value={draft.points} onChange={(e) => set({ points: e.target.value })} /></div>
        <div><label style={S.label} htmlFor="qb-diff">Difficulty</label>
          <select id="qb-diff" style={S.input} value={draft.difficulty} onChange={(e) => set({ difficulty: e.target.value })}><option value="">Not set</option>{Object.entries(DIFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <label style={S.label} htmlFor="qb-stem">Question</label>
      <textarea id="qb-stem" rows={3} maxLength={4000} style={{ ...S.input, width: "100%" }} value={draft.stem} onChange={(e) => set({ stem: e.target.value })} />
      {(t === "mcq_single" || t === "mcq_multi") && (
        <fieldset style={{ border: 0, padding: 0, margin: "8px 0" }}><legend style={S.label}>Answer options ({single ? "mark the one correct option" : "mark every correct option"})</legend>
          {draft.options.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              <input type={single ? "radio" : "checkbox"} name="qb-correct" aria-label={`Option ${i + 1} is correct`} checked={o.correct}
                onChange={(e) => (single ? set({ options: draft.options.map((x, j) => ({ ...x, correct: j === i })) }) : setOpt(i, { correct: e.target.checked }))} />
              <input aria-label={`Option ${i + 1} text`} style={{ ...S.input, flex: 1, minWidth: 160 }} maxLength={500} value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
              <button type="button" style={S.btn} disabled={draft.options.length <= 2} onClick={() => set({ options: draft.options.filter((_, j) => j !== i) })} aria-label={`Remove option ${i + 1}`}>Remove</button>
            </div>
          ))}
          <button type="button" style={S.btn} disabled={draft.options.length >= 10} onClick={() => set({ options: [...draft.options, { text: "", correct: false, feedback: "" }] })}>Add option</button>
          {t === "mcq_multi" && <label style={{ display: "block", marginTop: 8, fontSize: 14 }}><input type="checkbox" checked={draft.partialCredit} onChange={(e) => set({ partialCredit: e.target.checked })} /> Give partial credit</label>}
        </fieldset>
      )}
      {t === "true_false" && (
        <fieldset style={{ border: 0, padding: 0, margin: "8px 0", fontSize: 14 }}><legend style={S.label}>Correct answer</legend>
          <label><input type="radio" name="qb-tf" checked={draft.correct === true} onChange={() => set({ correct: true })} /> True</label>{" "}
          <label><input type="radio" name="qb-tf" checked={draft.correct === false} onChange={() => set({ correct: false })} /> False</label></fieldset>
      )}
      {t === "short_answer" && (<>
        <label style={S.label} htmlFor="qb-acc">Accepted answers (one per line)</label>
        <textarea id="qb-acc" rows={3} style={{ ...S.input, width: "100%" }} value={draft.accepted} onChange={(e) => set({ accepted: e.target.value })} />
        <label style={{ fontSize: 14 }}><input type="checkbox" checked={draft.caseSensitive} onChange={(e) => set({ caseSensitive: e.target.checked })} /> Capital letters matter</label></>
      )}
      {t === "numeric" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div><label style={S.label} htmlFor="qb-val">Correct number</label><input id="qb-val" inputMode="decimal" style={{ ...S.input, width: 130 }} value={draft.value} onChange={(e) => set({ value: e.target.value })} /></div>
          <div><label style={S.label} htmlFor="qb-tol">Allowed difference (+/-)</label><input id="qb-tol" inputMode="decimal" style={{ ...S.input, width: 130 }} value={draft.tolerance} onChange={(e) => set({ tolerance: e.target.value })} /></div>
          <div><label style={S.label} htmlFor="qb-unit">Unit (optional)</label><input id="qb-unit" maxLength={30} style={{ ...S.input, width: 110 }} value={draft.unit} onChange={(e) => set({ unit: e.target.value })} /></div>
        </div>
      )}
      {t === "matching" && (
        <fieldset style={{ border: 0, padding: 0, margin: "8px 0" }}><legend style={S.label}>Pairs (each left item matches the right item beside it)</legend>
          {draft.pairs.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <input aria-label={`Pair ${i + 1} left`} style={{ ...S.input, flex: 1, minWidth: 120 }} value={p.left} onChange={(e) => setPair(i, { left: e.target.value })} />
              <input aria-label={`Pair ${i + 1} right`} style={{ ...S.input, flex: 1, minWidth: 120 }} value={p.right} onChange={(e) => setPair(i, { right: e.target.value })} />
              <button type="button" style={S.btn} disabled={draft.pairs.length <= 2} onClick={() => set({ pairs: draft.pairs.filter((_, j) => j !== i) })} aria-label={`Remove pair ${i + 1}`}>Remove</button>
            </div>
          ))}
          <button type="button" style={S.btn} disabled={draft.pairs.length >= 10} onClick={() => set({ pairs: [...draft.pairs, { left: "", right: "" }] })}>Add pair</button>
          <label style={{ display: "block", marginTop: 8, fontSize: 14 }}><input type="checkbox" checked={draft.partialCredit} onChange={(e) => set({ partialCredit: e.target.checked })} /> Give partial credit</label>
        </fieldset>
      )}
      {t === "ordering" && (<>
        <label style={S.label} htmlFor="qb-items">Items in the correct order (one per line, 2 to 10)</label>
        <textarea id="qb-items" rows={4} style={{ ...S.input, width: "100%" }} value={draft.items} onChange={(e) => set({ items: e.target.value })} />
        <label style={{ fontSize: 14 }}><input type="checkbox" checked={draft.partialCredit} onChange={(e) => set({ partialCredit: e.target.checked })} /> Give partial credit</label></>
      )}
      {t === "essay" && (<><label style={S.label} htmlFor="qb-mw">Word limit (optional)</label>
        <input id="qb-mw" type="number" inputMode="numeric" min="1" max="10000" style={{ ...S.input, width: 130 }} value={draft.maxWords} onChange={(e) => set({ maxWords: e.target.value })} /></>)}
      <label style={S.label} htmlFor="qb-exp">Explanation shown with the answer (optional)</label>
      <textarea id="qb-exp" rows={2} maxLength={2000} style={{ ...S.input, width: "100%" }} value={draft.explanation} onChange={(e) => set({ explanation: e.target.value })} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div><label style={S.label} htmlFor="qb-sub">Subject (optional)</label><input id="qb-sub" maxLength={100} style={S.input} value={draft.subject} onChange={(e) => set({ subject: e.target.value })} /></div>
        <div><label style={S.label} htmlFor="qb-top">Topic (optional)</label><input id="qb-top" maxLength={100} style={S.input} value={draft.topic} onChange={(e) => set({ topic: e.target.value })} /></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={onSave}>Save question</button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      {draft.id && <QuestionVersions questionId={draft.id} version={draft.version} onRestored={onRestored} />}
    </section>
  );
}

export default function CourseQuestions() {
  const { courseId } = useParams();
  const qzBase = `/lms/courses/${courseId}/quizzes`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ scope: "", type: "", difficulty: "", subject: "" });
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState(null);
  const [draft, setDraft] = useState(null);
  const [emsg, setEmsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState("");

  const load = useCallback(async () => {
    const params = { page, pageSize: PAGE_SIZE }; Object.entries(f).forEach(([k, v]) => { if (v.trim()) params[k] = v.trim(); });
    try { const r = await API.get("/lms/questions", { params }); setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the questions.") }); setState("error"); } }
  }, [f, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, tick]);
  useEffect(() => { // draft quizzes of this course, for "Add to quiz"
    let live = true;
    API.get(qzBase, { params: { page: 1, pageSize: 50 } }).then((r) => { if (live) setQuizzes((r.data.items || []).filter((q) => q.status === "draft")); }).catch(() => { if (live) setQuizzes([]); });
    return () => { live = false; };
  }, [qzBase]);

  const filter = (p) => { setF((x) => ({ ...x, ...p })); setPage(1); };
  const edit = async (id) => {
    setMsg(null);
    try { const r = await API.get(`/lms/questions/${id}`); setEmsg(null); setDraft(fromServer(r.data.question)); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not open the question.") }); }
  };
  const save = async () => {
    const b = buildBody(draft, courseId); if (b.error) { setEmsg({ ok: false, text: b.error }); return; }
    setBusy(true); setEmsg(null);
    try { if (draft.id) await API.put(`/lms/questions/${draft.id}`, b.body); else await API.post("/lms/questions", b.body); setDraft(null); setMsg({ ok: true, text: "Question saved." }); setTick((t) => t + 1); }
    catch (e) { setEmsg({ ok: false, text: errText(e, "Could not save the question. Your entries are still here.") }); }
    setBusy(false);
  };
  const del = async (q) => {
    if (!window.confirm("Delete this question from the bank? Quizzes that already use it are not changed.")) return;
    try { await API.delete(`/lms/questions/${q.id}`); setPicked((p) => p.filter((x) => x !== q.id)); setMsg({ ok: true, text: "Question deleted." }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not delete the question.") }); }
  };
  const copy = async (q) => {
    try { await API.post(`/lms/questions/${q.id}/copy`, { scope: "course", courseId: Number(courseId) }); setMsg({ ok: true, text: "A copy was added to this course's questions." }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not copy the question.") }); }
  };
  const addToQuiz = async () => {
    setBusy(true); setMsg(null);
    try { await API.post(`${qzBase}/${quizId}/questions`, { questionIds: picked }); setMsg({ ok: true, text: `${picked.length} question${picked.length === 1 ? "" : "s"} added to the quiz.` }); setPicked([]); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not add the questions to the quiz.") }); }
    setBusy(false);
  };
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Question bank</h1>
      <p style={S.sub}>Write questions once and reuse them in quizzes. Private questions are visible only to you.</p>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <><Notice msg={msg} /><button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button></>
      ) : draft ? <Editor onRestored={(q) => { setDraft(fromServer(q)); setEmsg({ ok: true, text: "Version restored. It is saved as a new version." }); setTick((t) => t + 1); }} draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} msg={emsg} /> : (
        <>
          <Notice msg={msg} />
          <QuestionCsv courseId={courseId} filters={f} onImported={() => setTick((t) => t + 1)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
            <div><label style={S.label} htmlFor="f-scope">Show</label><select id="f-scope" style={S.input} value={f.scope} onChange={(e) => filter({ scope: e.target.value })}><option value="">All I can use</option><option value="mine">Mine</option>{Object.entries(SCOPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={S.label} htmlFor="f-type">Type</label><select id="f-type" style={S.input} value={f.type} onChange={(e) => filter({ type: e.target.value })}><option value="">All types</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={S.label} htmlFor="f-diff">Difficulty</label><select id="f-diff" style={S.input} value={f.difficulty} onChange={(e) => filter({ difficulty: e.target.value })}><option value="">Any</option>{Object.entries(DIFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={S.label} htmlFor="f-sub">Subject</label><input id="f-sub" style={{ ...S.input, width: 140 }} maxLength={100} value={f.subject} onChange={(e) => filter({ subject: e.target.value })} /></div>
            <button type="button" style={S.btnPrimary} onClick={() => { setEmsg(null); setDraft(blank()); }}>New question</button>
          </div>
          {picked.length > 0 && (
            <div role="group" aria-label="Add to quiz" style={{ ...S.box, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{picked.length} selected</span>
              {quizzes.length === 0 ? <span style={{ fontSize: 13, color: C.muted }}>This course has no draft quiz to add to. Create one under Quizzes.</span> : (<>
                <label style={{ ...S.label, margin: 0 }} htmlFor="qb-quiz">Add to quiz</label>
                <select id="qb-quiz" style={S.input} value={quizId} onChange={(e) => setQuizId(e.target.value)}><option value="">Choose a draft quiz</option>{quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select>
                <button type="button" style={S.btnPrimary} disabled={busy || !quizId} onClick={addToQuiz}>Add selected</button></>)}
              <button type="button" style={S.btn} onClick={() => setPicked([])}>Clear selection</button>
            </div>
          )}
          {data.items.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No questions match. Use "New question" to write the first one.</p> : (
            <ul aria-label="Questions" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.items.map((q) => (
                <li key={q.id} style={S.box}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1, minWidth: 200, fontSize: 14 }}>
                      <input type="checkbox" aria-label={`Select question ${q.id}`} checked={picked.includes(q.id)} onChange={() => toggle(q.id)} />
                      <span>{q.stem}<br /><span style={{ color: C.muted, fontSize: 12 }}>{TYPES[q.type] || q.type} · {q.points} pt{q.difficulty ? ` · ${DIFF[q.difficulty]}` : ""}{q.subject ? ` · ${q.subject}` : ""}{q.topic ? ` · ${q.topic}` : ""} · {SCOPES[q.scope] || q.scope}</span></span>
                    </label>
                    <span style={{ display: "flex", gap: 6 }}>
                      {q.canEdit ? (<>
                        <button type="button" style={S.btn} onClick={() => edit(q.id)} aria-label={`Edit question ${q.id}`}>Edit</button>
                        <button type="button" style={S.btn} onClick={() => del(q)} aria-label={`Delete question ${q.id}`}>Delete</button></>
                      ) : <button type="button" style={S.btn} onClick={() => copy(q)} aria-label={`Copy question ${q.id} to this course`}>Copy to this course</button>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={busy} />
        </>
      )}
    </div>
  );
}
