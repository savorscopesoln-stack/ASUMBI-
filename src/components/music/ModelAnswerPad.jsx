import React, { Suspense, useRef, useState } from "react";
import { Music, Palette, Plus } from "lucide-react";
import { MAX_SHEETS_PER_QUESTION } from "../../utils/musicAnswer";

const MusicPad = React.lazy(() => import("./MusicPad"));
const ArtPad = React.lazy(() => import("../art/ArtPad"));

const KINDS = {
  music: { Pad: MusicPad, Icon: Music, defaultTpl: "treble" },
  art: { Pad: ArtPad, Icon: Palette, defaultTpl: "art-blank" },
};

/* The question setter's MODEL ANSWER drawing for a music-paper essay question.
   Same pad the students use. Students never see it while sitting the exam;
   markers can show it beside the student's sheet, and students see it on their
   marked paper once marks are released.
   `onChange(sheets)` gets every drawn sheet ([] when none). */
export default function ModelAnswerPad({ initialSheets = [], onChange, kind = "music" }) {
  const K = KINDS[kind] || KINDS.music;
  const { Pad, Icon } = K;
  const [open, setOpen] = useState(initialSheets.length > 0);
  const [count, setCount] = useState(Math.max(1, initialSheets.length));
  const sheetsRef = useRef(null);
  if (sheetsRef.current === null) sheetsRef.current = initialSheets.map((s) => ({ ...s }));

  const onSheet = (i, png, tpl) => {
    const next = sheetsRef.current.slice();
    next[i] = { png, tpl };
    sheetsRef.current = next;
    onChange(next.filter((s) => s && s.png));
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <Icon size={16} color="var(--primary)" />
        <strong style={{ fontSize: 13.5, color: "var(--text)" }}>Model answer (drawing)</strong>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Optional — markers compare students' drawings against it. Hidden from students until marks are released.</span>
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          Draw the model answer
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: count }).map((_, i) => (
            <Suspense key={i} fallback={<div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading the drawing pad…</div>}>
              <Pad initialPng={initialSheets[i]?.png || ""} initialTemplate={initialSheets[i]?.tpl || K.defaultTpl} onChange={(png, tpl) => onSheet(i, png, tpl)} />
            </Suspense>
          ))}
          {count < MAX_SHEETS_PER_QUESTION && (
            <button type="button" onClick={() => setCount((c) => c + 1)}
              style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={15} /> Add another sheet
            </button>
          )}
        </div>
      )}
    </div>
  );
}
