/* Wipe a learner's offline PACKS and remembered licence flag from this device on logout or when another person signs in (L10.2b step 4, D-133). Framework-free; imports only auth + the pack store.
   Safe against page unload: the intent is written to localStorage FIRST (synchronous, survives `window.location` changes) and cleared only after IndexedDB confirms; `reconcileOfflineDeviceData()`
   finishes any pending wipe on the next load and also wipes the previous person's packs if a different user is now signed in. Work waiting to be sent (the offline queue) is NEVER deleted here. */
import { getUser } from "./auth";
import { createPackStore, idbBackend } from "./lmsOfflinePacks";

const PENDING = "doravo.lms.wipe.pending.v1", LAST = "doravo.lms.lastuser.v1", LICENCE = "doravo.lms.licence.v1.";
const keyOf = (u) => (u && u.id ? `${u.role || "user"}-${u.id}` : null);
const ls = () => { try { return window.localStorage; } catch { return null; } };
const pending = () => { try { const a = JSON.parse(ls().getItem(PENDING) || "[]"); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; } catch { return []; } };
const setPending = (a) => { try { if (a.length) ls().setItem(PENDING, JSON.stringify(a)); else ls().removeItem(PENDING); } catch { /* optional */ } };
const safeUser = () => { try { return getUser(); } catch { return null; } };
function mark(userKey) { if (!userKey) return; const a = pending(); if (!a.includes(userKey)) setPending([...a, userKey]); try { ls().removeItem(LICENCE + userKey); ls().removeItem("doravo.lms.readcache.v1." + userKey); } catch { /* optional */ } }

let running = null;
export function runPendingWipes({ backend } = {}) {
  if (running) return running;
  running = (async () => {
    for (const k of pending()) {
      try { await createPackStore({ backend: backend || idbBackend(), userKey: k }).removeAll(); setPending(pending().filter((x) => x !== k)); } catch { /* stays pending, retried on the next load */ }
    }
  })().finally(() => { running = null; });
  return running;
}
export function wipeOfflineDeviceData(user = safeUser(), opts) { mark(keyOf(user)); try { ls().removeItem(LAST); } catch { /* optional */ } return runPendingWipes(opts); }
export function reconcileOfflineDeviceData(opts) {
  const cur = keyOf(safeUser()); let last = null; try { last = ls().getItem(LAST); } catch { /* optional */ }
  if (last && last !== cur) mark(last);
  try { if (cur) ls().setItem(LAST, cur); else ls().removeItem(LAST); } catch { /* optional */ }
  return runPendingWipes(opts);
}
