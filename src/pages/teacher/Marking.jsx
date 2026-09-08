import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";

/* ─── helpers (unchanged logic) ─── */
function toDisplayHTML(raw) {
  if (!raw) return "";
  const looksLikeHTML = /<\/?[a-z][\s\S]*>/i.test(raw);
  if (looksLikeHTML) return raw;
  const div = document.createElement("div");
  div.textContent = raw;
  return div.innerHTML.replace(/\n/g, "<br/>");
}

/* ═══════════════════════════════════════════════════════════
   ICONS — minimal stroke-based SVGs (no external icon library)
═══════════════════════════════════════════════════════════ */
function Icon({ children, size = 16, strokeWidth = 1.8, style, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0, ...style }}
      {...rest}
    >
      {children}
    </svg>
  );
}
const IconEdit = (p) => (
  <Icon {...p}>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
const IconFlag = (p) => (
  <Icon {...p}>
    <path d="M4 22V4" />
    <path d="M4 4h13l-2 4 2 4H4" />
  </Icon>
);
const IconCheckCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.4 2.4L15.5 9.5" />
  </Icon>
);
const IconXCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9.5 9.5 5 5" />
    <path d="m14.5 9.5-5 5" />
  </Icon>
);
const IconAlertTriangle = (p) => (
  <Icon {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 9.5v4.5" />
    <path d="M12 17.2h.01" />
  </Icon>
);
const IconChevronLeft = (p) => (
  <Icon {...p}>
    <path d="m14 6-6 6 6 6" />
  </Icon>
);
const IconChevronRight = (p) => (
  <Icon {...p}>
    <path d="m10 6 6 6-6 6" />
  </Icon>
);
const IconMinus = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);
const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);
const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M4 6.5h16" />
    <path d="M9 6.5V4h6v2.5" />
    <path d="m6.5 6.5 1 13h9l1-13" />
  </Icon>
);
const IconClose = (p) => (
  <Icon {...p}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </Icon>
);
const IconClipboard = (p) => (
  <Icon {...p}>
    <rect x="6" y="4" width="12" height="17" rx="1.5" />
    <path d="M9.5 4V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
  </Icon>
);

