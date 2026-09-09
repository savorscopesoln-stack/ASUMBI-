import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  ArrowLeft, Loader2, AlertTriangle, FileQuestion, MessageSquareText,
} from "lucide-react";

/* ─── shared design-token stylesheet, plus the "physical exam script"
   treatment: a serif face for printed paper text, a handwriting face
   for the red-pen marks, ruled-paper backgrounds, and print rules.
   Everything no-ops if #dash-tokens is already mounted elsewhere. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Caveat:wght@600;700&display=swap');

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
      --ink: #C41E3A;
      --paper: #FFFDF8;
      --paper-line: #EAE3D3;
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
      --ink: #FF6B85;
      --paper: #1A1D24;
      --paper-line: #2A2E38;
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    @keyframes mp-draw { from { stroke-dashoffset: 1px; } to { stroke-dashoffset: 0; } }
    .mp-mark path, .mp-mark circle, .mp-mark ellipse {
      stroke-dasharray: 1px;
      stroke-dashoffset: 1px;
      animation: mp-draw 0.5s ease-out forwards;
    }
    .mp-mark-cross path:nth-child(2) { animation-delay: 0.22s; }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    /* ── the paper sheet itself ── */
    .exam-paper {
      background: var(--paper);
      border: 1px solid var(--border);
      border-radius: 3px;
      max-width: 780px;
      margin: 0 auto;
      padding: 44px 56px 52px;
      box-shadow: 0 1px 2px rgba(16,24,40,0.05), 0 18px 40px -20px rgba(16,24,40,0.35);
      font-family: 'Lora', Georgia, serif;
      color: var(--text);
    }

    .exam-header-top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      align-items: start;
    }
    .exam-title { margin: 0; font-size: 26px; font-weight: 600; line-height: 1.3; letter-spacing: -0.01em; }
    .exam-meta { margin: 10px 0 0; font-size: 13.5px; color: var(--text-secondary); line-height: 1.7; }
    .exam-meta span { display: block; }
    .exam-grade-line { margin-top: 12px; font-size: 12.5px; font-weight: 600; }
    .examiner-note {
      font-family: 'Caveat', cursive; font-size: 17px; font-weight: 600; color: var(--ink);
      margin-top: 6px; transform: rotate(-2deg); display: block;
    }
    .exam-score-block { display: flex; flex-direction: column; align-items: center; justify-self: end; }

    .exam-rule {
      border: none; border-top: 1px solid var(--border); margin: 28px 0 20px;
    }
    .exam-rule-thick {
      border: none; border-top: 2px solid var(--text); opacity: 0.15; margin: 30px 0 22px;
    }

    .exam-section-label {
      text-align: center; font-style: italic; font-size: 13px; color: var(--text-muted);
      display: flex; align-items: center; gap: 12px; margin-bottom: 26px;
    }
    .exam-section-label::before, .exam-section-label::after {
      content: ""; flex: 1; height: 1px; background: var(--border);
    }

    .exam-question { padding: 22px 0; border-bottom: 1px solid var(--border); }
    .exam-question:last-child { border-bottom: none; padding-bottom: 4px; }
    .exam-q-row { display: flex; gap: 18px; align-items: flex-start; }
    .exam-q-headline { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .exam-q-number { font-size: 14px; font-weight: 600; font-style: italic; color: var(--text-secondary); }
    .exam-q-text { margin: 0; font-size: 15px; line-height: 1.65; color: var(--text); }
    .exam-q-images { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .exam-q-image { width: 130px; height: 96px; object-fit: cover; border: 1px solid var(--border); }
    .exam-q-marks { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 56px; }
    .exam-marks-fraction {
      font-family: 'Caveat', cursive; font-size: 20px; font-weight: 700; color: var(--ink);
      transform: rotate(-3deg); display: inline-block;
    }
    .exam-marks-circled { font-family: 'Caveat', cursive; font-size: 16px; font-weight: 700; color: var(--ink); }

    .exam-options { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
    .exam-option { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text); }
    .exam-option-label { font-weight: 600; color: var(--text-secondary); min-width: 16px; }
    .exam-option-text { flex: 1; }
    .exam-mark-inline { display: inline-flex; align-items: center; flex-shrink: 0; }
    .exam-no-answer { font-size: 13px; font-style: italic; color: var(--text-muted); margin-top: 4px; }

    .exam-essay-label { font-size: 11.5px; font-style: italic; color: var(--text-muted); margin: 12px 0 6px; }
    .exam-essay-lines {
      padding: 4px 2px 10px;
      background-image: repeating-linear-gradient(
        to bottom, transparent, transparent calc(1.9em - 1px),
        var(--paper-line) calc(1.9em - 1px), var(--paper-line) 1.9em
      );
    }
    .exam-essay-text { margin: 0; font-size: 14.5px; line-height: 1.9em; color: var(--text); white-space: pre-wrap; }
    .examiner-remark {
      font-family: 'Caveat', cursive; font-size: 17px; color: var(--ink); margin-top: 10px;
      display: flex; align-items: flex-start; gap: 6px; transform: rotate(-1deg); line-height: 1.4;
    }

    @media (max-width: 820px) {
      .exam-paper { padding: 32px 22px 40px; }
      .exam-header-top { grid-template-columns: 1fr; }
      .exam-score-block { justify-self: start; margin-top: 20px; }
      .exam-title { font-size: 22px; }
    }
    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }

    @media print {
      body { background: #fff !important; }
      .no-print { display: none !important; }
      .exam-paper {
        box-shadow: none !important; border: none !important; max-width: 100% !important;
        padding: 0 !important; margin: 0 !important;
      }
      .exam-question { break-inside: avoid; }
      .dash-main { padding: 0 !important; background: #fff !important; }
    }
  `;
  document.head.appendChild(el);
};

const gradeFor = (pct) => {
  if (pct === null) return { label: "—", bg: "var(--bg)", fg: "var(--text-muted)" };
  if (pct >= 75) return { label: "DISTINCTION", bg: "var(--success-tint)", fg: "var(--success)" };
  if (pct >= 60) return { label: "CREDIT", bg: "var(--info-tint)", fg: "var(--info)" };
  if (pct >= 40) return { label: "PASS", bg: "var(--warning-tint)", fg: "var(--warning)" };
  return { label: "REFER", bg: "var(--destructive-tint)", fg: "var(--destructive)" };
};

const remarkFor = (pct) => {
  if (pct === null) return "";
  if (pct >= 75) return "Excellent work!";
  if (pct >= 60) return "Good effort.";
  if (pct >= 40) return "Fair — room to grow.";
  return "See me.";
};

/* ═══════════════════════════════ RED-PEN MARKS ═══════════════════════════════
   Hand-drawn SVG so the grading reads as "marked with a pen", not a UI icon:
   a slightly crooked tick, a slightly crooked cross, and a loose double-loop
   circle for scores — the same three marks every graded script actually has. */

function HandTick({ size = 28, rotate = -4 }) {
  return (
    <svg className="mp-mark" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M6 21 L16 31 L35 7"
        stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round"
        transform={`rotate(${rotate} 20 19)`}
      />
    </svg>
  );
}

function HandCross({ size = 28, rotate = -3 }) {
  return (
    <svg className="mp-mark mp-mark-cross" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M7 8 L33 32" stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" transform={`rotate(${rotate} 20 20)`} />
      <path d="M33 9 L7 31" stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" transform={`rotate(${rotate} 20 20)`} />
    </svg>
  );
}

/* A loose, slightly imperfect double-circle — the way a teacher actually
   circles a tally, not a perfect CSS border-radius. Content is centered on
   top of the SVG via the wrapping div. */
function HandCircle({ children, size = 118, strokeWidth = 4, rotate = -2 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center", flexShrink: 0, transform: `rotate(${rotate}deg)` }}>
      <svg
        className="mp-mark"
        width={size} height={size} viewBox="0 0 120 120"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <path
          d="M62 10 C90 8 112 30 110 60 C113 90 88 111 59 110 C31 113 9 89 10 60 C8 32 33 9 62 10 Z"
          fill="none" stroke="var(--ink)" strokeWidth={strokeWidth} strokeLinecap="round"
        />
        <path
          d="M60 14 C86 13 108 34 106 60"
          fill="none" stroke="var(--ink)" strokeWidth={strokeWidth * 0.8} strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
      <div style={{ position: "relative", textAlign: "center", transform: `rotate(${-rotate}deg)` }}>{children}</div>
    </div>
  );
}

export default function StudentMarkedPaper() {
  injectStyles();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [released, setReleased] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/e-assessments/results/${id}`);
      setSubmission(res.data?.submission || null);
      setReleased(!!res.data?.released);
      setQuestions(res.data?.questions || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load your result");
    } finally {
      setLoading(false);
    }
  };

  const totalMarks = Number(submission?.total_marks) || 0;
  const score = Number(submission?.score) || 0;
  const pct = totalMarks ? Math.round((score / totalMarks) * 100) : null;
  const grade = gradeFor(pct);

  if (loading) {
    return (
      <main className="dash-main" style={D.main}>
        <div style={D.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading your marked paper…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dash-main" style={D.main}>
        <BackBtn onClick={() => navigate("/student/e-assessments")} />
        <div style={D.errorBanner} role="alert">
          <AlertTriangle size={16} color="var(--destructive)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={load} style={D.retryBtn}>Retry</button>
        </div>
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="dash-main" style={D.main}>
        <BackBtn onClick={() => navigate("/student/e-assessments")} />
        <section style={D.panel}>
          <div style={D.emptyState}>
            <FileQuestion size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>You haven't taken this assessment yet.</div>
          </div>
        </section>
      </main>
    );
  }

  if (!released) {
    return (
      <main className="dash-main" style={D.main}>
        <BackBtn onClick={() => navigate("/student/e-assessments")} />
        <section style={D.panel}>
          <div style={D.emptyState}>
            <FileQuestion size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>Your paper has been submitted and is being marked.</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Come back once your results have been released to see the full marked paper.
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dash-main" style={D.main}>
      <div className="no-print">
        <BackBtn onClick={() => navigate("/student/e-assessments")} />
      </div>

      <div className="exam-paper">
        {/* ── Cover header — title, subject/teacher line, and the
            examiner's circled final tally, right at the top ── */}
        <div className="exam-header-top">
          <div style={{ minWidth: 0 }}>
            <h1 className="exam-title">{submission.assessment_title || "Assessment"}</h1>
            <div className="exam-meta">
              <span>Subject: {submission.assessment_subject || "—"}</span>
              <span>Teacher: {submission.teacher_name || "—"}</span>
            </div>
            <div className="exam-grade-line" style={{ color: grade.fg }}>
              {grade.label}{pct !== null ? ` (${pct}%)` : ""}
            </div>
            {remarkFor(pct) && <span className="examiner-note">{remarkFor(pct)}</span>}
          </div>

          <div className="exam-score-block">
            <HandCircle size={130}>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 34, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                {score}<span style={{ fontSize: 18, opacity: 0.75 }}>/{totalMarks || "—"}</span>
              </div>
            </HandCircle>
          </div>
        </div>

        <hr className="exam-rule-thick" />
        <div className="exam-section-label">Answer script</div>

        {questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} index={idx + 1} />
        ))}

        {questions.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
            No question breakdown is available for this paper.
          </div>
        )}
      </div>
    </main>
  );
}

