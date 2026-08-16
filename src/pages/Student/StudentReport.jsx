import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
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
} from "recharts";

/* ================= GRADING (unchanged) ================= */
const getKnecGrade = (score) => {
  const s = Number(score || 0);
  if (s >= 95) return { grade: 1, label: "Exceeding Expectations 1 (EE1)", result: "Distinction" };
  if (s >= 90) return { grade: 2, label: "Exceeding Expectations 2 (EE2)", result: "Distinction" };
  if (s >= 80) return { grade: 3, label: "Meeting Expectations 1 (ME1)", result: "Credit" };
  if (s >= 70) return { grade: 4, label: "Meeting Expectations 2 (ME2)", result: "Credit" };
  if (s >= 60) return { grade: 5, label: "Approaching Expectations 1 (AE1)", result: "Credit" };
  if (s >= 50) return { grade: 6, label: "Approaching Expectations 2 (AE2)", result: "Pass" };
  if (s >= 40) return { grade: 7, label: "Below Expectations 1 (BE1)", result: "Pass" };
  return { grade: 8, label: "Below Expectations 2 (BE2)", result: "Referred" };
};

const getOverallResult = (totalMarks) => {
  const t = Number(totalMarks || 0);
  if (t >= 1515 && t <= 1700) return "DISTINCTION 1 (EE1)";
  if (t >= 1530 && t <= 1614) return "DISTINCTION 2 (EE2)";
  if (t >= 1360 && t <= 1529) return "CREDIT 3 (ME1)";
  if (t >= 1051 && t <= 1359) return "CREDIT 4 (ME2)";
  if (t >= 901 && t <= 1050) return "CREDIT 5 (AE1)";
  if (t >= 850 && t <= 900) return "PASS 6 (AE2)";
  if (t >= 680 && t <= 849) return "PASS 7 (BE1)";
  return "REFERRED (BE2)";
};

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
   @font-face keyframes — those are injected once here. Nothing
   in this block touches data or computation logic. */
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
        @keyframes sr-spin { to { transform: rotate(360deg); } }
        @keyframes sr-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .sr-card { animation: sr-fade-up .35s cubic-bezier(.2,.8,.3,1) both; }
        .sr-btn { transition: transform .15s ease, box-shadow .2s ease, background .2s ease, filter .2s ease; }
        .sr-btn:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .sr-btn:active { transform: translateY(0); }

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

        @page { size: A4; margin: 0; }

        @media print {
          html, body { background: #ffffff !important; }
          .sr-page-chrome { background: #ffffff !important; padding: 0 !important; }
          .no-print { display: none !important; }
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
   Thin single-stroke set, one family — replaces the previous
   emoji glyphs (🎓 🖨 📥) with a consistent, premium mark. */
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

/* ================= SUB-COMPONENTS (unchanged props/behaviour) ================= */
const Card = ({ label, value, accent }) => (
  <div style={{ ...styles.summaryCard, borderTop: `3px solid ${accent || "#7f1d1d"}` }}>
    <p style={styles.summaryLabel}>{label}</p>
    <h2 style={styles.summaryValue}>{value}</h2>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div style={styles.infoItem}>
    <div style={styles.infoLabel}>{label}</div>
    <div style={styles.infoValue}>{value ?? "—"}</div>
  </div>
);

const getScoreBadgeStyle = (score) => {
  if (score >= 80) return { bg: "#dcfce7", color: "#14532d", text: score >= 95 ? "Distinction 1" : score >= 90 ? "Distinction 2" : "Credit 3" };
  if (score >= 70) return { bg: "#dbeafe", color: "#1e3a8a", text: "Credit 4" };
  if (score >= 60) return { bg: "#fef9c3", color: "#713f12", text: "Credit 5" };
  if (score >= 50) return { bg: "#ffedd5", color: "#7c2d12", text: "Pass 6" };
  if (score >= 40) return { bg: "#fee2e2", color: "#7f1d1d", text: "Pass 7" };
  return { bg: "#f1f5f9", color: "#64748b", text: "Referred" };
};

/* ================= MAIN COMPONENT ================= */
export default function StudentReport() {
  useReportGlobalStyles();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admissionNo = user.admissionNo || user.id;

  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const reportRef = useRef();

  /* ================= LOAD (unchanged) ================= */
  useEffect(() => {
    const load = async () => {
      try {
        const [m, s, st] = await Promise.all([
          API.get("/student/marks", { params: { studentId: admissionNo } }),
          API.get("/subjects"),
          API.get("/students"),
        ]);
        setMarks(m.data || []);
        setSubjects(s.data || []);
        setStudents(st.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [admissionNo]);

  /* ================= SCREEN SCALE =================
     Displays the A4 sheet at ~95% of the viewport on screen.
     Purely visual (CSS transform on a wrapper); the captured
     node keeps its true 210mm × 297mm layout box, and is reset
     to scale(1) during export so the PDF is never distorted. */
  const [screenScale, setScreenScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

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

  /* ================= STUDENT (unchanged) ================= */
  const student = useMemo(() => {
    return students.find((s) => s.id === admissionNo) || {};
  }, [students, admissionNo]);

  const studentClass = student?.class || student?.className || "NOT ASSIGNED";
  const yearOfStudy = Number(student?.yearOfStudy || 0);
  const programmeLabel = yearOfStudy === 1 ? "DTE 1" : yearOfStudy === 2 ? "DTE 2" : "DTE";

  /* ================= POSITION (unchanged) ================= */
  const position = useMemo(() => {
    if (!students.length) return "-";
    const ranked = students
      .map((s) => {
        const sm = marks.filter((m) => m.studentId === s.id);
        const scores = sm.map((x) => Number(x.percentage || 0));
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { id: s.id, avg };
      })
      .sort((a, b) => b.avg - a.avg);
    return ranked.findIndex((r) => r.id === admissionNo) + 1;
  }, [students, marks, admissionNo]);

  /* ================= ANALYTICS (unchanged) ================= */
  const analytics = useMemo(() => {
    const scores = marks.map((m) => Number(m.percentage)).filter((v) => !isNaN(v));
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = scores.length > 0 ? total / scores.length : 0;
    return {
      total,
      avg: Math.round(avg),
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
      grade: getKnecGrade(avg),
      result: getOverallResult(total),
    };
  }, [marks]);

  /* ================= SUBJECT MAP (unchanged) ================= */
  const subjectMap = useMemo(() => {
    const map = {};
    marks.forEach((m) => { map[m.subjectName] = Number(m.percentage); });
    return subjects.map((s) => ({ subject: s.name, code: s.code, score: map[s.name] ?? null }));
  }, [marks, subjects]);

  const chartData = subjectMap.map((s) => ({ subject: s.subject, score: s.score ?? 0 }));

  const highestSubject = useMemo(() => {
    const valid = subjectMap.filter((s) => s.score !== null);
    return valid.reduce((max, cur) => (cur.score > (max?.score || 0) ? cur : max), null);
  }, [subjectMap]);

  const lowestSubject = useMemo(() => {
    const valid = subjectMap.filter((s) => s.score !== null);
    return valid.reduce((min, cur) => (cur.score < (min?.score || 999) ? cur : min), null);
  }, [subjectMap]);

  /* ================= PDF DOWNLOAD =================
     Same algorithm as before (capture → single A4 image → paginate
     if content overflows one page). Screen display now runs at a
     scaled-down size for readability, so export first flips the
     sheet back to true scale(1), waits two animation frames for
     layout to settle, captures, then restores the screen scale. */
  const downloadPDF = async () => {
    setIsExporting(true);
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    const input = reportRef.current;
    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight,
      scrollY: -window.scrollY,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, "", "FAST");
    heightLeft -= pdfHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, "", "FAST");
      heightLeft -= pdfHeight;
    }
    pdf.save(`${user.name}_ASUMBI_RESULT_SLIP.pdf`);

    setIsExporting(false);
  };

  /* ================= PRINT (unchanged) ================= */
  const printSlip = () => { window.print(); };

  /* ================= LOADING ================= */
  if (loading)
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading result slip…</p>
      </div>
    );

  /* ================= UI ================= */
  return (
    <div style={styles.page} className="sr-page-chrome">

      {/* ── TOP BAR (screen only) ── */}
      <div style={styles.topBar} className="no-print">
        <div>
          <h2 style={styles.portalTitle}>ASUMBI SMART CAMPUS SYSTEM</h2>
          <p style={styles.portalSub}>Official Academic Result Slip Portal</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={printSlip} className="sr-btn" style={styles.printBtn}>
            <IconPrinter size={15} /> Print Slip
          </button>
          <button onClick={downloadPDF} className="sr-btn" style={styles.downloadBtn}>
            <IconDownload size={15} /> Export PDF
          </button>
        </div>
      </div>

      <p style={styles.scrollHint} className="no-print sr-scroll-hint">
        ↔ Scroll to view the full A4 slip
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
            className="sr-sheet sr-card"
          >

            {/* Faint diagonal authenticity watermark */}
            <div style={styles.watermark} aria-hidden="true">OFFICIAL COPY</div>

            {/* ══════════════════════════════════════════════
                OFFICIAL HEADER BAND
            ══════════════════════════════════════════════ */}
            <div style={styles.headerBand}>
              <div style={styles.headerBandInner}>
                {/* Crest / Logo */}
                <div style={styles.crestBox}>
                  <IconCap size={28} style={{ color: "#fff" }} />
                </div>

                {/* Centre text */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={styles.collegeTagline}>REPUBLIC OF KENYA</p>
                  <h1 style={styles.collegeName}>ASUMBI TEACHERS TRAINING COLLEGE</h1>
                  <p style={styles.collegeAddress}>P.O. Box 22 – 40305, Asumbi | Tel: 059-22001 | knec@asumbi.ac.ke</p>
                  <div style={styles.slipTitleBox}>
                    <p style={styles.slipTitle}>
                      PROVISIONAL RESULTS SLIP — TERM 1, NOVEMBER 2025
                    </p>
                    <p style={styles.slipSubtitle}>
                      Internal Formative Assessments (IFA) · Diploma in Teacher Education ({programmeLabel})
                    </p>
                  </div>
                </div>

                {/* Right block */}
                <div style={styles.headerMeta}>
                  <div style={styles.metaRow}><span style={styles.metaKey}>Date</span><span style={styles.metaVal}>{new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
                  <div style={styles.metaRow}><span style={styles.metaKey}>Class</span><span style={styles.metaVal}>{studentClass}</span></div>
                  <div style={styles.metaRow}><span style={styles.metaKey}>Year</span><span style={styles.metaVal}>{yearOfStudy || "N/A"}</span></div>
                  <div style={{ ...styles.metaRow, marginTop: 4 }}>
                    <span style={styles.positionCircle}>#{position}</span>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 8.5, color: "#64748b", textAlign: "center" }}>Class Position</p>
                </div>
              </div>
              <div style={styles.headerBandFoot} />
            </div>

            {/* ══════════════════════════════════════════════
                STUDENT INFORMATION GRID
            ══════════════════════════════════════════════ */}
            <div style={styles.section}>
              <div style={styles.sectionLabelBar}>
                <span style={styles.sectionLabel}>CANDIDATE INFORMATION</span>
              </div>
              <div style={styles.infoGrid}>
                <InfoItem label="Centre Code" value="ASB-214" />
                <InfoItem label="Admission Number" value={admissionNo} />
                <InfoItem label="Class / Stream" value={studentClass} />
                <InfoItem label="Gender" value={user.gender || "N/A"} />
                <InfoItem label="Student Name" value={user.name} />
                <InfoItem label="Assessment Reference" value="IFA-2025-0012" />
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                PERFORMANCE SUMMARY CARDS
            ══════════════════════════════════════════════ */}
            <div style={styles.section}>
              <div style={styles.sectionLabelBar}>
                <span style={styles.sectionLabel}>PERFORMANCE SUMMARY</span>
              </div>
              <div style={styles.summaryGrid}>
                <Card label="Total Marks" value={analytics.total || 0} accent="#7f1d1d" />
                <Card label="Average Score" value={`${analytics.avg}%`} accent="#1d4ed8" />
                <Card label="Overall Result" value={analytics.result} accent="#15803d" />
                <Card label="Class Position" value={`#${position}`} accent="#b45309" />
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                RESULTS TABLE
            ══════════════════════════════════════════════ */}
            <div style={styles.section}>
              <div style={styles.sectionLabelBar}>
                <span style={styles.sectionLabel}>EXAMINATION RESULTS BREAKDOWN</span>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{ ...styles.th, width: "5%" }}>Code</th>
                    <th style={{ ...styles.th, textAlign: "left", width: "38%" }}>Learning Area</th>
                    <th style={{ ...styles.th, width: "5%" }}>Score (%)</th>
                    <th style={{ ...styles.th, width: "5%" }}>Out Of</th>
                    <th style={{ ...styles.th, width: "5%" }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectMap.map((s, i) => {
                    const valid = s.score !== null && s.score !== undefined;
                    const badge = valid ? getScoreBadgeStyle(s.score) : null;
                    return (
                      <tr key={s.code || i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ ...styles.td, color: "#64748b", fontSize: 8 }}>{s.code || `L/A-${i + 1}`}</td>
                        <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>{s.subject}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>
                          {valid ? (
                            <span style={{
                              fontWeight: 700,
                              fontSize: 8,
                              color: s.score >= 70 ? "#15803d" : s.score >= 50 ? "#b45309" : "#b91c1c"
                            }}>{s.score}%</span>
                          ) : <span style={styles.crnmTag}>CRNM</span>}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#64748b" }}>100</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>
                          {valid ? (
                            <span style={{
                              background: badge.bg,
                              color: badge.color,
                              padding: "3px 12px",
                              borderRadius: 20,
                              fontWeight: 600,
                              fontSize: 8,
                              display: "inline-block",
                              letterSpacing: "0.02em",
                            }}>{badge.text}</span>
                          ) : <span style={styles.crnmTag}>CRNM</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL ROW */}
                  <tr style={styles.totalRow}>
                    <td style={styles.td} colSpan={2}>AGGREGATE TOTAL / MEAN</td>
                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#93c5fd" }}>{analytics.total}%</td>
                    <td style={{ ...styles.td, textAlign: "center" }}>{subjectMap.length * 100}</td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={{
                        background: "#dbeafe",
                        color: "#1e3a8a",
                        padding: "3px 12px",
                        borderRadius: 20,
                        fontWeight: 700,
                        fontSize: 8,
                        display: "inline-block",
                      }}>{analytics.grade.label}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ══════════════════════════════════════════════
                REMARKS & APPROVAL
            ══════════════════════════════════════════════ */}
            <div style={styles.section}>
              <div style={styles.sectionLabelBar}>
                <span style={styles.sectionLabel}>OFFICIAL AUTHORISATION</span>
              </div>
              <div style={styles.authGrid}>

                {/* Lecturer Remarks */}
                <div style={styles.authCard}>
                  <p style={styles.authCardTitle}>Lecturer Remarks</p>
                  <div style={styles.remarksBox}>
                    <p style={{ color: "#94a3b8", fontSize: 8, margin: 0 }}>Class Lecturer's CBE Remarks</p>
                  </div>
                  <div style={styles.sigGrid}>
                    <div style={styles.sigItem}><p style={styles.sigLabel}>Lecturer Name</p><div style={styles.sigLine} /></div>
                    <div style={styles.sigItem}><p style={styles.sigLabel}>Signature</p><div style={styles.sigLine} /></div>
                    <div style={styles.sigItem}><p style={styles.sigLabel}>Date</p><div style={styles.sigLine} /></div>
                  </div>
                </div>

                {/* Approval */}
                <div style={styles.authCard}>
                  <p style={styles.authCardTitle}>Approved By</p>
                  <div style={{ padding: "4px 0" }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Kaunda, K.M</p>
                    <p style={{ margin: "0 0 2px", color: "#64748b", fontSize: 12 }}>Dean of Curriculum</p>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#334155" }}>For: Chief Principal</p>
                  </div>
                  <div style={styles.sigGrid}>
                    <div style={styles.sigItem}><p style={styles.sigLabel}>Signature</p><div style={styles.sigLine} /></div>
                    <div style={styles.sigItem}><p style={styles.sigLabel}>Official Stamp</p><div style={styles.stampBox} /></div>
                  </div>
                </div>

              </div>
            </div>

            {/* ══════════════════════════════════════════════
                FOOTER + QR
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
                    })}
                    size={64}
                  />
                </div>
                <p style={{ fontSize: 8.5, color: "#94a3b8", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                  <IconScan size={11} style={{ color: "#94a3b8" }} /> Scan to verify
                </p>
              </div>
              <div style={styles.footerCenter}>
                <p style={styles.footerDisclaimer}>
                  This is a provisional result slip and is subject to confirmation by the Kenya National Examinations Council (KNEC).
                  It is computer-generated and valid without a handwritten signature unless otherwise indicated.
                </p>
                <p style={styles.footerCredits}>
                  Designed by: Jobunga, G.B — Assessments Officer | For: Chief Principal, Asumbi TTC
                </p>
              </div>
              <div style={styles.footerRight}>
                <div style={styles.resultRibbon}>
                  <p style={styles.ribbonLabel}>Overall Result</p>
                  <p style={styles.ribbonValue}>{analytics.result}</p>
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
   Original maroon/blue/green/amber colour palette restored.
   Spacing, font sizes, table column widths, header dimensions,
   and the removed performance-chart section reflect the layout
   edits made on top of the design, kept intact here.
═══════════════════════════════════════════════════════════ */
const styles = {
  /* ── Page shell (screen chrome only, stripped for print) ── */
  page: {
    background: "#0b1220",
    minHeight: "100%",
    width: "100%",
    padding: "18px 16px 32px",
    color: "#fff",
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
    color: "#f1f5f9",
    letterSpacing: "0.04em",
  },
  portalSub: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 13,
  },
  printBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "transparent",
    color: "#e2e8f0",
    padding: "9px 16px",
    border: "1px solid #334155",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "#15803d",
    color: "#fff",
    padding: "9px 16px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  scrollHint: {
    display: "none",
    fontSize: 12,
    color: "#64748b",
    margin: "0 4px 8px",
  },

  /* ── A4 stage: centers the (scaled) sheet ── */
  a4Stage: {
    display: "flex",
    justifyContent: "center",
    overflowX: "auto",
    padding: "4px 0 16px",
  },

  /* ── The literal A4 sheet — 210mm × 297mm, identical for
       screen preview, browser print, and PDF export ── */
  reportCard: {
    width: "210mm",
    minHeight: "297mm",
    flexShrink: 0,
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 3,
    overflow: "hidden",
    boxSizing: "border-box",
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
    border: "1px solid #e5e0d8",
  },

  watermark: {
    position: "absolute",
    top: "42%",
    left: "50%",
    transform: "translate(-50%,-50%) rotate(-32deg)",
    fontSize: 64,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "rgba(127,29,29,0.04)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 0,
  },

  /* ── Header band (flat fill, no gradient) ── */
  headerBand: {
    position: "relative",
    zIndex: 1,
  },
  headerBandInner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "2mm 3mm 2px",
    background: "#7f1d1d",
  },
  headerBandFoot: {
    height: 3,
    background: "#b45309",
  },
  crestBox: {
    width: 50,
    height: 30,
    minWidth: 50,
    borderRadius: "100%",
    background: "rgba(255,255,255,0.14)",
    border: "2px solid rgba(255,255,255,0.32)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  collegeTagline: {
    margin: "0 0 2px",
    fontSize: 9.5,
    letterSpacing: "0.18em",
    color: "#fecaca",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  collegeName: {
    margin: "0 0 3px",
    fontSize: 18,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "0.015em",
    lineHeight: 1.15,
    fontFamily: "'Playfair Display', 'Georgia', serif",
  },
  collegeAddress: {
    margin: "0 0 8px",
    fontSize: 10.5,
    color: "#fca5a5",
  },
  slipTitleBox: {
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 6,
    padding: "6px 12px",
  },
  slipTitle: {
    margin: 0,
    fontSize: 11.5,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  slipSubtitle: {
    margin: "2px 0 0",
    fontSize: 10.5,
    color: "#fca5a5",
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
    marginBottom: 4,
  },
  metaKey: {
    fontSize: 10.5,
    color: "#fca5a5",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  metaVal: {
    fontSize: 8,
    color: "#fff",
    fontWeight: 700,
    background: "rgba(255,255,255,0.12)",
    padding: "2px 7px",
    borderRadius: 4,
  },
  positionCircle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#fff",
    color: "#7f1d1d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 14,
    border: "3px solid rgba(255,255,255,0.55)",
    letterSpacing: "-0.02em",
  },

  /* ── Sections ── */
  section: {
    position: "relative",
    zIndex: 1,
    padding: "0 14mm 10px",
    marginTop: 1,
  },
  sectionLabelBar: {
    borderLeft: "4px solid #7f1d1d",
    paddingLeft: 9,
    marginBottom: 1,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#7f1d1d",
    textTransform: "uppercase",
  },

  /* ── Info grid ── */
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 2,
  },
  infoItem: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  infoLabel: {
    background: "#f8fafc",
    padding: "1px 4px",
    fontSize: 9.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #e2e8f0",
  },
  infoValue: {
    padding: "1px 4px",
    fontSize: 10,
    fontWeight: 600,
    color: "#0f172a",
  },

  /* ── Summary cards ── */
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 2,
  },
  summaryCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "1px 1.2px",
    textAlign: "center",
  },
  summaryLabel: {
    margin: "0 0 5px",
    fontSize: 8,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  summaryValue: {
    margin: 0,
    fontSize: 8,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 0.5,
  },

  /* ── Chart (kept for potential reuse; section removed from markup) ── */
  chartWrap: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "1px 1.2px 1px",
  },

  /* ── Table ── */
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 8,
    tableLayout: "fixed",
  },
  theadRow: {
    background: "#0f172a",
  },
  th: {
    padding: "1px 3px",
    fontSize: 9.5,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    textAlign: "center",
    borderBottom: "2px solid #1e293b",
  },
  td: {
    padding: "6px 11px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: 8,
    textAlign: "center",
    verticalAlign: "middle",
  },
  crnmTag: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "3px 9px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 5,
  },
  totalRow: {
    background: "#0f172a",
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: 8,
  },

  /* ── Auth grid ── */
  authGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 2,
  },
  authCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 14px",
  },
  authCardTitle: {
    margin: "0 0 9px",
    fontSize: 10.5,
    fontWeight: 800,
    color: "#7f1d1d",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  remarksBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    minHeight: 30,
    padding: 10,
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
  },
  sigGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 2,
    marginTop: 2,
  },
  sigItem: { textAlign: "center" },
  sigLabel: {
    margin: "0 0 5px",
    fontSize: 9.5,
    color: "#64748b",
    fontWeight: 600,
  },
  sigLine: {
    borderBottom: "1px solid #334155",
    width: "80%",
    margin: "0 auto",
  },
  stampBox: {
    width: "70%",
    height: 2,
    margin: "0 auto",
    border: "1.5px dashed #94a3b8",
    borderRadius: 4,
  },

  /* ── Footer ── */
  footerSection: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "flex-start",
    gap: 2,
    padding: "12px 14mm 12mm",
    borderTop: "2px solid #7f1d1d",
    marginTop: 1,
  },
  footerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 74,
  },
  qrFrame: {
    padding: 7,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
  },
  footerCenter: {
    flex: 1,
  },
  footerDisclaimer: {
    margin: "0 0 6px",
    fontSize: 9.5,
    color: "#64748b",
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  footerCredits: {
    margin: 0,
    fontSize: 9.5,
    color: "#94a3b8",
    fontWeight: 600,
  },
  footerRight: {
    minWidth: 100,
  },
  resultRibbon: {
    background: "#7f1d1d",
    borderRadius: 8,
    padding: "8px 12px",
    textAlign: "center",
  },
  ribbonLabel: {
    margin: "0 0 3px",
    fontSize: 8.5,
    color: "#fca5a5",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  ribbonValue: {
    margin: 0,
    fontSize: 10.5,
    fontWeight: 900,
    color: "#fff",
    lineHeight: 1.3,
  },

  /* ── Loading ── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40vh",
    gap: 14,
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #7f1d1d",
    borderRadius: "50%",
    animation: "sr-spin 0.9s linear infinite",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
  },
};