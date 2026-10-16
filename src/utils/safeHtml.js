/* ═══════════════════════════════════════════════════════════
   safeHtml — allow-list sanitizer for student-authored answer HTML.

   Essay answers are stored as raw HTML (contentEditable innerHTML) and are
   later rendered with dangerouslySetInnerHTML on the teacher marking screens
   and the student's marked paper. Anything a student pastes or injects would
   otherwise run in a teacher's session, so every render of that HTML goes
   through this first.

   Keeps: basic text formatting, lists, tables (incl. colspan/rowspan), and the
   teacher's own highlight markup (<mark class="hl-mark" data-*> + the
   ✓/✗ badge <span class="hl-status">), so a saved marked-up answer survives.
   Drops: scripts/styles/iframes/etc. entirely, every event-handler or style
   attribute, links, images, and any class/data attribute not on the list.
   Unknown-but-harmless tags are unwrapped (their text is kept).
═══════════════════════════════════════════════════════════ */

const ALLOWED_TAGS = new Set([
  "P", "DIV", "BR", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP",
  "UL", "OL", "LI", "BLOCKQUOTE",
  "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION", "COLGROUP", "COL",
  "MARK", "IMG",
]);

// Removed together with everything inside them.
const DROP_WITH_CONTENT = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "TEMPLATE", "SVG", "MATH",
  "LINK", "META", "FORM", "INPUT", "TEXTAREA", "SELECT", "BUTTON", "VIDEO", "AUDIO", "CANVAS",
]);

const ALLOWED_CLASSES = new Set(["hl-mark", "hl-status"]);
const ALLOWED_DATA = new Set(["data-hid", "data-mark", "data-fullmark", "data-status", "data-music-sheet", "data-tpl"]);

// A music-paper drawing sheet: PNG data URL only, capped so one answer can't be abused.
const MUSIC_SRC_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const MUSIC_SRC_MAX = 3_000_000;
const SPAN_ATTRS = new Set(["colspan", "rowspan"]);

const cleanNode = (node, doc, opts) => {
  const out = doc.createDocumentFragment();
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) { // text
      out.appendChild(doc.createTextNode(child.nodeValue));
      continue;
    }
    if (child.nodeType !== 1) continue; // comments etc.

    const tag = child.tagName.toUpperCase();
    if (DROP_WITH_CONTENT.has(tag)) continue;

    if (!ALLOWED_TAGS.has(tag)) {
      out.appendChild(cleanNode(child, doc, opts)); // unwrap
      continue;
    }

    if (tag === "IMG") {
      const src = child.getAttribute("src") || "";
      if (src.length > MUSIC_SRC_MAX || !MUSIC_SRC_RE.test(src)) continue; // any other image is dropped
      const img = doc.createElement("img");
      img.setAttribute("src", src);
      img.setAttribute("data-music-sheet", "1");
      const tplTok = child.getAttribute("data-tpl") || "";
      if (/^[\w-]{1,24}$/.test(tplTok)) img.setAttribute("data-tpl", tplTok);
      img.setAttribute("alt", "Music sheet drawn by the student");
      out.appendChild(img);
      continue;
    }

    const el = doc.createElement(tag.toLowerCase());
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (name === "class") {
        const kept = attr.value.split(/\s+/).filter((c) => ALLOWED_CLASSES.has(c));
        if (kept.length) el.setAttribute("class", kept.join(" "));
      } else if (ALLOWED_DATA.has(name)) {
        // plain tokens only (ids, numbers, "correct"/"wrong")
        if (/^[\w.\-]{0,64}$/.test(attr.value)) el.setAttribute(name, attr.value);
      } else if (name === "title" && !opts.stripTitles && (tag === "MARK" || tag === "SPAN") && attr.value.length <= 100) {
        el.setAttribute("title", attr.value); // tooltip on highlight / ✓✗ badge
      } else if (SPAN_ATTRS.has(name) && (tag === "TD" || tag === "TH")) {
        const n = parseInt(attr.value, 10);
        if (n > 0 && n <= 50) el.setAttribute(name, String(n));
      }
    }
    el.appendChild(cleanNode(child, doc, opts));
    out.appendChild(el);
  }
  return out;
};

export function sanitizeHtml(html, opts = {}) {
  if (!html || typeof html !== "string") return "";
  if (typeof DOMParser === "undefined") {
    // No DOM available (SSR/tests) — fail closed to escaped text.
    return html.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const parsed = new DOMParser().parseFromString(html, "text/html"); // inert: scripts never run, images never load
  const wrapper = parsed.createElement("div");
  wrapper.appendChild(cleanNode(parsed.body, parsed, opts));
  return wrapper.innerHTML;
}

/** True when a stored answer already contains markup (vs. a legacy plain-text answer). */
export const looksLikeHtml = (s) => typeof s === "string" && /<\/?[a-z][\s\S]*>/i.test(s);

/** HTML-escape + keep line breaks, for legacy plain-text answers. */
export const plainTextToHtml = (s) =>
  String(s ?? "")
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
    .replace(/\r?\n/g, "<br>");

/** Sanitised HTML for any stored essay answer, plain-text or rich. */
export const answerToSafeHtml = (s, opts) => (looksLikeHtml(s) ? sanitizeHtml(s, opts) : plainTextToHtml(s));
