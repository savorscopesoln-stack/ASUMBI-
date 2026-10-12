/* =========================================================================
   EXAM DEVICE CACHE
   ─────────────────────────────────────────────────────────
   While a student sits an exam, everything needed to keep going is cached
   on THIS device:
     • the paper itself (assessment + questions)       → survives offline / refresh
     • the student's answers + when they last changed  → the thing that gets synced
     • a `dirty` flag (answers newer than the server's copy)
     • the exam's absolute end time                    → the countdown keeps
                                                         running with no network
   The exam page writes here on every answer and a 30-second timer pushes
   whatever is dirty to the server (POST /e-assessments/:id/autosave). The
   server stays the authority: it auto-submits from its own copy when time
   runs out, and its clock re-syncs the countdown on every successful sync.

   Storage: IndexedDB (a paper with images/long text can outgrow the ~5 MB
   localStorage quota). If IndexedDB is unavailable (private mode, old
   browser) it falls back to localStorage, then to memory for the session.
========================================================================= */

const DB_NAME = "doravo_exam_cache";
const STORE = "exams";
const LS_PREFIX = "exam_cache_";

const memory = new Map(); // last-resort fallback + read-through cache

let dbPromise = null;
const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
};

const idbRun = async (mode, fn) => {
  const db = await openDb();
  if (!db) throw new Error("no-idb");
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, mode);
      const result = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
  });
};

/* key = one student + one assessment, so two students sharing a lab PC can
   never see each other's answers. */
export const examCacheKey = (assessmentId) => {
  let studentId = "anon";
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (u?.id != null) studentId = String(u.id);
  } catch { /* ignore */ }
  return `${studentId}_${assessmentId}`;
};

export const loadExamCache = async (key) => {
  try {
    const v = await idbRun("readonly", (s) => s.get(key));
    if (v) { memory.set(key, v); return v; }
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw) { const v = JSON.parse(raw); memory.set(key, v); return v; }
  } catch { /* fall through */ }
  return memory.get(key) || null;
};

/* Merges `patch` into what's cached (shallow) and persists it. Writes for one
   key are chained so two quick answers can't race and drop one another. */
const writeChains = new Map();
export const saveExamCache = (key, patch) => {
  const prev = writeChains.get(key) || Promise.resolve();
  const next = prev.then(async () => {
    const current = (await loadExamCache(key)) || {};
    const merged = { ...current, ...patch, updatedAt: Date.now() };
    memory.set(key, merged);
    try {
      await idbRun("readwrite", (s) => { s.put(merged, key); });
      return true;
    } catch { /* fall back to localStorage */ }
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(merged));
      return true;
    } catch { /* quota/private mode — memory copy only */ }
    return false;
  });
  writeChains.set(key, next.catch(() => {}));
  return next;
};

export const clearExamCache = async (key) => {
  memory.delete(key);
  try { await idbRun("readwrite", (s) => { s.delete(key); }); } catch { /* ignore */ }
  try { localStorage.removeItem(LS_PREFIX + key); } catch { /* ignore */ }
};

/* ── ONE TAB PER EXAM ─────────────────────────────────────────
   Two tabs on the same device share the same device id and would both pass
   the server's device check, then overwrite each other's answers. A tiny
   localStorage lease makes the second tab refuse to start while the first
   is alive (lease refreshed every few seconds; it expires on its own if the
   tab/browser dies, so a crash never locks the student out). */
const TAB_LEASE_MS = 9000;
const TAB_REFRESH_MS = 3000;
const tabLockKey = (assessmentId) => `exam_tab_lock_${assessmentId}`;

// One id per page load (NOT sessionStorage): a duplicated tab copies
// sessionStorage and would otherwise share its twin's id and slip past the lock.
const TAB_ID = (typeof crypto !== "undefined" && crypto.randomUUID)
  ? crypto.randomUUID()
  : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const getTabId = () => TAB_ID;

const readLease = (assessmentId) => {
  try { return JSON.parse(localStorage.getItem(tabLockKey(assessmentId)) || "null"); } catch { return null; }
};

/* Returns { ok: true, release } if this tab now owns the exam, or
   { ok: false } if another live tab already does. */
export const claimExamTab = (assessmentId) => {
  const tabId = getTabId();
  const lease = readLease(assessmentId);
  if (lease && lease.tabId !== tabId && Date.now() - lease.ts < TAB_LEASE_MS) {
    return { ok: false };
  }
  const write = () => {
    try { localStorage.setItem(tabLockKey(assessmentId), JSON.stringify({ tabId, ts: Date.now() })); } catch { /* ignore */ }
  };
  write();
  const iv = setInterval(() => {
    const cur = readLease(assessmentId);
    if (cur && cur.tabId !== tabId && Date.now() - cur.ts < TAB_LEASE_MS) return; // someone else took it; don't fight
    write();
  }, TAB_REFRESH_MS);
  const release = () => {
    clearInterval(iv);
    const cur = readLease(assessmentId);
    if (cur && cur.tabId === tabId) {
      try { localStorage.removeItem(tabLockKey(assessmentId)); } catch { /* ignore */ }
    }
  };
  window.addEventListener("pagehide", release);
  return { ok: true, release: () => { window.removeEventListener("pagehide", release); release(); } };
};

/* True when ANOTHER tab currently owns this exam (used to detect a takeover
   while the exam is running). */
export const examTabTakenByOther = (assessmentId) => {
  const lease = readLease(assessmentId);
  return !!(lease && lease.tabId !== getTabId() && Date.now() - lease.ts < TAB_LEASE_MS);
};
