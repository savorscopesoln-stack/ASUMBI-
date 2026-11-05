import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Teacher Certificates and badges /teacher/courses/:courseId/certificates (L7.5a + L7.5b UI, S85). Frontend only. Backend (flag lms_gradebook):
     GET  /lms/courses/:id/gradebook/certificates?page&pageSize          (lms.gradebook.view)    -> { items:[{id,name,admissionNo,code,percent,grade,issuedAt,revoked,revokedReason}], total, page, pageSize }
     POST /lms/courses/:id/gradebook/certificates/issue {dryRun?}        (lms.gradebook.publish) -> { dryRun?, wouldIssue | issued, learners, eligible, alreadyIssued, notEligible:{reason:n}, passMark }
     POST /lms/courses/:id/gradebook/certificates/:certId/revoke {reason} (lms.gradebook.publish)
     GET/POST /gradebook/badges, PATCH/DELETE /gradebook/badges/:id, POST /gradebook/badges/award {badgeId?, dryRun?}  (create/edit/remove/award = lms.course.manage)
   Issuing and awarding are explicit staff actions, safe to repeat (server never duplicates). A badge rule cannot be changed after creation (server rule), so edit only offers name, description and active.
   Every server sentence is shown as it comes. NOT here: certificate PDF/print, verify page. */

const PAGE_SIZE = 20;
const RULE = { course_complete: "Completes the course", grade_at_least: "Final grade at least", lessons_completed: "Completes at least this many lessons" };
const day = (v) => (v ? String(v).slice(0, 10) : "");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Certificates({ base }) {
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(null); // { id, reason }

  const load = useCallback(async () => {
    try { const r = await API.get(`${base}/certificates`, { params: { page, pageSize: PAGE_SIZE } }); setData(r.data); setState("ready"); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the certificates.") }); setState("error"); }
  }, [base, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const issue = async (dryRun) => {
    if (!dryRun && !window.confirm("Issue certificates to every learner who qualifies? Learners who already have one are not given another.")) return;
    setBusy(true); setMsg(null);
    try { const r = await API.post(`${base}/certificates/issue`, { dryRun }); setRes({ dryRun, d: r.data }); if (!dryRun) { setPage(1); await load(); } }
    catch (e) { setRes(null); setMsg({ ok: false, text: errText(e, dryRun ? "Could not check who qualifies." : "Could not issue the certificates. Nothing was changed.") }); }
    setBusy(false);
  };
  const revoke = async () => {
    const reason = (revoking.reason || "").trim();
    if (!reason) { setMsg({ ok: false, text: "Write a reason before revoking (up to 300 characters)." }); return; }
    setBusy(true); setMsg(null);
    try { await API.post(`${base}/certificates/${revoking.id}/revoke`, { reason }); setRevoking(null); setMsg({ ok: true, text: "Certificate revoked." }); await load(); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not revoke the certificate.") }); }
    setBusy(false);
  };
  const d = res && res.d;
  const why = d && d.notEligible ? Object.entries(d.notEligible) : [];
  return (
    <section aria-label="Certificates" style={S.box}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Completion certificates</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.muted }}>Learners who finish the lessons and reach the pass mark qualify. Check first to see who, then issue.</p>
      <Notice msg={msg} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={S.btn} disabled={busy} onClick={() => issue(true)}>Check who qualifies</button>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => issue(false)}>Issue certificates</button>
      </div>
      {d && (
        <div role="status" aria-live="polite" style={{ marginTop: 10, fontSize: 14 }}>
          <p style={{ margin: 0 }}>{d.dryRun ? `Nothing was written. ${plural(d.wouldIssue, "certificate")} would be issued.` : `Issued ${plural(d.issued, "certificate")}.`} {d.eligible} of {plural(d.learners, "learner")} qualify{d.alreadyIssued ? `, ${d.alreadyIssued} already have one` : ""}. Pass mark {d.passMark}%.</p>
          {why.length > 0 && <p style={{ margin: "6px 0 0", color: C.muted }}>Not qualifying: {why.map(([k, n]) => `${n} ${String(k).replace(/_/g, " ").toLowerCase()}`).join("; ")}.</p>}
        </div>
      )}
      <h3 style={{ fontSize: 15, margin: "14px 0 6px" }}>Issued certificates</h3>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button>
      ) : (data.items || []).length === 0 ? <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No certificates issued yet.</p> : (
        <>
          <ul aria-label="Issued certificates" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {data.items.map((c) => (
              <li key={c.id} style={{ fontSize: 14, borderTop: `1px solid ${C.border || "#e5e7eb"}`, paddingTop: 6 }}>
                <strong>{c.name || "Learner"}</strong>{c.admissionNo ? ` (${c.admissionNo})` : ""} · code {c.code}{c.percent !== null && c.percent !== undefined ? ` · ${c.percent}%` : ""}{c.grade ? ` · ${c.grade}` : ""} · issued {day(c.issuedAt)}
                {c.revoked ? <span style={{ color: C.warn }}> · Revoked{c.revokedReason ? `: ${c.revokedReason}` : ""}</span> : revoking && revoking.id === c.id ? (
                  <span style={{ display: "block", marginTop: 4 }}>
                    <label>Reason for revoking <input aria-label="Reason for revoking" maxLength={300} value={revoking.reason} onChange={(e) => setRevoking({ id: c.id, reason: e.target.value })} style={{ minWidth: 220 }} /></label>{" "}
                    <button type="button" style={S.btnPrimary} disabled={busy} onClick={revoke}>Revoke certificate</button>{" "}
                    <button type="button" style={S.btn} onClick={() => setRevoking(null)}>Cancel</button>
                  </span>
                ) : <>{" "}<button type="button" style={S.btn} aria-label={`Revoke certificate for ${c.name || "learner"}`} onClick={() => { setMsg(null); setRevoking({ id: c.id, reason: "" }); }}>Revoke</button></>}
              </li>
            ))}
          </ul>
          <Pager page={page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPage={setPage} />
        </>
      )}
    </section>
  );
}

