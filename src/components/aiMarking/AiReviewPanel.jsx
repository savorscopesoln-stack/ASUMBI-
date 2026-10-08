import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateDirectMark, evaluateEdits, errorMessage, highlightSegments } from "./aiReviewHelpers.mjs";

/* =========================================================================
   AiReviewPanel — review AI marking suggestions and turn them into marks (Phase 7)

   Drop-in panel next to AiMarkingPanel on the teacher Marking page.

   WHAT IT DOES
     Lists the teacher's AI suggestions (To review / Needs attention / Could not
     be marked). Opening one shows a marking sheet: the question, the student's
     answer with the AI's evidence highlighted, the scheme, the AI's mark and
     reasoning for each criterion, what the AI thinks is missing, and any flags.
     The teacher can:
        Accept        take the AI's mark (only when it is a whole number)
        Set a mark    choose a whole mark (when the AI's total is fractional) or
                      change individual criterion marks / the overall mark
        Reject        "this suggestion is wrong"      (reason required)
        Mark it myself  rejects it and opens the normal marking page
        Flag scheme   "this question/scheme needs correcting" (reason required)
        New evaluation  supersede it so the answer can be AI-marked again —
                      a NEW paid job; the original charge is not refunded
     Nothing is ever applied automatically. An unreviewed suggestion is just a
     suggestion; it never becomes a mark until a teacher presses a button here.

   SAFETY
     - Student and question text arrive as PLAIN TEXT and are rendered as React
       text nodes only. There is no dangerouslySetInnerHTML anywhere in this file.
     - The server re-checks every mark; this screen only gives early feedback
       (same rules, tested against the server's — see tests/aiReviewHelpers.test.js).
     - The teacher is identified by the login, never by anything sent from here.

   Props
     api         axios-style client with the auth header (api.get(url,{params}), api.post(url,body) -> {data})
     basePath    default "/api/e-assessments/ai-marking"
     assessmentId  optionally restrict the queue to one assessment
     onMarkManually  ({assessmentId, submissionId, questionId, answerId}) => void
                 called when the teacher wants the normal marking page for an answer
     onChanged   () => void   called after any change, so the parent can refresh
                 its dashboard counts (e.g. AiMarkingPanel)
========================================================================= */

