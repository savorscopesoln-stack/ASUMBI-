import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton, Tabs } from "./lmsUi";

/* Teacher course Reports /teacher/courses/:courseId/reports (L7.6 UI, S87). Frontend only, read only. Backend (flag lms_gradebook, lms.gradebook.view), under /lms/courses/:id/gradebook/reports/:
     progress           -> { summary:{learners,lessons,notStarted,inProgress,complete,averagePercent}, learners:[{studentId,name,admissionNo,completed,total,percent,lastActivityAt}] }
     distribution       -> { distribution:{learners,graded,notGraded,mean,median,min,max,passMark,passed,failed,passRate,histogram:[{from,to,count}],bands:[{grade,label,minScore,count}],unbanded} }
     submissions        -> { summary:{assignments,learners,awaitingMarking,missing}, assignments:[{assignmentId,title,dueAt,pastDue,learners,submitted,late,notSubmitted,missing,awaitingMarking,graded,returned}] }
     teacher-activity?days=1..90 -> { days, since, staff:[{name,role,lessonsPublished,assignmentsGraded,announcementsPosted}], note }
     progress.csv       -> file download (audited by the server)
   The figures are prompts for a conversation, never verdicts: the server notes say so and the screen shows them. Every server sentence (too many learners, no permission) is shown as it comes. NOT here: per-learner drill-down, charts beyond the plain histogram table. */

const TABS = [["progress", "Progress"], ["distribution", "Grades"], ["submissions", "Assignments"], ["activity", "Teacher activity"]];
const DAY_OPTIONS = [7, 30, 90];
const day = (v) => (v ? String(v).slice(0, 10) : "none");
const fix = (v) => (v === null || v === undefined ? "n/a" : String(v));

