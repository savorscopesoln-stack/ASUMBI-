import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton, SavedCopy } from "./lmsUi";
import OfflineStrip from "./OfflineStrip";
import useOfflineQueue from "../../hooks/useOfflineQueue";
import useLmsLicence from "../../hooks/useLmsLicence";
import { noResponse } from "../../utils/lmsOfflineEnqueue";
import useReadCache from "../../hooks/useReadCache";
import { cachedGet } from "../../utils/lmsReadCache";

/* Student assignments (first cut, TEXT hand-in). Routes: /student/courses/:courseId/assignments (list) and .../assignments/:assignmentId (work on one).
   Backend (student only, ACTIVE enrolment; all verified in backend/routes/lms.js):
   GET  /lms/courses/:id/learn/assignments?page&pageSize          -> { items:[{id,title,dueAt,maxPoints,submissionStatus:{status,attemptsUsed,finalPoints?,maxPoints?}}], total, page, pageSize }
   GET  .../learn/assignments/:aid                                 -> { assignment:{title,instructions,dueAt,cutoffAt,submissionType,maxAttempts,maxPoints,workMode,submissionStatus} }
   GET  .../learn/assignments/:aid/submission                      -> { canWrite, closedReason, window:{open,late,latePenaltyPercent}, draft:{attemptNo,text,updatedAt}|null, prefillText, attempts:[{attemptNo,text,submittedAt,late}], attemptsLeft, submissionType, group }
   PUT  .../submission/draft {text} -> { draft }      POST .../submission/submit {text} -> 201 { submission }      GET .../learn/assignments/:aid/feedback -> { items }
   Text is plain text and is ALWAYS rendered as text (React escapes it; never as HTML). Time is the server's clock; the screen only shows what the server says.
   Offline (L10.3f step 2, D-124, only when `lms_offline` is sold): when a save gets NO answer the screen says so and offers an explicit "Save on this device"; after the learner has chosen that once, later
   no-answer saves of this assignment replace the device copy by themselves. The final hand in is NEVER queued (Q104). FILE HAND-IN (S61, D-125): types files/both, online only, never queued offline. (was: NOT in this unit: file hand-in (types files/both show a plain notice), rubric view. */

const AUTOSAVE_MS = 1500, PAGE_SIZE = 20, MAX_TEXT = 20000;
const STATUS = { not_started: "Not started", draft: "Draft saved", submitted: "Handed in", returned: "Marked and returned" };
const when = (iso) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };

function useGate(setState) {
  return useCallback((e) => {
    if (isModuleNotLicensed(e)) setState("unlicensed");
    else if ([403, 404].includes(e?.response?.status)) setState("forbidden");
    else setState("error");
  }, [setState]);
}

const Forbidden = ({ courseId }) => <div style={S.page}><p>You are not enrolled in this course, or this assignment is not available.</p><Link to={`/student/courses/${courseId}/learn`}>Back to the course</Link></div>;

/* ------------------------------ list ------------------------------ */
export function StudentAssignmentList() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/learn`;
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState(null);
  const gate = useGate(setState);
  const cache = useReadCache(useOfflineQueue()); // D-134: last good read, used only when the network is down
  const [savedAt, setSavedAt] = useState(null);

  const fetchPage = useCallback((p) => cachedGet(cache, `${base}/assignments?p=${p}`, () => API.get(`${base}/assignments`, { params: { page: p, pageSize: PAGE_SIZE } })), [base, cache]);
  const onOk = useCallback((r) => { setData(r.data); setSavedAt(r.fromDevice || null); setState("ready"); }, []);
  const onFail = useCallback((e) => { if (isModuleNotLicensed(e) || [403, 404].includes(e?.response?.status)) gate(e); else { setMsg({ ok: false, text: errText(e) }); setState("error"); } }, [gate]);
  useEffect(() => { let alive = true; fetchPage(page).then((r) => { if (alive) onOk(r); }).catch((e) => { if (alive) onFail(e); }); return () => { alive = false; }; }, [fetchPage, page, onOk, onFail]);
  const retry = () => { setState("loading"); setMsg(null); fetchPage(page).then(onOk).catch(onFail); };
  const goPage = (p) => { setState("loading"); setPage(p); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "forbidden") return <Forbidden courseId={courseId} />;
  if (state === "loading" && !data) return <div style={S.page}><Skeleton rows={3} /></div>;
  if (state === "error") return <div style={S.page}><Notice msg={msg} /><button type="button" style={S.btn} onClick={retry}>Try again</button></div>;
  const items = data.items || [];
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/learn`}>← Lessons</Link></p>
      <h1 style={S.h1}>Assignments</h1>
      <SavedCopy at={savedAt} />
      {items.length === 0 && <p style={{ color: C.muted }}>Your teacher has not published any assignments yet.</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 8 }}>
        {items.map((a) => {
          const st = a.submissionStatus || { status: "not_started" };
          return (
            <li key={a.id} style={S.box}>
              <Link to={`/student/courses/${courseId}/assignments/${a.id}`} style={{ fontWeight: 700, fontSize: 16 }}>{a.title}</Link>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                {a.dueAt ? `Due ${when(a.dueAt)}` : "No due date"}
                {" · "}<strong style={{ color: C.text }}>{STATUS[st.status] || st.status}</strong>
                {st.status === "returned" && st.maxPoints != null ? ` · ${st.finalPoints} / ${st.maxPoints}` : ""}
              </div>
            </li>
          );
        })}
      </ul>
      <Pager page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPage={goPage} busy={state === "loading"} />
    </div>
  );
}

