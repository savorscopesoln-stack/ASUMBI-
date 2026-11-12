import React, { useEffect, useState } from "react";
import API from "../api";
import StudentDownloadHub from "../components/StudentDownloadHub";
import PassportPhotoStep from "../components/PassportPhotoStep";

/* =========================================================================
   REPORT DOWNLOAD  —  /report-download   (public, no portal login)

   Behaves like /take-assessment: nobody signs in to the portal and there is
   no password. The student types their username, and the server (POST
   /report-access/verify) answers with one of two things:

     1. "profile_required"  – their profile was never filled in. They fill it
                              in right here (POST /report-access/profile) and
                              the download stays locked until it is saved.
     2. "photo_required"    – no passport photo on file yet. They upload one or
                              take one with the camera right here (POST
                              /report-access/photo) and the download unlocks.
     3. "ready"             – a 2-hour REPORT-ONLY session. It lives in this
                              tab's sessionStorage (never localStorage), so it
                              cannot sign anyone in to, or out of, the normal
                              portal on a shared computer. api.js and
                              StudentReport.jsx use it only on this path.

   Then the normal report form (with its own Download PDF button) is shown.
   Nothing is remembered: reloading the page asks for the details again, which
   is what you want on a shared lab computer.
========================================================================= */

const SESSION_KEYS = ["report_link_token", "report_link_user"];
const clearSession = () => SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));

