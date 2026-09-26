import React, { useEffect, useMemo, useRef, useState } from "react";
import API, { resolveFileUrl } from "../../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "react-qr-code";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
import useSchoolSettings from "../../hooks/useSchoolSettings";
import useReportTheme from "../../hooks/useReportTheme";
import useGradingSystem from "../../hooks/useGradingSystem";
import { getGradeForScore, getOverallResultForScore, getRemarkForScore } from "../../utils/grading";

/* ================= GRADING =================
   Sourced from Admin → E-Assessments → Grading System (see
   hooks/useGradingSystem.js) instead of this page's own hard-coded
   CBC-style scale — keeps subject/overall grades in sync with
   reports.jsx and TeacherReports.jsx. getOverallResult used to run
   off a raw summed-total scale (out of ~1700) that assumed a fixed
   subject count and didn't match how `total` is actually computed
   below (a sum of percentages, not out-of-1700 marks); it now uses
   the same average-based overall bands as everywhere else. */

/* ================= A4 SIZING CONSTANTS =================
   Fixed 96dpi reference pixels for 210mm × 297mm, used only
   to compute the on-screen display scale. The actual DOM node
   captured for print/PDF always renders at true 210mm/297mm —
   scaling here is a pure visual transform, reset to 1 whenever
   printing or exporting so output stays physically accurate. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/* ================= GLOBAL / PRINT STYLES =================
   Inline style objects can't express @page, @media print, or
   @font-face keyframes — those are injected once here.

   Also injects the app's shared design tokens (--bg, --card,
   --text, --primary, etc. — same values as Dashboard.jsx and
   Login.jsx) so the SCREEN CHROME around the report follows
   the app's light/dark theme.

   The printed A4 sheet itself ("sr-sheet") intentionally does
   NOT use these tokens — it's an official document that gets
   printed and exported to PDF, so its palette follows the
   school's chosen Report Theme (School Settings → Report Theme)
   instead of the viewer's light/dark preference; see
   useReportTheme()/getStyles() below. Nothing in this block
   touches data or computation logic. */
