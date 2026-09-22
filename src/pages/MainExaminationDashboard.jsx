import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowLeft, RefreshCw, Plus, Pencil, Trash2, Link2, CalendarRange, Users,
  BookOpenCheck, CheckCircle2, Clock, TrendingUp, LayoutGrid, ListChecks,
  BarChart3, FileText, Settings as IconSettings, History, ClipboardList,
  Table2, PlayCircle, CalendarDays, ChevronLeft, ChevronRight, Printer,
  ChevronDown, Search, UserCircle2, HelpCircle, Gauge, Timer, ClipboardCheck,
  AlertCircle, Target, Download, FileSpreadsheet, Building2, Eye, X,
  Key, Copy, RotateCw, Undo2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, Legend,
} from "recharts";
import {
  injectStyles, useC, extract, ThemeToggle, EmptyState, ActionButton, MiniBtn,
  Modal, ModalInput, ModalSelect, ModalTextarea, SaveButton, FieldLabel,
  Chip, LifecycleBadge, CountdownToActive, Th, Td, DetailRow, pageSx, fmtDate, fmtTime,
  fmtDateTime, fmtDayName, dateKeyOf, globalStyles, SectionHeader, TabErrorBoundary,
} from "../components/mainExams/shared";
import useSchoolSettings from "../hooks/useSchoolSettings";

/* ═══════════════════════════════════════════════════════════
   MAIN EXAMINATION DASHBOARD (§10-§13, Phase 7)
   The parent-examination view: top summary cards (§10) + the nine
   tabs from §11. Overview/Subjects/Timetable/Settings/Audit Log are
   fully wired to the Phase 2-6 backend + the new Phase 7 dashboard/
   audit-log endpoints. Candidates/Results/Analytics/Reports show real
   numbers where the existing data already supports them and an honest
   "not built yet" placeholder otherwise (§50 — never fabricate).
═══════════════════════════════════════════════════════════ */
const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "subjects", label: "Subjects", icon: BookOpenCheck },
  { key: "timetable", label: "Timetable", icon: Table2 },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "results", label: "Results", icon: ListChecks },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "settings", label: "Settings", icon: IconSettings },
  { key: "audit", label: "Audit Log", icon: History },
];

export default function MainExaminationDashboard() {
  injectStyles();
  const C = useC();
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [examination, setExamination] = useState(null);
  const [summary, setSummary] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjectCatalog, setSubjectCatalog] = useState([]); // master Subjects list, for the "Subject / Learning Area" dropdown
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/main-exams/${id}/dashboard`);
      setExamination(res.data.examination);
      setSummary(res.data.summary);
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.message || "Failed to load examination dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  const loadAuditLog = useCallback(async () => {
    try {
      const res = await API.get(`/main-exams/${id}/audit-log`);
      setAuditEvents(res.data.events || []);
      setAuditLoaded(true);
    } catch (err) {
      console.error(err);
      showToast("Failed to load audit log", "error");
    }
  }, [id, showToast]);

  const loadPickerData = useCallback(async () => {
    try {
      const [a, c, s] = await Promise.all([
        API.get("/e-assessments").catch(() => ({ data: [] })),
        API.get("/e-assessments/classes").catch(() => ({ data: [] })),
        API.get("/e-assessments/subjects").catch(() => ({ data: [] })),
      ]);
      setAssessments(extract(a));
      setClasses(extract(c));
      setSubjectCatalog(extract(s));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadDashboard(); loadPickerData(); }, [loadDashboard, loadPickerData]);
  useEffect(() => { if (activeTab === "audit" && !auditLoaded) loadAuditLog(); }, [activeTab, auditLoaded, loadAuditLog]);

  const sx = pageSx;

  if (loading && !examination) {
    return (
      <div className="dash-main" style={sx.page} data-theme={theme}>
        <div className="dash-skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 20 }} />
        <div className="dash-skeleton" style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  if (!examination) {
    return (
      <div className="dash-main" style={sx.page} data-theme={theme}>
        <EmptyState icon={<CalendarRange size={26} />} text="This Main Examination could not be found." />
      </div>
    );
  }

  return (
    <div className="dash-main" style={sx.page} data-theme={theme}>
      <style>{globalStyles}</style>

      {toast && (
        <div className="no-print" style={{
          position: "fixed", top: 20, right: 20, zIndex: 60, display: "flex", alignItems: "center", gap: 8,
          padding: "11px 16px", borderRadius: 9, background: C.card, border: `1px solid ${toast.type === "error" ? C.danger : C.success}`, boxShadow: "var(--shadow)",
        }}>
          <span style={{ color: C.textPri, fontSize: 14 }}>{toast.msg}</span>
        </div>
      )}

      <div className="no-print" style={sx.header}>
        <div>
          <button style={sx.backBtn} className="dash-icon-btn" onClick={() => navigate("/main-exams")}>
            <ArrowLeft size={14} /> All Main Examinations
          </button>
          <h1 style={sx.pageTitle}>{examination.name}</h1>
          <p style={sx.pageSub}>
            {[examination.academic_year, examination.programme, examination.department, examination.term].filter(Boolean).join(" · ") || "—"}
            {"  ·  "}{fmtDate(examination.start_date)} — {fmtDate(examination.end_date)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Chip text={examination.status || "draft"} tone={{ draft: "neutral", published: "info", ongoing: "success", completed: "neutral", archived: "neutral" }[examination.status] || "neutral"} uppercase />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button style={sx.iconBtn} className="dash-icon-btn" onClick={loadDashboard} title="Refresh"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* ── Summary cards (§10) ── */}
      <div className="no-print"><SummaryCards summary={summary} /></div>

      {/* ── Tabs ── */}
      <div className="no-print" style={sx.tabBar}>
        {TABS.map((t) => (
          <button key={t.key} style={{ ...sx.tab, ...(activeTab === t.key ? sx.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      <TabErrorBoundary resetKey={activeTab}>
        {activeTab === "overview" && <OverviewTab summary={summary} subjects={subjects} />}

        {activeTab === "subjects" && (
          <SubjectsTab
            id={id}
            subjects={subjects}
            assessments={assessments}
            classes={classes}
            subjectCatalog={subjectCatalog}
            mainExam={examination}
            onChanged={loadDashboard}
            showToast={showToast}
          />
        )}

        {activeTab === "timetable" && (
          <TimetableTab id={id} subjects={subjects} examination={examination} onChanged={loadDashboard} showToast={showToast} />
        )}

        {activeTab === "candidates" && (
          <CandidatesTab id={id} showToast={showToast} />
        )}

        {activeTab === "results" && (
          <ResultsTab id={id} classes={classes} showToast={showToast} />
        )}

        {activeTab === "analytics" && <AnalyticsTab id={id} summary={summary} subjects={subjects} classes={classes} showToast={showToast} />}

        {activeTab === "reports" && (
          <ReportsTab id={id} subjects={subjects} classes={classes} showToast={showToast} />
        )}

        {activeTab === "settings" && (
          <SettingsTab id={id} examination={examination} onChanged={loadDashboard} showToast={showToast} navigate={navigate} />
        )}

        {activeTab === "audit" && <AuditLogTab events={auditEvents} loaded={auditLoaded} />}
      </TabErrorBoundary>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUMMARY CARDS (§10)
═══════════════════════════════════════════════════════════ */
function SummaryCards({ summary }) {
  const C = useC();
  if (!summary) return null;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 10 }}>
        <SmallStat label="Subjects" value={summary.subjects_total} icon={<BookOpenCheck size={16} />} />
        <SmallStat label="Scheduled" value={summary.subjects_scheduled} icon={<CalendarRange size={16} />} />
        <SmallStat label="Active" value={summary.subjects_active} icon={<PlayCircle size={16} />} tone="success" />
        <SmallStat label="Completed" value={summary.subjects_completed} icon={<CheckCircle2 size={16} />} />
        <SmallStat label="Upcoming" value={summary.subjects_upcoming} icon={<Clock size={16} />} tone="info" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <SmallStat label="Candidates" value={summary.candidates} icon={<Users size={16} />} />
        <SmallStat label="Completed Attempts" value={summary.completed_attempts} icon={<ListChecks size={16} />} />
        <SmallStat
          label="Average Performance"
          value={summary.average_performance != null ? `${summary.average_performance}%` : "—"}
          icon={<TrendingUp size={16} />}
          tone="success"
        />
        <SmallStat
          label="Overall Pass Rate"
          value={summary.pass_rate != null ? `${summary.pass_rate}%` : "N/A"}
          icon={<BarChart3 size={16} />}
          subtext={summary.pass_rate == null ? summary.pass_rate_note : null}
        />
      </div>
    </>
  );
}

function SmallStat({ label, value, icon, tone, subtext }) {
  const C = useC();
  const tint = tone ? C[tone] : C.textPri;
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }} title={subtext || undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ color: tint }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.textPri, marginTop: 6 }}>{value ?? "—"}</div>
      {subtext && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB (§48)
═══════════════════════════════════════════════════════════ */
function OverviewTab({ summary, subjects }) {
  const C = useC();
  const active = subjects.filter((s) => s.status === "active");
  const upcoming = subjects.filter((s) => s.status === "scheduled" || s.status === "draft")
    .sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
  const completed = subjects.filter((s) => s.status === "ended" || s.status === "completed");

  return (
    <div>
      {active.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.success, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Active Now
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 26 }}>
            {active.map((s) => <SubjectMiniCard key={s.id} s={s} />)}
          </div>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="dash-two-col">
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Upcoming Subjects
          </div>
          {upcoming.length === 0
            ? <EmptyState icon={<Clock size={22} />} text="Nothing upcoming." />
            : upcoming.slice(0, 6).map((s) => <SubjectMiniCard key={s.id} s={s} />)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Completed Subjects
          </div>
          {completed.length === 0
            ? <EmptyState icon={<CheckCircle2 size={22} />} text="No subjects have finished yet." />
            : completed.slice(0, 6).map((s) => <SubjectMiniCard key={s.id} s={s} />)}
        </div>
      </div>
    </div>
  );
}

function SubjectMiniCard({ s }) {
  const C = useC();
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: C.textPri }}>{s.subject}</span>
        <LifecycleBadge status={s.status} />
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
        {fmtDate(s.exam_date || s.start_time)} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
      </div>
      <CountdownToActive startTime={s.start_time} status={s.status} style={{ marginTop: 4 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUBJECTS TAB (§12-§13, §4-§6)
═══════════════════════════════════════════════════════════ */
function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00`;
}
function splitDateTime(dtStr) {
  if (!dtStr) return { date: "", time: "" };
  const d = new Date(dtStr);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n) => String(n).padStart(2, "0");
  // BUGFIX: use the UTC getters, not the local ones. The API always
  // returns this value as an ISO string with a trailing "Z" (the JSON
  // serialization of a Date), and that "Z" instant is exactly the
  // wall-clock the admin typed (see toDateTime() in
  // examSubjectSession.controller.js). Reading it back with getHours()/
  // getFullYear() re-interprets it through whatever timezone the
  // viewer's *browser* happens to be set to, which silently shifted the
  // time shown in this edit form away from what was actually saved.
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

