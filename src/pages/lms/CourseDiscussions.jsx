import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton, Tabs } from "./lmsUi";

/* Teacher discussions (L8.1e, S94). Frontend only (plus one additive field `openReportId` on the reports list).
   Backend (L8.1a/b), all under /lms/courses/:id/discussions: GET/POST forums, PATCH/DELETE forums/:f, GET/POST forums/:f/threads, GET threads/:t, POST threads/:t/posts,
   PUT threads/:t/moderation {pinned|locked|hidden, reason?}, PUT posts/:p/moderation {hidden, reason?}, GET reports?status&page, POST reports/:r/resolve {action: dismiss|hide}.
   Staff write actions need `lms.course.manage`; a 403 is shown as the server's message. All text is plain text. Hide / remove / hide-from-report ask for confirmation. Online only. */

const PS = 20;
const when = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };
const who = (a) => (a && a.name) || "Someone";
const ask = (text) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(text) : true);

export default function CourseDiscussions() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/discussions`;
  const [tab, setTab] = useState("forums");
  const [view, setView] = useState({ kind: "forums" }); // forums | threads {forumId} | thread {threadId, forumId}
  const [rstatus, setRstatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error | gone
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [nf, setNf] = useState({ title: "", description: "", staffOnly: false }), [showNf, setShowNf] = useState(false), [reply, setReply] = useState("");

  const url = tab === "reports" ? `${base}/reports` : view.kind === "forums" ? `${base}/forums` : view.kind === "threads" ? `${base}/forums/${view.forumId}/threads` : `${base}/threads/${view.threadId}`;
  const params = tab === "reports" ? { status: rstatus, page, pageSize: PS } : view.kind === "forums" ? undefined : { page, pageSize: view.kind === "threads" ? PS : 30 };
  const load = useCallback(async () => {
    try { const r = await API.get(url, { params }); setData(r.data); setState("ready"); }
    catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else if (e?.response?.status === 404) setState("gone");
      else { setMsg({ ok: false, text: errText(e, "Could not load discussions.") }); setState("error"); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, rstatus]);
  // load() sets state only after the await (same pattern as the other LMS screens)
  useEffect(() => { load(); }, [load]);

  const go = (t, v) => { setTab(t); setView(v || { kind: "forums" }); setPage(1); setData(null); setState("loading"); setMsg(null); setShowNf(false); setReply(""); };
  const act = async (fn, okText, reload = true) => {
    setBusy(true);
    try { await fn(); setMsg({ ok: true, text: okText }); if (reload) await load(); return true; }
    catch (e) { setMsg({ ok: false, text: errText(e, "That did not work. Please try again.") }); return false; } finally { setBusy(false); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const nav = (
    <p style={{ margin: "0 0 6px", fontSize: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link to="/teacher/courses">← My courses</Link>
      {tab === "forums" && view.kind !== "forums" && <button type="button" style={{ ...S.btn, minHeight: 32 }} onClick={() => go("forums", view.kind === "thread" ? { kind: "threads", forumId: view.forumId } : { kind: "forums" })}>{view.kind === "thread" ? "Back to threads" : "All forums"}</button>}
    </p>);
  if (state === "gone") return <div style={S.page}>{nav}<p>This forum, thread or course is not available.</p></div>;

  const forums = () => (
    <>
      {!showNf ? <button type="button" style={S.btnPrimary} onClick={() => setShowNf(true)}>New forum</button> : (
        <form style={{ ...S.box, margin: "0 0 12px" }} onSubmit={async (e) => { e.preventDefault(); const t = nf.title.trim(); if (!t) return; const ok = await act(() => API.post(`${base}/forums`, { title: t, ...(nf.description.trim() ? { description: nf.description.trim() } : {}), ...(nf.staffOnly ? { staffOnly: true } : {}) }), "Forum created."); if (ok) { setShowNf(false); setNf({ title: "", description: "", staffOnly: false }); } }}>
          <label style={S.label} htmlFor="nf-t">Forum name</label><input id="nf-t" style={{ ...S.input, width: "100%" }} maxLength={100} value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} />
          <label style={S.label} htmlFor="nf-d">Description (optional)</label><input id="nf-d" style={{ ...S.input, width: "100%" }} maxLength={300} value={nf.description} onChange={(e) => setNf({ ...nf, description: e.target.value })} />
          <label style={{ ...S.label, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={nf.staffOnly} onChange={(e) => setNf({ ...nf, staffOnly: e.target.checked })} />Staff only (learners cannot see it)</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button type="submit" style={S.btnPrimary} disabled={busy || !nf.title.trim()}>Create forum</button><button type="button" style={S.btn} onClick={() => setShowNf(false)}>Cancel</button></div>
        </form>)}
      {(data.items || []).length === 0 ? <p style={{ color: C.muted }}>No forums yet.</p> :
        <ul aria-label="Forums" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: "12px 0 0" }}>
          {data.items.map((f) => (
            <li key={f.id} style={{ ...S.box, listStyle: "none" }}>
              <button type="button" style={{ ...S.btn, fontWeight: 600 }} onClick={() => go("forums", { kind: "threads", forumId: f.id })}>{f.title}</button>
              <div style={{ fontSize: 12, color: C.muted, margin: "4px 0" }}>{f.threadCount} thread{f.threadCount === 1 ? "" : "s"}{f.isDefault ? " · Default" : ""}{f.staffOnly ? " · Staff only" : ""}{f.groupId ? " · Group forum" : ""}{f.locked ? " · Locked" : ""}</div>
              {f.description && <p style={{ margin: "0 0 6px", fontSize: 14 }}>{f.description}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={S.btn} disabled={busy} aria-label={`${f.locked ? "Unlock" : "Lock"} ${f.title}`} onClick={() => act(() => API.patch(`${base}/forums/${f.id}`, { locked: !f.locked }), f.locked ? "Forum unlocked." : "Forum locked.")}>{f.locked ? "Unlock" : "Lock"}</button>
                {!f.isDefault && !f.groupId && <button type="button" style={S.btn} disabled={busy} aria-label={`${f.staffOnly ? "Open to learners" : "Make staff only"} ${f.title}`} onClick={() => act(() => API.patch(`${base}/forums/${f.id}`, { staffOnly: !f.staffOnly }), "Saved.")}>{f.staffOnly ? "Open to learners" : "Make staff only"}</button>}
                {!f.isDefault && <button type="button" style={S.btn} disabled={busy} aria-label={`Remove ${f.title}`} onClick={() => { if (ask(`Remove the forum "${f.title}"? Learners will no longer see it.`)) act(() => API.delete(`${base}/forums/${f.id}`), "Forum removed."); }}>Remove</button>}
              </div>
            </li>))}
        </ul>}
    </>);

  const threads = () => (
    <>
      <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{data.forum.title}{data.forum.locked ? " (locked)" : ""}</h2>
      {(data.items || []).length === 0 ? <p style={{ color: C.muted }}>No threads yet.</p> :
        <ul aria-label="Threads" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0 }}>
          {data.items.map((t) => (
            <li key={t.id} style={{ ...S.box, listStyle: "none" }}>
              <div style={{ fontSize: 12, color: C.muted }}>{t.pinned ? "Pinned · " : ""}{t.locked ? "Locked · " : ""}{t.hidden ? "Hidden · " : ""}{who(t.author)}{t.reportCount ? ` · ${t.reportCount} open report${t.reportCount === 1 ? "" : "s"}` : ""}</div>
              <button type="button" style={{ ...S.btn, fontWeight: 600, margin: "4px 0" }} onClick={() => go("forums", { kind: "thread", forumId: view.forumId, threadId: t.id })}>{t.title}</button>
              <div style={{ fontSize: 12, color: C.muted }}>{t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"} · last activity {when(t.lastPostAt)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button type="button" style={S.btn} disabled={busy} aria-label={`${t.pinned ? "Unpin" : "Pin"} ${t.title}`} onClick={() => act(() => API.put(`${base}/threads/${t.id}/moderation`, { pinned: !t.pinned }), t.pinned ? "Thread unpinned." : "Thread pinned.")}>{t.pinned ? "Unpin" : "Pin"}</button>
                <button type="button" style={S.btn} disabled={busy} aria-label={`${t.locked ? "Unlock" : "Lock"} thread ${t.title}`} onClick={() => act(() => API.put(`${base}/threads/${t.id}/moderation`, { locked: !t.locked }), t.locked ? "Thread unlocked." : "Thread locked.")}>{t.locked ? "Unlock" : "Lock"}</button>
                <button type="button" style={S.btn} disabled={busy} aria-label={`${t.hidden ? "Unhide" : "Hide"} thread ${t.title}`} onClick={() => { if (t.hidden) act(() => API.put(`${base}/threads/${t.id}/moderation`, { hidden: false }), "Thread is visible again."); else if (ask(`Hide the thread "${t.title}" from learners?`)) act(() => API.put(`${base}/threads/${t.id}/moderation`, { hidden: true }), "Thread hidden."); }}>{t.hidden ? "Unhide" : "Hide"}</button>
              </div>
            </li>))}
        </ul>}
      <Pager page={page} pageSize={data.pageSize || PS} total={data.total} onPage={(n) => { setPage(n); setState("loading"); }} busy={false} />
    </>);

  const thread = () => (
    <>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{data.thread.title}</h2>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{data.thread.forumTitle}{data.thread.pinned ? " · Pinned" : ""}{data.thread.locked ? " · Locked" : ""}{data.thread.hidden ? ` · Hidden${data.thread.hiddenReason ? `: ${data.thread.hiddenReason}` : ""}` : ""}</div>
      <ul aria-label="Posts" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0 }}>
        {data.posts.map((p) => (
          <li key={p.id} style={{ ...S.box, listStyle: "none" }}>
            <div style={{ fontSize: 12, color: C.muted }}>{who(p.author)}{p.author && p.author.isStaff ? " (staff)" : ""} · {when(p.createdAt)}{p.isOpening ? " · opening post" : ""}{p.reportCount ? ` · ${p.reportCount} open report${p.reportCount === 1 ? "" : "s"}` : ""}</div>
            {p.hidden && <p role="note" style={{ margin: "6px 0", fontSize: 13, color: C.warn }}>Hidden from learners{p.hiddenReason ? `: ${p.hiddenReason}` : ""}.</p>}
            <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.body}</p>
            {!p.isOpening && <div style={{ marginTop: 8 }}>
              <button type="button" style={S.btn} disabled={busy} aria-label={`${p.hidden ? "Unhide" : "Hide"} post by ${who(p.author)}`} onClick={() => { if (p.hidden) act(() => API.put(`${base}/posts/${p.id}/moderation`, { hidden: false }), "Post is visible again."); else if (ask("Hide this post from learners?")) act(() => API.put(`${base}/posts/${p.id}/moderation`, { hidden: true }), "Post hidden."); }}>{p.hidden ? "Unhide" : "Hide"}</button>
            </div>}
          </li>))}
      </ul>
      <Pager page={page} pageSize={data.pageSize || 30} total={data.total} onPage={(n) => { setPage(n); setState("loading"); }} busy={false} />
      {data.canReply && (
        <form style={{ ...S.box, margin: "12px 0" }} onSubmit={async (e) => { e.preventDefault(); const b = reply.trim(); if (!b) return; if (await act(() => API.post(`${base}/threads/${view.threadId}/posts`, { body: b }), "Posted.")) setReply(""); }}>
          <label style={S.label} htmlFor="sr-body">Your reply</label>
          <textarea id="sr-body" style={{ ...S.input, width: "100%", minHeight: 80 }} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} />
          <button type="submit" style={{ ...S.btnPrimary, marginTop: 8 }} disabled={busy || !reply.trim()}>Post reply</button>
        </form>)}
    </>);

  const reports = () => (
    <>
      <label style={S.label} htmlFor="rs">Show</label>
      <select id="rs" style={S.input} value={rstatus} onChange={(e) => { setRstatus(e.target.value); setPage(1); setState("loading"); }}>
        <option value="open">Open reports</option><option value="resolved">Resolved</option><option value="all">All</option>
      </select>
      {(data.items || []).length === 0 ? <p style={{ color: C.muted }}>{rstatus === "open" ? "No open reports. Nothing to review." : "No reports here."}</p> :
        <ul aria-label="Reports" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: "12px 0 0" }}>
          {data.items.map((r) => (
            <li key={r.postId} style={{ ...S.box, listStyle: "none" }}>
              <div style={{ fontSize: 12, color: C.muted }}>{r.threadTitle} · {r.isOpening ? "opening post" : "reply"} by {who(r.author)} · {r.openCount} open of {r.reportCount} report{r.reportCount === 1 ? "" : "s"} · last {when(r.lastReportedAt)}{r.hidden ? " · Hidden" : ""}</div>
              <p style={{ margin: "6px 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{r.excerpt}</p>
              {r.reasons && r.reasons.length > 0 && <ul aria-label="Reasons given" style={{ margin: "0 0 6px", paddingLeft: 18, fontSize: 13, color: C.muted }}>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              {r.openCount > 0 && r.openReportId != null && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Dismiss reports on post by ${who(r.author)}`} onClick={() => act(() => API.post(`${base}/reports/${r.openReportId}/resolve`, { action: "dismiss" }), "Reports dismissed.")}>Dismiss reports</button>
                  <button type="button" style={S.btnPrimary} disabled={busy} aria-label={`Hide post by ${who(r.author)} and close reports`} onClick={() => { if (ask(r.isOpening ? "Hide this whole thread from learners and close the reports?" : "Hide this post from learners and close the reports?")) act(() => API.post(`${base}/reports/${r.openReportId}/resolve`, { action: "hide" }), "Hidden, reports closed."); }}>{r.isOpening ? "Hide thread" : "Hide post"}</button>
                </div>)}
              <div style={{ marginTop: 6 }}><button type="button" style={{ ...S.btn, minHeight: 32 }} onClick={() => go("forums", { kind: "thread", forumId: r.forumId, threadId: r.threadId })}>Open thread</button></div>
            </li>))}
        </ul>}
      <Pager page={page} pageSize={data.pageSize || PS} total={data.total} onPage={(n) => { setPage(n); setState("loading"); }} busy={false} />
    </>);

  const body = state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); load(); }}>Try again</button>
    : tab === "reports" ? reports() : view.kind === "forums" ? forums() : view.kind === "threads" ? threads() : thread();

  return (
    <div style={S.page}>
      {nav}
      <h1 style={S.h1}>Discussions</h1>
      <p style={S.sub}>Manage forums, moderate threads and posts, and review reports from learners.</p>
      <Tabs tabs={[["forums", "Forums"], ["reports", "Reports"]]} value={tab} onChange={(t) => go(t)} />
      <Notice msg={msg} />
      {body}
    </div>
  );
}
