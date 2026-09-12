import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import { useTheme } from "../../context/ThemeContext";
import {
  KeyRound, PenLine, Lock, Timer, AlertTriangle, CheckCircle2,
  ClipboardList, Sun, Moon, ArrowLeft, ShieldAlert, User, LogIn,
  Camera, CameraOff, Eye, EyeOff,
} from "lucide-react";

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
     4. Webcam eye/gaze monitoring — both eyes open and the head
        facing the screen (best-effort, and deliberately scoped
        honestly — see the note above the EYES_OFF_LIMIT_MS
        constant below for exactly what this can and can't detect).
   ═════════════════════════════════════════════════════════ */

/* ─── shared design-token stylesheet ───
   Identical id/contents to the dashboard's token sheet, so this
   page inherits the same palette + dark-mode support. Injecting
   twice is a no-op if the dashboard already mounted it.
*/
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes softPulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }

    .dash-spin { animation: spin 0.8s linear infinite; }
    .dash-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: softPulse 1.4s ease-in-out infinite; border-radius: 8px; }

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-icon-btn:hover { background: var(--bg); }

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
      .dash-two-col { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── page-specific additive rules ─── */
const injectExamStyles = () => {
  if (document.getElementById("exam-page-styles")) return;
  const el = document.createElement("style");
  el.id = "exam-page-styles";
  el.textContent = `
    @media (max-width: 640px) {
      .exam-top-bar { flex-direction: column !important; align-items: flex-start !important; }
      .exam-top-bar > div:last-child { align-self: stretch !important; justify-content: space-between !important; }
    }
    .exam-option-row:hover { border-color: var(--primary) !important; }

    @keyframes eyesOffFlash {
      0%, 100% { box-shadow: 0 0 0 0 var(--destructive); }
      50%      { box-shadow: 0 0 14px 3px var(--destructive); }
    }
    .eyes-off-flash { animation: eyesOffFlash 0.6s ease-in-out infinite; }
  `;
  document.head.appendChild(el);
};

const HEARTBEAT_MS = 10000;
const MAX_VIOLATIONS = 3;
const REVEAL_SECONDS = 15; // minimum time the student must sit with the token before continuing

/* ── webcam eye/gaze monitoring ──────────────────────────────────
   HONEST SCOPE NOTE: a browser has no reliable way to compute exact
   on-screen gaze coordinates (pixel x/y) without a per-student
   calibration step (look at 9 dots, etc.) that most exam platforms
   skip because it's slow and finicky, AND without iris-level
   landmarks that this lightweight model doesn't provide. What this
   DOES implement, which is the practical and enforceable version of
   "make sure both eyes are looking at the screen": a client-side
   face detector + 68-point facial landmark model (face-api.js's
   tiny_face_detector + faceLandmark68TinyNet, ~190KB + ~1.4MB, runs
   entirely in-browser, nothing is ever uploaded) checks the webcam
   feed roughly once a second and, from the landmark positions,
   evaluates two things every real "looking at the screen" needs:
     1. HEAD ORIENTATION — is the face actually turned toward the
        camera, or turned away to the side/up/down? Estimated from
        where the nose sits relative to the eye line and jaw width
        (a standard 2D-landmark heuristic, not true 3D head-pose
        solving, but accurate enough to catch "looking at a second
        monitor" or "talking to someone beside them").
     2. EYE OPENNESS — are both eyes actually open, via the
        well-known Eye-Aspect-Ratio (EAR) formula on each eye's 6
        landmark points? Catches eyes closed/mostly-shut (reading
        notes below the desk, eyes down) even while the head is
        still facing forward.
   Both eyes must be open AND the head must be reasonably front-on
   for a frame to count as "looking at the screen". If neither holds
   — or no face is found at all — for EYES_OFF_LIMIT_MS of continuous
   time, it feeds into the exact same registerViolation() escalation
   path as the other detectors above (tab-switch, devtools, etc.), so
   it counts toward the same 3-strikes lockout.
   Camera access is requested but never made mandatory to start the
   exam — a student without a webcam, or who denies the permission,
   simply continues without this particular check (a one-time notice
   is shown, not an error) rather than being locked out of an exam
   entirely over a hardware/permission issue outside their control. */
const EYES_OFF_LIMIT_MS = 10000;
const FACE_CHECK_INTERVAL_MS = 1000;
const EAR_CLOSED_THRESHOLD = 0.20;   // below this, an eye counts as closed (typical open EAR is ~0.28-0.35)
const YAW_OFFSET_LIMIT = 0.16;       // how far the nose may sit off-center (as a fraction of face width) before "turned away"
const FACE_API_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

/* Distance between two face-api.js landmark points ({x,y}). */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* Eye Aspect Ratio: the standard measure of how "open" an eye is from
   its 6 outline landmark points, ordered [outerCorner, top1, top2,
   innerCorner, bottom2, bottom1] — which is exactly what face-api.js's
   getLeftEye()/getRightEye() return. Falls as the eyelid closes. */
const eyeAspectRatio = (eye) => {
  const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4]);
  const horizontal = 2 * dist(eye[0], eye[3]);
  return horizontal === 0 ? 0 : vertical / horizontal;
};

