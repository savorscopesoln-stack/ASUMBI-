import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher Announcements /teacher/courses/:courseId/announcements (L4.4 authoring UI, S86). Frontend only. Backend (flag lms):
     GET    /lms/courses/:id/announcements?page&pageSize -> { items:[{id,title,body,status,pinned,publishedAt,createdAt}], total, page, pageSize }
     POST   /lms/courses/:id/announcements {title, body, pinned?, status?}   (lms.course.manage) -> 201 { announcement }
     PATCH  /lms/courses/:id/announcements/:aid {title?, body?, pinned?, status?}   DELETE .../:aid
   Title 1-200, body 1-4000 plain text (shown as text, line breaks kept). Draft = staff only; Publish makes it visible to enrolled learners. Every server sentence is shown as it comes. NOT here: school-wide announcements (admin), notifications. */

const PAGE_SIZE = 20;
const day = (v) => (v ? String(v).slice(0, 10) : "");
const EMPTY = { title: "", body: "", pinned: false };

export default function CourseAnnouncements() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/announcements`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    try { const r = await API.get(base, { params: { page, pageSize: PAGE_SIZE } }); setData(r.data); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load the announcements.") }); setState("error"); } }
  }, [base, page]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, fail, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); await load(); return true; }
    catch (e) { setMsg({ ok: false, text: errText(e, fail) }); return false; }
    finally { setBusy(false); }
  };
  const save = async (status) => {
    const title = form.title.trim(), body = form.body.trim();
    if (!title || !body) { setMsg({ ok: false, text: "Write a title and a message first." }); return; }
    if (status === "published" && !window.confirm("Publish this announcement? Enrolled learners will be able to read it.")) return;
    const payload = editId ? { title, body, pinned: form.pinned } : { title, body, pinned: form.pinned, status };
    if (editId && status) payload.status = status;
    const done = editId ? (status === "published" ? "Announcement published." : "Changes saved.") : (status === "published" ? "Announcement published." : "Draft saved.");
    const ok = await act(() => (editId ? API.patch(`${base}/${editId}`, payload) : API.post(base, payload)), "Could not save the announcement. Nothing was changed.", done);
    if (ok) { setForm(EMPTY); setEditId(null); }
  };
  const edit = (a) => { setMsg(null); setEditId(a.id); setForm({ title: a.title, body: a.body, pinned: !!a.pinned }); };
  const remove = (a) => { if (window.confirm(`Delete "${a.title}"? Learners will no longer see it.`)) act(() => API.delete(`${base}/${a.id}`), "Could not delete the announcement.", "Announcement deleted."); };
  const editing = data.items.find((a) => a.id === editId);

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Announcements</h1>
      <p style={{ margin: "0 0 10px" }}><Link to="/teacher/courses" style={{ fontSize: 14 }}>Back to courses</Link></p>
      <Notice msg={msg} />
      <section aria-label="Write an announcement" style={S.box}>
        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{editId ? "Edit announcement" : "New announcement"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560 }}>
          <label>Title <input aria-label="Title" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} /></label>
          <label>Message <textarea aria-label="Message" rows={5} maxLength={4000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ width: "100%" }} /></label>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{form.body.length} of 4000 characters. Plain text only.</p>
          <label><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Pin to the top</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(!editId || (editing && editing.status === "draft")) && <button type="button" style={S.btn} disabled={busy} onClick={() => save("draft")}>{editId ? "Save draft" : "Save as draft"}</button>}
            {editId && editing && editing.status === "published" && <button type="button" style={S.btn} disabled={busy} onClick={() => save(null)}>Save changes</button>}
            {(!editId || (editing && editing.status === "draft")) && <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => save("published")}>Publish</button>}
            {editId && <button type="button" style={S.btn} onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</button>}
          </div>
        </div>
      </section>
      <h2 style={{ fontSize: 18, margin: "18px 0 6px" }}>This course's announcements</h2>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button>
      ) : data.items.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No announcements yet. Write one above.</p> : (
        <>
          <ul aria-label="Announcements" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {data.items.map((a) => (
              <li key={a.id} style={{ ...S.box, margin: 0 }}>
                <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>{a.title}</p>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: C.muted }}>{a.status === "published" ? `Published ${day(a.publishedAt)}` : "Draft, learners cannot see it"}{a.pinned ? " · Pinned" : ""}</p>
                <p style={{ margin: "0 0 6px", fontSize: 14, whiteSpace: "pre-wrap" }}>{a.body}</p>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Edit ${a.title}`} onClick={() => edit(a)}>Edit</button>
                  <button type="button" style={S.btn} disabled={busy} aria-label={`${a.pinned ? "Unpin" : "Pin"} ${a.title}`} onClick={() => act(() => API.patch(`${base}/${a.id}`, { pinned: !a.pinned }), "Could not change the pin.", a.pinned ? "Unpinned." : "Pinned.")}>{a.pinned ? "Unpin" : "Pin"}</button>
                  {a.status === "published"
                    ? <button type="button" style={S.btn} disabled={busy} aria-label={`Unpublish ${a.title}`} onClick={() => act(() => API.patch(`${base}/${a.id}`, { status: "draft" }), "Could not unpublish the announcement.", "Announcement unpublished.")}>Unpublish</button>
                    : <button type="button" style={S.btn} disabled={busy} aria-label={`Publish ${a.title}`} onClick={() => { if (window.confirm("Publish this announcement? Enrolled learners will be able to read it.")) act(() => API.patch(`${base}/${a.id}`, { status: "published" }), "Could not publish the announcement.", "Announcement published."); }}>Publish</button>}
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Delete ${a.title}`} onClick={() => remove(a)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
          <Pager page={page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}
