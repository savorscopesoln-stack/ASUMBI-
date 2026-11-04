/* Offline lesson PACKS on the learner's device (L10.2b step 1, D-130). Framework-free; no React, no axios. UTILITY ONLY: no screen yet.
   - `downloadPack({ courseId, packId, get, store })` fetches the frozen manifest, every lesson and every file of a PUBLISHED pack (routes from L10.1a/b), VERIFIES them
     (lesson content sha256 and version against the manifest; file size and sha256 against the manifest) and stores them. All-or-nothing: the pack record is written LAST, anything
     written before a failure is removed, and an older good copy of the same pack is only replaced after the new one is complete.
   - `get(path, opts)` is the portal's API client (axios-like, returns { data }); files are asked as `responseType: "arraybuffer"`.
   - The store is per learner (key prefix), so a shared device never mixes learners; `removeAll()` wipes one learner's packs. Expiry is checked on every read (an expired pack is
     never opened; `purgeExpired()` removes it). Data is only ever read back for the SAME learner key. Controlled exams are never in a pack (server rule).
   - Not checked here: `manifestSha256` (the server hashes the manifest TEXT; the device only gets the parsed object), so it is stored and compared between downloads only. */
const POS = (n) => Number.isInteger(n) && n > 0;
const MAX_FILES = 200, MAX_LESSONS = 50;
const te = () => new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function sha256Hex(input) { const bytes = typeof input === "string" ? te().encode(input) : input; return hex(await globalThis.crypto.subtle.digest("SHA-256", bytes)); }
/* The same text the server hashes for a lesson: ordered [type, html, data] exactly as stored. */
export const lessonContentText = (blocks) => JSON.stringify(blocks.map((b) => [b.type, b.html ?? null, b.data ?? null]));

