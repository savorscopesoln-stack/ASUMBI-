import React from "react";
import { C, S } from "./lmsUtil";

/* Shared outcome-mastery view (L9.4, S115). Props: { rule:{text}, outcomes:[{outcomeId,code,title,evidenceCount,masteryPercent|null,band,evidence:[{source,sourceId,title,at,points,maxPoints,percent}]}] }.
   Server shape of GET .../learn/competency and GET .../competency/learners/:id. A band is a summary of the evidence listed beside it, never a verdict: the rule and the evidence are always shown.
   "insufficient_evidence" has NO number. Plain text only. Text labels, never colour alone. */

import { BAND_TEXT } from "./competencyUtil";
const SOURCE_TEXT = { rubric: "Marked work", quiz: "Quiz" };
const day = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString([], { dateStyle: "medium" }) : ""; };
const pts = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : "?");

export default function CompetencyView({ rule, outcomes, minEvidence }) {
  const list = Array.isArray(outcomes) ? outcomes : [];
  return (
    <div>
      {rule?.text && <p style={{ ...S.box, margin: "0 0 12px", fontSize: 14 }}>{rule.text}</p>}
      {list.length === 0 ? <p style={{ color: C.muted }}>No outcome evidence yet. Marked work and graded quizzes that are tied to an outcome will show here.</p> : (
        <ul aria-label="Outcomes" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
          {list.map((o) => {
            const id = `cv-o-${o.outcomeId}`, none = o.masteryPercent === null || o.masteryPercent === undefined;
            return (
              <li key={o.outcomeId} style={{ ...S.box, listStyle: "none" }}>
                <h3 id={id} style={{ fontSize: 15, margin: 0 }}>{o.code ? `${o.code} ` : ""}{o.title}</h3>
                <div style={{ fontSize: 14, margin: "4px 0" }}>
                  <strong>{BAND_TEXT[o.band] || o.band}</strong>
                  {none ? <span style={{ color: C.muted }}> · {o.evidenceCount} piece{o.evidenceCount === 1 ? "" : "s"} of evidence{minEvidence ? ` (needs ${minEvidence})` : ""}</span>
                    : <span style={{ color: C.muted }}> · {o.masteryPercent}% from {o.evidenceCount} piece{o.evidenceCount === 1 ? "" : "s"} of evidence</span>}
                </div>
                {!none && <div role="progressbar" aria-labelledby={id} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(o.masteryPercent)} style={{ height: 8, borderRadius: 999, background: C.border, margin: "4px 0 8px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, o.masteryPercent))}%`, height: "100%", background: C.accent }} /></div>}
                {(o.evidence || []).length > 0 && (
                  <ul aria-label={`Evidence for ${o.title}`} style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {o.evidence.map((e) => (
                      <li key={`${e.source}-${e.sourceId}`} style={{ fontSize: 13, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                        {SOURCE_TEXT[e.source] || e.source}: {e.title} · {pts(e.points)} of {pts(e.maxPoints)} ({pts(e.percent)}%){e.at ? ` · ${day(e.at)}` : ""}
                      </li>))}
                  </ul>)}
              </li>);
          })}
        </ul>)}
    </div>
  );
}
