/* "Last good read" cache of the learner's own assignment screens on this device (L10.2 data step, D-134). Framework-free.
   WHY: the app shell opens offline (D-129) but the assignment list/detail need API data. Online reads are saved per learner; ONLY when the request gets NO response at all
   (network down) the saved copy is returned, marked `fromDevice` (ISO time). A server answer, even an error (403 revoked, 500), never falls back to the device.
   Bounded: max 40 entries, 200 KB per entry, 14 days; oldest dropped first. Private to one learner key; wiped on logout (lmsOfflineWipe). Used for assignments ONLY (never quizzes/exams). */
import { noResponse } from "./lmsOfflineEnqueue";
export const READ_CACHE_PREFIX = "doravo.lms.readcache.v1.";
export function createReadCache({ storage, userKey, now = () => Date.now(), maxEntries = 40, maxEntryBytes = 200000, ttlMs = 14 * 86400000 }) {
  if (!storage || userKey === undefined || userKey === null || userKey === "") throw new Error("storage and userKey are required");
  const K = READ_CACHE_PREFIX + String(userKey);
  const load = () => { try { const o = JSON.parse(storage.getItem(K) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch { return {}; } };
  return {
    get(key) { const e = load()[key]; if (!e || typeof e.at !== "number" || now() - e.at > ttlMs) return null; return { data: e.data, at: new Date(e.at).toISOString() }; },
    set(key, data) {
      let text; try { text = JSON.stringify(data); } catch { return false; } if (text === undefined || text.length > maxEntryBytes) return false;
      const all = load(); all[key] = { at: now(), data: JSON.parse(text) };
      const keys = Object.keys(all).sort((a, b) => all[a].at - all[b].at); while (keys.length > maxEntries) delete all[keys.shift()];
      try { storage.setItem(K, JSON.stringify(all)); return true; } catch { return false; }
    },
    clear() { try { storage.removeItem(K); } catch { /* ignore */ } },
  };
}
/* `fetcher()` is the normal axios-like call. No cache (not licensed / not signed in) = exactly the normal call. */
export async function cachedGet(cache, key, fetcher) {
  if (!cache) return fetcher();
  try { const r = await fetcher(); if (r && r.data !== undefined) cache.set(key, r.data); return r; }
  catch (e) { if (noResponse(e)) { const hit = cache.get(key); if (hit) return { data: hit.data, fromDevice: hit.at }; } throw e; }
}