function SubjectsTab({ id, subjects, assessments, classes, subjectCatalog, mainExam, onChanged, showToast }) {
  const C = useC();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // subject row being edited, or null for create
  const [saving, setSaving] = useState(false);

  const blank = {
    subject: "", class_id: "", e_assessment_id: "", exam_date: "", start_clock: "", end_clock: "",
    duration_minutes: "", venue: "", max_marks: "", instructions: "",
  };
  const [form, setForm] = useState(blank);

  const openCreate = () => { setEditing(null); setForm(blank); setFormOpen(true); };
  const openEdit = (s) => {
    const startSplit = splitDateTime(s.start_time);
    const endSplit = splitDateTime(s.end_time);
    setEditing(s);
    setForm({
      subject: s.subject || "", class_id: s.class_id || "", e_assessment_id: s.e_assessment_id || "",
      exam_date: startSplit.date || (s.exam_date ? String(s.exam_date).slice(0, 10) : ""),
      start_clock: startSplit.time, end_clock: endSplit.time,
      duration_minutes: s.duration_minutes || "", venue: s.venue || "", max_marks: s.max_marks || "",
      instructions: s.instructions || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.subject.trim()) return showToast("Subject / learning area is required", "error");
    const payload = {
      subject: form.subject.trim(),
      class_id: form.class_id || null,
      e_assessment_id: form.e_assessment_id || null,
      exam_date: form.exam_date || null,
      start_time: combineDateTime(form.exam_date, form.start_clock),
      end_time: combineDateTime(form.exam_date, form.end_clock),
      duration_minutes: form.duration_minutes || null,
      venue: form.venue || null,
      max_marks: form.max_marks || null,
      instructions: form.instructions || null,
    };
    try {
      setSaving(true);
      if (editing) {
        await API.put(`/main-exams/${id}/subjects/${editing.id}`, payload);
        showToast("Subject schedule updated");
      } else {
        await API.post(`/main-exams/${id}/subjects`, payload);
        showToast("Subject added");
      }
      setFormOpen(false);
      onChanged();
    } catch (err) {
      const data = err?.response?.data;
      showToast(data?.message || "Failed to save subject", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeSubject = async (s) => {
    if (!window.confirm(`Remove "${s.subject}" from this examination?`)) return;
    try {
      await API.delete(`/main-exams/${id}/subjects/${s.id}`);
      showToast("Subject removed");
      onChanged();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove subject", "error");
    }
  };

  const attachAssessment = async (s, eAssessmentId) => {
    try {
      await API.put(`/main-exams/${id}/subjects/${s.id}/assessment`, { e_assessment_id: eAssessmentId });
      showToast("Assessment attached");
      onChanged();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to attach assessment", "error");
    }
  };

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));
  const assessmentOptions = assessments.map((a) => ({ value: a.id, label: `${a.title} (${a.status})` }));
  const locked = editing && ["active", "ended", "marking", "completed"].includes(editing.status);

  // Dropdown of every subject in the school's master Subjects list, so an
  // admin picks a name instead of free-typing it (and risking typos that
  // would silently fork what should be the same subject across exams).
  // If a subject being edited was typed in before this dropdown existed
  // (or was since renamed/removed from the master list) its current value
  // is still included so the form doesn't blank it out from under them.
  const subjectOptions = useMemo(() => {
    const names = subjectCatalog.map((s) => s.name || s.subject_name).filter(Boolean);
    if (form.subject && !names.includes(form.subject)) names.push(form.subject);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b)).map((n) => ({ value: n, label: n }));
  }, [subjectCatalog, form.subject]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <ActionButton primary icon={<Plus size={14} />} onClick={openCreate}>Add Subject / Learning Area</ActionButton>
      </div>

      {subjects.length === 0 ? (
        <EmptyState icon={<BookOpenCheck size={24} />} text="No subjects scheduled yet. Add the first one to start building the timetable." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {subjects.map((s) => (
            <SubjectRow
              key={s.id}
              s={s}
              onEdit={() => openEdit(s)}
              onDelete={() => removeSubject(s)}
              assessmentOptions={assessmentOptions.filter((o) => o.value !== s.e_assessment_id)}
              onAttach={(eid) => attachAssessment(s, eid)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? `Edit Schedule — ${editing.subject}` : "Add Subject / Learning Area"} onClose={() => setFormOpen(false)}>
          {locked && (
            <div style={{ marginBottom: 14, padding: "10px 12px", background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12.5, color: C.textSec }}>
              This subject is {editing.status} — its schedule is locked, but you can still update venue/instructions/assessment.
            </div>
          )}
          <FieldLabel>Subject / Learning Area</FieldLabel>
          <ModalSelect value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))} options={subjectOptions} placeholder="Select a subject…" />

          <FieldLabel>Class (optional — leave blank for whole cohort)</FieldLabel>
          <ModalSelect value={form.class_id} onChange={(v) => setForm((f) => ({ ...f, class_id: v }))} options={classOptions} placeholder="Whole cohort" />

          <FieldLabel>Question Paper / Assessment</FieldLabel>
          <ModalSelect value={form.e_assessment_id} onChange={(v) => setForm((f) => ({ ...f, e_assessment_id: v }))} options={assessmentOptions} placeholder="Attach later" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <FieldLabel>Date</FieldLabel>
              <ModalInput type="date" value={form.exam_date} onChange={(v) => setForm((f) => ({ ...f, exam_date: v }))} />
            </div>
            <div>
              <FieldLabel>Start Time (EAT)</FieldLabel>
              <ModalInput type="time" value={form.start_clock} onChange={(v) => setForm((f) => ({ ...f, start_clock: v }))} />
            </div>
            <div>
              <FieldLabel>End Time (EAT)</FieldLabel>
              <ModalInput type="time" value={form.end_clock} onChange={(v) => setForm((f) => ({ ...f, end_clock: v }))} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <ModalInput type="number" value={form.duration_minutes} onChange={(v) => setForm((f) => ({ ...f, duration_minutes: v }))} placeholder="Derived from start/end if left blank" />
            </div>
            <div>
              <FieldLabel>Maximum Marks</FieldLabel>
              <ModalInput type="number" value={form.max_marks} onChange={(v) => setForm((f) => ({ ...f, max_marks: v }))} />
            </div>
          </div>

          <FieldLabel>Venue / Room</FieldLabel>
          <ModalInput value={form.venue} onChange={(v) => setForm((f) => ({ ...f, venue: v }))} placeholder="e.g. Hall A" />

          <FieldLabel>Instructions</FieldLabel>
          <ModalTextarea value={form.instructions} onChange={(v) => setForm((f) => ({ ...f, instructions: v }))} placeholder="Optional instructions shown to candidates" />

          <SaveButton onClick={save} loading={saving} label={editing ? "Save Schedule" : "Add Subject"} icon={<Plus size={14} style={{ marginRight: 4 }} />} />
        </Modal>
      )}
    </div>
  );
}

function SubjectRow({ s, onEdit, onDelete, assessmentOptions, onAttach }) {
  const C = useC();
  const [attaching, setAttaching] = useState(false);
  // Only an actually-live session is protected from removal — a finished
  // one (ended/marking/completed) can be removed since its results live
  // entirely on the referenced e_assessment, not on this row (matches the
  // backend's deleteSubjectSession guard). Editing the schedule has its
  // own, separate lock (see the "locked" banner in the edit modal above).
  const deleteLocked = s.status === "active";

  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: C.textPri }}>{s.subject}</span>
            <LifecycleBadge status={s.status} />
          </div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>
            {fmtDate(s.exam_date || s.start_time)} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
            {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
            {s.venue ? ` · ${s.venue}` : ""}
          </div>
          <CountdownToActive startTime={s.start_time} status={s.status} style={{ marginTop: 4 }} />
          <div style={{ fontSize: 12.5, color: C.textSec, marginTop: 4 }}>
            {s.e_assessment_id
              ? <>Assessment: <strong>{s.assessment_title || `#${s.e_assessment_id}`}</strong></>
              : <span style={{ color: C.warning }}>No assessment attached yet</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {!attaching ? (
            <MiniBtn icon={<Link2 size={12} />} onClick={() => setAttaching(true)}>
              {s.e_assessment_id ? "Change Paper" : "Attach Paper"}
            </MiniBtn>
          ) : (
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => { if (e.target.value) { onAttach(e.target.value); setAttaching(false); } }}
              onBlur={() => setAttaching(false)}
              style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 12 }}
            >
              <option value="">Select assessment…</option>
              {assessmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <MiniBtn icon={<Pencil size={12} />} onClick={onEdit}>Edit</MiniBtn>
          <MiniBtn tone="danger" icon={<Trash2 size={12} />} onClick={onDelete} disabled={deleteLocked} title={deleteLocked ? "Cannot remove while active — end it first" : "Remove"} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TIMETABLE TAB (§5-§6, §40, §32 — Phase 8)
   Three presentations of the SAME derived data (§5 — "the timetable
   must be derived from the actual scheduled examination sessions...
   do not manually duplicate timetable information"): a day-grouped
   List view, a month Calendar view, and a print/PDF-style sheet with
   an institution header. No separate fetch/state per view — all
   three read the same `subjects` prop the dashboard already loaded.
═══════════════════════════════════════════════════════════ */
/* ── Exam code — lets the whole Main Examination (every subject's
   questions/roster + the timetable) be pulled onto the local exam
   server in one shot via GET /local-sync/pull-exam/:examCode, instead
   of authorizing/pulling each subject's assessment individually. See
   generateExamCode() in mainExam.controller.js and pullExamPackage()
   in syncController.js. ── */
function ExamCodeCard({ id, examination, onChanged, showToast }) {
  const C = useC();
  const [busy, setBusy] = useState(false);
  const code = examination?.exam_code || null;

  const generate = async (regenerate) => {
    try {
      setBusy(true);
      const { data } = await API.post(`/main-exams/${id}/exam-code`, regenerate ? { regenerate: true } : {});
      showToast(regenerate ? "New exam code generated — the old code will no longer work." : "Exam code ready");
      onChanged();
      return data?.exam_code;
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to generate exam code", "error");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast("Exam code copied");
    } catch {
      showToast("Couldn't copy — copy it manually", "error");
    }
  };

  return (
    <div
      className="no-print"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
        padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgAlt, marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Key size={16} color={C.textMuted} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>Exam code (for the local exam server)</div>
          {code ? (
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: C.textPri, fontFamily: "monospace" }}>{code}</div>
          ) : (
            <div style={{ fontSize: 12.5, color: C.textSec }}>Not generated yet — the whole exam can't be pulled offline until it is.</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {code && (
          <ActionButton icon={<Copy size={14} />} onClick={copyCode}>Copy</ActionButton>
        )}
        <ActionButton
          primary={!code}
          icon={code ? <RotateCw size={14} /> : <Key size={14} />}
          onClick={() => generate(!!code)}
          disabled={busy}
        >
          {busy ? "Working…" : code ? "Regenerate" : "Generate Exam Code"}
        </ActionButton>
      </div>
    </div>
  );
}

function TimetableTab({ id, subjects, examination, onChanged, showToast }) {
  const C = useC();
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [view, setView] = useState("list"); // "list" | "calendar"

  const sorted = useMemo(
    () => [...subjects].sort((a, b) => new Date(a.start_time || a.exam_date || 0) - new Date(b.start_time || b.exam_date || 0)),
    [subjects]
  );

  // Day-grouped for both the List view and the printable sheet — one
  // pass, shared by both so they can never drift out of sync.
  const byDay = useMemo(() => {
    const groups = new Map();
    for (const s of sorted) {
      const key = dateKeyOf(s.exam_date || s.start_time);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    return [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }, [sorted]);

  const unscheduled = useMemo(() => sorted.filter((s) => !dateKeyOf(s.exam_date || s.start_time)), [sorted]);

  const publish = async () => {
    try {
      setPublishing(true);
      await API.put(`/main-exams/${id}/publish`);
      showToast("Timetable published — subjects are now schedule-driven and will auto-activate/end.");
      onChanged();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors?.length) showToast(data.errors[0], "error");
      else showToast(data?.message || "Failed to publish timetable", "error");
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!window.confirm("Revert this timetable to draft? Subjects that haven't started yet will go back to draft and stop being schedule-driven until you publish again.")) return;
    try {
      setUnpublishing(true);
      await API.put(`/main-exams/${id}/unpublish`);
      showToast("Timetable reverted to draft.");
      onChanged();
    } catch (err) {
      const data = err?.response?.data;
      showToast(data?.message || "Failed to revert timetable to draft", "error");
    } finally {
      setUnpublishing(false);
    }
  };

  return (
    <div>
      <ExamCodeCard id={id} examination={examination} onChanged={onChanged} showToast={showToast} />
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.textSec }}>
          Derived directly from the scheduled subjects — nothing here is entered separately (§5).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ViewToggle view={view} onChange={setView} />
          <ActionButton icon={<Printer size={14} />} onClick={() => window.print()}>Print</ActionButton>
          {examination?.status === "draft" && (
            <ActionButton primary icon={<CheckCircle2 size={14} />} onClick={publish} disabled={publishing}>
              {publishing ? "Publishing…" : "Publish Timetable"}
            </ActionButton>
          )}
          {examination?.status === "published" && (
            <ActionButton icon={<Undo2 size={14} />} onClick={unpublish} disabled={unpublishing}>
              {unpublishing ? "Reverting…" : "Revert to Draft"}
            </ActionButton>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<Table2 size={24} />} text="No subjects scheduled yet." />
      ) : (
        <div className="no-print">
          {view === "list" ? (
            <TimetableListView byDay={byDay} unscheduled={unscheduled} />
          ) : (
            <TimetableCalendarView byDay={byDay} sorted={sorted} />
          )}
        </div>
      )}

      {/* Print-only sheet (§32) — always the day-grouped table, regardless
         of which screen view is active, since a calendar grid doesn't
         paginate or read well on paper. Invisible on screen; shown only
         by the .mx-print-only rule in shared.jsx when window.print() runs. */}
      <TimetablePrintSheet examination={examination} byDay={byDay} unscheduled={unscheduled} />
    </div>
  );
}

