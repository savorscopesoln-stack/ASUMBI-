import { useCallback, useEffect, useState } from "react";

/* =========================================================================
   AiAnalyticsPanel — AI-assisted marking analytics (Phase 10)

   One panel, two audiences, chosen by the `audience` prop:
     "teacher"      a teacher's own marking activity, charges and wallet
                    GET {basePath}/teacher
     "institution"  the whole institution, with usage and charges per teacher
                    GET {basePath}/institution
   (the server decides what each role may see; this prop only picks the URL).

   WHAT IT NEVER SHOWS: provider cost, tokens or margin. Those exist only in the
   finance-only AiFinanceAnalyticsPanel; the endpoints used here do not return them.

   `AnalyticsBody` is exported so Finance's per-institution view can show exactly
   the same operational figures above its own economics section.

   HONESTY
     Rates show "–" when there is nothing to divide, never 0%. The server sends the
     definitions and caveats and this screen prints them. Agreement is not accuracy.

   SAFETY
     Everything is rendered as React text nodes. No dangerouslySetInnerHTML.
     No student data is received: counts, marks, question text and criterion labels only.

   Props
     api        axios-style client with the auth header (api.get(url,{params}) -> {data})
     audience   "teacher" | "institution"        default "teacher"
     basePath   default "/ai-marking-analytics" — relative to the app's `API` axios instance, whose baseURL already
                ends in /api. With a bare axios client pass "/api/ai-marking-analytics".
     assessmentId  optional filter
========================================================================= */

const css = `
.aia{--c-card:var(--card,#fff);--c-ink:var(--text,#2a1a1a);--c-mute:var(--text-muted,#7a6a6a);--c-line:var(--border,#e6dcd0);--c-maroon:var(--maroon,#7a1f2b);--c-gold:var(--gold,#b8892b);--c-warn:#a15c00;--c-bad:#b3261e;--c-ok:#1f6b3a;color:var(--c-ink);font-family:inherit}
@media (prefers-color-scheme:dark){.aia{--c-card:var(--card,#262022);--c-ink:var(--text,#f3ebe6);--c-mute:var(--text-muted,#b9aaa4);--c-line:var(--border,#3b3134);--c-maroon:var(--maroon,#d9747f);--c-gold:var(--gold,#d8b25a);--c-warn:#e0a24a;--c-bad:#f08a82;--c-ok:#7cc79a}}
.aia *{box-sizing:border-box}
.aia-card{background:var(--c-card);border:1px solid var(--c-line);border-radius:10px;padding:16px;margin-bottom:14px}
.aia-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--c-mute);margin:0 0 10px}
.aia-mute{color:var(--c-mute);font-size:13px}
.aia-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.aia-stat{border:1px solid var(--c-line);border-left:3px solid var(--c-gold);border-radius:8px;padding:10px 12px}
.aia-stat b{display:block;font-size:22px;line-height:1.1;color:var(--c-maroon)}
.aia-stat span{font-size:12px;color:var(--c-mute)}
.aia-note{border-left:3px solid var(--c-warn);padding:4px 10px;margin:8px 0;font-size:13px}
.aia-bad{border-left-color:var(--c-bad)}
.aia-row{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:12px}
.aia-row label{font-size:12px;color:var(--c-mute);display:flex;flex-direction:column;gap:3px}
.aia input{font:inherit;border:1px solid var(--c-line);border-radius:6px;padding:4px 8px;background:transparent;color:inherit}
.aia-btn{border:1px solid var(--c-maroon);background:transparent;color:var(--c-maroon);border-radius:8px;padding:5px 12px;font:inherit;cursor:pointer}
.aia table{width:100%;border-collapse:collapse;font-size:13px}
.aia th,.aia td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--c-line)}
.aia-scroll{overflow-x:auto}
.aia-bar{height:6px;border-radius:3px;background:var(--c-line);overflow:hidden;min-width:60px}
.aia-bar>i{display:block;height:100%;background:var(--c-maroon)}
`;

export const num = (v) => (v === null || v === undefined ? "–" : Number(v).toLocaleString());
export const pct = (v) => (v === null || v === undefined ? "–" : `${v}%`);
export function duration(sec) {
  if (sec === null || sec === undefined) return "–";
  if (sec < 90) return `${sec}s`;
  if (sec < 5400) return `${Math.round(sec / 60)} min`;
  if (sec < 172800) return `${Math.round(sec / 360) / 10} h`;
  return `${Math.round(sec / 8640) / 10} days`;
}
export function money(v, currency, digits = 2) {
  if (v === null || v === undefined) return "–";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 4) }).format(v); }
  catch { return `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency || ""}`.trim(); }
}