function Badges({ base }) {
  const [state, setState] = useState("loading");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", ruleType: "course_complete", ruleValue: "" });

  const load = useCallback(async () => {
    try { const r = await API.get(`${base}/badges`); setItems(r.data.items || []); setState("ready"); }
    catch (e) { setMsg({ ok: false, text: errText(e, "Could not load the badges.") }); setState("error"); }
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, fail, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); await load(); return true; }
    catch (e) { setMsg({ ok: false, text: errText(e, fail) }); return false; }
    finally { setBusy(false); }
  };
  const create = async (ev) => {
    ev.preventDefault();
    const body = { name: form.name.trim(), ruleType: form.ruleType };
    if (form.description.trim()) body.description = form.description.trim();
    if (form.ruleType !== "course_complete") body.ruleValue = Number(form.ruleValue);
    if (await act(() => API.post(`${base}/badges`, body), "Could not create the badge.", "Badge created.")) setForm({ name: "", description: "", ruleType: "course_complete", ruleValue: "" });
  };
  const award = async (badgeId, dryRun) => {
    if (!dryRun && !window.confirm(badgeId ? "Award this badge to every learner who has earned it?" : "Award every active badge to the learners who have earned it?")) return;
    setBusy(true); setMsg(null);
    try { const r = await API.post(`${base}/badges/award`, badgeId ? { badgeId, dryRun } : { dryRun }); setRes({ dryRun, d: r.data }); if (!dryRun) await load(); }
    catch (e) { setRes(null); setMsg({ ok: false, text: errText(e, dryRun ? "Could not check who has earned badges." : "Could not award the badges. Nothing was changed.") }); }
    setBusy(false);
  };
  const remove = (b) => { if (window.confirm(`Remove the badge "${b.name}"? Learners who earned it will no longer see it.`)) act(() => API.delete(`${base}/badges/${b.id}`), "Could not remove the badge.", "Badge removed."); };
  const rename = (b) => { const name = window.prompt("New badge name", b.name); if (name && name.trim() && name.trim() !== b.name) act(() => API.patch(`${base}/badges/${b.id}`, { name: name.trim() }), "Could not rename the badge.", "Badge renamed."); };
  const d = res && res.d;
  return (
    <section aria-label="Badges" style={{ ...S.box, marginTop: 16 }}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Badges</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.muted }}>A badge has one rule, set when you create it and fixed after that. Turn a badge off to stop awarding it; learners keep what they earned.</p>
      <Notice msg={msg} />
      <form onSubmit={create} aria-label="New badge" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, maxWidth: 420 }}>
        <label>Badge name <input aria-label="Badge name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%" }} /></label>
        <label>Description (optional) <input aria-label="Badge description" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: "100%" }} /></label>
        <label>Earned when the learner <select aria-label="Badge rule" value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value, ruleValue: "" })}>{Object.entries(RULE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {form.ruleType !== "course_complete" && <label>{form.ruleType === "grade_at_least" ? "Percent (1 to 100)" : "Lessons (1 to 500)"} <input aria-label="Rule value" type="number" min="1" max={form.ruleType === "grade_at_least" ? 100 : 500} step="1" required value={form.ruleValue} onChange={(e) => setForm({ ...form, ruleValue: e.target.value })} /></label>}
        <div><button type="submit" style={S.btnPrimary} disabled={busy}>Create badge</button></div>
      </form>
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={() => { setState("loading"); setMsg(null); load(); }}>Try again</button>
      ) : items.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: C.muted }}>No badges yet. Create one above.</p> : (
        <>
          <ul aria-label="Course badges" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((b) => (
              <li key={b.id} style={{ fontSize: 14, borderTop: `1px solid ${C.border || "#e5e7eb"}`, paddingTop: 6 }}>
                <strong>{b.name}</strong>{b.active ? "" : " (off)"} · {RULE[b.ruleType] || b.ruleType}{b.ruleValue !== null && b.ruleValue !== undefined ? ` ${b.ruleValue}${b.ruleType === "grade_at_least" ? "%" : ""}` : ""} · awarded to {b.awarded}
                {b.description ? <span style={{ display: "block", fontSize: 13, color: C.muted }}>{b.description}</span> : null}
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Rename ${b.name}`} onClick={() => rename(b)}>Rename</button>
                  <button type="button" style={S.btn} disabled={busy} aria-label={`${b.active ? "Turn off" : "Turn on"} ${b.name}`} onClick={() => act(() => API.patch(`${base}/badges/${b.id}`, { active: !b.active }), "Could not change the badge.", b.active ? "Badge turned off." : "Badge turned on.")}>{b.active ? "Turn off" : "Turn on"}</button>
                  <button type="button" style={S.btn} disabled={busy} aria-label={`Remove ${b.name}`} onClick={() => remove(b)}>Remove</button>
                  {b.active && <button type="button" style={S.btn} disabled={busy} aria-label={`Check who has earned ${b.name}`} onClick={() => award(b.id, true)}>Check who earned it</button>}
                  {b.active && <button type="button" style={S.btn} disabled={busy} aria-label={`Award ${b.name}`} onClick={() => award(b.id, false)}>Award</button>}
                </span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={S.btn} disabled={busy} onClick={() => award(undefined, true)}>Check all badges</button>
            <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => award(undefined, false)}>Award all badges</button>
          </div>
        </>
      )}
      {d && <div role="status" aria-live="polite" style={{ marginTop: 10, fontSize: 14 }}>{d.dryRun ? `Nothing was written. ${plural(d.wouldAward || 0, "badge")} would be awarded.` : `Awarded ${plural(d.awarded || 0, "badge")}.`}</div>}
    </section>
  );
}

export default function CourseCertificates() {
  const { courseId } = useParams();
  const base = `/lms/courses/${courseId}/gradebook`;
  const [lic, setLic] = useState(true);
  // The two sections load themselves; a licence refusal is detected by a cheap probe of the badge list.
  useEffect(() => { API.get(`${base}/badges`).catch((e) => { if (isModuleNotLicensed(e)) setLic(false); }); }, [base]);
  if (!lic) return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Certificates and badges</h1>
      <p style={{ margin: "0 0 10px" }}><Link to={`/teacher/courses/${courseId}/gradebook`} style={{ fontSize: 14 }}>Back to gradebook</Link></p>
      <Certificates base={base} />
      <Badges base={base} />
    </div>
  );
}
