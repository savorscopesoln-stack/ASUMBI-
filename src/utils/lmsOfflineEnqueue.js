/* =========================================================================
   LMS OFFLINE ENQUEUE HELPERS  (L10.3f, D-122)  add-on `lms_offline`.  Framework-free, no network, no storage of its own.
   Small rules the screens share so they cannot disagree:
   - noResponse(err): true ONLY when the request never got an answer (network down, DNS, connection reset, timeout).
     Any answer from the server (400, 401, 403, 404, 409, 429, 5xx) is NOT offline: the server decided, so nothing is queued.
     A request the app itself cancelled is not offline either.
   - offlineLicensed(modulesBody): reads the `/tenant/modules` answer. True only when the LMS is enabled AND the flag `lms_offline` is sold.
     Anything unclear (missing body, no flags array) is false: fail closed. The server still enforces the licence on every sync call.
   - queueLessonAction(queue, courseId, action, err): the one place a lesson action is saved to the device.
     Returns { queued, ok, ... }: queued=false means "not an offline failure, show the normal error".
     An identical action that is still WAITING on this device is reused, never added twice (a second tap must not pile up copies).
========================================================================= */
export function noResponse(err) {
  if (!err || typeof err !== "object") return false;
  if (err.response) return false;
  if (err.code === "ERR_CANCELED" || err.name === "CanceledError" || err.name === "AbortError") return false;
  return !!(err.request || err.code === "ERR_NETWORK" || err.code === "ECONNABORTED" || err.message === "Network Error");
}

export function offlineLicensed(body) {
  const m = body && body.modules && body.modules.lms;
  return !!(m && m.enabled === true && Array.isArray(m.flags) && m.flags.includes("lms_offline"));
}

const KIND = { view: "lesson_view", complete: "lesson_complete" };

export function queueLessonAction(queue, courseId, { kind, lessonId, seconds }, err) {
  if (!queue || !noResponse(err)) return { queued: false };
  const type = KIND[kind];
  if (!type) return { queued: false };
  let waiting = [];
  try { waiting = queue.list(courseId); } catch { waiting = []; }
  const have = waiting.find((e) => e.type === type && e.lessonId === lessonId && e.state === "saved_locally");
  if (have) return { queued: true, ok: true, id: have.id, reused: true };
  const r = queue.enqueueProgress(courseId, { type, lessonId, ...(type === "lesson_view" && Number.isInteger(seconds) ? { seconds } : {}) });
  return { queued: true, ...r };
}

/* ---- Quiz answers (L10.3f step 3, S63, D-127). Same rule as the server (`eligibility` in backend/utils/lmsOfflineQuiz.js): a PRACTICE quiz of mode quiz/revision,
   NO time limit, NOT counting to the grade. Anything else (timed, coursework, graded, flashcards, controlled exam) is never queued; the screen then shows the normal error.
   The server stays the judge (it re-checks and rejects NOT_OFFLINE_ELIGIBLE). Starting and handing in an attempt are NEVER queued. */
export function quizOfflineEligible(quiz) {
  if (!quiz || typeof quiz !== "object") return false;
  const mode = quiz.mode || "quiz";
  return quiz.assessmentType === "practice" && (mode === "quiz" || mode === "revision") && !quiz.timeLimitMinutes && quiz.countsToGrade === false;
}
/* answers = { "<questionId>": answer|null } (what the PUT would have sent), saved = what the server last confirmed (the `base` of each answer). */
export function queueQuizAnswers(queue, courseId, { quiz, quizId, attemptId, answers, saved }, err) {
  if (!queue || !noResponse(err) || !quizOfflineEligible(quiz)) return { queued: false };
  const out = {};
  for (const [k, v] of Object.entries(answers || {})) out[k] = { value: v ?? null, base: (saved && saved[k]) ?? null };
  if (!Object.keys(out).length) return { queued: false };
  const r = queue.enqueueQuizAnswers(courseId, { quizId, attemptId, answers: out });
  return { queued: true, ...r };
}
