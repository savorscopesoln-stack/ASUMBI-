import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Learner learning paths (L9.3c, S114) at /student/courses/:courseId/paths. Frontend only.
   Backend (student only, active enrolment, flag lms_paths): GET /lms/courses/:id/learn/paths
   -> { paths:[{ id, title, description, kind, reason, items:[{ lessonId, title, status, locked }], progress:{ done, total } }] }.
   Only the learner's OWN paths come back; draft/unreleased lessons are already left out by the server. A path never hides or locks lessons.
   Online only (no device copy). */

const STATUS_TEXT = { completed: "Completed", in_progress: "In progress", not_started: "Not started" };
const KIND_TEXT = { core: "Core", remedial: "Extra practice", enrichment: "Stretch" };
const linkBtn = { ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" };

export default function StudentPaths() {
  const { courseId } = useParams();
  const [paths, setPaths] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await API.get(`/lms/courses/${courseId}/learn/paths`);
      setPaths(Array.isArray(r.data?.paths) ? r.data.paths : []); setMsg(null); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, "Could not load your learning paths.") }); setState("error"); }
    }
  }, [courseId]);
  // load() sets state only after the await (same pattern as StudentLearning)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const retry = () => { setState("loading"); setMsg(null); load(); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/learn`}>← Lessons</Link></p>
      <h1 style={S.h1}>My learning paths</h1>
      <p style={S.sub}>Lessons your teacher picked for you, in a suggested order. All other lessons stay open as usual.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton rows={3} /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={retry}>Try again</button>
      ) : paths.length === 0 ? (
        <p style={{ color: C.muted }}>Your teacher has not given you a learning path yet.</p>
      ) : paths.map((p) => {
        const total = p.progress?.total || 0, done = p.progress?.done || 0;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const next = (p.items || []).find((x) => x.status !== "completed" && !x.locked);
        const hid = `lms-path-${p.id}`;
        return (
          <section key={p.id} aria-labelledby={hid} style={{ ...S.box, marginBottom: 14 }}>
            <h2 id={hid} style={{ fontSize: 16, margin: "0 0 4px" }}>{p.title}</h2>
            <div style={{ fontSize: 12, color: C.muted }}>{KIND_TEXT[p.kind] || ""}</div>
            {p.description && <p style={{ margin: "6px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{p.description}</p>}
            {p.reason && <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>Why this path: {p.reason}</p>}
            <div role="progressbar" aria-label={`${p.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
              style={{ height: 8, borderRadius: 999, background: C.border, margin: "10px 0 4px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: C.accent }} />
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{done} of {total} lessons completed</div>
            {(p.items || []).length === 0 ? <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>No lessons are available in this path yet.</p> : (
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {p.items.map((x) => (
                  <li key={x.lessonId} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    <span><strong>{x.title}</strong><br /><span style={{ fontSize: 13, color: C.muted }}>{STATUS_TEXT[x.status] || x.status}{x.locked ? " · Locked until an earlier lesson is done" : ""}</span></span>
                    {x.locked ? <span aria-hidden="true" style={{ fontSize: 13, color: C.muted }}>Locked</span>
                      : <Link to={`/student/courses/${courseId}/learn?lesson=${x.lessonId}`} style={linkBtn}>{x.status === "completed" ? "Review" : "Open"}</Link>}
                  </li>))}
              </ol>
            )}
            {next && <p style={{ margin: "10px 0 0" }}><Link to={`/student/courses/${courseId}/learn?lesson=${next.lessonId}`} style={{ ...S.btnPrimary, textDecoration: "none", display: "inline-block" }}>Continue this path</Link></p>}
          </section>
        );
      })}
    </div>
  );
}
