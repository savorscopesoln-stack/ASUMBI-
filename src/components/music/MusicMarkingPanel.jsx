import React, { Suspense, useState } from "react";
import { Music, Eye, EyeOff } from "lucide-react";
import { splitAnswer } from "../../utils/musicAnswer";
import { answerToSafeHtml } from "../../utils/safeHtml";

const MusicMarkPad = React.lazy(() => import("./MusicMarkPad"));

/* ═══════════════════════════════════════════════════════════
   MUSIC MARKING PANEL — shown on a marking screen under a student's essay
   answer when that answer contains a drawing.

     • one red-pen annotator per drawing sheet (MusicMarkPad)
     • optional "Model answer" the question setter attached, shown for
       comparison (read-only)

   `overlays` is positional (index i = i-th sheet, "" = not annotated).
   `onChange(nextOverlays)` fires on every change; the marking screen keeps it
   with the other unsaved marks and sends it with the rest of the marking.
═══════════════════════════════════════════════════════════ */
export default function MusicMarkingPanel({ answerHtml, modelHtml, overlays = [], onChange }) {
  const { sheets } = splitAnswer(answerHtml);
  const [showModel, setShowModel] = useState(false);
  if (!sheets.length) return null;
  const modelSafe = modelHtml ? answerToSafeHtml(modelHtml) : "";

  const set = (i, png) => {
    const next = Array.from({ length: sheets.length }, (_, j) => (j === i ? png : overlays[j] || ""));
    onChange(next);
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px dashed var(--primary)", background: "var(--primary-tint)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Music size={16} color="var(--primary)" />
        <strong style={{ fontSize: 13.5, color: "var(--text)" }}>Mark the drawing</strong>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, minWidth: 180 }}>
          Your red marks are saved separately — the student's drawing is never changed.
        </span>
        {modelSafe && (
          <button type="button" onClick={() => setShowModel((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showModel ? <EyeOff size={14} /> : <Eye size={14} />} {showModel ? "Hide" : "Show"} model answer
          </button>
        )}
      </div>

      {showModel && modelSafe && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>Model answer</div>
          <div dangerouslySetInnerHTML={{ __html: modelSafe }} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sheets.map((s, i) => (
          <div key={i}>
            {sheets.length > 1 && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>Sheet {i + 1}</div>}
            <Suspense fallback={<div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading…</div>}>
              <MusicMarkPad sheetPng={s.png} overlayPng={overlays[i] || ""} onChange={(png) => set(i, png)} />
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  );
}
