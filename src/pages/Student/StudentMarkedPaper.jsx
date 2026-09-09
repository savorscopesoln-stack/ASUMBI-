import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  ArrowLeft, Loader2, AlertTriangle, FileQuestion, MessageSquareText,
} from "lucide-react";

/* ─── shared design-token stylesheet, plus a couple of things unique
   to this "physical exam script" page: a handwriting face for the
   red-pen marks, and the wobble/draw-in keyframes those marks use.
   Everything else stays a no-op if already mounted elsewhere. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap');

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
      --ink: #FF5C77;
      --paper: #171A21;
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    @keyframes mp-draw { from { stroke-dashoffset: 1px; } to { stroke-dashoffset: 0; } }
    .mp-mark path, .mp-mark circle, .mp-mark ellipse {
      stroke-dasharray: 1px;
      stroke-dashoffset: 1px;
      animation: mp-draw 0.55s ease-out forwards;
    }
    .mp-mark-cross path:nth-child(2) { animation-delay: 0.28s; }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .mp-cover-grid { grid-template-columns: 1fr !important; }
      .mp-cover-score { justify-self: start !important; margin-top: 18px; }
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

function HandTick({ size = 30 }) {
  return (
    <svg className="mp-mark" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M6 21 L16 31 L35 7"
        stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round"
        transform="rotate(-4 20 19)"
      />
    </svg>
  );
}

function HandCross({ size = 30 }) {
  return (
    <svg className="mp-mark mp-mark-cross" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M7 8 L33 32" stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" transform="rotate(-3 20 20)" />
      <path d="M33 9 L7 31" stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" transform="rotate(-3 20 20)" />
    </svg>
  );
}

/* A loose, slightly imperfect double-circle — the way a teacher actually
   circles a tally, not a perfect CSS border-radius. Content is centered on
   top of the SVG via the wrapping div. */
