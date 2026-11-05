import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { Skeleton } from "./lmsUi";

/* Enrolment history panel (L2.5c, S109). Frontend only. Backend: GET /lms/courses/:id/enrolments/history?studentId&beforeId&limit
   -> {entries:[{id,studentId,action,fromStatus,toStatus,detail,actorSource,actorId,createdAt}] newest first, nextBeforeId|null}. Load older = pass beforeId. Read only.
   Names come from the roster page the parent already has (nameOf); other learners show as "Student N". Staff ids are never shown. */
const LIMIT = 25;
const ACTION = { enrolled: "Enrolled", reenrolled: "Enrolled again", approved: "Approved", declined: "Declined", withdrawn: "Withdrawn", transferred_out: "Moved out to another course", transferred_in: "Moved in from another course", self_enrolled: "Joined by themselves", requested: "Asked to join", self_withdrawn: "Left by themselves" };
const WHO = { Students: "the student", Teachers: "staff", Admins: "an administrator" };
const when = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };

export default function EnrolmentHistory({ base, studentId, nameOf, onClose }) {
  const [state, setState] = useState("loading"), [rows, setRows] = useState([]), [next, setNext] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  const fetchPage = useCallback(async (before) => {
    const params = { limit: LIMIT }; if (studentId) params.studentId = studentId; if (before) params.beforeId = before;
    return (await API.get(`${base}/history`, { params })).data;
  }, [base, studentId]);
  useEffect(() => {
    let alive = true; setState("loading"); setRows([]); setNext(null);
    fetchPage(null).then((d) => { if (alive) { setRows(d.entries || []); setNext(d.nextBeforeId || null); setState("ready"); } })
      .catch((e) => { if (alive) { setErr(errText(e, "Could not load the history.")); setState("error"); } });
    return () => { alive = false; };
  }, [fetchPage]);
  const more = async () => {
    setBusy(true); setErr(null);
    try { const d = await fetchPage(next); setRows((r) => [...r, ...(d.entries || [])]); setNext(d.nextBeforeId || null); }
    catch (e) { setErr(errText(e, "Could not load more.")); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Enrolment history" style={{ ...S.box, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{studentId ? `History for ${nameOf(studentId)}` : "Enrolment history"}</h2>
        <button type="button" style={S.btn} onClick={onClose}>Close history</button>
      </div>
      {state === "loading" && <Skeleton rows={3} />}
      {state === "error" && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      {state === "ready" && (rows.length === 0 ? <p style={{ color: C.muted }}>Nothing recorded yet.</p> : (
        <ul aria-label="History entries" style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {rows.map((x) => (
            <li key={x.id} style={{ padding: "6px 0", borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
              <strong>{studentId ? "" : `${nameOf(x.studentId)}: `}{ACTION[x.action] || String(x.action || "").replace(/_/g, " ")}</strong>
              {x.detail ? ` (${x.detail})` : ""}
              <div style={{ fontSize: 12, color: C.muted }}>{when(x.createdAt)}{WHO[x.actorSource] ? ` · by ${WHO[x.actorSource]}` : ""}</div>
            </li>
          ))}
        </ul>
      ))}
      {state === "ready" && err && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      {state === "ready" && next && <p><button type="button" style={S.btn} disabled={busy} onClick={more}>Load older entries</button></p>}
    </section>
  );
}