const css = `
.air{--air-bg:var(--surface,#fffdf8);--air-card:var(--card,#fff);--air-ink:var(--text,#2a1a1a);--air-mute:var(--text-muted,#7a6a6a);
  --air-line:var(--border,#e6dcd0);--air-maroon:var(--maroon,#7a1f2b);--air-gold:var(--gold,#b8892b);--air-paper:#fffaf0;--air-rule:#ecdcc4;
  --air-warn:#a15c00;--air-bad:#b3261e;--air-ok:#1f6b3a;--air-hit:#ffe9a8;color:var(--air-ink);font-family:inherit}
@media (prefers-color-scheme:dark){.air{--air-bg:var(--surface,#1d1618);--air-card:var(--card,#262022);--air-ink:var(--text,#f3ebe6);--air-mute:var(--text-muted,#b9aaa4);
  --air-line:var(--border,#3b3134);--air-maroon:var(--maroon,#d9747f);--air-gold:var(--gold,#d6a94a);--air-paper:#2b2326;--air-rule:#3a2f33;--air-warn:#e0a24a;--air-bad:#f08a82;--air-ok:#7cc79a;--air-hit:#5b4a14}}
.air *{box-sizing:border-box}
.air-card{background:var(--air-card);border:1px solid var(--air-line);border-radius:10px;padding:16px;margin-bottom:14px}
.air-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--air-mute);margin:0 0 10px}
.air-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.air-tab{border:1px solid var(--air-line);background:transparent;color:inherit;border-radius:999px;padding:6px 14px;font:inherit;cursor:pointer}
.air-tab[aria-selected=true]{background:var(--air-maroon);border-color:var(--air-maroon);color:#fff}
.air-list{list-style:none;margin:0;padding:0}
.air-row{display:flex;gap:10px;align-items:flex-start;padding:9px 4px;border-bottom:1px dashed var(--air-line)}
.air-row button.air-open{flex:1;text-align:left;background:transparent;border:0;color:inherit;font:inherit;cursor:pointer;padding:0}
.air-row button.air-open:focus-visible,.air-btn:focus-visible,.air-tab:focus-visible,.air input:focus-visible,.air textarea:focus-visible{outline:2px solid var(--air-gold);outline-offset:2px}
.air-row.on{background:rgba(184,137,43,.10)}
.air-meta{font-size:12px;color:var(--air-mute)}
.air-score{font-variant-numeric:tabular-nums;font-weight:700;color:var(--air-maroon);white-space:nowrap}
.air-chip{display:inline-block;font-size:11px;border:1px solid var(--air-warn);color:var(--air-warn);border-radius:999px;padding:1px 8px;margin:2px 4px 0 0}
.air-btn{border:0;border-radius:8px;padding:9px 16px;font:inherit;font-weight:600;cursor:pointer;background:var(--air-maroon);color:#fff}
.air-btn.ghost{background:transparent;color:var(--air-maroon);border:1px solid var(--air-maroon)}
.air-btn.quiet{background:transparent;color:var(--air-mute);border:1px solid var(--air-line);font-weight:500}
.air-btn:disabled{opacity:.45;cursor:not-allowed}
.air-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.air-msg{padding:9px 12px;border-radius:8px;font-size:14px;margin:10px 0;border:1px solid var(--air-line)}
.air-msg.bad{border-color:var(--air-bad);color:var(--air-bad)}.air-msg.warn{border-color:var(--air-warn);color:var(--air-warn)}.air-msg.ok{border-color:var(--air-ok);color:var(--air-ok)}
.air-paper{background:var(--air-paper);border:1px solid var(--air-line);border-left:4px solid var(--air-gold);border-radius:6px;padding:14px 16px 14px 20px;
  font-family:Georgia,'Times New Roman',serif;line-height:28px;white-space:pre-wrap;word-wrap:break-word;
  background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,var(--air-rule) 27px,var(--air-rule) 28px)}
.air-paper mark{background:var(--air-hit);color:inherit;border-radius:2px;padding:0 1px}
.air-q{font-family:Georgia,serif;white-space:pre-wrap;margin:0 0 4px}
.air-badge{display:inline-block;background:var(--air-maroon);color:#fff;border-radius:6px;padding:2px 9px;font-size:13px;font-weight:700;margin-left:8px;vertical-align:middle}
.air-crit{border:1px solid var(--air-line);border-radius:8px;padding:12px;margin-bottom:10px;background:var(--air-card)}
.air-crit h4{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.air-crit blockquote{margin:6px 0;padding:4px 10px;border-left:3px solid var(--air-gold);font-family:Georgia,serif;font-size:14px;color:var(--air-ink)}
.air-pts{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--air-mute)}
.air-pts .met{color:var(--air-ok);font-weight:600}
.air-input{width:74px;padding:6px 8px;border:1px solid var(--air-line);border-radius:6px;background:var(--air-card);color:inherit;font:inherit;text-align:right}
.air textarea{width:100%;padding:8px 10px;border:1px solid var(--air-line);border-radius:6px;background:var(--air-card);color:inherit;font:inherit;resize:vertical}
.air-total{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--air-maroon)}
.air-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media (max-width:820px){.air-grid{grid-template-columns:1fr}}
.air-hist{font-size:13px;color:var(--air-mute);margin:6px 0 0;padding-left:18px}
.air-sr{position:absolute;left:-9999px}
`;

const VIEWS = [
  { id: "awaiting", label: "To review" },
  { id: "attention", label: "Needs attention" },
  { id: "failed", label: "Could not be marked" },
];
const ACTION_LABEL = { accept: "Accepted", adjust: "Adjusted", reject: "Rejected", mark_manually: "Sent to manual marking", request_reevaluation: "New evaluation requested", flag_scheme: "Scheme flagged" };
const problemOf = (err) => {
  const d = err && err.response && err.response.data;
  return { code: d && d.code, text: errorMessage(d && d.code, d && d.message) };
};
const num = (n) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));

