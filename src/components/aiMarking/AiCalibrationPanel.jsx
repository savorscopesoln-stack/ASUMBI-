import { useCallback, useEffect, useState } from "react";

/* =========================================================================
   AiCalibrationPanel — do teachers agree with the AI's marks? (Phase 9)

   Drop-in panel for the teacher Marking page, under AiSchemePanel.

   WHAT IT SHOWS
     For one assessment, each essay question with a plain verdict for the scheme
     currently in use — Agrees / Mixed / Disagrees / Not enough data — and the
     numbers behind it. "Versions" opens the record of earlier scheme versions so
     a rewritten scheme can be compared with the one it replaced.
     It only reads. It changes no marks and no schemes.

   HONESTY
     The server sends the rules and caveats; this screen prints them. Agreement
     means a teacher ended up with (nearly) the AI's mark. It does not prove the
     mark was right, and it cannot see suggestions accepted without being read.

   SAFETY
     All text is rendered as React text nodes. No dangerouslySetInnerHTML.
     No student data is ever received: the endpoint returns marks only.

   Props
     api         axios-style client with the auth header (api.get(url,{params}) -> {data})
     basePath    default "/api/e-assessments/ai-marking"
     assessmentId
========================================================================= */

const css = `
.aic{--c-card:var(--card,#fff);--c-ink:var(--text,#2a1a1a);--c-mute:var(--text-muted,#7a6a6a);--c-line:var(--border,#e6dcd0);--c-maroon:var(--maroon,#7a1f2b);--c-warn:#a15c00;--c-bad:#b3261e;--c-ok:#1f6b3a;color:var(--c-ink);font-family:inherit}
@media (prefers-color-scheme:dark){.aic{--c-card:var(--card,#262022);--c-ink:var(--text,#f3ebe6);--c-mute:var(--text-muted,#b9aaa4);--c-line:var(--border,#3b3134);--c-maroon:var(--maroon,#d9747f);--c-warn:#e0a24a;--c-bad:#f08a82;--c-ok:#7cc79a}}
.aic *{box-sizing:border-box}
.aic-card{background:var(--c-card);border:1px solid var(--c-line);border-radius:10px;padding:16px;margin-bottom:14px}
.aic-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--c-mute);margin:0 0 10px}
.aic-mute{color:var(--c-mute);font-size:13px}
.aic-row{padding:10px 4px;border-bottom:1px dashed var(--c-line)}
.aic-top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
.aic-q{flex:1;min-width:200px}
.aic-badge{font-size:12px;border:1px solid var(--c-line);border-radius:999px;padding:2px 10px;white-space:nowrap}
.aic-badge.agrees{border-color:var(--c-ok);color:var(--c-ok)}
.aic-badge.mixed{border-color:var(--c-warn);color:var(--c-warn)}
.aic-badge.disagrees{border-color:var(--c-bad);color:var(--c-bad)}
.aic-stats{display:flex;gap:16px;flex-wrap:wrap;margin:6px 0 0;font-size:13px}
.aic-btn{border:1px solid var(--c-maroon);background:transparent;color:var(--c-maroon);border-radius:8px;padding:5px 10px;font:inherit;cursor:pointer}
.aic-note{border-left:3px solid var(--c-warn);padding:4px 10px;margin:8px 0;font-size:13px}
.aic table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.aic th,.aic td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--c-line)}
`;

const VERDICT = {
  agrees: "Agrees",
  mixed: "Mixed",
  disagrees: "Disagrees",
  not_enough_data: "Not enough data",
};
const pct = (x) => (x === null || x === undefined ? "–" : `${Math.round(x * 100)}%`);
const biasText = (b) => (b === null || b === undefined ? "–" : b === 0 ? "none" : `${b > 0 ? "AI more generous" : "AI stricter"} by ${Math.abs(b)}%`);

function Stats({ s }) {
  return (
    <div className="aic-stats">
      <span>{s.reviewed} reviewed ({s.approved} approved, {s.rejected} rejected)</span>
      <span>Agreement {pct(s.agreementRate)}</span>
      <span>Teacher changed the mark: {s.changedByTeacher}</span>
      <span>Bias: {biasText(s.biasPct)}</span>
    </div>
  );
}

export default function AiCalibrationPanel({ api, basePath = "/api/e-assessments/ai-marking", assessmentId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    if (!api || !assessmentId) return;
    setError("");
    try {
      const res = await api.get(`${basePath}/scheme/calibration`, { params: { assessmentId } });
      setData(res.data);
    } catch (e) {
      setData(null);
      setError(e?.response?.data?.message || "Could not load the calibration report.");
    }
  }, [api, basePath, assessmentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="aic">
      <style>{css}</style>
      <div className="aic-card">
        <h3 className="aic-h">Do teachers agree with the AI's marks?</h3>
        {error && <p className="aic-mute" role="alert">{error}</p>}
        {!data && !error && <p className="aic-mute">Loading…</p>}
        {data && (
          <>
            <p className="aic-mute">
              Counts only answers a teacher has approved or rejected. A mark counts as agreeing when it is within{" "}
              {data.rules.tolerance.floorMarks} mark or {Math.round(data.rules.tolerance.fractionOfMarks * 100)}% of the question's marks
              of the AI's. A verdict needs at least {data.rules.minSample} reviewed answers.
            </p>
            {data.truncated && <div className="aic-note">There were too many answers to include them all; this report uses the most recent ones.</div>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.questions.map((q) => (
                <li key={q.questionId} className="aic-row">
                  <div className="aic-top">
                    <div className="aic-q">
                      <div>{q.questionText || `Question ${q.questionId}`}</div>
                      <div className="aic-mute">
                        {q.marks} marks · {q.approvedVersionNo ? `scheme version ${q.approvedVersionNo} in use` : "no approved scheme"}
                      </div>
                    </div>
                    <span className={`aic-badge ${q.verdict}`}>{VERDICT[q.verdict] || q.verdict}</span>
                    {q.versions.length > 0 && (
                      <button type="button" className="aic-btn" onClick={() => setOpen(open === q.questionId ? null : q.questionId)}>
                        {open === q.questionId ? "Hide versions" : "Versions"}
                      </button>
                    )}
                  </div>
                  {q.current && <Stats s={q.current} />}
                  {q.current && q.current.reasons.map((r) => <div key={r} className="aic-mute">{r}</div>)}
                  {q.current && q.current.notes.map((n) => <div key={n.code} className="aic-note">{n.message}</div>)}
                  {!q.current && q.versions.length > 0 && <div className="aic-mute">Nothing reviewed yet on the scheme now in use.</div>}
                  {open === q.questionId && (
                    <table>
                      <thead><tr><th>Version</th><th>Reviewed</th><th>Agreement</th><th>Bias</th><th>Verdict</th></tr></thead>
                      <tbody>
                        {q.versions.map((v) => (
                          <tr key={v.versionId}>
                            <td>{v.versionNo ?? "–"}{v.isApproved ? " (in use)" : ""}</td>
                            <td>{v.reviewed}</td>
                            <td>{pct(v.agreementRate)}</td>
                            <td>{biasText(v.biasPct)}</td>
                            <td>{VERDICT[v.verdict] || v.verdict}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              ))}
              {!data.questions.length && <li className="aic-mute">No essay questions.</li>}
            </ul>
            <p className="aic-mute" style={{ marginTop: 12 }}>
              {data.caveats.join(" ")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
