import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";
import CompetencyView from "./CompetencyView";

/* Learner outcome mastery (L9.4c, S115) at /student/courses/:courseId/outcomes. Frontend only. Backend (flag lms_competency; student only, active enrolment, own evidence only):
   GET /lms/courses/:id/learn/competency -> { rule:{minEvidence,text,...}, outcomes:[...] } (409 TOO_MUCH_EVIDENCE has a message). Online only (no device copy). */

export default function StudentCompetency() {
  const { courseId } = useParams();
  const [data, setData] = useState(null), [state, setState] = useState("loading"), [msg, setMsg] = useState(null); // loading | ready | unlicensed | error
  const load = useCallback(async () => {
    try { const r = await API.get(`/lms/courses/${courseId}/learn/competency`); setData(r.data || {}); setMsg(null); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load your outcomes.") }); setState("error"); } }
  }, [courseId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={`/student/courses/${courseId}/learn`}>← Lessons</Link></p>
      <h1 style={S.h1}>My outcomes</h1>
      <p style={S.sub}>What your marked work and graded quizzes show so far. Practice quizzes do not count.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton rows={3} /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button>
        : <CompetencyView rule={data?.rule} outcomes={data?.outcomes} minEvidence={data?.rule?.minEvidence} />}
    </div>
  );
}
