import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useDebounced } from "./lmsUtil";
import { Notice, Pager, Skeleton, Tabs } from "./lmsUi";
import EnrolmentHistory from "./EnrolmentHistory";
import EnrolmentTransfer from "./EnrolmentTransfer";

/* Teacher/admin enrolment screen /teacher/courses/:courseId/enrolments (L2.5 UI, S91). Frontend only. Backend (lms.course.manage or lms.enrolment.manage + course access):
     GET  /lms/courses/:id/enrolments?status&q&page&pageSize -> { students:[{studentId,name,admissionNo,className,status,source,enrolledAt}], total, page, pageSize }
     POST /lms/courses/:id/enrolments/bulk {csv, dryRun?}        csv = header "admissionNo" + one number per row (max 500 rows)
     POST /lms/courses/:id/enrolments/class-list {className?, dryRun?}   (className empty = the course's own class)
     POST /lms/courses/:id/enrolments/:studentId/(approve|decline|withdraw)
   Report from add: { report-like fields at top level: summary:{requested,enrolled,reenrolled,approved,skipped,failed}, failed:[{line?,admissionNo?,studentId,message}], skipped:[..] }. The server's
   own sentences are shown. Add = check first (dryRun writes nothing), then confirm. CSV FILE (S109): third tab reads a .csv/.txt file in the browser (max 100 KB, same {csv,dryRun} call, the file needs an \"admissionNo\" header). TRANSFER (S109): EnrolmentTransfer.jsx. HISTORY (S109): EnrolmentHistory.jsx (course-wide or one learner). */

const PAGE_SIZE = 25, MAX_CSV_BYTES = 100 * 1024;
const readText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => rej(new Error("read")); r.readAsText(file); });
const TABS = [["", "All"], ["active", "Enrolled"], ["pending", "Waiting"], ["withdrawn", "Withdrawn"]];
const STATUS = { active: "Enrolled", pending: "Waiting for approval", withdrawn: "Withdrawn", transferred: "Moved to another course" };
const SOURCE = { manual: "added by staff", bulk: "added from a list", class_list: "added from a class", self: "joined by themselves", transfer: "transferred" };

function Report({ rep }) {
  if (!rep) return null;
  const sm = rep.report.summary || {}, failed = (rep.report.failed || []).slice(0, 50), nFailed = sm.failed || 0;
  const done = sm.enrolled + sm.reenrolled + sm.approved;
  return (
    <div role="status" aria-live="polite" style={{ fontSize: 14, marginTop: 8 }}>
      <p style={{ margin: 0 }}>{rep.dryRun ? `Nothing was written. Of ${sm.requested} requested, ${done} would be enrolled` : `Of ${sm.requested} requested, ${done} enrolled`}, {sm.skipped} skipped (already in or inactive), {nFailed} with problems.</p>
      {failed.length > 0 && <ul aria-label="Problems" style={{ margin: "6px 0 0", paddingLeft: 18 }}>{failed.map((x, i) => <li key={i}>{x.line ? `Line ${x.line}` : `Student ${x.studentId}`}{x.admissionNo ? ` (${x.admissionNo})` : ""}: {x.message}</li>)}</ul>}
      {nFailed > failed.length && <p style={{ margin: "4px 0 0", color: C.muted }}>Showing the first {failed.length} of {nFailed} problems.</p>}
    </div>
  );
}

