import { useCallback, useEffect, useState } from "react";
import { AnalyticsBody, PeriodPicker, Stat, analyticsCss, money, num, pct } from "./AiAnalyticsPanel";

/* =========================================================================
   AiFinanceAnalyticsPanel — Doravo Finance only (Phase 10)

   Provider cost, token use and estimated gross margin.
     tenantKey given   one institution:  GET /api/finance/institutions/:tenantKey/ai-marking/analytics
                       (its operational figures first, then the economics)
     tenantKey absent  the whole platform: GET /api/finance/ai-marking/analytics

   These endpoints are protect + financeOnly (no admin bypass). Institution admins
   and teachers cannot call them, and this panel is mounted only in the finance dashboard.

   HONESTY
     - No currency conversion. Cost recorded in a different currency from the charge
       gives NO margin (the server says so and this screen prints its explanation).
     - Unknown cost is not zero: a margin with unpriced answers is labelled incomplete.
     - A platform total with an institution that could not be read is labelled
       incomplete; that institution is listed as unavailable, never shown as zero.
     - Cost spent on answers that were NOT charged (failed, cancelled) is shown separately.
     - Reconciliation compares each finished job's recorded total with the ledger.

   SAFETY: React text nodes only; no dangerouslySetInnerHTML; no student data is received.

   Props: api (axios-style, auth header), tenantKey (optional), basePath default "/finance" (relative to the `API` axios instance, whose baseURL already ends in /api)
========================================================================= */

const STATUS_LABEL = {
  COMPLETE: "Complete", INCOMPLETE_COST: "Incomplete cost", CURRENCY_MISMATCH: "Currency mismatch", NO_COST_DATA: "No cost data",
};

function Economics({ e, statusText }) {
  if (!e.byCurrency.length) return <p className="aia-mute">No AI marking charges or provider cost in this period.</p>;
  return (
    <>
      {e.truncated && <div className="aia-note">Too many evaluations to read them all; these cost figures are partial.</div>}
      {e.byCurrency.map((c) => {
        const warn = c.marginStatus !== "COMPLETE";
        return (
          <div key={c.chargeCurrency} className="aia-card">
            <h3 className="aia-h">Charges in {c.chargeCurrency}</h3>
            <div className="aia-grid">
              <Stat label="Charged to teachers / institutions" value={money(c.netCharged, c.chargeCurrency)} hint="Consumed from AI marking wallets, less reversals" />
              <Stat label="Answers charged" value={num(c.billedAnswers)} />
              <Stat label="Average price per answer" value={money(c.averagePricePerAnswer, c.chargeCurrency, 2)} />
              <Stat label="Estimated gross margin" value={c.estimatedGrossMargin === null ? "–" : money(c.estimatedGrossMargin, c.chargeCurrency)} />
              <Stat label="Margin %" value={pct(c.estimatedGrossMarginPct)} />
              <Stat label="Average cost per charged answer" value={money(c.averageCostPerBilledAnswer, c.chargeCurrency, 4)} hint="Only answers whose cost is known" />
              <Stat label="Cost per charged answer incl. wasted calls" value={money(c.averageCostFullyLoaded, c.chargeCurrency, 4)} hint="Total provider cost ÷ charged answers" />
              <Stat label="Spent on answers not charged" value={c.costOnUnbilledAttempts === null ? "–" : money(c.costOnUnbilledAttempts, c.chargeCurrency, 4)} hint="Failed or cancelled answers: real cost, no revenue" />
            </div>
            <div className={`aia-note${warn ? "" : ""}`}>
              <b>{STATUS_LABEL[c.marginStatus] || c.marginStatus}.</b> {statusText[c.marginStatus]}
              {c.billedAnswersWithUnknownCost > 0 && ` ${num(c.billedAnswersWithUnknownCost)} charged answers have no recorded cost.`}
            </div>
            <table>
              <thead><tr><th>Provider cost (recorded in)</th><th>Total</th></tr></thead>
              <tbody>
                {c.providerCost.length === 0 ? <tr><td colSpan={2} className="aia-mute">None recorded</td></tr>
                  : c.providerCost.map((x) => <tr key={x.costCurrency}><td>{x.costCurrency}</td><td>{money(x.total, x.costCurrency, 4)}</td></tr>)}
              </tbody>
            </table>
            <p className="aia-mute">Measured tokens per answer: {num(c.tokens.averageInputPerAnswer)} in / {num(c.tokens.averageOutputPerAnswer)} out
              ({num(c.tokens.input)} / {num(c.tokens.output)} in total).</p>
          </div>
        );
      })}
    </>
  );
}