/* Rubric (S64, D-128, Q112). Read only. GET .../learn/assignments/:aid/rubric -> { rubric: null | { title, description, maxPoints, criteria:[{ title, description, weight, levels:[{ label, description, points }] }] } }.
   Shown to the learner BEFORE and after hand-in so they know how the work is marked. Any failure just hides it (the assignment still works). All text is rendered as text. */
function RubricView({ rubric }) {
  if (!rubric || !Array.isArray(rubric.criteria) || !rubric.criteria.length) return null;
  return (
    <details style={{ ...S.box, marginBottom: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 28 }}>How this will be marked{rubric.title ? `: ${rubric.title}` : ""}{rubric.maxPoints != null ? ` (${rubric.maxPoints} marks)` : ""}</summary>
      {rubric.description && <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", color: C.muted, fontSize: 14 }}>{rubric.description}</p>}
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {rubric.criteria.map((c, i) => (
          <div key={i}>
            <div style={{ fontWeight: 600 }}>{c.title}{c.weight != null ? <span style={{ fontWeight: 400, color: C.muted }}> · weight {c.weight}</span> : null}</div>
            {c.description && <div style={{ fontSize: 13, color: C.muted, whiteSpace: "pre-wrap" }}>{c.description}</div>}
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 14 }}>
              {(c.levels || []).map((l, j) => <li key={j}><strong>{l.label}</strong> ({l.points} {l.points === 1 ? "mark" : "marks"}){l.description ? `: ${l.description}` : ""}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

/* ----------------------------- detail ----------------------------- */
export default function StudentAssignment() {
  const helpOn = useLmsLicence().flags.includes("lms_discussions"); // 'Ask about this assignment' link (S110); the server enforces the flag anyway
  const { courseId, assignmentId } = useParams();
  const base = `/lms/courses/${courseId}/learn/assignments/${assignmentId}`;
  const [state, setState] = useState("loading"); // loading | ready | error | forbidden | unlicensed
  const [a, setA] = useState(null);
  const [sub, setSub] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [rubric, setRubric] = useState(null);
  const [text, setText] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved | failed | offline (no answer, not kept anywhere) | device (kept on this device)
  const [savedAt, setSavedAt] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false); // an upload / remove is running
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine !== false);
  const fileInput = useRef(null);
  const lastSaved = useRef(""); // text the server has
  const textRef = useRef(""); const saving = useRef(false); const timer = useRef(null);
  const gate = useGate(setState);
  const queue = useOfflineQueue(); // null unless the offline add-on is sold
  const cache = useReadCache(queue); // D-134: last good read, used only when the network is down
  const [copyAt, setCopyAt] = useState(null); // ISO time of the device copy being shown (null = live)
  const cid = Number(courseId), aid = Number(assignmentId);
  const versionRef = useRef(null); // the draft version the server last told us (null = no draft): the baseVersion for a device copy
  const deviceText = useRef(null); // the text last kept on this device for this assignment (null = none)
  const deviceMode = useRef(false); // learner chose "Save on this device" once: later no-answer saves replace the copy
  const stateRef = useRef("idle");
  const editSeq = useRef(0); // counts the learner's edits: a server copy fetched BEFORE an edit must never replace text typed AFTER it

  const adopt = useCallback((s) => {
    setSub(s);
    const start = s.draft ? s.draft.text : s.prefillText != null ? s.prefillText : "";
    versionRef.current = s.draft ? s.draft.updatedAt : null;
    lastSaved.current = s.draft ? s.draft.text : ""; // a prefill is NOT on the server yet, so the first autosave creates the draft
    textRef.current = start; setText(start);
    setSaveState(s.prefillText != null && !s.draft && start ? "dirty" : s.draft ? "saved" : "idle"); setSavedAt(s.draft ? s.draft.updatedAt : null);
  }, []);

  useEffect(() => { let alive = true; cachedGet(cache, `${base}/rubric`, () => API.get(`${base}/rubric`)).then((r) => { if (alive) setRubric(r.data?.rubric || null); }).catch(() => { if (alive) setRubric(null); }); return () => { alive = false; }; }, [base, cache]);
  const fetchAll = useCallback(() => Promise.all([cachedGet(cache, base, () => API.get(base)), cachedGet(cache, `${base}/submission`, () => API.get(`${base}/submission`)), cachedGet(cache, `${base}/feedback`, () => API.get(`${base}/feedback`)).catch(() => ({ data: { items: [] } }))]), [base, cache]);
  const onLoaded = useCallback(([x, y, f]) => { setA(x.data.assignment); adopt(y.data); setFeedback(f.data.items || []); setCopyAt(x.fromDevice || y.fromDevice || null); setState("ready"); }, [adopt]);
  const onLoadFail = useCallback((e) => { if (isModuleNotLicensed(e) || [403, 404].includes(e?.response?.status)) gate(e); else { setMsg({ ok: false, text: errText(e) }); setState("error"); } }, [gate]);
  useEffect(() => { let alive = true; fetchAll().then((r) => { if (alive) onLoaded(r); }).catch((e) => { if (alive) onLoadFail(e); }); return () => { alive = false; }; }, [fetchAll, onLoaded, onLoadFail]);
  const loadAll = () => { setState("loading"); setMsg(null); fetchAll().then(onLoaded).catch(onLoadFail); };

  useEffect(() => { stateRef.current = saveState; }, [saveState]);
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  const writable = !!sub?.canWrite && sub?.submissionType !== "files";

  /* Keep the text on this device (offline add-on). baseVersion = the draft version the server last told us, so a real conflict is told apart from a plain update on sync. */
  const keepOnDevice = useCallback((t) => {
    if (!queue) return false;
    const r = queue.enqueueDraft(cid, { assignmentId: aid, text: t, baseVersion: versionRef.current });
    if (!r.ok) { setSaveState("offline"); setMsg({ ok: false, text: r.message || "This device could not keep your text." }); return false; }
    deviceMode.current = true; deviceText.current = t; setMsg(null); setSaveState(textRef.current === t ? "device" : "dirty"); return true;
  }, [queue, cid, aid]);

  const save = useCallback(async () => {
    if (saving.current) return false;
    const t = textRef.current; if (t === lastSaved.current) return true;
    saving.current = true; setSaveState("saving");
    try {
      const r = await API.put(`${base}/submission/draft`, { text: t });
      lastSaved.current = t; setSavedAt(r.data?.draft?.updatedAt || new Date().toISOString()); if (r.data?.draft?.updatedAt) versionRef.current = r.data.draft.updatedAt;
      setSaveState(textRef.current === t ? "saved" : "dirty"); // typed more while saving: stay dirty, the next tick saves again
      return true;
    } catch (e) {
      if (queue && noResponse(e)) { if (deviceMode.current) keepOnDevice(t); else { setSaveState("offline"); setMsg(null); } return false; }
      setSaveState("failed"); setMsg({ ok: false, text: errText(e) }); return false;
    }
    finally { saving.current = false; }
  }, [base, queue, keepOnDevice]);

  useEffect(() => { // autosave after a pause in typing
    if (saveState !== "dirty" || !writable) return undefined;
    timer.current = setTimeout(() => { save(); }, AUTOSAVE_MS);
    return () => clearTimeout(timer.current);
  }, [saveState, text, writable, save]);

  useEffect(() => { // never lose typing silently by closing the tab
    const warn = (ev) => { if (textRef.current !== lastSaved.current && textRef.current !== deviceText.current && writable) { ev.preventDefault(); ev.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [writable]);

  /* ---- file hand-in (types files / both). The server is the authority on type, size, count and safety; these checks only save a round trip. ---- */
  const draftFiles = sub?.draft?.files || [];
  const filesAllowed = !!sub && sub.submissionType !== "text" && sub.workMode !== "group";
  const extOf = (n) => (String(n).includes(".") ? String(n).split(".").pop().toLowerCase() : "");
  const refreshFiles = async () => { const r = await API.get(`${base}/submission`); setSub((prev) => ({ ...prev, draft: r.data.draft ? { ...(prev?.draft || {}), attemptNo: r.data.draft.attemptNo, files: r.data.draft.files || [] } : prev?.draft ? { ...prev.draft, files: [] } : null, canWrite: r.data.canWrite, closedReason: r.data.closedReason })); };
  const addFile = async (file) => {
    if (!file) return;
    const allowed = (sub.effective?.allowedExtensions || []).map((x) => String(x).replace(/^\./, "").toLowerCase()), maxMb = sub.effective?.maxFileMb || 0;
    if (allowed.length && !allowed.includes(extOf(file.name))) { setMsg({ ok: false, text: `That file type is not allowed here. Allowed: ${allowed.join(", ")}.` }); return; }
    if (maxMb && file.size > maxMb * 1048576) { setMsg({ ok: false, text: `That file is too large (limit ${maxMb} MB).` }); return; }
    if (sub.maxFiles && draftFiles.length >= sub.maxFiles) { setMsg({ ok: false, text: `You can add at most ${sub.maxFiles} files to one attempt.` }); return; }
    setFileBusy(true); setMsg(null);
    try { const fd = new FormData(); fd.append("file", file); await API.post(`${base}/submission/files`, fd, { headers: { "Content-Type": "multipart/form-data" } }); await refreshFiles(); setConfirming(false); setMsg({ ok: true, text: `Added ${file.name}.` }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); }
    finally { setFileBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  };
  const removeFile = async (f) => {
    setFileBusy(true); setMsg(null);
    try { await API.delete(`${base}/submission/files/${f.id}`); await refreshFiles(); setConfirming(false); setMsg({ ok: true, text: `Removed ${f.name}.` }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); }
    finally { setFileBusy(false); }
  };
  const downloadFile = async (f) => {
    try {
      const r = await API.get(`${base}/submission/files/${f.id}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data])), a2 = document.createElement("a");
      a2.href = url; a2.download = f.name || `file.${f.ext}`; document.body.appendChild(a2); a2.click(); a2.remove(); setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };
  const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  const onType = (v) => { const t = v.slice(0, MAX_TEXT); editSeq.current += 1; textRef.current = t; setText(t); setMsg(null); setConfirming(false); setSaveState(t === lastSaved.current ? "saved" : "dirty"); };

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const handedIn = textRef.current;
      await API.post(`${base}/submission/submit`, sub.submissionType === "files" ? {} : { text: handedIn });
      if (queue && sub.submissionType !== "files") { try { queue.dropHandedInDraft(cid, aid, handedIn); } catch { /* the strip still shows anything left */ } }
      deviceText.current = null; deviceMode.current = false;
      setConfirming(false); setMsg({ ok: true, text: "Handed in. Your teacher can now see this attempt." });
      const [x, y, f] = await Promise.all([API.get(base), API.get(`${base}/submission`), API.get(`${base}/feedback`).catch(() => ({ data: { items: [] } }))]);
      setA(x.data.assignment); adopt(y.data); setFeedback(f.data.items || []);
    } catch (e) { setConfirming(false); setMsg({ ok: false, text: errText(e) }); }
    finally { setBusy(false); }
  };

  /* The strip sent or settled something: the server is the truth again. Unless the learner has typed since, show what the server holds. */
  const reconcile = useCallback(() => {
    const seq = editSeq.current;
    API.get(`${base}/submission`).then((r) => {
      const left = queue ? queue.list(cid).filter((e) => e.type === "submission_draft" && e.assignmentId === aid) : [];
      versionRef.current = r.data.draft ? r.data.draft.updatedAt : null;
      if (left.length === 0) { deviceText.current = null; deviceMode.current = false; if (seq === editSeq.current && !["dirty", "saving"].includes(stateRef.current)) adopt(r.data); }
    }).catch(() => { /* reconciled again at the next sync */ });
  }, [base, queue, cid, aid, adopt]);

  const hasWork = useMemo(() => (sub?.submissionType !== "files" && text.trim().length > 0) || (sub?.submissionType !== "text" && (sub?.draft?.files?.length || 0) > 0), [text, sub]);
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "loading") return <div style={S.page}><Skeleton rows={4} /></div>;
  if (state === "forbidden") return <Forbidden courseId={courseId} />;
  if (state === "error") return <div style={S.page}><Notice msg={msg} /><button type="button" style={S.btn} onClick={loadAll}>Try again</button></div>;

  const handInControls = !confirming
    ? <button type="button" style={S.btnPrimary} disabled={busy || fileBusy || !hasWork || !online} onClick={() => setConfirming(true)}>Hand in</button>
    : (
      <span role="group" aria-label="Confirm hand in" style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14 }}>Hand in now? You cannot change this attempt afterwards.</span>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={submit}>{busy ? "Handing in…" : "Yes, hand in"}</button>
        <button type="button" style={S.btn} disabled={busy} onClick={() => setConfirming(false)}>Not yet</button>
      </span>
    );
  const allowedList = (sub.effective?.allowedExtensions || []).map((x) => String(x).replace(/^\./, "").toLowerCase());
  const filesSection = filesAllowed && (
    <section aria-label="Your files" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Your files</h2>
      {sub.canWrite && (
        <>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px" }}>
            {sub.maxFiles ? `Up to ${sub.maxFiles} files` : "Files"}{sub.effective?.maxFileMb ? `, ${sub.effective.maxFileMb} MB each` : ""}{allowedList.length ? `. Allowed: ${allowedList.join(", ")}` : ""}. Files can only be added while you are online; they are never kept on this device.
          </p>
          <label htmlFor="work-file" style={{ ...S.btn, display: "inline-block", cursor: !online || fileBusy ? "not-allowed" : "pointer", opacity: !online || fileBusy ? 0.6 : 1 }}>{fileBusy ? "Working…" : "Add a file"}</label>
          <input ref={fileInput} id="work-file" type="file" style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} disabled={!online || fileBusy || (sub.maxFiles > 0 && draftFiles.length >= sub.maxFiles)}
            accept={allowedList.length ? allowedList.map((x) => `.${x}`).join(",") : undefined} onChange={(e) => addFile(e.target.files && e.target.files[0])} />
          {!online && <p role="note" style={{ fontSize: 13, color: C.warn, margin: "8px 0 0" }}>You are offline. Reconnect to add, remove or hand in files.</p>}
        </>
      )}
      {draftFiles.length === 0 ? <p style={{ fontSize: 14, color: C.muted, margin: "10px 0 0" }}>No files added yet.</p> : (
        <ul aria-label="Files in this attempt" style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
          {draftFiles.map((f) => (
            <li key={f.id} style={{ ...S.box, display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ wordBreak: "break-word" }}>{f.name} <span style={{ color: C.muted, fontSize: 13 }}>({kb(f.sizeBytes)})</span></span>
              <span style={{ display: "inline-flex", gap: 8 }}>
                <button type="button" style={S.btn} onClick={() => downloadFile(f)} aria-label={`Download ${f.name}`}>Download</button>
                {sub.canWrite && <button type="button" style={S.btn} disabled={fileBusy || !online} onClick={() => removeFile(f)} aria-label={`Remove ${f.name}`}>Remove</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {sub.canWrite && sub.submissionType === "files" && <div style={{ marginTop: 12 }}>{handInControls}</div>}
      {sub.canWrite && sub.submissionType === "both" && <div style={{ marginTop: 12 }}>{handInControls}<p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0" }}>Your text and files are handed in together.</p></div>}
    </section>
  );

  const win = sub.window || {};
  const saveText = { idle: "", dirty: "Not saved yet", saving: "Saving…", saved: savedAt ? `Saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Saved", failed: "Could not save. Your text is still here; it is not saved on the server.", offline: "No connection. Your text is not on the server yet.", device: "Saved on this device. It will be sent when you are back online." }[saveState];
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/assignments`}>← Assignments</Link></p>
      <h1 style={S.h1}>{a.title}</h1>
      {helpOn && navigator.onLine !== false && <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/help?assignmentId=${assignmentId}`}>Ask about this assignment</Link></p>}
      <p style={S.sub}>
        {a.dueAt ? `Due ${when(a.dueAt)}` : "No due date"}
        {a.maxPoints != null ? ` · ${a.maxPoints} points` : ""}
        {` · Attempt${sub.maxAttempts === 1 ? "" : "s"}: ${sub.attemptsUsed} of ${sub.maxAttempts} used`}
        {a.submissionStatus ? ` · ${STATUS[a.submissionStatus.status] || ""}` : ""}
      </p>
      {queue && <OfflineStrip courseId={cid} queue={queue} onSynced={reconcile} />}
      <SavedCopy at={copyAt} />
      <Notice msg={msg} />
      {a.instructions && <section aria-label="Instructions" style={{ ...S.box, marginBottom: 14, whiteSpace: "pre-wrap" }}>{a.instructions}</section>}
      {sub.workMode === "group" && sub.group && <p style={{ fontSize: 14 }}>Group work: what you write is shared with your group, and anyone in the group can hand it in for everyone.</p>}
      {win.open && win.late && sub.canWrite && <div role="note" style={{ ...S.box, borderColor: C.warn, color: C.warn, marginBottom: 12 }}>This is past the due date, so it will be marked late{win.latePenaltyPercent ? ` (${win.latePenaltyPercent}% penalty)` : ""}.</div>}
      {!sub.canWrite && sub.closedReason && <div role="note" style={{ ...S.box, marginBottom: 12 }}>{sub.closedReason.message}</div>}
      {sub.submissionType !== "files" && (
        <section aria-label="Your work" style={{ marginBottom: 16 }}>
          <label htmlFor="work-text" style={S.label}>Your answer{sub.draft || sub.prefillText != null ? ` (attempt ${sub.draft ? sub.draft.attemptNo : sub.attemptsUsed + 1})` : ""}</label>
          {sub.prefillText != null && !sub.draft && sub.canWrite && <p style={{ fontSize: 13, color: C.muted, margin: "0 0 6px" }}>This new attempt starts with the text of your last one. Change it as you need.</p>}
          <textarea id="work-text" value={text} onChange={(e) => onType(e.target.value)} readOnly={!writable} rows={12} maxLength={MAX_TEXT}
            style={{ ...S.input, width: "100%", minHeight: 220, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13, color: C.muted, marginTop: 4 }}>
            <span role="status" aria-live="polite" style={{ color: saveState === "failed" ? C.bad : C.muted }}>{writable ? saveText : ""}</span>
            <span>{text.length} / {MAX_TEXT}</span>
          </div>
          {writable && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <button type="button" style={S.btn} disabled={busy || saveState === "saving" || saveState === "saved" || saveState === "idle"} onClick={save}>Save now</button>
              {queue && saveState === "offline" && <button type="button" style={S.btnPrimary} onClick={() => keepOnDevice(textRef.current)}>Save on this device</button>}
              {sub.submissionType === "text" && handInControls}
            </div>
          )}
        </section>
      )}

      {filesSection}

      <RubricView rubric={rubric} />

      {feedback.length > 0 && (
        <section aria-label="Feedback" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Feedback from your teacher</h2>
          {feedback.map((f) => (
            <div key={f.submissionId ?? f.attemptNo} style={{ ...S.box, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Attempt {f.attemptNo}{f.finalPoints != null ? `: ${f.finalPoints} / ${f.maxPoints}` : ""}</div>
              {f.comment && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{f.comment}</p>}
              {Array.isArray(f.criteria) && f.criteria.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14 }}>
                  {f.criteria.map((c, i) => <li key={i}><strong>{c.criterion || "Criterion"}</strong>{c.level ? `: ${c.level}` : ""} ({c.points} {c.points === 1 ? "mark" : "marks"}){c.comment ? ` · ${c.comment}` : ""}</li>)}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {sub.attempts.length > 0 && (
        <section aria-label="Handed-in attempts">
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Your handed-in attempts</h2>
          {sub.attempts.map((x) => (
            <details key={x.attemptNo} style={{ ...S.box, marginBottom: 8 }}>
              <summary style={{ cursor: "pointer" }}>Attempt {x.attemptNo} · handed in {when(x.submittedAt) || "—"}{x.late ? " · late" : ""}</summary>
              {x.text ? <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "8px 0 0", fontFamily: "inherit" }}>{x.text}</pre> : null}
              {(x.files || []).length > 0 && (
                <ul aria-label={`Files in attempt ${x.attemptNo}`} style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                  {x.files.map((f) => <li key={f.id} style={{ marginBottom: 4 }}>{f.name} <span style={{ color: C.muted, fontSize: 13 }}>({kb(f.sizeBytes)})</span> <button type="button" style={S.btn} onClick={() => downloadFile(f)} aria-label={`Download ${f.name}`}>Download</button></li>)}
                </ul>
              )}
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
