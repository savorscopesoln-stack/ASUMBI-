import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import UpgradePrompt, { isModuleNotLicensed } from "../components/UpgradePrompt";
import { ensureThemeTokens } from "../utils/themeTokens";

ensureThemeTokens();

/* LMS administration (L1.4): terminology, late policy, file limits, enrolment default,
   course approval, grading-scale reference, and HOD permission grants.
   Backend: /api/lms/* (protect -> requireModule('lms') -> requireLmsPermission). */

const TERMS = ["course", "section", "lesson", "assignment", "quiz", "student", "teacher"];
const GRANTABLE = [
  ["lms.course.approve", "Approve / return courses (HOD)"],
  ["lms.analytics.department", "View department analytics (HOD)"],
  ["lms.enrolment.manage", "Manage enrolment"],
  ["lms.gradebook.view", "View gradebooks"],
  ["lms.course.delete", "Delete courses"],
];
const box = { border: "1px solid var(--border)", borderRadius: "var(--radius, 14px)", padding: 16, marginBottom: 16, background: "var(--card)", boxShadow: "var(--shadow-sm)" };
const input = { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" };
const label = { display: "block", fontSize: 13, fontWeight: 600, margin: "10px 0 4px" };

export default function LmsAdmin() {
  const navigate = useNavigate();
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | forbidden | error
  const [refusal, setRefusal] = useState("");
  const [s, setS] = useState(null);
  const [scales, setScales] = useState([]);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [saving, setSaving] = useState(false);
  const [grant, setGrant] = useState({ userSource: "Teachers", userId: "", codes: [] });

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([API.get("/lms/settings"), API.get("/lms/grading-systems")]);
      setS(a.data.settings); setScales(b.data.gradingSystems || []); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else if (e?.response?.status === 403) { setRefusal(e?.response?.data?.message || ""); setState("forbidden"); }
      else setState("error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const body = {
        terminology: s.terminology, gradingSystemId: s.gradingSystemId, lateSubmission: s.lateSubmission,
        latePenaltyPercent: Number(s.latePenaltyPercent), storageQuotaMb: Number(s.storageQuotaMb),
        files: { maxFileMb: Number(s.files.maxFileMb), allowedExtensions: s.files.allowedExtensions },
        enrolment: s.enrolment, courseApprovalRequired: !!s.courseApprovalRequired,
      };
      const r = await API.put("/lms/settings", body);
      setS(r.data.settings); setMsg({ ok: true, text: "Settings saved." });
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.message || "Could not save. Please try again." }); }
    finally { setSaving(false); }
  };

  const loadGrant = async () => {
    setMsg(null);
    try {
      const r = await API.get("/lms/grants", { params: { userSource: grant.userSource, userId: grant.userId } });
      setGrant((g) => ({ ...g, codes: r.data.permissionCodes }));
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.message || "Could not load permissions." }); }
  };
  const saveGrant = async () => {
    setMsg(null);
    try {
      await API.put("/lms/grants", { userSource: grant.userSource, userId: Number(grant.userId), permissionCodes: grant.codes });
      setMsg({ ok: true, text: "Permissions saved." });
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.message || "Could not save permissions." }); }
  };

  if (state === "loading") return <p style={{ padding: 24 }}>Loading…</p>;
  if (state === "unlicensed") return <UpgradePrompt module="lms" onBack={() => navigate(-1)} />;
  if (state === "forbidden") return <p style={{ padding: 24 }}>You do not have permission to manage LMS settings.{refusal ? ` ${refusal}` : ""} Platform (master) logins cannot open school LMS settings; sign in with the school's own admin account.</p>;
  if (state === "error") return <p style={{ padding: 24 }}>Could not load LMS settings. <button type="button" onClick={load}>Retry</button></p>;

  const set = (path, v) => setS((x) => { const n = JSON.parse(JSON.stringify(x)); let o = n; path.slice(0, -1).forEach((k) => { o = o[k]; }); o[path.at(-1)] = v; return n; });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 16, color: "var(--text)", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 22 }}>LMS settings</h1>
      <p><button type="button" onClick={() => navigate("/lms/department")} style={{ minHeight: 44, padding: "0 14px" }}>Department dashboards</button> <button type="button" onClick={() => navigate("/lms/guardian")} style={{ minHeight: 44, padding: "0 14px" }}>Guardian links</button></p>
      <div aria-live="polite" style={{ minHeight: 24, color: msg?.ok ? "var(--success)" : "var(--destructive)" }}>{msg?.text}</div>

      <section style={box}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Names used in your institution</h2>
        {TERMS.map((k) => (
          <div key={k}><label style={label} htmlFor={`t-${k}`}>{k[0].toUpperCase() + k.slice(1)}</label>
            <input id={`t-${k}`} style={input} maxLength={40} value={s.terminology[k]} onChange={(e) => set(["terminology", k], e.target.value)} /></div>
        ))}
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Assessment and grading</h2>
        <label style={label} htmlFor="gs">Grading scale</label>
        <select id="gs" style={input} value={s.gradingSystemId ?? ""} onChange={(e) => set(["gradingSystemId"], e.target.value ? Number(e.target.value) : null)}>
          <option value="">Not set</option>
          {scales.map((g) => <option key={g.id} value={g.id}>{g.systemName}</option>)}
        </select>
        <label style={label} htmlFor="late">Late submissions</label>
        <select id="late" style={input} value={s.lateSubmission} onChange={(e) => set(["lateSubmission"], e.target.value)}>
          <option value="accept">Accept</option><option value="penalise">Accept with a penalty</option><option value="block">Block</option>
        </select>
        {s.lateSubmission === "penalise" && (<><label style={label} htmlFor="pen">Penalty (%)</label>
          <input id="pen" type="number" min="0" max="100" style={input} value={s.latePenaltyPercent} onChange={(e) => set(["latePenaltyPercent"], e.target.value)} /></>)}
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Files and storage</h2>
        <label style={label} htmlFor="mf">Largest file (MB)</label>
        <input id="mf" type="number" min="1" max="200" style={input} value={s.files.maxFileMb} onChange={(e) => set(["files", "maxFileMb"], e.target.value)} />
        <label style={label} htmlFor="ext">Allowed file types (comma separated)</label>
        <input id="ext" style={input} value={s.files.allowedExtensions.join(", ")} onChange={(e) => set(["files", "allowedExtensions"], e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
        <label style={label} htmlFor="q">Storage quota (MB)</label>
        <input id="q" type="number" min="1" style={input} value={s.storageQuotaMb} onChange={(e) => set(["storageQuotaMb"], e.target.value)} />
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Courses</h2>
        <label style={label} htmlFor="em">Default enrolment</label>
        <select id="em" style={input} value={s.enrolment.defaultMode} onChange={(e) => set(["enrolment", "defaultMode"], e.target.value)}>
          <option value="closed">Closed (staff enrol learners)</option><option value="approval">Needs approval</option><option value="open">Open</option>
        </select>
        <label style={{ ...label, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={!!s.courseApprovalRequired} onChange={(e) => set(["courseApprovalRequired"], e.target.checked)} /> Courses must be approved by a head of department before publishing
        </label>
      </section>

      <button type="button" onClick={save} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: 0, background: "var(--primary)", color: "var(--card)", fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Save settings"}</button>

      <section style={{ ...box, marginTop: 24 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Extra permissions (for example, heads of department)</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Teachers can already create and manage their own courses. Grant more here. Saving replaces the person's whole list.</p>
        <label style={label} htmlFor="gsrc">Account type</label>
        <select id="gsrc" style={input} value={grant.userSource} onChange={(e) => setGrant({ userSource: e.target.value, userId: "", codes: [] })}>
          <option value="Teachers">Teacher</option><option value="Users">Staff / admin user</option>
        </select>
        <label style={label} htmlFor="gid">Account ID (from the Teachers or Users page)</label>
        <input id="gid" type="number" min="1" style={input} value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} />
        <button type="button" onClick={loadGrant} disabled={!grant.userId} style={{ margin: "8px 0", padding: "6px 12px" }}>Load current permissions</button>
        {GRANTABLE.map(([code, text]) => (
          <label key={code} style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}>
            <input type="checkbox" checked={grant.codes.includes(code)} onChange={(e) => setGrant((g) => ({ ...g, codes: e.target.checked ? [...g.codes, code] : g.codes.filter((c) => c !== code) }))} /> {text}
          </label>
        ))}
        <button type="button" onClick={saveGrant} disabled={!grant.userId} style={{ marginTop: 8, padding: "8px 16px" }}>Save permissions</button>
      </section>
    </main>
  );
}
