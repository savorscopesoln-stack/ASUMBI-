import { useCallback, useEffect, useMemo, useState } from "react";

/* =========================================================================
   AiSchemePanel — marking schemes for AI marking (Phase 8)

   Drop-in panel for the teacher Marking page, next to AiMarkingPanel.

   WHAT IT DOES
     Shows, for one assessment, which essay questions are ready for AI marking.
     A question is ready once a teacher has approved a SCHEME: the marking guide
     broken into criteria with marks, the points that earn them and acceptable
     alternatives. Opening a question lets the teacher
       - start from the old free-text guide ("Draft from the guide" — a first
         draft only; it never makes up marks),
       - edit criteria, then "Check" for problems (free, saves nothing),
       - "Save draft", and finally "Approve".
     Errors must be fixed before approval. Warnings must each be ticked
     ("I have read this") before the Approve button works. Approved schemes are
     never edited; a change is a new version with a reason, and the old one is kept.
     An optional "Ask AI for suggestions" button appears only if the server has it
     switched on. It gives advice as text; nothing is applied.

   SAFETY
     - All text (question, guide, criteria, findings) is rendered as React text
       nodes. There is no dangerouslySetInnerHTML anywhere in this file.
     - The server decides everything (marks, errors, who may approve). This screen
       sends criteria and reads back findings; it does not repeat the rules.
     - The teacher is identified by the login, never by anything sent from here.

   Props
     api         axios-style client with the auth header (api.get(url,{params}), api.post(url,body) -> {data})
     basePath    default "/api/e-assessments/ai-marking"
     assessmentId  the assessment to show
     onChanged   () => void   called after an approval, so the parent can refresh
                 its dashboard (AiMarkingPanel's "needs a scheme" counts)
========================================================================= */

const css = `
.ais{--ais-bg:var(--surface,#fffdf8);--ais-card:var(--card,#fff);--ais-ink:var(--text,#2a1a1a);--ais-mute:var(--text-muted,#7a6a6a);
  --ais-line:var(--border,#e6dcd0);--ais-maroon:var(--maroon,#7a1f2b);--ais-gold:var(--gold,#b8892b);--ais-warn:#a15c00;--ais-bad:#b3261e;--ais-ok:#1f6b3a;color:var(--ais-ink);font-family:inherit}
@media (prefers-color-scheme:dark){.ais{--ais-bg:var(--surface,#1d1618);--ais-card:var(--card,#262022);--ais-ink:var(--text,#f3ebe6);--ais-mute:var(--text-muted,#b9aaa4);--ais-line:var(--border,#3b3134);--ais-maroon:var(--maroon,#d9747f);--ais-gold:var(--gold,#d6a94a);--ais-warn:#e0a24a;--ais-bad:#f08a82;--ais-ok:#7cc79a}}
.ais *{box-sizing:border-box}
.ais-card{background:var(--ais-card);border:1px solid var(--ais-line);border-radius:10px;padding:16px;margin-bottom:14px}
.ais-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ais-mute);margin:0 0 10px}
.ais-list{list-style:none;margin:0;padding:0}
.ais-row{display:flex;gap:10px;align-items:flex-start;padding:9px 4px;border-bottom:1px dashed var(--ais-line)}
.ais-row button.ais-open{flex:1;text-align:left;background:transparent;border:0;color:inherit;font:inherit;cursor:pointer;padding:0}
.ais-badge{font-size:12px;border:1px solid var(--ais-line);border-radius:999px;padding:2px 10px;white-space:nowrap}
.ais-badge.ready{border-color:var(--ais-ok);color:var(--ais-ok)}
.ais-badge.bad{border-color:var(--ais-bad);color:var(--ais-bad)}
.ais-badge.warn{border-color:var(--ais-warn);color:var(--ais-warn)}
.ais-mute{color:var(--ais-mute);font-size:13px}
.ais-crit{border:1px solid var(--ais-line);border-radius:8px;padding:10px;margin-bottom:10px;background:var(--ais-bg)}
.ais-grid{display:grid;grid-template-columns:1fr 110px;gap:8px}
@media (max-width:560px){.ais-grid{grid-template-columns:1fr}}
.ais label{display:block;font-size:12px;color:var(--ais-mute);margin:6px 0 2px}
.ais input[type=text],.ais input[type=number],.ais textarea{width:100%;padding:7px 9px;border:1px solid var(--ais-line);border-radius:6px;background:var(--ais-card);color:inherit;font:inherit}
.ais textarea{min-height:70px;resize:vertical}
.ais-btn{border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;background:var(--ais-maroon);color:#fff;margin:0 8px 8px 0}
.ais-btn.ghost{background:transparent;color:var(--ais-maroon);border:1px solid var(--ais-maroon)}
.ais-btn:disabled{opacity:.5;cursor:not-allowed}
.ais-btn:focus-visible,.ais input:focus-visible,.ais textarea:focus-visible{outline:2px solid var(--ais-gold);outline-offset:2px}
.ais-f{padding:8px 10px;border-left:4px solid var(--ais-line);margin-bottom:6px;font-size:14px;background:var(--ais-bg)}
.ais-f.error{border-color:var(--ais-bad)}.ais-f.warning{border-color:var(--ais-warn)}.ais-f.info{border-color:var(--ais-gold)}
.ais-msg{padding:9px 12px;border-radius:8px;font-size:14px;margin:8px 0;border:1px solid var(--ais-line)}
.ais-msg.bad{border-color:var(--ais-bad);color:var(--ais-bad)}.ais-msg.ok{border-color:var(--ais-ok);color:var(--ais-ok)}
.ais-guide{white-space:pre-wrap;font-size:14px;border:1px dashed var(--ais-line);border-radius:8px;padding:8px 10px;max-height:160px;overflow:auto}
`;

