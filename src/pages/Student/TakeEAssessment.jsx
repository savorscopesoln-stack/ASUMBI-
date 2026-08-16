import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";

/* ═══════════════════════════════════════════════════════════
   IMPORTANT — HONEST SCOPE NOTE
   ─────────────────────────────────────────────────────────
   No web page can reach outside the browser to disable a
   physical device or block it "until restart" — that is an
   OS-level capability no website has access to. What this
   page implements, which is the real and enforceable version
   of "one device only":

     1. The server issues a 6-character token per (student,
        assessment). The student is shown that token, given
        time to save it, and must re-type it before the exam
        opens — this is a deliberate "you own this token now"
        step, not just a display.
     2. The token is bound to the FIRST device that activates
        it (see e_assessment_exam_sessions). This page
        heartbeats the server every few seconds with that
        token + a persisted local device id. The instant a
        second device tries the same token, the SERVER marks
        the session 'locked' — this is enforced centrally, not
        just in this tab.
     3. Locally, this page also detects the common cheating
        vectors it CAN see — leaving fullscreen, switching
        tabs/apps, right-click, copy/paste, devtools shortcuts —
        and escalates to a full-screen lock overlay that traps
        keyboard/mouse input on THIS page until the exam ends
        or an admin clears the lock. That overlay persists
        across refresh (via localStorage) for this device.
   ═════════════════════════════════════════════════════════ */

const C = {
  bg: "#07111f", bgAlt: "#0b1929", surface: "#0f2035", card: "#122541",
  border: "#1a3356", borderHi: "#2a507a", textPri: "#e8f2ff", textSec: "#7aaacf",
  textMuted: "#3d5f82", blue: "#3d82f8", blueHi: "#6aa0ff", green: "#22d46e",
  amber: "#f5a623", red: "#f04545", teal: "#14c9b8", white: "#ffffff",
};

const HEARTBEAT_MS = 10000;
const MAX_VIOLATIONS = 3;
const REVEAL_SECONDS = 15; // minimum time the student must sit with the token before continuing

const getDeviceId = () => {
  let id = localStorage.getItem("exam_device_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem("exam_device_id", id);
  }
  return id;
};

const lockKey = (assessmentId) => `exam_lock_${assessmentId}`;

