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

/* Wraps the entire answer in a red "wrong" mark with a ✗ badge. Returns
   { html, highlight } or null when there is no answer text to mark. */
export function buildAutoWrong(answerId, html) {
  if (typeof document === "undefined") return null;
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(html || "");
  const text = (tmp.textContent || "").trim();
  const hasTable = !!tmp.querySelector("table");
  if (!text && !hasTable) return null;

  const hid = `${AUTO_WRONG_PREFIX}${answerId}`;
  const mark = document.createElement("mark");
  mark.className = "hl-mark";
  mark.dataset.hid = hid;
  mark.dataset.mark = "0";
  mark.dataset.fullmark = "1";
  mark.dataset.status = "wrong";
  while (tmp.firstChild) mark.appendChild(tmp.firstChild);

  const badge = document.createElement("span");
  badge.className = "hl-status";
  badge.dataset.status = "wrong";
  badge.textContent = "✗";
  mark.appendChild(badge);
  tmp.appendChild(mark);

  return {
    html: tmp.innerHTML,
    highlight: {
      id: hid,
      text: (text || "Answer").slice(0, 500),
      mark: 0,
      createdAt: Date.now(),
      confirmed: true,
      reason: "No marking points were found in this answer.",
    },
  };
}

/* Removes the whole-answer ✗ again (used when a teacher reopens an answer
   to mark it properly), leaving the student's text untouched. */
export function stripAutoWrongHtml(html) {
  if (typeof document === "undefined" || !html) return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const el = tmp.querySelector(`[data-hid^="${AUTO_WRONG_PREFIX}"]`);
  if (!el) return html;
  const badge = el.querySelector(".hl-status");
  if (badge) badge.remove();
  while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
  el.remove();
  return tmp.innerHTML;
}