/* ─── one-time global styles: tokens, fonts, keyframes, responsive layout ─── */
function useGlobalMarkingStyles() {
  useEffect(() => {
    const linkId = "mp-font-link";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
      document.head.appendChild(link);
    }
    const styleId = "mp-style-block-v3";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        :root {
          --mp-bg: #ffffff;
          --mp-surface: #ffffff;
          --mp-surface-2: #fafafa;
          --mp-surface-3: #f0f0f1;
          --mp-border: #e5e5e7;
          --mp-border-strong: #d6d6d9;
          --mp-text: #0a0a0b;
          --mp-text-dim: #63636a;
          --mp-text-faint: #9a9aa1;
          --mp-highlight-bg: rgba(250, 204, 21, .32);
          --mp-highlight-border: #ca8a04;
          --mp-green: #15803d;
          --mp-green-bg: #f0fdf4;
          --mp-green-border: #bbf7d0;
          --mp-red: #b91c1c;
          --mp-red-bg: #fef2f2;
          --mp-red-border: #fecaca;
          --mp-amber-text: #92400e;
          --mp-amber-bg: #fffbeb;
          --mp-amber-border: #fde68a;
        }
        * { box-sizing: border-box; }

        @keyframes mp-spin { to { transform: rotate(360deg); } }
        @keyframes mp-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mp-toast-in { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mp-pop { 0% { background-color: rgba(250,204,21,.65); } 100% { background-color: var(--mp-highlight-bg); } }

        .mp-root { min-height: 100%; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          padding: 32px 28px 90px; color: var(--mp-text); font-family: 'Inter', system-ui, sans-serif; max-width: 900px; margin: 0 auto; }
        @media (max-width: 720px) { .mp-root { padding: 18px 12px 90px; } }

        .mp-card { animation: mp-fade-up .28s cubic-bezier(.2,.8,.3,1) both; }
        .mp-heading-gradient { color: var(--mp-text); }

        .mp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
        @media (max-width: 560px) { .mp-header { flex-direction: column; align-items: stretch; } .mp-header > button { width: 100%; } }

        .mp-meta-card { background: var(--mp-surface); padding: 18px 20px; border-radius: 12px;
          margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px;
          border: 1px solid var(--mp-border); box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        @media (max-width: 480px) { .mp-meta-card { grid-template-columns: 1fr 1fr; } }

        .essay-readonly { user-select: text; caret-color: transparent; outline: none; }
        .essay-readonly:focus { outline: none; }
        .hl-mark { background: var(--mp-highlight-bg); border-bottom: 2px solid var(--mp-highlight-border); border-radius: 3px; padding: 1px 3px; cursor: pointer; position: relative; animation: mp-pop .4s ease; transition: background .15s ease; color: var(--mp-text); }
        .hl-mark:hover { background: rgba(250,204,21,.5); }
        .hl-mark::after { content: "+" attr(data-mark); position: absolute; top: -9px; right: -6px; background: var(--mp-text); color: #fff; font-size: 9px; font-weight: 800; border-radius: 5px; padding: 0 3px; line-height: 13px; font-family: 'JetBrains Mono', monospace; pointer-events: none; }

        .mp-btn { transition: transform .12s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease, border-color .15s ease; cursor: pointer; font-family: inherit; }
        .mp-btn:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(0,0,0,.12); }
        .mp-btn:active:not(:disabled) { transform: translateY(0.5px); }
        .mp-btn:focus-visible { outline: 2px solid var(--mp-text); outline-offset: 2px; }
        .mp-btn:disabled { cursor: not-allowed; }

        .mp-dot { transition: all .15s ease; }
        .mp-dot.mp-dot-flagged { box-shadow: 0 0 0 2px var(--mp-amber-border) inset; }
        .mp-dot.mp-dot-current { box-shadow: 0 0 0 3px rgba(10,10,11,.14); }

        .mp-progress-track { position: relative; overflow: hidden; }
        .mp-progress-fill { background: var(--mp-text); }

        .mp-toast { animation: mp-toast-in .25s cubic-bezier(.2,.9,.3,1.1); }
        .mp-stepper-btn { transition: background .15s ease, opacity .15s ease; }
        .mp-stepper-btn:hover:not(:disabled) { background: var(--mp-surface-3); }
        .mp-flag-btn.active { background: var(--mp-amber-bg) !important; border-color: var(--mp-amber-border) !important; color: var(--mp-amber-text) !important; }

        .mp-qheader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 10px; }
        .mp-qheader-badges { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .mp-navrow { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--mp-border); flex-wrap: wrap; gap: 10px; }
        @media (max-width: 560px) { .mp-navrow { flex-direction: column-reverse; align-items: stretch; } .mp-navrow > button { width: 100%; } .mp-nav-counter { text-align: center; } }

        .mp-mcq-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; background: var(--mp-surface-2); border: 1px solid var(--mp-border); flex-wrap: wrap; }

        .mp-stamp { display: inline-flex; align-items: center; gap: 8px; border: 1.5px dashed var(--mp-border-strong); color: var(--mp-text); border-radius: 10px; padding: 9px 20px; font-family: 'JetBrains Mono', monospace; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: 12.5px; }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

/* ─── Toast ─── */
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const palette = {
    success: { bg: "var(--mp-green-bg)", border: "var(--mp-green-border)", text: "var(--mp-green)" },
    error: { bg: "var(--mp-red-bg)", border: "var(--mp-red-border)", text: "var(--mp-red)" },
    info: { bg: "var(--mp-surface-2)", border: "var(--mp-border-strong)", text: "var(--mp-text)" },
  }[toast.type || "info"];
  return (
    <div className="mp-toast" style={{
      position: "fixed", bottom: 20, right: 20, left: 20, margin: "0 auto", maxWidth: 380, zIndex: 1000,
      background: palette.bg, border: `1px solid ${palette.border}`, color: palette.text,
      padding: "12px 16px", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.1)",
      display: "flex", alignItems: "center", gap: 14, fontSize: 13.5,
    }}>
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button onClick={() => { toast.action.onClick(); onDismiss(); }}
          style={{ background: "none", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0, textDecoration: "underline" }}>
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.6 }}>
        <IconClose size={14} />
      </button>
    </div>
  );
}

/* ─── Circular score gauge (monochrome) ─── */
function ScoreGauge({ value, max, size = 60 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--mp-surface-3)" strokeWidth="6" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#mpGaugeGrad)" strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)" }} />
      <defs>
        <linearGradient id="mpGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a0a0b" />
          <stop offset="100%" stopColor="#52525b" />
        </linearGradient>
      </defs>
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="var(--mp-text)" fontSize={size * 0.24} fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {max > 0 ? `${Math.round(pct)}%` : "–"}
      </text>
    </svg>
  );
}