/* ---------- storage backends: { get, set, del, keys(prefix) }, all async ---------- */
export function memoryBackend() {
  const m = new Map();
  return { get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : undefined), set: async (k, v) => { m.set(k, structuredClone(v)); }, del: async (k) => { m.delete(k); }, keys: async (p) => [...m.keys()].filter((k) => k.startsWith(p)), _size: () => m.size };
}
export function idbBackend(dbName = "doravo-lms-packs") {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open(dbName, 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const run = async (mode, fn) => { const db = await open(); try { return await new Promise((res, rej) => { const tx = db.transaction("kv", mode); const out = fn(tx.objectStore("kv")); tx.oncomplete = () => res(out.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error("aborted")); }); } finally { db.close(); } };
  return {
    get: (k) => run("readonly", (s) => s.get(k)),
    set: (k, v) => run("readwrite", (s) => s.put(v, k)),
    del: (k) => run("readwrite", (s) => s.delete(k)),
    keys: (p) => run("readonly", (s) => s.getAllKeys(IDBKeyRange.bound(p, p + "\uffff"))),
  };
}

const quota = (e) => !!e && (e.name === "QuotaExceededError" || e.code === 22 || /quota/i.test(String(e.message || "")));
const fail = (code, message, extra) => ({ ok: false, code, message, ...(extra || {}) });

export function createPackStore({ backend, userKey, now = () => Date.now() }) {
  if (!backend || userKey === undefined || userKey === null || userKey === "") throw new Error("backend and userKey are required");
  const P = `doravo.lms.packs.v1.${String(userKey)}:`;
  const kMeta = (c, p) => `${P}m:${c}:${p}`, kLesson = (c, p, v, l) => `${P}l:${c}:${p}:${v}:${l}`, kFile = (c, p, v, f) => `${P}f:${c}:${p}:${v}:${f}`;
  const tag = (sha) => String(sha || "x").replace(/[^a-f0-9]/gi, "").slice(0, 12) || "x";
  const expired = (meta) => !!meta.expiresAt && new Date(meta.expiresAt).getTime() <= now();

  async function dropVersion(c, p, v) { for (const k of await backend.keys(`${P}l:${c}:${p}:${v}:`)) await backend.del(k); for (const k of await backend.keys(`${P}f:${c}:${p}:${v}:`)) await backend.del(k); }
  async function metas() { const out = []; for (const k of await backend.keys(`${P}m:`)) { const m = await backend.get(k); if (m) out.push(m); } return out; }

  return {
    tag,
    async list(courseId) { return (await metas()).filter((m) => courseId === undefined || m.courseId === courseId).map((m) => ({ courseId: m.courseId, packId: m.packId, name: m.name, lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, onlineOnly: l.onlineOnly })), totalBytes: m.totalBytes, downloadedAt: m.downloadedAt, expiresAt: m.expiresAt, expired: expired(m), manifestSha256: m.manifestSha256 })); },
    async meta(courseId, packId) { return (await backend.get(kMeta(courseId, packId))) || null; },
    /* Store one verified pack. `parts` = { meta, lessons: [{id, blocks, files}], files: [{mediaId, bytes, name, ext, sha256, size}] }. Meta goes in LAST. */
    async save(courseId, packId, parts) {
      const v = tag(parts.meta.manifestSha256 || parts.meta.builtAt), old = await backend.get(kMeta(courseId, packId));
      try {
        for (const l of parts.lessons) await backend.set(kLesson(courseId, packId, v, l.id), { blocks: l.blocks, files: l.files });
        for (const f of parts.files) await backend.set(kFile(courseId, packId, v, f.mediaId), f);
        await backend.set(kMeta(courseId, packId), { ...parts.meta, v, courseId, packId, downloadedAt: new Date(now()).toISOString() });
      } catch (e) { if (!old || old.v !== v) await dropVersion(courseId, packId, v); return quota(e) ? fail("STORAGE_FULL", "There is not enough space on this device for this pack.") : fail("STORAGE_ERROR", "The pack could not be saved on this device."); }
      if (old && old.v !== v) await dropVersion(courseId, packId, old.v);
      return { ok: true };
    },
    async readLesson(courseId, packId, lessonId) {
      const m = await backend.get(kMeta(courseId, packId)); if (!m) return fail("NOT_DOWNLOADED", "This pack is not on this device.");
      if (expired(m)) return fail("EXPIRED", "This pack has expired. Connect and download it again.");
      const l = await backend.get(kLesson(courseId, packId, m.v, lessonId)); if (!l) return fail("NOT_DOWNLOADED", "This lesson is not on this device.");
      const entry = m.lessons.find((x) => x.id === lessonId);
      return { ok: true, title: entry ? entry.title : "", blocks: l.blocks, files: l.files };
    },
    async readFile(courseId, packId, mediaId) {
      const m = await backend.get(kMeta(courseId, packId)); if (!m) return fail("NOT_DOWNLOADED", "This pack is not on this device.");
      if (expired(m)) return fail("EXPIRED", "This pack has expired. Connect and download it again.");
      const f = await backend.get(kFile(courseId, packId, m.v, mediaId)); if (!f) return fail("NOT_DOWNLOADED", "This file is not on this device.");
      return { ok: true, bytes: f.bytes, name: f.name, ext: f.ext, size: f.size };
    },
    async remove(courseId, packId) { const m = await backend.get(kMeta(courseId, packId)); await backend.del(kMeta(courseId, packId)); if (m) await dropVersion(courseId, packId, m.v); return { ok: true, removed: m ? 1 : 0 }; },
    async purgeExpired() { let n = 0; for (const m of await metas()) if (expired(m)) { await this.remove(m.courseId, m.packId); n += 1; } return { ok: true, removed: n }; },
    async removeAll() { let n = 0; for (const k of await backend.keys(P)) { await backend.del(k); n += 1; } return { ok: true, removed: n }; },
  };
}

const status = (e) => (e && e.response ? e.response.status : 0);
const toBytes = async (d) => { if (d instanceof ArrayBuffer) return d; if (ArrayBuffer.isView(d)) return d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength); if (typeof Blob !== "undefined" && d instanceof Blob) return d.arrayBuffer(); return null; };

/* Download, verify and store one pack. Returns { ok:true, lessons, files, bytes } or { ok:false, code, message } with code
   NOT_FOUND | PACK_STALE | LESSON_CHANGED | BAD_MANIFEST | VERIFY_FAILED | NETWORK | SERVER | CANCELLED | STORAGE_FULL | STORAGE_ERROR | INVALID. Nothing is kept on any failure. */
