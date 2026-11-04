import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher gradebook screen /teacher/courses/:courseId/gradebook (L7.1c, S79). Frontend only. Backend (flag lms_gradebook; course staff):
     GET   /lms/courses/:id/gradebook?page&pageSize           -> { categories, items, learners:[{studentId,name,admissionNo,grades:{itemId:{points,excused,hidden,hasComment}},percent,...}], total, page, pageSize }
     POST  /lms/courses/:id/gradebook/items                   { title, maxPoints, categoryId?, weight? }   (needs lms.course.manage)
     PATCH /lms/courses/:id/gradebook/items/:itemId           { released }                                  (needs lms.course.manage)
     PUT   /lms/courses/:id/gradebook/items/:itemId/grades/:studentId   { points|null, excused, comment, reason }  (needs lms.submission.grade)
   Changing a grade that already has a value needs a reason (server rule), so the form asks for it first. The grid never shows an existing comment
   (only that one exists), so the comment box is sent only when the teacher types in it. Categories and columns are edited in the section under the grid (PATCH/DELETE on .../categories/:id and .../items/:id; the server refuses unsafe deletes in its own words). Show history = GET .../items/:i/grades/:s/history. Results = POST .../gradebook/results {dryRun} (needs lms.gradebook.publish; server explains mapping/publish refusals). Export CSV downloads the server file (all learners) through the authenticated API. */

const PAGE_SIZE = 30;
const cellText = (g) => (!g ? "–" : g.excused ? "Ex" : g.points === null || g.points === undefined ? "–" : String(g.points));
const pct = (v) => (v === null || v === undefined ? "–" : `${Math.round(v * 10) / 10}%`);

const histVal = (p, ex) => (ex ? "excused" : p === null || p === undefined ? "not graded" : String(p));

