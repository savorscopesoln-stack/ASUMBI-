import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";
import StudentGroupCard from "./StudentGroupCard";

/* Student discussions (L8.1d, S93). Frontend only. Backend (L8.1a-c): under /lms/courses/:id/learn/discussions:
   GET forums; GET forums/:f/threads?page; POST forums/:f/threads {title, body}; GET threads/:t?page; POST threads/:t/posts {body};
   PATCH posts/:p {body} (own post, server decides `canEdit`); and POST /lms/courses/:id/learn/discussions/posts/:p/report {reason?}.
   All text is shown as plain text. Hidden items are only ever returned to their author, marked `hidden`. Online only. */

const PS = 20, TITLE_MAX = 200, BODY_MAX = 5000;
const when = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };
const who = (a) => (a && a.name) || (typeof a === "string" ? a : "Someone");

function Compose({ label, titled, busy, onSend, onCancel, initial = "" }) {
  const [title, setTitle] = useState(""), [body, setBody] = useState(initial);
  const bad = (titled && !title.trim()) || !body.trim() || body.length > BODY_MAX;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!bad && !busy) onSend({ ...(titled ? { title: title.trim() } : {}), body: body.trim() }); }} style={{ ...S.box, margin: "12px 0" }}>
      {titled && (<><label style={S.label} htmlFor="d-title">Title</label>
        <input id="d-title" style={{ ...S.input, width: "100%" }} maxLength={TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} /></>)}
      <label style={S.label} htmlFor="d-body">{label}</label>
      <textarea id="d-body" style={{ ...S.input, width: "100%", minHeight: 90 }} value={body} onChange={(e) => setBody(e.target.value)} />
      <div style={{ fontSize: 12, color: body.length > BODY_MAX ? C.bad : C.muted }}>{body.length}/{BODY_MAX}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="submit" style={S.btnPrimary} disabled={bad || busy}>{busy ? "Saving…" : "Post"}</button>
        {onCancel && <button type="button" style={S.btn} onClick={onCancel} disabled={busy}>Cancel</button>}
      </div>
    </form>
  );
}

