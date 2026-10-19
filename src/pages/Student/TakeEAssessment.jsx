import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { handleBeforeInput, handleAfterInput, handleEnterKey, fixWordBeforeCaret, setParagraphSeparator } from "../../utils/ruledTyping";
import { useParams, useNavigate } from "react-router-dom";
import API, { resolveFileUrl, BASE_URL } from "../../api";
import { useTheme } from "../../context/ThemeContext";
import {
  examCacheKey, loadExamCache, saveExamCache, clearExamCache,
  claimExamTab, examTabTakenByOther,
} from "../../utils/examCache";
import MusicAnswerBox from "../../components/music/MusicAnswerBox";
import {
  KeyRound, PenLine, Lock, Timer, AlertTriangle, CheckCircle2,
  ClipboardList, Sun, Moon, ArrowLeft, ShieldAlert, User, LogIn,
  Camera, CameraOff, Eye, EyeOff, ChevronLeft, ChevronRight, MonitorUp,
} from "lucide-react";

// The admin's "Desktop only" switch rejects phones/tablets with a 403 whose
// body carries this code (see backend/utils/deviceRestriction.js).
const isDeviceBlocked = (err) =>
  err?.response?.status === 403 && err?.response?.data?.code === "DEVICE_NOT_ALLOWED";

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
        Camera access is OPTIONAL: a student can start and complete
        the exam with no webcam at all, or after declining/losing
        camera permission. When a camera IS available and granted,
        this check deliberately never locks or interrupts the exam
        by itself — a false positive (bad lighting, a webcam blip)
        shouldn't cost a student their sitting. Instead, every time
        the student's eyes are off the screen it keeps quietly
        capturing a timestamped, captioned snapshot from their own
        camera feed and uploading it to the server for an invigilator
        to review after the fact — continuously, for as long as the
        condition persists, not just once.

   ACCESSIBILITY NOTE
   ─────────────────────────────────────────────────────────
   This page is built to be usable with a screen reader and the
   keyboard alone: landmarks, live-region announcements (see
   announce()), focus moved to each new screen/question, labelled
   form fields, and an essay editor with a keyboard-escapable table.
   Some security rules (gaze photos, camera position check, entire-
   screen sharing) are inherently visual. For students who need an
   accommodation, the server may return `accessibility_mode: true`
   in /security-settings; the client then skips camera/gaze
   monitoring. The server should also switch off require_camera /
   require_screen_share / lock_on_violations for that student.
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

    /* Rich-text essay box (EssayEditor) — the empty-state placeholder
       needs a real stylesheet rule (:empty:before), which an inline
       React style object can't express. */
    .essay-content:empty:before { content: attr(data-placeholder); color: var(--text-muted); }
    .essay-content sub { vertical-align: sub; font-size: 0.75em; }
    .essay-content sup { vertical-align: super; font-size: 0.75em; }
    .essay-content table { border-collapse: collapse; margin: 8px 0; width: 100%; table-layout: fixed; }
    .essay-content td, .essay-content th {
      border: 1px solid var(--border); padding: 6px 8px; vertical-align: top;
      min-width: 40px; word-break: break-word; overflow-wrap: anywhere;
    }
    .essay-content td:focus-within { background: var(--primary-tint); }

    @keyframes eyesOffFlash {
      0%, 100% { box-shadow: 0 0 0 0 var(--destructive); }
      50%      { box-shadow: 0 0 14px 3px var(--destructive); }
    }
    .eyes-off-flash { animation: eyesOffFlash 0.6s ease-in-out infinite; }

    /* ── active-exam container sizing ──
       The question-taking view should use almost the full browser
       width so there's room to read and work, rather than being
       boxed into a narrow column. */
    .exam-page-container { max-width: 95vw; }

    /* ── accessibility ── */
    .sr-only {
      position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
    .skip-link {
      position: absolute; left: 8px; top: -60px; z-index: 10000; padding: 10px 14px;
      background: var(--primary); color: #fff; border-radius: 8px; font-weight: 700; text-decoration: none;
    }
    .skip-link:focus { top: 8px; }
    [data-phase-heading]:focus, #exam-question:focus { outline: none; }
    [contenteditable]:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  `;
  document.head.appendChild(el);
};

// True when the page is running inside Safe Exam Browser (it adds "SEB/<version>" to the User-Agent).
const IN_SEB = typeof navigator !== "undefined" && /\bSEB\/\d/i.test(navigator.userAgent || "");

// URL of the .seb file for an assessment, plus the seb:// / sebs:// form that
// makes the OS launch the INSTALLED Safe Exam Browser and hand it that file.
const sebConfigHttpUrl = (assessmentId) => {
  const api = new URL(BASE_URL, window.location.origin);
  const base = api.href.replace(/\/+$/, "");
  return `${base}/e-assessments/public/${assessmentId}/seb-config?origin=${encodeURIComponent(window.location.origin)}`;
};
const sebLaunchUrl = (assessmentId) =>
  sebConfigHttpUrl(assessmentId).replace(/^https:/i, "sebs:").replace(/^http:/i, "seb:");
const HEARTBEAT_MS = 15000;
// When time runs out every student's browser would submit in the same second and
// the server would have to write hundreds of papers at once. Each device waits a
// random 0–TIME_UP_JITTER_MS first so the room's submits arrive spread out. Kept
// well under the server's 2-minute auto-submit grace, and the answers are already
// autosaved, so nothing is at risk during the wait.
const TIME_UP_JITTER_MS = 20000;
const RETRY_JITTER_MS = 4000; // extra random delay added to every submit retry
const LOCK_POLL_MS = 5000; // how often a locked screen asks the server whether an admin unlocked it
const MAX_VIOLATIONS = 3;
const START_PAPER_TIMEOUT_MS = 25000; // max wait for the paper to load after activation
// Turns a getUserMedia failure into something a student can act on.
const describeCameraError = (err) => {
  const n = err?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError" || n === "PermissionDeniedError") {
    return "Camera access is blocked. Allow the camera for this site (click the camera or lock icon beside the address bar and choose Allow). In Safe Exam Browser, camera access must be enabled in the exam configuration. Then try again.";
  }
  if (n === "NotFoundError" || n === "DevicesNotFoundError" || n === "OverconstrainedError") {
    return "No camera was found on this computer. Connect or enable a camera, then try again.";
  }
  if (n === "NotReadableError" || n === "TrackStartError" || n === "AbortError") {
    return "Your camera is being used by another app (Zoom, Teams, WhatsApp, etc.). Close it, then try again.";
  }
  return "Your camera could not be started. Check that it is connected and allowed, then try again.";
};
const DEFAULT_SECURITY = {
  require_camera: true,
  require_screen_share: true,
  require_fullscreen: true,
  lock_on_violations: true,
};
const REVEAL_SECONDS = 5; // minimum time the student must sit with the token before continuing

/* ── START-EXAM RETRY CONFIG — ported from exam.html's exam-login retry
   block. There, it wraps the kiosk's own username/password login call;
   this build has no separate exam-login step (the student is already
   authenticated into the portal), so the equivalent single-shot,
   thundering-herd-prone request here is POST /start-exam in bootStart
   below — the first exam-specific call a student makes, and the one
   every student in a class is likely to fire within the same second
   the moment a timed assessment opens. A failed call used to just show
   an error and stop; this adds the same bounded 15-second retry window
   with backoff + jitter for TRANSIENT failures only:
     - retry on no response at all (the request never reached the
        server — connection refused/reset/timeout) or HTTP
        408/429/500/502/503/504
     - stop immediately on anything else (a real 400/404/423/409 is
       never retried — those already have their own specific handling
       below and retrying them would just repeat the same rejection) */
const START_EXAM_RETRY_WINDOW_MS = 15000;
const START_EXAM_RETRY_BASE_DELAY_MS = 400;
const START_EXAM_RETRY_MAX_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStartExamError = (err) => {
  if (!err?.response) return true; // axios never got a response at all
  return [408, 429, 500, 502, 503, 504].includes(err.response.status);
};

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
   Camera access is OPTIONAL, both to start the exam and throughout it
   (see the optional check inside handleVerifySubmit below) — a student
   with no webcam, or who declines/loses camera permission at any
   point, simply proceeds with this one check turned off and a
   one-time notice; nothing about starting or continuing the exam
   depends on it. What it also never does is feed into the 3-strikes
   lockout at all — see registerViolation() calls (or rather, the
   deliberate absence of one) below. */
const EYES_OFF_LIMIT_MS = 10000;
const FACE_CHECK_INTERVAL_MS = 1000;
const EAR_CLOSED_THRESHOLD = 0.20;   // below this, an eye counts as closed (typical open EAR is ~0.28-0.35)
const YAW_OFFSET_LIMIT = 0.16;       // how far the nose may sit off-center (as a fraction of face width) before "turned away"
const FACE_API_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
// "ideal" (not exact) so a webcam that can't do 640x480 still connects at
// its own best resolution instead of getUserMedia() failing outright.
// 640x480 (up from the previous 320x240) gives the face detector more to
// work with and makes the saved violation photos legible instead of a
// postage stamp.
const CAMERA_VIDEO_CONSTRAINTS = { width: { ideal: 640 }, height: { ideal: 480 } };
// How often another evidence photo is captured while the student's eyes
// stay off the screen, continuously, for as long as the condition lasts —
// this is the "keep photographing" behavior instead of locking.
const VIOLATION_PHOTO_INTERVAL_MS = 5000;
// True when the current <video> frame is (almost) entirely black — a camera
// that is "on" but not delivering a picture. Samples a tiny downscaled copy.
const isFrameBlank = (video) => {
  try {
    const c = document.createElement("canvas");
    c.width = 32; c.height = 24;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(video, 0, 0, 32, 24);
    const d = g.getImageData(0, 0, 32, 24).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
    return sum / (d.length / 4) / 3 < 6; // mean brightness out of 255
  } catch {
    return false; // can't tell — don't block the photo
  }
};

// One JPEG frame of the shared screen (downscaled to keep the upload small),
// or null if sharing isn't active / the frame isn't ready.
const grabScreenshot = (video) => {
  try {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(video.videoWidth * scale);
    c.height = Math.round(video.videoHeight * scale);
    c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
};

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

/* ── pre-exam camera check ──
   Works out whether the face in the frame is in a good, central position.
   `faces` = face-api results ({ detection, landmarks }); the on-screen preview
   is mirrored, so left/right hints are given the way the student sees it. */
const CAM_TEST_INTERVAL_MS = 500;
const CAM_TEST_HOLD_TICKS = 4; // 4 x 500 ms = about 2 s of staying in position before the photo is taken
const analyseFacePosition = (faces, vw, vh) => {
  if (!faces.length) return { ok: false, hint: "We can't see your face. Sit in front of the camera with light on your face." };
  if (faces.length > 1) return { ok: false, hint: "More than one face is in view. Only you should be in front of the camera." };
  const { detection, landmarks } = faces[0];
  const b = detection.box;
  const cx = (b.x + b.width / 2) / vw; // raw camera frame, 0..1
  const cy = (b.y + b.height / 2) / vh;
  const w = b.width / vw;
  const shownCx = 1 - cx; // the preview is mirrored
  if (w < 0.2) return { ok: false, hint: "Move a little closer to the camera." };
  if (w > 0.5) return { ok: false, hint: "Move back a little from the camera." };
  if (shownCx < 0.38) return { ok: false, hint: "Move a little to the right." };
  if (shownCx > 0.62) return { ok: false, hint: "Move a little to the left." };
  if (cy < 0.3) return { ok: false, hint: "Your face is too high in the frame. Move down a little, or tilt your screen up." };
  if (cy > 0.62) return { ok: false, hint: "Your face is too low in the frame. Move up a little, or tilt your screen down." };
  if (!isLookingAtScreen(landmarks)) return { ok: false, hint: "Look straight at the screen and keep your eyes open." };
  return { ok: true, hint: "Perfect. Hold still…", box: { cx, cy, w } };
};

const getDeviceId = () => {
  let id = localStorage.getItem("exam_device_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem("exam_device_id", id);
  }
  return id;
};

/* ── accessibility helpers ── */
// Two persistent live regions living on <body>, so announcements work in EVERY
// phase without touching each screen's JSX.
const getLiveRegion = (kind) => {
  const regionId = `exam-live-${kind}`;
  let el = document.getElementById(regionId);
  if (!el) {
    el = document.createElement("div");
    el.id = regionId;
    el.className = "sr-only";
    el.setAttribute("role", kind === "assertive" ? "alert" : "status");
    el.setAttribute("aria-live", kind);
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
  }
  return el;
};
const announce = (message, assertive = false) => {
  if (typeof document === "undefined" || !message) return;
  const el = getLiveRegion(assertive ? "assertive" : "polite");
  el.textContent = ""; // clear first so a repeated message is read again
  setTimeout(() => { el.textContent = message; }, 60);
};
const spokenTime = (total) => {
  const m = Math.floor(total / 60), s = Math.floor(total % 60);
  const parts = [];
  if (m) parts.push(`${m} minute${m !== 1 ? "s" : ""}`);
  if (s || !m) parts.push(`${s} second${s !== 1 ? "s" : ""}`);
  return parts.join(" ");
};
const spellOut = (t) => String(t || "").split("").join(", "); // "A7K2QZ" -> "A, 7, K, 2, Q, Z"
const PHASE_TITLES = {
  examlogin: "Exam sign in", loading: "Preparing exam", reveal: "Your exam token",
  verify: "Enter token to begin", active: "Exam in progress", locked: "Exam locked",
  ended: "Exam finished", error: "Problem", devicedenied: "Device not allowed",
};

const lockKey = (assessmentId) => `exam_lock_${assessmentId}`;
// The session token is remembered next to the lock so a refreshed/reopened
// locked screen can still check with the server whether an admin freed it.
const tokenKey = (assessmentId) => `exam_token_${assessmentId}`;
// Which attempt (1 = first sitting, 2+ = admin-granted resits) this browser's
// saved answers belong to, so a resit never starts pre-filled with the
// previous attempt's answers.
const attemptKey = (assessmentId) => `exam_attempt_${assessmentId}`;
// The exam is cached on this device; whatever changed is synced to the
// server this often while the exam is open (and immediately on reconnect).
const AUTOSAVE_MS = 30 * 1000;

// Ported from exam.html's answersKey/saveAnswer — the React build never
// persisted in-progress answers anywhere, so a refresh mid-exam (which
// already re-runs the whole reveal/verify flow from scratch, see the
// boot effect below) silently lost every answer the student had entered
// so far. Scoped per-assessment, same as the lock key beside it.
const answersKey = (assessmentId) => `exam_answers_${assessmentId}`;

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

/* ── rich-text essay answer box — ported from exam.html's essay
   toolbar (contenteditable + document.execCommand). A plain <textarea>
   used to be the only essay input in this build, so students couldn't
   format an answer at all; this brings it in line with the kiosk.

   Deliberately its own component, not inline JSX in the parent: the
   parent re-renders every second (the exam timer ticks via state), and
   a contentEditable node must NEVER have its content re-driven by
   React on a render it didn't cause itself — that resets the cursor
   position and can wipe what the student is mid-typing. Content is
   seeded into the DOM imperatively, once per question (the effect
   below, keyed on `id`), and never touched again except by the
   student's own typing or a toolbar command — never by a JSX prop. */
function EssayEditor({ id, initialValue, onChange, autoCapitalize = true, autoFullstop = true }) {
  // The paper's two typing-help switches, read through refs so the one-time native
  // listener below always sees the current setting.
  const capsRef = useRef(autoCapitalize);
  capsRef.current = autoCapitalize;
  const stopRef = useRef(autoFullstop);
  stopRef.current = autoFullstop;
  const contentRef = useRef(null);
  const toolbarRef = useRef(null);
  const [activeCmds, setActiveCmds] = useState({});
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [focusCmd, setFocusCmd] = useState("undo"); // roving tabindex: the one toolbar button in the Tab order

  const countFrom = (el) => {
    const text = el?.textContent || "";
    setWordCount(text.trim().length ? text.trim().split(/\s+/).length : 0);
    setCharCount(text.length);
  };

  /* ── typing performance (matters most for braille / screen-reader input) ──
     Every keystroke used to push the whole answer up to the page, which
     re-rendered the exam, rewrote localStorage and rewrote the entire cached
     paper in IndexedDB. Contracted (Grade 2) braille input fires many more
     input events than ordinary typing — it deletes and re-types the word
     being translated — so the editor lagged and dropped or garbled
     characters. Now the answer is saved ~300 ms after typing pauses, and
     immediately on blur, when the page is hidden, and on leaving the question.
     Saving is also held back while an IME / braille composition is in
     progress, so the text being translated is never rewritten under the user. */
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(false);
  const composingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flushSave = () => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    if (!pendingSaveRef.current || !contentRef.current) return;
    pendingSaveRef.current = false;
    onChangeRef.current(contentRef.current.innerHTML);
    countFrom(contentRef.current);
  };
  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = () => {
    pendingSaveRef.current = true;
    if (composingRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushSaveRef.current(), 300);
  };

  useEffect(() => {
    const node = contentRef.current; // kept: still readable after React detaches it
    const flushNow = () => flushSaveRef.current();
    const onHidden = () => { if (document.visibilityState === "hidden") flushNow(); };
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onHidden);
      clearTimeout(saveTimerRef.current);
      if (pendingSaveRef.current && node) {
        pendingSaveRef.current = false;
        onChangeRef.current(node.innerHTML);
      }
    };
  }, []);

  /* ── tables ──
     Students can insert a table and grow/shrink it from the toolbar.
     Everything here is plain DOM work on the contentEditable box and ends in
     commit(), which reports the new innerHTML exactly like typing does.
     NOTE: no window.prompt()/alert() anywhere in this flow — a native dialog
     blurs the window, which the exam page counts as "switched away" (a
     violation). The row/column picker is therefore an inline bar. Paste is
     intentionally NOT handled: the exam page blocks it on purpose. */
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [inCell, setInCell] = useState(false);
  const savedRange = useRef(null);

  const MAX_ROWS = 30;
  const MAX_COLS = 8;
  const clampNum = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.parseInt(v, 10) || lo));

  const currentCell = () => {
    const root = contentRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return null;
    let n = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentNode;
    const cell = n && n.closest ? n.closest("td,th") : null;
    return cell && root.contains(cell) ? cell : null;
  };

  const placeCaretIn = (cell) => {
    if (!cell) return;
    const r = document.createRange();
    r.selectNodeContents(cell);
    r.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const makeCell = () => {
    const c = document.createElement("td");
    c.innerHTML = "<br>"; // keeps an empty cell clickable/typeable
    return c;
  };

  const commit = () => {
    if (!contentRef.current) return;
    onChange(contentRef.current.innerHTML);
    countFrom(contentRef.current);
    updateToolbarState();
  };

  const openTablePicker = () => {
    const sel = window.getSelection();
    const root = contentRef.current;
    savedRange.current =
      root && sel && sel.rangeCount > 0 && root.contains(sel.getRangeAt(0).commonAncestorContainer)
        ? sel.getRangeAt(0).cloneRange()
        : null;
    setTablePickerOpen((o) => !o);
  };

  const insertTable = () => {
    const root = contentRef.current;
    if (!root) return;
    const rows = clampNum(tableRows, 1, MAX_ROWS);
    const cols = clampNum(tableCols, 1, MAX_COLS);
    root.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedRange.current) {
      sel.addRange(savedRange.current);
    } else {
      const r = document.createRange(); // no caret yet — put the table at the end of the answer
      r.selectNodeContents(root);
      r.collapse(false);
      sel.addRange(r);
    }
    const before = new Set(root.querySelectorAll("table"));
    const row = `<tr>${"<td><br></td>".repeat(cols)}</tr>`;
    // trailing paragraph so there is always somewhere to keep typing below the table
    document.execCommand("insertHTML", false, `<table><tbody>${row.repeat(rows)}</tbody></table><p><br></p>`);
    const created = Array.from(root.querySelectorAll("table")).find((t) => !before.has(t));
    if (created) placeCaretIn(created.querySelector("td"));
    setTablePickerOpen(false);
    commit();
    announce(`Table with ${rows} row${rows !== 1 ? "s" : ""} and ${cols} column${cols !== 1 ? "s" : ""} inserted. Tab moves between cells. Control and Enter leaves the table.`);
  };

  const addRowAfter = (row, caretCol) => {
    const table = row.closest("table");
    if (table.rows.length >= MAX_ROWS) return null;
    const nr = document.createElement("tr");
    for (let i = 0; i < row.children.length; i += 1) nr.appendChild(makeCell());
    row.after(nr);
    placeCaretIn(nr.children[Math.min(caretCol, nr.children.length - 1)]);
    return nr;
  };

  const tableOp = (op) => {
    const cell = currentCell();
    if (!cell) return;
    const row = cell.parentElement;
    const table = cell.closest("table");
    const col = Array.prototype.indexOf.call(row.children, cell);
    const rows = Array.from(table.rows);
    let said = "";

    if (op === "rowAdd") {
      if (addRowAfter(row, col)) said = "Row added below.";
    } else if (op === "rowDelete") {
      if (rows.length <= 1) table.remove();
      else {
        const next = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        placeCaretIn(next.children[Math.min(col, next.children.length - 1)]);
      }
      said = "Row deleted.";
    } else if (op === "colAdd") {
      if (row.children.length >= MAX_COLS) return;
      rows.forEach((r) => {
        const c = makeCell();
        const ref = r.children[col];
        if (ref) ref.after(c); else r.appendChild(c);
      });
      placeCaretIn(row.children[col + 1]);
      said = "Column added to the right.";
    } else if (op === "colDelete") {
      if (row.children.length <= 1) table.remove();
      else {
        rows.forEach((r) => r.children[col]?.remove());
        placeCaretIn(row.children[Math.min(col, row.children.length - 1)]);
      }
      said = "Column deleted.";
    } else if (op === "tableDelete") {
      table.remove();
      said = "Table deleted.";
    }
    commit();
    if (said) announce(said);
  };

  // Tab / Shift+Tab walk between cells (Tab in the last cell adds a row).
  // Outside a table Tab keeps its normal focus-moving behaviour.
  // Ctrl/Cmd+Enter leaves the table (so keyboard and screen-reader users are
  // never trapped in it). Escape is deliberately NOT used: in fullscreen the
  // browser takes Escape to exit fullscreen, which the exam counts as a violation.
  const onEditorKeyDown = (e) => {
    // Ruled-paper typing help: Enter ends the line with a full stop and starts a new one.
    if (handleEnterKey(e, contentRef.current, { capitals: capsRef.current, fullstop: stopRef.current })) return;
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      const cell = currentCell();
      if (cell) {
        e.preventDefault();
        const table = cell.closest("table");
        let after = table.nextElementSibling;
        if (!after) {
          after = document.createElement("p");
          after.innerHTML = "<br>";
          table.after(after);
          commit();
        }
        placeCaretIn(after);
        announce("Left the table.");
      }
      return;
    }
    if (e.key !== "Tab") return;
    const cell = currentCell();
    if (!cell) return;
    e.preventDefault();
    const cells = Array.from(cell.closest("table").querySelectorAll("td,th"));
    const i = cells.indexOf(cell);
    if (e.shiftKey) {
      if (i > 0) placeCaretIn(cells[i - 1]);
    } else if (i < cells.length - 1) {
      placeCaretIn(cells[i + 1]);
    } else if (addRowAfter(cell.parentElement, 0)) {
      commit();
      announce("Row added.");
    }
  };

  // Seed this question's saved answer into the DOM exactly once per
  // question (id change = a fresh mount, thanks to key={q.id} on the
  // wrapper below) — never re-run from a parent re-render alone.
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = initialValue || "";
      countFrom(contentRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-capital letter at the start of every sentence. Must be a NATIVE
  // listener: React's onBeforeInput is a polyfill without inputType/isComposing.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;
    const onBefore = (e) => { if (capsRef.current) handleBeforeInput(e, node); };
    node.addEventListener("beforeinput", onBefore);
    return () => node.removeEventListener("beforeinput", onBefore);
  }, []);

  const updateToolbarState = () => {
    const next = {};
    ["bold", "italic", "underline", "strikeThrough", "subscript", "superscript", "insertUnorderedList", "insertOrderedList"].forEach((cmd) => {
      try { next[cmd] = document.queryCommandState(cmd); } catch { /* unsupported in this browser — leave un-toggled */ }
    });
    setActiveCmds(next);
    setInCell(!!currentCell());
  };

  const runCommand = (cmd) => {
    if (!contentRef.current) return;
    contentRef.current.focus();
    document.execCommand(cmd, false, null);
    onChange(contentRef.current.innerHTML);
    countFrom(contentRef.current);
    updateToolbarState();
  };

  // One Tab stop for the whole toolbar; arrow keys / Home / End move within it.
  const onToolbarKeyDown = (e) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const btns = Array.from(toolbarRef.current.querySelectorAll("button:not([disabled])"));
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0
      : e.key === "End" ? btns.length - 1
        : (i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
    setFocusCmd(btns[next].dataset.cmd);
    btns[next].focus();
  };

  const TOOLBAR = [
    { cmd: "undo", label: "↶", title: "Undo" },
    { cmd: "redo", label: "↷", title: "Redo" },
    { sep: true },
    { cmd: "bold", label: <b>B</b>, title: "Bold" },
    { cmd: "italic", label: <i>I</i>, title: "Italic" },
    { cmd: "underline", label: <u>U</u>, title: "Underline" },
    { cmd: "strikeThrough", label: <s>S</s>, title: "Strikethrough" },
    { sep: true },
    { cmd: "subscript", label: "X₂", title: "Subscript" },
    { cmd: "superscript", label: "X²", title: "Superscript" },
    { sep: true },
    { cmd: "insertUnorderedList", label: "•—", title: "Bulleted list" },
    { cmd: "insertOrderedList", label: "1.—", title: "Numbered list" },
    { cmd: "outdent", label: "⇤", title: "Decrease indent" },
    { cmd: "indent", label: "⇥", title: "Increase indent" },
    { sep: true },
    { cmd: "removeFormat", label: "Tx", title: "Clear formatting" },
  ];

  return (
    <div style={S.essayBox}>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Text formatting. Use left and right arrow keys to move between buttons."
        aria-controls={`essay-${id}`}
        style={S.essayToolbar}
        onKeyDown={onToolbarKeyDown}
      >
        {TOOLBAR.map((item, i) => item.sep ? (
          <span key={`sep-${i}`} style={S.essaySep} aria-hidden="true" />
        ) : (
          <button
            key={item.cmd}
            type="button"
            data-cmd={item.cmd}
            title={item.title}
            aria-label={item.title}
            aria-pressed={!!activeCmds[item.cmd]}
            tabIndex={focusCmd === item.cmd ? 0 : -1}
            style={{ ...S.essayToolbarBtn, ...(activeCmds[item.cmd] ? S.essayToolbarBtnActive : {}) }}
            onMouseDown={(e) => e.preventDefault()} // keep selection focused in the content box, not the button
            onFocus={() => setFocusCmd(item.cmd)}
            onClick={() => runCommand(item.cmd)}
          >
            <span aria-hidden="true">{item.label}</span>
          </button>
        ))}
        <span style={S.essaySep} aria-hidden="true" />
        <button
          type="button"
          data-cmd="table"
          title={inCell ? "Already inside a table" : "Insert table"}
          aria-label="Insert table"
          aria-expanded={tablePickerOpen}
          disabled={inCell}
          tabIndex={focusCmd === "table" ? 0 : -1}
          style={{ ...S.essayToolbarBtn, ...S.essayTextBtn, ...(tablePickerOpen ? S.essayToolbarBtnActive : {}), opacity: inCell ? 0.45 : 1, cursor: inCell ? "not-allowed" : "pointer" }}
          onMouseDown={(e) => e.preventDefault()}
          onFocus={() => setFocusCmd("table")}
          onClick={openTablePicker}
        >
          <span aria-hidden="true">▦</span> Table
        </button>
      </div>

      {tablePickerOpen && !inCell && (
        <div style={S.essayTableBar} role="group" aria-label="Insert table: choose rows and columns">
          <label style={S.essayTableLabel}>
            Rows
            <input type="number" min={1} max={MAX_ROWS} value={tableRows} onChange={(e) => setTableRows(e.target.value)} style={S.essayTableInput} />
          </label>
          <label style={S.essayTableLabel}>
            Columns
            <input type="number" min={1} max={MAX_COLS} value={tableCols} onChange={(e) => setTableCols(e.target.value)} style={S.essayTableInput} />
          </label>
          <button type="button" style={{ ...S.essayToolbarBtn, ...S.essayTextBtn, ...S.essayToolbarBtnActive }} onClick={insertTable}>Insert</button>
          <button type="button" style={{ ...S.essayToolbarBtn, ...S.essayTextBtn }} onClick={() => setTablePickerOpen(false)}>Cancel</button>
        </div>
      )}

      {inCell && (
        <div style={S.essayTableBar} role="toolbar" aria-label="Table tools">
          <span style={S.essayTableHint}>Table</span>
          {[
            ["rowAdd", "+ Row", "Add a row below"],
            ["colAdd", "+ Column", "Add a column to the right"],
            ["rowDelete", "− Row", "Delete this row"],
            ["colDelete", "− Column", "Delete this column"],
            ["tableDelete", "Delete table", "Remove the whole table"],
          ].map(([op, label, title]) => (
            <button
              key={op}
              type="button"
              title={title}
              aria-label={title}
              style={{ ...S.essayToolbarBtn, ...S.essayTextBtn, ...(op === "tableDelete" ? { color: "var(--destructive)" } : {}) }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => tableOp(op)}
            >
              {label}
            </button>
          ))}
          <span style={S.essayTableHint}>Tab moves between cells · Ctrl+Enter leaves the table</span>
        </div>
      )}
      <div
        ref={contentRef}
        id={`essay-${id}`}
        className="essay-content ruled-paper"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Your answer"
        aria-describedby={`essay-status-${id}`}
        tabIndex={0}
        onKeyDown={onEditorKeyDown}
        style={S.essayContent}
        data-placeholder="Type your answer here…"
        autoCapitalize={autoCapitalize ? "sentences" : "off"}
        onInput={(e) => { if (capsRef.current) handleAfterInput(e.nativeEvent, contentRef.current); scheduleSave(); }}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => {
          composingRef.current = false;
          // phone keyboards deliver words as compositions: capitalise a sentence-opening word once it is committed
          setTimeout(() => { if (capsRef.current && contentRef.current && !composingRef.current) fixWordBeforeCaret(contentRef.current, 0, false); }, 0);
          scheduleSave();
        }}
        onBlur={flushSave}
        onKeyUp={(e) => {
          // Only caret-movement keys can change which formats are active;
          // doing this on every typed character was needless per-keystroke work.
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) updateToolbarState();
        }}
        onMouseUp={updateToolbarState}
        onFocus={() => { setParagraphSeparator(); updateToolbarState(); }}
      />
      <div id={`essay-status-${id}`} style={S.essayStatus} aria-live="off">
        {autoFullstop && <span style={{ marginRight: "auto", fontWeight: 500 }}>Tip: press Enter at the end of a sentence — the full stop is added for you.</span>}
        <span>Words: {wordCount}</span>
        <span>Characters: {charCount}</span>
      </div>
    </div>
  );
}

export default function TakeEAssessment() {
  injectStyles();
  injectExamStyles();

  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const deviceId = useMemo(() => getDeviceId(), []);

  // examlogin | loading | reveal | verify | active | locked | ended | error
  const [phase, setPhase] = useState("examlogin");

  // Safe Exam Browser gate: when this exam requires SEB and we are in a normal
  // browser, launch the installed SEB automatically (it reopens this exam inside SEB).
  const [sebGate, setSebGate] = useState(IN_SEB ? "ok" : "checking"); // checking | needed | ok
  const [sebCustom, setSebCustom] = useState(false); // admin uploaded a .seb file for this exam
  const sebLaunchedRef = useRef(false);
  const [sebQuitIn, setSebQuitIn] = useState(null); // seconds until SEB closes itself after the exam is submitted
  useEffect(() => {
    if (IN_SEB) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await API.get(`/e-assessments/public/${id}/seb-info`);
        if (cancelled) return;
        if (r.data?.require_seb) {
          // "Continue in this browser" was pressed on this device for this exam:
          // go to the sign-in form. The server still decides (an admin must have
          // allowed this device under Device Locks), it is not a bypass.
          let continued = false;
          try { continued = sessionStorage.getItem(`doravo_seb_continue_${id}`) === "1"; } catch { /* ignore */ }
          if (continued) { setSebGate("ok"); return; }
          setSebGate("needed");
          if (r.data?.custom_config) {
            // Admin uploaded their own .seb: student downloads that file and opens it.
            setSebCustom(true);
          } else if (!sebLaunchedRef.current) {
            // Default (unchanged): launch the installed SEB automatically via sebs:// link.
            sebLaunchedRef.current = true;
            window.location.href = sebLaunchUrl(id);
          }
        } else setSebGate("ok");
      } catch { if (!cancelled) setSebGate("ok"); }
    })();
    return () => { cancelled = true; };
  }, [id]);
  // Exam file download. A web page cannot open a file by itself, so the flow is:
  // save the .seb (Chrome/Edge: a save dialog that starts in the Desktop folder;
  // other browsers: normal download), then the student double-clicks it.
  const [sebFileState, setSebFileState] = useState({ status: "idle", where: "", name: "" }); // idle | saving | saved | error
  const saveSebFile = async () => {
    setSebFileState({ status: "saving", where: "", name: "" });
    const fileName = `exam-${id}.seb`;
    try {
      const res = await API.get(`/e-assessments/public/${id}/seb-config`, {
        params: { origin: window.location.origin },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/seb" });
      if (typeof window.showSaveFilePicker === "function") {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            startIn: "desktop",
            types: [{ description: "Safe Exam Browser exam file", accept: { "application/seb": [".seb"] } }],
          });
          const w = await handle.createWritable();
          await w.write(blob);
          await w.close();
          setSebFileState({ status: "saved", where: "the folder you chose", name: handle.name || fileName });
          return;
        } catch (e) {
          if (e && e.name === "AbortError") { setSebFileState({ status: "idle", where: "", name: "" }); return; } // dialog closed
          /* picker unavailable/blocked: fall through to a normal download */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSebFileState({ status: "saved", where: "your Downloads folder", name: fileName });
    } catch {
      setSebFileState({ status: "error", where: "", name: "" });
    }
  };
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState("");

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // question_id -> value
  // One-question-at-a-time view, ported from exam.html — index into
  // `questions`. The React build used to render every question on one
  // long scrolling page; this matches the kiosk build's actual flow.
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Set once the submit-triggered logout has actually run — distinguishes
  // "just submitted, session cleared" from the other ways this screen can
  // land on the "ended" phase (already completed, session ended remotely),
  // where the student is still legitimately logged into the portal.
  const [loggedOut, setLoggedOut] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lockReason, setLockReason] = useState("");

  // camera/eye-gaze monitoring — see EYES_OFF_LIMIT_MS note above
  const [cameraStatus, setCameraStatus] = useState("idle"); // idle | requesting | active | nomodel | off  (nomodel = camera on, eye-gaze script unavailable)
  const [cameraError, setCameraError] = useState("");
  const [cameraRetry, setCameraRetry] = useState(0); // bump to restart camera monitoring after a failure
  // Pre-exam camera check (only when "Camera required" is on): the student
  // positions their face, a baseline photo is taken and saved, and only then
  // can the exam start. The stream is reused for monitoring once it starts.
  const [camTestStage, setCamTestStage] = useState("idle"); // idle | starting | positioning | captured
  const [camTestStream, setCamTestStream] = useState(null);
  const [camTestHint, setCamTestHint] = useState("");
  const [camTestGood, setCamTestGood] = useState(false);
  const [camTestHold, setCamTestHold] = useState(0);
  const [camTestPhoto, setCamTestPhoto] = useState("");
  const [camTestDone, setCamTestDone] = useState(false);
  const [camTestSaving, setCamTestSaving] = useState(false);
  const [camTestError, setCamTestError] = useState("");
  const [camTestManual, setCamTestManual] = useState(false); // detector couldn't load: student takes the photo by hand
  const [positionDrift, setPositionDrift] = useState(false); // drifted away from the camera-test position during the exam
  const camTestVideoRef = useRef(null);
  const camTestStreamRef = useRef(null);
  const baselineBoxRef = useRef(null); // where the face was in the camera-test photo
  // The live MediaStream, kept in STATE (not just a ref) so an effect can attach
  // it to the <video> once that element has actually mounted — see the
  // "attach stream to preview" effect below. This is the fix for the black camera.
  const [cameraStream, setCameraStream] = useState(null);
  // Optional full-screen sharing, used ONLY to take a screenshot alongside each
  // webcam photo. Browsers force the student to pick and approve the screen
  // themselves, so it can never be taken silently. idle | sharing | off
  const [screenStatus, setScreenStatus] = useState("idle");
  // Per-assessment security switches set by the admin (Admin > E-Assessments >
  // Exam security). Defaults are STRICT (all ON), matching the server, and are
  // replaced by the real values as soon as the exam-only session exists —
  // see loadSecuritySettings(). Previously this page ignored the switches
  // entirely, so screen sharing stayed mandatory even when switched OFF.
  const [security, setSecurity] = useState(DEFAULT_SECURITY);
  const securityRef = useRef(DEFAULT_SECURITY);
  // True once this device has pressed Resume and the server activated it. From
  // then on "active" on the server means "unlocked and mine", NOT "my lock
  // never reached the server" — the locked screen must not re-report a lock.
  const resumeAttemptedRef = useRef(false);
  const [needsRelogin, setNeedsRelogin] = useState(false);
  const [pollNotice, setPollNotice] = useState("");
  const [screenSurface, setScreenSurface] = useState(""); // monitor | window | browser
  const [screenError, setScreenError] = useState("");
  const [faceVisible, setFaceVisible] = useState(true); // true = "looking at the screen" (see isLookingAtScreen)
  const [faceAbsentSeconds, setFaceAbsentSeconds] = useState(0); // seconds of continuous not-looking-at-screen
  const [photosCaptured, setPhotosCaptured] = useState(0); // evidence photos sent this session — for the student-facing widget only

  // exam-login step (username + this assessment's exam password —
  // no portal account required)
  // Pre-filled from the /take-assessment picker, where the student already
  // entered their assessment number (= username) and was identified.
  const [examIdentity, setExamIdentity] = useState(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem("doravo_exam_identity") || "null");
      return v && v.username ? v : null;
    } catch { return null; }
  });
  const [examUsername, setExamUsername] = useState(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem("doravo_exam_identity") || "null");
      return v && v.username ? String(v.username) : "";
    } catch { return ""; }
  });
  const [examPasswordInput, setExamPasswordInput] = useState("");
  const [examLoginError, setExamLoginError] = useState("");
  const [examLoggingIn, setExamLoggingIn] = useState(false);

  // reveal step
  const [revealCountdown, setRevealCountdown] = useState(REVEAL_SECONDS);

  // verify step
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [activating, setActivating] = useState(false);
  const [startStep, setStartStep] = useState(""); // what "Starting…" is currently doing

  const heartbeatRef = useRef(null);
  const tokenRef = useRef("");
  const answersRef = useRef({});          // always the latest answers (timers/intervals read this)
  const handleSubmitRef = useRef(null);   // always the latest handleSubmit
  const lastSavedRef = useRef("");        // JSON of the last answers the server confirmed
  const submitRetryRef = useRef(0);
  const timeUpTimerRef = useRef(null);     // pending (jittered) time-up submit
  const mergeNextSyncRef = useRef(false);  // first sync after (re)entering: add to the server draft, never replace it

  // Submit for time-up / "back online", after a random delay (see TIME_UP_JITTER_MS).
  // Only one can be pending; a manual Submit press cancels it (see handleSubmit).
  const scheduleAutoSubmit = useCallback(() => {
    if (timeUpTimerRef.current) return;
    const wait = Math.floor(Math.random() * TIME_UP_JITTER_MS);
    // Deferred: this can be called from inside a state updater (the countdown).
    queueMicrotask(() => {
      setErrorMsg("Time's up — saving your answers…");
      announce("Time's up. Saving your answers.", true);
    });
    timeUpTimerRef.current = setTimeout(() => {
      timeUpTimerRef.current = null;
      handleSubmitRef.current?.(true);
    }, wait);
  }, []);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [autosaveFailed, setAutosaveFailed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const cacheKeyRef = useRef("");          // device-cache key (student + assessment)
  const answersUpdatedAtRef = useRef(0);   // when an answer last changed ON THIS DEVICE (ms)
  const endsAtRef = useRef(null);          // absolute end time (ms) — keeps the clock right offline
  const tabClaimRef = useRef(null);        // one-tab-per-exam lease
  const timeUpRef = useRef(false);         // time ran out and the final submit is still pending
  const syncingRef = useRef(false);        // a sync request is already in flight
  const [canResume, setCanResume] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const faceCheckIntervalRef = useRef(null);
  const faceAbsentSinceRef = useRef(null); // timestamp, or null while looking at the screen
  const lastViolationPhotoAtRef = useRef(null); // timestamp of the last evidence photo sent for the current absence
  const screenStreamRef = useRef(null);
  const screenVideoRef = useRef(null); // off-DOM <video> the screen stream plays into
  const questionsRef = useRef([]);
  const currentQIdxRef = useRef(0);
  const startPhotoSentRef = useRef(false); // one identity photo per sitting, taken once the camera shows a real picture
  // A camera stream captured during the optional pre-start check in
  // handleVerifySubmit, held here so the monitoring effect below can
  // reuse it once the exam goes active instead of prompting for
  // permission a second time. Stays null if the student has no camera,
  // declined permission, or the pre-start check is skipped entirely.
  const preGrantedStreamRef = useRef(null);
  // Keeps the exam title/subject available to captureViolationPhoto's
  // caption without adding `assessment` to the face-check effect's
  // dependency array (which would tear down and re-request the live
  // camera stream every time it changed).
  const assessmentRef = useRef(null);
  const qHeadingRef = useRef(null);        // the current question's heading (focus target for screen readers)
  const prevOnlineRef = useRef(true);
  const prevFaceRef = useRef(true);
  useEffect(() => { assessmentRef.current = assessment; }, [assessment]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { currentQIdxRef.current = currentQuestionIndex; }, [currentQuestionIndex]);

  /* ── accessibility: page title + move screen-reader focus to the new
       screen's heading on every phase change ── */
  useEffect(() => {
    document.title = `${PHASE_TITLES[phase] || "Exam"} – E-Assessment`;
    if (phase === "active") return; // the active phase focuses the question instead
    const t = setTimeout(() => document.querySelector("[data-phase-heading]")?.focus(), 80);
    return () => clearTimeout(t);
  }, [phase]);

  /* ── accessibility: tell the student the exam has started ── */
  useEffect(() => {
    if (phase === "active" && questions.length) {
      announce(`Exam started. ${questions.length} question${questions.length !== 1 ? "s" : ""}. Press Alt and T at any time to hear the time remaining.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questions.length > 0]);

  /* ── accessibility: move focus to the question whenever it changes ── */
  useEffect(() => {
    if (phase !== "active" || !questions.length) return;
    const t = setTimeout(() => qHeadingRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [currentQuestionIndex, phase, questions.length]);

  /* ── accessibility: time-remaining milestones (never every second) ── */
  useEffect(() => {
    if (phase !== "active") return;
    if ([1800, 900, 600, 300, 120, 60, 30, 10].includes(secondsLeft)) {
      announce(`${spokenTime(secondsLeft)} remaining`, secondsLeft <= 60);
    }
  }, [secondsLeft, phase]);

  /* ── accessibility: Alt+T reads the time remaining on demand ── */
  useEffect(() => {
    if (phase !== "active") return;
    const onKey = (e) => {
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        const left = endsAtRef.current != null
          ? Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
          : 0;
        announce(`${spokenTime(left)} remaining`);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  /* ── accessibility: announce connectivity changes and camera "looking at screen" changes ── */
  useEffect(() => {
    if (phase !== "active") return;
    if (online !== prevOnlineRef.current) {
      announce(
        online
          ? "Back online. Your answers will sync."
          : "You are offline. Your answers are saved on this device and will sync when you reconnect.",
        !online
      );
      prevOnlineRef.current = online;
    }
  }, [online, phase]);

  useEffect(() => {
    if (phase !== "active" || cameraStatus !== "active") return;
    if (faceVisible !== prevFaceRef.current) {
      announce(
        faceVisible
          ? "The camera can see you again."
          : "The camera cannot see you looking at the screen. Photos are being sent for review.",
        !faceVisible
      );
      prevFaceRef.current = faceVisible;
    }
  }, [faceVisible, cameraStatus, phase]);

  /* ── restore a persisted local lock (survives refresh) ── */
  useEffect(() => {
    const saved = localStorage.getItem(lockKey(id));
    if (saved) {
      const savedToken = localStorage.getItem(tokenKey(id)) || "";
      if (savedToken) { tokenRef.current = savedToken; setToken(savedToken); }
      setLockReason(saved);
      setPhase("locked");
    }
  }, [id]);

  /* ── the admin's per-assessment security switches ──
     Needs the exam-only session, so it runs after sign-in (bootStart) and
     again before a locked exam is resumed (handleResume) — a refresh while
     locked skips bootStart. A failed read keeps whatever is already set
     (strict defaults on first load): the safe direction. */
  const loadSecuritySettings = useCallback(async () => {
    try {
      const secRes = await API.get(`/e-assessments/${id}/security-settings`);
      if (secRes.data?.security) {
        const next = { ...DEFAULT_SECURITY, ...secRes.data.security };
        // Safe Exam Browser deliberately blocks screen sharing (getDisplayMedia),
        // and SEB already locks the whole computer, so requiring a screen share
        // there only leaves the Start Exam button disabled forever.
        if (IN_SEB) next.require_screen_share = false;
        securityRef.current = next;
        setSecurity(next);
      }
    } catch { /* keep the current (strict) values */ }
  }, [id]);

  /* ── step 1: generate the token and show the reveal screen ── */
  const bootStart = useCallback(async () => {
    setPhase("loading");

    // Bounded retry loop around the single POST — see the config block
    // above. Any definitive failure (423/409/anything else non-
    // transient) breaks out and falls through to the existing handling
    // below exactly as before; only a transient failure loops back.
    const deadline = Date.now() + START_EXAM_RETRY_WINDOW_MS;
    let attempt = 0;
    let startRes = null;
    let finalErr = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      try {
        startRes = await API.post(`/e-assessments/${id}/start-exam`);
        finalErr = null;
        break;
      } catch (err) {
        if (!isRetryableStartExamError(err)) { finalErr = err; break; }

        const remaining = deadline - Date.now();
        if (remaining <= 0) { finalErr = err; break; }

        // Bounded exponential backoff + jitter, capped at
        // START_EXAM_RETRY_MAX_DELAY_MS, honoring a Retry-After header
        // when the server sends one, never scheduled past the
        // remaining deadline. Jitter keeps many simultaneously-failing
        // browsers from retrying in lockstep and re-synchronizing into
        // another burst — exactly the scenario this exists for (a
        // whole class hitting "Start Exam" the same second).
        const serverRetryAfterMs = (Number(err?.response?.headers?.["retry-after"]) || 0) * 1000;
        const backoff = Math.min(START_EXAM_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), START_EXAM_RETRY_MAX_DELAY_MS);
        const jitter = Math.random() * backoff * 0.5;
        const delay = Math.min(Math.max(serverRetryAfterMs, backoff) + jitter, Math.max(remaining - 50, 0));
        await sleep(delay);
        // loop continues, unless the deadline check above catches it
        // on the next iteration
      }
    }

    if (finalErr) {
      const err = finalErr;
      if (err?.response?.data?.code === "ACTIVE_EXAM_SESSION") {
        // One session per student: another exam of theirs is still running.
        setErrorMsg(err.response.data.message);
        setPhase("error");
      } else if (isDeviceBlocked(err)) {
        setErrorMsg(err.response.data.message);
        setPhase("devicedenied");
      } else if (err?.response?.status === 423) {
        const reason = err?.response?.data?.message || "This exam token is already in use on another device.";
        localStorage.setItem(lockKey(id), reason);
        setLockReason(reason);
        setPhase("locked");
      } else if (err?.response?.status === 409) {
        setErrorMsg(err.response.data.message || "You have already completed this assessment.");
        setPhase("ended");
      } else if (isRetryableStartExamError(err)) {
        setErrorMsg("The server is currently busy. We could not start your exam within 15 seconds. Please try again.");
        setPhase("error");
      } else {
        setErrorMsg(err?.response?.data?.message || "Failed to start the assessment.");
        setPhase("error");
      }
      return;
    }

    const attemptNo = String(startRes.data.attempt_no || 1);
    const prevAttempt = localStorage.getItem(attemptKey(id));
    if (prevAttempt !== null ? prevAttempt !== attemptNo : attemptNo !== "1") {
      // A new attempt (admin-granted resit): drop anything left over from
      // the previous one so it starts clean.
      localStorage.removeItem(answersKey(id));
      localStorage.removeItem(lockKey(id));
      clearExamCache(examCacheKey(id));
    }
    localStorage.setItem(attemptKey(id), attemptNo);
    lastSavedRef.current = "";

    const t = startRes.data.token;
    tokenRef.current = t;
    localStorage.setItem(tokenKey(id), t);
    setToken(t);
    setRevealCountdown(REVEAL_SECONDS);

    // Read the admin's security switches BEFORE the verify screen is shown,
    // so the screen-share requirement (and camera / fullscreen / lock rules)
    // match what was configured for this assessment.
    await loadSecuritySettings();

    setPhase("reveal");
  }, [id, loadSecuritySettings]);

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
      setExamLoginError(examIdentity ? "Enter the exam password." : "Enter both your assessment number and the exam password.");
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
      if (err?.response?.data?.code === "SEB_REQUIRED" && err?.response?.data?.sebStale) {
        // SEB is running but from an old / different .seb file or saved settings.
        setExamLoginError(err.response.data.message);
      } else if (err?.response?.data?.code === "SEB_REQUIRED") {
        setExamLoginError("This exam needs Safe Exam Browser. If you can't use it, tell your invigilator: they can allow this browser for you. Then press Continue to Exam again.");
      } else {
        setExamLoginError(err?.response?.data?.message || "Login failed. Check your username and exam password.");
      }
    } finally {
      setExamLoggingIn(false);
    }
  };

  /* ── reveal screen countdown ── */
  useEffect(() => {
    if (phase !== "reveal") return;
    if (revealCountdown <= 0) { announce("You can continue now."); return; }
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
    // ONE TAB PER EXAM: a second tab on this device would overwrite the
    // first one's answers, so it is refused while the first is alive.
    tabClaimRef.current?.release?.();
    const claim = claimExamTab(id);
    if (!claim.ok) throw new Error("EXAM_TAB_IN_USE");
    tabClaimRef.current = claim;

    const cacheKey = examCacheKey(id);
    cacheKeyRef.current = cacheKey;
    const cached = await loadExamCache(cacheKey);

    // The paper: from the server when reachable (and cached for the rest of
    // the exam); from this device's cache when the network is down. Only a
    // genuine "no response at all" falls back — a 403/423/409 is a real
    // answer and must still be shown as such.
    let paper = null;
    try {
      const detail = await API.get(`/e-assessments/${id}`);
      paper = { assessment: detail.data.assessment, questions: detail.data.questions || [] };
    } catch (err) {
      if (!err?.response && cached?.paper?.assessment) paper = cached.paper;
      else { claim.release(); tabClaimRef.current = null; throw err; }
    }
    setAssessment(paper.assessment);
    setQuestions(paper.questions);
    let remaining = (paper.assessment.duration_minutes || 30) * 60;

    // Restore answers from (a) the server's autosave, (b) this browser's
    // local copy and (c) the device cache. The device copies are newer
    // when present, so they win per question; the server copy fills in
    // anything this device doesn't have (e.g. back on a different device
    // after an unlock).
    let serverAnswers = {};
    let serverReached = false;
    try {
      const d = await API.get(`/e-assessments/${id}/draft`);
      serverReached = true;
      serverAnswers = d.data?.answers || {};
      // Remaining time per the server clock (see getExamDraft). Null when
      // the server couldn't work it out — keep the full-duration fallback.
      if (typeof d.data?.seconds_left === "number") remaining = d.data.seconds_left;
    } catch { /* offline / no draft — fall back to the local copy */ }
    // Offline resume: the countdown continues from the cached absolute end time.
    if (!serverReached && cached?.endsAt) {
      remaining = Math.max(0, Math.round((cached.endsAt - Date.now()) / 1000));
    }
    let localAnswers = {};
    try {
      const saved = localStorage.getItem(answersKey(id));
      if (saved) localAnswers = JSON.parse(saved) || {};
    } catch { /* ignore a corrupted/unreadable saved-answers blob */ }
    const merged = { ...serverAnswers, ...localAnswers, ...(cached?.answers || {}) };
    setAnswers(merged);
    answersRef.current = merged;
    answersUpdatedAtRef.current = cached?.answersUpdatedAt || Date.now();
    lastSavedRef.current = ""; // first tick re-syncs whatever the server may be missing

    endsAtRef.current = Date.now() + remaining * 1000;
    timeUpRef.current = false;
    setSecondsLeft(remaining);

    saveExamCache(cacheKey, {
      paper,
      answers: merged,
      answersUpdatedAt: answersUpdatedAtRef.current,
      dirty: true,
      endsAt: endsAtRef.current,
      attemptNo: Number(localStorage.getItem(attemptKey(id)) || 1),
      cachedAt: Date.now(),
    });

    mergeNextSyncRef.current = true; // see autosaveNow: protects progress already on the server
    setCurrentQuestionIndex(0);
    setPhase("active");
  }, [id]);

  /* ── step 2: the student re-types the token to prove they saved it,
       this also performs the device-binding activation ── */
  // "Try my camera again" on the camera-required overlay.
  const retryCamera = () => {
    setCameraError("");
    setCameraStatus("idle");
    setCameraRetry((n) => n + 1);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (activating) return;

    // Screen sharing (entire screen) must be live before the exam can start.
    if (securityRef.current.require_screen_share) {
      const liveTrack = screenStreamRef.current?.getVideoTracks?.()[0];
      if (screenStatus !== "sharing" || !liveTrack || liveTrack.readyState !== "live") {
        setVerifyError("You must share your entire screen before you can start the exam.");
        return;
      }
    }

    if (verifyInput.trim().toUpperCase() !== token.trim().toUpperCase()) {
      setVerifyError("That doesn't match the token you were shown. Check it and try again.");
      return;
    }

    // One tab per exam: refuse BEFORE activating, because activation is what
    // starts the exam clock on the server.
    if (examTabTakenByOther(id)) {
      setErrorMsg("This exam is already open in another tab or window on this device. Close this one and continue there.");
      setPhase("error");
      return;
    }

    setVerifyError("");
    setActivating(true);
    setStartStep("Preparing…");

    // Camera: when "Camera required" is ON the exam cannot start until the
    // camera check is complete (face positioned, baseline photo saved) and the
    // camera is still live. Checked here, before the token is activated
    // (activation starts the exam clock on the server).
    if (!securityRef.current.require_camera) {
      setCameraStatus("off");
    } else {
      const testStream = camTestStreamRef.current;
      const camLive = !!testStream && testStream.getVideoTracks().some((t) => t.readyState === "live");
      if (!camTestDone || !camLive) {
        if (!camLive) resetCamTest("Your camera is not running. Start the camera check again.");
        setVerifyError("Complete the camera check first: position your face in the frame and wait for your photo to be taken and saved.");
        setActivating(false);
        setStartStep("");
        return;
      }
      preGrantedStreamRef.current = testStream; // the exam's monitoring reuses this stream
      setCameraError("");
      setCameraStatus("idle"); // clear any earlier failure so monitoring starts
    }

    try {
      setStartStep("Activating this device…");
      const activateRes = await API.post("/e-assessments/exam-session/activate", {
        token, device_id: deviceId, device_label: navigator.userAgent,
      });

      if (activateRes.data.status !== "active" && !activateRes.data.success) {
        throw new Error("Could not activate exam session");
      }

      setStartStep("Loading your paper…");
      // Bounded: if anything in here stalls (cache, network), the student gets
      // a message and can press Start again, instead of an endless "Starting…".
      await Promise.race([
        enterActive(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("START_TIMEOUT")), START_PAPER_TIMEOUT_MS)),
      ]);
    } catch (err) {
      // Activation failed after all — release the pre-granted camera so
      // the indicator light doesn't stay on for a student who isn't starting.
      if (preGrantedStreamRef.current) {
        preGrantedStreamRef.current.getTracks().forEach((t) => t.stop());
        preGrantedStreamRef.current = null;
        resetCamTest(); // that stream is gone, so the camera check has to be redone
      }
      if (err?.response?.data?.code === "ACTIVE_EXAM_SESSION") {
        setErrorMsg(err.response.data.message);
        setPhase("error");
      } else if (err?.response?.status === 423) {
        const reason = err?.response?.data?.message || "This exam token is already in use on another device.";
        localStorage.setItem(lockKey(id), reason);
        setLockReason(reason);
        setPhase("locked");
      } else if (err?.response?.status === 409) {
        setErrorMsg(err.response.data.message || "You have already completed this assessment.");
        setPhase("ended");
      } else if (err?.message === "EXAM_TAB_IN_USE") {
        setErrorMsg("This exam is already open in another tab or window on this device. Close this one and continue there.");
        setPhase("error");
      } else if (err?.message === "START_TIMEOUT") {
        tabClaimRef.current?.release?.();
        tabClaimRef.current = null;
        setVerifyError("Loading your paper is taking too long. Check your connection and press Start Exam again — your token is already accepted on this device.");
      } else {
        setVerifyError(err?.response?.data?.message || err?.message || "Failed to start the assessment. Please try again.");
      }
    } finally {
      setActivating(false);
      setStartStep("");
    }
  };

  /* ── request fullscreen when active ── */
  useEffect(() => {
    if (phase === "active" && securityRef.current.require_fullscreen && document.documentElement.requestFullscreen) {
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
          triggerLock("This exam session was locked — the token was used on another device.", { fromServer: true });
        } else if (res.data.ended) {
          setPhase("ended");
        }
      } catch (err) {
        // The server answers a locked session with HTTP 423, which axios throws —
        // so the `res.data.locked` branch above never ran and a server-side lock
        // (admin lock, token used on a second device) never reached the screen.
        if (err?.response?.status === 423 && err?.response?.data?.locked) {
          triggerLock("This exam session was locked by an administrator or because the token was used on another device.", { fromServer: true });
          return;
        }
        // Admin switched "Desktop only" on while this phone/tablet was
        // mid-exam: stop the exam UI here. The session is NOT locked, so
        // nothing is lost — answers were already autosaved, and the student
        // can carry on from a Windows/Mac computer.
        if (isDeviceBlocked(err)) {
          clearInterval(heartbeatRef.current);
          clearInterval(timerRef.current);
          setErrorMsg(err.response.data.message);
          setPhase("devicedenied");
        }
        /* other (transient network) errors are ignored; heartbeat retries next tick */
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [phase, token, deviceId]);

  /* ── device sync: the exam lives in this device's cache; every 30s (and the
       moment the network comes back, and when the tab is hidden/closed) the
       answers that changed are pushed to the server. If time runs out (or
       the device dies) before the student submits, the server submits from
       its copy instead of the work being lost. ── */
  const autosaveNow = useCallback(async () => {
    const current = answersRef.current || {};
    const hasAny = Object.values(current).some((v) => (typeof v === "string" ? v.trim() !== "" : !!v));
    if (!hasAny) return;
    const snapshot = JSON.stringify(current);
    if (snapshot === lastSavedRef.current) return; // nothing new since the last sync
    if (syncingRef.current) return;                // one sync in flight at a time
    syncingRef.current = true;
    try {
      const res = await API.post(`/e-assessments/${id}/autosave`, {
        answers: current,
        token: tokenRef.current || undefined,
        device_id: deviceId,
        client_saved_at: answersUpdatedAtRef.current || Date.now(),
        merge_existing: mergeNextSyncRef.current || undefined,
      });
      mergeNextSyncRef.current = false; // the server now holds everything this device had
      // Only mark clean if nothing changed while the request was in flight.
      if (JSON.stringify(answersRef.current || {}) === snapshot) {
        lastSavedRef.current = snapshot;
        if (cacheKeyRef.current) saveExamCache(cacheKeyRef.current, { dirty: false, lastSyncedAt: Date.now() });
      }
      // The server clock is the authority — re-sync the (possibly offline-drifted) countdown.
      if (typeof res?.data?.seconds_left === "number" && !timeUpRef.current) {
        endsAtRef.current = Date.now() + res.data.seconds_left * 1000;
        if (cacheKeyRef.current) saveExamCache(cacheKeyRef.current, { endsAt: endsAtRef.current });
      }
      setLastSavedAt(new Date());
      setAutosaveFailed(false);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) { setErrorMsg(err.response?.data?.message || "This assessment has already been completed."); setPhase("ended"); return; }
      if (status === 423) return; // locked — the heartbeat shows the lock screen
      if (isDeviceBlocked(err)) return; // desktop-only switch — the heartbeat shows the screen
      setAutosaveFailed(true);    // transient/offline — answers stay safe in the device cache; next tick retries
    } finally {
      syncingRef.current = false;
    }
  }, [id, deviceId]);

  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(autosaveNow, AUTOSAVE_MS);
    const onHidden = () => { if (document.visibilityState === "hidden") autosaveNow(); };
    const onOnline = () => {
      setOnline(true);
      autosaveNow();
      // Time ran out while offline: finish the pending submit as soon as we're back.
      if (timeUpRef.current) scheduleAutoSubmit();
    };
    const onOffline = () => setOnline(false);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", autosaveNow);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", autosaveNow);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [phase, autosaveNow, scheduleAutoSubmit]);

  /* ── a second tab took over this exam on this device → stop this one ── */
  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(() => {
      if (examTabTakenByOther(id)) {
        clearInterval(timerRef.current);
        clearInterval(heartbeatRef.current);
        setErrorMsg("This exam was opened in another tab or window. Only one session per student is allowed — continue there.");
        setPhase("error");
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [phase, id]);

  // Release the one-tab lease when this screen goes away.
  useEffect(() => () => {
    tabClaimRef.current?.release?.();
    if (timeUpTimerRef.current) { clearTimeout(timeUpTimerRef.current); timeUpTimerRef.current = null; }
  }, []);

  /* ── countdown timer ── */
  useEffect(() => {
    if (phase !== "active") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        // Derived from the absolute end time so a throttled background tab
        // or a stretch offline can't make the clock drift.
        const left = endsAtRef.current != null
          ? Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
          : s - 1;
        if (left <= 0) {
          clearInterval(timerRef.current);
          timeUpRef.current = true;
          scheduleAutoSubmit();
          return 0;
        }
        return left;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── local anti-cheat detection (best-effort, client-side) ── */
  const triggerLock = useCallback((reason, opts = {}) => {
    localStorage.setItem(lockKey(id), reason);
    resumeAttemptedRef.current = false; // a brand-new lock: allow it to be reported
    setLockReason(reason);
    setCanResume(false);
    setResumeMsg("");
    setPhase("locked");
    clearInterval(heartbeatRef.current);
    clearInterval(timerRef.current);
    // Save whatever the student has typed BEFORE anything else: once locked, the
    // autosave timer stops, so without this their latest answers would stay only on
    // this device and be missing if the exam is unlocked on another one. The server
    // accepts this save from the bound device even though the session is locked.
    Promise.resolve(autosaveNow()).catch(() => { /* still safe in the device cache */ });
    // A lock this device decided on (violations) must also be recorded on
    // the server, otherwise the admin screen still shows the session as
    // Active, offers no Unlock button, and the student can never get back
    // in. Locks that came FROM the server (heartbeat 423) are already there.
    if (!opts.fromServer && tokenRef.current) {
      API.post("/e-assessments/exam-session/lock", {
        token: tokenRef.current, device_id: deviceId, reason,
      }).catch(() => { /* the locked screen re-reports it while it waits */ });
    }
  }, [id, deviceId, autosaveNow]);

  const registerViolation = useCallback((label) => {
    setViolations((v) => {
      const next = v + 1;
      if (next >= MAX_VIOLATIONS && securityRef.current.lock_on_violations) {
        triggerLock(`Too many suspicious actions detected (${label}). This device has been locked for this exam.`);
      }
      return next;
    });
  }, [triggerLock]);

  /* Shrinks `text` with a trailing "…" until it fits `maxWidth` on the
     canvas context `ctx` — used so a long name/exam title never spills
     past the caption bar's edge. */
  const fitCaptionText = (ctx, text, maxWidth) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
    return t + "…";
  };

  /* Grabs a single frame from the student's own camera feed at the exact
     moment a camera-based violation (eyes off screen) fires, burns a
     caption bar into it (who + which exam + when), and uploads it to
     /e-assessments/violation-photo so an invigilator can review it
     later. Deliberately fire-and-forget: a slow network, a failed
     upload, or the canvas being unavailable must never delay or break
     the exam — this never touches `violations` or triggerLock. */
  const captureViolationPhoto = useCallback((reason) => {
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return false;
      // Never upload a black/empty frame — it's useless as evidence and was
      // what teachers were seeing when the preview was black.
      if (isFrameBlank(video)) return false;
      const vw = video.videoWidth, vh = video.videoHeight;
      const barHeight = Math.max(56, Math.round(vh * 0.18));
      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh + barHeight;
      const ctx = canvas.getContext("2d");
      // The on-screen preview is mirrored for the student (S.camVideo's
      // scaleX(-1)), but the saved photo should reflect the raw camera
      // frame, not the mirrored preview — draw straight from <video>.
      ctx.drawImage(video, 0, 0, vw, vh);

      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, vh, vw, barHeight);
      ctx.fillStyle = "#FF1414";
      ctx.textBaseline = "middle";

      let currentUser = {};
      try { currentUser = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
      const name = currentUser.name || examUsername || "Unknown student";
      const uname = currentUser.username || examUsername;
      const usernameSuffix = uname ? ` (${uname})` : "";
      const examTitle = assessmentRef.current?.title || "Unknown exam";
      const examSubject = assessmentRef.current?.subject ? ` · ${assessmentRef.current.subject}` : "";
      const when = new Date().toLocaleString();
      // Which question the student is on right now, and what they've put down.
      const qs = questionsRef.current || [];
      const qIdx = Math.min(currentQIdxRef.current || 0, Math.max(qs.length - 1, 0));
      const curQ = qs[qIdx];
      const rawAns = curQ ? answersRef.current?.[curQ.id] : null;
      const answerSnapshot = rawAns == null ? null : (typeof rawAns === "string" ? rawAns : String(rawAns));
      const qLabel = curQ ? `  ·  Q${qIdx + 1}` : "";
      const maxTextWidth = vw - Math.round(barHeight * 0.32);
      const pad = Math.round(barHeight * 0.16);
      const line1Size = Math.round(barHeight * 0.32);
      const line2Size = Math.round(barHeight * 0.24);

      ctx.font = `800 ${line1Size}px system-ui, sans-serif`;
      ctx.fillText(fitCaptionText(ctx, `${name}${usernameSuffix}`, maxTextWidth), pad, vh + pad + line1Size / 2);

      ctx.font = `800 ${line2Size}px system-ui, sans-serif`;
      ctx.fillText(fitCaptionText(ctx, `${examTitle}${examSubject}${qLabel}  ·  ${when}`, maxTextWidth), pad, vh + pad + line1Size + 4 + line2Size / 2);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      API.post("/e-assessments/violation-photo", {
        assessment_id: Number(id),
        token,
        device_id: deviceId,
        image: dataUrl,
        reason,
        screenshot: grabScreenshot(screenVideoRef.current), // null unless the student shared their screen
        question_id: curQ?.id ?? null,
        question_number: curQ ? qIdx + 1 : null,
        answer_text: answerSnapshot,
      }).then(() => setPhotosCaptured((c) => c + 1)).catch(() => {});
      return true;
    } catch {
      // e.g. a tainted canvas — never let photo capture break the exam
      return false;
    }
  }, [id, token, deviceId, examUsername]);

  // Latest-ref pattern: the face-check effect below only depends on
  // `phase`, so it neither restarts the live camera stream nor
  // re-prompts permission every time captureViolationPhoto's own deps
  // change — it always calls through to whatever this ref currently
  // points at.
  const captureViolationPhotoRef = useRef(captureViolationPhoto);
  useEffect(() => { captureViolationPhotoRef.current = captureViolationPhoto; }, [captureViolationPhoto]);

  /* ── pre-exam camera check ── */
  const resetCamTest = useCallback((message = "") => {
    if (camTestStreamRef.current) {
      camTestStreamRef.current.getTracks().forEach((t) => { t.onended = null; t.stop(); });
      camTestStreamRef.current = null;
    }
    baselineBoxRef.current = null;
    setCamTestStream(null);
    setCamTestStage("idle");
    setCamTestPhoto("");
    setCamTestDone(false);
    setCamTestSaving(false);
    setCamTestHold(0);
    setCamTestGood(false);
    setCamTestHint("");
    setCamTestManual(false);
    setCamTestError(message);
  }, []);

  const startCamTest = async () => {
    setCamTestError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamTestError("This browser cannot access a camera. Use the latest Chrome or Edge on a laptop or desktop computer.");
      return;
    }
    setCamTestStage("starting");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA_VIDEO_CONSTRAINTS, audio: false });
    } catch (err) {
      setCamTestStage("idle");
      setCamTestError(describeCameraError(err));
      return;
    }
    camTestStreamRef.current = stream;
    stream.getVideoTracks().forEach((t) => {
      t.onended = () => resetCamTest("Your camera was disconnected or turned off. Start the camera check again.");
    });
    setCamTestStream(stream);
    setCamTestHint("Looking for your face…");
    setCamTestHold(0);
    setCamTestGood(false);
    setCamTestManual(false);
    setCamTestStage("positioning");
  };

  // Save the baseline photo with the exam's other camera photos so the teacher
  // can compare it with later ones. Required to finish the check.
  const saveCamTestPhoto = useCallback(async (dataUrl) => {
    setCamTestSaving(true);
    setCamTestError("");
    try {
      await API.post("/e-assessments/violation-photo", {
        assessment_id: Number(id),
        token: tokenRef.current,
        device_id: deviceId,
        image: dataUrl,
        reason: "exam start (camera check)",
        screenshot: grabScreenshot(screenVideoRef.current), // null unless the student shared their screen
        question_id: null,
        question_number: null,
        answer_text: null,
      });
      startPhotoSentRef.current = true; // the in-exam monitor needn't take another start photo
      setCamTestDone(true);
      announce("Photo saved. Enter your token and start the exam.");
    } catch {
      setCamTestError("Your photo could not be saved. Check your connection and press \"Try saving again\".");
      announce("Your photo could not be saved. Check your connection and press Try saving again.", true);
    } finally {
      setCamTestSaving(false);
    }
  }, [id, deviceId]);

  const takeCamTestPhoto = useCallback((box) => {
    const video = camTestVideoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return false;
    if (isFrameBlank(video)) {
      setCamTestHint("Your camera picture is black. Remove any cover, check the lighting, then try again.");
      return false;
    }
    try {
      const vw = video.videoWidth, vh = video.videoHeight;
      const barHeight = Math.max(40, Math.round(vh * 0.12));
      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh + barHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, vw, vh); // raw frame, not the mirrored preview
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, vh, vw, barHeight);
      ctx.fillStyle = "#FF1414";
      ctx.textBaseline = "middle";
      let currentUser = {};
      try { currentUser = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
      const name = currentUser.name || examUsername || "Unknown student";
      const uname = currentUser.username || examUsername;
      const title = assessmentRef.current?.title || `Assessment ${id}`;
      ctx.font = `800 ${Math.round(barHeight * 0.36)}px system-ui, sans-serif`;
      ctx.fillText(fitCaptionText(ctx, `${name}${uname ? ` (${uname})` : ""}`, vw - 16), 8, vh + barHeight * 0.3);
      ctx.font = `800 ${Math.round(barHeight * 0.28)}px system-ui, sans-serif`;
      ctx.fillText(fitCaptionText(ctx, `Camera check  ·  ${title}  ·  ${new Date().toLocaleString()}`, vw - 16), 8, vh + barHeight * 0.72);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      baselineBoxRef.current = box || null;
      setCamTestPhoto(dataUrl);
      setCamTestStage("captured");
      saveCamTestPhoto(dataUrl);
      return true;
    } catch {
      return false;
    }
  }, [id, examUsername, saveCamTestPhoto]);
  const takeCamTestPhotoRef = useRef(takeCamTestPhoto);
  useEffect(() => { takeCamTestPhotoRef.current = takeCamTestPhoto; }, [takeCamTestPhoto]);

  const retakeCamTest = () => {
    setCamTestPhoto("");
    setCamTestDone(false);
    setCamTestSaving(false);
    setCamTestError("");
    setCamTestHold(0);
    setCamTestGood(false);
    setCamTestHint("Looking for your face…");
    baselineBoxRef.current = null;
    setCamTestStage("positioning");
  };

  // Show the live camera in the check.
  useEffect(() => {
    const v = camTestVideoRef.current;
    if (!v || !camTestStream) return;
    if (v.srcObject !== camTestStream) v.srcObject = camTestStream;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, [camTestStream, camTestStage]);

  // Watch the face while the student positions themselves; once they hold a
  // good central position for ~2 s the photo is taken automatically.
  useEffect(() => {
    if (camTestStage !== "positioning" || !camTestStream) return;
    let cancelled = false, busy = false, faceapi = null, hold = 0;
    loadFaceApi()
      .then((f) => { if (!cancelled) faceapi = f; })
      .catch(() => {
        if (cancelled) return;
        setCamTestManual(true);
        setCamTestHint("The automatic position check is unavailable. Sit in the middle of the frame, look at the screen, then press \"Take photo\".");
      });
    const tick = async () => {
      if (busy || !faceapi) return;
      const video = camTestVideoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      busy = true;
      try {
        const faces = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true);
        if (cancelled) return;
        const r = analyseFacePosition(faces, video.videoWidth, video.videoHeight);
        setCamTestHint(r.hint);
        setCamTestGood(r.ok);
        hold = r.ok ? hold + 1 : 0;
        setCamTestHold(hold);
        if (hold >= CAM_TEST_HOLD_TICKS) {
          if (takeCamTestPhotoRef.current(r.box)) { cancelled = true; clearInterval(iv); }
          else hold = 0;
        }
      } catch { /* transient decode error: try again next tick */ }
      finally { busy = false; }
    };
    const iv = setInterval(tick, CAM_TEST_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(iv); };
  }, [camTestStage, camTestStream]);

  // Leaving the page: release the camera.
  useEffect(() => () => {
    if (camTestStreamRef.current) camTestStreamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  /* ── attach the camera stream to the preview <video> ──
     The <video> only exists in the DOM once cameraStatus is "requesting" or
     "active". Previously the stream was assigned to videoRef.current inside
     the async startMonitoring() before React had rendered that element (it
     was null on the pre-granted-stream path), so srcObject was never set and
     the preview stayed black — while the face-check loop kept "seeing" an
     empty frame. Doing the assignment here, after render, guarantees the
     element exists. Re-runs whenever the stream or status changes. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !cameraStream) return;
    if (v.srcObject !== cameraStream) v.srcObject = cameraStream;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => { /* autoplay quirk — onLoadedMetadata retries */ });
  }, [cameraStream, cameraStatus]);

  /* ── block the browser "Back" button once there is an active
       assessment in progress (reveal → verify → active). We trap it
       by keeping an extra history entry in front of the exam page and
       re-pushing it every time the student tries to pop back — so the
       "Back" gesture never actually leaves this page. Only the live exam
       is protected: before it starts (loading / token screens) and once
       it is locked / ended / errored the student can freely go back or
       leave. During the active exam, trying to go back also counts as a
       suspicious action, same as switching tabs. ── */
  useEffect(() => {
    const blocking = phase === "active";
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
    const onFullscreenChange = () => { if (securityRef.current.require_fullscreen && !document.fullscreenElement) registerViolation("exited fullscreen"); };

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
     detectors above, and only if the student has a working, permitted
     camera — this whole effect is a no-op enhancement layered on top
     of an exam that runs perfectly well without it. Requests the
     camera (or reuses the one pre-granted during handleVerifySubmit),
     then polls a lightweight face+landmark detector roughly once a
     second to check both eyes are open and the head is facing the
     screen (see isLookingAtScreen and the HONEST SCOPE NOTE above);
     sustained failure feeds into the same registerViolation()
     escalation as everything else — a MISSING camera never does.
     Students with an accessibility accommodation (accessibility_mode
     from the server) skip this monitoring entirely. */
  useEffect(() => {
    if (phase !== "active") return;
    // The optional pre-start check in handleVerifySubmit already
    // determined there's no camera available (unsupported, declined,
    // or none present) — leave monitoring off instead of prompting
    // again mid-exam.
    if (cameraStatus === "off") return;
    let cancelled = false;

    const stopCamera = () => {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      setCameraStream(null);
    };

    const startMonitoring = async () => {
      // Accessibility accommodation: no camera or gaze monitoring at all.
      if (securityRef.current.accessibility_mode) {
        if (preGrantedStreamRef.current) {
          preGrantedStreamRef.current.getTracks().forEach((t) => t.stop());
          preGrantedStreamRef.current = null;
        }
        setCameraStatus("off");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(describeCameraError(null));
        setCameraStatus("off");
        return;
      }
      setCameraStatus("requesting");
      let stream;
      if (preGrantedStreamRef.current) {
        // Reuse the stream captured during the optional pre-start check
        // in handleVerifySubmit instead of prompting for permission again.
        stream = preGrantedStreamRef.current;
        preGrantedStreamRef.current = null;
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA_VIDEO_CONSTRAINTS, audio: false });
        } catch (err) {
          // No camera, or the student declined. If this assessment REQUIRES
          // the camera the exam is blocked until it works (see the overlay);
          // otherwise the exam simply continues without monitoring.
          if (!cancelled) { setCameraError(describeCameraError(err)); setCameraStatus("off"); }
          return;
        }
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      cameraStreamRef.current = stream;
      // If the camera is unplugged, switched off, or taken by another app
      // mid-exam, the track ends: stop everything and flag it so the
      // "camera required" overlay blocks the exam until it is restored.
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => {
          if (cancelled) return;
          stopCamera();
          setCameraError("Your camera was disconnected or turned off.");
          setCameraStatus("off");
        };
      });
      // Hand the stream to React state; the attach effect above wires it to
      // the <video> after the element has rendered.
      setCameraStream(stream);

      let faceapi;
      try {
        faceapi = await loadFaceApi();
      } catch {
        // The eye-gaze script/models failed to load (e.g. blocked CDN).
        // The camera itself IS on. If it is required, keep it running and
        // do not treat this as "camera off"; otherwise just turn it off.
        if (!cancelled) {
          if (securityRef.current.require_camera) setCameraStatus("nomodel");
          else setCameraStatus("off");
        }
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

        // Gentle nudge (never a violation): has the student drifted away from
        // the position they were photographed in at the camera check?
        const base = baselineBoxRef.current;
        if (base && result && videoRef.current.videoWidth) {
          const bx = result.detection.box;
          const fw = videoRef.current.videoWidth, fh = videoRef.current.videoHeight;
          setPositionDrift(
            Math.abs((bx.x + bx.width / 2) / fw - base.cx) > 0.18 ||
            Math.abs((bx.y + bx.height / 2) / fh - base.cy) > 0.18 ||
            Math.abs(bx.width / fw - base.w) / base.w > 0.35
          );
        } else {
          setPositionDrift(false);
        }

        // One clear identity photo per sitting, taken the first time the
        // camera is showing a real picture with a face in it, so a teacher
        // who later flags a response always has a baseline to compare with.
        if (!startPhotoSentRef.current && result) {
          if (captureViolationPhotoRef.current("exam start")) startPhotoSentRef.current = true;
        }

        if (looking) {
          faceAbsentSinceRef.current = null;
          lastViolationPhotoAtRef.current = null;
          setFaceVisible(true);
          setFaceAbsentSeconds(0);
        } else {
          // Deliberately NOT registerViolation()/triggerLock() here — a
          // camera-based flag never locks the exam by itself (see the
          // HONEST SCOPE NOTE at the top of this file). Instead, once the
          // eyes have been off the screen for EYES_OFF_LIMIT_MS, this
          // keeps capturing and uploading a fresh evidence photo every
          // VIOLATION_PHOTO_INTERVAL_MS for as long as the condition
          // persists, so an invigilator gets a continuous paper trail
          // instead of a single "3rd strike" screenshot.
          if (!faceAbsentSinceRef.current) faceAbsentSinceRef.current = now;
          const absentMs = now - faceAbsentSinceRef.current;
          setFaceVisible(false);
          setFaceAbsentSeconds(Math.floor(absentMs / 1000));

          if (absentMs >= EYES_OFF_LIMIT_MS) {
            const sinceLastPhoto = lastViolationPhotoAtRef.current ? now - lastViolationPhotoAtRef.current : Infinity;
            if (sinceLastPhoto >= VIOLATION_PHOTO_INTERVAL_MS) {
              lastViolationPhotoAtRef.current = now;
              captureViolationPhotoRef.current("eyes not on the screen for 10+ seconds");
            }
          }
        }
      }, FACE_CHECK_INTERVAL_MS);
    };

    startMonitoring();
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cameraRetry]);

  /* ── while locked, check (read-only) whether an admin has unlocked this
       session. This used to call /activate every 15s, which both (a) never
       ran after a refresh because the token wasn't remembered, and (b) let
       a second waiting device re-lock the session the moment the admin
       freed it. Now it only asks; the student presses Resume on the one
       device they actually want to continue on. ── */
  const checkLockStatus = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return false;
    try {
      const res = await API.post("/e-assessments/exam-session/status", { token: t, device_id: deviceId });
      setPollNotice("");
      setNeedsRelogin(false);
      if (res.data.ended) {
        localStorage.removeItem(lockKey(id));
        localStorage.removeItem(tokenKey(id));
        setErrorMsg("This assessment has already been completed.");
        setPhase("ended");
        return false;
      }
      const status = res.data.status;
      // "issued" = an admin unlocked it. "active" only counts as resumable once
      // THIS device has pressed Resume (otherwise it is a lock the server never saw).
      const resumable = !!res.data.can_resume && (status === "issued" || (status === "active" && resumeAttemptedRef.current));
      setCanResume(resumable);
      // The server still thinks this device is active — the lock never reached
      // it (e.g. offline when it happened). Report it again — but NEVER after
      // a Resume, or an unlocked session gets locked again behind the student's back.
      if (status === "active" && !resumeAttemptedRef.current) {
        API.post("/e-assessments/exam-session/lock", { token: t, device_id: deviceId, reason: localStorage.getItem(lockKey(id)) || "Locked by this device" }).catch(() => {});
      }
      return resumable;
    } catch (err) {
      // Used to be swallowed silently, which left the screen "locked" forever
      // even after an admin unlocked it. Now the student is told what to do.
      const code = err?.response?.status;
      if (code === 401) {
        setNeedsRelogin(true);
        setPollNotice("Your exam sign-in expired while this screen was locked, so it can't see the unlock. Sign in again to continue — your answers are saved.");
      } else if (code === 404) {
        tokenRef.current = "";
        localStorage.removeItem(tokenKey(id));
        setToken("");
        setPollNotice("Your exam token is out of date. Press \"Check again\" to fetch a fresh one.");
      }
      /* other errors (network) are transient — try again next tick */
      return false;
    }
  }, [id, deviceId]);

  useEffect(() => {
    if (phase !== "locked") return;
    checkLockStatus();
    const poll = setInterval(checkLockStatus, LOCK_POLL_MS);
    // Background tabs throttle timers; check immediately when the student comes back.
    const onVisible = () => { if (document.visibilityState === "visible") checkLockStatus(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [phase, checkLockStatus]);

  // Tell a screen-reader student when the admin has unlocked the exam.
  useEffect(() => {
    if (phase === "locked" && canResume) announce("An administrator has unlocked your exam. Press the Resume exam button to continue.", true);
  }, [phase, canResume]);

  // "Check again" — read-only. It never activates the session itself, so a
  // locked student can't skip an admin unlock by pressing it.
  const handleCheckAgain = async () => {
    if (resuming) return;
    setResuming(true);
    setResumeMsg("");
    try {
      // Older locks (made before the token was remembered) have no token on
      // this device — fetch it back through the normal start call. This only
      // reads the session; it does not bind the device or unlock anything.
      if (!tokenRef.current) {
        if (!hasUsableSession(id)) {
          setResumeMsg("Your exam sign-in has expired. Please sign in again.");
          localStorage.removeItem(lockKey(id));
          setPhase("examlogin");
          return;
        }
        try {
          const r = await API.post(`/e-assessments/${id}/start-exam`);
          tokenRef.current = r.data.token;
          localStorage.setItem(tokenKey(id), r.data.token);
          setToken(r.data.token);
        } catch (err) {
          if (err?.response?.status === 409) {
            setErrorMsg(err.response.data.message || "You have already completed this assessment.");
            setPhase("ended");
            return;
          }
          setResumeMsg(err?.response?.data?.message || "This session is still locked. Please wait for the administrator.");
          return;
        }
      }
      const resumable = await checkLockStatus();
      if (!resumable) setResumeMsg("Still locked — waiting for the administrator to unlock it.");
    } finally {
      setResuming(false);
    }
  };

  // Sign in again from the locked screen (expired exam sign-in). The server is
  // the source of truth: if the session is still locked, signing in shows the lock again.
  const reloginAfterLock = () => {
    localStorage.removeItem(lockKey(id));
    localStorage.removeItem(tokenKey(id));
    resumeAttemptedRef.current = false;
    tokenRef.current = "";
    setToken("");
    setNeedsRelogin(false);
    setPollNotice("");
    setPhase("examlogin");
  };

  const handleResume = async () => {
    if (resuming) return;
    setResuming(true);
    setResumeMsg("");
    try {
      if (!tokenRef.current) return; // Resume is only offered once a token is known
      // Flag the resume BEFORE the server activates this device. The locked
      // screen's status poll runs every few seconds; a reply landing between the
      // server activating us and this flag being set used to see "active" +
      // "not resumed" and re-report the lock, putting the session straight back
      // to Locked (device never reads as active, autosave answered 423).
      resumeAttemptedRef.current = true;
      const res = await API.post("/e-assessments/exam-session/activate", {
        token: tokenRef.current, device_id: deviceId, device_label: navigator.userAgent,
      });
      if (res.data.success) {
        localStorage.removeItem(lockKey(id));
        setViolations(0);
        await loadSecuritySettings(); // a refresh while locked never went through bootStart
        try {
          await enterActive();
        } catch (loadErr) {
          if (loadErr?.message === "EXAM_TAB_IN_USE") throw loadErr;
          // Unlocked on the server, but the paper didn't load. Keep Resume
          // available (activation is safe to repeat on the same device) rather
          // than stranding the student on a screen that still says "locked".
          setCanResume(true);
          setResumeMsg("Your exam is unlocked, but the paper could not be loaded. Check your connection and press Resume again — your answers are saved.");
          return;
        }
        setCanResume(false);
        const restored = Object.values(answersRef.current || {}).filter((v) => (typeof v === "string" ? v.trim() !== "" : !!v)).length;
        if (restored > 0) announce(`Exam resumed. ${restored} saved answer${restored === 1 ? "" : "s"} restored.`, true);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 423) {
        resumeAttemptedRef.current = false;
        setCanResume(false);
        setResumeMsg(err?.response?.data?.message || "This session is still locked. Please wait for the administrator.");
      } else if (status === 409) {
        localStorage.removeItem(lockKey(id));
        localStorage.removeItem(tokenKey(id));
        setErrorMsg(err.response.data.message || "You have already completed this assessment.");
        setPhase("ended");
      } else if (status === 401) {
        resumeAttemptedRef.current = false;
        localStorage.removeItem(lockKey(id));
        setPhase("examlogin");
      } else if (err?.message === "EXAM_TAB_IN_USE") {
        setResumeMsg("This exam is open in another tab or window on this device. Close it and try again.");
      } else {
        // Request failed: the server may or may not have activated us, so keep the
        // resume flag set (it only stops the poll re-reporting a lock) and let the
        // student press Resume again — activation is safe to repeat on this device.
        setCanResume(true);
        setResumeMsg("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setResuming(false);
    }
  };

  /* ── submit ── */
  // Updates both the live `answers` state and its localStorage mirror in
  // one call — every place that used to call setAnswers directly for a
  // question response now goes through this instead (see the option/
  // essay handlers in the active-exam render below).
  const saveAnswer = (questionId, val) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: val };
      answersRef.current = next;
      answersUpdatedAtRef.current = Date.now();
      try { localStorage.setItem(answersKey(id), JSON.stringify(next)); } catch { /* storage full/unavailable — exam continues, just unsaved locally */ }
      // Device cache (IndexedDB): the copy the 30-second sync pushes to the server.
      if (cacheKeyRef.current) {
        saveExamCache(cacheKeyRef.current, { answers: next, answersUpdatedAt: answersUpdatedAtRef.current, dirty: true });
      }
      return next;
    });
  };

  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentQuestionIndex(index);
  };

  // A question counts as answered once it has a non-empty selection
  // (MCQ) or non-empty text (essay) — mirrors exam.html's isAnswered.
  const isAnswered = (q) => {
    const val = answers[q.id];
    return typeof val === "string" ? val.trim().length > 0 : !!val;
  };

  /* ── optional screen sharing (for the screenshot taken with each photo) ── */
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => { t.onended = null; t.stop(); });
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) { screenVideoRef.current.srcObject = null; screenVideoRef.current = null; }
    setScreenStatus((st) => (st === "sharing" ? "off" : st));
  };

  // Must be called from a click handler — browsers require a user gesture.
  // Sharing the ENTIRE screen is mandatory: a tab or a single window is
  // rejected here and the stream is stopped straight away.
  const startScreenShare = async () => {
    setScreenError("");
    if (!navigator.mediaDevices?.getDisplayMedia) {
      const msg = "This browser can't share the screen. Use Chrome or Edge on a laptop or desktop computer.";
      setScreenStatus("off");
      setScreenError(msg);
      announce(msg, true);
      return;
    }
    try {
      if (screenStreamRef.current) stopScreenShare();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
        // Chromium hints: offer whole screens, hide this tab, and stop the
        // student switching to another surface mid-share. Ignored elsewhere.
        monitorTypeSurfaces: "include",
        selfBrowserSurface: "exclude",
        surfaceSwitching: "exclude",
      });
      const track = stream.getVideoTracks()[0];
      const surface = track?.getSettings?.().displaySurface || "";
      // "monitor" = entire screen. If the browser doesn't report the surface
      // at all (older Firefox/Safari) it can't be verified, so it is allowed.
      if (surface && surface !== "monitor") {
        stream.getTracks().forEach((t) => { t.onended = null; t.stop(); });
        const msg = `You shared a ${surface === "browser" ? "browser tab" : "window"}. Please choose "Entire Screen" and try again.`;
        setScreenSurface(surface);
        setScreenStatus("off");
        setScreenError(msg);
        announce(msg, true);
        return;
      }
      const vid = document.createElement("video");
      vid.muted = true; vid.playsInline = true; vid.srcObject = stream;
      try { await vid.play(); } catch { /* frames still decode once metadata loads */ }
      screenStreamRef.current = stream;
      screenVideoRef.current = vid;
      setScreenSurface(surface);
      setScreenStatus("sharing");
      announce("Your entire screen is now shared.");
      // If the student stops sharing from the browser bar, the exam is blocked
      // (see the overlay in the active phase) until they share again.
      if (track) track.onended = () => {
        screenStreamRef.current = null; screenVideoRef.current = null;
        setScreenStatus("off");
        setScreenError("Screen sharing stopped. Share your entire screen to continue.");
      };
    } catch {
      const msg = "Screen sharing is required. Click the button and choose \"Entire Screen\".";
      setScreenStatus("off");
      setScreenError(msg);
      announce(msg, true);
    }
  };

  // Release the screen share if the student leaves the page.
  useEffect(() => () => {
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => { t.onended = null; t.stop(); });
  }, []);

  // Everything that happens once the server has the submission.
  const finishAfterSubmit = (auto) => {
    stopScreenShare();
    localStorage.removeItem(lockKey(id));
    localStorage.removeItem(tokenKey(id));
    localStorage.removeItem(answersKey(id));
    if (cacheKeyRef.current) clearExamCache(cacheKeyRef.current);
    tabClaimRef.current?.release?.();
    tabClaimRef.current = null;
    timeUpRef.current = false;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    // Submitting the exam doubles as logging the student out — the
    // Submit button is the last thing they should be able to do in
    // this session, whether they were on an exam-only token or a full
    // portal login, so both are cleared here exactly like the normal
    // student logout (StudentLayout.jsx's logout()).
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedOut(true);
    // Inside Safe Exam Browser: close it a few seconds after submitting (see effect below).
    if (IN_SEB) setSebQuitIn(10);

    setPhase("ended");
    setErrorMsg(auto ? "Time's up — your assessment was submitted automatically." : "Assessment submitted successfully.");
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    // Submitting now (manual press, or the jitter timer firing): drop the pending one.
    if (timeUpTimerRef.current) { clearTimeout(timeUpTimerRef.current); timeUpTimerRef.current = null; }
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
      finishAfterSubmit(auto);
    } catch (err) {
      const status = err?.response?.status;
      if (isDeviceBlocked(err)) {
        clearInterval(heartbeatRef.current);
        clearInterval(timerRef.current);
        setErrorMsg(err.response.data.message);
        setPhase("devicedenied");
        return;
      }
      if (status === 409) {
        // Already submitted — e.g. the server auto-submitted from the last
        // autosave while this screen was offline. Nothing is lost; finish up.
        finishAfterSubmit(auto);
        return;
      }
      // Time ran out and the submit couldn't reach the server (network
      // blip). Keep trying — the server's own autosave sweep is the backstop.
      if (auto && status !== 423 && status !== 403 && (!err?.response || submitRetryRef.current < 30)) {
        submitRetryRef.current += 1;
        // 503 "busy" = the server is saving many papers; it says how long to wait.
        // Add random jitter so the students who were refused don't all return together.
        const busy = status === 503 && err?.response?.data?.busy;
        const hintSec = Number(err?.response?.data?.retry_after);
        const delay = (hintSec > 0 ? hintSec * 1000 : 8000) + Math.floor(Math.random() * RETRY_JITTER_MS);
        const retryMsg = busy
          ? (err.response.data.message || "Many students are submitting — saving your answers in a moment…")
          : "Time's up — saving your answers, reconnecting…";
        setErrorMsg(retryMsg);
        announce(busy ? "Many students are submitting. Your answers are safe; retrying shortly." : "Time's up. Saving your answers, reconnecting.", true);
        setTimeout(() => handleSubmitRef.current?.(true), delay);
        return;
      }
      const failMsg = err?.response
        ? (err.response.data?.message || "Submission failed. Please try again.")
        : "No connection — your answers are safe on this device. Reconnect and press Submit again.";
      setErrorMsg(failMsg);
      announce(failMsg, true);
    } finally {
      setSubmitting(false);
    }
  };
  handleSubmitRef.current = handleSubmit;

  // Submitting logs the student out (see handleSubmit) — once that's
  // happened, finish the job by bouncing them off this screen and back
  // to the login page after a moment, rather than leaving them stranded
  // on a "logged out" screen with nowhere to go but the button above.
  // Inside SEB the page must stay put so SEB can close itself instead (next effect).
  useEffect(() => {
    if (!loggedOut || IN_SEB) return;
    const t = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(t);
  }, [loggedOut, navigate]);

  // SEB closes when the browser loads its quit URL (the generated .seb file sets it to
  // <site>/take-assessment, no confirmation, no quit password). A page cannot shut the
  // computer down; closing SEB hands the computer back to the student.
  useEffect(() => {
    if (sebQuitIn === null) return undefined;
    if (sebQuitIn <= 0) { window.location.href = `${window.location.origin}/take-assessment`; return undefined; }
    const t = setTimeout(() => setSebQuitIn((n) => (n === null ? n : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [sebQuitIn]);

  const mmss = (total) => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = Math.floor(total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // NOTE: ThemeToggle is CALLED as functions ({ThemeToggle()})
  // rather than rendered as <ThemeToggle />. Defined inside the render, a
  // component gets a new identity on every render — and this page re-renders
  // every second (timer) — so React would unmount/remount them and keyboard /
  // screen-reader focus would be lost.
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className="dash-icon-btn"
      style={S.themeToggle}
      aria-label="Dark mode"
      aria-pressed={theme === "dark"}
      title="Toggle dark mode"
    >
      {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  );

/* ═══════════════════════════════════════════════════════════
     RENDER — states
  ═══════════════════════════════════════════════════════════ */

  /* ── Safe Exam Browser required: launch the installed app ── */
  if (sebGate === "checking") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}><p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Checking exam requirements…</p></div>
      </div>
    );
  }
  if (sebGate === "needed") {
    const btnBase = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", boxSizing: "border-box", borderRadius: 12, fontWeight: 800, textDecoration: "none", cursor: "pointer", textAlign: "center", fontFamily: "inherit" };
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        {/* card = 40% of the screen width (never narrower than 360px or wider than the screen) */}
        <div className="dash-card" style={{ ...S.panelCard, border: "1px solid var(--info)", width: "min(100%, max(40vw, 360px))", maxWidth: "none", padding: "clamp(28px, 3.5vw, 52px) clamp(22px, 3vw, 44px)", boxSizing: "border-box" }}>
          <div style={{ ...S.iconCircle, background: "var(--info-tint)", width: 72, height: 72 }}><ShieldAlert size={36} color="var(--info)" aria-hidden="true" /></div>
          <h1 data-phase-heading tabIndex={-1} style={{ margin: "22px 0 12px", color: "var(--text)", fontSize: "clamp(22px, 2.2vw, 30px)", fontWeight: 800, textAlign: "center", lineHeight: 1.25 }}>This exam opens in Safe Exam Browser</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 1.2vw, 17px)", lineHeight: 1.7, margin: "0 0 26px", textAlign: "center" }}>
            {sebCustom ? (<>
Download the exam file, then open it. Safe Exam Browser starts and loads this exam. Sign in and take the exam inside it.
            </>) : (<>
            We are starting Safe Exam Browser on this computer. If your browser asks, choose <b>Open Safe Exam Browser</b>. Sign in and take the exam inside it.
            </>)}
          </p>

          {sebCustom ? (<>

          <button type="button" onClick={saveSebFile} disabled={sebFileState.status === "saving"}
            style={{ ...btnBase, padding: "22px 20px", fontSize: "clamp(18px, 1.6vw, 22px)", background: "var(--info)", color: "#fff", border: "none", boxShadow: "0 8px 22px rgba(37, 99, 235, .3)", opacity: sebFileState.status === "saving" ? 0.7 : 1 }}>
            {sebFileState.status === "saving" ? "Preparing…" : sebFileState.status === "saved" ? "Download again" : "Download exam file"}
          </button>

          {sebFileState.status === "saved" && (
            <div role="status" style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, background: "var(--info-tint)", color: "var(--text)", fontSize: 15, lineHeight: 1.6, textAlign: "center" }}>
              <b>{sebFileState.name}</b> was saved to {sebFileState.where}.<br />
              <b>Double-click it</b> now. Safe Exam Browser will open and start the exam. You can close this tab afterwards.
            </div>
          )}
          {sebFileState.status === "error" && (
            <div role="alert" style={{ marginTop: 18, color: "#dc2626", fontSize: 14, textAlign: "center" }}>
              The exam file could not be downloaded. Check your internet connection and try again.
            </div>
          )}

          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "24px 0 10px", textAlign: "center" }}>
            Make sure Safe Exam Browser is installed. Prefer to launch it directly?
          </p>
          <a href={sebLaunchUrl(id)} style={{ ...btnBase, padding: "13px 16px", fontSize: 15, background: "transparent", color: "var(--info)", border: "2px solid var(--info)" }}>
            Open in Safe Exam Browser
          </a>
          </>) : (<>
          {/* biggest button */}
          <a href={sebLaunchUrl(id)} style={{ ...btnBase, padding: "22px 20px", fontSize: "clamp(18px, 1.6vw, 22px)", background: "var(--info)", color: "#fff", boxShadow: "0 8px 22px rgba(37, 99, 235, .3)" }}>
            Open in Safe Exam Browser
          </a>

          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "24px 0 10px", textAlign: "center" }}>
            Nothing opened? Make sure Safe Exam Browser is installed, then download the exam file and double-click it.
          </p>
          <a href={sebConfigHttpUrl(id)} style={{ ...btnBase, padding: "13px 16px", fontSize: 15, background: "transparent", color: "var(--info)", border: "2px solid var(--info)" }}>
            Download exam file
          </a>
          </>)}

          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "24px 0 10px", textAlign: "center" }}>
            Safe Exam Browser already open or showing the wrong exam? Quit it completely (Cmd+Q), delete older exam files, then download the file again.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "14px 0 10px", textAlign: "center" }}>
            Your invigilator allowed you to use this browser?
          </p>
          <button
            type="button"
            onClick={() => { try { sessionStorage.setItem(`doravo_seb_continue_${id}`, "1"); } catch { /* ignore */ } setSebGate("ok"); }}
            style={{ ...btnBase, padding: "13px 16px", fontSize: 15, background: "#dc2626", color: "#fff", border: "none" }}
          >
            Use Chrome
          </button>
        </div>
      </div>
    );
  }

  /* ── step 0: username + this assessment's exam password —
       no portal account login required.
       Deliberately styled apart from the student-portal login (info-
       blue accent + an "EXAM ACCESS" badge instead of the app's usual
       primary/maroon look), so a student can tell at a glance this is
       a separate, exam-only sign-in — not their regular portal login.
       The "log in instead" link to the portal login has been removed:
       this screen is exam-only and shouldn't route students toward
       their portal credentials, which must never be sufficient to
       open an exam (see hasUsableSession above). ── */
  if (phase === "examlogin") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <form className="dash-card" style={{ ...S.panelCard, border: "1px solid var(--info)" }} onSubmit={handleExamLogin} aria-labelledby="examlogin-title">
          <span style={S.examAccessBadge}>Exam Access</span>
          <div style={{ ...S.iconCircle, background: "var(--info-tint)" }}>
            <LogIn size={26} color="var(--info)" aria-hidden="true" />
          </div>
          <h1 id="examlogin-title" data-phase-heading tabIndex={-1} style={{ margin: "16px 0 8px", color: "var(--text)", fontSize: 18, fontWeight: 800, textAlign: "center" }}>Sign In to Take This Assessment</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", textAlign: "center" }}>
            {examIdentity
              ? "Enter the exam password your teacher or admin gave you for this assessment."
              : "Enter your assessment number and the exam password your teacher or admin gave you for this assessment."}
            {" "}You don't need a student-portal password for this.
          </p>

          {examIdentity ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "var(--text)", fontWeight: 800, fontSize: 15, overflowWrap: "anywhere" }}>{examIdentity.name || examIdentity.username}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 2 }}>
                  No. {examIdentity.username}{examIdentity.school ? ` · ${examIdentity.school}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try { sessionStorage.removeItem("doravo_exam_identity"); } catch { /* ignore */ }
                  setExamIdentity(null); setExamUsername(""); setExamLoginError("");
                }}
                style={{ background: "none", border: "none", color: "var(--info)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}
              >
                Not you?
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="exam-username" style={S.fieldLabel}>Assessment number (username)</label>
              <div style={S.inputWithIcon}>
                <User size={15} color="var(--text-muted)" aria-hidden="true" />
                <input
                  id="exam-username"
                  style={S.iconInput}
                  value={examUsername}
                  onChange={(e) => { setExamUsername(e.target.value); setExamLoginError(""); }}
                  placeholder="Your assessment number"
                  autoComplete="username"
                  aria-required="true"
                  aria-invalid={!!examLoginError}
                  aria-describedby={examLoginError ? "exam-login-error" : undefined}
                />
              </div>
            </>
          )}

          <label htmlFor="exam-password" style={{ ...S.fieldLabel, marginTop: 12 }}>Exam Password</label>
          <div style={S.inputWithIcon}>
            <KeyRound size={15} color="var(--text-muted)" aria-hidden="true" />
            <input
              id="exam-password"
              style={S.iconInput}
              type="password"
              value={examPasswordInput}
              onChange={(e) => { setExamPasswordInput(e.target.value); setExamLoginError(""); }}
              placeholder="Exam password"
              autoComplete="off"
              autoFocus={!!examIdentity}
              aria-required="true"
              aria-invalid={!!examLoginError}
              aria-describedby={examLoginError ? "exam-login-error" : undefined}
            />
          </div>

          {examLoginError && (
            <p id="exam-login-error" role="alert" style={{ color: "var(--destructive)", fontSize: 12.5, fontWeight: 600, margin: "12px 0 0", textAlign: "center" }}>
              {examLoginError}
            </p>
          )}

          <button
            style={{ ...S.primaryBtn, background: "var(--info)", marginTop: 18 }}
            type="submit"
            disabled={examLoggingIn || !examUsername.trim() || !examPasswordInput.trim()}
          >
            {examLoggingIn ? "Signing in…" : "Continue to Exam"}
          </button>
        </form>
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <div className="dash-spin" style={S.spinner} aria-hidden="true" />
        <p role="status" data-phase-heading tabIndex={-1} style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: 13.5 }}>Preparing your exam session…</p>
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  if (phase === "devicedenied") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <div className="dash-card" style={{ ...S.panelCard, border: "1px solid var(--destructive)", maxWidth: 460 }}>
          <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
            <AlertTriangle size={26} color="var(--destructive)" aria-hidden="true" />
          </div>
          <h1 data-phase-heading tabIndex={-1} style={{ margin: "16px 0 10px", color: "var(--destructive)", fontSize: 19, fontWeight: 800, textAlign: "center" }}>
            This device isn't allowed
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13.5, textAlign: "center", margin: "0 0 8px" }}>
            {errorMsg || "This exam can only be taken on a Windows or Mac laptop/desktop computer. Phones and tablets are not allowed."}
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13, textAlign: "center", margin: "0 0 16px" }}>
            Open this exam link on a Windows or Mac computer and sign in again. Your answers so far were saved.
            If your teacher has allowed this device, press Try again.
          </p>
          <button style={S.primaryBtn} onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
            <AlertTriangle size={26} color="var(--destructive)" aria-hidden="true" />
          </div>
          <p role="alert" data-phase-heading tabIndex={-1} style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, textAlign: "center", lineHeight: 1.6, margin: "16px 0 0" }}>{errorMsg}</p>
          <button style={S.secondaryBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} aria-hidden="true" /> Go Back
          </button>
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  if (phase === "ended") {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    })();
    const wasExamOnly = !!currentUser.examOnly;

    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--success-tint)" }}>
            <CheckCircle2 size={26} color="var(--success)" aria-hidden="true" />
          </div>
          <h1 role="alert" data-phase-heading tabIndex={-1} style={{ color: "var(--text)", fontWeight: 800, fontSize: "clamp(26px, 6vw, 34px)", lineHeight: 1.15, textAlign: "center", margin: "18px 0 0" }}>
            The exam has ended
          </h1>
          <p style={{ color: "var(--success)", fontWeight: 700, fontSize: "clamp(18px, 4.5vw, 22px)", lineHeight: 1.3, textAlign: "center", margin: "10px 0 0" }}>
            Your responses have been saved.
          </p>
          {errorMsg ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", margin: "12px 0 0" }}>
              {errorMsg}
            </p>
          ) : null}
          {loggedOut && sebQuitIn !== null ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", margin: "12px 0 0" }}>
              Safe Exam Browser will close in {Math.max(sebQuitIn, 0)} second{sebQuitIn === 1 ? "" : "s"}.
            </p>
          ) : loggedOut ? (
            <>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", margin: "12px 0 0" }}>
                You've been logged out for security. Redirecting you to the login page…
              </p>
              <button style={{ ...S.primaryBtn, marginTop: 18 }} onClick={() => navigate("/login")}>
                Go to Login
              </button>
            </>
          ) : wasExamOnly ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", margin: "12px 0 0" }}>
              You can close this tab now.
            </p>
          ) : (
            <button style={S.primaryBtn} onClick={() => navigate("/student/e-assessments")}>
              Back to Assessments
            </button>
          )}
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div style={S.lockOverlay} role="main">
        <div
          className="dash-card"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lock-title"
          aria-describedby="lock-desc"
          style={{ ...S.panelCard, border: "1px solid var(--destructive)", maxWidth: 440 }}
        >
          <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
            <Lock size={26} color="var(--destructive)" aria-hidden="true" />
          </div>
          <h1 id="lock-title" data-phase-heading tabIndex={-1} style={{ margin: "16px 0 10px", color: "var(--destructive)", fontSize: 19, fontWeight: 800, textAlign: "center" }}>Device Locked</h1>
          <p id="lock-desc" style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13.5, textAlign: "center", margin: "0 0 16px" }}>{lockReason}</p>
          {canResume ? (
            <>
              <p style={{ color: "var(--success)", fontSize: 13, fontWeight: 700, lineHeight: 1.6, textAlign: "center", margin: "0 0 12px" }}>
                An administrator has unlocked your exam. Press Resume on this device to continue.
              </p>
              <button
                onClick={handleResume}
                disabled={resuming}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "var(--success)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: resuming ? "wait" : "pointer", opacity: resuming ? 0.7 : 1 }}
              >
                {resuming ? "Resuming…" : "Resume exam"}
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, textAlign: "center" }}>
                This screen will stay locked until an administrator clears it, or the exam ends.
                Please contact your invigilator or school admin — it unlocks here automatically, no need to refresh.
              </p>
              <button
                onClick={handleCheckAgain}
                disabled={resuming}
                style={{ width: "100%", marginTop: 8, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 13, cursor: resuming ? "wait" : "pointer" }}
              >
                {resuming ? "Checking…" : "Check again"}
              </button>
            </>
          )}
          {resumeMsg && (
            <p role="alert" style={{ color: "var(--destructive)", fontSize: 12, lineHeight: 1.5, textAlign: "center", margin: "10px 0 0" }}>{resumeMsg}</p>
          )}
          {pollNotice && (
            <p role="alert" style={{ color: "var(--destructive)", fontSize: 12, lineHeight: 1.5, textAlign: "center", margin: "10px 0 0" }}>{pollNotice}</p>
          )}
          {needsRelogin && (
            <button
              onClick={reloginAfterLock}
              style={{ width: "100%", marginTop: 10, padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              Sign in again
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── step 1: reveal the token, force a minimum reading time ── */
  if (phase === "reveal") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <div className="dash-card" style={S.panelCard}>
          <div style={{ ...S.iconCircle, background: "var(--primary-tint)" }}>
            <KeyRound size={26} color="var(--primary)" aria-hidden="true" />
          </div>
          <h1 data-phase-heading tabIndex={-1} style={{ margin: "16px 0 8px", color: "var(--text)", fontSize: 18, fontWeight: 800, textAlign: "center" }}>Your Exam Token</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", textAlign: "center" }}>
            This token belongs only to you for this assessment. Write it down or save it somewhere
            safe — you'll need to type it again on the next screen to open your paper, and it will
            lock to whichever device you use first.
          </p>
          <div style={S.tokenDisplay} aria-hidden="true">{token}</div>
          <p className="sr-only">Your exam token is: {spellOut(token)}. Write it down; you will type it on the next screen.</p>
          <button
            style={{ ...S.primaryBtn, opacity: revealCountdown > 0 ? 0.55 : 1, cursor: revealCountdown > 0 ? "not-allowed" : "pointer" }}
            onClick={confirmSaved}
            disabled={revealCountdown > 0}
          >
            {revealCountdown > 0 ? `I've saved my token (${revealCountdown}s)` : "I've saved my token — Continue"}
          </button>
        </div>
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  /* ── step 2: re-enter the token to prove it was saved, then activate ── */
  if (phase === "verify") {
    return (
      <div className="dash-main" role="main" style={S.stateWrap}>
        <form className="dash-card" style={S.panelCard} onSubmit={handleVerifySubmit} aria-labelledby="verify-title">
          <div style={{ ...S.iconCircle, background: "var(--primary-tint)" }}>
            <PenLine size={26} color="var(--primary)" aria-hidden="true" />
          </div>
          <h1 id="verify-title" data-phase-heading tabIndex={-1} style={{ margin: "16px 0 8px", color: "var(--text)", fontSize: 18, fontWeight: 800, textAlign: "center" }}>Enter Your Token to Begin</h1>
          <p id="verify-help" style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", textAlign: "center" }}>
            Type the token you just saved. Once it's accepted, your paper opens and this device
            locks to the exam until you submit.
          </p>
          {security.require_camera ? (
            <div style={{ margin: "0 0 16px", padding: 12, border: `1px dashed ${camTestDone ? "var(--success)" : "var(--destructive)"}`, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11.5, lineHeight: 1.6, margin: "0 0 10px" }}>
                <Camera size={12} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
                <strong>Required: camera check.</strong> Sit in the middle of the frame, facing the screen. Your photo is taken
                automatically once you are in position, and the exam cannot start until it is done.
              </p>

              {camTestStage === "idle" && (
                <button type="button" style={{ ...S.secondaryBtn, margin: "0 auto", justifyContent: "center" }} onClick={startCamTest} disabled={activating}>
                  <Camera size={14} aria-hidden="true" /> Start camera check
                </button>
              )}
              {camTestStage === "starting" && (
                <p role="status" style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: 0 }}>Starting camera…</p>
              )}
              {camTestStage === "positioning" && (
                <>
                  <p className="sr-only">
                    The camera preview is visual. Spoken guidance will tell you how to position yourself.
                    Your photo is taken automatically when you hold a good position.
                  </p>
                  <div style={{ position: "relative", width: "100%", maxWidth: 320, aspectRatio: "4 / 3", margin: "0 auto", background: "#000", borderRadius: 10, overflow: "hidden" }}>
                    <video
                      ref={camTestVideoRef}
                      muted
                      autoPlay
                      playsInline
                      aria-hidden="true"
                      style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                    />
                    <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "46%", width: "44%", height: "72%", transform: "translate(-50%, -50%)", border: `3px dashed ${camTestGood ? "#22c55e" : "rgba(255,255,255,0.85)"}`, borderRadius: "50%", boxShadow: "0 0 0 999px rgba(0,0,0,0.38)", pointerEvents: "none" }} />
                  </div>
                  <p role="status" aria-live="polite" aria-atomic="true" style={{ color: camTestGood ? "var(--success)" : "var(--text)", fontSize: 13, fontWeight: 700, lineHeight: 1.5, margin: "10px 0 6px" }}>
                    {camTestHint || "Looking for your face…"}
                  </p>
                  {!camTestManual && (
                    <div
                      role="progressbar"
                      aria-label="Holding position"
                      aria-valuemin={0}
                      aria-valuemax={CAM_TEST_HOLD_TICKS}
                      aria-valuenow={camTestHold}
                      style={{ height: 6, maxWidth: 320, margin: "0 auto", borderRadius: 3, background: "var(--border)", overflow: "hidden" }}
                    >
                      <div style={{ height: "100%", width: `${Math.min(100, (camTestHold / CAM_TEST_HOLD_TICKS) * 100)}%`, background: "var(--success)", transition: "width .3s" }} />
                    </div>
                  )}
                  {camTestManual && (
                    <button type="button" style={{ ...S.secondaryBtn, margin: "8px auto 0", justifyContent: "center" }} onClick={() => takeCamTestPhoto(null)}>
                      <Camera size={14} aria-hidden="true" /> Take photo
                    </button>
                  )}
                </>
              )}
              {camTestStage === "captured" && (
                <>
                  <img src={camTestPhoto} alt="Your camera check photo" style={{ width: "100%", maxWidth: 260, borderRadius: 10, display: "block", margin: "0 auto 8px" }} />
                  {camTestSaving && <p role="status" style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: "0 0 6px" }}>Saving your photo…</p>}
                  {camTestDone && (
                    <p role="status" style={{ color: "var(--success)", fontSize: 12.5, fontWeight: 700, lineHeight: 1.6, margin: "0 0 6px" }}>
                      Photo saved. Keep your face in this same position, centred and facing the screen, for the whole exam.
                    </p>
                  )}
                  {!camTestSaving && !camTestDone && (
                    <button type="button" style={{ ...S.secondaryBtn, margin: "0 auto 6px", justifyContent: "center" }} onClick={() => saveCamTestPhoto(camTestPhoto)}>
                      Try saving again
                    </button>
                  )}
                  <button type="button" style={{ ...S.secondaryBtn, margin: "0 auto", justifyContent: "center" }} onClick={retakeCamTest} disabled={camTestSaving || activating}>
                    Retake photo
                  </button>
                </>
              )}
              {camTestError && (
                <p role="alert" style={{ color: "var(--destructive)", fontSize: 12, fontWeight: 600, lineHeight: 1.5, margin: "8px 0 0" }}>{camTestError}</p>
              )}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 11.5, lineHeight: 1.6, margin: "0 0 16px", textAlign: "center" }}>
              <Camera size={12} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Camera monitoring is not used for this exam.
            </p>
          )}
          {security.require_screen_share && (
          <div style={{ margin: "0 0 16px", padding: 12, border: `1px dashed ${screenStatus === "sharing" ? "var(--success)" : "var(--destructive)"}`, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11.5, lineHeight: 1.6, margin: "0 0 8px" }}>
              <MonitorUp size={12} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
              <strong>Required:</strong> you must share your <strong>entire screen</strong> (not a single
              window or tab) before the exam can start. When your browser asks, pick the
              "Entire Screen" option and press Share.
            </p>
            {screenStatus === "sharing" ? (
              <>
                <p role="status" style={{ color: "var(--success)", fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>
                  Entire screen is being shared.
                </p>
                <button type="button" style={{ ...S.secondaryBtn, margin: "0 auto", justifyContent: "center" }} onClick={startScreenShare} disabled={activating}>
                  Change screen
                </button>
              </>
            ) : (
              <button type="button" style={{ ...S.secondaryBtn, margin: "0 auto", justifyContent: "center" }} onClick={startScreenShare} disabled={activating}>
                <MonitorUp size={14} aria-hidden="true" /> {screenError ? "Try sharing screen again" : "Share my entire screen"}
              </button>
            )}
            {screenError && screenStatus !== "sharing" && (
              <p role="alert" style={{ color: "var(--destructive)", fontSize: 12, fontWeight: 600, margin: "8px 0 0" }}>{screenError}</p>
            )}
          </div>
          )}
          <label htmlFor="verify-token" className="sr-only">Exam token</label>
          <input
            id="verify-token"
            style={S.verifyInput}
            value={verifyInput}
            onChange={(e) => { setVerifyInput(e.target.value); setVerifyError(""); }}
            placeholder="Enter token"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            aria-invalid={!!verifyError}
            aria-describedby={verifyError ? "verify-help verify-error" : "verify-help"}
          />
          {verifyError && <p id="verify-error" role="alert" style={{ color: "var(--destructive)", fontSize: 12.5, fontWeight: 600, margin: "10px 0 0", textAlign: "center" }}>{verifyError}</p>}
          <button style={{ ...S.primaryBtn, marginTop: 18 }} type="submit" disabled={activating || !verifyInput.trim() || (security.require_camera && !camTestDone) || (security.require_screen_share && screenStatus !== "sharing")}>
            {activating ? (startStep || "Starting…") : (security.require_camera && !camTestDone) ? "Complete the camera check to start" : (security.require_screen_share && screenStatus !== "sharing") ? "Share your screen to start" : "Start Exam"}
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
        <div style={{ position: "absolute", top: 20, right: 24 }}>{ThemeToggle()}</div>
      </div>
    );
  }

  /* ── active exam ── */
  return (
    <main className="dash-main exam-page-container" style={S.page}>
      <a className="skip-link" href="#exam-question" onClick={(e) => { e.preventDefault(); qHeadingRef.current?.focus(); }}>Skip to question</a>
      <div className="exam-top-bar" style={S.topBar}>
        <div>
          <h1 style={S.examTitle}>{assessment?.title}</h1>
          <p style={S.examMeta}>{assessment?.subject} · Token <strong style={{ color: "var(--primary)" }} aria-label={`Token ${spellOut(token)}`}>{token}</strong></p>
          <p aria-live="off" style={{ ...S.examMeta, fontSize: 11, marginTop: 2, color: (autosaveFailed || !online) ? "var(--destructive)" : "var(--text-muted)" }}>
            {!online
              ? "Offline — your answers are saved on this device and will sync when you're back online"
              : autosaveFailed
                ? "Couldn't reach the server — answers are safe on this device, retrying in 30 seconds"
                : lastSavedAt
                  ? `Saved on this device · synced to the server at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Answers are saved on this device and synced to the server every 30 seconds"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            role="timer"
            tabIndex={0}
            aria-live="off"
            aria-label={`Time remaining: ${spokenTime(secondsLeft)}. Press Alt and T from anywhere to hear this.`}
            style={{ ...S.timer, color: secondsLeft < 60 ? "var(--destructive)" : "var(--text)" }}
          >
            <Timer size={16} aria-hidden="true" /> <span aria-hidden="true">{mmss(secondsLeft)}</span>
          </div>
          {ThemeToggle()}
        </div>
      </div>

      {cameraStatus === "active" && !faceVisible && (
        <div className="eyes-off-flash" role="alert" style={S.eyesOffBanner}>
          <EyeOff size={18} color="#fff" aria-hidden="true" style={{ flexShrink: 0 }} />
          <span style={S.eyesOffBannerText}>Keep your eyes on the computer — this is being photographed for review</span>
        </div>
      )}

      {cameraStatus === "active" && faceVisible && positionDrift && (
        <div role="status" style={S.warningStrip}>
          <Camera size={16} color="var(--warning)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>Move back to the position from your camera check: face centred in the frame, looking at the screen.</span>
        </div>
      )}

      {violations > 0 && (
        <div role="alert" style={S.warningStrip}>
          <ShieldAlert size={16} color="var(--warning)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>Warning {violations}/{MAX_VIOLATIONS}: suspicious activity detected on this device. {security.lock_on_violations ? <>Reaching {MAX_VIOLATIONS} will lock your exam.</> : "This is being recorded."}</span>
        </div>
      )}

      {/* Camera monitoring is optional, so a missing/declined camera is
          just informational, not a warning — the exam is unaffected. */}
      {cameraStatus === "off" && !security.require_camera && (
        <div role="status" style={S.infoStrip}>
          <CameraOff size={16} color="var(--info)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>Camera monitoring is off for this session. Your exam will continue as normal.</span>
        </div>
      )}

      {security.require_camera && cameraStatus === "off" && !submitting && !security.accessibility_mode && (
        <div style={S.lockOverlay}>
          <div
            className="dash-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cam-overlay-title"
            aria-describedby="cam-overlay-desc"
            style={{ ...S.panelCard, border: "1px solid var(--destructive)", maxWidth: 440 }}
          >
            <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
              <CameraOff size={26} color="var(--destructive)" aria-hidden="true" />
            </div>
            <h2 id="cam-overlay-title" style={{ margin: "16px 0 10px", color: "var(--destructive)", fontSize: 19, fontWeight: 800, textAlign: "center" }}>Camera required</h2>
            <p id="cam-overlay-desc" style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13.5, textAlign: "center", margin: "0 0 16px" }}>
              This exam requires your camera to stay on the whole time. Turn it back on to continue. Your timer keeps running.
            </p>
            {cameraError && <p role="alert" style={{ color: "var(--destructive)", fontSize: 12.5, fontWeight: 600, margin: "0 0 12px", textAlign: "center" }}>{cameraError}</p>}
            <button type="button" autoFocus style={{ ...S.primaryBtn, justifyContent: "center" }} onClick={retryCamera}>
              <Camera size={14} aria-hidden="true" /> Try my camera again
            </button>
          </div>
        </div>
      )}

      {security.require_screen_share && screenStatus !== "sharing" && !submitting && (
        <div style={S.lockOverlay}>
          <div
            className="dash-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="screen-overlay-title"
            aria-describedby="screen-overlay-desc"
            style={{ ...S.panelCard, border: "1px solid var(--destructive)", maxWidth: 440 }}
          >
            <div style={{ ...S.iconCircle, background: "var(--destructive-tint)" }}>
              <MonitorUp size={26} color="var(--destructive)" aria-hidden="true" />
            </div>
            <h2 id="screen-overlay-title" style={{ margin: "16px 0 10px", color: "var(--destructive)", fontSize: 19, fontWeight: 800, textAlign: "center" }}>Screen sharing required</h2>
            <p id="screen-overlay-desc" style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13.5, textAlign: "center", margin: "0 0 16px" }}>
              Your entire screen must stay shared for the whole exam. Share it again to continue. Your timer keeps running.
            </p>
            {screenError && <p role="alert" style={{ color: "var(--destructive)", fontSize: 12.5, fontWeight: 600, margin: "0 0 12px", textAlign: "center" }}>{screenError}</p>}
            <button type="button" autoFocus style={{ ...S.primaryBtn, justifyContent: "center" }} onClick={startScreenShare}>
              <MonitorUp size={14} aria-hidden="true" /> Share my entire screen
            </button>
          </div>
        </div>
      )}

      {screenStatus === "sharing" && (
        <div style={{ position: "fixed", bottom: 18, left: 18, zIndex: 500, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          <MonitorUp size={12} aria-hidden="true" /> Screen shared for review
        </div>
      )}

      {/* Floating camera-monitor widget — visible to the student the whole
          time their camera is on, on purpose: the point is honest, visible
          monitoring, not a hidden check. Only rendered when a camera is
          actually in use, since monitoring is optional. */}
      {(cameraStatus === "requesting" || cameraStatus === "active" || cameraStatus === "nomodel") && (
        <div style={S.camWidget}>
          <div aria-hidden="true" style={{ ...S.camDot, background: faceVisible ? "var(--success)" : "var(--destructive)" }} />
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            aria-hidden="true"
            onLoadedMetadata={(e) => { const p = e.currentTarget.play(); if (p && p.catch) p.catch(() => {}); }}
            style={S.camVideo}
          />
          <div aria-hidden="true" style={{ fontSize: 10, color: "var(--text-muted)", maxWidth: 130, textAlign: "center", lineHeight: 1.3 }}>
            Stay in your camera-check position
          </div>
          <div style={S.camStatusText} aria-live="off">
            {cameraStatus === "requesting" ? (
              <><Camera size={12} aria-hidden="true" /> Starting camera…</>
            ) : cameraStatus === "nomodel" ? (
              <><Camera size={12} aria-hidden="true" /> Camera on</>
            ) : faceVisible ? (
              <><Eye size={12} aria-hidden="true" /> Looking at screen</>
            ) : (
              <><EyeOff size={12} color="var(--destructive)" aria-hidden="true" />
                <span style={{ color: "var(--destructive)" }}>
                  Eyes off screen — {faceAbsentSeconds}s{photosCaptured > 0 ? ` · ${photosCaptured} photo${photosCaptured !== 1 ? "s" : ""} sent` : ""}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {assessment?.instructions && (
        <div className="dash-card" role="note" aria-label="Exam instructions" style={S.instructionsBox}>
          <ClipboardList size={16} color="var(--text-secondary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span><strong>Instructions:</strong> {assessment.instructions}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.length > 0 && (() => {
          const total = questions.length;
          const qi = Math.min(currentQuestionIndex, Math.max(total - 1, 0));
          const q = questions[qi];
          const answeredCount = questions.filter(isAnswered).length;
          return (
            <>
              <p style={S.qProgress}>
                Question {qi + 1} of {total} &nbsp;·&nbsp; {answeredCount} of {total} answered
              </p>

              <div key={q.id} className="dash-card" role="group" aria-labelledby="exam-question" style={S.qCard}>
                <h2 id="exam-question" ref={qHeadingRef} tabIndex={-1} style={S.qText}>
                  <span className="sr-only">
                    Question {qi + 1} of {total}, {isAnswered(q) ? "answered" : "not answered"}.{" "}
                  </span>
                  <span aria-hidden="true" style={{ color: "var(--primary)", marginRight: 8 }}>Q{qi + 1}.</span>{q.question_text}
                  <span style={S.qMarks}>{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                </h2>

                {Array.isArray(q.images) && q.images.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    {q.images.map((img) => (
                      <img
                        key={img.id}
                        src={resolveFileUrl(img.image_url)}
                        alt={img.alt_text || img.description || "Diagram for this question. No text description was provided; ask your invigilator."}
                        style={{ maxWidth: 260, maxHeight: 220, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)" }}
                      />
                    ))}
                  </div>
                )}

                {q.question_type === "essay" && (assessment?.music_paper || assessment?.art_paper) ? (
                  // Music or Art & Craft paper: typed answer + a button that unlocks the drawing pad.
                  <MusicAnswerBox
                    key={q.id}
                    kind={assessment?.art_paper && !assessment?.music_paper ? "art" : "music"}
                    qid={q.id}
                    value={answers[q.id] || ""}
                    onChange={(val) => saveAnswer(q.id, val)}
                    renderText={(p) => <EssayEditor {...p} autoCapitalize={assessment?.auto_capitalize !== false} autoFullstop={assessment?.auto_fullstop !== false} />}
                  />
                ) : q.question_type === "essay" ? (
                  <EssayEditor
                    key={q.id}
                    id={q.id}
                    initialValue={answers[q.id] || ""}
                    onChange={(html) => saveAnswer(q.id, html)}
                    autoCapitalize={assessment?.auto_capitalize !== false}
                    autoFullstop={assessment?.auto_fullstop !== false}
                  />
                ) : (
                  <div role="radiogroup" aria-labelledby="exam-question" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                          onChange={() => saveAnswer(q.id, o.option_label)}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        <span aria-hidden="true" style={{ fontWeight: 700, color: "var(--primary)" }}>{o.option_label}.</span>
                        <span className="sr-only">Option {o.option_label}: </span>
                        <span style={{ color: "var(--text)" }}>{o.option_text}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div style={S.navButtonsRow}>
                <button
                  type="button"
                  aria-label={qi === 0 ? "Previous question (you are on the first question)" : `Previous question, question ${qi}`}
                  style={{ ...S.navBtn, opacity: qi === 0 ? 0.45 : 1, cursor: qi === 0 ? "not-allowed" : "pointer" }}
                  onClick={() => goToQuestion(qi - 1)}
                  disabled={qi === 0}
                >
                  <ChevronLeft size={15} aria-hidden="true" /> Previous
                </button>
                <button
                  type="button"
                  aria-label={qi >= total - 1 ? "Next question (you are on the last question)" : `Next question, question ${qi + 2}`}
                  style={{ ...S.navBtn, opacity: qi >= total - 1 ? 0.45 : 1, cursor: qi >= total - 1 ? "not-allowed" : "pointer" }}
                  onClick={() => goToQuestion(qi + 1)}
                  disabled={qi >= total - 1}
                >
                  Next <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>

              <nav style={S.qnavWrap} aria-label="Question navigator">
                <p style={S.qnavLabel} id="qnav-label">Jump to question</p>
                <ul style={{ ...S.qnavStrip, listStyle: "none", margin: 0, padding: 0 }} aria-labelledby="qnav-label">
                  {questions.map((qq, i) => {
                    const answered = isAnswered(qq);
                    const isCurrent = i === qi;
                    return (
                      <li key={qq.id} style={{ margin: 0, padding: 0 }}>
                        <button
                          type="button"
                          title={answered ? `Question ${i + 1} — answered` : `Question ${i + 1} — not answered yet`}
                          aria-label={`Question ${i + 1}, ${answered ? "answered" : "not answered"}${isCurrent ? ", current" : ""}`}
                          aria-current={isCurrent ? "step" : undefined}
                          onClick={() => goToQuestion(i)}
                          style={{
                            ...S.qnavBtn,
                            background: answered ? "var(--success)" : "var(--bg)",
                            borderColor: isCurrent ? "var(--primary)" : answered ? "var(--success)" : "var(--border)",
                            boxShadow: isCurrent ? "0 0 0 2px var(--primary-tint)" : "none",
                            color: answered ? "#fff" : "var(--text-secondary)",
                          }}
                        >
                          {i + 1}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <button
                style={{ ...S.submitBtn, opacity: (submitting || qi < total - 1) ? 0.6 : 1, cursor: (submitting || qi < total - 1) ? "not-allowed" : "pointer" }}
                onClick={() => { if (submitting || qi < total - 1) return; handleSubmit(false); }}
                aria-disabled={submitting || qi < total - 1}
                aria-describedby={qi < total - 1 ? "submit-hint" : undefined}
              >
                {submitting ? "Submitting…" : "Submit Assessment"}
              </button>
              {qi < total - 1 && (
                <span id="submit-hint" className="sr-only">Go to the last question to submit.</span>
              )}
            </>
          );
        })()}
      </div>
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
    // Static maxWidth removed — sizing is now handled by the
    // .exam-page-container class (see injectExamStyles above), which
    // caps the exam view at 95% of the viewport width.
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
  infoStrip: {
    display: "flex", alignItems: "center", gap: 10,
    background: "var(--info-tint)", border: "1px solid var(--info)",
    color: "var(--info)", borderRadius: "var(--radius-sm)",
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
  // One-question-at-a-time nav (ported from exam.html's .q-progress /
  // .nav-buttons-row / .qnav-wrap / .qnav-btn).
  qProgress: { margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.02em" },
  navButtonsRow: { display: "flex", gap: 10 },
  navBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", fontSize: 13.5, fontWeight: 700,
  },
  qnavWrap: { marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--border)" },
  qnavLabel: { margin: "0 0 10px", fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" },
  qnavStrip: { display: "flex", flexWrap: "wrap", gap: 8 },
  qnavBtn: {
    width: 34, height: 34, borderRadius: 8, border: "1.5px solid var(--border)",
    fontSize: 12.5, fontWeight: 800, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background .15s ease, border-color .15s ease, color .15s ease",
  },
  optionRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid", cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  essayBox: {
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    background: "var(--bg)", overflow: "hidden",
  },
  essayToolbar: {
    display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
    padding: "6px 8px", borderBottom: "1px solid var(--border)", background: "var(--card)",
  },
  essayToolbarBtn: {
    width: 30, height: 30, borderRadius: 6, border: "1px solid transparent",
    background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
    fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
  },
  essayToolbarBtnActive: {
    background: "var(--primary-tint)", color: "var(--primary)", borderColor: "var(--primary)",
  },
  essaySep: { width: 1, height: 18, background: "var(--border)", margin: "0 4px", flexShrink: 0 },
  essayTextBtn: { width: "auto", padding: "0 10px", fontSize: 12, whiteSpace: "nowrap" },
  essayTableBar: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
    padding: "6px 8px", borderBottom: "1px solid var(--border)", background: "var(--bg)",
  },
  essayTableLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" },
  essayTableInput: {
    width: 56, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", fontSize: 13, fontFamily: "inherit",
  },
  essayTableHint: { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", margin: "0 4px" },
  // Look (ruled lines, margin, font size, line height) comes from the shared
  // .ruled-paper class in src/ruled-paper.css — only scrolling is set here.
  essayContent: {
    maxHeight: 520, overflowY: "auto", outline: "none",
  },
  essayStatus: {
    display: "flex", justifyContent: "flex-end", gap: 10, padding: "5px 12px",
    fontSize: 11, color: "var(--text-muted)", fontWeight: 600,
    borderTop: "1px solid var(--border)", background: "var(--card)",
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
  // Small pill badge shown only on the exam-login screen so it reads
  // as visually distinct from the regular student-portal login.
  examAccessBadge: {
    display: "inline-flex", alignItems: "center",
    background: "var(--info-tint)", color: "var(--info)",
    border: "1px solid var(--info)", borderRadius: 999,
    padding: "3px 10px", fontSize: 10.5, fontWeight: 800,
    letterSpacing: "0.06em", textTransform: "uppercase",
    marginBottom: 14,
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