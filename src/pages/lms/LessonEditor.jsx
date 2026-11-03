import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { Notice, Skeleton, Tabs } from "./lmsUi";
import { BlockList } from "./BlockView";
import { BlockEditorList } from "./BlockEditors";
import { blockProblems, fromServer, toPayload, useBeforeUnload } from "./blockModel";

/* Teacher lesson editor (L3.1b). One lesson at a time.
   Backend (all under /api/lms/courses/:id/lessons/:lessonId): GET (lesson + blocks), PATCH (details, status/publishAt,
   completionRule+minMinutes), PUT content {baseVersion, blocks}, GET preview, GET versions, POST versions/:n/restore {baseVersion},
   GET|PUT prerequisites {ids}. Content saves are optimistic: a 409 CONTENT_CONFLICT is never overwritten, the teacher must reload. */

const rule = (r) => r || "mark_complete";
const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmt = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(); };
const visibilityOf = (l) => (l.status === "draft" ? "draft" : l.publishAt && new Date(l.publishAt).getTime() > Date.now() ? "scheduled" : "published");

export default function LessonEditor({ courseId, lessonId, lessons, onListChanged, onDirtyChange }) {
  const base = `/lms/courses/${courseId}/lessons/${lessonId}`;
  const [state, setState] = useState("loading"); // loading | ready | error
  const [lesson, setLesson] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("content");

  useBeforeUnload(dirty);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const load = useCallback(async () => {
    setState("loading"); setConflict(false); setMsg(null);
    try {
      const r = await API.get(base);
      setLesson(r.data.lesson); setBlocks(fromServer(r.data.blocks)); setVersion(r.data.lesson.contentVersion); setDirty(false); setState("ready");
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not load this lesson.") }); setState("error"); }
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const editBlocks = useCallback((fn) => { setBlocks(fn); setDirty(true); }, []);
  const problems = useMemo(() => blockProblems(blocks), [blocks]);

  const saveContent = async () => {
    if (problems.length) { setMsg({ ok: false, text: problems[0] }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await API.put(`${base}/content`, { baseVersion: version, blocks: toPayload(blocks) });
      const server = fromServer(r.data.blocks);
      // If the server cleaned something (e.g. formatting it does not allow), show what it actually kept.
      const changed = server.length !== blocks.length || server.some((s, i) => s.type === "text" && (s.html || "") !== (blocks[i].html || ""));
      if (changed) setBlocks(server);
      setVersion(r.data.contentVersion); setDirty(false);
      setMsg({ ok: true, text: changed ? "Saved. Some formatting that is not allowed was removed." : "Saved." });
    } catch (e) {
      if (e?.response?.data?.code === "CONTENT_CONFLICT") setConflict(true);
      setMsg({ ok: false, text: errText(e, "Could not save.") });
    } finally { setSaving(false); }
  };

  const patch = async (body, okText) => {
    setSaving(true); setMsg(null);
    try { const r = await API.patch(base, body); setLesson((l) => ({ ...l, ...r.data.lesson, contentVersion: l.contentVersion })); setMsg({ ok: true, text: okText }); onListChanged?.(); return true; }
    catch (e) { setMsg({ ok: false, text: errText(e) }); return false; } finally { setSaving(false); }
  };

  if (state === "loading") return <Skeleton rows={2} />;
  if (state === "error") return <div><Notice msg={msg} /><button type="button" style={S.btn} onClick={load}>Try again</button></div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>{lesson.title}</h2>
      <Tabs tabs={[["content", "Content"], ["settings", "Settings"], ["history", "History"], ["preview", "Preview as student"]]} value={tab}
        onChange={(t) => { if (t !== "content" && dirty && !window.confirm("You have unsaved changes to the content. Leave this tab anyway? They stay here until you save or switch lessons.")) return; setMsg(null); setTab(t); }} />
      <Notice msg={msg} />
      {conflict && (
        <div role="alert" style={{ ...S.box, borderColor: C.bad, marginBottom: 12 }}>
          <p style={{ margin: "0 0 8px" }}>Someone else saved this lesson after you opened it. Your unsaved changes were NOT saved, and nothing was overwritten.</p>
          <button type="button" style={S.btnPrimary} onClick={() => { if (window.confirm("Reload the latest version? Your unsaved changes in this lesson will be lost.")) load(); }}>Reload latest</button>
        </div>
      )}

      {tab === "content" && (
        <>
          <BlockEditorList courseId={courseId} blocks={blocks} setBlocks={editBlocks} setMsg={setMsg} />
          {problems.length > 0 && <ul style={{ color: C.warn, fontSize: 13, paddingLeft: 18 }}>{problems.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>}
          <div style={{ position: "sticky", bottom: 0, background: C.card, padding: "10px 0", marginTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={S.btnPrimary} disabled={saving || !dirty || conflict} onClick={saveContent}>{saving ? "Saving…" : "Save content"}</button>
            <span aria-live="polite" style={{ fontSize: 13, color: dirty ? C.warn : C.ok }}>{dirty ? "Unsaved changes" : "All changes saved"}</span>
          </div>
        </>
      )}
      {tab === "settings" && <Settings lesson={lesson} lessons={lessons} base={base} patch={patch} saving={saving} setMsg={setMsg} />}
      {tab === "history" && <History base={base} version={version} dirty={dirty} setMsg={setMsg} onRestored={(r) => { setBlocks(fromServer(r.blocks)); setVersion(r.contentVersion); setDirty(false); setConflict(false); setTab("content"); setMsg({ ok: true, text: "Restored. The restored text is saved as a new version." }); }} />}
      {tab === "preview" && <Preview key={version} base={base} dirty={dirty} />}
    </div>
  );
}

/* --------------------------------- settings -------------------------------- */
function Settings({ lesson, lessons, base, patch, saving, setMsg }) {
  const [d, setD] = useState({ title: lesson.title, summary: lesson.summary || "", minutes: lesson.estimatedMinutes ?? "" });
  const [vis, setVis] = useState(visibilityOf(lesson));
  const [when, setWhen] = useState(lesson.publishAt ? toLocalInput(lesson.publishAt) : "");
  const [cr, setCr] = useState(rule(lesson.completionRule));
  const [mins, setMins] = useState(lesson.minMinutes ?? "");

  const saveDetails = (e) => { e.preventDefault(); patch({ title: d.title, summary: d.summary.trim() || null, estimatedMinutes: d.minutes === "" ? null : Number(d.minutes) }, "Details saved."); };
  const saveVis = async (e) => {
    e.preventDefault();
    if (vis === "scheduled") {
      const t = new Date(when);
      if (!when || Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) { setMsg({ ok: false, text: "Choose a date and time in the future." }); return; }
      await patch({ publishAt: t.toISOString() }, `Scheduled for ${t.toLocaleString()}.`);
    } else await patch({ status: vis }, vis === "published" ? "Published to students." : "Moved back to draft.");
  };
  const saveRule = (e) => { e.preventDefault(); patch({ completionRule: cr, minMinutes: cr === "min_time" ? Number(mins) : null }, "Completion rule saved."); };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form onSubmit={saveDetails} style={S.box} aria-label="Lesson details">
        <h3 style={{ margin: 0, fontSize: 16 }}>Details</h3>
        <label style={S.label} htmlFor="ls-title">Title</label>
        <input id="ls-title" required maxLength={200} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} style={{ ...S.input, width: "100%" }} />
        <label style={S.label} htmlFor="ls-sum">Short summary (optional)</label>
        <textarea id="ls-sum" rows={2} maxLength={1000} value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} style={{ ...S.input, width: "100%" }} />
        <label style={S.label} htmlFor="ls-min">Estimated time in minutes (optional)</label>
        <input id="ls-min" type="number" min={1} max={600} value={d.minutes} onChange={(e) => setD({ ...d, minutes: e.target.value })} style={{ ...S.input, width: 120 }} />
        <div style={{ marginTop: 12 }}><button type="submit" style={S.btnPrimary} disabled={saving}>Save details</button></div>
      </form>

      <form onSubmit={saveVis} style={S.box} aria-label="Who can see this lesson">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Who can see this lesson</legend>
          {[["draft", "Draft: only staff can see it"], ["published", "Published: students can see it now"], ["scheduled", "Scheduled: students see it from a date"]].map(([v, t]) => (
            <label key={v} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14 }}>
              <input type="radio" name="vis" value={v} checked={vis === v} onChange={() => setVis(v)} /> {t}
            </label>
          ))}
        </fieldset>
        {vis === "scheduled" && (
          <div><label style={S.label} htmlFor="ls-when">Date and time (your local time)</label>
            <input id="ls-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={S.input} /></div>
        )}
        <p style={{ fontSize: 13, color: C.muted }}>Students also need the course itself to be published.{lesson.status === "published" && lesson.publishAt && !lesson.visibleToStudents ? ` Currently scheduled for ${fmt(lesson.publishAt)}.` : ""}</p>
        <button type="submit" style={S.btnPrimary} disabled={saving}>Save visibility</button>
      </form>

      <form onSubmit={saveRule} style={S.box} aria-label="Completion rule">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>When is this lesson complete?</legend>
          {[["view", "As soon as the student opens it"], ["mark_complete", "When the student presses “Mark complete”"], ["min_time", "After a minimum time spent on the lesson"]].map(([v, t]) => (
            <label key={v} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14 }}>
              <input type="radio" name="cr" value={v} checked={cr === v} onChange={() => setCr(v)} /> {t}
            </label>
          ))}
        </fieldset>
        {cr === "min_time" && (
          <div><label style={S.label} htmlFor="ls-mm">Minimum minutes (1-240)</label>
            <input id="ls-mm" type="number" required min={1} max={240} value={mins} onChange={(e) => setMins(e.target.value)} style={{ ...S.input, width: 120 }} /></div>
        )}
        <div style={{ marginTop: 12 }}><button type="submit" style={S.btnPrimary} disabled={saving}>Save rule</button></div>
      </form>

      <Prerequisites base={base} lessonId={lesson.id} lessons={lessons} setMsg={setMsg} />
    </div>
  );
}

