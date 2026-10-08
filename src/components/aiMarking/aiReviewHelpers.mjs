/* =========================================================================
   AI REVIEW — pure helpers for AiReviewPanel.jsx. No React, no DOM, no network.
   (An .mjs file so the backend test suite can import and unit-test it.)

   The SERVER is the authority on every mark: it re-validates everything and
   refuses anything wrong. These helpers only give the teacher immediate,
   accurate feedback before they press save, using the same rules:
     - criterion marks: a number from 0 to that criterion's maximum, at most 2 dp
     - the total must be a WHOLE number (official marks are whole numbers — D1)
     - the total must not exceed the question's maximum
========================================================================= */

const cents = (n) => Math.round(Number(n) * 100);
export const isWhole = (n) => Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-9;
const isTwoDp = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

/** Text typed into a mark box -> number, or null when empty, or NaN when not a number. */
export function parseMark(text) {
  const t = String(text ?? "").trim().replace(",", ".");
  if (t === "") return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

/** The two nearest whole marks to a fractional total, kept inside [0, max]. */
export function wholeOptions(total, max) {
  const m = Math.floor(Number(max));
  const lo = Math.max(0, Math.min(m, Math.floor(total)));
  const hi = Math.max(0, Math.min(m, Math.ceil(total)));
  return lo === hi ? [lo] : [lo, hi];
}

/**
 * edits: { criterionId: "text typed" }  (absent or "" = leave the AI's mark)
 * Returns the criterion marks that would be sent, which ones changed, the total,
 * and a list of problems in plain words (empty = valid).
 */
export function evaluateEdits(criteria, edits, maxMarks) {
  const problems = [];
  const marks = {};      // only the CHANGED ones — what the API wants
  let total = 0;
  let anyChange = false;
  let fieldErrors = 0;   // boxes that hold something unusable (vs. a total that is merely not whole)
  let touched = false;   // the teacher typed something in at least one box
  for (const c of criteria) {
    const raw = edits ? edits[c.criterionId] : undefined;
    const parsed = parseMark(raw);
    let value = c.aiMarks;
    if (parsed !== null) {
      touched = true;
      if (Number.isNaN(parsed)) { problems.push(`"${c.label}": enter a number`); fieldErrors += 1; }
      else if (cents(parsed) > cents(c.maxMarks)) { problems.push(`"${c.label}": at most ${c.maxMarks}`); fieldErrors += 1; }
      else if (!isTwoDp(parsed)) { problems.push(`"${c.label}": at most 2 decimal places`); fieldErrors += 1; }
      else {
        value = parsed;
        if (cents(parsed) !== cents(c.aiMarks)) { marks[c.criterionId] = parsed; anyChange = true; }
      }
    }
    total += cents(value);
  }
  total /= 100;
  if (!problems.length) {
    if (total > maxMarks) problems.push(`The total ${total} is above the question's maximum of ${maxMarks}`);
    else if (!isWhole(total)) problems.push(`The total ${total} is not a whole number. Official marks are whole numbers — adjust a criterion or choose a whole mark.`);
  }
  return { marks, total, anyChange, touched, fieldErrors, problems, valid: problems.length === 0 };
}

/** A directly typed overall mark: must be a whole number from 0 to max. Returns { value, problem }. */
export function evaluateDirectMark(text, maxMarks) {
  const v = parseMark(text);
  if (v === null) return { value: null, problem: null };
  if (Number.isNaN(v)) return { value: null, problem: "Enter a whole number" };
  if (!isWhole(v)) return { value: null, problem: "The overall mark must be a whole number" };
  if (v > maxMarks) return { value: null, problem: `At most ${maxMarks}` };
  return { value: v, problem: null };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split the (plain) answer into [{ text, hit }] so the AI's evidence quotes can
 * be shown highlighted. Matching is forgiving about case and whitespace (the
 * model quotes with normal spaces; the answer may have line breaks) but never
 * invents a match: a quote that is not really in the text simply is not marked.
 * Overlapping and adjacent matches merge into one highlight.
 */
export function highlightSegments(text, quotes) {
  const src = String(text ?? "");
  if (!src) return [];
  const ranges = [];
  for (const q of quotes || []) {
    const words = String(q ?? "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const re = new RegExp(words.map(escapeRe).join("\\s+"), "gi");
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m[0].length === 0) { re.lastIndex += 1; continue; }
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  if (!ranges.length) return [{ text: src, hit: false }];
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [ranges[0].slice()];
  for (const [s, e] of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const out = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) out.push({ text: src.slice(pos, s), hit: false });
    out.push({ text: src.slice(s, e), hit: true });
    pos = e;
  }
  if (pos < src.length) out.push({ text: src.slice(pos), hit: false });
  return out;
}

/** What the server's error codes mean to a teacher. Unknown codes fall back to the server's own message. */
const MESSAGES = {
  ANSWER_ALREADY_MARKED: "This answer has already been marked, so the AI suggestion no longer applies.",
  SUBMISSION_RELEASED: "This submission's results have been released; the suggestion can no longer be applied.",
  ANSWER_CHANGED: "The student's answer has changed since the AI marked it. Request a new evaluation or mark it yourself.",
  ALREADY_REVIEWED: "This suggestion has already been reviewed.",
  NOT_REVIEWABLE: "There is no AI suggestion for this answer. Mark it yourself — nothing was charged.",
  NEEDS_WHOLE_MARK: "The AI's total is not a whole number. Choose a whole mark below.",
  NOT_FOUND: "That evaluation could not be found.",
  UNAUTHENTICATED: "Please sign in again.",
};
export function errorMessage(code, serverMessage) {
  return MESSAGES[code] || serverMessage || "Something went wrong. Nothing was changed.";
}

export const FLAG_TEXT_FALLBACK = "The AI flagged this answer for a closer look.";
