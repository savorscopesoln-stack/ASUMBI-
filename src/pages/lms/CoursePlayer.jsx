import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";
import { BlockList } from "./BlockView";

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
  const lessonId = Number(params.get("lesson")) || null;
  const base = `/lms/courses/${courseId}/learn`;

  const [list, setList] = useState(null); // { sections, unsectioned }
  const [prog, setProg] = useState(null); // { percent, completed, total, lessons, resumeLessonId }
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed | forbidden
  const [msg, setMsg] = useState(null);

  const fetchBoth = useCallback(() => Promise.all([API.get(`${base}/lessons`), API.get(`${base}/progress`)]), [base]);
  const apply = useCallback(([l, p]) => { setList({ sections: l.data.sections || [], unsectioned: l.data.unsectioned || [] }); setProg(p.data); setState("ready"); }, []);
  const fail = useCallback((e) => {
    if (isModuleNotLicensed(e)) setState("unlicensed");
    else if ([403, 404].includes(e?.response?.status)) setState("forbidden");
    else { setMsg({ ok: false, text: errText(e) }); setState("error"); }
  }, []);
  const loadAll = useCallback(() => { setState("loading"); fetchBoth().then(apply).catch(fail); }, [fetchBoth, apply, fail]);
  useEffect(() => { let alive = true; fetchBoth().then((r) => { if (alive) apply(r); }).catch((e) => { if (alive) fail(e); }); return () => { alive = false; }; }, [fetchBoth, apply, fail]);
  const refreshProgress = useCallback(() => { fetchBoth().then(apply).catch(() => { /* refreshed again on the next action */ }); }, [fetchBoth, apply]);

  const flat = useMemo(() => (list ? [...list.sections.flatMap((s) => s.lessons), ...list.unsectioned] : []), [list]);
  const statusOf = useMemo(() => new Map((prog?.lessons || []).map((x) => [x.lessonId, x.status])), [prog]);
  const open = (id) => { setMsg(null); setParams({ lesson: String(id) }); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "loading") return <div style={S.page}><Skeleton rows={3} /></div>;
  if (state === "forbidden") return <div style={S.page}><p>You are not enrolled in this course, or it is not available.</p><Link to="/student/courses">Back to my courses</Link></div>;
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
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/student/courses">← My courses</Link></p>
      <h1 style={S.h1}>Lessons</h1>
      <div style={{ ...S.box, margin: "8px 0 14px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>{prog.percent}% complete ({prog.completed} of {prog.total} lessons)</div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog.percent} aria-label="Course progress" style={{ height: 8, borderRadius: 999, background: C.border }}>
            <div style={{ height: 8, borderRadius: 999, width: `${prog.percent}%`, background: C.accent }} />
          </div>
        </div>
        {resume && resume !== lessonId && <button type="button" style={S.btnPrimary} onClick={() => open(resume)}>Continue learning</button>}
      </div>
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
            ? <LessonPane key={lessonId} base={base} lessonId={lessonId} prev={prev} next={next} onOpen={open} onChanged={refreshProgress} />
            : <p style={{ color: C.muted }}>{flat.length ? "Choose a lesson to begin." : ""}</p>}
        </main>
      </div>
    </div>
  );
}

function LessonPane({ base, lessonId, prev, next, onOpen, onChanged }) {
  const [state, setState] = useState("loading"); // loading | ready | locked | error
  const [data, setData] = useState(null);
  const [locked, setLocked] = useState([]);
  const [status, setStatus] = useState("not_started");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const onChangedRef = useRef(onChanged);
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await API.get(`${base}/lessons/${lessonId}`);
        if (!alive) return;
        setData(r.data); setState("ready");
        try {
          const v = await API.post(`${base}/lessons/${lessonId}/view`);
          if (!alive) return;
          if (v.data.progress) setStatus(v.data.progress.status);
          onChangedRef.current?.();
        } catch { /* viewing is recorded best effort; reading is not blocked */ }
      } catch (e) {
        if (!alive) return;
        if (e?.response?.data?.code === "LESSON_LOCKED") { setLocked(e.response.data.lockedBy || []); setState("locked"); }
        else { setMsg({ ok: false, text: errText(e, "Could not open this lesson.") }); setState("error"); }
      }
    })();
    return () => { alive = false; };
  }, [base, lessonId]);

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
      if (d?.code === "MIN_TIME_NOT_MET") { const m = Math.max(1, Math.ceil((d.remainingSeconds || 0) / 60)); setMsg({ ok: false, text: `Keep reading: about ${m} more minute${m === 1 ? "" : "s"} before you can mark this complete.` }); }
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
      <Notice msg={msg} />
      <BlockList blocks={data.blocks} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        {prev && <button type="button" style={S.btn} disabled={prev.locked} onClick={() => onOpen(prev.id)}>← Previous</button>}
        {done
          ? <span role="status" style={{ color: C.ok, fontWeight: 600 }}>Completed</span>
          : rule === "view"
            ? <span style={{ color: C.muted, fontSize: 14 }}>This lesson completes when you open it.</span>
            : <button type="button" style={S.btnPrimary} disabled={busy} onClick={complete}>{busy ? "Saving…" : rule === "min_time" ? "Mark complete (needs minimum time)" : "Mark complete"}</button>}
        {next && <button type="button" style={S.btn} disabled={next.locked} onClick={() => onOpen(next.id)}>Next →</button>}
      </div>
    </article>
  );
}
