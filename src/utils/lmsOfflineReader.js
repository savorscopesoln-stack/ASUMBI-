/* Read lessons from the device pack store (L10.2b step 3, D-132). Framework-free. Used by the student player ONLY when the network is down (no response), never to replace a
   working online read. Blocks are rebuilt in the same shape the online route returns (see backend shapeBlock). Files become blob URLs, revoked by `dispose()`.
   Not here: completion rule and summary are not in a pack, so an offline lesson is "Mark complete" (the server still applies its own rule when the work syncs). */
const parseData = (d) => { if (d && typeof d === "object") return d; try { const o = d ? JSON.parse(d) : {}; return o && typeof o === "object" ? o : {}; } catch { return {}; } };
export function shapePackBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((b, i) => ({ id: `p${i}`, type: b.type, sortOrder: b.sortOrder ?? i, ...(b.type === "text" ? { html: b.html || "" } : parseData(b.data)) }));
}
/* Lessons readable offline for one course, de-duplicated, newest pack first. Lessons that need the internet (external video/links) are left out. */
export async function packLessonList(store, courseId) {
  const out = [], seen = new Set();
  let packs = []; try { packs = (await store.list(courseId)).filter((p) => !p.expired); } catch { return []; }
  for (const p of packs.sort((a, b) => b.packId - a.packId)) for (const l of p.lessons) if (!l.onlineOnly && !seen.has(l.id)) { seen.add(l.id); out.push({ id: l.id, title: l.title || `Lesson ${l.id}`, packId: p.packId }); }
  return out;
}
export async function loadPackLesson({ store, courseId, lessonId, makeUrl = (blob) => URL.createObjectURL(blob), revoke = (u) => URL.revokeObjectURL(u) }) {
  const entry = (await packLessonList(store, courseId)).find((l) => l.id === lessonId);
  if (!entry) return { ok: false, code: "NOT_DOWNLOADED", message: "This lesson is not saved on this device." };
  const r = await store.readLesson(courseId, entry.packId, lessonId); if (!r.ok) return r;
  const urls = new Map(), made = [];
  const dispose = () => { for (const u of made) { try { revoke(u); } catch { /* ignore */ } } made.length = 0; urls.clear(); };
  for (const f of r.files || []) {
    const fr = await store.readFile(courseId, entry.packId, f.mediaId);
    if (!fr.ok) { dispose(); return fr; }
    const u = makeUrl(new Blob([fr.bytes])); made.push(u); urls.set(f.url, u);
  }
  return { ok: true, lesson: { id: lessonId, title: r.title || entry.title, summary: "", completionRule: "manual" }, blocks: shapePackBlocks(r.blocks), urlMap: urls, dispose };
}