/* Is this frame's landmarks a person actually looking at the screen?
   Requires both eyes open (EAR check) AND the head roughly front-on
   (nose-position yaw check) — see the HONEST SCOPE NOTE above for
   exactly what this can and can't detect. */
const isLookingAtScreen = (landmarks) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();

  const leftEAR = eyeAspectRatio(leftEye);
  const rightEAR = eyeAspectRatio(rightEye);
  const eyesOpen = leftEAR >= EAR_CLOSED_THRESHOLD && rightEAR >= EAR_CLOSED_THRESHOLD;

  // jaw[0] and jaw[16] are the leftmost/rightmost face-outline points;
  // nose[3] is the nose tip. A centered nose tip sits near the midpoint
  // between them — how far it drifts, as a fraction of face width,
  // approximates how far the head is turned left/right.
  const faceLeft = jaw[0], faceRight = jaw[16], noseTip = nose[3];
  const faceWidth = dist(faceLeft, faceRight);
  const faceMidX = (faceLeft.x + faceRight.x) / 2;
  const yawOffset = faceWidth === 0 ? 0 : Math.abs(noseTip.x - faceMidX) / faceWidth;
  const facingForward = yawOffset <= YAW_OFFSET_LIMIT;

  return eyesOpen && facingForward;
};

const getDeviceId = () => {
  let id = localStorage.getItem("exam_device_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem("exam_device_id", id);
  }
  return id;
};

const lockKey = (assessmentId) => `exam_lock_${assessmentId}`;

/* Loads the face-api.js UMD bundle from CDN exactly once, however many
   times this is called (e.g. StrictMode double-invoke, remounts) — the
   in-flight/loaded promise is memoized at module scope. */
let faceApiLoadPromise = null;
const loadFaceApi = () => {
  if (window.faceapi?.nets?.faceLandmark68TinyNet?.isLoaded) return Promise.resolve(window.faceapi);
  if (faceApiLoadPromise) return faceApiLoadPromise;
  faceApiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${FACE_API_SCRIPT_SRC}"]`);
    const onReady = () => {
      Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
        window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_URL),
      ])
        .then(() => resolve(window.faceapi))
        .catch(reject);
    };
    if (existing) {
      if (window.faceapi) onReady();
      else existing.addEventListener("load", onReady);
      return;
    }
    const script = document.createElement("script");
    script.src = FACE_API_SCRIPT_SRC;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Failed to load face-api.js"));
    document.head.appendChild(script);
  });
  return faceApiLoadPromise;
};

/* ─── read the JWT payload without a decode library ───
   Only used to decide, client-side, whether the token already in
   localStorage is a previously-issued exam-only token scoped to this
   exact assessment id — so we can skip straight past the exam-login
   form instead of always making a round trip that would fail for a
   mismatched token. */
const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/* A regular student-portal login must NEVER be enough to open an exam —
   only the username + this-assessment's exam password (set by the admin
   in E-Assessments) may. So the only session we treat as "usable" here
   is an exam-only token that was already issued, by the exam-login form
   below, specifically for THIS assessment id. Any other token — including
   a perfectly valid student-portal session — falls through to the
   exam-login form. */
const hasUsableSession = (assessmentId) => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || payload.role !== "student") return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) return false;
  if (!payload.examOnly || String(payload.examAssessmentId) !== String(assessmentId)) return false;
  return true;
};