const STATUS = {
  ready: ["Ready", "ready"], review: ["Approved — guide changed, review", "warn"], draft: ["Draft — not approved yet", "warn"],
  no_scheme: ["Needs a scheme", "bad"], no_guide: ["No marking guide", "bad"], stale: ["Marks changed — needs a new scheme", "bad"],
};
const NOTE_TEXT = { IMAGE_DEPENDENT: "has an image the AI cannot see", DIAGRAM_REFERENCED: "refers to a diagram" };
const SEVERITY_LABEL = { error: "Fix before approving", warning: "Read and confirm", info: "Suggestion" };
const lines = (v) => (Array.isArray(v) ? v.join("\n") : String(v ?? ""));
const blankCriterion = (n) => ({ criterionId: `c${n}`, label: "", maxMarks: "", expectedPoints: [], acceptableAlternatives: [] });

export default function AiSchemePanel({ api, basePath = "/api/e-assessments/ai-marking", assessmentId, onChanged }) {
  const [list, setList] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [state, setState] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [note, setNote] = useState("");
  const [findings, setFindings] = useState([]);
  const [acked, setAcked] = useState({});
  const [suggestions, setSuggestions] = useState(null);
  const [msg, setMsg] = useState(null);       // { kind: "ok"|"bad", text }
  const [busy, setBusy] = useState(false);

  const fail = (e) => setMsg({ kind: "bad", text: e?.response?.data?.message || "Something went wrong. Nothing was changed." });
  const base = `${basePath}/scheme`;

  const loadList = useCallback(async () => {
    try {
      const { data } = await api.get(`${base}/readiness`, { params: { assessmentId } });
      setList(data);
    } catch (e) { setList({ questions: [], summary: null, error: true }); }
  }, [api, base, assessmentId]);
  useEffect(() => { if (assessmentId) loadList(); }, [assessmentId, loadList]);

  const adopt = useCallback((st) => {
    setState(st);
    const source = st.draft || st.approved;
    setCriteria(source ? source.criteria.map((c) => ({ ...c })) : []);
    setNote(st.draft?.changeNote || "");
    setFindings(st.findings || []);
    setAcked({});
    setSuggestions(null);
  }, []);

  const open = async (id) => {
    setOpenId(id); setMsg(null); setBusy(true);
    try { const { data } = await api.get(`${base}/question/${id}`); adopt(data.state); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };

  const draftFromGuide = () => run(async () => {
    const { data } = await api.post(`${base}/question/${openId}/draft-from-guide`);
    setCriteria(data.criteria.map((c) => ({ ...c, maxMarks: Number.isFinite(c.maxMarks) ? c.maxMarks : "" })));
    setFindings(data.findings); setAcked({});
    setMsg({ kind: "ok", text: data.notes.join(" ") });
  });
  const check = () => run(async () => {
    const { data } = await api.post(`${base}/question/${openId}/validate`, { criteria });
    setFindings(data.findings); setAcked({});
    setMsg({ kind: data.summary.errors ? "bad" : "ok", text: data.summary.errors ? `${data.summary.errors} problem(s) to fix before approving.` : "No errors found. Read any warnings below." });
  });
  const save = () => run(async () => {
    const { data } = await api.post(`${base}/question/${openId}/draft`, { criteria, draftId: state?.draft?.id ?? null, changeNote: note });
    adopt(data.state);
    setMsg({ kind: "ok", text: "Draft saved. It is not used for marking until you approve it." });
    loadList();
  });
  const discard = () => run(async () => {
    const { data } = await api.post(`${base}/version/${state.draft.id}/discard`);
    adopt(data.state); setMsg({ kind: "ok", text: "Draft discarded." }); loadList();
  });
  const approve = () => run(async () => {
    const codes = Object.keys(acked).filter((k) => acked[k]);
    const { data } = await api.post(`${base}/version/${state.draft.id}/approve`, { acknowledge: codes });
    adopt(data.state); setMsg({ kind: "ok", text: "Approved. Answers for this question can now be marked with AI." });
    loadList(); if (onChanged) onChanged();
  });
  const suggest = () => run(async () => {
    const { data } = await api.post(`${base}/question/${openId}/suggest`, { criteria });
    setSuggestions(data.suggestions);
  });

  const setCrit = (i, patch) => setCriteria((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const warnings = useMemo(() => findings.filter((f) => f.severity === "warning"), [findings]);
  const warnCodes = useMemo(() => [...new Set(warnings.map((w) => w.code))], [warnings]);
  const errors = findings.filter((f) => f.severity === "error").length;
  const allAcked = warnCodes.every((c) => acked[c]);
  const total = criteria.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0);
  const canApprove = !!state?.draft && errors === 0 && allAcked && !busy;
  const dirty = !!state?.draft && JSON.stringify(criteria.map((c) => ({ ...c, maxMarks: Number(c.maxMarks) }))) !== JSON.stringify(state.draft.criteria);

  return (
    <div className="ais">
      <style>{css}</style>

      <div className="ais-card">
        <p className="ais-h">Marking schemes for AI marking</p>
        {!list && <p className="ais-mute">Loading…</p>}
        {list?.error && <p className="ais-msg bad" role="alert">Could not load the schemes. Manual marking is not affected.</p>}
        {list?.summary && (
          <p className="ais-mute">
            {list.summary.ready + list.summary.review} of {list.summary.total} essay question(s) ready.
            {list.summary.unmarkedAnswersBlocked > 0 && ` ${list.summary.unmarkedAnswersBlocked} unmarked answer(s) cannot be AI-marked until their questions have an approved scheme.`}
          </p>
        )}
        <ul className="ais-list">
          {(list?.questions || []).map((q) => {
            const [label, tone] = STATUS[q.status] || [q.status, ""];
            return (
              <li key={q.questionId} className="ais-row">
                <button type="button" className="ais-open" onClick={() => open(q.questionId)} aria-expanded={openId === q.questionId}>
                  <strong>Q{q.questionId}</strong> ({q.marks} marks) — {q.text || "(no text)"}
                  <div className="ais-mute">
                    {q.unmarkedAnswers} unmarked
                    {q.notes.map((n) => ` · ${NOTE_TEXT[n] || n}`).join("")}
                  </div>
                </button>
                <span className={`ais-badge ${tone}`}>{label}</span>
              </li>
            );
          })}
        </ul>
        {list && !list.error && list.questions.length === 0 && <p className="ais-mute">No essay questions found for you in this assessment.</p>}
      </div>

      {openId && state && (
        <div className="ais-card">
          <p className="ais-h">Q{state.question.id} · {state.question.marks} marks{state.approved ? ` · approved version ${state.approved.versionNo}` : ""}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{state.question.text}</p>
          {state.question.hasGuide
            ? <><p className="ais-h">Existing marking guide</p><div className="ais-guide">{state.question.guideText}</div></>
            : <p className="ais-mute">This question has no marking guide.</p>}
          {state.approved && state.inFlightOnApproved > 0 && (
            <p className="ais-mute">{state.inFlightOnApproved} answer(s) are being marked with the approved version. They will finish with it even if you approve a new one.</p>
          )}
          {state.drift.map((d) => <div key={d.code} className={`ais-f ${d.severity}`}>{d.message}</div>)}

          <p className="ais-h" style={{ marginTop: 14 }}>Scheme {state.draft ? "(draft)" : state.approved ? "(approved — edit to make a new version)" : ""}</p>
          {criteria.length === 0 && <p className="ais-mute">No criteria yet. Start from the guide, or add one.</p>}
          {criteria.map((c, i) => (
            <div key={`${c.criterionId}-${i}`} className="ais-crit">
              <div className="ais-grid">
                <div><label htmlFor={`l${i}`}>What this criterion tests</label><input id={`l${i}`} type="text" value={c.label} onChange={(e) => setCrit(i, { label: e.target.value })} /></div>
                <div><label htmlFor={`m${i}`}>Marks</label><input id={`m${i}`} type="number" step="0.5" min="0" value={c.maxMarks} onChange={(e) => setCrit(i, { maxMarks: e.target.value })} /></div>
              </div>
              <label htmlFor={`p${i}`}>Points that earn marks (one per line)</label>
              <textarea id={`p${i}`} value={lines(c.expectedPoints)} onChange={(e) => setCrit(i, { expectedPoints: e.target.value.split("\n") })} />
              <label htmlFor={`a${i}`}>Other answers that are also correct (one per line, optional)</label>
              <textarea id={`a${i}`} value={lines(c.acceptableAlternatives)} onChange={(e) => setCrit(i, { acceptableAlternatives: e.target.value.split("\n") })} />
              <button type="button" className="ais-btn ghost" onClick={() => setCriteria((cs) => cs.filter((_, k) => k !== i))}>Remove criterion</button>
            </div>
          ))}
          <p className="ais-mute">Criteria add up to {total} of {state.question.marks} marks.</p>
          <button type="button" className="ais-btn ghost" onClick={() => setCriteria((cs) => [...cs, blankCriterion(cs.length + 1)])}>Add criterion</button>
          <button type="button" className="ais-btn ghost" onClick={draftFromGuide} disabled={busy || !state.question.hasGuide}>Draft from the guide</button>

          <label htmlFor="note">Why this version? (optional, kept with the version)</label>
          <input id="note" type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />

          <div style={{ marginTop: 10 }}>
            <button type="button" className="ais-btn ghost" onClick={check} disabled={busy || criteria.length === 0}>Check</button>
            <button type="button" className="ais-btn" onClick={save} disabled={busy || criteria.length === 0}>Save draft</button>
            {state.draft && <button type="button" className="ais-btn ghost" onClick={discard} disabled={busy}>Discard draft</button>}
          </div>

          {msg && <div className={`ais-msg ${msg.kind}`} role={msg.kind === "bad" ? "alert" : "status"}>{msg.text}</div>}

          {findings.length > 0 && <p className="ais-h" style={{ marginTop: 12 }}>Checks</p>}
          {["error", "warning", "info"].map((sev) => findings.filter((f) => f.severity === sev).map((f, i) => (
            <div key={`${sev}${i}`} className={`ais-f ${sev}`}><strong>{SEVERITY_LABEL[sev]}:</strong> {f.message}</div>
          )))}

          {state.draft && (
            <div style={{ marginTop: 12 }}>
              {warnCodes.length > 0 && <p className="ais-h">Confirm you have read each warning</p>}
              {warnCodes.map((code) => (
                <label key={code} style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "inherit", fontSize: 14 }}>
                  <input type="checkbox" checked={!!acked[code]} onChange={(e) => setAcked((a) => ({ ...a, [code]: e.target.checked }))} />
                  <span>{warnings.find((w) => w.code === code).message}</span>
                </label>
              ))}
              {dirty && <p className="ais-mute">You have unsaved changes. Save the draft, then approve it.</p>}
              <button type="button" className="ais-btn" onClick={approve} disabled={!canApprove || dirty}>Approve this scheme</button>
              {errors > 0 && <span className="ais-mute">Fix the problems above first.</span>}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <button type="button" className="ais-btn ghost" onClick={suggest} disabled={busy || criteria.length === 0}>Ask AI for suggestions</button>
            <span className="ais-mute">Advice only. Nothing is changed. Only works if your administrator has switched it on.</span>
          </div>
          {suggestions && (suggestions.length === 0
            ? <p className="ais-mute">No suggestions. The scheme looks clear to the AI.</p>
            : suggestions.map((s, i) => (
              <div key={i} className="ais-f info">
                {s.criterionId ? <strong>{s.criterionId}: </strong> : null}{s.text}
                {s.proposedAlternatives.length > 0 && <ul>{s.proposedAlternatives.map((a, k) => <li key={k}>{a}</li>)}</ul>}
              </div>
            )))}

          {state.history.length > 0 && (
            <>
              <p className="ais-h" style={{ marginTop: 14 }}>Earlier versions (kept for the record)</p>
              {state.history.map((h) => (
                <p key={h.id} className="ais-mute">Version {h.versionNo} — replaced{h.changeNote ? ` · ${h.changeNote}` : ""} · {h.criteria.length} criteria, {h.maxMarks} marks</p>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
