import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useCourseLabel } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Student LMS home (L4.1c, S73). Frontend only; shows GET /lms/me/dashboard (L4.1a/L4.1b backend).
   The server decides what the learner may see; each section can come back "UNAVAILABLE" (data.errors) and then shows a short note while the rest still works.
   Online only: no device copy of this page (nothing to protect or sync). */

const linkBtn = { ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" };

function when(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
}

function Section({ title, id, unavailable, children, empty, isEmpty }) {
  return (
    <section aria-labelledby={id} style={{ ...S.box, marginBottom: 14 }}>
      <h2 id={id} style={{ fontSize: 16, margin: "0 0 8px" }}>{title}</h2>
      {unavailable ? <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>This part could not be loaded. Refresh to try again.</p>
        : isEmpty ? <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>{empty}</p> : children}
    </section>
  );
}

const ul = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 };
const li = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 8 };

export default function StudentLearning() {
  const label = useCourseLabel();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await API.get("/lms/me/dashboard");
      setData(r.data || {}); setMsg(null); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, "Could not load your learning page.") }); setState("error"); }
    }
  }, []);
  // load() sets state only after the await; the rule flags it anyway (S76, same as StudentAnnouncements)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const retry = () => { setState("loading"); setMsg(null); load(); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const err = data?.errors || {};
  const arr = (k) => (Array.isArray(data?.[k]) ? data[k] : []);

  return (
    <div style={S.page}>
      <h1 style={S.h1}>My learning</h1>
      <p style={S.sub}>What to do next across your {label.many.toLowerCase()}.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton rows={4} /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={retry}>Try again</button>
      ) : (
        <>
          <Section id="lms-d-cont" title="Continue learning" unavailable={!!err.continueLearning} isEmpty={arr("continueLearning").length === 0} empty="Nothing started yet. Open a lesson to begin.">
            <ul style={ul}>{arr("continueLearning").map((x) => (
              <li key={`${x.courseId}-${x.lessonId}`} style={li}>
                <span><strong>{x.lessonTitle}</strong><br /><span style={{ fontSize: 13, color: C.muted }}>{x.courseTitle}</span></span>
                <Link to={`/student/courses/${x.courseId}/learn`} style={linkBtn}>Continue</Link>
              </li>))}</ul>
          </Section>

          <Section id="lms-d-todo" title="To do" unavailable={!!err.pendingTasks} isEmpty={arr("pendingTasks").length === 0} empty="You have no open assignments.">
            <ul style={ul}>{arr("pendingTasks").map((x) => (
              <li key={x.assignmentId} style={li}>
                <span><strong>{x.title}</strong><br />
                  <span style={{ fontSize: 13, color: x.overdue ? C.bad : C.muted }}>{x.courseTitle}{x.dueAt ? ` · ${x.overdue ? "was due" : "due"} ${when(x.dueAt)}` : ""}</span></span>
                <Link to={`/student/courses/${x.courseId}/assignments`} style={linkBtn}>Open</Link>
              </li>))}</ul>
            {data.pendingTasksMore && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>There are more. Open a {label.one.toLowerCase()}'s assignments to see them all.</p>}
          </Section>

          <Section id="lms-d-soon" title="Coming up" unavailable={!!err.upcoming} isEmpty={arr("upcoming").length === 0} empty="Nothing in the next 14 days.">
            <ul style={ul}>{arr("upcoming").map((x) => (
              <li key={x.key || `${x.courseId}-${x.startsAt}-${x.title}`} style={li}>
                <span><strong>{x.title}</strong><br /><span style={{ fontSize: 13, color: C.muted }}>{x.courseTitle}{x.startsAt ? ` · ${x.allDay ? new Date(x.startsAt).toLocaleDateString([], { dateStyle: "medium" }) : when(x.startsAt)}` : ""}</span></span>
              </li>))}</ul>
            {data.upcomingMore && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>More items are coming up later.</p>}
          </Section>

          <Section id="lms-d-fb" title="Recent feedback" unavailable={!!err.recentFeedback} isEmpty={arr("recentFeedback").length === 0} empty="No marked work has been returned yet.">
            <ul style={ul}>{arr("recentFeedback").map((x) => (
              <li key={`${x.assignmentId}-${x.attemptNo}`} style={li}>
                <span><strong>{x.title}</strong><br /><span style={{ fontSize: 13, color: C.muted }}>{x.courseTitle} · {x.finalPoints}/{x.maxPoints}{x.hasComment ? " · comment from your teacher" : ""}</span></span>
                <Link to={`/student/courses/${x.courseId}/assignments`} style={linkBtn}>View</Link>
              </li>))}</ul>
          </Section>

          <Section id="lms-d-news" title="Announcements" unavailable={!!err.announcements} isEmpty={arr("announcements").length === 0} empty="No announcements.">
            <ul style={ul}>{arr("announcements").map((x) => (
              <li key={x.id} style={{ ...li, display: "block" }}>
                <strong>{x.pinned ? "📌 " : ""}{x.title}</strong>
                <div style={{ fontSize: 13, color: C.muted }}>{x.courseTitle || ""}{x.publishedAt ? ` · ${when(x.publishedAt)}` : ""}</div>
                {x.body && <p style={{ margin: "4px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{String(x.body).slice(0, 400)}</p>}
              </li>))}</ul>
          </Section>

          <Section id="lms-d-courses" title={`My ${label.many.toLowerCase()}`} unavailable={false} isEmpty={arr("courses").length === 0} empty={`You are not in any ${label.many.toLowerCase()} yet.`}>
            <ul style={ul}>{arr("courses").map((c) => (
              <li key={c.courseId} style={li}>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <strong>{c.title}</strong>{c.code ? <span style={{ fontSize: 12, color: C.muted }}> · {c.code}</span> : null}
                  <div role="progressbar" aria-label={`${c.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.percent || 0}
                    style={{ height: 8, borderRadius: 999, background: C.border, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, c.percent || 0))}%`, height: "100%", background: C.accent }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.muted }}>{c.completedLessons}/{c.totalLessons} lessons · {c.percent || 0}%</span>
                </span>
                <Link to={`/student/courses/${c.courseId}/learn`} style={linkBtn}>Open</Link>
              </li>))}</ul>
            {data.pendingRequests > 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>{data.pendingRequests} request(s) waiting for approval.</p>}
          </Section>
        </>
      )}
    </div>
  );
}
