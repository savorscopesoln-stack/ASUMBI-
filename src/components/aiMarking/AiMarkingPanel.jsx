import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =========================================================================
   AiMarkingPanel — teacher marking dashboard, AI cost preview (Phase 3) and
   confirm / progress / cancel (Phase 4)

   Drop-in panel for the top of the existing Marking page. Previewing is
   read-only. "Confirm and reserve" (Phase 4) is the only thing here that
   moves credit, and it:
     - needs an explicit tick-box acknowledgement of the exact amount,
     - sends only the selection + the quote fingerprint + ONE idempotency key
       per preview (never a count or a price — the server recomputes both),
     - is safe to retry: the same key resumes/replays and cannot double-charge.
   Starting a job is switched off server-side until AI_MARKING_JOBS_ENABLED is
   true (the dashboard reports it as aiProcessingEnabled); until then the
   button explains that instead of failing.

   Props
     api         axios-style client already configured with the auth header:
                 api.get(url, { params }) and api.post(url, body), each
                 resolving to { data }. (Pass the same instance the rest of
                 the app uses.)
     basePath    default "/api/e-assessments/ai-marking"
     assessmentId  optionally lock the panel to one assessment
     studentLabel  (studentId) => string, to show names; falls back to "Student #id"
     children    the EXISTING manual-marking UI. Rendered unchanged when
                 "Manual Marking — Free" is selected, which is the default.

   Theme: uses CSS variables if the app defines them, otherwise the Doravo
   maroon/gold defaults. Variable names below are placeholders — map them to
   the real tokens used by StudentProfile/Marking.
========================================================================= */

const css = `
.aim{--aim-bg:var(--surface,#fffdf8);--aim-card:var(--card,#fff);--aim-ink:var(--text,#2a1a1a);--aim-mute:var(--text-muted,#7a6a6a);
  --aim-line:var(--border,#e6dcd0);--aim-maroon:var(--maroon,#7a1f2b);--aim-gold:var(--gold,#b8892b);--aim-warn:#a15c00;--aim-bad:#b3261e;--aim-ok:#1f6b3a;
  color:var(--aim-ink);font-family:inherit}
@media (prefers-color-scheme:dark){.aim{--aim-bg:var(--surface,#1d1618);--aim-card:var(--card,#262022);--aim-ink:var(--text,#f3ebe6);--aim-mute:var(--text-muted,#b9aaa4);--aim-line:var(--border,#3b3134);--aim-gold:var(--gold,#d9a94a);--aim-warn:#e0a550;--aim-bad:#ff8a80;--aim-ok:#7ad39a}}
.aim *{box-sizing:border-box}
.aim-card{background:var(--aim-card);border:1px solid var(--aim-line);border-radius:10px;padding:16px;margin-bottom:14px}
.aim-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--aim-mute);margin:0 0 10px}
.aim-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.aim-tile{border:1px solid var(--aim-line);border-radius:8px;padding:10px 12px;background:var(--aim-bg)}
.aim-tile b{display:block;font-size:22px;line-height:1.2}
.aim-tile span{font-size:12px;color:var(--aim-mute)}
.aim-tile.attn b{color:var(--aim-warn)}
.aim-tile.gold{border-color:var(--aim-gold)}
.aim-seg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:560px){.aim-seg{grid-template-columns:1fr}}
.aim-opt{text-align:left;border:2px solid var(--aim-line);border-radius:10px;padding:12px 14px;background:var(--aim-card);color:inherit;cursor:pointer;font:inherit}
.aim-opt[aria-pressed=true]{border-color:var(--aim-maroon);box-shadow:inset 0 0 0 1px var(--aim-maroon)}
.aim-opt strong{display:block}.aim-opt small{color:var(--aim-mute)}
.aim-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px}
.aim select,.aim input[type=text]{padding:7px 9px;border:1px solid var(--aim-line);border-radius:6px;background:var(--aim-card);color:inherit;font:inherit;max-width:100%}
.aim-list{max-height:200px;overflow:auto;border:1px solid var(--aim-line);border-radius:8px;padding:6px 10px}
.aim-list label{display:flex;gap:8px;padding:4px 0;font-size:14px;align-items:flex-start}
.aim-btn{border:0;border-radius:8px;padding:9px 16px;font:inherit;font-weight:600;cursor:pointer;background:var(--aim-maroon);color:#fff}
.aim-btn.ghost{background:transparent;color:var(--aim-maroon);border:1px solid var(--aim-maroon)}
.aim-btn:disabled{opacity:.5;cursor:not-allowed}
.aim table{width:100%;border-collapse:collapse;font-size:14px}
.aim td{padding:5px 0;border-bottom:1px dashed var(--aim-line)}
.aim td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.aim-total td{font-weight:700;border-bottom:0;color:var(--aim-maroon)}
.aim-msg{padding:9px 12px;border-radius:8px;font-size:14px;margin-top:10px;border:1px solid var(--aim-line)}
.aim-msg.bad{border-color:var(--aim-bad);color:var(--aim-bad)}.aim-msg.warn{border-color:var(--aim-warn);color:var(--aim-warn)}
.aim-mute{color:var(--aim-mute);font-size:13px}
`;

