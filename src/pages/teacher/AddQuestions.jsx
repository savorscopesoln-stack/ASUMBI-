import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleDot,
  PenLine,
  Star,
  Clock,
  FileText,
  Paperclip,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import API, { resolveFileUrl } from "../../api";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app (StudentProfile etc.); a no-op if already mounted
   by the layout or another page. ─── */
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

    input:focus-visible, button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .profile-btn:hover { filter: brightness(0.95); }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .profile-two-col { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── page-specific additions (separate id, same guard pattern) ─── */
const injectAddQuestionStyles = () => {
  if (document.getElementById("add-question-tokens")) return;
  const el = document.createElement("style");
  el.id = "add-question-tokens";
  el.textContent = `
    textarea:focus-visible, select:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
    .aq-opt-row:focus-within { box-shadow: 0 0 0 3px var(--primary-tint); }
    .aq-ghost:hover { background: var(--bg) !important; }
    .aq-card-btn:hover { filter: brightness(0.96); }

    @media (max-width: 1000px) {
      .aq-layout { grid-template-columns: 1fr !important; }
      .aq-form-card { position: static !important; }
    }
    @media (max-width: 520px) {
      .aq-two-col { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(el);
};

export default function AddQuestions() {
  injectStyles();
  injectAddQuestionStyles();

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
    <main className="dash-main" style={S.page}>

      {/* ── TOP NAV ── */}
      <header style={S.topNav}>
        <button className="aq-ghost" style={S.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <div style={S.topNavRight}>
          <span style={S.topNavStat}>
            <CircleDot size={14} color="var(--primary)" /> {mcqCount} MCQ
          </span>
          <span style={S.topNavStat}>
            <PenLine size={14} color="var(--info)" /> {essayCount} Essay
          </span>
          <span style={{ ...S.topNavStat, color: "var(--warning)", background: "var(--warning-tint)" }}>
            <Star size={14} /> {totalMarks} marks
          </span>
        </div>
      </header>

      {deadline && (
        <div style={{
          ...S.banner,
          background: deadlinePassed ? "var(--destructive-tint)" : "var(--info-tint)",
          border: `1px solid ${deadlinePassed ? "var(--destructive)" : "var(--info)"}`,
          color: deadlinePassed ? "var(--destructive)" : "var(--info)",
        }}>
          {deadlinePassed && <AlertTriangle size={14} style={{ flexShrink: 0 }} />}
          <span>
            {deadlinePassed
              ? `Deadline to add questions passed on ${deadline.toLocaleString()}. New questions can no longer be added — existing ones can still be viewed below.`
              : `Deadline to add new questions: ${deadline.toLocaleString()}`}
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════
          IMPORT FROM WORD DOCUMENT
      ══════════════════════════════════════ */}
      <section style={{ ...S.panel, marginBottom: 20 }} aria-label="Import from Word document">
        <div style={S.panelTitleRow}>
          <div style={{ ...S.iconChip, background: "var(--success-tint)", color: "var(--success)" }}>
            <FileText size={16} />
          </div>
          <h3 style={S.panelTitle}>Import Questions from a Word Document</h3>
        </div>
        <p style={S.importText}>
          Instead of typing questions by hand, upload a .docx file. Start each question with{" "}
          <code style={S.code}>Q1:</code>, list options as <code style={S.code}>A) ...</code>, <code style={S.code}>B) ...</code> etc., and mark the
          correct one with <code style={S.code}>Answer: A</code>. Write <code style={S.code}>[Essay]</code> for an essay question and
          an optional <code style={S.code}>Marking guide: ...</code> line. Any diagrams/images in the document are
          picked up automatically. You'll get a chance to review everything before it's saved.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            ref={docInputRef}
            type="file"
            accept=".docx"
            onChange={handleDocFileChosen}
            style={{ fontSize: 12.5, color: "var(--text-secondary)", fontFamily: "inherit" }}
          />
          <button
            type="button"
            className="profile-btn"
            onClick={runDocImport}
            disabled={!docFile || docImporting || deadlinePassed}
            style={{
              ...S.primaryBtnSm,
              cursor: (!docFile || docImporting || deadlinePassed) ? "not-allowed" : "pointer",
              opacity: (!docFile || docImporting || deadlinePassed) ? 0.5 : 1,
            }}
          >
            {docImporting ? "Reading document…" : "Parse Document"}
          </button>
        </div>
        {docError && (
          <div style={{ ...S.msg, color: "var(--destructive)" }}>
            <AlertTriangle size={14} /> {docError}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════
          PARSED QUESTIONS — REVIEW BEFORE IMPORT
      ══════════════════════════════════════ */}
      {Array.isArray(parsedQuestions) && (
        <section style={{ ...S.panel, marginBottom: 20 }} aria-label="Review imported questions">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <h3 style={S.panelTitle}>
              Review Imported Questions ({parsedQuestions.length})
            </h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="aq-ghost"
                onClick={() => setParsedQuestions(null)}
                style={S.ghostBtnSm}
              >
                Discard
              </button>
              <button
                type="button"
                className="profile-btn"
                onClick={confirmImport}
                disabled={savingImport || !parsedQuestions.length}
                style={{ ...S.primaryBtnSm, opacity: savingImport ? 0.6 : 1 }}
              >
                {savingImport ? "Importing…" : `Import ${parsedQuestions.length} Question${parsedQuestions.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {parsedQuestions.map((q, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: "var(--radius-sm)", background: "var(--bg)",
                border: q.needs_review ? "1px solid var(--warning)" : "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-secondary)" }}>
                    Q{i + 1} · {q.question_type === "mcq" ? "MCQ" : "Essay"}
                    {q.needs_review && !q.correct_answer && (
                      <span style={{ color: "var(--warning)", marginLeft: 8 }}>⚠ No answer detected — please set one</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeParsedQuestion(i)}
                    style={{ background: "none", border: "none", color: "var(--destructive)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
                  >
                    Remove
                  </button>
                </div>

                <textarea
                  value={q.question_text}
                  onChange={(e) => updateParsedQuestion(i, { question_text: e.target.value })}
                  rows={2}
                  style={{ ...S.textareaSm, marginBottom: 8 }}
                />

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Marks:</label>
                  <input
                    type="number"
                    min={1}
                    value={q.marks}
                    onChange={(e) => updateParsedQuestion(i, { marks: Number(e.target.value) })}
                    style={{ ...S.inputSm, width: 70 }}
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
                            width: 26, height: 26, minWidth: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800, cursor: "pointer",
                            background: q.correct_answer === opt.label ? "var(--success-tint)" : "var(--card)",
                            color: q.correct_answer === opt.label ? "var(--success)" : "var(--text-muted)",
                            border: `1px solid ${q.correct_answer === opt.label ? "var(--success)" : "var(--border)"}`,
                          }}
                        >
                          {opt.label}
                        </span>
                        <input
                          value={opt.text}
                          onChange={(e) => updateParsedOption(i, oi, e.target.value)}
                          style={{ ...S.inputSm, flex: 1 }}
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
                    style={{ ...S.textareaSm, borderColor: "var(--info)" }}
                  />
                )}

                {Array.isArray(q.images) && q.images.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {q.images.map((imgUrl, ii) => (
                      <div key={ii} style={{ position: "relative" }}>
                        <img
                          src={resolveFileUrl(imgUrl)}
                          alt="Detected diagram"
                          style={{ ...S.thumb, width: 72, height: 72 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeParsedImage(i, ii)}
                          aria-label="Remove image"
                          style={{ ...S.thumbRemove, width: 18, height: 18 }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="aq-layout" style={S.layout}>

        {/* ══════════════════════════════════════
            LEFT — FORM
        ══════════════════════════════════════ */}
        <div style={S.formCol}>
          <section className="aq-form-card" style={S.formCard} aria-label="Question form">

            {/* Header */}
            <div style={S.formHeader}>
              <div style={{
                ...S.formHeaderIcon,
                background: editingId ? "var(--warning-tint)" : "var(--primary-tint)",
                color: editingId ? "var(--warning)" : "var(--primary)",
              }}>
                {editingId ? <Pencil size={18} /> : <Plus size={20} />}
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
                <CircleDot size={15} /> Multiple Choice
              </button>
              <button
                style={{
                  ...S.typeBtn,
                  ...(questionType === "essay" ? { ...S.typeBtnActive, background: "var(--info-tint)", border: "1.5px solid var(--info)", color: "var(--info)" } : {}),
                }}
                onClick={() => setQuestionType("essay")}
              >
                <PenLine size={15} /> Essay / Written
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
            <div className="aq-two-col" style={S.twoCol}>
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
                      className="aq-opt-row"
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
                    <Check size={14} style={{ flexShrink: 0 }} />
                    <span>
                      Correct answer: <strong>Option {correctAnswer}</strong>
                      {options.find(o => o.label === correctAnswer)?.text
                        ? ` — "${options.find(o => o.label === correctAnswer).text}"`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            )}

            {questionType === "essay" && (
  <div style={S.essaySection}>
    <div style={S.essayHeader}>
      <span style={S.essaySectionTitle}>Marking Guide</span>
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
        minHeight: 120,
      }}
      rows={5}
    />
  </div>
)}

            {/* ── DIAGRAMS / IMAGES ── */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                  <Paperclip size={14} color="var(--text-secondary)" /> Diagrams / Images
                </span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Optional — attach a diagram or photo for this question</span>
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
                className="aq-ghost"
                onClick={() => imageInputRef.current?.click()}
                style={S.addImageBtn}
              >
                <Plus size={14} /> Add Image
              </button>

              {(existingImages.length > 0 || pendingImageFiles.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  {existingImages.map((img) => (
                    <div key={`existing-${img.id}`} style={{ position: "relative" }}>
                      <img
                        src={resolveFileUrl(img.image_url)}
                        alt="Question diagram"
                        style={{ ...S.thumb, width: 84, height: 84 }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteExistingImage(img.id)}
                        title="Remove image"
                        aria-label="Remove image"
                        style={S.thumbRemove}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {pendingImageFiles.map((file, i) => (
                    <div key={`pending-${i}`} style={{ position: "relative" }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Pending upload"
                        style={{ ...S.thumb, width: 84, height: 84, border: "1px dashed var(--primary)" }}
                      />
                      <button
                        type="button"
                        onClick={() => removePendingImage(i)}
                        title="Remove"
                        aria-label="Remove image"
                        style={S.thumbRemove}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploadingImages && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Uploading images…</p>}
            </div>

            {/* Actions */}
            <div style={S.formActions}>
              <button
                className="profile-btn"
                style={{ ...S.saveBtn, opacity: (loading || (deadlinePassed && !editingId)) ? 0.5 : 1, cursor: (deadlinePassed && !editingId) ? "not-allowed" : "pointer" }}
                disabled={loading || (deadlinePassed && !editingId)}
                onClick={submitQuestion}
              >
                {loading ? "Saving…" : (deadlinePassed && !editingId) ? "Deadline passed" : editingId ? "Update Question" : "Add Question"}
              </button>
              {editingId && (
                <button className="aq-ghost" style={S.cancelBtn} onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </section>
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
              <ClipboardList size={32} color="var(--text-muted)" />
              <p style={S.emptyText}>No questions yet. Add your first one on the left.</p>
            </div>
          ) : (
            <div style={S.questionList}>
              {questions.map((q, index) => {
                const isMcq = (q.question_type || "mcq") === "mcq";
                return (
                  <article
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
                          background: isMcq ? "var(--primary-tint)" : "var(--info-tint)",
                          color: isMcq ? "var(--primary)" : "var(--info)",
                        }}>
                          Q{index + 1}
                        </span>
                        <span style={{
                          ...S.qTypePill,
                          color: isMcq ? "var(--primary)" : "var(--info)",
                          border: `1px solid ${isMcq ? "var(--primary)" : "var(--info)"}`,
                        }}>
                          {isMcq ? <CircleDot size={12} /> : <PenLine size={12} />}
                          {isMcq ? "MCQ" : "Essay"}
                        </span>
                      </div>
                      <div style={S.qCardHeaderRight}>
                        <span style={S.marksPill}><Star size={12} /> {q.marks} {Number(q.marks) === 1 ? "mark" : "marks"}</span>
                        <span style={S.timePill}><Clock size={12} /> {q.time_limit || 60}s</span>
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
                            style={{ ...S.thumb, width: 72, height: 72 }}
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
                                <span style={S.qOptCorrectMark}><Check size={12} /> Correct</span>
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
    background: "var(--info-tint)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
    marginBottom: 16,
  }}>
    <div style={{
      fontSize: 12.5,
      fontWeight: 800,
      color: "var(--info)",
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <PenLine size={14} /> Expected Answer / Marking Guide
    </div>

    <div style={{
      fontSize: 13.5,
      color: "var(--text)",
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
                      <button className="aq-card-btn" style={S.editBtn} onClick={() => editQuestion(q)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="aq-card-btn" style={S.deleteBtn} onClick={() => deleteQuestion(q.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ── Field wrapper ── */
function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
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
   STYLES — built on the shared design tokens (var(--…)) so
   light and dark themes both work, matching StudentProfile.
========================================================= */
const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    padding: "24px 32px 56px",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },

  /* Top nav */
  topNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    flexWrap: "wrap",
    gap: 12,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    boxShadow: "var(--shadow-sm)",
  },
  topNavRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  topNavStat: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: "6px 12px", borderRadius: 20,
    boxShadow: "var(--shadow-sm)",
  },

  /* Deadline banner */
  banner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    margin: "0 0 16px",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
  },

  /* Generic panel (import / review) */
  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  panelTitleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },
  iconChip: {
    width: 32, height: 32, borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  importText: {
    margin: "0 0 14px", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7,
  },
  code: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 5,
    padding: "1px 5px",
    fontSize: 11.5,
    color: "var(--text)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  msg: {
    display: "flex", alignItems: "center", gap: 6,
    marginTop: 12, fontSize: 12.5, fontWeight: 600,
  },

  /* Compact buttons/inputs used in import + review panels */
  primaryBtnSm: {
    padding: "9px 16px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  ghostBtnSm: {
    padding: "9px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  inputSm: {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textareaSm: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 13.5,
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },

  /* Thumbnails */
  thumb: {
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid var(--border)",
    display: "block",
  },
  thumbRemove: {
    position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
    background: "var(--destructive)", color: "#fff", border: "2px solid var(--card)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0,
  },

  /* Two-column layout */
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(360px,480px) 1fr",
    gap: 20,
    alignItems: "flex-start",
  },
  formCol: {},
  listCol: {},

  /* Form card */
  formCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "22px 24px",
    boxShadow: "var(--shadow-sm)",
    position: "sticky",
    top: 20,
  },
  formHeader: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid var(--border)",
  },
  formHeaderIcon: {
    width: 42, height: 42, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  formTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  formSubtitle: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  /* Type toggle */
  typeToggle: {
    display: "flex", gap: 10, marginBottom: 20,
  },
  typeBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1.5px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text-muted)", cursor: "pointer",
    fontSize: 13.5, fontWeight: 700, transition: "all 0.2s",
    fontFamily: "inherit",
  },
  typeBtnActive: {
    background: "var(--primary-tint)",
    border: "1.5px solid var(--primary)",
    color: "var(--primary)",
  },

  /* Fields */
  fieldLabel: {
    fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.04em",
  },
  fieldHint: { fontSize: 11.5, color: "var(--text-muted)" },
  textarea: {
    width: "100%", padding: "11px 13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)", fontSize: 14, lineHeight: 1.6,
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  input: {
    width: "100%", padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)", fontSize: 13.5,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },

  /* MCQ section */
  mcqSection: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: 16, marginBottom: 18,
  },
  mcqSectionHeader: { marginBottom: 12 },
  mcqSectionTitle: { fontSize: 13.5, fontWeight: 800, color: "var(--text)" },
  mcqSectionHint: { display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 3 },
  optionsGrid: { display: "flex", flexDirection: "column", gap: 8 },
  optionInputRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px", borderRadius: "var(--radius-sm)",
    background: "var(--card)",
    border: "1.5px solid var(--border)",
    transition: "border 0.2s, box-shadow 0.2s",
  },
  optionInputRowCorrect: {
    border: "1.5px solid var(--success)",
    background: "var(--success-tint)",
  },
  optLabelBubble: {
    width: 30, height: 30, minWidth: 30, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    fontWeight: 800, fontSize: 13, color: "var(--text-secondary)",
  },
  optLabelBubbleCorrect: { background: "var(--success)", border: "1px solid var(--success)", color: "var(--card)" },
  optInput: {
    flex: 1, minWidth: 0, background: "transparent", border: "none",
    outline: "none", color: "var(--text)", fontSize: 14,
    fontFamily: "inherit",
  },
  markCorrectBtn: {
    width: 30, height: 30, borderRadius: 8, border: "1.5px solid var(--border)",
    background: "transparent", color: "var(--text-muted)",
    cursor: "pointer", fontSize: 15, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, fontFamily: "inherit",
  },
  markCorrectBtnActive: { border: "1.5px solid var(--success)", color: "var(--success)", background: "var(--success-tint)" },
  correctAnswerBadge: {
    display: "flex", alignItems: "flex-start", gap: 8,
    marginTop: 12, padding: "9px 12px", borderRadius: "var(--radius-sm)",
    background: "var(--success-tint)", border: "1px solid var(--success)",
    color: "var(--success)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5,
  },

  /* Essay section */
  essaySection: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: 16, marginBottom: 18,
  },
  essayHeader: { marginBottom: 12 },
  essaySectionTitle: { fontSize: 13.5, fontWeight: 800, color: "var(--info)" },
  essaySectionHint: { display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 3 },

  /* Add image button */
  addImageBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: "var(--radius-sm)",
    background: "var(--card)", border: "1px solid var(--border)",
    color: "var(--text-secondary)", cursor: "pointer",
    fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
    boxShadow: "var(--shadow-sm)",
  },

  /* Form actions */
  formActions: { display: "flex", gap: 10, marginTop: 6 },
  saveBtn: {
    flex: 1, padding: "11px 16px",
    borderRadius: "var(--radius-sm)", border: "none",
    background: "var(--primary)",
    color: "#fff", fontWeight: 700, fontSize: 13.5,
    cursor: "pointer", fontFamily: "inherit",
  },
  cancelBtn: {
    padding: "11px 18px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
    fontFamily: "inherit",
  },

  /* List column */
  listHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  },
  listTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  listCount: {
    fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 700,
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: "5px 12px", borderRadius: 20,
  },
  questionList: { display: "flex", flexDirection: "column", gap: 14 },
  emptyList: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "56px 20px", gap: 12,
    background: "var(--card)",
    border: "1px dashed var(--border)",
    borderRadius: "var(--radius)", textAlign: "center",
  },
  emptyText: { margin: 0, color: "var(--text-muted)", fontSize: 14, fontWeight: 500 },

  /* Question card */
  qCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "18px 20px",
    boxShadow: "var(--shadow-sm)",
    transition: "border 0.2s, box-shadow 0.2s",
  },
  qCardEditing: {
    border: "1.5px solid var(--warning)",
    boxShadow: "0 0 0 3px var(--warning-tint)",
  },
  qCardHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12, flexWrap: "wrap", gap: 10,
  },
  qCardHeaderLeft: { display: "flex", alignItems: "center", gap: 8 },
  qCardHeaderRight: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  qIndexBadge: {
    padding: "4px 11px", borderRadius: 8,
    fontSize: 12.5, fontWeight: 800,
  },
  qTypePill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 20,
    fontSize: 11.5, fontWeight: 700,
    background: "transparent",
  },
  marksPill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 20,
    background: "var(--warning-tint)",
    color: "var(--warning)", fontSize: 11.5, fontWeight: 700,
  },
  timePill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 20,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)", fontSize: 11.5, fontWeight: 700,
  },

  qText: { fontSize: 15, lineHeight: 1.6, color: "var(--text)", margin: "0 0 14px", fontWeight: 600 },

  /* Options in card */
  qOptions: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  qOption: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "8px 12px", borderRadius: "var(--radius-sm)",
    background: "var(--bg)",
    border: "1.5px solid var(--border)",
  },
  qOptionCorrect: {
    background: "var(--success-tint)",
    border: "1.5px solid var(--success)",
  },
  qOptLabel: {
    width: 28, height: 28, minWidth: 28, borderRadius: 8,
    background: "var(--card)",
    border: "1px solid var(--border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 12.5, color: "var(--text-secondary)",
  },
  qOptLabelCorrect: { background: "var(--success)", border: "1px solid var(--success)", color: "var(--card)" },
  qOptText: { flex: 1, fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 },
  qOptCorrectMark: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11.5, fontWeight: 700, color: "var(--success)",
    padding: "2px 9px", borderRadius: 20,
    border: "1px solid var(--success)",
  },

  /* Card actions */
  qCardActions: { display: "flex", gap: 10, paddingTop: 4 },
  editBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "9px", borderRadius: "var(--radius-sm)",
    background: "var(--warning-tint)",
    border: "1px solid var(--warning)",
    color: "var(--warning)", cursor: "pointer", fontWeight: 700, fontSize: 13,
    fontFamily: "inherit",
  },
  deleteBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "9px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--destructive)",
    background: "var(--destructive-tint)",
    color: "var(--destructive)", cursor: "pointer", fontWeight: 700, fontSize: 13,
    fontFamily: "inherit",
  },
};