/* ── header back button ── */
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={D.backBtn}>
      <ArrowLeft size={15} /> Back to Assessments
    </button>
  );
}

/* ── one question, with the student's answer overlaid against the
   correct one for MCQ, or the essay text + teacher remarks for essay ── */
function QuestionCard({ q, index }) {
  const isEssay = q.question_type === "essay";
  const correctFlag = isEssay ? (q.marks_awarded ?? 0) >= q.max_marks : !!q.is_correct;
  const attempted = isEssay ? !!(q.essay_answer && q.essay_answer.trim()) : !!q.selected_answer;

  return (
    <div className="exam-question">
      <div className="exam-q-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="exam-q-headline">
            <span className="exam-q-number">Question {index}</span>
            {!isEssay && attempted && (correctFlag ? <HandTick size={24} /> : <HandCross size={24} />)}
          </div>

          <p className="exam-q-text">{q.question_text}</p>

          {q.images?.length > 0 && (
            <div className="exam-q-images">
              {q.images.map((img) => (
                <img key={img.id} src={resolveFileUrl(img.image_url)} alt="" className="exam-q-image" />
              ))}
            </div>
          )}

          {!isEssay ? (
            <ul className="exam-options">
              {(q.options || []).map((opt) => {
                const isCorrectOpt = opt.option_label === q.correct_answer;
                const isSelectedOpt = opt.option_label === q.selected_answer;
                return (
                  <li key={opt.option_label} className="exam-option">
                    <span className="exam-option-label">{opt.option_label}.</span>
                    <span className="exam-option-text">{opt.option_text}</span>
                    {isCorrectOpt && (
                      <span className="exam-mark-inline"><HandTick size={19} rotate={-6} /></span>
                    )}
                    {isSelectedOpt && !isCorrectOpt && (
                      <span className="exam-mark-inline"><HandCross size={19} rotate={5} /></span>
                    )}
                  </li>
                );
              })}
              {!q.selected_answer && (
                <div className="exam-no-answer">You did not answer this question.</div>
              )}
            </ul>
          ) : (
            <>
              <div className="exam-essay-label">Your answer</div>
              <div className="exam-essay-lines">
                <p className="exam-essay-text">
                  {q.essay_answer?.trim() ? q.essay_answer : <em style={{ color: "var(--text-muted)" }}>Not answered</em>}
                </p>
              </div>
              {q.remarks && (
                <div className="examiner-remark">
                  <MessageSquareText size={14} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span>{q.remarks}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="exam-q-marks">
          {isEssay ? (
            <HandCircle size={52} strokeWidth={3} rotate={4}>
              <span className="exam-marks-circled">{q.marks_awarded ?? 0}/{q.max_marks}</span>
            </HandCircle>
          ) : (
            <span className="exam-marks-fraction">{q.marks_awarded ?? 0}/{q.max_marks}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════ STYLES ════════════════════════════════
   Only the page-chrome bits (loading/error/empty states, back button, and
   the outer <main> wrapper) stay as plain inline style objects — the exam
   paper itself is driven by the .exam-* classes above so print rules and
   :last-child dividers actually work. */
const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  loadingState: {
    display: "flex", alignItems: "center", gap: 10, padding: "36px 0",
    color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600,
  },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 10, background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, color: "var(--text)", marginBottom: 18,
  },
  retryBtn: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 6, background: "transparent",
    border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 8,
    padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 18,
    fontFamily: "inherit",
  },
  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "20px 22px", boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5,
    fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center",
  },
};