/* ═══════════════════════════════════════════════════════════
   markingSync — fast marking: local cache first, database every 30s.

   Marking a question used to wait for a database round-trip before the
   teacher could move on. Now a marked question is written to a local
   "pending" cache (localStorage) instantly, and every PENDING_FLUSH_MS the
   whole batch is sent to the database in one request. If the teacher
   leaves (closes the tab, navigates away, backgrounds the page) the cache
   is already on disk, and a last flush is attempted on the way out; anything
   that didn't make it is re-sent the next time the marking page opens.

   Also holds the "wrong" helpers: an answer left with no highlights is
   wrapped in a red ✗ mark so it visibly reads as wrong to the teacher and
   to the student.
═══════════════════════════════════════════════════════════ */
import API, { BASE_URL } from "../api";
import { sanitizeHtml } from "./safeHtml";

export const PENDING_FLUSH_MS = 30000;

const PENDING_PREFIX = "mkp_pending_";
// Browsers cap keepalive request bodies at ~64KB; stay under it.
const KEEPALIVE_LIMIT = 60000;

/* ── pending-commit cache ───────────────────────────────────
   Shape: { [answerId]: { score, remark, highlights, essayHTML, musicAnn?, queuedAt } } */
export function readPending(assessmentId) {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + assessmentId);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePending(assessmentId, obj) {
  try {
    if (!obj || !Object.keys(obj).length) localStorage.removeItem(PENDING_PREFIX + assessmentId);
    else localStorage.setItem(PENDING_PREFIX + assessmentId, JSON.stringify(obj));
  } catch {
    /* storage full/unavailable — the 30s flush still sends from memory-backed state */
  }
}

export function queuePending(assessmentId, answerId, payload) {
  const all = readPending(assessmentId);
  all[answerId] = { ...payload, queuedAt: Date.now() };
  writePending(assessmentId, all);
}

export function pendingCount(assessmentId) {
  return Object.keys(readPending(assessmentId)).length;
}

/* Drops only marks queued at or before `ts` — a mark made while a bulk save
   was in flight must stay cached. */
export function clearPendingBefore(assessmentId, ts) {
  const now = readPending(assessmentId);
  for (const [id, p] of Object.entries(now)) {
    if ((p.queuedAt || 0) <= ts) delete now[id];
  }
  writePending(assessmentId, now);
}

function toBody(entries) {
  const body = { scores: {}, remarks: {}, highlights: {}, essayHTML: {} };
  for (const [id, p] of Object.entries(entries)) {
    body.scores[id] = Number(p.score) || 0;
    body.remarks[id] = p.remark || "";
    body.highlights[id] = p.highlights || [];
    body.essayHTML[id] = p.essayHTML || "";
    // music paper: red-pen overlays travel with the mark (only for answers that have a drawing)
    if (Array.isArray(p.musicAnn)) (body.musicAnnotations ||= {})[id] = p.musicAnn;
  }
  return body;
}

const inflight = new Map();

/* Sends every pending mark to the database in one request. Entries are only
   dropped from the cache once the server confirmed them, and only if they
   haven't been re-marked in the meantime. Throws on failure (cache is kept). */
export function flushPending(assessmentId) {
  if (inflight.has(assessmentId)) return inflight.get(assessmentId);
  const snapshot = readPending(assessmentId);
  const ids = Object.keys(snapshot);
  if (!ids.length) return Promise.resolve(0);

  const p = API.post("/e-assessments/save-marking", toBody(snapshot))
    .then(() => {
      const now = readPending(assessmentId);
      for (const id of ids) {
        if (now[id] && now[id].queuedAt === snapshot[id].queuedAt) delete now[id];
      }
      writePending(assessmentId, now);
      return ids.length;
    })
    .finally(() => inflight.delete(assessmentId));
  inflight.set(assessmentId, p);
  return p;
}

/* Last-chance flush while the page is going away. fetch+keepalive can
   outlive the page; the cache stays on disk either way, so a body too big
   for keepalive is simply re-sent on the next visit. */