/* ── List <-> Calendar toggle ── */
function ViewToggle({ view, onChange }) {
  const C = useC();
  const opt = (key, label, Icon) => (
    <button
      key={key}
      onClick={() => onChange(key)}
      className="btn-hover"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: `1px solid ${C.border}`,
        background: view === key ? C.accent : C.card,
        color: view === key ? C.white : C.textSec,
        borderRadius: key === "list" ? "8px 0 0 8px" : "0 8px 8px 0",
        marginLeft: key === "calendar" ? -1 : 0,
      }}
    >
      <Icon size={14} />{label}
    </button>
  );
  return <div style={{ display: "flex" }}>{opt("list", "List", ListChecks)}{opt("calendar", "Calendar", CalendarDays)}</div>;
}

/* ── Official-style timetable table ──
   One continuous table like the printed institutional timetable:
   # | Day / Date (merged down the day) | Time | S/N | Subject | Duration | Venue.
   Break rows (green) are DERIVED from the gap between one session's end
   and the next session's start on the same day — nothing is entered
   separately (§5). Used by both the screen List view and the print
   sheet so they can never drift apart. ── */
const _utcMins = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.getUTCHours() * 60 + d.getUTCMinutes();
};
const _clock = (mins) => {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}.${String(m).padStart(2, "0")} ${ap}`;
};
const _dur = (mins) => {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} hour${h > 1 ? "s" : ""}` : "", m ? `${m} minutes` : ""].filter(Boolean).join(" ");
};
const _dayLabel = (key) => new Date(`${key}T00:00:00Z`)
  .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

function ExamTimetableTable({ byDay, print = false }) {
  const C = useC();
  const border = print ? "#7B8494" : C.border;
  const cell = { padding: "7px 10px", border: `1px solid ${border}`, verticalAlign: "top", textAlign: "left", fontSize: print ? 11.5 : 13 };
  const head = { ...cell, fontWeight: 700, textTransform: "uppercase", fontSize: print ? 9.5 : 11, letterSpacing: "0.04em", background: print ? "#F1F3F6" : C.bgAlt, color: print ? "#0B0F19" : C.textMuted, verticalAlign: "middle" };
  const breakBg = "rgba(112,173,71,0.45)";

  let sn = 0;
  const body = [];
  byDay.forEach(([key, sessions], dayIdx) => {
    const rows = [];
    let prevEnd = null;
    sessions.forEach((s) => {
      const st = _utcMins(s.start_time);
      let en = _utcMins(s.end_time);
      if (en === null && st !== null && s.duration_minutes) en = st + Number(s.duration_minutes);
      if (prevEnd !== null && st !== null && st > prevEnd) {
        rows.push({ type: "break", from: prevEnd, to: st });
      }
      rows.push({ type: "exam", s, st, en });
      if (en !== null) prevEnd = en;
    });

    rows.forEach((r, i) => {
      const first = i === 0;
      const dayCells = first ? (
        <>
          <td rowSpan={rows.length} style={{ ...cell, fontWeight: 700, textAlign: "center", width: 34 }}>{dayIdx + 1}.</td>
          <td rowSpan={rows.length} style={{ ...cell, minWidth: 110 }}>
            <div style={{ fontWeight: 800, textTransform: "uppercase" }}>{fmtDayName(key)}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{_dayLabel(key)}</div>
          </td>
        </>
      ) : null;

      if (r.type === "break") {
        body.push(
          <tr key={`${key}-b-${i}`}>
            {dayCells}
            <td style={{ ...cell, background: breakBg, fontWeight: 700, whiteSpace: "nowrap" }}>{_clock(r.from)} – {_clock(r.to)}</td>
            <td style={{ ...cell, background: breakBg }} />
            <td style={{ ...cell, background: breakBg, fontWeight: 700 }}>Break</td>
            <td style={{ ...cell, background: breakBg, fontWeight: 700 }}>{_dur(r.to - r.from)}</td>
            <td style={{ ...cell, background: breakBg }} />
          </tr>
        );
      } else {
        sn += 1;
        const { s, st, en } = r;
        const dur = s.duration_minutes ? Number(s.duration_minutes) : (st !== null && en !== null ? en - st : 0);
        body.push(
          <tr key={`${key}-s-${s.id}`}>
            {dayCells}
            <td style={{ ...cell, whiteSpace: "nowrap" }}>{st !== null ? _clock(st) : "—"}{en !== null ? ` – ${_clock(en)}` : ""}</td>
            <td style={{ ...cell, textAlign: "center", width: 40 }}>{sn}.</td>
            <td style={{ ...cell, fontWeight: 700 }}>{s.subject}</td>
            <td style={cell}>{_dur(dur)}</td>
            <td style={cell}>{s.venue || "—"}</td>
          </tr>
        );
      }
    });
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...head, textAlign: "center" }}>#</th>
            <th style={head}>Day / Date</th>
            <th style={head}>Time</th>
            <th style={{ ...head, textAlign: "center" }}>S/N</th>
            <th style={head}>Subject</th>
            <th style={head}>Duration</th>
            <th style={head}>Venue</th>
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}