const S = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" },
  card: { width: "100%", maxWidth: 420, background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 14, padding: "28px 24px", boxShadow: "0 8px 30px rgba(15,23,42,0.06)" },
  h1: { margin: "0 0 6px", fontSize: 21, fontWeight: 800 },
  sub: { margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: "var(--text-muted, #64748b)" },
  field: { marginBottom: 14 },
  label: { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 15, borderRadius: 9, border: "1px solid var(--border, #cbd5e1)", background: "var(--input-bg, #fff)", color: "inherit", outline: "none" },
  btn: { width: "100%", padding: "12px 14px", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 9, cursor: "pointer", background: "var(--primary, #1d4ed8)", color: "var(--primary-text, #fff)" },
  err: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  note: { margin: "0 0 16px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, lineHeight: 1.45, background: "#eff6ff", color: "#1e3a8a", border: "1px solid #bfdbfe" },
  link: { background: "none", border: "none", padding: 0, color: "var(--primary, #1d4ed8)", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  bar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 16px", fontSize: 13, background: "var(--card, #fff)", borderBottom: "1px solid var(--border, #e2e8f0)", color: "var(--text, #0f172a)" },
};

export default function ReportDownload() {
  const [step, setStep] = useState("verify"); // verify | profile | photo | ready
  const [username, setUsername] = useState("");
  const [profileToken, setProfileToken] = useState("");
  const [who, setWho] = useState({ name: "", username: "" });
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ studentClass: "", gender: "", email: "", phone: "", assessmentNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState({ mode: "report" }); // what the school offers (report form / transcript / both)

  // A fresh visit always starts logged out of this page (shared lab computers).
  useEffect(() => { clearSession(); return clearSession; }, []);

  const openReport = (data) => {
    sessionStorage.setItem("report_link_token", data.token);
    sessionStorage.setItem("report_link_user", JSON.stringify(data.user));
    setProfileToken("");
    setDownloads(data.downloads || { mode: "report" });
    setStep("ready");
  };

  // One place decides what the server's answer means: ask for the photo, or open the report.
  const handleResult = (data) => {
    if (data.status === "photo_required") {
      setProfileToken(data.token);
      setWho(data.student || { name: "", username: username.trim() });
      setStep("photo");
    } else {
      openReport(data);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Enter your username."); return; }
    try {
      setBusy(true);
      clearSession(); // api.js would otherwise attach an old report session to this request
      const { data } = await API.post("/report-access/verify", { username: username.trim() });
      if (data.status === "profile_required") {
        setProfileToken(data.token);
        setWho(data.student || { name: "", username: username.trim() });
        setClasses(data.classes || []);
        setForm((f) => ({ ...f, ...(data.profile || {}) }));
        setStep("profile");
      } else {
        handleResult(data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not verify you. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    const { studentClass, gender, email, phone, assessmentNumber } = form;
    if (!studentClass.trim() || !gender.trim() || !email.trim() || !phone.trim() || !assessmentNumber.trim()) {
      setError("Class, gender, email, phone and assessment number are required.");
      return;
    }
    try {
      setBusy(true);
      clearSession();
      const { data } = await API.post("/report-access/profile", form, { headers: { Authorization: `Bearer ${profileToken}` } });
      handleResult(data);
    } catch (err) {
      const expired = err?.response?.data?.expired;
      if (expired) { setStep("verify"); setProfileToken(""); }
      setError(err?.response?.data?.message || "Could not save your details. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    clearSession();
    setUsername(""); setError("");
    setStep("verify");
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (step === "ready") {
    let name = "";
    try { name = JSON.parse(sessionStorage.getItem("report_link_user") || "{}").name || ""; } catch { /* ignore */ }
    return (
      <>
        <div style={S.bar}>
          <span>Signed in as <b>{name || "student"}</b></span>
          <button type="button" style={S.link} onClick={finish}>Finish &amp; sign out</button>
        </div>
        <StudentDownloadHub downloads={downloads} />
      </>
    );
  }

  if (step === "photo") {
    return (
      <div style={S.page}>
        <PassportPhotoStep
          name={who.name || who.username}
          token={profileToken}
          onDone={openReport}
          onExpired={() => { setStep("verify"); setProfileToken(""); setError("That step timed out. Please enter your username again."); }}
          onCancel={finish}
        />
      </div>
    );
  }

  return (
    <div style={S.page}>
      {step === "verify" ? (
        <form onSubmit={verify} style={S.card} autoComplete="off">
          <h1 style={S.h1}>Download your results</h1>
          <p style={S.sub}>Type your student username to download your report form or transcript. You don't need to log in to the portal.</p>
          {error && <div style={S.err} role="alert">{error}</div>}
          <div style={S.field}>
            <label style={S.label} htmlFor="rd-username">Username</label>
            <input id="rd-username" style={S.input} value={username} onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
          </div>
          <button type="submit" style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} disabled={busy}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={saveProfile} style={S.card}>
          <h1 style={S.h1}>Update your details</h1>
          <p style={S.sub}>
            Hi {who.name || who.username}. Your profile hasn't been filled in yet. Save your details below
            and your report form will unlock straight away.
          </p>
          <div style={S.note}>Your name and admission number are set by the school and can't be changed here.</div>
          {error && <div style={S.err} role="alert">{error}</div>}

          <div style={S.field}>
            <label style={S.label} htmlFor="rd-class">Class</label>
            {classes.length > 0 ? (
              <select id="rd-class" style={S.input} value={form.studentClass} onChange={set("studentClass")}>
                <option value="">Select class</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input id="rd-class" style={S.input} value={form.studentClass} onChange={set("studentClass")} />
            )}
          </div>
          <div style={S.field}>
            <label style={S.label} htmlFor="rd-gender">Gender</label>
            <select id="rd-gender" style={S.input} value={form.gender} onChange={set("gender")}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label} htmlFor="rd-email">Email</label>
            <input id="rd-email" type="email" style={S.input} placeholder="you@example.com" value={form.email} onChange={set("email")} autoComplete="email" />
          </div>
          <div style={S.field}>
            <label style={S.label} htmlFor="rd-phone">Phone number</label>
            <input id="rd-phone" type="tel" style={S.input} placeholder="07XXXXXXXX" value={form.phone} onChange={set("phone")} autoComplete="tel" />
          </div>
          <div style={S.field}>
            <label style={S.label} htmlFor="rd-an">Assessment number</label>
            <input id="rd-an" style={S.input} value={form.assessmentNumber} onChange={set("assessmentNumber")} />
          </div>

          <button type="submit" style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} disabled={busy}>
            {busy ? "Saving…" : "Save & unlock my report form"}
          </button>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button type="button" style={S.link} onClick={finish}>Not you? Start over</button>
          </div>
        </form>
      )}
    </div>
  );
}
