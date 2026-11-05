import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";
import { BlockList } from "./BlockView";
import OfflineStrip from "./OfflineStrip";
import useOfflineQueue from "../../hooks/useOfflineQueue";
import { queueLessonAction, noResponse } from "../../utils/lmsOfflineEnqueue";
import usePackStore from "../../hooks/usePackStore";
import useLmsLicence from "../../hooks/useLmsLicence";
import { packLessonList, loadPackLesson } from "../../utils/lmsOfflineReader";

/* Student course player (L4.2 first cut) at /student/courses/:courseId/learn?lesson=ID.
   Backend (student only, ACTIVE enrolment): GET /lms/courses/:id/learn/lessons (sections, unsectioned; each lesson has locked/lockedBy),
   GET .../learn/lessons/:lessonId (409 LESSON_LOCKED has lockedBy; no content), POST .../view (on open and every 30 s, body {seconds:30};
   the server decides how much time counts), POST .../complete (409 MIN_TIME_NOT_MET has remainingSeconds), GET .../learn/progress
   (percent, completed, total, lessons[{lessonId,status}], resumeLessonId). Bookmarks and personal notes are NOT built yet. */

const TICK_MS = 30000;
const STATUS_TEXT = { completed: "Completed", in_progress: "In progress", not_started: "Not started" };

