import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useDebounced } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Guardian link manager (L9.5c, S116) at /lms/guardian, LMS administrators only (`lms.settings.manage`; flag lms_guardian). Frontend only. Backend:
   GET /lms/guardian/students/:id/links -> { links:[{id,label,createdAt,expiresAt,lastUsedAt,revoked,active}] } (newest 20); POST same {label?,days?(1-365, default 90)} -> 201 { link, secret, path }
   where path = /api/lms-guardian/<school>/<secret>.json (409 LINK_LIMIT: at most 5 live links); DELETE /lms/guardian/links/:linkId.
   The secret is returned ONCE: the guardian page address /g/<school>/<secret> is built here, shown once, never stored on the device.
   The learner is found through a course: GET /lms/courses?q then GET /lms/courses/:id/enrolments?status=active&q (both paged). Plain text only. */

const when = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString([], { dateStyle: "medium" }) : "never"; };
const ask = (t) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t) : true);
const schoolOf = (path) => { const m = /^\/api\/lms-guardian\/([^/]+)\/[a-f0-9]{48}\.json$/.exec(String(path || "")); return m ? m[1] : null; };

export default function GuardianLinks({ back = "/lms" }) {
  const [state, setState] = useState("ready"), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false); // ready | unlicensed
  const [cq, setCq] = useState(""), dcq = useDebounced(cq, 300), [courses, setCourses] = useState([]), [course, setCourse] = useState(null);
  const [lq, setLq] = useState(""), dlq = useDebounced(lq, 300), [cand, setCand] = useState([]), [learner, setLearner] = useState(null);
  const [links, setLinks] = useState(null), [label, setLabel] = useState(""), [days, setDays] = useState("90"), [fresh, setFresh] = useState(null);
  const fail = useCallback((e, fb) => { if (isModuleNotLicensed(e)) setState("unlicensed"); else setMsg({ ok: false, text: errText(e, fb) }); }, []);

  useEffect(() => {
    if (!dcq.trim()) return undefined; let alive = true;
    API.get("/lms/courses", { params: { q: dcq.trim(), page: 1, pageSize: 8 } }).then((r) => { if (alive) setCourses(r.data.items || []); }).catch((e) => { if (alive) { setCourses([]); fail(e, "Could not search courses."); } });
    return () => { alive = false; };
  }, [dcq, fail]);
  useEffect(() => {
    if (!course || !dlq.trim()) return undefined; let alive = true;
    API.get(`/lms/courses/${course.id}/enrolments`, { params: { status: "active", q: dlq.trim(), page: 1, pageSize: 10 } }).then((r) => { if (alive) setCand(r.data.students || []); }).catch((e) => { if (alive) { setCand([]); fail(e, "Could not search learners."); } });
    return () => { alive = false; };
  }, [course, dlq, fail]);

  const loadLinks = useCallback(async (s) => {
    try { const r = await API.get(`/lms/guardian/students/${s.studentId}/links`); setLinks(r.data.links || []); }
    catch (e) { setLinks([]); fail(e, "Could not load the links."); }
  }, [fail]);
  const chooseLearner = (s) => { setLearner(s); setCand([]); setLq(""); setFresh(null); setMsg(null); setLinks(null); loadLinks(s); };
  const create = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null); setFresh(null);
    try {
      const body = { days: Number(days) }; if (label.trim()) body.label = label.trim();
      const r = await API.post(`/lms/guardian/students/${learner.studentId}/links`, body);
      const school = schoolOf(r.data.path);
      if (!school) { setMsg({ ok: false, text: "The link was made but its address could not be built. Revoke it and try again." }); }
      else setFresh({ url: `${window.location.origin}/g/${school}/${r.data.secret}`, expiresAt: r.data.link?.expiresAt });
      setLabel(""); await loadLinks(learner);
    } catch (er) { fail(er, "Could not create the link."); } finally { setBusy(false); }
  };
  const revoke = async (l) => {
    if (!ask(`Revoke the link${l.label ? ` “${l.label}”` : ""}? Anyone using it will lose access straight away.`)) return;
    setBusy(true);
    try { await API.delete(`/lms/guardian/links/${l.id}`); setMsg({ ok: true, text: "Link revoked." }); await loadLinks(learner); }
    catch (e) { fail(e, "Could not revoke the link."); } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(fresh.url); setMsg({ ok: true, text: "Link copied." }); } catch { setMsg({ ok: false, text: "Could not copy. Select the link and copy it by hand." }); } };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;
  return (
    <div style={S.page}>
      <p style={{ margin: "0 0 6px", fontSize: 14 }}><Link to={back}>← LMS settings</Link></p>
      <h1 style={S.h1}>Guardian links</h1>
      <p style={S.sub}>Give a guardian a private link that shows one learner’s progress and missed work. No login, no grades. Anyone with the link can open it, so share it only with the guardian.</p>
      <Notice msg={msg} />
      <section aria-labelledby="gl-find" style={{ ...S.box, marginBottom: 14 }}>
        <h2 id="gl-find" style={{ fontSize: 16, margin: "0 0 6px" }}>1. Find the learner</h2>
        <label style={S.label} htmlFor="gl-course">Search for one of their courses</label>
        <input id="gl-course" style={{ ...S.input, width: "100%", maxWidth: 360 }} value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Course name or code" />
        {dcq.trim() && courses.length > 0 && <ul aria-label="Matching courses" style={{ margin: "6px 0", padding: 0 }}>{courses.map((c) => <li key={c.id} style={{ listStyle: "none", padding: "2px 0" }}><button type="button" style={S.btn} onClick={() => { setCourse(c); setCourses([]); setCq(""); setLearner(null); setLinks(null); setFresh(null); }}>{c.title}{c.code ? ` (${c.code})` : ""}</button></li>)}</ul>}
        {course && <>
          <p style={{ fontSize: 14, margin: "8px 0 0" }}>Course: <strong>{course.title}</strong></p>
          <label style={S.label} htmlFor="gl-learner">Search for the learner</label>
          <input id="gl-learner" style={{ ...S.input, width: "100%", maxWidth: 360 }} value={lq} onChange={(e) => setLq(e.target.value)} placeholder="Type a name" />
          {dlq.trim() && cand.length > 0 && <ul aria-label="Matching learners" style={{ margin: "6px 0", padding: 0 }}>{cand.map((s) => <li key={s.studentId} style={{ listStyle: "none", padding: "2px 0" }}><button type="button" style={S.btn} onClick={() => chooseLearner(s)}>{s.name}{s.admissionNo ? ` (${s.admissionNo})` : ""}</button></li>)}</ul>}
        </>}
      </section>
      {learner && (
        <section aria-labelledby="gl-links" style={S.box}>
          <h2 id="gl-links" style={{ fontSize: 16, margin: "0 0 6px" }}>2. Links for {learner.name}</h2>
          <form onSubmit={create} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
            <div><label style={S.label} htmlFor="gl-label">Who is it for? (only you see this)</label><input id="gl-label" style={S.input} maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Mother" /></div>
            <div><label style={S.label} htmlFor="gl-days">Valid for (days, 1 to 365)</label><input id="gl-days" style={{ ...S.input, width: 90 }} type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} /></div>
            <button type="submit" style={S.btnPrimary} disabled={busy || !(Number(days) >= 1 && Number(days) <= 365)}>Create link</button>
          </form>
          {fresh && (
            <div role="status" style={{ ...S.box, marginBottom: 12 }}>
              <strong>Copy this link now. It is shown only once.</strong>
              <p style={{ wordBreak: "break-all", fontSize: 14, margin: "6px 0" }}>{fresh.url}</p>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 6px" }}>Works until {when(fresh.expiresAt)}.</p>
              <button type="button" style={S.btn} onClick={copy}>Copy link</button>
            </div>)}
          {links === null ? <Skeleton rows={2} /> : links.length === 0 ? <p style={{ color: C.muted, margin: 0 }}>No links yet.</p> : (
            <ul aria-label="Links" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {links.map((l) => (
                <li key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 8, fontSize: 14 }}>
                  <span><strong>{l.label || "No label"}</strong> · {l.revoked ? "Revoked" : l.active ? "Active" : "Expired"}<br /><span style={{ fontSize: 13, color: C.muted }}>Made {when(l.createdAt)} · expires {when(l.expiresAt)} · last opened {when(l.lastUsedAt)}</span></span>
                  {l.active && <button type="button" style={S.btn} disabled={busy} aria-label={`Revoke link ${l.label || l.id}`} onClick={() => revoke(l)}>Revoke</button>}
                </li>))}
            </ul>)}
        </section>)}
    </div>
  );
}
