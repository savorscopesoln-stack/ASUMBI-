/* =========================================================
   GRADING UTILITIES
   ---------------------------------------------------------
   One shared scale, configured from Admin → E-Assessments →
   Grading System, and read by every screen that used to have
   its own hard-coded getKnecGrade/getGrade/getRemark function
   (reports.jsx, StudentReport.jsx, TeacherReports.jsx). See
   hooks/useGradingSystem.js for the fetch/cache side of this.

   A "band" is { minScore, label, remark? } (gradeBand also has
   `grade`, e.g. "1"/"2"..., the KNEC-style grade point). Bands
   are expected highest-minScore-first; these helpers re-sort
   defensively so a caller never has to think about order.
========================================================= */

// Hard-coded fallback — identical to the numbers the old
// getKnecGrade/getRemark/getOverallResult functions used — so a
// report still renders sensibly if the grading-system fetch hasn't
// resolved yet (or failed) rather than showing blank grades.
export const DEFAULT_GRADING_SYSTEM = {
  systemName: "KNEC Standard",
  passMark: 40,
  gradeBands: [
    { minScore: 80, grade: "1", label: "Distinction", remark: "Excellent Performance" },
    { minScore: 75, grade: "2", label: "Distinction", remark: "Good Performance" },
    { minScore: 70, grade: "3", label: "Credit", remark: "Good Performance" },
    { minScore: 60, grade: "4", label: "Credit", remark: "Fair Performance" },
    { minScore: 50, grade: "5", label: "Pass", remark: "Weak Performance" },
    { minScore: 40, grade: "6", label: "Pass", remark: "Needs Improvement" },
    { minScore: 0, grade: "7", label: "Fail", remark: "Needs Improvement" },
  ],
  overallBands: [
    { minScore: 75, label: "DISTINCTION" },
    { minScore: 60, label: "CREDIT" },
    { minScore: 40, label: "PASS" },
    { minScore: 0, label: "REFERRED" },
  ],
};

const sortedDesc = (bands) =>
  Array.isArray(bands) && bands.length
    ? [...bands].sort((a, b) => Number(b.minScore) - Number(a.minScore))
    : [];

// Returns the band whose minScore the score meets/exceeds (highest
// qualifying band), falling back to the lowest band if the score is
// below every configured minScore.
const matchBand = (score, bands) => {
  const list = sortedDesc(bands);
  if (!list.length) return null;
  const n = Number(score) || 0;
  return list.find((b) => n >= Number(b.minScore)) || list[list.length - 1];
};

/** { grade, label, remark } for a raw subject/overall score, e.g. old getKnecGrade(). */
export function getGradeForScore(score, gradingSystem) {
  const bands = gradingSystem?.gradeBands?.length
    ? gradingSystem.gradeBands
    : DEFAULT_GRADING_SYSTEM.gradeBands;
  const band = matchBand(score, bands);
  return band
    ? { grade: band.grade, label: band.label, remark: band.remark || "" }
    : { grade: "", label: "", remark: "" };
}

/** Just the remark text for a score, e.g. old getRemark(). */
export function getRemarkForScore(score, gradingSystem) {
  return getGradeForScore(score, gradingSystem).remark;
}

/** Overall-result label for an average, e.g. old getOverallResult() → "DISTINCTION"/"CREDIT"/... */
export function getOverallResultForScore(avg, gradingSystem) {
  const bands = gradingSystem?.overallBands?.length
    ? gradingSystem.overallBands
    : DEFAULT_GRADING_SYSTEM.overallBands;
  const band = matchBand(avg, bands);
  return band?.label || "";
}

/** The configured pass mark (falls back to 40), e.g. for pass-rate analytics. */
export function getPassMark(gradingSystem) {
  const n = Number(gradingSystem?.passMark);
  return Number.isFinite(n) ? n : DEFAULT_GRADING_SYSTEM.passMark;
}
