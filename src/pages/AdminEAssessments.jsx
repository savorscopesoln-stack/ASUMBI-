import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  Search, X, RefreshCw, Download, Plus, UserPlus, ChevronDown, ArrowLeft, Pencil, Trash2,
  Check, CheckCircle2, AlertTriangle, Lock, Unlock, Zap, Rocket, MessageSquare, Mail,
  BarChart3, ClipboardList, FileText, Award, LockKeyhole, Users, Inbox, Clock, TrendingUp,
  Sun, Moon, Server, GraduationCap, PlusCircle, MinusCircle, Save, HelpCircle, Smartphone, ShieldCheck, Camera,
  Eye, Pause, Send,
} from "lucide-react";
import LocalSyncPanel from "../components/eassessment/LocalSyncPanel";
import { fmtDateTime } from "../components/mainExams/shared";
import MarkingLeaderboard from "../components/eassessment/MarkingLeaderboard";
import SuggestedRemarksPanel from "../components/eassessment/SuggestedRemarksPanel";
import MarkingDeadlinePanel from "../components/eassessment/MarkingDeadlinePanel";
import { downloadTablesPdf } from "../utils/pdfExport";
import { getSchoolInfo, drawSchoolHeader } from "../utils/schoolInfo";
import EvidenceGallery from "../components/eassessment/EvidenceGallery";
import { getGradeForScore, getPassMark, DEFAULT_GRADING_SYSTEM } from "../utils/grading";
import { fmt2 } from "../utils/format";
import { answerToSafeHtml } from "../utils/safeHtml";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — shared with the rest of the app
   ─────────────────────────────────────────────────────────
   Same stylesheet id/contents as the dashboard's token sheet,
   so this page inherits the same palette and dark-mode support.
   Injecting twice is a no-op if the dashboard already mounted
   it. Theme itself now comes from the shared ThemeContext
   instead of a page-local `tv_theme_preference` key, so toggling
   here stays in sync with every other page.
═══════════════════════════════════════════════════════════ */
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

/* ─── static token map ───
   Every sub-component below reads colors through useC() so
   nothing needs prop-drilling. The values are CSS variables, so
   light/dark switching is handled entirely by the stylesheet's
   [data-theme] selector rather than by recomputing this object —
   no context/provider needed any more.
*/
const C = {
  bg: "var(--bg)", bgAlt: "var(--bg)", surface: "var(--card)", card: "var(--card)", cardHover: "var(--card-elevated)",
  border: "var(--border)", borderHi: "var(--border)",
  textPri: "var(--text)", textSec: "var(--text-secondary)", textMuted: "var(--text-muted)",
  accent: "var(--primary)",
  success: "var(--success)", danger: "var(--destructive)", warning: "var(--warning)",
  white: "#ffffff",
};
const useC = () => C;

