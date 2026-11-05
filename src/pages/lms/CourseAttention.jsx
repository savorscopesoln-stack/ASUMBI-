import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Teacher Attention /teacher/courses/:courseId/attention (L9.1 UI, S112). Frontend only, READ ONLY. Backend (flag lms_analytics, lms.gradebook.view, course staff, no-store):
     GET /lms/courses/:id/analytics/attention -> { generatedAt, note, summary:{learners, learnersWithAlerts, alertCounts:{inactive,missing_work,late_pattern,low_quiz},
       completion:{lessons,notStarted,inProgress,complete,averagePercent}, timeliness:{assignmentsPastDue,submitted,late,missing}, quizzes:{marked,averagePercent|null},
       outcomeCoverage:null|{lessonsVisible,lessonsTagged,outcomesTagged}, thresholds:{inactiveDays,lowQuizPercent,lateSharePercent}},
       learners:[{studentId,name,alerts:[{type,reason,data,threshold}]}] }  (name order; learners without an alert are only counted)
   Prompts for a conversation, never verdicts: nobody is ranked or labelled, names only, every alert shows the server's reason and the numbers behind it. All text is plain text.
   Client-side: filter by alert type, show 25 learners at a time. NOT here: changing thresholds, messaging a learner, charts. */

const TYPES = [["inactive", "Inactive"], ["missing_work", "Missing work"], ["late_pattern", "Often late"], ["low_quiz", "Low quiz average"]];
const PAGE = 25;
const day = (v) => (v ? String(v).slice(0, 10) : "none");
const fix = (v) => (v === null || v === undefined ? "n/a" : String(v));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Detail({ a }) {
  const d = a.data || {};
  if (a.type === "missing_work" && Array.isArray(d.items)) {
    return (
      <ul aria-label="Missing assignments" style={{ margin: "2px 0 0", paddingLeft: 18, fontSize: 13, color: C.muted }}>
        {d.items.map((x) => <li key={x.assignmentId}>{x.title} (due {day(x.dueAt)})</li>)}
        {d.missing > d.items.length && <li>and {d.missing - d.items.length} more</li>}
      </ul>
    );
  }
  if (a.type === "inactive") return <div style={{ fontSize: 13, color: C.muted }}>Last activity: {day(d.lastActivityAt)}. Counting from {day(d.since)}.</div>;
  return null;
}

export default function CourseAttention() {
  const { courseId } = useParams();
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState(null), [msg, setMsg] = useState(null), [type, setType] = useState(""), [shown, setShown] = useState(PAGE);

  const load = useCallback(async () => {
    setState("loading"); setMsg(null);
    try { const r = await API.get(`/lms/courses/${courseId}/analytics/attention`); setData(r.data); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the attention list.") }); setState("error"); } }
  }, [courseId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const s = data && data.summary, all = (data && data.learners) || [];
  const list = type ? all.filter((l) => l.alerts.some((a) => a.type === type)) : all;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Learners who may need attention</h1>
      <p style={{ margin: "0 0 10px" }}><Link to="/teacher/courses" style={{ fontSize: 14 }}>Back to courses</Link></p>
      <p style={S.sub}>These are prompts for a conversation, not verdicts. Each one shows the numbers behind it. Learners are listed by name, never ranked.</p>
      <Notice msg={msg} />
      {state === "loading" && <Skeleton rows={4} />}
      {state === "error" && <button type="button" style={S.btn} onClick={load}>Try again</button>}
      {state === "ready" && s && (
        <>
          <section aria-label="Course summary" style={{ ...S.box, marginBottom: 12, fontSize: 14 }}>
            <p style={{ margin: "0 0 4px" }}>{plural(s.learners, "active learner")}; {s.learnersWithAlerts} with at least one alert.</p>
            <p style={{ margin: "0 0 4px" }}>Lessons: {s.completion.notStarted} not started, {s.completion.inProgress} in progress, {s.completion.complete} complete (average {fix(s.completion.averagePercent)}%).</p>
            <p style={{ margin: "0 0 4px" }}>Assignments past due: {s.timeliness.assignmentsPastDue}. Handed in {s.timeliness.submitted}, of which late {s.timeliness.late}; missing {s.timeliness.missing}.</p>
            <p style={{ margin: 0 }}>Marked quizzes: {s.quizzes.marked}{s.quizzes.averagePercent !== null && s.quizzes.averagePercent !== undefined ? `, average ${s.quizzes.averagePercent}%` : ""}.{s.outcomeCoverage ? ` Outcomes: ${s.outcomeCoverage.lessonsTagged} of ${s.outcomeCoverage.lessonsVisible} lessons tagged, ${s.outcomeCoverage.outcomesTagged} outcomes.` : ""}</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted }}>School settings: inactive after {s.thresholds.inactiveDays} days; low quiz average below {s.thresholds.lowQuizPercent}%; often late from {s.thresholds.lateSharePercent}% late.</p>
          </section>
          <label htmlFor="att-type" style={S.label}>Show</label>
          <select id="att-type" value={type} onChange={(e) => { setType(e.target.value); setShown(PAGE); }} style={{ ...S.input, marginBottom: 10 }}>
            <option value="">All alerts ({s.learnersWithAlerts} learners)</option>
            {TYPES.map(([k, label]) => <option key={k} value={k}>{label} ({s.alertCounts[k] || 0})</option>)}
          </select>
          {list.length === 0 ? <p style={{ color: C.muted }}>{all.length === 0 ? "No learner has an alert right now." : "No learner has this alert."}</p> : (
            <>
              <ul aria-label="Learners" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {list.slice(0, shown).map((l) => (
                  <li key={l.studentId} style={S.box}>
                    <strong>{l.name || "Unnamed learner"}</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 14 }}>
                      {l.alerts.filter((a) => !type || a.type === type).map((a) => <li key={a.type}>{a.reason}<Detail a={a} /></li>)}
                    </ul>
                  </li>
                ))}
              </ul>
              {list.length > shown && <p><button type="button" style={S.btn} onClick={() => setShown((n) => n + PAGE)}>Show more ({list.length - shown} left)</button></p>}
            </>
          )}
          {data.note && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.muted }}>{data.note}</p>}
        </>
      )}
    </div>
  );
}
