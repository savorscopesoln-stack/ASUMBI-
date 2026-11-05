import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useDebounced } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher course groups (L8.2c, S95). Frontend only. Backend (L8.2a): under /lms/courses/:id/groups:
   GET -> {items:[{id,name,position,memberCount}], unassigned}; POST {name}; PATCH /:g {name}; DELETE /:g (members are released, rows kept);
   POST /allocate {groups, seed?, dryRun?, replace?} -> {seed, learners, groups:[{name,size}], placed?} (same learners + same seed = same groups; 409 GROUPS_EXIST unless replace);
   GET /:g/members?page -> {items:[{studentId,name,admissionNo}], total}; PUT /:g/members {studentIds} (adding a learner who is in another group MOVES them) -> {added,moved,unchanged,skipped};
   DELETE /:g/members/:studentId. Learners to add come from GET /lms/courses/:id/enrolments?status=active&q (staff roster). Write actions need `lms.course.manage` (403 message shown). Plain text only. Online only. */

const PS = 20;
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);

function Members({ base, courseId, group, onChanged, setMsg }) {
  const [page, setPage] = useState(1), [data, setData] = useState({ items: [], total: 0 }), [state, setState] = useState("loading"), [tick, setTick] = useState(0), [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""), dq = useDebounced(q, 300), [cand, setCand] = useState([]), [pick, setPick] = useState({});
  useEffect(() => {
    let alive = true;
    API.get(`${base}/${group.id}/members`, { params: { page, pageSize: PS } }).then((r) => { if (alive) { setData({ items: r.data.items || [], total: r.data.total || 0 }); setState("ready"); } }).catch((e) => { if (alive) { setMsg({ ok: false, text: errText(e, "Could not load members.") }); setState("error"); } });
    return () => { alive = false; };
  }, [base, group.id, page, tick, setMsg]);
  useEffect(() => {
    if (!dq.trim()) { setCand([]); return undefined; }
    let alive = true;
    API.get(`/lms/courses/${courseId}/enrolments`, { params: { status: "active", q: dq.trim(), page: 1, pageSize: 10 } }).then((r) => { if (alive) setCand(r.data.students || []); }).catch(() => { if (alive) setCand([]); });
    return () => { alive = false; };
  }, [courseId, dq]);
  const ids = Object.keys(pick).filter((k) => pick[k]).map(Number);
  const add = async () => {
    setBusy(true);
    try { const r = await API.put(`${base}/${group.id}/members`, { studentIds: ids }); setMsg({ ok: true, text: `Added ${r.data.added || 0}, moved ${r.data.moved || 0}${r.data.skipped ? `, skipped ${r.data.skipped}` : ""}.` }); setPick({}); setQ(""); setTick((t) => t + 1); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not add learners.") }); } finally { setBusy(false); }
  };
  const remove = async (m) => {
    setBusy(true);
    try { await API.delete(`${base}/${group.id}/members/${m.studentId}`); setMsg({ ok: true, text: "Learner removed from the group." }); setTick((t) => t + 1); onChanged(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not remove the learner.") }); } finally { setBusy(false); }
  };
  return (
    <section aria-label={`Members of ${group.name}`} style={{ ...S.box, marginTop: 12 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>{group.name}: members</h2>
      {state === "loading" ? <Skeleton rows={2} /> : data.items.length === 0 ? <p style={{ color: C.muted }}>No learners in this group yet.</p> : (
        <ul aria-label="Members" style={{ padding: 0, margin: 0 }}>
          {data.items.map((m) => (
            <li key={m.studentId} style={{ listStyle: "none", display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
              <span>{m.name}{m.admissionNo ? ` (${m.admissionNo})` : ""}</span>
              <button type="button" style={{ ...S.btn, minHeight: 32 }} disabled={busy} aria-label={`Remove ${m.name} from ${group.name}`} onClick={() => remove(m)}>Remove</button>
            </li>))}
        </ul>)}
      <Pager page={page} pageSize={PS} total={data.total} onPage={setPage} busy={false} />
      <label style={S.label} htmlFor="g-find">Add learners (search by name or admission number)</label>
      <input id="g-find" style={{ ...S.input, width: "100%" }} value={q} onChange={(e) => setQ(e.target.value)} />
      {cand.length > 0 && (
        <ul aria-label="Search results" style={{ padding: 0, margin: "8px 0 0" }}>
          {cand.map((s) => (
            <li key={s.studentId} style={{ listStyle: "none", fontSize: 14, padding: "4px 0" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={!!pick[s.studentId]} onChange={(e) => setPick({ ...pick, [s.studentId]: e.target.checked })} />{s.name}{s.admissionNo ? ` (${s.admissionNo})` : ""}{s.className ? ` · ${s.className}` : ""}</label>
            </li>))}
        </ul>)}
      {dq.trim() && cand.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No matching enrolled learners.</p>}
      <p style={{ fontSize: 12, color: C.muted }}>A learner who is already in another group is moved here.</p>
      <button type="button" style={S.btnPrimary} disabled={busy || ids.length === 0} onClick={add}>{ids.length ? `Add ${ids.length} selected` : "Add selected"}</button>
    </section>
  );
}

export default function CourseGroups() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/groups`;
  const [data, setData] = useState({ items: [], unassigned: 0 }), [state, setState] = useState("loading"), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [name, setName] = useState(""), [open, setOpen] = useState(null), [edit, setEdit] = useState(null);
  const [n, setN] = useState("4"), [seed, setSeed] = useState(""), [plan, setPlan] = useState(null);

  const load = useCallback(async () => {
    try { const r = await API.get(base); setData({ items: r.data.items || [], unassigned: r.data.unassigned || 0 }); setState("ready"); }
    catch (e) { if (isModuleNotLicensed(e)) setState("unlicensed"); else { setMsg({ ok: false, text: errText(e, "Could not load groups.") }); setState("error"); } }
  }, [base]);
  // load() sets state only after the await (same pattern as the other LMS screens)
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okText) => { setBusy(true); try { const r = await fn(); setMsg({ ok: true, text: okText }); await load(); return r; } catch (e) { setMsg({ ok: false, text: errText(e, "That did not work. Please try again.") }); return null; } finally { setBusy(false); } };
  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  const count = Number(n), bodyFor = (extra) => ({ groups: count, ...(seed.trim() ? { seed: seed.trim() } : {}), ...extra });
  const preview = async () => { setBusy(true); try { const r = await API.post(`${base}/allocate`, bodyFor({ dryRun: true })); setPlan(r.data); setMsg(null); } catch (e) { setPlan(null); setMsg({ ok: false, text: errText(e, "Could not preview.") }); } finally { setBusy(false); } };
  const makeGroups = async () => {
    const exists = data.items.length > 0;
    if (exists && !ask("This replaces the current groups. Learners are released and placed again. Continue?")) return;
    const r = await act(() => API.post(`${base}/allocate`, bodyFor(exists ? { replace: true, ...(plan ? { seed: plan.seed } : {}) } : (plan ? { seed: plan.seed } : {}))), "Groups created.");
    if (r) { setPlan(null); setOpen(null); }
  };

  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to="/teacher/courses">← My courses</Link></p>
      <h1 style={S.h1}>Groups</h1>
      <p style={S.sub}>Put learners in groups for group forums and group work. A learner is in one group at a time.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton /> : state === "error" ? <button type="button" style={S.btn} onClick={() => { setState("loading"); load(); }}>Try again</button> : (
        <>
          <p style={{ fontSize: 14 }}>{data.items.length} group{data.items.length === 1 ? "" : "s"} · {data.unassigned} learner{data.unassigned === 1 ? "" : "s"} not in a group</p>
          <form style={{ ...S.box, margin: "0 0 12px", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }} onSubmit={async (e) => { e.preventDefault(); const t = name.trim(); if (!t) return; if (await act(() => API.post(base, { name: t }), "Group created.")) setName(""); }}>
            <div style={{ flex: 1, minWidth: 180 }}><label style={S.label} htmlFor="g-name">New group name</label><input id="g-name" style={{ ...S.input, width: "100%" }} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <button type="submit" style={S.btnPrimary} disabled={busy || !name.trim()}>Add group</button>
          </form>
          {data.items.length === 0 ? <p style={{ color: C.muted }}>No groups yet. Add one above, or make groups automatically below.</p> : (
            <ul aria-label="Groups" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
              {data.items.map((g) => (
                <li key={g.id} style={{ ...S.box, listStyle: "none" }}>
                  {edit && edit.id === g.id ? (
                    <form style={{ display: "flex", gap: 8, flexWrap: "wrap" }} onSubmit={async (e) => { e.preventDefault(); const t = edit.name.trim(); if (!t) return; if (await act(() => API.patch(`${base}/${g.id}`, { name: t }), "Group renamed.")) setEdit(null); }}>
                      <input aria-label="Group name" style={{ ...S.input, flex: 1 }} maxLength={100} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                      <button type="submit" style={S.btnPrimary} disabled={busy || !edit.name.trim()}>Save</button><button type="button" style={S.btn} onClick={() => setEdit(null)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <strong>{g.name}</strong> <span style={{ fontSize: 13, color: C.muted }}>· {g.memberCount} member{g.memberCount === 1 ? "" : "s"}</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <button type="button" style={S.btn} aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>{open === g.id ? `Close ${g.name}` : `Members of ${g.name}`}</button>
                        <button type="button" style={S.btn} onClick={() => setEdit({ id: g.id, name: g.name })} aria-label={`Rename ${g.name}`}>Rename</button>
                        <button type="button" style={S.btn} disabled={busy} aria-label={`Delete ${g.name}`} onClick={() => { if (ask(`Delete the group "${g.name}"? Its learners will not be in any group.`)) act(() => API.delete(`${base}/${g.id}`), "Group deleted."); }}>Delete</button>
                      </div>
                    </>)}
                  {open === g.id && <Members base={base} courseId={courseId} group={g} onChanged={load} setMsg={setMsg} />}
                </li>))}
            </ul>)}
          <section aria-label="Make groups automatically" style={{ ...S.box, marginTop: 16 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Make groups automatically</h2>
            <p style={{ ...S.sub, margin: "0 0 8px" }}>Enrolled learners are dealt out evenly. The same seed always gives the same groups.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div><label style={S.label} htmlFor="a-n">Number of groups (2-50)</label><input id="a-n" type="number" min={2} max={50} style={{ ...S.input, width: 110 }} value={n} onChange={(e) => { setN(e.target.value); setPlan(null); }} /></div>
              <div><label style={S.label} htmlFor="a-seed">Seed (optional)</label><input id="a-seed" style={{ ...S.input, width: 160 }} maxLength={50} value={seed} onChange={(e) => { setSeed(e.target.value); setPlan(null); }} /></div>
              <button type="button" style={S.btn} disabled={busy || !(count >= 2 && count <= 50)} onClick={preview}>Preview</button>
            </div>
            {plan && (
              <div role="status" style={{ marginTop: 10, fontSize: 14 }}>
                <p style={{ margin: "0 0 4px" }}>Preview (nothing saved): {plan.learners} learners in {plan.groups.length} groups. Seed: <code>{plan.seed}</code></p>
                <ul aria-label="Preview" style={{ margin: 0, paddingLeft: 18 }}>{plan.groups.map((g, i) => <li key={i}>{g.name}: {g.size}</li>)}</ul>
                <button type="button" style={{ ...S.btnPrimary, marginTop: 8 }} disabled={busy} onClick={makeGroups}>Create these groups</button>
              </div>)}
          </section>
        </>)}
    </div>
  );
}
