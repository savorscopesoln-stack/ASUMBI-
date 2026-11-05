import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton, Tabs } from "./lmsUi";

/* Department dashboards /teacher/department and /lms/department (L9.2 UI, S113). Frontend only, READ ONLY, tenant-wide. Backend (flag lms_analytics, permission lms.analytics.department,
   no-store, paged), under /lms/analytics/:
     courses    ?page&pageSize<=50&status&academicYear -> { total, summary:{courses,byStatus:{draft,pending,published,archived},tenantUsesOutcomeTags,flaggedOnThisPage},
                   courses:[{id,code,title,academicYear,programme,status,counts:{learners,staff,lessonsPublished,lessonsTagged,assignmentsPublished,quizzesPublished},flags:[{type,reason,data}]}], note }
     staff      ?days=1..90 -> { total, days, since, staff:[{name,courses,lessonsPublished,assignmentsGraded,announcementsPosted}], note }
     moderation ?view=awaiting|no_rubric&days -> { view, days?, total, items:[{assignmentId,title,dueAt,course:{id,code,title}, awaitingMarking,oldestSubmittedAt,daysWaiting | submittedLearners}], note }
     cohorts    ?academicYear&pageSize<=10 -> { total, courses:[{id,code,title,academicYear,programme,status, learners,graded,notGraded,mean,median,passMark,passRate(percent) | unavailable:code}], note }
   Prompts with their numbers, never a ranking or a verdict; learners are never named (counts only), staff are named. Server sentences are shown as they come. NOT here: programme filter, charts, export. */

const TABS = [["courses", "Courses"], ["staff", "Staff activity"], ["moderation", "Moderation"], ["cohorts", "Grade summaries"]];
const PS = { courses: 25, staff: 25, moderation: 25, cohorts: 5 };
const DAYS = [7, 14, 30, 90];
const day = (v) => (v ? String(v).slice(0, 10) : "none");
const fix = (v) => (v === null || v === undefined ? "n/a" : String(v));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const Cell = ({ children }) => <td style={{ padding: 4 }}>{children}</td>;
const Head = ({ children }) => <th style={{ textAlign: "left", padding: 4 }}>{children}</th>;
const Empty = ({ children }) => <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{children}</p>;
const label = (c) => `${c.code ? `${c.code} ` : ""}${c.title || "Untitled course"}`;