const SCOPES = [
  { id: "assessment", label: "Entire assessment" },
  { id: "subject", label: "A subject / paper" },
  { id: "questions", label: "Selected questions" },
  { id: "students", label: "Selected students" },
  { id: "all", label: "All currently eligible" },
];

const BLOCKER_TEXT = {
  NO_PRICE: "AI marking has no price configured yet. Ask Doravo Finance to set one.",
  INSTITUTION_WALLET_DISABLED: "AI marking is not enabled for your institution's wallet.",
  NOTHING_ELIGIBLE: "Nothing in this selection can be AI-marked right now.",
  INSUFFICIENT_CREDITS: "Your institution's AI marking balance is too low for this selection.",
  CURRENCY_MISMATCH: "The AI marking price and wallet use different currencies. Ask Doravo Finance to fix this.",
  TOO_MANY_ANSWERS: "This selection is larger than one AI marking job allows. Narrow it (for example by question or subject).",
};

const STATUS_TEXT = {
  pending: "Starting…", reserved: "Credit reserved — waiting to start", processing: "Marking…",
  completed: "Completed", failed: "Failed — nothing charged", cancelled: "Cancelled",
};

// One key per preview: retries of the SAME confirmation reuse it (so they can never charge twice).
const newKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}${"0".repeat(16)}`).slice(0, 64);

const money = (n, cur) => (n == null ? "—" : `${cur || ""} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim());
const int = (n) => Number(n || 0).toLocaleString();
// Rough, human wording for a measured estimate ("about 3 min"). Never shown unless the server has real data.
const duration = (secs) => {
  const s = Math.max(1, Math.round(Number(secs)));
  if (s < 90) return `about ${s} sec`;
  if (s < 5400) return `about ${Math.round(s / 60)} min`;
  return `about ${(s / 3600).toFixed(1)} hours`;
};