function Progress({ d }) {
  const s = d.summary;
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>{s.learners} learner{s.learners === 1 ? "" : "s"}, {s.lessons} lesson{s.lessons === 1 ? "" : "s"} visible. {s.notStarted} not started, {s.inProgress} in progress, {s.complete} complete. Average {s.averagePercent}%.</p>
      {d.learners.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No active learners in this course yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table aria-label="Learner progress" style={{ borderCollapse: "collapse", fontSize: 14, minWidth: 420 }}>
            <thead><tr><th scope="col" style={{ textAlign: "left", padding: 4 }}>Learner</th><th scope="col" style={{ textAlign: "left", padding: 4 }}>Lessons done</th><th scope="col" style={{ textAlign: "left", padding: 4 }}>Progress</th><th scope="col" style={{ textAlign: "left", padding: 4 }}>Last activity</th></tr></thead>
            <tbody>{d.learners.map((l) => (
              <tr key={l.studentId}><td style={{ padding: 4 }}>{l.name}{l.admissionNo ? ` (${l.admissionNo})` : ""}</td><td style={{ padding: 4 }}>{l.completed} of {l.total}</td><td style={{ padding: 4 }}>{l.percent}%</td><td style={{ padding: 4 }}>{day(l.lastActivityAt)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Distribution({ d }) {
  const x = d.distribution;
  if (x.graded === 0) return <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No learner has a counted grade yet, so there is nothing to show. {x.notGraded} of {x.learners} not graded.</p>;
  return (
    <>
      <p style={{ margin: "0 0 4px", fontSize: 14 }}>{x.graded} of {x.learners} learners graded ({x.notGraded} not graded, left out of every figure). Mean {fix(x.mean)}%, median {fix(x.median)}%, lowest {fix(x.min)}%, highest {fix(x.max)}%.</p>
      <p style={{ margin: "0 0 10px", fontSize: 14 }}>Pass mark {x.passMark}%: {x.passed} passed, {x.failed} below ({fix(x.passRate)}% pass rate).</p>
      <div style={{ overflowX: "auto" }}>
        <table aria-label="Grade histogram" style={{ borderCollapse: "collapse", fontSize: 14, marginBottom: 10 }}>
          <thead><tr><th scope="col" style={{ textAlign: "left", padding: 4 }}>Marks</th><th scope="col" style={{ textAlign: "left", padding: 4 }}>Learners</th></tr></thead>
          <tbody>{x.histogram.map((h) => <tr key={h.from}><td style={{ padding: 4 }}>{h.from} to {h.from === 90 ? 100 : Math.floor(h.to)}%</td><td style={{ padding: 4 }}>{h.count}</td></tr>)}</tbody>
        </table>
      </div>
      {x.bands.length > 0 && (
        <ul aria-label="Grade bands" style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {x.bands.map((b) => <li key={b.grade}>{b.grade}{b.label ? ` (${b.label})` : ""}, from {b.minScore}%: {b.count} learner{b.count === 1 ? "" : "s"}</li>)}
          {x.unbanded > 0 && <li>Outside every band: {x.unbanded}</li>}
        </ul>
      )}
    </>
  );
}

function Submissions({ d }) {
  const s = d.summary;
  if (d.assignments.length === 0) return <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No published assignments in this course yet.</p>;
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>{s.assignments} assignment{s.assignments === 1 ? "" : "s"}, {s.learners} learner{s.learners === 1 ? "" : "s"}. {s.awaitingMarking} waiting for marking, {s.missing} missing after the due date.</p>
      <ul aria-label="Assignments" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {d.assignments.map((a) => (
          <li key={a.assignmentId} style={{ ...S.box, margin: 0 }}>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>{a.title}</p>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Due {day(a.dueAt)}{a.pastDue ? " (past)" : ""}. {a.submitted} of {a.learners} submitted ({a.late} late), {a.notSubmitted} not submitted{a.pastDue ? `, ${a.missing} missing` : ""}. {a.awaitingMarking} waiting for marking, {a.graded} marked not returned, {a.returned} returned.</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function Activity({ d, days, onDays }) {
  return (
    <>
      <label style={{ fontSize: 14 }}>Show the last <select aria-label="Days" value={days} onChange={(e) => onDays(Number(e.target.value))}>{DAY_OPTIONS.map((n) => <option key={n} value={n}>{n} days</option>)}</select></label>
      {d.staff.length === 0 ? <p style={{ margin: "8px 0 0", fontSize: 14, color: C.muted }}>No staff are listed for this course.</p> : (
        <ul aria-label="Teacher activity" style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14 }}>
          {d.staff.map((t, i) => <li key={`${t.name}-${i}`}>{t.name || "Staff member"} ({t.role === "co_teacher" ? "co-teacher" : "owner"}): {t.lessonsPublished} lesson{t.lessonsPublished === 1 ? "" : "s"} published, {t.assignmentsGraded} grade{t.assignmentsGraded === 1 ? "" : "s"} entered, {t.announcementsPosted} announcement{t.announcementsPosted === 1 ? "" : "s"} posted</li>)}
        </ul>
      )}
    </>
  );
}

export default function CourseReports() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/gradebook/reports`;
  const [tab, setTab] = useState("progress");
  const [days, setDays] = useState(30);
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setState("loading"); setMsg(null);
    try {
      const path = tab === "distribution" ? "distribution" : tab === "submissions" ? "submissions" : tab === "activity" ? "teacher-activity" : "progress";
      const r = await API.get(`${base}/${path}`, tab === "activity" ? { params: { days } } : undefined);
      setData({ tab, d: r.data }); setState("ready");
    } catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load this report.") }); setState("error"); } }
  }, [base, tab, days]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    setMsg(null);
    try {
      const r = await API.get(`${base}/progress.csv`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data), a = document.createElement("a");
      a.href = url; a.download = `progress-course-${courseId}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: "Progress exported." });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not export the progress report.") }); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Course reports</h1>
      <p style={{ margin: "0 0 10px" }}><Link to="/teacher/courses" style={{ fontSize: 14 }}>Back to courses</Link></p>
      <p style={S.sub}>Counts to help you decide who to follow up with. They are prompts for a conversation, not verdicts.</p>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <Notice msg={msg} />
      {tab === "progress" && <p style={{ margin: "0 0 8px" }}><button type="button" style={S.btn} onClick={exportCsv}>Export progress CSV</button></p>}
      {state === "loading" || (state === "ready" && (!data || data.tab !== tab)) ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={load}>Try again</button>
      ) : (
        <section aria-label="Report">
          {tab === "progress" && <Progress d={data.d} />}
          {tab === "distribution" && <Distribution d={data.d} />}
          {tab === "submissions" && <Submissions d={data.d} />}
          {tab === "activity" && <><Activity d={data.d} days={days} onDays={setDays} />{data.d.note && <p style={{ margin: "8px 0 0", fontSize: 12, color: C.muted }}>{data.d.note}</p>}</>}
        </section>
      )}
    </div>
  );
}