/* ── List view (§5) — day-grouped table, screen version ── */
function TimetableListView({ byDay, unscheduled }) {
  const C = useC();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {byDay.length > 0 && <ExamTimetableTable byDay={byDay} />}

      {unscheduled.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 800, fontSize: 13.5, color: C.textMuted }}>Not yet scheduled</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr><Th>Subject</Th><Th>Venue</Th><Th>Status</Th></tr></thead>
            <tbody>
              {unscheduled.map((s) => (
                <tr key={s.id}>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{s.subject}</Td>
                  <Td>{s.venue || "—"}</Td>
                  <Td><LifecycleBadge status={s.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Calendar view (§5) — month grid, built with plain Date math
   (no calendar library in this project) ── */
function TimetableCalendarView({ byDay, sorted }) {
  const C = useC();
  const dayMap = useMemo(() => new Map(byDay), [byDay]);

  // Start on the month of the first scheduled subject, so an admin
  // opening this tab doesn't land on an empty "today" page by default.
  const firstScheduled = sorted.find((s) => s.exam_date || s.start_time);
  const initialMonth = firstScheduled
    ? new Date(new Date(firstScheduled.exam_date || firstScheduled.start_time).getFullYear(), new Date(firstScheduled.exam_date || firstScheduled.start_time).getMonth(), 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [month, setMonth] = useState(initialMonth);
  const [selectedKey, setSelectedKey] = useState(null);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const todayKey = dateKeyOf(new Date());
    const out = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      const date = new Date(year, m, dayNum);
      const key = dateKeyOf(date);
      out.push({
        key, date,
        inMonth: dayNum >= 1 && dayNum <= daysInMonth,
        isToday: key === todayKey,
        sessions: dayMap.get(key) || [],
      });
    }
    return out;
  }, [month, dayMap]);

  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedSessions = selectedKey ? (dayMap.get(selectedKey) || []) : [];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
        <button className="dash-icon-btn" style={{ ...pageSx.iconBtn }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} title="Previous month">
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 15, color: C.textPri, minWidth: 160, textAlign: "center" }}>{monthLabel}</span>
        <button className="dash-icon-btn" style={{ ...pageSx.iconBtn }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} title="Next month">
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ padding: "9px 6px", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((c, i) => {
            const visible = c.sessions.slice(0, 3);
            const extra = c.sessions.length - visible.length;
            return (
              <button
                key={i}
                onClick={() => c.sessions.length > 0 && setSelectedKey(c.key)}
                style={{
                  textAlign: "left", minHeight: 84, padding: "7px 6px", border: "none",
                  borderRight: (i + 1) % 7 !== 0 ? `1px solid ${C.border}` : "none",
                  borderBottom: `1px solid ${C.border}`,
                  background: selectedKey === c.key ? C.bgAlt : C.card,
                  opacity: c.inMonth ? 1 : 0.4,
                  cursor: c.sessions.length > 0 ? "pointer" : "default",
                  display: "flex", flexDirection: "column", gap: 4,
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: c.isToday ? 800 : 600, color: c.isToday ? C.white : C.textSec,
                  background: c.isToday ? C.accent : "transparent",
                  width: 20, height: 20, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{c.date.getDate()}</span>
                {visible.map((s) => (
                  <span key={s.id} style={{
                    fontSize: 10.5, fontWeight: 600, color: C.accent, background: "var(--primary-tint)",
                    borderRadius: 5, padding: "2px 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {fmtTime(s.start_time)} {s.subject}
                  </span>
                ))}
                {extra > 0 && <span style={{ fontSize: 10, color: C.textMuted }}>+{extra} more</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedKey && selectedSessions.length > 0 && (
        <div style={{ marginTop: 16, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: C.bgAlt, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13.5, color: C.textPri }}>{fmtDate(selectedKey)}</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>{fmtDayName(selectedKey)}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr><Th>Time (EAT)</Th><Th>Subject</Th><Th>Duration</Th><Th>Venue</Th><Th>Status</Th></tr></thead>
            <tbody>
              {selectedSessions.map((s) => (
                <tr key={s.id}>
                  <Td>{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</Td>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{s.subject}</Td>
                  <Td>{s.duration_minutes ? `${s.duration_minutes} min` : "—"}</Td>
                  <Td>{s.venue || "—"}</Td>
                  <Td><LifecycleBadge status={s.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Printable sheet (§32) — official-document layout: institution
   logo/name, examination name, academic year, report title, generated
   date, landscape A4, paginates naturally since it's a plain table
   (no fixed-height page-break tricks needed for a timetable's row
   count). Rendered off-screen at all times; shown only by the
   .mx-print-only CSS rule in shared.jsx while printing. ── */
function TimetablePrintSheet({ examination, byDay, unscheduled }) {
  const { settings } = useSchoolSettings();
  const generated = new Date().toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-print-only">
      <style>{`
        @page { size: A4 landscape; margin: 14mm; }
        .mx-print-only, .mx-print-only * { color: #0B0F19 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .mx-print-only table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        .mx-print-only th, .mx-print-only td { border: 1px solid #C7CCD6; padding: 6px 9px; text-align: left; }
        .mx-print-only th { background: #F1F3F6; font-weight: 700; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.04em; }
        .mx-print-only h3 { font-size: 12px; margin: 16px 0 6px; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #0B0F19", paddingBottom: 10, marginBottom: 14 }}>
        {settings?.logoUrl && <img src={settings.logoUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain" }} />}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{settings?.schoolName || "Institution"}</div>
          {(settings?.address || settings?.phone || settings?.email) && (
            <div style={{ fontSize: 10.5, color: "#384152" }}>
              {[settings?.address, settings?.phone, settings?.email].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Examination Timetable</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>Generated {generated}</div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{examination?.name}</div>
      <div style={{ fontSize: 11, color: "#384152", marginBottom: 4 }}>
        {[examination?.academic_year, examination?.programme, examination?.department, examination?.term].filter(Boolean).join(" · ") || "—"}
        {"  ·  "}{fmtDate(examination?.start_date)} — {fmtDate(examination?.end_date)}
      </div>

      {byDay.length > 0 && <ExamTimetableTable byDay={byDay} print />}

      {unscheduled.length > 0 && (
        <div>
          <h3>Not yet scheduled</h3>
          <table>
            <thead><tr><th>Subject</th><th>Venue</th></tr></thead>
            <tbody>
              {unscheduled.map((s) => (
                <tr key={s.id}><td>{s.subject}</td><td>{s.venue || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CANDIDATES TAB (§18/§26)
   Per-candidate registration + completion status for this Main
   Examination. Reuses the exact same student-analytics endpoint the
   Analytics → Students sub-view calls (§51 — one source of truth), just
   surfaced under its own tab with its own framing. This schema has no
   attendance-register table, so "attendance" is represented honestly by
   completion status (Completed / Incomplete per subject) rather than a
   fabricated present/absent register (§50).
═══════════════════════════════════════════════════════════ */
function CandidatesTab({ id, showToast }) {
  const C = useC();
  const [students, setStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drillId, setDrillId] = useState(null);
  const [drillLabel, setDrillLabel] = useState("");
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const load = useCallback(async (q) => {
    try {
      setLoading(true);
      const res = await API.get(`/main-exams/${id}/analytics/students`, { params: q ? { search: q } : {} });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load candidates", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(""); }, [load]);

  const openCandidate = async (studentId, name) => {
    setDrillId(studentId);
    setDrillLabel(name);
    setDrillData(null);
    setDrillLoading(true);
    try {
      const res = await API.get(`/main-exams/${id}/analytics/students/${studentId}`);
      setDrillData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load candidate profile", "error");
    } finally {
      setDrillLoading(false);
    }
  };

  if (drillId) {
    return (
      <StudentProfileView
        loading={drillLoading}
        data={drillData}
        onBack={() => { setDrillId(null); setDrillData(null); }}
      />
    );
  }

  const totals = students ? {
    registered: students.length,
    fullyComplete: students.filter((s) => s.subjects_registered > 0 && s.subjects_incomplete === 0).length,
    withIncomplete: students.filter((s) => s.subjects_incomplete > 0).length,
  } : null;

  return (
    <div>
      <SectionHeader title="Candidates" />
      {totals && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 18 }}>
          <SmallStat label="Registered Candidates" value={totals.registered} icon={<Users size={16} />} />
          <SmallStat label="Fully Completed" value={totals.fullyComplete} icon={<CheckCircle2 size={16} />} tone="success" />
          <SmallStat label="With Incomplete Subjects" value={totals.withIncomplete} icon={<Clock size={16} />} tone="warning" />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          placeholder="Search by name or admission number…"
          style={{ flex: 1, maxWidth: 340, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13.5, outline: "none" }}
        />
        <ActionButton icon={<Search size={14} />} onClick={() => load(search)}>Search</ActionButton>
      </div>

      {loading && !students ? (
        <div className="dash-skeleton" style={{ height: 240, borderRadius: 12 }} />
      ) : !students || students.length === 0 ? (
        <EmptyState icon={<Users size={22} />} text="No registered candidates found for this examination yet. A student is counted here once at least one published subject session applies to their class or year." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Candidate</Th><Th>Admission No.</Th><Th>Subjects Registered</Th>
              <Th>Completed</Th><Th>Incomplete</Th><Th>Overall Average</Th><Th></Th>
            </tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.student_id} style={{ cursor: "pointer" }} onClick={() => openCandidate(s.student_id, s.name)}>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{s.name}</Td>
                  <Td>{s.admission_no || "—"}</Td>
                  <Td>{s.subjects_registered}</Td>
                  <Td>{s.subjects_completed}</Td>
                  <Td>
                    {s.subjects_incomplete > 0
                      ? <Chip text={`${s.subjects_incomplete} incomplete`} tone="warning" />
                      : <Chip text="Complete" tone="success" />}
                  </Td>
                  <Td>{s.overall_average != null ? `${s.overall_average}%` : "Not enough data"}</Td>
                  <Td><MiniBtn icon={<ChevronRight size={13} />} onClick={() => openCandidate(s.student_id, s.name)} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESULTS TAB (§18)
   A consolidated per-student, per-subject marks view. There's no
   single "all candidates in this exam" results table on the backend —
   results are naturally class-shaped (a student's marks only make
   sense against the subjects their class actually sat) — so this
   drives the existing class-results report (§30.4, already backing
   the Reports tab and the Analytics Classes drill-down) with a class
   picker up front. Grade columns stay "—": no grading-scale table
   exists in this schema (§16/§50), never fabricated here.
═══════════════════════════════════════════════════════════ */
function ResultsTab({ id, classes, showToast }) {
  const C = useC();
  const [classId, setClassId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const load = useCallback(async (cid) => {
    if (!cid) { setData(null); return; }
    try {
      setLoading(true);
      const res = await API.get(`/main-exams/${id}/reports/classes/${cid}/results`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.(err?.response?.data?.message || "Failed to load class results", "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { if (classId) load(classId); }, [classId, load]);

  const filteredRows = useMemoFilterRows(data?.rows, studentSearch);

  return (
    <div>
      <SectionHeader title="Results" />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <FieldLabel>Class</FieldLabel>
        <div style={{ minWidth: 220 }}>
          <ModalSelect
            value={classId}
            onChange={setClassId}
            placeholder="Select a class…"
            options={(classes || []).map((c) => ({ value: String(c.id), label: c.name }))}
          />
        </div>
        {classId && (
          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Filter by name or admission no…"
            style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13.5, outline: "none", minWidth: 220 }}
          />
        )}
      </div>

      {!classId ? (
        <EmptyState icon={<ListChecks size={22} />} text="Pick a class above to see each student's marks across every subject they sat in this examination." />
      ) : loading ? (
        <div className="dash-skeleton" style={{ height: 260, borderRadius: 12 }} />
      ) : !data ? (
        <EmptyState icon={<ListChecks size={22} />} text="Could not load results for that class." />
      ) : data.subjects.length === 0 ? (
        <EmptyState icon={<BookOpenCheck size={22} />} text="No subjects in this examination apply to this class yet." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Student</Th><Th>Admission No.</Th>
              {data.subjects.map((s) => <Th key={s.session_id}>{s.subject}</Th>)}
              <Th>Total</Th><Th>Average</Th>
            </tr></thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.student_id}>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{r.name}</Td>
                  <Td>{r.admission_no || "—"}</Td>
                  {r.subjects.map((sm, i) => (
                    <Td key={i}>{sm.score != null ? `${sm.score}/${sm.total_marks}` : "—"}</Td>
                  ))}
                  <Td>{r.total_marks_obtained != null ? `${r.total_marks_obtained}/${r.total_marks_possible}` : "—"}</Td>
                  <Td>{r.average_percentage != null ? `${r.average_percentage}%` : "Not enough data"}</Td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><Td style={{ textAlign: "center", padding: 20 }}>No students match that search.</Td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function round1(n) { return n == null ? null : Math.round(n * 10) / 10; }

function useMemoFilterRows(rows, search) {
  return useMemo(() => {
    const list = rows || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((r) => r.name?.toLowerCase().includes(q) || String(r.admission_no || "").toLowerCase().includes(q));
  }, [rows, search]);
}

/* ═══════════════════════════════════════════════════════════
   REPORTS TAB (§29-§33, Phase 11-13)
   A picker over the 10 report types from §30. The backend is 100%
   ready (every /reports/... route below is already mounted in
   routes/mainExams.js) — this is purely the frontend wiring that was
   missing. "View" renders the JSON as an on-screen table; "Excel" /
   "PDF" GET the matching export route as a blob and trigger a browser
   download, reading the real filename off the Content-Disposition
   header (works cross-origin now that server.js exposes that header).
   4 of the 10 report types need a selector first (subject/class/
   candidate) — the picker only appears for the report types that need
   it, and View/Excel/PDF stay disabled until it's filled in.
═══════════════════════════════════════════════════════════ */
const REPORT_TYPES = [
  { key: "summary", label: "Main Examination Summary", needs: null, path: (id) => `/main-exams/${id}/reports/summary` },
  { key: "timetable", label: "Examination Timetable", needs: null, path: (id) => `/main-exams/${id}/reports/timetable` },
  { key: "grade-distribution", label: "Grade Distribution", needs: null, path: (id) => `/main-exams/${id}/reports/grade-distribution` },
  { key: "marking-progress", label: "Marking Progress", needs: null, path: (id) => `/main-exams/${id}/reports/marking-progress` },
  { key: "subject-results", label: "Subject Results", needs: "subject", path: (id, sel) => `/main-exams/${id}/reports/subjects/${sel}/results` },
  { key: "question-analysis", label: "Question Analysis", needs: "subject", path: (id, sel) => `/main-exams/${id}/reports/subjects/${sel}/question-analysis` },
  { key: "topic-analysis", label: "Topic / Competency Analysis", needs: "subject", path: (id, sel) => `/main-exams/${id}/reports/subjects/${sel}/topic-analysis` },
  { key: "class-results", label: "Class Results", needs: "class", path: (id, sel) => `/main-exams/${id}/reports/classes/${sel}/results` },
  { key: "student-result", label: "Candidate Result", needs: "student", path: (id, sel) => `/main-exams/${id}/reports/students/${sel}/result` },
  { key: "candidate-schedule", label: "Candidate Examination Schedule", needs: "student", path: (id, sel) => `/main-exams/${id}/reports/students/${sel}/schedule` },
];

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function ReportsTab({ id, subjects, classes, showToast }) {
  const C = useC();
  const [reportKey, setReportKey] = useState(REPORT_TYPES[0].key);
  const [subjectSel, setSubjectSel] = useState("");
  const [classSel, setClassSel] = useState("");
  const [studentSel, setStudentSel] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null); // "excel" | "pdf" | null

  const report = REPORT_TYPES.find((r) => r.key === reportKey);
  const selValue = report?.needs === "subject" ? subjectSel : report?.needs === "class" ? classSel : report?.needs === "student" ? studentSel : null;
  const ready = !report?.needs || !!selValue;

  const changeReport = (key) => { setReportKey(key); setData(null); };

  const searchStudents = useCallback(async (q) => {
    try {
      setStudentSearching(true);
      const res = await API.get(`/main-exams/${id}/analytics/students`, { params: q ? { search: q } : {} });
      setStudentOptions(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setStudentSearching(false);
    }
  }, [id]);

  useEffect(() => {
    if (report?.needs === "student" && studentOptions.length === 0 && !studentSearching) searchStudents("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.needs]);

  const view = async () => {
    if (!report || !ready) return;
    try {
      setLoading(true);
      const res = await API.get(report.path(id, selValue));
      setData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.(err?.response?.data?.message || "Failed to load report", "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const download = async (format) => {
    if (!report || !ready) return;
    try {
      setDownloading(format);
      const res = await API.get(`${report.path(id, selValue)}/${format}`, { responseType: "blob" });
      const disposition = res.headers?.["content-disposition"] || "";
      const match = /filename="?([^"]+)"?/i.exec(disposition);
      const filename = match?.[1] || `${report.key}.${format === "excel" ? "xlsx" : "pdf"}`;
      downloadBlob(new Blob([res.data]), filename);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to download report", "error");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Reports" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 680 }} className="dash-two-col">
        <div>
          <FieldLabel>Report Type</FieldLabel>
          <ModalSelect value={reportKey} onChange={changeReport} placeholder="Select a report…" options={REPORT_TYPES.map((r) => ({ value: r.key, label: r.label }))} />
        </div>

        {report?.needs === "subject" && (
          <div>
            <FieldLabel>Subject</FieldLabel>
            <ModalSelect
              value={subjectSel}
              onChange={(v) => { setSubjectSel(v); setData(null); }}
              placeholder="Select a subject…"
              options={(subjects || []).map((s) => ({
                value: String(s.id),
                label: s.class_name
                  ? `${s.subject} — ${s.class_name}`
                  : s.year_of_study
                  ? `${s.subject} — Year ${s.year_of_study}`
                  : s.subject,
              }))}
            />
          </div>
        )}

        {report?.needs === "class" && (
          <div>
            <FieldLabel>Class</FieldLabel>
            <ModalSelect
              value={classSel}
              onChange={(v) => { setClassSel(v); setData(null); }}
              placeholder="Select a class…"
              options={(classes || []).map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </div>
        )}

        {report?.needs === "student" && (
          <div>
            <FieldLabel>Candidate</FieldLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchStudents(studentQuery)}
                placeholder="Search by name or admission no…"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13.5, outline: "none" }}
              />
              <MiniBtn icon={<Search size={13} />} onClick={() => searchStudents(studentQuery)} />
            </div>
            <ModalSelect
              value={studentSel}
              onChange={(v) => { setStudentSel(v); setData(null); }}
              placeholder={studentSearching ? "Searching…" : "Select a candidate…"}
              options={studentOptions.map((s) => ({ value: String(s.student_id), label: `${s.name}${s.admission_no ? ` (${s.admission_no})` : ""}` }))}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        <ActionButton icon={<Eye size={14} />} onClick={view} disabled={!ready || loading} primary>
          {loading ? "Loading…" : "View"}
        </ActionButton>
        <ActionButton icon={<FileSpreadsheet size={14} />} onClick={() => download("excel")} disabled={!ready || !!downloading}>
          {downloading === "excel" ? "Downloading…" : "Excel"}
        </ActionButton>
        <ActionButton icon={<Download size={14} />} onClick={() => download("pdf")} disabled={!ready || !!downloading}>
          {downloading === "pdf" ? "Downloading…" : "PDF"}
        </ActionButton>
      </div>

      {!ready ? (
        <EmptyState icon={<FileText size={22} />} text="Pick the subject, class, or candidate above, then View, Excel, or PDF." />
      ) : loading ? (
        <div className="dash-skeleton" style={{ height: 260, borderRadius: 12 }} />
      ) : !data ? (
        <EmptyState icon={<FileText size={22} />} text="Click View to render this report on-screen, or download it directly as Excel/PDF." />
      ) : (
        <ReportView reportKey={reportKey} data={data} />
      )}
    </div>
  );
}

/* ── Small shared building blocks for report rendering ── */
function ReportHeadline({ items }) {
  const C = useC();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18 }}>
      {items.filter(([, v]) => v !== undefined).map(([label, value]) => (
        <DetailRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function NoteBanner({ text }) {
  const C = useC();
  return (
    <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: C.textMuted, marginBottom: 16 }}>
      {text}
    </div>
  );
}

function RowsTable({ rows, columns, emptyText }) {
  if (!rows || rows.length === 0) return <EmptyState icon={<FileText size={22} />} text={emptyText || "No data for this report yet."} />;
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--dash-border, transparent)", borderRadius: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{columns.map((c) => <Th key={c.key}>{c.label}</Th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? r.session_id ?? r.student_id ?? r.question_id ?? i}>
              {columns.map((c) => (
                <Td key={c.key} style={c.strong ? { fontWeight: 700 } : undefined}>
                  {c.fmt ? c.fmt(r[c.key], r) : (r[c.key] ?? "—")}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportView({ reportKey, data }) {
  switch (reportKey) {
    case "summary": return <SummaryReportView data={data} />;
    case "timetable": return <TimetableReportView data={data} />;
    case "grade-distribution": return <GradeDistributionReportView data={data} />;
    case "marking-progress":
      return (
        <RowsTable
          rows={data.rows}
          emptyText="No subjects with attached assessments yet."
          columns={[
            { key: "subject", label: "Subject", strong: true },
            { key: "total_submissions", label: "Submissions" },
            { key: "marked", label: "Marked" },
            { key: "unmarked", label: "Unmarked" },
            { key: "progress_pct", label: "Progress", fmt: (v) => (v != null ? `${v}%` : "—") },
          ]}
        />
      );
    case "subject-results":
      return (
        <div>
          {data.subject && <ReportHeadline items={[["Subject", data.subject.subject], ["Total Marks", data.subject.total_marks ?? "—"]]} />}
          {data.note && <NoteBanner text={data.note} />}
          <RowsTable
            rows={data.rows}
            emptyText="No candidates found for this subject."
            columns={[
              { key: "name", label: "Candidate", strong: true },
              { key: "admission_no", label: "Admission No." },
              { key: "marks", label: "Marks", fmt: (v, r) => (v != null ? `${v}/${r.total_marks ?? "—"}` : "—") },
              { key: "percentage", label: "Percentage", fmt: (v) => (v != null ? `${v}%` : "—") },
              { key: "status", label: "Status" },
            ]}
          />
        </div>
      );
    case "question-analysis":
      return (
        <div>
          {data.subject && <ReportHeadline items={[["Subject", data.subject.subject]]} />}
          {data.discrimination_note && <NoteBanner text={data.discrimination_note} />}
          <RowsTable
            rows={data.rows}
            emptyText="No questions found for this subject."
            columns={[
              { key: "question_id", label: "Q#" },
              { key: "question_type", label: "Type" },
              { key: "marks", label: "Marks" },
              { key: "attempts", label: "Attempts" },
              { key: "correct", label: "Correct %", fmt: (v) => (v != null ? `${v}%` : "—") },
              { key: "incorrect", label: "Incorrect %", fmt: (v) => (v != null ? `${v}%` : "—") },
              { key: "unanswered", label: "Unanswered %", fmt: (v) => (v != null ? `${v}%` : "—") },
              { key: "difficulty", label: "Difficulty" },
              { key: "discrimination", label: "Discrimination", fmt: (v, r) => (v != null ? v : r.discrimination_label || "—") },
            ]}
          />
        </div>
      );
    case "topic-analysis":
      return (
        <div>
          {data.subject && <ReportHeadline items={[["Subject", data.subject.subject]]} />}
          {data.note
            ? <NoteBanner text={data.note} />
            : <RowsTable rows={data.rows} columns={[{ key: "topic", label: "Topic" }, { key: "percentage", label: "Percentage" }]} />}
        </div>
      );
    case "class-results": return <ClassResultsReportView data={data} />;
    case "student-result": return <StudentResultReportView data={data} />;
    case "candidate-schedule": return <CandidateScheduleReportView data={data} />;
    default: return <EmptyState icon={<FileText size={22} />} text="Unknown report type." />;
  }
}

function SummaryReportView({ data }) {
  const cs = data.candidate_stats || {};
  const pf = data.performance || {};
  return (
    <div>
      <ReportHeadline
        items={[
          ["Registered", cs.registered], ["Attempted", cs.attempted], ["Completed", cs.completed],
          ["Incomplete", cs.incomplete], ["Absent", cs.absent],
        ]}
      />
      <ReportHeadline
        items={[
          ["Mean", pf.mean != null ? `${pf.mean}%` : "—"], ["Median", pf.median != null ? `${pf.median}%` : "—"],
          ["Highest", pf.highest != null ? `${pf.highest}%` : "—"], ["Lowest", pf.lowest != null ? `${pf.lowest}%` : "—"],
          ["Std. Deviation", pf.std_dev ?? "—"],
          ["Pass Rate", pf.pass_rate != null ? `${pf.pass_rate}%` : (pf.pass_rate_note || "N/A")],
        ]}
      />
      {data.grade_distribution_note && <NoteBanner text={data.grade_distribution_note} />}
      <RowsTable
        rows={data.subjects}
        emptyText="No subjects scheduled with an attached assessment yet."
        columns={[
          { key: "subject", label: "Subject", strong: true },
          { key: "registered", label: "Registered" },
          { key: "attempted", label: "Attempted" },
          { key: "completed", label: "Completed" },
          { key: "mean", label: "Mean %", fmt: (v) => (v != null ? `${v}%` : "—") },
          { key: "highest", label: "Highest %", fmt: (v) => (v != null ? `${v}%` : "—") },
          { key: "lowest", label: "Lowest %", fmt: (v) => (v != null ? `${v}%` : "—") },
        ]}
      />

      <SectionHeader title="Nominal Roll" />
      <NominalRollTable data={data.nominal_roll} />
    </div>
  );
}

function NominalRollTable({ data }) {
  const C = useC();
  const nr = data || { subjects: [], rows: [] };
  const subjects = nr.subjects || [];
  const rows = nr.rows || [];
  if (!rows.length) return <EmptyState icon={<FileText size={22} />} text="No registered candidates found for this examination." />;
  return (
    <div>
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th>Position</Th><Th>Assessment No.</Th><Th>G</Th><Th>Name</Th>
            {subjects.map((s) => <Th key={s.session_id} title={s.subject}>{s.code}</Th>)}
            <Th>Average %</Th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student_id}>
                <Td>{r.class_position ?? "—"}</Td>
                <Td>{r.admission_no || "—"}</Td>
                <Td>{r.gender || "—"}</Td>
                <Td style={{ fontWeight: 700, color: C.textPri }}>{r.name}</Td>
                {r.marks.map((m, i) => (
                  <Td key={i}>{m.not_registered || m.score == null ? "—" : m.score}</Td>
                ))}
                <Td>{r.average_percentage != null ? `${r.average_percentage}%` : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Key — column headers above are short codes (this schema has no
          subject-code table, so they're generated per exam; see
          assignSubjectCodes() in mainExamAnalytics.controller.js), so
          the roll always ships with what each code means. */}
      {subjects.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.textSec }}>
          <span style={{ fontWeight: 600, color: C.textPri }}>Key: </span>
          {subjects.map((s, i) => (
            <span key={s.session_id}>
              <strong style={{ color: C.textPri }}>{s.code}</strong> = {s.subject}
              {i < subjects.length - 1 ? " · " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TimetableReportView({ data }) {
  const byDay = useMemo(() => {
    const sorted = [...(data.timetable || [])].sort((x, y) => new Date(x.start_time || x.exam_date || 0) - new Date(y.start_time || y.exam_date || 0));
    const groups = new Map();
    sorted.forEach((s) => {
      const key = dateKeyOf(s.exam_date || s.start_time);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...s, id: s.id ?? s.session_id ?? `${key}-${s.subject}` });
    });
    return [...groups.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
  }, [data.timetable]);
  return (
    <div>
      {data.examination && <ReportHeadline items={[["Examination", data.examination.name]]} />}
      {byDay.length === 0 ? <EmptyState icon={<Table2 size={22} />} text="No subjects scheduled yet." /> : <ExamTimetableTable byDay={byDay} />}
    </div>
  );
}

function GradeDistributionReportView({ data }) {
  const gd = data.grade_distribution;
  if (!gd) return <NoteBanner text={data.note || "Grade distribution is unavailable."} />;
  const rows = Object.entries(gd).map(([grade, count]) => ({ grade, count }));
  return <RowsTable rows={rows} columns={[{ key: "grade", label: "Grade", strong: true }, { key: "count", label: "Candidates" }]} />;
}

function ClassResultsReportView({ data }) {
  const C = useC();
  const subjects = data.subjects || [];
  const rows = data.rows || [];
  return (
    <div>
      {data.class && <ReportHeadline items={[["Class", data.class.name]]} />}
      {subjects.length === 0 ? (
        <EmptyState icon={<BookOpenCheck size={22} />} text="No subjects in this examination apply to this class yet." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Student</Th><Th>Admission No.</Th>
              {subjects.map((s) => <Th key={s.session_id}>{s.subject}</Th>)}
              <Th>Total</Th><Th>Average</Th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{r.name}</Td>
                  <Td>{r.admission_no || "—"}</Td>
                  {r.subjects.map((sm, i) => <Td key={i}>{sm.score != null ? `${sm.score}/${sm.total_marks}` : "—"}</Td>)}
                  <Td>{r.total_marks_obtained != null ? `${r.total_marks_obtained}/${r.total_marks_possible}` : "—"}</Td>
                  <Td>{r.average_percentage != null ? `${r.average_percentage}%` : "—"}</Td>
                </tr>
              ))}
              {rows.length === 0 && <tr><Td style={{ textAlign: "center", padding: 20 }}>No students in this class.</Td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentResultReportView({ data }) {
  return (
    <div>
      <ReportHeadline
        items={[
          ["Candidate", data.student?.name], ["Admission No.", data.student?.admission_no ?? "—"],
          ["Overall Average", data.overall_average != null ? `${data.overall_average}%` : "Not enough data"],
          ["Completed", data.subjects_completed], ["Absent", data.subjects_absent], ["Upcoming", data.subjects_upcoming],
        ]}
      />
      <RowsTable
        rows={data.subjects}
        emptyText="No subjects found for this candidate."
        columns={[
          { key: "subject", label: "Subject", strong: true },
          { key: "score", label: "Score", fmt: (v, r) => (v != null ? `${v}/${r.total_marks ?? "—"}` : "—") },
          { key: "percentage", label: "Percentage", fmt: (v) => (v != null ? `${v}%` : "—") },
          { key: "status", label: "Status" },
        ]}
      />
    </div>
  );
}

function CandidateScheduleReportView({ data }) {
  return (
    <div>
      <ReportHeadline items={[["Candidate", data.student?.name], ["Admission No.", data.student?.admission_no ?? "—"], ["Examination", data.examination?.name]]} />
      <RowsTable
        rows={data.rows}
        emptyText="No subjects scheduled for this candidate yet."
        columns={[
          { key: "subject", label: "Subject", strong: true },
          { key: "exam_date", label: "Date", fmt: (v) => fmtDate(v) },
          { key: "start_time", label: "Start (EAT)", fmt: (v) => fmtTime(v) },
          { key: "end_time", label: "End (EAT)", fmt: (v) => fmtTime(v) },
          { key: "venue", label: "Venue" },
          { key: "status", label: "Status" },
        ]}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYTICS TAB — real numbers only, honest about what's missing (§50)
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   ANALYTICS TAB (Phase 9-10, §15-§26, §49 hierarchical drill-down)
   Main Examination ──▶ Subject ──▶ Question   (via /analytics + /subjects/:id/analytics)
                    └──▶ Student               (via /analytics/students + /analytics/students/:id)
   Every number comes straight from the Phase 9 backend endpoints — this
   component never computes an average/rank/difficulty itself (§51).
   Anything the backend reports as null renders as an honest "Not enough
   data" / "Unavailable" state (§50), never a blank or a guess.
═══════════════════════════════════════════════════════════ */
function AnalyticsTab({ id, subjects, classes, showToast }) {
  const C = useC();
  const [mainData, setMainData] = useState(null);
  const [mainLoading, setMainLoading] = useState(true);
  const [subView, setSubView] = useState("overview"); // "overview" | "students" | "classes"
  const [students, setStudents] = useState(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [drill, setDrill] = useState(null); // { type: 'subject'|'student'|'class', key, label }
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const loadMain = useCallback(async () => {
    try {
      setMainLoading(true);
      const res = await API.get(`/main-exams/${id}/analytics`);
      setMainData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load analytics", "error");
    } finally {
      setMainLoading(false);
    }
  }, [id, showToast]);

  const loadStudents = useCallback(async (search) => {
    try {
      setStudentsLoading(true);
      const res = await API.get(`/main-exams/${id}/analytics/students`, { params: search ? { search } : {} });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load student analytics", "error");
    } finally {
      setStudentsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { loadMain(); }, [loadMain]);
  useEffect(() => { if (subView === "students" && students === null) loadStudents(""); }, [subView, students, loadStudents]);

  const openSubject = async (sessionId, label) => {
    setDrill({ type: "subject", key: sessionId, label });
    setDrillData(null);
    setDrillLoading(true);
    try {
      const res = await API.get(`/main-exams/${id}/subjects/${sessionId}/analytics`);
      setDrillData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load subject analytics", "error");
    } finally {
      setDrillLoading(false);
    }
  };

  const openStudent = async (studentId, label) => {
    setDrill({ type: "student", key: studentId, label });
    setDrillData(null);
    setDrillLoading(true);
    try {
      const res = await API.get(`/main-exams/${id}/analytics/students/${studentId}`);
      setDrillData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load student profile", "error");
    } finally {
      setDrillLoading(false);
    }
  };

  const openClass = async (classId, label) => {
    setDrill({ type: "class", key: classId, label });
    setDrillData(null);
    setDrillLoading(true);
    try {
      const res = await API.get(`/main-exams/${id}/reports/classes/${classId}/results`);
      setDrillData(res.data);
    } catch (err) {
      console.error(err);
      showToast?.(err?.response?.data?.message || "Failed to load class analytics", "error");
    } finally {
      setDrillLoading(false);
    }
  };

  const closeDrill = () => { setDrill(null); setDrillData(null); };

  if (mainLoading && !mainData) {
    return (
      <div>
        <div className="dash-skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 14 }} />
        <div className="dash-skeleton" style={{ height: 240, borderRadius: 12 }} />
      </div>
    );
  }
  if (!mainData) return null;

  // ── Drill-down: Subject ──
  if (drill?.type === "subject") {
    return (
      <SubjectAnalyticsView
        label={drill.label}
        loading={drillLoading}
        data={drillData}
        onBack={closeDrill}
      />
    );
  }

  // ── Drill-down: Student ──
  if (drill?.type === "student") {
    return (
      <StudentProfileView
        loading={drillLoading}
        data={drillData}
        onBack={() => { setDrill(null); setDrillData(null); }}
      />
    );
  }

  // ── Drill-down: Class (§49 — Main Examination → Class → Student) ──
  if (drill?.type === "class") {
    return (
      <ClassAnalyticsView
        label={drill.label}
        loading={drillLoading}
        data={drillData}
        onBack={closeDrill}
        onSelectStudent={openStudent}
      />
    );
  }

  const { candidate_stats, performance, subjects: subjectRows } = mainData;

  return (
    <div>
      {/* ── Analytics sub-nav: Overview vs Students (§18/§49) ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <MiniBtn icon={<BarChart3 size={13} />} onClick={() => setSubView("overview")} tone={subView === "overview" ? undefined : undefined}>
          Overview
        </MiniBtn>
        <MiniBtn icon={<UserCircle2 size={13} />} onClick={() => setSubView("students")}>
          Students
        </MiniBtn>
        <MiniBtn icon={<Building2 size={13} />} onClick={() => setSubView("classes")}>
          Classes
        </MiniBtn>
      </div>

      {subView === "overview" && (
        <>
          {/* ── Candidate statistics (§16) ── */}
          <SectionHeader title="Candidate Statistics" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 8 }}>
            <SmallStat label="Registered" value={candidate_stats.registered} icon={<Users size={16} />} />
            <SmallStat label="Attempted" value={candidate_stats.attempted} icon={<PlayCircle size={16} />} tone="info" />
            <SmallStat label="Completed" value={candidate_stats.completed} icon={<CheckCircle2 size={16} />} tone="success" />
            <SmallStat label="Incomplete" value={candidate_stats.incomplete} icon={<Clock size={16} />} tone="warning" />
            <SmallStat label="Absent" value={candidate_stats.absent} icon={<AlertCircle size={16} />} tone="danger" />
          </div>

          {/* ── Overall performance (§16) ── */}
          <SectionHeader title="Overall Performance" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 8 }}>
            <SmallStat label="Mean" value={performance.mean != null ? `${performance.mean}%` : "Not enough data"} icon={<Gauge size={16} />} />
            <SmallStat label="Median" value={performance.median != null ? `${performance.median}%` : "Not enough data"} icon={<Gauge size={16} />} />
            <SmallStat label="Highest" value={performance.highest != null ? `${performance.highest}%` : "—"} icon={<TrendingUp size={16} />} tone="success" />
            <SmallStat label="Lowest" value={performance.lowest != null ? `${performance.lowest}%` : "—"} icon={<TrendingUp size={16} />} tone="danger" />
            <SmallStat label="Std. Deviation" value={performance.std_dev != null ? performance.std_dev : "Not enough data"} icon={<BarChart3 size={16} />} />
            <SmallStat label="Pass Rate" value={performance.pass_rate != null ? `${performance.pass_rate}%` : "Unavailable"} icon={<Target size={16} />} subtext={performance.pass_rate_note} />
          </div>

          {/* ── Grade distribution (§16) ── */}
          <SectionHeader title="Grade Distribution" />
          <EmptyState icon={<BarChart3 size={22} />} text={mainData.grade_distribution_note} />

          {/* ── Performance by subject (§17) ── */}
          <SectionHeader title="Performance by Subject" />
          {subjectRows.length === 0 ? (
            <EmptyState icon={<BookOpenCheck size={22} />} text="No subjects with an attached assessment yet." />
          ) : (
            <>
              <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 18px 6px", marginBottom: 20, height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectRows.map((s) => ({ name: s.subject, mean: s.mean ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: C.textMuted }} domain={[0, 100]} />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="mean" name="Mean %" fill={C.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <Th>Subject</Th><Th>Registered</Th><Th>Attempted</Th><Th>Completed</Th>
                    <Th>Mean</Th><Th>Highest</Th><Th>Lowest</Th><Th>Pass Rate</Th><Th></Th>
                  </tr></thead>
                  <tbody>
                    {subjectRows.map((s) => (
                      <tr key={s.session_id} style={{ cursor: "pointer" }} onClick={() => openSubject(s.session_id, s.subject)}>
                        <Td style={{ fontWeight: 700, color: C.textPri }}>{s.subject}</Td>
                        <Td>{s.registered}</Td>
                        <Td>{s.attempted}</Td>
                        <Td>{s.completed}</Td>
                        <Td>{s.mean != null ? `${s.mean}%` : "—"}</Td>
                        <Td>{s.highest != null ? `${s.highest}%` : "—"}</Td>
                        <Td>{s.lowest != null ? `${s.lowest}%` : "—"}</Td>
                        <Td>Unavailable</Td>
                        <Td><MiniBtn icon={<ChevronRight size={13} />} onClick={() => openSubject(s.session_id, s.subject)} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "10px 2px 0" }}>Click a subject to drill into question-level analytics (§19-§25).</p>
            </>
          )}
        </>
      )}

      {subView === "students" && (
        <StudentsAnalyticsList
          students={students}
          loading={studentsLoading}
          search={studentSearch}
          setSearch={setStudentSearch}
          onSearch={() => loadStudents(studentSearch)}
          onSelect={openStudent}
        />
      )}

      {subView === "classes" && (
        <ClassesAnalyticsList classes={classes} onSelect={openClass} />
      )}
    </div>
  );
}

/* ── Classes list (§49 — Main Examination → Class) ──
   Every class in the system is listed; opening one runs the same
   class-results report the Results tab and Reports tab use (§51), so
   the numbers here can never disagree with either. */
function ClassesAnalyticsList({ classes, onSelect }) {
  const C = useC();
  return (
    <div>
      <SectionHeader title="Class Analytics" />
      {!classes || classes.length === 0 ? (
        <EmptyState icon={<Building2 size={22} />} text="No classes found." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {classes.map((c) => (
            <div
              key={c.id}
              className="dash-card"
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onClick={() => onSelect(c.id, c.name)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={16} color={C.accent} />
                <span style={{ fontWeight: 700, color: C.textPri, fontSize: 14 }}>{c.name}</span>
              </div>
              <ChevronRight size={15} color={C.textMuted} />
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: C.textMuted, margin: "14px 2px 0" }}>Click a class to see every candidate's marks across the subjects this examination scheduled for them.</p>
    </div>
  );
}

/* ── Class-level drill-down (§49) — per-student, per-subject marks for
   one class, with a further drill into any student's own profile. ── */
function ClassAnalyticsView({ label, loading, data, onBack, onSelectStudent }) {
  const C = useC();
  if (loading || !data) {
    return (
      <div>
        <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
        <div className="dash-skeleton" style={{ height: 260, borderRadius: 12, marginTop: 14 }} />
      </div>
    );
  }
  const rows = data.rows || [];
  const withScores = rows.filter((r) => r.average_percentage != null);
  const classMean = withScores.length ? round1(withScores.reduce((a, r) => a + r.average_percentage, 0) / withScores.length) : null;

  return (
    <div>
      <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: C.textPri, margin: "14px 0 16px" }}>{label}</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 18 }}>
        <SmallStat label="Candidates" value={rows.length} icon={<Users size={16} />} />
        <SmallStat label="Subjects" value={data.subjects?.length || 0} icon={<BookOpenCheck size={16} />} />
        <SmallStat label="Class Mean" value={classMean != null ? `${classMean}%` : "Not enough data"} icon={<Gauge size={16} />} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users size={22} />} text="No students found in this class." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Student</Th><Th>Admission No.</Th>
              {(data.subjects || []).map((s) => <Th key={s.session_id}>{s.subject}</Th>)}
              <Th>Average</Th><Th></Th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id} style={{ cursor: "pointer" }} onClick={() => onSelectStudent?.(r.student_id, r.name)}>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{r.name}</Td>
                  <Td>{r.admission_no || "—"}</Td>
                  {r.subjects.map((sm, i) => <Td key={i}>{sm.score != null ? `${sm.score}/${sm.total_marks}` : "—"}</Td>)}
                  <Td>{r.average_percentage != null ? `${r.average_percentage}%` : "Not enough data"}</Td>
                  <Td><MiniBtn icon={<ChevronRight size={13} />} onClick={() => onSelectStudent?.(r.student_id, r.name)} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentsAnalyticsList({ students, loading, search, setSearch, onSearch, onSelect }) {
  const C = useC();
  return (
    <div>
      <SectionHeader title="Student Analytics" />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search by name or admission number…"
          style={{ flex: 1, maxWidth: 340, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 13.5, outline: "none" }}
        />
        <ActionButton icon={<Search size={14} />} onClick={onSearch}>Search</ActionButton>
      </div>

      {loading && !students ? (
        <div className="dash-skeleton" style={{ height: 200, borderRadius: 12 }} />
      ) : !students || students.length === 0 ? (
        <EmptyState icon={<UserCircle2 size={22} />} text="No registered candidates found for this examination yet." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Student</Th><Th>Admission No.</Th><Th>Subjects Registered</Th>
              <Th>Completed</Th><Th>Incomplete</Th><Th>Overall Average</Th><Th></Th>
            </tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.student_id} style={{ cursor: "pointer" }} onClick={() => onSelect(s.student_id, s.name)}>
                  <Td style={{ fontWeight: 700, color: C.textPri }}>{s.name}</Td>
                  <Td>{s.admission_no || "—"}</Td>
                  <Td>{s.subjects_registered}</Td>
                  <Td>{s.subjects_completed}</Td>
                  <Td>{s.subjects_incomplete}</Td>
                  <Td>{s.overall_average != null ? `${s.overall_average}%` : "Not enough data"}</Td>
                  <Td><MiniBtn icon={<ChevronRight size={13} />} onClick={() => onSelect(s.student_id, s.name)} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Subject-level drill-down (§19-§25) ── */
function SubjectAnalyticsView({ label, loading, data, onBack }) {
  const C = useC();
  if (loading || !data) {
    return (
      <div>
        <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
        <div className="dash-skeleton" style={{ height: 260, borderRadius: 12 }} />
      </div>
    );
  }

  if (!data.candidate_stats) {
    return (
      <div>
        <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
        <EmptyState icon={<BookOpenCheck size={22} />} text={data.note} />
      </div>
    );
  }

  const { candidate_stats: cs, performance: perf, questions, mcq_distractors, discrimination, discrimination_note, time_analytics, time_analytics_note, marking, topic_analytics_note } = data;

  return (
    <div>
      <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
      <h3 style={{ margin: "6px 0 20px", fontSize: 18, fontWeight: 800, color: C.textPri }}>{label}</h3>

      <SectionHeader title="Candidates" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 8 }}>
        <SmallStat label="Registered" value={cs.registered} icon={<Users size={16} />} />
        <SmallStat label="Attempted" value={cs.attempted} icon={<PlayCircle size={16} />} tone="info" />
        <SmallStat label="Completed" value={cs.completed} icon={<CheckCircle2 size={16} />} tone="success" />
        <SmallStat label="Absent" value={cs.absent} icon={<AlertCircle size={16} />} tone="danger" />
      </div>

      <SectionHeader title="Performance" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 8 }}>
        <SmallStat label="Mean" value={perf.mean != null ? `${perf.mean}%` : "Not enough data"} icon={<Gauge size={16} />} />
        <SmallStat label="Median" value={perf.median != null ? `${perf.median}%` : "Not enough data"} icon={<Gauge size={16} />} />
        <SmallStat label="Highest" value={perf.highest != null ? `${perf.highest}%` : "—"} icon={<TrendingUp size={16} />} tone="success" />
        <SmallStat label="Lowest" value={perf.lowest != null ? `${perf.lowest}%` : "—"} icon={<TrendingUp size={16} />} tone="danger" />
        <SmallStat label="Pass Rate" value={perf.pass_rate != null ? `${perf.pass_rate}%` : "Unavailable"} icon={<Target size={16} />} subtext={perf.pass_rate_note} />
      </div>

      <SectionHeader title="Topic / Competency Analytics" />
      <EmptyState icon={<ClipboardList size={22} />} text={topic_analytics_note} />

      <SectionHeader title="Time Analytics" />
      {time_analytics ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 8 }}>
          <SmallStat label="Average" value={`${time_analytics.average_minutes} min`} icon={<Timer size={16} />} />
          <SmallStat label="Median" value={`${time_analytics.median_minutes} min`} icon={<Timer size={16} />} />
          <SmallStat label="Fastest" value={`${time_analytics.fastest_minutes} min`} icon={<Timer size={16} />} tone="success" />
          <SmallStat label="Longest" value={`${time_analytics.longest_minutes} min`} icon={<Timer size={16} />} tone="warning" />
        </div>
      ) : (
        <EmptyState icon={<Timer size={22} />} text={time_analytics_note} />
      )}

      <SectionHeader title="Marking Analytics" />
      {marking && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 12 }}>
            <SmallStat label="Total Submissions" value={marking.total_submissions} icon={<ClipboardCheck size={16} />} />
            <SmallStat label="MCQ Auto-Marked" value={marking.mcq_auto_marked} icon={<CheckCircle2 size={16} />} tone="success" />
            <SmallStat label="Essays Awaiting" value={marking.essays_awaiting} icon={<Clock size={16} />} tone="warning" />
            <SmallStat label="Essays Marked" value={marking.essays_marked} icon={<CheckCircle2 size={16} />} tone="success" />
            <SmallStat label="Marking Completion" value={`${marking.marking_completion_pct}%`} icon={<Gauge size={16} />} />
          </div>
          {marking.markers.length > 0 && (
            <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><Th>Marker</Th><Th>Assigned</Th><Th>Marked</Th><Th>Remaining</Th><Th>Avg. Marking Time</Th></tr></thead>
                <tbody>
                  {marking.markers.map((m) => (
                    <tr key={m.teacher_id ?? m.teacher_name}>
                      <Td style={{ fontWeight: 600, color: C.textPri }}>{m.teacher_name}</Td>
                      <Td>{m.assigned}</Td><Td>{m.marked}</Td><Td>{m.remaining}</Td>
                      <Td>{m.average_marking_time ?? "Unavailable"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <SectionHeader title="Question Analytics" />
      {questions.length === 0 ? (
        <EmptyState icon={<HelpCircle size={22} />} text="No questions found for this assessment." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Question</Th><Th>Type</Th><Th>Attempts</Th><Th>Correct %</Th><Th>Incorrect %</Th>
              <Th>Unanswered %</Th><Th>Avg. Marks</Th><Th>Difficulty</Th>
            </tr></thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.question_id}>
                  <Td style={{ maxWidth: 320 }}>{q.question_text}</Td>
                  <Td><Chip text={q.question_type} tone="neutral" /></Td>
                  <Td>{q.attempts}</Td>
                  <Td>{q.correct_pct != null ? `${q.correct_pct}%` : "—"}</Td>
                  <Td>{q.incorrect_pct != null ? `${q.incorrect_pct}%` : "—"}</Td>
                  <Td>{q.unanswered_pct != null ? `${q.unanswered_pct}%` : "—"}</Td>
                  <Td>{q.avg_marks_awarded ?? "—"}</Td>
                  <Td><Chip text={q.difficulty} tone={{ Easy: "success", Medium: "warning", Hard: "danger" }[q.difficulty] || "neutral"} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionHeader title="MCQ Distractor Analysis" />
      {mcq_distractors.length === 0 ? (
        <EmptyState icon={<HelpCircle size={22} />} text="No MCQ questions on this paper." />
      ) : (
        mcq_distractors.map((d) => (
          <div key={d.question_id} className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 700, color: C.textPri }}>{d.question_text}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {d.options.map((o) => (
                <span key={o.option_label} style={{
                  padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                  border: `1px solid ${o.is_correct ? C.success : C.border}`,
                  background: o.is_correct ? C.success + "22" : C.bgAlt,
                  color: o.is_correct ? C.success : C.textSec,
                }}>
                  {o.option_label} — {o.pct_selected != null ? `${o.pct_selected}%` : "—"} {o.is_correct ? "✓" : ""}
                </span>
              ))}
            </div>
          </div>
        ))
      )}

      <SectionHeader title="Question Discrimination" />
      {discrimination_note ? (
        <EmptyState icon={<HelpCircle size={22} />} text={discrimination_note} />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Question</Th><Th>Discrimination Index</Th><Th>Rating</Th></tr></thead>
            <tbody>
              {discrimination.map((d) => (
                <tr key={d.question_id}>
                  <Td>Q{d.question_id}</Td>
                  <Td>{d.discrimination_index}</Td>
                  <Td><Chip text={d.label} tone={{ Good: "success", Fair: "warning", Poor: "danger" }[d.label] || "neutral"} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Student profile drill-down (§18) ── */
function StudentProfileView({ loading, data, onBack }) {
  const C = useC();
  if (loading || !data) {
    return (
      <div>
        <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
        <div className="dash-skeleton" style={{ height: 240, borderRadius: 12 }} />
      </div>
    );
  }
  const { student, overall_average, subjects_completed, subjects_absent, subjects_upcoming, subjects } = data;
  return (
    <div>
      <button style={pageSx.backBtn} className="dash-icon-btn" onClick={onBack}><ArrowLeft size={14} /> Back to Analytics</button>
      <h3 style={{ margin: "6px 0 2px", fontSize: 18, fontWeight: 800, color: C.textPri }}>{student.name}</h3>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textSec }}>
        {student.admission_no || "—"} {student.class ? `· ${student.class}` : ""}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        <SmallStat label="Overall Average" value={overall_average != null ? `${overall_average}%` : "Not enough data"} icon={<Gauge size={16} />} tone="success" />
        <SmallStat label="Subjects Completed" value={subjects_completed} icon={<CheckCircle2 size={16} />} />
        <SmallStat label="Subjects Absent" value={subjects_absent} icon={<AlertCircle size={16} />} tone="danger" />
        <SmallStat label="Subjects Upcoming" value={subjects_upcoming} icon={<Clock size={16} />} tone="info" />
      </div>

      <SectionHeader title="Performance by Subject" />
      {subjects.filter((s) => s.percentage != null).length > 1 && (
        <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 18px 6px", marginBottom: 20, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjects.filter((s) => s.percentage != null).map((s) => ({ name: s.subject, pct: s.percentage }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="pct" name="Score %" fill={C.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Subject</Th><Th>Status</Th><Th>Score</Th><Th>Total Marks</Th><Th>Percentage</Th></tr></thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.session_id}>
                <Td style={{ fontWeight: 600, color: C.textPri }}>{s.subject}</Td>
                <Td><Chip text={s.status} tone={{ completed: "success", absent: "danger", upcoming: "info" }[s.status] || "neutral"} uppercase /></Td>
                <Td>{s.score ?? "—"}</Td>
                <Td>{s.total_marks ?? "—"}</Td>
                <Td>{s.percentage != null ? `${s.percentage}%` : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS TAB (§41)
═══════════════════════════════════════════════════════════ */
function SettingsTab({ id, examination, onChanged, showToast, navigate }) {
  const C = useC();
  const [form, setForm] = useState({
    name: examination.name || "",
    academic_year: examination.academic_year || "",
    cohort_year: examination.cohort_year || "",
    programme: examination.programme || "",
    department: examination.department || "",
    term: examination.term || "",
    description: examination.description || "",
    start_date: examination.start_date ? String(examination.start_date).slice(0, 10) : "",
    end_date: examination.end_date ? String(examination.end_date).slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return showToast("Examination name cannot be empty", "error");
    try {
      setSaving(true);
      await API.put(`/main-exams/${id}`, form);
      showToast("Examination updated");
      onChanged();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update examination", "error");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!window.confirm("Archive this Main Examination? It will be hidden from active lists but kept for records.")) return;
    try {
      await API.put(`/main-exams/${id}/archive`);
      showToast("Examination archived");
      onChanged();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to archive examination", "error");
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this Main Examination? This only works if it has no scheduled subjects.")) return;
    try {
      await API.delete(`/main-exams/${id}`);
      showToast("Examination deleted");
      navigate("/main-exams");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete examination", "error");
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <FieldLabel>Examination Name</FieldLabel>
      <ModalInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FieldLabel>Academic Year</FieldLabel><ModalInput value={form.academic_year} onChange={(v) => setForm((f) => ({ ...f, academic_year: v }))} /></div>
        <div><FieldLabel>Cohort / Year</FieldLabel><ModalInput type="number" value={form.cohort_year} onChange={(v) => setForm((f) => ({ ...f, cohort_year: v }))} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FieldLabel>Programme</FieldLabel><ModalInput value={form.programme} onChange={(v) => setForm((f) => ({ ...f, programme: v }))} /></div>
        <div><FieldLabel>Department</FieldLabel><ModalInput value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} /></div>
      </div>
      <FieldLabel>Term / Semester</FieldLabel>
      <ModalInput value={form.term} onChange={(v) => setForm((f) => ({ ...f, term: v }))} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FieldLabel>Start Date</FieldLabel><ModalInput type="date" value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} /></div>
        <div><FieldLabel>End Date</FieldLabel><ModalInput type="date" value={form.end_date} onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} /></div>
      </div>

      <FieldLabel>Description</FieldLabel>
      <ModalTextarea value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />

      <SaveButton onClick={save} loading={saving} label="Save Changes" icon={<CheckCircle2 size={14} style={{ marginRight: 4 }} />} />

      <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <FieldLabel>Danger Zone</FieldLabel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton onClick={archive}>Archive Examination</ActionButton>
          <ActionButton onClick={remove}>Delete Examination</ActionButton>
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
          Delete only works while no subjects are scheduled yet — archive is the safe option once subjects/candidates exist (§41).
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUDIT LOG TAB (§53)
═══════════════════════════════════════════════════════════ */
function AuditLogTab({ events, loaded }) {
  const C = useC();
  if (!loaded) return <div className="dash-skeleton" style={{ height: 200, borderRadius: 12 }} />;
  if (events.length === 0) return <EmptyState icon={<History size={24} />} text="No audit events recorded yet." />;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {events.map((e) => {
        let details = null;
        try { details = e.details ? JSON.parse(e.details) : null; } catch { details = null; }
        return (
          <div key={e.id} className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: C.textPri }}>{formatAction(e.action)}</span>
                {e.subject_name && <span style={{ fontSize: 12.5, color: C.textSec }}> — {e.subject_name}</span>}
              </div>
              <span style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{fmtDateTime(e.createdAt)}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
              {e.actor_name ? `By ${e.actor_name}${e.actor_role ? ` (${e.actor_role})` : ""}` : "System / scheduler"}
              {details && Object.keys(details).length > 0 && (
                <span> · {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatAction(action) {
  return String(action || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════
   HONEST PLACEHOLDER — used for tabs that are a later phase (§50)
═══════════════════════════════════════════════════════════ */
function NotYetTab({ icon, text }) {
  return <EmptyState icon={icon} text={text} />;
}