export default function TakeEAssessment() {
  injectStyles();
  injectExamStyles();

  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const deviceId = useMemo(() => getDeviceId(), []);

  // examlogin | loading | reveal | verify | active | locked | ended | error
  const [phase, setPhase] = useState("examlogin");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState("");

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // question_id -> value
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lockReason, setLockReason] = useState("");

  // camera/eye-gaze monitoring — see EYES_OFF_LIMIT_MS note above
  const [cameraStatus, setCameraStatus] = useState("idle"); // idle | requesting | active | denied | unsupported | error
  const [faceVisible, setFaceVisible] = useState(true); // true = "looking at the screen" (see isLookingAtScreen)
  const [faceAbsentSeconds, setFaceAbsentSeconds] = useState(0); // seconds of continuous not-looking-at-screen

  // exam-login step (username + this assessment's exam password —
  // no portal account required)
  const [examUsername, setExamUsername] = useState("");
  const [examPasswordInput, setExamPasswordInput] = useState("");
  const [examLoginError, setExamLoginError] = useState("");
  const [examLoggingIn, setExamLoggingIn] = useState(false);

  // reveal step
  const [revealCountdown, setRevealCountdown] = useState(REVEAL_SECONDS);
  const [coverPageUrl, setCoverPageUrl] = useState("");

  // verify step
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [activating, setActivating] = useState(false);

  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const faceCheckIntervalRef = useRef(null);
  const faceAbsentSinceRef = useRef(null); // timestamp, or null while looking at the screen

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

      // Best-effort fetch of this exam's cover page (if the admin/teacher
      // set one) so it can be offered on the reveal screen below, before
      // the student commits to starting. Never blocks the exam flow if
      // this fails for any reason.
      try {
        const detail = await API.get(`/e-assessments/${id}`);
        if (detail?.data?.assessment?.cover_page_url) {
          setCoverPageUrl(detail.data.assessment.cover_page_url);
        }
      } catch {
        // no cover page, or couldn't fetch one — exam proceeds regardless
      }

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
    // Don't re-fetch a token if we booted straight into a persisted lock.
    // Deliberately re-reads localStorage here rather than checking the
    // `phase` state: this effect and the lock-restore effect above both
    // run once on mount, and this one's closure would otherwise see the
    // pre-update "examlogin" phase from the initial render — the two
    // effects fire in the same commit, before React has flushed the
    // other effect's setPhase("locked") into a value this closure can
    // see. That race is exactly what let a locked exam un-lock itself
    // on refresh: this effect would find a still-valid exam-only token
    // in localStorage and happily call bootStart() again, bypassing a
    // lock that (from the server's point of view) never happened in the
    // first place — it's purely a local, client-side violation lock.
    if (localStorage.getItem(lockKey(id))) return;
    // already have a usable session for this exact assessment (a full
    // portal login, or a previously-issued exam-only token) — skip the
    // login form and go straight to starting the exam
    if (hasUsableSession(id)) {
      bootStart();
    }
    // otherwise stay on "examlogin" and wait for handleExamLogin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── exam-login: username + this assessment's exam password,
       no portal account needed ── */
  const handleExamLogin = async (e) => {
    e.preventDefault();
    if (examLoggingIn) return;
    if (!examUsername.trim() || !examPasswordInput.trim()) {
      setExamLoginError("Enter both your username and the exam password.");
      return;
    }
    setExamLoginError("");
    setExamLoggingIn(true);
    try {
      const res = await API.post("/e-assessments/exam-login", {
        assessmentId: Number(id),
        username: examUsername.trim(),
        examPassword: examPasswordInput.trim(),
      });
      if (!res.data?.success) {
        setExamLoginError(res.data?.message || "Login failed. Please try again.");
        return;
      }
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      await bootStart();
    } catch (err) {
      setExamLoginError(err?.response?.data?.message || "Login failed. Check your username and exam password.");
    } finally {
      setExamLoggingIn(false);
    }
  };

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

  /* ── block the browser "Back" button once there is an active
       assessment in progress (reveal → verify → active). We trap it
       by keeping an extra history entry in front of the exam page and
       re-pushing it every time the student tries to pop back — so the
       "Back" gesture never actually leaves this page. Leaving via
       "locked" / "ended" / "error" is still allowed, since the exam is
       no longer in progress at that point. During the active exam,
       trying to go back also counts as a suspicious action, same as
       switching tabs. ── */
  useEffect(() => {
    const blocking = ["loading", "reveal", "verify", "active"].includes(phase);
    if (!blocking) return;

    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      if (phase === "active") registerViolation("tried to navigate back");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [phase, registerViolation]);

  /* ── warn on tab close / refresh while an assessment is in progress ── */
  useEffect(() => {
    if (phase !== "active") return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

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

  /* ── webcam eye/gaze monitoring ──
     Only runs during the active exam, same lifecycle as the other
     detectors above. Requests the camera, then polls a lightweight
     face+landmark detector roughly once a second to check both eyes
     are open and the head is facing the screen (see isLookingAtScreen
     and the HONEST SCOPE NOTE above); sustained failure feeds into
     the same registerViolation() escalation as everything else. */
  useEffect(() => {
    if (phase !== "active") return;
    let cancelled = false;

    const stopCamera = () => {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
    };

    const startMonitoring = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unsupported");
        return;
      }
      setCameraStatus("requesting");
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      } catch {
        if (!cancelled) setCameraStatus("denied");
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch { /* autoplay quirks — detection loop below still starts */ }
      }

      let faceapi;
      try {
        faceapi = await loadFaceApi();
      } catch {
        if (!cancelled) setCameraStatus("error");
        return;
      }
      if (cancelled) return;

      setCameraStatus("active");
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

      faceCheckIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        let result;
        try {
          result = await faceapi
            .detectSingleFace(videoRef.current, detectorOptions)
            .withFaceLandmarks(true); // true = the lighter "tiny" landmark model, matching tinyFaceDetector
        } catch {
          return; // transient decode error — try again next tick
        }

        const now = Date.now();
        const looking = !!result && isLookingAtScreen(result.landmarks);

        if (looking) {
          faceAbsentSinceRef.current = null;
          setFaceVisible(true);
          setFaceAbsentSeconds(0);
        } else {
          if (!faceAbsentSinceRef.current) faceAbsentSinceRef.current = now;
          const absentMs = now - faceAbsentSinceRef.current;
          setFaceVisible(false);
          setFaceAbsentSeconds(Math.floor(absentMs / 1000));
          if (absentMs >= EYES_OFF_LIMIT_MS) {
            faceAbsentSinceRef.current = now; // require another full window before flagging again
            setFaceAbsentSeconds(0);
            registerViolation("eyes not on the screen for 10+ seconds");
          }
        }
      }, FACE_CHECK_INTERVAL_MS);
    };

    startMonitoring();
    return () => { cancelled = true; stopCamera(); };
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

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className="dash-icon-btn"
      style={S.themeToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );

  /* ═══════════════════════════════════════════════════════════
     RENDER — states
  ═══════════════════════════════════════════════════════════ */

  /* ── step 0: username + this assessment's exam password —
       no portal account login required ── */
  if (phase === "examlogin") {
    return (
      <div className="dash-main" style={S.stateWrap}>
        <form className="dash-card" style={S.panelCard} onSubmit={handleExamLogin}>
          <div style={{ ...S.iconCircle, background: "var(--primary-tint)" }}>
            <LogIn size={26} color="var(--primary)" />
          </div>
          <h2 style={{ margin: "16px 0 8px", color: "var(--text)", fontSize: 18, fontWeight: 800, textAlign: "center" }}>Sign In to Take This Assessment</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", textAlign: "center" }}>
            Enter your username and the exam password your teacher or admin gave you for this
            assessment. You don't need a student-portal password for this.
          </p>

          <label style={S.fieldLabel}>Username</label>
          <div style={S.inputWithIcon}>
            <User size={15} color="var(--text-muted)" />
            <input
              style={S.iconInput}
              value={examUsername}
              onChange={(e) => { setExamUsername(e.target.value); setExamLoginError(""); }}
              placeholder="Your student username"
              autoFocus
              autoComplete="username"
            />
          </div>

          <label style={{ ...S.fieldLabel, marginTop: 12 }}>Exam Password</label>
          <div style={S.inputWithIcon}>
            <KeyRound size={15} color="var(--text-muted)" />
            <input
              style={S.iconInput}
              type="password"
              value={examPasswordInput}
              onChange={(e) => { setExamPasswordInput(e.target.value); setExamLoginError(""); }}
              placeholder="Exam password"
              autoComplete="off"
            />
          </div>

          {examLoginError && (
            <p style={{ color: "var(--destructive)", fontSize: 12.5, fontWeight: 600, margin: "12px 0 0", textAlign: "center" }}>
              {examLoginError}
            </p>
          )}

          <button
            style={{ ...S.primaryBtn, marginTop: 18 }}
            type="submit"
            disabled={examLoggingIn || !examUsername.trim() || !examPasswordInput.trim()}
          >
            {examLoggingIn ? "Signing in…" : "Continue to Exam"}
          </button>

          <p style={{ color: "var(--text-muted)", fontSize: 11.5, margin: "14px 0 0", textAlign: "center" }}>
            Already have a student portal account?{" "}
            <a href="/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Log in instead</a>
          </p>
        </form>
        <div style={{ position: "absolute", top: 20, right: 24 }}><ThemeToggle /></div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="dash-main" style={S.stateWrap}>
        <div className="dash-spin" style={S.spinner} />
        <p style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: 13.5 }}>Preparing your exam session…</p>
        <div style={{ position: "absolute", top: 20, right: 24 }}><ThemeToggle /></div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="dash-main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
            <AlertTriangle size={26} color="var(--destructive)" />
          </div>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, textAlign: "center", lineHeight: 1.6, margin: "16px 0 0" }}>{errorMsg}</p>
          <button style={S.secondaryBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Go Back
          </button>
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}><ThemeToggle /></div>
      </div>
    );
  }

  if (phase === "ended") {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    })();
    const wasExamOnly = !!currentUser.examOnly;

    return (
      <div className="dash-main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--success-tint)" }}>
            <CheckCircle2 size={26} color="var(--success)" />
          </div>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, textAlign: "center", margin: "16px 0 0" }}>
            {errorMsg || "This assessment is complete."}
          </p>
          {wasExamOnly ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", margin: "12px 0 0" }}>
              You can close this tab now.
            </p>
          ) : (
            <button style={S.primaryBtn} onClick={() => navigate("/student/e-assessments")}>
              Back to Assessments
            </button>
          )}
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}><ThemeToggle /></div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div style={S.lockOverlay}>
        <div className="dash-card" style={{ ...S.panelCard, border: "1px solid var(--destructive)", maxWidth: 440 }}>
          <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
            <Lock size={26} color="var(--destructive)" />
          </div>
          <h2 style={{ margin: "16px 0 10px", color: "var(--destructive)", fontSize: 19, fontWeight: 800, textAlign: "center" }}>Device Locked</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13.5, textAlign: "center", margin: "0 0 16px" }}>{lockReason}</p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, textAlign: "center" }}>
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
      <div className="dash-main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--primary-tint)" }}>
            <KeyRound size={26} color="var(--primary)" />
          </div>
          <h2 style={{ margin: "16px 0 8px", color: "var(--text)", fontSize: 18, fontWeight: 800, textAlign: "center" }}>Your Exam Token</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", textAlign: "center" }}>
            This token belongs only to you for this assessment. Write it down or save it somewhere
            safe — you'll need to type it again on the next screen to open your paper, and it will
            lock to whichever device you use first.
          </p>
          <div style={S.tokenDisplay}>{token}</div>
          {coverPageUrl && (
            <a
              href={resolveFileUrl(coverPageUrl)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, margin: "0 0 16px",
                padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                color: "var(--primary)", border: "1px solid var(--primary)", textDecoration: "none",
              }}
            >
              📄 View Exam Cover Page / Instructions
            </a>
          )}
          <button
            style={{ ...S.primaryBtn, opacity: revealCountdown > 0 ? 0.55 : 1, cursor: revealCountdown > 0 ? "not-allowed" : "pointer" }}
            onClick={confirmSaved}
            disabled={revealCountdown > 0}
          >
            {revealCountdown > 0 ? `I've saved my token (${revealCountdown}s)` : "I've saved my token — Continue"}
          </button>
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}><ThemeToggle /></div>
      </div>
    );
  }

  /* ── step 2: re-enter the token to prove it was saved, then activate ── */
  if (phase === "verify") {
    return (
      <div className="dash-main" style={S.stateWrap}>
        <form className="dash-card" style={S.panelCard} onSubmit={handleVerifySubmit}>
          <div style={{ ...S.iconCircle, background: "var(--primary-tint)" }}>
            <PenLine size={26} color="var(--primary)" />
          </div>
          <h2 style={{ margin: "16px 0 8px", color: "var(--text)", fontSize: 18, fontWeight: 800, textAlign: "center" }}>Enter Your Token to Begin</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", textAlign: "center" }}>
            Type the token you just saved. Once it's accepted, your paper opens and this device
            locks to the exam until you submit.
          </p>
          <input
            style={S.verifyInput}
            value={verifyInput}
            onChange={(e) => { setVerifyInput(e.target.value); setVerifyError(""); }}
            placeholder="Enter token"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
          />
          {verifyError && <p style={{ color: "var(--destructive)", fontSize: 12.5, fontWeight: 600, margin: "10px 0 0", textAlign: "center" }}>{verifyError}</p>}
          <button style={{ ...S.primaryBtn, marginTop: 18 }} type="submit" disabled={activating || !verifyInput.trim()}>
            {activating ? "Starting…" : "Start Exam"}
          </button>
          <button
            type="button"
            style={{ ...S.secondaryBtn, marginTop: 10, width: "100%", justifyContent: "center" }}
            onClick={() => setPhase("reveal")}
            disabled={activating}
          >
            Show token again
          </button>
        </form>
        <div style={{ position: "absolute", top: 20, right: 24 }}><ThemeToggle /></div>
      </div>
    );
  }

  /* ── active exam ── */
  return (
    <main className="dash-main" style={S.page}>
      <div className="exam-top-bar" style={S.topBar}>
        <div>
          <h1 style={S.examTitle}>{assessment?.title}</h1>
          <p style={S.examMeta}>{assessment?.subject} · Token <strong style={{ color: "var(--primary)" }}>{token}</strong></p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...S.timer, color: secondsLeft < 60 ? "var(--destructive)" : "var(--text)" }}>
            <Timer size={16} /> {mmss(secondsLeft)}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {cameraStatus === "active" && !faceVisible && (
        <div className="eyes-off-flash" style={S.eyesOffBanner}>
          <EyeOff size={18} color="#fff" style={{ flexShrink: 0 }} />
          <span style={S.eyesOffBannerText}>Keep your eyes on the computer</span>
        </div>
      )}

      {violations > 0 && (
        <div style={S.warningStrip}>
          <ShieldAlert size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
          <span>Warning {violations}/{MAX_VIOLATIONS}: suspicious activity detected on this device. Reaching {MAX_VIOLATIONS} will lock your exam.</span>
        </div>
      )}

      {cameraStatus === "denied" && (
        <div style={S.warningStrip}>
          <CameraOff size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
          <span>Camera access was not granted, so eye-gaze monitoring is off for this session. This alone will not affect your submission.</span>
        </div>
      )}

      {/* Floating camera-monitor widget — visible to the student the whole
          time their camera is on, on purpose: the point is honest, visible
          monitoring, not a hidden check. */}
      {(cameraStatus === "requesting" || cameraStatus === "active") && (
        <div style={S.camWidget}>
          <div style={{ ...S.camDot, background: faceVisible ? "var(--success)" : "var(--destructive)" }} />
          <video ref={videoRef} muted playsInline style={S.camVideo} />
          <div style={S.camStatusText}>
            {cameraStatus === "requesting" ? (
              <><Camera size={12} /> Starting camera…</>
            ) : faceVisible ? (
              <><Eye size={12} /> Looking at screen</>
            ) : (
              <><EyeOff size={12} color="var(--destructive)" />
                <span style={{ color: "var(--destructive)" }}>
                  Eyes off screen — {faceAbsentSeconds}s
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {assessment?.instructions && (
        <div className="dash-card" style={S.instructionsBox}>
          <ClipboardList size={16} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span><strong>Instructions:</strong> {assessment.instructions}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} className="dash-card" style={S.qCard}>
            <p style={S.qText}>
              <span style={{ color: "var(--primary)", marginRight: 8 }}>Q{i + 1}.</span>{q.question_text}
              <span style={S.qMarks}>{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
            </p>

            {Array.isArray(q.images) && q.images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                {q.images.map((img) => (
                  <img
                    key={img.id}
                    src={resolveFileUrl(img.image_url)}
                    alt="Diagram for this question"
                    style={{ maxWidth: 260, maxHeight: 220, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)" }}
                  />
                ))}
              </div>
            )}

            {q.question_type === "essay" ? (
              <textarea
                style={S.essayInput}
                placeholder="Type your answer here…"
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((o) => (
                  <label key={o.option_label} className="exam-option-row" style={{
                    ...S.optionRow,
                    borderColor: answers[q.id] === o.option_label ? "var(--primary)" : "var(--border)",
                    background: answers[q.id] === o.option_label ? "var(--primary-tint)" : "var(--bg)",
                  }}>
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={answers[q.id] === o.option_label}
                      onChange={() => setAnswers({ ...answers, [q.id]: o.option_label })}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>{o.option_label}.</span>
                    <span style={{ color: "var(--text)" }}>{o.option_text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button style={S.submitBtn} onClick={() => handleSubmit(false)} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Assessment"}
      </button>
    </main>
  );
}

/* ════════════════════════════════
   STYLES — token-driven, mirrors
   the dashboard's "D" style object
════════════════════════════════ */
const S = {
  page: {
    padding: "24px 32px 90px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: 900,
    margin: "0 auto",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 14,
    position: "sticky",
    top: 0,
    background: "var(--bg)",
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 5,
  },
  examTitle: { margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  examMeta: { margin: 0, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 },
  timer: {
    display: "flex", alignItems: "center", gap: 7,
    fontSize: 16, fontWeight: 800, fontFamily: "monospace",
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: "9px 16px",
    boxShadow: "var(--shadow-sm)",
  },
  themeToggle: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)",
    width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer",
  },
  warningStrip: {
    display: "flex", alignItems: "center", gap: 10,
    background: "var(--warning-tint)", border: "1px solid var(--warning)",
    color: "var(--warning)", borderRadius: "var(--radius-sm)",
    padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16,
  },
  eyesOffBanner: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    background: "var(--destructive)", border: "1px solid var(--destructive)",
    borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 16,
  },
  eyesOffBannerText: {
    color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: "0.01em",
  },
  camWidget: {
    position: "fixed", bottom: 18, right: 18, zIndex: 500,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  },
  camVideo: {
    width: 120, height: 90, borderRadius: 8, objectFit: "cover",
    background: "#000", transform: "scaleX(-1)", // mirror, like a real camera preview
  },
  camDot: {
    position: "absolute", top: 14, right: 14,
    width: 9, height: 9, borderRadius: "50%",
    boxShadow: "0 0 0 2px var(--card)",
  },
  camStatusText: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
  },
  instructionsBox: {
    display: "flex", gap: 10,
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "14px 16px", fontSize: 13, color: "var(--text-secondary)",
    lineHeight: 1.7, marginBottom: 20, boxShadow: "var(--shadow-sm)",
  },
  qCard: {
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: 20, boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.15s ease",
  },
  qText: { margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 },
  qMarks: { float: "right", fontSize: 11, color: "var(--text-muted)", fontWeight: 700 },
  optionRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid", cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  essayInput: {
    width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    fontSize: 14, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
  },
  submitBtn: {
    width: "100%", padding: 15, marginTop: 24, border: "none", borderRadius: "var(--radius-sm)",
    background: "var(--success)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
  },

  stateWrap: {
    minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 16, padding: 24, position: "relative",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  spinner: {
    width: 40, height: 40, border: "4px solid var(--border)", borderTop: "4px solid var(--primary)",
    borderRadius: "50%",
  },
  panelCard: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "34px 30px", maxWidth: 420, width: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", boxShadow: "var(--shadow)",
  },
  iconCircle: {
    width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
  },
  primaryBtn: {
    width: "100%", padding: "13px 18px", border: "none", borderRadius: "var(--radius-sm)",
    background: "var(--primary)", color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer",
    marginTop: 8,
  },
  secondaryBtn: {
    display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
    padding: "10px 20px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--bg)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 700,
    fontSize: 13.5, marginTop: 14,
  },
  tokenDisplay: {
    background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)",
    padding: "18px 14px", fontFamily: "monospace", fontSize: 30, fontWeight: 800, letterSpacing: 6,
    color: "var(--primary)", margin: "0 0 20px", width: "100%", textAlign: "center", boxSizing: "border-box",
  },
  verifyInput: {
    width: "100%", padding: "13px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--bg)", color: "var(--text)", fontSize: 19, fontWeight: 700, letterSpacing: 4,
    textAlign: "center", fontFamily: "monospace", boxSizing: "border-box",
  },
  fieldLabel: {
    display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6,
  },
  inputWithIcon: {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)",
    boxSizing: "border-box",
  },
  iconInput: {
    flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit",
  },
  lockOverlay: {
    position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,8,14,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 24,
  },
};