/* Pure helpers for the student quiz screen (S62, D-126). No React, no network: easy to test in plain node (dev-tools/ui-tests/quiz-ui.test.mjs).
   Answer shapes are the ones the server accepts (backend/utils/lmsQuizAttempts.js `cleanAnswer`), in the DISPLAY refs the learner saw. */

/* An empty answer is null (the server stores nothing for it). */
export function emptyAnswer(a) {
  if (a === null || a === undefined) return true;
  if (Array.isArray(a.selected)) return a.selected.length === 0;
  if (a.selected !== undefined) return a.selected === null || a.selected === "";
  if (a.text !== undefined) return String(a.text).trim() === "";
  if (a.value !== undefined) return a.value === null || String(a.value).trim() === "";
  if (Array.isArray(a.pairs)) return a.pairs.every((x) => x === null || x === undefined || x === "");
  if (Array.isArray(a.order)) return a.order.length === 0;
  return true;
}
export const answeredCount = (questions, answers) => questions.filter((q) => !emptyAnswer(answers[q.id])).length;

/* Multiple choice (several): add or remove one option position. */
export function toggleSelected(answer, position) {
  const cur = Array.isArray(answer?.selected) ? answer.selected : [];
  const next = cur.includes(position) ? cur.filter((p) => p !== position) : [...cur, position].sort((a, b) => a - b);
  return next.length ? { selected: next } : null;
}
/* Matching: set the right-hand ref for the left at `index` (ref "" or null clears it). `n` = number of lefts. */
export function setPair(answer, index, ref, n) {
  const pairs = Array.from({ length: n }, (_, i) => (Array.isArray(answer?.pairs) && answer.pairs[i] != null ? answer.pairs[i] : null));
  pairs[index] = ref === "" || ref === null || ref === undefined ? null : Number(ref);
  return pairs.every((x) => x === null) ? null : { pairs };
}
/* Ordering: the order on screen is the saved order, or refs 1..n as first shown. Move one item up (-1) or down (+1). */
export const currentOrder = (answer, items) => (Array.isArray(answer?.order) && answer.order.length === items.length ? answer.order : items.map((i) => i.ref));
export function moveItem(answer, items, index, delta) {
  const order = [...currentOrder(answer, items)]; const to = index + delta;
  if (to < 0 || to >= order.length) return answer ?? null;
  [order[index], order[to]] = [order[to], order[index]];
  return { order };
}
/* Text / number boxes. Numbers are sent as typed (the server parses and rejects nonsense with a clear message). */
export const textAnswer = (s) => (String(s).trim() === "" ? null : { text: String(s) });
export const valueAnswer = (s) => (String(s).trim() === "" ? null : { value: String(s).trim() });

/* Only the answers that changed since the last successful save, as the PUT body (max 100 per call, so split). */
export function dirtyBatches(answers, saved, ids, max = 100) {
  const changed = ids.filter((id) => JSON.stringify(answers[id] ?? null) !== JSON.stringify(saved[id] ?? null));
  const out = [];
  for (let i = 0; i < changed.length; i += max) { const body = {}; for (const id of changed.slice(i, i + max)) body[id] = answers[id] ?? null; out.push({ answers: body }); }
  return out;
}

/* Time left from the SERVER's numbers: secondsLeft at the moment the server sent it, then counted down on this device.
   A wrong device clock changes nothing because only elapsed time (performance clock) is used. */
export const secondsLeftNow = (secondsLeft, receivedAtMs, nowMs) => (secondsLeft === null || secondsLeft === undefined ? null : Math.max(0, Math.round(secondsLeft - (nowMs - receivedAtMs) / 1000)));
export function clock(s) { if (s === null || s === undefined) return ""; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; const p = (n) => String(n).padStart(2, "0"); return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`; }
