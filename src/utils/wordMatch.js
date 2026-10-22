/* =========================================================================
   WORD MATCH — a deliberately simple marking SUGGESTION.

   It compares the student's answer with the question's marking guide and
   proposes a mark. It never marks anything by itself: a suggestion only
   becomes a mark when the teacher approves it.

   How it works
     1. The marking guide is split into marking POINTS: one per line / bullet /
        numbered item / ";" — or, if it is a single paragraph, one per sentence.
     2. Each point is reduced to its KEY WORDS (everyday words like "the", "and",
        "is" are dropped; plurals and endings like -ing / -ed are ignored, so
        "reflecting" matches "reflection").
     3. A point is CREDITED when enough of its key words appear in the answer
        (strictness decides how many; "Basic" needs just one); getting close to
        that earns half a point (not used by Basic).
     4. Suggested mark = max marks × credited points ÷ points, rounded.

   It cannot understand meaning — it only counts words — which is why the
   result is a suggestion for the teacher to approve, not a mark.
========================================================================= */

// Listed from most lenient to strictest (the order the drop-down shows them).
//   basic   — a point is credited as soon as AT LEAST ONE of its key words is found (no half points)
//   others  — a point is credited when `threshold` of its key words are found
export const STRICTNESS = {
  basic:   { label: "Basic",   minWords: 1, hint: "a point is given if even one of its key words appears" },
  lenient: { label: "Lenient", threshold: 0.35, hint: "a point needs about a third of its key words" },
  normal:  { label: "Normal",  threshold: 0.5,  hint: "a point needs about half of its key words" },
  strict:  { label: "Strict",  threshold: 0.7,  hint: "a point needs about 70% of its key words" },
};

const STOP = new Set((
  "a about above after again all also am an and any are as at be because been before being below between both but by " +
  "can could did do does doing down during each few for from further had has have having he her here hers herself him " +
  "himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other " +
  "our ours ourselves out over own same she should so some such than that the their theirs them themselves then there " +
  "these they this those through to too under until up very was we were what when where which while who whom why will " +
  "with would you your yours yourself yourselves e.g eg ie etc may might must shall thus hence however also like one two " +
  "give gives given state states describe explain mention marks mark point points award accept allow credit answer answers " +
  "student candidate any other idea ideas"
).split(/\s+/));

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };

/** Plain text of an HTML snippet, with line breaks kept for block elements. */
export function htmlToText(html) {
  return String(html ?? "")
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n+ */g, "\n")
    .trim();
}

/** Very light stemmer: enough that plurals / -ing / -ed / -ly forms meet in the middle. */
export function stem(word) {
  let w = String(word).toLowerCase();
  if (/^\d+([.,]\d+)?$/.test(w)) return w;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 5 && w.endsWith("ly")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

function tokens(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+(?:['’.,][a-z0-9]+)*/g) || [])
    .map((t) => t.replace(/['’]s$/, "").replace(/['’]/g, ""));
}

/** Key words of a piece of text → Map(stem → first original spelling). */
function keyWords(text) {
  const out = new Map();
  for (const t of tokens(text)) {
    const isNum = /^\d/.test(t);
    if (!isNum && (t.length < 3 || STOP.has(t))) continue;
    const s = stem(t);
    if (s.length < (isNum ? 1 : 3)) continue;
    if (!out.has(s)) out.set(s, t);
  }
  return out;
}

function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

/** Does this key-word stem appear in the answer (exactly, or as a close variant)? */
function appearsIn(stemmed, answerStems) {
  if (answerStems.has(stemmed)) return true;
  if (/^\d/.test(stemmed) || stemmed.length < 5) return false;
  for (const s of answerStems) {
    if (s.length < 5 || /^\d/.test(s)) continue;
    if (commonPrefix(stemmed, s) >= Math.max(5, Math.ceil(0.8 * Math.min(stemmed.length, s.length)))) return true;
  }
  return false;
}

const BULLET = /^\s*(?:[-–—*•▪◦·]+|\(?\d{1,2}[.)]|\(?[a-zA-Z][.)])\s+/;

/** Marking guide → list of marking points (strings). */
export function splitPoints(guideText) {
  const text = htmlToText(guideText);
  if (!text) return [];
  const usable = (s) => keyWords(s).size > 0;
  let parts = text.split(/\n|;|•/).map((l) => l.replace(BULLET, "").trim()).filter(usable);
  if (parts.length < 2) {
    // split only where a full stop / ? / ! is followed by a space, so "9.8" stays whole
    const sentences = text.replace(/([.!?])\s+/g, "$1\n").split("\n").map((l) => l.replace(BULLET, "").trim()).filter(usable);
    if (sentences.length > parts.length) parts = sentences;
  }
  return parts;
}

/**
 * Suggest a mark.
 *   { answerHtml, guideText, maxMarks, strictness: "strict"|"normal"|"lenient" }
 * → { ok:true, suggested, max, coverage, points:[{ text, ratio, credit, matched[], missing[] }], matched[], missing[] }
 *   { ok:false, reason }   when there is nothing to compare (no guide, blank answer, …)
 */
export function suggestFromGuide({ answerHtml, guideText, maxMarks, strictness = "normal" }) {
  const max = Number(maxMarks);
  if (!Number.isFinite(max) || max <= 0) return { ok: false, reason: "This question has no maximum mark." };
  const points = splitPoints(guideText);
  if (!points.length) return { ok: false, reason: "There is no marking guide to compare with." };

  const answer = htmlToText(answerHtml);
  const answerTokens = tokens(answer);
  const answerStems = new Set(answerTokens.map(stem));
  const level = STRICTNESS[strictness] || STRICTNESS.normal;
  const { threshold } = level;

  const detail = points.map((text) => {
    const terms = keyWords(text);
    const matched = [];
    const missing = [];
    for (const [s, original] of terms) (appearsIn(s, answerStems) ? matched : missing).push(original);
    const ratio = terms.size ? matched.length / terms.size : 0;
    const credit = level.minWords
      ? (matched.length >= Math.min(level.minWords, terms.size) && matched.length > 0 ? 1 : 0)
      : ratio >= threshold ? 1 : ratio >= threshold * 0.75 ? 0.5 : 0;
    return { text, ratio, credit, matched, missing };
  });

  const matched = [...new Set(detail.flatMap((p) => p.matched))];
  const missing = [...new Set(detail.flatMap((p) => p.missing))].filter((m) => !matched.includes(m));
  const earned = detail.reduce((sum, p) => sum + p.credit, 0);
  const total = matched.length + missing.length;

  if (answerTokens.length < 2) {
    return { ok: true, suggested: 0, max, coverage: 0, points: detail, matched: [], missing: [...new Set(detail.flatMap((p) => p.matched.concat(p.missing)))], note: "The answer is blank or a single word." };
  }
  const suggested = Math.max(0, Math.min(max, Math.round((max * earned) / detail.length)));
  return { ok: true, suggested, max, coverage: total ? matched.length / total : 0, points: detail, matched, missing };
}
