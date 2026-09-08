import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, XCircle,
  Award, FileQuestion, MessageSquareText, Trophy,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted elsewhere. ─── */
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

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .mp-summary-grid { grid-template-columns: 1fr !important; }
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

      <header style={D.pageHeader}>
        <h1 style={D.pageTitle}>{submission.assessment_title || "Marked Paper"}</h1>
        <p style={D.pageSub}>
          {submission.assessment_subject || "—"} · {submission.teacher_name || "Teacher"}
        </p>
      </header>

      {/* ── Score summary ── */}
      <section style={{ ...D.panel, marginBottom: 20 }} className="dash-card">
        <div className="mp-summary-grid" style={D.summaryGrid}>
          <SummaryStat icon={Trophy} label="Score" value={`${score} / ${totalMarks || "—"}`} tint="primary" />
          <SummaryStat icon={Award} label="Percentage" value={pct !== null ? `${pct}%` : "—"} tint="info" />
          <div style={D.gradeCard}>
            <div style={D.statLabel}>Grade</div>
            <span style={{ ...D.gradeBadge, background: grade.bg, color: grade.fg }}>{grade.label}</span>
          </div>
        </div>
      </section>

      {/* ── Question-by-question breakdown ── */}
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

function SummaryStat({ icon: Icon, label, value, tint }) {
  const tints = {
    primary: { bg: "var(--primary-tint)", fg: "var(--primary)" },
    info: { bg: "var(--info-tint)", fg: "var(--info)" },
  };
  const t = tints[tint] || tints.primary;
  return (
    <div style={D.statCard}>
      <div style={{ ...D.statIconWrap, background: t.bg }}>
        <Icon size={18} color={t.fg} strokeWidth={2} />
      </div>
      <div>
        <div style={D.statLabel}>{label}</div>
        <div style={D.statValue}>{value}</div>
      </div>
    </div>
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
        <div style={D.qMarksWrap}>
          {attempted ? (
            correctFlag ? (
              <CheckCircle2 size={18} color="var(--success)" />
            ) : (
              <XCircle size={18} color="var(--destructive)" />
            )
          ) : null}
          <span style={D.qMarks}>
            {q.marks_awarded ?? 0} / {q.max_marks}
          </span>
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
                {isCorrectOpt && <CheckCircle2 size={15} color="var(--success)" />}
                {isSelectedOpt && !isCorrectOpt && <XCircle size={15} color="var(--destructive)" />}
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
  pageHeader: { marginBottom: 20 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "20px 22px", boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5,
    fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center",
  },

  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "center" },
  statCard: { display: "flex", alignItems: "center", gap: 12 },
  statIconWrap: { width: 40, height: 40, minWidth: 40, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 3 },
  statValue: { fontSize: 17, fontWeight: 800, color: "var(--text)" },
  gradeCard: { display: "flex", flexDirection: "column", gap: 6 },
  gradeBadge: { display: "inline-flex", alignItems: "center", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 800, width: "fit-content" },

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
