import React, { useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { Notice } from "./lmsUi";

/* Question version history (L6.1d UI, S89). Frontend only; mounted inside the CourseQuestions editor for a saved question. Backend (flag lms_quizzes + lms.course.manage):
     GET  /lms/questions/:id/versions -> { currentVersion, versions:[{version, stem (cut to 120), createdAt}] } (newest first, kept by the server up to a limit)
     POST /lms/questions/:id/versions/:v/restore {baseVersion} -> { question } ; 409 QUESTION_CONFLICT when the question changed since baseVersion
   Restoring makes a NEW version with the old text; nothing is lost. Unsaved edits in the editor are replaced, so we confirm first. baseVersion = the version the editor was opened on. */

const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }); };

export default function QuestionVersions({ questionId, version, onRestored }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [list, setList] = useState([]);
  const [cur, setCur] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setState("loading"); setMsg(null);
    try { const r = await API.get(`/lms/questions/${questionId}/versions`); setList(r.data.versions || []); setCur(r.data.currentVersion); setState("ready"); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the history.") }); setState("error"); }
  };
  const toggle = () => { const n = !open; setOpen(n); if (n && state === "idle") load(); };
  const restore = async (v) => {
    if (!window.confirm(`Restore version ${v}? What you have typed in the editor and not saved will be replaced. The current text stays in the history.`)) return;
    setBusy(true); setMsg(null);
    try { const r = await API.post(`/lms/questions/${questionId}/versions/${v}/restore`, { baseVersion: version }); onRestored(r.data.question); setState("idle"); setOpen(false); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not restore this version.") }); }
    setBusy(false);
  };
  return (
    <section aria-label="Version history" style={{ ...S.box, marginTop: 10 }}>
      <button type="button" style={S.btn} aria-expanded={open} onClick={toggle}>{open ? "Hide version history" : "Version history"}</button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <Notice msg={msg} />
          {state === "loading" && <p role="status" style={{ fontSize: 14, color: C.muted }}>Loading the history…</p>}
          {state === "error" && <button type="button" style={S.btn} onClick={load}>Try again</button>}
          {state === "ready" && (list.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No earlier versions yet.</p> : (
            <ul aria-label="Versions" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((x) => (
                <li key={x.version} style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
                  <span style={{ flex: 1, minWidth: 180 }}>Version {x.version}{x.version === cur ? " (current)" : ""}<br /><span style={{ color: C.muted, fontSize: 12 }}>{when(x.createdAt)}</span><br />{x.stem}</span>
                  {x.version !== cur && <button type="button" style={S.btn} disabled={busy} onClick={() => restore(x.version)} aria-label={`Restore version ${x.version}`}>Restore</button>}
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
    </section>
  );
}
