import React, { Suspense, useRef, useState } from "react";
import { Music, Palette, Plus, X } from "lucide-react";
import { MAX_SHEETS_PER_QUESTION, joinAnswer, splitAnswer } from "../../utils/musicAnswer";

/* The pad (and its 320 KB music font) only loads when a student on a music
   paper actually unlocks it. */
const MusicPad = React.lazy(() => import("./MusicPad"));
const ArtPad = React.lazy(() => import("../art/ArtPad"));

/* One answer box, two kinds of paper. The stored format is identical (typed
   text + PNG sheets, see utils/musicAnswer.js); only the pad, its wording and
   the starting paper differ. */
const KINDS = {
  music: {
    Pad: MusicPad, Icon: Music, defaultTpl: "treble", testId: "unlock-music-pad",
    banner: "This is a music paper.", help: "Need to write staves, notes or rests? Unlock the drawing pad.",
    sheet: "Music sheet",
  },
  art: {
    Pad: ArtPad, Icon: Palette, defaultTpl: "art-blank", testId: "unlock-art-pad",
    banner: "This is an Art & Craft paper.", help: "Need to sketch, design or colour something? Unlock the drawing pad.",
    sheet: "Drawing sheet",
  },
};

/* ═══════════════════════════════════════════════════════════
   MUSIC ANSWER BOX
   Used by TakeEAssessment for an ESSAY question on a paper flagged
   `music_paper`. The answer is one string (typed-text HTML followed by the
   drawing sheets as PNG <img> tags — see utils/musicAnswer.js), so the rest
   of the exam machinery is unchanged.

     • `renderText` — renders the exam page's own essay editor, for typed answers
       (tonic sol-fa, note names, explanations …).
     • "Unlock drawing pad" button — reveals the pad(s) for staves, notes,
       rests and free drawing. A question that already has a drawing (after a
       refresh / resume) opens straight away.
═══════════════════════════════════════════════════════════ */
export default function MusicAnswerBox({ qid, value, onChange, renderText, kind = "music" }) {
  const K = KINDS[kind] || KINDS.music;
  const { Pad, Icon } = K;
  // Read once per question. `storeRef` holds the latest typed-text HTML and
  // sheets: it is only touched from event handlers, never drives rendering, and
  // exists so each change can rebuild the full answer string.
  const [initial] = useState(() => splitAnswer(value));
  const storeRef = useRef(null);
  if (storeRef.current === null) storeRef.current = { html: initial.html, sheets: initial.sheets };
  const [sheets, setSheets] = useState(initial.sheets);
  const [open, setOpen] = useState(initial.sheets.length > 0);

  const commit = () => onChange(joinAnswer(storeRef.current.html, storeRef.current.sheets));

  const onSheet = (i, png, tpl) => {
    const next = storeRef.current.sheets.slice();
    next[i] = { png, tpl };
    storeRef.current.sheets = next;          // stays aligned with the sheets on screen; joinAnswer() skips untouched ("") sheets
    commit();
  };

  const addSheet = () => {
    if (storeRef.current.sheets.length >= MAX_SHEETS_PER_QUESTION) return;
    storeRef.current.sheets = [...storeRef.current.sheets, { png: "", tpl: K.defaultTpl }];
    setSheets((s) => (s.length < MAX_SHEETS_PER_QUESTION ? [...s, { png: "", tpl: K.defaultTpl }] : s));
  };
  const unlock = () => {
    setOpen(true);
    setSheets((s) => {
      if (s.length) return s;
      storeRef.current.sheets = [{ png: "", tpl: K.defaultTpl }];
      return [{ png: "", tpl: K.defaultTpl }];
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* eslint-disable-next-line react-hooks/refs -- the callback only touches the ref inside the event handler */}
      {renderText({
        id: qid,
        initialValue: initial.html,
        onChange: (html) => { storeRef.current.html = html; commit(); },
      })}

      {!open ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", borderRadius: 12, border: "1px dashed var(--primary)", background: "var(--primary-tint)" }}>
          <Icon size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: "var(--text)" }}>
            <strong>{K.banner}</strong> {K.help}
          </div>
          <button type="button" onClick={unlock} data-testid={K.testId}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            Unlock drawing pad
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sheets.map((s, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                <Icon size={15} color="var(--primary)" /> {K.sheet} {i + 1}
                {i > 0 && i === sheets.length - 1 && (
                  <button type="button" title="Remove this sheet" aria-label="Remove this sheet"
                    onClick={() => { storeRef.current.sheets = storeRef.current.sheets.filter((_, j) => j !== i); setSheets((a) => a.filter((_, j) => j !== i)); commit(); }}
                    style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-secondary)", borderRadius: 8, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}>
                    <X size={13} /> Remove
                  </button>
                )}
              </div>
              <Suspense fallback={<div style={{ padding: 20, fontSize: 13, color: "var(--text-secondary)" }}>Loading the drawing pad…</div>}>
                <Pad
                  initialPng={s.png}
                  initialTemplate={s.tpl || K.defaultTpl}
                  onChange={(png, tpl) => onSheet(i, png, tpl)}
                />
              </Suspense>
            </div>
          ))}
          {sheets.length < MAX_SHEETS_PER_QUESTION && (
            <button type="button" onClick={addSheet}
              style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={15} /> Add another sheet
            </button>
          )}
        </div>
      )}
    </div>
  );
}