export function flushPendingOnExit(assessmentId) {
  const snapshot = readPending(assessmentId);
  if (!Object.keys(snapshot).length) return;
  try {
    const body = JSON.stringify(toBody(snapshot));
    if (body.length > KEEPALIVE_LIMIT) return;
    const token = localStorage.getItem("token");
    fetch(`${BASE_URL}/e-assessments/save-marking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* nothing more can be done at unload time */
  }
}

/* Overlays still-unsent marks onto freshly loaded DB rows, so a mark that
   never reached the database (offline, closed too fast) is not shown as
   unmarked again. */
export function applyPendingToRow(item, pending) {
  const p = pending && pending[item.id];
  if (!p) return item;
  return {
    ...item,
    marks_awarded: Number(p.score) || 0,
    remarks: p.remark || item.remarks,
    highlights: p.highlights && p.highlights.length ? JSON.stringify(p.highlights) : null,
    highlighted_html: p.highlights && p.highlights.length ? p.essayHTML : null,
    ...(Array.isArray(p.musicAnn) ? { music_annotations: p.musicAnn } : {}),
  };
}

/* ── "wrong" marking ──────────────────────────────────────── */
export const AUTO_WRONG_PREFIX = "wrong_";

export const isAutoWrongId = (hid) => typeof hid === "string" && hid.startsWith(AUTO_WRONG_PREFIX);

/* An answer needs the whole-answer ✗ when the teacher moved on without
   highlighting anything and without typing a score. */
export function needsAutoWrong(highlightList, score) {
  const real = (highlightList || []).filter((h) => !h.prior);
  return real.length === 0 && (Number(score) || 0) === 0;
}

/* ── blank answers ──────────────────────────────────────────
   An answer with no text (empty, only spaces/line breaks, or a table of empty
   cells) and no drawing is blank. Blank answers are never shown to a teacher
   as work to mark: they are scored 0 automatically and carry one big ✗ in the
   answer space. */
export function isBlankAnswerHtml(html) {
  if (html == null) return true;
  const str = String(html);
  if (!str.trim()) return true;
  if (typeof DOMParser === "undefined") return false; // can't tell — treat as an answer
  const body = new DOMParser().parseFromString(str, "text/html").body; // inert
  if (body.querySelector("img, svg, canvas, video, audio, iframe, object, embed")) return false;
  return !(body.textContent || "").replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, "");
}

/* The big ✗ that fills the answer space of a blank answer. */
export const blankXHtml = (answerId) =>
  `<div class="hl-blank-x" data-hid="${AUTO_WRONG_PREFIX}${answerId}_x1" data-status="wrong">✗</div>`;

/* Big X: EVERY point the student wrote is underlined in red and gets its own
   ✗ at the end. Ids are `wrong_<answerId>_x<n>`. Falls back to wrapping the
   whole answer in one mark (id `wrong_<answerId>`) only when the answer has no
   text to split (e.g. a drawing). Returns { html, highlights: [...] } or null
   when there is nothing to mark. */
export const bigXPrefix = (answerId) => `${AUTO_WRONG_PREFIX}${answerId}_x`;
export const isBigXId = (answerId, hid) =>
  typeof hid === "string" && (hid === `${AUTO_WRONG_PREFIX}${answerId}` || hid.startsWith(bigXPrefix(answerId)));

export function buildAutoWrong(answerId, html) {
  if (typeof document === "undefined") return null;
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(html || "");
  if (isBlankAnswerHtml(tmp.innerHTML)) {
    return {
      html: blankXHtml(answerId),
      highlights: [{
        id: `${AUTO_WRONG_PREFIX}${answerId}_x1`, text: "No answer", mark: 0, status: "wrong",
        createdAt: Date.now(), confirmed: true, auto: true, reason: "No answer was given.",
      }],
    };
  }
  const text = (tmp.textContent || "").trim();

  const added = markPoints(tmp, answerId, Infinity, {
    prefix: bigXPrefix(answerId), minChars: 1, auto: "bigx",
    reason: "Marked wrong — no credit for this point.",
  });
  if (added.length) return { html: tmp.innerHTML, highlights: added };

  // nothing splittable: wrap the lot in a single ✗ mark
  const hid = `${AUTO_WRONG_PREFIX}${answerId}`;
  const mark = newWrongMark(hid);
  mark.dataset.auto = "bigx";
  while (tmp.firstChild) mark.appendChild(tmp.firstChild);
  mark.appendChild(wrongBadge());
  tmp.appendChild(mark);
  return {
    html: tmp.innerHTML,
    highlights: [{
      id: hid, text: (text || "Answer").slice(0, 500), mark: 0, status: "wrong",
      createdAt: Date.now(), confirmed: true, auto: true,
      reason: "No marking points were found in this answer.",
    }],
  };
}

/* Removes every big-X mark of one answer (so a reopened answer can be
   highlighted), leaving shortfall ✗s and the teacher's own marks alone. */
export function stripBigXHtml(html, answerId) {
  return stripAutoWrongHtml(html, answerId);
}

/* Removes the whole-answer ✗ again (used when a teacher reopens an answer
   to mark it properly), leaving the student's text untouched. */
export function stripAutoWrongHtml(html, onlyWholeAnswerId) {
  if (typeof document === "undefined" || !html) return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  // a point the teacher flipped to ✓ is theirs now — only strip the ones still wrong.
  // With `onlyWholeAnswerId`, just the whole-answer ✗ wrapper is lifted (the one that
  // blocks highlighting); the per-point red underlines are kept so a reopened
  // question still shows which points earned nothing.
  const sel = onlyWholeAnswerId != null
    ? `[data-hid="${AUTO_WRONG_PREFIX}${onlyWholeAnswerId}"]:not([data-status="correct"]), [data-hid^="${bigXPrefix(onlyWholeAnswerId)}"]:not([data-status="correct"])`
    : `[data-hid^="${AUTO_WRONG_PREFIX}"]:not([data-status="correct"])`;
  const els = tmp.querySelectorAll(sel);
  if (!els.length) return html;
  els.forEach((el) => {
    if (el.classList.contains("hl-blank-x")) { el.remove(); return; }
    const badge = el.querySelector(":scope > .hl-status");
    if (badge) badge.remove();
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  });
  tmp.normalize();
  return tmp.innerHTML;
}

/* ── shortfall marking ─────────────────────────────────────
   A 6-mark question where only 2 points were credited: every OTHER point the
   student wrote (the parts of the answer nobody highlighted) is marked wrong —
   red underline plus a ✗ — up to the marks that were not earned. The same
   pass runs when a teacher finishes a question and when an already-marked
   answer is opened (student marked paper / teacher review), so old marking
   gets the wrongs too. It never touches text that already carries a mark. */
const SHORTFALL_MIN_CHARS = 3;

function newWrongMark(hid) {
  const mark = document.createElement("mark");
  mark.className = "hl-mark";
  mark.dataset.hid = hid;
  mark.dataset.mark = "0";
  mark.dataset.fullmark = "1";
  mark.dataset.status = "wrong";
  mark.dataset.auto = "shortfall";
  return mark;
}

function wrongBadge() {
  const badge = document.createElement("span");
  badge.className = "hl-status";
  badge.dataset.status = "wrong";
  badge.textContent = "✗";
  return badge;
}

// Splits a text node's content into sentence-like points.
function pointsInText(text, minChars = SHORTFALL_MIN_CHARS) {
  const out = [];
  const re = /[^.!?;\n]+[.!?;]*/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (body.replace(/[^A-Za-z0-9]/g, "").length >= minChars) {
      out.push({ start: m.index + lead, end: m.index + lead + body.length, text: body });
    }
  }
  return out;
}

/* Wraps every point in the unmarked text of `root` (up to `budget`) in a red
   ✗ mark. Text already inside a mark is never touched. Returns the highlight
   entries it added. */
function markPoints(root, answerId, budget, { prefix, minChars, auto, reason }) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest(".hl-mark, .hl-status, script, style")) return NodeFilter.FILTER_REJECT;
      if (p.closest("[data-music-sheet]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const added = [];
  for (const node of nodes) {
    if (budget <= 0) break;
    const pts = pointsInText(node.nodeValue, minChars).slice(0, budget);
    if (!pts.length) continue;
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const pt of pts) {
      if (pt.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, pt.start)));
      const hid = `${prefix}${added.length + 1}`;
      const mark = newWrongMark(hid);
      mark.dataset.auto = auto;
      mark.appendChild(document.createTextNode(pt.text));
      mark.appendChild(wrongBadge());
      frag.appendChild(mark);
      added.push({
        id: hid, text: pt.text.slice(0, 500), mark: 0, status: "wrong",
        createdAt: Date.now(), confirmed: true, auto: true, reason,
      });
      cursor = pt.end;
      budget -= 1;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  }
  return added;
}

/* Returns { html, added: [highlight, ...] }. Rule: when the credited marks fall
   short of the question's marks, EVERY point the student wrote that nobody
   highlighted is marked wrong (red underline + ✗) — no cap. `missing` only
   decides whether the rule applies (> 0). */
export function addShortfallWrongs(answerId, html, missing) {
  if (typeof document === "undefined" || !html || !(Number(missing) > 0)) return { html, added: [] };
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const added = markPoints(tmp, answerId, Infinity, {
    prefix: `${AUTO_WRONG_PREFIX}${answerId}_`, minChars: SHORTFALL_MIN_CHARS, auto: "shortfall",
    reason: "Written, but not one of the marking points — no credit.",
  });
  return { html: added.length ? tmp.innerHTML : html, added };
}

/* Clears every mark (the teacher's highlights too) and puts the big X on the
   whole answer. Used by the ✗ quick-mark button. */
export function stripAllMarksHtml(html) {
  if (typeof document === "undefined" || !html) return html || "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll(".hl-blank-x").forEach((el) => el.remove());
  tmp.querySelectorAll(".hl-mark").forEach((el) => {
    el.querySelectorAll(":scope > .hl-status").forEach((b) => b.remove());
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  });
  tmp.normalize();
  return tmp.innerHTML;
}

/* One entry point for the marking pages: given the teacher's highlights, the
   total score and the question's marks, return the highlights + html that
   should be saved (whole-answer ✗ when nothing was credited, otherwise ✗ on
   the uncredited points). Safe to run repeatedly. */
export function applyAutoWrong(answerId, html, list, score, maxMarks) {
  const baseHtml = stripAutoWrongHtml(html || "");
  const baseList = (list || []).filter((h) => !(isAutoWrongId(h.id) && !(Number(h.mark) > 0)));
  const sc = Number(score) || 0;

  if (needsAutoWrong(baseList, sc)) {
    const wrong = buildAutoWrong(answerId, baseHtml);
    if (wrong) return { html: wrong.html, list: wrong.highlights, changed: true };
    return { html: baseHtml, list: baseList, changed: false };
  }
  const real = baseList.filter((h) => !h.prior);
  const max = Number(maxMarks) || 0;
  if (real.length && max > 0 && sc < max) {
    const { html: h2, added } = addShortfallWrongs(answerId, baseHtml, max - sc);
    if (added.length) return { html: h2, list: [...baseList, ...added], changed: true };
  }
  return { html: baseHtml, list: baseList, changed: baseHtml !== (html || "") || baseList.length !== (list || []).length };
}

/* Display-time backfill for answers that were marked BEFORE this rule existed
   (or never had the wrongs saved): same result as applyAutoWrong, computed
   from the stored row. Returns the html to show, or null to keep as is. */
export function backfillWrongsForRow(row) {
  try {
    if (!row || typeof document === "undefined") return null;
    const max = Number(row.max_marks) || 0;
    if (!(max > 0) || row.marks_awarded == null) return null;
    const score = Number(row.marks_awarded) || 0;
    if (score >= max) return null;
    let list = row.highlights;
    if (typeof list === "string") { try { list = JSON.parse(list); } catch { list = []; } }
    list = Array.isArray(list) ? list : [];
    const hasHtml = !!row.highlighted_html;
    const base = hasHtml ? row.highlighted_html : (row.essay_answer || "");
    const res = applyAutoWrong(row.id, base, list, score, max);
    return res.changed ? { html: res.html, list: res.list } : null;
  } catch { return null; }
}
