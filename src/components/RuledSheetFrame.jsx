import React, { useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   RuledSheetFrame — the READ-ONLY twin of the student's answer box.

   The student types on ruled exercise-book paper (see
   pages/Student/TakeEAssessment.jsx → EssayEditor and src/ruled-paper.css).
   This frame puts the teacher's marking view on the very same paper —
   same bar / paper / word-count footer — but without a toolbar, so the
   answer can be read and highlighted, never edited.

   `html` is only used to count words/characters (it is the student's raw
   answer; nothing here is rendered as HTML). `children` is the paper itself.
═══════════════════════════════════════════════════════════ */
const TOOLS = [
  ["↶", "Undo"], ["↷", "Redo"], "sep",
  [<b key="b">B</b>, "Bold"], [<i key="i">I</i>, "Italic"], [<u key="u">U</u>, "Underline"], [<s key="s">S</s>, "Strikethrough"], "sep",
  ["X₂", "Subscript"], ["X²", "Superscript"], "sep",
  ["•—", "Bulleted list"], ["1.—", "Numbered list"], ["⇤", "Decrease indent"], ["⇥", "Increase indent"], "sep",
  ["Tx", "Clear formatting"], "sep", ["▦ Table", "Insert table"],
];

export default function RuledSheetFrame({ html, label = "Student's answer", children }) {
  const { words, chars } = useMemo(() => {
    try {
      const spaced = String(html || "").replace(/<\/(p|div|li|td|th|tr)>|<br\s*\/?>/gi, " $&");
      const text = new DOMParser().parseFromString(spaced, "text/html").body.textContent || "";
      const trimmed = text.trim();
      return { words: trimmed ? trimmed.split(/\s+/).length : 0, chars: text.replace(/\s+/g, " ").trim().length };
    } catch {
      return { words: 0, chars: 0 };
    }
  }, [html]);

  return (
    <div className="ruled-sheet">
      {/* the student's toolbar, switched off */}
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", padding: "6px 8px", borderBottom: "1px solid var(--border)", background: "var(--card, var(--bg))" }}>
        {TOOLS.map((t, i) => (t === "sep"
          ? <span key={`s${i}`} style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px", flexShrink: 0 }} />
          : <button key={t[1]} type="button" disabled tabIndex={-1} title={t[1]} style={{ minWidth: 30, height: 30, padding: "0 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 13, opacity: 0.4, cursor: "not-allowed" }}>{t[0]}</button>))}
      </div>
      <div className="ruled-sheet__bar">
        <span>{label}</span>
        <span className="ruled-sheet__badge" title="The marker cannot change the student's answer — only highlight it.">Read only</span>
      </div>
      {children}
      <div className="ruled-sheet__foot">
        <span>Words: {words}</span>
        <span>Characters: {chars}</span>
      </div>
    </div>
  );
}
