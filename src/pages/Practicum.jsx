import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import API from "../api";
import { getStoredUser } from "../permissions";
import { useTheme } from "../context/ThemeContext";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "manage", label: "Manage" },
  { id: "placement", label: "Placement" },
  { id: "deploy", label: "Deploy" },
  { id: "sessions", label: "Sessions" },
  { id: "assignments", label: "Assignments" },
  { id: "assess", label: "Assessments" },
  { id: "reports", label: "Reports" },
  { id: "logs", label: "Logs" },
];

const MANAGE_SUBTABS = [
  { id: "regions", label: "Regions" },
  { id: "schools", label: "Schools" },
  { id: "teachers", label: "Teachers" },
  { id: "students", label: "Students" },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Mirrors MAX_PER_TEACHER in backend/routes/practicum.js — used only to
// flag/disable full teachers in the manual-reassign dropdown. The real
// enforcement happens server-side; this is just for a clearer UI.
const MAX_PER_TEACHER_CLIENT = 7;

/* ================= DATE HELPERS =================
   The backend only stores a weekday NAME per deployment (e.g. "Monday"),
   never a real calendar date — a research day is a standing weekly slot,
   not a one-time event. These helpers compute a real date for DISPLAY
   only, on the frontend, without needing any database change:
     - nextDateForWeekday: the next upcoming calendar date that falls on
       a given weekday (used to show "Monday (25 Aug 2026)" next to a
       teacher's research day).
     - weekdayNameForDate: the reverse — given a calendar date picked in
       the Reports tab, what weekday name to match assignments against.
   NOTE: because no exact date is persisted, an "extra" one-off
   deployment on a given weekday will match every future date that
   falls on that same weekday in the date-based report below. There is
   no way to tell a one-off Monday deployment from a recurring research
   day apart after the fact without adding a date column. */
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextDateForWeekday(weekdayName, fromDate = new Date()) {
  const targetIndex = WEEKDAY_NAMES.indexOf(weekdayName);
  if (targetIndex === -1) return null;
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const diff = (targetIndex - from.getDay() + 7) % 7;
  const result = new Date(from);
  result.setDate(from.getDate() + diff);
  return result;
}

function weekdayNameForDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_NAMES[d.getDay()];
}

