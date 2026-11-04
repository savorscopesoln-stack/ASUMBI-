import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher marking screen /teacher/courses/:courseId/marking (L5.4d, S77). Frontend only.
   Backend (staff, `lms.submission.grade` + course membership; the server decides everything):
     GET  /lms/courses/:id/assignments?pageSize=50
     GET  /lms/courses/:id/assignments/:aid/submissions?filter&page&pageSize   (latest submitted attempt per learner)
     GET  /lms/courses/:id/assignments/:aid/submissions/:sid                   (text, files, rubric, grade)
     GET  .../submissions/:sid/files/:fileId                                   (authenticated download, always an attachment)
     PUT  .../submissions/:sid/grade   {points,comment} or {scores:[{criterionId,levelPosition,comment}],comment}   -> saved as a DRAFT
     POST .../submissions/:sid/return                                           -> the learner can now see it; cannot be changed after
   Learner text is shown as plain text. Group work (item.groupId) is NOT marked here yet (group-grade routes exist, no UI). */

const PAGE_SIZE = 20;
const FILTERS = [["all", "All"], ["ungraded", "Not marked"], ["graded", "Marked, not returned"], ["returned", "Returned"], ["late", "Late"], ["resubmitted", "Resubmitted"]];
const when = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };
const statusText = (s) => (s === "returned" ? "Returned" : s === "draft" ? "Marked, not returned" : "Not marked");
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Marker({ courseId, assignmentId, item, onChanged }) {
  const base = `/lms/courses/${courseId}/assignments/${assignmentId}/submissions/${item.submissionId}`;
  const [state, setState] = useState("loading"); // loading | ready | error
  const [d, setD] = useState(null);
  const [points, setPoints] = useState("");
  const [levels, setLevels] = useState({}); // criterionId -> levelPosition
  const [cnotes, setCnotes] = useState({}); // criterionId -> comment
  const [comment, setComment] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const fill = (data) => {
    const g = data.grade;
    setD(data); setPoints(g && !data.rubric ? String(g.rawPoints) : ""); setComment(g ? g.comment : "");
    const lv = {}, nt = {};
    if (g && data.rubric) for (const s of g.scores) { lv[s.criterionId] = s.levelPosition; nt[s.criterionId] = s.comment; }
    setLevels(lv); setCnotes(nt); setDirty(false);
  };
  useEffect(() => {
    let alive = true;
    API.get(base).then((r) => { if (alive) { fill(r.data); setState("ready"); } })
      .catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not open this work.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base]);

  const download = async (f) => {
    try {
      const r = await API.get(`${base}/files/${f.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data); const a = document.createElement("a");
      a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not download the file.") }); }
  };

  const save = async () => {
    const body = { comment };
    if (d.rubric) {
      const missing = d.rubric.criteria.filter((c) => !levels[c.id]);
      if (missing.length) { setMsg({ ok: false, text: `Choose a level for every criterion (${missing.length} left).` }); return; }
      body.scores = d.rubric.criteria.map((c) => ({ criterionId: c.id, levelPosition: Number(levels[c.id]), comment: cnotes[c.id] || "" }));
    } else {
      const n = Number(points);
      if (points.trim() === "" || Number.isNaN(n)) { setMsg({ ok: false, text: "Enter the points." }); return; }
      body.points = n;
    }
    setBusy(true); setMsg(null);
    try {
      const r = await API.put(`${base}/grade`, body);
      setD((x) => ({ ...x, grade: r.data.grade })); setDirty(false);
      setMsg({ ok: true, text: "Grade saved. The learner cannot see it until you return the work." }); onChanged();
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not save the grade. Your entries are still here.") }); }
    setBusy(false);
  };
  const giveBack = async () => {
    if (!window.confirm("Return this work to the learner? They will see the grade and feedback, and you will not be able to change it.")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await API.post(`${base}/return`);
      setD((x) => ({ ...x, grade: r.data.grade })); setMsg({ ok: true, text: "Returned to the learner." }); onChanged();
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not return the work.") }); }
    setBusy(false);
  };

  if (state === "loading") return <Skeleton rows={4} />;
  if (state === "error") return <Notice msg={msg} />;
  const { submission: s, rubric, grade } = d;
  const returned = grade && grade.status === "returned";
  return (
    <div>
      <h2 style={{ fontSize: 17, margin: "0 0 2px" }}>{s.studentName || "Learner"}{s.admissionNo ? ` (${s.admissionNo})` : ""}</h2>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
        Attempt {s.attemptNo} · handed in {when(s.submittedAt)}{s.late ? ` · LATE${s.latePenaltyPercent ? ` (${s.latePenaltyPercent}% penalty)` : ""}` : ""}
      </div>
      <Notice msg={msg} />
      <section aria-label="Submitted work" style={{ ...S.box, marginBottom: 10 }}>
        {s.text ? <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5 }}>{s.text}</p> : <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>No text was handed in.</p>}
        {s.files.length > 0 && (
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
            {s.files.map((f) => (
              <li key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
                <span>{f.name} <span style={{ color: C.muted }}>({kb(f.sizeBytes)})</span></span>
                <button type="button" style={S.btn} onClick={() => download(f)} aria-label={`Download ${f.name}`}>Download</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {returned ? (
        <section aria-label="Returned grade" style={S.box}>
          <strong>Returned {when(grade.returnedAt)}: {grade.finalPoints} / {grade.maxPoints}</strong>
          {grade.penaltyPercent ? <div style={{ fontSize: 13, color: C.muted }}>{grade.penaltyPercent}% late penalty applied to {grade.rawPoints}.</div> : null}
          {grade.comment && <p style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{grade.comment}</p>}
        </section>
      ) : item.groupId ? (
        <Notice msg={{ ok: false, text: "This is group work. Marking a group is not available on this screen yet." }} />
      ) : (
        <section aria-label="Grade" style={S.box}>
          {rubric ? rubric.criteria.map((c) => (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <label style={S.label} htmlFor={`lv-${c.id}`}>{c.title}</label>
              {c.description && <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{c.description}</div>}
              <select id={`lv-${c.id}`} style={S.input} value={levels[c.id] || ""} onChange={(e) => { setLevels((x) => ({ ...x, [c.id]: e.target.value })); setDirty(true); setMsg(null); }}>
                <option value="">Choose a level</option>
                {c.levels.map((l) => <option key={l.position} value={l.position}>{l.label} ({l.points})</option>)}
              </select>
              <label style={S.label} htmlFor={`cn-${c.id}`}>Comment on {c.title} (optional)</label>
              <input id={`cn-${c.id}`} style={{ ...S.input, width: "100%" }} maxLength={500} value={cnotes[c.id] || ""} onChange={(e) => { setCnotes((x) => ({ ...x, [c.id]: e.target.value })); setDirty(true); }} />
            </div>
          )) : (
            <div>
              <label style={S.label} htmlFor="mk-points">Points (0 to {d.assignment.maxPoints})</label>
              <input id="mk-points" type="number" inputMode="decimal" step="0.01" min="0" max={d.assignment.maxPoints} style={{ ...S.input, width: 140 }} value={points} onChange={(e) => { setPoints(e.target.value); setDirty(true); setMsg(null); }} />
            </div>
          )}
          <label style={S.label} htmlFor="mk-comment">Feedback to the learner</label>
          <textarea id="mk-comment" rows={4} maxLength={4000} style={{ ...S.input, width: "100%" }} value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); setMsg(null); }} />
          {grade && <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Saved grade: {grade.rawPoints}{grade.penaltyPercent ? `, after ${grade.penaltyPercent}% late penalty ${grade.finalPoints}` : ""} out of {grade.maxPoints}. Not returned yet.</div>}
          {dirty && <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }} role="status">Not saved yet</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={save}>Save grade</button>
            <button type="button" style={S.btn} disabled={busy || !grade || dirty} onClick={giveBack} title={dirty ? "Save your changes first" : undefined}>Return to learner</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default function TeacherMarking() {
  const { courseId } = useParams();
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [aid, setAid] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [qBusy, setQBusy] = useState(false);
  const [qErr, setQErr] = useState(null);
  const [sel, setSel] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    API.get(`/lms/courses/${courseId}/assignments`, { params: { pageSize: 50 } })
      .then((r) => { if (alive) { setAssignments(r.data.items || []); setState("ready"); } })
      .catch((e) => { if (!alive) return; if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the assignments.") }); setState("error"); } });
    return () => { alive = false; };
  }, [courseId]);

  useEffect(() => {
    if (!aid) return undefined;
    let alive = true;
    API.get(`/lms/courses/${courseId}/assignments/${aid}/submissions`, { params: { filter, page, pageSize: PAGE_SIZE } })
      .then((r) => { if (alive) { setQ({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE }); setQErr(null); setQBusy(false); } })
      .catch((e) => { if (alive) { setQErr({ ok: false, text: errText(e, "Could not load the list of work.") }); setQBusy(false); } });
    return () => { alive = false; };
  }, [courseId, aid, filter, page, tick]);

  const pickAssignment = (v) => { setAid(v); setPage(1); setSel(null); setQ({ items: [], total: 0, pageSize: PAGE_SIZE }); setQBusy(!!v); };
  const pickFilter = (v) => { setFilter(v); setPage(1); setSel(null); setQBusy(true); };
  const toPage = (p) => { setPage(p); setQBusy(true); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Marking</h1>
      <p style={S.sub}>Mark handed-in work, save the grade, then return it to the learner.</p>
      {state === "loading" ? <Skeleton /> : state === "error" ? <Notice msg={msg} /> : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <label style={S.label} htmlFor="mk-assignment">Assignment</label>
              <select id="mk-assignment" style={S.input} value={aid} onChange={(e) => pickAssignment(e.target.value)}>
                <option value="">Choose an assignment</option>
                {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label} htmlFor="mk-filter">Show</label>
              <select id="mk-filter" style={S.input} value={filter} onChange={(e) => pickFilter(e.target.value)} disabled={!aid}>
                {FILTERS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
          </div>
          {assignments.length === 0 && <p style={{ color: C.muted, fontSize: 14 }}>This course has no assignments yet.</p>}
          {aid && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <Notice msg={qErr} />
                {qBusy && q.items.length === 0 ? <Skeleton /> : q.items.length === 0 && !qErr ? <p style={{ color: C.muted, fontSize: 14 }}>No work to show with this filter.</p> : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }} aria-label="Handed-in work">
                    {q.items.map((it) => (
                      <li key={it.submissionId}>
                        <button type="button" onClick={() => setSel(it)} aria-current={sel && sel.submissionId === it.submissionId ? "true" : undefined}
                          style={{ ...S.btn, width: "100%", textAlign: "left", borderColor: sel && sel.submissionId === it.submissionId ? C.accent : C.border }}>
                          <strong>{it.studentName || "Learner"}</strong>{it.admissionNo ? ` (${it.admissionNo})` : ""}
                          <div style={{ fontSize: 12, color: C.muted }}>
                            {statusText(it.gradeStatus)}{it.finalPoints != null ? ` · ${it.finalPoints}/${it.maxPoints}` : ""}{it.late ? " · Late" : ""}{it.resubmitted ? ` · Attempt ${it.attemptNo}` : ""}{it.groupId ? " · Group" : ""}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Pager page={page} pageSize={q.pageSize} total={q.total} onPage={toPage} busy={qBusy} />
              </div>
              <div style={{ flex: "2 1 360px", minWidth: 0 }}>
                {sel ? <Marker key={sel.submissionId} courseId={courseId} assignmentId={aid} item={sel} onChanged={() => setTick((t) => t + 1)} /> : <p style={{ color: C.muted, fontSize: 14 }}>Choose a learner to open their work.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
