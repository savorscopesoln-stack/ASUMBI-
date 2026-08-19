import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  Search, X, RefreshCw, Download, Plus, UserPlus, ChevronDown, ArrowLeft, Pencil, Trash2,
  Check, CheckCircle2, AlertTriangle, Lock, Unlock, Zap, Rocket, MessageSquare, Mail,
  BarChart3, ClipboardList, FileText, Award, LockKeyhole, Users, Inbox, Clock, TrendingUp,
  Sun, Moon,
} from "lucide-react";

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
const IconUsers        = Users;
const IconInbox        = Inbox;
const IconClock        = Clock;
const IconTrendUp      = TrendingUp;
const IconSun          = Sun;
const IconMoon         = Moon;

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

const computeGrade = (score, total = 100) => {
  if (score == null) return "—";
  const pct = (score / (total || 100)) * 100;
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const TABS = [
  { label: "Assessments",     icon: IconClipboardList },
  { label: "Submissions",     icon: IconFileText },
  { label: "Remark Requests", icon: IconMessage },
  { label: "Released Marks",  icon: IconAward },
  { label: "Device Locks",    icon: IconLockKeyhole },
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
  const [answerModal,  setAnswerModal]  = useState(null);
  const [quickStats,   setQuickStats]   = useState(null);

  /* selections */
  const [selAssessments, setSelAssessments] = useState([]);
  const [selAssignments, setSelAssignments] = useState([]);

  /* forms */
  const blank = { title: "", subject: "", class_id: "", duration_minutes: 30, instructions: "", total_marks: 100, exam_password: "" };
  const [form,          setForm]          = useState(blank);
  const [editForm,      setEditForm]      = useState(blank);
  const [assignForm,    setAssignForm]    = useState({ teacher_id: "", subject_id: "", class_id: "" });
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
      const [assessments, cls, subj, teach, assigned, subs, remarks, released, sessions] =
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
    } catch (err) {
      console.error(err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ═══════════════════════════════════════════════════════════
     HANDLERS  (unchanged logic)
  ═══════════════════════════════════════════════════════════ */
  const createAssessment = async () => {
    if (!form.title || !form.subject || !form.class_id) {
      showToast("Please fill all required fields", "error"); return;
    }
    try {
      setSaving(true);
      await API.post("/e-assessments", {
        title:            form.title,
        subject:          form.subject,
        class_id:         Number(form.class_id),
        duration_minutes: Number(form.duration_minutes),
        instructions:     form.instructions,
        total_marks:      Number(form.total_marks) || 100,
        exam_password:    form.exam_password,
      });
      setForm(blank); setFormOpen(false);
      showToast("Assessment created successfully");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Create failed", "error");
    } finally { setSaving(false); }
  };

  const openEditModal = (a) => {
    setEditForm({
      id: a.id, title: a.title || "", subject: a.subject || "",
      class_id: a.class_id || "", duration_minutes: a.duration_minutes || 30,
      instructions: a.instructions || "", total_marks: a.total_marks || 100,
      exam_password: a.exam_password || "",
    });
    setEditOpen(true);
  };

  const saveEditAssessment = async () => {
    if (!editForm.title || !editForm.subject || !editForm.class_id) {
      showToast("Please fill all required fields", "error"); return;
    }
    try {
      setSaving(true);
      await API.put(`/e-assessments/${editForm.id}`, {
        title:            editForm.title,
        subject:          editForm.subject,
        class_id:         Number(editForm.class_id),
        duration_minutes: Number(editForm.duration_minutes),
        instructions:     editForm.instructions,
        total_marks:      Number(editForm.total_marks) || 100,
        exam_password:    editForm.exam_password,
      });
      setEditOpen(false);
      showToast("Assessment updated successfully");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Update failed", "error");
    } finally { setSaving(false); }
  };

  const toggleAssessmentActive = async (id) => {
    try {
      const res = await API.put(`/e-assessments/admin/${id}/toggle-active`);
      const next = res.data.active_status;
      showToast(`Assessment ${next === "Active" ? "activated" : "deactivated"}`);
      loadAll();
    } catch {
      showToast("Toggle failed", "error");
    }
  };

  const reviewAssessment = async (id, status) => {
    try {
      await API.put(`/e-assessments/admin/${id}/review`, { status, admin_comment: "" });
      showToast(`Assessment ${status}`);
      loadAll();
    } catch { showToast("Review failed", "error"); }
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

  const openAnswerModal = async (sub) => {
    try {
      const res = await API.get(`/e-assessments/marking/submission/${sub.id}`);
      setAnswerModal({ sub, ...res.data });
    } catch { showToast("Failed to load answers", "error"); }
  };

  const assignTeacher = async () => {
    if (!assignForm.teacher_id || !assignForm.subject_id || !assignForm.class_id) {
      showToast("Please complete all fields", "error"); return;
    }
    try {
      setSaving(true);
      await API.post("/e-assessments/admin/assign-teacher", {
        teacher_id: Number(assignForm.teacher_id),
        subject_id: Number(assignForm.subject_id),
        class_id:   Number(assignForm.class_id),
      });
      setAssignForm({ teacher_id: "", subject_id: "", class_id: "" });
      setAssignOpen(false);
      showToast("Teacher assigned successfully");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Assignment failed", "error");
    } finally { setSaving(false); }
  };

  const bulkAssignBySubject = async (subjectName) => {
    const unassigned = submissions.filter(
      (s) => String(s.subject_name) === String(subjectName) && !s.assigned_teacher_id
    );
    if (!unassigned.length) { showToast("No unassigned submissions for this subject", "error"); return; }

    const teacherIds = assignedTeachers
      .filter((t) => String(t.subject_name) === String(subjectName))
      .map((t) => t.teacher_id);

    if (!teacherIds.length) { showToast("No teachers assigned to this subject yet", "error"); return; }

    try {
      setSaving(true);
      await API.post("/e-assessments/admin/bulk-assign-submissions", {
        subject_id:     subjectName,
        submission_ids: unassigned.map((s) => s.id),
        teacher_ids:    teacherIds,
      });
      showToast(`${unassigned.length} submissions split across ${teacherIds.length} teacher(s)`);
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk assignment failed", "error");
    } finally { setSaving(false); }
  };

  const bulkAssignAll = async () => {
    const groups = {};
    submissions.filter((s) => !s.assigned_teacher_id).forEach((s) => {
      const k = s.subject_name || "unknown";
      if (!groups[k]) groups[k] = [];
      groups[k].push(s);
    });
    const keys = Object.keys(groups);
    if (!keys.length) { showToast("No unassigned submissions found", "error"); return; }

    try {
      setSaving(true);
      for (const subName of keys) {
        const tids = assignedTeachers
          .filter((t) => String(t.subject_name) === String(subName))
          .map((t) => t.teacher_id);
        if (!tids.length) continue;
        await API.post("/e-assessments/admin/bulk-assign-submissions", {
          subject_id: subName,
          submission_ids: groups[subName].map((s) => s.id),
          teacher_ids: tids,
        });
      }
      showToast("All subjects processed");
      loadAll();
    } catch { showToast("Some assignments failed", "error"); }
    finally { setSaving(false); }
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

  const unlockSession = async (sessionId) => {
    try {
      setSaving(true);
      await API.put(`/e-assessments/admin/exam-sessions/${sessionId}/unlock`);
      showToast("Session unlocked — student can resume on a new device");
      loadAll();
    } catch (err) {
      showToast(err?.response?.data?.message || "Unlock failed", "error");
    } finally { setSaving(false); }
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
    unassigned: submissions.filter((s) => !s.assigned_teacher_id).length,
    marked:     submissions.filter((s) => s.score != null).length,
    released:   submissions.filter((s) => s.status === "released").length,
  }), [submissions]);

  const pendingRemarks = remarkRequests.filter(
    (r) => r.remark_status === "pending" || r.remark_requested === 1
  ).length;

  const lockedSessions = examSessions.filter((s) => s.status === "locked").length;

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
          <ActionButton primary icon={<IconPlus size={14} />} onClick={() => setFormOpen(true)}>New Assessment</ActionButton>
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
            {i === 4 && lockedSessions > 0        && <NotifPill n={lockedSessions}        tone="danger" />}
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
                  <DropItem icon={<IconTrash size={14} />} onClick={() => { setBulkMenu(false); deleteAssessments(selAssessments); }}>
                    Delete {selAssessments.length} assessment{selAssessments.length !== 1 ? "s" : ""}
                  </DropItem>
                  <DropItem icon={<IconTrash size={14} />} onClick={() => { setBulkMenu(false); deleteAssignments(selAssignments); }}>
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
              {assignedTeachers.map((item) => (
                <div key={item.id} className="dash-card" style={sx.assignCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: C.textPri, fontSize: 15 }}>{item.teacher_name}</p>
                      <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textMuted }}>
                        {item.subject_name} · {item.class_name}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selAssignments.includes(item.id)}
                      onChange={() => setSelAssignments((p) =>
                        p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id]
                      )}
                      style={{ accentColor: C.accent, cursor: "pointer", width: 15, height: 15 }}
                    />
                  </div>
                  <MiniBtn tone="danger" icon={<IconTrash size={12} />} onClick={() => deleteAssignments([item.id])} style={{ marginTop: 14 }}>
                    Remove
                  </MiniBtn>
                </div>
              ))}
            </div>
          )}

          <SectionHeader title={`Assessments (${filtered.length})`} />
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
                  onApprove={() => reviewAssessment(a.id, "approved")}
                  onReject={() => reviewAssessment(a.id, "rejected")}
                  onStats={() => openQuickStats(a)}
                  onEdit={() => openEditModal(a)}
                  onDelete={() => deleteAssessments([a.id])}
                  onToggle={() => toggleAssessmentActive(a.id)}
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
                                  : <Chip text="Unassigned" tone="danger" />}
                              </Td>
                              <Td>{sub.score != null ? <ScoreBadge score={sub.score} total={sub.total_marks || 100} /> : <span style={{ color: C.textMuted }}>—</span>}</Td>
                              <Td>{sub.score != null ? <GradeBadge grade={computeGrade(sub.score, sub.total_marks)} /> : <span style={{ color: C.textMuted }}>—</span>}</Td>
                              <Td><MarkPill status={sub.status} score={sub.score} /></Td>
                              <Td>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  {!sub.assigned_teacher_id && subjectTeachers.length > 0 && (
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
                                  <MiniBtn onClick={() => openAnswerModal(sub)} icon={<IconFileText size={12} />}>Answers</MiniBtn>
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
                    <MetaRow label="Grade"        value={computeGrade(r.score, r.total_marks)} />
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
              releasedMarks.map((m) => ({
                student: m.student_name, assessment: m.assessment_title,
                subject: m.subject_name, score: m.score, total: m.total_marks,
                grade: computeGrade(m.score, m.total_marks), released: m.released_at,
              })), "released-marks.csv"
            )}>Export CSV</ActionButton>
          </div>

          {releasedMarks.length > 0 && <GradeDistribution marks={releasedMarks} />}

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
                    const total = m.total_marks || 100;
                    const pct   = m.score != null ? Math.round((m.score / total) * 100) : null;
                    return (
                      <tr key={m.id} className="row-hover">
                        <Td><span style={{ fontWeight: 600, color: C.textPri }}>{m.student_name || m.student_id}</span></Td>
                        <Td style={{ color: C.textSec }}>{m.assessment_title || "—"}</Td>
                        <Td style={{ color: C.textSec }}>{m.subject_name || "—"}</Td>
                        <Td><ScoreBadge score={m.score} total={total} /></Td>
                        <Td style={{ color: pct >= 50 ? C.success : C.danger, fontWeight: 700 }}>{pct != null ? `${pct}%` : "—"}</Td>
                        <Td><GradeBadge grade={computeGrade(m.score, total)} /></Td>
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
                Each student's exam token is bound to the first device it's used on. If a token is used
                on a second device the session locks automatically — unlock it here once you've confirmed
                which device the student should continue on.
              </p>
            </div>
          </div>

          {examSessions.length === 0 ? (
            <EmptyState icon={<IconUnlock size={26} />} text="No active exam sessions right now." />
          ) : (
            <div className="dash-card" style={sx.tableWrap}>
              <table style={sx.table}>
                <thead>
                  <tr>{["Student","Assessment","Token","Status","Device","Last Activity","Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {examSessions.map((sess) => (
                    <tr key={sess.id} className="row-hover">
                      <Td><span style={{ fontWeight: 600, color: C.textPri }}>{sess.student_name || `#${sess.student_id}`}</span></Td>
                      <Td style={{ color: C.textSec, fontSize: 13 }}>{sess.assessment_title || "—"}</Td>
                      <Td><span style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em", color: C.textPri }}>{sess.token}</span></Td>
                      <Td>
                        {sess.status === "locked" && <Chip icon={<IconLock size={11} />} text="Locked" tone="danger" />}
                        {sess.status === "active" && <Chip icon={<IconDot size={7} />} text="Active" tone="success" />}
                        {sess.status === "issued" && <Chip text="Not started" tone="neutral" />}
                      </Td>
                      <Td style={{ color: C.textMuted, fontSize: 12, maxWidth: 220 }}>{sess.device_label || "—"}</Td>
                      <Td style={{ color: C.textMuted, fontSize: 12 }}>{fmtDateTime(sess.last_heartbeat || sess.activated_at)}</Td>
                      <Td>
                        {sess.status === "locked" ? (
                          <MiniBtn tone="success" icon={<IconUnlock size={12} />} onClick={() => unlockSession(sess.id)}>Unlock</MiniBtn>
                        ) : (
                          <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════ */}

      {formOpen && (
        <Modal title="Create New Assessment" onClose={() => setFormOpen(false)}>
          <FieldLabel>Assessment Title *</FieldLabel>
          <ModalInput placeholder="e.g. Mid-Term Mathematics Paper 1" value={form.title}
            onChange={(v) => setForm({ ...form, title: v })} />

          <FieldLabel>Subject *</FieldLabel>
          <ModalSelect value={form.subject} onChange={(v) => setForm({ ...form, subject: v })}
            options={subjects.map((s) => ({ value: s.name || s.subject_name, label: s.name || s.subject_name }))}
            placeholder="Select Subject" />

          <FieldLabel>Class *</FieldLabel>
          <ModalSelect value={form.class_id} onChange={(v) => setForm({ ...form, class_id: v })}
            options={classes.map((c) => ({ value: c.id || c.class_id, label: c.class_name || c.name }))}
            placeholder="Select Class" />

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

          <p style={sx.formHint}>
            All students in the selected class can take this assessment once it is approved and activated.
            Each student will receive a unique 6-character exam token bound to their first device.
          </p>
          <SaveButton onClick={createAssessment} loading={saving} label="Create Assessment" />
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

          <FieldLabel>Class *</FieldLabel>
          <ModalSelect value={editForm.class_id} onChange={(v) => setEditForm({ ...editForm, class_id: v })}
            options={classes.map((c) => ({ value: c.id || c.class_id, label: c.class_name || c.name }))}
            placeholder="Select Class" />

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

          <SaveButton onClick={saveEditAssessment} loading={saving} label="Save Changes" />
        </Modal>
      )}

      {assignOpen && (
        <Modal title="Assign Teacher to Subject & Class" onClose={() => setAssignOpen(false)}>
          <FieldLabel>Teacher *</FieldLabel>
          <ModalSelect value={assignForm.teacher_id} onChange={(v) => setAssignForm({ ...assignForm, teacher_id: v })}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select Teacher" />

          <FieldLabel>Subject *</FieldLabel>
          <ModalSelect value={assignForm.subject_id} onChange={(v) => setAssignForm({ ...assignForm, subject_id: v })}
            options={subjects.map((s) => ({ value: s.id, label: s.name || s.subject_name }))} placeholder="Select Subject" />

          <FieldLabel>Class *</FieldLabel>
          <ModalSelect value={assignForm.class_id} onChange={(v) => setAssignForm({ ...assignForm, class_id: v })}
            options={classes.map((c) => ({ value: c.id || c.class_id, label: c.class_name || c.name }))} placeholder="Select Class" />

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
                <DetailRow label="Grade"   value={computeGrade(selected.score, selected.total_marks)} />
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

      {answerModal && (
        <Modal title={`Answers — ${answerModal.sub?.student_name || "Student"}`} onClose={() => setAnswerModal(null)}>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <ScoreBadge score={answerModal.sub?.score} total={answerModal.sub?.total_marks || 100} />
            <GradeBadge grade={computeGrade(answerModal.sub?.score, answerModal.sub?.total_marks)} />
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

      {releaseModal && (
        <Modal title="Confirm Mark Release" onClose={() => setReleaseModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <DetailRow label="Student"    value={releaseModal.student_name || releaseModal.student_id} />
            <DetailRow label="Assessment" value={releaseModal.assessment_title || `Assessment #${releaseModal.e_assessment_id}`} />
            <DetailRow label="Subject"    value={releaseModal.subject_name || "—"} />
            <DetailRow label="Mark"       value={`${releaseModal.score} / ${releaseModal.total_marks || 100}`} />
            <DetailRow label="Grade"      value={computeGrade(releaseModal.score, releaseModal.total_marks)} />
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
function AssessmentCard({ a, selected, onSelect, onApprove, onReject, onStats, onEdit, onDelete, onToggle }) {
  const C = useC();
  const isActive = a.active_status !== "Inactive";
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
        <MetaRow label="Class"       value={a.class_name || a.class_id || "N/A"} />
        <MetaRow label="Duration"    value={`${a.duration_minutes || 0} min`} />
        <MetaRow label="Total Marks" value={a.total_marks || 100} />
        <MetaRow label="Questions"   value={a.question_count || 0} />
        <MetaRow label="Submissions" value={a.submission_count || 0} />
        <MetaRow label="Teacher"     value={a.teacher_name || "Not assigned"} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "10px 14px", background: C.bgAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isActive ? C.success : C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <IconDot size={7} /> {isActive ? "Active" : "Inactive"}
        </span>
        <ToggleSwitch checked={isActive} onChange={onToggle} />
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        <MiniBtn tone="success" grow icon={<IconCheck size={12} />} onClick={onApprove}>Approve</MiniBtn>
        <MiniBtn tone="danger"  grow icon={<IconX size={12} />}     onClick={onReject}>Reject</MiniBtn>
        <MiniBtn grow icon={<IconBarChart size={12} />} onClick={onStats}>Stats</MiniBtn>
        <MiniBtn icon={<IconEdit size={12} />} onClick={onEdit} title="Edit" />
        <MiniBtn tone="danger" icon={<IconTrash size={12} />} onClick={onDelete} title="Delete" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRADE DISTRIBUTION
═══════════════════════════════════════════════════════════ */
function GradeDistribution({ marks }) {
  const C = useC();
  const computeGradeLocal = (score, total = 100) => {
    if (score == null) return "—";
    const pct = (score / (total || 100)) * 100;
    if (pct >= 80) return "A"; if (pct >= 70) return "B";
    if (pct >= 60) return "C"; if (pct >= 50) return "D"; return "E";
  };
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  marks.forEach((m) => { const g = computeGradeLocal(m.score, m.total_marks); if (counts[g] !== undefined) counts[g]++; });
  const max = Math.max(...Object.values(counts), 1);

  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
      <p style={{ margin: "0 0 18px", fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Grade Distribution — {marks.length} Release{marks.length !== 1 ? "s" : ""}
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 90 }}>
        {Object.entries(counts).map(([grade, count]) => (
          <div key={grade} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec }}>{count}</span>
            <div style={{
              width: "100%", minHeight: count > 0 ? 4 : 0,
              height: `${(count / max) * 64}px`,
              background: C.textPri,
              opacity: 0.55 + (grade === "A" ? 0.3 : grade === "B" ? 0.15 : 0),
              borderRadius: "3px 3px 0 0",
              transition: "height 0.3s ease",
            }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>{grade}</span>
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

function SectionHeader({ title }) {
  const C = useC();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "32px 0 14px" }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  const C = useC();
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, borderRadius: 99, border: `1px solid ${C.border}`, cursor: "pointer", background: checked ? C.success : C.bgAlt, position: "relative", transition: "background 0.2s", padding: 0, flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: C.white, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.4)" }} />
    </button>
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
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec, maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
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

function MiniBtn({ children, icon, onClick, tone, grow, full, neutral, title, style }) {
  const C = useC();
  const color = neutral || !tone ? C.textSec : C[tone] || C.textSec;
  return (
    <button onClick={onClick} title={title} className="btn-hover" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
      padding: children ? "7px 12px" : "7px 9px", borderRadius: 7,
      border: `1px solid ${C.border}`, background: C.bgAlt, color,
      fontWeight: 600, fontSize: 12, cursor: "pointer",
      flex: grow ? 1 : full ? "1 1 100%" : "0 0 auto",
      width: full ? "100%" : undefined,
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

function DropItem({ children, icon, onClick }) {
  const C = useC();
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.textSec, textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
      {icon}{children}
    </button>
  );
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