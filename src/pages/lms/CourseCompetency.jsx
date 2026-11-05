import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useDebounced } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";
import CompetencyView from "./CompetencyView";
import { BAND_TEXT } from "./competencyUtil";

/* Teacher outcome mastery (L9.4d, S115) at /teacher/courses/:courseId/outcomes. Frontend only, read only. Backend (flag lms_competency; needs `lms.gradebook.view` + course staff, 403 message shown):
   GET /lms/courses/:id/competency?page&pageSize -> { rule, learners, outcomes:[{outcomeId,code,title,learnersWithEvidence,evidenceItems,bands:{insufficient_evidence,beginning,developing,secure}}], total }
   (counts only: nobody is named, no ranking); GET .../competency/learners/:studentId -> { student:{id,name}, rule, outcomes:[... evidence] } (404 if not an active learner);
   409 TOO_MANY_LEARNERS / TOO_MUCH_EVIDENCE carry a message. Learners to look up: GET .../enrolments?status=active&q. Plain text only. */

const PS = 20, ORDER = ["secure", "developing", "beginning", "insufficient_evidence"];

export default function CourseCompetency() {
  const { courseId } = useParams(), base = `/lms/courses/${courseId}/competency`;
  const [page, setPage] = useState(1), [data, setData] = useState(null), [state, setState] = useState("loading"), [msg, setMsg] = useState(null);
  const [q, setQ] = useState(""), dq = useDebounced(q, 300), [cand, setCand] = useState([]), [one, setOne] = useState(null), [oneState, setOneState] = useState("idle");
  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { page, pageSize: PS } }); setData(r.data || {}); setMsg(null); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the outcomes.") }); setState("error"); } }
  }, [base, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!dq.trim()) return undefined;
    let alive = true;
    API.get(`/lms/courses/${courseId}/enrolments`, { params: { status: "active", q: dq.trim(), page: 1, pageSize: 10 } }).then((r) => { if (alive) setCand(r.data.students || []); }).catch(() => { if (alive) setCand([]); });
    return () => { alive = false; };
  }, [courseId, dq]);
  const pick = async (s) => {
    setOneState("loading"); setOne(null); setCand([]); setQ("");
    try { const r = await API.get(`${base}/learners/${s.studentId}`); setOne(r.data); setOneState("ready"); setMsg(null); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load this learner.") }); setOneState("idle"); }
  };
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/teacher/courses">← My courses</Link></p>
      <h1 style={S.h1}>Outcome mastery</h1>
      <p style={S.sub}>Built from released rubric marks and graded coursework quizzes. A band summarises the evidence; check the evidence before acting on it.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton rows={3} /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button> : (
        <>
          {data?.rule?.text && <p style={{ ...S.box, margin: "0 0 12px", fontSize: 14 }}>{data.rule.text}</p>}
          <section aria-labelledby="cc-sum" style={{ marginBottom: 18 }}>
            <h2 id="cc-sum" style={{ fontSize: 16, margin: "0 0 6px" }}>Whole class ({data?.learners || 0} learner{data?.learners === 1 ? "" : "s"})</h2>
            {(data?.outcomes || []).length === 0 ? <p style={{ color: C.muted }}>No outcome evidence yet.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table aria-label="Outcome summary" style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                  <thead><tr><th scope="col" style={{ textAlign: "left", padding: 6 }}>Outcome</th><th scope="col" style={{ padding: 6 }}>Learners with evidence</th>{ORDER.map((b) => <th key={b} scope="col" style={{ padding: 6 }}>{BAND_TEXT[b]}</th>)}</tr></thead>
                  <tbody>{data.outcomes.map((o) => (
                    <tr key={o.outcomeId} style={{ borderTop: `1px solid ${C.border}` }}>
                      <th scope="row" style={{ textAlign: "left", padding: 6, fontWeight: 600 }}>{o.code ? `${o.code} ` : ""}{o.title}</th>
                      <td style={{ textAlign: "center", padding: 6 }}>{o.learnersWithEvidence}</td>
                      {ORDER.map((b) => <td key={b} style={{ textAlign: "center", padding: 6 }}>{o.bands?.[b] ?? 0}</td>)}
                    </tr>))}</tbody>
                </table>
              </div>)}
            <Pager page={page} pageSize={PS} total={data?.total || 0} onPage={setPage} />
          </section>
          <section aria-labelledby="cc-one">
            <h2 id="cc-one" style={{ fontSize: 16, margin: "0 0 6px" }}>One learner</h2>
            <label style={S.label} htmlFor="cc-find">Find a learner</label>
            <input id="cc-find" style={{ ...S.input, width: "100%", maxWidth: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" />
            {dq.trim() && cand.length > 0 && <ul aria-label="Matching learners" style={{ margin: "6px 0", padding: 0 }}>{cand.map((s) => (
              <li key={s.studentId} style={{ listStyle: "none", padding: "2px 0" }}><button type="button" style={S.btn} onClick={() => pick(s)}>{s.name}{s.admissionNo ? ` (${s.admissionNo})` : ""}</button></li>))}</ul>}
            {oneState === "loading" && <Skeleton rows={2} />}
            {oneState === "ready" && one && (
              <div style={{ marginTop: 10 }}>
                <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{one.student?.name}</h3>
                <CompetencyView rule={null} outcomes={one.outcomes} minEvidence={one.rule?.minEvidence} />
              </div>)}
          </section>
        </>)}
    </div>
  );
}