function Courses({ d }) {
  const s = d.summary, b = s.byStatus || {};
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>{plural(s.courses, "live course")}: {b.draft || 0} draft, {b.pending || 0} waiting for approval, {b.published || 0} published, {b.archived || 0} archived. {s.flaggedOnThisPage} with a flag on this page.</p>
      {d.courses.length === 0 ? <Empty>No courses match.</Empty> : (
        <ul aria-label="Courses" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {d.courses.map((c) => (
            <li key={c.id} style={S.box}>
              <strong>{label(c)}</strong> <span style={{ fontSize: 13, color: C.muted }}>{c.academicYear ? `${c.academicYear} · ` : ""}{c.programme ? `${c.programme} · ` : ""}{c.status}</span>
              <div style={{ fontSize: 13, color: C.muted }}>{c.counts.learners} learners, {c.counts.staff} staff, {c.counts.lessonsPublished} lessons ({c.counts.lessonsTagged} tagged), {c.counts.assignmentsPublished} assignments, {c.counts.quizzesPublished} quizzes</div>
              {c.flags.length > 0 && <ul aria-label="Flags" style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 14 }}>{c.flags.map((f) => <li key={f.type}>{f.reason}</li>)}</ul>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Staff({ d }) {
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>Last {plural(d.days, "day")}, since {day(d.since)}.</p>
      {d.staff.length === 0 ? <Empty>No course staff yet.</Empty> : (
        <div style={{ overflowX: "auto" }}>
          <table aria-label="Staff activity" style={{ borderCollapse: "collapse", fontSize: 14, minWidth: 460 }}>
            <thead><tr><Head>Name</Head><Head>Courses</Head><Head>Lessons published</Head><Head>Assignments graded</Head><Head>Announcements</Head></tr></thead>
            <tbody>{d.staff.map((x, i) => <tr key={i}><Cell>{x.name || "Unnamed"}</Cell><Cell>{x.courses}</Cell><Cell>{x.lessonsPublished}</Cell><Cell>{x.assignmentsGraded}</Cell><Cell>{x.announcementsPosted}</Cell></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Moderation({ d }) {
  if (d.items.length === 0) return <Empty>{d.view === "no_rubric" ? "Every published assignment has a rubric." : "Nothing is waiting longer than this."}</Empty>;
  return (
    <ul aria-label="Assignments" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
      {d.items.map((x) => (
        <li key={x.assignmentId} style={S.box}>
          <strong>{x.title}</strong> <span style={{ fontSize: 13, color: C.muted }}>{label(x.course)} · due {day(x.dueAt)}</span>
          <div style={{ fontSize: 14 }}>{d.view === "no_rubric" ? `No rubric. ${plural(x.submittedLearners, "learner")} handed in.` : `${x.awaitingMarking} awaiting marking. Oldest handed in ${day(x.oldestSubmittedAt)} (${plural(x.daysWaiting, "day")}).`}</div>
        </li>
      ))}
    </ul>
  );
}

function Cohorts({ d }) {
  if (d.courses.length === 0) return <Empty>No courses match.</Empty>;
  return (
    <ul aria-label="Grade summaries" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
      {d.courses.map((c) => (
        <li key={c.id} style={S.box}>
          <strong>{label(c)}</strong> <span style={{ fontSize: 13, color: C.muted }}>{c.academicYear ? `${c.academicYear} · ` : ""}{c.programme ? `${c.programme} · ` : ""}{c.status}</span>
          <div style={{ fontSize: 14 }}>{c.unavailable ? `Could not be summarised (${c.unavailable}).` : `${c.learners} learners, ${c.graded} graded, ${c.notGraded} not graded. Mean ${fix(c.mean)}, median ${fix(c.median)}. Pass mark ${fix(c.passMark)}, pass rate ${c.passRate === null || c.passRate === undefined ? "n/a" : `${c.passRate}%`}.`}</div>
        </li>
      ))}
    </ul>
  );
}

export default function LmsDepartment({ back = "/teacher/courses" }) {
  const [tab, setTab] = useState("courses"), [page, setPage] = useState(1), [status, setStatus] = useState(""), [year, setYear] = useState(""), [days, setDays] = useState(30);
  const [view, setView] = useState("awaiting"), [modDays, setModDays] = useState(7);
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState(null), [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setState("loading"); setMsg(null);
    try {
      const params = { page, pageSize: PS[tab] };
      if (tab === "courses" && status) params.status = status;
      if ((tab === "courses" || tab === "cohorts") && /^\d{4}$/.test(year.trim())) params.academicYear = year.trim();
      if (tab === "staff") params.days = days;
      if (tab === "moderation") { params.view = view; if (view === "awaiting") params.days = modDays; }
      const r = await API.get(`/lms/analytics/${tab}`, { params });
      setData({ tab, d: r.data }); setState("ready");
    } catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load this dashboard.") }); setState("error"); } }
  }, [tab, page, status, year, days, view, modDays]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const change = (fn) => (e) => { fn(e.target.value); setPage(1); };
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const ready = state === "ready" && data && data.tab === tab;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Department dashboards</h1>
      <p style={{ margin: "0 0 10px" }}><Link to={back} style={{ fontSize: 14 }}>Back</Link></p>
      <p style={S.sub}>Counts and flags to help you decide where to look. They are prompts for a conversation, not verdicts. Courses and staff are never ranked; learners are never named.</p>
      <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setPage(1); }} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", margin: "0 0 10px" }}>
        {tab === "courses" && <div><label htmlFor="dp-status" style={S.label}>Status</label><select id="dp-status" value={status} onChange={change(setStatus)} style={S.input}><option value="">All</option><option value="draft">Draft</option><option value="pending">Waiting for approval</option><option value="published">Published</option><option value="archived">Archived</option></select></div>}
        {(tab === "courses" || tab === "cohorts") && <div><label htmlFor="dp-year" style={S.label}>Academic year</label><input id="dp-year" inputMode="numeric" maxLength={4} placeholder="e.g. 2026" value={year} onChange={change(setYear)} style={{ ...S.input, width: 110 }} /></div>}
        {tab === "staff" && <div><label htmlFor="dp-days" style={S.label}>Period</label><select id="dp-days" value={days} onChange={change((v) => setDays(Number(v)))} style={S.input}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>}
        {tab === "moderation" && <div><label htmlFor="dp-view" style={S.label}>List</label><select id="dp-view" value={view} onChange={change(setView)} style={S.input}><option value="awaiting">Waiting to be marked</option><option value="no_rubric">Without a rubric</option></select></div>}
        {tab === "moderation" && view === "awaiting" && <div><label htmlFor="dp-mdays" style={S.label}>Waiting longer than</label><select id="dp-mdays" value={modDays} onChange={change((v) => setModDays(Number(v)))} style={S.input}>{DAYS.map((n) => <option key={n} value={n}>{n} days</option>)}</select></div>}
      </div>
      <Notice msg={msg} />
      {state === "loading" || (state === "ready" && !ready) ? <Skeleton rows={4} /> : state === "error" ? <button type="button" style={S.btn} onClick={load}>Try again</button> : (
        <section aria-label="Dashboard">
          {tab === "courses" && <Courses d={data.d} />}
          {tab === "staff" && <Staff d={data.d} />}
          {tab === "moderation" && <Moderation d={data.d} />}
          {tab === "cohorts" && <Cohorts d={data.d} />}
          <Pager page={page} pageSize={PS[tab]} total={data.d.total} onPage={setPage} busy={state === "loading"} />
          {data.d.note && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.muted }}>{data.d.note}</p>}
        </section>
      )}
    </div>
  );
}
