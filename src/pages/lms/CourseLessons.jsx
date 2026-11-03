import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";
import LessonEditor from "./LessonEditor";

/* Teacher screen /teacher/courses/:courseId/lessons (L3.1b): lesson list on the left, editor on the right.
   Backend: GET /lms/courses/:id, GET /lms/courses/:id/sections, GET|POST /lms/courses/:id/lessons.
   Reordering lessons (PUT .../lessons/order) is NOT in this screen yet (L3.4 ordering UI). */

function statusText(l) {
  if (l.status === "draft") return "Draft";
  return l.publishAt && new Date(l.publishAt).getTime() > Date.now() ? "Scheduled" : "Published";
}

export default function CourseLessons() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed | forbidden
  const [selected, setSelected] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [c, s, l] = await Promise.all([API.get(`/lms/courses/${courseId}`), API.get(`/lms/courses/${courseId}/sections`), API.get(`/lms/courses/${courseId}/lessons`)]);
      setCourse(c.data.course); setSections(s.data.sections || []); setLessons(l.data.lessons || []); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else if (e?.response?.status === 403 || e?.response?.status === 404) setState("forbidden");
      else { setMsg({ ok: false, text: errText(e) }); setState("error"); }
    }
  }, [courseId]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const reloadLessons = useCallback(async () => {
    try { const l = await API.get(`/lms/courses/${courseId}/lessons`); setLessons(l.data.lessons || []); } catch { /* list refresh is best effort */ }
  }, [courseId]);

  const choose = (id) => {
    if (id === selected) return;
    if (dirty && !window.confirm("You have unsaved changes in the open lesson. Switch anyway and lose them?")) return;
    setDirty(false); setMsg(null); setSelected(id);
  };

  const create = async (e) => {
    e.preventDefault(); setCreating(true); setMsg(null);
    if (dirty && !window.confirm("You have unsaved changes in the open lesson. Create a new lesson and lose them?")) { setCreating(false); return; }
    try {
      const body = { title: newTitle }; if (newSection) body.sectionId = Number(newSection);
      const r = await API.post(`/lms/courses/${courseId}/lessons`, body);
      setNewTitle(""); await reloadLessons(); setDirty(false); setSelected(r.data.lesson.id);
      setMsg({ ok: true, text: "Lesson created as a draft. Add content, then publish it under Settings." });
    } catch (ex) { setMsg({ ok: false, text: errText(ex) }); } finally { setCreating(false); }
  };

  const remove = async () => {
    const l = lessons.find((x) => x.id === selected); if (!l) return;
    if (!window.confirm(`Delete the lesson “${l.title}”? Students will no longer see it.`)) return;
    try { await API.delete(`/lms/courses/${courseId}/lessons/${l.id}`); setSelected(null); setDirty(false); await reloadLessons(); setMsg({ ok: true, text: "Lesson deleted." }); }
    catch (ex) { setMsg({ ok: false, text: errText(ex) }); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  if (state === "loading") return <div style={S.page}><Skeleton rows={3} /></div>;
  if (state === "forbidden") return <div style={S.page}><p>You cannot edit the lessons of this course.</p><Link to="/teacher/courses">Back to courses</Link></div>;
  if (state === "error") return <div style={S.page}><Notice msg={msg} /><button type="button" style={S.btn} onClick={loadAll}>Try again</button></div>;

  const groups = [...sections.map((s) => ({ id: s.id, title: s.title, items: lessons.filter((l) => l.sectionId === s.id) })), { id: null, title: sections.length ? "Not in a section" : "Lessons", items: lessons.filter((l) => l.sectionId === null || !sections.some((s) => s.id === l.sectionId)) }];

  return (
    <div style={{ ...S.page, maxWidth: 1200 }}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/teacher/courses">← Back to courses</Link></p>
      <h1 style={S.h1}>{course?.title}</h1>
      <p style={S.sub}>{course?.code} · Lessons{course?.status !== "published" ? ` · this course is ${course?.status}, so students cannot see any lessons yet` : ""}</p>
      <Notice msg={msg} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <aside aria-label="Lessons" style={{ flex: "1 1 260px", maxWidth: 360, minWidth: 0 }}>
          <form onSubmit={create} style={{ ...S.box, marginBottom: 12 }} aria-label="New lesson">
            <label style={{ ...S.label, margin: "0 0 4px" }} htmlFor="nl-title">New lesson</label>
            <input id="nl-title" required maxLength={200} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Lesson title" style={{ ...S.input, width: "100%" }} />
            {sections.length > 0 && (
              <select aria-label="Section" value={newSection} onChange={(e) => setNewSection(e.target.value)} style={{ ...S.input, width: "100%", marginTop: 8 }}>
                <option value="">No section</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            )}
            <button type="submit" style={{ ...S.btnPrimary, marginTop: 8 }} disabled={creating}>{creating ? "Creating…" : "Add lesson"}</button>
          </form>
          {lessons.length === 0 ? <p style={{ color: C.muted, fontSize: 14 }}>No lessons yet. Add your first one above.</p> : groups.filter((g) => g.items.length).map((g) => (
            <div key={String(g.id)} style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, margin: "0 0 6px", color: C.muted }}>{g.title}</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                {g.items.map((l) => (
                  <li key={l.id}>
                    <button type="button" onClick={() => choose(l.id)} aria-current={l.id === selected ? "true" : undefined}
                      style={{ ...S.btn, width: "100%", textAlign: "left", borderColor: l.id === selected ? C.accent : C.border, fontWeight: l.id === selected ? 700 : 400 }}>
                      {l.title}<span style={{ display: "block", fontSize: 12, color: C.muted, fontWeight: 400 }}>{statusText(l)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <main style={{ flex: "3 1 420px", minWidth: 0 }}>
          {selected ? (
            <>
              <LessonEditor key={selected} courseId={courseId} lessonId={selected} lessons={lessons} onListChanged={reloadLessons} onDirtyChange={setDirty} />
              <div style={{ marginTop: 20 }}><button type="button" style={S.btn} onClick={remove}>Delete this lesson</button></div>
            </>
          ) : <p style={{ color: C.muted }}>Choose a lesson on the left, or add a new one.</p>}
        </main>
      </div>
    </div>
  );
}