export async function downloadPack({ courseId, packId, get, store, onProgress, signal }) {
  if (!POS(courseId) || !POS(packId) || typeof get !== "function" || !store) return fail("INVALID", "A course, a pack and a way to fetch are required.");
  const base = `/lms/courses/${courseId}/learn/offline/packs/${packId}`;
  const stop = () => !!(signal && signal.aborted);
  const net = (e) => { const s = status(e); return s === 404 ? fail("NOT_FOUND", "This pack is no longer available.") : s === 409 ? fail("LESSON_CHANGED", "A lesson was edited after this pack was built. Ask your teacher for a new pack.") : s ? fail("SERVER", "The server could not give the pack right now. Try again later.") : fail("NETWORK", "Could not reach the server. Check your connection and try again."); };
  let r; try { r = await get(`${base}/manifest`); } catch (e) { return net(e); }
  const d = r && r.data, man = d && d.manifest;
  if (!man || man.packId !== packId || man.courseId !== courseId || !Array.isArray(man.lessons) || !Array.isArray(man.files) || man.lessons.length < 1 || man.lessons.length > MAX_LESSONS || man.files.length > MAX_FILES) return fail("BAD_MANIFEST", "The pack description is not valid.");
  if (Array.isArray(d.staleLessons) && d.staleLessons.length) return fail("PACK_STALE", "Some lessons were edited after this pack was built. Ask your teacher for a new pack.", { staleLessons: d.staleLessons });
  const total = man.lessons.length + man.files.length; let done = 0, bytes = 0; const tick = () => { done += 1; if (onProgress) onProgress({ done, total, bytes }); };
  const lessons = [], files = [];
  for (const entry of man.lessons) {
    if (stop()) return fail("CANCELLED", "Download cancelled.");
    let lr; try { lr = await get(`${base}/lessons/${entry.id}`); } catch (e) { return net(e); }
    const ld = lr && lr.data; if (!ld || !ld.lesson || ld.lesson.id !== entry.id || !Array.isArray(ld.blocks)) return fail("VERIFY_FAILED", "A lesson did not arrive correctly.");
    if (ld.lesson.contentVersion !== entry.contentVersion || (await sha256Hex(lessonContentText(ld.blocks))) !== entry.contentSha256) return fail("VERIFY_FAILED", "A lesson did not match the pack description. Try again.");
    lessons.push({ id: entry.id, blocks: ld.blocks, files: Array.isArray(ld.files) ? ld.files.filter((f) => f && typeof f.url === "string" && POS(f.mediaId)) : [] }); tick();
  }
  const listed = new Set(man.files.map((f) => f.mediaId));
  for (const l of lessons) for (const f of l.files) if (!listed.has(f.mediaId)) return fail("VERIFY_FAILED", "A lesson uses a file that is not in the pack.");
  for (const f of man.files) {
    if (stop()) return fail("CANCELLED", "Download cancelled.");
    let fr; try { fr = await get(`${base}/files/${f.mediaId}`, { responseType: "arraybuffer", ...(signal ? { signal } : {}) }); } catch (e) { return stop() ? fail("CANCELLED", "Download cancelled.") : net(e); }
    const buf = fr ? await toBytes(fr.data) : null;
    if (!buf || buf.byteLength !== f.sizeBytes || (await sha256Hex(buf)) !== f.sha256) return fail("VERIFY_FAILED", "A file did not arrive complete. Try again.");
    files.push({ mediaId: f.mediaId, bytes: buf, name: f.name, ext: f.ext, kind: f.kind, sha256: f.sha256, size: f.sizeBytes }); bytes += buf.byteLength; tick();
  }
  if (stop()) return fail("CANCELLED", "Download cancelled.");
  const meta = { name: man.name, builtAt: man.builtAt, expiresAt: man.expiresAt || null, manifestSha256: d.manifestSha256 || null, totalBytes: man.totalBytes ?? bytes, lessons: man.lessons.map((l) => ({ id: l.id, title: l.title, contentVersion: l.contentVersion, onlineOnly: l.onlineOnly || 0 })) };
  const saved = await store.save(courseId, packId, { meta, lessons, files }); if (!saved.ok) return saved;
  return { ok: true, lessons: lessons.length, files: files.length, bytes };
}
