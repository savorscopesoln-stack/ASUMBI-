/* ═══════════════════════════════════════════════════════════
   musicAnswer — drawing sheets inside a stored essay answer.

   A music-paper answer is still ONE string in `essay_answer`, exactly like
   every other essay answer, so autosave, the offline cache, submit, marking,
   the marked paper and exports all keep working with no new column:

       <typed text html> <p><img data-music-sheet="1" data-tpl="treble"
                              src="data:image/png;base64,…" alt="Music sheet"></p> …

   Each drawing is a flattened PNG (staves + notes + ink), so a marker simply
   sees what the student drew. Only PNG data URLs are ever produced or accepted
   (see safeHtml.js, which enforces the same rule when the answer is rendered).
═══════════════════════════════════════════════════════════ */

export const MAX_SHEETS_PER_QUESTION = 3;

// One <img data-music-sheet …> optionally wrapped in a <p>.
const SHEET_RE =
  /(?:<p>\s*)?<img\b[^>]*\bdata-music-sheet="1"[^>]*>(?:\s*<\/p>)?/gi;
const SRC_RE = /\bsrc="(data:image\/png;base64,[A-Za-z0-9+/=]+)"/i;
const TPL_RE = /\bdata-tpl="([\w-]{1,24})"/i;

/** Split a stored answer into its typed-text HTML and its drawing sheets. */
export function splitAnswer(answer) {
  const str = typeof answer === "string" ? answer : "";
  if (!str || !str.includes("data-music-sheet")) return { html: str, sheets: [] };
  const sheets = [];
  const html = str.replace(SHEET_RE, (tag) => {
    const src = tag.match(SRC_RE);
    if (src) sheets.push({ png: src[1], tpl: (tag.match(TPL_RE) || [])[1] || "blank" });
    return "";
  });
  return { html, sheets: sheets.slice(0, MAX_SHEETS_PER_QUESTION) };
}

/** Build the stored answer from typed-text HTML plus drawing sheets. */
export function joinAnswer(html, sheets) {
  const text = typeof html === "string" ? html : "";
  const imgs = (sheets || [])
    .filter((s) => s && typeof s.png === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s.png))
    .slice(0, MAX_SHEETS_PER_QUESTION)
    .map((s) => `<p><img data-music-sheet="1" data-tpl="${/^[\w-]{1,24}$/.test(s.tpl || "") ? s.tpl : "blank"}" src="${s.png}" alt="Music sheet"></p>`)
    .join("");
  return text + imgs;
}

/** True when the answer holds at least one drawing. */
export const hasDrawing = (answer) => typeof answer === "string" && answer.includes("data-music-sheet");