function AddPanel({ base, onAdded }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("numbers");
  const [numbers, setNumbers] = useState("");
  const [className, setClassName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [rep, setRep] = useState(null);
  const [csv, setCsv] = useState(null);

  const pickFile = async (file) => {
    setRep(null); setMsg(null); setCsv(null); if (!file) return;
    if (file.size > MAX_CSV_BYTES) { setMsg({ ok: false, text: "That file is larger than 100 KB. Split it into smaller files." }); return; }
    try { const text = await readText(file); if (!text.trim()) { setMsg({ ok: false, text: "That file is empty." }); return; } setCsv({ name: file.name, text, lines: text.split(/\r?\n/).filter((l) => l.trim()).length - 1 }); }
    catch { setMsg({ ok: false, text: "Could not read that file." }); }
  };

  const run = async (dryRun) => {
    setMsg(null);
    let path, body;
    if (mode === "numbers") {
      const list = numbers.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
      if (!list.length) { setMsg({ ok: false, text: "Type at least one admission number." }); return; }
      path = "bulk"; body = { csv: "admissionNo\n" + list.map((x) => (/[",]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join("\n"), dryRun };
    } else if (mode === "file") {
      if (!csv) { setMsg({ ok: false, text: "Choose a CSV file first." }); return; }
      path = "bulk"; body = { csv: csv.text, dryRun };
    } else { path = "class-list"; body = { dryRun }; if (className.trim()) body.className = className.trim(); }
    if (!dryRun && !window.confirm(mode !== "class" ? "Enrol these students in this course?" : "Enrol everyone in this class into this course?")) return;
    setBusy(true);
    try {
      const r = await API.post(`${base}/${path}`, body); setRep({ dryRun, report: r.data.report || r.data });
      if (!dryRun) { setMsg({ ok: true, text: "Students enrolled." }); setNumbers(""); setCsv(null); onAdded(); }
    } catch (e) { setRep(null); setMsg({ ok: false, text: errText(e, dryRun ? "Could not check the list." : "Could not enrol. Check the list and try again.") }); }
    setBusy(false);
  };
  return (
    <section aria-label="Add students" style={{ ...S.box, marginBottom: 12 }}>
      <button type="button" style={S.btn} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide add students" : "Add students"}</button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
          <Notice msg={msg} />
          <Tabs tabs={[["numbers", "By admission number"], ["file", "From a CSV file"], ["class", "A whole class"]]} value={mode} onChange={(m) => { setMode(m); setRep(null); setMsg(null); }} />
          {mode === "numbers" ? (
            <div><label style={S.label} htmlFor="en-nums">Admission numbers (one per line)</label>
              <textarea id="en-nums" rows={5} maxLength={20000} style={{ ...S.input, width: "100%" }} value={numbers} onChange={(e) => { setNumbers(e.target.value); setRep(null); }} />
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Up to 500 at a time. You can paste a column from a spreadsheet.</p></div>
          ) : mode === "file" ? (
            <div><label style={S.label} htmlFor="en-file">CSV file</label>
              <input id="en-file" type="file" accept=".csv,.txt,text/csv,text/plain" style={S.input} onChange={(e) => pickFile(e.target.files?.[0])} />
              {csv && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{csv.name}: {csv.lines} row{csv.lines === 1 ? "" : "s"} ready.</p>}
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>The first row must say admissionNo. Up to 500 rows and 100 KB. Use Check first to see problems line by line.</p></div>
          ) : (
            <div><label style={S.label} htmlFor="en-class">Class name (optional)</label>
              <input id="en-class" maxLength={50} style={S.input} value={className} onChange={(e) => { setClassName(e.target.value); setRep(null); }} />
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Leave empty to use this course's own class. Students whose year of study does not match are not added.</p></div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={S.btn} disabled={busy} onClick={() => run(true)}>Check first</button>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => run(false)}>Enrol</button>
          </div>
          <Report rep={rep} />
        </div>
      )}
    </section>
  );
}

export default function CourseEnrolments() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/enrolments`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState({ students: [], total: 0, pageSize: PAGE_SIZE });
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tr, setTr] = useState(null), [hist, setHist] = useState(null); // tr = student being moved; hist = {studentId|null}
  const nameOf = (id) => { const s = data.students.find((x) => x.studentId === id); return s && s.name ? s.name : `Student ${id}`; };

  const load = useCallback(async () => {
    const params = { page, pageSize: PAGE_SIZE }; if (status) params.status = status; if (dq.trim()) params.q = dq.trim();
    try { const r = await API.get(base, { params }); setData({ students: r.data.students || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the enrolments.") }); setState("error"); } }
  }, [base, status, dq, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, tick]);

  const act = async (s, action) => {
    const ask = { withdraw: "Withdraw this student from the course? They lose access, and their work is kept.", decline: "Decline this request?", approve: null }[action];
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setMsg(null);
    try { await API.post(`${base}/${s.studentId}/${action}`); setMsg({ ok: true, text: { approve: "Student approved.", decline: "Request declined.", withdraw: "Student withdrawn." }[action] }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not change this student.") }); }
    setBusy(false);
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Enrolments</h1>
      <p style={{ margin: "0 0 10px" }}><Link to="/teacher/courses" style={{ fontSize: 14 }}>Back to courses</Link></p>
      <p style={S.sub}>Who is in this course. Students only see the course once they are enrolled, or after they join it themselves from Browse.</p>
      <Notice msg={msg} />
      {tr && <EnrolmentTransfer key={tr.studentId} base={base} fromCourseId={courseId} student={tr} onClose={() => setTr(null)} onDone={(t) => { setTr(null); setMsg({ ok: true, text: t }); setTick((n) => n + 1); }} />}
      {hist && <EnrolmentHistory key={hist.studentId || "all"} base={base} studentId={hist.studentId} nameOf={nameOf} onClose={() => setHist(null)} />}
      <p style={{ margin: "0 0 8px" }}><button type="button" style={S.btn} onClick={() => setHist({ studentId: null })}>Enrolment history</button></p>
      <AddPanel base={base} onAdded={() => { setPage(1); setTick((t) => t + 1); }} />
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      <div style={{ marginBottom: 10 }}><label style={S.label} htmlFor="en-q">Search name or admission number</label><input id="en-q" type="search" maxLength={60} style={{ ...S.input, width: 260 }} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button> : data.students.length === 0 ? (
        <p style={{ fontSize: 14, color: C.muted }}>No students match. Use "Add students" to enrol some.</p>
      ) : (
        <ul aria-label="Students" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {data.students.map((s) => (
            <li key={s.studentId} style={{ ...S.box, display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 14, flex: 1, minWidth: 200 }}>{s.name || `Student ${s.studentId}`}{s.admissionNo ? ` (${s.admissionNo})` : ""}<br />
                <span style={{ color: C.muted, fontSize: 12 }}>{STATUS[s.status] || s.status}{s.className ? ` · ${s.className}` : ""}{SOURCE[s.source] ? ` · ${SOURCE[s.source]}` : ""}</span></span>
              <span style={{ display: "flex", gap: 6 }}>
                {s.status === "pending" && <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => act(s, "approve")} aria-label={`Approve ${s.name || s.studentId}`}>Approve</button>}
                {s.status === "pending" && <button type="button" style={S.btn} disabled={busy} onClick={() => act(s, "decline")} aria-label={`Decline ${s.name || s.studentId}`}>Decline</button>}
                {s.status === "active" && <button type="button" style={S.btn} disabled={busy} onClick={() => setTr(s)} aria-label={`Move ${s.name || s.studentId} to another course`}>Move</button>}
                <button type="button" style={S.btn} onClick={() => setHist({ studentId: s.studentId })} aria-label={`History for ${s.name || s.studentId}`}>History</button>
                {s.status === "active" && <button type="button" style={S.btn} disabled={busy} onClick={() => act(s, "withdraw")} aria-label={`Withdraw ${s.name || s.studentId}`}>Withdraw</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={busy} />
    </div>
  );
}
