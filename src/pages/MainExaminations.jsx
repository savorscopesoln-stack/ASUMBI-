import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowLeft, Plus, RefreshCw, CalendarRange, Users, BookOpenCheck,
  CheckCircle2, Archive, ClipboardList, ClipboardCheck, Download, GraduationCap,
  Wallet, AlertTriangle,
} from "lucide-react";
import {
  injectStyles, useC, extract, ThemeToggle, EmptyState, ActionButton,
  Modal, ModalInput, ModalSelect, ModalTextarea, SaveButton, FieldLabel,
  Chip, MiniBtn, pageSx, fmtDate, globalStyles,
} from "../components/mainExams/shared";

/* ═══════════════════════════════════════════════════════════
   MAIN EXAMINATIONS — LIST + CREATE (§3, §47)
   Reached from Dashboard → E-Assessments → Main Examinations
   (an "Main Examinations" button on the E-Assessment Administration
   page routes here). Lists every Main Examination as a card and lets
   an admin create a new one; clicking a card opens its dashboard at
   /main-exams/:id (MainExaminationDashboard.jsx).
═══════════════════════════════════════════════════════════ */
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

export default function MainExaminations() {
  injectStyles();
  const C = useC();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ================= WALLET AWARENESS (Phase 5) =================
     "The React interface must reflect backend permissions rather
     than being the security boundary" (spec) — this is the reflect
     half; fundNewExamination on the backend remains the actual gate
     either way. `walletState` stays null (not 0) until a successful
     read, and everything below only disables the button when it has
     a CONFIRMED zero — an admin who simply lacks the separate
     "Wallet" page permission, or a transient network hiccup, must
     never silently lose the ability to create an exam merely because
     this read failed; the backend re-checks regardless. */
  const [walletState, setWalletState] = useState(null); // { availableCredits, registeredEligibleStudents } | null
  const loadWalletState = useCallback(async () => {
    try {
      const res = await API.get("/wallet");
      const data = res?.data;
      setWalletState({
        availableCredits: data?.wallet?.available_credits ?? null,
        registeredEligibleStudents: data?.registeredEligibleStudents ?? null,
      });
    } catch (err) {
      // Not fatal — see comment above. Most commonly a 403 because
      // this admin role wasn't granted the "Wallet" page, which says
      // nothing about whether exam creation itself will succeed.
      setWalletState(null);
    }
  }, []);
  useEffect(() => { loadWalletState(); }, [loadWalletState]);

  const noEligibleStudents = walletState?.registeredEligibleStudents === 0;
  const noAvailableCredits = walletState?.availableCredits === 0;
  const createBlockedReason = noEligibleStudents
    ? "No registered eligible students yet — add active students before creating an examination."
    : noAvailableCredits
      ? "No available wallet credits — request credits from Doravo Finance, or ask an admin with Wallet access to."
      : null;

  // Structured funding failure from POST /main-exams (code + message —
  // see examFunding.service.js's WalletError), shown as a dedicated
  // banner inside the create modal rather than only a toast, since a
  // toast auto-dismisses and this is information the admin needs to
  // act on (request credits / adjust the cohort / free up students).
  const [fundingError, setFundingError] = useState(null);

  const blank = {
    name: "", academic_year: "", cohort_year: "", programme: "", department: "",
    term: "", description: "", start_date: "", end_date: "",
  };
  const [form, setForm] = useState(blank);

  // Gap fix: previously the create form always funded the whole
  // eligible cohort the backend resolves — POST /main-exams already
  // accepted an optional studentIds override (see
  // mainExam.controller.js's createMainExamination), there was just no
  // UI for picking a subset. "whole" is the previous, still-default
  // behavior; "picked" lets the admin hand-select who gets funded now
  // (e.g. only students who've paid the institution's own exam fee).
  const [fundMode, setFundMode] = useState("whole"); // "whole" | "picked"
  const [pickerStudents, setPickerStudents] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickedIds, setPickedIds] = useState(new Set());

  const loadPickerStudents = useCallback(async (cohortYear, search) => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams();
      if (cohortYear) params.set("cohortYear", cohortYear);
      if (search) params.set("search", search);
      const res = await API.get(`/wallet/eligible-students-preview?${params.toString()}`);
      setPickerStudents(res?.data?.students || []);
    } catch {
      setPickerStudents([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  // Re-load the candidate list whenever the picker is switched on or
  // the cohort year changes — a picked student outside the new cohort
  // filter wouldn't be fundable anyway (createMainExamination
  // re-validates cohort membership server-side regardless).
  useEffect(() => {
    if (createOpen && fundMode === "picked") loadPickerStudents(form.cohort_year, pickerSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, fundMode, form.cohort_year]);

  const togglePicked = (id) => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const pickAllVisible = () => setPickedIds(new Set(pickerStudents.map((s) => s.id)));
  const clearPicked = () => setPickedIds(new Set());

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/main-exams");
      setList(extract(res).examinations || extract(res) || res?.data?.examinations || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load Main Examinations", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  /* ---------------- Transcripts (per class or all students; all exams
     or one selected) ----------------
     "Download Transcripts" opens a small picker, then GETs the PDF as
     a blob and triggers a browser download — same pattern as the
     Excel/PDF report downloads on the Main Examination dashboard
     (MainExaminationDashboard.jsx's ReportsTab.download()). */
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [tScope, setTScope] = useState("class"); // "class" | "all"
  const [tClassName, setTClassName] = useState("");
  const [tExamId, setTExamId] = useState("all"); // "all" | examination id
  const [downloadingTranscripts, setDownloadingTranscripts] = useState(false);

  const openTranscriptModal = async () => {
    setTranscriptOpen(true);
    if (classOptions.length) return;
    try {
      setClassesLoading(true);
      const res = await API.get("/meta/classes");
      const rows = extract(res);
      setClassOptions(rows.map((r) => r.class_name || r).filter(Boolean));
    } catch (err) {
      console.error(err);
      showToast("Failed to load classes", "error");
    } finally {
      setClassesLoading(false);
    }
  };

  const downloadTranscripts = async () => {
    if (tScope === "class" && !tClassName) return showToast("Choose a class first", "error");
    try {
      setDownloadingTranscripts(true);
      const res = await API.get("/main-exams/transcripts/download", {
        params: { scope: tScope, className: tScope === "class" ? tClassName : undefined, examId: tExamId },
        responseType: "blob",
      });
      const disposition = res.headers?.["content-disposition"] || "";
      const match = /filename="?([^"]+)"?/i.exec(disposition);
      const filename = match?.[1] || "transcripts.pdf";
      downloadBlob(new Blob([res.data], { type: "application/pdf" }), filename);
      setTranscriptOpen(false);
    } catch (err) {
      console.error(err);
      showToast("No transcripts found for this selection, or the download failed", "error");
    } finally {
      setDownloadingTranscripts(false);
    }
  };

  // "Show on Report Cards" (§ student report card exam selection) — picks
  // which Main Examination's marks/name students see on their report
  // card (StudentReport.jsx). Only one exam can be active at a time; the
  // backend unflags whatever was previously selected, so this list is
  // just refreshed afterwards rather than patched optimistically for
  // every card.
  const [settingReportExamId, setSettingReportExamId] = useState(null);
  const setReportExam = async (exam) => {
    const makingActive = !exam.is_report_exam;
    try {
      setSettingReportExamId(exam.id);
      await API.put(`/main-exams/${exam.id}/report-exam`, { active: makingActive });
      showToast(
        makingActive
          ? `"${exam.name}" will now show on students' report cards`
          : `"${exam.name}" removed from report cards`
      );
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update report card exam", "error");
    } finally {
      setSettingReportExamId(null);
    }
  };

  const create = async () => {
    if (!form.name.trim()) return showToast("Examination name is required", "error");
    if (fundMode === "picked" && pickedIds.size === 0) {
      return showToast("Pick at least one student, or switch to funding the whole eligible cohort", "error");
    }
    setFundingError(null);
    try {
      setSaving(true);
      const payload = fundMode === "picked"
        ? { ...form, studentIds: Array.from(pickedIds) }
        : form;
      const res = await API.post("/main-exams", payload);
      showToast("Main Examination created");
      setCreateOpen(false);
      setForm(blank);
      setFundMode("whole");
      setPickedIds(new Set());
      setPickerSearch("");
      loadWalletState(); // credits just got reserved — refresh the balance shown on this page
      const newId = res?.data?.id;
      if (newId) navigate(`/main-exams/${newId}`);
      else load();
    } catch (err) {
      const data = err?.response?.data;
      // WalletError codes from examFunding.service.js — NO_ELIGIBLE_STUDENTS,
      // NO_CREDITS, INSUFFICIENT_CREDITS, INVALID_STUDENT_SELECTION —
      // surfaced as a persistent in-modal banner instead of only a
      // toast, per the comment on fundingError's declaration above.
      if (data?.code) {
        setFundingError({ code: data.code, message: data.message });
        loadWalletState(); // the balance may have changed since this page loaded
      } else {
        showToast(data?.message || "Failed to create examination", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const sx = pageSx;

  return (
    <div className="dash-main" style={sx.page} data-theme={theme}>
      <style>{globalStyles}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 60, display: "flex", alignItems: "center", gap: 8,
          padding: "11px 16px", borderRadius: 9, background: C.card, border: `1px solid ${toast.type === "error" ? C.danger : C.success}`, boxShadow: "var(--shadow)",
        }}>
          <span style={{ color: C.textPri, fontSize: 14 }}>{toast.msg}</span>
        </div>
      )}

      <div style={sx.header}>
        <div>
          <button style={sx.backBtn} className="dash-icon-btn" onClick={() => navigate("/e-assessments")}>
            <ArrowLeft size={14} /> Back to E-Assessments
          </button>
          <h1 style={sx.pageTitle}>Main Examinations</h1>
          <p style={sx.pageSub}>Scheduled examination events — each one groups several subjects/learning-area papers with automatic activation.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <ActionButton icon={<GraduationCap size={14} />} onClick={openTranscriptModal}>Download Transcripts</ActionButton>
          <ActionButton
            primary
            icon={<Plus size={14} />}
            disabled={!!createBlockedReason}
            onClick={() => { setFundingError(null); setFundMode("whole"); setPickedIds(new Set()); setPickerSearch(""); setCreateOpen(true); }}
            title={createBlockedReason || undefined}
          >
            Create Main Examination
          </ActionButton>
          <button style={sx.iconBtn} className="dash-icon-btn" onClick={load} title="Refresh"><RefreshCw size={15} /></button>
        </div>
      </div>

      {createBlockedReason && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
          padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: C.warningTint || "rgba(180,83,9,0.08)", border: `1px solid ${C.warning || "#B45309"}`,
          color: C.textPri,
        }}>
          <AlertTriangle size={15} style={{ color: C.warning || "#B45309", flexShrink: 0 }} />
          <span>{createBlockedReason}</span>
          {noAvailableCredits && (
            <Link to="/wallet" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: C.accent, textDecoration: "none", whiteSpace: "nowrap" }}>
              <Wallet size={13} /> Open Wallet
            </Link>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} className="dash-skeleton" style={{ height: 168, borderRadius: 12 }} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<CalendarRange size={26} />}
          text="No Main Examinations yet. Create one to start scheduling subject papers — e.g. '2026 Second Year Final Examination'."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {list.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onClick={() => navigate(`/main-exams/${exam.id}`)}
              onSetReportExam={() => setReportExam(exam)}
              settingReportExam={settingReportExamId === exam.id}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <Modal title="Create Main Examination" onClose={() => setCreateOpen(false)}>
          {walletState?.availableCredits != null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
              padding: "9px 12px", borderRadius: 9, fontSize: 12.5,
              background: C.bgAlt, border: `1px solid ${C.border}`, color: C.textSec,
            }}>
              <Wallet size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
              <span>
                <strong style={{ color: C.textPri }}>{walletState.availableCredits}</strong> wallet credit{walletState.availableCredits === 1 ? "" : "s"} available
                {walletState.registeredEligibleStudents != null && (
                  <> · <strong style={{ color: C.textPri }}>{walletState.registeredEligibleStudents}</strong> eligible student{walletState.registeredEligibleStudents === 1 ? "" : "s"} registered</>
                )}
                . One credit funds one student for this whole examination.
              </span>
            </div>
          )}

          {fundingError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14,
              padding: "10px 12px", borderRadius: 9, fontSize: 13,
              background: "rgba(220,38,38,0.08)", border: `1px solid ${C.danger || "#DC2626"}`, color: C.textPri,
            }}>
              <AlertTriangle size={15} style={{ color: C.danger || "#DC2626", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Couldn't fund this examination</div>
                <div>{fundingError.message}</div>
                {fundingError.code === "NO_CREDITS" && (
                  <Link to="/wallet" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontWeight: 700, color: C.accent, textDecoration: "none" }}>
                    <Wallet size={13} /> Request credits from the Wallet page
                  </Link>
                )}
              </div>
            </div>
          )}

          <FieldLabel>Examination Name</FieldLabel>
          <ModalInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. 2026 Second Year Final Examination" />

          <FieldLabel>Academic Year</FieldLabel>
          <ModalInput value={form.academic_year} onChange={(v) => setForm((f) => ({ ...f, academic_year: v }))} placeholder="e.g. 2026" />

          <FieldLabel>Cohort / Year of Study</FieldLabel>
          <ModalInput type="number" value={form.cohort_year} onChange={(v) => setForm((f) => ({ ...f, cohort_year: v }))} placeholder="e.g. 2" />
          <p style={{ margin: "-6px 0 14px", fontSize: 11.5, color: C.textMuted }}>
            Leave blank to fund every registered active student institution-wide; set a year to fund only that cohort.
          </p>

          {/* ── FUND MODE (gap fix) ──
              "whole" is the original, still-default behavior (every
              eligible student in the cohort above gets funded). "picked"
              lets the admin hand-select a subset — e.g. only students
              who've already paid the institution's own exam fee —
              without touching the backend, which already accepted an
              optional studentIds override. */}
          <FieldLabel>Who gets funded</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <MiniBtn tone={fundMode === "whole" ? "accent" : undefined} onClick={() => setFundMode("whole")}>
              Whole eligible cohort
            </MiniBtn>
            <MiniBtn tone={fundMode === "picked" ? "accent" : undefined} onClick={() => setFundMode("picked")}>
              Pick specific students
            </MiniBtn>
          </div>

          {fundMode === "picked" && (
            <div style={{ marginBottom: 16 }}>
              <ModalInput
                value={pickerSearch}
                onChange={(v) => { setPickerSearch(v); loadPickerStudents(form.cohort_year, v); }}
                placeholder="Search by name or admission number…"
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
                <span style={{ fontSize: 11.5, color: C.textMuted }}>
                  {pickedIds.size} selected{walletState?.availableCredits != null && pickedIds.size > walletState.availableCredits
                    ? ` · short by ${pickedIds.size - walletState.availableCredits}`
                    : ""}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <MiniBtn onClick={pickAllVisible}>Select all shown</MiniBtn>
                  <MiniBtn onClick={clearPicked}>Clear</MiniBtn>
                </div>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                {pickerLoading && <div style={{ padding: 12, fontSize: 12.5, color: C.textMuted }}>Loading eligible students…</div>}
                {!pickerLoading && pickerStudents.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => togglePicked(st.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", cursor: "pointer",
                      borderBottom: `1px solid ${C.border}`, fontSize: 12.5,
                      background: pickedIds.has(st.id) ? C.bgAlt : "transparent",
                    }}
                  >
                    <input type="checkbox" readOnly checked={pickedIds.has(st.id)} />
                    <span style={{ fontWeight: 600 }}>{st.name}</span>
                    <span style={{ color: C.textMuted }}>{st.admissionNo} · {st.studentClass}</span>
                  </div>
                ))}
                {!pickerLoading && !pickerStudents.length && (
                  <div style={{ padding: 12, fontSize: 12.5, color: C.textMuted }}>No eligible students match this cohort/search.</div>
                )}
              </div>
            </div>
          )}

          <FieldLabel>Programme</FieldLabel>
          <ModalInput value={form.programme} onChange={(v) => setForm((f) => ({ ...f, programme: v }))} placeholder="e.g. DTE" />

          <FieldLabel>Department</FieldLabel>
          <ModalInput value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} placeholder="e.g. Engineering" />

          <FieldLabel>Term / Semester</FieldLabel>
          <ModalInput value={form.term} onChange={(v) => setForm((f) => ({ ...f, term: v }))} placeholder="e.g. Term 3" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <ModalInput type="date" value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <ModalInput type="date" value={form.end_date} onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} />
            </div>
          </div>

          <FieldLabel>Description</FieldLabel>
          <ModalTextarea value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Optional notes about this examination event" />

          <SaveButton onClick={create} loading={saving} label="Create Examination" icon={<Plus size={14} style={{ marginRight: 4 }} />} />
        </Modal>
      )}

      {transcriptOpen && (
        <Modal title="Download Transcripts" onClose={() => setTranscriptOpen(false)}>
          <FieldLabel>Students</FieldLabel>
          <ModalSelect
            value={tScope}
            onChange={(v) => setTScope(v)}
            placeholder="Choose students…"
            options={[
              { value: "class", label: "A specific class" },
              { value: "all", label: "All students" },
            ]}
          />

          {tScope === "class" && (
            <>
              <FieldLabel>Class</FieldLabel>
              <ModalSelect
                value={tClassName}
                onChange={(v) => setTClassName(v)}
                placeholder={classesLoading ? "Loading classes…" : "Select a class…"}
                options={classOptions.map((c) => ({ value: c, label: c }))}
              />
            </>
          )}

          <FieldLabel>Exam</FieldLabel>
          <ModalSelect
            value={tExamId}
            onChange={(v) => setTExamId(v)}
            placeholder="Choose an exam…"
            options={[
              { value: "all", label: "All exams the student has done" },
              ...list.map((exam) => ({ value: String(exam.id), label: exam.name })),
            ]}
          />
          <p style={{ margin: "-6px 0 14px", fontSize: 12, color: C.textMuted }}>
            Only exams with released marks show on a transcript — a student with none yet is skipped rather than given a blank page.
          </p>

          <SaveButton
            onClick={downloadTranscripts}
            loading={downloadingTranscripts}
            label="Download PDF"
            icon={<Download size={14} style={{ marginRight: 4 }} />}
          />
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXAM CARD (§47)
═══════════════════════════════════════════════════════════ */
function ExamCard({ exam, onClick, onSetReportExam, settingReportExam }) {
  const C = useC();
  const statusTone = { draft: "neutral", published: "info", ongoing: "success", completed: "neutral", archived: "neutral" }[exam.status] || "neutral";
  return (
    <div className="dash-card" onClick={onClick} style={{
      background: C.card, border: `1px solid ${exam.is_report_exam ? C.success : C.border}`, borderRadius: 12, padding: 20, cursor: "pointer",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, lineHeight: 1.3 }}>{exam.name}</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {exam.is_report_exam && <Chip text="On Report Cards" tone="success" icon={<ClipboardCheck size={12} />} />}
          <Chip text={exam.status || "draft"} tone={statusTone} uppercase />
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <MiniStat icon={<BookOpenCheck size={14} />} label="Subjects" value={exam.subject_count ?? 0} />
        <MiniStat icon={<CheckCircle2 size={14} />} label="Completed" value={exam.completed_subject_count ?? 0} />
        <MiniStat icon={<Users size={14} />} label="Active" value={exam.active_subject_count ?? 0} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
        <CalendarRange size={13} />
        {fmtDate(exam.start_date)} — {fmtDate(exam.end_date)}
      </div>

      {(exam.academic_year || exam.programme) && (
        <div style={{ fontSize: 12, color: C.textSec }}>
          {[exam.academic_year, exam.programme, exam.department].filter(Boolean).join(" · ")}
        </div>
      )}

      {/* Picks which exam students see on their report card — see
          setReportExam() in the parent. stopPropagation so this
          doesn't also trigger the card's onClick navigation. */}
      <MiniBtn
        icon={<ClipboardCheck size={13} />}
        tone={exam.is_report_exam ? "success" : undefined}
        disabled={settingReportExam}
        onClick={(e) => { e.stopPropagation(); onSetReportExam(); }}
      >
        {settingReportExam ? "Updating…" : exam.is_report_exam ? "Showing on Report Cards" : "Show on Report Cards"}
      </MiniBtn>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  const C = useC();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSec }}>
      <span style={{ color: C.textMuted }}>{icon}</span>
      <strong style={{ color: C.textPri, fontSize: 14 }}>{value}</strong> {label}
    </div>
  );
}