function formatDateShort(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ================= THEME =================
   Practicum no longer keeps its own light/dark palette or localStorage
   toggle. It shares the single design-token stylesheet (CSS variables
   on :root / [data-theme='dark']) and the ThemeContext that Dashboard
   owns, so colors, radii, and shadows stay identical across every page.
   injectStyles() is idempotent (guarded by the "dash-tokens" id) so
   it's safe to call again here in case this page is the first one
   mounted. */
const injectDesignTokens = () => {
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
  `;
  document.head.appendChild(el);
};

/* Injected once — keeps this a single-file component while still giving us
   real @media queries and CSS variables, which inline style objects can't do. */
const RESPONSIVE_CSS = `
  .pz-app, .pz-app input, .pz-app select, .pz-app button, .pz-app textarea { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  .pz-app h1, .pz-app h2, .pz-app h3 { font-family: 'Inter', sans-serif; font-weight: 700; letter-spacing: -0.01em; }
  .pz-app *:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

  .pz-progress { position: sticky; top: 0; height: 3px; width: 100%; overflow: hidden; z-index: 50; }
  .pz-progress .pz-progress-fill { height: 100%; width: 40%; background: var(--primary); opacity: 0; transform: translateX(-100%); }
  .pz-progress.active .pz-progress-fill { opacity: 1; animation: pz-indeterminate 1.1s ease-in-out infinite; }
  @keyframes pz-indeterminate {
    0%   { transform: translateX(-100%); width: 40%; }
    50%  { width: 60%; }
    100% { transform: translateX(250%); width: 40%; }
  }

  .pz-topbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:14px 20px; background:var(--card); border-bottom:1px solid var(--border); }

  .pz-layout { display:flex; }
  .pz-sidebar { width:200px; background:var(--card); border-right:1px solid var(--border); min-height:calc(100vh - 61px); padding:14px 10px; }
  .pz-nav-btn { width:100%; padding:10px 12px; margin-bottom:4px; border:1px solid transparent; border-radius:9px; cursor:pointer; text-align:left; font-size:13.5px; font-weight:600; background:transparent; color:var(--text-secondary); transition:background .12s ease, color .12s ease; }
  .pz-nav-btn:hover { background:var(--primary-tint); color:var(--primary-dark); }
  .pz-nav-btn.active { background:var(--primary-tint); color:var(--primary); font-weight:700; }
  .pz-main { flex:1; padding:24px; min-width:0; background:var(--bg); }
  .pz-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .pz-btn-row { display:flex; gap:8px; flex-wrap:wrap; }
  .pz-letter-container { width:75%; }
  .pz-modal { padding:16px; }
  .pz-icon-btn { border:1px solid var(--border); background:var(--card); border-radius:9px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:15px; color:var(--text); }
  .pz-icon-btn:hover { background:var(--bg); }
  .pz-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; }
  .pz-badge-success { background:var(--success-tint); color:var(--success); }
  .pz-badge-warn { background:var(--warning-tint); color:var(--warning); }
  .pz-badge-error { background:var(--destructive-tint); color:var(--destructive); }
  .pz-badge-info { background:var(--card-elevated); color:var(--text-muted); }
  .pz-log-row { display:grid; grid-template-columns:150px 100px 160px 1fr; gap:10px; padding:9px 4px; border-bottom:1px solid var(--border); font-size:12.5px; align-items:start; }
  .pz-log-row.head { color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:10.5px; letter-spacing:.04em; }
  .pz-chip { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:999px; border:1px solid var(--border); background:var(--card); font-size:12.5px; cursor:pointer; color:var(--text); }
  .pz-chip.on { background:var(--primary-tint); border-color:var(--primary); color:var(--primary); font-weight:700; }
  .pz-teacher-pick { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-bottom:8px; background:var(--card); }
  .pz-teacher-pick.checked { border-color:var(--primary); background:var(--primary-tint); }

  @media (max-width: 820px) {
    .pz-topbar { padding:10px; }
    .pz-topbar h1 { font-size:16px; }
    .pz-search { width:100%; order:3; }
    .pz-session-select { flex:1; min-width:0; }
    .pz-layout { flex-direction:column; }
    .pz-sidebar { width:100%; min-height:auto; display:flex; overflow-x:auto; padding:8px; gap:8px; }
    .pz-nav-btn { width:auto; flex:0 0 auto; margin-bottom:0; white-space:nowrap; }
    .pz-main { padding:12px; }
    .pz-card { padding:14px !important; border-radius:12px !important; }
    .pz-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
    .pz-letter-container { width:96%; }
    .pz-btn-row { width:100%; }
    .pz-btn-row button { flex:1; }
    .pz-th, .pz-td { font-size:11px !important; padding:6px !important; }
    .pz-score-input { width:38px !important; }
    .pz-teacher-block-row { flex-direction:column; align-items:flex-start !important; gap:6px; }
    .pz-log-row { grid-template-columns:1fr; gap:2px; }
  }

  @media print {
    .pz-sidebar, .pz-topbar, .pz-btn-row, .pz-icon-btn { display:none !important; }
  }
`;

export default function Practicum() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const isAdmin = String(currentUser?.role || "").toLowerCase().trim() === "admin";

  const [meta, setMeta] = useState({ regions: [], schools: [], teachers: [], students: [] });
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [reportSession, setReportSession] = useState(null);
  const [reportPickDate, setReportPickDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [activeTab, setActiveTab] = useState("dashboard");
  const [manageTab, setManageTab] = useState("regions");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showLetters, setShowLetters] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", date: "", term: "Term 1" });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionForm, setEditSessionForm] = useState({ title: "", date: "", term: "" });

  const [regionForm, setRegionForm] = useState({ name: "" });
  const [schoolForm, setSchoolForm] = useState({ name: "", regionId: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", phone: "", regionId: "", researchDay: "Monday" });
  const [studentForm, setStudentForm] = useState({ name: "", admissionNo: "", schoolId: "" });
  const [editing, setEditing] = useState({ type: null, id: null, data: {} });

  const [assessDrafts, setAssessDrafts] = useState({});

  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    injectDesignTokens();
  }, []);

  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem("pz_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [logsView, setLogsView] = useState("summary");
  const [logFilter, setLogFilter] = useState("");

  const addLog = (action, details, level = "info") => {
    setLogs((prev) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: new Date().toISOString(),
        action,
        details: details || "",
        level,
      };
      const next = [entry, ...prev].slice(0, 1000);
      try {
        localStorage.setItem("pz_logs", JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  };

  const clearLogs = () => {
    confirmThen("Clear all activity logs? This cannot be undone.", () => {
      setLogs([]);
      try {
        localStorage.removeItem("pz_logs");
      } catch {
        /* ignore */
      }
    });
  };

  const exportLogsCSV = () => {
    const header = ["Timestamp", "Level", "Action", "Details"];
    const lines = logs.map((l) =>
      [new Date(l.ts).toLocaleString(), l.level, l.action, `"${(l.details || "").replace(/"/g, '""')}"`].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    downloadBlob(csv, "practicum-activity-log.csv", "text/csv");
  };

  const [schoolTargets, setSchoolTargets] = useState({});

  const [deployRegionId, setDeployRegionId] = useState("");
  const [deployDayMode, setDeployDayMode] = useState("research");
  const [deployExtraDay, setDeployExtraDay] = useState("");
  const [deployExtraDate, setDeployExtraDate] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);

  const notify = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const safeGet = async (url) => {
    try {
      const res = await API.get(url);
      return res.data;
    } catch {
      return null;
    }
  };
  const safePost = async (url, data) => {
    try {
      return (await API.post(url, data)).data;
    } catch (err) {
      return { error: err?.response?.data?.error || "Request failed" };
    }
  };
  const safePut = async (url, data) => {
    try {
      return (await API.put(url, data)).data;
    } catch (err) {
      return { error: err?.response?.data?.error || "Request failed" };
    }
  };
  const safeDelete = async (url) => {
    try {
      return (await API.delete(url)).data;
    } catch (err) {
      return { error: err?.response?.data?.error || "Request failed" };
    }
  };
  const confirmThen = (msg, fn) => {
    if (window.confirm(msg)) fn();
  };

  const loadAll = async () => {
    setLoading(true);
    const [metaData, sessionList] = await Promise.all([
      safeGet("/practicum/meta"),
      safeGet("/practicum"),
    ]);
    if (metaData) setMeta(metaData);
    if (sessionList) {
      setSessions(sessionList);
      if (!sessionId && sessionList.length) setSessionId(sessionList[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadAssignments(sessionId);
      loadReport(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadAssignments = async (id) => {
    const data = await safeGet(`/practicum/assign/${id}`);
    setAssignments(data || []);
  };

  const loadReport = async (id) => {
    const data = await safeGet(`/practicum/report/${id}`);
    if (data) {
      setReportSession(data.session);
      setReportRows(data.rows || []);
    }
  };

  const refreshSessionData = () => {
    loadAssignments(sessionId);
    loadReport(sessionId);
  };

  const createSession = async () => {
    if (!form.title || !form.date) return notify("Fill in title and date", true);
    setLoading(true);
    const session = await safePost("/practicum", form);
    setLoading(false);
    if (!session || session.error) {
      addLog("Session create failed", session?.error || "Failed to create session", "error");
      return notify(session?.error || "Failed to create session", true);
    }

    setSessions((prev) => [session, ...prev]);
    setSessionId(session.id);
    setForm({ title: "", date: "", term: "Term 1" });
    notify(`Session "${session.title}" created`);
    addLog("Session created", `Created session "${session.title}" (${session.term}).`, "success");
    setActiveTab("assignments");
  };

  const startEditSession = (s) => {
    setEditingSessionId(s.id);
    setEditSessionForm({ title: s.title, date: s.date?.slice(0, 10), term: s.term });
  };

  const saveEditSession = async (id) => {
    const result = await safePut(`/practicum/${id}`, editSessionForm);
    if (result?.error) {
      addLog("Session update failed", result.error, "error");
      return notify(result.error, true);
    }
    notify("Session updated");
    addLog("Session updated", `Updated session "${editSessionForm.title}".`, "success");
    setEditingSessionId(null);
    loadAll();
    if (id === sessionId) loadReport(id);
  };

  const deleteSession = (id, title) => {
    confirmThen(`Delete session "${title}" and ALL its assignments/assessments? This cannot be undone.`, async () => {
      const result = await safeDelete(`/practicum/${id}`);
      if (result?.error) {
        addLog("Session delete failed", result.error, "error");
        return notify(result.error, true);
      }
      notify("Session deleted");
      addLog("Session deleted", `Deleted session "${title}" and its assignments/assessments.`, "warn");
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        setSessionId(null);
        setAssignments([]);
        setReportRows([]);
        setReportSession(null);
      }
    });
  };

  const autoAssign = async () => {
    if (!sessionId) return notify("Create or select a session first", true);
    setLoading(true);
    const result = await safePost(`/practicum/auto-assign/${sessionId}`, {});
    setLoading(false);
    if (!result || result.error) {
      addLog("Auto-assign failed", result?.error || "Auto-assign failed", "error");
      return notify(result?.error || "Auto-assign failed", true);
    }

    notify(`Assigned ${result.studentsAssigned} students in ${result.groups} groups across ${result.days} day(s)`);
    addLog(
      "Auto-assign (teachers)",
      `Assigned ${result.studentsAssigned} students to teachers in ${result.groups} groups across ${result.days} day(s).`,
      "success"
    );
    refreshSessionData();
  };

  const resetAssignments = () => {
    if (!sessionId) return;
    confirmThen("Remove ALL assignments for this session so you can re-run Auto-Assign from scratch?", async () => {
      const result = await safeDelete(`/practicum/assign/session/${sessionId}`);
      if (result?.error) {
        addLog("Reset assignments failed", result.error, "error");
        return notify(result.error, true);
      }
      notify("Assignments cleared");
      addLog("Assignments reset", `Cleared all teacher assignments for session ${sessionId}.`, "warn");
      refreshSessionData();
    });
  };

  const reassign = async (assignmentId, teacherId) => {
    const current = assignments.find((a) => a.assignmentId === assignmentId);
    if (current && String(current.teacherId) !== String(teacherId)) {
      const destinationCount = assignments.filter(
        (a) => a.day === current.day && String(a.teacherId) === String(teacherId)
      ).length;
      if (destinationCount >= MAX_PER_TEACHER_CLIENT && !isAdmin) {
        return notify(
          `That teacher already has ${destinationCount}/${MAX_PER_TEACHER_CLIENT} trainees for this day. Only an admin can manually add beyond the cap.`,
          true
        );
      }
    }

    const result = await safePut(`/practicum/assign/${assignmentId}`, { teacherId });
    if (result?.error) {
      addLog("Reassign failed", result.error, "error");
      return notify(result.error, true);
    }
    const teacherName = meta.teachers.find((t) => t.id === teacherId)?.name || `teacher #${teacherId}`;
    addLog("Reassigned", `Moved assignment #${assignmentId} to ${teacherName}.`, "success");
    refreshSessionData();
  };

  const removeAssignment = (assignmentId, studentName) => {
    confirmThen(`Remove ${studentName} from this session's assignments?`, async () => {
      const result = await safeDelete(`/practicum/assign/${assignmentId}`);
      if (result?.error) {
        addLog("Remove assignment failed", result.error, "error");
        return notify(result.error, true);
      }
      notify("Removed");
      addLog("Assignment removed", `Removed ${studentName} from the session's assignments.`, "warn");
      refreshSessionData();
    });
  };

  const regionTeachers = useMemo(
    () => meta.teachers.filter((t) => !deployRegionId || String(t.regionId) === String(deployRegionId)),
    [meta.teachers, deployRegionId]
  );

  const effectiveDeployDay = deployDayMode === "extra" ? deployExtraDay : null;

  const toggleTeacherSelected = (id) => {
    setSelectedTeacherIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllRegionTeachers = () => setSelectedTeacherIds(regionTeachers.map((t) => t.id));
  const clearSelectedTeachers = () => setSelectedTeacherIds([]);

  const deployTeachers = async () => {
    if (!sessionId) return notify("Select a session first", true);
    if (!deployRegionId) return notify("Select a region", true);
    if (!selectedTeacherIds.length) return notify("Pick at least one teacher to deploy", true);
    if (deployDayMode === "extra" && !deployExtraDay) return notify("Choose a day for this extra deployment", true);

    setLoading(true);
    const payload = {
      sessionId,
      regionId: deployRegionId,
      isExtra: deployDayMode === "extra",
      day: deployDayMode === "extra" ? deployExtraDay : null,
      date: deployDayMode === "extra" ? deployExtraDate || null : null,
      teacherIds: selectedTeacherIds,
    };
    const result = await safePost("/practicum/deploy", payload);
    setLoading(false);
    if (!result || result.error) {
      addLog("Deployment failed", result?.error || "Deploy request failed", "error");
      return notify(result?.error || "Deploy failed", true);
    }

    const regionName = meta.regions.find((r) => String(r.id) === String(deployRegionId))?.name || "region";
    const dayLabel = deployDayMode === "extra"
      ? `extra day (${deployExtraDay}, ${
          deployExtraDate
            ? formatDateShort(new Date(`${deployExtraDate}T00:00:00`))
            : formatDateShort(nextDateForWeekday(deployExtraDay))
        })`
      : "their own research day (dates shown per teacher above)";
    notify(`Deployed ${selectedTeacherIds.length} teacher(s) for ${regionName} — ${dayLabel}`);
    addLog(
      "Teachers deployed",
      `Deployed ${selectedTeacherIds.length} teacher(s) in ${regionName} on ${dayLabel}.`,
      "success"
    );
    setSelectedTeacherIds([]);
    refreshSessionData();
  };

  const draftFor = (assessmentRowId, fallback) =>
    assessDrafts[assessmentRowId] !== undefined ? assessDrafts[assessmentRowId] : fallback;

  const setDraft = (assessmentRowId, value) =>
    setAssessDrafts((prev) => ({ ...prev, [assessmentRowId]: value }));

  const saveAssessment = async (assessmentRowId, score) => {
    if (!assessmentRowId) return;
    const result = await safePut(`/practicum/assessments/${assessmentRowId}`, {
      score: score === "" || score === null ? null : Number(score),
      remarks: "",
      assessedDate: new Date().toISOString().slice(0, 10),
    });
    if (result?.error) {
      addLog("Assessment save failed", result.error, "error");
      return notify(result.error, true);
    }
    notify("Saved");
    addLog("Assessment saved", `Saved score ${score === "" ? "(cleared)" : score} for assessment row #${assessmentRowId}.`, "success");
    loadReport(sessionId);
  };

  const createRegion = async () => {
    if (!regionForm.name) return notify("Region name required", true);
    const result = await safePost("/practicum/regions", regionForm);
    if (result?.error) {
      addLog("Region create failed", result.error, "error");
      return notify(result.error, true);
    }
    notify("Region added");
    addLog("Region created", `Added region "${regionForm.name}".`, "success");
    setRegionForm({ name: "" });
    loadAll();
  };
  const createSchool = async () => {
    if (!schoolForm.name || !schoolForm.regionId) return notify("School name and region required", true);
    const result = await safePost("/practicum/schools", schoolForm);
    if (result?.error) {
      addLog("School create failed", result.error, "error");
      return notify(result.error, true);
    }
    notify("School added");
    addLog("School created", `Added school "${schoolForm.name}".`, "success");
    setSchoolForm({ name: "", regionId: "" });
    loadAll();
  };
  const createTeacher = async () => {
    if (!teacherForm.name) return notify("Teacher name required", true);
    const result = await safePost("/practicum/teachers", teacherForm);
    if (result?.error) {
      addLog("Teacher create failed", result.error, "error");
      return notify(result.error, true);
    }
    notify("Teacher added");
    addLog("Teacher created", `Added teacher "${teacherForm.name}" (research day: ${teacherForm.researchDay}).`, "success");
    setTeacherForm({ name: "", email: "", phone: "", regionId: "", researchDay: "Monday" });
    loadAll();
  };
  const createStudent = async () => {
    if (!studentForm.name) return notify("Student name required", true);
    const result = await safePost("/practicum/students", studentForm);
    if (result?.error) {
      addLog("Student create failed", result.error, "error");
      return notify(result.error, true);
    }
    notify("Student added");
    addLog("Student created", `Added student "${studentForm.name}".`, "success");
    setStudentForm({ name: "", admissionNo: "", schoolId: "" });
    loadAll();
  };

  const startEdit = (type, item) => setEditing({ type, id: item.id, data: { ...item } });
  const cancelEdit = () => setEditing({ type: null, id: null, data: {} });

  const saveEdit = async () => {
    const { type, id, data } = editing;
    const urlMap = { regions: "regions", schools: "schools", teachers: "teachers", students: "students" };
    const result = await safePut(`/practicum/${urlMap[type]}/${id}`, data);
    if (result?.error) {
      addLog(`${labelForType(type)} update failed`, result.error, "error");
      return notify(result.error, true);
    }
    notify("Updated");
    addLog(`${labelForType(type)} updated`, `Updated "${data.name || `#${id}`}".`, "success");
    cancelEdit();
    loadAll();
  };

  const deleteItem = (type, id, label) => {
    const urlMap = { regions: "regions", schools: "schools", teachers: "teachers", students: "students" };
    confirmThen(`Delete "${label}"?`, async () => {
      const result = await safeDelete(`/practicum/${urlMap[type]}/${id}`);
      if (result?.error) {
        addLog(`${labelForType(type)} delete failed`, result.error, "error");
        return notify(result.error, true);
      }
      notify("Deleted");
      addLog(`${labelForType(type)} deleted`, `Deleted "${label}".`, "warn");
      loadAll();
    });
  };

  const labelForType = (type) =>
    ({ regions: "Region", schools: "School", teachers: "Teacher", students: "Student" }[type] || type);

  const unassignedStudents = useMemo(() => meta.students.filter((s) => !s.schoolId), [meta.students]);

  const schoolCounts = useMemo(() => {
    const map = {};
    meta.students.forEach((s) => {
      if (s.schoolId) map[s.schoolId] = (map[s.schoolId] || 0) + 1;
    });
    return map;
  }, [meta.students]);

  const totalTargeted = useMemo(
    () => Object.values(schoolTargets).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0),
    [schoolTargets]
  );

  const setTarget = (schoolId, value) => {
    const clean = value.replace(/[^0-9]/g, "");
    setSchoolTargets((prev) => ({ ...prev, [schoolId]: clean }));
  };

  const clearTargets = () => setSchoolTargets({});

  /* Places students by updating each one's schoolId. Previously this fired
     one PUT /practicum/students/:id per student in parallel (Promise.all),
     which — for any real batch size — opened dozens of concurrent
     transactions against the Students table at once. Each of those updates
     fires trg_UpdateClassesFromStudents on the backend, and that many
     overlapping writes collided on the trigger's own updates, producing
     repeated SQL Server deadlocks ("Transaction ... was deadlocked on lock
     resources ... chosen as the deadlock victim", error 1205) in the
     server logs.

     Fixed by sending the whole batch in a single call to the new
     PUT /practicum/students/bulk endpoint, which applies every update
     inside ONE transaction on the backend — no concurrent connections
     racing each other, no deadlocks. */
  const randomizePlacement = async () => {
    const targets = meta.schools
      .map((s) => ({ schoolId: s.id, name: s.name, count: parseInt(schoolTargets[s.id], 10) || 0 }))
      .filter((t) => t.count > 0);

    if (!targets.length) return notify("Set a target number of students for at least one school", true);
    if (!unassignedStudents.length) return notify("There are no unassigned students to place", true);

    const totalRequested = targets.reduce((sum, t) => sum + t.count, 0);
    if (totalRequested > unassignedStudents.length) {
      const proceed = window.confirm(
        `You requested ${totalRequested} placements but only ${unassignedStudents.length} unassigned students are available. Continue and fill as many as possible?`
      );
      if (!proceed) return;
    }

    // Fisher–Yates style shuffle of the unassigned pool
    const shuffled = [...unassignedStudents];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const placements = [];
    let idx = 0;
    for (const t of targets) {
      for (let i = 0; i < t.count && idx < shuffled.length; i++, idx++) {
        placements.push({ student: shuffled[idx], schoolId: t.schoolId, schoolName: t.name });
      }
    }

    if (!placements.length) return notify("Nothing to place", true);

    setLoading(true);
    const bulkResult = await safePut("/practicum/students/bulk", {
      updates: placements.map((p) => ({
        id: p.student.id,
        name: p.student.name,
        admissionNo: p.student.admissionNo,
        schoolId: p.schoolId,
      })),
    });
    setLoading(false);

    const failed = bulkResult?.error ? placements.length : 0;
    const placedCount = placements.length - failed;
    const bySchool = targets
      .map((t) => `${placements.filter((p) => p.schoolId === t.schoolId).length} → ${t.name}`)
      .join(", ");

    notify(
      failed
        ? `Placement failed: ${bulkResult.error}`
        : `Placed ${placedCount} students across ${targets.length} school(s)`,
      !!failed
    );
    addLog(
      "Automatic placement",
      failed
        ? `Bulk placement of ${placements.length} student(s) failed: ${bulkResult.error}`
        : `Randomly placed ${placedCount} student(s): ${bySchool}.`,
      failed ? "error" : "success"
    );

    setSchoolTargets({});
    loadAll();
  };

  const pivoted = useMemo(() => {
    const map = new Map();
    reportRows.forEach((r) => {
      if (!map.has(r.assignmentId)) {
        map.set(r.assignmentId, {
          assignmentId: r.assignmentId,
          day: r.day,
          teacherName: r.teacherName,
          studentName: r.studentName,
          schoolName: r.schoolName,
          regionName: r.regionName,
          assessments: [],
        });
      }
      if (r.assessmentNumber) {
        map.get(r.assignmentId).assessments.push({
          id: r.assessmentRowId,
          number: r.assessmentNumber,
          score: r.score,
          remarks: r.remarks,
        });
      }
    });

    return Array.from(map.values()).map((a) => {
      a.assessments.sort((x, y) => x.number - y.number);
      const scored = a.assessments.filter((x) => x.score !== null && x.score !== undefined);
      const average = scored.length
        ? (scored.reduce((sum, x) => sum + Number(x.score), 0) / scored.length).toFixed(1)
        : null;
      return { ...a, average, completed: scored.length };
    });
  }, [reportRows]);

  const filteredPivoted = useMemo(() => {
    if (!search) return pivoted;
    const q = search.toLowerCase();
    return pivoted.filter(
      (a) =>
        a.studentName?.toLowerCase().includes(q) ||
        a.teacherName?.toLowerCase().includes(q) ||
        a.schoolName?.toLowerCase().includes(q) ||
        a.regionName?.toLowerCase().includes(q)
    );
  }, [pivoted, search]);

  const toDateOnly = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const dateDeployRegions = useMemo(() => {
    const weekday = weekdayNameForDate(reportPickDate);
    if (!weekday) return [];

    const byRegion = new Map();
    assignments
      .filter((a) =>
        a.isExtra ? toDateOnly(a.deployDate) === reportPickDate : a.day === weekday
      )
      .forEach((a) => {
        const regionName = a.regionName || "Unassigned region";
        if (!byRegion.has(regionName)) byRegion.set(regionName, new Map());
        const teacherMap = byRegion.get(regionName);
        const teacherName = a.teacherName || "Unknown teacher";
        if (!teacherMap.has(teacherName)) teacherMap.set(teacherName, []);
        teacherMap.get(teacherName).push(`${a.studentName}${a.schoolName ? ` — ${a.schoolName}` : ""}`);
      });

    return [...byRegion.entries()].map(([regionName, teacherMap]) => [
      regionName,
      Object.fromEntries(teacherMap),
    ]);
  }, [assignments, reportPickDate]);

  const groupedLetters = useMemo(
    () =>
      meta.teachers.map((t) => ({
        teacher: t,
        students: assignments.filter((a) => a.teacherId === t.id),
      })),
    [meta.teachers, assignments]
  );

  const fullRoster = useMemo(
    () =>
      meta.teachers.map((t) => {
        const rows = assignments.filter((a) => a.teacherId === t.id);
        const region = meta.regions.find((r) => r.id === t.regionId);
        return {
          teacherId: t.id,
          teacherName: t.name,
          phone: t.phone || "",
          regionName: region?.name || t.regionName || "",
          researchDay: t.researchDay || "—",
          students: rows.map((a) => ({ name: a.studentName, school: a.schoolName, day: a.day })),
        };
      }),
    [meta.teachers, meta.regions, assignments]
  );

  const stats = useMemo(() => {
    const totalScored = pivoted.reduce((sum, a) => sum + a.completed, 0);
    const totalSlots = pivoted.length * 6;
    return {
      regions: meta.regions.length,
      schools: meta.schools.length,
      teachers: meta.teachers.length,
      students: meta.students.length,
      sessions: sessions.length,
      unassigned: meta.students.filter((s) => s.schoolId && !assignments.some((a) => a.studentId === s.id)).length,
      noSchool: meta.students.filter((s) => !s.schoolId).length,
      completion: totalSlots ? Math.round((totalScored / totalSlots) * 100) : 0,
    };
  }, [meta, sessions, assignments, pivoted]);

  const logSummary = useMemo(() => {
    const byAction = {};
    const byLevel = { success: 0, warn: 0, error: 0, info: 0 };
    const todayStr = new Date().toDateString();
    let today = 0;
    logs.forEach((l) => {
      byAction[l.action] = (byAction[l.action] || 0) + 1;
      byLevel[l.level] = (byLevel[l.level] || 0) + 1;
      if (new Date(l.ts).toDateString() === todayStr) today++;
    });
    return {
      total: logs.length,
      today,
      byLevel,
      byAction: Object.entries(byAction).sort((a, b) => b[1] - a[1]),
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logFilter) return logs;
    const q = logFilter.toLowerCase();
    return logs.filter((l) => l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q));
  }, [logs, logFilter]);

  const printSection = (elementId, logLabel) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    const win = window.open("", "", "width=1000,height=750");
    win.document.write(`
      <html>
        <head>
          <title>Practicum Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
            th { background: #8B1E2D; color: #fff; }
            .letter { page-break-after: always; margin-bottom: 30px; }
            .header { border-bottom: 2px solid #8B1E2D; margin-bottom: 10px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
    addLog("Print", `Printed: ${logLabel || elementId}.`, "info");
  };

  const downloadPDF = async (elementId, filename, logLabel) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    notify("Generating PDF...");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`${filename || "practicum-report"}.pdf`);
    addLog("Export", `Downloaded PDF: ${logLabel || filename || "practicum-report"}.`, "info");
  };

  const exportCSV = () => {
    const header = ["Region", "School", "Teacher", "Student", "A1", "A2", "A3", "A4", "A5", "A6", "Average"];
    const lines = pivoted.map((a) => {
      const scores = [1, 2, 3, 4, 5, 6].map((n) => a.assessments.find((x) => x.number === n)?.score ?? "");
      return [a.regionName, a.schoolName, a.teacherName, a.studentName, ...scores, a.average ?? ""].join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    downloadBlob(csv, `${reportSession?.title || "practicum-report"}.csv`, "text/csv");
    addLog("Export", `Exported CSV report for session "${reportSession?.title || "—"}".`, "info");
  };

  const exportFullRosterCSV = () => {
    const header = ["Teacher", "Phone", "Region", "Research day", "Student", "School", "Deployment day"];
    const lines = [];
    fullRoster.forEach((t) => {
      if (!t.students.length) {
        lines.push([t.teacherName, t.phone, t.regionName, t.researchDay, "", "", ""].map(csvSafe).join(","));
      } else {
        t.students.forEach((s) => {
          lines.push(
            [t.teacherName, t.phone, t.regionName, t.researchDay, s.name, s.school, s.day ?? ""].map(csvSafe).join(",")
          );
        });
      }
    });
    const csv = [header.join(","), ...lines].join("\n");
    downloadBlob(csv, `${reportSession?.title || "practicum"}-full-roster.csv`, "text/csv");
    addLog("Export", `Downloaded full teacher/student/school roster for "${reportSession?.title || "—"}".`, "info");
  };

  const csvSafe = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  return (
    <div className="pz-app" style={styles.page}>
      <style>{RESPONSIVE_CSS}</style>

      {toast && (
        <div
          className="pz-badge"
          style={{
            ...styles.toast,
            background: toast.isError ? "var(--destructive)" : "var(--success)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="pz-topbar">
        <h1 style={styles.logo}>Practicum</h1>

        <input
          className="pz-search"
          placeholder="Search student, teacher, school, region..."
          style={styles.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            className="pz-session-select"
            style={styles.sessionSelect}
            value={sessionId || ""}
            onChange={(e) => setSessionId(Number(e.target.value))}
          >
            <option value="">Select session...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.term})
              </option>
            ))}
          </select>

          <button style={styles.secondaryBtnFlat} onClick={() => setShowLetters(true)}>
            Letters
          </button>

          <button
            className="pz-icon-btn"
            title="Toggle theme"
            aria-label="Toggle color theme"
            onClick={toggleTheme}
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>

          <div style={styles.profile}>Admin</div>
        </div>
      </div>

      <div className="pz-layout">
        <div className="pz-sidebar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`pz-nav-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pz-main">
          <div className={`pz-progress ${loading ? "active" : ""}`}>
  <div className="pz-progress-fill" />
</div>

          {activeTab === "dashboard" && (
            <div className="pz-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Overview</h2>
              <div className="pz-stat-grid" style={styles.statGrid}>
                <StatCard label="Regions" value={stats.regions} />
                <StatCard label="Schools" value={stats.schools} />
                <StatCard label="Teachers" value={stats.teachers} />
                <StatCard label="Students" value={stats.students} />
                <StatCard label="Sessions" value={stats.sessions} />
                <StatCard label="Without a school" value={stats.noSchool} tone="warn" />
                <StatCard label="Unassigned (current session)" value={stats.unassigned} tone="warn" />
                <StatCard label="Assessment completion" value={`${stats.completion}%`} tone="success" />
              </div>

              <h3 style={styles.toggle}>Students per region</h3>
              <div style={styles.grid}>
                {meta.regions.map((r) => {
                  const count = meta.students.filter((s) => s.regionId === r.id).length;
                  const schoolCount = meta.schools.filter((sc) => sc.regionId === r.id).length;
                  return (
                    <div key={r.id} style={styles.userCard}>
                      <b>{r.name}</b>
                      <div style={styles.userCardSub}>{count} students · {schoolCount} schools</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "manage" && (
            <div className="pz-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Manage data</h2>

              <div className="pz-btn-row" style={{ marginTop: 10, marginBottom: 10 }}>
                {MANAGE_SUBTABS.map((t) => (
                  <button
                    key={t.id}
                    style={manageTab === t.id ? styles.pillActive : styles.pill}
                    onClick={() => setManageTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {manageTab === "regions" && (
                <>
                  <div style={styles.formRow}>
                    <input
                      style={styles.input}
                      placeholder="Region name"
                      value={regionForm.name}
                      onChange={(e) => setRegionForm({ name: e.target.value })}
                    />
                    <button style={styles.primaryBtn} onClick={createRegion}>
                      Add region
                    </button>
                  </div>
                  {meta.regions.map((r) => (
                    <div key={r.id} style={styles.row}>
                      {editing.type === "regions" && editing.id === r.id ? (
                        <>
                          <input
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.name}
                            onChange={(e) => setEditing({ ...editing, data: { name: e.target.value } })}
                          />
                          <div className="pz-btn-row">
                            <button style={styles.primaryBtn} onClick={saveEdit}>Save</button>
                            <button style={styles.secondaryBtn} onClick={cancelEdit}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>{r.name}</div>
                          <div className="pz-btn-row">
                            <button style={styles.secondaryBtn} onClick={() => startEdit("regions", r)}>Edit</button>
                            <button style={styles.dangerBtn} onClick={() => deleteItem("regions", r.id, r.name)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

              {manageTab === "schools" && (
                <>
                  <div style={styles.formRow}>
                    <input
                      style={styles.input}
                      placeholder="School name"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                    />
                    <select
                      style={styles.input}
                      value={schoolForm.regionId}
                      onChange={(e) => setSchoolForm({ ...schoolForm, regionId: e.target.value })}
                    >
                      <option value="">Select region...</option>
                      {meta.regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <button style={styles.primaryBtn} onClick={createSchool}>Add school</button>
                  </div>
                  {meta.schools.map((s) => (
                    <div key={s.id} style={styles.row}>
                      {editing.type === "schools" && editing.id === s.id ? (
                        <>
                          <input
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.name}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                          />
                          <select
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.regionId}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, regionId: e.target.value } })}
                          >
                            {meta.regions.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <div className="pz-btn-row">
                            <button style={styles.primaryBtn} onClick={saveEdit}>Save</button>
                            <button style={styles.secondaryBtn} onClick={cancelEdit}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>{s.name} <span style={styles.muted}>({s.regionName})</span></div>
                          <div className="pz-btn-row">
                            <button style={styles.secondaryBtn} onClick={() => startEdit("schools", s)}>Edit</button>
                            <button style={styles.dangerBtn} onClick={() => deleteItem("schools", s.id, s.name)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

              {manageTab === "teachers" && (
                <>
                  <div style={styles.formRow}>
                    <input
                      style={styles.input}
                      placeholder="Teacher name"
                      value={teacherForm.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    />
                    <input
                      style={styles.input}
                      placeholder="Phone (optional)"
                      value={teacherForm.phone}
                      onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    />
                    <select
                      style={styles.input}
                      value={teacherForm.regionId}
                      onChange={(e) => setTeacherForm({ ...teacherForm, regionId: e.target.value })}
                    >
                      <option value="">Home region (optional)</option>
                      {meta.regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <select
                      style={styles.input}
                      value={teacherForm.researchDay}
                      onChange={(e) => setTeacherForm({ ...teacherForm, researchDay: e.target.value })}
                      title="The day this teacher regularly goes out for practicum supervision"
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d} value={d}>Research day: {d}</option>
                      ))}
                    </select>
                    <button style={styles.primaryBtn} onClick={createTeacher}>Add teacher</button>
                  </div>
                  <p style={styles.hint}>
                    Every teacher has a standing <b>research day</b>. Use the <b>Deploy</b> tab to send
                    teachers out on that day, or on a one-off extra day, by region.
                  </p>
                  {meta.teachers.map((t) => (
                    <div key={t.id} style={styles.row}>
                      {editing.type === "teachers" && editing.id === t.id ? (
                        <>
                          <input
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.name}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                          />
                          <input
                            style={{ ...styles.input, marginTop: 0 }}
                            placeholder="Phone"
                            value={editing.data.phone || ""}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, phone: e.target.value } })}
                          />
                          <select
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.researchDay || "Monday"}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, researchDay: e.target.value } })}
                          >
                            {WEEKDAYS.map((d) => (
                              <option key={d} value={d}>Research day: {d}</option>
                            ))}
                          </select>
                          <div className="pz-btn-row">
                            <button style={styles.primaryBtn} onClick={saveEdit}>Save</button>
                            <button style={styles.secondaryBtn} onClick={cancelEdit}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            {t.name} {t.phone ? `· ${t.phone}` : ""} <span style={styles.muted}>{t.regionName || ""}</span>{" "}
                            <span className="pz-badge pz-badge-info">{t.researchDay || "No research day set"}</span>
                          </div>
                          <div className="pz-btn-row">
                            <button style={styles.secondaryBtn} onClick={() => startEdit("teachers", t)}>Edit</button>
                            <button style={styles.dangerBtn} onClick={() => deleteItem("teachers", t.id, t.name)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

              {manageTab === "students" && (
                <>
                  <div style={styles.formRow}>
                    <input
                      style={styles.input}
                      placeholder="Student name"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    />
                    <input
                      style={styles.input}
                      placeholder="Admission No (optional)"
                      value={studentForm.admissionNo}
                      onChange={(e) => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                    />
                    <select
                      style={styles.input}
                      value={studentForm.schoolId}
                      onChange={(e) => setStudentForm({ ...studentForm, schoolId: e.target.value })}
                    >
                      <option value="">Select school...</option>
                      {meta.schools.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.regionName})</option>
                      ))}
                    </select>
                    <button style={styles.primaryBtn} onClick={createStudent}>Add student</button>
                  </div>
                  <p style={styles.hint}>
                    Tip: leave "school" unset here and use the <b>Placement</b> tab to distribute several
                    students across schools automatically.
                  </p>
                  {meta.students.map((s) => (
                    <div key={s.id} style={styles.row}>
                      {editing.type === "students" && editing.id === s.id ? (
                        <>
                          <input
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.name}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                          />
                          <select
                            style={{ ...styles.input, marginTop: 0 }}
                            value={editing.data.schoolId || ""}
                            onChange={(e) => setEditing({ ...editing, data: { ...editing.data, schoolId: e.target.value } })}
                          >
                            <option value="">No school</option>
                            {meta.schools.map((sc) => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                          <div className="pz-btn-row">
                            <button style={styles.primaryBtn} onClick={saveEdit}>Save</button>
                            <button style={styles.secondaryBtn} onClick={cancelEdit}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            {s.name} {s.admissionNo ? `(${s.admissionNo})` : ""}{" "}
                            <span style={styles.muted}>{s.schoolName ? `${s.schoolName} — ${s.regionName}` : "No school set"}</span>
                          </div>
                          <div className="pz-btn-row">
                            <button style={styles.secondaryBtn} onClick={() => startEdit("students", s)}>Edit</button>
                            <button style={styles.dangerBtn} onClick={() => deleteItem("students", s.id, s.name)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === "placement" && (
            <div className="pz-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Automatic school placement</h2>
              <p style={styles.hint}>
                Set how many students each school should receive, then randomize. Students are picked
                at random from the unassigned pool and distributed to fill each school's target — this
                does not touch students who already have a school, and it does not affect teacher
                assignments.
              </p>

              <div style={styles.placementSummaryRow}>
                <div style={styles.placementSummaryCard}>
                  <div style={styles.statValue}>{unassignedStudents.length}</div>
                  <div style={styles.statLabel}>Unassigned students</div>
                </div>
                <div style={styles.placementSummaryCard}>
                  <div style={{ ...styles.statValue, color: totalTargeted > unassignedStudents.length ? "var(--warning)" : "var(--text)" }}>
                    {totalTargeted}
                  </div>
                  <div style={styles.statLabel}>Students targeted</div>
                </div>
                <div className="pz-btn-row" style={{ marginLeft: "auto", alignItems: "center" }}>
                  <button style={styles.secondaryBtn} onClick={clearTargets}>Clear targets</button>
                  <button style={styles.primaryBtn} onClick={randomizePlacement}>Randomize placement</button>
                </div>
              </div>

              <div className="pz-table-wrap">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th className="pz-th" style={styles.th}>School</th>
                      <th className="pz-th" style={styles.th}>Region</th>
                      <th className="pz-th" style={styles.th}>Current students</th>
                      <th className="pz-th" style={styles.th}>Target to add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.schools.map((s) => (
                      <tr key={s.id}>
                        <td className="pz-td" style={styles.td}>{s.name}</td>
                        <td className="pz-td" style={styles.td}>{s.regionName}</td>
                        <td className="pz-td" style={styles.td}>{schoolCounts[s.id] || 0}</td>
                        <td className="pz-td" style={styles.td}>
                          <input
                            type="number"
                            min="0"
                            className="pz-score-input"
                            style={styles.targetInput}
                            value={schoolTargets[s.id] || ""}
                            placeholder="0"
                            onChange={(e) => setTarget(s.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                    {!meta.schools.length && (
                      <tr>
                        <td className="pz-td" style={styles.td} colSpan={4}>Add a school first, under Manage → Schools.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "deploy" && (
            <div className="pz-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Deploy teachers by region</h2>
              <p style={styles.hint}>
                Pick a region, then a day. By default each teacher goes out on <b>their own research
                day</b>; switch to <b>Extra day</b> to send selected teachers out on a specific one-off
                day instead, without changing their standing research day.
              </p>

              {!sessionId && <p style={styles.hint}>Select a session at the top of the page first.</p>}

              <div style={styles.deployControls}>
                <select
                  style={styles.input}
                  value={deployRegionId}
                  onChange={(e) => {
                    setDeployRegionId(e.target.value);
                    setSelectedTeacherIds([]);
                  }}
                >
                  <option value="">Select region...</option>
                  {meta.regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <div className="pz-btn-row" style={{ marginTop: 10 }}>
                  <span
                    className={`pz-chip ${deployDayMode === "research" ? "on" : ""}`}
                    onClick={() => setDeployDayMode("research")}
                  >
                    Research day (per teacher)
                  </span>
                  <span
                    className={`pz-chip ${deployDayMode === "extra" ? "on" : ""}`}
                    onClick={() => setDeployDayMode("extra")}
                  >
                    Extra day (one-off)
                  </span>
                </div>

                {deployDayMode === "extra" && (
                  <div style={styles.formRow}>
                    <select
                      style={styles.input}
                      value={deployExtraDay}
                      onChange={(e) => setDeployExtraDay(e.target.value)}
                    >
                      <option value="">Select day...</option>
                      {WEEKDAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      style={styles.input}
                      type="date"
                      value={deployExtraDate}
                      onChange={(e) => setDeployExtraDate(e.target.value)}
                      title="Optional calendar date for this extra deployment"
                    />
                  </div>
                )}
              </div>

              {deployRegionId && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, flexWrap: "wrap", gap: 8 }}>
                    <h3 style={{ ...styles.toggle, marginTop: 0 }}>
                      Teachers in {meta.regions.find((r) => String(r.id) === String(deployRegionId))?.name}
                    </h3>
                    <div className="pz-btn-row">
                      <button style={styles.secondaryBtn} onClick={selectAllRegionTeachers}>Select all</button>
                      <button style={styles.secondaryBtn} onClick={clearSelectedTeachers}>Clear</button>
                    </div>
                  </div>

                  {!regionTeachers.length && <p style={styles.hint}>No teachers assigned to this region yet.</p>}

                  {regionTeachers.map((t) => {
                    const checked = selectedTeacherIds.includes(t.id);
                    const goesOutToday = deployDayMode === "research" ? t.researchDay : deployExtraDay;
                    const previewDate =
                      deployDayMode === "extra" && deployExtraDate
                        ? formatDateShort(new Date(`${deployExtraDate}T00:00:00`))
                        : formatDateShort(nextDateForWeekday(goesOutToday));
                    return (
                      <label key={t.id} className={`pz-teacher-pick ${checked ? "checked" : ""}`}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleTeacherSelected(t.id)} />
                          <span>
                            <b>{t.name}</b>{" "}
                            <span style={styles.muted}>{t.phone ? `· ${t.phone}` : ""}</span>
                          </span>
                        </span>
                        <span className="pz-badge pz-badge-info">
                          {deployDayMode === "research" ? "Research day" : "Extra day"}: {goesOutToday || "—"}
                          {goesOutToday && <> · {previewDate}</>}
                        </span>
                      </label>
                    );
                  })}

                  <div style={{ marginTop: 14 }}>
                    <button style={styles.primaryBtn} onClick={deployTeachers}>
                      Deploy {selectedTeacherIds.length || ""} teacher{selectedTeacherIds.length === 1 ? "" : "s"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="pz-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Create practicum session</h2>

              <input
                style={styles.input}
                placeholder="Session title (e.g. Term 2 2026 Practicum)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select style={styles.input} value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
              <input
                style={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <button style={styles.primaryBtn} onClick={createSession}>Create session</button>

              <h3 style={styles.toggle}>All sessions</h3>
              {sessions.map((s) => (
                <div key={s.id} style={styles.row}>
                  {editingSessionId === s.id ? (
                    <>
                      <input
                        style={{ ...styles.input, marginTop: 0 }}
                        value={editSessionForm.title}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, title: e.target.value })}
                      />
                      <input
                        style={{ ...styles.input, marginTop: 0 }}
                        type="date"
                        value={editSessionForm.date}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, date: e.target.value })}
                      />
                      <select
                        style={{ ...styles.input, marginTop: 0 }}
                        value={editSessionForm.term}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, term: e.target.value })}
                      >
                        <option>Term 1</option>
                        <option>Term 2</option>
                        <option>Term 3</option>
                      </select>
                      <div className="pz-btn-row">
                        <button style={styles.primaryBtn} onClick={() => saveEditSession(s.id)}>Save</button>
                        <button style={styles.secondaryBtn} onClick={() => setEditingSessionId(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <b>{s.title}</b> — {s.term} ({s.date?.slice(0, 10)})
                      </div>
                      <div className="pz-btn-row">
                        <button style={styles.secondaryBtn} onClick={() => setSessionId(s.id)}>
                          {sessionId === s.id ? "Selected" : "Select"}
                        </button>
                        <button style={styles.secondaryBtn} onClick={() => startEditSession(s)}>Edit</button>
                        <button style={styles.dangerBtn} onClick={() => deleteSession(s.id, s.title)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="pz-card" style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2 style={styles.sectionTitle}>
                  Assignments {reportSession ? `— ${reportSession.title}` : ""}
                </h2>
                <div className="pz-btn-row">
                  <button style={styles.primaryBtn} onClick={autoAssign}>
                    Auto-assign
                  </button>
                  <button style={styles.dangerBtn} onClick={resetAssignments}>
                    Reset all
                  </button>
                </div>
              </div>
              <p style={styles.hint}>
                Max 7 trainees per teacher per day · same school first, spills to next school in region.
                Prefer sending teachers out by region and research day? Use the <b>Deploy</b> tab instead.
              </p>

              {!sessionId && <p style={styles.hint}>Select or create a session first.</p>}
              {assignments.length === 0 && sessionId && (
                <p style={styles.hint}>No assignments yet — click Auto-assign to deploy trainees to teachers.</p>
              )}

              {[...new Set(assignments.map((a) => a.day))].sort().map((day) => {
                const dayRows = assignments.filter((a) => a.day === day);
                const extraRow = dayRows.find((a) => a.isExtra && a.deployDate);
                const headerDate = extraRow
                  ? formatDateShort(new Date(extraRow.deployDate))
                  : (WEEKDAY_NAMES.includes(day) ? formatDateShort(nextDateForWeekday(day)) : null);
                const teacherDayCounts = {};
                dayRows.forEach((r) => {
                  teacherDayCounts[r.teacherId] = (teacherDayCounts[r.teacherId] || 0) + 1;
                });
                return (
                <div key={day}>
                  <h3 style={styles.toggle}>
                    Day {day}
                    {headerDate && ` · ${extraRow ? "" : "next "}${headerDate}`}
                  </h3>
                  {[...new Set(assignments.filter((a) => a.day === day).map((a) => a.teacherId))].map((teacherId) => {
                    const teacherRows = assignments.filter((a) => a.day === day && a.teacherId === teacherId);
                    const teacherName = teacherRows[0]?.teacherName;
                    const overCap = teacherRows.length > 7;
                    return (
                      <div key={teacherId} style={styles.teacherBlock}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <b>{teacherName}</b>
                          <span
                            className={overCap ? "pz-badge pz-badge-warn" : undefined}
                            style={overCap ? undefined : styles.muted}
                            title={overCap ? "Over the 7-per-day cap — someone was added manually" : undefined}
                          >
                            {teacherRows.length}/7 trainees{overCap ? " (manually added)" : ""}
                          </span>
                        </div>
                        <div style={styles.progressTrack}>
                          <div style={{ ...styles.progressFill, width: `${Math.min(100, (teacherRows.length / 7) * 100)}%` }} />
                        </div>
                        {teacherRows.map((a) => (
                          <div key={a.assignmentId} className="pz-teacher-block-row" style={styles.assignmentRow}>
                            <span>{a.studentName} · {a.schoolName} ({a.regionName})</span>
                            <div className="pz-btn-row">
                              <select
                                style={styles.miniSelect}
                                value={a.teacherId}
                                onChange={(e) => reassign(a.assignmentId, Number(e.target.value))}
                                title={isAdmin ? undefined : "Teachers at 7/7 are disabled — only an admin can manually add beyond the cap"}
                              >
                                {meta.teachers.map((t) => {
                                  const isFull = (teacherDayCounts[t.id] || 0) >= MAX_PER_TEACHER_CLIENT && t.id !== a.teacherId;
                                  return (
                                    <option key={t.id} value={t.id} disabled={isFull && !isAdmin}>
                                      {t.name}{isFull ? " (7/7 full)" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                style={styles.dangerBtnSm}
                                onClick={() => removeAssignment(a.assignmentId, a.studentName)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                );
              })}
            </div>
          )}

          {activeTab === "assess" && (
            <div className="pz-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Assessment entry (1–6)</h2>
              {!sessionId && <p style={styles.hint}>Select a session first.</p>}

              <div className="pz-table-wrap">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th className="pz-th" style={styles.th}>Student</th>
                      <th className="pz-th" style={styles.th}>Teacher</th>
                      <th className="pz-th" style={styles.th}>School</th>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <th className="pz-th" style={styles.th} key={n}>A{n}</th>
                      ))}
                      <th className="pz-th" style={styles.th}>Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPivoted.map((a) => (
                      <tr key={a.assignmentId}>
                        <td className="pz-td" style={styles.td}>{a.studentName}</td>
                        <td className="pz-td" style={styles.td}>{a.teacherName}</td>
                        <td className="pz-td" style={styles.td}>{a.schoolName}</td>
                        {[1, 2, 3, 4, 5, 6].map((n) => {
                          const cell = a.assessments.find((x) => x.number === n);
                          return (
                            <td className="pz-td" style={styles.td} key={n}>
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input
                                  className="pz-score-input"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={draftFor(cell?.id, cell?.score ?? "")}
                                  style={styles.scoreInput}
                                  onChange={(e) => setDraft(cell?.id, e.target.value)}
                                />
                                <button
                                  style={styles.saveIconBtn}
                                  title="Save"
                                  onClick={() => saveAssessment(cell?.id, draftFor(cell?.id, cell?.score ?? ""))}
                                >
                                  Save
                                </button>
                              </div>
                            </td>
                          );
                        })}
                        <td className="pz-td" style={styles.td}><b>{a.average ?? "-"}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="pz-card" style={{ ...styles.card, marginBottom: 16 }}>
              <h2 style={styles.sectionTitle}>Deployments on a date</h2>
              <p style={styles.hint}>
                Pick any date — we work out its weekday (e.g. a Monday) and show which regions and
                teachers have a deployment on that weekday for the selected session, with the
                students under each teacher. Standing research-day deployments recur every week, so
                they show up on every matching date; one-off "extra day" deployments now use their
                exact saved date, so they only show up on the date they were actually deployed for.
              </p>

              <input
                style={{ ...styles.input, maxWidth: 220 }}
                type="date"
                value={reportPickDate}
                onChange={(e) => setReportPickDate(e.target.value)}
              />
              {reportPickDate && (
                <p style={styles.muted}>
                  {weekdayNameForDate(reportPickDate)}
                  {WEEKDAY_NAMES.includes(weekdayNameForDate(reportPickDate))
                    ? ` — ${formatDateShort(new Date(`${reportPickDate}T00:00:00`))}`
                    : " (no practicum deployments run on a Sunday)"}
                </p>
              )}

              {dateDeployRegions.length === 0 && (
                <p style={styles.hint}>No teachers are deployed on this weekday for the current session.</p>
              )}

              {dateDeployRegions.map(([regionName, teacherMap]) => (
                <div key={regionName} style={styles.teacherBlock}>
                  <b>{regionName || "Unassigned region"}</b>
                  {Object.entries(teacherMap).map(([teacherName, students]) => (
                    <div key={teacherName} style={{ marginTop: 8, marginLeft: 10 }}>
                      <div>
                        {teacherName}{" "}
                        <span style={styles.muted}>
                          ({students.length} student{students.length === 1 ? "" : "s"})
                        </span>
                      </div>
                      <ul style={{ margin: "4px 0 0 18px" }}>
                        {students.map((s, i) => (
                          <li key={i} style={styles.muted}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === "reports" && (
            <div className="pz-card" style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <h2 style={styles.sectionTitle}>Report {reportSession ? `— ${reportSession.title}` : ""}</h2>
                <div className="pz-btn-row">
                  <button style={styles.secondaryBtn} onClick={exportCSV}>Export CSV</button>
                  <button style={styles.secondaryBtn} onClick={exportFullRosterCSV}>Download all (teachers + students + schools)</button>
                  <button style={styles.primaryBtn} onClick={() => downloadPDF("report-print-area", reportSession?.title, "session report")}>
                    Download PDF
                  </button>
                  <button style={styles.primaryBtn} onClick={() => printSection("report-print-area", "session report")}>Print</button>
                </div>
              </div>

              <div id="report-print-area" className="pz-table-wrap">
                <h3>{reportSession?.title}</h3>
                <p>{reportSession?.term} — {reportSession?.date?.slice(0, 10)}</p>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th className="pz-th" style={styles.th}>Region</th>
                      <th className="pz-th" style={styles.th}>School</th>
                      <th className="pz-th" style={styles.th}>Student</th>
                      <th className="pz-th" style={styles.th}>Teacher</th>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <th className="pz-th" style={styles.th} key={n}>A{n}</th>
                      ))}
                      <th className="pz-th" style={styles.th}>Avg</th>
                      <th className="pz-th" style={styles.th}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPivoted.map((a) => (
                      <tr key={a.assignmentId}>
                        <td className="pz-td" style={styles.td}>{a.regionName}</td>
                        <td className="pz-td" style={styles.td}>{a.schoolName}</td>
                        <td className="pz-td" style={styles.td}>{a.studentName}</td>
                        <td className="pz-td" style={styles.td}>{a.teacherName}</td>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <td className="pz-td" style={styles.td} key={n}>
                            {a.assessments.find((x) => x.number === n)?.score ?? "-"}
                          </td>
                        ))}
                        <td className="pz-td" style={styles.td}><b>{a.average ?? "-"}</b></td>
                        <td className="pz-td" style={styles.td}>{a.completed}/6</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="pz-card" style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <h2 style={styles.sectionTitle}>Activity logs</h2>
                <div className="pz-btn-row">
                  <button style={styles.secondaryBtn} onClick={exportLogsCSV}>Export CSV</button>
                  <button style={styles.primaryBtn} onClick={() => printSection("logs-print-area", "activity log")}>Print</button>
                  <button style={styles.dangerBtn} onClick={clearLogs}>Clear logs</button>
                </div>
              </div>

              <div className="pz-btn-row" style={{ marginTop: 10, marginBottom: 10 }}>
                <button style={logsView === "summary" ? styles.pillActive : styles.pill} onClick={() => setLogsView("summary")}>
                  Summary
                </button>
                <button style={logsView === "full" ? styles.pillActive : styles.pill} onClick={() => setLogsView("full")}>
                  Full log
                </button>
              </div>

              {logsView === "summary" && (
                <>
                  <div className="pz-stat-grid" style={styles.statGrid}>
                    <StatCard label="Total events" value={logSummary.total} />
                    <StatCard label="Today" value={logSummary.today} />
                    <StatCard label="Successful" value={logSummary.byLevel.success || 0} tone="success" />
                    <StatCard label="Warnings" value={logSummary.byLevel.warn || 0} tone="warn" />
                    <StatCard label="Errors" value={logSummary.byLevel.error || 0} tone="danger" />
                  </div>

                  <h3 style={styles.toggle}>By action</h3>
                  {logSummary.byAction.length === 0 && <p style={styles.hint}>No activity recorded yet.</p>}
                  {logSummary.byAction.map(([action, count]) => (
                    <div key={action} style={styles.row}>
                      <div>{action}</div>
                      <span className="pz-badge pz-badge-info">{count}</span>
                    </div>
                  ))}
                </>
              )}

              {logsView === "full" && (
                <>
                  <input
                    style={{ ...styles.input, marginTop: 0, marginBottom: 12 }}
                    placeholder="Filter logs by action or details..."
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                  />
                  <div id="logs-print-area" className="pz-table-wrap">
                    <div className="pz-log-row head">
                      <div>Time</div>
                      <div>Level</div>
                      <div>Action</div>
                      <div>Details</div>
                    </div>
                    {filteredLogs.map((l) => (
                      <div key={l.id} className="pz-log-row">
                        <div style={styles.muted}>{new Date(l.ts).toLocaleString()}</div>
                        <div>
                          <span className={`pz-badge pz-badge-${l.level}`}>{l.level}</span>
                        </div>
                        <div>{l.action}</div>
                        <div>{l.details}</div>
                      </div>
                    ))}
                    {filteredLogs.length === 0 && <p style={styles.hint}>No matching log entries.</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {showLetters && (
          <div className="pz-modal" style={styles.modal}>
            <div className="pz-letter-container" style={styles.letterContainer}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <h2 style={styles.letterTitle}>Asumbi TTC – Practicum Letters</h2>
                <div className="pz-btn-row">
                  <button style={styles.primaryBtn} onClick={() => downloadPDF("letter-print-area", "practicum-letters", "practicum letters")}>
                    Download PDF
                  </button>
                  <button style={styles.primaryBtn} onClick={() => printSection("letter-print-area", "practicum letters")}>Print</button>
                  <button style={styles.secondaryBtn} onClick={() => setShowLetters(false)}>Close</button>
                </div>
              </div>

              <div id="letter-print-area">
                {groupedLetters
                  .filter((g) => g.students.length)
                  .map((g, i) => (
                    <div key={i} className="letter" style={styles.letter}>
                      <div style={styles.letterHead}>
                        <h2 style={styles.letterInstitution}>ASUMBI TEACHERS TRAINING COLLEGE</h2>
                        <p style={styles.letterSub}>P.O BOX XXXX – KENYA | PRACTICUM OFFICE</p>
                        <div style={styles.letterLine}></div>
                      </div>
                      <div style={styles.letterDate}>Date: {new Date().toLocaleDateString()}</div>
                      <p style={styles.letterText}><b>To:</b> {g.teacher.name}</p>
                      <p style={styles.letterSubject}><b>RE: PRACTICUM STUDENT ASSIGNMENT — {reportSession?.title}</b></p>
                      <p style={styles.letterText}>Dear {g.teacher.name},</p>
                      <p style={styles.letterText}>
                        You have been officially assigned the following students for practicum
                        supervision under Asumbi Teachers Training College
                        {g.teacher.researchDay ? `. Your standing research day is ${g.teacher.researchDay}` : ""}.
                        Please note assessments 1–6 are due across the course of the term.
                      </p>
                      <ul style={styles.letterList}>
                        {g.students.map((s, idx) => (
                          <li key={idx}>{s.studentName} — {s.schoolName} ({s.regionName})</li>
                        ))}
                      </ul>
                      <p style={styles.letterText}>
                        You are expected to supervise, mentor, and assess the students professionally
                        throughout the practicum period in accordance with institutional guidelines.
                      </p>
                      <div style={styles.letterFooter}>
                        <p>Yours faithfully,</p>
                        <p><b>________________________</b><br />Practicum Coordinator<br />Asumbi TTC</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneVar = { success: "var(--success)", warn: "var(--warning)", danger: "var(--destructive)" }[tone] || "var(--text)";
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color: toneVar }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: { background: "var(--bg)", minHeight: "100vh", color: "var(--text)" },
  toast: { position: "fixed", top: 16, right: 16, zIndex: 999, color: "#fff", padding: "10px 16px", borderRadius: 8, boxShadow: "var(--shadow)", maxWidth: "90vw", textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  logo: { color: "var(--text)", margin: 0, fontSize: 19 },
  search: { padding: 9, borderRadius: 9, border: "1px solid var(--border)", minWidth: 260, boxSizing: "border-box", background: "var(--card-elevated)", color: "var(--text)" },
  sessionSelect: { padding: 8, borderRadius: 9, border: "1px solid var(--border)", background: "var(--card-elevated)", color: "var(--text)" },
  profile: { background: "var(--primary-tint)", padding: "6px 12px", borderRadius: 9, color: "var(--primary)", fontWeight: 700, fontSize: 13 },
  card: { background: "var(--card)", color: "var(--text)", padding: 22, borderRadius: 14, border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" },
  sectionTitle: { borderLeft: "3px solid var(--primary)", paddingLeft: 10, margin: 0 },
  formRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: 10, marginTop: 10, borderRadius: 9, border: "1px solid var(--border)", boxSizing: "border-box", flex: "1 1 180px", width: "100%", background: "var(--card)", color: "var(--text)" },
  primaryBtn: { background: "var(--primary)", padding: "10px 14px", color: "#fff", border: "none", borderRadius: 9, marginTop: 10, cursor: "pointer", fontWeight: 700, fontSize: 13.5 },
  secondaryBtn: { border: "1px solid var(--border)", background: "var(--card)", padding: "8px 12px", borderRadius: 9, cursor: "pointer", marginTop: 10, color: "var(--text)", fontSize: 13.5, fontWeight: 600 },
  secondaryBtnFlat: { border: "1px solid var(--border)", background: "var(--card)", padding: "9px 14px", borderRadius: 9, cursor: "pointer", color: "var(--text)", fontSize: 13.5, fontWeight: 600 },
  dangerBtn: { border: "1px solid var(--destructive)", background: "var(--destructive-tint)", color: "var(--destructive)", padding: "8px 12px", borderRadius: 9, cursor: "pointer", marginTop: 10, fontSize: 13.5, fontWeight: 600 },
  dangerBtnSm: { border: "1px solid var(--destructive)", background: "var(--destructive-tint)", color: "var(--destructive)", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  saveIconBtn: { border: "1px solid var(--border)", background: "var(--card-elevated)", color: "var(--text)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", fontSize: 11, fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 },
  userCard: { background: "var(--card-elevated)", color: "var(--text)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" },
  userCardSub: { color: "var(--text-muted)", fontSize: 12.5, marginTop: 4 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 2px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 8 },
  assignmentRow: { padding: 8, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" },
  teacherBlock: { background: "var(--card-elevated)", padding: 12, borderRadius: 10, marginTop: 10, border: "1px solid var(--border)" },
  progressTrack: { height: 5, background: "var(--border)", borderRadius: 999, marginTop: 6, marginBottom: 4, overflow: "hidden" },
  progressFill: { height: "100%", background: "var(--primary)", borderRadius: 999 },
  miniSelect: { padding: 4, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" },
  toggle: { color: "var(--text)", marginTop: 20 },
  loading: { color: "var(--primary)", marginBottom: 10, fontSize: 13 },
  hint: { color: "var(--text-muted)", fontSize: 12.5, marginTop: 6 },
  muted: { color: "var(--text-muted)" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 10 },
  statCard: { padding: 16, borderRadius: 10, background: "var(--card-elevated)", border: "1px solid var(--border)" },
  statValue: { fontSize: 24, fontWeight: 800, color: "var(--text)" },
  statLabel: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 10 },
  th: { background: "var(--card-elevated)", color: "var(--text-muted)", padding: 8, fontSize: 11, textAlign: "left", textTransform: "uppercase", letterSpacing: ".03em", borderBottom: "1px solid var(--border)" },
  td: { padding: 8, fontSize: 13, borderBottom: "1px solid var(--border)" },
  scoreInput: { width: 50, padding: 4, borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" },
  targetInput: { width: 64, padding: 6, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" },
  pill: { border: "1px solid var(--border)", background: "var(--card)", padding: "8px 14px", borderRadius: 999, cursor: "pointer", color: "var(--text-muted)", fontSize: 13, fontWeight: 600 },
  pillActive: { border: "1px solid var(--primary)", background: "var(--primary-tint)", padding: "8px 14px", borderRadius: 999, cursor: "pointer", color: "var(--primary)", fontSize: 13, fontWeight: 700 },
  placementSummaryRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "14px 0" },
  placementSummaryCard: { padding: "10px 18px", borderRadius: 10, background: "var(--card-elevated)", border: "1px solid var(--border)", minWidth: 140 },
  deployControls: { background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginTop: 14 },
  modal: { position: "fixed", inset: 0, background: "rgba(10,10,10,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 998 },
  letterContainer: { background: "var(--card)", color: "var(--text)", padding: 20, borderRadius: 14, maxHeight: "85vh", overflow: "auto", border: "1px solid var(--border)" },
  letterTitle: { color: "var(--primary)", marginBottom: 10 },
  letter: { padding: 20, border: "1px solid var(--border)", marginBottom: 20, borderRadius: 10 },
  letterHead: { textAlign: "center", marginBottom: 15 },
  letterInstitution: { margin: 0, fontSize: 18, color: "var(--primary)", letterSpacing: 1 },
  letterSub: { margin: 0, fontSize: 12, color: "var(--text-muted)" },
  letterLine: { height: 2, background: "var(--primary)", marginTop: 10 },
  letterDate: { textAlign: "right", marginBottom: 10, fontSize: 12 },
  letterSubject: { marginTop: 10, marginBottom: 10, fontSize: 14 },
  letterText: { fontSize: 13, lineHeight: "1.6" },
  letterList: { marginLeft: 20, fontSize: 13 },
  letterFooter: { marginTop: 30, fontSize: 13 },
};