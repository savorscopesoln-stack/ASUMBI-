import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Grade release panel (L5.4b UI, S106). Frontend only. Backend (lms.submission.grade + course staff) under /lms/courses/:id/assignments/:aid:
   POST return-all -> {returned, skippedUngraded} (returns every graded draft of the latest attempts now; never re-opens);
   GET grade-release -> {release:{releaseAt,passed}|null}; PUT {releaseAt} (ISO 8601 with time zone, future, at most 366 days ahead); DELETE (only while it has not passed: SCHEDULE_PASSED / NOT_SCHEDULED);
   GET grade-release/students -> {releases:[{studentId,studentName,admissionNo,releaseAt,passed}]}; PUT/DELETE grade-release/students/:studentId (same limits).
   A schedule that has passed is history: it cannot be changed or cancelled, a NEW future time may be set for later grading. The client checks the date shape only; the server decides and its message is shown.
   Learners are found with GET /lms/courses/:id/enrolments?status=active&q&page=1&pageSize=10. */
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);
const pad = (n) => String(n).padStart(2, "0");
const toLocal = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
const show = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };
const label = (x) => `${x.studentName || x.name || "Learner"}${x.admissionNo ? ` (${x.admissionNo})` : ""}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const timeErr = (v) => { const t = v ? new Date(v).getTime() : NaN; return Number.isNaN(t) ? "Choose a date and time." : t <= Date.now() ? "The release time must be in the future." : t > Date.now() + 366 * 864e5 ? "The release time can be at most 366 days ahead." : ""; };

export default function AssignmentGradeRelease({ courseId, base, a, onClose }) {
  const [st, setSt] = useState("loading"), [rel, setRel] = useState(null), [list, setList] = useState([]), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [when, setWhen] = useState(""), [q, setQ] = useState(""), [found, setFound] = useState(null), [target, setTarget] = useState(null), [swhen, setSwhen] = useState("");
  const url = `${base}/${a.id}/grade-release`;
  const load = useCallback(async () => {
    try { const [r1, r2] = await Promise.all([API.get(url), API.get(`${url}/students`)]); setRel(r1.data.release || null); setList(r2.data.releases || []); setSt("ready"); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the grade release settings.") }); setSt("error"); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, okText, after) => { setBusy(true); setMsg(null); try { const r = await fn(); setMsg({ ok: true, text: typeof okText === "function" ? okText(r) : okText }); if (after) after(); await load(); } catch (e) { setMsg({ ok: false, text: errText(e, "That did not work. Please try again.") }); } finally { setBusy(false); } };
  const returnAll = () => { if (!ask(`Return all graded work for "${a.title}" to learners now? This cannot be undone.`)) return; run(() => API.post(`${base}/${a.id}/return-all`, {}), (r) => { const n = r.data.returned || 0, k = r.data.skippedUngraded || 0; return `${n === 0 ? "No grades were waiting to be returned." : `Returned ${plural(n, "grade", "grades")}.`}${k ? ` ${plural(k, "submission has", "submissions have")} no grade yet and ${k === 1 ? "was" : "were"} skipped.` : ""}`; }); };
  const schedule = (e) => { e.preventDefault(); if (timeErr(when) || busy) return; run(() => API.put(url, { releaseAt: new Date(when).toISOString() }), "Release scheduled.", () => setWhen("")); };
  const cancel = () => { if (!ask("Cancel the scheduled release? Grades stay hidden until you return them.")) return; run(() => API.delete(url), "Scheduled release cancelled."); };
  const search = async (e) => { e.preventDefault(); setBusy(true); setMsg(null); try { const r = await API.get(`/lms/courses/${courseId}/enrolments`, { params: { status: "active", q: q.trim(), page: 1, pageSize: 10 } }); setFound({ students: r.data.students || [], total: r.data.total || 0 }); } catch (er) { setMsg({ ok: false, text: errText(er, "Could not search the learners.") }); } finally { setBusy(false); } };
  const pick = (t, at) => { setTarget(t); setSwhen(at ? toLocal(at) : ""); setMsg(null); };
  const setOne = (e) => { e.preventDefault(); if (!target || timeErr(swhen) || busy) return; run(() => API.put(`${url}/students/${target.studentId}`, { releaseAt: new Date(swhen).toISOString() }), "Release time saved for the learner.", () => { setTarget(null); setFound(null); setQ(""); }); };
  const cancelOne = (x) => { if (!ask(`Cancel the release time for ${label(x)}? They follow the assignment's release again.`)) return; run(() => API.delete(`${url}/students/${x.studentId}`), "Learner release time cancelled."); };
  const sErr = target ? timeErr(swhen) : "", wErr = when ? timeErr(when) : "";
  return (
    <section aria-label={`Grade release for ${a.title}`} style={{ borderTop: `1px solid ${C.border || "#ddd"}`, marginTop: 10, paddingTop: 10 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Grade release</h2>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px" }}>Learners only see a grade once it is returned. Returned grades cannot be taken back.</p>
      <Notice msg={msg} />
      {st === "loading" ? <Skeleton rows={2} /> : st === "error" ? <button type="button" style={S.btn} onClick={() => { setSt("loading"); setMsg(null); load(); }}>Try again</button> : (
        <>
          <p style={{ margin: "0 0 8px" }}><button type="button" style={S.btnPrimary} disabled={busy} onClick={returnAll}>Return all graded work now</button></p>
          <h3 style={{ fontSize: 14, margin: "8px 0 4px" }}>Scheduled release for everyone</h3>
          <p style={{ fontSize: 14, margin: "0 0 6px" }} data-testid="rel-current">{!rel ? "No release is scheduled." : rel.passed ? `The release at ${show(rel.releaseAt)} has passed. Grades saved before then were returned.` : `Scheduled for ${show(rel.releaseAt)}. Grades saved by then are returned automatically.`}</p>
          <form aria-label="Schedule release" onSubmit={schedule} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div><label style={S.label} htmlFor={`gr-w-${a.id}`}>{rel && !rel.passed ? "Change release time" : "Release time"}</label>
              <input id={`gr-w-${a.id}`} type="datetime-local" style={S.input} value={when} onChange={(e) => setWhen(e.target.value)} /></div>
            <button type="submit" style={S.btn} disabled={busy || !when || !!wErr}>{rel && !rel.passed ? "Change time" : "Schedule release"}</button>
            {rel && !rel.passed && <button type="button" style={S.btn} disabled={busy} onClick={cancel}>Cancel schedule</button>}
          </form>
          {wErr && <div role="alert" style={{ fontSize: 13, color: C.bad, marginTop: 4 }}>{wErr}</div>}
          <h3 style={{ fontSize: 14, margin: "12px 0 4px" }}>Release times for single learners</h3>
          {list.length === 0 ? <p style={{ fontSize: 14, color: C.muted, margin: "0 0 6px" }} data-testid="rel-none">No learner has their own release time.</p> : (
            <ul aria-label="Learner release times" style={{ padding: 0, margin: "0 0 8px", display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((x) => (
                <li key={x.studentId} style={{ listStyle: "none", fontSize: 14 }}><strong>{label(x)}</strong>: {show(x.releaseAt)}{x.passed ? " (passed)" : ""}{" "}
                  {!x.passed && <><button type="button" style={S.btn} disabled={busy} aria-label={`Change release time for ${label(x)}`} onClick={() => pick(x, x.releaseAt)}>Change</button>{" "}
                    <button type="button" style={S.btn} disabled={busy} aria-label={`Cancel release time for ${label(x)}`} onClick={() => cancelOne(x)}>Cancel</button></>}</li>))}
            </ul>)}
          {!target && (
            <form aria-label="Find a learner" onSubmit={search} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div><label style={S.label} htmlFor={`gr-q-${a.id}`}>Find a learner (name or admission number)</label><input id={`gr-q-${a.id}`} style={S.input} maxLength={60} value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button type="submit" style={S.btn} disabled={busy}>Search</button>
            </form>)}
          {!target && found && (found.students.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No active learner matches.</p> : (
            <>
              <ul aria-label="Matching learners" style={{ padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {found.students.map((s) => (
                  <li key={s.studentId} style={{ listStyle: "none", fontSize: 14 }}>{label(s)}{s.className ? ` · ${s.className}` : ""}{" "}
                    <button type="button" style={S.btn} aria-label={`Set a release time for ${label(s)}`} onClick={() => pick({ studentId: s.studentId, studentName: s.name, admissionNo: s.admissionNo }, null)}>Set release time</button></li>))}
              </ul>
              {found.total > found.students.length && <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0" }}>Showing the first {found.students.length} of {found.total} learners. Narrow the search.</p>}
            </>))}
          {target && (
            <form aria-label="Learner release time" onSubmit={setOne} style={{ ...S.box, margin: "4px 0 0" }}>
              <p style={{ margin: "0 0 6px", fontSize: 14 }}>Release time for <strong>{label(target)}</strong>. It replaces the assignment's schedule for work graded by then.</p>
              <label style={S.label} htmlFor={`gr-s-${a.id}`}>Release time</label>
              <input id={`gr-s-${a.id}`} type="datetime-local" style={S.input} value={swhen} onChange={(e) => setSwhen(e.target.value)} />
              {swhen && sErr && <div role="alert" style={{ fontSize: 13, color: C.bad, marginTop: 4 }}>{sErr}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" style={S.btnPrimary} disabled={busy || !!sErr}>Save release time</button>
                <button type="button" style={S.btn} onClick={() => setTarget(null)}>Cancel</button>
              </div>
            </form>)}
        </>)}
      <div style={{ marginTop: 8 }}><button type="button" style={S.btn} onClick={onClose}>Close grade release</button></div>
    </section>
  );
}
