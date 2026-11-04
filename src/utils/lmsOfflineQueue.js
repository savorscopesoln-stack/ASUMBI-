/* =========================================================================
   LMS OFFLINE ACTION QUEUE  (L10.3d, client side of D-115 / D-116 / D-118)  add-on `lms_offline`.
   Framework-free: no React, no axios. The screen passes in `post(path, body) -> Promise<{data}>` (the portal's API client) and a localStorage-like `storage`.
   What it does: keeps what a learner did offline (lesson progress, assignment DRAFT text, practice-quiz answers) on the device, shows an honest state for each item, and
   replays it to the three sync routes when the connection is back. It never throws away the learner's own words:
   - States per item: saved_locally (waiting) | syncing | conflict (the server moved: both versions are kept for the learner to choose) | rejected (the server refused, e.g. the
     window closed; the text stays here). Items the server accepted (applied / duplicate) are removed. Nothing is ever dropped silently.
   - Network errors (no response), 401, 429 and 5xx leave items as saved_locally and stop the flush: try again later. 400/403/404 on a whole request mark that chunk `rejected` (kept).
   - Drafts: a newer text for the same assignment REPLACES the waiting one but keeps its (older) baseVersion, so the server can still tell a real conflict from a plain update.
     After the server accepts a draft, other waiting drafts for that assignment take its new version as their base (otherwise the learner would conflict with themselves).
   - Quiz answers: merged per question (newest value, OLDEST base). Never queues an attempt start or submit; the screen only offers queueing for eligible quizzes.
   - Conflicts are settled by the learner: `resolveDraft` (keep_server | keep_mine | keep_both through the resolve route) and `resolveQuiz` (per question: mine | server).
   - The queue is per learner (`userKey`), so a shared device never mixes two learners' work. Storage failures are reported (`STORAGE_FULL`), never swallowed.
========================================================================= */
export const STATES = { WAITING: "saved_locally", SYNCING: "syncing", CONFLICT: "conflict", REJECTED: "rejected" };
export const LIMITS = { progress: 50, drafts: 5, quiz: 3, quizAnswers: 100, draftChars: 20000 };
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PROGRESS_TYPES = ["lesson_view", "lesson_complete"];
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function newActionId() {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  const id = c && c.randomUUID ? c.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 40);
  return id.length >= 8 ? id : `${id}00000000`.slice(0, 8);
}

