import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";
import useOfflineQueue from "../../hooks/useOfflineQueue";
import usePackStore from "../../hooks/usePackStore";
import { downloadPack } from "../../utils/lmsOfflinePacks";

/* Offline packs library (L10.2b step 2, D-131). Route: /student/courses/:courseId/offline. Online lists the published packs (GET /lms/courses/:id/learn/offline/packs);
   each pack can be downloaded (progress, cancel), removed, or re-downloaded. The device list (what is stored for THIS learner) also shows offline. Only for a school that
   has `lms_offline` (useOfflineQueue returns null otherwise: nothing is stored). Storage: IndexedDB through the verified downloader; nothing is partially kept on failure.
   `navigator.storage.persist()` is asked once, on the first download, so the browser is less likely to clear packs. Reading lessons from the store is step 3, not here. */
const mb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`);
const day = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString([], { dateStyle: "medium" }) : null; };
const MSG = { NETWORK: "No connection. Try again when you are online." };

export default function OfflinePacks() {
  const { courseId: raw } = useParams();
  const courseId = Number(raw);
  const queue = useOfflineQueue(); // null = not licensed / not signed in
  const store = usePackStore(queue); // also records the signed-in learner so a different person signing in later wipes these packs (step 4)
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine !== false);
  const [server, setServer] = useState(null); // null loading
  const [device, setDevice] = useState([]);
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(null); // { packId, done, total }
  const [msg, setMsg] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  const refreshDevice = useCallback(async () => { if (!store) return; try { await store.purgeExpired(); setDevice(await store.list(courseId)); } catch { setMsg({ ok: false, text: "This device could not read its saved packs." }); } }, [store, courseId]);
  useEffect(() => { let alive = true; (async () => { if (!store) return; try { await store.purgeExpired(); const l = await store.list(courseId); if (alive) setDevice(l); } catch { if (alive) setMsg({ ok: false, text: "This device could not read its saved packs." }); } })(); return () => { alive = false; }; }, [store, courseId]);
  useEffect(() => {
    if (!online || !queue) return undefined; // no licence = no request
    let alive = true;
    API.get(`/lms/courses/${courseId}/learn/offline/packs`).then((r) => { if (alive) { setServer(Array.isArray(r.data?.items) ? r.data.items : []); setState("ready"); } })
      .catch((e) => { if (!alive) return; setState(isModuleNotLicensed(e) ? "unlicensed" : [403, 404].includes(e?.response?.status) ? "forbidden" : "error"); });
    return () => { alive = false; };
  }, [courseId, online, queue]);
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  const have = useMemo(() => new Map(device.map((d) => [d.packId, d])), [device]);
  async function download(p) {
    if (!store || busy) return;
    setMsg(null); const ctl = new AbortController(); abortRef.current = ctl; setBusy({ packId: p.id, done: 0, total: 0 });
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch { /* optional */ }
    const r = await downloadPack({ courseId, packId: p.id, get: (path, o) => API.get(path, o), store, signal: ctl.signal, onProgress: (x) => setBusy({ packId: p.id, done: x.done, total: x.total }) });
    abortRef.current = null; setBusy(null);
    setMsg(r.ok ? { ok: true, text: `“${p.name}” is ready offline (${r.lessons} lesson${r.lessons === 1 ? "" : "s"}, ${mb(r.bytes)}).` } : { ok: false, text: r.code === "CANCELLED" ? "Download cancelled. Nothing was saved." : (!navigator.onLine ? MSG.NETWORK : r.message) });
    await refreshDevice();
  }
  async function remove(p) {
    if (!store || busy) return;
    if (!window.confirm(`Remove “${p.name}” from this device? You can download it again later.`)) return;
    await store.remove(courseId, p.packId); setMsg({ ok: true, text: `“${p.name}” was removed from this device.` }); await refreshDevice();
  }

  const head = <p style={{ margin: "0 0 6px", fontSize: 14, display: "flex", gap: 16, flexWrap: "wrap" }}><Link to="/student/courses">← My courses</Link><Link to={`/student/courses/${courseId}/learn`}>Lessons</Link></p>;
  if (!Number.isInteger(courseId) || courseId < 1) return <div style={S.page}>{head}<p>This course was not found.</p></div>;
  if (state === "unlicensed") return <div style={S.page}>{head}<UpgradePrompt module="lms" /></div>;
  if (!queue || !store) return <div style={S.page}>{head}<h1 style={S.h1}>Offline lessons</h1><p style={S.sub}>Offline lessons are not available for your school.</p></div>;

  const list = state === "ready" && online ? server : null;
  const deviceOnly = device.filter((d) => !(list || []).some((p) => p.id === d.packId));
  return (
    <div style={S.page}>
      {head}
      <h1 style={S.h1}>Offline lessons</h1>
      <p style={S.sub}>Download lessons while you have a connection, then study without one. Downloads use your data, so use Wi-Fi if you can.</p>
      {!online && <Notice msg={{ ok: false, text: "You are offline. Packs already on this device are listed below." }} />}
      <Notice msg={msg} />
      {online && state === "loading" && <Skeleton rows={3} />}
      {online && state === "error" && <Notice msg={{ ok: false, text: "The pack list could not be loaded. Try again later." }} />}
      {online && state === "forbidden" && <p>You are not enrolled in this course.</p>}
      {list && list.length === 0 && deviceOnly.length === 0 && <p>Your teacher has not published any offline packs for this course yet.</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {(list || []).map((p) => {
          const d = have.get(p.id), mine = busy && busy.packId === p.id, upToDate = d && p.manifestSha256 && d.manifestSha256 === p.manifestSha256;
          return (
            <li key={p.id} style={S.box}>
              <strong>{p.name}</strong>
              <div style={{ fontSize: 13, color: C.muted, margin: "4px 0 8px" }}>{p.lessons} lesson{p.lessons === 1 ? "" : "s"} · {mb(p.totalBytes)}{day(p.expiresAt) ? ` · available until ${day(p.expiresAt)}` : ""}{d ? (upToDate ? " · On this device" : " · On this device (a newer version is available)") : ""}</div>
              {mine ? (
                <div><progress max={busy.total || 1} value={busy.done} aria-label={`Downloading ${p.name}`} style={{ width: "100%" }} /><div aria-live="polite" style={{ fontSize: 13 }}>Downloading {busy.done} of {busy.total || "…"}</div>
                  <button type="button" style={S.btn} onClick={() => abortRef.current && abortRef.current.abort()}>Cancel</button></div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(!d || !upToDate) && <button type="button" style={S.btnPrimary} disabled={!!busy} onClick={() => download(p)}>{d ? "Update" : "Download"}</button>}
                  {d && <button type="button" style={S.btn} disabled={!!busy} onClick={() => remove(d)}>Remove from this device</button>}
                </div>
              )}
            </li>
          );
        })}
        {deviceOnly.map((d) => (
          <li key={`d${d.packId}`} style={S.box}>
            <strong>{d.name}</strong>
            <div style={{ fontSize: 13, color: C.muted, margin: "4px 0 8px" }}>On this device{list ? " (no longer published)" : ""}</div>
            <button type="button" style={S.btn} disabled={!!busy} onClick={() => remove(d)}>Remove from this device</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
