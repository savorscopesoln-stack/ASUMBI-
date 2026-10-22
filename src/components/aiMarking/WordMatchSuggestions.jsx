import { useMemo, useState } from "react";
import { suggestFromGuide, htmlToText, STRICTNESS } from "../../utils/wordMatch";

/* =========================================================================
   WORD-MATCH SUGGESTIONS — replaces the old credit-based "AI marking" tools.

   It only SUGGESTS. The teacher approves a suggestion and the mark is then
   saved exactly like a manually given mark; nothing is ever marked on its own,
   and nothing is charged. See utils/wordMatch.js for how the match works.

   Two pieces, both driven by props from the marking page:
     <WordMatchHint>   a small card for the answer being marked right now
     default export    a collapsible panel that suggests for every unmarked answer
   Props they share
     strictness / onStrictness   "strict" | "normal" | "lenient"
     onApprove(pairs)            pairs = [[answerId, mark], …] — the page saves them
========================================================================= */

const box = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius, 12px)" };
const muted = { color: "var(--text-muted, #7a6a6a)", fontSize: 12 };
const GREEN = "var(--success, #22c55e)";
const RED = "var(--destructive, #ef4444)";

const btn = (primary) => ({
  padding: "7px 14px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
  border: primary ? "none" : "1px solid var(--border)",
  background: primary ? "var(--primary, #6366f1)" : "transparent", color: primary ? "var(--on-primary, #fff)" : "var(--text)",
});

