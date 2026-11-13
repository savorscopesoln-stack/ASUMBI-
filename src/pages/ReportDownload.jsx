import React, { useEffect, useState } from "react";
import API from "../api";
import StudentDownloadHub from "../components/StudentDownloadHub";
import PassportPhotoStep from "../components/PassportPhotoStep";
import TeacherReportsHub from "../components/TeacherReportsHub";
import DownloadBranding from "../components/DownloadBranding";

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

   While downloads are CLOSED / NOT OPEN YET the student can still do step 1: a
   student whose profile is empty fills it in here (the server answers
   "profile_saved" and no download session is created). Everything else waits
   until the school opens downloads.

   The top of every step shows the school logo, the government logo and the
   admin's typed message (GET /report-access/info, see DownloadBranding.jsx).

   Then the normal report form (with its own Download PDF button) is shown.
   Nothing is remembered: reloading the page asks for the details again, which
   is what you want on a shared lab computer.
========================================================================= */

const SESSION_KEYS = ["report_link_token", "report_link_user", "report_link_downloads"];
const clearSession = () => SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));

const S = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" },
  stack: { width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 },
  card: { width: "100%", maxWidth: 460, boxSizing: "border-box", background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 14, padding: "28px 24px", boxShadow: "0 8px 30px rgba(15,23,42,0.06)" },
  h1: { margin: "0 0 6px", fontSize: 21, fontWeight: 800 },
  sub: { margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: "var(--text-muted, #64748b)" },
  field: { marginBottom: 14 },
  label: { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 15, borderRadius: 9, border: "1px solid var(--border, #cbd5e1)", background: "var(--input-bg, #fff)", color: "inherit", outline: "none" },
  btn: { width: "100%", padding: "12px 14px", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 9, cursor: "pointer", background: "var(--primary, #1d4ed8)", color: "var(--primary-text, #fff)" },
  err: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  warn: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, lineHeight: 1.45, background: "#fffbeb", color: "#78350f", border: "1px solid #fcd34d" },
  ok: { margin: "0 0 16px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, lineHeight: 1.45, background: "#f0fdf4", color: "#14532d", border: "1px solid #bbf7d0" },
  note: { margin: "0 0 16px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, lineHeight: 1.45, background: "#eff6ff", color: "#1e3a8a", border: "1px solid #bfdbfe" },
  link: { background: "none", border: "none", padding: 0, color: "var(--primary, #1d4ed8)", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  // Downloads closed: the page uses 95% of the screen width.
  pageWide: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0", background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" },
  stackWide: { width: "95%", maxWidth: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 },
  cardWide: { maxWidth: "none" },
  pulse: { margin: "0 0 18px", padding: "14px 16px", borderRadius: 11, fontSize: "clamp(16px, 4.2vw, 20px)", fontWeight: 800, lineHeight: 1.45, color: "#dc2626", background: "#fef2f2", border: "2px solid #dc2626", animation: "rd-pulse 1.1s ease-in-out infinite" },
  bar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 16px", fontSize: 13, background: "var(--card, #fff)", borderBottom: "1px solid var(--border, #e2e8f0)", color: "var(--text, #0f172a)" },
};

export default function ReportDownload() {
  const [step, setStep] = useState("verify"); // verify | profile | saved | photo | ready | teacher
  const [username, setUsername] = useState("");
  const [profileToken, setProfileToken] = useState("");
  const [who, setWho] = useState({ name: "", username: "" });
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ studentClass: "", gender: "", email: "", phone: "", assessmentNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState({ mode: "report" }); // what the school offers (report form / transcript / both)
  const [errorTone, setErrorTone] = useState("error"); // "error" (red) | "info" (amber: downloads are closed)
  const [info, setInfo] = useState(null);              // logos, the admin's message, open / closed (GET /report-access/info)
  const [downloadsOpen, setDownloadsOpen] = useState(true);
  const [closedMessage, setClosedMessage] = useState("");
  // Downloads are closed (or not open yet): the page widens and asks students to update their details instead.
  const closedMode = !!info && info.state !== "open";

  // The page header (logos + admin message + open/closed). A failure just means a plain page.
  const loadInfo = () => API.get("/report-access/info").then((r) => setInfo(r.data)).catch(() => {});

  // A fresh visit always starts logged out of this page (shared lab computers).
  useEffect(() => { clearSession(); loadInfo(); return clearSession; }, []);

  const showError = (err, fallback) => {
    const d = err?.response?.data;
    setErrorTone(/^DOWNLOADS_/.test(d?.code || "") ? "info" : "error"); // "not open yet / closed" is not the student's mistake
    setError(d?.message || fallback);
  };

  // A teacher's username: a teacher-only session that opens just the three teacher reports (never student data).
  const openTeacher = (data) => {
    sessionStorage.setItem("report_link_token", data.token);
    sessionStorage.setItem("report_link_user", JSON.stringify(data.user || {}));
    sessionStorage.removeItem("report_link_downloads");
    setStep("teacher");
  };

  const openReport = (data) => {
    sessionStorage.setItem("report_link_token", data.token);
    sessionStorage.setItem("report_link_user", JSON.stringify(data.user));
    sessionStorage.setItem("report_link_downloads", JSON.stringify(data.downloads || {}));
    setProfileToken("");
    setDownloads(data.downloads || { mode: "report" });
    setStep("ready");
  };

  // One place decides what the server's answer means: ask for the photo, or open the report.
  const handleResult = (data) => {
    if (data.status === "profile_saved") {
      // Details saved while downloads are closed: nothing to unlock yet.
      setProfileToken("");
      setClosedMessage(data.message || "");
      setWho(data.student || { name: "", username: username.trim() });
      setStep("saved");
    } else if (data.status === "photo_required") {
      setProfileToken(data.token);
      setWho(data.student || { name: "", username: username.trim() });
      setStep("photo");
    } else {
      openReport(data);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError(""); setErrorTone("error");
    if (!username.trim()) { setError("Enter your username."); return; }
    try {
      setBusy(true);
      clearSession(); // api.js would otherwise attach an old report session to this request
      const { data } = await API.post("/report-access/verify", { username: username.trim() });
      if (data.status === "teacher_ready") {
        openTeacher(data);
      } else if (data.status === "profile_required") {
        setDownloadsOpen(data.downloadsOpen !== false);
        setClosedMessage(data.downloadsMessage || "");
        setProfileToken(data.token);
        setWho(data.student || { name: "", username: username.trim() });
        setClasses(data.classes || []);
        setForm((f) => ({ ...f, ...(data.profile || {}) }));
        setStep("profile");
      } else {
        handleResult(data);
      }
    } catch (err) {
      showError(err, "Could not verify you. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setError(""); setErrorTone("error");
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
      showError(err, "Could not save your details. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    clearSession();
    setUsername(""); setError(""); setErrorTone("error");
    setDownloadsOpen(true); setClosedMessage("");
    loadInfo(); // the school may have opened (or closed) downloads in the meantime
    setStep("verify");
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Logos + the admin's message above whatever step is showing (a function call, not a component, so inputs keep focus).
  const shell = (children, { profileHint = false, showStatus = true } = {}) => (
    <div style={closedMode ? S.pageWide : S.page}>
      <style>{"@keyframes rd-pulse { 0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(220,38,38,0.55); } 50% { opacity: 0.55; transform: scale(1.015); box-shadow: 0 0 0 10px rgba(220,38,38,0); } } @media (prefers-reduced-motion: reduce) { .rd-pulse { animation: none !important; } }"}</style>
      <div style={closedMode ? S.stackWide : S.stack}>
        <DownloadBranding info={info} profileHint={profileHint} showStatus={showStatus} />
        {children}
      </div>
    </div>
  );

  if (step === "teacher") {
    let tname = "";
    try { tname = JSON.parse(sessionStorage.getItem("report_link_user") || "{}").name || ""; } catch { /* ignore */ }
    return (
      <>
        <div style={S.bar}>
          <span>Signed in as <b>{tname || "teacher"}</b></span>
          <button type="button" style={S.link} onClick={finish}>Finish &amp; sign out</button>
        </div>
        <TeacherReportsHub onExpired={() => { finish(); setError("Your session timed out. Please enter your username again."); }} />
      </>
    );
  }

  if (step === "ready") {
    let name = "";
    try { name = JSON.parse(sessionStorage.getItem("report_link_user") || "{}").name || ""; } catch { /* ignore */ }
    return (
      <>
        <div style={S.bar}>
          <span>Signed in as <b>{name || "student"}</b></span>
          <button type="button" style={S.link} onClick={finish}>Finish &amp; sign out</button>
        </div>
        {info?.notice && (
          <div className="rd-no-print" style={{ maxWidth: 760, margin: "0 auto", padding: "14px 16px 0", boxSizing: "border-box" }}>
            <DownloadBranding info={info} showLogos={false} showStatus={false} />
          </div>
        )}
        <style>{"@media print { .rd-no-print { display: none !important; } }"}</style>
        <StudentDownloadHub downloads={downloads} />
      </>
    );
  }

  if (step === "photo") {
    return shell(
        <PassportPhotoStep
          name={who.name || who.username}
          token={profileToken}
          onDone={openReport}
          onExpired={() => { setStep("verify"); setProfileToken(""); setError("That step timed out. Please enter your username again."); }}
          onCancel={finish}
        />
    );
  }

  if (step === "saved") {
    return shell(
      <div style={{ ...S.card, ...(closedMode ? S.cardWide : null) }}>
        <h1 style={S.h1}>Details saved</h1>
        <p style={S.sub}>Thank you{who.name ? `, ${who.name}` : ""}. Your profile is now up to date.</p>
        <div style={S.ok}>
          {closedMessage || "Downloads are not open right now."}{" "}
          When the school opens downloads, come back to this page, type your username and download your results.
        </div>
        <button type="button" style={S.btn} onClick={finish}>Done</button>
      </div>,
      { showStatus: false }
    );
  }

  return shell(
    <>
      {step === "verify" ? (
        <form onSubmit={verify} style={{ ...S.card, ...(closedMode ? S.cardWide : null) }} autoComplete="off">
          {closedMode ? (
            <>
              <h1 style={S.h1}>Update your details</h1>
              <p className="rd-pulse" style={S.pulse} role="alert">
                Please update your details below, then enter your assessment number e.g. (TA 70474------) then click Continue.
              </p>
            </>
          ) : (
            <>
              <h1 style={S.h1}>Download your results</h1>
              <p style={S.sub}>Type your username to continue. Students can download their report form or transcript; teachers can download the examination reports. You don't need to log in to the portal.</p>
            </>
          )}
          {error && <div style={errorTone === "info" ? S.warn : S.err} role="alert">{error}</div>}
          <div style={S.field}>
            <label style={S.label} htmlFor="rd-username">{closedMode ? "Assessment number" : "Username"}</label>
            <input id="rd-username" style={S.input} value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder={closedMode ? "TA 70474------" : undefined}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
          </div>
          <button type="submit" style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} disabled={busy}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={saveProfile} style={{ ...S.card, ...(closedMode ? S.cardWide : null) }}>
          <h1 style={S.h1}>Update your details</h1>
          <p style={S.sub}>
            {downloadsOpen
              ? <>Hi {who.name || who.username}. Your profile hasn't been filled in yet. Save your details below and your report form will unlock straight away.</>
              : <>Hi {who.name || who.username}. Your profile hasn't been filled in yet. Downloads are not open right now, but you can save your details below so you are ready when they open.</>}
          </p>
          <div style={S.note}>Your name and admission number are set by the school and can't be changed here.</div>
          {error && <div style={errorTone === "info" ? S.warn : S.err} role="alert">{error}</div>}

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
            {busy ? "Saving…" : downloadsOpen ? "Save & unlock my report form" : "Save my details"}
          </button>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button type="button" style={S.link} onClick={finish}>Not you? Start over</button>
          </div>
        </form>
      )}
    </>,
    { profileHint: step === "verify" }
  );
}