function Reconciliation({ r }) {
  return (
    <div className={`aia-note${r.ok ? "" : " aia-bad"}`}>
      <b>Ledger reconciliation:</b> {r.ok ? `all ${num(r.jobsChecked)} finished jobs match the ledger.` : `${num(r.mismatched)} of ${num(r.jobsChecked)} finished jobs have a recorded total that differs from what the ledger consumed. Investigate before relying on these figures.`}
    </div>
  );
}

export default function AiFinanceAnalyticsPanel({ api, tenantKey = null, basePath = "/finance" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState({ from: "", to: "" });

  const load = useCallback(async () => {
    if (!api) return;
    setError(""); setData(null);
    try {
      const params = {};
      if (applied.from) params.from = applied.from;
      if (applied.to) params.to = applied.to;
      const url = tenantKey ? `${basePath}/institutions/${encodeURIComponent(tenantKey)}/ai-marking/analytics` : `${basePath}/ai-marking/analytics`;
      const res = await api.get(url, { params });
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load the AI marking analytics.");
    }
  }, [api, basePath, tenantKey, applied]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="aia">
      <style>{analyticsCss}</style>
      <PeriodPicker value={period} onChange={setPeriod} onApply={(v) => setApplied(v)} />
      {error && <div className="aia-note aia-bad" role="alert">{error}</div>}
      {!data && !error && <p className="aia-mute">Loading…</p>}
      {data && (
        <>
          {data.complete === false && (
            <div className="aia-note aia-bad">This platform total is incomplete{data.institutionsUnavailable ? `: ${data.institutionsUnavailable} institution(s) could not be read` : ""}{data.economics.truncated ? " and some cost data was cut off" : ""}. Do not treat it as final.</div>
          )}
          <div className="aia-card"><h3 className="aia-h">Finance view · provider cost and margin · confidential</h3>
            <p className="aia-mute">Not shown to teachers or institution administrators. Amounts are never converted between currencies.</p></div>
          <Economics e={data.economics} statusText={data.economics.statusText} />
          <Reconciliation r={data.reconciliation} />
          {data.institutions && (
            <div className="aia-card">
              <h3 className="aia-h">By institution</h3>
              <div className="aia-scroll"><table>
                <thead><tr><th>Institution</th><th>Requests</th><th>Processed</th><th>Failed</th><th>Teacher-approved</th><th>Changed</th><th>Agreement</th><th>Net charged</th><th>Margin</th></tr></thead>
                <tbody>{data.institutions.map((i) => i.available === false ? (
                  <tr key={i.tenantKey}><td>{i.tenantKey}</td><td colSpan={8} className="aia-mute">Unavailable — could not be read (not zero)</td></tr>
                ) : (
                  <tr key={i.tenantKey}>
                    <td>{i.tenantKey}</td><td>{num(i.requests)}</td><td>{num(i.processed)}</td><td>{num(i.failed)}</td><td>{num(i.teacherApproved)}</td><td>{num(i.modifiedByTeacher)}</td><td>{pct(i.agreementRatePct)}</td>
                    <td>{i.economics.length ? i.economics.map((c) => money(c.netCharged, c.chargeCurrency)).join(" + ") : "–"}</td>
                    <td>{i.economics.length ? i.economics.map((c) => (c.estimatedGrossMargin === null ? "–" : money(c.estimatedGrossMargin, c.chargeCurrency))).join(" + ") : "–"}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
          {data.operational && (<><h3 className="aia-h" style={{ marginTop: 18 }}>Operational detail for this institution</h3><AnalyticsBody data={data} showWallet={false} /></>)}
        </>
      )}
    </div>
  );
}
