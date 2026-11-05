import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Learner Help /student/courses/:courseId/help (L8.5 learner UI, S109). Frontend only. Backend (flag lms_discussions), under /lms/courses/:id:
     GET    /learn/help?page&pageSize -> {items:[{id,body,status:open|answered,lessonId,assignmentId,createdAt,reply?,answeredAt?,answeredBy?}], total,page,pageSize}  (own requests only)
     POST   /learn/help {body, lessonId? | assignmentId? (one at most, positive integer)}  (1-1000 plain text; max 3 open per course, 10 per 24 h; published course only) -> 201 {id};  DELETE /learn/help/:rid withdraws an OPEN request
     GET    /learn/office-hours -> {items:[{id,line}]}
   All text is shown as plain text. Server sentences are shown as they come. Online only. Linking (S110): optional "About" list built from GET /learn/lessons and GET /learn/assignments?pageSize=100; ?lessonId=N or ?assignmentId=N in the URL preselects it (only if it is in the list). If the lists cannot load, the form still works without a link. */

const PS = 10, BODY_MAX = 1000;
const num = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const when = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };

export default function StudentHelp() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/learn`;
  const [qsRaw] = useSearchParams(); const qsText = qsRaw.toString();
  const [topics, setTopics] = useState({ lessons: [], assignments: [] }), [about, setAbout] = useState("");
  const [state, setState] = useState("loading"), [data, setData] = useState({ items: [], total: 0 }), [lines, setLines] = useState([]);
  const [page, setPage] = useState(1), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [text, setText] = useState("");

  const load = useCallback(async () => {
    try {
      const [h, o] = await Promise.all([API.get(`${base}/help`, { params: { page, pageSize: PS } }), API.get(`${base}/office-hours`)]);
      setData(h.data); setLines(o.data.items || []); setState("ready");
    } catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load your help requests.") }); setState("error"); } }
  }, [base, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let alive = true;
    Promise.all([API.get(`${base}/lessons`), API.get(`${base}/assignments`, { params: { page: 1, pageSize: 100 } })]).then(([l, a]) => {
      if (!alive) return;
      const d = l.data || {};
      const lessons = [...(d.sections || []).flatMap((x) => x.lessons || []), ...(d.unsectioned || [])].filter((x) => num(x.id)).map((x) => ({ id: x.id, title: String(x.title || "Lesson") }));
      const assignments = ((a.data || {}).items || []).filter((x) => num(x.id)).map((x) => ({ id: x.id, title: String(x.title || "Assignment") }));
      setTopics({ lessons, assignments });
      const q = new URLSearchParams(qsText), ql = num(q.get("lessonId")), qa = num(q.get("assignmentId"));
      if (ql && lessons.some((x) => x.id === ql)) setAbout(`l:${ql}`); else if (!ql && qa && assignments.some((x) => x.id === qa)) setAbout(`a:${qa}`);
    }).catch(() => {});
    return () => { alive = false; };
  }, [base, qsText]);
  const nameOf = (r) => { const l = r.lessonId && topics.lessons.find((x) => x.id === r.lessonId), a = r.assignmentId && topics.assignments.find((x) => x.id === r.assignmentId); return l ? `Lesson: ${l.title}` : a ? `Assignment: ${a.title}` : r.lessonId ? "A lesson" : r.assignmentId ? "An assignment" : ""; };

  const send = async (e) => {
    e.preventDefault(); const t = text.trim(); if (!t || busy) return;
    setBusy(true); setMsg(null);
    try { const link = about.startsWith("l:") ? { lessonId: Number(about.slice(2)) } : about.startsWith("a:") ? { assignmentId: Number(about.slice(2)) } : {};
      await API.post(`${base}/help`, { body: t, ...link }); setText(""); setAbout(""); setMsg({ ok: true, text: "Your question was sent to the course staff." }); setPage(1); await load(); }
    catch (err) { setMsg({ ok: false, text: errText(err, "Could not send your question. Nothing was sent.") }); }
    finally { setBusy(false); }
  };
  const withdraw = async (r) => {
    if (!window.confirm("Withdraw this question? The staff will no longer see it.")) return;
    setBusy(true); setMsg(null);
    try { await API.delete(`${base}/help/${r.id}`); setMsg({ ok: true, text: "Question withdrawn." }); await load(); }
    catch (err) { setMsg({ ok: false, text: errText(err, "Could not withdraw the question.") }); await load(); }
    finally { setBusy(false); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Ask for help</h1>
      <p style={{ margin: "0 0 10px" }}><Link to={`/student/courses/${courseId}`} style={{ fontSize: 14 }}>Back to the course</Link></p>
      <Notice msg={msg} />
      {state === "ready" && lines.length > 0 && (
        <section aria-label="Office hours" style={{ ...S.box, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Office hours</h2>
          <ul aria-label="Office hour lines" style={{ margin: 0, paddingLeft: 18 }}>{lines.map((l) => <li key={l.id} style={{ wordBreak: "break-word" }}>{l.line}</li>)}</ul>
        </section>
      )}
      <section aria-label="Ask a question" style={{ ...S.box, marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Ask the course staff</h2>
        <form onSubmit={send} aria-label="Ask a question">
          {(topics.lessons.length > 0 || topics.assignments.length > 0) && (<>
            <label htmlFor="sh-about" style={S.label}>About (optional)</label>
            <select id="sh-about" value={about} onChange={(e) => setAbout(e.target.value)} style={{ ...S.input, width: "100%", marginBottom: 8 }}>
              <option value="">Nothing in particular</option>
              {topics.lessons.length > 0 && <optgroup label="Lessons">{topics.lessons.map((x) => <option key={`l${x.id}`} value={`l:${x.id}`}>{x.title}</option>)}</optgroup>}
              {topics.assignments.length > 0 && <optgroup label="Assignments">{topics.assignments.map((x) => <option key={`a${x.id}`} value={`a:${x.id}`}>{x.title}</option>)}</optgroup>}
            </select>
          </>)}
          <label htmlFor="sh-body" style={S.label}>Your question</label>
          <textarea id="sh-body" rows={4} maxLength={BODY_MAX} value={text} onChange={(e) => setText(e.target.value)} style={{ ...S.input, width: "100%" }} />
          <div style={{ fontSize: 12, color: C.muted }}>{text.length} of {BODY_MAX} characters. Plain text only. You can have 3 open questions at a time.</div>
          <button type="submit" style={{ ...S.btnPrimary, marginTop: 6 }} disabled={busy || !text.trim()}>Send question</button>
        </form>
      </section>
      <section aria-label="My questions">
        <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>My questions</h2>
        {state === "loading" && <Skeleton rows={3} />}
        {state === "error" && <p><button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button></p>}
        {state === "ready" && (data.items.length === 0 ? <p style={{ color: C.muted }}>You have not asked anything yet.</p> : (
          <ul aria-label="Questions" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {data.items.map((r) => (
              <li key={r.id} style={S.box}>
                <div style={{ fontSize: 13, color: C.muted }}>{r.status === "answered" ? "Answered" : "Waiting for an answer"} · asked {when(r.createdAt)}</div>
                {nameOf(r) && <div style={{ fontSize: 13, color: C.muted }}>{nameOf(r)}</div>}
                <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "6px 0" }}>{r.body}</p>
                {r.status === "answered" ? (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                    <div style={{ fontSize: 13, color: C.muted }}>{r.answeredBy ? `${r.answeredBy} · ` : ""}{when(r.answeredAt)}</div>
                    {r.reply ? <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "4px 0 0" }}>{r.reply}</p> : <p style={{ color: C.muted, margin: "4px 0 0" }}>The staff marked this answered without a written reply.</p>}
                  </div>
                ) : <button type="button" style={S.btn} disabled={busy} onClick={() => withdraw(r)} aria-label={`Withdraw question: ${r.body.slice(0, 40)}`}>Withdraw</button>}
              </li>
            ))}
          </ul>
        ))}
        {state === "ready" && <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={busy} />}
      </section>
    </div>
  );
}
