import React, { useRef, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { Notice } from "./lmsUi";

/* Question bank CSV import and export (L6.1b UI, S88). Frontend only; mounted inside CourseQuestions.jsx. Backend (flag lms_quizzes + lms.course.manage):
     GET  /lms/questions/export.csv?scope&type&difficulty&subject&topic -> CSV file (the same filters as the list)
     POST /lms/questions/import {csv, dryRun?, scope?, courseId?} -> { report:{summary:{rows,created,failed},failed:[{line,message}]}, dryRun? }
   Import is all or nothing: one bad row and nothing is created (409 IMPORT_HAS_ERRORS with the same report). At most 150 rows and 256 KB per file; the file is read here as text
   and sent as is, the server checks everything. Check first (dryRun writes nothing), then import with a confirmation. The first 50 bad rows are listed. */

const MAX_BYTES = 256 * 1024;
const SCOPES = { private: "Private (only me)", course: "Course staff / Department", school: "School" };

export default function QuestionCsv({ courseId, filters, onImported }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState(null); // { name, text }
  const [scope, setScope] = useState("private");
  const [rep, setRep] = useState(null); // { dryRun, report }
  const fileRef = useRef(null);

  const exportCsv = async () => {
    setMsg(null);
    const params = {}; Object.entries(filters || {}).forEach(([k, v]) => { if (String(v).trim()) params[k] = String(v).trim(); });
    try {
      const r = await API.get("/lms/questions/export.csv", { params, responseType: "blob" });
      const url = URL.createObjectURL(r.data), a = document.createElement("a");
      a.href = url; a.download = "questions.csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: "Questions exported. The file holds the questions you can see with the filters below." });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not export the questions.") }); }
  };
  const pick = (ev) => {
    const file = ev.target.files && ev.target.files[0]; setRep(null); setMsg(null);
    if (!file) { setCsv(null); return; }
    if (file.size > MAX_BYTES) { setCsv(null); setMsg({ ok: false, text: "This file is larger than 256 KB. Split it into smaller files." }); return; }
    const rd = new FileReader();
    rd.onload = () => setCsv({ name: file.name, text: String(rd.result || "") });
    rd.onerror = () => setMsg({ ok: false, text: "Could not read this file." });
    rd.readAsText(file);
  };
  const run = async (dryRun) => {
    if (!csv) { setMsg({ ok: false, text: "Choose a CSV file first." }); return; }
    if (!dryRun && !window.confirm(`Import these questions as ${SCOPES[scope].toLowerCase()}? If any row has a problem nothing is imported.`)) return;
    setBusy(true); setMsg(null);
    const body = { csv: csv.text, dryRun, scope }; if (scope === "course") body.courseId = Number(courseId);
    try {
      const r = await API.post("/lms/questions/import", body); setRep({ dryRun, report: r.data.report });
      if (!dryRun) { setMsg({ ok: true, text: `Imported ${r.data.report.summary.created} question${r.data.report.summary.created === 1 ? "" : "s"}.` }); setCsv(null); if (fileRef.current) fileRef.current.value = ""; if (onImported) onImported(); }
    } catch (e) {
      const d = e && e.response && e.response.data;
      if (d && d.report) setRep({ dryRun, report: d.report });
      else setRep(null);
      setMsg({ ok: false, text: errText(e, dryRun ? "Could not check the file." : "Could not import the file. Nothing was imported.") });
    }
    setBusy(false);
  };
  const sm = rep && rep.report && rep.report.summary, failed = (rep && rep.report && rep.report.failed) || [];
  return (
    <section aria-label="CSV import and export" style={{ ...S.box, marginBottom: 12 }}>
      <button type="button" style={S.btn} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide CSV import and export" : "CSV import and export"}</button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
          <Notice msg={msg} />
          <div>
            <button type="button" style={S.btn} onClick={exportCsv}>Export questions to CSV</button>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Uses the filters set below. Feedback on answer options is not exported.</p>
          </div>
          <div>
            <label style={S.label} htmlFor="csv-file">CSV file to import</label>
            <input id="csv-file" ref={fileRef} type="file" accept=".csv,text/csv" onChange={pick} />
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Needs a header row with type and stem. Up to 150 rows and 256 KB. Export a few questions first to see the format.</p>
          </div>
          <div><label style={S.label} htmlFor="csv-scope">Save the questions as</label><select id="csv-scope" style={S.input} value={scope} onChange={(e) => { setScope(e.target.value); setRep(null); }}>{Object.entries(SCOPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={S.btn} disabled={busy} onClick={() => run(true)}>Check file</button>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => run(false)}>Import questions</button>
          </div>
          {sm && (
            <div role="status" aria-live="polite" style={{ fontSize: 14 }}>
              <p style={{ margin: 0 }}>{rep.dryRun ? `Nothing was written. ${sm.rows} row${sm.rows === 1 ? "" : "s"} read: ${sm.created} would be imported, ${sm.failed} with problems.` : `${sm.rows} row${sm.rows === 1 ? "" : "s"} read: ${sm.created} imported, ${sm.failed} with problems.`}{sm.failed > 0 ? " Fix the rows below and try again: nothing is imported while any row has a problem." : ""}</p>
              {failed.length > 0 && <ul aria-label="Rows with problems" style={{ margin: "6px 0 0", paddingLeft: 18 }}>{failed.map((x) => <li key={`${x.line}-${x.message}`}>Line {x.line}: {x.message}</li>)}</ul>}
              {sm.failed > failed.length && <p style={{ margin: "4px 0 0", color: C.muted }}>Showing the first {failed.length} of {sm.failed} problems.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