export default function AiReviewPanel({ api, basePath = "/api/e-assessments/ai-marking", assessmentId = null, onMarkManually, onChanged }) {
  const [view, setView] = useState("awaiting");
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [edits, setEdits] = useState({});
  const [direct, setDirect] = useState("");
  const [remark, setRemark] = useState("");
  const [pending, setPending] = useState(null);            // "reject" | "flag" | "reeval" | null
  const [reasonText, setReasonText] = useState("");
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef([]);
  itemsRef.current = items;
  const qSeq = useRef(0);
  const dSeq = useRef(0);

  const get = useCallback((url, params) => api.get(`${basePath}${url}`, { params }).then((r) => r.data), [api, basePath]);
  const post = useCallback((url, body) => api.post(`${basePath}${url}`, body).then((r) => r.data), [api, basePath]);

  /* ---------------------------- queue ---------------------------- */
  const loadQueue = useCallback(async (reset, after) => {
    const my = ++qSeq.current;
    setLoading(true);
    setError("");
    try {
      const d = await get("/review/queue", { view, assessmentId: assessmentId || undefined, after: after || undefined, limit: 25 });
      if (my !== qSeq.current) return;
      setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
      setCursor(d.nextCursor);
    } catch (err) {
      if (my === qSeq.current) setError("The review list is unavailable right now. Manual marking is not affected.");
    } finally {
      if (my === qSeq.current) setLoading(false);
    }
  }, [get, view, assessmentId]);

  useEffect(() => {
    setItems([]); setCursor(null); setPicked(new Set()); setOpenId(null); setDetail(null); setNotice("");
    loadQueue(true);
  }, [loadQueue]);

  /* ---------------------------- one suggestion ---------------------------- */
  const resetDecision = () => { setEdits({}); setDirect(""); setRemark(""); setPending(null); setReasonText(""); };

  const open = useCallback(async (id, { keepNotice = false } = {}) => {
    const my = ++dSeq.current;
    setOpenId(id); setDetailBusy(true); if (!keepNotice) setNotice(""); resetDecision();
    try {
      const d = await get(`/review/${id}`);
      if (my === dSeq.current) setDetail(d.review);
    } catch (err) {
      if (my === dSeq.current) { setDetail(null); setError(problemOf(err).text); }
    } finally {
      if (my === dSeq.current) setDetailBusy(false);
    }
  }, [get]);

  /** After a change: drop it from the list and move on to the next suggestion. */
  const advance = useCallback((id, message) => {
    setNotice(message);
    setPicked((p) => { const n = new Set(p); n.delete(id); return n; });
    const current = itemsRef.current;
    const idx = current.findIndex((i) => i.id === id);
    const next = idx >= 0 ? current[idx + 1] : null;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (next) open(next.id, { keepNotice: true }); else { setOpenId(null); setDetail(null); }   // keep the confirmation visible
    if (onChanged) onChanged();
  }, [open, onChanged]);

  const run = async (fn) => {
    setBusy(true); setError("");
    try { await fn(); }
    catch (err) {
      const p = problemOf(err);
      setError(p.text);
      // The world changed under us (marked by hand, released, edited...): reload so the blockers are visible.
      if (["ANSWER_ALREADY_MARKED", "SUBMISSION_RELEASED", "ANSWER_CHANGED", "ALREADY_REVIEWED"].includes(p.code) && openId) open(openId);
    } finally { setBusy(false); }
  };

  const ai = detail && detail.ai;
  const max = detail ? detail.question.maxMarks : 0;
  const ev = useMemo(() => (ai ? evaluateEdits(ai.criteria, edits, max) : null), [ai, edits, max]);
  const dm = useMemo(() => evaluateDirectMark(direct, max), [direct, max]);
  const directMismatch = ev && dm.value != null && ev.anyChange && ev.total !== dm.value;
  const segments = useMemo(() => (detail && ai ? highlightSegments(detail.answer.text, ai.criteria.flatMap((c) => c.evidence)) : []), [detail, ai]);

  const canAcceptAsIs = !!(detail && detail.canApprove && ai && ai.suggestedIsWhole && ev && !ev.anyChange && !direct.trim());
  const editsOk = !!(ev && ev.anyChange && ev.valid);
  const directOk = dm.value != null && !dm.problem && !directMismatch;
  const canSave = !!(detail && detail.canApprove && !dm.problem && !(ev && ev.fieldErrors > 0) && ((editsOk && (dm.value == null || directOk)) || (!ev?.anyChange && directOk)));
  const savedMark = directOk ? dm.value : editsOk ? ev.total : null;

  const approve = (body, doneText) => run(async () => {
    const res = await post(`/review/${openId}/approve`, { ...body, remark: remark.trim() || undefined });
    advance(openId, `${doneText || "Saved"}: ${num(res.finalMark)} / ${num(max)}${res.replayed ? " (already saved)" : ""}.`);
  });
  const accept = () => approve({ mode: "accept" }, "Accepted");
  const setWhole = (n) => approve({ mode: "adjust", finalMark: n }, "Mark set");
  const save = () => approve({
    mode: "adjust",
    ...(ev && ev.anyChange ? { criteriaMarks: ev.marks } : {}),
    ...(dm.value != null ? { finalMark: dm.value } : {}),
  }, "Saved your mark");

  const decide = (path, body, message, after) => run(async () => {
    const res = await post(`/review/${openId}/${path}`, body);
    if (after) after(res);
    advance(openId, message);
  });
  const confirmPending = () => {
    const reason = reasonText.trim();
    if (!reason) return;
    if (pending === "reject") decide("reject", { reason }, "Suggestion rejected. Mark the answer yourself when ready.");
    if (pending === "flag") run(async () => { await post(`/review/${openId}/flag-scheme`, { reason }); setNotice("Thanks — the scheme has been flagged for correction. You can still mark this answer."); setPending(null); setReasonText(""); open(openId); });
    if (pending === "reeval") decide("request-reevaluation", { reason }, "New evaluation requested. Select the answer in the AI-assisted marking panel to run it (a new job with its own charge).");
  };
  const markMyself = () => {
    if (!ai) { if (onMarkManually) onMarkManually(detail.manualMarking); return; }      // nothing to reject: just go and mark it
    decide("mark-manually", {}, "Suggestion set aside. Opening the marking page…", (res) => { if (onMarkManually) onMarkManually(res.manualMarking); });
  };

  const bulkAccept = () => run(async () => {
    const res = await post("/review/bulk-accept", { evaluationIds: [...picked] });
    setNotice(`Accepted ${res.accepted}. ${res.notAccepted ? `${res.notAccepted} need${res.notAccepted === 1 ? "s" : ""} individual review or could not be applied.` : ""}`);
    setPicked(new Set()); setOpenId(null); setDetail(null);
    await loadQueue(true);
    if (onChanged) onChanged();
  });
  const togglePick = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulkable = items.filter((i) => i.bulkAcceptable);

  /* ---------------------------- render ---------------------------- */
  return (
    <div className="air">
      <style>{css}</style>

      <section className="air-card" aria-labelledby="air-title">
        <h3 className="air-h" id="air-title">Review AI suggestions</h3>
        <p className="air-meta" style={{ marginTop: 0 }}>
          AI marks are suggestions only. Nothing becomes a mark until you accept or set it here, and you can always mark an answer yourself.
        </p>
        <div className="air-tabs" role="tablist" aria-label="Suggestion lists">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className="air-tab" onClick={() => setView(v.id)}>{v.label}</button>
          ))}
        </div>

        <div aria-live="polite">
          {notice && <div className="air-msg ok" role="status">{notice}</div>}
        </div>
        {error && <div className="air-msg bad" role="alert">{error}</div>}

        {loading && items.length === 0 && <p className="air-meta">Loading…</p>}
        {!loading && items.length === 0 && !error && (
          <p className="air-meta">{view === "awaiting" ? "No AI suggestions are waiting for your review." : view === "attention" ? "Nothing needs special attention." : "Every answer you sent was marked."}</p>
        )}

        {items.length > 0 && (
          <ul className="air-list">
            {items.map((i) => (
              <li key={i.id} className={`air-row${openId === i.id ? " on" : ""}`}>
                {view === "awaiting" && (
                  <input type="checkbox" aria-label={`Select suggestion for ${i.student.name || "student"} for bulk accept`} disabled={!i.bulkAcceptable}
                    checked={picked.has(i.id)} onChange={() => togglePick(i.id)} title={i.bulkAcceptable ? "Select for bulk accept" : "Needs your individual review"} />
                )}
                <button className="air-open" onClick={() => open(i.id)} aria-current={openId === i.id}>
                  <strong>{i.student.name || "Student"}</strong>{i.student.admissionNo ? <span className="air-meta"> · {i.student.admissionNo}</span> : null}
                  <div className="air-meta">{i.assessment.title}{i.assessment.subject ? ` · ${i.assessment.subject}` : ""}</div>
                  <div className="air-meta">{i.questionPreview}</div>
                  {i.failureNote && <div className="air-meta">{i.failureNote}</div>}
                  <div>{i.flags.map((f) => <span key={f} className="air-chip">{f.replace(/_/g, " ")}</span>)}</div>
                </button>
                {i.suggestedTotal != null && <span className="air-score" aria-label={`AI suggests ${num(i.suggestedTotal)} out of ${num(i.maxMarks)}`}>{num(i.suggestedTotal)} / {num(i.maxMarks)}</span>}
              </li>
            ))}
          </ul>
        )}

        {view === "awaiting" && bulkable.length > 0 && (
          <div className="air-bar">
            <button className="air-btn" disabled={busy || picked.size === 0} onClick={bulkAccept}>Accept {picked.size || ""} selected</button>
            <button className="air-btn quiet" onClick={() => setPicked(new Set(bulkable.map((i) => i.id)))}>Select all clean ones on this page</button>
            <span className="air-meta">Only clean suggestions (no flags, whole-number mark) can be accepted in bulk. Everything else you review one by one.</span>
          </div>
        )}
        {cursor && <div className="air-bar"><button className="air-btn ghost" disabled={loading} onClick={() => loadQueue(false, cursor)}>Load more</button></div>}
      </section>

      {detailBusy && <section className="air-card"><p className="air-meta">Loading…</p></section>}

      {detail && !detailBusy && (
        <section className="air-card" aria-label="Marking sheet">
          <h3 className="air-h">{detail.assessment.title}{detail.assessment.subject ? ` · ${detail.assessment.subject}` : ""} · {detail.student.name || "Student"}{detail.student.admissionNo ? ` (${detail.student.admissionNo})` : ""}</h3>

          <p className="air-q"><strong>Question</strong><span className="air-badge">{num(max)} marks</span></p>
          <div className="air-q">{detail.question.text}</div>
          {detail.question.hasImage && <div className="air-msg warn">The question contains an image that is not shown here.</div>}

          {detail.blockers.length > 0 && (
            <div className="air-msg warn" role="status">
              {detail.blockers.map((b) => <div key={b}>{errorMessage(b)}</div>)}
            </div>
          )}
          {detail.evaluation.failureNote && <div className="air-msg warn">{detail.evaluation.failureNote}</div>}

          <div className="air-grid">
            <div>
              <h4 className="air-h">Student's answer</h4>
              <div className="air-paper" tabIndex={0} aria-label="Student's answer. Passages the AI used as evidence are highlighted.">
                {segments.length ? segments.map((s, k) => (s.hit ? <mark key={k}>{s.text}</mark> : <span key={k}>{s.text}</span>)) : detail.answer.text || "(no text)"}
              </div>
              {detail.answer.note && <div className="air-msg warn">{detail.answer.note}</div>}
            </div>

            <div>
              {ai ? (
                <>
                  <h4 className="air-h">AI evaluation <span style={{ textTransform: "none", letterSpacing: 0 }}>· {detail.evaluation.model || "model"}</span></h4>
                  <p style={{ margin: "0 0 8px" }}>AI suggests <span className="air-total">{num(ai.suggestedTotal)} / {num(max)}</span></p>
                  {ai.flags.length > 0 && (
                    <div className="air-msg warn" role="note">
                      <strong>Look closely at this one:</strong>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{ai.flags.map((f) => <li key={f.code}>{f.text || f.code.replace(/_/g, " ")}</li>)}</ul>
                    </div>
                  )}
                  {detail.scheme.flaggedByPeople > 0 && <div className="air-msg warn">{detail.scheme.flaggedByPeople} teacher{detail.scheme.flaggedByPeople === 1 ? " has" : "s have"} flagged this question's marking scheme for correction.</div>}

                  {ai.criteria.map((c) => {
                    const typed = edits[c.criterionId] ?? "";
                    return (
                      <div className="air-crit" key={c.criterionId}>
                        <h4>
                          <span>{c.label}</span>
                          <span>
                            <label className="air-meta" htmlFor={`m-${c.criterionId}`}>AI {num(c.aiMarks)} / {num(c.maxMarks)} · your mark </label>
                            <input id={`m-${c.criterionId}`} className="air-input" inputMode="decimal" value={typed} placeholder={num(c.aiMarks)} disabled={!detail.canApprove || busy}
                              onChange={(e) => setEdits((p) => ({ ...p, [c.criterionId]: e.target.value }))} aria-label={`Your mark for ${c.label}, out of ${c.maxMarks}`} />
                          </span>
                        </h4>
                        <div>{c.explanation}</div>
                        {c.evidence.map((q, k) => <blockquote key={k}>{q}</blockquote>)}
                        {c.expectedPoints.length > 0 && (
                          <ul className="air-pts">
                            {c.expectedPoints.map((p, k) => <li key={k} className={c.matchedPoints.includes(k) ? "met" : ""}>{c.matchedPoints.includes(k) ? "✓ " : "○ "}{p}</li>)}
                          </ul>
                        )}
                        {c.acceptableAlternatives.length > 0 && <div className="air-meta">Also accepted: {c.acceptableAlternatives.join("; ")}</div>}
                      </div>
                    );
                  })}
                  {ai.missingPoints.length > 0 && (
                    <div className="air-crit"><strong>The AI found these missing or weak</strong><ul className="air-pts">{ai.missingPoints.map((m, k) => <li key={k}>{m}</li>)}</ul></div>
                  )}
                </>
              ) : (
                <div className="air-msg warn">There is no AI suggestion for this answer. Mark it yourself on the marking page; nothing was charged.</div>
              )}
            </div>
          </div>

          {ai && detail.canApprove && (
            <div style={{ marginTop: 14 }}>
              <h4 className="air-h">Your decision</h4>
              <p style={{ margin: "0 0 8px" }}>
                Your mark: <span className="air-total">{savedMark != null ? num(savedMark) : ev && !ev.anyChange && ai.suggestedIsWhole ? num(ai.suggestedTotal) : "—"} / {num(max)}</span>
                {ev && ev.anyChange && <span className="air-meta"> (criteria add up to {num(ev.total)})</span>}
              </p>
              {ev && ev.touched && ev.problems.map((p) => <div key={p} className="air-msg bad" role="alert">{p}</div>)}
              {dm.problem && <div className="air-msg bad" role="alert">{dm.problem}</div>}
              {directMismatch && <div className="air-msg bad" role="alert">The criterion marks add up to {num(ev.total)}, which is not the overall mark you typed.</div>}

              {!ai.suggestedIsWhole && !(ev && ev.anyChange) && (
                <div className="air-msg warn" role="status">
                  The AI's total ({num(ai.suggestedTotal)}) is not a whole number, and official marks must be whole numbers. Choose which whole mark to give:
                  <div className="air-bar">
                    {ai.wholeOptions.map((n) => <button key={n} className="air-btn" disabled={busy} onClick={() => setWhole(n)}>Give {n} / {num(max)}</button>)}
                  </div>
                </div>
              )}

              <div className="air-bar">
                <label htmlFor="air-direct" className="air-meta">Or type an overall whole mark:</label>
                <input id="air-direct" className="air-input" inputMode="numeric" value={direct} onChange={(e) => setDirect(e.target.value)} disabled={busy} aria-label={`Overall mark out of ${max}`} />
              </div>
              <div style={{ marginTop: 10 }}>
                <label htmlFor="air-remark" className="air-meta">Remark saved with the mark (optional)</label>
                <textarea id="air-remark" rows={2} maxLength={2000} value={remark} onChange={(e) => setRemark(e.target.value)} disabled={busy} />
              </div>
              <div className="air-bar">
                <button className="air-btn" disabled={busy || !canAcceptAsIs} onClick={accept} title={canAcceptAsIs ? "Use the AI's mark as the final mark" : "Available when the AI's total is a whole number and you have not changed anything"}>Accept {ai.suggestedIsWhole ? `${num(ai.suggestedTotal)} / ${num(max)}` : "AI mark"}</button>
                <button className="air-btn ghost" disabled={busy || !canSave} onClick={save}>Save my mark{savedMark != null ? ` (${num(savedMark)})` : ""}</button>
              </div>
            </div>
          )}

          <div className="air-bar" style={{ borderTop: "1px dashed var(--air-line)", paddingTop: 12 }}>
            <button className="air-btn quiet" disabled={busy} onClick={markMyself}>{ai ? "Reject & mark it myself" : "Mark it myself"}</button>
            {ai && <button className="air-btn quiet" disabled={busy || !detail.canApprove} onClick={() => { setPending("reject"); setReasonText(""); }}>Reject suggestion…</button>}
            {ai && <button className="air-btn quiet" disabled={busy} onClick={() => { setPending("flag"); setReasonText(""); }}>Flag question / scheme…</button>}
            {ai && <button className="air-btn quiet" disabled={busy || !detail.canApprove} onClick={() => { setPending("reeval"); setReasonText(""); }}>Request a new evaluation…</button>}
          </div>

          {pending && (
            <div className="air-msg" role="group" aria-label="Reason">
              <strong>{pending === "reject" ? "Reject this suggestion" : pending === "flag" ? "Flag the question or marking scheme for correction" : "Request a new AI evaluation"}</strong>
              {pending === "reeval" && <p className="air-meta">This cancels the current suggestion so the answer can be AI-marked again. That is a <strong>new paid job</strong> (you will see the quote first); the original charge is not refunded. Only do this when the AI clearly misjudged the answer.</p>}
              <label htmlFor="air-reason" className="air-meta">Reason (required, kept in the audit log)</label>
              <textarea id="air-reason" rows={2} maxLength={500} value={reasonText} onChange={(e) => setReasonText(e.target.value)} autoFocus />
              <div className="air-bar">
                <button className="air-btn" disabled={busy || !reasonText.trim()} onClick={confirmPending}>Confirm</button>
                <button className="air-btn quiet" onClick={() => { setPending(null); setReasonText(""); }}>Cancel</button>
              </div>
            </div>
          )}

          {detail.history.length > 0 && (
            <>
              <h4 className="air-h" style={{ marginTop: 14 }}>History</h4>
              <ul className="air-hist">
                {detail.history.map((h) => <li key={h.id}>{ACTION_LABEL[h.action] || h.action}{h.finalMark != null ? ` — ${num(h.finalMark)}` : ""} by {h.by}{h.reason ? ` — “${h.reason}”` : ""}</li>)}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