function GradeForm({ item, learner, onSaved, onCancel, base }) {
  const g = learner.grades[item.id] || null;
  const hadValue = !!g && (g.excused || (g.points !== null && g.points !== undefined));
  const [points, setPoints] = useState(g && g.points !== null && g.points !== undefined ? String(g.points) : "");
  const [excused, setExcused] = useState(!!(g && g.excused));
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState(null); // null = not asked, array = loaded
  const showHistory = async () => {
    setMsg(null);
    try { const r = await API.get(`${base}/items/${item.id}/grades/${learner.studentId}/history`); setHist(r.data.history || []); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the history.") }); }
  };
  const save = async () => {
    const body = {};
    const p = points.trim() === "" ? null : Number(points);
    if (p !== null && Number.isNaN(p)) { setMsg({ ok: false, text: "Points must be a number." }); return; }
    if (p !== null && (p < 0 || p > item.maxPoints)) { setMsg({ ok: false, text: `Points must be from 0 to ${item.maxPoints}.` }); return; }
    const oldP = g && g.points !== null && g.points !== undefined ? g.points : null;
    const valuesChanged = p !== oldP || excused !== !!(g && g.excused);
    if (hadValue && valuesChanged && !reason.trim()) { setMsg({ ok: false, text: "Give a short reason for changing a grade that was already entered." }); return; }
    if (valuesChanged || !g) { body.points = p; body.excused = excused; }
    if (comment.trim()) body.comment = comment.trim();
    if (!Object.keys(body).length) { setMsg({ ok: false, text: "Nothing has changed." }); return; }
    if (reason.trim()) body.reason = reason.trim();
    setBusy(true); setMsg(null);
    try { await API.put(`${base}/items/${item.id}/grades/${learner.studentId}`, body); onSaved(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not save the grade. Your entries are still here.") }); }
    setBusy(false);
  };
  return (
    <section aria-label="Enter grade" style={{ ...S.box, margin: "12px 0" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{learner.name || `Learner ${learner.studentId}`} · {item.title}</h2>
      <Notice msg={msg} />
      <label style={S.label} htmlFor="gr-points">Points (out of {item.maxPoints}; leave empty for not graded)</label>
      <input id="gr-points" type="number" inputMode="decimal" step="0.01" min="0" max={item.maxPoints} style={{ ...S.input, width: 140 }} value={points} onChange={(e) => setPoints(e.target.value)} />
      <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0", fontSize: 14 }}>
        <input type="checkbox" checked={excused} onChange={(e) => setExcused(e.target.checked)} /> Excused (left out of the total)
      </label>
      <label style={S.label} htmlFor="gr-comment">Comment (optional){g && g.hasComment ? ". There is already a comment; leave this empty to keep it." : ""}</label>
      <textarea id="gr-comment" rows={2} maxLength={1000} style={{ ...S.input, width: "100%" }} value={comment} onChange={(e) => setComment(e.target.value)} />
      {hadValue && (
        <>
          <label style={S.label} htmlFor="gr-reason">Reason for changing an entered grade</label>
          <input id="gr-reason" style={{ ...S.input, width: "100%" }} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={save}>Save grade</button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
        {g && <button type="button" style={S.btn} onClick={showHistory}>Show history</button>}
      </div>
      {hist && (hist.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No changes have been recorded for this grade.</p> : (
        <ul aria-label="Grade history" style={{ listStyle: "none", margin: "12px 0 0", padding: 0, fontSize: 13 }}>
          {hist.map((h) => (
            <li key={h.id} style={{ borderTop: `1px solid ${C.border}`, padding: "6px 0" }}>
              <strong>{histVal(h.oldPoints, h.oldExcused)} to {histVal(h.newPoints, h.newExcused)}</strong>
              <span style={{ color: C.muted }}> · {h.changedAt ? new Date(h.changedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
              {h.reason ? <div>Reason: {h.reason}</div> : null}
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}

function AddColumn({ base, categories, onSaved, onCancel }) {
  const [title, setTitle] = useState("");
  const [maxPoints, setMaxPoints] = useState("100");
  const [categoryId, setCategoryId] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const m = Number(maxPoints);
    if (!title.trim()) { setMsg({ ok: false, text: "Give the column a title." }); return; }
    if (!(m > 0)) { setMsg({ ok: false, text: "The maximum points must be more than 0." }); return; }
    setBusy(true); setMsg(null);
    try { await API.post(`${base}/items`, { title: title.trim(), maxPoints: m, ...(categoryId ? { categoryId: Number(categoryId) } : {}) }); onSaved(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not add the column. Your entries are still here.") }); }
    setBusy(false);
  };
  return (
    <section aria-label="Add column" style={{ ...S.box, margin: "12px 0" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>New grade column</h2>
      <Notice msg={msg} />
      <label style={S.label} htmlFor="col-title">Title</label>
      <input id="col-title" style={{ ...S.input, width: "100%" }} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label style={S.label} htmlFor="col-max">Maximum points</label>
      <input id="col-max" type="number" inputMode="decimal" step="0.01" min="0.01" style={{ ...S.input, width: 140 }} value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} />
      {categories.length > 0 && (
        <>
          <label style={S.label} htmlFor="col-cat">Category (optional)</label>
          <select id="col-cat" style={S.input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={save}>Add column</button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Results({ base, onMsg }) {
  const [out, setOut] = useState(null); // { kind: "preview"|"done", r }
  const [busy, setBusy] = useState(false);
  const run = async (dryRun) => {
    if (!dryRun && !window.confirm("Send each learner's course total to the school's formal results? Only released columns and visible grades count. Sending again updates the same results.")) return;
    setBusy(true); onMsg(null);
    try { const r = await API.post(`${base}/results`, { dryRun }); setOut({ kind: dryRun ? "preview" : "done", r: r.data }); }
    catch (e) { setOut(null); onMsg({ ok: false, text: errText(e, "Could not send the results.") }); }
    setBusy(false);
  };
  const r = out && out.r;
  return (
    <section aria-label="Formal results" style={{ ...S.box, marginTop: 20 }}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Send results to the school records</h2>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: C.muted }}>Sends each learner's course total as a mark out of 100. Preview first to see who is included.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={S.btn} disabled={busy} onClick={() => run(true)}>Preview</button>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => run(false)}>Send results</button>
      </div>
      {r && (
        <div role="status" style={{ marginTop: 12, fontSize: 14 }}>
          {out.kind === "preview"
            ? <p style={{ margin: 0 }}>Preview only, nothing was sent. {r.eligible} learner{r.eligible === 1 ? "" : "s"} would be included{r.skippedCount ? `, ${r.skippedCount} left out (no released grades yet)` : ""}.</p>
            : <p style={{ margin: 0 }}>Results sent. {r.inserted} added, {r.updated} updated, {r.unchanged} unchanged{r.skippedCount ? `, ${r.skippedCount} left out (no released grades yet)` : ""}.</p>}
        </div>
      )}
    </section>
  );
}

function Manage({ base, categories, items, onChanged, onMsg }) {
  const [form, setForm] = useState(null); // { kind: "cat"|"item", id|null, ...fields }
  const [busy, setBusy] = useState(false);
  const [fmsg, setFmsg] = useState(null);
  const num = (v) => (String(v).trim() === "" ? NaN : Number(v));
  const openCat = (c) => { setFmsg(null); setForm({ kind: "cat", id: c ? c.id : null, name: c ? c.name : "", weight: c ? String(c.weight) : "0", dropLowest: c ? String(c.dropLowest) : "0" }); };
  const openItem = (i) => { setFmsg(null); setForm({ kind: "item", id: i.id, title: i.title, maxPoints: String(i.maxPoints), weight: String(i.weight), categoryId: i.categoryId ? String(i.categoryId) : "", linked: i.sourceType !== "manual" }); };
  const save = async () => {
    let body;
    if (form.kind === "cat") {
      const w = num(form.weight), d = num(form.dropLowest);
      if (!form.name.trim()) { setFmsg({ ok: false, text: "Give the category a name." }); return; }
      if (Number.isNaN(w) || w < 0 || w > 100) { setFmsg({ ok: false, text: "Weight must be from 0 to 100." }); return; }
      if (Number.isNaN(d) || d < 0 || !Number.isInteger(d)) { setFmsg({ ok: false, text: "Drop lowest must be a whole number, 0 or more." }); return; }
      body = { name: form.name.trim(), weight: w, dropLowest: d };
    } else {
      const m = num(form.maxPoints), w = num(form.weight);
      if (!form.title.trim()) { setFmsg({ ok: false, text: "Give the column a title." }); return; }
      if (!(m > 0) || Number.isNaN(w) || w < 0) { setFmsg({ ok: false, text: "Maximum points must be more than 0 and weight 0 or more." }); return; }
      body = { title: form.title.trim(), weight: w, categoryId: form.categoryId ? Number(form.categoryId) : null };
      if (!form.linked) body.maxPoints = m;
    }
    setBusy(true); setFmsg(null);
    try {
      const url = form.kind === "cat" ? `${base}/categories` : `${base}/items`;
      if (form.id) await API.patch(`${url}/${form.id}`, body); else await API.post(url, body);
      setForm(null); onMsg({ ok: true, text: form.kind === "cat" ? "Category saved." : "Column saved." }); onChanged();
    } catch (e) { setFmsg({ ok: false, text: errText(e, "Could not save. Your entries are still here.") }); }
    setBusy(false);
  };
  const del = async (kind, row, label) => {
    if (!window.confirm(`Delete ${kind === "cat" ? "the category" : "the column"} "${label}"?`)) return;
    try { await API.delete(`${base}/${kind === "cat" ? "categories" : "items"}/${row.id}`); onMsg({ ok: true, text: kind === "cat" ? "Category deleted." : "Column deleted." }); onChanged(); }
    catch (e) { onMsg({ ok: false, text: errText(e, "Could not delete.") }); }
  };
  const li = { ...S.box, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", padding: 10 };
  return (
    <section aria-label="Manage gradebook" style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Categories and columns</h2>
      {form && (
        <div style={{ ...S.box, marginBottom: 12 }} role="group" aria-label={form.kind === "cat" ? "Category form" : "Column form"}>
          <Notice msg={fmsg} />
          {form.kind === "cat" ? (
            <>
              <label style={S.label} htmlFor="mc-name">Category name</label>
              <input id="mc-name" style={{ ...S.input, width: "100%" }} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label style={S.label} htmlFor="mc-weight">Weight (0 to 100)</label>
              <input id="mc-weight" type="number" step="0.01" min="0" max="100" style={{ ...S.input, width: 120 }} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              <label style={S.label} htmlFor="mc-drop">Drop the lowest this many grades</label>
              <input id="mc-drop" type="number" step="1" min="0" max="20" style={{ ...S.input, width: 120 }} value={form.dropLowest} onChange={(e) => setForm({ ...form, dropLowest: e.target.value })} />
            </>
          ) : (
            <>
              <label style={S.label} htmlFor="mi-title">Column title</label>
              <input id="mi-title" style={{ ...S.input, width: "100%" }} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <label style={S.label} htmlFor="mi-max">Maximum points{form.linked ? " (follows the linked assignment or quiz)" : ""}</label>
              <input id="mi-max" type="number" step="0.01" min="0.01" disabled={form.linked} style={{ ...S.input, width: 140 }} value={form.maxPoints} onChange={(e) => setForm({ ...form, maxPoints: e.target.value })} />
              <label style={S.label} htmlFor="mi-weight">Weight</label>
              <input id="mi-weight" type="number" step="0.01" min="0" style={{ ...S.input, width: 120 }} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              <label style={S.label} htmlFor="mi-cat">Category</label>
              <select id="mi-cat" style={S.input} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={save}>Save</button>
            <button type="button" style={S.btn} disabled={busy} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
      <h3 style={{ fontSize: 15, margin: "8px 0" }}>Categories</h3>
      {categories.length === 0 ? <p style={{ color: C.muted, fontSize: 14, margin: "0 0 8px" }}>No categories yet. Columns without a category count on their own.</p> : (
        <ul aria-label="Categories" style={{ listStyle: "none", margin: "0 0 8px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.map((c) => (
            <li key={c.id} style={li}>
              <span><strong>{c.name}</strong> <span style={{ fontSize: 13, color: C.muted }}>· weight {c.weight}{c.dropLowest ? ` · drops lowest ${c.dropLowest}` : ""}</span></span>
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" style={S.btn} onClick={() => openCat(c)} aria-label={`Edit category ${c.name}`}>Edit</button>
                <button type="button" style={S.btn} onClick={() => del("cat", c, c.name)} aria-label={`Delete category ${c.name}`}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" style={S.btn} onClick={() => openCat(null)}>Add category</button>
      <h3 style={{ fontSize: 15, margin: "16px 0 8px" }}>Columns</h3>
      <ul aria-label="Columns" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((i) => (
          <li key={i.id} style={li}>
            <span><strong>{i.title}</strong> <span style={{ fontSize: 13, color: C.muted }}>· out of {i.maxPoints} · weight {i.weight}{i.sourceType !== "manual" ? ` · linked ${i.sourceType}` : ""}</span></span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" style={S.btn} onClick={() => openItem(i)} aria-label={`Edit column ${i.title}`}>Edit</button>
              <button type="button" style={S.btn} onClick={() => del("item", i, i.title)} aria-label={`Delete column ${i.title}`}>Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CourseGradebook() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/gradebook`;
  const [state, setState] = useState("loading"); // loading | ready | error | unlicensed
  const [data, setData] = useState({ categories: [], items: [], learners: [], total: 0 });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState(null);
  const [edit, setEdit] = useState(null); // { item, learner }
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await API.get(base, { params: { page, pageSize: PAGE_SIZE } });
      setData({ categories: r.data.categories || [], items: r.data.items || [], learners: r.data.learners || [], total: r.data.total || 0 }); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, "Could not load the gradebook.") }); setState("error"); }
    }
  }, [base, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, tick]);
  const retry = () => { setState("loading"); setMsg(null); load(); };

  const toggleRelease = async (item) => {
    setMsg(null);
    const next = !item.released;
    try { await API.patch(`${base}/items/${item.id}`, { released: next }); setMsg({ ok: true, text: next ? `"${item.title}" released to learners.` : `"${item.title}" hidden from learners.` }); setTick((t) => t + 1); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not change the release setting.") }); }
  };

  const exportCsv = async () => {
    setMsg(null);
    try {
      const r = await API.get(`${base}/export.csv`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data), a = document.createElement("a");
      a.href = url; a.download = `gradebook-course-${courseId}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: "Gradebook exported." });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not export the gradebook.") }); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  const catName = (id) => (data.categories.find((c) => c.id === id) || {}).name;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Gradebook</h1>
      <p style={S.sub}>Grades for every enrolled learner. A column is hidden from learners until you release it.</p>
      <p style={{ margin: "0 0 10px" }}><Link to={`/teacher/courses/${courseId}/certificates`} style={{ fontSize: 14 }}>Certificates and badges</Link></p>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <><Notice msg={msg} /><button type="button" style={S.btn} onClick={retry}>Try again</button></>
      ) : (
        <>
          <Notice msg={msg} />
          {adding && <AddColumn base={base} categories={data.categories} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); setMsg({ ok: true, text: "Column added." }); setTick((t) => t + 1); }} />}
          {edit && <GradeForm base={base} item={edit.item} learner={edit.learner} onCancel={() => setEdit(null)} onSaved={() => { setEdit(null); setMsg({ ok: true, text: "Grade saved." }); setTick((t) => t + 1); }} />}
          {!adding && <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={S.btnPrimary} onClick={() => { setMsg(null); setAdding(true); }}>Add column</button><button type="button" style={S.btn} onClick={exportCsv}>Export CSV</button></div>}
          {data.learners.length === 0 ? <p style={{ color: C.muted, fontSize: 14 }}>No learners are enrolled in this course yet.</p> : (
            <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }} aria-label="Gradebook">
                <thead>
                  <tr>
                    <th scope="col" style={{ textAlign: "left", padding: 8, position: "sticky", left: 0, background: C.card }}>Learner</th>
                    {data.items.map((i) => (
                      <th key={i.id} scope="col" style={{ padding: 8, textAlign: "center", minWidth: 110, verticalAlign: "top" }}>
                        <div>{i.title}</div>
                        <div style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>out of {i.maxPoints}{i.categoryId && catName(i.categoryId) ? ` · ${catName(i.categoryId)}` : ""}</div>
                        <button type="button" style={{ ...S.btn, minHeight: 32, padding: "2px 8px", fontSize: 12, marginTop: 4 }} onClick={() => toggleRelease(i)} aria-label={`${i.released ? "Hide" : "Release"} ${i.title}`}>{i.released ? "Released" : "Hidden"}</button>
                      </th>
                    ))}
                    <th scope="col" style={{ padding: 8, textAlign: "center" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.learners.map((l) => (
                    <tr key={l.studentId} style={{ borderTop: `1px solid ${C.border}` }}>
                      <th scope="row" style={{ textAlign: "left", padding: 8, position: "sticky", left: 0, background: C.card, fontWeight: 600 }}>
                        {l.name || `Learner ${l.studentId}`}{l.admissionNo ? <span style={{ fontWeight: 400, color: C.muted }}> · {l.admissionNo}</span> : null}
                      </th>
                      {data.items.map((i) => (
                        <td key={i.id} style={{ padding: 4, textAlign: "center" }}>
                          <button type="button" style={{ ...S.btn, minWidth: 56, padding: "4px 8px" }} onClick={() => { setMsg(null); setEdit({ item: i, learner: l }); }}
                            aria-label={`Grade for ${l.name || l.studentId}, ${i.title}: ${cellText(l.grades[i.id])}`}>{cellText(l.grades[i.id])}</button>
                        </td>
                      ))}
                      <td style={{ padding: 8, textAlign: "center", fontWeight: 600 }}>{pct(l.percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.items.length === 0 && data.learners.length > 0 && <p style={{ color: C.muted, fontSize: 14 }}>There are no grade columns yet. Add one to start grading.</p>}
          <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
          <Results base={base} onMsg={setMsg} />
          <Manage base={base} categories={data.categories} items={data.items} onChanged={() => setTick((t) => t + 1)} onMsg={setMsg} />
        </>
      )}
    </div>
  );
}