function Chips({ words, color }) {
  if (!words.length) return <span style={muted}>none</span>;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {words.map((w) => (
        <span key={w} style={{
          fontSize: 11.5, fontWeight: 600, padding: "1px 8px", borderRadius: 99, color,
          background: `color-mix(in srgb, ${color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        }}>{w}</span>
      ))}
    </span>
  );
}

function StrictnessSelect({ value, onChange }) {
  return (
    <label style={{ ...muted, display: "inline-flex", alignItems: "center", gap: 6 }}>
      Strictness
      <select value={value} title={(STRICTNESS[value] || STRICTNESS.normal).hint} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 12 }}>
        {Object.entries(STRICTNESS).map(([k, v]) => <option key={k} value={k} title={v.hint}>{v.label}</option>)}
      </select>
    </label>
  );
}

function Breakdown({ result }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      {result.note && <div style={muted}>{result.note}</div>}
      {result.points.map((p, i) => (
        <div key={i} style={{ fontSize: 12.5, lineHeight: 1.45 }}>
          <div style={{ fontWeight: 700, color: p.credit === 1 ? GREEN : p.credit > 0 ? "var(--warning, #f59e0b)" : RED }}>
            {p.credit === 1 ? "✓" : p.credit > 0 ? "≈" : "✗"} {p.text}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 2 }}>
            <Chips words={p.matched} color={GREEN} />
            {p.missing.length > 0 && <Chips words={p.missing} color={RED} />}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- the answer being marked right now ---------- */
export function WordMatchHint({ item, strictness, onStrictness, onApprove }) {
  const result = useMemo(
    () => (item ? suggestFromGuide({ answerHtml: item.essay_answer, guideText: item.marking_guide, maxMarks: item.max_marks, strictness }) : null),
    [item, strictness],
  );
  if (!item) return null;
  return (
    <div style={{ ...box, padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>Suggested mark · word match</div>
        <span style={{ marginLeft: "auto" }}><StrictnessSelect value={strictness} onChange={onStrictness} /></span>
      </div>
      {!result.ok ? (
        <div style={{ ...muted, marginTop: 8 }}>{result.reason}</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--primary, #6366f1)" }}>{result.suggested}<span style={{ fontSize: 15, color: "var(--text-muted)" }}>/{result.max}</span></div>
            <div style={muted}>{Math.round(result.coverage * 100)}% of the guide's key words found</div>
            <button type="button" style={{ ...btn(true), marginLeft: "auto" }}
              title="Give this mark and move on to the next answer"
              onClick={() => onApprove([[item.id, result.suggested]])}>
              Approve {result.suggested}/{result.max} &amp; next
            </button>
          </div>
          <details style={{ marginTop: 6 }}>
            <summary style={{ ...muted, cursor: "pointer" }}>Why this mark?</summary>
            <Breakdown result={result} />
          </details>
        </>
      )}
    </div>
  );
}

/* ---------- every unmarked answer ---------- */
export default function WordMatchSuggestions({ items = [], strictness, onStrictness, onApprove, onOpen }) {
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState(null);          // strictness the list was computed with (null = not yet)
  const [dismissed, setDismissed] = useState(() => new Set());

  const rows = useMemo(() => {
    if (!ran) return [];
    return items
      .map((item) => ({ item, result: suggestFromGuide({ answerHtml: item.essay_answer, guideText: item.marking_guide, maxMarks: item.max_marks, strictness: ran }) }))
      .filter((r) => !dismissed.has(r.item.id));
  }, [items, ran, dismissed]);

  const usable = rows.filter((r) => r.result.ok);
  const skipped = rows.length - usable.length;

  const approveRows = (list) => {
    if (!list.length) return;
    onApprove(list.map((r) => [r.item.id, r.result.suggested]));
  };

  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} style={{ ...box, marginTop: 24, padding: "12px 18px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--text)" }}>Suggested marks — word match</summary>
      {open && (
        <div style={{ marginTop: 14 }}>
          <p style={{ ...muted, margin: "0 0 12px", lineHeight: 1.5 }}>
            Compares each unmarked answer with its marking guide, word by word, and suggests a mark. Nothing is marked until you approve it.
            Word matching cannot judge meaning, so check the suggestions you are unsure about.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <StrictnessSelect value={strictness} onChange={onStrictness} />
            <button type="button" style={btn(true)} disabled={!items.length}
              onClick={() => { setRan(strictness); setDismissed(new Set()); }}>
              {ran ? "Suggest again" : `Suggest marks for ${items.length} unmarked answer${items.length === 1 ? "" : "s"}`}
            </button>
            {usable.length > 0 && (
              <button type="button" style={btn(false)}
                onClick={() => { if (window.confirm(`Approve all ${usable.length} suggested marks?`)) approveRows(usable); }}>
                Approve all ({usable.length})
              </button>
            )}
          </div>
          {ran && ran !== strictness && <div style={{ ...muted, marginBottom: 8 }}>Strictness changed — press “Suggest again” to apply it.</div>}
          {ran && !rows.length && <div style={muted}>No suggestions left to review.</div>}
          {skipped > 0 && <div style={{ ...muted, marginBottom: 8 }}>{skipped} answer{skipped === 1 ? "" : "s"} can't be compared (no marking guide) and {skipped === 1 ? "is" : "are"} left for you to mark.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto" }}>
            {usable.map(({ item, result }) => {
              const q = htmlToText(item.question_text).slice(0, 80);
              const a = htmlToText(item.essay_answer).slice(0, 110);
              return (
                <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--primary, #6366f1)", minWidth: 54 }}>{result.suggested}<span style={{ fontSize: 12, color: "var(--text-muted)" }}>/{result.max}</span></div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{q || "Question"}{q.length >= 80 ? "…" : ""}</div>
                      <div style={{ ...muted, marginTop: 1 }}>{a ? `“${a}${a.length >= 110 ? "…" : ""}”` : "(blank answer)"}</div>
                    </div>
                    {onOpen && <button type="button" style={btn(false)} onClick={() => onOpen(item.id)}>Open</button>}
                    <button type="button" style={btn(false)} onClick={() => setDismissed((d) => new Set(d).add(item.id))}>Skip</button>
                    <button type="button" style={btn(true)} onClick={() => approveRows([{ item, result }])}>Approve</button>
                  </div>
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ ...muted, cursor: "pointer" }}>Matched {result.matched.length} · missing {result.missing.length}</summary>
                    <Breakdown result={result} />
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </details>
  );
}