function Prerequisites({ base, lessonId, lessons, setMsg }) {
  const [ids, setIds] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    API.get(`${base}/prerequisites`).then((r) => { if (alive) setIds(new Set((r.data.prerequisites || []).map((p) => p.lessonId))); }).catch((e) => { if (alive) { setIds(new Set()); setMsg({ ok: false, text: errText(e, "Could not load prerequisites.") }); } });
    return () => { alive = false; };
  }, [base, setMsg]);
  const others = lessons.filter((l) => l.id !== lessonId);
  const toggle = (id) => setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await API.put(`${base}/prerequisites`, { ids: [...ids] }); setMsg({ ok: true, text: "Prerequisites saved." }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };
  return (
    <section style={S.box} aria-label="Prerequisites">
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Prerequisites</h3>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: C.muted }}>Students must complete the ticked lessons before this one opens (up to 10).</p>
      {ids === null ? <Skeleton rows={1} /> : others.length === 0 ? <p style={{ color: C.muted, fontSize: 14 }}>There are no other lessons in this course yet.</p> : (
        <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 2 }}>
          {others.map((l) => (
            <label key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, padding: "4px 0" }}>
              <input type="checkbox" checked={ids.has(l.id)} onChange={() => toggle(l.id)} /> {l.title}
            </label>
          ))}
        </div>
      )}
      {ids && others.length > 0 && <div style={{ marginTop: 10 }}><button type="button" style={S.btnPrimary} disabled={busy || ids.size > 10} onClick={save}>Save prerequisites</button>{ids.size > 10 && <span role="alert" style={{ marginLeft: 10, fontSize: 13, color: C.bad }}>Choose at most 10.</span>}</div>}
    </section>
  );
}