/* ─── Read-only rich essay viewer: preserves formatting, highlight-to-mark ─── */
function RichEssayViewer({ answerId, html, highlights, maxMarks, onAdd, onRemove, onAdjust }) {
  const containerRef = useRef(null);
  const totalMarks = highlights.reduce((s, h) => s + (h.mark || 0), 0);

  const removeMark = useCallback((hid) => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-hid="${hid}"]`);
    if (el) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      parent.normalize();
    }
    onRemove(hid, container.innerHTML);
  }, [onRemove]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length < 3) { sel.removeAllRanges(); return; }

    const existingMarks = container.querySelectorAll(".hl-mark");
    for (const el of existingMarks) {
      if (range.intersectsNode(el)) { sel.removeAllRanges(); return; }
    }

    const remaining = Math.max(0, (maxMarks || 1) - totalMarks);
    if (remaining <= 0) { sel.removeAllRanges(); return; }
    const markValue = Math.min(1, remaining);

    const hid = `hl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const markEl = document.createElement("mark");
    markEl.className = "hl-mark";
    markEl.dataset.hid = hid;
    markEl.dataset.mark = String(markValue);
    markEl.title = "Click to remove this mark";

    try { range.surroundContents(markEl); }
    catch (e) { const frag = range.extractContents(); markEl.appendChild(frag); range.insertNode(markEl); }
    sel.removeAllRanges();

    onAdd({ id: hid, text: selectedText, mark: markValue }, container.innerHTML);
  }, [highlights, maxMarks, totalMarks, onAdd]);

  const handleContainerClick = useCallback((e) => {
    const markEl = e.target.closest && e.target.closest(".hl-mark");
    if (!markEl) return;
    removeMark(markEl.dataset.hid);
  }, [removeMark]);

  const adjust = (hlId, delta) => {
    const list = highlights;
    const current = list.find((h) => h.id === hlId);
    if (!current) return;
    const others = list.reduce((s, h) => (h.id === hlId ? s : s + (h.mark || 0)), 0);
    let next = (current.mark || 0) + delta;
    next = Math.max(0, next);
    if (maxMarks != null) next = Math.min(next, Math.max(0, maxMarks - others));
    const container = containerRef.current;
    const el = container && container.querySelector(`[data-hid="${hlId}"]`);
    if (el) el.dataset.mark = String(next);
    onAdjust(hlId, next, container ? container.innerHTML : "");
  };

  return (
    <div style={s.essayOuter}>
      <div style={s.essayHint}>
        <IconEdit size={14} style={{ color: "var(--mp-text-faint)" }} />
        <span>
          Select the parts of the answer worth credit — a highlight is added automatically. Tap a highlight to remove it.
        </span>
        {maxMarks != null && (
          <span style={{ color: "var(--mp-text)", marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12 }}>
            {totalMarks} / {maxMarks} awarded
          </span>
        )}
      </div>

      <div
        key={answerId}
        ref={containerRef}
        className="essay-readonly"
        contentEditable={false}
        suppressContentEditableWarning
        onMouseUp={handleMouseUp}
        onClick={handleContainerClick}
        style={s.essayText}
        dangerouslySetInnerHTML={{ __html: html || '<em style="color:#9a9aa1">No answer was submitted for this question.</em>' }}
      />

      {highlights.length > 0 && (
        <div style={s.hlList}>
          {highlights.map((h) => (
            <div key={h.id} style={s.hlItem}>
              <span style={s.hlItemText}>"{h.text.slice(0, 60)}{h.text.length > 60 ? "…" : ""}"</span>
              <div style={s.stepper}>
                <button className="mp-stepper-btn" style={s.stepperBtn} onClick={() => adjust(h.id, -1)} disabled={(h.mark || 0) <= 0}>
                  <IconMinus size={12} />
                </button>
                <span style={s.stepperVal}>+{h.mark}</span>
                <button className="mp-stepper-btn" style={s.stepperBtn} onClick={() => adjust(h.id, 1)} disabled={maxMarks != null && totalMarks >= maxMarks}>
                  <IconPlus size={12} />
                </button>
              </div>
              <button onClick={() => removeMark(h.id)} style={s.hlItemRemove}>
                <IconTrash size={12} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Auto-graded MCQ summary row (read-only list, override still available) ─── */
function McqRow({ answer, score, onScoreChange }) {
  const isCorrect = (score || 0) > 0;
  return (
    <div className="mp-mcq-row">
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={s.mcqQuestion}>{answer.question_text}</p>
        <p style={s.mcqAnswerLine}>
          <span style={{ color: "var(--mp-text-faint)" }}>Answered:</span> {answer.selected_answer || <em>nothing submitted</em>}
          {!isCorrect && answer.correct_answer && (
            <span style={{ color: "var(--mp-text-faint)" }}> · <span style={{ color: "var(--mp-green)" }}>Correct: {answer.correct_answer}</span></span>
          )}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          ...s.mcqBadge,
          color: isCorrect ? "var(--mp-green)" : "var(--mp-red)",
          background: isCorrect ? "var(--mp-green-bg)" : "var(--mp-red-bg)",
          borderColor: isCorrect ? "var(--mp-green-border)" : "var(--mp-red-border)",
        }}>
          {isCorrect ? <IconCheckCircle size={13} /> : <IconXCircle size={13} />}
          {isCorrect ? "Correct" : "Incorrect"}
        </span>
        <input
          type="number"
          min={0}
          max={answer.max_marks ?? undefined}
          value={score ?? ""}
          onChange={(e) => onScoreChange(answer.id, e.target.value, answer.max_marks)}
          style={s.mcqInput}
          title="Override this score if needed"
        />
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function Marking() {
  useGlobalMarkingStyles();
  const { id } = useParams();
  const submissionId = id;

  const [essayAnswers, setEssayAnswers] = useState([]); // answers still needing manual marking (or already graded)
  const [mcqAnswers, setMcqAnswers] = useState([]);      // auto-graded, shown as a summary, not a queue
  const [submission, setSubmission] = useState({});
  const [queue, setQueue] = useState([]); // essay answers still pending a mark
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState({});
  const [highlights, setHighlights] = useState({});
  const [essayHTML, setEssayHTML] = useState({});
  const [flags, setFlags] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = "info", action) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const tId = Date.now();
    setToast({ tId, message, type, action });
    toastTimerRef.current = setTimeout(() => setToast((t) => (t && t.tId === tId ? null : t)), 4500);
  }, []);
  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  /* ── LOAD ── */
  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await API.get(`/e-assessments/marking/${submissionId}`);
        if (Array.isArray(res.data) && res.data.length === 0) {
          setError("This submission couldn't be found.");
          return;
        }
        if (res.data && typeof res.data === "object") {
          const answers = res.data.answers || [];
          setSubmission(res.data.submission || {});

          const mcqs = [];
          const essays = [];
          const autoScores = {};
          const initialHTML = {};
          const initialHighlights = {};
          const pendingEssays = [];

          for (const a of answers) {
            if (a.question_type !== "essay") {
              // MCQs are auto-marked server-side already — surface as a read-only summary
              const isCorrect =
                (a.selected_answer || "").toString().trim().toLowerCase() ===
                (a.correct_answer || "").toString().trim().toLowerCase();
              autoScores[a.id] = a.marks_awarded != null ? a.marks_awarded : (isCorrect ? Number(a.max_marks) || 1 : 0);
              mcqs.push(a);
            } else {
              essays.push(a);
              initialHTML[a.id] = toDisplayHTML(a.essay_answer || "");
              // Already graded in a previous save — show as marked, keep out of the active queue
              if (a.marks_awarded != null) {
                autoScores[a.id] = a.marks_awarded;
                initialHighlights[a.id] = [{ id: `prior_${a.id}`, text: "Previously marked", mark: a.marks_awarded, prior: true }];
              } else {
                pendingEssays.push(a);
              }
            }
          }

          setScores(autoScores);
          setEssayHTML(initialHTML);
          setHighlights(initialHighlights);
          setMcqAnswers(mcqs);
          setEssayAnswers(essays);
          setQueue(pendingEssays);
          if (pendingEssays.length === 0) setAllDone(true);
        }
      } catch (err) {
        console.error("MARKING FETCH ERROR:", err.response?.data || err);
        setError("Couldn't load this submission. Give it another try.");
      } finally {
        setLoading(false);
      }
    })();
  }, [submissionId]);

  /* ── Sync highlight marks → scores for essays ── */
  useEffect(() => {
    setScores((prev) => {
      const next = { ...prev };
      for (const [aId, hls] of Object.entries(highlights)) {
        const editable = hls.filter((h) => !h.prior);
        if (editable.length > 0 || !hls.some((h) => h.prior)) {
          next[aId] = editable.reduce((sum, h) => sum + (h.mark || 0), 0);
        }
      }
      return next;
    });
  }, [highlights]);

  /* ── warn on unsaved changes before leaving ── */
  useEffect(() => {
    const handler = (e) => {
      if (!saved && essayAnswers.length + mcqAnswers.length > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saved, essayAnswers.length, mcqAnswers.length]);

  /* ── DERIVED ── */
  const current = queue[currentIdx];
  const allAnswers = useMemo(() => [...mcqAnswers, ...essayAnswers], [mcqAnswers, essayAnswers]);
  const totalScore = Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
  const maxPossible = allAnswers.reduce((s, a) => s + (Number(a.max_marks) || 0), 0);
  const remaining = queue.length;
  const markedCount = essayAnswers.length - remaining;
  const progressPct = essayAnswers.length > 0 ? Math.round((markedCount / essayAnswers.length) * 100) : 100;
  const flaggedAnswers = useMemo(() => allAnswers.filter((a) => flags[a.id]), [allAnswers, flags]);
  const currentHighlights = current ? (highlights[current.id] || []).filter((h) => !h.prior) : [];

  /* ── HIGHLIGHT HANDLERS ── */
  const addHighlight = useCallback((answerId, hl) => {
    setHighlights((prev) => ({ ...prev, [answerId]: [...(prev[answerId] || []).filter((h) => !h.prior), hl] }));
    setSaved(false);
  }, []);
  const removeHighlight = useCallback((answerId, hlId) => {
    setHighlights((prev) => ({ ...prev, [answerId]: (prev[answerId] || []).filter((h) => h.id !== hlId) }));
    setSaved(false);
  }, []);
  const adjustHighlight = useCallback((answerId, hlId, newMark) => {
    setHighlights((prev) => ({ ...prev, [answerId]: (prev[answerId] || []).map((h) => (h.id === hlId ? { ...h, mark: newMark } : h)) }));
    setSaved(false);
  }, []);

  const handleEssayAdd = useCallback((hl, newHtml) => {
    if (!current) return;
    addHighlight(current.id, hl);
    setEssayHTML((prev) => ({ ...prev, [current.id]: newHtml }));
  }, [current, addHighlight]);

  const handleEssayRemove = useCallback((hlId, newHtml) => {
    if (!current) return;
    const answerId = current.id;
    const prevHTML = essayHTML[answerId];
    const prevList = highlights[answerId] || [];
    removeHighlight(answerId, hlId);
    setEssayHTML((prev) => ({ ...prev, [answerId]: newHtml }));
    showToast("Highlight removed", "info", {
      label: "Undo",
      onClick: () => {
        setEssayHTML((prev) => ({ ...prev, [answerId]: prevHTML }));
        setHighlights((prev) => ({ ...prev, [answerId]: prevList }));
      },
    });
  }, [current, essayHTML, highlights, removeHighlight, showToast]);

  const handleEssayAdjust = useCallback((hlId, newMark, newHtml) => {
    if (!current) return;
    adjustHighlight(current.id, hlId, newMark);
    setEssayHTML((prev) => ({ ...prev, [current.id]: newHtml }));
  }, [current, adjustHighlight]);

  /* ── MARK & DISMISS: removes current question from the pending queue ── */
  const markAndAdvance = useCallback(() => {
    if (!current) return;
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== currentIdx);
      if (next.length === 0) setAllDone(true);
      return next;
    });
    setCurrentIdx((prev) => Math.max(0, Math.min(prev, queue.length - 2)));
    setSaved(false);
  }, [current, currentIdx, queue.length]);

  const handleScoreChange = (answerId, value, maxMarks) => {
    const num = value === "" ? "" : Math.min(Number(value), maxMarks ?? Infinity);
    setScores((prev) => ({ ...prev, [answerId]: num }));
    setSaved(false);
  };

  const handleRemarkChange = (answerId, value) => {
    setRemarks((prev) => ({ ...prev, [answerId]: value }));
    setSaved(false);
  };

  const toggleFlag = useCallback((answerId) => {
    setFlags((prev) => ({ ...prev, [answerId]: !prev[answerId] }));
  }, []);

  const reopenAnswer = useCallback((answer) => {
    setHighlights((prev) => ({ ...prev, [answer.id]: (prev[answer.id] || []).filter((h) => !h.prior) }));
    setQueue([answer]);
    setCurrentIdx(0);
    setAllDone(false);
  }, []);

  /* ── NAV ── */
  const goNext = useCallback(() => setCurrentIdx((i) => (i < queue.length - 1 ? i + 1 : i)), [queue.length]);
  const goPrev = useCallback(() => setCurrentIdx((i) => (i > 0 ? i - 1 : i)), []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (loading || error || allDone || !current) return;
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "Enter") { e.preventDefault(); markAndAdvance(); }
      else if (e.key.toLowerCase() === "f") { e.preventDefault(); toggleFlag(current.id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, error, allDone, current, goNext, goPrev, markAndAdvance, toggleFlag]);

  /* ── SAVE ── */
  const saveMarking = async () => {
    try {
      setSaving(true);
      await API.post("/e-assessments/save-marking", { submission_id: submissionId, scores, remarks }, { headers: { "Content-Type": "application/json" } });
      setSaved(true);
      showToast("Marks saved", "success");
    } catch (err) {
      console.error("SAVE ERROR:", err);
      showToast(err?.response?.data?.message || "Couldn't save — try again", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── LOADING / ERROR ── */
  if (loading)
    return (
      <div className="mp-root">
        <div style={s.centered}>
          <div style={s.spinner} />
          <p style={{ color: "var(--mp-text-dim)", marginTop: 16 }}>Loading the submission…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="mp-root">
        <div style={s.errorBanner}>
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );

  /* ── ALL DONE ── */
  if (allDone)
    return (
      <div className="mp-root">
        <Toast toast={toast} onDismiss={dismissToast} />
        <div className="mp-header">
          <div>
            <h2 style={s.heading} className="mp-heading-gradient">Marking complete</h2>
            <p style={s.subheading}>Every question in this submission has a mark.</p>
          </div>
          <button onClick={saveMarking} disabled={saving} className="mp-btn"
            style={{ ...s.btn, background: saved ? "var(--mp-green)" : "var(--mp-text)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : saved ? "Saved" : "Save final marks"}
          </button>
        </div>

        <div className="mp-meta-card">
          <MetaItem label="Student ID" value={submission?.student_id || "—"} />
          <MetaItem label="Assessment" value={submission?.assessment_id || "—"} />
          <MetaItem label="Questions" value={allAnswers.length} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreGauge value={totalScore} max={maxPossible} />
            <div>
              <span style={s.metaLabelSmall}>Final score</span>
              <span style={s.metaValueBig}>{totalScore}{maxPossible > 0 && <span style={{ color: "var(--mp-text-faint)" }}> / {maxPossible}</span>}</span>
            </div>
          </div>
        </div>

        {flaggedAnswers.length > 0 && (
          <div style={s.flagCard}>
            <p style={s.flagCardTitle}><IconFlag size={14} /> {flaggedAnswers.length} question{flaggedAnswers.length !== 1 ? "s" : ""} flagged for a second look</p>
            {flaggedAnswers.map((a) => (
              <div key={a.id} style={s.flagRow}>
                <span style={s.flagRowText}>{(a.question_text || "").slice(0, 90)}{(a.question_text || "").length > 90 ? "…" : ""}</span>
                {a.question_type === "essay" && (
                  <button onClick={() => reopenAnswer(a)} className="mp-btn" style={s.reopenBtn}>Reopen</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={s.doneCard} className="mp-card">
          <span className="mp-stamp"><IconCheckCircle size={14} /> Graded</span>
          <p style={s.doneTitle}>All marked</p>
          <p style={s.doneSub}>
            Final score: <strong style={{ color: "var(--mp-text)" }}>{totalScore}</strong>
            {maxPossible > 0 && <span style={{ color: "var(--mp-text-faint)" }}> / {maxPossible}</span>}
          </p>
          <button onClick={saveMarking} disabled={saving} className="mp-btn"
            style={{ ...s.btn, background: saved ? "var(--mp-green)" : "var(--mp-text)", marginTop: 20, padding: "13px 36px", fontSize: 15 }}>
            {saving ? "Saving…" : saved ? "Marks saved" : "Save & finish"}
          </button>
        </div>
      </div>
    );

  /* ── MAIN RENDER ── */
  return (
    <div className="mp-root">
      <Toast toast={toast} onDismiss={dismissToast} />

      <div className="mp-header">
        <div>
          <h2 style={s.heading} className="mp-heading-gradient">Marking panel</h2>
          <p style={s.subheading}>
            <span style={{ color: "var(--mp-text)", fontWeight: 700 }}>{remaining}</span> essay question{remaining !== 1 ? "s" : ""} left
            {flaggedAnswers.length > 0 && <span style={{ color: "var(--mp-amber-text)" }}> · {flaggedAnswers.length} flagged</span>}
            {!saved && allAnswers.length > 0 && <span style={{ color: "var(--mp-text-faint)" }}> · unsaved changes</span>}
          </p>
        </div>
        <button onClick={saveMarking} disabled={saving || allAnswers.length === 0} className="mp-btn"
          style={{ ...s.btn, background: saved ? "var(--mp-green)" : "var(--mp-text)", opacity: saving || allAnswers.length === 0 ? 0.6 : 1 }}>
          {saving ? "Saving…" : saved ? "Saved" : "Save marks"}
        </button>
      </div>

      {essayAnswers.length > 0 && (
        <div style={s.progressTrack} className="mp-progress-track">
          <div className="mp-progress-fill" style={{ ...s.progressFill, width: `${progressPct}%` }} />
        </div>
      )}

      <div className="mp-meta-card">
        <MetaItem label="Student ID" value={submission?.student_id || "—"} />
        <MetaItem label="Assessment" value={submission?.assessment_id || "—"} />
        <MetaItem label="Remaining" value={remaining} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ScoreGauge value={totalScore} max={maxPossible} size={52} />
          <div>
            <span style={s.metaLabelSmall}>Score so far</span>
            <span style={s.metaValueBig}>{totalScore}{maxPossible > 0 && <span style={{ color: "var(--mp-text-faint)" }}> / {maxPossible}</span>}</span>
          </div>
        </div>
      </div>

      {mcqAnswers.length > 0 && (
        <>
          <Label text={`Multiple choice — graded automatically (${mcqAnswers.length})`} />
          <div style={s.mcqList}>
            {mcqAnswers.map((a) => (
              <McqRow key={a.id} answer={a} score={scores[a.id]} onScoreChange={handleScoreChange} />
            ))}
          </div>
        </>
      )}

      {queue.length > 0 && (
        <div style={s.dotRow}>
          {queue.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setCurrentIdx(i)}
              title={`Question ${i + 1}${flags[a.id] ? " — flagged" : ""}`}
              className={`mp-dot${i === currentIdx ? " mp-dot-current" : ""}${flags[a.id] ? " mp-dot-flagged" : ""}`}
              style={{ ...s.dot, background: i === currentIdx ? "var(--mp-text)" : "var(--mp-surface-3)", border: `1px solid ${i === currentIdx ? "var(--mp-text)" : "var(--mp-border)"}` }}
            />
          ))}
        </div>
      )}

      {essayAnswers.length === 0 ? null : !current ? (
        <div style={s.emptyCard}>Every essay question here already has a mark. Nicely done.</div>
      ) : (
        <div style={s.qCard} className="mp-card" key={current.id}>
          <div className="mp-qheader">
            <div className="mp-qheader-badges">
              <span style={s.badge}>Q{essayAnswers.findIndex((a) => a.id === current.id) + 1}</span>
              <span style={s.typePill}>Essay</span>
            </div>
            <div className="mp-qheader-badges">
              {current.max_marks != null && <span style={s.maxMarks}>{current.max_marks} mark{current.max_marks !== 1 ? "s" : ""}</span>}
              <button onClick={() => toggleFlag(current.id)} className={`mp-btn mp-flag-btn${flags[current.id] ? " active" : ""}`} style={s.flagToggle} title="Flag for a second look (F)">
                <IconFlag size={13} /> {flags[current.id] ? "Flagged" : "Flag"}
              </button>
            </div>
          </div>

          <Label text="Question" />
          <div style={s.questionBox}>{current.question_text}</div>

          <Label text="Student's answer — highlight the parts worth credit" />
          <RichEssayViewer
            answerId={current.id}
            html={essayHTML[current.id] ?? toDisplayHTML(current.essay_answer || "")}
            highlights={currentHighlights}
            maxMarks={current.max_marks}
            onAdd={handleEssayAdd}
            onRemove={handleEssayRemove}
            onAdjust={handleEssayAdjust}
          />

          <Label text={`Override score${current.max_marks != null ? ` (max ${current.max_marks})` : ""}`} />
          <input
            type="number"
            min={0}
            max={current.max_marks ?? undefined}
            placeholder="Taken from highlights"
            value={scores[current.id] ?? ""}
            onChange={(e) => handleScoreChange(current.id, e.target.value, current.max_marks)}
            style={s.input}
          />

          <Label text="Feedback for the student (optional)" />
          <textarea
            placeholder="Add a note the student will see…"
            value={remarks[current.id] ?? ""}
            onChange={(e) => handleRemarkChange(current.id, e.target.value)}
            style={s.textarea}
          />

          <div className="mp-navrow">
            <button onClick={goPrev} disabled={currentIdx === 0} className="mp-btn" style={{ ...s.navBtn, opacity: currentIdx === 0 ? 0.35 : 1 }}>
              <IconChevronLeft size={14} /> Previous
            </button>
            <span className="mp-nav-counter" style={{ fontSize: 13, color: "var(--mp-text-faint)" }}>
              {currentIdx + 1} of {queue.length} <span style={{ opacity: 0.8 }}>· ← → to move, Enter to mark, F to flag</span>
            </span>
            <button onClick={markAndAdvance} className="mp-btn" style={s.markDoneBtn}>
              Mark &amp; next <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {allAnswers.length > 0 && (
        <div style={s.footer}>
          <span style={{ color: "var(--mp-text-dim)", fontSize: 14 }}>
            Score so far: <strong style={{ color: "var(--mp-text)" }}>{totalScore}</strong>
            {maxPossible > 0 && <span style={{ color: "var(--mp-text-faint)" }}> / {maxPossible}</span>}
          </span>
          <button onClick={saveMarking} disabled={saving} className="mp-btn" style={{ ...s.btn, background: saved ? "var(--mp-green)" : "var(--mp-text)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : saved ? "Saved" : "Save final marks"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Small helpers ─── */
function MetaItem({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: "var(--mp-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 500, color: "var(--mp-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}

function Label({ text }) {
  return <p style={{ fontSize: 12, color: "var(--mp-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 6px" }}>{text}</p>;
}

/* ─── Styles (dynamic bits only — layout/responsive rules live in the injected stylesheet) ─── */
const s = {
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  spinner: { width: 32, height: 32, border: "3px solid var(--mp-surface-3)", borderTop: "3px solid var(--mp-text)", borderRadius: "50%", animation: "mp-spin 0.8s linear infinite" },

  heading: { margin: 0, fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, fontFamily: "'Fraunces', serif", letterSpacing: "-0.01em" },
  subheading: { margin: "4px 0 0", fontSize: 14, color: "var(--mp-text-dim)" },

  progressTrack: { height: 5, borderRadius: 4, background: "var(--mp-surface-3)", marginBottom: 18, border: "1px solid var(--mp-border)" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width .4s cubic-bezier(.4,0,.2,1)" },

  metaLabelSmall: { fontSize: 11, color: "var(--mp-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" },
  metaValueBig: { fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--mp-text)" },

  mcqList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  mcqQuestion: { margin: 0, fontSize: 14, color: "var(--mp-text)", lineHeight: 1.5 },
  mcqAnswerLine: { margin: "4px 0 0", fontSize: 12.5, color: "var(--mp-text-dim)" },
  mcqBadge: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 },
  mcqInput: { width: 56, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--mp-border)", background: "var(--mp-surface)", color: "var(--mp-text)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", textAlign: "center" },

  dotRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 },
  dot: { width: 12, height: 12, borderRadius: "50%", cursor: "pointer", padding: 0 },

  qCard: { background: "var(--mp-surface)", padding: "22px 24px", borderRadius: 14, border: "1px solid var(--mp-border)", boxShadow: "0 1px 3px rgba(0,0,0,.04)" },
  badge: { background: "var(--mp-surface-2)", color: "var(--mp-text)", border: "1px solid var(--mp-border)", borderRadius: 6, padding: "3px 10px", fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  typePill: { background: "var(--mp-surface-2)", color: "var(--mp-text-dim)", border: "1px solid var(--mp-border)", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" },
  maxMarks: { fontSize: 13, color: "var(--mp-text-faint)" },
  flagToggle: { background: "var(--mp-surface)", border: "1px solid var(--mp-border)", color: "var(--mp-text-dim)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },

  questionBox: { background: "var(--mp-surface-2)", border: "1px solid var(--mp-border)", borderLeft: "3px solid var(--mp-text)", padding: "16px 14px", borderRadius: 8, fontSize: 16, lineHeight: 1.6, color: "var(--mp-text)" },

  essayOuter: { marginTop: 4 },
  essayHint: { fontSize: 12, color: "var(--mp-text-dim)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  hintIcon: { fontSize: 14 },
  essayText: { background: "var(--mp-surface-2)", border: "1px solid var(--mp-border)", borderLeft: "3px solid var(--mp-text)", padding: "14px 16px", borderRadius: 8, fontSize: 15, lineHeight: 1.9, color: "var(--mp-text)", cursor: "text", minHeight: 120 },
  hlList: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 },
  hlItem: { background: "var(--mp-surface-2)", border: "1px solid var(--mp-border)", borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" },
  hlItemText: { flex: 1, color: "var(--mp-text-dim)", fontStyle: "italic", minWidth: 120 },
  stepper: { display: "flex", alignItems: "center", gap: 6, background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: 6, padding: "2px 4px" },
  stepperBtn: { background: "none", border: "none", color: "var(--mp-text)", width: 20, height: 20, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  stepperVal: { color: "var(--mp-text)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, minWidth: 24, textAlign: "center" },
  hlItemRemove: { background: "none", border: "1px solid var(--mp-red-border)", color: "var(--mp-red)", borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 },

  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--mp-border)", background: "var(--mp-surface)", color: "var(--mp-text)", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "'JetBrains Mono', monospace" },
  textarea: { width: "100%", minHeight: 80, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--mp-border)", background: "var(--mp-surface)", color: "var(--mp-text)", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },

  markDoneBtn: { background: "var(--mp-text)", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 },
  navBtn: { background: "var(--mp-surface)", color: "var(--mp-text-dim)", border: "1px solid var(--mp-border)", padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" },

  btn: { color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" },

  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "14px 20px", background: "var(--mp-surface)", borderRadius: 10, border: "1px solid var(--mp-border)", flexWrap: "wrap", gap: 10 },
  emptyCard: { background: "var(--mp-surface)", padding: "32px 24px", borderRadius: 12, textAlign: "center", color: "var(--mp-text-faint)", border: "1px solid var(--mp-border)" },
  errorBanner: { background: "var(--mp-red-bg)", border: "1px solid var(--mp-red-border)", padding: "16px 20px", borderRadius: 10, display: "flex", gap: 12, alignItems: "center", color: "var(--mp-red)", maxWidth: 900, margin: "0 auto" },

  doneCard: { textAlign: "center", padding: "60px 24px", background: "var(--mp-surface)", borderRadius: 12, border: "1px solid var(--mp-border)", marginTop: 24 },
  doneTitle: { fontSize: 22, fontWeight: 700, color: "var(--mp-text)", margin: "20px 0 8px", fontFamily: "'Fraunces', serif" },
  doneSub: { fontSize: 16, color: "var(--mp-text-dim)", margin: 0 },

  flagCard: { background: "var(--mp-amber-bg)", border: "1px solid var(--mp-amber-border)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 },
  flagCardTitle: { margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--mp-amber-text)", display: "flex", alignItems: "center", gap: 6 },
  flagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--mp-amber-border)", flexWrap: "wrap" },
  flagRowText: { fontSize: 13, color: "var(--mp-text)", flex: 1, minWidth: 160 },
  reopenBtn: { background: "var(--mp-surface)", border: "1px solid var(--mp-border)", color: "var(--mp-text)", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 },
};