export default function CoursePlayer() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const licFlags = useLmsLicence().flags, pathsOn = licFlags.includes("lms_paths"), outcomesOn = licFlags.includes("lms_competency"), discussionsOn = licFlags.includes("lms_discussions"); // the Discussions link belongs to the Standard tier (A241); the server enforces it anyway
  const lessonId = Number(params.get("lesson")) || null;
  const base = `/lms/courses/${courseId}/learn`;

  const [list, setList] = useState(null); // { sections, unsectioned }
  const [prog, setProg] = useState(null); // { percent, completed, total, lessons, resumeLessonId }
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed | forbidden
  const [msg, setMsg] = useState(null);
  /* L10.3e: this learner's offline queue (per user, on this device). No signed-in user = no queue = no strip. The strip shows nothing while the queue is empty. */
  const queue = useOfflineQueue(); // null unless `lms_offline` is sold and a learner is signed in (shared with the assignment screen)
  const store = usePackStore(queue); // lessons saved on this device (L10.2b step 3); only read when the network is down
  const [offlineMode, setOfflineMode] = useState(false);

  const fetchBoth = useCallback(() => Promise.all([API.get(`${base}/lessons`), API.get(`${base}/progress`)]), [base]);
  const apply = useCallback(([l, p]) => { setList({ sections: l.data.sections || [], unsectioned: l.data.unsectioned || [] }); setProg(p.data); setState("ready"); }, []);
  const fail = useCallback((e) => {
    if (isModuleNotLicensed(e)) setState("unlicensed");
    else if ([403, 404].includes(e?.response?.status)) setState("forbidden");
    else if (noResponse(e)) setState("netdown");
    else { setMsg({ ok: false, text: errText(e) }); setState("error"); }
  }, []);
  const loadAll = useCallback(() => { setOfflineMode(false); setState("loading"); fetchBoth().then(apply).catch(fail); }, [fetchBoth, apply, fail]);
  useEffect(() => { let alive = true; fetchBoth().then((r) => { if (alive) apply(r); }).catch((e) => { if (alive) fail(e); }); return () => { alive = false; }; }, [fetchBoth, apply, fail]);
  // Network down: show the lessons saved on this device (needs the offline add-on; nothing is read from the device while the server answers).
  useEffect(() => {
    if (state !== "netdown" || !store) return undefined;
    let alive = true;
    packLessonList(store, Number(courseId)).then((l) => {
      if (!alive || !l.length) return;
      setList({ sections: [], unsectioned: l.map((x) => ({ id: x.id, title: x.title })) }); setProg({ percent: 0, completed: 0, total: l.length, lessons: [], resumeLessonId: null }); setOfflineMode(true); setState("ready");
    }).catch(() => { /* stays on the offline message */ });
    return () => { alive = false; };
  }, [state, store, courseId]);
  const refreshProgress = useCallback(() => { fetchBoth().then(apply).catch(() => { /* refreshed again on the next action */ }); }, [fetchBoth, apply]);

  const flat = useMemo(() => (list ? [...list.sections.flatMap((s) => s.lessons), ...list.unsectioned] : []), [list]);
  const statusOf = useMemo(() => new Map((prog?.lessons || []).map((x) => [x.lessonId, x.status])), [prog]);
  const open = (id) => { setMsg(null); setParams({ lesson: String(id) }); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "loading") return <div style={S.page}><Skeleton rows={3} /></div>;
  if (state === "forbidden") return <div style={S.page}><p>You are not enrolled in this course, or it is not available.</p><Link to="/student/courses">Back to my courses</Link></div>;
  if (state === "netdown") return <div style={S.page}><Notice msg={{ ok: false, text: queue ? "You are offline and no lessons are saved on this device for this course." : "You are offline. Connect to open your lessons." }} /><button type="button" style={S.btn} onClick={loadAll}>Try again</button></div>;
  if (state === "error") return <div style={S.page}><Notice msg={msg} /><button type="button" style={S.btn} onClick={loadAll}>Try again</button></div>;

  const resume = prog?.resumeLessonId;
  const idx = flat.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  const item = (l) => {
    const st = statusOf.get(l.id) || "not_started";
    return (
      <li key={l.id}>
        <button type="button" onClick={() => open(l.id)} aria-current={l.id === lessonId ? "true" : undefined}
          style={{ ...S.btn, width: "100%", textAlign: "left", borderColor: l.id === lessonId ? C.accent : C.border, fontWeight: l.id === lessonId ? 700 : 400 }}>
          {l.title}
          <span style={{ display: "block", fontSize: 12, color: C.muted, fontWeight: 400 }}>
            {l.locked ? "Locked: finish earlier lessons first" : STATUS_TEXT[st]}{l.estimatedMinutes ? ` · ${l.estimatedMinutes} min` : ""}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div style={{ ...S.page, maxWidth: 1200 }}>
      <p style={{ margin: "0 0 6px", fontSize: 14, display: "flex", gap: 16, flexWrap: "wrap" }}><Link to="/student/courses">← My courses</Link><Link to={`/student/courses/${courseId}/assignments`}>Assignments</Link><Link to={`/student/courses/${courseId}/quizzes`}>Quizzes</Link>{pathsOn && <Link to={`/student/courses/${courseId}/paths`}>Learning paths</Link>}{outcomesOn && <Link to={`/student/courses/${courseId}/outcomes`}>My outcomes</Link>}{discussionsOn && <Link to={`/student/courses/${courseId}/discussions`}>Discussions</Link>}{discussionsOn && <Link to={`/student/courses/${courseId}/peer-review`}>Peer review</Link>}{discussionsOn && <Link to={`/student/courses/${courseId}/help`}>Help</Link>}{queue && <Link to={`/student/courses/${courseId}/offline`}>Offline lessons</Link>}</p>
      <h1 style={S.h1}>Lessons</h1>
      {offlineMode && <div role="status" style={{ ...S.box, margin: "8px 0 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span>Offline: showing lessons saved on this device.</span><button type="button" style={S.btn} onClick={loadAll}>Go online</button></div>}
      {!offlineMode && <div style={{ ...S.box, margin: "8px 0 14px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>{prog.percent}% complete ({prog.completed} of {prog.total} lessons)</div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog.percent} aria-label="Course progress" style={{ height: 8, borderRadius: 999, background: C.border }}>
            <div style={{ height: 8, borderRadius: 999, width: `${prog.percent}%`, background: C.accent }} />
          </div>
        </div>
        {resume && resume !== lessonId && <button type="button" style={S.btnPrimary} onClick={() => open(resume)}>Continue learning</button>}
      </div>}
      {queue && <OfflineStrip courseId={Number(courseId)} queue={queue} onSynced={refreshProgress} />}
      <Notice msg={msg} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <nav aria-label="Lessons" style={{ flex: "1 1 260px", maxWidth: 360, minWidth: 0 }}>
          {flat.length === 0 && <p style={{ color: C.muted }}>Your teacher has not published any lessons yet.</p>}
          {list.sections.filter((s) => s.lessons.length).map((s) => (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, margin: "0 0 6px", color: C.muted }}>{s.title}</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>{s.lessons.map(item)}</ul>
            </div>
          ))}
          {list.unsectioned.length > 0 && <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>{list.unsectioned.map(item)}</ul>}
        </nav>
        <main style={{ flex: "3 1 420px", minWidth: 0 }}>
          {lessonId
            ? <LessonPane key={lessonId} store={store} base={base} courseId={Number(courseId)} queue={queue} lessonId={lessonId} prev={prev} next={next} onOpen={open} onChanged={refreshProgress} />
            : <p style={{ color: C.muted }}>{flat.length ? "Choose a lesson to begin." : ""}</p>}
        </main>
      </div>
    </div>
  );
}

function LessonPane({ store, base, courseId, queue, lessonId, prev, next, onOpen, onChanged }) {
  const helpOn = useLmsLicence().flags.includes("lms_discussions"); // 'Ask about this lesson' (S110); Help is online only, so it is hidden while the device is offline
  const [state, setState] = useState("loading"); // loading | ready | locked | error
  const [data, setData] = useState(null);
  const [locked, setLocked] = useState([]);
  const [status, setStatus] = useState("not_started");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [urlMap, setUrlMap] = useState(null); // blob URLs when the lesson is read from the device
  const disposeRef = useRef(null);
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);
  useEffect(() => () => { if (disposeRef.current) disposeRef.current(); }, []);
  const [savedHere, setSavedHere] = useState(false); // L10.3f: "mark complete" is saved on this device, not yet sent
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  const onChangedRef = useRef(onChanged);
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let r;
        try { r = await API.get(`${base}/lessons/${lessonId}`); }
        catch (e0) {
          if (!noResponse(e0) || !storeRef.current) throw e0;
          const o = await loadPackLesson({ store: storeRef.current, courseId, lessonId });
          if (!alive) { if (o.ok) o.dispose(); return; }
          if (!o.ok) { setMsg({ ok: false, text: o.message || "This lesson is not saved on this device." }); setState("error"); return; }
          disposeRef.current = o.dispose; setUrlMap(o.urlMap); r = { data: { lesson: o.lesson, blocks: o.blocks } };
        }
        if (!alive) return;
        setData(r.data); setState("ready");
        try {
          const v = await API.post(`${base}/lessons/${lessonId}/view`);
          if (!alive) return;
          if (v.data.progress) setStatus(v.data.progress.status);
          onChangedRef.current?.();
        } catch (e2) { queueLessonAction(queueRef.current, courseId, { kind: "view", lessonId }, e2); /* viewing is recorded best effort; reading is not blocked. With no connection and the offline add-on, it waits on this device. */ }
      } catch (e) {
        if (!alive) return;
        if (e?.response?.data?.code === "LESSON_LOCKED") { setLocked(e.response.data.lockedBy || []); setState("locked"); }
        else { setMsg({ ok: false, text: errText(e, "Could not open this lesson.") }); setState("error"); }
      }
    })();
    return () => { alive = false; };
  }, [base, courseId, lessonId]);

  // Time on the lesson: report every 30 s while the page is visible. The server decides how much of it counts.
  useEffect(() => {
    if (state !== "ready") return undefined;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      API.post(`${base}/lessons/${lessonId}/view`, { seconds: 30 }).then((v) => { if (v.data.progress) setStatus(v.data.progress.status); }).catch(() => {});
    }, TICK_MS);
    return () => clearInterval(t);
  }, [state, base, lessonId]);

  const complete = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await API.post(`${base}/lessons/${lessonId}/complete`);
      setStatus(r.data.progress?.status || "completed"); setMsg({ ok: true, text: "Lesson completed." }); onChanged();
    } catch (e) {
      const d = e?.response?.data;
      const q = queueLessonAction(queue, courseId, { kind: "complete", lessonId }, e);
      if (q.queued) {
        if (q.ok) { setSavedHere(true); setMsg({ ok: true, text: "Saved on this device. It will be sent when you are back online." }); }
        else setMsg({ ok: false, text: q.message || "This device could not keep your work. Reconnect and try again." });
      }
      else if (d?.code === "MIN_TIME_NOT_MET") { const m = Math.max(1, Math.ceil((d.remainingSeconds || 0) / 60)); setMsg({ ok: false, text: `Keep reading: about ${m} more minute${m === 1 ? "" : "s"} before you can mark this complete.` }); }
      else setMsg({ ok: false, text: errText(e) });
    } finally { setBusy(false); }
  };

  if (state === "loading") return <Skeleton rows={2} />;
  if (state === "error") return <Notice msg={msg} />;
  if (state === "locked") return (
    <div style={S.box}>
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>This lesson is locked</h2>
      <p style={{ margin: "0 0 8px" }}>Finish {locked.length > 1 ? "these lessons" : "this lesson"} first:</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{locked.map((x) => <li key={x.lessonId ?? x.id}>{x.title}</li>)}</ul>
    </div>
  );

  const rule = data.lesson.completionRule;
  const done = status === "completed";
  return (
    <article>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{data.lesson.title}</h2>
      {data.lesson.summary && <p style={{ color: C.muted, margin: "0 0 12px" }}>{data.lesson.summary}</p>}
      {helpOn && navigator.onLine !== false && <p style={{ margin: "0 0 10px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/help?lessonId=${lessonId}`}>Ask about this lesson</Link></p>}
      <Notice msg={msg} />
      <BlockList blocks={data.blocks} urlMap={urlMap} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        {prev && <button type="button" style={S.btn} disabled={prev.locked} onClick={() => onOpen(prev.id)}>← Previous</button>}
        {done
          ? <span role="status" style={{ color: C.ok, fontWeight: 600 }}>Completed</span>
          : savedHere
            ? <span role="status" style={{ color: C.muted, fontWeight: 600 }}>Saved on this device, waiting to send</span>
          : rule === "view"
            ? <span style={{ color: C.muted, fontSize: 14 }}>This lesson completes when you open it.</span>
            : <button type="button" style={S.btnPrimary} disabled={busy} onClick={complete}>{busy ? "Saving…" : rule === "min_time" ? "Mark complete (needs minimum time)" : "Mark complete"}</button>}
        {next && <button type="button" style={S.btn} disabled={next.locked} onClick={() => onOpen(next.id)}>Next →</button>}
      </div>
    </article>
  );
}