function PostRow({ p, base, onChanged, setMsg }) {
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [reporting, setReporting] = useState(false), [reason, setReason] = useState(""), [reported, setReported] = useState(false);
  const save = async ({ body }) => {
    setBusy(true);
    try { await API.patch(`${base}/posts/${p.id}`, { body }); setEditing(false); setMsg({ ok: true, text: "Saved." }); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not save your change.") }); } finally { setBusy(false); }
  };
  const report = async () => {
    setBusy(true);
    try { await API.post(`${base}/posts/${p.id}/report`, reason.trim() ? { reason: reason.trim() } : {}); setReported(true); setReporting(false); setMsg({ ok: true, text: "Thank you. Your teacher will look at this post." }); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not send your report.") }); } finally { setBusy(false); }
  };
  return (
    <li style={{ ...S.box, listStyle: "none" }}>
      <div style={{ fontSize: 12, color: C.muted }}>{p.mine ? "You" : who(p.author)} · {when(p.createdAt)}{p.editedAt ? " · edited" : ""}{p.isOpening ? " · opening post" : ""}</div>
      {p.hidden && <p role="note" style={{ margin: "6px 0", fontSize: 13, color: C.warn }}>Hidden by a teacher. Only you can see this.</p>}
      {editing ? <Compose label="Edit your post" busy={busy} initial={p.body} onSend={save} onCancel={() => setEditing(false)} />
        : <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.body}</p>}
      {!editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {p.canEdit && <button type="button" style={S.btn} onClick={() => setEditing(true)}>Edit my post</button>}
          {!p.mine && !p.hidden && !reported && !reporting && <button type="button" style={S.btn} onClick={() => setReporting(true)}>Report post</button>}
          {reported && <span style={{ fontSize: 13, color: C.muted }}>Reported</span>}
        </div>
      )}
      {reporting && (
        <div style={{ marginTop: 8 }}>
          <label style={S.label} htmlFor={`r-${p.id}`}>Why are you reporting this? (optional)</label>
          <input id={`r-${p.id}`} style={{ ...S.input, width: "100%" }} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={report}>Send report</button>
            <button type="button" style={S.btn} disabled={busy} onClick={() => setReporting(false)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function StudentDiscussions() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/learn/discussions`;
  const [view, setView] = useState({ kind: "forums" }); // forums | threads {forumId} | thread {threadId, forumId}
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error | gone
  const [msg, setMsg] = useState(null);
  const [composing, setComposing] = useState(false), [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const url = view.kind === "forums" ? `${base}/forums` : view.kind === "threads" ? `${base}/forums/${view.forumId}/threads` : `${base}/threads/${view.threadId}`;
    try {
      const r = await API.get(url, { params: view.kind === "forums" ? undefined : { page, pageSize: view.kind === "threads" ? PS : 30 } });
      setData(r.data); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else if (e?.response?.status === 404) setState("gone");
      else { setMsg({ ok: false, text: errText(e, "Could not load discussions.") }); setState("error"); }
    }
  }, [base, view, page]);
  // load() sets state only after the await (same pattern as StudentAnnouncements)
  useEffect(() => { load(); }, [load]);

  const go = (v) => { setView(v); setPage(1); setData(null); setState("loading"); setComposing(false); setMsg(null); };
  const send = async (url, payload, after) => {
    setBusy(true);
    try { const r = await API.post(url, payload); setComposing(false); setMsg({ ok: true, text: "Posted." }); await after(r.data); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not post. Please try again.") }); } finally { setBusy(false); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const back = <p style={{ margin: "0 0 6px", fontSize: 14, display: "flex", gap: 16, flexWrap: "wrap" }}><Link to={`/student/courses/${courseId}/learn`}>← Back to the course</Link>
    {view.kind !== "forums" && <button type="button" style={{ ...S.btn, minHeight: 32 }} onClick={() => go(view.kind === "thread" ? { kind: "threads", forumId: view.forumId } : { kind: "forums" })}>{view.kind === "thread" ? "Back to threads" : "All forums"}</button>}</p>;
  if (state === "gone") return <div style={S.page}>{back}<p>This discussion is not available to you.</p></div>;

  const body = state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); load(); }}>Try again</button>
    : view.kind === "forums" ? (
      <>
      <StudentGroupCard courseId={courseId} />
      {(data.items || []).length === 0 ? <p style={{ color: C.muted }}>No forums yet.</p> :
      <ul aria-label="Forums" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0 }}>
        {data.items.map((f) => (
          <li key={f.id} style={{ ...S.box, listStyle: "none" }}>
            <button type="button" style={{ ...S.btn, fontWeight: 600 }} onClick={() => go({ kind: "threads", forumId: f.id })}>{f.title}</button>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{f.threadCount} thread{f.threadCount === 1 ? "" : "s"}{f.locked ? " · Locked (read only)" : ""}</div>
            {f.description && <p style={{ margin: "6px 0 0", fontSize: 14 }}>{f.description}</p>}
          </li>))}
      </ul>}
      </>
    ) : view.kind === "threads" ? (
      <>
        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{data.forum.title}</h2>
        {data.forum.locked ? <p style={{ color: C.muted }}>This forum is locked. You can read but not post.</p>
          : !composing && <button type="button" style={S.btnPrimary} onClick={() => setComposing(true)}>Start a thread</button>}
        {composing && <Compose titled label="Your message" busy={busy} onCancel={() => setComposing(false)}
          onSend={(p) => send(`${base}/forums/${view.forumId}/threads`, p, (d) => go({ kind: "thread", forumId: view.forumId, threadId: d.threadId }))} />}
        {(data.items || []).length === 0 ? <p style={{ color: C.muted }}>No threads yet. Be the first to start one.</p> :
          <ul aria-label="Threads" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: "12px 0 0" }}>
            {data.items.map((t) => (
              <li key={t.id} style={{ ...S.box, listStyle: "none" }}>
                <div style={{ fontSize: 12, color: C.muted }}>{t.pinned ? "Pinned · " : ""}{t.locked ? "Locked · " : ""}{t.hidden ? "Hidden (only you can see it) · " : ""}{who(t.author)}</div>
                <button type="button" style={{ ...S.btn, fontWeight: 600, margin: "4px 0" }} onClick={() => go({ kind: "thread", forumId: view.forumId, threadId: t.id })}>{t.title}</button>
                <div style={{ fontSize: 12, color: C.muted }}>{t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"} · last activity {when(t.lastPostAt)}</div>
              </li>))}
          </ul>}
        <Pager page={page} pageSize={data.pageSize || PS} total={data.total} onPage={(n) => { setPage(n); setState("loading"); }} busy={false} />
      </>
    ) : (
      <>
        <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{data.thread.title}</h2>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{data.thread.forumTitle}{data.thread.pinned ? " · Pinned" : ""}{data.thread.locked ? " · Locked" : ""}</div>
        <ul aria-label="Posts" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0 }}>
          {data.posts.map((p) => <PostRow key={p.id} p={p} base={base} onChanged={load} setMsg={setMsg} />)}
        </ul>
        <Pager page={page} pageSize={data.pageSize || 30} total={data.total} onPage={(n) => { setPage(n); setState("loading"); }} busy={false} />
        {data.canReply ? <Compose label="Your reply" busy={busy}
          onSend={(p) => send(`${base}/threads/${view.threadId}/posts`, p, async () => { setPage(Math.max(1, Math.ceil((data.total + 1) / (data.pageSize || 30)))); setState("loading"); await load(); })} />
          : <p style={{ color: C.muted, marginTop: 12 }}>You cannot reply to this thread.</p>}
      </>
    );

  return (
    <div style={S.page}>
      {back}
      <h1 style={S.h1}>Discussions</h1>
      <p style={S.sub}>Ask questions and talk with your classmates. Please be kind. Teachers can see everything.</p>
      <Notice msg={msg} />
      {body}
    </div>
  );
}