export default function AiMarkingPanel({
  api, basePath = "/api/e-assessments/ai-marking", assessmentId = null,
  studentLabel = (id) => `Student #${id}`, children,
}) {
  const [method, setMethod] = useState("manual");           // manual is the default and never depends on AI
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(assessmentId ? String(assessmentId) : "");
  const [subject, setSubject] = useState("");
  const [scope, setScope] = useState("assessment");
  const [options, setOptions] = useState({ questions: [], submissions: [] });
  const [qIds, setQIds] = useState([]);
  const [sIds, setSIds] = useState([]);
  const [dash, setDash] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);                                   // drops stale responses
  const idemKey = useRef(null);                            // one per preview
  const [ack, setAck] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [jobs, setJobs] = useState([]);

  const get = useCallback((url, params) => api.get(`${basePath}${url}`, { params }).then((r) => r.data), [api, basePath]);

  // dashboard + assessment list (failures here must not disturb manual marking)
  useEffect(() => {
    let live = true;
    const my = ++seq.current;
    setError("");
    get("/dashboard", { eAssessmentId: selected || undefined })
      .then((d) => { if (live && my === seq.current) setDash(d); })
      .catch(() => { if (live) { setDash(null); setError("AI marking information is unavailable. Manual marking is not affected."); } });
    get("/selectable", { eAssessmentId: selected || undefined })
      .then((d) => { if (!live) return; setAssessments(d.assessments || []); setOptions({ questions: d.questions || [], submissions: d.submissions || [] }); })
      .catch(() => {});
    return () => { live = false; };
  }, [get, selected]);

  const loadJobs = useCallback(() => get("/jobs").then((d) => setJobs(d.jobs || [])).catch(() => {}), [get]);
  useEffect(() => { if (method === "ai") loadJobs(); }, [method, loadJobs]);
  // keep progress fresh while anything is still running
  useEffect(() => {
    if (method !== "ai" || !jobs.some((j) => ["pending", "reserved", "processing"].includes(j.status))) return undefined;
    const t = setInterval(loadJobs, 8000);
    return () => clearInterval(t);
  }, [method, jobs, loadJobs]);

  // any change to the selection invalidates the previous quote (and its idempotency key)
  useEffect(() => { setPreview(null); setConfirming(false); setAck(false); idemKey.current = null; }, [selected, subject, scope, qIds, sIds]);

  const subjects = useMemo(() => [...new Set(assessments.map((a) => a.subject).filter(Boolean))], [assessments]);

  const buildSelection = () => {
    const sel = {};
    if (scope !== "all" && selected) sel.eAssessmentId = Number(selected);
    if (scope === "subject" && subject) sel.subject = subject;
    if (scope === "questions") sel.questionIds = qIds;
    if (scope === "students") sel.studentIds = sIds;
    return sel;
  };

  const needsMore =
    (scope === "assessment" && !selected) || (scope === "subject" && !subject) ||
    (scope === "questions" && (!selected || qIds.length === 0)) || (scope === "students" && (!selected || sIds.length === 0));

  const runPreview = async () => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`${basePath}/preview`, buildSelection());
      setPreview(data.preview);
      idemKey.current = newKey();
      setConfirming(false); setAck(false); setNotice("");
    } catch (e) {
      setError(e?.response?.data?.message || "Could not build the preview.");
    } finally { setBusy(false); }
  };

  const confirmJob = async () => {
    if (!preview || !ack || confirming) return;
    setConfirming(true); setError(""); setNotice("");
    try {
      const { data } = await api.post(`${basePath}/jobs`, {
        ...buildSelection(), quoteFingerprint: preview.quoteFingerprint, idempotencyKey: idemKey.current, confirm: true,
      });
      setNotice(data.replayed ? "This request was already submitted — no second charge was made." : "Credit reserved. AI marking will start shortly; you review every suggestion before it counts.");
      setPreview(null); setAck(false); idemKey.current = null;
      loadJobs();
      get("/dashboard", { eAssessmentId: selected || undefined }).then(setDash).catch(() => {});
    } catch (e) {
      const d = e?.response?.data || {};
      if (d.code === "QUOTE_CHANGED" || d.code === "SELECTION_CONFLICT") {
        setPreview(null); idemKey.current = null;     // old quote is dead; a fresh preview gets a fresh key
        setError(d.code === "QUOTE_CHANGED" && d.details
          ? `The count or price changed: now ${int(d.details.billable)} answers, total ${money(d.details.total, d.details.currency)}. Preview again to review.`
          : d.message);
      } else if (d.code === "RESERVATION_UNCERTAIN") {
        setError(d.message);                          // keep the key: pressing confirm again resumes safely
      } else {
        setError(d.message || "Could not start AI marking. You have not been charged.");
      }
    } finally { setConfirming(false); }
  };

  const cancelJob = async (id) => {
    if (!window.confirm("Cancel this AI marking job? Answers not yet marked are not charged and their credit is returned.")) return;
    try { await api.post(`${basePath}/jobs/${id}/cancel`); loadJobs(); get("/dashboard", { eAssessmentId: selected || undefined }).then(setDash).catch(() => {}); }
    catch (e) { setError(e?.response?.data?.message || "Could not cancel the job."); }
  };

  const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const c = dash?.counts, w = dash?.wallet;

  return (
    <div className="aim">
      <style>{css}</style>

      <div className="aim-card">
        <p className="aim-h">Marking overview{selected ? "" : " — all your assessments"}</p>
        <div className="aim-row">
          <select aria-label="Assessment" value={selected} onChange={(e) => { setSelected(e.target.value); setQIds([]); setSIds([]); }} disabled={!!assessmentId}>
            <option value="">All my assessments</option>
            {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}{a.subject ? ` — ${a.subject}` : ""}</option>)}
          </select>
        </div>
        {c ? (
          <div className="aim-tiles">
            <div className="aim-tile"><b>{int(c.totalAnswers)}</b><span>Essay answers submitted</span></div>
            <div className="aim-tile"><b>{int(c.manuallyMarked)}</b><span>Manually marked</span></div>
            <div className="aim-tile gold"><b>{int(c.aiAwaitingReview)}</b><span>AI-marked, awaiting your review</span></div>
            <div className="aim-tile"><b>{int(c.approvedAi)}</b><span>AI suggestions approved</span></div>
            <div className="aim-tile"><b>{int(c.unmarked)}</b><span>Unmarked</span></div>
            <div className="aim-tile attn"><b>{int(c.needsAttention)}</b><span>Need extra attention</span></div>
            <div className="aim-tile gold"><b>{w?.aiMarkingEnabled ? money(w.available, w.currency) : "—"}</b><span>{w?.aiMarkingEnabled ? "AI marking credit available" : "AI marking not enabled"}</span></div>
          </div>
        ) : <p className="aim-mute">{error || "Loading…"}</p>}
        {c && c.blank > 0 && <p className="aim-mute">{int(c.blank)} blank response(s) are never billed.</p>}
      </div>

      <div className="aim-card">
        <p className="aim-h">Marking method</p>
        <div className="aim-seg" role="group" aria-label="Marking method">
          <button type="button" className="aim-opt" aria-pressed={method === "manual"} onClick={() => setMethod("manual")}>
            <strong>Manual marking — Free</strong><small>Mark answers yourself. Always available.</small>
          </button>
          <button type="button" className="aim-opt" aria-pressed={method === "ai"} onClick={() => setMethod("ai")}>
            <strong>AI-assisted marking — Paid</strong><small>AI suggests marks; you review and approve every one.</small>
          </button>
        </div>
      </div>

      {method === "manual" && children}

      {method === "ai" && (
        <div className="aim-card">
          <p className="aim-h">Choose what to mark with AI</p>
          <div className="aim-row">
            {SCOPES.map((s) => (
              <label key={s.id}><input type="radio" name="aim-scope" checked={scope === s.id} onChange={() => setScope(s.id)} /> {s.label}</label>
            ))}
          </div>

          {scope === "assessment" && !selected && <p className="aim-mute">Pick an assessment above.</p>}
          {scope === "subject" && (
            <div className="aim-row">
              <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">Select subject…</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {scope === "questions" && (!selected ? <p className="aim-mute">Pick an assessment above first.</p> : (
            <div className="aim-list">
              {options.questions.length === 0 && <span className="aim-mute">No essay questions found.</span>}
              {options.questions.map((q) => (
                <label key={q.id}>
                  <input type="checkbox" checked={qIds.includes(q.id)} onChange={() => toggle(qIds, setQIds, q.id)} />
                  <span>Q{q.id} ({q.marks} marks) — {q.question_text}{!q.has_scheme && <em className="aim-mute"> · no approved marking scheme yet</em>}</span>
                </label>
              ))}
            </div>
          ))}
          {scope === "students" && (!selected ? <p className="aim-mute">Pick an assessment above first.</p> : (
            <div className="aim-list">
              {options.submissions.map((s) => (
                <label key={s.submission_id}>
                  <input type="checkbox" checked={sIds.includes(s.student_id)} onChange={() => toggle(sIds, setSIds, s.student_id)} />
                  <span>{studentLabel(s.student_id)} <em className="aim-mute">({s.status})</em></span>
                </label>
              ))}
            </div>
          ))}

          <div className="aim-row" style={{ marginTop: 12 }}>
            <button type="button" className="aim-btn ghost" onClick={runPreview} disabled={busy || needsMore}>{busy ? "Calculating…" : "Preview cost"}</button>
            <span className="aim-mute">Previewing is free. Nothing is reserved or charged.</span>
          </div>

          {error && <div className="aim-msg bad" role="alert">{error}</div>}

          {preview && (
            <div style={{ marginTop: 12 }}>
              <table>
                <tbody>
                  <tr><td>Answers in your selection</td><td>{int(preview.counts.selectedAnswers)}</td></tr>
                  {preview.counts.blank > 0 && <tr><td className="aim-mute">Blank — not billed</td><td>{int(preview.counts.blank)}</td></tr>}
                  {preview.counts.alreadyMarked > 0 && <tr><td className="aim-mute">Already marked — not billed</td><td>{int(preview.counts.alreadyMarked)}</td></tr>}
                  {preview.counts.released > 0 && <tr><td className="aim-mute">Results released — not billed</td><td>{int(preview.counts.released)}</td></tr>}
                  {preview.counts.alreadyEvaluated > 0 && <tr><td className="aim-mute">Already AI-evaluated — not billed again</td><td>{int(preview.counts.alreadyEvaluated)}</td></tr>}
                  {preview.counts.needsScheme > 0 && <tr><td className="aim-mute">Waiting for an approved marking scheme</td><td>{int(preview.counts.needsScheme)}</td></tr>}
                  <tr><td><strong>Answers AI can mark</strong></td><td><strong>{int(preview.counts.billable)}</strong></td></tr>
                  {preview.quote && <tr><td>Price per answer{preview.quote.appliedTier ? " (volume rate)" : ""}</td><td>{money(preview.quote.unitPrice, preview.quote.currency)}</td></tr>}
                  {preview.quote && <tr className="aim-total"><td>Total if you proceed</td><td>{money(preview.quote.total, preview.quote.currency)}</td></tr>}
                  <tr><td>Available AI marking credit</td><td>{money(preview.wallet.available, preview.wallet.currency)}</td></tr>
                  {preview.quote && <tr><td>Credit left after reserving</td><td>{money(preview.wallet.remainingAfterReservation, preview.wallet.currency)}</td></tr>}
                  {preview.estimatedSeconds != null && <tr><td>Estimated processing time</td><td>{duration(preview.estimatedSeconds)}</td></tr>}
                </tbody>
              </table>
              <p className="aim-mute">You are only charged for answers the AI processes successfully; unused credit is released. Estimated time is shown once Doravo has measured real processing speed.</p>
              {preview.blockers.map((b) => <div key={b} className={`aim-msg ${b === "NOTHING_ELIGIBLE" ? "warn" : "bad"}`}>{BLOCKER_TEXT[b] || b}</div>)}
              <div className="aim-card" style={{ marginTop: 12, marginBottom: 0 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={!preview.canProceed || !dash?.aiProcessingEnabled || confirming} />
                  <span>
                    I understand that <strong>{money(preview.quote?.total, preview.quote?.currency)}</strong> will be reserved now for{" "}
                    <strong>{int(preview.counts.billable)}</strong> answers, that I am charged only for answers the AI processes successfully, and that I must review every suggestion before it counts.
                  </span>
                </label>
                <div className="aim-row" style={{ marginTop: 10, marginBottom: 0 }}>
                  <button type="button" className="aim-btn" disabled={!preview.canProceed || !dash?.aiProcessingEnabled || !ack || confirming} onClick={confirmJob}>
                    {confirming ? "Reserving…" : "Confirm and reserve credit"}
                  </button>
                  {dash && !dash.aiProcessingEnabled && <span className="aim-mute">Starting AI marking is not enabled yet. Manual marking is unaffected.</span>}
                </div>
              </div>
            </div>
          )}

          {notice && <div className="aim-msg" role="status">{notice}</div>}

          {jobs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="aim-h">My AI marking jobs</p>
              <table>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td>
                        Job #{j.id} — {STATUS_TEXT[j.status] || j.status}
                        <div className="aim-mute">
                          {int(j.progress.processed)} of {int(j.progress.eligible)} marked
                          {j.progress.failed > 0 && ` · ${int(j.progress.failed)} failed (not charged)`}
                          {j.progress.cancelled > 0 && ` · ${int(j.progress.cancelled)} cancelled (not charged)`}
                          {" · "}{["completed", "failed", "cancelled"].includes(j.status) ? `charged ${money(j.quote.actualTotal, j.quote.currency)}` : `reserved ${money(j.quote.quotedTotal, j.quote.currency)}`}
                        </div>
                        {j.paused && !["completed", "failed", "cancelled"].includes(j.status) && (
                          <div className="aim-mute" role="status">
                            Marking is paused because the AI service is temporarily unavailable. Nothing is lost or charged for the pause — it resumes by itself.
                            You can cancel for a full refund of unused credit, or mark these answers yourself at any time.
                          </div>
                        )}
                      </td>
                      <td>
                        {["pending", "reserved", "processing"].includes(j.status) && (
                          <button type="button" className="aim-btn ghost" onClick={() => cancelJob(j.id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
