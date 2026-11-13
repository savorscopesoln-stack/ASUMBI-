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
  page: { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "22px 2.5vw", boxSizing: "border-box", background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" },
  stack: { width: "95%", maxWidth: "none", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14 },
  card: { width: "100%", maxWidth: "none", boxSizing: "border-box", background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: "clamp(20px, 3vw, 34px)", boxShadow: "0 2px 10px rgba(15,23,42,.045)" },
  h1: { margin: "0 0 9px", fontSize: "clamp(24px, 4vw, 30px)", letterSpacing: "-0.8px", lineHeight: 1.15, fontWeight: 850, color: "var(--text, #0f172a)" },
  sub: { margin: "0 0 25px", fontSize: 14.5, lineHeight: 1.7, color: "var(--text-muted, #64748b)" },
  field: { marginBottom: 18 },
  label: { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 750, letterSpacing: ".01em", color: "var(--text, #334155)" },
  input: { width: "100%", boxSizing: "border-box", padding: "14px 15px", fontSize: 15, borderRadius: 11, border: "1px solid var(--border, #cbd5e1)", background: "var(--input-bg, var(--card, #ffffff))", color: "var(--text, #0f172a)", outline: "none", minHeight: 50, transition: "border-color .2s, box-shadow .2s" },
  btn: { width: "100%", padding: "15px 18px", fontSize: 15, fontWeight: 800, letterSpacing: ".01em", border: "none", borderRadius: 11, cursor: "pointer", background: "var(--primary, #800000)", color: "var(--primary-text, #fff)", boxShadow: "0 8px 18px rgba(15,23,42,.12)", transition: "transform .2s, box-shadow .2s" },
  err: { margin: "0 0 18px", padding: "13px 15px", borderRadius: 11, fontSize: 13.5, lineHeight: 1.5, background: "#fff4f3", color: "#a52b27", border: "1px solid #f3d1ce" },
  warn: { margin: "0 0 18px", padding: "13px 15px", borderRadius: 11, fontSize: 13.5, lineHeight: 1.55, background: "#fff9e9", color: "#79551a", border: "1px solid #f0dfb5" },
  ok: { margin: "0 0 20px", padding: "15px 16px", borderRadius: 12, fontSize: 14, lineHeight: 1.65, background: "#eff8f1", color: "#245b35", border: "1px solid #cfe7d4" },
  note: { margin: "0 0 20px", padding: "13px 15px", borderRadius: 11, fontSize: 13.5, lineHeight: 1.55, background: "#f7f3e9", color: "#68552b", border: "1px solid #eadfbe" },
  link: { background: "none", border: "none", padding: 5, color: "var(--primary, #800000)", fontWeight: 750, cursor: "pointer", fontSize: 13 },
  pageWide: { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "22px 2.5vw", boxSizing: "border-box", background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" },
  stackWide: { width: "95%", maxWidth: "none", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14 },
  cardWide: { maxWidth: "none" },
  pulse: { margin: "0 0 20px", padding: "14px 16px", borderRadius: 7, fontSize: "clamp(15px, 1.5vw, 17px)", fontWeight: 750, lineHeight: 1.55, color: "var(--text, #0f172a)", background: "#fff", border: "1px solid var(--border, #e2e8f0)", animation: "none" },
  bar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px clamp(16px, 4vw, 34px)", fontSize: 13.5, background: "#fff", borderBottom: "1px solid #eee8e9", color: "#3c3037", boxShadow: "0 4px 18px rgba(30,20,25,.04)" },
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
    <div className="rd-page" style={closedMode ? S.pageWide : S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap');
        .rd-page, .rd-page * { font-family: Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        /* Plain institutional header: no decorative accent bars or oversized effects. */
        .rd-page > div > :first-child { width: 100%; max-width: none; box-sizing: border-box; }
        .rd-page > div > :first-child img { width: clamp(68px, 8vw, 100px) !important; height: clamp(68px, 8vw, 100px) !important; max-width: 100%; object-fit: contain; }
        .rd-page > div > :first-child p,
        .rd-page > div > :first-child h1,
        .rd-page > div > :first-child h2,
        .rd-page > div > :first-child h3,
        .rd-page > div > :first-child h4 { text-align: center !important; font-weight: 800 !important; }
        .rd-page > div > :first-child [role="note"],
        .rd-page > div > :first-child > div:nth-child(2),
        .rd-page > div > :first-child [class*="notice"],
        .rd-page > div > :first-child [class*="message"] { background: #fff !important; color: var(--text, #172033) !important; border-left: none !important; border-color: var(--border, #e2e8f0) !important; border-radius: 8px !important; box-shadow: none !important; text-align: center !important; }
        .rd-card { position: relative; overflow: visible; isolation: auto; }
        .rd-card:before { content: none !important; display: none !important; }
        .rd-card input:focus, .rd-card select:focus { border-color: var(--primary, #800000) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #800000) 12%, transparent); }
        .rd-card button:hover:not(:disabled) { filter: brightness(1.04); }
        .rd-card button:disabled { cursor: wait; }
        .rd-card input::placeholder { color: var(--text-muted, #94a3b8); }
        .rd-card select { cursor: pointer; }
        .rd-eyebrow { display: none !important; }
        .rd-secure { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 14px; color: var(--text-muted, #64748b); font-size: 12px; font-weight: 600; text-align: center; }
        .rd-secure span { color: var(--primary, #800000); font-size: 13px; }
        .rd-input-group { display: flex; align-items: stretch; width: 100%; gap: 0; }
        .rd-input-group input { flex: 1; min-width: 0; min-height: 52px; border-radius: 7px 0 0 7px !important; border-right: 0 !important; font-size: 16px !important; font-weight: 600; }
        .rd-input-group button { flex: 0 0 auto; min-width: 132px; min-height: 52px; padding: 0 20px; border: 1px solid var(--primary, #800000); border-radius: 0 7px 7px 0; background: var(--primary, #800000); color: var(--primary-text, #fff); font-size: 14px; font-weight: 800; cursor: pointer; }
        .rd-input-group button:disabled { opacity: .78; cursor: wait; }
        .rd-wifi-loader { --front-color: var(--primary, #800000); --back-color: rgba(255,255,255,.55); position: relative; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; margin-right: 7px; }
        .rd-wifi-loader svg { position: absolute; width: 24px; height: 24px; transform: rotate(-100deg); }
        .rd-wifi-loader circle { fill: none; stroke-width: 5px; stroke-linecap: round; stroke-dasharray: 22 66; transform-origin: center; }
        .rd-wifi-loader .back { stroke: var(--back-color); }
        .rd-wifi-loader .front { stroke: var(--front-color); stroke-dasharray: 22 66; animation: rd-wifi-spin 1.25s ease-in-out infinite; }
        @keyframes rd-wifi-spin { 0% { stroke-dashoffset: 9; } 50% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -88; } }
        @media (max-width: 600px) {
          .rd-page, .rd-page[style] { padding: 14px 10px !important; align-items: flex-start !important; }
          .rd-page > div { width: 100% !important; gap: 12px !important; }
          .rd-page > div > :first-child img { width: 58px !important; height: 58px !important; }
          .rd-card { border-radius: 8px !important; padding: 20px 16px !important; }
          .rd-card h1 { font-size: 23px !important; }
          .rd-input-group { flex-direction: column; gap: 9px; }
          .rd-input-group input, .rd-input-group button { width: 100%; border: 1px solid var(--border, #cbd5e1) !important; border-radius: 7px !important; }
          .rd-input-group button { border-color: var(--primary, #800000) !important; min-height: 48px; }
        }
        @media (prefers-reduced-motion: reduce) { *, *:before, *:after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
        @media print { .rd-no-print { display: none !important; } }
      `}</style>
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
      <div className="rd-card" style={{ ...S.card, ...(closedMode ? S.cardWide : null) }}>
        <div className="rd-eyebrow">Doravo Core · Student services</div>
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
        <form className="rd-card" onSubmit={verify} style={{ ...S.card, ...(closedMode ? S.cardWide : null) }} autoComplete="off">
          <div className="rd-eyebrow">Doravo Core · Secure results access</div>
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
            <div className="rd-input-group">
              <input id="rd-username" style={S.input} value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder={closedMode ? "TA 70474------" : "Enter your username"}
                autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
              <button type="submit" disabled={busy}>
                {busy ? <><span className="rd-wifi-loader" aria-hidden="true"><svg viewBox="0 0 24 24"><circle className="back" cx="12" cy="12" r="9" /><circle className="front" cx="12" cy="12" r="9" /></svg></span>Searching</> : "Continue"}
              </button>
            </div>
          </div>
          <div className="rd-secure"><span>◆</span> Secure access · No portal password required</div>
        </form>
      ) : (
        <form className="rd-card" onSubmit={saveProfile} style={{ ...S.card, ...(closedMode ? S.cardWide : null) }}>
          <div className="rd-eyebrow">Doravo Core · Student profile</div>
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
          <div className="rd-secure"><span>◆</span> Your details are used to verify your student record.</div>
        </form>
      )}
    </>,
    { profileHint: step === "verify" }
  );
}