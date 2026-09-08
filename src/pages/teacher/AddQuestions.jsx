import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";

/* ─── design-token stylesheet ───
   Copied verbatim from Dashboard.jsx (same id guard, so if the user
   already visited /dashboard this is a no-op and both pages share
   one injected <style>). This is what makes this page's colors
   actually match Dashboard instead of guessing at a palette. */
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

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }
    .dash-btn-secondary:hover { background: var(--bg) !important; }

    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

export default function AddQuestions() {
  injectStyles();

  const { id } = useParams();
  const navigate = useNavigate();

  /* ── State ── */
  const [question, setQuestion] = useState("");
  const [marks, setMarks] = useState(1);
  const [timeLimit, setTimeLimit] = useState(60);
  const [questionType, setQuestionType] = useState("mcq");
  const [options, setOptions] = useState([
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [essayAnswer, setEssayAnswer] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [assessment, setAssessment] = useState(null);

  /* ── Deadline ── */
  const deadline = assessment?.questions_deadline ? new Date(assessment.questions_deadline) : null;
  const deadlinePassed = !!deadline && deadline.getTime() < Date.now();

  const fetchAssessment = async () => {
    try {
      const res = await API.get(`/e-assessments/${id}`);
      setAssessment(res.data?.assessment || res.data || null);
    } catch (err) {
      console.error("FETCH ASSESSMENT ERROR:", err);
    }
  };

  /* ── Fetch ── */
  const fetchQuestions = async () => {
  try {
    const res = await API.get(`/e-assessments/${id}/questions`);

    console.log("QUESTIONS RESPONSE:", res.data);

    const questionsData = Array.isArray(res.data)
      ? res.data
      : res.data.questions || [];

    setQuestions(questionsData);

  } catch (err) {
    console.error("FETCH QUESTIONS ERROR:", err);

    setQuestions([]);

    alert(
      err?.response?.data?.message ||
      "Failed to load questions"
    );
  }
};

  useEffect(() => { if (id) { fetchQuestions(); fetchAssessment(); } }, [id]);

  /* ── Helpers ── */
  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index].text = value;
    setOptions(updated);
  };

  const resetForm = () => {
    setQuestion(""); setMarks(1); setTimeLimit(60);
    setQuestionType("mcq");
    setOptions([
      { label: "A", text: "" }, { label: "B", text: "" },
      { label: "C", text: "" }, { label: "D", text: "" },
    ]);
    setCorrectAnswer(""); setEssayAnswer(""); setEditingId(null);
  };

  /* ── Save ── */
const submitQuestion = async () => {
  if (deadlinePassed && !editingId) {
    return alert(`The deadline to add questions passed on ${deadline.toLocaleString()}.`);
  }

  if (!question.trim()) {
    return alert("Question text is required");
  }

  if (questionType === "mcq" && !correctAnswer) {
    return alert("Please select the correct answer");
  }

  try {
    setLoading(true);

    const payload = {
      question_text: question,
      marks: Number(marks),
      time_limit: Number(timeLimit),
      question_type: questionType,

      // MCQ only
      options: questionType === "mcq" ? options : [],
      correct_answer:
        questionType === "mcq"
          ? correctAnswer
          : null,

      // Essay only
      marking_guide:
        questionType === "essay"
          ? essayAnswer
          : null,
    };

    if (editingId) {
      await API.put(
        `/e-assessments/questions/${editingId}`,
        payload
      );

      alert("Question updated successfully");
    } else {
      await API.post(
        `/e-assessments/${id}/questions`,
        payload
      );

      alert("Question added successfully");
    }

    resetForm();
    fetchQuestions();

  } catch (err) {
    console.error(err);

    alert(
      err?.response?.data?.message ||
      "Failed to save question"
    );
  } finally {
    setLoading(false);
  }
};

  /* ── Edit ── */
  const editQuestion = (q) => {
  setEditingId(q.id);
  setQuestion(q.question_text || "");
  setMarks(q.marks || 1);
  setTimeLimit(q.time_limit || 60);
  setQuestionType(q.question_type || "mcq");

  setOptions(
    q.options?.length
      ? q.options
      : [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ]
  );

  setCorrectAnswer(q.correct_answer || "");

  // Essay marking guide
  setEssayAnswer(q.marking_guide || "");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  /* ── Delete ── */
  const deleteQuestion = async (qid) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await API.delete(`/questions/${qid}`);
      fetchQuestions();
    } catch {
      alert("Failed to delete question");
    }
  };

  const mcqCount = questions.filter(q => (q.question_type || "mcq") === "mcq").length;
  const essayCount = questions.filter(q => q.question_type === "essay").length;
  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div style={S.page}>

      {/* ── TOP NAV ── */}
      <div style={S.topNav}>
        <button style={S.backBtn} className="dash-btn dash-btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        <div style={S.topNavRight}>
          <span style={S.topNavStat}>
            <span style={S.topNavStatIcon}>◉</span> {mcqCount} MCQ
          </span>
          <span style={S.topNavStat}>
            <span style={S.topNavStatIcon}>✍</span> {essayCount} Essay
          </span>
          <span style={{ ...S.topNavStat, color: "var(--warning)", background: "var(--warning-tint)", border: "1px solid rgba(180,83,9,0.25)" }}>
            <span style={S.topNavStatIcon}>★</span> {totalMarks} marks
          </span>
        </div>
      </div>

      {deadline && (
        <div style={{
          margin: "0 0 16px",
          padding: "10px 16px",
          borderRadius: "var(--radius-sm)",
          fontSize: 13,
          fontWeight: 600,
          background: deadlinePassed ? "var(--destructive-tint)" : "var(--primary-tint)",
          border: `1px solid ${deadlinePassed ? "var(--destructive)" : "var(--primary)"}`,
          color: deadlinePassed ? "var(--destructive)" : "var(--primary-dark)",
        }}>
          {deadlinePassed
            ? `Deadline to add questions passed on ${deadline.toLocaleString()}. New questions can no longer be added — existing ones can still be viewed below.`
            : `Deadline to add new questions: ${deadline.toLocaleString()}`}
        </div>
      )}

      <div style={S.layout}>

        {/* ══════════════════════════════════════
            LEFT — FORM
        ══════════════════════════════════════ */}
        <div style={S.formCol}>
          <div style={S.formCard} className="dash-card">

            {/* Header */}
            <div style={S.formHeader}>
              <div style={{
                ...S.formHeaderIcon,
                background: editingId ? "var(--warning-tint)" : "var(--primary-tint)",
                border: `1px solid ${editingId ? "var(--warning)" : "var(--primary)"}`,
              }}>
                {editingId ? "✏️" : "➕"}
              </div>
              <div>
                <h2 style={S.formTitle}>
                  {editingId ? "Edit Question" : "New Question"}
                </h2>
                <p style={S.formSubtitle}>
                  {editingId
                    ? "Update the question details below"
                    : "Fill in the details to add a question"}
                </p>
              </div>
            </div>

            {/* Type toggle */}
            <div style={S.typeToggle}>
              <button
                style={{ ...S.typeBtn, ...(questionType === "mcq" ? S.typeBtnActive : {}) }}
                onClick={() => setQuestionType("mcq")}
              >
                <span>◉</span> Multiple Choice
              </button>
              <button
                style={{
                  ...S.typeBtn,
                  ...(questionType === "essay" ? S.typeBtnActiveEssay : {}),
                }}
                onClick={() => setQuestionType("essay")}
              >
                <span>✍</span> Essay / Written
              </button>
            </div>

            {/* Question text */}
            <Field label="Question Text" required>
              <textarea
                placeholder="Enter the question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={S.textarea}
                rows={4}
              />
            </Field>

            {/* Marks + Time in row */}
            <div style={S.twoCol}>
              <Field label="Marks" hint="Points for this question">
                <input
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  style={S.input}
                />
              </Field>
              <Field label="Time Limit" hint="Seconds per question">
                <input
                  type="number"
                  min={10}
                  placeholder="e.g. 60"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  style={S.input}
                />
              </Field>
            </div>

            {/* ── MCQ OPTIONS ── */}
            {questionType === "mcq" && (
              <div style={S.mcqSection}>
                <div style={S.mcqSectionHeader}>
                  <span style={S.mcqSectionTitle}>Answer Options</span>
                  <span style={S.mcqSectionHint}>Fill all four options, then mark the correct one</span>
                </div>

                <div style={S.optionsGrid}>
                  {options.map((opt, i) => (
                    <div
                      key={opt.label}
                      style={{
                        ...S.optionInputRow,
                        ...(correctAnswer === opt.label ? S.optionInputRowCorrect : {}),
                      }}
                    >
                      <div style={{
                        ...S.optLabelBubble,
                        ...(correctAnswer === opt.label ? S.optLabelBubbleCorrect : {}),
                      }}>
                        {opt.label}
                      </div>
                      <input
                        type="text"
                        value={opt.text}
                        placeholder={`Option ${opt.label}`}
                        onChange={(e) => updateOption(i, e.target.value)}
                        style={S.optInput}
                      />
                      <button
                        title="Mark as correct"
                        style={{
                          ...S.markCorrectBtn,
                          ...(correctAnswer === opt.label ? S.markCorrectBtnActive : {}),
                        }}
                        onClick={() => setCorrectAnswer(opt.label)}
                      >
                        {correctAnswer === opt.label ? "✓" : "○"}
                      </button>
                    </div>
                  ))}
                </div>

                {correctAnswer && (
                  <div style={S.correctAnswerBadge}>
                    ✓ Correct answer: <strong>Option {correctAnswer}</strong>
                    {options.find(o => o.label === correctAnswer)?.text
                      ? ` — "${options.find(o => o.label === correctAnswer).text}"`
                      : ""}
                  </div>
                )}
              </div>
            )}

            {questionType === "essay" && (
  <div style={S.essaySection}>
    <div style={S.essayHeader}>
      <span style={S.essaySectionTitle}>✍ Marking Guide</span>
      <span style={S.essaySectionHint}>
        Optional — helps markers grade consistently
      </span>
    </div>

    <textarea
      placeholder="Describe the expected answer or key points to look for when marking..."
      value={essayAnswer}
      onChange={(e) => setEssayAnswer(e.target.value)}
      style={{
        ...S.textarea,
        borderColor: "var(--info)",
        minHeight: 120,
      }}
      rows={5}
    />
  </div>
)}

            {/* Actions */}
            <div style={S.formActions}>
              <button
                style={{ ...S.saveBtn, opacity: (loading || (deadlinePassed && !editingId)) ? 0.55 : 1, cursor: (deadlinePassed && !editingId) ? "not-allowed" : "pointer" }}
                className="dash-btn"
                disabled={loading || (deadlinePassed && !editingId)}
                onClick={submitQuestion}
              >
                {loading ? "Saving…" : (deadlinePassed && !editingId) ? "Deadline passed" : editingId ? "Update Question" : "Add Question"}
              </button>
              {editingId && (
                <button style={S.cancelBtn} className="dash-btn dash-btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            RIGHT — QUESTION LIST
        ══════════════════════════════════════ */}
        <div style={S.listCol}>
          <div style={S.listHeader}>
            <h2 style={S.listTitle}>Question Bank</h2>
            <span style={S.listCount}>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
          </div>

          {questions.length === 0 ? (
            <div style={S.emptyList}>
              <span style={S.emptyIcon}>📋</span>
              <p style={S.emptyText}>No questions yet. Add your first one on the left.</p>
            </div>
          ) : (
            <div style={S.questionList}>
              {questions.map((q, index) => {
                const isMcq = (q.question_type || "mcq") === "mcq";
                return (
                  <div
                    key={q.id}
                    style={{
                      ...S.qCard,
                      ...(editingId === q.id ? S.qCardEditing : {}),
                    }}
                    className="dash-card"
                  >
                    {/* Q header */}
                    <div style={S.qCardHeader}>
                      <div style={S.qCardHeaderLeft}>
                        <span style={{
                          ...S.qIndexBadge,
                          background: isMcq ? "var(--primary-tint)" : "var(--info-tint)",
                          border: `1px solid ${isMcq ? "var(--primary)" : "var(--info)"}`,
                          color: isMcq ? "var(--primary-dark)" : "var(--info)",
                        }}>
                          Q{index + 1}
                        </span>
                        <span style={{
                          ...S.qTypePill,
                          background: isMcq ? "var(--primary-tint)" : "var(--info-tint)",
                          color: isMcq ? "var(--primary-dark)" : "var(--info)",
                        }}>
                          {isMcq ? "◉ MCQ" : "✍ Essay"}
                        </span>
                      </div>
                      <div style={S.qCardHeaderRight}>
                        <span style={S.marksPill}>★ {q.marks} {Number(q.marks) === 1 ? "mark" : "marks"}</span>
                        <span style={S.timePill}>⏱ {q.time_limit || 60}s</span>
                      </div>
                    </div>

                    {/* Question text */}
                    <p style={S.qText}>{q.question_text}</p>

                    {/* MCQ options */}
                    {isMcq && q.options && q.options.length > 0 && (
                      <div style={S.qOptions}>
                        {q.options.map((opt) => {
                          const isCorrect = opt.label === q.correct_answer ||
                            opt.option_label === q.correct_answer;
                          return (
                            <div
                              key={opt.label || opt.option_label}
                              style={{
                                ...S.qOption,
                                ...(isCorrect ? S.qOptionCorrect : {}),
                              }}
                            >
                              <span style={{
                                ...S.qOptLabel,
                                ...(isCorrect ? S.qOptLabelCorrect : {}),
                              }}>
                                {opt.label || opt.option_label}
                              </span>
                              <span style={S.qOptText}>
                                {opt.text || opt.option_text || "—"}
                              </span>
                              {isCorrect && (
                                <span style={S.qOptCorrectMark}>✓ Correct</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Essay Answer / Marking Guide */}
                    {!isMcq && (
                      <div style={S.essayNoteBox}>
                        <div style={S.essayNoteTitle}>
                          ✍ Expected Answer / Marking Guide
                        </div>
                        <div style={S.essayNoteBody}>
                          {q.marking_guide?.trim()
                            ? q.marking_guide
                            : "No marking guide provided for this essay question."}
                        </div>
                      </div>
                    )}

                    {/* Card actions */}
                    <div style={S.qCardActions}>
                      <button style={S.editBtn} className="dash-btn" onClick={() => editQuestion(q)}>
                        ✏️ Edit
                      </button>
                      <button style={S.deleteBtn} className="dash-btn" onClick={() => deleteQuestion(q.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <label style={S.fieldLabel}>
          {label}
          {required && <span style={{ color: "var(--destructive)", marginLeft: 4 }}>*</span>}
        </label>
        {hint && <span style={S.fieldHint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* =========================================================
   STYLES — every color/radius/shadow below reads from the
   same CSS variables Dashboard.jsx defines, so this page
   matches it exactly and stays in sync if those tokens
   ever change (e.g. switching themes via [data-theme]).
========================================================= */
const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    padding: "24px 28px 60px",
    color: "var(--text)",
    fontFamily: "'Inter','Segoe UI',sans-serif",
  },

  /* Top nav */
  topNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 12,
  },
  backBtn: {
    padding: "9px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "inherit",
  },
  topNavRight: { display: "flex", gap: 14, alignItems: "center" },
  topNavStat: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: "7px 14px", borderRadius: 20,
  },
  topNavStatIcon: { opacity: 0.7 },

  /* Two-column layout */
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(360px,480px) 1fr",
    gap: 28,
    alignItems: "flex-start",
  },
  formCol: {},
  listCol: {},

  /* Form card — matches Dashboard's .panel/dash-card */
  formCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 26,
    boxShadow: "var(--shadow-sm)",
    position: "sticky",
    top: 20,
  },
  formHeader: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 22,
    paddingBottom: 18,
    borderBottom: "1px solid var(--border)",
  },
  formHeaderIcon: {
    width: 46, height: 46, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
  },
  formTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text)" },
  formSubtitle: { margin: "3px 0 0", fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 },

  /* Type toggle */
  typeToggle: {
    display: "flex", gap: 10, marginBottom: 22,
  },
  typeBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)", cursor: "pointer",
    fontSize: 13, fontWeight: 700, transition: "all 0.15s ease",
    fontFamily: "inherit",
  },
  typeBtnActive: {
    background: "var(--primary-tint)",
    border: "1px solid var(--primary)",
    color: "var(--primary-dark)",
  },
  typeBtnActiveEssay: {
    background: "var(--info-tint)",
    border: "1px solid var(--info)",
    color: "var(--info)",
  },

  /* Fields — matches Dashboard's fieldLabel */
  fieldLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)" },
  fieldHint: { fontSize: 11.5, color: "var(--text-muted)" },
  textarea: {
    width: "100%", padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)", fontSize: 14, lineHeight: 1.6,
    resize: "vertical", outline: "none",
    fontFamily: "'Inter',sans-serif",
    boxSizing: "border-box",
  },
  input: {
    width: "100%", padding: "9px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)", fontSize: 13, outline: "none",
    fontFamily: "'Inter',sans-serif",
    boxSizing: "border-box",
    minHeight: 38,
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },

  /* MCQ section */
  mcqSection: {
    background: "var(--primary-tint)",
    border: "1px solid rgba(139,30,45,0.25)",
    borderRadius: "var(--radius-sm)", padding: 18, marginBottom: 18,
  },
  mcqSectionHeader: { marginBottom: 12 },
  mcqSectionTitle: { fontSize: 13, fontWeight: 800, color: "var(--primary-dark)" },
  mcqSectionHint: { display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 },
  optionsGrid: { display: "flex", flexDirection: "column", gap: 10 },
  optionInputRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 12px", borderRadius: "var(--radius-sm)",
    background: "var(--card)",
    border: "1px solid var(--border)",
    transition: "border 0.2s",
  },
  optionInputRowCorrect: {
    border: "1px solid var(--success)",
    background: "var(--success-tint)",
  },
  optLabelBubble: {
    width: 30, height: 30, minWidth: 30, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    fontWeight: 800, fontSize: 13, color: "var(--text-secondary)",
  },
  optLabelBubbleCorrect: { background: "var(--success)", color: "#fff", border: "1px solid var(--success)" },
  optInput: {
    flex: 1, background: "transparent", border: "none",
    outline: "none", color: "var(--text)", fontSize: 14,
    fontFamily: "'Inter',sans-serif",
  },
  markCorrectBtn: {
    width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text-muted)",
    cursor: "pointer", fontSize: 15, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  markCorrectBtnActive: { border: "1px solid var(--success)", color: "var(--success)", background: "var(--success-tint)" },
  correctAnswerBadge: {
    marginTop: 12, padding: "9px 14px", borderRadius: "var(--radius-sm)",
    background: "var(--success-tint)", border: "1px solid var(--success)",
    color: "var(--success)", fontSize: 12.5, fontWeight: 600,
  },

  /* Essay section */
  essaySection: {
    background: "var(--info-tint)",
    border: "1px solid rgba(29,78,216,0.25)",
    borderRadius: "var(--radius-sm)", padding: 18, marginBottom: 18,
  },
  essayHeader: { marginBottom: 12 },
  essaySectionTitle: { fontSize: 13, fontWeight: 800, color: "var(--info)" },
  essaySectionHint: { display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 },

  /* Form actions — PrimaryBtn / SecondaryBtn equivalents */
  formActions: { display: "flex", gap: 10, marginTop: 6 },
  saveBtn: {
    flex: 1, padding: "12px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--primary)",
    background: "var(--primary)",
    color: "#fff", fontWeight: 700, fontSize: 14,
    fontFamily: "inherit",
  },
  cancelBtn: {
    padding: "12px 20px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)", fontWeight: 700, fontSize: 14,
    fontFamily: "inherit",
  },

  /* List column */
  listHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  },
  listTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text)" },
  listCount: {
    fontSize: 12, color: "var(--text-secondary)", fontWeight: 700,
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: "5px 12px", borderRadius: 20,
  },
  questionList: { display: "flex", flexDirection: "column", gap: 16 },
  emptyList: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "60px 20px", gap: 14,
    background: "var(--card)",
    border: "1px dashed var(--border)",
    borderRadius: "var(--radius)", textAlign: "center",
  },
  emptyIcon: { fontSize: 34 },
  emptyText: { margin: 0, color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 },

  /* Question card */
  qCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20,
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow 0.15s ease",
  },
  qCardEditing: {
    border: "1px solid var(--warning)",
    boxShadow: "0 0 0 3px var(--warning-tint)",
  },
  qCardHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
  },
  qCardHeaderLeft: { display: "flex", alignItems: "center", gap: 10 },
  qCardHeaderRight: { display: "flex", alignItems: "center", gap: 8 },
  qIndexBadge: {
    padding: "4px 12px", borderRadius: 8,
    fontSize: 12.5, fontWeight: 800,
  },
  qTypePill: {
    padding: "4px 10px", borderRadius: 20,
    fontSize: 11.5, fontWeight: 700,
  },
  marksPill: {
    padding: "4px 10px", borderRadius: 20,
    background: "var(--warning-tint)",
    border: "1px solid rgba(180,83,9,0.25)",
    color: "var(--warning)", fontSize: 11.5, fontWeight: 700,
  },
  timePill: {
    padding: "4px 10px", borderRadius: 20,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)", fontSize: 11.5, fontWeight: 700,
  },

  qText: { fontSize: 15, lineHeight: 1.6, color: "var(--text)", margin: "0 0 16px", fontWeight: 600 },

  /* Options in card */
  qOptions: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  qOption: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "9px 12px", borderRadius: "var(--radius-sm)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
  },
  qOptionCorrect: {
    background: "var(--success-tint)",
    border: "1px solid var(--success)",
  },
  qOptLabel: {
    width: 28, height: 28, minWidth: 28, borderRadius: 8,
    background: "var(--card)",
    border: "1px solid var(--border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 12.5, color: "var(--text-secondary)",
  },
  qOptLabelCorrect: { background: "var(--success)", color: "#fff", border: "1px solid var(--success)" },
  qOptText: { flex: 1, fontSize: 13.5, color: "var(--text)" },
  qOptCorrectMark: {
    fontSize: 11.5, fontWeight: 700, color: "var(--success)",
    background: "var(--success-tint)",
    padding: "3px 10px", borderRadius: 20,
    border: "1px solid var(--success)",
  },

  /* Essay note */
  essayNoteBox: {
    background: "var(--info-tint)",
    border: "1px solid rgba(29,78,216,0.25)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
    marginBottom: 16,
  },
  essayNoteTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: "var(--info)",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  essayNoteBody: {
    fontSize: 13.5,
    color: "var(--text)",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },

  /* Card actions */
  qCardActions: { display: "flex", gap: 10, paddingTop: 4 },
  editBtn: {
    flex: 1, padding: "9px", borderRadius: "var(--radius-sm)",
    background: "var(--warning-tint)",
    border: "1px solid rgba(180,83,9,0.3)",
    color: "var(--warning)", cursor: "pointer", fontWeight: 700, fontSize: 13,
    fontFamily: "inherit",
  },
  deleteBtn: {
    flex: 1, padding: "9px", borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(220,38,38,0.3)",
    background: "var(--destructive-tint)",
    color: "var(--destructive)", cursor: "pointer", fontWeight: 700, fontSize: 13,
    fontFamily: "inherit",
  },
};