function HandCircle({ children, size = 118, strokeWidth = 4 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center", flexShrink: 0 }}>
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
      <div style={{ position: "relative", textAlign: "center" }}>{children}</div>
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
      <BackBtn onClick={() => navigate("/student/e-assessments")} />

      {/* ── Cover page — the front sheet of the script: title, subject/
          teacher line, and the examiner's circled final tally ── */}
      <section style={D.cover} className="dash-card">
        <div className="mp-cover-grid" style={D.coverGrid}>
          <div style={{ minWidth: 0 }}>
            <div style={D.coverEyebrow}>Marked Paper</div>
            <h1 style={D.coverTitle}>{submission.assessment_title || "Assessment"}</h1>
            <p style={D.coverMeta}>
              {submission.assessment_subject || "—"} · Marked by {submission.teacher_name || "your teacher"}
            </p>
            <span style={{ ...D.gradeBadge, background: grade.bg, color: grade.fg }}>{grade.label}</span>
          </div>

          <div className="mp-cover-score" style={D.coverScoreWrap}>
            <HandCircle size={128}>
              <div style={D.coverScoreValue}>{score}<span style={D.coverScoreOutOf}>/{totalMarks || "—"}</span></div>
              {pct !== null && <div style={D.coverScorePct}>{pct}%</div>}
            </HandCircle>
            {remarkFor(pct) && <div style={D.examinerNote}>{remarkFor(pct)}</div>}
          </div>
        </div>
      </section>

      {/* ── Question-by-question breakdown — the answer script itself ── */}
      <div style={D.scriptDivider}>
        <span style={D.scriptDividerLine} />
        <span>Answer Script</span>
        <span style={D.scriptDividerLine} />
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} index={idx + 1} />
        ))}
        {questions.length === 0 && (
          <section style={D.panel}>
            <div style={D.emptyState}>
              <FileQuestion size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
              <div>No question breakdown is available for this paper.</div>
            </div>
          </section>
        )}
      </section>
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
    <section style={D.qCard} className="dash-card">
      <div style={D.qHeader}>
        <div style={D.qNumber}>Q{index}</div>
        <div style={{ flex: 1 }}>
          <div style={D.qText}>{q.question_text}</div>
          {q.images?.length > 0 && (
            <div style={D.qImages}>
              {q.images.map((img) => (
                <img key={img.id} src={resolveFileUrl(img.image_url)} alt="" style={D.qImage} />
              ))}
            </div>
          )}
        </div>

        {/* the actual red-pen mark — a tick/cross for MCQ (it's binary),
            a circled fraction for essay (it's rarely all-or-nothing) */}
        <div style={D.qMarksWrap}>
          {!isEssay ? (
            attempted ? (correctFlag ? <HandTick size={30} /> : <HandCross size={30} />) : null
          ) : (
            <HandCircle size={54} strokeWidth={3}>
              <span style={D.qCircledMarks}>{q.marks_awarded ?? 0}/{q.max_marks}</span>
            </HandCircle>
          )}
          {!isEssay && <span style={D.qMarks}>{q.marks_awarded ?? 0} / {q.max_marks}</span>}
        </div>
      </div>

      {!isEssay ? (
        <div style={D.optionsWrap}>
          {(q.options || []).map((opt) => {
            const isCorrectOpt = opt.option_label === q.correct_answer;
            const isSelectedOpt = opt.option_label === q.selected_answer;
            let style = D.option;
            if (isCorrectOpt) style = { ...style, ...D.optionCorrect };
            else if (isSelectedOpt) style = { ...style, ...D.optionWrong };

            return (
              <div key={opt.option_label} style={style}>
                <span style={D.optionLabel}>{opt.option_label}</span>
                <span style={{ flex: 1 }}>{opt.option_text}</span>
                {isCorrectOpt && <HandTick size={20} />}
                {isSelectedOpt && !isCorrectOpt && <HandCross size={20} />}
                {isSelectedOpt && <span style={D.yourAnswerTag}>Your answer</span>}
              </div>
            );
          })}
          {!q.selected_answer && (
            <div style={D.noAnswerNote}>You did not answer this question.</div>
          )}
        </div>
      ) : (
        <div style={D.essayWrap}>
          <div style={D.essayLabel}>Your Answer</div>
          <div style={D.essayText}>
            {q.essay_answer?.trim() ? q.essay_answer : <em style={{ color: "var(--text-muted)" }}>Not answered</em>}
          </div>
          {q.remarks && (
            <div style={D.remarksBox}>
              <MessageSquareText size={13} color="var(--info)" />
              <span>{q.remarks}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════ STYLES ════════════════════════════════ */
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

  /* ── cover page ── */
  cover: {
    background: "var(--paper)", border: "1px solid var(--border)", borderTop: "5px solid var(--ink)",
    borderRadius: "var(--radius)", padding: "28px 28px 24px", boxShadow: "var(--shadow-sm)", marginBottom: 22,
  },
  coverGrid: { display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" },
  coverEyebrow: { fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em", marginBottom: 6 },
  coverTitle: { margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.25 },
  coverMeta: { margin: "6px 0 12px", fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 },
  gradeBadge: { display: "inline-flex", alignItems: "center", borderRadius: 20, padding: "5px 14px", fontSize: 12.5, fontWeight: 800, width: "fit-content" },

  coverScoreWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifySelf: "end" },
  coverScoreValue: { fontFamily: "'Caveat', cursive", fontSize: 30, fontWeight: 700, color: "var(--ink)", lineHeight: 1 },
  coverScoreOutOf: { fontSize: 17, opacity: 0.75 },
  coverScorePct: { fontFamily: "'Caveat', cursive", fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 2 },
  examinerNote: {
    fontFamily: "'Caveat', cursive", fontSize: 17, fontWeight: 600, color: "var(--ink)",
    marginTop: 6, transform: "rotate(-2deg)",
  },

  scriptDivider: {
    display: "flex", alignItems: "center", gap: 10, margin: "4px 0 16px",
    fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em",
    textAlign: "center",
  },
  scriptDividerLine: { flex: 1, height: 1, background: "var(--border)" },

  qCard: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "18px 20px", boxShadow: "var(--shadow-sm)",
  },
  qHeader: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  qNumber: {
    fontSize: 12, fontWeight: 800, color: "var(--primary)", background: "var(--primary-tint)",
    borderRadius: 8, padding: "4px 9px", flexShrink: 0, height: "fit-content",
  },
  qText: { fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.5 },
  qImages: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  qImage: { width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" },
  qMarksWrap: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  qMarks: { fontSize: 13, fontWeight: 800, color: "var(--text)" },
  qCircledMarks: { fontFamily: "'Caveat', cursive", fontSize: 17, fontWeight: 700, color: "var(--ink)" },

  optionsWrap: { display: "flex", flexDirection: "column", gap: 7 },
  option: {
    display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 9,
    border: "1px solid var(--border)", background: "var(--bg)", fontSize: 13, color: "var(--text)",
  },
  optionCorrect: { border: "1px solid var(--success)", background: "var(--success-tint)" },
  optionWrong: { border: "1px solid var(--destructive)", background: "var(--destructive-tint)" },
  optionLabel: {
    width: 22, height: 22, minWidth: 22, borderRadius: "50%", background: "var(--card)",
    border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11.5, fontWeight: 800,
  },
  yourAnswerTag: {
    fontSize: 10, fontWeight: 800, color: "var(--text-secondary)", background: "var(--card)",
    border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px", flexShrink: 0,
  },
  noAnswerNote: { fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 },

  essayWrap: { display: "flex", flexDirection: "column", gap: 8 },
  essayLabel: { fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" },
  essayText: {
    fontSize: 13.5, color: "var(--text)", lineHeight: 1.6, background: "var(--bg)",
    border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px", whiteSpace: "pre-wrap",
  },
  remarksBox: {
    display: "flex", alignItems: "flex-start", gap: 7, background: "var(--info-tint)",
    border: "1px solid var(--info)", borderRadius: 9, padding: "9px 12px", fontSize: 12.5,
    color: "var(--text)", lineHeight: 1.5,
  },
};
