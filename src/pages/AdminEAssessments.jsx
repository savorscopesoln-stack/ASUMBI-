import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  Search, X, RefreshCw, Download, Plus, UserPlus, ChevronDown, ArrowLeft, Pencil, Trash2,
  Check, CheckCircle2, AlertTriangle, Lock, Unlock, Zap, Rocket, MessageSquare, Mail,
  BarChart3, ClipboardList, FileText, Award, LockKeyhole, Users, Inbox, Clock, TrendingUp,
  Sun, Moon, Server, GraduationCap, PlusCircle, MinusCircle, Save, HelpCircle, Smartphone, ShieldCheck, Camera,
} from "lucide-react";
import LocalSyncPanel from "../components/eassessment/LocalSyncPanel";
import { fmtDateTime } from "../components/mainExams/shared";
import EvidenceGallery from "../components/eassessment/EvidenceGallery";
import { getGradeForScore, getPassMark, DEFAULT_GRADING_SYSTEM } from "../utils/grading";
import { fmt2 } from "../utils/format";

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
  { label: "Remark Requests", icon: IconMessage },
  { label: "Released Marks",  icon: IconAward },
  { label: "Device Locks",    icon: IconLockKeyhole },
  { label: "Local Sync",      icon: IconServer },
  { label: "Grading System",  icon: IconGraduationCap },
  { label: "Activity Log",    icon: IconFileText },
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
  const [statusFilter,  setStatusFilter]  = useState("");
  const [toast,         setToast]         = useState(null);
  const [bulkMenu,      setBulkMenu]      = useState(false);

  /* modals */
  const [formOpen,     setFormOpen]     = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [assignOpen,   setAssignOpen]   = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [remarkModal,  setRemarkModal]  = useState(null);
  const [releaseModal, setReleaseModal] = useState(null);
  const [unsubmitted,    setUnsubmitted]    = useState([]);   // sat the exam, nothing submitted
  const [resitModal,     setResitModal]     = useState(null); // { student_id, e_assessment_id, student_name, assessment_title, hasPrevious }
  const [resitPolicy,    setResitPolicy]    = useState("replace");
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

  /* ── Load all ── */
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [assessments, cls, subj, teach, assigned, subs, remarks, released, sessions, grading, noSub, devAccess, batchRes] =
        await Promise.all([
          API.get("/e-assessments"),
          API.get("/e-assessments/classes"),
          API.get("/e-assessments/subjects"),
          API.get("/e-assessments/teachers"),
          API.get("/e-assessments/admin/assigned-teachers").catch(() => ({ data: [] })),
          API.get("/e-assessments/submissions").catch(() => ({ data: [] })),
          API.get("/e-assessments/admin/remark-requests").catch(() => ({ data: [] })),
          API.get("/e-assessments/admin/released-marks").catch(() => ({ data: [] })),
          API.get("/e-assessments/admin/exam-sessions").catch(() => ({ data: [] })),
          API.get("/e-assessments/grading-system").catch(() => ({ data: null })),
          API.get("/e-assessments/admin/exam-sessions/unsubmitted").catch(() => ({ data: [] })),
          API.get("/e-assessments/admin/device-access").catch(() => ({ data: [] })),
          API.get("/e-assessments/admin/assignment-batches").catch(() => ({ data: [] })),
        ]);

      setList(extract(assessments));
      setClasses(extract(cls));
      setSubjects(extract(subj));
      setTeachers(extract(teach));
      setAssignedTeachers(extract(assigned));
      setSubmissions(extract(subs));
      setRemarkRequests(extract(remarks));
      setReleasedMarks(extract(released));
      setExamSessions(extract(sessions));
      setUnsubmitted(extract(noSub));
      setDeviceAccess(extract(devAccess));
      setAssignBatches(extract(batchRes));
      if (grading.data) {
        setGradingSystem(grading.data);
        setGradingDraft(grading.data);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Device Locks tab: refresh quietly so a fresh lock (and its reason) shows up without a manual reload.
  useEffect(() => {
    if (activeTab !== 4) return;
    const iv = setInterval(async () => {
      try {
        const r = await API.get("/e-assessments/admin/exam-sessions");
        setExamSessions(extract(r));
      } catch { /* try again next tick */ }
    }, 10000);
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
    const prev = { require_seb: a.require_seb, seb_keys: a.seb_keys };
    if ("enabled" in payload) setList((p) => p.map((x) => (x.id === a.id ? { ...x, require_seb: payload.enabled } : x)));
    try {
      const res = await API.put(`/e-assessments/admin/${a.id}/seb`, payload);
      setList((p) => p.map((x) => (x.id === a.id ? { ...x, require_seb: res.data.require_seb, seb_keys: res.data.seb_keys } : x)));
      showToast(res.data?.message || "Saved");
      return true;
    } catch (err) {
      setList((p) => p.map((x) => (x.id === a.id ? { ...x, ...prev } : x)));
      showToast(err?.response?.data?.message || "Failed to save the Safe Exam Browser setting", "error");
      return false;
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
             s.score != null && s.status !== "released"
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
    if (!window.confirm(`Delete ${ids.length} assessment(s)? This cannot be undone.`)) return;
    try {
      setSaving(true);
      await API.delete("/e-assessments/admin/delete-assessments", { data: { ids } });
      setSelAssessments([]);
      showToast(`${ids.length} assessment(s) deleted`);
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
      await API.delete("/e-assessments/admin/delete-assignments", { data: { ids } });
      setSelAssignments([]);
      showToast(`${ids.length} assignment(s) removed`);
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

  const unlockSession = async (sessionId) => {
    try {
      setSaving(true);
      await API.put(`/e-assessments/admin/exam-sessions/${sessionId}/unlock`);
      showToast("Session unlocked — the student will see a Resume button on their screen");
      loadAll();
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
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk unlock failed", "error");
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
    marked:     submissions.filter((s) => s.score != null).length,
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
                  onToggleSecurity={(key) => toggleSecurity(a, key)}
                  onSaveSeb={(payload) => saveSeb(a, payload)}
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

            {subjectFilter ? (
              <>
                <ActionButton icon={<IconZap size={14} />} onClick={() => bulkAssignBySubject(subjectFilter)}>Distribute Equally</ActionButton>
                <ActionButton icon={<IconRocket size={14} />} onClick={() => bulkReleaseMarks(subjectFilter)}>Bulk Release</ActionButton>
              </>
            ) : (
              <ActionButton icon={<IconZap size={14} />} onClick={bulkAssignAll}>Auto-Assign All</ActionButton>
            )}

            <ActionButton icon={<IconDownload size={14} />} onClick={() => exportCSV(
              submissions.map((s) => ({
                student: s.student_name, assessment: s.assessment_title,
                subject: s.subject_name, score: s.score, total: s.total_marks,
                status: s.status, submitted: s.submitted_at,
              })), "submissions.csv"
            )}>Export CSV</ActionButton>
          </div>

          {Object.keys(submissionsBySubject).length === 0 ? (
            <EmptyState icon={<IconFileText size={26} />} text="No submissions found." />
          ) : (
            Object.entries(submissionsBySubject)
              .filter(([sName]) => !subjectFilter || sName === subjectFilter)
              .map(([subjectName, subs]) => {
                const subjectTeachers = assignedTeachers.filter(
                  (t) => String(t.subject_name) === String(subjectName)
                );
                const markedCount   = subs.filter((s) => s.score != null).length;
                const releasedCount = subs.filter((s) => s.status === "released").length;

                return (
                  <div key={subjectName} className="dash-card" style={sx.subjectBlock}>
                    <div style={sx.subjectHead}>
                      <div>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri }}>{subjectName}</p>
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 12, color: C.textMuted }}>
                            {subs.length} submitted · {markedCount} marked · {releasedCount} released
                          </span>
                          {subjectTeachers.length > 0
                            ? subjectTeachers.map((t) => <Chip key={t.id} icon={<IconUsers size={11} />} text={t.teacher_name} tone="success" />)
                            : <Chip icon={<IconAlert size={11} />} text="No teacher assigned" tone="danger" />}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <MiniBtn tone="warning" icon={<IconZap size={12} />} onClick={() => bulkAssignBySubject(subjectName)}>Distribute</MiniBtn>
                        <MiniBtn onClick={() => bulkReleaseMarks(subjectName)} icon={<IconRocket size={12} />}>Release All</MiniBtn>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={sx.table}>
                        <thead>
                          <tr>
                            {["Student","Assessment","Submitted","Assigned To","Mark","Grade","Status","Actions"].map((h) => <Th key={h}>{h}</Th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((sub) => (
                            <tr key={sub.id} className="row-hover">
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
                              <Td><MarkPill status={sub.status} score={sub.score} /></Td>
                              <Td>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  {!sub.assigned_teacher_id && !(Number(sub.alloc_count) > 0) && subjectTeachers.length > 0 && (
                                    <select
                                      style={{ ...sx.select, padding: "5px 8px", fontSize: 12 }}
                                      defaultValue=""
                                      onChange={(e) => { if (e.target.value) assignSubmissionToTeacher(sub.id, e.target.value); }}
                                    >
                                      <option value="">Assign…</option>
                                      {subjectTeachers.map((t) => (
                                        <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>
                                      ))}
                                    </select>
                                  )}
                                  {sub.score != null && sub.status !== "released" && (
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
              <h2 style={sx.tabTitle}>Remark Requests</h2>
              <p style={sx.tabSub}>Review and action student remark requests</p>
            </div>
            <ActionButton icon={<IconDownload size={14} />} onClick={() => exportCSV(
              remarkRequests.map((r) => ({
                student: r.student_name, assessment: r.assessment_title,
                subject: r.subject_name, score: r.score, status: r.remark_status,
                reason: r.remark_reason, submitted: r.submitted_at,
              })), "remark-requests.csv"
            )}>Export CSV</ActionButton>
          </div>

          {remarkRequests.length === 0 ? (
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

          {unsubmitted.length === 0 ? (
            <EmptyState icon={<IconCheckCircle size={26} />} text="No students are missing a submission." />
          ) : (
            <div className="dash-card" style={sx.tableWrap}>
              <table style={sx.table}>
                <thead>
                  <tr>{["Student","Class","Assessment","Subject","Ended","Reason","Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {unsubmitted.map((u) => (
                    <tr key={u.id} className="row-hover">
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
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>
                        {a.essay_answer || <em style={{ color: C.textMuted }}>No answer provided.</em>}
                      </p>
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
function AssessmentCard({ a, selected, onSelect, onStart, onStop, onAccess, onToggleDesktop, onToggleSecurity, onSaveSeb, onStats, onAttendance, attendanceBusy, onEdit, onDelete, onAddQuestions }) {
  const [sebKeysDraft, setSebKeysDraft] = React.useState(a.seb_keys || "");
  const [sebSaving, setSebSaving] = React.useState(false);
  const sebKeysDirty = (sebKeysDraft || "").trim() !== (a.seb_keys || "").trim();
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

function MarkPill({ status, score }) {
  if (status === "released") return <Chip text="Released" tone="accent" />;
  if (status === "marked" || score != null) return <Chip text="Marked" tone="success" />;
  if (status === "submitted") return <Chip text="Awaiting Marking" tone="warning" />;
  return <Chip text={status || "Pending"} tone="neutral" />;
}

/* ── Blocked devices (Desktop-only switch) ──
   Every phone/tablet the switch turned away, per student and assessment,
   with the platform it reported (Android, iPhone, ...). "Allow" lets that ONE
   device in for that student + exam; "Revoke" puts the block back. */
const PLATFORM_LABEL = {
  android: "Android", ios: "iPhone", ipados: "iPad", chromeos: "Chromebook",
  linux: "Linux", windows: "Windows", mac: "Mac", unknown: "Unknown",
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
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Smartphone size={26} />} text={rows.length === 0 ? "No phone or tablet has been turned away yet." : "Nothing matches these filters."} />
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
                      {!d.desktop_only && <div style={{ color: C.textMuted, fontSize: 11 }}>Desktop-only is off now</div>}
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

function Chip({ text, tone = "neutral", icon, uppercase }) {
  const C = useC();
  const color = tone === "neutral" ? C.textSec : C[tone] || C.textSec;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
      background: C.bgAlt, color, border: `1px solid ${C.border}`,
      textTransform: uppercase ? "uppercase" : "none", letterSpacing: uppercase ? "0.05em" : 0,
      whiteSpace: "nowrap",
    }}>
      {icon || (tone !== "neutral" && <IconDot size={6} />)}
      {text}
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
  set_student_access: "Trainee access / schedule", set_desktop_only: "Desktop-only switch", set_security_settings: "Security switches", set_seb_settings: "Safe Exam Browser setting", unlock_device: "Unlocked device", grant_resit: "Granted resit",
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
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(20);
  doc.text(title, 40, 40);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110);
  doc.text(`Generated ${new Date().toLocaleString()}  ·  ${rows.length} device${rows.length === 1 ? "" : "s"}`, 40, 55);

  // summary counts in group colours
  let x = 40;
  GROUPS.forEach((g) => {
    const n = rows.filter((r) => r.group === g.key).length;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...rgb[g.key]);
    doc.text(String(n), x, 82);
    doc.setFontSize(9); doc.text(g.title.toUpperCase(), x + doc.getTextWidth(String(n)) + 6, 82);
    x += 130;
  });

  let y = 98;
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

function DeviceSessionsPanel({ sessions, saving, onUnlock, onBulkUnlock, onCancelResit, onPhotos }) {
  const C = useC();
  const [q, setQ] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [open, setOpen] = useState({ active: true, locked: true, not_started: true, submitted: false });
  const [shown, setShown] = useState({});          // rows shown per group (paging)
  const [picked, setPicked] = useState(() => new Set()); // ticked locked session ids

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

    if (key === "active") return [student, assessment, step, timeLeft,
      { label: "Connection", render: (s) => (
        <>
          <Chip text={s.connection === "online" ? "Online" : "No signal"} tone={s.connection === "online" ? "success" : "warning"} />
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{lastSignalText(s)}</div>
        </>) }, device, photos];
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
      { label: "Actions", render: (s) => <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving} onClick={() => onUnlock(s.id)}>Unlock</MiniBtn> }];
    if (key === "not_started") return [student, assessment, token, step,
      { label: "Issued", render: (s) => <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(s.issued_at)}</span> },
      { label: "Actions", render: (s) => s.resit_allowed
        ? <MiniBtn tone="warning" onClick={() => onCancelResit(s)}>Cancel resit</MiniBtn>
        : <span style={{ color: C.textMuted, fontSize: 12 }}>—</span> }];
    return [student, assessment, step,
      { label: "Submitted", render: (s) => <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(s.submitted_at || s.ended_at)}</span> },
      { label: "How", render: (s) => <Chip text={s.auto_submitted ? "Auto-submitted" : "By student"} tone={s.auto_submitted ? "warning" : "success"} /> },
      photos];
  };

  return (
    <>
      {/* counts — bold coloured numbers, click one to jump to its group */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 36px", marginBottom: 16, alignItems: "baseline" }}>
        {GROUPS.map((g) => {
          const color = g.tone === "neutral" ? C.textSec : C[g.tone];
          return (
            <button key={g.key} type="button"
              onClick={() => { setOpen((o) => ({ ...o, [g.key]: true })); document.getElementById(`dev-group-${g.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{ display: "inline-flex", alignItems: "baseline", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", color }}>
              <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color }}>{byGroup[g.key].length}{byGroup[g.key].length !== totals[g.key] ? <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.7 }}> / {totals[g.key]}</span> : null}</span>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color }}>{g.title}</span>
            </button>
          );
        })}
      </div>

      {/* search + filter + download everything */}
      <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input style={{ ...input, flex: "1 1 240px" }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, class, username, token, assessment, device, lock reason…" aria-label="Search devices" />
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

      {GROUPS.map((g) => {
        const rows = byGroup[g.key];
        const isOpen = open[g.key];
        const limit = shown[g.key] || PAGE_ROWS;
        const cols = columnsFor(g.key);
        return (
          <div key={g.key} id={`dev-group-${g.key}`} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))} aria-expanded={isOpen}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, fontFamily: "inherit" }}>
                <span style={{ color: C.textMuted, fontSize: 12, width: 12 }}>{isOpen ? "▾" : "▸"}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.textPri }}>{g.title}</span>
                <Chip text={String(rows.length)} tone={g.tone} />
              </button>
              <span style={{ fontSize: 12, color: C.textMuted, flex: "1 1 200px" }}>{g.hint}</span>
              {g.key === "locked" && lockedVisible.length > 0 && (
                <>
                  <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving || !pickedVisible.length} onClick={() => confirmUnlock(pickedVisible, "the selected devices")}>Unlock selected ({pickedVisible.length})</MiniBtn>
                  <MiniBtn tone="success" icon={<IconUnlock size={12} />} disabled={saving} onClick={() => confirmUnlock(lockedVisible, filterNote ? "all locked devices in this search" : "ALL locked devices")}>Unlock all ({lockedVisible.length})</MiniBtn>
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
    </>
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