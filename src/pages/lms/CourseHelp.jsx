import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher Help requests + office hours /teacher/courses/:courseId/help (L8.5 staff UI, S108). Frontend only. Backend (flag lms_discussions), under /lms/courses/:id:
     GET  /help?status=open|answered|all&page&pageSize -> {items:[{id,body,status,lessonId,assignmentId,createdAt,learner,reply?,answeredAt?,answeredBy?}], total,page,pageSize}  (default open)
     PUT  /help/:rid/reply {reply?}  (lms.course.manage) -> answers ONCE; no reply = "mark answered"; 2nd answer = 409 ALREADY_ANSWERED; reply <= 2000
     GET  /office-hours -> {items:[{id,line}]}; POST {line} (1-200, at most 10) -> 201 {item}; DELETE /office-hours/:lid     (write = lms.course.manage)
   Learner text is plain text and is shown as text. Staff see the learner's name only. Server sentences are shown as they come. NOT here: the learner side (ask, withdraw). */

const PS = 20, REPLY_MAX = 2000, LINE_MAX = 200, MAX_LINES = 10;
const when = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };

export default function CourseHelp() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}`;
  const [state, setState] = useState("loading"), [data, setData] = useState({ items: [], total: 0 }), [lines, setLines] = useState([]);
  const [status, setStatus] = useState("open"), [page, setPage] = useState(1), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState({}), [line, setLine] = useState("");

  const load = useCallback(async () => {
    try {
      const [h, o] = await Promise.all([API.get(`${base}/help`, { params: { status, page, pageSize: PS } }), API.get(`${base}/office-hours`)]);
      setData(h.data); setLines(o.data.items || []); setState("ready");
    } catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load help requests.") }); setState("error"); } }
  }, [base, status, page]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, fail, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); await load(); return true; }
    catch (e) { setMsg({ ok: false, text: errText(e, fail) }); if (e && e.response && e.response.status === 409) await load(); return false; }
    finally { setBusy(false); }
  };
  const draft = (id) => drafts[id] || "";
  const answer = async (r, withText) => {
    const text = draft(r.id).trim();
    if (withText && !text) { setMsg({ ok: false, text: "Write a reply first." }); return; }
    if (!withText && !window.confirm("Mark this answered without a reply? The learner will not get any text.")) return;
    const ok = await act(() => API.put(`${base}/help/${r.id}/reply`, withText ? { reply: text } : {}), "Could not save the answer. Nothing was changed.", "Marked answered.");
    if (ok) setDrafts((d) => { const n = { ...d }; delete n[r.id]; return n; });
  };
  const addLine = async (e) => {
    e.preventDefault(); const t = line.trim(); if (!t || busy) return;
    if (await act(() => API.post(`${base}/office-hours`, { line: t }), "Could not add the line.", "Office hours line added.")) setLine("");
  };
  const removeLine = (l) => { if (window.confirm(`Remove "${l.line}"?`)) act(() => API.delete(`${base}/office-hours/${l.id}`), "Could not remove the line.", "Line removed."); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Help requests and office hours</h1>
      <p style={{ margin: "0 0 10px" }}><Link to="/teacher/courses" style={{ fontSize: 14 }}>Back to courses</Link></p>
      <Notice msg={msg} />
      <section aria-label="Office hours" style={{ ...S.box, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Office hours</h2>
        {state === "ready" && (lines.length === 0 ? <p style={{ color: C.muted, margin: "0 0 8px" }}>No office hours shown to learners yet.</p> : (
          <ul aria-label="Office hour lines" style={{ listStyle: "none", padding: 0, margin: "0 0 8px" }}>
            {lines.map((l) => <li key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}><span style={{ flex: 1, wordBreak: "break-word" }}>{l.line}</span><button type="button" style={S.btn} disabled={busy} onClick={() => removeLine(l)} aria-label={`Remove ${l.line}`}>Remove</button></li>)}
          </ul>
        ))}
        <form onSubmit={addLine} aria-label="Add office hours line" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input aria-label="Office hours line" maxLength={LINE_MAX} value={line} onChange={(e) => setLine(e.target.value)} disabled={lines.length >= MAX_LINES} placeholder="For example: Tuesday 2:00 pm, staff room" style={{ ...S.input, flex: 1, minWidth: 200 }} />
          <button type="submit" style={S.btnPrimary} disabled={busy || !line.trim() || lines.length >= MAX_LINES}>Add line</button>
        </form>
        {lines.length >= MAX_LINES && <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0" }}>Limit of {MAX_LINES} lines reached. Remove one to add another.</p>}
      </section>
      <section aria-label="Help requests">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <label htmlFor="hp-st">Show</label>
          <select id="hp-st" style={S.input} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="open">Open</option><option value="answered">Answered</option><option value="all">All</option></select>
        </div>
        {state === "loading" && <Skeleton rows={3} />}
        {state === "error" && <p><button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button></p>}
        {state === "ready" && (data.items.length === 0 ? <p style={{ color: C.muted }}>No {status === "all" ? "" : status + " "}help requests.</p> : (
          <ul aria-label="Requests" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {data.items.map((r) => (
              <li key={r.id} style={S.box}>
                <div style={{ fontSize: 13, color: C.muted }}>{r.learner || "Learner"} · {when(r.createdAt)}{r.lessonId ? " · about a lesson" : ""}{r.assignmentId ? " · about an assignment" : ""}</div>
                <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "6px 0" }}>{r.body}</p>
                {r.status === "answered" ? (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                    <div style={{ fontSize: 13, color: C.muted }}>Answered{r.answeredBy ? ` by ${r.answeredBy}` : ""} · {when(r.answeredAt)}</div>
                    {r.reply ? <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "4px 0 0" }}>{r.reply}</p> : <p style={{ color: C.muted, margin: "4px 0 0" }}>Marked answered without a reply.</p>}
                  </div>
                ) : (
                  <div>
                    <label htmlFor={`hp-r${r.id}`} style={S.label}>Reply to {r.learner || "learner"}</label>
                    <textarea id={`hp-r${r.id}`} rows={3} maxLength={REPLY_MAX} value={draft(r.id)} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} style={{ ...S.input, width: "100%" }} />
                    <div style={{ fontSize: 12, color: C.muted }}>{draft(r.id).length} of {REPLY_MAX} characters. A request can be answered once.</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button type="button" style={S.btnPrimary} disabled={busy || !draft(r.id).trim()} onClick={() => answer(r, true)} aria-label={`Send reply to ${r.learner || "learner"}`}>Send reply</button>
                      <button type="button" style={S.btn} disabled={busy} onClick={() => answer(r, false)} aria-label={`Mark answered without reply for ${r.learner || "learner"}`}>Mark answered</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}
        {state === "ready" && <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={busy} />}
      </section>
    </div>
  );
}