function useReportGlobalStyles() {
  useEffect(() => {
    const linkId = "sr-font-link";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
    const styleId = "sr-style-block";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        :root {
          --bg: #F8FAFC;
          --card: #FFFFFF;
          --border: #E2E5EA;
          --text: #0B0F19;
          --text-secondary: #384152;
          --text-muted: #64748B;
          --primary: #8B1E2D;
          --primary-dark: #6F1725;
          --primary-tint: #FBEAEC;
          --success: #15803D;
          --danger: #B91C1C;
          --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
          --shadow: 0 1px 3px rgba(16,24,40,0.06);
          --radius: 14px;
          --radius-sm: 10px;
        }
        [data-theme='dark'] {
          --bg: #0F1115;
          --card: #171A21;
          --border: #323844;
          --text: #FFFFFF;
          --text-secondary: #C7CCD6;
          --text-muted: #9198A6;
          --primary: #E8A0A8;
          --primary-dark: #F3C0C6;
          --primary-tint: rgba(139,30,45,0.28);
          --success: #4ADE80;
          --danger: #F87171;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
          --shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        @keyframes sr-spin { to { transform: rotate(360deg); } }
        @keyframes sr-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .sr-card { animation: sr-fade-up .35s cubic-bezier(.2,.8,.3,1) both; }
        .sr-btn { transition: transform .15s ease, box-shadow .2s ease, background .2s ease, filter .2s ease, border-color .2s ease; }
        .sr-btn:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .sr-btn:active { transform: translateY(0); }
        .sr-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
        .sr-btn:focus-visible, .theme-toggle-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .sr-btn-outline:hover { background: var(--bg) !important; }
        .sr-btn-primary:hover { background: var(--primary-dark) !important; }

        /* Force background colours to actually print */
        .sr-sheet, .sr-sheet * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media (max-width: 860px) {
          .sr-stage { justify-content: flex-start !important; }
          .sr-scroll-hint { display: block !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sr-card, .sr-btn { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }

        @page { size: A4; margin: 0; }

        @media print {
          html, body { background: #ffffff !important; }
          .sr-page-chrome { background: #ffffff !important; padding: 0 !important; }
          .no-print { display: none !important; }

          /* PDF export (html2canvas) captures live screen DOM, not
             print media, so @media print above doesn't hide
             .no-print elements (e.g. the screen-only chart) on its
             own — this class is toggled on the sheet only while
             exporting to get the same effect for the PDF. */
          .sr-exporting .no-print { display: none !important; }
          .sr-stage { padding: 0 !important; overflow: visible !important; display: block !important; }
          .sr-scale-box { width: 210mm !important; height: 297mm !important; }
          .sr-sheet {
            transform: none !important;
            position: static !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            page-break-after: avoid;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

/* ================= ICONS =================
   Thin single-stroke set, one family. */
const Icon = ({ children, size = 16, style }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);
const IconCap = (p) => (
  <Icon {...p}>
    <path d="M12 3.5l9.5 4.6L12 12.7 2.5 8.1 12 3.5z" />
    <path d="M6.5 10.3v5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-5" />
    <path d="M21.5 8.1v6" />
  </Icon>
);
const IconPrinter = (p) => (
  <Icon {...p}>
    <path d="M7 8.5V4h10v4.5" />
    <rect x="4" y="8.5" width="16" height="7.5" rx="1.3" />
    <rect x="7" y="13.5" width="10" height="6.5" rx="0.8" />
    <path d="M7.5 12h1.2" />
  </Icon>
);
const IconDownload = (p) => (
  <Icon {...p}>
    <path d="M12 4v11.5M8 12l4 4 4-4" />
    <path d="M4.5 17v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </Icon>
);
const IconScan = (p) => (
  <Icon {...p}>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
  </Icon>
);
const IconAlert = (p) => (
  <Icon {...p}>
    <path d="M12 8.5v5" />
    <circle cx="12" cy="16.3" r="0.4" fill="currentColor" stroke="none" />
    <path d="M10.6 3.6 2.9 17.4a1.7 1.7 0 0 0 1.5 2.5h15.2a1.7 1.7 0 0 0 1.5-2.5L13.4 3.6a1.7 1.7 0 0 0-2.8 0Z" />
  </Icon>
);
const IconDocEmpty = (p) => (
  <Icon {...p}>
    <path d="M7 3.5h7L19 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M14 3.5V8h5" />
    <path d="M9 13h6M9 16.5h6" />
  </Icon>
);
const IconRefresh = (p) => (
  <Icon {...p}>
    <path d="M20 11.5A8 8 0 1 0 18.3 16" />
    <path d="M20 5.5v6h-6" />
  </Icon>
);

/* ================= SUB-COMPONENTS =================
   These are defined at module scope (outside StudentReport), so they
   have no access to the component's local `styles` variable — it has
   to be passed in explicitly as a prop from every call site. */
const InfoItem = ({ label, value, styles }) => (
  <div style={styles.plainInfoItem}>
    <span style={styles.plainInfoLabel}>{label}:</span>{" "}
    <span style={styles.plainInfoValue}>{value ?? "—"}</span>
  </div>
);

const BADGE_COLORS = [
  { bg: "#dcfce7", color: "#14532d" }, // top band
  { bg: "#dbeafe", color: "#1e3a8a" },
  { bg: "#fef9c3", color: "#713f12" },
  { bg: "#ffedd5", color: "#7c2d12" },
  { bg: "#fee2e2", color: "#7f1d1d" },
  { bg: "#f1f5f9", color: "#64748b" }, // lowest band
];

// Colors cycle by the band's rank (best → worst) rather than being
// tied to specific score numbers, so this stays sensible no matter
// how an admin configures the bands. Text comes straight from the
// configured band's label.
// Round to 1 decimal place, dropping trailing float noise (e.g. 74.3000001).
const round1 = (n) => Math.round(Number(n) * 10) / 10;

/* ================= ANTI-FORGERY: DETERMINISTIC CHECKSUM =================
   A small FNV-1a style hash used purely to derive a printed, human
   re-typeable verification code (and a stable document ID) from the
   student's own result fields. It is NOT cryptographic security —
   it's a tamper-evidence aid: if any field it's derived from is
   altered on a photocopy/edit, the printed code stops matching a
   re-computation done from the visible fields, which is enough to
   flag a report card for a manual check against the source system. */
function checksumHash(input) {
  let h = 0x811c9dc5;
  const str = String(input);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase();
}
function formatCode(raw, groupSize = 4) {
  const clean = raw.replace(/[^A-Z0-9]/g, "");
  const groups = [];
  for (let i = 0; i < clean.length; i += groupSize) groups.push(clean.slice(i, i + groupSize));
  return groups.join("-");
}

const getScoreBadgeStyle = (score, gradingSystem) => {
  const bands = gradingSystem?.gradeBands?.length ? gradingSystem.gradeBands : [];
  const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
  const n = Number(score) || 0;
  let idx = sorted.findIndex((b) => n >= Number(b.minScore));
  if (idx === -1) idx = sorted.length - 1;
  const colors = BADGE_COLORS[Math.min(idx, BADGE_COLORS.length - 1)] || BADGE_COLORS[BADGE_COLORS.length - 1];
  return { ...colors, text: sorted[idx]?.label || "—" };
};

/* ================= SCREEN-CHROME STATES (loading / error / empty) ================= */
const ScreenState = ({ icon, title, text, action, styles }) => (
  <div style={styles.stateWrap} className="sr-card">
    <div style={styles.stateIconCircle}>{icon}</div>
    <h3 style={styles.stateTitle}>{title}</h3>
    <p style={styles.stateText}>{text}</p>
    {action}
  </div>
);

/* ================= MAIN COMPONENT ================= */
export default function StudentReport() {
  useReportGlobalStyles();
  useTheme();
  const { settings: school, getOfficial, signatory, signatories, getClassTeachers } = useSchoolSettings();
  const { gradingSystem } = useGradingSystem();
  const dean = getOfficial("dean");
  const principal = getOfficial("principal");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admissionNo = user.admissionNo || user.id;

  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reportRef = useRef();

  /* ================= LOAD =================
     Same three existing endpoints as before. The only change is a
     real error state: a failed request used to leave the page stuck
     showing zeroed-out data with no explanation — now it shows a
     dedicated "Unable to load" screen with a retry action instead of
     a raw Axios error or a silently broken report. */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [m, s, st] = await Promise.all([
          API.get("/student/marks", { params: { studentId: admissionNo } }),
          API.get("/subjects"),
          API.get("/students"),
        ]);
        if (cancelled) return;
        setMarks(m.data || []);
        setSubjects(s.data || []);
        setStudents(st.data || []);
      } catch (err) {
        console.error("STUDENT REPORT LOAD ERROR:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [admissionNo, reloadToken]);

  const retry = () => setReloadToken((n) => n + 1);

  /* ================= SCREEN SCALE =================
     Displays the A4 sheet at ~95% of the viewport on screen.
     Purely visual (CSS transform on a wrapper); the captured
     node keeps its true 210mm × 297mm layout box, and is reset
     to scale(1) during export so the PDF is never distorted. */
  const [screenScale, setScreenScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [overflowWarning, setOverflowWarning] = useState(null);

  useEffect(() => {
    const computeScale = () => {
      const chromeAllowance = 130; // top bar + hint + page padding, roughly
      const availW = window.innerWidth * 0.95;
      const availH = (window.innerHeight - chromeAllowance) * 0.95;
      const next = Math.min(availW / A4_WIDTH_PX, availH / A4_HEIGHT_PX, 1.15);
      setScreenScale(Math.max(next, 0.28));
    };
    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, []);

  const effectiveScale = isExporting ? 1 : screenScale;

  /* ================= STUDENT (unchanged lookup) ================= */
  const student = useMemo(() => {
    return students.find((s) => s.id === admissionNo) || {};
  }, [students, admissionNo]);

  const studentClass = student?.class || student?.className || student?.studentClass || "Not assigned";
  const yearOfStudy = Number(student?.yearOfStudy || 0);

  // The Class Teacher / Lecturer assigned to this student's class in
  // School Settings (see useSchoolSettings.getClassTeacher) — printed
  // in the "Class Teacher / Lecturer's Remarks" box below in place of
  // a blank hand-signed line when one has been assigned.
  // Every Class Teacher / Lecturer assigned to this class (main +
  // any assistants), so the report can print one remarks box per
  // teacher instead of only the single top-ranked one.
  const classTeachersForClass = getClassTeachers(studentClass);

  // Report Theme (School Settings → Report Theme) — resolves the full
  // color palette { primary, onPrimary, zebra, rule } for whatever key
  // is saved on SchoolSettings.reportTheme (falls back to the same
  // "slate" default the backend PDF engine uses). This is what makes
  // the report card's header band, section labels, table header and
  // zebra rows follow the school's chosen theme instead of a fixed
  // maroon regardless of what's picked.
  const reportTheme = useReportTheme(school?.reportTheme);
  const styles = useMemo(() => getStyles(reportTheme), [reportTheme.key]);

  /* ================= REPORT SUBJECTS (School Settings → Subjects
     shown on report cards) =================
     An admin can restrict which subjects appear on the report card
     via school.reportSubjects (an array of subject ids). Empty/unset
     means "show everything" — unchanged behaviour for schools that
     never touch the setting. Filtering here (once) keeps the table,
     chart, average, highest/lowest and position calc all consistent
     with what the admin picked, instead of showing a full-subject
     average next to a partial-subject table. */
  const reportSubjectIds = school?.reportSubjects;
  const visibleSubjects = useMemo(() => {
    if (!Array.isArray(reportSubjectIds) || reportSubjectIds.length === 0) return subjects;
    return subjects.filter((s) => reportSubjectIds.includes(s.id));
  }, [subjects, reportSubjectIds]);

  const visibleSubjectNames = useMemo(
    () => new Set(visibleSubjects.map((s) => s.name)),
    [visibleSubjects]
  );

  const visibleMarks = useMemo(() => {
    if (!Array.isArray(reportSubjectIds) || reportSubjectIds.length === 0) return marks;
    return marks.filter((m) => visibleSubjectNames.has(m.subjectName));
  }, [marks, reportSubjectIds, visibleSubjectNames]);

  /* ================= POSITION (unchanged ranking logic) =================
     Two ranks off the same underlying method: `overallPosition` ranks
     the student against every student returned by /students (the
     whole school), and `classPosition` ranks them against just the
     students who share their class/stream. */
  const rankAmong = (pool) => {
    if (!pool.length) return "-";
    const ranked = pool
      .map((s) => {
        const sm = visibleMarks.filter((m) => m.studentId === s.id);
        const scores = sm.map((x) => Number(x.percentage || 0));
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { id: s.id, avg };
      })
      .sort((a, b) => b.avg - a.avg);
    return ranked.findIndex((r) => r.id === admissionNo) + 1;
  };

  const overallPosition = useMemo(() => rankAmong(students), [students, visibleMarks, admissionNo]);

  const classPosition = useMemo(() => {
    const classmates = students.filter(
      (s) => (s?.class || s?.className || s?.studentClass) === studentClass
    );
    return rankAmong(classmates);
  }, [students, visibleMarks, admissionNo, studentClass]);

  /* ================= CRNM PROPAGATION =================
     If any subject the admin has chosen to show is missing a score
     (CRNM — "Cannot Report, No Mark"), the report's final grade and
     overall result are shown as CRNM too, rather than being quietly
     computed from just the subjects that do have marks. One CRNM
     subject among the selected ones is enough to flip this. */
  const visibleMarkedNames = useMemo(
    () => new Set(visibleMarks.map((m) => m.subjectName)),
    [visibleMarks]
  );
  const hasCrnm = useMemo(
    () => visibleSubjects.some((s) => !visibleMarkedNames.has(s.name)),
    [visibleSubjects, visibleMarkedNames]
  );

  /* ================= ANALYTICS =================
     `avg` (and everything derived from it — grade, overall result,
     the AVERAGE row, the summary cards) is a genuine mean of this
     student's subject percentages. The old "Total Marks" card summed
     raw percentages across subjects (e.g. 5 subjects could show
     "350"), which reads as a real total but isn't one on a
     percentage scale — dropped in favour of metrics that are
     actually meaningful on their own: average, highest, lowest, and
     how many learning areas were assessed. */
  const analytics = useMemo(() => {
    const scores = visibleMarks.map((m) => Number(m.percentage)).filter((v) => !isNaN(v));
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      avg: round1(avg),
      highest: scores.length ? round1(Math.max(...scores)) : null,
      lowest: scores.length ? round1(Math.min(...scores)) : null,
      assessedCount: scores.length,
      grade: hasCrnm ? { grade: "", label: "CRNM", remark: "" } : getGradeForScore(avg, gradingSystem),
      result: hasCrnm ? "CRNM" : getOverallResultForScore(avg, gradingSystem),
    };
  }, [visibleMarks, gradingSystem, hasCrnm]);

  /* ================= SUBJECT MAP (unchanged) ================= */
  const subjectMap = useMemo(() => {
    const map = {};
    visibleMarks.forEach((m) => { map[m.subjectName] = round1(Number(m.percentage)); });
    return visibleSubjects.map((s) => ({ subject: s.name, code: s.code, score: map[s.name] ?? null }));
  }, [visibleMarks, visibleSubjects]);


  const chartData = useMemo(
    () => subjectMap.filter((s) => s.score !== null).map((s) => ({ subject: s.subject, score: s.score })),
    [subjectMap]
  );

  const highestSubject = useMemo(() => {
    const valid = subjectMap.filter((s) => s.score !== null);
    return valid.reduce((max, cur) => (max === null || cur.score > max.score ? cur : max), null);
  }, [subjectMap]);

  const lowestSubject = useMemo(() => {
    const valid = subjectMap.filter((s) => s.score !== null);
    return valid.reduce((min, cur) => (min === null || cur.score < min.score ? cur : min), null);
  }, [subjectMap]);

  // A neutral "needs attention" read-out: any subject below the
  // configured pass mark, driven entirely by the admin's own grading
  // configuration — never a hard-coded threshold.
  const passMark = Number(gradingSystem?.passMark ?? 40);
  const attentionSubjects = useMemo(
    () => subjectMap.filter((s) => s.score !== null && s.score < passMark),
    [subjectMap, passMark]
  );

  /* ================= EXAM NAME =================
     Report cards need to say WHICH exam/term this is for. Marks
     records commonly carry this on each row (examName / exam /
     term), so pick it up from there first; school-level settings
     as a second source; and only fall back to a generic label if
     neither is present, rather than showing nothing.

     NOTE: this must run before the early loading/error/empty
     returns below — every hook in this component has to run on
     every render, in the same order, or React throws the "change
     in the order of Hooks" error. */
  const examName = useMemo(() => {
    // Each field is searched for independently (rather than finding
    // one record that has *any* of the three fields and reading
    // .examName off of it) — a record matching the predicate via
    // .term isn't guaranteed to also have .examName, which previously
    // meant a mark row's mere .term could shadow another row's real
    // .examName and get shown instead of it.
    const fromMarks = marks.find((m) => m.examName)?.examName
      || marks.find((m) => m.exam)?.exam
      || marks.find((m) => m.term)?.term
      || marks.find((m) => m.currentExam)?.currentExam
      || marks.find((m) => m.currentTerm)?.currentTerm;
    return fromMarks || school?.examName || school?.currentExam || school?.currentTerm || "Current Exam";
  }, [marks, school]);

  const hasResults = marks.length > 0;

  /* ================= ANTI-FORGERY: VERIFICATION CODE + DOCUMENT ID =================
     Printed on the sheet (header meta + footer security strip) and
     embedded in the QR payload. Anyone checking a physical/PDF copy
     can re-derive this from the visible fields — if the printed code
     doesn't match what the source system computes for that student,
     exam and average, the document has been altered since issue. */
  const verificationCode = useMemo(() => {
    const seed = [admissionNo, examName, analytics.avg, analytics.result, studentClass, classPosition].join("|");
    return formatCode(checksumHash(seed));
  }, [admissionNo, examName, analytics.avg, analytics.result, studentClass, classPosition]);

  const documentId = useMemo(() => {
    const seed = [school?.schoolName, admissionNo, examName].join("|");
    return `DOC-${checksumHash(seed).slice(0, 8)}`;
  }, [school?.schoolName, admissionNo, examName]);

  // Purely visual "security strip" of bars derived from the same
  // checksum — mimics a barcode look next to the QR code so the
  // footer reads like other tamper-evident certificates. It is not a
  // scannable barcode; the QR code remains the actual verification
  // payload.
  const securityBars = useMemo(() => {
    const digits = checksumHash(verificationCode + documentId).split("");
    return digits.map((c) => 2 + (parseInt(c, 36) % 5));
  }, [verificationCode, documentId]);

  /* ================= OVERFLOW DETECTION =================
     After the sheet renders (and whenever the content that drives its
     height changes), measure the actual DOM height against the true
     A4 printable height (297mm, converted to the same CSS px the
     browser is laying the sheet out in via getBoundingClientRect,
     which is resolution-independent). If a tenant's data genuinely
     doesn't fit on one page at this compact layout (e.g. an unusually
     long subject list plus long remarks plus many signatories), this
     surfaces a visible, honest warning instead of silently clipping
     content in print/PDF the way the old fit-to-page image scaling
     did. Purely a screen-only diagnostic — it does not affect layout,
     print, or export. */
  useEffect(() => {
    if (loading || loadError || !hasResults) return;
    const node = reportRef.current;
    if (!node) return;
    const check = () => {
      const rect = node.getBoundingClientRect();
      // rect includes the live CSS transform scale — divide it back
      // out to get the sheet's true, unscaled height in px.
      const trueHeightPx = rect.height / (effectiveScale || 1);
      // 297mm at the browser's 96dpi CSS reference (matches A4_HEIGHT_PX).
      const pageHeightPx = A4_HEIGHT_PX;
      if (trueHeightPx > pageHeightPx + 2) {
        const overBy = Math.round(((trueHeightPx - pageHeightPx) / pageHeightPx) * 100);
        setOverflowWarning(`This report's content is about ${overBy}% taller than one A4 page and will continue onto a second page when printed or downloaded.`);
      } else {
        setOverflowWarning(null);
      }
    };
    // Wait one frame for layout (fonts, images) to settle before measuring.
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [loading, loadError, hasResults, effectiveScale, subjectMap, classTeachersForClass, signatories]);

  /* ================= PDF DOWNLOAD =================
     Full-bleed width, always. The report card is an A4 document, so
     the target render width is a flat 210mm — the captured image is
     never shrunk to force it onto one page, because that shrink is
     exactly what used to leave white margins down both sides of the
     PDF (the image got narrower along with getting shorter, then got
     centered on the page).

     Instead: draw the canvas at full page width. With the compacted
     layout below, the common case (including the supplied 18-subject
     report) now fits one A4 page at full width with no shrink at all.
     If a tenant's content still doesn't fit (see the overflow
     detector above), it's sliced into successive full-width pages
     rather than being squeezed down — a real second page beats a
     shrunk, illegible document.

     The on-screen-only chart is hidden for this capture (see
     ".sr-exporting .no-print" above) so it never eats into page
     budget in the first place.

     Screen display runs at a scaled-down size for readability, so
     export first flips the sheet back to true scale(1), waits for
     web fonts to finish loading and two animation frames for layout
     to settle, captures, then restores scale. */
  const downloadPDF = async () => {
    setIsExporting(true);

    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // Font loading API not fully supported — fall through and
        // rely on the animation-frame + timeout delay below.
      }
    }
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    // Small extra settle time after switching back to scale(1) and
    // hiding the .no-print chart, so layout has fully reflowed.
    await new Promise((r) => setTimeout(r, 80));

    const input = reportRef.current;

    // html2canvas builds an actual <canvas> at (content size × scale).
    // A fixed scale of 3 is fine for a short report, but once the sheet
    // is tall (many subjects, no longer clipped — see the comment above)
    // that canvas can cross a browser's internal size ceiling (mobile
    // Safari in particular tops out around ~16 million total pixels).
    // Past that ceiling the browser hands back a blank white canvas with
    // no error at all — which is exactly what "downloads a blank PDF"
    // looks like. Scale down automatically for tall content so this
    // never happens, while still using 3x for the common case.
    const MAX_CANVAS_DIMENSION = 14000; // stay under ~16k browser edge limits
    const MAX_CANVAS_AREA = 16000000; // stay under the ~16MP iOS Safari ceiling
    const contentWidth = input.scrollWidth || input.offsetWidth || 1;
    const contentHeight = input.scrollHeight || input.offsetHeight || 1;
    let captureScale = 3;
    captureScale = Math.min(captureScale, MAX_CANVAS_DIMENSION / Math.max(contentWidth, contentHeight));
    captureScale = Math.min(captureScale, Math.sqrt(MAX_CANVAS_AREA / (contentWidth * contentHeight)));
    captureScale = Math.max(1, Math.min(captureScale, 3));

    const canvas = await html2canvas(input, {
      scale: captureScale,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight,
      scrollY: -window.scrollY,
      logging: false,
      imageTimeout: 15000,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = 210;
    const pdfHeight = 297;

    // Full-bleed conversion: canvas pixels → mm, always at the full
    // page width. No xOffset, no centering, no shrink-then-center —
    // that combination is what produced side gutters before.
    const pxToMm = pdfWidth / canvas.width;
    const fullHeightMm = canvas.height * pxToMm;

    if (fullHeightMm <= pdfHeight + 0.5) {
      // Fits on a single page (the expected case with the compact
      // layout) — draw it edge to edge at full width, exactly once.
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, Math.min(fullHeightMm, pdfHeight), "", "FAST");
    } else {
      // Taller than one A4 page: paginate at full width rather than
      // shrinking the whole document down to squeeze it onto one page.
      const pageHeightPx = pdfHeight / pxToMm;
      let renderedPx = 0;
      let pageIndex = 0;

      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, renderedPx, canvas.width, sliceHeightPx,
          0, 0, canvas.width, sliceHeightPx
        );

        const pageImgData = pageCanvas.toDataURL("image/png");
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, sliceHeightPx * pxToMm, "", "FAST");

        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }
    }

    // Dynamic, professional filename — never leaves a literal
    // "undefined" in the saved file name if the student's name is
    // missing for some reason.
    const safeName = String(user.name || "Student").trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "");
    pdf.save(`${safeName}_ReportCard.pdf`);

    setIsExporting(false);
  };

  /* ================= PRINT (unchanged) ================= */
  const printReportCard = () => { window.print(); };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Preparing your report card…</p>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (loadError) {
    return (
      <div style={styles.page} className="sr-page-chrome">
        <ScreenState
          icon={<IconAlert size={26} style={{ color: "var(--danger)" }} />}
          title="Unable to load your report card"
          text="Something went wrong while fetching your academic results. Please check your connection and try again."
          action={
            <button onClick={retry} className="sr-btn sr-btn-primary" style={styles.downloadBtn}>
              <IconRefresh size={15} /> Try again
            </button>
          }
          styles={styles}
        />
      </div>
    );
  }

  /* ================= EMPTY ================= */
  if (!hasResults) {
    return (
      <div style={styles.page} className="sr-page-chrome">
        <ScreenState
          icon={<IconDocEmpty size={26} style={{ color: "var(--text-muted)" }} />}
          title="Report card unavailable"
          text="Your academic results have not yet been published. Please check back once your subjects have been assessed."
          action={
            <button onClick={retry} className="sr-btn sr-btn-outline" style={styles.printBtn}>
              <IconRefresh size={15} /> Refresh
            </button>
          }
          styles={styles}
        />
      </div>
    );
  }

  /* ================= UI ================= */
  const logoSrc = resolveFileUrl(school?.logoUrl);
  // Official school stamp — embedded here (and each signatory's own
  // signatureUrl below) so the on-screen/downloaded report card
  // actually shows the uploaded images instead of leaving the
  // "Signature" / "Official Stamp" boxes permanently blank.
  const stampSrc = resolveFileUrl(school?.stampUrl);
  const contactLine = [school?.address, school?.phone && `Tel: ${school.phone}`, school?.email]
    .filter(Boolean)
    .join(" | ");

  return (
    <div style={styles.page} className="sr-page-chrome">

      {/* ── TOP BAR (screen only) ── */}
      <div style={styles.topBar} className="no-print">
        <div>
          <h2 style={styles.portalTitle}>Student Report Card</h2>
          <p style={styles.portalSub}>Official academic performance report</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={printReportCard} className="sr-btn sr-btn-outline" style={styles.printBtn}>
            <IconPrinter size={15} /> Print Report Card
          </button>
          <button onClick={downloadPDF} className="sr-btn sr-btn-primary" style={styles.downloadBtn}>
            <IconDownload size={15} /> Download PDF
          </button>
          <ThemeToggle />
        </div>
      </div>

      {overflowWarning && (
        <p style={styles.overflowNotice} className="no-print">
          <IconAlert size={13} style={{ color: "#b45309", flexShrink: 0 }} /> {overflowWarning}
        </p>
      )}

      <p style={styles.scrollHint} className="no-print sr-scroll-hint">
        ↔ Scroll to view the full report card
      </p>

      {/* ── A4 STAGE ── */}
      <div style={styles.a4Stage} className="sr-stage">
        <div
          className="sr-scale-box"
          style={{ width: A4_WIDTH_PX * effectiveScale, height: A4_HEIGHT_PX * effectiveScale, position: "relative" }}
        >
          <div
            ref={reportRef}
            style={{ ...styles.reportCard, transform: `scale(${effectiveScale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}
            className={`sr-sheet sr-card${isExporting ? " sr-exporting" : ""}`}
          >

            {/* ── ANTI-FORGERY: tiled security pantograph ──
                A grid of repeated, low-opacity watermarks rather than
                one centred mark. Tiling (a) survives cropping/partial
                photocopies better than a single watermark, and (b) is
                the same technique used on cheques/certificates where a
                faint repeating pattern is deliberately hard for a
                photocopier to reproduce at matching contrast. */}
            <div style={styles.pantograph} aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} style={styles.pantographItem}>
                  {school?.schoolName ? school.schoolName.toUpperCase() : "OFFICIAL COPY"}
                </span>
              ))}
            </div>

            {/* ── ANTI-FORGERY: guilloche-style border frame ──
                A continuous woven double-wave border traced around the
                sheet edge, in the style of banknote/certificate
                guilloche patterns — simple to verify by eye (an even,
                interlocking weave) but fiddly to redraw convincingly by
                hand or reconstruct from a low-resolution scan. */}
            <svg
              style={styles.guillocheBorder}
              aria-hidden="true"
              viewBox="0 0 800 1131"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Two phase-offset sine paths woven together per tile —
                    this is what actually reads as "guilloche" rather
                    than a single wavy line. Repeated along the top/
                    bottom edges. */}
                <pattern id="srGuillocheH" width="24" height="14" patternUnits="userSpaceOnUse">
                  <path d="M-2,7 C1,1 5,1 8,7 C11,13 15,13 18,7 C21,1 25,1 28,7"
                        fill="none" stroke={withAlpha(reportTheme.primary, 0.4)} strokeWidth="0.6" />
                  <path d="M-2,7 C1,13 5,13 8,7 C11,1 15,1 18,7 C21,13 25,13 28,7"
                        fill="none" stroke={withAlpha(reportTheme.primary, 0.4)} strokeWidth="0.6" />
                </pattern>
                {/* Same weave, transposed for the left/right edges. */}
                <pattern id="srGuillocheV" width="14" height="24" patternUnits="userSpaceOnUse">
                  <path d="M7,-2 C1,1 1,5 7,8 C13,11 13,15 7,18 C1,21 1,25 7,28"
                        fill="none" stroke={withAlpha(reportTheme.primary, 0.4)} strokeWidth="0.6" />
                  <path d="M7,-2 C13,1 13,5 7,8 C1,11 1,15 7,18 C13,21 13,25 7,28"
                        fill="none" stroke={withAlpha(reportTheme.primary, 0.4)} strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect x="4" y="4" width="792" height="9" fill="url(#srGuillocheH)" />
              <rect x="4" y="1118" width="792" height="9" fill="url(#srGuillocheH)" />
              <rect x="4" y="4" width="9" height="1123" fill="url(#srGuillocheV)" />
              <rect x="791" y="4" width="9" height="1123" fill="url(#srGuillocheV)" />
            </svg>

            {/* ══════════════════════════════════════════════
                OFFICIAL HEADER BAND (compact letterhead)
            ══════════════════════════════════════════════ */}
            <div style={styles.headerBand}>
              <div style={styles.headerBandInner}>
                {/* Crest / Logo */}
                <div style={styles.crestBox}>
                  {logoSrc
                    ? <img src={logoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
                    : <IconCap size={52} style={{ color: "#fff" }} />}
                </div>

                {/* Centre text */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  {school?.motto && <p style={styles.collegeTagline}>{school.motto}</p>}
                  <h1 style={styles.collegeName}>{school?.schoolName || "—"}</h1>
                  <p style={styles.collegeAddress}>{contactLine || "—"}</p>
                  <div style={styles.slipTitleBox}>
                    <p style={styles.slipTitle}>Student Academic Report Card</p>
                    <p style={styles.slipSubtitle}>{examName}</p>
                  </div>
                </div>

                {/* Right block */}
                <div style={styles.headerMeta}>
                  <div style={styles.metaRow}><span style={styles.metaKey}>Date</span><span style={styles.metaVal}>{new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
                  <div style={styles.metaRow}><span style={styles.metaKey}>Class</span><span style={styles.metaVal}>{studentClass}</span></div>
                  <div style={styles.metaRow}><span style={styles.metaKey}>Year</span><span style={styles.metaVal}>{yearOfStudy || "—"}</span></div>
                  <div style={{ ...styles.metaRow, marginTop: 3, gap: 5, justifyContent: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={styles.positionCircle}>#{classPosition}</span>
                      <p style={styles.positionCaption}>Class Pos.</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={styles.positionCircle}>#{overallPosition}</span>
                      <p style={styles.positionCaption}>Overall Pos.</p>
                    </div>
                  </div>
                  <p style={styles.verifyCodeHeader}>VERIFY: {verificationCode}</p>
                </div>
              </div>
              <div style={styles.headerBandFoot} />
              {/* ── ANTI-FORGERY: microprint line ──
                  Tiny repeated text reads as a plain rule at normal
                  viewing distance, but a photocopier or phone-camera
                  rescan cannot resolve it — it turns to a grey smear
                  or drops out entirely, which is an easy naked-eye
                  authenticity check on the original. */}
              <div style={styles.microprint} aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i}>{documentId} • AUTHENTIC ORIGINAL DOCUMENT • DO NOT PHOTOCOPY • </span>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                STUDENT INFORMATION GRID (compact)
            ══════════════════════════════════════════════ */}
            <div style={styles.sectionTight}>
              <div style={styles.plainInfoGrid}>
                <InfoItem label="Student Name" value={user.name} styles={styles} />
                <InfoItem label="Admission Number" value={admissionNo} styles={styles} />
                <InfoItem label="Class / Stream" value={studentClass} styles={styles} />
                <InfoItem label="Year of Study" value={yearOfStudy || null} styles={styles} />
                <InfoItem label="Gender" value={user.gender || student?.gender} styles={styles} />
                <InfoItem label="Centre Code" value={school?.centreCode} styles={styles} />
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                PERFORMANCE SUMMARY (compact strip — highest/
                lowest score moved into Performance Analysis below
                to avoid repeating the same two figures twice)
            ══════════════════════════════════════════════ */}
            <div style={styles.sectionTight}>
              <div style={styles.summaryRow}>
                {[
                  { label: "Average Score", value: `${analytics.avg}%`, color: "#1d4ed8" },
                  { label: "Overall Result", value: analytics.result || "—", color: "#15803d" },
                  { label: "Class Position", value: `#${classPosition}`, color: "#b45309" },
                  { label: "Overall Position", value: `#${overallPosition}`, color: "#7c3aed" },
                  { label: "Learning Areas", value: analytics.assessedCount, color: "#0f766e" },
                ].map((m, i, arr) => (
                  <div
                    key={m.label}
                    style={{ ...styles.summaryItem, borderRight: i === arr.length - 1 ? "none" : "1px solid #e2e8f0" }}
                  >
                    <p style={styles.summaryLabel}>{m.label}</p>
                    <p style={{ ...styles.summaryValue, color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                RESULTS TABLE (simplified — code folded into the
                subject column, plain text instead of pill badges,
                all 18 subjects fit without truncating anything)
            ══════════════════════════════════════════════ */}
            <div style={styles.sectionTight}>
              <div style={styles.sectionLabelBarTight}>
                <span style={styles.sectionLabel}>Academic Performance</span>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{ ...styles.th, textAlign: "left", width: "40%" }}>Learning Area / Subject</th>
                    <th style={{ ...styles.th, width: "14%" }}>Score</th>
                    <th style={{ ...styles.th, width: "16%" }}>Grade</th>
                    <th style={{ ...styles.th, textAlign: "left", width: "30%" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectMap.map((s, i) => {
                    const valid = s.score !== null && s.score !== undefined;
                    const badge = valid ? getScoreBadgeStyle(s.score, gradingSystem) : null;
                    const remark = valid ? getRemarkForScore(s.score, gradingSystem) : "";
                    return (
                      <tr key={s.code || i} style={{ background: i % 2 === 0 ? "#ffffff" : reportTheme.zebra }}>
                        <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>
                          <span style={{ color: "#94a3b8", fontWeight: 400 }}>{s.code || `L/A-${i + 1}`} — </span>
                          {s.subject}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: valid ? (s.score >= 70 ? "#15803d" : s.score >= 50 ? "#b45309" : "#b91c1c") : "#991b1b" }}>
                          {valid ? `${s.score}%` : "CRNM"}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 600, color: valid ? "#334155" : "#991b1b" }}>
                          {valid ? badge.text : "CRNM"}
                        </td>
                        <td style={{ ...styles.td, textAlign: "left", color: "#64748b" }}>{remark || "—"}</td>
                      </tr>
                    );
                  })}

                  {/* AVERAGE ROW — a mean of percentages, correctly
                      labelled (this used to be a mis-labelled sum). */}
                  <tr style={styles.totalRow}>
                    <td style={styles.td}>AVERAGE</td>
                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#93c5fd" }}>{analytics.avg}%</td>
                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{analytics.grade.label || "—"}</td>
                    <td style={styles.td}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ══════════════════════════════════════════════
                PERFORMANCE ANALYSIS — one compact horizontal
                strip (highest / lowest / attention count) instead
                of two large cards; carries the highest/lowest
                figures previously repeated in the summary above.
            ══════════════════════════════════════════════ */}
            {(highestSubject || lowestSubject) && (
              <div style={styles.sectionTight}>
                <div style={styles.sectionLabelBarTight}>
                  <span style={styles.sectionLabel}>Performance Analysis</span>
                </div>
                <div style={styles.analysisStrip}>
                  <div style={styles.analysisItem}>
                    <p style={styles.analysisLabel}>Highest Performing Area</p>
                    <p style={styles.analysisValue}>
                      {highestSubject ? `${highestSubject.subject} — ${highestSubject.score}%` : "Not enough data"}
                    </p>
                  </div>
                  <div style={{ ...styles.analysisItem, borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                    <p style={styles.analysisLabel}>Area Requiring Attention</p>
                    <p style={styles.analysisValue}>
                      {lowestSubject ? `${lowestSubject.subject} — ${lowestSubject.score}%` : "Not enough data"}
                    </p>
                  </div>
                  <div style={styles.analysisItem}>
                    <p style={styles.analysisLabel}>Pass-Mark Check</p>
                    <p style={styles.analysisValue}>
                      {attentionSubjects.length > 0
                        ? `${attentionSubjects.length} of ${analytics.assessedCount} below ${passMark}%`
                        : `All ${analytics.assessedCount} met the ${passMark}% pass mark`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                PERFORMANCE CHART (screen only — kept off the
                printed/exported sheet so the document stays a
                clean, predictable single page)
            ══════════════════════════════════════════════ */}
            {chartData.length > 0 && (
              <div style={styles.sectionTight} className="no-print">
                <div style={styles.sectionLabelBarTight}>
                  <span style={styles.sectionLabel}>Score Overview (screen only)</span>
                </div>
                <div style={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={Math.max(80, chartData.length * 22)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis type="category" dataKey="subject" width={110} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                      <Bar dataKey="score" fill={reportTheme.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                OFFICIAL AUTHORISATION — compact two-column grid.
                Every Class Teacher / Lecturer assigned to this
                class, plus every configured signatory (Assessment
                Officer, Dean of Curriculum, Chief Principal, etc.
                — whatever School Settings has configured), each as
                a compact block rather than a large independent
                card. Items simply flow into the 2-column grid, so
                any number of teachers/signatories wraps cleanly
                without clipping.
            ══════════════════════════════════════════════ */}
            <div style={styles.sectionTight}>
              <div style={styles.sectionLabelBarTight}>
                <span style={styles.sectionLabel}>Official Authorisation</span>
              </div>
              <div style={styles.authGrid}>

                {/* Comments — one compact remarks block per Class
                    Teacher / Lecturer assigned to this class (main +
                    any assistants). Falls back to a single blank
                    block when nobody has been assigned yet. */}
                {classTeachersForClass.length > 0 ? (
                  classTeachersForClass.map((ct, i) => (
                    <div style={styles.authCard} key={ct.id ?? i}>
                      <p style={styles.authCardTitle}>{ct.title ? `${ct.title}'s Remarks` : "Class Teacher / Lecturer's Remarks"}</p>
                      <div style={styles.remarksBox}>
                        <p style={{ color: "#94a3b8", fontSize: 7, margin: 0 }}>&nbsp;</p>
                      </div>
                      <div style={styles.sigGrid}>
                        <div style={styles.sigItem}>
                          <p style={styles.sigLabel}>Name</p>
                          {ct.name ? (
                            <p style={styles.sigNameText}>{ct.name}</p>
                          ) : (
                            <div style={styles.sigLine} />
                          )}
                        </div>
                        <div style={styles.sigItem}>
                          <p style={styles.sigLabel}>Signature</p>
                          <div style={styles.sigLine} />
                        </div>
                        <div style={styles.sigItem}><p style={styles.sigLabel}>Date</p><div style={styles.sigLine} /></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.authCard}>
                    <p style={styles.authCardTitle}>Class Teacher / Lecturer's Remarks</p>
                    <div style={styles.remarksBox}>
                      <p style={{ color: "#94a3b8", fontSize: 7, margin: 0 }}>&nbsp;</p>
                    </div>
                    <div style={styles.sigGrid}>
                      <div style={styles.sigItem}><p style={styles.sigLabel}>Name</p><div style={styles.sigLine} /></div>
                      <div style={styles.sigItem}><p style={styles.sigLabel}>Signature</p><div style={styles.sigLine} /></div>
                      <div style={styles.sigItem}><p style={styles.sigLabel}>Date</p><div style={styles.sigLine} /></div>
                    </div>
                  </div>
                )}

                {/* Approval — one compact block per official flagged
                    as a signatory in School Settings (Assessment
                    Officer, Dean of Curriculum, Chief Principal, in
                    whatever order/rank is configured there), or the
                    single dean/principal fallback if none are set.
                    Stamp is sized to fit the compact card without
                    forcing the card taller than its content. */}
                {signatories.length > 0 ? (
                  signatories.map((s) => (
                    <div style={styles.authCard} key={s.id}>
                      <p style={styles.authCardTitle}>{s.title || "Approved By"}</p>
                      <div style={{ padding: "1px 0" }}>
                        <p style={styles.sigNameHeadline}>{s.name || "—"}</p>
                        {s.title && <p style={styles.sigRoleText}>{s.title}</p>}
                      </div>
                      <div style={styles.sigGrid}>
                        <div style={styles.sigItem}>
                          <p style={styles.sigLabel}>Signature</p>
                          <div style={styles.stampSigWrap}>
                            <div style={styles.sigLine} />
                            {stampSrc && (
                              <img src={stampSrc} alt="" style={styles.stampOverlayImage} />
                            )}
                          </div>
                        </div>
                        <div style={styles.sigItem}>
                          {stampSrc ? (
                            <img src={stampSrc} alt="" style={styles.stampImageStandalone} />
                          ) : (
                            <div style={styles.stampBox} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.authCard}>
                    <p style={styles.authCardTitle}>Approved By</p>
                    <div style={{ padding: "1px 0" }}>
                      <p style={styles.sigNameHeadline}>{dean?.name || principal?.name || signatory?.name || "—"}</p>
                      <p style={styles.sigRoleText}>{dean?.title || principal?.title || signatory?.title || "—"}</p>
                    </div>
                    <div style={styles.sigGrid}>
                      <div style={styles.sigItem}>
                        <p style={styles.sigLabel}>Signature</p>
                        <div style={styles.stampSigWrap}>
                          <div style={styles.sigLine} />
                          {stampSrc && (
                            <img src={stampSrc} alt="" style={styles.stampOverlayImage} />
                          )}
                        </div>
                      </div>
                      <div style={styles.sigItem}>
                        {stampSrc ? (
                          <img src={stampSrc} alt="" style={styles.stampImageStandalone} />
                        ) : (
                          <div style={styles.stampBox} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ══════════════════════════════════════════════
                FOOTER + QR (compact verification strip)
            ══════════════════════════════════════════════ */}
            <div style={styles.footerSection}>
              <div style={styles.footerLeft}>
                <div style={styles.qrFrame}>
                  <QRCode
                    value={JSON.stringify({
                      name: user.name,
                      admissionNo,
                      class: studentClass,
                      average: analytics.avg,
                      grade: analytics.grade.label,
                      documentId,
                      verificationCode,
                    })}
                    size={56}
                  />
                </div>
                <p style={styles.scanCaption}>
                  <IconScan size={10} style={{ color: "#94a3b8" }} /> Scan to verify
                </p>
              </div>
              <div style={styles.footerCenter}>
                <p style={styles.footerDisclaimer}>
                  This report card is computer-generated and reflects the results on record at the time of printing.
                  It is valid without a handwritten signature unless otherwise indicated by the institution.
                </p>
                {/* ── ANTI-FORGERY: verification code + security strip ──
                    The code is re-derivable from the visible result
                    fields (see checksumHash above); the bar strip is a
                    visual companion to the QR, in the style of a
                    certificate serial/barcode, making the document read
                    unmistakably as a controlled, numbered original. */}
                <div style={styles.securityRow}>
                  <div style={styles.securityBars} aria-hidden="true">
                    {securityBars.map((w, i) => (
                      <span key={i} style={{ ...styles.securityBar, width: w }} />
                    ))}
                  </div>
                  <p style={styles.verifyCodeFooter}>
                    Doc ID {documentId} &nbsp;·&nbsp; Verification Code <strong>{verificationCode}</strong>
                  </p>
                </div>
                <p style={styles.footerCredits}>
                  Generated via the Doravo Core Student Portal
                </p>
              </div>
              <div style={styles.footerRight}>
                <div style={styles.resultRibbon}>
                  <p style={styles.ribbonLabel}>Overall Result</p>
                  <p style={styles.ribbonValue}>{analytics.result || "—"}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   Screen-chrome styles (page, topBar, buttons, loading state)
   use the app's shared CSS variable tokens so they follow
   light/dark mode. The printed A4 sheet ("reportCard" and all
   its children below) intentionally keeps its own fixed
   maroon/blue/green/amber palette — it's an official document
   that gets printed and exported to PDF, not a themed UI.

   COMPACTION NOTES (why these numbers, not the old ones):
   The supplied two-page PDF overflowed by roughly one extra
   header's worth of height. Auditing the rendered sections, the
   vertical cost was spread thin across many places rather than
   concentrated in one: the header band's generous padding and
   large 66px crest: ~10mm; seven separate performance-summary
   cards where five plus the analysis strip carry the same
   information: ~8mm; ~6px of table row padding × 18 rows plus
   the average row: ~14mm; two large, independently-bordered
   performance-analysis cards instead of one three-item strip:
   ~9mm; and the biggest single cost, the Official Authorisation
   cards — each signatory card carried its own title, name block,
   3-column signature grid and (for Dean + Chief Principal) a
   1.5in-tall stamp overlapping a nearly-as-tall signature area,
   stacked as four full cards: roughly ~28-32mm depending on the
   number of teachers/signatories. That authorisation block alone
   was enough to push the last ~15-20% of content onto page two.
   The changes below trim each of those areas proportionally
   rather than applying one blanket scale-down, so text stays a
   legible 7-8px throughout instead of being shrunk further.
═══════════════════════════════════════════════════════════ */
/* ================= REPORT THEME COLOR HELPERS =================
   The printed report card's palette now follows the school's chosen
   Report Theme (School Settings → Report Theme) instead of a fixed
   maroon. A theme only supplies 4 colors (primary, onPrimary, zebra,
   rule — see backend/utils/reportThemes.js), so lighten() derives the
   soft tinted text (tagline/subtitle/labels on the header band) that
   used to be hard-coded maroon-specific hex values like #fecaca. */
function hexToRgb(hex) {
  const h = String(hex || "#7f1d1d").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(full, 16) || 0x7f1d1d;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getStyles(theme) {
  const primary = theme?.primary || "#7f1d1d";
  const onPrimary = theme?.onPrimary || "#ffffff";
  const zebra = theme?.zebra || "#f8fafc";
  const rule = theme?.rule || "#b45309";
  const tagline = lighten(primary, 0.68);
  const subtitleTint = lighten(primary, 0.55);

  return {
  /* ── Page shell (screen chrome only, stripped for print) ── */
  page: {
    background: "var(--bg)",
    minHeight: "100%",
    width: "100%",
    padding: "18px 16px 32px",
    color: "var(--text)",
    boxSizing: "border-box",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  /* ── Top control bar ── */
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    padding: "0 4px",
    flexWrap: "wrap",
    gap: 12,
  },
  portalTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "0.01em",
  },
  portalSub: {
    marginTop: 4,
    color: "var(--text-secondary)",
    fontSize: 13,
  },
  printBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "var(--card)",
    color: "var(--text-secondary)",
    padding: "9px 16px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "var(--primary)",
    color: "#fff",
    padding: "9px 16px",
    border: "1px solid var(--primary)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  scrollHint: {
    display: "none",
    fontSize: 12,
    color: "var(--text-muted)",
    margin: "0 4px 8px",
  },

  // Screen-only diagnostic banner shown when a tenant's content
  // genuinely doesn't fit one A4 page at this compact layout (see
  // the overflow-detection effect above). Never rendered in print
  // or PDF export.
  overflowNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    margin: "0 4px 10px",
    padding: "8px 12px",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    fontSize: 12.5,
    color: "#92400e",
    lineHeight: 1.4,
  },

  /* ── A4 stage: centers the (scaled) sheet ── */
  a4Stage: {
    display: "flex",
    justifyContent: "center",
    overflowX: "auto",
    padding: "4px 0 16px",
  },

  /* ── The literal A4 sheet — 210mm × 297mm, identical for
       screen preview, browser print, and PDF export. Fixed
       colours by design (official printed document). Needs
       position: relative so the pantograph/guilloche overlays
       (position: absolute) anchor to the sheet itself rather
       than the nearest positioned ancestor up the tree. ── */
  reportCard: {
    width: "210mm",
    minHeight: "297mm",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 3,
    overflow: "visible",
    boxSizing: "border-box",
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
    border: "1px solid #e5e0d8",
    position: "relative",
  },

  watermark: {
    position: "absolute",
    top: "42%",
    left: "50%",
    transform: "translate(-50%,-50%) rotate(-32deg)",
    fontSize: 64,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: withAlpha(primary, 0.04),
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 0,
  },

  /* ── ANTI-FORGERY: tiled pantograph watermark ──
     Sits behind all content (zIndex 0), spans the full sheet. ── */
  pantograph: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexWrap: "wrap",
    alignContent: "space-around",
    justifyContent: "space-around",
    padding: "40px 20px",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 0,
    opacity: 0.045,
  },
  pantographItem: {
    fontSize: 20,
    fontWeight: 800,
    color: primary,
    transform: "rotate(-28deg)",
    whiteSpace: "nowrap",
    letterSpacing: "0.08em",
  },

  /* ── ANTI-FORGERY: guilloche border SVG overlay ──
     Sits above the header band (zIndex 2) so the woven frame traces
     over the sheet edge on top of everything else. ── */
  guillocheBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 2,
  },

  /* ── ANTI-FORGERY: microprint strip under the header band ── */
  microprint: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    fontSize: 3.2,
    lineHeight: 1,
    color: withAlpha(onPrimary, 0.55),
    background: primary,
    padding: "1.5px 3mm 2.5px",
    letterSpacing: "0.02em",
  },

  /* ── ANTI-FORGERY: verification code, header + footer ── */
  verifyCodeHeader: {
    marginTop: 4,
    fontSize: 6,
    fontWeight: 700,
    color: withAlpha(onPrimary, 0.7),
    letterSpacing: "0.06em",
  },
  securityRow: {
    marginTop: 5,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  securityBars: {
    display: "flex",
    alignItems: "flex-end",
    gap: 1.5,
    height: 12,
  },
  securityBar: {
    display: "inline-block",
    height: "100%",
    background: "#0f172a",
  },
  verifyCodeFooter: {
    margin: 0,
    fontSize: 8,
    color: "#64748b",
  },

  /* ── Header band (flat fill, no gradient) — compact letterhead ── */
  headerBand: {
    position: "relative",
    zIndex: 1,
  },
  headerBandInner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "3px 3mm 2px",
    background: primary,
  },
  headerBandFoot: {
    height: 2.5,
    background: rule,
  },
  crestBox: {
    width: 96,
    height: 96,
    minWidth: 96,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.14)",
    border: "3px solid rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  collegeTagline: {
    margin: "0 0 1px",
    fontSize: 8,
    letterSpacing: "0.09em",
    color: tagline,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  collegeName: {
    margin: "0 0 2px",
    fontSize: 15,
    fontWeight: 800,
    color: onPrimary,
    letterSpacing: "0.01em",
    lineHeight: 1.1,
    fontFamily: "'Playfair Display', 'Georgia', serif",
  },
  collegeAddress: {
    margin: "0 0 4px",
    fontSize: 8.5,
    color: subtitleTint,
  },
  slipTitleBox: {
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 5,
    padding: "3px 10px",
    display: "inline-block",
  },
  slipTitle: {
    margin: 0,
    fontSize: 9.5,
    fontWeight: 800,
    color: onPrimary,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  slipSubtitle: {
    margin: "1px 0 0",
    fontSize: 9,
    color: onPrimary,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  headerMeta: {
    minWidth: 50,
    textAlign: "right",
  },
  metaRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 0.5,
    marginBottom: 2,
  },
  metaKey: {
    fontSize: 8.5,
    color: subtitleTint,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  metaVal: {
    fontSize: 7,
    color: onPrimary,
    fontWeight: 700,
    background: "rgba(255,255,255,0.12)",
    padding: "1.5px 6px",
    borderRadius: 4,
  },
  positionCircle: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#fff",
    color: primary,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 11,
    border: "2.5px solid rgba(255,255,255,0.55)",
    letterSpacing: "-0.02em",
  },
  positionCaption: {
    margin: "2px 0 0",
    fontSize: 6.5,
    color: "#64748b",
  },

  /* ── Sections ──
     `section` kept for compatibility; `sectionTight` is the
     compacted spacing used throughout the redesigned sheet
     (roughly half the old top/bottom padding). */
  section: {
    position: "relative",
    zIndex: 1,
    padding: "0 12mm 8px",
    marginTop: 1,
  },
  sectionTight: {
    position: "relative",
    zIndex: 1,
    padding: "0 10mm 4px",
    marginTop: 0,
  },
  sectionLabelBar: {
    borderLeft: `4px solid ${primary}`,
    paddingLeft: 9,
    marginBottom: 8,
  },
  sectionLabelBarTight: {
    borderLeft: `3px solid ${primary}`,
    paddingLeft: 7,
    marginBottom: 4,
    marginTop: 5,
  },
  sectionLabel: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: primary,
    textTransform: "uppercase",
  },

  /* ── Student info: plain professional text, no boxes ──
     A single quiet rule under the whole block does the work a
     bordered card used to do, at a fraction of the vertical space. */
  plainInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    rowGap: 4,
    columnGap: 14,
    padding: "5px 0 6px",
    borderBottom: "1px solid #e2e8f0",
  },
  plainInfoItem: {
    fontSize: 9.5,
  },
  plainInfoLabel: {
    fontWeight: 700,
    color: "#64748b",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  plainInfoValue: {
    fontWeight: 600,
    color: "#0f172a",
  },

  /* ── Performance summary: a single thin-divided stat line
     instead of seven separate boxed cards — same figures, far
     less vertical real estate, and reads like a printed ledger
     rather than a dashboard. ── */
  summaryRow: {
    display: "flex",
    flexWrap: "wrap",
    borderBottom: "1px solid #e2e8f0",
    padding: "5px 0",
  },
  summaryItem: {
    flex: "1 1 0",
    minWidth: 84,
    textAlign: "center",
    padding: "0 6px",
  },
  summaryLabel: {
    margin: "0 0 2px",
    fontSize: 6.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  summaryValue: {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.2,
  },

  /* ── Performance analysis: one compact three-item strip
     replacing the old two large bordered cards. ── */
  analysisStrip: {
    display: "flex",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  analysisItem: {
    flex: 1,
    padding: "5px 10px",
    textAlign: "center",
  },
  analysisLabel: {
    margin: "0 0 2px",
    fontSize: 6.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  analysisValue: {
    margin: 0,
    fontSize: 9.5,
    fontWeight: 700,
    color: "#0f172a",
  },

  /* ── Chart ── */
  chartWrap: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "6px 8px",
  },

  /* ── Table — compact rows (~3px vertical cell padding), all
     18 subjects fit without truncating names; long names wrap
     naturally since the subject column has no whiteSpace: nowrap. ── */
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 7.5,
    tableLayout: "fixed",
  },
  theadRow: {
    background: primary,
  },
  th: {
    padding: "4px 6px",
    fontSize: 8,
    fontWeight: 700,
    color: withAlpha(onPrimary, 0.72),
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: "center",
    borderBottom: "2px solid rgba(0,0,0,0.18)",
  },
  td: {
    padding: "2px 7px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: 7.5,
    textAlign: "center",
    verticalAlign: "middle",
    lineHeight: 1.2,
  },
  totalRow: {
    background: primary,
    color: onPrimary,
    fontWeight: 700,
    fontSize: 7.5,
  },

  /* ── Auth grid — compact two-column blocks. Any number of
     class-teacher / signatory blocks simply flows into new rows
     of this grid, so more signatories never clip content — they
     just add another row at the same compact height. ── */
  authGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 5,
  },
  authCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "5px 9px 6px",
    position: "relative",
    overflow: "visible",
  },
  authCardTitle: {
    margin: "0 0 4px",
    fontSize: 8.5,
    fontWeight: 800,
    color: primary,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  remarksBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: 6,
    minHeight: 14,
    padding: 5,
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
  },
  sigGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 5,
    marginTop: 4,
  },
  sigItem: { textAlign: "center" },
  sigLabel: {
    margin: "0 0 3px",
    fontSize: 7.5,
    color: "#64748b",
    fontWeight: 600,
  },
  sigLine: {
    borderBottom: "1px solid #334155",
    width: "80%",
    margin: "0 auto",
    minHeight: 14,
  },
  sigNameText: {
    margin: 0,
    fontWeight: 700,
    fontSize: 9.5,
    color: "#0f172a",
  },
  sigNameHeadline: {
    margin: "0 0 1px",
    fontWeight: 700,
    fontSize: 11,
    color: "#0f172a",
  },
  sigRoleText: {
    margin: 0,
    color: "#64748b",
    fontSize: 8.5,
  },
  // A clear, non-overlapping rendering of the stamp shown in its own
  // column — this is in addition to the semi-transparent stampOverlayImage
  // pressed across the signature, giving a legible, unobstructed view
  // of the stamp itself instead of the "Official Stamp" / "Stamped
  // above" text labels that used to sit here.
  stampImageStandalone: {
    display: "block",
    width: "1.4in",
    height: "0.7in",
    margin: "0 auto",
    objectFit: "contain",
  },
  // Placeholder shown when no stamp has been uploaded yet. Sized to
  // roughly match the stamp image footprint so layout doesn't
  // shift once a real stamp is added from School Settings.
  stampBox: {
    width: "1.4in",
    height: "0.7in",
    margin: "0 auto",
    border: "1.5px dashed #94a3b8",
    borderRadius: 4,
  },
  // Wrapper that lets the stamp visually overlap the signature —
  // relative positioning here, absolute positioning on the stamp
  // image itself, so the stamp reads as pressed across the
  // signature the way a real ink stamp does on a signed document,
  // without forcing the compact card taller than its content.
  stampSigWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  // Official stamp, overlapping the signature: kept at its original
  // fixed physical footprint and placement (unchanged by the layout
  // compaction), rotated slightly and semi-transparent so it reads
  // as an ink stamp pressed across the signature line rather than a
  // second flat logo. The authCard/sigGrid around it simply allows
  // for its size rather than the stamp being shrunk to fit.
  stampOverlayImage: {
    position: "absolute",
    width: "1.5in",
    height: "0.75in",
    objectFit: "contain",
    opacity: 0.82,
    transform: "rotate(-9deg)",
    mixBlendMode: "multiply",
    pointerEvents: "none",
    zIndex: 2,
  },

  /* ── Footer (compact) ── */
  footerSection: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "6px 10mm 6mm",
    borderTop: `2px solid ${primary}`,
    marginTop: "auto",
  },
  footerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 66,
  },
  qrFrame: {
    padding: 5,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 7,
  },
  scanCaption: {
    fontSize: 7.5,
    color: "#94a3b8",
    marginTop: 3,
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  footerCenter: {
    flex: 1,
  },
  footerDisclaimer: {
    margin: "0 0 3px",
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.35,
    fontStyle: "italic",
  },
  footerCredits: {
    margin: "3px 0 0",
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: 600,
  },
  footerRight: {
    minWidth: 90,
  },
  resultRibbon: {
    background: primary,
    borderRadius: 7,
    padding: "5px 10px",
    textAlign: "center",
  },
  ribbonLabel: {
    margin: "0 0 2px",
    fontSize: 7,
    color: subtitleTint,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  ribbonValue: {
    margin: 0,
    fontSize: 9.5,
    fontWeight: 900,
    color: onPrimary,
    lineHeight: 1.2,
  },

  /* ── Loading ── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40vh",
    gap: 14,
    background: "var(--bg)",
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    border: "3px solid var(--border)",
    borderTop: "3px solid var(--primary)",
    borderRadius: "50%",
    animation: "sr-spin 0.9s linear infinite",
  },
  loadingText: {
    color: "var(--text-secondary)",
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
  },

  /* ── Error / empty state ── */
  stateWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: "50vh",
    gap: 10,
    maxWidth: 420,
    margin: "0 auto",
  },
  stateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "var(--card)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: "var(--text)",
  },
  stateText: {
    margin: "0 0 8px",
    fontSize: 13.5,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  };
}