export const Stat = ({ label, value, hint }) => (
  <div className="aia-stat" title={hint || undefined}><b>{value}</b><span>{label}</span></div>
);

export function AnalyticsBody({ data, showWallet = true }) {
  const { operational: o, billing, wallet, byTeacher, rules, caveats, period } = data;
  const a = o.activity, p = o.position, g = o.agreement;
  const biasText = g.biasPct === null ? "–" : g.biasPct === 0 ? "none" : `${g.biasPct > 0 ? "AI more generous" : "AI stricter"} by ${Math.abs(g.biasPct)}%`;
  return (
    <>
      <div className="aia-card">
        <h3 className="aia-h">Where marking stands now</h3>
        <div className="aia-grid">
          <Stat label="Essay answers" value={num(p.essayAnswers)} />
          <Stat label="Eligible for AI marking" value={num(p.eligibleForAi)} hint={rules.eligible} />
          <Stat label="Still unmarked" value={num(p.unmarked)} />
          <Stat label="Marked by hand" value={num(p.manuallyMarked)} />
          <Stat label="AI marks awaiting review" value={num(p.aiAwaitingReview)} />
          <Stat label="AI marks approved" value={num(p.approvedAi)} />
          <Stat label="Needing attention" value={num(p.needsAttention)} />
          <Stat label="Blank answers" value={num(p.blank)} />
        </div>
        {p.needScheme > 0 && <div className="aia-note">{num(p.needScheme)} answers cannot be AI-marked yet because their question has no approved marking scheme.</div>}
        <p className="aia-mute">{rules.position}</p>
      </div>

      <div className="aia-card">
        <h3 className="aia-h">AI marking activity{period && (period.from || period.to) ? ` · ${period.from || "start"} to ${period.to || "now"}` : " · all time"}</h3>
        <div className="aia-grid">
          <Stat label="AI marking requests" value={num(a.requests)} />
          <Stat label="Answers requested" value={num(a.answersRequested)} />
          <Stat label="Successfully processed" value={num(a.processed)} hint={rules.processed} />
          <Stat label="Failed (not charged)" value={num(a.failed)} />
          <Stat label="Failure rate" value={pct(a.failureRatePct)} />
          <Stat label="Approved by teacher" value={num(a.review.teacherApproved)} />
          <Stat label="Mark changed by teacher" value={num(a.review.modifiedByTeacher)} />
          <Stat label="Rejected by teacher" value={num(a.review.rejected)} />
        </div>
        <div className="aia-grid" style={{ marginTop: 10 }}>
          <Stat label="Average AI turnaround" value={duration(a.turnaround.aiAverageSeconds)} hint={rules.turnaround} />
          <Stat label="Average time to teacher decision" value={duration(a.turnaround.reviewAverageSeconds)} />
        </div>
      </div>

      <div className="aia-card">
        <h3 className="aia-h">Do teachers agree with the AI?</h3>
        {!g.enoughData ? (
          <p className="aia-mute">Not enough reviewed answers yet ({g.decisions}). A rate from a handful of answers would mean very little.</p>
        ) : (
          <div className="aia-grid">
            <Stat label="Agreement" value={pct(g.agreementRatePct)} hint={rules.agreement} />
            <Stat label="Likely range (95%)" value={`${pct(g.agreementLowPct)} – ${pct(g.agreementHighPct)}`} />
            <Stat label="Mark kept as AI gave it" value={num(g.kept)} />
            <Stat label="Mark moved by teacher" value={num(g.moved)} />
            <Stat label="Rejected" value={num(g.rejected)} />
            <Stat label="Tendency" value={biasText} />
          </div>
        )}
        {g.notes.map((n) => <div key={n.code} className="aia-note">{n.message}</div>)}
        {g.truncated && <div className="aia-note">There were too many reviewed answers to include them all; this uses the most recent ones.</div>}
        {caveats.map((c) => <p key={c} className="aia-mute">{c}</p>)}
      </div>

      <div className="aia-card">
        <h3 className="aia-h">Criteria the AI most often did not award in full</h3>
        {o.missedCriteria.length === 0 ? (
          <p className="aia-mute">Nothing to rank yet. A criterion needs several AI evaluations first.</p>
        ) : (
          <div className="aia-scroll">
            <table>
              <thead><tr><th>Criterion</th><th>Question</th><th>Evaluated</th><th>Not full marks</th><th>Zero</th><th>Average awarded</th></tr></thead>
              <tbody>
                {o.missedCriteria.map((c) => (
                  <tr key={`${c.questionId}-${c.schemeVersionId}-${c.criterionId}`}>
                    <td>{c.label}</td><td>{c.questionText || `Question ${c.questionId}`}</td><td>{num(c.evaluated)}</td>
                    <td><div className="aia-bar"><i style={{ width: `${c.missedPct}%` }} /></div>{pct(c.missedPct)}</td>
                    <td>{pct(c.zeroPct)}</td><td>{pct(c.averageAwardedPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {o.missedCriteriaBasedOn.truncated && <div className="aia-note">Based on the most recent {num(o.missedCriteriaBasedOn.evaluations)} evaluations only.</div>}
        <p className="aia-mute">{rules.missedCriteria} A criterion often missed may point to a hard criterion or an unclear scheme, not only weak answers.</p>
      </div>

      <div className="aia-card">
        <h3 className="aia-h">AI marking charges</h3>
        {billing.byCurrency.length === 0 ? <p className="aia-mute">No charges in this period.</p> : (
          <table>
            <thead><tr><th>Currency</th><th>Charged</th><th>Reversed</th><th>Net</th></tr></thead>
            <tbody>{billing.byCurrency.map((b) => (
              <tr key={b.currency}><td>{b.currency}</td><td>{money(b.charged, b.currency)}</td><td>{money(b.reversed, b.currency)}</td><td><b>{money(b.net, b.currency)}</b></td></tr>
            ))}</tbody>
          </table>
        )}
        <p className="aia-mute">{rules.charges} Manual marking is always free.</p>
        {showWallet && wallet && (
          <p className="aia-mute">AI marking credits available: <b>{money(wallet.available, wallet.currency)}</b>
            {wallet.unitPrice != null ? ` · ${money(wallet.unitPrice, wallet.currency)} per answer` : ""}{wallet.aiMarkingEnabled === false ? " · AI marking is not enabled" : ""}</p>
        )}
      </div>

      {byTeacher && (
        <div className="aia-card">
          <h3 className="aia-h">Usage by teacher</h3>
          {byTeacher.length === 0 ? <p className="aia-mute">No AI marking requests in this period.</p> : (
            <div className="aia-scroll">
              <table>
                <thead><tr><th>Teacher</th><th>Requests</th><th>Processed</th><th>Failed</th><th>Net charged</th></tr></thead>
                <tbody>{byTeacher.map((t) => (
                  <tr key={t.teacherId}>
                    <td>{t.name || `Teacher ${t.teacherId}`}</td><td>{num(t.requests)}</td><td>{num(t.processed)}</td><td>{num(t.failed)}</td>
                    <td>{t.billing.length ? t.billing.map((b) => money(b.net, b.currency)).join(" + ") : "–"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function PeriodPicker({ value, onChange, onApply }) {
  return (
    <div className="aia-row">
      <label>From<input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} /></label>
      <label>To<input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} /></label>
      <button type="button" className="aia-btn" onClick={() => onApply(value)}>Apply</button>
      {(value.from || value.to) && <button type="button" className="aia-btn" onClick={() => { const empty = { from: "", to: "" }; onChange(empty); onApply(empty); }}>All time</button>}
    </div>
  );
}

export const analyticsCss = css;

export default function AiAnalyticsPanel({ api, audience = "teacher", basePath = "/ai-marking-analytics", assessmentId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState({ from: "", to: "" });

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      const params = {};
      if (applied.from) params.from = applied.from;
      if (applied.to) params.to = applied.to;
      if (assessmentId) params.assessmentId = assessmentId;
      const res = await api.get(`${basePath}/${audience === "institution" ? "institution" : "teacher"}`, { params });
      setData(res.data);
    } catch (e) {
      setData(null);
      setError(e?.response?.data?.message || "Could not load the AI marking analytics.");
    }
  }, [api, basePath, audience, assessmentId, applied]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="aia">
      <style>{css}</style>
      <PeriodPicker value={period} onChange={setPeriod} onApply={(v) => setApplied(v)} />
      {error && <div className="aia-note aia-bad" role="alert">{error}</div>}
      {!data && !error && <p className="aia-mute">Loading…</p>}
      {data && <AnalyticsBody data={data} />}
    </div>
  );
}