export function createQueue({ storage, post, userKey, now = () => new Date(), makeId = newActionId }) {
  if (!storage || typeof post !== "function" || !userKey) throw new Error("createQueue needs storage, post and userKey.");
  const KEY = `doravo.lms.offline.v1.${String(userKey)}`;
  let flushing = false;

  const load = () => { try { const v = JSON.parse(storage.getItem(KEY)); return Array.isArray(v) ? v.filter(isObj) : []; } catch { return []; } };
  const save = (items) => { try { storage.setItem(KEY, JSON.stringify(items)); return true; } catch { return false; } };
  const mutate = (fn) => { const items = load(); const out = fn(items); return save(items) ? out : { ok: false, code: "STORAGE_FULL", message: "This device has no room left to keep your work offline. Reconnect and sync first." }; };
  const stamp = () => now().toISOString();
  const route = (courseId, tail) => `/lms/courses/${courseId}/learn/offline/sync/${tail}`;
  const fresh = (courseId, type, extra) => ({ id: makeId(), courseId, type, queuedAt: stamp(), state: STATES.WAITING, ...extra });
  const checkCourse = (c) => Number.isInteger(c) && c > 0;

  /* ----- enqueue ----- */
  function enqueueProgress(courseId, { type, lessonId, seconds }) {
    if (!checkCourse(courseId) || !PROGRESS_TYPES.includes(type) || !Number.isInteger(lessonId) || lessonId < 1) return { ok: false, code: "INVALID", message: "Not a valid lesson action." };
    return mutate((items) => { const e = fresh(courseId, type, { lessonId, ...(type === "lesson_view" && Number.isInteger(seconds) ? { seconds: Math.max(0, Math.min(600, seconds)) } : {}) }); items.push(e); return { ok: true, id: e.id }; });
  }

  /* baseVersion = the draft `updatedAt` text the server last sent for this assignment (null when the device never saw a draft). */
  function enqueueDraft(courseId, { assignmentId, text, baseVersion = null }) {
    if (!checkCourse(courseId) || !Number.isInteger(assignmentId) || assignmentId < 1 || typeof text !== "string") return { ok: false, code: "INVALID", message: "Not a valid draft." };
    if (text.length > LIMITS.draftChars) return { ok: false, code: "TOO_LONG", message: `A draft can be at most ${LIMITS.draftChars} characters.` };
    return mutate((items) => {
      const w = items.find((e) => e.type === "submission_draft" && e.courseId === courseId && e.assignmentId === assignmentId && e.state === STATES.WAITING);
      if (w) { w.text = text; w.queuedAt = stamp(); return { ok: true, id: w.id, replaced: true }; } // keeps the OLDEST baseVersion on purpose
      const e = fresh(courseId, "submission_draft", { assignmentId, text, baseVersion }); items.push(e); return { ok: true, id: e.id };
    });
  }

  /* answers = { "<quizQuestionId>": { value, base } } with the same shapes as the online answer save. */
  function enqueueQuizAnswers(courseId, { quizId, attemptId, answers }) {
    if (!checkCourse(courseId) || !Number.isInteger(quizId) || quizId < 1 || !Number.isInteger(attemptId) || attemptId < 1 || !isObj(answers) || !Object.keys(answers).length) return { ok: false, code: "INVALID", message: "Not a valid set of answers." };
    for (const [k, a] of Object.entries(answers)) if (!/^\d{1,9}$/.test(k) || !isObj(a) || !("value" in a) || !("base" in a)) return { ok: false, code: "INVALID", message: "Each answer needs a value and a base." };
    return mutate((items) => {
      const w = items.find((e) => e.type === "quiz_answers" && e.courseId === courseId && e.attemptId === attemptId && e.quizId === quizId && e.state === STATES.WAITING && Object.keys(e.answers).length + Object.keys(answers).filter((k) => !(k in e.answers)).length <= LIMITS.quizAnswers);
      if (w) { for (const [k, a] of Object.entries(answers)) w.answers[k] = { value: clone(a.value ?? null), base: k in w.answers ? w.answers[k].base : clone(a.base ?? null) }; w.queuedAt = stamp(); return { ok: true, id: w.id, merged: true }; }
      const e = fresh(courseId, "quiz_answers", { quizId, attemptId, answers: clone(answers) }); items.push(e); return { ok: true, id: e.id };
    });
  }

  /* ----- read ----- */
  const list = (courseId) => load().filter((e) => courseId === undefined || e.courseId === courseId);
  const summary = (courseId) => { const l = list(courseId), n = (s) => l.filter((e) => e.state === s).length; return { total: l.length, waiting: n(STATES.WAITING), syncing: n(STATES.SYNCING), conflicts: n(STATES.CONFLICT), rejected: n(STATES.REJECTED) }; };

  /* ----- replay ----- */
  const wire = (e) => {
    if (e.type === "submission_draft") return { clientActionId: e.id, type: e.type, assignmentId: e.assignmentId, queuedAt: e.queuedAt, text: e.text, baseVersion: e.baseVersion ?? null };
    if (e.type === "quiz_answers") return { clientActionId: e.id, type: e.type, quizId: e.quizId, attemptId: e.attemptId, queuedAt: e.queuedAt, answers: e.answers };
    return { clientActionId: e.id, type: e.type, lessonId: e.lessonId, queuedAt: e.queuedAt, ...(e.type === "lesson_view" && e.seconds !== undefined ? { seconds: e.seconds } : {}) };
  };
  const GROUPS = [["progress", ["lesson_view", "lesson_complete"], LIMITS.progress, "progress"], ["drafts", ["submission_draft"], LIMITS.drafts, "drafts"], ["quiz", ["quiz_answers"], LIMITS.quiz, "quiz-answers"]];

  const setState = (ids, state, extra = {}) => mutate((items) => { for (const e of items) if (ids.has(e.id)) Object.assign(e, { state }, extra); return { ok: true }; });
  const settle = (r) => { /* `r` = one per-action answer from the server */
    return mutate((items) => {
      const i = items.findIndex((e) => e.id === r.clientActionId); if (i < 0) return { ok: true };
      const e = items[i];
      if (r.state === "applied" || r.state === "duplicate") {
        items.splice(i, 1);
        if (e.type === "submission_draft" && r.version) for (const o of items) if (o.type === e.type && o.courseId === e.courseId && o.assignmentId === e.assignmentId && o.state === STATES.WAITING) o.baseVersion = r.version;
        if (e.type === "quiz_answers" && r.state === "applied") for (const o of items) if (o.type === e.type && o.attemptId === e.attemptId && o.state === STATES.WAITING) for (const [k, a] of Object.entries(e.answers)) if (k in o.answers && same(o.answers[k].base, a.base)) o.answers[k].base = clone(a.value ?? null);
      } else if (r.state === "conflict") Object.assign(e, { state: STATES.CONFLICT, code: r.code || "CONFLICT", conflict: r.conflict || null, items: (r.items || []).filter((x) => x.state === "conflict") });
      else Object.assign(e, { state: STATES.REJECTED, code: r.code || "REJECTED", message: r.message || null });
      return { ok: true };
    });
  };

  async function flush(courseId) {
    if (flushing) return { ok: true, busy: true };
    flushing = true;
    const out = { ok: true, applied: 0, duplicate: 0, conflict: 0, rejected: 0, stoppedBy: null };
    try {
      for (const [, types, size, tail] of GROUPS) {
        for (;;) {
          const batch = load().filter((e) => e.courseId === courseId && e.state === STATES.WAITING && types.includes(e.type)).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)).slice(0, size);
          if (!batch.length) break;
          const ids = new Set(batch.map((e) => e.id)); setState(ids, STATES.SYNCING);
          let res;
          try { res = await post(route(courseId, tail), { actions: batch.map(wire) }); }
          catch (err) {
            const st = err && err.response ? err.response.status : 0, msg = err && err.response && err.response.data ? err.response.data.message : null;
            if (!st || st === 401 || st === 429 || st >= 500) { setState(ids, STATES.WAITING); out.stoppedBy = !st ? "offline" : st === 401 ? "signed_out" : "server"; return out; }
            setState(ids, STATES.REJECTED, { code: st === 400 ? "INVALID_REQUEST" : "NOT_ALLOWED", message: msg || "The server did not accept this." }); out.rejected += batch.length; continue;
          }
          const results = res && res.data && Array.isArray(res.data.results) ? res.data.results : null;
          if (!results) { setState(ids, STATES.WAITING); out.stoppedBy = "server"; return out; }
          const seen = new Set();
          for (const r of results) { if (!ids.has(r.clientActionId)) continue; seen.add(r.clientActionId); const w = settle(r); if (w && w.ok === false) { out.ok = false; out.stoppedBy = "storage"; return out; } if (r.state in out) out[r.state] += 1; }
          const missing = new Set([...ids].filter((id) => !seen.has(id))); if (missing.size) setState(missing, STATES.WAITING); // an item the server did not answer stays waiting
          if (missing.size === batch.length) { out.stoppedBy = "server"; return out; }
        }
      }
      return out;
    } finally { flushing = false; }
  }

  /* ----- settle conflicts ----- */
  const find = (id, type) => load().find((e) => e.id === id && e.type === type && e.state === STATES.CONFLICT);

  async function resolveDraft(id, choice) {
    const e = find(id, "submission_draft"); if (!e || !e.conflict) return { ok: false, code: "NOT_FOUND", message: "No draft conflict to settle." };
    const body = { assignmentId: e.assignmentId, choice, serverVersion: e.conflict.serverVersion, clientActionId: e.id, ...(choice === "keep_server" ? {} : { text: e.text }) };
    let res; try { res = await post(route(e.courseId, "drafts/resolve"), body); } catch (err) { return { ok: false, code: err && err.response ? "REFUSED" : "OFFLINE", message: err && err.response && err.response.data ? err.response.data.message : "Could not reach the server. Your text is still saved here." }; }
    const d = res && res.data;
    if (d && d.conflict) { mutate((items) => { const x = items.find((i) => i.id === id); if (x) x.conflict = { serverVersion: d.serverVersion, serverText: d.serverText, deviceText: d.deviceText }; return { ok: true }; }); return { ok: false, code: "CONFLICT_AGAIN", conflict: d }; }
    mutate((items) => { const i = items.findIndex((x) => x.id === id); if (i >= 0) items.splice(i, 1); return { ok: true }; });
    return { ok: true, draft: d && d.draft ? d.draft : null };
  }

  /* choices = { "<questionId>": "mine" | "server" }; every conflicting question needs a choice. "mine" re-bases onto the server's answer and goes back to waiting. */
  function resolveQuiz(id, choices) {
    const e = find(id, "quiz_answers"); if (!e) return { ok: false, code: "NOT_FOUND", message: "No quiz conflict to settle." };
    const conflicts = (e.items || []).filter((x) => x.state === "conflict");
    if (!isObj(choices) || conflicts.some((c) => choices[c.questionId] !== "mine" && choices[c.questionId] !== "server")) return { ok: false, code: "INVALID", message: "Choose mine or server for every conflicting question." };
    return mutate((items) => {
      const x = items.find((i) => i.id === id);
      for (const c of conflicts) { if (choices[c.questionId] === "server") delete x.answers[c.questionId]; else x.answers[c.questionId] = { value: clone(x.answers[c.questionId].value ?? null), base: clone(c.conflict.serverAnswer ?? null) }; }
      if (!Object.keys(x.answers).length) { items.splice(items.indexOf(x), 1); return { ok: true, removed: true }; }
      Object.assign(x, { state: STATES.WAITING, id: makeId(), queuedAt: stamp() }); delete x.code; delete x.conflict; delete x.items; // a new id: the old action id is tied to the old answers
      return { ok: true, removed: false };
    });
  }

  /* The learner accepts that a refused or conflicting item is not sent (explicit; never automatic). */
  const discard = (id) => mutate((items) => { const i = items.findIndex((x) => x.id === id && (x.state === STATES.REJECTED || x.state === STATES.CONFLICT)); if (i < 0) return { ok: false, code: "NOT_FOUND" }; items.splice(i, 1); return { ok: true }; });
  /* A rejected item the learner wants to try again (for example after the teacher extended the window). */
  const retry = (id) => mutate((items) => { const x = items.find((i) => i.id === id && i.state === STATES.REJECTED); if (!x) return { ok: false, code: "NOT_FOUND" }; Object.assign(x, { state: STATES.WAITING, id: makeId() }); delete x.code; delete x.message; return { ok: true }; });

  /* After the learner HANDED IN exactly this text online, the device copy of the same words is obsolete and must not replay as a fresh draft. Removes only WAITING drafts of this
     course + assignment whose text is IDENTICAL to what was handed in; a different text, or an item that is syncing/conflict/rejected, is never touched. */
  const dropHandedInDraft = (courseId, assignmentId, text) => mutate((items) => {
    let removed = 0;
    for (let i = items.length - 1; i >= 0; i--) { const e = items[i]; if (e.type === "submission_draft" && e.courseId === courseId && e.assignmentId === assignmentId && e.state === STATES.WAITING && e.text === text) { items.splice(i, 1); removed += 1; } }
    return { ok: true, removed };
  });

  return { enqueueProgress, enqueueDraft, enqueueQuizAnswers, list, summary, flush, resolveDraft, resolveQuiz, discard, retry, dropHandedInDraft, ID_RE };
}