export default function TakeEAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deviceId = useMemo(() => getDeviceId(), []);

  // loading | reveal | verify | active | locked | ended | error
  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState("");

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // question_id -> value
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lockReason, setLockReason] = useState("");

  // reveal step
  const [revealCountdown, setRevealCountdown] = useState(REVEAL_SECONDS);

  // verify step
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [activating, setActivating] = useState(false);

  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);

  /* ── restore a persisted local lock (survives refresh) ── */
  useEffect(() => {
    const saved = localStorage.getItem(lockKey(id));
    if (saved) {
      setLockReason(saved);
      setPhase("locked");
    }
  }, [id]);

  /* ── step 1: generate the token and show the reveal screen ── */
  const bootStart = useCallback(async () => {
    try {
      setPhase("loading");
      const startRes = await API.post(`/e-assessments/${id}/start-exam`);
      const t = startRes.data.token;
      setToken(t);
      setRevealCountdown(REVEAL_SECONDS);
      setPhase("reveal");
    } catch (err) {
      if (err?.response?.status === 423) {
        const reason = err?.response?.data?.message || "This exam token is already in use on another device.";
        localStorage.setItem(lockKey(id), reason);
        setLockReason(reason);
        setPhase("locked");
      } else if (err?.response?.status === 409) {
        setErrorMsg(err.response.data.message || "You have already completed this assessment.");
        setPhase("ended");
      } else {
        setErrorMsg(err?.response?.data?.message || "Failed to start the assessment.");
        setPhase("error");
      }
    }
  }, [id]);

  useEffect(() => {
    // don't re-fetch a token if we booted straight into a persisted lock
    if (phase === "locked") return;
    bootStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── reveal screen countdown ── */
  useEffect(() => {
    if (phase !== "reveal" || revealCountdown <= 0) return;
    const t = setTimeout(() => setRevealCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, revealCountdown]);

  const confirmSaved = () => {
    setVerifyInput("");
    setVerifyError("");
    setPhase("verify");
  };

  /* ── step 3: fetch the actual questions and enter the locked-down exam ── */
  const enterActive = useCallback(async () => {
    const detail = await API.get(`/e-assessments/${id}`);
    setAssessment(detail.data.assessment);
    setQuestions(detail.data.questions || []);
    setSecondsLeft((detail.data.assessment.duration_minutes || 30) * 60);
    setPhase("active");
  }, [id]);

  /* ── step 2: the student re-types the token to prove they saved it,
       this also performs the device-binding activation ── */
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (activating) return;

    if (verifyInput.trim().toUpperCase() !== token.trim().toUpperCase()) {
      setVerifyError("That doesn't match the token you were shown. Check it and try again.");
      return;
    }

    setVerifyError("");
    setActivating(true);
    try {
      const activateRes = await API.post("/e-assessments/exam-session/activate", {
        token, device_id: deviceId, device_label: navigator.userAgent,
      });

      if (activateRes.data.status !== "active" && !activateRes.data.success) {
        throw new Error("Could not activate exam session");
      }

      await enterActive();
    } catch (err) {
      if (err?.response?.status === 423) {
        const reason = err?.response?.data?.message || "This exam token is already in use on another device.";
        localStorage.setItem(lockKey(id), reason);
        setLockReason(reason);
        setPhase("locked");
      } else if (err?.response?.status === 409) {
        setErrorMsg(err.response.data.message || "You have already completed this assessment.");
        setPhase("ended");
      } else {
        setVerifyError(err?.response?.data?.message || "Failed to start the assessment. Please try again.");
      }
    } finally {
      setActivating(false);
    }
  };

  /* ── request fullscreen when active ── */
  useEffect(() => {
    if (phase === "active" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [phase]);

  /* ── heartbeat: confirms this device is still the bound device ── */
  useEffect(() => {
    if (phase !== "active" || !token) return;
    heartbeatRef.current = setInterval(async () => {
      try {
        const res = await API.post("/e-assessments/exam-session/heartbeat", { token, device_id: deviceId });
        if (res.data.locked) {
          triggerLock("This exam session was locked — the token was used on another device.");
        } else if (res.data.ended) {
          setPhase("ended");
        }
      } catch {
        /* transient network errors are ignored; heartbeat retries next tick */
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [phase, token, deviceId]);

  /* ── countdown timer ── */
  useEffect(() => {
    if (phase !== "active") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── local anti-cheat detection (best-effort, client-side) ── */
  const triggerLock = useCallback((reason) => {
    localStorage.setItem(lockKey(id), reason);
    setLockReason(reason);
    setPhase("locked");
    clearInterval(heartbeatRef.current);
    clearInterval(timerRef.current);
  }, [id]);

  const registerViolation = useCallback((label) => {
    setViolations((v) => {
      const next = v + 1;
      if (next >= MAX_VIOLATIONS) {
        triggerLock(`Too many suspicious actions detected (${label}). This device has been locked for this exam.`);
      }
      return next;
    });
  }, [triggerLock]);

  useEffect(() => {
    if (phase !== "active") return;

    const onVisibility = () => { if (document.hidden) registerViolation("left the exam tab"); };
    const onBlur = () => registerViolation("switched away from the exam window");
    const onContextMenu = (e) => e.preventDefault();
    const onCopyCutPaste = (e) => e.preventDefault();
    const onKeyDown = (e) => {
      const blocked =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ["c", "v", "x", "u", "p"].includes(e.key.toLowerCase()));
      if (blocked) { e.preventDefault(); registerViolation("attempted a blocked shortcut"); }
    };
    const onFullscreenChange = () => { if (!document.fullscreenElement) registerViolation("exited fullscreen"); };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopyCutPaste);
    document.addEventListener("cut", onCopyCutPaste);
    document.addEventListener("paste", onCopyCutPaste);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopyCutPaste);
      document.removeEventListener("cut", onCopyCutPaste);
      document.removeEventListener("paste", onCopyCutPaste);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [phase, registerViolation]);

  /* ── while locked, keep polling in case an admin unlocks this session ── */
  useEffect(() => {
    if (phase !== "locked" || !token) return;
    const poll = setInterval(async () => {
      try {
        const res = await API.post("/e-assessments/exam-session/activate", {
          token, device_id: deviceId, device_label: navigator.userAgent,
        });
        if (res.data.success) {
          localStorage.removeItem(lockKey(id));
          setViolations(0);
          await enterActive();
        }
      } catch {
        /* still locked — keep waiting */
      }
    }, 15000);
    return () => clearInterval(poll);
  }, [phase, token, deviceId, id, enterActive]);

  /* ── submit ── */
  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        assessment_id: Number(id),
        token,
        device_id: deviceId,
        answers: questions.map((q) => {
          const val = answers[q.id];
          return q.question_type === "essay"
            ? { question_id: q.id, essay_answer: val || "" }
            : { question_id: q.id, selected_option: val || null };
        }),
      };
      await API.post("/e-assessments/submit", payload);
      localStorage.removeItem(lockKey(id));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setPhase("ended");
      setErrorMsg(auto ? "Time's up — your assessment was submitted automatically." : "Assessment submitted successfully.");
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const mmss = (total) => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = Math.floor(total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER — states
  ═══════════════════════════════════════════════════════════ */
  if (phase === "loading") {
    return (
      <div style={s.stateWrap}>
        <div style={s.spinner} />
        <p style={{ color: C.textSec }}>Preparing your exam session…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={s.stateWrap}>
        <p style={{ fontSize: 40 }}>⚠</p>
        <p style={{ color: C.red, fontWeight: 700, maxWidth: 420, textAlign: "center" }}>{errorMsg}</p>
        <button style={s.secondaryBtn} onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div style={s.stateWrap}>
        <p style={{ fontSize: 44 }}>✅</p>
        <p style={{ color: C.textPri, fontWeight: 700, fontSize: 18 }}>{errorMsg || "This assessment is complete."}</p>
        <button style={s.secondaryBtn} onClick={() => navigate("/student/e-assessments")}>Back to Assessments</button>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div style={s.lockOverlay}>
        <div style={s.lockCard}>
          <p style={{ fontSize: 48, margin: "0 0 10px" }}>🔒</p>
          <h2 style={{ margin: "0 0 12px", color: C.red, fontSize: 22 }}>Device Locked</h2>
          <p style={{ color: C.textSec, lineHeight: 1.7, marginBottom: 18 }}>{lockReason}</p>
          <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>
            This screen will stay locked until an administrator clears it, or the exam ends.
            Please contact your invigilator or school admin.
          </p>
        </div>
      </div>
    );
  }

  /* ── step 1: reveal the token, force a minimum reading time ── */
  if (phase === "reveal") {
    return (
      <div style={s.stateWrap}>
        <div style={s.tokenCard}>
          <p style={{ fontSize: 40, margin: "0 0 6px" }}>🔑</p>
          <h2 style={{ margin: "0 0 8px", color: C.textPri, fontSize: 20 }}>Your Exam Token</h2>
          <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 18px" }}>
            This token belongs only to you for this assessment. Write it down or save it somewhere
            safe — you'll need to type it again on the next screen to open your paper, and it will
            lock to whichever device you use first.
          </p>
          <div style={s.tokenDisplay}>{token}</div>
          <button
            style={{ ...s.primaryBtn, opacity: revealCountdown > 0 ? 0.5 : 1, cursor: revealCountdown > 0 ? "not-allowed" : "pointer" }}
            onClick={confirmSaved}
            disabled={revealCountdown > 0}
          >
            {revealCountdown > 0 ? `I've saved my token (${revealCountdown}s)` : "I've saved my token — Continue"}
          </button>
        </div>
      </div>
    );
  }

  /* ── step 2: re-enter the token to prove it was saved, then activate ── */
  if (phase === "verify") {
    return (
      <div style={s.stateWrap}>
        <form style={s.tokenCard} onSubmit={handleVerifySubmit}>
          <p style={{ fontSize: 40, margin: "0 0 6px" }}>✍️</p>
          <h2 style={{ margin: "0 0 8px", color: C.textPri, fontSize: 20 }}>Enter Your Token to Begin</h2>
          <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 18px" }}>
            Type the token you just saved. Once it's accepted, your paper opens and this device
            locks to the exam until you submit.
          </p>
          <input
            style={s.verifyInput}
            value={verifyInput}
            onChange={(e) => { setVerifyInput(e.target.value); setVerifyError(""); }}
            placeholder="Enter token"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
          />
          {verifyError && <p style={{ color: C.red, fontSize: 13, margin: "10px 0 0" }}>{verifyError}</p>}
          <button style={{ ...s.primaryBtn, marginTop: 18 }} type="submit" disabled={activating || !verifyInput.trim()}>
            {activating ? "Starting…" : "Start Exam"}
          </button>
          <button
            type="button"
            style={{ ...s.secondaryBtn, marginTop: 10 }}
            onClick={() => setPhase("reveal")}
            disabled={activating}
          >
            Show token again
          </button>
        </form>
      </div>
    );
  }

  /* ── active exam ── */
  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.examTitle}>{assessment?.title}</h1>
          <p style={s.examMeta}>{assessment?.subject} · Token <strong style={{ color: C.blueHi }}>{token}</strong></p>
        </div>
        <div style={{ ...s.timer, color: secondsLeft < 60 ? C.red : C.textPri }}>⏱ {mmss(secondsLeft)}</div>
      </div>

      {violations > 0 && (
        <div style={s.warningStrip}>
          ⚠ Warning {violations}/{MAX_VIOLATIONS}: suspicious activity detected on this device. Reaching {MAX_VIOLATIONS} will lock your exam.
        </div>
      )}

      {assessment?.instructions && (
        <div style={s.instructionsBox}><strong>Instructions:</strong> {assessment.instructions}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={s.qCard}>
            <p style={s.qText}>
              <span style={{ color: C.blueHi, marginRight: 8 }}>Q{i + 1}.</span>{q.question_text}
              <span style={s.qMarks}>{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
            </p>

            {q.question_type === "essay" ? (
              <textarea
                style={s.essayInput}
                placeholder="Type your answer here…"
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((o) => (
                  <label key={o.option_label} style={{
                    ...s.optionRow,
                    borderColor: answers[q.id] === o.option_label ? C.blue : C.border,
                    background: answers[q.id] === o.option_label ? C.blue + "18" : C.surface,
                  }}>
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={answers[q.id] === o.option_label}
                      onChange={() => setAnswers({ ...answers, [q.id]: o.option_label })}
                      style={{ accentColor: C.blue }}
                    />
                    <span style={{ fontWeight: 700, color: C.blueHi }}>{o.option_label}.</span>
                    <span style={{ color: C.textPri }}>{o.option_text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button style={s.submitBtn} onClick={() => handleSubmit(false)} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Assessment"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const s = {
  page:            { minHeight: "100vh", background: C.bg, color: C.textPri, padding: "24px 24px 90px", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 900, margin: "0 auto" },
  topBar:          { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12, position: "sticky", top: 0, background: C.bg, paddingTop: 8, paddingBottom: 8, zIndex: 5 },
  examTitle:       { margin: "0 0 4px", fontSize: 22, fontWeight: 800 },
  examMeta:        { margin: 0, color: C.textSec, fontSize: 13 },
  timer:           { fontSize: 22, fontWeight: 800, fontFamily: "monospace", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px" },
  warningStrip:    { background: "#3d280033", border: `1px solid ${C.amber}55`, color: C.amber, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
  instructionsBox: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: C.textSec, lineHeight: 1.7, marginBottom: 20 },
  qCard:           { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 },
  qText:           { margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: C.textPri, lineHeight: 1.6 },
  qMarks:          { float: "right", fontSize: 11, color: C.textMuted, fontWeight: 400 },
  optionRow:       { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid", cursor: "pointer" },
  essayInput:      { width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.textPri, fontSize: 14, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" },
  submitBtn:       { width: "100%", padding: 16, marginTop: 24, border: "none", borderRadius: 12, background: "linear-gradient(135deg,#15803d,#22c55e)", color: C.white, fontSize: 16, fontWeight: 800, cursor: "pointer" },
  stateWrap:       { minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  spinner:         { width: 46, height: 46, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  secondaryBtn:    { marginTop: 10, padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, cursor: "pointer", fontWeight: 600 },
  lockOverlay:     { position: "fixed", inset: 0, zIndex: 9999, background: "#050b14ee", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" },
  lockCard:        { background: C.card, border: `1px solid ${C.red}55`, borderRadius: 20, padding: "40px 36px", maxWidth: 440, textAlign: "center", boxShadow: "0 30px 90px #000c" },
  tokenCard:       { background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "36px 32px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 30px 90px #000c" },
  tokenDisplay:    { background: C.surface, border: `1px dashed ${C.borderHi}`, borderRadius: 12, padding: "18px 14px", fontFamily: "monospace", fontSize: 32, fontWeight: 800, letterSpacing: 6, color: C.blueHi, margin: "0 0 22px" },
  verifyInput:     { width: "100%", padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.textPri, fontSize: 20, fontWeight: 700, letterSpacing: 4, textAlign: "center", fontFamily: "monospace", boxSizing: "border-box" },
  primaryBtn:      { width: "100%", padding: "14px 18px", border: "none", borderRadius: 12, background: "linear-gradient(135deg,#1d4ed8,#3d82f8)", color: C.white, fontSize: 15, fontWeight: 800, cursor: "pointer" },
};