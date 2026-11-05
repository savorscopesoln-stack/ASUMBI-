import React, { useEffect, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";

/* Transfer one learner to another course (L2.5d, S109). Frontend only. Backend: POST /lms/courses/:id/enrolments/:studentId/transfer {toCourseId}
   (the caller must be allowed to manage BOTH courses; only an ACTIVE enrolment moves; 409 ALREADY_ENROLLED if already in the target; both sides recorded in history).
   Targets: GET /lms/courses?status=published&pageSize=50 -> {items:[{id,code,title}]} = the courses this user is staff on. Server sentences are shown as they come. */
export default function EnrolmentTransfer({ base, fromCourseId, student, onClose, onDone }) {
  const [courses, setCourses] = useState(null), [to, setTo] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  useEffect(() => {
    let alive = true;
    API.get("/lms/courses", { params: { status: "published", pageSize: 50 } }).then((r) => { if (alive) setCourses((r.data.items || []).filter((c) => String(c.id) !== String(fromCourseId))); })
      .catch((e) => { if (alive) { setCourses([]); setMsg({ ok: false, text: errText(e, "Could not load your courses.") }); } });
    return () => { alive = false; };
  }, [fromCourseId]);
  const name = student.name || `Student ${student.studentId}`;
  const go = async () => {
    const c = (courses || []).find((x) => String(x.id) === to); if (!c || busy) return;
    if (!window.confirm(`Move ${name} to "${c.title}"? They leave this course and join that one. Their work here is kept.`)) return;
    setBusy(true); setMsg(null);
    try { await API.post(`${base}/${student.studentId}/transfer`, { toCourseId: c.id }); onDone(`${name} was moved to ${c.title}.`); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not move the student. Nothing was changed.") }); setBusy(false); }
  };
  return (
    <section aria-label="Transfer student" style={{ ...S.box, marginBottom: 12 }}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Move {name} to another course</h2>
      {msg && <div role="alert" style={{ color: C.bad, margin: "0 0 8px", fontSize: 14 }}>{msg.text}</div>}
      {courses === null ? <p style={{ color: C.muted }}>Loading your courses…</p> : courses.length === 0 ? <p style={{ color: C.muted }}>You have no other published course to move this student to.</p> : (
        <div><label htmlFor="tr-to" style={S.label}>Move to</label>
          <select id="tr-to" style={{ ...S.input, minWidth: 240 }} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Choose a course…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ""}{c.title}</option>)}
          </select></div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" style={S.btnPrimary} disabled={busy || !to} onClick={go}>Move student</button>
        <button type="button" style={S.btn} onClick={onClose}>Cancel</button>
      </div>
    </section>
  );
}