/* ═══════════════════════════════════════════════════════════
   ICONS — lucide-react, aliased to the original names so every
   call site below (IconSearch, IconX, …) is untouched
═══════════════════════════════════════════════════════════ */
function IconDot({ size = 8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" style={style}>
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}
const IconSearch       = Search;
const IconX            = X;
const IconRefresh      = RefreshCw;
const IconDownload     = Download;
const IconPlus         = Plus;
const IconUserPlus     = UserPlus;
const IconChevronDown  = ChevronDown;
const IconArrowLeft    = ArrowLeft;
const IconEdit         = Pencil;
const IconTrash        = Trash2;
const IconCheck        = Check;
const IconCheckCircle  = CheckCircle2;
const IconAlert        = AlertTriangle;
const IconLock         = Lock;
const IconUnlock       = Unlock;
const IconZap          = Zap;
const IconRocket       = Rocket;
const IconMessage      = MessageSquare;
const IconMail         = Mail;
const IconBarChart     = BarChart3;
const IconClipboardList= ClipboardList;
const IconFileText     = FileText;
const IconAward        = Award;
const IconLockKeyhole  = LockKeyhole;
const IconServer       = Server;
const IconUsers        = Users;
const IconInbox        = Inbox;
const IconClock        = Clock;
const IconTrendUp      = TrendingUp;
const IconSun          = Sun;
const IconMoon         = Moon;
const IconGraduationCap= GraduationCap;
const IconPlusCircle   = PlusCircle;
const IconMinusCircle  = MinusCircle;
const IconSave         = Save;
const IconQuestions    = HelpCircle;

/* ═══════════════════════════════════════════════════════════
   HELPERS  (unchanged logic)
═══════════════════════════════════════════════════════════ */
const extract = (res) => {
  const d = res?.data;
  if (Array.isArray(d))              return d;
  if (Array.isArray(d?.data))        return d.data;
  if (Array.isArray(d?.submissions)) return d.submissions;
  if (Array.isArray(d?.results))     return d.results;
  return [];
};

// Converts a server DATETIME (ISO string) to the value a
// <input type="datetime-local"> needs (local time, no seconds/zone).
const toDatetimeLocal = (isoString) => {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Sourced from the shared Grading System (Admin → E-Assessments →
// Grading System tab) instead of a hard-coded A/B/C/D/E scale, so
// grades shown here (Submissions, Released Marks, etc.) match what
// students/teachers see on their own report screens. `gradingSystem`
// is optional so any pre-existing call site that forgets to pass it
// still renders something sensible.
const computeGrade = (score, total = 100, gradingSystem = null) => {
  if (score == null) return "—";
  const pct = (score / (total || 100)) * 100;
  const bands = gradingSystem?.gradeBands?.length ? gradingSystem.gradeBands : null;
  if (bands) {
    const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
    const band = sorted.find((b) => pct >= Number(b.minScore)) || sorted[sorted.length - 1];
    return band?.label || "—";
  }
  // fallback if the grading system hasn't loaded yet
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
};

// Total marks as a plain number — defends against a duplicated column
// arriving as an array (see fixTotalMarks on the server).
const toTotal = (v) => {
  const n = Array.isArray(v) ? Number(v[v.length - 1]) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 100;
};

// Everything the Released Marks tab shows for one mark, derived from the
// saved grading system (bands, grade codes, labels and pass mark).
const markInfo = (m, gradingSystem) => {
  const total = toTotal(m.total_marks);
  const pct = m.score != null ? (Number(m.score) / total) * 100 : null;
  const g = pct != null ? getGradeForScore(pct, gradingSystem) : null;
  const pass = pct != null && pct >= getPassMark(gradingSystem);
  const gradeText = g
    ? (g.grade && g.label && String(g.grade) !== String(g.label) ? `${g.grade} · ${g.label}` : (g.label || g.grade || "—"))
    : "—";
  return { total, pct, g, pass, gradeText };
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const TABS = [
  { label: "Assessments",     icon: IconClipboardList },
  { label: "Submissions",     icon: IconFileText },
  { label: "Marking", icon: IconMessage },
  { label: "Released Marks",  icon: IconAward },
  { label: "Device Locks",    icon: IconLockKeyhole },
  { label: "Local Sync",      icon: IconServer },
  { label: "Grading System",  icon: IconGraduationCap },
  { label: "Activity Log",    icon: IconFileText },
  { label: "Students",        icon: IconUserPlus },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function AdminEAssessments() {
  injectStyles();

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  /* core data */
  const [list,             setList]             = useState([]);
  const [classes,          setClasses]          = useState([]);
  const [subjects,         setSubjects]         = useState([]);
  const [teachers,         setTeachers]         = useState([]);
  const [assignedTeachers, setAssignedTeachers] = useState([]);
  const [submissions,      setSubmissions]      = useState([]);
  const [remarkRequests,   setRemarkRequests]   = useState([]);
  const [releasedMarks,    setReleasedMarks]    = useState([]);
  const [examSessions,     setExamSessions]     = useState([]);
  const [assignBatches,    setAssignBatches]    = useState([]); // history of assignments/allocations (for Undo)
  const [deviceAccess,     setDeviceAccess]     = useState([]); // phones/tablets the Desktop-only switch rejected
  const [gradingSystem,    setGradingSystem]    = useState(null);
  const [gradingDraft,     setGradingDraft]     = useState(null);
  const [gradingSaving,    setGradingSaving]    = useState(false);

  /* ui */
  const [activeTab,     setActiveTab]     = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [search,        setSearch]        = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [splitFor, setSplitFor] = useState(null); // { assessmentId } — manual split marking window
  const [subSearch, setSubSearch] = useState(""); // submissions: individual records only render once something is searched
  const [statusFilter,  setStatusFilter]  = useState("");
  const [markFilter,    setMarkFilter]    = useState(""); // submissions tab: "" | awaiting | marked | auto | released
  const [toast,         setToast]         = useState(null);
  const [bulkMenu,      setBulkMenu]      = useState(false);

  /* modals */
  const [formOpen,     setFormOpen]     = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [assignOpen,   setAssignOpen]   = useState(false);
  const [reportCardOpen, setReportCardOpen] = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [remarkModal,  setRemarkModal]  = useState(null);
  const [markingView, setMarkingView] = useState("leaderboard"); // "leaderboard" | "option" | "deadline" | "suggested" | "remarks"
  const [releaseModal, setReleaseModal] = useState(null);
  const [allocateModal, setAllocateModal] = useState(null); // { subjectName, teachers, assessments, total, teacherId, assessmentId, count }
  const [retrieveModal, setRetrieveModal] = useState(null); // { subjectName, rows:[{id,name,classes,count}], total, picked:Set, all:boolean }
  const [unsubmitted,    setUnsubmitted]    = useState([]);   // sat the exam, nothing submitted
  const [resitModal,     setResitModal]     = useState(null); // { student_id, e_assessment_id, student_name, assessment_title, hasPrevious }
  const [resitPolicy,    setResitPolicy]    = useState("replace");
  // Bulk "Allow resit": ticked students across the submissions list and "Did Not Submit"
  // (key "assessmentId:studentId" -> row), plus the confirm dialog.
  const [resitSel,        setResitSel]       = useState(() => new Map());
  const [bulkResitOpen,   setBulkResitOpen]  = useState(false);
  const [answerModal,  setAnswerModal]  = useState(null);
  const [photoModal,   setPhotoModal]   = useState(null); // { name, loading, evidence, zoom }
  const [quickStats,   setQuickStats]   = useState(null);
  const [accessModal,  setAccessModal]  = useState(null); // { a, loading, data } — "Who can sit & schedule"

  /* selections */
  const [selAssessments, setSelAssessments] = useState([]);
  const [selAssignments, setSelAssignments] = useState([]);

  /* forms */
  const blank = { title: "", subject: "", subjects: [], class_ids: [], duration_minutes: 30, instructions: "", total_marks: 100, exam_password: "", questions_deadline: "", question_setter_teacher_ids: [] };
  const [form,          setForm]          = useState(blank);
  const [editForm,      setEditForm]      = useState(blank);
  const [assignForm,    setAssignForm]    = useState({ teacher_ids: [], subject_ids: [], class_ids: [] });
  const [remarkComment, setRemarkComment] = useState("");

  /* ── Toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Load all ──
     Two-phase + silent refresh, so the page stays snappy:
       1. CORE data (assessments, classes, subjects, teachers, grading) is
          fetched first; the page renders as soon as it arrives.
       2. HEAVY lists (submissions, sessions, released marks, ...) then load
          in the background and fill in as each one lands.
     Only the very first load shows the full-page spinner. Later calls
     (after every save/assign/release) refresh in the background instead of
     blanking the whole page and closing open modals. */
  const firstLoad = useRef(true);
  const loadAll = useCallback(async () => {
    const initial = firstLoad.current;
    if (initial) setLoading(true);
    // Fetch one endpoint; on failure keep whatever is already on screen.
    const pull = (url, apply) =>
      API.get(url).then(apply).catch((e) => { console.error(url, e); });

    try {
      await Promise.all([
        API.get("/e-assessments").then((r) => setList(extract(r))),
        pull("/e-assessments/classes",  (r) => setClasses(extract(r))),
        pull("/e-assessments/subjects", (r) => setSubjects(extract(r))),
        pull("/e-assessments/teachers", (r) => setTeachers(extract(r))),
        pull("/e-assessments/grading-system", (r) => {
          if (r.data) { setGradingSystem(r.data); setGradingDraft(r.data); }
        }),
      ]);
    } catch (err) {
      console.error(err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      firstLoad.current = false;
      setLoading(false);
    }

    // Heavy lists — not awaited, so the UI is already usable.
    pull("/e-assessments/admin/assigned-teachers",         (r) => setAssignedTeachers(extract(r)));
    pull("/e-assessments/submissions",                     (r) => setSubmissions(extract(r)));
    pull("/e-assessments/admin/remark-requests",           (r) => setRemarkRequests(extract(r)));
    pull("/e-assessments/admin/released-marks",            (r) => setReleasedMarks(extract(r)));
    pull("/e-assessments/admin/exam-sessions",             (r) => setExamSessions(extract(r)));
    pull("/e-assessments/admin/exam-sessions/unsubmitted", (r) => setUnsubmitted(extract(r)));
    pull("/e-assessments/admin/device-access",             (r) => setDeviceAccess(extract(r)));
    pull("/e-assessments/admin/assignment-batches",        (r) => setAssignBatches(extract(r)));
  }, [showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Device Locks tab: refresh quietly so a fresh lock (and its reason) shows up without a manual reload.
  useEffect(() => {
    if (activeTab !== 4) return;
    let busy = false; // never start a poll while the previous one is still running
    const iv = setInterval(async () => {
      if (busy || (typeof document !== "undefined" && document.hidden)) return;
      busy = true;
      try {
        const r = await API.get("/e-assessments/admin/exam-sessions");
        setExamSessions(extract(r));
      } catch { /* try again next tick */ }
      finally { busy = false; }
    }, 20000);
    return () => clearInterval(iv);
  }, [activeTab]);

  /* ═══════════════════════════════════════════════════════════
     HANDLERS  (unchanged logic)
  ═══════════════════════════════════════════════════════════ */
  // Resolves a ClassMultiSelect value (array of class-id strings, or
  // ["all"] for the "All Classes" option) down to a concrete list of
  // numeric class ids to act on. Used by Assign Teacher below, where
  // there's no "year" concept — assigning a teacher to a subject is
  // naturally one row per class either way, so expanding a year (or
  // "all") into every individual class is exactly what's wanted there.
  // One card per teacher: their subjects, and under each subject the classes
  // they cover (instead of one repeated card per teacher/subject/class row).
  const teacherCards = useMemo(() => {
    const byTeacher = new Map();
    for (const a of assignedTeachers) {
      if (!byTeacher.has(a.teacher_id)) byTeacher.set(a.teacher_id, { teacher_id: a.teacher_id, teacher_name: a.teacher_name || `Teacher #${a.teacher_id}`, subjects: new Map() });
      const t = byTeacher.get(a.teacher_id);
      const key = a.subject_name || `Subject #${a.subject_id}`;
      if (!t.subjects.has(key)) t.subjects.set(key, []);
      t.subjects.get(key).push({ id: a.id, name: a.class_name || `Class #${a.class_id}` });
    }
    const byName = (x, y) => String(x).localeCompare(String(y), undefined, { numeric: true });
    return [...byTeacher.values()]
      .map((t) => ({ ...t, subjects: [...t.subjects.entries()].sort(([a], [b]) => byName(a, b)).map(([subject_name, cls]) => ({ subject_name, classes: cls.sort((x, y) => byName(x.name, y.name)) })) }))
      .sort((x, y) => byName(x.teacher_name, y.teacher_name));
  }, [assignedTeachers]);

  const resolveClassIds = (ids) => {
    if (ids.includes("all")) return classes.map((c) => Number(c.id || c.class_id));
    return ids.map(Number).filter(Boolean);
  };

  // Classes are named like "DTE1A".."DTE1Z" for Year 1, "DTE2A".."DTE2Z"
  // for Year 2, etc. — the year of study is always the first digit in
  // the class name. Students.yearOfStudy already uses this same 1/2/3
  // scale, which is what actually decides who gets notified (see
  // toggleEAssessmentActive on the backend) — this parse is only used
  // here on the frontend to group classes for the picker.
  const parseClassYear = (name) => {
    const m = String(name || "").match(/\d/);
    return m ? Number(m[0]) : null;
  };

  const classesByYear = useMemo(() => {
    const map = { 1: [], 2: [], 3: [] };
    for (const c of classes) {
      const y = parseClassYear(c.class_name || c.name);
      if (map[y]) map[y].push(c);
    }
    return map;
  }, [classes]);

  // Resolves an AssessmentTargetSelect value — a mix of "year:1"/"year:2"/
  // "year:3" tokens (one assessment covering every class in that year)
  // and/or raw class-id strings (one assessment per specific class) —
  // into concrete { class_id, year_of_study, label } targets for
  // create/edit to loop over. A year token becomes ONE target (not one
  // per class in it): class_id is set to a representative class purely
  // so existing class_id-based display/joins keep working, while
  // year_of_study is what actually makes the backend treat it as
  // spanning the whole year.
  const resolveAssessmentTargets = (ids) => {
    const targets = [];
    for (const token of ids) {
      if (!token.startsWith("year:")) continue;
      const year = Number(token.split(":")[1]);
      const classesInYear = classesByYear[year] || [];
      if (!classesInYear.length) continue;
      const rep = classesInYear[0];
      targets.push({
        class_id: Number(rep.id || rep.class_id),
        year_of_study: year,
        label: `Year ${year} (${classesInYear.length} classes)`,
      });
    }
    for (const token of ids) {
      if (token.startsWith("year:")) continue;
      const id = Number(token);
      if (id) targets.push({ class_id: id, year_of_study: null, label: null });
    }
    return targets;
  };

  // Resolves the Subject(s) picker's value — a mix of the "all" token
  // and/or specific subject-name strings — down to a concrete list of
  // subject names to create the assessment for. "all" expands to every
  // known subject; anything else picked alongside it is redundant, so
  // it's deduped away.
  const resolveSubjects = (ids) => {
    if (ids.includes("all")) return subjects.map((s) => s.name || s.subject_name);
    return [...new Set(ids)];
  };

  // Builds the final assessment title by embedding the subject into
  // whatever the admin typed — e.g. typing "Endterm" with "English"
  // selected produces "English Endterm Assessment". Guards against
  // double-prefixing if the subject name is already typed in, and
  // against double-suffixing if "Assessment" is already there.
  const buildAssessmentTitle = (subject, rawTitle) => {
    const title = (rawTitle || "").trim();
    if (!subject) return title;
    let result = title.toLowerCase().startsWith(String(subject).toLowerCase())
      ? title
      : `${subject} ${title}`.trim();
    if (!result.toLowerCase().endsWith("assessment")) {
      result = `${result} Assessment`;
    }
    return result;
  };

  const createAssessment = async () => {
    const targets = resolveAssessmentTargets(form.class_ids);
    const subjectNames = resolveSubjects(form.subjects);
    if (!form.title || !subjectNames.length || !targets.length) {
      showToast("Please fill all required fields", "error"); return;
    }
    try {
      setSaving(true);
      // One assessment per (subject × target) combination — a "year"
      // target is ONE assessment covering every class in that year (via
      // year_of_study), not one per class, and each selected subject
      // gets its own copy of that same target so e.g. "All Subjects" +
      // "Year 1" creates one assessment per subject for that year.
      const combos = subjectNames.flatMap((subject) =>
        targets.map((target) => ({ subject, ...target }))
      );
      await Promise.all(combos.map(({ subject, class_id, year_of_study }) =>
        API.post("/e-assessments", {
          title:            buildAssessmentTitle(subject, form.title),
          subject,
          class_id,
          year_of_study,
          duration_minutes: Number(form.duration_minutes),
          instructions:     form.instructions,
          total_marks:      Number(form.total_marks) || 100,
          exam_password:    form.exam_password,
          questions_deadline: form.questions_deadline || null,
          question_setter_teacher_ids: form.question_setter_teacher_ids,
        })
      ));
      setForm(blank); setFormOpen(false);
      showToast(combos.length > 1 ? `Created ${combos.length} assessments` : "Assessment created successfully");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Create failed", "error");
    } finally { setSaving(false); }
  };

  const openEditModal = (a) => {
    setEditForm({
      id: a.id, title: a.title || "", subject: a.subject || "",
      class_ids: a.year_of_study ? [`year:${a.year_of_study}`] : a.class_id ? [String(a.class_id)] : [],
      duration_minutes: a.duration_minutes || 30,
      instructions: a.instructions || "", total_marks: a.total_marks || 100,
      exam_password: a.exam_password || "",
      questions_deadline: a.questions_deadline ? toDatetimeLocal(a.questions_deadline) : "",
      question_setter_teacher_ids: Array.isArray(a.question_setter_teacher_ids) ? a.question_setter_teacher_ids : [],
      cover_page_url: a.cover_page_url || "",
    });
    setEditOpen(true);
  };

  /* ── Cover page (per-exam PDF) — uploaded/replaced/removed
       independently of the rest of the edit form, since it's a file. ── */
  const [coverPageUploading, setCoverPageUploading] = useState(false);
  const uploadCoverPage = async (assessmentId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("cover_page", file);
    setCoverPageUploading(true);
    try {
      const res = await API.post(`/e-assessments/${assessmentId}/cover-page`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditForm((prev) => ({ ...prev, cover_page_url: res.data.cover_page_url }));
      showToast("Cover page uploaded");
    } catch (err) {
      showToast(err?.response?.data?.message || "Cover page upload failed", "error");
    } finally {
      setCoverPageUploading(false);
    }
  };
  const removeCoverPage = async (assessmentId) => {
    if (!window.confirm("Remove this exam's cover page?")) return;
    try {
      await API.delete(`/e-assessments/${assessmentId}/cover-page`);
      setEditForm((prev) => ({ ...prev, cover_page_url: "" }));
      showToast("Cover page removed");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove cover page", "error");
    }
  };

  const saveEditAssessment = async () => {
    const targets = resolveAssessmentTargets(editForm.class_ids);
    if (!editForm.title || !editForm.subject || !targets.length) {
      showToast("Please fill all required fields", "error"); return;
    }
    try {
      setSaving(true);
      // This assessment (editForm.id) is a single row, so picking more
      // than one target here can't turn it into one row — the first
      // target (a class, or a whole year) updates THIS assessment, and
      // any additional targets get a new copy of it instead.
      const [first, ...extra] = targets;
      const payload = {
        title:            editForm.title,
        subject:          editForm.subject,
        duration_minutes: Number(editForm.duration_minutes),
        instructions:     editForm.instructions,
        total_marks:      Number(editForm.total_marks) || 100,
        exam_password:    editForm.exam_password,
        questions_deadline: editForm.questions_deadline || null,
        question_setter_teacher_ids: editForm.question_setter_teacher_ids,
      };
      await API.put(`/e-assessments/${editForm.id}`, { ...payload, class_id: first.class_id, year_of_study: first.year_of_study });
      if (extra.length) {
        await Promise.all(extra.map(({ class_id, year_of_study }) =>
          API.post("/e-assessments", { ...payload, class_id, year_of_study })
        ));
      }
      setEditOpen(false);
      showToast(extra.length
        ? `Updated, and copied to ${extra.length} more target${extra.length > 1 ? "s" : ""}`
        : "Assessment updated successfully");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Update failed", "error");
    } finally { setSaving(false); }
  };

  // Start = make an assessment live for students: approve it first if it
  // hasn't been (an assessment awaiting review can't be started), then
  // flip active_status to Active — but only if it isn't Active already,
  // since the toggle endpoint flips whatever the CURRENT value is rather
  // than setting an explicit one, and calling it on an already-active
  // assessment would turn it back off.
  const startAssessment = async (a) => {
    try {
      if (String(a.status || "").toLowerCase() !== "approved") {
        await API.put(`/e-assessments/admin/${a.id}/review`, { status: "approved", admin_comment: "" });
      }
      if (a.active_status !== "Active") {
        await API.put(`/e-assessments/admin/${a.id}/toggle-active`);
      }
      showToast(`"${a.title}" started`);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to start assessment", "error");
    }
  };

  // Stop just closes the exam window (active_status -> Inactive) — it
  // deliberately does NOT reject the assessment, so Start can reopen it
  // later without needing another round of approval.
  const stopAssessment = async (a) => {
    try {
      if (a.active_status === "Active") {
        await API.put(`/e-assessments/admin/${a.id}/toggle-active`);
      }
      showToast(`"${a.title}" stopped`);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to stop assessment", "error");
    }
  };

  // Printable attendance register (school logo + header): students who did
  // this exam and those who didn't. Downloaded as a PDF.
  const [attendanceBusy, setAttendanceBusy] = useState(null);
  const downloadAttendance = async (a) => {
    if (attendanceBusy) return;
    try {
      setAttendanceBusy(a.id);
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
      const r = await API.get(`/e-assessments/admin/${a.id}/attendance-pdf`, { params: tz ? { tz } : {}, responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const link = document.createElement("a");
      const safe = String(a.title || "assessment").replace(/[^A-Za-z0-9 _.-]+/g, "_").trim().slice(0, 60) || "assessment";
      link.href = url; link.download = `Attendance - ${safe}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      showToast("Attendance PDF downloaded");
    } catch {
      showToast("Could not create the attendance PDF", "error");
    } finally { setAttendanceBusy(null); }
  };

  // "Who can sit & schedule": which trainees may sit this paper (default: all
  // active trainees in the class/year) plus an optional open/close date-time.
  const openAccess = async (a) => {
    setAccessModal({ a, loading: true, data: null });
    try {
      const res = await API.get(`/e-assessments/admin/${a.id}/access`);
      setAccessModal({ a, loading: false, data: res.data });
    } catch (err) {
      setAccessModal(null);
      showToast(err?.response?.data?.message || "Failed to load trainee access", "error");
    }
  };
  const saveAccess = async (a, payload) => {
    try {
      const res = await API.put(`/e-assessments/admin/${a.id}/access`, payload);
      setList((prev) => prev.map((x) => (x.id === a.id ? {
        ...x,
        restrict_students: res.data.restrict_students,
        available_from: res.data.available_from,
        available_until: res.data.available_until,
        allowed_count: res.data.allowed_count,
      } : x)));
      showToast(res.data?.message || "Saved");
      setAccessModal(null);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save", "error");
    }
  };

  // "Desktop only" switch — restricts the assessment to Windows/Mac laptops
  // & desktops (phones/tablets rejected). Sets an explicit on/off value, and
  // works at any time, including mid-exam: a phone already inside the exam is
  // kicked out on its next heartbeat (~10s). Applied optimistically so the
  // switch feels instant, rolled back if the server refuses.
  const toggleDesktopOnly = async (a) => {
    const next = !a.desktop_only;
    setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, desktop_only: next } : x)));
    try {
      const res = await API.put(`/e-assessments/admin/${a.id}/desktop-only`, { enabled: next });
      showToast(res.data?.message || (next ? "Desktop-only ON" : "Desktop-only OFF"));
    } catch (err) {
      setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, desktop_only: !next } : x)));
      showToast(err?.response?.data?.message || "Failed to change the device restriction", "error");
    }
  };

  // Per-assessment exam-security switches (camera, screen share, fullscreen,
  // violation lock-out). Missing/NULL = ON. Optimistic, rolled back on error.
  const toggleSecurity = async (a, key) => {
    const cur = a[key] == null ? true : !!a[key];
    const next = !cur;
    setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, [key]: next } : x)));
    try {
      await API.put(`/e-assessments/admin/${a.id}/security`, { [key]: next });
      showToast(next ? "Security feature turned ON" : "Security feature turned OFF for this assessment");
    } catch (err) {
      setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, [key]: cur } : x)));
      showToast(err?.response?.data?.message || "Failed to change the security setting", "error");
    }
  };

  // Safe Exam Browser: the on/off switch and/or the allowed Config/Browser Exam Keys.
  // Resolves true on success so the card can react (e.g. clear its "unsaved" hint).
  const saveSeb = async (a, payload) => {
    const prev = { require_seb: a.require_seb, seb_keys: a.seb_keys, seb_quit_password: a.seb_quit_password };
    if ("enabled" in payload) setList((p) => p.map((x) => (x.id === a.id ? { ...x, require_seb: payload.enabled } : x)));
    try {
      const res = await API.put(`/e-assessments/admin/${a.id}/seb`, payload);
      setList((p) => p.map((x) => (x.id === a.id ? { ...x, require_seb: res.data.require_seb, seb_keys: res.data.seb_keys, seb_quit_password: res.data.seb_quit_password } : x)));
      showToast(res.data?.message || "Saved");
      return true;
    } catch (err) {
      setList((p) => p.map((x) => (x.id === a.id ? { ...x, ...prev } : x)));
      showToast(err?.response?.data?.message || "Failed to save the Safe Exam Browser setting", "error");
      return false;
    }
  };

  // Safe Exam Browser: upload (or remove) a .seb file made in the SEB Config Tool.
  // Students then download THIS file instead of the automatically generated one.
  const uploadSebConfig = async (a, file) => {
    if (!file) return false;
    if (file.size > 1024 * 1024) { showToast("That file is too large to be a SEB configuration.", "error"); return false; }
    try {
      const data_base64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = () => reject(new Error("Could not read the file"));
        r.readAsDataURL(file);
      });
      const res = await API.put(`/e-assessments/admin/${a.id}/seb-config`, { file_name: file.name, data_base64 });
      setList((p) => p.map((x) => (x.id === a.id ? { ...x, seb_config_name: res.data.seb_config_name } : x)));
      showToast(res.data?.warning || res.data?.message || "Configuration saved", res.data?.warning ? "error" : undefined);
      return true;
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Failed to upload the SEB configuration", "error");
      return false;
    }
  };
  const removeSebConfig = async (a) => {
    try {
      const res = await API.delete(`/e-assessments/admin/${a.id}/seb-config`);
      setList((p) => p.map((x) => (x.id === a.id ? { ...x, seb_config_name: null } : x)));
      showToast(res.data?.message || "Removed");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove the SEB configuration", "error");
    }
  };

  // "Music paper" switch — identifies a paper whose answers need drawing
  // (staves, notes, rests). When ON, students get a button on each essay
  // question that unlocks the drawing pad. Optimistic, rolled back on failure.
  const toggleMusicPaper = async (a) => {
    const next = !a.music_paper;
    setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, music_paper: next } : x)));
    try {
      const res = await API.put(`/e-assessments/${a.id}/music-paper`, { enabled: next });
      showToast(res.data?.message || (next ? "Music paper ON" : "Music paper OFF"));
    } catch (err) {
      setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, music_paper: !next } : x)));
      showToast(err?.response?.data?.message || "Failed to change the music paper setting", "error");
    }
  };

  // "Art & Craft paper" switch — same as the music one, for papers whose
  // answers are drawn / coloured.
  const toggleArtPaper = async (a) => {
    const next = !a.art_paper;
    setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, art_paper: next } : x)));
    try {
      const res = await API.put(`/e-assessments/${a.id}/art-paper`, { enabled: next });
      showToast(res.data?.message || (next ? "Art & Craft paper ON" : "Art & Craft paper OFF"));
    } catch (err) {
      setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, art_paper: !next } : x)));
      showToast(err?.response?.data?.message || "Failed to change the art & craft paper setting", "error");
    }
  };

  // Typing helps in the student's essay box (auto capital letters / auto full
  // stop on Enter). Both are ON unless the column says otherwise (null/undefined = on).
  const toggleWritingAid = async (a, field) => {
    const next = a[field] === false || a[field] === 0 ? true : false;
    const label = field === "auto_capitalize" ? "Auto capital letters" : "Auto full stop";
    setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, [field]: next } : x)));
    try {
      await API.put(`/e-assessments/${a.id}/writing-aids`, { [field]: next });
      showToast(`${label} ${next ? "ON" : "OFF"}`);
    } catch (err) {
      setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, [field]: !next } : x)));
      showToast(err?.response?.data?.message || `Failed to change "${label}"`, "error");
    }
  };

  // Bulk version of Activate / Start / Stop — runs the same per-item logic
  // as startAssessment/stopAssessment above, but across every selected
  // assessment in one go, with a single summary toast at the end instead
  // of one toast per row. "Activate" only approves (moves it out of
  // pending review) without opening it to students yet; "Start" approves
  // AND opens it; "Stop" just closes the window, same as the single-item
  // action.
  const bulkAssessmentAction = async (ids, action) => {
    if (!ids.length) { showToast("Select at least one assessment", "error"); return; }
    const targets = list.filter((a) => ids.includes(a.id));
    const verb = { activate: "activated", start: "started", stop: "stopped" }[action] || "updated";
    try {
      setSaving(true);
      let ok = 0, fail = 0;
      for (const a of targets) {
        try {
          if (action === "activate" || action === "start") {
            if (String(a.status || "").toLowerCase() !== "approved") {
              await API.put(`/e-assessments/admin/${a.id}/review`, { status: "approved", admin_comment: "" });
            }
          }
          if (action === "start" && a.active_status !== "Active") {
            await API.put(`/e-assessments/admin/${a.id}/toggle-active`);
          }
          if (action === "stop" && a.active_status === "Active") {
            await API.put(`/e-assessments/admin/${a.id}/toggle-active`);
          }
          ok++;
        } catch { fail++; }
      }
      showToast(
        fail ? `${ok} ${verb}, ${fail} failed` : `${ok} assessment${ok !== 1 ? "s" : ""} ${verb}`,
        fail ? "error" : "success"
      );
      setSelAssessments([]);
      loadAll();
    } finally { setSaving(false); }
  };

  const openQuickStats = async (item) => {
    setSelected(item);
    if (!item.student_name && item.id) {
      try {
        const res = await API.get(`/e-assessments/admin/${item.id}/quick-stats`);
        setQuickStats(res?.data || null);
      } catch { setQuickStats(null); }
    } else {
      setQuickStats(null);
    }
  };

  const openPhotoModal = async (eAssessmentId, studentId, name) => {
    setPhotoModal({ name, loading: true, evidence: null, zoom: null });
    try {
      const res = await API.get(`/e-assessments/admin/student-photos/${eAssessmentId}/${studentId}`);
      setPhotoModal({ name, loading: false, evidence: res.data, zoom: null });
    } catch {
      setPhotoModal(null);
      showToast("Failed to load photos", "error");
    }
  };

  const openAnswerModal = async (sub) => {
    try {
      const res = await API.get(`/e-assessments/marking/submission/${sub.id}`);
      setAnswerModal({ sub, ...res.data });
    } catch { showToast("Failed to load answers", "error"); }
  };

  // Assign any number of teachers to any number of subjects across any number
  // of classes in one request (each list has a "Select all"). Existing
  // assignments are skipped by the server, so repeating it is harmless.
  const assignTeacher = async () => {
    const targetClassIds = resolveClassIds(assignForm.class_ids);
    if (!assignForm.teacher_ids.length || !assignForm.subject_ids.length || !targetClassIds.length) {
      showToast("Pick at least one teacher, one subject and one class", "error"); return;
    }
    try {
      setSaving(true);
      const res = await API.post("/e-assessments/admin/assign-teachers-bulk", {
        teacher_ids: assignForm.teacher_ids.map(Number),
        subject_ids: assignForm.subject_ids.map(Number),
        class_ids: targetClassIds,
      });
      setAssignForm({ teacher_ids: [], subject_ids: [], class_ids: [] });
      setAssignOpen(false);
      const { created = 0, skipped = 0 } = res.data || {};
      showToast(created
        ? `${created} assignment${created === 1 ? "" : "s"} created${skipped ? ` (${skipped} already existed)` : ""}`
        : "Nothing new: those assignments already exist");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Assignment failed", "error");
    } finally { setSaving(false); }
  };

  // "Distribute Equally" / "Auto-Assign All". The server decides how to split:
  // MORE TEACHERS THAN SUBMISSIONS -> the answered questions are counted and
  // shared out among all the teachers; otherwise whole submissions are shared
  // out. Every action is added to the history below, so it can be undone.
  const isUnassigned = (sub) => !sub.assigned_teacher_id && !(Number(sub.alloc_count) > 0);
  const teacherIdsForSubject = (subjectName) => [...new Set(
    assignedTeachers.filter((t) => String(t.subject_name) === String(subjectName)).map((t) => t.teacher_id)
  )]; // a teacher assigned to several classes still counts once

  const bulkAssignBySubject = async (subjectName) => {
    const unassigned = submissions.filter((sub) => String(sub.subject_name) === String(subjectName) && isUnassigned(sub));
    if (!unassigned.length) { showToast("No unassigned submissions for this subject", "error"); return; }
    const teacherIds = teacherIdsForSubject(subjectName);
    if (!teacherIds.length) { showToast("No teachers assigned to this subject yet", "error"); return; }
    try {
      setSaving(true);
      const res = await API.post("/e-assessments/admin/smart-distribute", {
        submission_ids: unassigned.map((x) => x.id),
        teacher_ids: teacherIds,
      });
      showToast(res.data?.message || "Distributed");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk assignment failed", "error");
    } finally { setSaving(false); }
  };

  // "Retrieve": take the still-unmarked work of a subject back from ONE teacher, SEVERAL teachers or ALL of them,
  // so it is unassigned again. Anything a teacher has already marked stays with them.
  const openRetrieve = (subjectName) => {
    const pending = submissions.filter((sub) => String(sub.subject_name) === String(subjectName) && !isUnassigned(sub) && !isMarkedState(sub));
    if (!pending.length) { showToast("No unmarked submissions are assigned to a teacher for this subject", "error"); return; }
    const teachers = groupTeachersWithClasses(assignedTeachers.filter((t) => String(t.subject_name) === String(subjectName)));
    // a teacher who still holds work here but is no longer assigned to the subject must be listed too
    pending.forEach((sub) => {
      if (sub.assigned_teacher_id && !teachers.some((g) => String(g.teacher_id) === String(sub.assigned_teacher_id))) {
        teachers.push({ teacher_id: sub.assigned_teacher_id, teacher_name: sub.assigned_teacher_name || `Teacher #${sub.assigned_teacher_id}`, classes: [] });
      }
    });
    const rows = teachers.map((g) => ({
      id: g.teacher_id, name: g.teacher_name, classes: g.classes,
      count: pending.filter((sub) =>
        String(sub.assigned_teacher_id) === String(g.teacher_id) ||
        (Number(sub.alloc_count) > 0 && String(sub.alloc_teachers || "").split(", ").includes(g.teacher_name))
      ).length,
    }));
    setRetrieveModal({ subjectName, rows, total: pending.length, picked: new Set(), all: true });
  };

  const confirmRetrieve = async () => {
    const m = retrieveModal;
    if (!m) return;
    const teacherIds = m.all ? [] : [...m.picked];
    if (!m.all && !teacherIds.length) { showToast("Pick at least one teacher", "error"); return; }
    try {
      setSaving(true);
      const res = await API.post("/e-assessments/admin/retrieve-submissions", { subject_name: m.subjectName, teacher_ids: teacherIds });
      showToast(res.data?.message || "Submissions retrieved");
      setRetrieveModal(null);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not retrieve the submissions", "error");
    } finally { setSaving(false); }
  };

  // "Allocate": give a chosen NUMBER of the subject's unassigned submissions to one teacher
  // (e.g. the 400 retrieved from teacher A -> teacher B). Optionally limited to one assessment.
  const unassignedPool = (subjectName, assessmentId) => submissions.filter((sub) =>
    String(sub.subject_name) === String(subjectName) && isUnassigned(sub) && !isMarkedState(sub) &&
    (!assessmentId || String(sub.e_assessment_id) === String(assessmentId)));

  const openAllocate = (subjectName) => {
    const pool = unassignedPool(subjectName);
    if (!pool.length) { showToast("No unassigned submissions for this subject — retrieve some first", "error"); return; }
    const teachers = groupTeachersWithClasses(assignedTeachers.filter((t) => String(t.subject_name) === String(subjectName)));
    if (!teachers.length) { showToast("No teachers assigned to this subject yet", "error"); return; }
    const byAssessment = {};
    pool.forEach((sub) => {
      const k = String(sub.e_assessment_id);
      (byAssessment[k] ||= { id: k, title: sub.assessment_title || `Assessment #${k}`, count: 0 }).count++;
    });
    setAllocateModal({ subjectName, teachers, assessments: Object.values(byAssessment), total: pool.length, teacherId: "", assessmentId: "", count: String(pool.length) });
  };

  const confirmAllocate = async () => {
    const m = allocateModal;
    if (!m) return;
    const available = unassignedPool(m.subjectName, m.assessmentId).length;
    const n = Math.min(Math.max(parseInt(m.count, 10) || 0, 0), available);
    if (!m.teacherId) { showToast("Choose a teacher", "error"); return; }
    if (!n) { showToast("Enter how many submissions to allocate", "error"); return; }
    try {
      setSaving(true);
      const res = await API.post("/e-assessments/admin/allocate-submissions", {
        teacher_id: Number(m.teacherId), subject_name: m.subjectName,
        assessment_id: m.assessmentId ? Number(m.assessmentId) : undefined, limit: n,
      });
      showToast(res.data?.message || "Submissions allocated");
      setAllocateModal(null);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not allocate the submissions", "error");
    } finally { setSaving(false); }
  };

  const bulkAssignAll = async () => {
    const groups = {};
    submissions.filter(isUnassigned).forEach((sub) => {
      const k = sub.subject_name || "unknown";
      (groups[k] ||= []).push(sub);
    });
    const keys = Object.keys(groups);
    if (!keys.length) { showToast("No unassigned submissions found", "error"); return; }
    try {
      setSaving(true);
      let byQuestion = 0, bySubmission = 0, skipped = 0;
      for (const subName of keys) {
        const tids = teacherIdsForSubject(subName);
        if (!tids.length) { skipped++; continue; }
        const res = await API.post("/e-assessments/admin/smart-distribute", {
          submission_ids: groups[subName].map((x) => x.id),
          teacher_ids: tids,
        });
        if (res.data?.mode === "question") byQuestion++; else bySubmission++;
      }
      showToast(`Done: ${bySubmission} subject(s) split by submission, ${byQuestion} by answered question${skipped ? `, ${skipped} skipped (no teachers assigned)` : ""}`);
      loadAll();
    } catch { showToast("Some assignments failed", "error"); }
    finally { setSaving(false); }
  };

  // Undo any earlier assignment / allocation (see AssignmentHistory below).
  const undoAssignment = async (batch) => {
    if (!window.confirm(`Undo this action?\n\n${batch.summary}\n\nWork a teacher has already marked is kept with them.`)) return;
    try {
      setSaving(true);
      const res = await API.post(`/e-assessments/admin/assignment-batches/${batch.id}/undo`);
      showToast(res.data?.message || "Undone");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not undo that action", "error");
    } finally { setSaving(false); }
  };

  const assignSubmissionToTeacher = async (submissionId, teacherId) => {
    try {
      setSaving(true);
      await API.post("/e-assessments/admin/assign-submission", { submissionId, teacherId });
      showToast("Submission assigned");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Assignment failed", "error");
    } finally { setSaving(false); }
  };

  const reviewRemarkRequest = async (remarkId, decision, comment = "") => {
    try {
      setSaving(true);
      await API.put(`/e-assessments/admin/remark-requests/${remarkId}/review`, {
        status: decision, admin_comment: comment,
      });
      setRemarkModal(null); setRemarkComment("");
      showToast(`Remark request ${decision}`);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Review failed", "error");
    } finally { setSaving(false); }
  };

  const releaseMarks = async (submissionId) => {
    try {
      setSaving(true);
      await API.put("/e-assessments/admin/release-marks", { submission_id: submissionId });
      setReleaseModal(null);
      showToast("Marks released to student records");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Release failed", "error");
    } finally { setSaving(false); }
  };

  const bulkReleaseMarks = async (subjectName) => {
    const ready = submissions.filter(
      (s) => String(s.subject_name) === String(subjectName) &&
             s.score != null && isMarkedState(s) && s.status !== "released"
    );
    if (!ready.length) { showToast("No marked submissions ready for release", "error"); return; }
    try {
      setSaving(true);
      const res = await API.put("/e-assessments/admin/bulk-release-marks", {
        submission_ids: ready.map((s) => s.id),
      });
      showToast(`${res?.data?.released_count ?? ready.length} submission(s) released`);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk release failed", "error");
    } finally { setSaving(false); }
  };

  const deleteAssessments = async (ids = []) => {
    if (!ids.length) { showToast("Select at least one assessment", "error"); return; }
    if (!window.confirm(`Delete ${ids.length} assessment(s)? This also removes their questions, student answers and marks, and cannot be undone. A paper scheduled in a Main Examination can only be deleted after its results are published.`)) return;
    try {
      setSaving(true);
      const res = await API.delete("/e-assessments/admin/delete-assessments", { data: { ids } });
      setSelAssessments([]);
      // The server says exactly what was deleted, what was refused (and why), and how many
      // Main Examination slots lost their paper.
      showToast(res.data?.message || `${ids.length} assessment(s) deleted`, res.data?.failed?.length ? "error" : undefined);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Delete failed", "error");
    } finally { setSaving(false); }
  };

  const deleteAssignments = async (ids = []) => {
    if (!ids.length) { showToast("Select at least one assignment", "error"); return; }
    if (!window.confirm(`Remove ${ids.length} assignment(s)?`)) return;
    try {
      setSaving(true);
      const res = await API.delete("/e-assessments/admin/delete-assignments", { data: { ids } });
      setSelAssignments([]);
      const back = Number(res.data?.unassigned_submissions || 0) + Number(res.data?.unassigned_answers || 0);
      showToast(`${ids.length} assignment(s) removed${back ? ` — ${res.data?.unassigned_submissions || 0} submission(s)${res.data?.unassigned_answers ? ` and ${res.data.unassigned_answers} answer(s)` : ""} went back to unassigned` : ""}`);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Delete failed", "error");
    } finally { setSaving(false); }
  };

  // Opens the resit dialog. `hasPrevious` = the student already has a
  // submission, so there is a score policy to choose; a student who never
  // submitted anything simply gets a first real attempt.
  const grantResit = (row, hasPrevious = true) => {
    setResitPolicy("replace");
    setResitModal({
      student_id: row.student_id,
      e_assessment_id: row.e_assessment_id,
      student_name: row.student_name || `Student #${row.student_id}`,
      assessment_title: row.assessment_title || `Assessment #${row.e_assessment_id}`,
      hasPrevious,
    });
  };

  const confirmResit = async () => {
    if (!resitModal) return;
    try {
      setSaving(true);
      await API.post("/e-assessments/admin/resit", {
        assessment_id: resitModal.e_assessment_id,
        student_id: resitModal.student_id,
        score_policy: resitModal.hasPrevious ? resitPolicy : "replace",
      });
      showToast(`Resit granted — ${resitModal.student_name} can now sign in and retake it`);
      setResitModal(null);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not grant resit", "error");
    } finally { setSaving(false); }
  };

  const resitKey = (r) => `${r.e_assessment_id}:${r.student_id}`;
  const resitEntry = (r, hasPrevious) => ({
    e_assessment_id: r.e_assessment_id, student_id: r.student_id,
    student_name: r.student_name || `Student #${r.student_id}`,
    assessment_title: r.assessment_title || `Assessment #${r.e_assessment_id}`,
    hasPrevious,
  });
  const toggleResitRow = (r, hasPrevious) => setResitSel((prev) => {
    const n = new Map(prev); const k = resitKey(r);
    n.has(k) ? n.delete(k) : n.set(k, resitEntry(r, hasPrevious));
    return n;
  });
  const setResitRows = (rows, hasPrevious, on) => setResitSel((prev) => {
    const n = new Map(prev);
    rows.forEach((r) => { on ? n.set(resitKey(r), resitEntry(r, hasPrevious)) : n.delete(resitKey(r)); });
    return n;
  });
  const openBulkResit = () => { setResitPolicy("replace"); setBulkResitOpen(true); };
  const confirmBulkResit = async () => {
    const items = [...resitSel.values()];
    if (!items.length) return;
    try {
      setSaving(true);
      const anyPrev = items.some((i) => i.hasPrevious);
      const { data } = await API.post("/e-assessments/admin/resit/bulk", {
        items: items.map((i) => ({ assessment_id: i.e_assessment_id, student_id: i.student_id })),
        score_policy: anyPrev ? resitPolicy : "replace",
      });
      const failed = data?.failed || [];
      showToast(data?.message || "Resits granted", failed.length && !data?.granted ? "error" : undefined);
      if (failed.length) {
        // leave the ones that could not be granted ticked so they can be looked at / retried
        const stuck = new Set(failed.map((f) => `${f.assessment_id}:${f.student_id}`));
        setResitSel((prev) => new Map([...prev].filter(([k]) => stuck.has(k))));
        window.alert(`${failed.length} could not be given a resit:\n\n` + failed.slice(0, 8)
          .map((f) => `• ${resitSel.get(`${f.assessment_id}:${f.student_id}`)?.student_name || `#${f.student_id}`}: ${f.message}`).join("\n")
          + (failed.length > 8 ? `\n…and ${failed.length - 8} more` : ""));
      } else {
        setResitSel(new Map());
      }
      setBulkResitOpen(false);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not grant the resits", "error");
    } finally { setSaving(false); }
  };

  const cancelResit = async (sess) => {
    if (!window.confirm("Cancel this resit? The student will keep their existing result.")) return;
    try {
      setSaving(true);
      await API.post("/e-assessments/admin/resit/cancel", {
        assessment_id: sess.e_assessment_id, student_id: sess.student_id,
      });
      showToast("Resit cancelled");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not cancel resit", "error");
    } finally { setSaving(false); }
  };

  const refreshExamSessions = async () => {
    try {
      const r = await API.get("/e-assessments/admin/exam-sessions");
      setExamSessions(extract(r));
    } catch { /* the 10s Device Locks poll will catch up */ }
  };

  const refreshUnsubmitted = async () => {
    try {
      const r = await API.get("/e-assessments/admin/exam-sessions/unsubmitted");
      setUnsubmitted(extract(r));
    } catch { /* the next full refresh will catch up */ }
  };

  const unlockSession = async (sessionId) => {
    try {
      setSaving(true);
      await API.put(`/e-assessments/admin/exam-sessions/${sessionId}/unlock`);
      showToast("Session unlocked — the student will see a Resume button on their screen");
      refreshExamSessions(); // just the sessions list — loadAll() re-pulls every heavy list and made the screen crawl
    } catch (err) {
      showToast(err?.response?.data?.message || "Unlock failed", "error");
    } finally { setSaving(false); }
  };

  // Unlock many locked sessions in one go (explicit list of session ids — what
  // is on screen after search/filter, or what the admin ticked).
  const bulkUnlock = async (sessionIds) => {
    if (!sessionIds.length) return;
    try {
      setSaving(true);
      const res = await API.put("/e-assessments/admin/exam-sessions/unlock-bulk", { sessionIds });
      showToast(res.data?.message || `${res.data?.unlocked ?? sessionIds.length} unlocked — students will see a Resume button`);
      refreshExamSessions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk unlock failed", "error");
    } finally { setSaving(false); }
  };

  // Live control: stop (pause) or submit a student's exam at any moment.
  const stopSession = async (sess) => {
    const who = sess.student_name || `student #${sess.student_id}`;
    if (!window.confirm(`Stop ${who}'s exam now?\n\nTheir screen locks within a few seconds. Nothing they typed is lost, and you can Unlock them later so they continue.`)) return;
    try {
      setSaving(true);
      const res = await API.put(`/e-assessments/admin/exam-sessions/${sess.id}/stop`);
      showToast(res.data?.message || "Exam stopped");
      refreshExamSessions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not stop the exam", "error");
    } finally { setSaving(false); }
  };

  const submitSession = async (sess) => {
    const who = sess.student_name || `student #${sess.student_id}`;
    if (!window.confirm(`Submit ${who}'s exam now?\n\nThis is final. Their last autosaved answers (saved about every 30 seconds) are submitted and the exam ends on their screen.`)) return;
    try {
      setSaving(true);
      const res = await API.post(`/e-assessments/admin/exam-sessions/${sess.id}/submit`);
      showToast(res.data?.message ? `Done — ${res.data.message}` : "Exam submitted");
      refreshExamSessions();
      refreshUnsubmitted();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not submit the exam", "error");
    } finally { setSaving(false); }
  };

  const bulkStop = async (sessionIds, label) => {
    if (!sessionIds.length) return;
    if (!window.confirm(`Stop ${label} (${sessionIds.length} exam${sessionIds.length === 1 ? "" : "s"})?\n\nEach student's screen locks within a few seconds. Nothing is lost, and you can Unlock them to continue.`)) return;
    try {
      setSaving(true);
      const res = await API.put("/e-assessments/admin/exam-sessions/stop-bulk", { sessionIds });
      showToast(res.data?.message || "Exams stopped");
      refreshExamSessions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk stop failed", "error");
    } finally { setSaving(false); }
  };

  const bulkSubmit = async (sessionIds, label) => {
    if (!sessionIds.length) return;
    if (!window.confirm(`Submit ${label} (${sessionIds.length} exam${sessionIds.length === 1 ? "" : "s"}) now?\n\nThis is final. Each student's last autosaved answers are submitted and their exam ends.`)) return;
    try {
      setSaving(true);
      const res = await API.post("/e-assessments/admin/exam-sessions/submit-bulk", { sessionIds });
      showToast(res.data?.message ? `Done — ${res.data.message}` : "Exams submitted");
      refreshExamSessions();
      refreshUnsubmitted();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk submit failed", "error");
    } finally { setSaving(false); }
  };

  // Allow / revoke one rejected phone-or-tablet for the Desktop-only switch.
  const changeDeviceAccess = async (row, allow) => {
    try {
      setSaving(true);
      const res = await API.put(`/e-assessments/admin/device-access/${row.id}/${allow ? "allow" : "revoke"}`);
      showToast(res.data?.message || (allow ? "Device allowed" : "Device blocked again"));
      setDeviceAccess((prev) => prev.map((d) => (d.id === row.id ? { ...d, status: allow ? "allowed" : "blocked" } : d)));
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not update the device", "error");
    } finally { setSaving(false); }
  };

  /* ── Grading System (Admin → E-Assessments → Grading System tab) ──
     Edits the shared bands every report screen (Reports, Teacher
     Reports, Student Report) reads via useGradingSystem(). */
  const updateGradeBand = (idx, field, value) => {
    setGradingDraft((d) => {
      const bands = [...(d.gradeBands || [])];
      bands[idx] = { ...bands[idx], [field]: value };
      return { ...d, gradeBands: bands };
    });
  };
  const addGradeBand = () => {
    setGradingDraft((d) => ({
      ...d,
      gradeBands: [...(d.gradeBands || []), { minScore: 0, grade: "", label: "", remark: "" }],
    }));
  };
  const removeGradeBand = (idx) => {
    setGradingDraft((d) => ({ ...d, gradeBands: (d.gradeBands || []).filter((_, i) => i !== idx) }));
  };

  const updateOverallBand = (idx, field, value) => {
    setGradingDraft((d) => {
      const bands = [...(d.overallBands || [])];
      bands[idx] = { ...bands[idx], [field]: value };
      return { ...d, overallBands: bands };
    });
  };
  const addOverallBand = () => {
    setGradingDraft((d) => ({
      ...d,
      overallBands: [...(d.overallBands || []), { minScore: 0, label: "" }],
    }));
  };
  const removeOverallBand = (idx) => {
    setGradingDraft((d) => ({ ...d, overallBands: (d.overallBands || []).filter((_, i) => i !== idx) }));
  };

  const resetGradingDraft = () => setGradingDraft(gradingSystem);

  const saveGradingSystem = async () => {
    if (!gradingDraft) return;
    const gradeBands = (gradingDraft.gradeBands || []).map((b) => ({
      minScore: Number(b.minScore), grade: b.grade, label: b.label, remark: b.remark,
    }));
    const overallBands = (gradingDraft.overallBands || []).map((b) => ({
      minScore: Number(b.minScore), label: b.label,
    }));
    if (gradeBands.some((b) => Number.isNaN(b.minScore) || !String(b.label || "").trim())) {
      showToast("Every grade band needs a minimum score and a label", "error");
      return;
    }
    if (overallBands.some((b) => Number.isNaN(b.minScore) || !String(b.label || "").trim())) {
      showToast("Every overall-result band needs a minimum score and a label", "error");
      return;
    }
    try {
      setGradingSaving(true);
      const res = await API.put("/e-assessments/admin/grading-system", {
        systemName: gradingDraft.systemName,
        passMark: gradingDraft.passMark,
        gradeBands,
        overallBands,
      });
      setGradingSystem(res.data);
      setGradingDraft(res.data);
      showToast("Grading system updated — every report screen will use it immediately");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save grading system", "error");
    } finally { setGradingSaving(false); }
  };

  const exportCSV = (rows, filename) => {
    if (!rows.length) { showToast("No data to export", "error"); return; }
    const keys  = Object.keys(rows[0]);
    const lines = [
      keys.join(","),
      ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  };

  /* ── Derived ── */
  const filtered = useMemo(() =>
    list.filter((a) => {
      const txt = search.toLowerCase();
      const ok  = String(a.title || "").toLowerCase().includes(txt) ||
                  String(a.subject || "").toLowerCase().includes(txt);
      const st  = !statusFilter || String(a.status || "").toLowerCase() === statusFilter;
      return ok && st;
    }), [list, search, statusFilter]);

  const submissionsBySubject = useMemo(() => {
    const map = {};
    submissions.forEach((s) => {
      const k = s.subject_name || "Unknown";
      if (!map[k]) map[k] = [];
      map[k].push(s);
    });
    return map;
  }, [submissions]);

  const stats = useMemo(() => ({
    total:    list.length,
    approved: list.filter((x) => String(x.status || "").toLowerCase() === "approved").length,
    pending:  list.filter((x) => String(x.status || "").toLowerCase() === "pending").length,
    rejected: list.filter((x) => String(x.status || "").toLowerCase() === "rejected").length,
  }), [list]);

  const subStats = useMemo(() => ({
    total:      submissions.length,
    unassigned: submissions.filter((s) => !s.assigned_teacher_id && !(Number(s.alloc_count) > 0)).length,
    marked:     submissions.filter(isMarkedState).length,
    released:   submissions.filter((s) => s.status === "released").length,
  }), [submissions]);

  const pendingRemarks = remarkRequests.filter(
    (r) => r.remark_status === "pending" || r.remark_requested === 1
  ).length;

  const lockedSessions = examSessions.filter((s) => s.status === "locked").length;

  // Select-all state for the Assessments grid: "all" means every row
  // currently visible under the search/status filters is selected, so
  // toggling it re-checks against `filtered`, not the full unfiltered list.
  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selAssessments.includes(a.id));
  const someFilteredSelected = filtered.some((a) => selAssessments.includes(a.id));
  const toggleSelectAllFiltered = () => {
    setSelAssessments(allFilteredSelected ? [] : filtered.map((a) => a.id));
  };

  const sx = s(C);

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="dash-main" style={{ ...sx.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20 }} data-theme={theme}>
      <style>{globalStyles}</style>
      <div className="dash-spin" style={sx.spinner} />
      <p style={{ color: C.textSec, fontSize: 14 }}>Loading assessment dashboard…</p>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="dash-main" style={sx.page} data-theme={theme}>
      <style>{globalStyles}</style>

      {/* Toast notification */}
      {toast && (
        <div style={{ ...sx.toast, borderColor: toast.type === "error" ? C.danger : C.success }}>
          {toast.type === "error" ? <IconX size={16} style={{ color: C.danger }} /> : <IconCheck size={16} style={{ color: C.success }} />}
          <span style={{ color: C.textPri, fontSize: 14 }}>{toast.msg}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={sx.header}>
        <div>
          <button style={sx.backBtn} className="dash-icon-btn" onClick={() => navigate(-1)}>
            <IconArrowLeft size={14} /> Back
          </button>
          <h1 style={sx.pageTitle}>E-Assessment Administration</h1>
          <p style={sx.pageSub}>Manage assessments, submissions, marking workflow, and mark release</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {/* Main Examinations (§3) — scheduled/timetabled exam events
              built on top of these same assessments, in a separate
              dashboard at /main-exams. */}
           <ActionButton primary icon={<IconPlus size={14} />} onClick={() => setFormOpen(true)}>New Assessment</ActionButton>   
          <ActionButton icon={<IconClipboardList size={14} />} onClick={() => navigate("/main-exams")}>Main Examinations</ActionButton>
          
          <ActionButton icon={<IconAward size={14} />} onClick={() => setReportCardOpen(true)}>Report Card Marks</ActionButton>
          <ActionButton icon={<IconUserPlus size={14} />} onClick={() => setAssignOpen(true)}>Assign Teacher</ActionButton>
          <ActionButton icon={<IconDownload size={14} />} onClick={() => exportCSV(list, "assessments.csv")}>Export</ActionButton>
          <button style={sx.iconBtn} className="dash-icon-btn" onClick={loadAll} title="Refresh data"><IconRefresh size={15} /></button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={sx.tabBar}>
        {TABS.map((t, i) => (
          <button key={t.label} style={{ ...sx.tab, ...(activeTab === i ? sx.tabActive : {}) }} onClick={() => setActiveTab(i)}>
            <t.icon size={15} />
            {t.label}
            {i === 1 && subStats.unassigned > 0 && <NotifPill n={subStats.unassigned} tone="warning" />}
            {i === 2 && pendingRemarks > 0        && <NotifPill n={pendingRemarks}        tone="accent" />}
            {i === 4 && (lockedSessions + deviceAccess.filter((d) => d.status === "blocked").length) > 0 && <NotifPill n={lockedSessions + deviceAccess.filter((d) => d.status === "blocked").length} tone="danger" />}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          TAB 0 — ASSESSMENTS
      ════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          <div style={sx.filterRow}>
            <div style={sx.searchWrap}>
              <IconSearch size={15} style={{ position: "absolute", left: 12, color: C.textMuted }} />
              <input
                placeholder="Search title or subject…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={sx.searchInput}
              />
              {search && (
                <button style={sx.clearBtn} onClick={() => setSearch("")}><IconX size={13} /></button>
              )}
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={sx.select}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div style={{ position: "relative" }}>
              <button style={sx.bulkBtn} onClick={() => setBulkMenu(!bulkMenu)}>
                Bulk Actions <IconChevronDown size={13} />
              </button>
              {bulkMenu && (
                <div style={sx.dropdown} onMouseLeave={() => setBulkMenu(false)}>
                  <DropItem icon={<IconCheck size={14} />} onClick={() => { setBulkMenu(false); toggleSelectAllFiltered(); }}>
                    {allFilteredSelected ? "Clear selection" : `Select all ${filtered.length} filtered`}
                  </DropItem>
                  <DropDivider />
                  <DropItem
                    icon={<IconCheck size={14} />}
                    disabled={!selAssessments.length}
                    onClick={() => { setBulkMenu(false); bulkAssessmentAction(selAssessments, "activate"); }}
                  >
                    Activate {selAssessments.length} assessment{selAssessments.length !== 1 ? "s" : ""}
                  </DropItem>
                  <DropItem
                    tone="success"
                    icon={<IconRocket size={14} />}
                    disabled={!selAssessments.length}
                    onClick={() => { setBulkMenu(false); bulkAssessmentAction(selAssessments, "start"); }}
                  >
                    Start {selAssessments.length} assessment{selAssessments.length !== 1 ? "s" : ""}
                  </DropItem>
                  <DropItem
                    tone="danger"
                    icon={<IconX size={14} />}
                    disabled={!selAssessments.length}
                    onClick={() => { setBulkMenu(false); bulkAssessmentAction(selAssessments, "stop"); }}
                  >
                    Stop {selAssessments.length} assessment{selAssessments.length !== 1 ? "s" : ""}
                  </DropItem>
                  <DropDivider />
                  <DropItem icon={<IconTrash size={14} />} disabled={!selAssessments.length} onClick={() => { setBulkMenu(false); deleteAssessments(selAssessments); }}>
                    Delete {selAssessments.length} assessment{selAssessments.length !== 1 ? "s" : ""}
                  </DropItem>
                  <DropItem icon={<IconTrash size={14} />} disabled={!selAssignments.length} onClick={() => { setBulkMenu(false); deleteAssignments(selAssignments); }}>
                    Remove {selAssignments.length} assignment{selAssignments.length !== 1 ? "s" : ""}
                  </DropItem>
                  <DropItem icon={<IconDownload size={14} />} onClick={() => { setBulkMenu(false); exportCSV(filtered, "filtered-assessments.csv"); }}>
                    Export filtered list
                  </DropItem>
                </div>
              )}
            </div>
          </div>

          <div style={sx.statsGrid}>
            <StatCard label="Total"    value={stats.total}    icon={<IconClipboardList size={18} />} />
            <StatCard label="Approved" value={stats.approved} icon={<IconCheck size={18} />} tone="success" />
            <StatCard label="Pending"  value={stats.pending}  icon={<IconClock size={18} />} tone="warning" />
            <StatCard label="Rejected" value={stats.rejected} icon={<IconX size={18} />} tone="danger" />
          </div>

          <SectionHeader title="Assigned Teachers" />
          {assignedTeachers.length === 0 ? (
            <EmptyState icon={<IconUsers size={26} />} text="No teacher assignments yet. Use 'Assign Teacher' above." />
          ) : (
            <div style={sx.assignGrid}>
              {teacherCards.map((t) => {
                const ids = t.subjects.flatMap((sub) => sub.classes.map((c) => c.id));
                const allSel = ids.length > 0 && ids.every((i) => selAssignments.includes(i));
                return (
                  <div key={t.teacher_id} className="dash-card" style={sx.assignCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: C.textPri, fontSize: 15 }}>{t.teacher_name}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>
                          {t.subjects.length} subject{t.subjects.length === 1 ? "" : "s"} · {ids.length} class assignment{ids.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={allSel}
                        title="Select all of this teacher's assignments"
                        onChange={() => setSelAssignments((p) => allSel ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])])}
                        style={{ accentColor: C.accent, cursor: "pointer", width: 15, height: 15, flexShrink: 0 }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                      {t.subjects.map((sub) => (
                        <div key={sub.subject_name}>
                          <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: C.textSec }}>{sub.subject_name}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {sub.classes.map((c) => (
                              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 4px 3px 9px", borderRadius: 12, background: C.bgAlt, color: C.textPri, border: `1px solid ${C.border}` }}>
                                {c.name}
                                <button type="button" title={`Remove ${t.teacher_name} from ${sub.subject_name} · ${c.name}`} onClick={() => deleteAssignments([c.id])}
                                  style={{ border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 4px" }}>×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <MiniBtn tone="danger" icon={<IconTrash size={12} />} onClick={() => deleteAssignments(ids)} style={{ marginTop: 14 }}>
                      Remove all
                    </MiniBtn>
                  </div>
                );
              })}
            </div>
          )}

          <AssignmentHistory batches={assignBatches} saving={saving} onUndo={undoAssignment} />

          <SectionHeader
            title={`Assessments (${filtered.length})`}
            right={filtered.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: C.textMuted, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected; }}
                    onChange={toggleSelectAllFiltered}
                    style={{ accentColor: C.accent, cursor: "pointer", width: 14, height: 14 }}
                  />
                  Select all
                </label>
                {selAssessments.length > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{selAssessments.length} selected</span>
                    <MiniBtn icon={<IconCheck size={12} />} onClick={() => bulkAssessmentAction(selAssessments, "activate")}>Activate</MiniBtn>
                    <MiniBtn tone="success" icon={<IconRocket size={12} />} onClick={() => bulkAssessmentAction(selAssessments, "start")}>Start</MiniBtn>
                    <MiniBtn tone="danger" icon={<IconX size={12} />} onClick={() => bulkAssessmentAction(selAssessments, "stop")}>Stop</MiniBtn>
                    <MiniBtn tone="danger" icon={<IconTrash size={12} />} onClick={() => deleteAssessments(selAssessments)}>Delete</MiniBtn>
                  </>
                )}
              </div>
            )}
          />
          {filtered.length === 0 ? (
            <EmptyState icon={<IconInbox size={26} />} text="No assessments match your filters." />
          ) : (
            <div style={sx.cardGrid}>
              {filtered.map((a) => (
                <AssessmentCard
                  key={a.id}
                  a={a}
                  selected={selAssessments.includes(a.id)}
                  onSelect={() => setSelAssessments((p) =>
                    p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]
                  )}
                  onStart={() => startAssessment(a)}
                  onStop={() => stopAssessment(a)}
                  onAccess={() => openAccess(a)}
                  onToggleDesktop={() => toggleDesktopOnly(a)}
                  onToggleMusic={() => toggleMusicPaper(a)}
                  onToggleArt={() => toggleArtPaper(a)}
                  onToggleWritingAid={(field) => toggleWritingAid(a, field)}
                  onToggleSecurity={(key) => toggleSecurity(a, key)}
                  onSaveSeb={(payload) => saveSeb(a, payload)}
                  onUploadSebConfig={(file) => uploadSebConfig(a, file)}
                  onRemoveSebConfig={() => removeSebConfig(a)}
                  onStats={() => openQuickStats(a)}
                  onAttendance={() => downloadAttendance(a)}
                  attendanceBusy={attendanceBusy === a.id}
                  onEdit={() => openEditModal(a)}
                  onDelete={() => deleteAssessments([a.id])}
                  onAddQuestions={() => navigate(`/admin-e-assessments/${a.id}/questions`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 1 — SUBMISSIONS
      ════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <>
          <div style={sx.statsGrid}>
            <StatCard label="Total"      value={subStats.total}      icon={<IconClipboardList size={18} />} />
            <StatCard label="Unassigned" value={subStats.unassigned} icon={<IconAlert size={18} />} tone="warning" />
            <StatCard label="Marked"     value={subStats.marked}     icon={<IconCheck size={18} />} tone="success" />
            <StatCard label="Released"   value={subStats.released}   icon={<IconTrendUp size={18} />} />
          </div>

          <AssignmentHistory batches={assignBatches} saving={saving} onUndo={undoAssignment} />

          <div style={{ ...sx.filterRow, marginBottom: 28 }}>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} style={sx.select}>
              <option value="">All Subjects</option>
              {Object.keys(submissionsBySubject).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            <select value={markFilter} onChange={(e) => setMarkFilter(e.target.value)} style={sx.select} aria-label="Filter by marking status">
              <option value="">All marking states</option>
              <option value="awaiting">Awaiting marking</option>
              <option value="marked">Marked by teacher</option>
              <option value="auto">Auto-marked (MCQ only)</option>
              <option value="released">Released</option>
            </select>

            {subjectFilter ? (
              <>
                <ActionButton icon={<IconZap size={14} />} onClick={() => bulkAssignBySubject(subjectFilter)}>Distribute Equally</ActionButton>
                <ActionButton icon={<IconRocket size={14} />} onClick={() => bulkReleaseMarks(subjectFilter)}>Bulk Release</ActionButton>
              </>
            ) : (
              <ActionButton icon={<IconZap size={14} />} onClick={bulkAssignAll}>Auto-Assign All</ActionButton>
            )}

            <ActionButton icon={<IconUsers size={14} />} onClick={() => setSplitFor({ assessmentId: "" })}>Split marking</ActionButton>

            <ActionButton icon={<IconDownload size={14} />} onClick={() => exportCSV(
              submissions.map((s) => ({
                student: s.student_name, assessment: s.assessment_title,
                subject: s.subject_name, score: s.score, total: s.total_marks,
                status: s.status, marking: markState(s), essays_left: s.pending_essay_count ?? "", submitted: s.submitted_at,
              })), "submissions.csv"
            )}>Export CSV</ActionButton>
          </div>

          {resitSel.size > 0 && <ResitSelectionBar count={resitSel.size} onAllow={openBulkResit} onClear={() => setResitSel(new Map())} />}

          <div style={{ marginBottom: 20 }}>
            <input
              type="search" value={subSearch} onChange={(e) => setSubSearch(e.target.value)}
              placeholder="Search a student, assessment or subject to see individual records…"
              aria-label="Search submissions"
              style={{ ...sx.select, width: "100%", boxSizing: "border-box", padding: "10px 12px" }}
            />
            {!subSearch.trim() && (
              <p style={{ margin: "8px 2px 0", fontSize: 12, color: C.textMuted }}>
                Records aren't listed until you search — the cards show each subject's totals and its bulk actions.
              </p>
            )}
          </div>

          {Object.keys(submissionsBySubject).length === 0 ? (
            <EmptyState icon={<IconFileText size={26} />} text="No submissions found." />
          ) : !subSearch.trim() ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
              {Object.entries(submissionsBySubject)
                .filter(([sName]) => !subjectFilter || sName === subjectFilter)
                .map(([subjectName, subs]) => {
                  const subjectTeachers = assignedTeachers.filter((t) => String(t.subject_name) === String(subjectName));
                  const markedCount   = subs.filter(isMarkedState).length;
                  const releasedCount = subs.filter((s) => s.status === "released").length;
                  const unassigned    = subs.filter((s) => !s.assigned_teacher_id && !(Number(s.alloc_count) > 0)).length;
                  return (
                    <div key={subjectName} className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, minWidth: 0, overflow: "hidden" }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textPri }}>{subjectName}</p>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color: STAT_COLORS.submitted }}>{subs.length}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: STAT_COLORS.submitted }}>submitted</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
                        <StatPill kind="marked" count={markedCount} />
                        <StatPill kind="released" count={releasedCount} />
                        <StatPill kind="assigned" count={subs.length - unassigned} />
                        <StatPill kind="unassigned" count={unassigned} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
                        {subjectTeachers.length > 0
                          ? groupTeachersWithClasses(subjectTeachers).map((g) => <Chip key={g.teacher_id} wrap icon={<IconUsers size={11} />} text={teacherChipText(g)} tone="success" />)
                          : <Chip icon={<IconAlert size={11} />} text="No teacher assigned" tone="danger" />}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                        <MiniBtn tone="warning" icon={<IconZap size={12} />} onClick={() => bulkAssignBySubject(subjectName)}>Distribute</MiniBtn>
                        <MiniBtn onClick={() => bulkReleaseMarks(subjectName)} icon={<IconRocket size={12} />}>Release All</MiniBtn>
                        <MiniBtn tone="danger" onClick={() => openRetrieve(subjectName)} icon={<IconRefresh size={12} />} title="Take unmarked submissions back from one, several or all teachers so they are unassigned again">Retrieve</MiniBtn>
                        <MiniBtn tone="success" onClick={() => openAllocate(subjectName)} icon={<IconUsers size={12} />} title="Give a number of unassigned submissions to one teacher">Allocate</MiniBtn>
                        <MiniBtn icon={<IconUsers size={12} />} title="Give different parts of this paper to different teachers" onClick={() => setSplitFor({ assessmentId: String(subs[0]?.e_assessment_id || "") })}>Split marking</MiniBtn>
                        <MiniBtn neutral onClick={() => setSubSearch(subjectName)}>View records</MiniBtn>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            Object.entries(submissionsBySubject)
              .filter(([sName]) => !subjectFilter || sName === subjectFilter)
              .map(([sName, allSubs]) => {
                const words = subSearch.trim().toLowerCase().split(/\s+/);
                const subs = allSubs.filter((x) => {
                  if (markFilter && markState(x) !== markFilter) return false;
                  const hay = [x.student_name, x.student_id, x.assessment_title, sName, x.status].join(" ").toLowerCase();
                  return words.every((w) => hay.includes(w));
                });
                return [sName, subs, allSubs.length];
              })
              .filter(([, subs]) => subs.length > 0)
              .slice(0, 50)
              .map(([subjectName, subs]) => {
                const subjectTeachers = assignedTeachers.filter(
                  (t) => String(t.subject_name) === String(subjectName)
                );
                const markedCount   = subs.filter(isMarkedState).length;
                const releasedCount = subs.filter((s) => s.status === "released").length;

                return (
                  <div key={subjectName} className="dash-card" style={sx.subjectBlock}>
                    <div style={sx.subjectHead}>
                      <div>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri }}>{subjectName}</p>
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <StatPill kind="submitted" count={subs.length} />
                          <StatPill kind="marked" count={markedCount} />
                          <StatPill kind="released" count={releasedCount} />
                          <StatPill kind="assigned" count={subs.length - subs.filter((s) => !s.assigned_teacher_id && !(Number(s.alloc_count) > 0)).length} />
                          <StatPill kind="unassigned" count={subs.filter((s) => !s.assigned_teacher_id && !(Number(s.alloc_count) > 0)).length} />
                          {subjectTeachers.length > 0
                            ? groupTeachersWithClasses(subjectTeachers).map((g) => <Chip key={g.teacher_id} wrap icon={<IconUsers size={11} />} text={teacherChipText(g)} tone="success" />)
                            : <Chip icon={<IconAlert size={11} />} text="No teacher assigned" tone="danger" />}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <MiniBtn tone="warning" icon={<IconZap size={12} />} onClick={() => bulkAssignBySubject(subjectName)}>Distribute</MiniBtn>
                        <MiniBtn onClick={() => bulkReleaseMarks(subjectName)} icon={<IconRocket size={12} />}>Release All</MiniBtn>
                        <MiniBtn tone="danger" onClick={() => openRetrieve(subjectName)} icon={<IconRefresh size={12} />} title="Take unmarked submissions back from one, several or all teachers so they are unassigned again">Retrieve</MiniBtn>
                        <MiniBtn tone="success" onClick={() => openAllocate(subjectName)} icon={<IconUsers size={12} />} title="Give a number of unassigned submissions to one teacher">Allocate</MiniBtn>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={sx.table}>
                        <thead>
                          <tr>
                            <Th>
                              <input type="checkbox" aria-label="Select all shown for resit"
                                checked={subs.slice(0, 100).length > 0 && subs.slice(0, 100).every((x) => resitSel.has(resitKey(x)))}
                                onChange={(e) => setResitRows(subs.slice(0, 100), true, e.target.checked)} />
                            </Th>
                            {["Student","Assessment","Submitted","Assigned To","Mark","Grade","Status","Actions"].map((h) => <Th key={h}>{h}</Th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {subs.slice(0, 100).map((sub) => (
                            <tr key={sub.id} className="row-hover">
                              <Td><input type="checkbox" checked={resitSel.has(resitKey(sub))} onChange={() => toggleResitRow(sub, true)} aria-label={`Select ${sub.student_name || sub.student_id} for resit`} /></Td>
                              <Td><span style={{ fontWeight: 600, color: C.textPri }}>{sub.student_name || `#${sub.student_id}`}</span></Td>
                              <Td style={{ color: C.textSec, fontSize: 13 }}>{sub.assessment_title || "—"}</Td>
                              <Td style={{ color: C.textMuted, fontSize: 12 }}>{fmtDate(sub.submitted_at)}</Td>
                              <Td>
                                {sub.assigned_teacher_id
                                  ? <Chip text={sub.assigned_teacher_name || `#${sub.assigned_teacher_id}`} tone="success" />
                                  : Number(sub.alloc_count) > 0
                                    ? <Chip text={`By question: ${sub.alloc_teachers || "several teachers"}`} tone="success" />
                                    : <Chip text="Unassigned" tone="danger" />}
                              </Td>
                              <Td>{sub.score != null ? <ScoreBadge score={sub.score} total={sub.total_marks || 100} /> : <span style={{ color: C.textMuted }}>—</span>}</Td>
                              <Td>{sub.score != null ? <GradeBadge grade={computeGrade(sub.score, sub.total_marks, gradingSystem)} /> : <span style={{ color: C.textMuted }}>—</span>}</Td>
                              <Td><MarkPill sub={sub} /></Td>
                              <Td>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  {!sub.assigned_teacher_id && !(Number(sub.alloc_count) > 0) && subjectTeachers.length > 0 && (
                                    <select
                                      style={{ ...sx.select, padding: "5px 8px", fontSize: 12 }}
                                      defaultValue=""
                                      onChange={(e) => { if (e.target.value) assignSubmissionToTeacher(sub.id, e.target.value); }}
                                    >
                                      <option value="">Assign…</option>
                                      {groupTeachersWithClasses(subjectTeachers).map((t) => (
                                        <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>
                                      ))}
                                    </select>
                                  )}
                                  {isMarkedState(sub) && sub.status !== "released" && (
                                    <MiniBtn onClick={() => setReleaseModal(sub)} icon={<IconRocket size={12} />}>Release</MiniBtn>
                                  )}
                                  <MiniBtn tone="warning" onClick={() => grantResit(sub)} icon={<IconZap size={12} />} title="Give this student another attempt">Allow resit</MiniBtn>
                                  <MiniBtn onClick={() => openAnswerModal(sub)} icon={<IconFileText size={12} />}>Answers</MiniBtn>
                                  <MiniBtn onClick={() => openPhotoModal(sub.e_assessment_id, sub.student_id, sub.student_name)} icon={<Camera size={12} />} title="Camera photos taken during the exam">Photos{sub.photo_count ? ` (${sub.photo_count})` : ""}</MiniBtn>
                                  <MiniBtn onClick={() => openQuickStats(sub)} neutral>View</MiniBtn>
                                </div>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {subs.length > 100 && <p style={{ margin: 10, fontSize: 12, color: C.textMuted }}>Showing the first 100 of {subs.length} — narrow the search to see the rest.</p>}
                    </div>
                  </div>
                );
              })
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 2 — REMARK REQUESTS
      ════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <>
          <div style={sx.tabTopRow}>
            <div>
              <h2 style={sx.tabTitle}>Marking</h2>
              <p style={sx.tabSub}>Teacher marking progress, speed ranking and student remark requests</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[["leaderboard", "Leaderboard & Load"], ["option", "Marking Option"], ["deadline", "Deadline"], ["suggested", "Suggested Remarks"], ["remarks", `Remark Requests${pendingRemarks ? ` (${pendingRemarks})` : ""}`]].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMarkingView(k)}
                style={{ padding: "8px 14px", borderRadius: 99, cursor: "pointer", fontWeight: 600, fontSize: 13,
                  border: `1px solid ${C.border}`, background: markingView === k ? C.accent : C.card, color: markingView === k ? "#fff" : C.textPri }}>{label}</button>
            ))}
          </div>

          {markingView === "leaderboard" && <MarkingLeaderboard />}
          {markingView === "option" && <MarkingOptionPanel teachers={teachers} showToast={showToast} />}
          {markingView === "deadline" && <MarkingDeadlinePanel showToast={showToast} C={C} />}
          {markingView === "suggested" && <SuggestedRemarksPanel showToast={showToast} />}

          {markingView === "remarks" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <ActionButton icon={<IconDownload size={14} />} onClick={() => exportCSV(
                remarkRequests.map((r) => ({
                  student: r.student_name, assessment: r.assessment_title,
                  subject: r.subject_name, score: r.score, status: r.remark_status,
                  reason: r.remark_reason, submitted: r.submitted_at,
                })), "remark-requests.csv"
              )}>Export CSV</ActionButton>
              <ActionButton icon={<IconDownload size={14} />} onClick={() => downloadTablesPdf({
                title: "Remark Requests", subtitle: `${remarkRequests.length} request(s)`, filename: "remark-requests",
                sections: [{ head: ["Student", "Assessment", "Subject", "Assigned to", "Score", "Status", "Reason", "Submitted"],
                  body: remarkRequests.map((r) => [r.student_name || `#${r.student_id}`, r.assessment_title || "", r.subject_name || "",
                    r.teacher_name || "Unassigned", r.score ?? "—", r.remark_status || "pending", r.remark_reason || "", fmtDate(r.submitted_at)]) }],
              })}>Download PDF</ActionButton>
            </div>
          )}

          {markingView !== "remarks" ? null : remarkRequests.length === 0 ? (
            <EmptyState icon={<IconCheckCircle size={26} />} text="No remark requests at this time." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {remarkRequests.map((r) => (
                <div key={r.id} className="dash-card" style={sx.remarkCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: C.textPri, fontSize: 16 }}>
                        {r.student_name || `Student #${r.student_id}`}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>
                        {r.assessment_title} · {r.subject_name}
                      </p>
                    </div>
                    <RemarkBadge status={r.remark_status} />
                  </div>

                  <div style={sx.metaGrid}>
                    <MetaRow label="Assigned To"  value={r.teacher_name || "Unassigned"} />
                    <MetaRow label="Current Mark" value={r.score != null ? `${r.score}/${r.total_marks || 100}` : "—"} />
                    <MetaRow label="Grade"        value={computeGrade(r.score, r.total_marks, gradingSystem)} />
                    <MetaRow label="Submitted"    value={fmtDate(r.submitted_at)} />
                  </div>

                  {r.remark_reason && (
                    <div style={sx.reasonBox}><strong>Student reason: </strong>{r.remark_reason}</div>
                  )}
                  {r.admin_comment && (
                    <div style={sx.commentBox}><strong>Admin comment: </strong>{r.admin_comment}</div>
                  )}

                  {(r.remark_status === "pending" || r.remark_status == null) ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                      <MiniBtn tone="success" grow icon={<IconCheck size={13} />} onClick={() => reviewRemarkRequest(r.id, "approved")}>Approve</MiniBtn>
                      <MiniBtn tone="danger"  grow icon={<IconX size={13} />}     onClick={() => reviewRemarkRequest(r.id, "rejected")}>Reject</MiniBtn>
                      <MiniBtn tone="warning" grow icon={<IconRefresh size={13} />} onClick={() => reviewRemarkRequest(r.id, "revision")}>Request Revision</MiniBtn>
                      <MiniBtn grow icon={<IconMessage size={13} />} onClick={() => { setRemarkModal(r); setRemarkComment(""); }}>Comment &amp; Decide</MiniBtn>
                    </div>
                  ) : (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                        Reviewed {r.reviewed_at ? `on ${r.reviewed_at}` : ""} · Status: <strong style={{ color: C.textPri }}>{r.remark_status}</strong>
                      </p>
                      <MiniBtn neutral icon={<IconRefresh size={12} />} onClick={() => reviewRemarkRequest(r.id, "pending")} style={{ marginTop: 10 }}>Reopen</MiniBtn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 3 — RELEASED MARKS
      ════════════════════════════════════════════ */}
      {activeTab === 3 && (
        <>
          <div style={sx.tabTopRow}>
            <div>
              <h2 style={sx.tabTitle}>Released Marks</h2>
              <p style={sx.tabSub}>Marks published to student academic records</p>
            </div>
            <ActionButton icon={<IconDownload size={14} />} onClick={() => exportCSV(
              releasedMarks.map((m) => {
                const info = markInfo(m, gradingSystem);
                return {
                  student: m.student_name, assessment: m.assessment_title,
                  subject: m.subject_name, score: m.score, total: info.total,
                  percentage: info.pct != null ? fmt2(info.pct) : "",
                  grade: info.g?.grade ?? "", grade_label: info.g?.label ?? "",
                  released: m.released_at,
                };
              }), "released-marks.csv"
            )}>Export CSV</ActionButton>
            <ActionButton icon={<IconDownload size={14} />} onClick={() => downloadTablesPdf({
              title: "Released Marks", subtitle: `${releasedMarks.length} record(s)`, filename: "released-marks",
              sections: [{ head: ["Student", "Assessment", "Subject", "Score", "Total", "%", "Grade", "Released"],
                body: releasedMarks.map((m) => { const info = markInfo(m, gradingSystem);
                  return [m.student_name || "", m.assessment_title || "", m.subject_name || "", m.score ?? "—", info.total ?? "",
                    info.pct != null ? fmt2(info.pct) : "", info.g?.grade ?? "", fmtDate(m.released_at)]; }) }],
            })}>Download PDF</ActionButton>
          </div>

          {releasedMarks.length > 0 && <GradeDistribution marks={releasedMarks} gradingSystem={gradingSystem} />}

          {releasedMarks.length === 0 ? (
            <EmptyState icon={<IconBarChart size={26} />} text="No marks have been released yet." />
          ) : (
            <div className="dash-card" style={sx.tableWrap}>
              <table style={sx.table}>
                <thead>
                  <tr>{["Student","Assessment","Subject","Mark","Pct","Grade","Released"].map((h) => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {releasedMarks.map((m) => {
                    const { total, pct, pass, gradeText } = markInfo(m, gradingSystem);
                    return (
                      <tr key={m.id} className="row-hover">
                        <Td><span style={{ fontWeight: 600, color: C.textPri }}>{m.student_name || m.student_id}</span></Td>
                        <Td style={{ color: C.textSec }}>{m.assessment_title || "—"}</Td>
                        <Td style={{ color: C.textSec }}>{m.subject_name || "—"}</Td>
                        <Td><ScoreBadge score={m.score} total={total} /></Td>
                        <Td style={{ color: pct == null ? C.textMuted : pass ? C.success : C.danger, fontWeight: 700 }}>{pct != null ? `${fmt2(pct)}%` : "—"}</Td>
                        <Td><Chip text={gradeText} tone={pct == null ? "neutral" : pass ? "success" : "danger"} /></Td>
                        <Td style={{ color: C.textMuted, fontSize: 12 }}>{fmtDate(m.released_at)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 4 — DEVICE LOCKS
      ════════════════════════════════════════════ */}
      {activeTab === 4 && (
        <>
          <div style={sx.tabTopRow}>
            <div>
              <h2 style={sx.tabTitle}>Device Locks</h2>
              <p style={sx.tabSub}>
                Every device, grouped by where it is: Active, Locked, Not started and Submitted — with the
                step each one has reached. A student's token is bound to the first device it's used on; if
                it's used on a second device the session locks. Unlock one or many here once you've
                confirmed which device each student should continue on. A locked device's saved answers are
                submitted automatically when the time ends.
              </p>
            </div>
          </div>

          <DeviceSessionsPanel
            sessions={examSessions}
            saving={saving}
            onUnlock={unlockSession}
            onBulkUnlock={bulkUnlock}
            onStop={stopSession}
            onSubmit={submitSession}
            onBulkStop={bulkStop}
            onBulkSubmit={bulkSubmit}
            onCancelResit={cancelResit}
            onPhotos={(sess) => openPhotoModal(sess.e_assessment_id, sess.student_id, sess.student_name)}
          />

          <BlockedDevicesPanel rows={deviceAccess} saving={saving} onAllow={(d) => changeDeviceAccess(d, true)} onRevoke={(d) => changeDeviceAccess(d, false)} />

          <div style={{ ...sx.tabTopRow, marginTop: 28 }}>
            <div>
              <h2 style={sx.tabTitle}>Did Not Submit</h2>
              <p style={sx.tabSub}>
                Students who opened an exam but have no submission — for example time ran out with
                nothing saved. Give them another go from here.
              </p>
            </div>
          </div>

          {resitSel.size > 0 && <ResitSelectionBar count={resitSel.size} onAllow={openBulkResit} onClear={() => setResitSel(new Map())} />}

          {unsubmitted.length === 0 ? (
            <EmptyState icon={<IconCheckCircle size={26} />} text="No students are missing a submission." />
          ) : (
            <div className="dash-card" style={sx.tableWrap}>
              <table style={sx.table}>
                <thead>
                  <tr>
                    <Th>
                      <input type="checkbox" aria-label="Select all for resit"
                        checked={unsubmitted.length > 0 && unsubmitted.every((u) => resitSel.has(resitKey(u)))}
                        onChange={(e) => setResitRows(unsubmitted, false, e.target.checked)} />
                    </Th>
                    {["Student","Class","Assessment","Subject","Ended","Reason","Actions"].map((h) => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {unsubmitted.map((u) => (
                    <tr key={u.id} className="row-hover">
                      <Td><input type="checkbox" checked={resitSel.has(resitKey(u))} onChange={() => toggleResitRow(u, false)} aria-label={`Select ${u.student_name || u.student_id} for resit`} /></Td>
                      <Td><span style={{ fontWeight: 600, color: C.textPri }}>{u.student_name || `#${u.student_id}`}</span></Td>
                      <Td style={{ color: C.textSec, fontSize: 13 }}>{u.student_class || "—"}</Td>
                      <Td style={{ color: C.textSec, fontSize: 13 }}>{u.assessment_title || "—"}</Td>
                      <Td style={{ color: C.textSec, fontSize: 13 }}>{u.subject_name || "—"}</Td>
                      <Td style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(u.ended_at)}</Td>
                      <Td>
                        {u.auto_submitted
                          ? <Chip text="Timed out — nothing saved" tone="danger" />
                          : <Chip text="Session closed" tone="neutral" />}
                      </Td>
                      <Td>
                        <MiniBtn tone="warning" icon={<IconZap size={12} />} onClick={() => grantResit(u, false)}>Allow resit</MiniBtn>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 5 && <LocalSyncPanel assessments={list} />}

      {activeTab === 7 && <ActivityLogTab assessments={list} />}
      {activeTab === 8 && <StudentActivationPanel showToast={showToast} />}

      {activeTab === 6 && (
        <GradingSystemTab
          draft={gradingDraft}
          setDraft={setGradingDraft}
          saving={gradingSaving}
          dirty={JSON.stringify(gradingDraft) !== JSON.stringify(gradingSystem)}
          onUpdateGradeBand={updateGradeBand}
          onAddGradeBand={addGradeBand}
          onRemoveGradeBand={removeGradeBand}
          onUpdateOverallBand={updateOverallBand}
          onAddOverallBand={addOverallBand}
          onRemoveOverallBand={removeOverallBand}
          onReset={resetGradingDraft}
          onSave={saveGradingSystem}
        />
      )}

      {/* ════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════ */}

      {formOpen && (
        <Modal title="Create New Assessment" onClose={() => setFormOpen(false)}>
          <FieldLabel>Assessment Title *</FieldLabel>
          <ModalInput placeholder="e.g. Endterm" value={form.title}
            onChange={(v) => setForm({ ...form, title: v })} />
          <p style={sx.formHint}>
            The subject is added automatically — e.g. typing "Endterm" with "English" selected
            creates "English Endterm Assessment". No need to type the subject or the word
            "Assessment" yourself.
          </p>

          <FieldLabel>Subject(s) *</FieldLabel>
          <SubjectMultiSelect value={form.subjects} onChange={(ids) => setForm({ ...form, subjects: ids })} subjects={subjects} />
          <p style={sx.formHint}>
            Check "All Subjects" to create this assessment for every subject at once, or pick
            specific subjects — each one gets its own copy of the assessment below.
          </p>

          <FieldLabel>Class(es) *</FieldLabel>
          <AssessmentTargetSelect value={form.class_ids} onChange={(ids) => setForm({ ...form, class_ids: ids })} classes={classes} classesByYear={classesByYear} />
          <p style={sx.formHint}>
            Check a Year (or "All Years") to create one assessment covering every class in that
            year — or pick specific classes below for a one-off, single-class assessment instead.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <ModalInput type="number" placeholder="30" value={form.duration_minutes}
                onChange={(v) => setForm({ ...form, duration_minutes: v })} />
            </div>
            <div>
              <FieldLabel>Total Marks</FieldLabel>
              <ModalInput type="number" placeholder="100" value={form.total_marks}
                onChange={(v) => setForm({ ...form, total_marks: v })} />
            </div>
          </div>

          <FieldLabel>Instructions (optional)</FieldLabel>
          <textarea
            placeholder="Any special instructions for students…"
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            style={sx.textarea}
          />

          <FieldLabel>Exam Password (optional)</FieldLabel>
          <ModalInput placeholder="e.g. MATHS2026" value={form.exam_password}
            onChange={(v) => setForm({ ...form, exam_password: v })} />
          <p style={sx.formHint}>
            Set this to let students join this exam directly at a shared link, using just their
            username + this password — no student-portal login needed. Leave blank if students
            should only reach it by logging into the portal as usual.
          </p>

          <FieldLabel>Add-Questions Deadline (optional)</FieldLabel>
          <input
            type="datetime-local"
            value={form.questions_deadline}
            onChange={(e) => setForm({ ...form, questions_deadline: e.target.value })}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 14, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
          />
          <p style={sx.formHint}>
            After this date/time, the "Add Question" button is disabled for every teacher on this
            assessment — questions already added are unaffected. Leave blank for no deadline.
          </p>

          <FieldLabel>Teachers allowed to add questions (optional)</FieldLabel>
          <TeacherMultiSelect
            value={form.question_setter_teacher_ids}
            onChange={(ids) => setForm({ ...form, question_setter_teacher_ids: ids })}
            teachers={teachers}
          />
          <p style={sx.formHint}>
            Pick the teacher(s) who should be able to open this assessment and add questions —
            this also makes the assessment appear on their E-Assessments page. Leave empty if
            only you (admin) will add questions.
          </p>

          <p style={sx.formHint}>
            All students in the selected class can take this assessment once it is approved and activated.
            Each student will receive a unique 6-character exam token bound to their first device.
          </p>
          <SaveButton onClick={createAssessment} loading={saving} label="Create Assessment" />
        </Modal>
      )}

      {accessModal && (
        <Modal title={`Who can sit & schedule — ${accessModal.a.title}`} onClose={() => setAccessModal(null)}>
          {accessModal.loading || !accessModal.data
            ? <div style={{ padding: 20, textAlign: "center", fontSize: 13 }}>Loading…</div>
            : <AccessScheduleForm a={accessModal.a} data={accessModal.data} onSave={(payload) => saveAccess(accessModal.a, payload)} />}
        </Modal>
      )}

      {editOpen && (
        <Modal title="Edit Assessment" onClose={() => setEditOpen(false)}>
          <FieldLabel>Assessment Title *</FieldLabel>
          <ModalInput placeholder="Assessment Title" value={editForm.title}
            onChange={(v) => setEditForm({ ...editForm, title: v })} />

          <FieldLabel>Subject *</FieldLabel>
          <ModalSelect value={editForm.subject} onChange={(v) => setEditForm({ ...editForm, subject: v })}
            options={subjects.map((s) => ({ value: s.name || s.subject_name, label: s.name || s.subject_name }))}
            placeholder="Select Subject" />

          <FieldLabel>Class(es) *</FieldLabel>
          <AssessmentTargetSelect value={editForm.class_ids} onChange={(ids) => setEditForm({ ...editForm, class_ids: ids })} classes={classes} classesByYear={classesByYear} />
          <p style={sx.formHint}>
            The first target you pick (a class, or a whole year) updates this assessment. Picking
            more than one gives the extra targets a new copy of it instead.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <ModalInput type="number" value={editForm.duration_minutes}
                onChange={(v) => setEditForm({ ...editForm, duration_minutes: v })} />
            </div>
            <div>
              <FieldLabel>Total Marks</FieldLabel>
              <ModalInput type="number" value={editForm.total_marks}
                onChange={(v) => setEditForm({ ...editForm, total_marks: v })} />
            </div>
          </div>

          <FieldLabel>Instructions</FieldLabel>
          <textarea value={editForm.instructions}
            onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
            style={sx.textarea} />

          <FieldLabel>Exam Password (optional)</FieldLabel>
          <ModalInput placeholder="e.g. MATHS2026" value={editForm.exam_password}
            onChange={(v) => setEditForm({ ...editForm, exam_password: v })} />
          <p style={sx.formHint}>
            Lets students join at a shared link with just their username + this password, no
            portal login needed. Leave blank to require the normal student-portal login instead.
          </p>

          <FieldLabel>Add-Questions Deadline (optional)</FieldLabel>
          <input
            type="datetime-local"
            value={editForm.questions_deadline}
            onChange={(e) => setEditForm({ ...editForm, questions_deadline: e.target.value })}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 14, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
          />
          <p style={sx.formHint}>
            After this date/time, the "Add Question" button is disabled for every teacher on this
            assessment. Leave blank for no deadline.
          </p>

          <FieldLabel>Teachers allowed to add questions (optional)</FieldLabel>
          <TeacherMultiSelect
            value={editForm.question_setter_teacher_ids}
            onChange={(ids) => setEditForm({ ...editForm, question_setter_teacher_ids: ids })}
            teachers={teachers}
          />
          <p style={sx.formHint}>
            Pick the teacher(s) who should be able to add questions to this assessment — this also
            makes it appear on their E-Assessments page.
          </p>

          <FieldLabel>Cover Page (PDF, optional)</FieldLabel>
          {editForm.cover_page_url ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <a
                href={resolveFileUrl(editForm.cover_page_url)}
                target="_blank"
                rel="noreferrer"
                style={{ color: C.accent || "#6366f1", fontWeight: 700, fontSize: 13, textDecoration: "underline" }}
              >
                📄 View current cover page
              </a>
              <button
                type="button"
                onClick={() => removeCoverPage(editForm.id)}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "transparent", border: "1px solid #ef4444", color: "#ef4444", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ) : (
            <p style={sx.formHint}>No cover page uploaded yet for this exam.</p>
          )}
          <input
            type="file"
            accept="application/pdf"
            disabled={coverPageUploading}
            onChange={(e) => uploadCoverPage(editForm.id, e.target.files?.[0])}
            style={{ marginBottom: 6 }}
          />
          <p style={sx.formHint}>
            Each exam can have its own unique cover page — students see it before they start this
            specific assessment.
          </p>

          <SaveButton onClick={saveEditAssessment} loading={saving} label="Save Changes" />
        </Modal>
      )}

      {reportCardOpen && (
        <ReportCardMarksModal
          onClose={() => setReportCardOpen(false)}
          showToast={showToast}
        />
      )}

      {assignOpen && (
        <Modal title="Assign Teachers to Subjects & Classes" onClose={() => setAssignOpen(false)}>
          <FieldLabel>Teacher(s) *</FieldLabel>
          <CheckList items={teachers.map((t) => ({ value: t.id, label: t.name }))} value={assignForm.teacher_ids}
            onChange={(v) => setAssignForm({ ...assignForm, teacher_ids: v })} allLabel="All teachers" />

          <FieldLabel>Subject(s) *</FieldLabel>
          <CheckList items={subjects.map((x) => ({ value: x.id, label: x.name || x.subject_name }))} value={assignForm.subject_ids}
            onChange={(v) => setAssignForm({ ...assignForm, subject_ids: v })} allLabel="All subjects" />

          <FieldLabel>Class(es) *</FieldLabel>
          <ClassMultiSelect value={assignForm.class_ids} onChange={(ids) => setAssignForm({ ...assignForm, class_ids: ids })} classes={classes} />
          <p style={sx.formHint}>
            {(() => {
              const t = assignForm.teacher_ids.length, sb = assignForm.subject_ids.length, c = resolveClassIds(assignForm.class_ids).length;
              return t && sb && c
                ? <>This creates up to <strong style={{ color: C.textPri }}>{t * sb * c}</strong> assignments ({t} teacher{t === 1 ? "" : "s"} × {sb} subject{sb === 1 ? "" : "s"} × {c} class{c === 1 ? "" : "es"}). Ones that already exist are skipped.</>
                : "Pick teachers, subjects and classes (each list has Select all). Every combination you choose is assigned in one go.";
            })()}
          </p>

          <SaveButton onClick={assignTeacher} loading={saving} label="Assign Teacher" />
          <p style={sx.formHint}>
            After assigning, use <strong style={{ color: C.textPri }}>Distribute Equally</strong> on the Submissions tab to split work across teachers.
          </p>
        </Modal>
      )}

      {selected && (
        <Modal
          title={selected.student_name ? "Submission Details" : "Assessment — Quick Stats"}
          onClose={() => { setSelected(null); setQuickStats(null); }}
        >
          {!selected.student_name && quickStats && (
            <>
              <div style={sx.statsGrid}>
                <StatCard label="Submitted" value={quickStats.submitted_count ?? 0} icon={<IconMail size={18} />} />
                <StatCard label="Marked"    value={quickStats.marked_count    ?? 0} icon={<IconCheck size={18} />} tone="success" />
                <StatCard label="Released"  value={quickStats.released_count  ?? 0} icon={<IconTrendUp size={18} />} />
                <StatCard label="Remarks"   value={quickStats.remark_count    ?? 0} icon={<IconMessage size={18} />} tone="warning" />
              </div>
              {quickStats.average_score != null && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
                  {[
                    { label: "Average", value: `${quickStats.average_score}%` },
                    { label: "Highest", value: quickStats.highest_score ?? "—", tone: "success" },
                    { label: "Lowest",  value: quickStats.lowest_score  ?? "—", tone: "danger" },
                  ].map(({ label, value, tone }) => (
                    <div key={label} style={{ padding: 16, background: C.bgAlt, borderRadius: 10, textAlign: "center", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: tone ? C[tone] : C.textPri }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!selected.student_name && !quickStats && (
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>No stats available yet for this assessment.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selected.student_name && (
              <>
                <DetailRow label="Student" value={selected.student_name} />
                <DetailRow label="Mark"    value={selected.score != null ? `${selected.score}/${selected.total_marks || 100}` : "Not marked"} />
                <DetailRow label="Grade"   value={computeGrade(selected.score, selected.total_marks, gradingSystem)} />
              </>
            )}
            <DetailRow label="Title"        value={selected.title || selected.assessment_title || "—"} />
            <DetailRow label="Subject"      value={selected.subject || selected.subject_name || "—"} />
            <DetailRow label="Class"        value={selected.class_name || selected.class_id || "—"} />
            <DetailRow label="Duration"     value={selected.duration_minutes ? `${selected.duration_minutes} min` : "—"} />
            <DetailRow label="Total Marks"  value={selected.total_marks || 100} />
            <DetailRow label="Status"       value={selected.status || "—"} />
            {selected.instructions && <DetailRow label="Instructions" value={selected.instructions} />}
            {selected.exam_password && (
              <DetailRow
                label="Direct Exam Link"
                value={`${window.location.origin}/take-assessment/${selected.id}`}
              />
            )}
          </div>

          {selected.score != null && selected.status !== "released" && (
            <button
              style={{ ...sx.saveBtn, marginTop: 20 }}
              onClick={() => { setSelected(null); setQuickStats(null); setReleaseModal(selected); }}
            >
              <IconRocket size={15} /> Release Marks
            </button>
          )}
        </Modal>
      )}

      {photoModal && (
        <Modal title={`Camera photos — ${photoModal.name || "Student"}`} onClose={() => setPhotoModal(null)}>
          {photoModal.loading ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading photos…</p>
          ) : (
            <EvidenceGallery evidence={photoModal.evidence} title={null} />
          )}
        </Modal>
      )}

      {splitFor && (
        <SplitMarkingModal
          startAssessmentId={splitFor.assessmentId}
          assessments={list}
          assignedTeachers={assignedTeachers}
          allTeachers={teachers}
          onClose={() => setSplitFor(null)}
          showToast={showToast}
          onSaved={() => { loadAll(); }}
        />
      )}

      {answerModal && (
        <Modal title={`Answers — ${answerModal.sub?.student_name || "Student"}`} onClose={() => setAnswerModal(null)}>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <ScoreBadge score={answerModal.sub?.score} total={answerModal.sub?.total_marks || 100} />
            <GradeBadge grade={computeGrade(answerModal.sub?.score, answerModal.sub?.total_marks, gradingSystem)} />
          </div>

          {(answerModal.answers || []).length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 13 }}>No answers found for this submission.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {answerModal.answers.map((a, i) => {
                const isMCQ    = a.question_type === "mcq";
                const correct  = isMCQ
                  ? String(a.selected_answer || "").toUpperCase() === String(a.correct_answer || "").toUpperCase()
                  : null;

                return (
                  <div key={a.id} style={{
                    padding: 16, background: C.bgAlt, borderRadius: 10,
                    border: `1px solid ${isMCQ && correct === false ? C.danger : C.border}`,
                  }}>
                    <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: C.textPri }}>
                      Q{i + 1}. {a.question_text}
                      <span style={{ marginLeft: 10, fontSize: 11, color: C.textMuted, fontWeight: 400 }}>
                        [{a.question_type} · {a.max_marks} mark{a.max_marks !== 1 ? "s" : ""}]
                      </span>
                    </p>

                    {isMCQ ? (
                      <div style={{ display: "flex", gap: 10, fontSize: 13, alignItems: "center" }}>
                        <span style={{ color: C.textMuted }}>Answer:</span>
                        <span style={{ color: correct ? C.success : C.danger, fontWeight: 700 }}>
                          {a.selected_answer || "No answer"}
                        </span>
                        {correct === false && (
                          <span style={{ color: C.textMuted }}>
                            · Correct: <strong style={{ color: C.success }}>{a.correct_answer}</strong>
                          </span>
                        )}
                        <span style={{ marginLeft: "auto" }}>
                          {correct ? <IconCheck size={16} style={{ color: C.success }} /> : <IconX size={16} style={{ color: C.danger }} />}
                        </span>
                      </div>
                    ) : (
                      a.essay_answer ? (
                        <div
                          className="mp-answer"
                          style={{ margin: "4px 0 0", fontSize: 13, color: C.textSec, lineHeight: 1.7 }}
                          dangerouslySetInnerHTML={{ __html: answerToSafeHtml(a.essay_answer) }}
                        />
                      ) : (
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>
                          <em style={{ color: C.textMuted }}>No answer provided.</em>
                        </p>
                      )
                    )}

                    {a.marks_awarded != null && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
                        Marks awarded: <strong style={{ color: C.textPri }}>{a.marks_awarded} / {a.max_marks}</strong>
                        {a.remarks && <span style={{ marginLeft: 10, color: C.textSec }}>· {a.remarks}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {remarkModal && (
        <Modal title="Review Remark Request" onClose={() => { setRemarkModal(null); setRemarkComment(""); }}>
          <div style={sx.infoBox}>
            Reviewing remark for <strong style={{ color: C.textPri }}>{remarkModal.student_name}</strong>
            {remarkModal.assessment_title && <> on <strong style={{ color: C.textPri }}>{remarkModal.assessment_title}</strong></>}
          </div>
          <FieldLabel>Admin comment (optional)</FieldLabel>
          <textarea
            placeholder="Explain your decision to the student…"
            value={remarkComment}
            onChange={(e) => setRemarkComment(e.target.value)}
            style={sx.textarea}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniBtn tone="success" full icon={<IconCheck size={14} />} onClick={() => reviewRemarkRequest(remarkModal.id, "approved", remarkComment)}>
              {saving ? "…" : "Approve"}
            </MiniBtn>
            <MiniBtn tone="danger" full icon={<IconX size={14} />} onClick={() => reviewRemarkRequest(remarkModal.id, "rejected", remarkComment)}>
              {saving ? "…" : "Reject"}
            </MiniBtn>
          </div>
        </Modal>
      )}

      {bulkResitOpen && (() => {
        const items = [...resitSel.values()];
        const anyPrev = items.some((i) => i.hasPrevious);
        return (
          <Modal title={`Grant Resit — ${items.length} student${items.length === 1 ? "" : "s"}`} onClose={() => !saving && setBulkResitOpen(false)}>
            <div style={{ fontSize: 13, color: C.textSec, marginBottom: 14, lineHeight: 1.5 }}>
              {items.slice(0, 6).map((i) => i.student_name).join(", ")}{items.length > 6 ? ` +${items.length - 6} more` : ""}
            </div>
            {anyPrev ? (
              <>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: C.textPri }}>Which score should count?</p>
                {[
                  { v: "replace",   t: "Replace the old score",     d: "The resit result becomes the student's official mark, even if it is lower." },
                  { v: "keep_best", t: "Keep the higher of the two", d: "The official mark is whichever of the original and the resit is higher." },
                ].map((o) => (
                  <label key={o.v} style={{
                    display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", marginBottom: 8, borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${resitPolicy === o.v ? C.accent : C.border}`,
                    background: resitPolicy === o.v ? "var(--primary-tint, transparent)" : "transparent",
                  }}>
                    <input type="radio" name="bulk-resit-policy" checked={resitPolicy === o.v} onChange={() => setResitPolicy(o.v)} style={{ marginTop: 3 }} />
                    <span>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: C.textPri }}>{o.t}</span>
                      <span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2 }}>{o.d}</span>
                    </span>
                  </label>
                ))}
                <div style={{ ...sx.warningBox, marginTop: 4 }}>
                  <IconAlert size={15} style={{ color: C.warning, flexShrink: 0 }} />
                  Each student keeps their current result until they submit the resit. The old attempt is archived, not deleted. This applies to everyone ticked who already has a submission.
                </div>
              </>
            ) : (
              <div style={sx.warningBox}>
                <IconAlert size={15} style={{ color: C.warning, flexShrink: 0 }} />
                None of these students has a submission for their assessment. Each gets a fresh token and can sit it now.
              </div>
            )}
            <SaveButton onClick={confirmBulkResit} loading={saving} label={`Grant resit to ${items.length}`} icon={<IconZap size={15} />} />
          </Modal>
        );
      })()}

      {resitModal && (
        <Modal title="Grant Resit" onClose={() => setResitModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <DetailRow label="Student"    value={resitModal.student_name} />
            <DetailRow label="Assessment" value={resitModal.assessment_title} />
          </div>

          {resitModal.hasPrevious ? (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: C.textPri }}>Which score should count?</p>
              {[
                { v: "replace",   t: "Replace the old score",     d: "The resit result becomes the student's official mark, even if it is lower." },
                { v: "keep_best", t: "Keep the higher of the two", d: "The official mark is whichever of the original and the resit is higher." },
              ].map((o) => (
                <label
                  key={o.v}
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", marginBottom: 8,
                    borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${resitPolicy === o.v ? C.accent : C.border}`,
                    background: resitPolicy === o.v ? "var(--primary-tint, transparent)" : "transparent",
                  }}
                >
                  <input type="radio" name="resit-policy" checked={resitPolicy === o.v} onChange={() => setResitPolicy(o.v)} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: C.textPri }}>{o.t}</span>
                    <span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2 }}>{o.d}</span>
                  </span>
                </label>
              ))}
              <div style={{ ...sx.warningBox, marginTop: 4 }}>
                <IconAlert size={15} style={{ color: C.warning, flexShrink: 0 }} />
                The student keeps their current result until they submit the resit. The old attempt is archived, not deleted.
              </div>
            </>
          ) : (
            <div style={sx.warningBox}>
              <IconAlert size={15} style={{ color: C.warning, flexShrink: 0 }} />
              This student has no submission for this assessment. They will get a fresh token and can sit it now.
            </div>
          )}

          <SaveButton
            onClick={confirmResit}
            loading={saving}
            label="Grant Resit"
            icon={<IconZap size={15} />}
          />
        </Modal>
      )}

      {allocateModal && (() => {
        const m = allocateModal;
        const available = unassignedPool(m.subjectName, m.assessmentId).length;
        const n = Math.min(Math.max(parseInt(m.count, 10) || 0, 0), available);
        const target = m.teachers.find((g) => String(g.teacher_id) === String(m.teacherId));
        const field = { padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
        const lab = { display: "block", margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: C.textMuted };
        return (
          <Modal title={`Allocate submissions — ${m.subjectName}`} onClose={() => setAllocateModal(null)}>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
              Give unassigned, unmarked submissions to one teacher — for example the ones you just retrieved from another teacher. Oldest submissions go first.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={lab}>Give to teacher</label>
                <select style={field} value={m.teacherId} onChange={(e) => setAllocateModal((x) => ({ ...x, teacherId: e.target.value }))}>
                  <option value="">Choose a teacher…</option>
                  {m.teachers.map((g) => <option key={g.teacher_id} value={g.teacher_id}>{teacherChipText(g)}</option>)}
                </select>
              </div>
              {m.assessments.length > 1 && (
                <div>
                  <label style={lab}>From assessment</label>
                  <select style={field} value={m.assessmentId}
                    onChange={(e) => setAllocateModal((x) => { const a = e.target.value; const c = unassignedPool(x.subjectName, a).length; return { ...x, assessmentId: a, count: String(c) }; })}>
                    <option value="">All assessments ({m.total} unassigned)</option>
                    {m.assessments.map((a) => <option key={a.id} value={a.id}>{a.title} ({a.count} unassigned)</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lab}>How many submissions (up to {available})</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min={1} max={available} style={field} value={m.count}
                    onChange={(e) => setAllocateModal((x) => ({ ...x, count: e.target.value }))} />
                  <MiniBtn neutral onClick={() => setAllocateModal((x) => ({ ...x, count: String(available) }))}>All {available}</MiniBtn>
                </div>
              </div>
            </div>
            <SaveButton
              onClick={confirmAllocate}
              loading={saving}
              label={n && target ? `Give ${n} submission${n === 1 ? "" : "s"} to ${target.teacher_name}` : "Allocate"}
              icon={<IconUsers size={15} />}
            />
          </Modal>
        );
      })()}
      {retrieveModal && (
        <Modal title={`Retrieve submissions — ${retrieveModal.subjectName}`} onClose={() => setRetrieveModal(null)}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
            Choose who to take unmarked work back from. It becomes unassigned so you can distribute it again. Work a teacher has already marked stays with them.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${retrieveModal.all ? C.accent : C.border}`, borderRadius: 10, cursor: "pointer", marginBottom: 8, color: C.textPri, fontWeight: 700, fontSize: 13.5 }}>
            <input type="checkbox" checked={retrieveModal.all}
              onChange={(e) => setRetrieveModal((m) => ({ ...m, all: e.target.checked, picked: new Set() }))} />
            <span style={{ flex: 1 }}>All teachers</span>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{retrieveModal.total} unmarked</span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto", marginBottom: 16, opacity: retrieveModal.all ? 0.5 : 1 }}>
            {retrieveModal.rows.map((r) => (
              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: retrieveModal.all || !r.count ? "not-allowed" : "pointer", color: C.textPri, fontSize: 13 }}>
                <input type="checkbox" disabled={retrieveModal.all || !r.count}
                  checked={retrieveModal.all || retrieveModal.picked.has(r.id)}
                  onChange={(e) => setRetrieveModal((m) => {
                    const picked = new Set(m.picked);
                    if (e.target.checked) picked.add(r.id); else picked.delete(r.id);
                    return { ...m, picked };
                  })} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  {r.classes.length > 0 && <span style={{ color: C.textMuted }}> · {r.classes.join(", ")}</span>}
                </span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{r.count} unmarked</span>
              </label>
            ))}
          </div>
          <SaveButton
            onClick={confirmRetrieve}
            loading={saving}
            label={retrieveModal.all ? "Retrieve from all teachers" : `Retrieve from ${retrieveModal.picked.size} teacher${retrieveModal.picked.size === 1 ? "" : "s"}`}
            icon={<IconRefresh size={15} />}
          />
        </Modal>
      )}
      {releaseModal && (
        <Modal title="Confirm Mark Release" onClose={() => setReleaseModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <DetailRow label="Student"    value={releaseModal.student_name || releaseModal.student_id} />
            <DetailRow label="Assessment" value={releaseModal.assessment_title || `Assessment #${releaseModal.e_assessment_id}`} />
            <DetailRow label="Subject"    value={releaseModal.subject_name || "—"} />
            <DetailRow label="Mark"       value={`${releaseModal.score} / ${releaseModal.total_marks || 100}`} />
            <DetailRow label="Grade"      value={computeGrade(releaseModal.score, releaseModal.total_marks, gradingSystem)} />
          </div>
          <div style={sx.warningBox}>
            <IconAlert size={15} style={{ color: C.warning, flexShrink: 0 }} />
            This will copy the mark to the student's official Marks record. This cannot be undone.
          </div>
          <SaveButton
            onClick={() => releaseMarks(releaseModal.id)}
            loading={saving}
            label="Confirm Release"
            icon={<IconRocket size={15} />}
          />
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */
function ThemeToggle({ theme, onToggle }) {
  const C = useC();
  return (
    <button
      onClick={onToggle}
      className="dash-icon-btn"
      style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   ASSESSMENT CARD
═══════════════════════════════════════════════════════════ */
function AssessmentCard({ a, selected, onSelect, onStart, onStop, onAccess, onToggleDesktop, onToggleMusic, onToggleArt, onToggleWritingAid, onToggleSecurity, onSaveSeb, onUploadSebConfig, onRemoveSebConfig, onStats, onAttendance, attendanceBusy, onEdit, onDelete, onAddQuestions }) {
  const [sebKeysDraft, setSebKeysDraft] = React.useState(a.seb_keys || "");
  const [sebSaving, setSebSaving] = React.useState(false);
  const sebKeysDirty = (sebKeysDraft || "").trim() !== (a.seb_keys || "").trim();
  const [sebQuitDraft, setSebQuitDraft] = React.useState(a.seb_quit_password || "");
  const [sebQuitSaving, setSebQuitSaving] = React.useState(false);
  const sebQuitDirty = (sebQuitDraft || "").trim() !== (a.seb_quit_password || "").trim();
  const sebFileRef = React.useRef(null);
  const [sebUploading, setSebUploading] = React.useState(false);
  const C = useC();
  // Exact-match against "Active" — kept in lockstep with the backend's
  // toggle-active logic (see eAssessment.controller.js), which only ever
  // treats the literal string "Active" as on. Reading this as anything
  // else here (e.g. `!== "Inactive"`) is what made the old toggle look
  // broken: a freshly created assessment would render as "Active" on
  // the card while the backend still considered it off, so the first
  // click silently did nothing visible.
  const isActive = a.active_status === "Active";
  return (
    <div className="dash-card" style={{ background: C.card, borderRadius: 12, padding: 18, border: `1px solid ${selected ? C.accent : C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: C.textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.title}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.textSec }}>{a.subject}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 10 }}>
          <StatusBadge status={a.status} />
          <input type="checkbox" checked={selected} onChange={onSelect}
            style={{ accentColor: C.accent, cursor: "pointer", width: 15, height: 15 }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <MetaRow label="Class"       value={a.year_of_study ? `Year ${a.year_of_study} (all classes)` : a.class_name || a.class_id || "N/A"} />
        <MetaRow label="Duration"    value={`${a.duration_minutes || 0} min`} />
        <MetaRow label="Total Marks" value={a.total_marks || 100} />
        <MetaRow label="Questions"   value={a.question_count || 0} />
        <MetaRow label="Submissions" value={a.submission_count || 0} />
        <MetaRow
          label="Teacher"
          value={
            a.teacher_name ||
            (Array.isArray(a.question_setter_names) && a.question_setter_names.length > 0
              ? a.question_setter_names.join(", ")
              : "Not assigned")
          }
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isActive ? C.success : C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <IconDot size={7} /> {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${a.restrict_students || a.available_from || a.available_until ? C.accent : C.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>Who can sit &amp; schedule</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
            {a.restrict_students ? `Only ${a.allowed_count || 0} selected trainee${a.allowed_count === 1 ? "" : "s"}` : "All active trainees"}
            {" · "}
            {a.available_from || a.available_until
              ? `${a.available_from ? fmtDateTime(a.available_from) : "any time"} → ${a.available_until ? fmtDateTime(a.available_until) : "no end"} (EAT)`
              : "No time limit"}
          </div>
        </div>
        <MiniBtn icon={<Users size={12} />} onClick={onAccess} title="Choose which trainees can sit this paper and set its start and finish date/time">Manage</MiniBtn>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${a.desktop_only ? C.accent : C.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>Desktop only</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
            {a.desktop_only ? "Only Windows & Mac computers. Phones/tablets blocked." : "Any device can take this exam."}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!a.desktop_only}
          aria-label="Desktop only — block phones and tablets"
          title={a.desktop_only ? "Turn off: allow any device" : "Turn on: only Windows & Mac laptops/desktops (works instantly, even mid-exam)"}
          onClick={onToggleDesktop}
          style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 2, cursor: "pointer", background: a.desktop_only ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: a.desktop_only ? "flex-end" : "flex-start", transition: "background .15s" }}
        >
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
        </button>
      </div>

      <div style={{ marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${a.require_seb ? C.accent : C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>Require Safe Exam Browser</div>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
              {a.require_seb ? "Students can only sign in and sit this exam from Safe Exam Browser." : "Any browser can take this exam."}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!a.require_seb}
            aria-label="Require Safe Exam Browser"
            title={a.require_seb ? "Turn off: allow normal browsers" : "Turn on: only Safe Exam Browser (works instantly, even mid-exam)"}
            onClick={() => onSaveSeb({ enabled: !a.require_seb })}
            style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 2, cursor: "pointer", background: a.require_seb ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: a.require_seb ? "flex-end" : "flex-start", transition: "background .15s" }}
          >
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
          </button>
        </div>
        {a.require_seb && (
          <div style={{ marginTop: 8, padding: 8, borderRadius: 6, border: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri, marginBottom: 2 }}>SEB configuration file</div>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, marginBottom: 6 }}>
              {a.seb_config_name
                ? <>Students download <b>{a.seb_config_name}</b> and open it to start the exam. Paste its Config Key below.</>
                : "Optional. Upload a .seb file from the SEB Config Tool and students will download it instead of the automatic one. Its Start URL must be this exam's page."}
            </div>
            <input
              ref={sebFileRef}
              type="file"
              accept=".seb"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                e.target.value = "";
                if (!f) return;
                setSebUploading(true); await onUploadSebConfig(f); setSebUploading(false);
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <MiniBtn tone="success" disabled={sebUploading} onClick={() => sebFileRef.current && sebFileRef.current.click()}>
                {sebUploading ? "Uploading…" : a.seb_config_name ? "Replace .seb file" : "Upload .seb file"}
              </MiniBtn>
              {a.seb_config_name && <MiniBtn tone="danger" disabled={sebUploading} onClick={onRemoveSebConfig}>Remove</MiniBtn>}
            </div>
          </div>
        )}
        {a.require_seb && (
          <div style={{ marginTop: 8, padding: 8, borderRadius: 6, border: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri, marginBottom: 2 }}>SEB quit password</div>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, marginBottom: 6 }}>
              Students must type this to quit Safe Exam Browser (give it to them only when the exam ends). Applies to the automatic exam file, so students must download the file again after you change it. {a.seb_config_name ? "Your uploaded .seb file uses the password stored inside that file instead." : ""}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={sebQuitDraft}
                onChange={(e) => setSebQuitDraft(e.target.value)}
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
                placeholder="No quit password"
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg || "transparent", color: C.textPri }}
              />
              <MiniBtn
                tone="success"
                disabled={sebQuitSaving || !sebQuitDirty}
                onClick={async () => { setSebQuitSaving(true); await onSaveSeb({ quitPassword: sebQuitDraft }); setSebQuitSaving(false); }}
              >
                {sebQuitSaving ? "Saving…" : "Save"}
              </MiniBtn>
            </div>
          </div>
        )}
        {a.require_seb && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, marginBottom: 4 }}>
              SEB Config Key or Browser Exam Key — one per line (64 characters each). From the SEB Config Tool (Exam tab) after saving your .seb file.
            </div>
            <textarea
              value={sebKeysDraft}
              onChange={(e) => setSebKeysDraft(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="e.g. 3f9a…(64 hex characters)"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 11, padding: 6, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg || "transparent", color: C.textPri, resize: "vertical" }}
            />
            {!(a.seb_keys || "").trim() && (
              <div style={{ fontSize: 11, color: C.danger || "#b45309", marginTop: 4, lineHeight: 1.4 }}>
                No key saved: only a basic check is applied, which a determined student can fake. Add a key for real protection.
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              <MiniBtn
                tone="success"
                disabled={sebSaving || !sebKeysDirty}
                onClick={async () => { setSebSaving(true); await onSaveSeb({ keys: sebKeysDraft }); setSebSaving(false); }}
              >
                {sebSaving ? "Saving…" : "Save keys"}
              </MiniBtn>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri, marginBottom: 2 }}>Exam security</div>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, marginBottom: 6 }}>
          ON = students must comply. Turn a switch OFF for this assessment only when needed.
        </div>
        {[
          ["require_camera", "Camera required", "Students must allow their camera (eye-gaze monitoring and photos)."],
          ["require_screen_share", "Entire-screen sharing required", "Students must share their whole screen before starting and throughout."],
          ["require_fullscreen", "Fullscreen required", "Exam must run in fullscreen. Window mode or minimising locks the student out at once and the reason is shown under Device Locks."],
          ["lock_on_violations", "Lock after repeated violations", "Switching tabs/windows or blocked shortcuts 3 times locks the exam."],
        ].map(([key, label, desc]) => {
          const on = a[key] == null ? true : !!a[key];
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textPri }}>{label}</div>
                <div style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.35 }}>{on ? desc : "Turned OFF for this assessment."}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                title={on ? "Turn off for this assessment" : "Turn on"}
                onClick={() => onToggleSecurity(key)}
                style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 2, cursor: "pointer", background: on ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start", transition: "background .15s" }}
              >
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${a.music_paper ? C.accent : C.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>Music paper (drawing tools)</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
            {a.music_paper
              ? "Students get a button to unlock the drawing pad (staves, notes, rests) on essay questions."
              : /music/i.test(a.subject || "")
                ? "This looks like a Music subject — turn on so students can draw staves and notes."
                : "Off — students answer with the normal text box only."}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!a.music_paper}
          aria-label="Music paper — unlock drawing tools for students"
          title={a.music_paper ? "Turn off the drawing tools" : "Turn on: students can draw staves, notes and rests"}
          onClick={onToggleMusic}
          style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 2, cursor: "pointer", background: a.music_paper ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: a.music_paper ? "flex-end" : "flex-start", transition: "background .15s" }}
        >
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${a.art_paper ? C.accent : C.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>Art &amp; Craft paper (drawing tools)</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
            {a.art_paper
              ? "Students get a button to unlock the drawing pad (brushes, colours, shapes, fill) on essay questions."
              : /\b(art|arts|craft|crafts|creative arts?)\b/i.test(a.subject || "")
                ? "This looks like an Art & Craft subject — turn on so students can draw and colour their answers."
                : "Off — students answer with the normal text box only."}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!a.art_paper}
          aria-label="Art and Craft paper — unlock drawing tools for students"
          title={a.art_paper ? "Turn off the drawing tools" : "Turn on: students can draw and colour their answers"}
          onClick={onToggleArt}
          style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 2, cursor: "pointer", background: a.art_paper ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: a.art_paper ? "flex-end" : "flex-start", transition: "background .15s" }}
        >
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
        </button>
      </div>

      {[
        ["auto_capitalize", "Auto capital letters", "Each sentence the student types starts with a capital letter automatically.", "Students type capitals themselves."],
        ["auto_fullstop", "Auto full stop on Enter", "Pressing Enter at the end of an unfinished line adds the full stop.", "Students add their own full stops."],
      ].map(([field, title, onText, offText]) => {
        const on = !(a[field] === false || a[field] === 0);
        return (
          <div key={field} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${on ? C.accent : C.border}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>{title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{on ? onText : `Off — ${offText.charAt(0).toLowerCase()}${offText.slice(1)}`}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`${title} in the student's essay box`}
              title={on ? `Turn off: ${title.toLowerCase()}` : `Turn on: ${title.toLowerCase()}`}
              onClick={() => onToggleWritingAid(field)}
              style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 2, cursor: "pointer", background: on ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start", transition: "background .15s" }}
            >
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
            </button>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        <MiniBtn tone="success" grow icon={<IconCheck size={12} />} onClick={onStart} disabled={isActive} title={isActive ? "Already started" : "Approve (if needed) and open this assessment to students"}>Start</MiniBtn>
        <MiniBtn tone="danger"  grow icon={<IconX size={12} />}     onClick={onStop}  disabled={!isActive} title={!isActive ? "Already stopped" : "Close this assessment to students"}>Stop</MiniBtn>
        <MiniBtn grow icon={<IconBarChart size={12} />} onClick={onStats}>Stats</MiniBtn>
        <MiniBtn icon={<Download size={12} />} onClick={onAttendance} disabled={attendanceBusy} title="Download a PDF (with the school logo) listing the students who did this exam and those who did not">{attendanceBusy ? "Preparing…" : "Attendance PDF"}</MiniBtn>
        <MiniBtn icon={<IconQuestions size={12} />} onClick={onAddQuestions} title="Add / manage questions on this assessment" />
        <MiniBtn icon={<IconEdit size={12} />} onClick={onEdit} title="Edit" />
        <MiniBtn tone="danger" icon={<IconTrash size={12} />} onClick={onDelete} title="Delete" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRADE DISTRIBUTION
═══════════════════════════════════════════════════════════ */
function GradeDistribution({ marks, gradingSystem }) {
  const C = useC();
  // One bar per band of the CURRENT grading system (highest band first),
  // so the chart always matches Admin → Grading System.
  const bands = [...(gradingSystem?.gradeBands?.length ? gradingSystem.gradeBands : DEFAULT_GRADING_SYSTEM.gradeBands)]
    .sort((a, b) => Number(b.minScore) - Number(a.minScore));
  const counts = bands.map(() => 0);
  marks.forEach((m) => {
    if (m.score == null) return;
    const pct = (Number(m.score) / toTotal(m.total_marks)) * 100;
    const idx = bands.findIndex((band) => pct >= Number(band.minScore));
    counts[idx >= 0 ? idx : bands.length - 1]++;
  });
  const max = Math.max(...counts, 1);

  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
      <p style={{ margin: "0 0 18px", fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Grade Distribution — {marks.length} Release{marks.length !== 1 ? "s" : ""}
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, minHeight: 110 }}>
        {bands.map((band, i) => (
          <div key={`${band.grade}-${band.minScore}-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec }}>{counts[i]}</span>
            <div style={{
              width: "100%", minHeight: counts[i] > 0 ? 4 : 0,
              height: `${(counts[i] / max) * 64}px`,
              background: C.textPri,
              opacity: 0.55 + Math.max(0, 0.3 - i * 0.06),
              borderRadius: "3px 3px 0 0",
              transition: "height 0.3s ease",
            }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>{band.grade || band.label}</span>
            {band.grade && band.label && String(band.grade) !== String(band.label) && (
              <span style={{ fontSize: 10, color: C.textMuted, textAlign: "center", lineHeight: 1.2 }}>{band.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, icon, tone }) {
  const C = useC();
  const tint = tone ? C[tone] : C.textPri;
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.textPri, lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: C.bgAlt, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tint }}>
        {icon}
      </div>
    </div>
  );
}

function SectionHeader({ title, right }) {
  const C = useC();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "32px 0 14px" }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {right}
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = { approved: "success", rejected: "danger", pending: "warning" }[String(status || "").toLowerCase()] || "warning";
  return <Chip text={status || "pending"} tone={tone} uppercase />;
}

/* A score does NOT mean "marked": MCQs are graded automatically, and a teacher who has
   saved some essays has a score too. A paper is marked once nothing is left for a teacher
   (no answered essay without a mark) — or it is a pure-MCQ paper, which the system finished
   at submission. Returns "released" | "marked" | "auto" | "awaiting" | "pending". */
const markState = (s) => {
  if (s.status === "released") return "released";
  const left = Number(s.pending_essay_count) || 0;
  if (left > 0) return "awaiting";
  const hasEssay = Number(s.essay_question_count) > 0;
  if (s.status === "marked" || s.score != null) return hasEssay ? "marked" : "auto";
  return "pending";
};
const isMarkedState = (s) => ["marked", "auto", "released"].includes(markState(s));

function MarkPill({ sub }) {
  const st = markState(sub);
  if (st === "released") return <Chip text="Released" tone="accent" />;
  if (st === "marked")   return <Chip text="Marked" tone="success" />;
  if (st === "auto")     return <Chip text="Auto-marked (MCQ)" tone="neutral" />;
  if (st === "awaiting") {
    const n = Number(sub.pending_essay_count) || 0;
    return <Chip text={`Awaiting marking · ${n} essay${n === 1 ? "" : "s"} left`} tone="warning" />;
  }
  return <Chip text={sub.status || "Pending"} tone="neutral" />;
}
/* ── Blocked devices (Desktop-only switch) ──
   Every phone/tablet the switch turned away, per student and assessment,
   with the platform it reported (Android, iPhone, ...). "Allow" lets that ONE
   device in for that student + exam; "Revoke" puts the block back. */
const PLATFORM_LABEL = {
  android: "Android", ios: "iPhone", ipados: "iPad", chromeos: "Chromebook",
  linux: "Linux", windows: "Windows", mac: "Mac", unknown: "Unknown",
  noseb: "Normal browser (no SEB)",
};
const deviceModel = (ua = "") => {
  const a = /Android [\d.]+; ([^)]+?)(?: Build|\))/i.exec(ua);
  if (a) return a[1].trim();
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  return "";
};

/* Recent assignments and allocations, each with an Undo button. Covers
   assigning teachers to subjects/classes, removing those, handing out whole
   submissions and splitting answered questions between teachers. */
function AssignmentHistory({ batches, saving, onUndo }) {
  const C = useC();
  const [all, setAll] = useState(false);
  if (!batches || batches.length === 0) return null;
  const shown = all ? batches : batches.slice(0, 5);
  const KIND = { submission: "Submissions", question: "By question", teacher_subject: "Teacher / subject / class" };
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.textPri }}>Recent assignments & allocations</p>
        {batches.length > 5 && (
          <button type="button" onClick={() => setAll((v) => !v)} style={{ border: "none", background: "transparent", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {all ? "Show fewer" : `Show all ${batches.length}`}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {shown.map((b) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.border}`, opacity: b.undone_at ? 0.6 : 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: C.textPri, textDecoration: b.undone_at ? "line-through" : "none" }}>{b.summary}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textMuted }}>
                {KIND[b.kind] || b.kind} · {b.created_by_name || "Admin"} · {fmtDateTime(b.created_at)}
              </p>
            </div>
            {b.undone_at
              ? <Chip text="Undone" tone="neutral" />
              : <MiniBtn tone="warning" disabled={saving} onClick={() => onUndo(b)} title="Put things back the way they were before this action">Undo</MiniBtn>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockedDevicesPanel({ rows, saving, onAllow, onRevoke }) {
  const C = useC();
  const sx = s(C);
  const [statusF, setStatusF] = useState("blocked");
  const [platformF, setPlatformF] = useState("all");
  const select = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 13 };

  const blockedCount = rows.filter((d) => d.status === "blocked").length;
  const shown = rows.filter((d) =>
    (statusF === "all" || d.status === statusF) && (platformF === "all" || d.platform === platformF));

  return (
    <>
      <div style={{ ...sx.tabTopRow, marginTop: 28 }}>
        <div>
          <h2 style={sx.tabTitle}>Blocked Devices</h2>
          <p style={sx.tabSub}>
            Phones and tablets that tried to open a "Desktop only" exam and were turned away. Press
            <b> Allow </b>to let that one device take the exam for that student — it works straight away,
            and the student just presses Try again. <b>Revoke</b> blocks it again.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select style={select} value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Filter by status">
            <option value="blocked">Blocked{blockedCount ? ` (${blockedCount})` : ""}</option>
            <option value="allowed">Allowed</option>
            <option value="all">All</option>
          </select>
          <select style={select} value={platformF} onChange={(e) => setPlatformF(e.target.value)} aria-label="Filter by device type">
            <option value="all">All device types</option>
            <option value="android">Android</option>
            <option value="ios">iPhone</option>
            <option value="ipados">iPad</option>
            <option value="chromeos">Chromebook</option>
            <option value="linux">Linux</option>
            <option value="unknown">Unknown</option>
            <option value="noseb">Not in SEB</option>
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Smartphone size={26} />} text={rows.length === 0 ? "No device has been turned away yet (phones, tablets or browsers without SEB)." : "Nothing matches these filters."} />
      ) : (
        <div className="dash-card" style={sx.tableWrap}>
          <table style={sx.table}>
            <thead>
              <tr>{["Student", "Assessment", "Device", "Attempts", "Last attempt", "Status", "Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {shown.map((d) => {
                const model = deviceModel(d.user_agent);
                return (
                  <tr key={d.id} className="row-hover">
                    <Td>
                      <div style={{ fontWeight: 600, color: C.textPri }}>{d.student_name || (d.student_id ? `#${d.student_id}` : "Unknown student")}</div>
                      <div style={{ color: C.textMuted, fontSize: 11 }}>{[d.student_class, d.student_username].filter(Boolean).join(" · ")}</div>
                    </Td>
                    <Td style={{ color: C.textSec, fontSize: 13 }}>
                      {d.assessment_title || "—"}
                      {d.platform === "noseb"
                        ? (!d.require_seb && <div style={{ color: C.textMuted, fontSize: 11 }}>SEB is not required now</div>)
                        : (!d.desktop_only && <div style={{ color: C.textMuted, fontSize: 11 }}>Desktop-only is off now</div>)}
                    </Td>
                    <Td style={{ maxWidth: 230 }}>
                      <Chip icon={<Smartphone size={11} />} text={PLATFORM_LABEL[d.platform] || d.platform || "Unknown"} tone="warning" />
                      <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }} title={d.user_agent || ""}>
                        {model || (d.user_agent ? `${d.user_agent.slice(0, 48)}…` : "—")}
                      </div>
                    </Td>
                    <Td style={{ color: C.textSec, fontSize: 13 }}>{d.attempts}</Td>
                    <Td style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(d.last_seen)}</Td>
                    <Td>
                      {d.status === "allowed"
                        ? <Chip icon={<ShieldCheck size={11} />} text={d.allowed_by_name ? `Allowed by ${d.allowed_by_name}` : "Allowed"} tone="success" />
                        : <Chip icon={<IconLock size={11} />} text="Blocked" tone="danger" />}
                    </Td>
                    <Td>
                      {d.status === "allowed"
                        ? <MiniBtn tone="warning" disabled={saving} onClick={() => onRevoke(d)}>Revoke</MiniBtn>
                        : <MiniBtn tone="success" disabled={saving} icon={<ShieldCheck size={12} />} onClick={() => onAllow(d)}>Allow</MiniBtn>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* One entry per teacher with all their classes: [{ teacher_id, teacher_name, classes: [..] }].
   assignedTeachers has a row per teacher+subject+class, so listing it directly repeats the name. */
function groupTeachersWithClasses(rows = []) {
  const map = new Map();
  rows.forEach((r) => {
    const g = map.get(r.teacher_id) || { teacher_id: r.teacher_id, teacher_name: r.teacher_name, classes: [] };
    if (r.class_name && !g.classes.includes(r.class_name)) g.classes.push(r.class_name);
    map.set(r.teacher_id, g);
  });
  return [...map.values()];
}
const teacherChipText = (g) => (g.classes.length ? `${g.teacher_name} · ${g.classes.join(", ")}` : g.teacher_name);

/* Colour-coded count used on the submission subject cards, so each state reads at a glance:
   submitted = blue · marked = amber · released = green · assigned = theme colour · unassigned = red. */
const STAT_COLORS = {
  submitted:  "var(--info, #3b82f6)",
  marked:     "var(--warning, #f59e0b)",
  released:   "var(--success, #22c55e)",
  assigned:   "var(--primary, #6366f1)",
  unassigned: "var(--destructive, #ef4444)",
};
function StatPill({ kind, count, label }) {
  const color = STAT_COLORS[kind];
  return (
    <span title={`${count} ${label || kind}`} style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
      color, background: `color-mix(in srgb, ${color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 38%, transparent)`,
      opacity: count ? 1 : 0.55, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {count} {label || kind}
    </span>
  );
}

function Chip({ text, tone = "neutral", icon, uppercase, wrap }) {
  const C = useC();
  const color = tone === "neutral" ? C.textSec : C[tone] || C.textSec;
  return (
    <span style={{
      display: "inline-flex", alignItems: wrap ? "flex-start" : "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: wrap ? 12 : 99,
      background: C.bgAlt, color, border: `1px solid ${C.border}`,
      textTransform: uppercase ? "uppercase" : "none", letterSpacing: uppercase ? "0.05em" : 0,
      // wrap: long text (a teacher with many classes) breaks onto more lines instead of running out of its card
      whiteSpace: wrap ? "normal" : "nowrap",
      ...(wrap ? { maxWidth: "100%", minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.35, textAlign: "left" } : {}),
    }}>
      {icon || (tone !== "neutral" && <IconDot size={6} />)}
      {wrap ? <span style={{ minWidth: 0 }}>{text}</span> : text}
    </span>
  );
}

function RemarkBadge({ status }) {
  const tone = { pending: "warning", approved: "success", rejected: "danger", revision: "warning", completed: "accent" }[status] || "neutral";
  return <Chip text={status || "pending"} tone={tone} />;
}

function ScoreBadge({ score, total }) {
  const C = useC();
  if (score == null) return <span style={{ color: C.textMuted }}>—</span>;
  const pct   = (score / (total || 100)) * 100;
  const color = pct >= 70 ? C.success : pct >= 50 ? C.warning : C.danger;
  return (
    <span style={{ fontWeight: 700, fontSize: 14, color }}>
      {score}<span style={{ fontSize: 12, color: C.textMuted }}>/{total}</span>
    </span>
  );
}

function GradeBadge({ grade }) {
  const tone = { A: "success", B: "success", C: "warning", D: "warning", E: "danger" }[grade] || "neutral";
  return <Chip text={grade} tone={tone} />;
}

function NotifPill({ n, tone = "accent" }) {
  const C = useC();
  return (
    <span style={{ background: C[tone] || C.accent, color: C.bg, borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "2px 7px", marginLeft: 4 }}>
      {n}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRADING SYSTEM TAB
   Editor for the shared grading scale (see GradingSystem DB table
   + hooks/useGradingSystem.js). Every report screen — Reports,
   Teacher Reports, Student Report — reads whatever is saved here,
   instead of each having its own hard-coded grade boundaries.
═══════════════════════════════════════════════════════════ */
function GradingSystemTab({
  draft, setDraft, saving, dirty,
  onUpdateGradeBand, onAddGradeBand, onRemoveGradeBand,
  onUpdateOverallBand, onAddOverallBand, onRemoveOverallBand,
  onReset, onSave,
}) {
  const C = useC();

  if (!draft) {
    return <EmptyState icon={<IconGraduationCap size={26} />} text="Loading grading system…" />;
  }

  const cellInput = {
    width: "100%", padding: "7px 9px", borderRadius: 6,
    border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri,
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  const gradeBands = draft.gradeBands || [];
  const overallBands = draft.overallBands || [];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: C.textPri }}>Grading System</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.textMuted, maxWidth: 620 }}>
            Set the grade bands and overall-result thresholds used everywhere a score is
            turned into a grade — the printed report cards, Teacher Reports, and each
            student's own result slip. Changes apply immediately across all of them.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {dirty && <MiniBtn onClick={onReset} disabled={saving}>Discard changes</MiniBtn>}
          <ActionButton primary onClick={onSave} icon={<IconSave size={14} />}>
            {saving ? "Saving…" : "Save Grading System"}
          </ActionButton>
        </div>
      </div>

      {/* System name + pass mark */}
      <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <FieldLabel>System Name</FieldLabel>
          <input value={draft.systemName || ""} placeholder="e.g. KNEC Standard"
            onChange={(e) => setDraft((d) => ({ ...d, systemName: e.target.value }))}
            style={cellInput} />
        </div>
        <div style={{ flex: "0 1 160px" }}>
          <FieldLabel>Pass Mark (%)</FieldLabel>
          <input type="number" value={draft.passMark ?? ""} placeholder="40"
            onChange={(e) => setDraft((d) => ({ ...d, passMark: e.target.value }))}
            style={cellInput} />
        </div>
      </div>

      {/* Grade bands */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Subject / Score Grade Bands</h3>
        <MiniBtn icon={<IconPlusCircle size={13} />} onClick={onAddGradeBand}>Add band</MiniBtn>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: C.textMuted }}>
        A score is matched to the highest band whose minimum it meets or exceeds. List from highest to lowest — order doesn't have to be exact, it's re-sorted on save.
      </p>
      <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <Th>Min Score (%)</Th>
              <Th>Grade</Th>
              <Th>Label</Th>
              <Th>Remark</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {gradeBands.map((band, idx) => (
              <tr key={idx}>
                <Td style={{ width: 120 }}>
                  <input type="number" value={band.minScore} style={cellInput}
                    onChange={(e) => onUpdateGradeBand(idx, "minScore", e.target.value)} />
                </Td>
                <Td style={{ width: 90 }}>
                  <input value={band.grade || ""} placeholder="1" style={cellInput}
                    onChange={(e) => onUpdateGradeBand(idx, "grade", e.target.value)} />
                </Td>
                <Td>
                  <input value={band.label || ""} placeholder="Distinction" style={cellInput}
                    onChange={(e) => onUpdateGradeBand(idx, "label", e.target.value)} />
                </Td>
                <Td>
                  <input value={band.remark || ""} placeholder="Excellent Performance" style={cellInput}
                    onChange={(e) => onUpdateGradeBand(idx, "remark", e.target.value)} />
                </Td>
                <Td style={{ width: 44 }}>
                  <MiniBtn tone="danger" title="Remove band" onClick={() => onRemoveGradeBand(idx)}>
                    <IconMinusCircle size={14} />
                  </MiniBtn>
                </Td>
              </tr>
            ))}
            {gradeBands.length === 0 && (
              <tr><Td style={{ color: C.textMuted, textAlign: "center" }} colSpan={5}>No grade bands yet — add one above.</Td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Overall result bands */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Overall Result Bands</h3>
        <MiniBtn icon={<IconPlusCircle size={13} />} onClick={onAddOverallBand}>Add band</MiniBtn>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: C.textMuted }}>
        Used for the "Overall Result" shown on a student's average across all subjects (e.g. DISTINCTION / CREDIT / PASS / REFERRED).
      </p>
      <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr>
              <Th>Min Average (%)</Th>
              <Th>Result Label</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {overallBands.map((band, idx) => (
              <tr key={idx}>
                <Td style={{ width: 140 }}>
                  <input type="number" value={band.minScore} style={cellInput}
                    onChange={(e) => onUpdateOverallBand(idx, "minScore", e.target.value)} />
                </Td>
                <Td>
                  <input value={band.label || ""} placeholder="DISTINCTION" style={cellInput}
                    onChange={(e) => onUpdateOverallBand(idx, "label", e.target.value)} />
                </Td>
                <Td style={{ width: 44 }}>
                  <MiniBtn tone="danger" title="Remove band" onClick={() => onRemoveOverallBand(idx)}>
                    <IconMinusCircle size={14} />
                  </MiniBtn>
                </Td>
              </tr>
            ))}
            {overallBands.length === 0 && (
              <tr><Td style={{ color: C.textMuted, textAlign: "center" }} colSpan={3}>No overall-result bands yet — add one above.</Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY LOG — who did what, and when (student / teacher / admin)
   Backed by GET /e-assessments/admin/activity-log
   (see backend/utils/eAssessmentActivityLog.js)
═══════════════════════════════════════════════════════════ */
const ACTION_LABELS = {
  exam_login: "Exam login", start_exam: "Started exam", activate_exam_device: "Exam device bound",
  heartbeat: "Heartbeat problem", autosave: "Autosave problem", device_locked_by_student_device: "Device locked",
  end_exam_session: "Ended exam session", submit_exam: "Submitted exam", violation_photo_captured: "Evidence photo captured",
  request_remark: "Requested remark", open_exam: "Opened exam",
  create_assessment: "Created assessment", update_assessment: "Edited assessment", add_question: "Added question",
  update_question: "Edited question", delete_question: "Deleted question", import_questions_docx: "Imported questions (Word)",
  bulk_add_questions: "Bulk-added questions", upload_cover_page: "Uploaded cover page", delete_cover_page: "Removed cover page",
  upload_question_images: "Uploaded question image", delete_question_image: "Deleted question image",
  open_script_for_marking: "Opened script to mark", open_all_scripts_for_marking: "Opened all scripts to mark",
  save_marking: "Saved marking", save_marking_bulk: "Saved marking (bulk)",
  review_assessment: "Approved / rejected assessment", start_stop_assessment: "Started / stopped assessment",
  set_student_access: "Trainee access / schedule", set_student_status: "Activated / deactivated students (all assessments)", set_desktop_only: "Desktop-only switch", set_security_settings: "Security switches", set_seb_settings: "Safe Exam Browser setting", unlock_device: "Unlocked device", admin_stop_exam: "Stopped a student's exam", admin_stop_exams_bulk: "Stopped exams (bulk)", admin_submit_exam: "Submitted a student's exam", admin_submit_exams_bulk: "Submitted exams (bulk)", grant_resit: "Granted resit",
  cancel_resit: "Cancelled resit", assign_teacher: "Assigned teacher", assign_submission: "Assigned script",
  bulk_assign_submissions: "Assigned scripts (bulk)", review_remark_request: "Reviewed remark request",
  release_marks: "Released marks", bulk_release_marks: "Released marks (bulk)", update_grading_system: "Updated grading system",
  delete_assessments: "Deleted assessments", delete_assignments: "Deleted assignments",
};
const OUTCOME_TONE = { success: "success", rejected: "warning", conflict: "warning", locked: "danger", device_blocked: "danger", denied: "danger", error: "danger" };

function ActivityLogTab({ assessments }) {
  const C = useC();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [f, setF] = useState({ assessmentId: "", portal: "", outcome: "", actor: "", from: "", to: "" });
  const [applied, setApplied] = useState(f);
  const LIMIT = 50;

  const params = (extra = {}) => {
    const p = { ...extra };
    Object.entries(applied).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  };

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr("");
    API.get("/e-assessments/admin/activity-log", { params: params({ page, limit: LIMIT }) })
      .then((r) => { if (!alive) return; setRows(r.data.rows || []); setTotal(r.data.total || 0); })
      .catch((e) => { if (alive) setErr(e?.response?.data?.message || "Failed to load the activity log"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, applied]);

  const apply = () => { setPage(1); setApplied({ ...f }); };
  const reset = () => { const blank = { assessmentId: "", portal: "", outcome: "", actor: "", from: "", to: "" }; setF(blank); setPage(1); setApplied(blank); };

  const exportCsv = async () => {
    try {
      const r = await API.get("/e-assessments/admin/activity-log", { params: params({ format: "csv" }), responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `e-assessment-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setErr("CSV export failed"); }
  };

  const input = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 13, minWidth: 0 };
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const prettyDetails = (d) => { try { return JSON.stringify(JSON.parse(d), null, 2); } catch { return d || ""; } };

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.textPri }}>Activity Log</h2>
        <p style={{ margin: 0, fontSize: 13, color: C.textSec }}>
          Every student, teacher and admin action in the exam module — who did it, what, when, from where. Passwords and students' answers are never recorded.
        </p>
      </div>

      <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <select style={{ ...input, maxWidth: 220 }} value={f.assessmentId} onChange={(e) => setF({ ...f, assessmentId: e.target.value })}>
          <option value="">All assessments</option>
          {(assessments || []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <select style={input} value={f.portal} onChange={(e) => setF({ ...f, portal: e.target.value })}>
          <option value="">All portals</option><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option>
        </select>
        <select style={input} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}>
          <option value="">Any outcome</option><option value="success">Success</option><option value="rejected">Rejected</option>
          <option value="device_blocked">Device blocked</option><option value="locked">Locked</option><option value="denied">Denied</option><option value="error">Error</option>
        </select>
        <input style={{ ...input, width: 160 }} placeholder="Name or username" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })} onKeyDown={(e) => e.key === "Enter" && apply()} />
        <input style={input} type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} title="From" />
        <input style={input} type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} title="To" />
        <ActionButton primary onClick={apply}>Apply</ActionButton>
        <ActionButton onClick={reset}>Reset</ActionButton>
        <ActionButton onClick={exportCsv}>Export CSV</ActionButton>
      </div>

      {err && <p style={{ color: C.danger, fontSize: 13 }}>{err}</p>}

      {!loading && rows.length === 0 && !err ? (
        <EmptyState icon={<IconFileText size={26} />} text="No activity matches these filters yet." />
      ) : (
        <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto", opacity: loading ? 0.6 : 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>{["Time", "Portal", "Who", "Action", "Outcome", "Assessment", "Student", "IP"].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="row-hover" style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <Td style={{ fontSize: 12, color: C.textSec, whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}</Td>
                    <Td><Chip text={r.portal || "—"} uppercase tone={r.portal === "admin" ? "accent" : "neutral"} /></Td>
                    <Td>
                      <div style={{ fontWeight: 600, color: C.textPri, fontSize: 13 }}>{r.actor_name || r.actor_username || "—"}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{r.actor_username && r.actor_name ? `${r.actor_username} · ` : ""}{r.actor_role}</div>
                    </Td>
                    <Td style={{ fontSize: 13, color: C.textPri }}>{ACTION_LABELS[r.action] || r.action}</Td>
                    <Td><Chip text={String(r.outcome || "").replace("_", " ")} tone={OUTCOME_TONE[r.outcome] || "neutral"} /></Td>
                    <Td style={{ fontSize: 12, color: C.textSec }}>{r.assessment_title || (r.assessment_id ? `#${r.assessment_id}` : "—")}</Td>
                    <Td style={{ fontSize: 12, color: C.textSec }}>{r.student_name || r.student_username || (r.student_id ? `#${r.student_id}` : "—")}</Td>
                    <Td style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>{r.ip || "—"}</Td>
                  </tr>
                  {expanded === r.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: "10px 14px 14px", background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, wordBreak: "break-word" }}>Device: {r.device || "—"} · HTTP {r.http_status ?? "—"}</div>
                        <pre style={{ margin: 0, fontSize: 12, color: C.textSec, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{prettyDetails(r.details) || "No extra details."}</pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: C.textSec }}>
        <span>{total.toLocaleString()} event{total === 1 ? "" : "s"}</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ActionButton onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</ActionButton>
          Page {page} of {pages}
          <ActionButton onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</ActionButton>
        </span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEVICE SESSIONS — grouped by where each device is
   Active · Locked · Not started · Submitted, with a count, the STEP each
   device has reached, search, per-group CSV reports and mass unlock.
   Data: GET /e-assessments/admin/exam-sessions (already grouped/stepped
   server-side — see describeExamSession in eAssessment.controller.js).
═══════════════════════════════════════════════════════════ */
const STEP_NAMES = ["Token issued", "Entered", "Answering", "Submitted"];
const GROUPS = [
  { key: "active",      title: "Active",      tone: "success", hint: "Connected and sitting the exam right now." },
  { key: "locked",      title: "Locked",      tone: "danger",  hint: "Locked by the device rules. Their saved answers are submitted automatically when the time ends." },
  { key: "not_started", title: "Not started", tone: "neutral", hint: "Token issued but the student hasn't entered yet (or was unlocked and hasn't resumed)." },
  { key: "submitted",   title: "Submitted",   tone: "accent",  hint: "Finished — submitted by the student or automatically at time up." },
];
const PAGE_ROWS = 50;

function StepTracker({ step, locked }) {
  const C = useC();
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }} role="img" aria-label={`Step ${step} of 4: ${STEP_NAMES[step - 1]}${locked ? " (locked)" : ""}`}>
      {STEP_NAMES.map((name, i) => {
        const n = i + 1;
        const done = n < step;
        const cur = n === step;
        const color = cur ? (locked ? C.danger : step === 4 ? C.accent : C.success) : done ? C.success : C.border;
        return (
          <React.Fragment key={name}>
            <div title={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 56 }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%", boxSizing: "border-box",
                background: cur || done ? color : "transparent", border: `2px solid ${color}`,
                color: "#fff", fontSize: 10, fontWeight: 800, lineHeight: "12px", textAlign: "center",
              }}>{done ? "✓" : cur && locked ? "!" : ""}</span>
              <span style={{ fontSize: 9.5, marginTop: 3, fontWeight: cur ? 800 : 500, color: cur ? color : C.textMuted, whiteSpace: "nowrap" }}>{name}</span>
            </div>
            {n < 4 && <span style={{ flex: "0 0 12px", height: 2, marginTop: 7, background: done ? C.success : C.border }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const timeLeftText = (sess) => {
  if (sess.seconds_left == null) return "—";
  if (sess.seconds_left <= 0) return "Time up";
  const m = Math.ceil(sess.seconds_left / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m} min left`;
};
const lastSignalText = (sess) => {
  if (sess.last_heartbeat_age == null && !sess.last_heartbeat) return "—";
  return fmtDateTime(sess.last_heartbeat);
};

// CSV that opens correctly in Excel (BOM) and can't be abused as a formula.
function downloadSessionsCsv(rows, filename) {
  const esc = (v) => {
    let t = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const head = ["Student", "Class", "Username", "Assessment", "Subject", "Token", "Group", "Step", "Progress", "Answered", "Total questions",
    "Time left", "Connection", "Last signal", "Device", "Lock reason", "Locked at", "Entered at", "Submitted at", "Auto-submitted", "Violation photos"];
  const lines = [head.map(esc).join(",")];
  for (const r of rows) {
    lines.push([
      r.student_name || `#${r.student_id}`, r.student_class, r.student_username, r.assessment_title, r.subject_name, r.token,
      (GROUPS.find((g) => g.key === r.group) || {}).title || r.group,
      `${r.step}/4 ${STEP_NAMES[(r.step || 1) - 1]}`, r.step_label, r.answered_count, r.total_questions,
      r.group === "active" || r.group === "locked" ? timeLeftText(r) : "",
      r.group === "active" ? (r.connection === "online" ? "Online" : "No signal") : "",
      r.last_heartbeat ? new Date(r.last_heartbeat).toLocaleString() : "",
      r.device_label, r.group === "locked" ? r.lock_reason : "",
      r.locked_at && r.group === "locked" ? new Date(r.locked_at).toLocaleString() : "",
      r.activated_at ? new Date(r.activated_at).toLocaleString() : "",
      r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "",
      r.group === "submitted" ? (r.auto_submitted ? "Yes" : "No") : "",
      r.photo_count || 0,
    ].map(esc).join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

// PDF report of device sessions (landscape A4) — one table per group, coloured by group.
async function downloadSessionsPdf(rows, filename, title = "Device Sessions") {
  const [{ default: jsPDF }, atMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = atMod.default || atMod.autoTable;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const rgb = { active: [22, 163, 74], locked: [220, 38, 38], not_started: [100, 116, 139], submitted: [37, 99, 235] };
  const school = await getSchoolInfo();
  const top = drawSchoolHeader(doc, school, { margin: 40, top: 24 });
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(20);
  doc.text(title, 40, top + 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110);
  doc.text(`Generated ${new Date().toLocaleString()}  ·  ${rows.length} device${rows.length === 1 ? "" : "s"}`, 40, top + 27);

  // summary counts in group colours
  let x = 40;
  GROUPS.forEach((g) => {
    const n = rows.filter((r) => r.group === g.key).length;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...rgb[g.key]);
    doc.text(String(n), x, top + 54);
    doc.setFontSize(9); doc.text(g.title.toUpperCase(), x + doc.getTextWidth(String(n)) + 6, top + 54);
    x += 130;
  });

  let y = top + 70;
  GROUPS.forEach((g) => {
    const list = rows.filter((r) => r.group === g.key);
    if (!list.length) return;
    const c = rgb[g.key];
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [[{ content: `${g.title} (${list.length})`, colSpan: 7, styles: { fillColor: c, textColor: 255, fontSize: 10 } }],
        ["Student", "Class", "Assessment", "Step", g.key === "locked" ? "Lock reason" : "Time / Status", "Device", "Photos"]],
      body: list.map((r) => [
        r.student_name || `#${r.student_id}`, r.student_class || "—", r.assessment_title || "—",
        `${r.step}/4 ${STEP_NAMES[(r.step || 1) - 1]}`,
        g.key === "locked" ? `${r.lock_reason || "No reason recorded"}${r.locked_at ? " (" + new Date(r.locked_at).toLocaleString() + ")" : ""}`
          : g.key === "submitted" ? `${r.auto_submitted ? "Auto-submitted" : "By student"}${r.submitted_at ? " · " + new Date(r.submitted_at).toLocaleString() : ""}`
          : g.key === "active" ? `${timeLeftText(r)} · ${r.connection === "online" ? "Online" : "No signal"}` : (r.step_label || "—"),
        r.device_label || "—", r.photo_count || 0,
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [241, 245, 249], textColor: 40, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      didDrawPage: () => {
        doc.setFontSize(8); doc.setTextColor(140);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, W - 70, doc.internal.pageSize.getHeight() - 18);
      },
    });
    y = doc.lastAutoTable.finalY + 18;
  });
  doc.save(filename);
}

function DeviceSessionsPanel({ sessions, saving, onUnlock, onBulkUnlock, onStop, onSubmit, onBulkStop, onBulkSubmit, onCancelResit, onPhotos }) {
  const C = useC();
  const [q, setQ] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
    const [shown, setShown] = useState({});          // rows shown per group (paging)
  const [picked, setPicked] = useState(() => new Set()); // ticked locked session ids
  const [watching, setWatching] = useState(null);   // session being watched live

  const assessmentOptions = useMemo(() => {
    const m = new Map();
    sessions.forEach((s) => { if (s.e_assessment_id && !m.has(s.e_assessment_id)) m.set(s.e_assessment_id, s.assessment_title || `#${s.e_assessment_id}`); });
    return [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [sessions]);

  // Search + assessment filter apply to every group and to every count.
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sessions.filter((s) => {
      if (assessmentId && String(s.e_assessment_id) !== assessmentId) return false;
      if (!term) return true;
      const hay = [s.student_name, s.student_class, s.student_username, s.assessment_title, s.subject_name, s.token,
        s.device_label, s.lock_reason, s.step_label].join(" ").toLowerCase();
      return term.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [sessions, q, assessmentId]);

  const byGroup = useMemo(() => {
    const out = { active: [], locked: [], not_started: [], submitted: [] };
    filtered.forEach((s) => { (out[s.group] || out.not_started).push(s); });
    return out;
  }, [filtered]);

  const totals = useMemo(() => {
    const out = { active: 0, locked: 0, not_started: 0, submitted: 0 };
    sessions.forEach((s) => { if (assessmentId && String(s.e_assessment_id) !== assessmentId) return; out[s.group] = (out[s.group] || 0) + 1; });
    return out;
  }, [sessions, assessmentId]);

  // Drop ticks for sessions that are no longer locked (unlocked / auto-submitted / refreshed away).
  useEffect(() => {
    const lockedIds = new Set(sessions.filter((s) => s.group === "locked").map((s) => s.id));
    setPicked((prev) => {
      const next = new Set([...prev].filter((id) => lockedIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sessions]);

  const searching = q.trim().length > 0; // individual rows render only once something is searched
  const lockedVisible = byGroup.locked;
  const pickedVisible = lockedVisible.filter((s) => picked.has(s.id));
  const allPicked = lockedVisible.length > 0 && pickedVisible.length === lockedVisible.length;
  const stamp = new Date().toISOString().slice(0, 10);
  const filterNote = q.trim() || assessmentId ? " (current search/filter)" : "";

  const confirmUnlock = (rows, label) => {
    if (!rows.length) return;
    if (!window.confirm(`Unlock ${label} (${rows.length} device${rows.length === 1 ? "" : "s"})?\n\nEach student will see a Resume button and can continue on the device they choose.`)) return;
    onBulkUnlock(rows.map((r) => r.id));
  };

  const input = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 13, minWidth: 0 };

  const columnsFor = (key) => {
    const student = { label: "Student", render: (s) => (
      <>
        <div style={{ fontWeight: 600, color: C.textPri }}>{s.student_name || `#${s.student_id}`}</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>{[s.student_class, s.student_username].filter(Boolean).join(" · ") || "—"}</div>
      </>) };
    const assessment = { label: "Assessment", render: (s) => <span style={{ color: C.textSec, fontSize: 13 }}>{s.assessment_title || "—"}</span> };
    const token = { label: "Token", render: (s) => <span style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em", color: C.textPri }}>{s.token}</span> };
    const step = { label: "Step", render: (s) => (
      <div style={{ minWidth: 230 }}>
        <StepTracker step={s.step} locked={s.group === "locked"} />
        <div style={{ fontSize: 11.5, color: s.group === "locked" ? C.danger : C.textSec, fontWeight: 600, marginTop: 4 }}>{s.step_label}</div>
      </div>) };
    const device = { label: "Device", render: (s) => <span style={{ color: C.textMuted, fontSize: 12 }}>{s.device_label || "—"}</span> };
    const photos = { label: "Photos", render: (s) => s.photo_count > 0
      ? <MiniBtn neutral icon={<Camera size={12} />} onClick={() => onPhotos(s)}>{s.photo_count}</MiniBtn>
      : <span style={{ color: C.textMuted, fontSize: 12 }}>—</span> };
    const timeLeft = { label: "Time left", render: (s) => {
      const up = s.seconds_left != null && s.seconds_left <= 0;
      return <span style={{ fontSize: 12, fontWeight: 600, color: up ? C.warning || C.danger : C.textSec }}>{up && s.group === "locked" ? "Time up — auto-submitting" : timeLeftText(s)}</span>;
    } };

    const watchBtn = (s, label = "Watch") => <MiniBtn neutral icon={<Eye size={12} />} onClick={() => setWatching(s)} title="See this student's live activity and answers">{label}</MiniBtn>;
    const stopBtn = (s) => <MiniBtn tone="warning" icon={<Pause size={12} />} disabled={saving} onClick={() => onStop(s)} title="Pause this exam — the student's screen locks; Unlock lets them continue">Stop</MiniBtn>;
    const submitBtn = (s) => <MiniBtn tone="danger" icon={<Send size={12} />} disabled={saving} onClick={() => onSubmit(s)} title="Submit this student's last autosaved answers now (final)">Submit</MiniBtn>;

    if (key === "active") return [student, assessment, step, timeLeft,
      { label: "Connection", render: (s) => (
        <>
          <Chip text={s.connection === "online" ? "Online" : "No signal"} tone={s.connection === "online" ? "success" : "warning"} />
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{lastSignalText(s)}</div>
        </>) }, device, photos,
      { label: "Actions", render: (s) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{watchBtn(s)}{stopBtn(s)}{submitBtn(s)}</div> }];
    if (key === "locked") return [
      { label: <input type="checkbox" checked={allPicked} onChange={(e) => setPicked(e.target.checked ? new Set(lockedVisible.map((s) => s.id)) : new Set())} aria-label="Select all locked devices shown" />,
        render: (s) => <input type="checkbox" checked={picked.has(s.id)} aria-label={`Select ${s.student_name || s.student_id}`}
          onChange={(e) => setPicked((prev) => { const n = new Set(prev); e.target.checked ? n.add(s.id) : n.delete(s.id); return n; })} /> },
      student, assessment, step,
      { label: "Lock reason", render: (s) => (
        <div style={{ color: C.danger, fontSize: 12, fontWeight: 600, maxWidth: 240 }}>
          {s.lock_reason || "No reason recorded"}
          {s.locked_at ? <div style={{ fontWeight: 400, color: C.textMuted, marginTop: 2 }}>{fmtDateTime(s.locked_at)}</div> : null}
        </div>) },
      timeLeft, device, photos,
      { label: "Actions", render: (s) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {watchBtn(s)}
          <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving} onClick={() => onUnlock(s.id)}>Unlock</MiniBtn>
          {submitBtn(s)}
        </div>) }];
    if (key === "not_started") return [student, assessment, token, step,
      { label: "Issued", render: (s) => <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(s.issued_at)}</span> },
      { label: "Actions", render: (s) => s.resit_allowed
        ? <MiniBtn tone="warning" onClick={() => onCancelResit(s)}>Cancel resit</MiniBtn>
        : <span style={{ color: C.textMuted, fontSize: 12 }}>—</span> }];
    return [student, assessment, step,
      { label: "Submitted", render: (s) => <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(s.submitted_at || s.ended_at)}</span> },
      { label: "How", render: (s) => <Chip text={s.auto_submitted ? "Auto-submitted" : "By student"} tone={s.auto_submitted ? "warning" : "success"} /> },
      photos,
      { label: "Actions", render: (s) => watchBtn(s, "View") }];
  };

  return (
    <>
      {/* counts — bold coloured numbers, click one to jump to its group */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 36px", marginBottom: 16, alignItems: "baseline" }}>
        {GROUPS.map((g) => {
          const color = g.tone === "neutral" ? C.textSec : C[g.tone];
          return (
            <div key={g.key}
              style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontFamily: "inherit", color }}>
              <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color }}>{byGroup[g.key].length}{byGroup[g.key].length !== totals[g.key] ? <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.7 }}> / {totals[g.key]}</span> : null}</span>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color }}>{g.title}</span>
            </div>
          );
        })}
      </div>

      {/* search + filter + download everything */}
      <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input style={{ ...input, flex: "1 1 240px" }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a student, class, username, token, assessment… to see individual devices" aria-label="Search devices" />
        <select style={{ ...input, maxWidth: 240 }} value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} aria-label="Filter by assessment">
          <option value="">All assessments</option>
          {assessmentOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        {(q || assessmentId) && <MiniBtn neutral onClick={() => { setQ(""); setAssessmentId(""); }}>Clear</MiniBtn>}
        <MiniBtn neutral icon={<IconDownload size={12} />} disabled={!filtered.length} title="One report with every group"
          onClick={() => downloadSessionsCsv(filtered, `device-sessions-all-${stamp}.csv`)}>Download all (CSV)</MiniBtn>
        <MiniBtn neutral icon={<IconDownload size={12} />} disabled={!filtered.length} title="One PDF with every group"
          onClick={() => downloadSessionsPdf(filtered, `device-sessions-all-${stamp}.pdf`, "Device Sessions — All Groups")}>Download all (PDF)</MiniBtn>
      </div>

      {!searching && (
        <p style={{ margin: "0 2px 12px", fontSize: 12, color: C.textMuted }}>
          Individual devices aren't listed until you search. The buttons below act on the whole group{assessmentId ? " for the chosen assessment" : ""}.
        </p>
      )}

      {GROUPS.map((g) => {
        const rows = byGroup[g.key];
        const isOpen = searching; // rows only appear for a search; otherwise just the count + actions
        const limit = shown[g.key] || PAGE_ROWS;
        const cols = columnsFor(g.key);
        return (
          <div key={g.key} id={`dev-group-${g.key}`} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.textPri }}>{g.title}</span>
                <Chip text={String(rows.length)} tone={g.tone} />
              </div>
              <span style={{ fontSize: 12, color: C.textMuted, flex: "1 1 200px" }}>{g.hint}</span>
              {g.key === "locked" && lockedVisible.length > 0 && (
                <>
                  <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving || !pickedVisible.length} onClick={() => confirmUnlock(pickedVisible, "the selected devices")}>Unlock selected ({pickedVisible.length})</MiniBtn>
                  <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving} onClick={() => confirmUnlock(lockedVisible, filterNote ? "all locked devices in this search" : "ALL locked devices")}>Unlock all ({lockedVisible.length})</MiniBtn>
                </>
              )}
              {(g.key === "active" || g.key === "locked") && rows.length > 0 && (
                <>
                  {g.key === "active" && (
                    <MiniBtn tone="warning" icon={<Pause size={12} />} disabled={saving} onClick={() => onBulkStop(rows.map((r) => r.id), filterNote ? "all active exams in this search" : "ALL active exams")}>Stop all ({rows.length})</MiniBtn>
                  )}
                  <MiniBtn tone="danger" icon={<Send size={12} />} disabled={saving} onClick={() => onBulkSubmit(rows.map((r) => r.id), filterNote ? `all ${g.key} exams in this search` : `ALL ${g.key} exams`)}>Submit all ({rows.length})</MiniBtn>
                </>
              )}
              <MiniBtn neutral icon={<IconDownload size={12} />} disabled={!rows.length} title={`Download the ${g.title} group${filterNote}`}
                onClick={() => downloadSessionsCsv(rows, `device-sessions-${g.key.replace("_", "-")}-${stamp}.csv`)}>Download CSV</MiniBtn>
              <MiniBtn neutral icon={<IconDownload size={12} />} disabled={!rows.length} title={`Download the ${g.title} group as PDF${filterNote}`}
                onClick={() => downloadSessionsPdf(rows, `device-sessions-${g.key.replace("_", "-")}-${stamp}.pdf`, `Device Sessions — ${g.title}`)}>Download PDF</MiniBtn>
            </div>

            {isOpen && (rows.length === 0 ? (
              <div className="dash-card" style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: "14px 16px", color: C.textMuted, fontSize: 13 }}>
                {sessions.length && (q || assessmentId) ? `No ${g.title.toLowerCase()} devices match this search.` : `No ${g.title.toLowerCase()} devices right now.`}
              </div>
            ) : (
              <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead><tr>{cols.map((c, i) => <Th key={i}>{c.label}</Th>)}</tr></thead>
                  <tbody>
                    {rows.slice(0, limit).map((s) => (
                      <tr key={s.id} className="row-hover">{cols.map((c, i) => <Td key={i}>{c.render(s)}</Td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > limit && (
                  <div style={{ padding: 10, textAlign: "center" }}>
                    <MiniBtn neutral onClick={() => setShown((p) => ({ ...p, [g.key]: limit + PAGE_ROWS }))}>Show more ({rows.length - limit} more)</MiniBtn>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {watching && (
        <LiveActivityModal
          sess={sessions.find((x) => x.id === watching.id) || watching}
          saving={saving}
          onClose={() => setWatching(null)}
          onStop={onStop}
          onSubmit={onSubmit}
          onUnlock={onUnlock}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LiveActivityModal — watch ONE student's exam: connection, time left,
   the answers saved so far, and their recent events. Refreshes every 5s
   while open. Stop / Submit / Unlock work from here too.
   Data: GET /e-assessments/admin/exam-sessions/:id/activity
═══════════════════════════════════════════════════════════ */
function LiveActivityModal({ sess, saving, onClose, onStop, onSubmit, onUnlock }) {
  const C = useC();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("answers");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await API.get(`/e-assessments/admin/exam-sessions/${sess.id}/activity`);
        if (alive) { setData(r.data); setErr(""); }
      } catch (e) {
        if (alive) setErr(e?.response?.data?.message || "Could not load the live activity");
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [sess.id, sess.status]);

  const live = data?.session || sess;
  const status = sess.status || live.status;
  const secs = live.seconds_left;
  const timeText = secs == null ? "—" : secs <= 0 ? "Time up" : `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s left`;
  const hb = live.last_heartbeat_age == null ? "—" : live.last_heartbeat_age < 60 ? `${live.last_heartbeat_age}s ago` : `${Math.floor(live.last_heartbeat_age / 60)} min ago`;
  const statusTone = { active: "success", locked: "danger", ended: "accent", issued: "neutral" }[status] || "neutral";
  const statusText = { active: "Active", locked: "Locked / stopped", ended: "Submitted", issued: "Not started" }[status] || status;
  const stat = { padding: "9px 12px", background: C.bgAlt, borderRadius: 8, minWidth: 110 };
  const statLabel = { fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 };
  const statVal = { fontSize: 14, fontWeight: 700, color: C.textPri, marginTop: 2 };
  const tabBtn = (k, label) => (
    <button onClick={() => setTab(k)} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
      background: tab === k ? C.bgAlt : "transparent", color: tab === k ? C.textPri : C.textMuted }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 12 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 14, padding: "22px 22px 18px", width: "100%", maxWidth: 880, maxHeight: "92vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPri }}>{live.student_name || `Student #${live.student_id}`}</h2>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>
              {[live.student_class, live.assessment_title, live.subject_name].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose} aria-label="Close"><IconX size={14} /></button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div style={stat}><div style={statLabel}>Status</div><div style={statVal}><Chip text={statusText} tone={statusTone} /></div></div>
          <div style={stat}><div style={statLabel}>Connection</div><div style={statVal}>{status === "active" ? (live.connection === "online" ? "Online" : "No signal") : "—"}</div></div>
          <div style={stat}><div style={statLabel}>Last signal</div><div style={statVal}>{hb}</div></div>
          <div style={stat}><div style={statLabel}>Time left</div><div style={statVal}>{status === "ended" ? "—" : timeText}</div></div>
          <div style={stat}><div style={statLabel}>Answered</div><div style={statVal}>{data ? `${data.progress.answered} of ${data.progress.total}` : "…"}</div></div>
          <div style={stat}><div style={statLabel}>Photos</div><div style={statVal}>{live.photo_count ?? 0}</div></div>
        </div>

        {status === "locked" && live.lock_reason && (
          <div style={{ color: C.danger, fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>Lock reason: {live.lock_reason}</div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {status === "active" && <MiniBtn tone="warning" icon={<Pause size={12} />} disabled={saving} onClick={() => onStop(live)}>Stop exam</MiniBtn>}
          {status === "locked" && <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving} onClick={() => onUnlock(live.id)}>Unlock</MiniBtn>}
          {(status === "active" || status === "locked") && <MiniBtn tone="danger" icon={<Send size={12} />} disabled={saving} onClick={() => onSubmit(live)}>Submit now</MiniBtn>}
          <span style={{ fontSize: 11.5, color: C.textMuted, alignSelf: "center" }}>Refreshes every 5 seconds</span>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{tabBtn("answers", "Answers so far")}{tabBtn("events", `Activity (${data?.events?.length ?? 0})`)}</div>

        {err && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        {!data && !err && <div style={{ color: C.textMuted, fontSize: 13 }}>Loading…</div>}

        {data && tab === "answers" && (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: C.textMuted }}>
              {data.progress.source === "autosave" ? `From the student's last autosave${data.progress.saved_at ? ` (${fmtDateTime(data.progress.saved_at)})` : ""} — the device syncs about every 30 seconds, so the newest typing may not show yet.`
                : data.progress.source === "submission" ? "The submitted answers." : "Nothing has been saved yet."}
            </p>
            {data.answers.map((a, i) => (
              <div key={a.question_id} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Q{i + 1} · {a.type} · {a.marks} mark{a.marks === 1 ? "" : "s"} — {a.question}</div>
                {a.answer
                  ? <div style={{ fontSize: 13, color: C.textPri, wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: answerToSafeHtml(a.answer) }} />
                  : <div style={{ fontSize: 12.5, color: C.textMuted, fontStyle: "italic" }}>No answer yet</div>}
              </div>
            ))}
          </>
        )}

        {data && tab === "events" && (
          data.events.length === 0
            ? <div style={{ color: C.textMuted, fontSize: 13 }}>No events recorded for this student on this exam yet.</div>
            : <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                  <thead><tr><Th>Time</Th><Th>Who</Th><Th>What</Th><Th>Result</Th><Th>Device / IP</Th></tr></thead>
                  <tbody>
                    {data.events.map((e, i) => (
                      <tr key={i}>
                        <Td><span style={{ fontSize: 12, color: C.textMuted }}>{fmtDateTime(e.created_at)}</span></Td>
                        <Td><span style={{ fontSize: 12.5, color: C.textSec }}>{e.actor_role || "—"}</span></Td>
                        <Td><span style={{ fontSize: 12.5, color: C.textPri, fontWeight: 600 }}>{String(e.action || "").replace(/_/g, " ")}</span></Td>
                        <Td><Chip text={e.outcome || "—"} tone={e.outcome === "success" ? "success" : e.outcome ? "warning" : "neutral"} /></Td>
                        <Td><span style={{ fontSize: 11.5, color: C.textMuted }}>{[e.device, e.ip].filter(Boolean).join(" · ") || "—"}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  const C = useC();
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "56px 24px", textAlign: "center", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: C.textMuted }}>{icon}</div>
      <p style={{ color: C.textSec, fontSize: 14, margin: 0 }}>{text}</p>
    </div>
  );
}

function MetaRow({ label, value }) {
  const C = useC();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.bgAlt, borderRadius: 7 }}>
      <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
      <span title={typeof value === "string" ? value : undefined} style={{ fontSize: 13, fontWeight: 600, color: C.textSec, maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function Th({ children }) {
  const C = useC();
  return (
    <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", background: C.bgAlt }}>
      {children}
    </th>
  );
}

function Td({ children, style }) {
  const C = useC();
  return (
    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

function DetailRow({ label, value }) {
  const C = useC();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px", background: C.bgAlt, borderRadius: 8, gap: 14 }}>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri, textAlign: "right", wordBreak: "break-word" }}>{value ?? "—"}</span>
    </div>
  );
}

function ActionButton({ children, icon, onClick, primary }) {
  const C = useC();
  return (
    <button onClick={onClick} className="btn-hover" style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "8px 14px", borderRadius: 8,
      border: `1px solid ${primary ? C.accent : C.border}`,
      background: primary ? C.accent : C.card,
      color: primary ? C.white : C.textSec,
      fontWeight: 600, fontSize: 13, cursor: "pointer",
    }}>
      {icon}{children}
    </button>
  );
}

function MiniBtn({ children, icon, onClick, tone, grow, full, neutral, title, style, disabled }) {
  const C = useC();
  const color = neutral || !tone ? C.textSec : C[tone] || C.textSec;
  return (
    <button onClick={onClick} title={title} disabled={disabled} className="btn-hover" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
      padding: children ? "7px 12px" : "7px 9px", borderRadius: 7,
      border: `1px solid ${C.border}`, background: C.bgAlt, color,
      fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      flex: grow ? 1 : full ? "1 1 100%" : "0 0 auto",
      width: full ? "100%" : undefined,
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

/* Shown above the lists that have resit checkboxes once at least one student is ticked. */
function ResitSelectionBar({ count, onAllow, onClear }) {
  const C = useC();
  return (
    <div role="region" aria-label="Bulk resit" style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14, padding: "10px 14px",
      borderRadius: 12, border: `1px solid ${C.accent}`, background: "var(--primary-tint, transparent)",
    }}>
      <strong style={{ fontSize: 13.5, color: C.textPri }}>{count} selected</strong>
      <span style={{ flex: 1 }} />
      <MiniBtn tone="warning" icon={<IconZap size={12} />} onClick={onAllow}>Allow resit ({count})</MiniBtn>
      <MiniBtn neutral onClick={onClear}>Clear</MiniBtn>
    </div>
  );
}

function DropItem({ children, icon, onClick, disabled, tone }) {
  const C = useC();
  const toneColor = { success: C.success, danger: C.danger, warning: C.warning, accent: C.accent }[tone];
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "12px 16px",
        background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`,
        color: disabled ? C.textMuted : (toneColor || C.textSec), textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}{children}
    </button>
  );
}

function DropDivider() {
  const C = useC();
  return <div style={{ height: 6, background: C.bgAlt, borderBottom: `1px solid ${C.border}` }} />;
}

function FieldLabel({ children }) {
  const C = useC();
  return (
    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </p>
  );
}

function SaveButton({ onClick, loading, label, icon }) {
  const C = useC();
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: 13, border: "none", borderRadius: 9,
      background: loading ? C.textMuted : C.accent, color: C.white,
      fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 8,
    }}>
      {loading ? "Please wait…" : <>{icon}{label}</>}
    </button>
  );
}

// Stored times are EAT wall-clock digits labelled as UTC, so the UTC getters
// give back exactly what the admin typed (datetime-local wants no zone).
const toLocalInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
};

function AccessScheduleForm({ a, data, onSave }) {
  const C = useC();
  const [restrict, setRestrict] = useState(!!data.restrict_students);
  const [picked, setPicked] = useState(() => new Set(data.allowed_student_ids || []));
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(toLocalInput(data.available_from));
  const [until, setUntil] = useState(toLocalInput(data.available_until));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = (data.students || []).filter((s) =>
      !t || `${s.name || ""} ${s.username || ""} ${s.studentClass || ""}`.toLowerCase().includes(t));
    return rows;
  }, [q, data.students]);
  const MAX_ROWS = 300;

  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectShown = () => setPicked((p) => { const n = new Set(p); shown.forEach((s) => n.add(s.id)); return n; });
  const clearShown = () => setPicked((p) => { const n = new Set(p); shown.forEach((s) => n.delete(s.id)); return n; });

  const submit = async () => {
    setErr("");
    if (restrict && picked.size === 0) return setErr("Pick at least one trainee, or choose “All active trainees”.");
    if (from && until && until <= from) return setErr("The finish time must be after the start time.");
    setSaving(true);
    await onSave({
      restrict_students: restrict,
      student_ids: restrict ? [...picked] : (data.allowed_student_ids || []),
      available_from: from || null,
      available_until: until || null,
    });
    setSaving(false);
  };

  const radio = (on, label, hint, onClick) => (
    <label onClick={onClick} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 8, background: C.bgAlt, border: `1px solid ${on ? C.accent : C.border}` }}>
      <input type="radio" readOnly checked={on} style={{ marginTop: 3, accentColor: C.accent }} />
      <span><div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{label}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{hint}</div></span>
    </label>
  );

  return (
    <div>
      <FieldLabel>Who can sit this paper</FieldLabel>
      {radio(!restrict, "All active trainees (default)", "Every active trainee in this assessment's class / year. Inactive or suspended trainees are always blocked.", () => setRestrict(false))}
      {radio(restrict, "Only selected trainees", "Only the trainees you tick below can see and sit it.", () => setRestrict(true))}

      {restrict && (
        <div style={{ marginBottom: 14 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username or class…"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
            <span>{picked.size} selected · {shown.length} shown</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={selectShown} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Select shown</button>
              <button type="button" onClick={clearShown} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Clear shown</button>
            </span>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
            {shown.length === 0 && <div style={{ padding: 14, fontSize: 12, color: C.textMuted }}>No active trainees found for this class / year.</div>}
            {shown.slice(0, MAX_ROWS).map((s) => (
              <label key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 12px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontSize: 13, color: C.textPri }}>
                <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} style={{ accentColor: C.accent }} />
                <span style={{ flex: 1, minWidth: 0 }}>{s.name || s.username}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{s.studentClass || ""}</span>
              </label>
            ))}
          </div>
          {shown.length > MAX_ROWS && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Showing the first {MAX_ROWS}. Type in the search box to narrow the list.</div>}
        </div>
      )}

      <FieldLabel>Start &amp; finish (East Africa Time)</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>Opens</div>
          <ModalInput type="datetime-local" value={from} onChange={setFrom} />
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>Closes</div>
          <ModalInput type="datetime-local" value={until} onChange={setUntil} />
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: -4, marginBottom: 6 }}>
        Leave both empty for no time limit. It opens by itself at the start time and closes at the finish time;
        trainees can't enter outside these times. A trainee already sitting keeps their own timer.
        {a.status !== "approved" && (from || until) ? " Note: this assessment isn't approved yet, so it will not open automatically until it is." : ""}
        {(from || until) && (
          <> <button type="button" onClick={() => { setFrom(""); setUntil(""); }} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 11.5, fontWeight: 600, padding: 0 }}>Clear times</button></>
        )}
      </div>

      {err && <div style={{ color: C.danger || "#b45309", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
      <SaveButton onClick={submit} loading={saving} label="Save" />
    </div>
  );
}


/* "Students" tab: search every detail of every student and Activate /
   Deactivate them. A deactivated student is blocked from ALL e-assessments
   (their portal account itself is untouched). */
function StudentActivationPanel({ showToast }) {
  const C = useC();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | deactivated
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const MAX_ROWS = 300;

  useEffect(() => {
    let live = true;
    API.get("/e-assessments/admin/students-activation")
      .then((r) => { if (live) setRows(r.data?.students || []); })
      .catch((err) => { if (live) { setRows([]); showToast(err?.response?.data?.message || "Failed to load students", "error"); } });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (rows || []).filter((s) => {
      if (filter === "active" && s.deactivated) return false;
      if (filter === "deactivated" && !s.deactivated) return false;
      if (!terms.length) return true;
      // every typed word must match SOME detail of the student
      const hay = [s.name, s.admissionNo, s.username, s.studentClass, s.yearOfStudy, s.gender, s.email, s.phone,
        s.assessmentNumber, s.status, s.deactivated ? "deactivated inactive" : "active"]
        .map((v) => String(v ?? "").toLowerCase()).join(" ");
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, q, filter]);

  const counts = useMemo(() => {
    const all = rows || [];
    const off = all.filter((s) => s.deactivated).length;
    return { all: all.length, deactivated: off, active: all.length - off };
  }, [rows]);

  const apply = async (ids, active) => {
    if (!ids.length || busy) return;
    setBusy(true);
    try {
      const res = await API.put("/e-assessments/admin/students-activation/status", { student_ids: ids, active });
      const set = new Set(ids);
      setRows((prev) => prev.map((s) => (set.has(s.id) ? { ...s, deactivated: !active } : s)));
      setPicked((p) => { const n = new Set(p); ids.forEach((i) => n.delete(i)); return n; });
      showToast(res.data?.message || "Saved");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update", "error");
    } finally { setBusy(false); }
  };

  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const visible = shown.slice(0, MAX_ROWS);
  const allVisiblePicked = visible.length > 0 && visible.every((s) => picked.has(s.id));
  const toggleVisible = () => setPicked((p) => {
    const n = new Set(p);
    if (allVisiblePicked) visible.forEach((s) => n.delete(s.id)); else visible.forEach((s) => n.add(s.id));
    return n;
  });
  const pickedIds = [...picked];

  const chip = (key, label, n) => (
    <button type="button" onClick={() => setFilter(key)} style={{
      padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
      border: `1px solid ${filter === key ? C.accent : C.border}`,
      background: filter === key ? C.accent : C.bgAlt, color: filter === key ? "#fff" : C.textSec,
    }}>{label} ({n})</button>
  );
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.textMuted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", fontSize: 12.5, color: C.textPri, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };

  if (rows === null) return <div style={{ padding: 20, textAlign: "center", fontSize: 13 }}>Loading…</div>;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.textPri }}>Students</h2>
          <p style={{ margin: "6px 0 0", color: C.textSec, fontSize: 13, maxWidth: 640, lineHeight: 1.6 }}>
            Deactivating a student blocks them from <b>all</b> e-assessments — they won't see, sign in to or start any paper.
            Their portal account is not affected. Search by name, admission no., username, class, phone, email… anything.
          </p>
        </div>
      </div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any detail…"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chip("all", "All", counts.all)}{chip("active", "Active", counts.active)}{chip("deactivated", "Deactivated", counts.deactivated)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <MiniBtn tone="success" disabled={busy || !pickedIds.length} onClick={() => apply(pickedIds, true)}>Activate selected ({pickedIds.length})</MiniBtn>
          <MiniBtn tone="danger" disabled={busy || !pickedIds.length} onClick={() => apply(pickedIds, false)}>Deactivate selected ({pickedIds.length})</MiniBtn>
        </div>
      </div>

      <div style={{ overflow: "auto", maxHeight: "60vh", border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: C.card, zIndex: 1 }}>
            <tr>
              <th style={th}><input type="checkbox" checked={allVisiblePicked} onChange={toggleVisible} style={{ accentColor: C.accent }} /></th>
              <th style={th}>Name</th><th style={th}>Admission No.</th><th style={th}>Username</th><th style={th}>Class</th>
              <th style={th}>Year</th><th style={th}>Gender</th><th style={th}>Phone</th><th style={th}>Email</th>
              <th style={th}>Status</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={11} style={{ ...td, textAlign: "center", color: C.textMuted, padding: 18 }}>No students match.</td></tr>
            )}
            {visible.map((s) => (
              <tr key={s.id} style={{ opacity: s.deactivated ? 0.7 : 1 }}>
                <td style={td}><input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} style={{ accentColor: C.accent }} /></td>
                <td style={{ ...td, fontWeight: 600 }}>{s.name || "—"}</td>
                <td style={td}>{s.admissionNo || "—"}</td>
                <td style={td}>{s.username || "—"}</td>
                <td style={td}>{s.studentClass || "—"}</td>
                <td style={td}>{s.yearOfStudy ?? "—"}</td>
                <td style={td}>{s.gender || "—"}</td>
                <td style={td}>{s.phone || "—"}</td>
                <td style={td}>{s.email || "—"}</td>
                <td style={td}>
                  <span style={{ fontWeight: 700, color: s.deactivated ? C.danger : C.success }}>{s.deactivated ? "Deactivated" : "Active"}</span>
                  {!s.account_active && <div style={{ fontSize: 10.5, color: C.textMuted }}>account inactive</div>}
                </td>
                <td style={td}>
                  {s.deactivated
                    ? <MiniBtn tone="success" disabled={busy} onClick={() => apply([s.id], true)}>Activate</MiniBtn>
                    : <MiniBtn tone="danger" disabled={busy} onClick={() => apply([s.id], false)}>Deactivate</MiniBtn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>
        {shown.length} shown{shown.length > MAX_ROWS ? ` · first ${MAX_ROWS} displayed — type in the search box to narrow the list` : ""}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPLIT MARKING — give different QUESTIONS of one paper to different teachers
   (e.g. Section A → one teacher, Section B → another). Saved as a rule per
   question: it covers the answers already submitted and every paper that
   arrives later. Teachers see only the questions they were given.
═══════════════════════════════════════════════════════════ */
function SplitMarkingModal({ startAssessmentId, assessments, assignedTeachers, allTeachers, onClose, showToast, onSaved }) {
  const C = useC();
  const [aid, setAid] = useState(startAssessmentId || "");
  const [questions, setQuestions] = useState([]);
  const [choice, setChoice] = useState({}); // question_id -> teacher_id ("" = leave as is)
  const [checked, setChecked] = useState({}); // question_id -> true
  const [bulkTeacher, setBulkTeacher] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const assessment = assessments.find((a) => String(a.id) === String(aid));

  // Teachers who teach this assessment's subject first; everyone as a fallback.
  const teacherOptions = useMemo(() => {
    const subj = String(assessment?.subject || assessment?.subject_name || "").trim().toLowerCase();
    const seen = new Map();
    (assignedTeachers || []).forEach((t) => {
      if (subj && String(t.subject_name || "").trim().toLowerCase() !== subj) return;
      if (!seen.has(t.teacher_id)) seen.set(t.teacher_id, t.teacher_name || `Teacher #${t.teacher_id}`);
    });
    if (!seen.size) (allTeachers || []).forEach((t) => seen.set(t.id, t.name || `Teacher #${t.id}`));
    return [...seen.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [assessment, assignedTeachers, allTeachers]);

  const load = useCallback(async (id) => {
    if (!id) { setQuestions([]); return; }
    setLoading(true);
    try {
      const r = await API.get(`/e-assessments/admin/assessments/${id}/split`);
      const qs = r.data?.questions || [];
      setQuestions(qs);
      const c = {};
      qs.forEach((q) => { if (q.teacher_id) c[q.id] = String(q.teacher_id); });
      setChoice(c);
      setChecked({});
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not load the questions", "error");
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(aid); }, [aid, load]);

  const splittable = questions.filter((q) => q.splittable);
  const checkedIds = splittable.filter((q) => checked[q.id]).map((q) => q.id);
  const applyBulk = () => {
    if (!bulkTeacher || !checkedIds.length) return;
    setChoice((c) => { const n = { ...c }; checkedIds.forEach((id) => { n[id] = bulkTeacher; }); return n; });
    setChecked({});
  };

  // What the admin has set up, grouped by teacher.
  const parts = useMemo(() => {
    const by = {};
    Object.entries(choice).forEach(([qid, tid]) => { if (tid) (by[tid] ||= []).push(Number(qid)); });
    return Object.entries(by).map(([teacher_id, question_ids]) => ({ teacher_id: Number(teacher_id), question_ids }));
  }, [choice]);
  const nameOf = (tid) => teacherOptions.find(([id]) => String(id) === String(tid))?.[1] || `Teacher #${tid}`;

  const save = async () => {
    if (!parts.length) return;
    setSaving(true);
    try {
      const r = await API.post(`/e-assessments/admin/assessments/${aid}/split`, { parts });
      showToast(r.data?.message || "Split saved");
      onSaved?.();
      load(aid);
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not save the split", "error");
    } finally { setSaving(false); }
  };

  const clearAll = async () => {
    if (!window.confirm("Remove the split for this paper? Answers a teacher has already marked stay with them; the rest go back to normal assignment.")) return;
    setSaving(true);
    try {
      const r = await API.delete(`/e-assessments/admin/assessments/${aid}/split`);
      showToast(r.data?.message || "Split removed");
      onSaved?.();
      load(aid);
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not remove the split", "error");
    } finally { setSaving(false); }
  };

  const sel = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13, minWidth: 0 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPri }}>Split marking</h2>
          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}><IconX size={14} /></button>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textSec, lineHeight: 1.5 }}>
          Choose which teacher marks which questions of a paper — for example Section A to one teacher and Section B to another.
          Each teacher then sees only their questions. Papers submitted later follow the same split.
        </p>

        <select style={{ ...sel, width: "100%", marginBottom: 14 }} value={aid} onChange={(e) => setAid(e.target.value)} aria-label="Paper to split">
          <option value="">Choose the paper…</option>
          {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}{a.subject ? ` — ${a.subject}` : ""}</option>)}
        </select>

        {aid && loading && <p style={{ color: C.textMuted, fontSize: 13 }}>Loading questions…</p>}
        {aid && !loading && questions.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>This paper has no questions yet.</p>}
        {aid && !loading && questions.length > 0 && splittable.length === 0 && (
          <p style={{ color: C.textMuted, fontSize: 13 }}>This paper has no essay questions — multiple-choice questions are marked automatically, so there is nothing to split.</p>
        )}

        {splittable.length > 0 && (
          <>
            {teacherOptions.length === 0 && <p style={{ color: C.danger, fontSize: 13 }}>No teachers are assigned to this subject yet.</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10, padding: 10, background: C.bgAlt, borderRadius: 10 }}>
              <span style={{ fontSize: 12.5, color: C.textSec }}>{checkedIds.length} ticked →</span>
              <select style={sel} value={bulkTeacher} onChange={(e) => setBulkTeacher(e.target.value)} aria-label="Teacher for the ticked questions">
                <option value="">Choose a teacher…</option>
                {teacherOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <MiniBtn disabled={!bulkTeacher || !checkedIds.length} onClick={applyBulk}>Give ticked questions to them</MiniBtn>
              <MiniBtn neutral onClick={() => setChecked(Object.fromEntries(splittable.map((q) => [q.id, true])))}>Tick all</MiniBtn>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              {questions.map((q) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: `1px solid ${C.border}`, opacity: q.splittable ? 1 : 0.55 }}>
                  <input type="checkbox" disabled={!q.splittable} checked={!!checked[q.id]} onChange={(e) => setChecked((c) => ({ ...c, [q.id]: e.target.checked }))} aria-label={`Tick question ${q.number}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q{q.number}. {q.text || "(no text)"}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted }}>
                      {q.marks != null ? `${q.marks} mark${Number(q.marks) === 1 ? "" : "s"} · ` : ""}{q.splittable ? `${q.answers} answer${q.answers === 1 ? "" : "s"} submitted` : "Auto-marked — not split"}
                    </div>
                  </div>
                  {q.splittable && (
                    <select style={{ ...sel, width: 190 }} value={choice[q.id] || ""} onChange={(e) => setChoice((c) => ({ ...c, [q.id]: e.target.value }))} aria-label={`Teacher for question ${q.number}`}>
                      <option value="">Not split</option>
                      {teacherOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>

            {parts.length > 0 && (
              <div style={{ margin: "12px 0 0", fontSize: 12.5, color: C.textSec, lineHeight: 1.6 }}>
                {parts.map((p) => <div key={p.teacher_id}><strong style={{ color: C.textPri }}>{nameOf(p.teacher_id)}</strong>: {p.question_ids.length} question{p.question_ids.length === 1 ? "" : "s"}</div>)}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={save} disabled={saving || !parts.length}
                style={{ flex: 1, minWidth: 180, padding: 12, border: "none", borderRadius: 9, background: saving || !parts.length ? C.textMuted : C.accent, color: C.white || "#fff", fontWeight: 700, fontSize: 14, cursor: saving || !parts.length ? "not-allowed" : "pointer" }}>
                {saving ? "Please wait…" : "Save split & allocate"}
              </button>
              {questions.some((q) => q.teacher_id) && <MiniBtn tone="danger" disabled={saving} onClick={clearAll}>Remove split</MiniBtn>}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 11.5, color: C.textMuted }}>
              Questions already marked stay with whoever marked them. You can undo this from the assignment history on the Submissions tab.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  const C = useC();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 14, padding: "26px 26px 22px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPri }}>{title}</h2>
          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <IconX size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORT CARD MARKS — what students' report cards may show.
   One source at a time:
     • Nothing        -> report cards stay blank
     • One assessment -> only that assessment's subject + marks
                         (no CRNM for the other subjects)
     • A main exam    -> every subject scheduled in it, with its marks
═══════════════════════════════════════════════════════════ */
function ReportCardMarksModal({ onClose, showToast }) {
  const C = useC();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [opts, setOpts] = useState({ current: { mode: "none" }, assessments: [], exams: [] });
  const [mode, setMode] = useState("none");
  const [assessmentId, setAssessmentId] = useState("");
  const [examId, setExamId] = useState("");
  const [rel, setRel] = useState(null); // marking progress of the SAVED source

  const loadStatus = async () => {
    try {
      const { data } = await API.get("/e-assessments/admin/report-card-release-status");
      setRel(data);
    } catch { setRel(null); }
  };

  const loadAll = async (initial) => {
    try {
      const { data } = await API.get("/e-assessments/admin/report-card-options");
      setOpts(data);
      if (initial) {
        setMode(data.current?.mode || "none");
        if (data.current?.mode === "assessment") setAssessmentId(String(data.current.id));
        if (data.current?.mode === "exam") setExamId(String(data.current.id));
      }
      if (data.current?.mode && data.current.mode !== "none") await loadStatus(); else setRel(null);
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not load report card options", "error");
      if (initial) onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const picked = mode === "assessment" ? opts.assessments.find((a) => String(a.id) === assessmentId)
    : mode === "exam" ? opts.exams.find((e) => String(e.id) === examId) : null;

  const save = async () => {
    if (mode === "assessment" && !assessmentId) return showToast("Pick an assessment", "error");
    if (mode === "exam" && !examId) return showToast("Pick a main examination", "error");
    setSaving(true);
    try {
      await API.put("/e-assessments/admin/report-card-source", {
        mode, id: mode === "assessment" ? Number(assessmentId) : mode === "exam" ? Number(examId) : null,
      });
      showToast(mode === "none" ? "Report cards will stay blank" : `Report cards will now show “${picked?.title || picked?.name}”`);
      await loadAll(false);
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  const release = async () => {
    if (!rel?.complete || !rel.ready) return;
    if (!window.confirm(`Release ${rel.ready} marked result${rel.ready === 1 ? "" : "s"} to the marks table? Students will be notified and the report card will show them.`)) return;
    setReleasing(true);
    try {
      const { data } = await API.put("/e-assessments/admin/report-card-release");
      showToast(data?.message || "Marks released");
      await loadStatus();
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not release the marks", "error");
      await loadStatus();
    } finally {
      setReleasing(false);
    }
  };

  const optionBox = (value, title, hint, body) => (
    <div onClick={() => setMode(value)} style={{
      border: `1px solid ${mode === value ? C.accent : C.border}`, background: mode === value ? C.bgAlt : "transparent",
      borderRadius: 10, padding: "12px 14px", marginBottom: 12, cursor: "pointer",
    }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input type="radio" checked={mode === value} onChange={() => setMode(value)} style={{ marginTop: 3 }} />
        <span>
          <span style={{ display: "block", fontWeight: 700, color: C.textPri, fontSize: 14 }}>{title}</span>
          <span style={{ display: "block", color: C.textMuted, fontSize: 12, marginTop: 2 }}>{hint}</span>
        </span>
      </label>
      {mode === value && body && <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>{body}</div>}
    </div>
  );

  const savedMode = opts.current?.mode || "none";
  const unsaved = (mode !== savedMode)
    || (mode === "assessment" && assessmentId !== String(opts.current?.id))
    || (mode === "exam" && examId !== String(opts.current?.id));
  const allReleased = rel && rel.complete && rel.ready === 0 && rel.items.some((i) => i.total > 0);

  return (
    <Modal title="Report Card Marks" onClose={onClose}>
      {loading ? (
        <p style={{ color: C.textMuted }}>Loading…</p>
      ) : (
        <>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 0 }}>
            Choose what students see on their report card. Only one source can be active.
          </p>
          {optionBox("none", "Nothing (blank report card)", "No marks are shown until you pick an assessment or an examination.")}
          {optionBox("assessment", "One assessment", "Only this assessment appears on the report card — no CRNM for other subjects.",
            <ModalSelect value={assessmentId} onChange={setAssessmentId} placeholder="Select an assessment…"
              options={opts.assessments.map((a) => ({ value: String(a.id), label: `${a.title}${a.subject ? ` — ${a.subject}` : ""}${a.class_name ? ` (${a.class_name})` : ""}` }))} />)}
          {optionBox("exam", "A main examination", "Every subject scheduled in the exam appears with its marks (CRNM until a paper is marked).",
            <ModalSelect value={examId} onChange={setExamId} placeholder="Select a main examination…"
              options={opts.exams.map((e) => ({ value: String(e.id), label: `${e.name}${e.term ? ` — ${e.term}` : ""}${e.academic_year ? ` ${e.academic_year}` : ""} · ${e.subject_count} subject${e.subject_count === 1 ? "" : "s"}` }))} />)}
          <SaveButton onClick={save} loading={saving} label="Save selection" />

          {savedMode !== "none" && (
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 800, color: C.textPri, fontSize: 14, marginBottom: 4 }}>
                Release marks — “{opts.current?.name}”
              </div>
              <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 10px" }}>
                Marks reach the report card once they are released to the marks table. You can only release when marking is complete.
              </p>
              {!rel ? (
                <p style={{ color: C.textMuted, fontSize: 13 }}>Checking marking progress…</p>
              ) : (
                <>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
                    {rel.items.map((it) => {
                      const done = it.total > 0 && it.unmarked + it.remark_open === 0;
                      return (
                        <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 12px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.textPri }}>
                          <span>{it.subject || it.title}</span>
                          <span style={{ color: it.total === 0 ? C.textMuted : done ? C.success || "#16a34a" : C.warning || "#d97706", fontWeight: 600 }}>
                            {it.total === 0 ? "no submissions"
                              : done ? (it.ready ? `marked · ${it.ready} to release` : "released")
                              : `${it.unmarked + it.remark_open} left to mark`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {rel.reason && <p style={{ color: C.warning || "#d97706", fontSize: 12.5, margin: "0 0 10px" }}>{rel.reason}</p>}
                  {unsaved && <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 10px" }}>You changed the selection — save it first. This section is about the saved one.</p>}
                  <button onClick={release} disabled={releasing || unsaved || !rel.complete || !rel.ready}
                    style={{
                      width: "100%", padding: 13, border: "none", borderRadius: 9, fontWeight: 700, fontSize: 14,
                      background: (!rel.complete || !rel.ready || unsaved) ? C.textMuted : C.accent, color: C.white,
                      cursor: (!rel.complete || !rel.ready || unsaved || releasing) ? "not-allowed" : "pointer",
                      opacity: (!rel.complete || !rel.ready || unsaved) ? 0.55 : 1,
                    }}>
                    {releasing ? "Releasing…" : allReleased ? "All marks released" : rel.complete ? `Release ${rel.ready} mark${rel.ready === 1 ? "" : "s"} to marks table` : "Release (finish marking first)"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function ModalInput({ value, onChange, placeholder, type = "text" }) {
  const C = useC();
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 14, outline: "none", marginBottom: 14, boxSizing: "border-box" }} />
  );
}

function ModalSelect({ value, onChange, options, placeholder }) {
  const C = useC();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: value ? C.textPri : C.textMuted, fontSize: 14, outline: "none", marginBottom: 14, boxSizing: "border-box", cursor: "pointer" }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TeacherMultiSelect({ value, onChange, teachers }) {
  const C = useC();
  const toggle = (id) => {
    const has = value.includes(id);
    onChange(has ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div style={{
      maxHeight: 160, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.bgAlt, marginBottom: 6, padding: teachers.length ? "4px 0" : "10px 13px",
    }}>
      {!teachers.length && <span style={{ fontSize: 13, color: C.textMuted }}>No teachers found</span>}
      {teachers.map((t) => {
        const checked = value.includes(t.id);
        return (
          <label key={t.id} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "7px 13px",
            cursor: "pointer", fontSize: 13.5, color: C.textPri,
          }}>
            <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} style={{ cursor: "pointer" }} />
            {t.name}
          </label>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLASS MULTI-SELECT — used for Assign Teacher, where there's no
   "year" grouping concept (a teacher/subject/class assignment is
   naturally one row per class regardless). Supports a single
   class, several specific classes, or "All Classes" via one
   master checkbox. Value is an array of class-id strings, or
   exactly ["all"] when "All Classes" is checked.

   For Create/Edit Assessment, see AssessmentTargetSelect below
   instead — that one groups classes by year of study so one
   assessment can cover a whole year without needing a row per
   class in it.
═══════════════════════════════════════════════════════════ */
/* Checkbox list with a "Select all" row — used by the Assign Teacher dialog so
   every teacher / every subject can be picked in one click. */
function CheckList({ items, value, onChange, allLabel = "Select all" }) {
  const C = useC();
  const [q, setQ] = useState("");
  const all = items.length > 0 && items.every((i) => value.includes(i.value));
  const shown = q.trim() ? items.filter((i) => String(i.label).toLowerCase().includes(q.trim().toLowerCase())) : items;
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", fontSize: 13, color: C.textPri, cursor: "pointer" };
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.card, marginBottom: 14, overflow: "hidden" }}>
      <label style={{ ...rowStyle, background: C.bgAlt, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>
        <input type="checkbox" checked={all} onChange={() => onChange(all ? [] : items.map((i) => i.value))} style={{ accentColor: C.accent }} />
        {allLabel} ({items.length})
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: C.textMuted }}>{value.length} selected</span>
      </label>
      {items.length > 8 && (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
          style={{ width: "100%", boxSizing: "border-box", border: "none", borderBottom: `1px solid ${C.border}`, background: "transparent", color: C.textPri, padding: "8px 12px", fontSize: 13, outline: "none" }} />
      )}
      <div style={{ maxHeight: 150, overflowY: "auto" }}>
        {shown.length === 0 && <p style={{ margin: 0, padding: "10px 12px", fontSize: 12, color: C.textMuted }}>No matches</p>}
        {shown.map((i) => (
          <label key={i.value} style={rowStyle}>
            <input type="checkbox" checked={value.includes(i.value)} onChange={() => toggle(i.value)} style={{ accentColor: C.accent }} />
            {i.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function ClassMultiSelect({ value, onChange, classes }) {
  const C = useC();
  const isAll = value.includes("all");

  const toggleAll = () => onChange(isAll ? [] : ["all"]);

  const toggleOne = (id) => {
    // Picking a specific class while "All" is checked drops "All" and
    // starts a fresh specific-class selection with just that one.
    if (isAll) { onChange([id]); return; }
    const has = value.includes(id);
    onChange(has ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div style={{
      maxHeight: 190, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.bgAlt, marginBottom: 6, padding: classes.length ? "4px 0" : "10px 13px",
    }}>
      {!classes.length && <span style={{ fontSize: 13, color: C.textMuted }}>No classes found</span>}
      {classes.length > 0 && (
        <label style={{
          display: "flex", alignItems: "center", gap: 9, padding: "7px 13px",
          cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: C.textPri,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <input type="checkbox" checked={isAll} onChange={toggleAll} style={{ cursor: "pointer" }} />
          All Classes
        </label>
      )}
      {classes.map((c) => {
        const id = String(c.id || c.class_id);
        const checked = isAll || value.includes(id);
        return (
          <label key={id} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "7px 13px",
            cursor: isAll ? "default" : "pointer", fontSize: 13.5, color: isAll ? C.textMuted : C.textPri,
          }}>
            <input type="checkbox" checked={checked} disabled={isAll} onChange={() => toggleOne(id)}
              style={{ cursor: isAll ? "default" : "pointer" }} />
            {c.class_name || c.name}
          </label>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUBJECT MULTI-SELECT — Create Assessment's subject picker.
   Supports a single subject, several specific subjects, or "All
   Subjects" via one master checkbox. Value is an array of subject
   names, or exactly ["all"] when "All Subjects" is checked.
   Resolved by resolveSubjects() above into the concrete list of
   subject names createAssessment loops over — one assessment per
   subject (crossed with each selected class/year target).
═══════════════════════════════════════════════════════════ */
function SubjectMultiSelect({ value, onChange, subjects }) {
  const C = useC();
  const isAll = value.includes("all");

  const toggleAll = () => onChange(isAll ? [] : ["all"]);

  const toggleOne = (name) => {
    // Picking a specific subject while "All" is checked drops "All" and
    // starts a fresh specific-subject selection with just that one.
    if (isAll) { onChange([name]); return; }
    const has = value.includes(name);
    onChange(has ? value.filter((v) => v !== name) : [...value, name]);
  };

  return (
    <div style={{
      maxHeight: 190, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.bgAlt, marginBottom: 6, padding: subjects.length ? "4px 0" : "10px 13px",
    }}>
      {!subjects.length && <span style={{ fontSize: 13, color: C.textMuted }}>No subjects found</span>}
      {subjects.length > 0 && (
        <label style={{
          display: "flex", alignItems: "center", gap: 9, padding: "7px 13px",
          cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: C.textPri,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <input type="checkbox" checked={isAll} onChange={toggleAll} style={{ cursor: "pointer" }} />
          All Subjects <span style={{ fontWeight: 400, color: C.textMuted }}>&mdash; {subjects.length} assessments, one per subject</span>
        </label>
      )}
      {subjects.map((s) => {
        const name = s.name || s.subject_name;
        const checked = isAll || value.includes(name);
        return (
          <label key={s.id || name} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "7px 13px",
            cursor: isAll ? "default" : "pointer", fontSize: 13.5, color: isAll ? C.textMuted : C.textPri,
          }}>
            <input type="checkbox" checked={checked} disabled={isAll} onChange={() => toggleOne(name)}
              style={{ cursor: isAll ? "default" : "pointer" }} />
            {name}
          </label>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ASSESSMENT TARGET SELECT — Create/Edit Assessment's class
   picker. Classes are named "DTE1A".."DTE1Z" for Year 1,
   "DTE2A".."DTE2Z" for Year 2, etc., so they're grouped here by
   the year number in their name. Checking "Year 1" selects every
   class in that year as ONE target — the assessment ends up
   covering the whole year (via year_of_study) instead of needing
   a separate copy per class, which is what made "All Classes"
   explode into dozens of assessments to manage before. Specific
   classes can still be picked individually below the year rows
   for one-off, single-class assessments.

   Value is an array mixing "year:1"/"year:2"/"year:3" tokens and
   raw class-id strings — resolved by resolveAssessmentTargets()
   above into the { class_id, year_of_study } pairs actually sent
   to the backend.
═══════════════════════════════════════════════════════════ */
function AssessmentTargetSelect({ value, onChange, classes, classesByYear }) {
  const C = useC();

  const yearsWithClasses = [1, 2, 3].filter((y) => classesByYear[y]?.length);
  const allYearTokens = yearsWithClasses.map((y) => `year:${y}`);
  const isAllYears = allYearTokens.length > 0 && allYearTokens.every((t) => value.includes(t));

  const toggleAllYears = () => onChange(isAllYears ? [] : allYearTokens);

  const toggleYear = (y) => {
    const token = `year:${y}`;
    if (value.includes(token)) { onChange(value.filter((v) => v !== token)); return; }
    // Selecting a year also drops any individually-picked classes that
    // belong to it, so the same class isn't targeted twice over.
    const idsInYear = (classesByYear[y] || []).map((c) => String(c.id || c.class_id));
    onChange([...value.filter((v) => !idsInYear.includes(v)), token]);
  };

  const toggleClass = (id) => {
    const has = value.includes(id);
    onChange(has ? value.filter((v) => v !== id) : [...value, id]);
  };

  const rowStyle = (bold) => ({
    display: "flex", alignItems: "center", gap: 9, padding: "7px 13px",
    cursor: "pointer", fontSize: 13.5, fontWeight: bold ? 700 : 400, color: C.textPri,
  });

  return (
    <div style={{
      maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.bgAlt, marginBottom: 6, padding: "4px 0",
    }}>
      {yearsWithClasses.length > 0 && (
        <label style={{ ...rowStyle(true), borderBottom: `1px solid ${C.border}` }}>
          <input type="checkbox" checked={isAllYears} onChange={toggleAllYears} style={{ cursor: "pointer" }} />
          All Years <span style={{ fontWeight: 400, color: C.textMuted }}>&mdash; {yearsWithClasses.length} assessments, one per year</span>
        </label>
      )}
      {yearsWithClasses.map((y) => {
        const checked = value.includes(`year:${y}`);
        return (
          <label key={y} style={rowStyle(true)}>
            <input type="checkbox" checked={checked} onChange={() => toggleYear(y)} style={{ cursor: "pointer" }} />
            Year {y} &mdash; all classes <span style={{ fontWeight: 400, color: C.textMuted }}>({classesByYear[y].length} classes, 1 assessment)</span>
          </label>
        );
      })}

      <div style={{ padding: "8px 13px 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, borderTop: `1px solid ${C.border}` }}>
        Or specific classes
      </div>
      {!classes.length && <span style={{ display: "block", padding: "6px 13px 10px", fontSize: 13, color: C.textMuted }}>No classes found</span>}
      {classes.map((c) => {
        const id = String(c.id || c.class_id);
        const year = [1, 2, 3].find((y) => (classesByYear[y] || []).some((cy) => String(cy.id || cy.class_id) === id));
        const lockedByYear = year != null && value.includes(`year:${year}`);
        const checked = lockedByYear || value.includes(id);
        return (
          <label key={id} style={{ ...rowStyle(false), cursor: lockedByYear ? "default" : "pointer", color: lockedByYear ? C.textMuted : C.textPri }}>
            <input type="checkbox" checked={checked} disabled={lockedByYear} onChange={() => toggleClass(id)}
              style={{ cursor: lockedByYear ? "default" : "pointer" }} />
            {c.class_name || c.name}
          </label>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES  (token-driven — reads the static C map above)
═══════════════════════════════════════════════════════════ */
function s(C) {
  return {
    page:       { minHeight: "100vh", background: C.bg, color: C.textPri, padding: "28px 28px 80px", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: "100%", margin: "0 auto", transition: "background .15s ease, color .15s ease" },
    spinner:    { width: 38, height: 38, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%" },
    toast:      { position: "fixed", top: 22, right: 22, zIndex: 999, padding: "12px 16px", borderRadius: 10, border: "1px solid", background: C.card, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 30px rgba(0,0,0,.3)", minWidth: 220 },
    header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 32 },
    pageTitle:  { margin: "10px 0 4px", fontSize: 25, fontWeight: 800, color: C.textPri, letterSpacing: "-0.01em" },
    pageSub:    { margin: 0, fontSize: 13, color: C.textSec, lineHeight: 1.5 },
    backBtn:    { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.textSec, cursor: "pointer", fontSize: 12, marginBottom: 8 },
    tabBar:     { display: "flex", gap: 2, marginBottom: 28, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" },
    tab:        { display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", background: "transparent", border: "none", borderBottom: "2px solid transparent", color: C.textMuted, fontWeight: 600, cursor: "pointer", fontSize: 13.5 },
    tabActive:  { color: C.textPri, borderBottom: `2px solid ${C.accent}` },
    filterRow:  { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 24 },
    searchWrap: { position: "relative", display: "flex", alignItems: "center", flex: 1, minWidth: 220 },
    searchInput:{ flex: 1, padding: "9px 34px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 14, outline: "none" },
    clearBtn:   { position: "absolute", right: 10, background: "none", border: "none", color: C.textMuted, cursor: "pointer", display: "flex" },
    select:     { padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, fontSize: 13, outline: "none", cursor: "pointer" },
    iconBtn:    { padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textSec, cursor: "pointer", display: "flex", alignItems: "center" },
    bulkBtn:    { display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textSec, fontWeight: 600, cursor: "pointer", fontSize: 13 },
    saveBtn:    { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, border: "none", borderRadius: 9, background: C.accent, color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer" },
    statsGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 26 },
    assignGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 12 },
    assignCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 },
    cardGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 },
    tableWrap:  { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" },
    table:      { width: "100%", borderCollapse: "collapse" },
    subjectBlock:{ marginBottom: 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" },
    subjectHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 18px", background: C.bgAlt, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 12 },
    remarkCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 },
    dropdown:   { position: "absolute", top: 44, right: 0, background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 10, overflow: "hidden", minWidth: 260, zIndex: 60, boxShadow: "0 12px 34px rgba(0,0,0,.3)" },
    textarea:   { width: "100%", minHeight: 90, padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 14 },
    tabTopRow:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 },
    tabTitle:   { margin: 0, fontSize: 19, fontWeight: 800, color: C.textPri },
    tabSub:     { margin: "6px 0 0", color: C.textSec, fontSize: 13, maxWidth: 640, lineHeight: 1.6 },
    formHint:   { fontSize: 12, color: C.textMuted, lineHeight: 1.7, marginTop: -6, marginBottom: 14 },
    infoBox:    { padding: "12px 16px", background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.textSec, marginBottom: 16, lineHeight: 1.7 },
    reasonBox:  { marginTop: 14, padding: "10px 14px", background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.textSec, lineHeight: 1.6 },
    commentBox: { marginTop: 10, padding: "10px 14px", background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.textPri, lineHeight: 1.6 },
    warningBox: { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.textSec, marginBottom: 18, lineHeight: 1.6 },
  };
}

/* ═══════════════════════════════════════════════════════════
   PAGE-LOCAL STYLES — hover states, table row highlight,
   scrollbar/reduced-motion handled globally by dash-tokens
═══════════════════════════════════════════════════════════ */
const globalStyles = `
  .row-hover:hover td { background: var(--bg); }
  .btn-hover:hover { filter: brightness(1.08); }
  .btn-hover:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
`;

/* Which highlight-to-mark style each teacher uses on the marking screens.
   Option 1 (default): select words, a ✓ point is added straight away (tap the ✓ to flip it to ✗).
   Option 2: select words, a ✓ highlight is added straight away (tap ✓ to flip to ✗).
   Option 4: like option 1, with word-match suggested marks instead of the AI tools.
   Option 3: works like option 1; the ✓ / ✗ buttons sit inside the answer editor, beside the text, and there is no R button. */
function MarkingOptionPanel({ teachers, showToast }) {
  const [opts, setOpts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // teacher id, or "all"
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    API.get("/e-assessments/admin/marking-options")
      .then((r) => { if (alive) setOpts(r.data?.options || {}); })
      .catch(() => showToast && showToast("Could not load marking options", "error"))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [showToast]);

  const list = (teachers || []).filter((t) => !q.trim() || String(t.name || "").toLowerCase().includes(q.trim().toLowerCase()));

  const save = async (ids, option, key) => {
    setBusy(key);
    try {
      await API.put(ids.length === 1 && key !== "all" ? `/e-assessments/admin/marking-options/${ids[0]}` : "/e-assessments/admin/marking-options",
        { option, teacherIds: ids });
      setOpts((o) => { const n = { ...o }; ids.forEach((id) => { n[id] = option; }); return n; });
      showToast && showToast(ids.length === 1 ? `Marking option ${option} saved` : `Marking option ${option} set for ${ids.length} teachers`);
    } catch (e) {
      showToast && showToast(e?.response?.data?.message || "Could not save marking option", "error");
    } finally { setBusy(null); }
  };

  const seg = (active) => ({
    padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
    background: active ? C.accent : "transparent", color: active ? "#fff" : C.textPri,
  });

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: C.textPri }}>Marking option per teacher</p>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
        <b>Option 1</b> (default): the teacher selects words and a ✓ point is added straight away; tapping the ✓ turns it into ✗.<br />
        <b>Option 2</b>: the teacher selects words and a ✓ highlight is added straight away; tapping the ✓ turns it into ✗.<br />
        <b>Option 3</b>: works exactly like option 1; the only difference is the layout — the ✓ / ✗ buttons sit inside the answer editor, in a column beside the text so the mouse has less distance to travel, and the R button is removed.<br />
        <b>Option 4</b>: marks like option 1, and swaps the credit-based AI marking tools for simple word-match <i>suggested marks</i>: the answer is compared with the marking guide and a mark is suggested; nothing is marked until the teacher approves it.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teachers…" aria-label="Search teachers"
          style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 13, minWidth: 200 }} />
        <span style={{ flex: 1 }} />
        <button type="button" disabled={busy || !(teachers || []).length} onClick={() => save((teachers || []).map((t) => t.id), 1, "all")}
          style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Set all to option 1</button>
        <button type="button" disabled={busy || !(teachers || []).length} onClick={() => save((teachers || []).map((t) => t.id), 2, "all")}
          style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Set all to option 2</button>
        <button type="button" disabled={busy || !(teachers || []).length} onClick={() => save((teachers || []).map((t) => t.id), 3, "all")}
          style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Set all to option 3</button>
        <button type="button" disabled={busy || !(teachers || []).length} onClick={() => save((teachers || []).map((t) => t.id), 4, "all")}
          style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textPri, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Set all to option 4</button>
      </div>
      {loading ? <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p> : list.length === 0 ? (
        <p style={{ color: C.textMuted, fontSize: 13 }}>No teachers found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((t) => {
            const cur = [2, 3, 4].includes(Number(opts[t.id])) ? Number(opts[t.id]) : 1;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderTop: `1px solid ${C.border}` }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.textPri }}>{t.name || `Teacher #${t.id}`}</span>
                <div role="group" aria-label={`Marking option for ${t.name || t.id}`}
                  style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", opacity: busy === t.id ? .6 : 1 }}>
                  <button type="button" disabled={!!busy} style={seg(cur === 1)} onClick={() => cur !== 1 && save([t.id], 1, t.id)}>Option 1</button>
                  <button type="button" disabled={!!busy} style={seg(cur === 2)} onClick={() => cur !== 2 && save([t.id], 2, t.id)}>Option 2</button>
                  <button type="button" disabled={!!busy} style={seg(cur === 3)} onClick={() => cur !== 3 && save([t.id], 3, t.id)}>Option 3</button>
                  <button type="button" disabled={!!busy} style={seg(cur === 4)} onClick={() => cur !== 4 && save([t.id], 4, t.id)}>Option 4</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
