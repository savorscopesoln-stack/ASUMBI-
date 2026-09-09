import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";

export default function AddQuestions() {
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

  /* ── Images attached to the question currently being drafted ── */
  const [pendingImageFiles, setPendingImageFiles] = useState([]); // File[] not yet uploaded
  const [existingImages, setExistingImages] = useState([]); // [{id, image_url}] already saved (when editing)
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef(null);

  /* ── Word document import ── */
  const [docFile, setDocFile] = useState(null);
  const [docImporting, setDocImporting] = useState(false);
  const [docError, setDocError] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState(null); // null = no preview open
  const [savingImport, setSavingImport] = useState(false);
  const docInputRef = useRef(null);

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
    setPendingImageFiles([]); setExistingImages([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  /* ── Images ── */
  const handleImageFilesChosen = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setPendingImageFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // allow re-selecting the same file later
  };

  const removePendingImage = (index) => {
    setPendingImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImagesFor = async (questionId, files) => {
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    setUploadingImages(true);
    try {
      await API.post(`/e-assessments/questions/${questionId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      alert(err?.response?.data?.message || "Question saved, but attaching images failed");
    } finally {
      setUploadingImages(false);
    }
  };

  const deleteExistingImage = async (imageId) => {
    if (!editingId) return;
    if (!window.confirm("Remove this image?")) return;
    try {
      await API.delete(`/e-assessments/questions/${editingId}/images/${imageId}`);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      fetchQuestions();
    } catch {
      alert("Failed to remove image");
    }
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
      if (pendingImageFiles.length) {
        await uploadImagesFor(editingId, pendingImageFiles);
      }

      alert("Question updated successfully");
    } else {
      const createRes = await API.post(
        `/e-assessments/${id}/questions`,
        payload
      );
      const newQuestionId = createRes?.data?.question_id;
      if (newQuestionId && pendingImageFiles.length) {
        await uploadImagesFor(newQuestionId, pendingImageFiles);
      }

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
      // Options come back from the API as {option_label, option_text} —
      // normalize to {label, text}, which is what the option-editing form
      // (and the "mark as correct" comparison against correctAnswer) uses.
      ? q.options.map((o) => ({
          label: o.label ?? o.option_label ?? "",
          text: o.text ?? o.option_text ?? "",
        }))
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

  setPendingImageFiles([]);
  setExistingImages(Array.isArray(q.images) ? q.images : []);
  if (imageInputRef.current) imageInputRef.current.value = "";

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

  /* ── Word document import ── */
  const handleDocFileChosen = (e) => {
    const file = e.target.files?.[0] || null;
    setDocFile(file);
    setDocError("");
    e.target.value = "";
  };

  const runDocImport = async () => {
    if (!docFile) return;
    if (deadlinePassed) {
      return alert(`The deadline to add questions passed on ${deadline.toLocaleString()}.`);
    }
    setDocImporting(true);
    setDocError("");
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      const res = await API.post(`/e-assessments/${id}/questions/import-docx`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const parsed = res?.data?.questions || [];
      if (!parsed.length) {
        setDocError(res?.data?.warning || "No questions were recognised in this document.");
        return;
      }
      setParsedQuestions(parsed);
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = "";
    } catch (err) {
      setDocError(err?.response?.data?.message || "Failed to read that document");
    } finally {
      setDocImporting(false);
    }
  };

  const updateParsedQuestion = (index, patch) => {
    setParsedQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateParsedOption = (qIndex, optIndex, text) => {
    setParsedQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const options = q.options.map((o, oi) => (oi === optIndex ? { ...o, text } : o));
      return { ...q, options };
    }));
  };

  const removeParsedImage = (qIndex, imgIndex) => {
    setParsedQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, images: q.images.filter((_, ii) => ii !== imgIndex) };
    }));
  };

  const removeParsedQuestion = (index) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmImport = async () => {
    if (!parsedQuestions || !parsedQuestions.length) return;
    setSavingImport(true);
    try {
      const res = await API.post(`/e-assessments/${id}/questions/bulk`, { questions: parsedQuestions });
      alert(`Imported ${res?.data?.imported ?? parsedQuestions.length} question(s)`);
      setParsedQuestions(null);
      fetchQuestions();
    } catch (err) {
      alert(err?.response?.data?.message || "Import failed");
    } finally {
      setSavingImport(false);
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
        <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <div style={S.topNavRight}>
          <span style={S.topNavStat}>
            <span style={S.topNavStatIcon}>◉</span> {mcqCount} MCQ
          </span>
          <span style={S.topNavStat}>
            <span style={S.topNavStatIcon}>✍</span> {essayCount} Essay
          </span>
          <span style={{ ...S.topNavStat, color: "#fbbf24" }}>
            <span style={S.topNavStatIcon}>★</span> {totalMarks} marks
          </span>
        </div>
      </div>

      {deadline && (
        <div style={{
          margin: "0 0 16px",
          padding: "10px 16px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: deadlinePassed ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.10)",
          border: `1px solid ${deadlinePassed ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.3)"}`,
          color: deadlinePassed ? "#f87171" : "#a5b4fc",
        }}>
          {deadlinePassed
            ? `Deadline to add questions passed on ${deadline.toLocaleString()}. New questions can no longer be added — existing ones can still be viewed below.`
            : `Deadline to add new questions: ${deadline.toLocaleString()}`}
        </div>
      )}

      {/* ══════════════════════════════════════
          IMPORT FROM WORD DOCUMENT
      ══════════════════════════════════════ */}
      <div style={{
        marginBottom: 20, padding: 18, borderRadius: 14,
        background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>Import Questions from a Word Document</h3>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#94a3b8", lineHeight: 1.6 }}>
          Instead of typing questions by hand, upload a .docx file. Start each question with{" "}
          <code>Q1:</code>, list options as <code>A) ...</code>, <code>B) ...</code> etc., and mark the
          correct one with <code>Answer: A</code>. Write <code>[Essay]</code> for an essay question and
          an optional <code>Marking guide: ...</code> line. Any diagrams/images in the document are
          picked up automatically. You'll get a chance to review everything before it's saved.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            ref={docInputRef}
            type="file"
            accept=".docx"
            onChange={handleDocFileChosen}
            style={{ fontSize: 12.5, color: "#cbd5e1" }}
          />
          <button
            type="button"
            onClick={runDocImport}
            disabled={!docFile || docImporting || deadlinePassed}
            style={{
              padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.5)",
              color: "#4ade80", cursor: (!docFile || docImporting || deadlinePassed) ? "not-allowed" : "pointer",
              opacity: (!docFile || docImporting || deadlinePassed) ? 0.5 : 1,
            }}
          >
            {docImporting ? "Reading document…" : "Parse Document"}
          </button>
        </div>
        {docError && <p style={{ color: "#f87171", fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>{docError}</p>}
      </div>

      {/* ══════════════════════════════════════
          PARSED QUESTIONS — REVIEW BEFORE IMPORT
      ══════════════════════════════════════ */}
      {Array.isArray(parsedQuestions) && (
        <div style={{
          marginBottom: 20, padding: 18, borderRadius: 14,
          background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.25)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>
              Review Imported Questions ({parsedQuestions.length})
            </h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setParsedQuestions(null)}
                style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: "transparent", border: "1px solid rgba(148,163,184,0.4)", color: "#cbd5e1", cursor: "pointer" }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={savingImport || !parsedQuestions.length}
                style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.6)", color: "#a5b4fc", cursor: "pointer", opacity: savingImport ? 0.6 : 1 }}
              >
                {savingImport ? "Importing…" : `Import ${parsedQuestions.length} Question${parsedQuestions.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {parsedQuestions.map((q, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: q.needs_review ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>
                    Q{i + 1} · {q.question_type === "mcq" ? "MCQ" : "Essay"}
                    {q.needs_review && !q.correct_answer && <span style={{ color: "#fbbf24", marginLeft: 8 }}>⚠ No answer detected — please set one</span>}
                  </span>
                  <button type="button" onClick={() => removeParsedQuestion(i)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    Remove
                  </button>
                </div>

                <textarea
                  value={q.question_text}
                  onChange={(e) => updateParsedQuestion(i, { question_text: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontSize: 13.5, marginBottom: 8, resize: "vertical" }}
                />

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: "#94a3b8" }}>Marks:</label>
                  <input
                    type="number"
                    min={1}
                    value={q.marks}
                    onChange={(e) => updateParsedQuestion(i, { marks: Number(e.target.value) })}
                    style={{ width: 70, padding: 6, borderRadius: 6, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontSize: 13 }}
                  />
                </div>

                {q.question_type === "mcq" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {q.options.map((opt, oi) => (
                      <div key={opt.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          onClick={() => updateParsedQuestion(i, { correct_answer: opt.label })}
                          title="Mark as correct"
                          style={{
                            width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800, cursor: "pointer",
                            background: q.correct_answer === opt.label ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)",
                            color: q.correct_answer === opt.label ? "#4ade80" : "#94a3b8",
                            border: `1px solid ${q.correct_answer === opt.label ? "#4ade80" : "rgba(255,255,255,0.2)"}`,
                          }}
                        >
                          {opt.label}
                        </span>
                        <input
                          value={opt.text}
                          onChange={(e) => updateParsedOption(i, oi, e.target.value)}
                          style={{ flex: 1, padding: 6, borderRadius: 6, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontSize: 13 }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={q.marking_guide || ""}
                    onChange={(e) => updateParsedQuestion(i, { marking_guide: e.target.value })}
                    rows={2}
                    placeholder="Marking guide (optional)"
                    style={{ width: "100%", padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(168,85,247,0.3)", color: "#e2e8f0", fontSize: 13, resize: "vertical" }}
                  />
                )}

                {Array.isArray(q.images) && q.images.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {q.images.map((imgUrl, ii) => (
                      <div key={ii} style={{ position: "relative" }}>
                        <img
                          src={resolveFileUrl(imgUrl)}
                          alt="Detected diagram"
                          style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeParsedImage(i, ii)}
                          style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", fontSize: 10, cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={S.layout}>

        {/* ══════════════════════════════════════
            LEFT — FORM
        ══════════════════════════════════════ */}
        <div style={S.formCol}>
          <div style={S.formCard}>

            {/* Header */}
            <div style={S.formHeader}>
              <div style={{
                ...S.formHeaderIcon,
                background: editingId
                  ? "rgba(245,158,11,0.15)"
                  : "rgba(99,102,241,0.15)",
                border: `1px solid ${editingId ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.4)"}`,
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
                  ...(questionType === "essay" ? { ...S.typeBtnActive, background: "rgba(168,85,247,0.18)", border: "1.5px solid rgba(168,85,247,0.5)", color: "#c084fc" } : {}),
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
        borderColor: "rgba(168,85,247,0.4)",
        minHeight: 120,
      }}
      rows={5}
    />
  </div>
)}

            {/* ── DIAGRAMS / IMAGES ── */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0" }}>📎 Diagrams / Images</span>
                <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Optional — attach a diagram or photo for this question</span>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={handleImageFilesChosen}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                style={{
                  padding: "9px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)",
                  color: "#a5b4fc", cursor: "pointer",
                }}
              >
                + Add Image
              </button>

              {(existingImages.length > 0 || pendingImageFiles.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  {existingImages.map((img) => (
                    <div key={`existing-${img.id}`} style={{ position: "relative" }}>
                      <img
                        src={resolveFileUrl(img.image_url)}
                        alt="Question diagram"
                        style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)" }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteExistingImage(img.id)}
                        title="Remove image"
                        style={{
                          position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                          background: "#ef4444", color: "#fff", border: "none", fontSize: 11, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {pendingImageFiles.map((file, i) => (
                    <div key={`pending-${i}`} style={{ position: "relative" }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Pending upload"
                        style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px dashed rgba(99,102,241,0.6)" }}
                      />
                      <button
                        type="button"
                        onClick={() => removePendingImage(i)}
                        title="Remove"
                        style={{
                          position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                          background: "#ef4444", color: "#fff", border: "none", fontSize: 11, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploadingImages && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Uploading images…</p>}
            </div>

            {/* Actions */}
            <div style={S.formActions}>
              <button
                style={{ ...S.saveBtn, opacity: (loading || (deadlinePassed && !editingId)) ? 0.5 : 1, cursor: (deadlinePassed && !editingId) ? "not-allowed" : "pointer" }}
                disabled={loading || (deadlinePassed && !editingId)}
                onClick={submitQuestion}
              >
                {loading ? "Saving…" : (deadlinePassed && !editingId) ? "Deadline passed" : editingId ? "Update Question" : "Add Question"}
              </button>
              {editingId && (
                <button style={S.cancelBtn} onClick={resetForm}>
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
                  >
                    {/* Q header */}
                    <div style={S.qCardHeader}>
                      <div style={S.qCardHeaderLeft}>
                        <span style={{
                          ...S.qIndexBadge,
                          background: isMcq ? "rgba(99,102,241,0.18)" : "rgba(168,85,247,0.18)",
                          border: `1px solid ${isMcq ? "rgba(99,102,241,0.4)" : "rgba(168,85,247,0.4)"}`,
                          color: isMcq ? "#818cf8" : "#c084fc",
                        }}>
                          Q{index + 1}
                        </span>
                        <span style={{
                          ...S.qTypePill,
                          background: isMcq ? "rgba(99,102,241,0.1)" : "rgba(168,85,247,0.1)",
                          color: isMcq ? "#6366f1" : "#a855f7",
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

                    {/* Attached diagrams/images */}
                    {Array.isArray(q.images) && q.images.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {q.images.map((img) => (
                          <img
                            key={img.id}
                            src={resolveFileUrl(img.image_url)}
                            alt="Question diagram"
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)" }}
                          />
                        ))}
                      </div>
                    )}

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

                    {/* Essay note */}
{/* Essay Answer / Marking Guide */}
{!isMcq && (
  <div style={{
    background: "rgba(168,85,247,0.06)",
    border: "1px solid rgba(168,85,247,0.25)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  }}>
    <div style={{
      fontSize: 13,
      fontWeight: 800,
      color: "#c084fc",
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      ✍ Expected Answer / Marking Guide
    </div>

    <div style={{
      fontSize: 14,
      color: "#e2e8f0",
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
    }}>
      {q.marking_guide?.trim()
        ? q.marking_guide
        : "No marking guide provided for this essay question."}
    </div>
  </div>
)}

                    {/* Card actions */}
                    <div style={S.qCardActions}>
                      <button style={S.editBtn} onClick={() => editQuestion(q)}>
                        ✏️ Edit
                      </button>
                      <button style={S.deleteBtn} onClick={() => deleteQuestion(q.id)}>
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
          {required && <span style={{ color: "#f87171", marginLeft: 4 }}>*</span>}
        </label>
        {hint && <span style={S.fieldHint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#020617 0%,#0c0f1e 50%,#0f172a 100%)",
    padding: "24px 28px 60px",
    color: "#f1f5f9",
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
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  topNavRight: { display: "flex", gap: 14, alignItems: "center" },
  topNavStat: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 14, fontWeight: 700, color: "#94a3b8",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
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

  /* Form card */
  formCard: {
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 30,
    backdropFilter: "blur(14px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    position: "sticky",
    top: 20,
  },
  formHeader: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  formHeaderIcon: {
    width: 48, height: 48, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, flexShrink: 0,
  },
  formTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  formSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },

  /* Type toggle */
  typeToggle: {
    display: "flex", gap: 10, marginBottom: 22,
  },
  typeBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "11px 16px",
    borderRadius: 12,
    border: "1.5px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#64748b", cursor: "pointer",
    fontSize: 14, fontWeight: 700, transition: "all 0.2s",
  },
  typeBtnActive: {
    background: "rgba(99,102,241,0.18)",
    border: "1.5px solid rgba(99,102,241,0.5)",
    color: "#a5b4fc",
  },

  /* Fields */
  fieldLabel: { fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" },
  fieldHint: { fontSize: 12, color: "#475569" },
  textarea: {
    width: "100%", padding: "14px 16px",
    borderRadius: 14,
    border: "1.5px solid rgba(255,255,255,0.08)",
    background: "rgba(30,41,59,0.7)",
    color: "#f1f5f9", fontSize: 15, lineHeight: 1.7,
    resize: "vertical", outline: "none",
    fontFamily: "'Inter',sans-serif",
    boxSizing: "border-box",
  },
  input: {
    width: "100%", padding: "13px 16px",
    borderRadius: 14,
    border: "1.5px solid rgba(255,255,255,0.08)",
    background: "rgba(30,41,59,0.7)",
    color: "#f1f5f9", fontSize: 15, outline: "none",
    fontFamily: "'Inter',sans-serif",
    boxSizing: "border-box",
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },

  /* MCQ section */
  mcqSection: {
    background: "rgba(99,102,241,0.06)",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 18, padding: 20, marginBottom: 18,
  },
  mcqSectionHeader: { marginBottom: 14 },
  mcqSectionTitle: { fontSize: 14, fontWeight: 800, color: "#a5b4fc" },
  mcqSectionHint: { display: "block", fontSize: 12, color: "#475569", marginTop: 4 },
  optionsGrid: { display: "flex", flexDirection: "column", gap: 10 },
  optionInputRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 12,
    background: "rgba(30,41,59,0.6)",
    border: "1.5px solid rgba(255,255,255,0.07)",
    transition: "border 0.2s",
  },
  optionInputRowCorrect: {
    border: "1.5px solid rgba(34,197,94,0.5)",
    background: "rgba(34,197,94,0.06)",
  },
  optLabelBubble: {
    width: 34, height: 34, minWidth: 34, borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.07)",
    fontWeight: 800, fontSize: 14, color: "#94a3b8",
  },
  optLabelBubbleCorrect: { background: "#22c55e", color: "#fff" },
  optInput: {
    flex: 1, background: "transparent", border: "none",
    outline: "none", color: "#f1f5f9", fontSize: 15,
    fontFamily: "'Inter',sans-serif",
  },
  markCorrectBtn: {
    width: 32, height: 32, borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.12)",
    background: "transparent", color: "#475569",
    cursor: "pointer", fontSize: 16, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  markCorrectBtnActive: { border: "1.5px solid #22c55e", color: "#22c55e", background: "rgba(34,197,94,0.12)" },
  correctAnswerBadge: {
    marginTop: 12, padding: "9px 14px", borderRadius: 10,
    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
    color: "#4ade80", fontSize: 13, fontWeight: 600,
  },

  /* Essay section */
  essaySection: {
    background: "rgba(168,85,247,0.06)",
    border: "1px solid rgba(168,85,247,0.2)",
    borderRadius: 18, padding: 20, marginBottom: 18,
  },
  essayHeader: { marginBottom: 14 },
  essaySectionTitle: { fontSize: 14, fontWeight: 800, color: "#c084fc" },
  essaySectionHint: { display: "block", fontSize: 12, color: "#475569", marginTop: 4 },

  /* Form actions */
  formActions: { display: "flex", gap: 10, marginTop: 6 },
  saveBtn: {
    flex: 1, padding: "14px",
    borderRadius: 14, border: "none",
    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
    color: "#fff", fontWeight: 800, fontSize: 15,
    cursor: "pointer", boxShadow: "0 6px 20px rgba(99,102,241,0.3)",
  },
  cancelBtn: {
    padding: "14px 20px", borderRadius: 14, border: "none",
    background: "rgba(255,255,255,0.07)",
    color: "#94a3b8", cursor: "pointer", fontWeight: 700, fontSize: 15,
  },

  /* List column */
  listHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 18,
  },
  listTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  listCount: {
    fontSize: 13, color: "#64748b", fontWeight: 700,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "5px 12px", borderRadius: 20,
  },
  questionList: { display: "flex", flexDirection: "column", gap: 16 },
  emptyList: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "60px 20px", gap: 14,
    background: "rgba(15,23,42,0.5)",
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: 20, textAlign: "center",
  },
  emptyIcon: { fontSize: 36 },
  emptyText: { margin: 0, color: "#475569", fontSize: 15 },

  /* Question card */
  qCard: {
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20, padding: 22,
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
    transition: "border 0.2s",
  },
  qCardEditing: {
    border: "1.5px solid rgba(245,158,11,0.5)",
    boxShadow: "0 0 0 3px rgba(245,158,11,0.08)",
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
    fontSize: 13, fontWeight: 800,
  },
  qTypePill: {
    padding: "4px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 700,
  },
  marksPill: {
    padding: "4px 10px", borderRadius: 20,
    background: "rgba(251,191,36,0.1)",
    border: "1px solid rgba(251,191,36,0.3)",
    color: "#fbbf24", fontSize: 12, fontWeight: 700,
  },
  timePill: {
    padding: "4px 10px", borderRadius: 20,
    background: "rgba(100,116,139,0.12)",
    border: "1px solid rgba(100,116,139,0.25)",
    color: "#64748b", fontSize: 12, fontWeight: 700,
  },

  qText: { fontSize: 16, lineHeight: 1.7, color: "#e2e8f0", margin: "0 0 16px", fontWeight: 600 },

  /* Options in card */
  qOptions: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  qOption: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: 12,
    background: "rgba(30,41,59,0.6)",
    border: "1.5px solid rgba(255,255,255,0.06)",
  },
  qOptionCorrect: {
    background: "rgba(34,197,94,0.08)",
    border: "1.5px solid rgba(34,197,94,0.4)",
  },
  qOptLabel: {
    width: 30, height: 30, minWidth: 30, borderRadius: 8,
    background: "rgba(255,255,255,0.07)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 13, color: "#64748b",
  },
  qOptLabelCorrect: { background: "#22c55e", color: "#fff" },
  qOptText: { flex: 1, fontSize: 14, color: "#cbd5e1" },
  qOptCorrectMark: {
    fontSize: 12, fontWeight: 700, color: "#4ade80",
    background: "rgba(34,197,94,0.12)",
    padding: "3px 10px", borderRadius: 20,
    border: "1px solid rgba(34,197,94,0.3)",
  },

  /* Essay note */
  essayNote: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "12px 14px", borderRadius: 12,
    background: "rgba(168,85,247,0.07)",
    border: "1px solid rgba(168,85,247,0.2)",
    color: "#c084fc", fontSize: 13, marginBottom: 16,
  },
  essayNoteIcon: { fontSize: 16, flexShrink: 0 },

  /* Card actions */
  qCardActions: { display: "flex", gap: 10, paddingTop: 4 },
  editBtn: {
    flex: 1, padding: "10px", borderRadius: 11, border: "none",
    background: "rgba(245,158,11,0.15)",
    border: "1px solid rgba(245,158,11,0.3)",
    color: "#fbbf24", cursor: "pointer", fontWeight: 700, fontSize: 14,
  },
  deleteBtn: {
    flex: 1, padding: "10px", borderRadius: 11,
    border: "1px solid rgba(239,68,68,0.3)",
    background: "rgba(239,68,68,0.1)",
    color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: 14,
  },
};