/* ---------------------------------- history -------------------------------- */
function History({ base, version, dirty, setMsg, onRestored }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    let alive = true;
    API.get(`${base}/versions`).then((r) => { if (alive) setList(r.data.versions || []); }).catch((e) => { if (alive) { setList([]); setMsg({ ok: false, text: errText(e, "Could not load history.") }); } });
    return () => { alive = false; };
  }, [base, setMsg, version]);

  const restore = async (n) => {
    if (dirty) { setMsg({ ok: false, text: "Save or discard your current changes first, then restore." }); return; }
    if (!window.confirm(`Restore version ${n}? The current text is kept in history, so you can go back.`)) return;
    setBusy(n); setMsg(null);
    try { const r = await API.post(`${base}/versions/${n}/restore`, { baseVersion: version }); onRestored(r.data); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not restore.") }); } finally { setBusy(null); }
  };
  if (list === null) return <Skeleton rows={2} />;
  if (list.length === 0) return <p style={{ color: C.muted }}>No saved versions yet. A version is kept every time you save the content.</p>;
  return (
    <ul style={{ padding: 0, margin: 0, display: "grid", gap: 8 }}>
      {list.map((v, i) => (
        <li key={v.versionNo} style={{ ...S.box, listStyle: "none", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div><strong>Version {v.versionNo}</strong>{i === 0 ? " (latest)" : ""}<div style={{ fontSize: 13, color: C.muted }}>{fmt(v.createdAt)}{v.label ? ` · ${v.label}` : ""}</div></div>
          {i > 0 && <button type="button" style={S.btn} disabled={busy !== null} onClick={() => restore(v.versionNo)}>{busy === v.versionNo ? "Restoring…" : "Restore this version"}</button>}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------- preview -------------------------------- */
function Preview({ base, dirty }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    API.get(`${base}/preview`).then((r) => { if (alive) setData(r.data); }).catch((e) => { if (alive) setErr(errText(e, "Could not load the preview.")); });
    return () => { alive = false; };
  }, [base]);
  if (err) return <p role="alert" style={{ color: C.bad }}>{err}</p>;
  if (!data) return <Skeleton rows={2} />;
  const p = data.preview || {};
  return (
    <div>
      <p style={{ ...S.box, fontSize: 14, margin: "0 0 12px" }}>
        {p.visibleToStudents ? "Students can see this lesson now." : p.status === "published" && p.publishAt ? `Students cannot see it yet: it goes live on ${fmt(p.publishAt)}.` : "Students cannot see this lesson: it is a draft."}
        {dirty ? " This preview shows the last SAVED content, not your unsaved changes." : ""}
      </p>
      <h3 style={{ margin: "0 0 4px" }}>{data.lesson.title}</h3>
      {data.lesson.summary && <p style={{ color: C.muted }}>{data.lesson.summary}</p>}
      <BlockList blocks={data.blocks} />
    </div>
  );
}
