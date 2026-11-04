import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useCourseLabel, useDebounced } from "./lmsUtil";
import { Notice, Pager, Skeleton, StatusBadge, Tabs } from "./lmsUi";

/* Staff side of the LMS (L2.6): "My courses", create (optionally from a template), publish / archive,
   submit for approval, and (for reviewers) the approval queue.
   Backend: GET/POST /lms/courses, PATCH/DELETE /lms/courses/:id, POST /lms/courses/from-template,
   GET /lms/course-templates, POST /lms/courses/:id/{submit,withdraw-submission,approve,return},
   GET /lms/course-approvals, GET /lms/me/permissions.
   The server enforces every rule; buttons here only offer what the course's current status allows.
   The school's "approval required" setting is not exposed to teachers, so a Publish that the server
   answers with APPROVAL_REQUIRED switches that course to "Submit for approval". */

const PAGE_SIZE = 10;

/* Declared at module level so the button keeps focus when the list re-renders. */
function B({ onClick, children, primary, disabled }) {
  return <button type="button" style={primary ? S.btnPrimary : S.btn} disabled={disabled} onClick={onClick}>{children}</button>;
}
const thisYear = new Date().getFullYear();

function CreateForm({ label, canTemplate, onCreated, onCancel }) {
  const [f, setF] = useState({ code: "", title: "", academicYear: String(thisYear), className: "", visibility: "enrolled_only", templateId: "" });
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!canTemplate) return undefined;
    let alive = true;
    API.get("/lms/course-templates", { params: { pageSize: 50 } }).then((r) => { if (alive) setTemplates(r.data.items || []); }).catch(() => {});
    return () => { alive = false; };
  }, [canTemplate]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    const body = { code: f.code, title: f.title, academicYear: Number(f.academicYear), visibility: f.visibility };
    if (f.className.trim()) body.className = f.className.trim();
    try {
      if (f.templateId) await API.post("/lms/courses/from-template", { ...body, templateId: Number(f.templateId) });
      else await API.post("/lms/courses", body);
      onCreated();
    } catch (ex) { setErr(errText(ex)); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ ...S.box, marginBottom: 16 }} aria-label={`New ${label.one.toLowerCase()}`}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>New {label.one.toLowerCase()}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div><label style={S.label} htmlFor="c-code">Code</label><input id="c-code" required maxLength={30} value={f.code} onChange={set("code")} placeholder="e.g. BIO101" style={{ ...S.input, width: "100%" }} /></div>
        <div><label style={S.label} htmlFor="c-title">Title</label><input id="c-title" required minLength={3} maxLength={200} value={f.title} onChange={set("title")} style={{ ...S.input, width: "100%" }} /></div>
        <div><label style={S.label} htmlFor="c-year">Academic year</label><input id="c-year" required type="number" min={2000} max={2100} value={f.academicYear} onChange={set("academicYear")} style={{ ...S.input, width: "100%" }} /></div>
        <div><label style={S.label} htmlFor="c-class">Class (optional)</label><input id="c-class" maxLength={100} value={f.className} onChange={set("className")} placeholder="e.g. Form 3 North" style={{ ...S.input, width: "100%" }} /></div>
        <div>
          <label style={S.label} htmlFor="c-vis">Who can find it</label>
          <select id="c-vis" value={f.visibility} onChange={set("visibility")} style={{ ...S.input, width: "100%" }}>
            <option value="enrolled_only">Only people I enrol</option>
            <option value="listed">Listed: students can browse and join</option>
          </select>
        </div>
        {templates.length > 0 && (
          <div>
            <label style={S.label} htmlFor="c-tpl">Start from a template</label>
            <select id="c-tpl" value={f.templateId} onChange={set("templateId")} style={{ ...S.input, width: "100%" }}>
              <option value="">Blank</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.shared ? " (school)" : ""}</option>)}
            </select>
          </div>
        )}
      </div>
      {err && <p role="alert" style={{ color: C.bad, fontSize: 14, margin: "10px 0 0" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? "Saving…" : "Create draft"}</button>
        <button type="button" style={S.btn} onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

function MyCourses({ label, perms, setMsg }) {
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [state, setState] = useState("loading");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(() => new Set()); // course ids the server said must go through approval
  useEffect(() => { setPage(1); }, [dq, status]);

  const load = useCallback(async () => {
    setState((s) => (s === "ready" ? s : "loading"));
    try {
      const r = await API.get("/lms/courses", { params: { q: dq || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } });
      setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE }); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, `Could not load ${label.many.toLowerCase()}.`) }); setState("error"); }
    }
  }, [dq, status, page, label.many, setMsg]);
  useEffect(() => { load(); }, [load]);

  const run = async (c, fn, okText) => {
    setBusyId(c.id); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); await load(); }
    catch (e) {
      if (e?.response?.data?.code === "APPROVAL_REQUIRED") {
        setNeedsApproval((s) => new Set(s).add(c.id));
        setMsg({ ok: false, text: "Your school needs this to be approved first. Use “Submit for approval”." });
      } else setMsg({ ok: false, text: errText(e) });
    } finally { setBusyId(null); }
  };
  const setStatusTo = (c, to, okText) => run(c, () => API.patch(`/lms/courses/${c.id}`, { status: to }), okText);
  const post = (c, path, okText) => run(c, () => API.post(`/lms/courses/${c.id}/${path}`), okText);

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label htmlFor="lms-t-q" style={{ ...S.label, margin: "0 0 4px" }}>Search</label>
          <input id="lms-t-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} placeholder="Title or code" style={{ ...S.input, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="lms-t-st" style={{ ...S.label, margin: "0 0 4px" }}>Status</label>
          <select id="lms-t-st" value={status} onChange={(e) => setStatus(e.target.value)} style={S.input}>
            <option value="">All</option><option value="draft">Draft</option><option value="pending">Waiting for approval</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
        </div>
        {perms.has("lms.course.create") && !creating && <button type="button" style={S.btnPrimary} onClick={() => setCreating(true)}>New {label.one.toLowerCase()}</button>}
      </div>
      {creating && <CreateForm label={label} canTemplate={perms.has("lms.course.create")} onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); setMsg({ ok: true, text: "Draft created." }); load(); }} />}
      {state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={load}>Try again</button> : data.items.length === 0 ? (
        <p style={{ color: C.muted }}>{dq || status ? "Nothing matches." : `You have no ${label.many.toLowerCase()} yet.`}</p>
      ) : (
        <ul style={{ padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {data.items.map((c) => (
            <li key={c.id} style={{ ...S.box, listStyle: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted }}>{c.code} · {c.academicYear}{c.className ? ` · ${c.className}` : ""}{c.myRole === "co_teacher" ? " · co-teacher" : ""}</div>
                  <h3 style={{ margin: "2px 0", fontSize: 16 }}>{c.title}</h3>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/lessons`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Lessons</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/marking`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Marking</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/rubrics`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Rubrics</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/gradebook`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Gradebook</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/quizzes`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Quizzes</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/announcements`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Announcements</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/reports`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Reports</Link>}
                {c.status !== "archived" && <Link to={`/teacher/courses/${c.id}/questions`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Questions</Link>}
                {c.status === "draft" && (needsApproval.has(c.id)
                  ? <B disabled={busyId === c.id} primary onClick={() => post(c, "submit", "Submitted for approval.")}>Submit for approval</B>
                  : <B disabled={busyId === c.id} primary onClick={() => setStatusTo(c, "published", "Published.")}>Publish</B>)}
                {c.status === "pending" && <B disabled={busyId === c.id} onClick={() => post(c, "withdraw-submission", "Submission withdrawn.")}>Withdraw submission</B>}
                {c.status === "published" && <B disabled={busyId === c.id} onClick={() => setStatusTo(c, "draft", "Moved back to draft.")}>Unpublish</B>}
                {(c.status === "draft" || c.status === "published") && <B disabled={busyId === c.id} onClick={() => setStatusTo(c, "archived", "Archived.")}>Archive</B>}
                {c.status === "archived" && <B disabled={busyId === c.id} onClick={() => setStatusTo(c, "draft", "Restored as a draft.")}>Restore</B>}
                {(c.status === "draft" || c.status === "archived") && c.myRole !== "co_teacher" &&
                  <B disabled={busyId === c.id} onClick={() => { if (window.confirm(`Delete “${c.title}”? This cannot be undone from here.`)) run(c, () => API.delete(`/lms/courses/${c.id}`), "Deleted."); }}>Delete</B>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={state === "loading"} />
    </>
  );
}

function Approvals({ label, setMsg }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pageSize: 20 });
  const [state, setState] = useState("loading");
  const [busyId, setBusyId] = useState(null);
  const [returning, setReturning] = useState(null); // { id, reason }
  const load = useCallback(async () => {
    setState((s) => (s === "ready" ? s : "loading"));
    try { const r = await API.get("/lms/course-approvals", { params: { page } }); setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || 20 }); setState("ready"); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); setState("error"); }
  }, [page, setMsg]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, path, body, okText) => {
    setBusyId(id); setMsg(null);
    try { await API.post(`/lms/courses/${id}/${path}`, body); setMsg({ ok: true, text: okText }); setReturning(null); await load(); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusyId(null); }
  };

  if (state === "loading") return <Skeleton rows={2} />;
  if (state === "error") return <button type="button" style={S.btn} onClick={load}>Try again</button>;
  if (data.items.length === 0) return <p style={{ color: C.muted }}>No {label.many.toLowerCase()} are waiting for approval.</p>;
  return (
    <>
      <ul style={{ padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {data.items.map((c) => (
          <li key={c.id} style={{ ...S.box, listStyle: "none" }}>
            <div style={{ fontSize: 12, color: C.muted }}>{c.code} · {c.academicYear}{c.className ? ` · ${c.className}` : ""}</div>
            <h3 style={{ margin: "2px 0 8px", fontSize: 16 }}>{c.title}</h3>
            {returning?.id === c.id ? (
              <div>
                <label htmlFor={`rr-${c.id}`} style={{ ...S.label, margin: "0 0 4px" }}>Why is it being returned? The teacher will see this.</label>
                <textarea id={`rr-${c.id}`} rows={2} maxLength={500} value={returning.reason} onChange={(e) => setReturning({ id: c.id, reason: e.target.value })} style={{ ...S.input, width: "100%" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" style={S.btnPrimary} disabled={busyId === c.id || !returning.reason.trim()} onClick={() => decide(c.id, "return", { reason: returning.reason.trim() }, "Returned to the teacher.")}>Return</button>
                  <button type="button" style={S.btn} onClick={() => setReturning(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={S.btnPrimary} disabled={busyId === c.id} onClick={() => decide(c.id, "approve", {}, "Approved and published.")}>Approve</button>
                <button type="button" style={S.btn} disabled={busyId === c.id} onClick={() => setReturning({ id: c.id, reason: "" })}>Return…</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={false} />
    </>
  );
}

export default function TeacherCourses() {
  const label = useCourseLabel();
  const [tab, setTab] = useState("mine");
  const [perms, setPerms] = useState(new Set());
  const [permState, setPermState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let alive = true;
    API.get("/lms/me/permissions")
      .then((r) => { if (alive) { setPerms(new Set(r.data.permissions || [])); setPermState("ready"); } })
      .catch((e) => { if (alive) setPermState(isModuleNotLicensed(e) ? "unlicensed" : "error"); });
    return () => { alive = false; };
  }, []);

  if (permState === "unlicensed") return <UpgradePrompt module="lms" />;
  if (permState === "loading") return <div style={S.page}><Skeleton rows={2} /></div>;
  if (permState === "error") return <div style={S.page}><p role="alert">Could not load. Please refresh the page.</p></div>;
  if (!perms.has("lms.course.create") && !perms.has("lms.course.manage")) {
    return <div style={S.page}><h1 style={S.h1}>{label.many}</h1><p style={S.sub}>You do not have access to manage {label.many.toLowerCase()}. Please ask your LMS administrator.</p></div>;
  }
  const tabs = [["mine", `My ${label.many.toLowerCase()}`], ...(perms.has("lms.course.approve") ? [["approvals", "Approvals"]] : [])];
  return (
    <div style={S.page}>
      <h1 style={S.h1}>{label.many}</h1>
      <p style={S.sub}>Create, publish and manage your {label.many.toLowerCase()}.</p>
      {tabs.length > 1 && <Tabs tabs={tabs} value={tab} onChange={(t) => { setMsg(null); setTab(t); }} />}
      <Notice msg={msg} />
      {tab === "approvals" ? <Approvals label={label} setMsg={setMsg} /> : <MyCourses label={label} perms={perms} setMsg={setMsg} />}
    </div>
  );
}
