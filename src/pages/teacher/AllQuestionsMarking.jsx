import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";

/* ═══════════════════════════════════════════════════════════
   HELPERS  (unchanged logic)
═══════════════════════════════════════════════════════════ */
function interleave(groups) {
  const result = [];
  const maxLen = Math.max(...groups.map((g) => g.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const g of groups) {
      if (g[i] !== undefined) result.push(g[i]);
    }
  }
  return result;
}

function toDisplayHTML(raw) {
  if (!raw) return "";
  const looksLikeHTML = /<\/?[a-z][\s\S]*>/i.test(raw);
  if (looksLikeHTML) return raw;
  const div = document.createElement("div");
  div.textContent = raw;
  return div.innerHTML.replace(/\n/g, "<br/>");
}

function initials(name) {
  if (!name) return "?";
  const str = String(name).trim();
  if (!str) return "?";
  const parts = str.split(/\s+/);
  if (parts.length === 1) return str.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL STYLES — design tokens, fonts, keyframes, responsive
   layout rules (media queries can't live in inline style objects)
═══════════════════════════════════════════════════════════ */
function useGlobalMarkingStyles() {
  useEffect(() => {
    const linkId = "mkp-font-link";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap";
      document.head.appendChild(link);
    }
    const styleId = "mkp-style-block-v2";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        :root {
          --mk-ink: #0a0d12;
          --mk-surface: #121821;
          --mk-surface-2: #161d27;
          --mk-surface-3: #1b2330;
          --mk-border: #232c3a;
          --mk-border-soft: #1a2230;
          --mk-text: #eef1f6;
          --mk-text-dim: #8b96a8;
          --mk-text-faint: #56617a;
          --mk-amber: #f2b544;
          --mk-amber-soft: rgba(242,181,68,.16);
          --mk-blue: #5b8def;
          --mk-violet: #8b7bff;
          --mk-green: #34d399;
          --mk-red: #f87171;
        }

        @keyframes mkp-spin { to { transform: rotate(360deg); } }
        @keyframes mkp-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mkp-toast-in { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mkp-pop { 0% { background-color: rgba(242,181,68,.62); transform: scale(1.03); } 100% { background-color: rgba(242,181,68,.2); transform: scale(1); } }
        @keyframes mkp-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        @keyframes mkp-pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(242,181,68,.4); } 50% { box-shadow: 0 0 0 6px rgba(242,181,68,0); } }
        @keyframes mkp-ring-in { from { stroke-dashoffset: 999; } }
        @keyframes mkp-stamp-in { from { opacity: 0; transform: scale(1.4) rotate(-14deg); } to { opacity: 1; transform: scale(1) rotate(-8deg); } }

        * { box-sizing: border-box; }

        .mkp-root { min-height: 100%; background:
            radial-gradient(1100px 560px at 18% -8%, rgba(91,141,239,.09) 0%, transparent 55%),
            radial-gradient(900px 500px at 85% 0%, rgba(242,181,68,.06) 0%, transparent 50%),
            var(--mk-ink);
          padding: 36px 32px 110px; color: var(--mk-text);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          max-width: 880px; margin: 0 auto;
        }
        @media (max-width: 720px) { .mkp-root { padding: 20px 14px 100px; } }

        .mkp-card { animation: mkp-fade-up .32s cubic-bezier(.2,.8,.3,1) both; }
        .mkp-heading-gradient { background: linear-gradient(120deg, #f3f6fb 15%, #a9c4ff 55%, #f2b544 95%); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .mkp-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
        @media (max-width: 560px) { .mkp-topbar { flex-direction: column; align-items: stretch; } .mkp-topbar > button, .mkp-topbar-actions { width: 100%; } }

        .mkp-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        @media (max-width: 560px) { .mkp-stats-row { grid-template-columns: 1fr 1fr; } .mkp-stats-row > :last-child { grid-column: span 2; } }

        .mkp-essay-readonly { user-select: text; caret-color: transparent; outline: none; }
        .mkp-essay-readonly:focus { outline: none; }
        .hl-mark { background: rgba(242,181,68,.2); border-bottom: 2px solid var(--mk-amber); border-radius: 3px; padding: 1px 3px; cursor: pointer; position: relative; animation: mkp-pop .45s ease; transition: background .15s ease; }
        .hl-mark:hover { background: rgba(242,181,68,.4); }
        .hl-mark::after { content: "+" attr(data-mark); position: absolute; top: -9px; right: -6px; background: var(--mk-amber); color: #221806; font-size: 9px; font-weight: 800; border-radius: 5px; padding: 0 3px; line-height: 13px; font-family: 'JetBrains Mono', monospace; pointer-events: none; }

        .mkp-btn { transition: transform .15s ease, box-shadow .2s ease, background .2s ease, opacity .2s ease, filter .2s ease; cursor: pointer; font-family: inherit; }
        .mkp-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.07); box-shadow: 0 8px 20px rgba(91,141,239,.2); }
        .mkp-btn:active:not(:disabled) { transform: translateY(0); }
        .mkp-btn:focus-visible { outline: 2px solid var(--mk-blue); outline-offset: 2px; }
        .mkp-btn:disabled { cursor: not-allowed; }

        .mkp-dot { transition: all .2s ease; }
        .mkp-dot.mkp-dot-flagged { box-shadow: 0 0 0 2px var(--mk-amber) inset; }
        .mkp-dot.mkp-dot-current { animation: mkp-pulse-ring 1.7s ease infinite; }
        .mkp-dot:focus-visible { outline: 2px solid var(--mk-blue); outline-offset: 2px; }

        .mkp-progress-track { position: relative; overflow: hidden; }
        .mkp-progress-fill { position: relative; overflow: hidden; background: linear-gradient(90deg,var(--mk-blue),var(--mk-violet),var(--mk-amber)); background-size: 200% 100%; }
        .mkp-progress-fill::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent); background-size: 200px 100%; animation: mkp-shimmer 1.7s linear infinite; }

        .mkp-toast { animation: mkp-toast-in .28s cubic-bezier(.2,.9,.3,1.15); }
        .mkp-stepper-btn { transition: background .15s ease, opacity .15s ease; }
        .mkp-stepper-btn:hover:not(:disabled) { background: var(--mk-surface-3); }
        .mkp-flag-btn.active { background: rgba(242,181,68,.15) !important; border-color: var(--mk-amber) !important; color: var(--mk-amber) !important; }

        .mkp-rail-wrap { display: flex; gap: 14px; overflow-x: auto; padding: 4px 2px 14px; margin-bottom: 4px; }
        .mkp-rail-wrap::-webkit-scrollbar { height: 6px; }
        .mkp-rail-wrap::-webkit-scrollbar-thumb { background: var(--mk-surface-3); border-radius: 8px; }
        .mkp-rail-chip { transition: transform .18s ease, filter .18s ease; cursor: pointer; }
        .mkp-rail-chip:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .mkp-rail-chip.current { animation: mkp-pulse-ring 1.9s ease infinite; }
        .mkp-rail-ring circle.mkp-ring-fill { animation: mkp-ring-in .5s ease-out; }

        .mkp-qcard-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 6px; }
        .mkp-qcard-badges { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .mkp-navrow { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--mk-border); flex-wrap: wrap; gap: 12px; }
        @media (max-width: 560px) { .mkp-navrow { flex-direction: column; align-items: stretch; } .mkp-navrow-side { display: flex; gap: 10px; justify-content: space-between; } .mkp-navrow-side > button { flex: 1; } .mkp-nav-counter { order: 3; text-align: center; } }

        .mkp-rich-btn:hover { background: var(--mk-surface-3) !important; color: #eef2f8 !important; }

        .mkp-stamp { display: inline-flex; align-items: center; gap: 8px; border: 2.5px dashed var(--mk-green); color: var(--mk-green); border-radius: 12px; padding: 10px 22px; font-family: 'JetBrains Mono', monospace; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; font-size: 13px; transform: rotate(-8deg); animation: mkp-stamp-in .4s cubic-bezier(.2,.9,.3,1.2) both; }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const palette = {
    success: { bg: "#0f2a1e", border: "#1f6f4a", text: "#5eead4" },
    error: { bg: "#2a0f10", border: "#7f1d1d", text: "#fca5a5" },
    info: { bg: "#101722", border: "#263242", text: "#cbd5e1" },
  }[toast.type || "info"];
  return (
    <div
      className="mkp-toast"
      style={{
        position: "fixed", bottom: 20, right: 20, left: 20, zIndex: 1000, margin: "0 auto", maxWidth: 380,
        background: palette.bg, border: `1px solid ${palette.border}`, color: palette.text,
        padding: "12px 16px", borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", gap: 14, fontSize: 13.5,
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action.onClick(); onDismiss(); }}
          style={{ background: "none", border: "none", color: "var(--mk-amber)", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCORE GAUGE
═══════════════════════════════════════════════════════════ */
function ScoreGauge({ value, max, size = 56 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--mk-surface-3)" strokeWidth="6" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke="url(#mkpGaugeGrad)" strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
      />
      <defs>
        <linearGradient id="mkpGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b8def" />
          <stop offset="100%" stopColor="#f2b544" />
        </linearGradient>
      </defs>
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="#eef1f6" fontSize={size * 0.24} fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {max > 0 ? `${Math.round(pct)}%` : "–"}
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   STUDENT PROGRESS RAIL
═══════════════════════════════════════════════════════════ */
function StudentRail({ stats, currentSubmissionId, onJump }) {
  if (stats.length === 0) return null;
  const size = 46;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;

  return (
    <div className="mkp-rail-wrap">
      {stats.map((st) => {
        const pct = st.total > 0 ? st.marked / st.total : 0;
        const offset = c - pct * c;
        const isCurrent = st.submissionId === currentSubmissionId;
        const isComplete = st.total > 0 && st.marked === st.total;
        return (
          <button
            key={st.submissionId ?? st.studentId}
            onClick={() => onJump(st.submissionId)}
            className={`mkp-rail-chip${isCurrent ? " current" : ""}`}
            title={`Student ${st.studentId ?? "?"} — ${st.marked}/${st.total} marked`}
            style={s.railChip}
          >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mkp-rail-ring">
              <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--mk-surface-3)" strokeWidth="3.5" fill="none" />
              <circle
                className="mkp-ring-fill" cx={size / 2} cy={size / 2} r={r}
                stroke={isComplete ? "var(--mk-green)" : "url(#mkpRailGrad)"} strokeWidth="3.5" fill="none"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset .5s ease" }}
              />
              <defs>
                <linearGradient id="mkpRailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5b8def" />
                  <stop offset="100%" stopColor="#f2b544" />
                </linearGradient>
              </defs>
              <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill={isCurrent ? "var(--mk-amber)" : "#cbd5e1"} fontSize={12} fontWeight="700" fontFamily="'JetBrains Mono', monospace">
                {initials(st.studentId != null ? `S${st.studentId}` : "?")}
              </text>
            </svg>
            <span style={s.railLabel}>{isComplete ? "done" : `${st.marked}/${st.total}`}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RICH REMARK EDITOR
═══════════════════════════════════════════════════════════ */
function RichEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const execCmd = (cmd, arg = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || "");
  };

  return (
    <div style={s.richWrap}>
      <div style={s.richToolbar}>
        {[
          { label: "B", cmd: "bold", title: "Bold", w: 700 },
          { label: "I", cmd: "italic", title: "Italic", i: true },
          { label: "U", cmd: "underline", title: "Underline", u: true },
        ].map(({ label, cmd, title, w, i, u }) => (
          <button
            key={cmd}
            className="mkp-rich-btn"
            onMouseDown={(e) => { e.preventDefault(); execCmd(cmd); }}
            title={title}
            style={s.richBtn}
          >
            <span style={{ fontWeight: w, fontStyle: i ? "italic" : "normal", textDecoration: u ? "underline" : "none" }}>{label}</span>
          </button>
        ))}
        <div style={s.richDivider} />
        <button className="mkp-rich-btn" onMouseDown={(e) => { e.preventDefault(); execCmd("insertUnorderedList"); }} title="Bullet list" style={s.richBtn}>
          • List
        </button>
        <button
          className="mkp-rich-btn"
          onMouseDown={(e) => { e.preventDefault(); if (ref.current) ref.current.innerHTML = ""; onChange(""); }}
          title="Clear"
          style={{ ...s.richBtn, color: "var(--mk-red)" }}
        >
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Add a note for this student…"}
        onCompositionStart={() => (isComposing.current = true)}
        onCompositionEnd={() => { isComposing.current = false; onChange(ref.current?.innerHTML || ""); }}
        onInput={() => { if (!isComposing.current) onChange(ref.current?.innerHTML || ""); }}
        style={s.richArea}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   READ-ONLY RICH ESSAY VIEWER — highlight-to-mark
═══════════════════════════════════════════════════════════ */
function RichEssayViewer({ answerId, html, highlights, maxMarks, onAdd, onRemove, onAdjust, onLimitReached }) {
  const containerRef = useRef(null);
  const totalMarks = highlights.reduce((sum, h) => sum + (h.mark || 0), 0);

  const removeMark = useCallback(
    (hid) => {
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
    },
    [onRemove]
  );

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      sel.removeAllRanges();
      return;
    }

    const existingMarks = container.querySelectorAll(".hl-mark");
    for (const el of existingMarks) {
      if (range.intersectsNode(el)) {
        sel.removeAllRanges();
        return;
      }
    }

    const remaining = Math.max(0, (maxMarks || 1) - totalMarks);
    if (remaining <= 0) {
      sel.removeAllRanges();
      onLimitReached && onLimitReached();
      return;
    }
    const markValue = Math.min(1, remaining);

    const hid = `hl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const markEl = document.createElement("mark");
    markEl.className = "hl-mark";
    markEl.dataset.hid = hid;
    markEl.dataset.mark = String(markValue);
    markEl.title = "Click to remove this highlight";

    try {
      range.surroundContents(markEl);
    } catch (e) {
      const frag = range.extractContents();
      markEl.appendChild(frag);
      range.insertNode(markEl);
    }
    sel.removeAllRanges();

    onAdd({ id: hid, text: selectedText, mark: markValue, createdAt: Date.now(), confirmed: true }, container.innerHTML);
  }, [highlights, maxMarks, totalMarks, onAdd, onLimitReached]);

  const handleContainerClick = useCallback(
    (e) => {
      const markEl = e.target.closest && e.target.closest(".hl-mark");
      if (!markEl) return;
      removeMark(markEl.dataset.hid);
    },
    [removeMark]
  );

  const adjust = (hlId, delta) => {
    const current = highlights.find((h) => h.id === hlId);
    if (!current) return;
    const others = highlights.reduce((sum, h) => (h.id === hlId ? sum : sum + (h.mark || 0)), 0);
    let next = (current.mark || 0) + delta;
    next = Math.max(0, next);
    if (maxMarks != null) next = Math.min(next, Math.max(0, maxMarks - others));
    const container = containerRef.current;
    const el = container && container.querySelector(`[data-hid="${hlId}"]`);
    if (el) el.dataset.mark = String(next);
    onAdjust(hlId, next, container ? container.innerHTML : "");
  };

  const pct = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

  return (
    <div style={s.essayOuter}>
      <div style={s.essayHeaderRow}>
        <div style={s.essayHint}>
          <span style={s.hintIcon}>🖊️</span>
          Select the parts of the answer worth credit — a highlight is added automatically. Tap a highlight to remove it.
        </div>
        {maxMarks != null && (
          <div style={s.markMeter}>
            <div style={s.markMeterBar}>
              <div style={{ ...s.markMeterFill, width: `${pct}%`, background: pct >= 100 ? "var(--mk-green)" : "linear-gradient(90deg,var(--mk-blue),var(--mk-amber))" }} />
            </div>
            <span style={s.markMeterLabel}>{totalMarks} / {maxMarks}</span>
          </div>
        )}
      </div>

      <div
        key={answerId}
        ref={containerRef}
        className="mkp-essay-readonly"
        contentEditable={false}
        suppressContentEditableWarning
        onMouseUp={handleMouseUp}
        onClick={handleContainerClick}
        style={s.essayText}
        dangerouslySetInnerHTML={{ __html: html || '<em style="color:#5b6472">No answer was submitted for this question.</em>' }}
      />

      {highlights.length > 0 && (
        <div style={s.hlList}>
          <p style={s.hlListTitle}>Marked points ({highlights.length})</p>
          {highlights.map((h) => (
            <div key={h.id} style={s.hlItem}>
              <span style={s.hlItemDot} />
              <span style={s.hlItemText}>"{h.text.slice(0, 70)}{h.text.length > 70 ? "…" : ""}"</span>
              <div style={s.stepper}>
                <button className="mkp-stepper-btn" style={s.stepperBtn} onClick={() => adjust(h.id, -1)} disabled={(h.mark || 0) <= 0}>−</button>
                <span style={s.stepperVal}>+{h.mark}</span>
                <button className="mkp-stepper-btn" style={s.stepperBtn} onClick={() => adjust(h.id, 1)} disabled={maxMarks != null && totalMarks >= maxMarks}>+</button>
              </div>
              <button onClick={() => removeMark(h.id)} style={s.hlItemRemove}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Marking() {
  useGlobalMarkingStyles();
  const { id: assessmentId } = useParams();

  const [queue, setQueue]           = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores]         = useState({});
  const [remarks, setRemarks]       = useState({});
  const [highlights, setHighlights] = useState({});
  const [essayHTML, setEssayHTML]   = useState({});
  const [dismissed, setDismissed]   = useState(new Set());
  const [flags, setFlags]           = useState({});

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState(null);
  const [allDone, setAllDone]         = useState(false);
  const [pendingJump, setPendingJump] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = "info", action) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const tId = Date.now();
    setToast({ tId, message, type, action });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t && t.tId === tId ? null : t));
    }, 4500);
  }, []);
  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  /* ── LOAD ALL SUBMISSIONS ── */
  useEffect(() => {
    if (!assessmentId) return;
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await API.get(`/e-assessments/marking/all/${assessmentId}`);
        const data = Array.isArray(res.data) ? res.data : [];

        if (!isMounted) return;

        if (data.length === 0) {
          setError("There's nothing to mark here yet — no one has submitted this assessment.");
          setAllDone(false);
          setQueue([]);
          return;
        }

        setSubmissions(
          data.map((s) => {
            const sub = s.submission || s;
            return { submission_id: sub.id, student_id: sub.student_id, assessment_id: sub.assessment_id };
          })
        );

        const groups = data.map((sub) =>
          (sub.answers || [])
            .filter((a) => a.question_type === "essay")
            .map((a) => ({
              id: a.id,
              essay_answer: a.answer_text || a.essay_answer || "",
              question_text: a.question?.question_text || a.question_text || "",
              marking_guide: a.question?.marking_guide || a.marking_guide || "",
              max_marks: a.question?.marks || a.max_marks || a.question_marks || 1,
              question_id: a.question_id,
              // present only if the backend query selects it — used to skip
              // questions that were already graded in a previous session
              marks_awarded: a.marks_awarded,
              _submission_id: sub.submission?.id,
              _student_id: sub.submission?.student_id,
            }))
        );

        const interleaved = interleave(groups);
        if (!isMounted) return;

        const initialHTML = {};
        const initialScores = {};
        const initialHighlights = {};
        const preDismissed = new Set();

        for (const item of interleaved) {
          initialHTML[item.id] = toDisplayHTML(item.essay_answer);
          // already graded in an earlier session — surface it as done, don't re-queue it
          if (item.marks_awarded != null) {
            initialScores[item.id] = item.marks_awarded;
            initialHighlights[item.id] = [
              { id: `prior_${item.id}`, text: "Previously marked", mark: item.marks_awarded, confirmed: true, prior: true },
            ];
            preDismissed.add(item.id);
          }
        }

        setEssayHTML(initialHTML);
        setScores(initialScores);
        setHighlights(initialHighlights);
        setDismissed(preDismissed);

        if (interleaved.length === 0 || interleaved.every((it) => preDismissed.has(it.id))) {
          setAllDone(true);
          setQueue(interleaved);
        } else {
          setAllDone(false);
          setQueue(interleaved);
          setCurrentIdx(0);
        }
      } catch (err) {
        console.error("MARKING FETCH ERROR:", err.response?.data || err);
        if (isMounted) {
          setError("Couldn't load these submissions. Give it another try.");
          setQueue([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [assessmentId]);

  /* ── Sync confirmed highlight marks → scores ── */
  useEffect(() => {
    setScores((prev) => {
      const next = { ...prev };
      for (const [aId, hls] of Object.entries(highlights)) {
        const confirmed = hls.filter((h) => h.confirmed);
        if (confirmed.length > 0) {
          next[aId] = confirmed.reduce((sum, h) => sum + (h.mark || 0), 0);
        }
      }
      return next;
    });
  }, [highlights]);

  /* ── warn on unsaved changes before leaving ── */
  useEffect(() => {
    const handler = (e) => {
      if (!saved && queue.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saved, queue.length]);

  /* ── DERIVED ── */
  const remaining = useMemo(() => queue.filter((q) => !dismissed.has(q.id)), [queue, dismissed]);
  const current    = remaining[currentIdx] ?? null;
  const totalScore = Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
  const maxPossible = queue.reduce((s, q) => s + (Number(q.max_marks) || 0), 0);
  const progressPct = queue.length > 0 ? Math.round(((queue.length - remaining.length) / queue.length) * 100) : 0;

  const hlForCurrent   = current ? highlights[current.id] || [] : [];
  const editableHlForCurrent = hlForCurrent.filter((h) => !h.prior);
  const confirmedCount = hlForCurrent.filter((h) => h.confirmed).length;

  const flaggedAnswers = useMemo(() => queue.filter((q) => flags[q.id]), [queue, flags]);

  const studentStats = useMemo(() => {
    const map = new Map();
    for (const q of queue) {
      const key = q._submission_id ?? q._student_id ?? "unknown";
      if (!map.has(key)) map.set(key, { submissionId: q._submission_id, studentId: q._student_id, total: 0, marked: 0 });
      const entry = map.get(key);
      entry.total += 1;
      if (dismissed.has(q.id)) entry.marked += 1;
    }
    return Array.from(map.values());
  }, [queue, dismissed]);

  useEffect(() => {
    if (pendingJump == null) return;
    const idx = remaining.findIndex((q) => q.id === pendingJump);
    if (idx >= 0) {
      setCurrentIdx(idx);
      setPendingJump(null);
    }
  }, [remaining, pendingJump]);

  /* ── HIGHLIGHT HANDLERS ── */
  const addHighlight = useCallback((answerId, hl) => {
    setHighlights((prev) => ({ ...prev, [answerId]: [...(prev[answerId] || []), { ...hl, confirmed: true }] }));
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

  const handleLimitReached = useCallback(() => {
    showToast("This question's full marks are already awarded", "info");
  }, [showToast]);

  /* ── MARK & ADVANCE ── */
  const markAndAdvance = useCallback(() => {
    if (!current) return;
    setDismissed((prev) => new Set(prev).add(current.id));
    setSaved(false);
  }, [current]);

  const handleScoreChange = (answerId, value, maxMarks) => {
    const num = value === "" ? "" : Math.min(Number(value), maxMarks ?? Infinity);
    setScores((prev) => ({ ...prev, [answerId]: num }));
    setSaved(false);
  };

  const handleRemarkChange = (answerId, html) => {
    setRemarks((prev) => ({ ...prev, [answerId]: html }));
    setSaved(false);
  };

  const toggleFlag = useCallback((answerId) => {
    setFlags((prev) => ({ ...prev, [answerId]: !prev[answerId] }));
  }, []);

  const reopenAnswer = useCallback((answer) => {
    setDismissed((prev) => { const next = new Set(prev); next.delete(answer.id); return next; });
    setAllDone(false);
    setPendingJump(answer.id);
  }, []);

  /* ── NAV ── */
  const goNext = useCallback(() => setCurrentIdx((i) => Math.min(i + 1, remaining.length - 1)), [remaining.length]);
  const goPrev = useCallback(() => setCurrentIdx((i) => Math.max(i - 1, 0)), []);

  const jumpToStudent = useCallback((submissionId) => {
    const idx = remaining.findIndex((q) => q._submission_id === submissionId);
    if (idx >= 0) setCurrentIdx(idx);
    else showToast("This student has nothing left to mark", "info");
  }, [remaining, showToast]);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (loading || error || allDone || !current) return;
      const tag = document.activeElement?.tagName;
      const isEditable = document.activeElement?.isContentEditable;
      if (tag === "TEXTAREA" || tag === "INPUT" || isEditable) return;
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
      const submissionId = submissions?.[0]?.submission_id;
      if (!submissionId) { showToast("Nothing to save yet", "error"); return; }

      const computedScores = queue.reduce((acc, q) => {
        const hls = highlights[q.id] || [];
        acc[q.id] = hls.reduce((sum, h) => sum + (Number(h.mark) || 0), 0);
        return acc;
      }, {});

      const payload = { submission_id: submissionId, scores: computedScores, remarks: remarks || {}, highlights: highlights || {} };
      await API.post("/e-assessments/save-marking/bulk", payload);

      setSaved(true);
      showToast("Marks saved", "success");
    } catch (err) {
      console.error("SAVE ERROR:", err);
      showToast(err?.response?.data?.message || err?.message || "Couldn't save — try again", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════ RENDER: loading ══ */
  if (loading)
    return (
      <div className="mkp-root">
        <div style={s.centered}>
          <div style={s.spinner} />
          <p style={{ color: "var(--mk-text-dim)", marginTop: 20, fontSize: 14 }}>Gathering the submissions…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="mkp-root">
        <div style={s.errorBanner}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════ RENDER: all done ══ */
  if (allDone)
    return (
      <div className="mkp-root">
        <Toast toast={toast} onDismiss={dismissToast} />

        <div className="mkp-topbar">
          <div>
            <h2 style={s.heading} className="mkp-heading-gradient">Marking complete</h2>
            <p style={s.subheading}>Every essay question in this batch has been marked.</p>
          </div>
          <SaveBtn saving={saving} saved={saved} onClick={saveMarking} />
        </div>

        <div className="mkp-stats-row">
          <StatCard label="Submissions" value={submissions.length} />
          <StatCard label="Questions marked" value={Object.keys(scores).length} />
          <div style={s.statCard}>
            <span style={s.statLabel}>Total score</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <ScoreGauge value={totalScore} max={maxPossible} size={40} />
              <span style={{ ...s.statValue, color: "var(--mk-amber)" }}>
                {totalScore}{maxPossible > 0 && <span style={{ color: "#64748b", fontSize: 14 }}> / {maxPossible}</span>}
              </span>
            </div>
          </div>
        </div>

        {flaggedAnswers.length > 0 && (
          <div style={s.flagCard}>
            <p style={s.flagCardTitle}>🚩 {flaggedAnswers.length} question{flaggedAnswers.length !== 1 ? "s" : ""} flagged for a second look</p>
            {flaggedAnswers.map((a) => (
              <div key={a.id} style={s.flagRow}>
                <span style={s.flagRowText}>
                  Student {a._student_id ?? "?"} — {(a.question_text || "").slice(0, 70)}{(a.question_text || "").length > 70 ? "…" : ""}
                </span>
                <button onClick={() => reopenAnswer(a)} className="mkp-btn" style={s.reopenBtn}>Reopen</button>
              </div>
            ))}
          </div>
        )}

        <div style={s.doneCard} className="mkp-card">
          <span className="mkp-stamp">✓ Graded</span>
          <p style={s.doneTitle}>Nice work — that's everyone marked</p>
          <p style={s.doneSub}>Save to lock in the scores for this batch.</p>
          <button
            onClick={saveMarking}
            disabled={saving}
            className="mkp-btn"
            style={{ ...s.primaryBtn, marginTop: 26, padding: "14px 40px", fontSize: 15, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : saved ? "✓ Marks saved" : "Save & finish"}
          </button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════ RENDER: main ══ */
  return (
    <div className="mkp-root">
      <Toast toast={toast} onDismiss={dismissToast} />

      <div className="mkp-topbar">
        <div>
          <h2 style={s.heading} className="mkp-heading-gradient">Marking panel</h2>
          <p style={s.subheading}>
            <span style={s.accentText}>{remaining.length}</span> question{remaining.length !== 1 ? "s" : ""} left to mark
            {" · "}
            <span style={s.accentText}>{submissions.length}</span> submission{submissions.length !== 1 ? "s" : ""}
            {flaggedAnswers.length > 0 && <span style={{ color: "var(--mk-amber)" }}> · {flaggedAnswers.length} flagged</span>}
            {!saved && queue.length > 0 && <span style={{ color: "var(--mk-text-faint)" }}> · unsaved changes</span>}
          </p>
        </div>
        <SaveBtn saving={saving} saved={saved} onClick={saveMarking} />
      </div>

      {queue.length > 0 && (
        <div style={s.progressTrack} className="mkp-progress-track">
          <div className="mkp-progress-fill" style={{ ...s.progressFill, width: `${progressPct}%` }} />
        </div>
      )}

      <div className="mkp-stats-row">
        <StatCard label="Remaining" value={remaining.length} />
        <StatCard label="Marked" value={queue.length - remaining.length} />
        <div style={s.statCard}>
          <span style={s.statLabel}>Score awarded</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <ScoreGauge value={totalScore} max={maxPossible} size={38} />
            <span style={{ ...s.statValue, color: "var(--mk-amber)" }}>{totalScore}</span>
          </div>
        </div>
      </div>

      <StudentRail stats={studentStats} currentSubmissionId={current?._submission_id} onJump={jumpToStudent} />

      {remaining.length > 0 && (
        <div style={s.dotRow}>
          {remaining.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setCurrentIdx(i)}
              title={`Q${i + 1} — Student ${a._student_id ?? "?"}`}
              className={`mkp-dot${i === currentIdx ? " mkp-dot-current" : ""}${flags[a.id] ? " mkp-dot-flagged" : ""}`}
              style={{
                ...s.dot,
                background: i === currentIdx ? "var(--mk-blue)" : scores[a.id] != null ? "var(--mk-green)" : "var(--mk-surface-3)",
                border: `2px solid ${i === currentIdx ? "#49505c" : "transparent"}`,
                transform: i === currentIdx ? "scale(1.25)" : "scale(1)",
              }}
            />
          ))}
        </div>
      )}

      {!current ? (
        <div style={s.emptyCard}>Nothing left in the queue right now.</div>
      ) : (
        <div style={s.qCard} className="mkp-card" key={current.id}>
          <div className="mkp-qcard-head">
            <div className="mkp-qcard-badges">
              <span style={s.badge}>Q{currentIdx + 1}</span>
              <span style={s.essayPill}>Essay</span>
              <span style={s.studentPill}>Student {current._student_id ?? "?"}</span>
            </div>

            <div className="mkp-qcard-badges">
              {current.max_marks != null && (
                <span style={s.maxMarksBadge}>Out of {current.max_marks} mark{current.max_marks !== 1 ? "s" : ""}</span>
              )}
              <span style={s.awardedBadge}>Awarded: {editableHlForCurrent.reduce((sum, h) => sum + (h.mark || 0), 0)}</span>
              <span style={s.remainingBadge}>
                Left: {Math.max(0, (current.max_marks || 0) - editableHlForCurrent.reduce((sum, h) => sum + (h.mark || 0), 0))}
              </span>
              <button
                onClick={() => toggleFlag(current.id)}
                className={`mkp-btn mkp-flag-btn${flags[current.id] ? " active" : ""}`}
                style={s.flagToggle}
                title="Flag for a second look (F)"
              >
                🚩 {flags[current.id] ? "Flagged" : "Flag"}
              </button>
            </div>
          </div>

          <FieldLabel>Question</FieldLabel>
          <div style={s.questionBox}>{current.question_text}</div>

          <FieldLabel>Marking guide</FieldLabel>
          <div style={s.guideBox}>
            <div style={s.guideEyebrow}>📘 What a full-marks answer looks like</div>
            <div style={s.guideBody}>{current.marking_guide || "No marking guide was set for this question."}</div>
          </div>

          <FieldLabel>Student's answer</FieldLabel>
          <RichEssayViewer
            answerId={current.id}
            html={essayHTML[current.id] ?? toDisplayHTML(current.essay_answer || "")}
            highlights={editableHlForCurrent}
            maxMarks={current.max_marks}
            onAdd={handleEssayAdd}
            onRemove={handleEssayRemove}
            onAdjust={handleEssayAdjust}
            onLimitReached={handleLimitReached}
          />

          <FieldLabel>
            Override score{current.max_marks != null ? ` (max ${current.max_marks})` : ""}
            <span style={s.editorSubtitle}>optional — otherwise taken from the highlights above</span>
          </FieldLabel>
          <input
            type="number"
            min={0}
            max={current.max_marks ?? undefined}
            placeholder="Taken from highlights"
            value={scores[current.id] ?? ""}
            onChange={(e) => handleScoreChange(current.id, e.target.value, current.max_marks)}
            style={s.input}
          />

          <FieldLabel>Feedback for the student</FieldLabel>
          <RichEditor value={remarks[current.id] || ""} onChange={(html) => handleRemarkChange(current.id, html)} />

          <div className="mkp-navrow">
            <button onClick={goPrev} disabled={currentIdx === 0} className="mkp-btn" style={{ ...s.navBtn, opacity: currentIdx === 0 ? 0.3 : 1 }}>
              ← Previous
            </button>

            <span className="mkp-nav-counter" style={s.navCounter}>
              {currentIdx + 1} of {remaining.length} <span style={{ opacity: 0.7 }}>· ← → to move, Enter to mark, F to flag</span>
            </span>

            <div className="mkp-navrow-side" style={{ display: "flex", gap: 10 }}>
              <button onClick={goNext} disabled={currentIdx >= remaining.length - 1} className="mkp-btn" style={{ ...s.navBtn, opacity: currentIdx >= remaining.length - 1 ? 0.3 : 1 }}>
                Skip →
              </button>
              <button onClick={markAndAdvance} className="mkp-btn" style={s.markDoneBtn}>
                Mark & next ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div style={s.footer}>
          <span style={{ color: "#94a3b8", fontSize: 14 }}>
            Score so far: <strong style={{ color: "#fff" }}>{totalScore}</strong>
            {maxPossible > 0 && <span style={{ color: "#64748b" }}> / {maxPossible}</span>}
          </span>
          <SaveBtn saving={saving} saved={saved} onClick={saveMarking} small />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */
function SaveBtn({ saving, saved, onClick, small }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mkp-btn"
      style={{
        ...s.primaryBtn,
        background: saved ? "#1f6f4a" : "linear-gradient(135deg,#5b8def,#8b7bff)",
        opacity: saving ? 0.6 : 1,
        fontSize: small ? 13 : 14,
        padding: small ? "8px 16px" : "10px 22px",
      }}
    >
      {saving ? "Saving…" : saved ? "✓ Saved" : "Save marks"}
    </button>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={s.statCard}>
      <span style={s.statLabel}>{label}</span>
      <span style={{ ...s.statValue, color: accent ? "#a78bfa" : "#f1f5f9" }}>{value}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return <p style={s.fieldLabel}>{children}</p>;
}

/* ═══════════════════════════════════════════════════════════
   STYLES (dynamic / state-dependent bits only — layout & responsive
   rules live in the injected stylesheet above)
═══════════════════════════════════════════════════════════ */
const s = {
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  spinner: { width: 36, height: 36, border: "3px solid var(--mk-surface-3)", borderTop: "3px solid var(--mk-blue)", borderRadius: "50%", animation: "mkp-spin 0.8s linear infinite" },

  heading: { margin: 0, fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, fontFamily: "'Fraunces', serif", letterSpacing: "-0.01em" },
  subheading: { margin: "6px 0 0", fontSize: 14, color: "var(--mk-text-dim)" },
  accentText: { color: "#a9c4ff", fontWeight: 700 },

  progressTrack: { height: 6, borderRadius: 4, background: "var(--mk-surface-2)", marginBottom: 18, border: "1px solid var(--mk-border-soft)" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width .4s cubic-bezier(.4,0,.2,1)" },

  statCard: { background: "linear-gradient(160deg,var(--mk-surface) 0%,var(--mk-surface-2) 100%)", border: "1px solid var(--mk-border-soft)", borderRadius: 10, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  statLabel: { fontSize: 11, color: "var(--mk-text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 },
  statValue: { fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },

  railChip: { background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 },
  railLabel: { fontSize: 10, color: "#8b96a8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 },

  dotRow: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: "50%", cursor: "pointer", padding: 0 },

  qCard: { background: "linear-gradient(160deg,var(--mk-surface-2) 0%,var(--mk-surface) 100%)", border: "1px solid var(--mk-border-soft)", borderRadius: 14, padding: "24px 26px", boxShadow: "0 20px 50px rgba(0,0,0,.35)" },

  badge: { background: "var(--mk-surface-2)", color: "#7fb0ff", border: "1px solid var(--mk-border)", borderRadius: 6, padding: "4px 12px", fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  essayPill: { background: "#241a3d", color: "#c4b5fd", border: "1px solid #6d28d944", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" },
  studentPill: { background: "#0c1a2e", color: "#7dd3fc", border: "1px solid #0369a144", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 },
  maxMarksBadge: { fontSize: 12, color: "var(--mk-text-dim)", background: "var(--mk-surface-2)", border: "1px solid var(--mk-border-soft)", borderRadius: 6, padding: "3px 9px" },
  awardedBadge: { background: "#1a1a2e", border: "1px solid #7c3aed44", color: "#a78bfa", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  remainingBadge: { background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", color: "#94a3b8", padding: "3px 10px", borderRadius: 6, fontSize: 12 },
  flagToggle: { background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", color: "#8b98ab", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600 },

  questionBox: { background: "#050510", border: "1px solid #1e293b", borderLeft: "3px solid var(--mk-blue)", padding: "14px 16px", borderRadius: 8, fontSize: 15, lineHeight: 1.65, color: "#cbd5e1" },

  guideBox: { background: "rgba(139,123,255,0.07)", border: "1px solid rgba(139,123,255,0.25)", borderRadius: 10, padding: "14px 16px", marginBottom: 4 },
  guideEyebrow: { fontSize: 11, fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.08em", marginBottom: 8 },
  guideBody: { fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" },

  essayOuter: { marginTop: 4 },
  essayHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" },
  essayHint: { fontSize: 12, color: "#8b96a8", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  hintIcon: { fontSize: 13 },
  markMeter: { display: "flex", alignItems: "center", gap: 8 },
  markMeterBar: { width: 80, height: 6, background: "var(--mk-surface-3)", borderRadius: 99, overflow: "hidden" },
  markMeterFill: { height: "100%", borderRadius: 99, transition: "width 0.3s ease" },
  markMeterLabel: { fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" },

  essayText: { background: "#06060f", border: "1px solid #1e293b", borderLeft: "3px solid var(--mk-violet)", padding: "16px 18px", borderRadius: 8, fontSize: 15, lineHeight: 1.9, color: "#e2e8f0", cursor: "text", minHeight: 140 },

  hlList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 6 },
  hlListTitle: { fontSize: 11, color: "var(--mk-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" },
  hlItem: { background: "var(--mk-surface-2)", border: "1px solid #7c5cff33", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" },
  hlItemDot: { width: 7, height: 7, borderRadius: "50%", background: "var(--mk-amber)", flexShrink: 0 },
  hlItemText: { flex: 1, color: "#94a3b8", fontStyle: "italic", minWidth: 120 },
  stepper: { display: "flex", alignItems: "center", gap: 6, background: "var(--mk-surface-3)", border: "1px solid var(--mk-border)", borderRadius: 6, padding: "2px 4px" },
  stepperBtn: { background: "none", border: "none", color: "#e2e8f0", width: 20, height: 20, borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1 },
  stepperVal: { color: "var(--mk-amber)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, minWidth: 24, textAlign: "center" },
  hlItemRemove: { background: "none", border: "1px solid #7f1d1d55", color: "#f87171", borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 11 },

  richWrap: { border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden", background: "#06060f" },
  richToolbar: { display: "flex", alignItems: "center", gap: 2, padding: "6px 10px", background: "#0d0d1a", borderBottom: "1px solid #1e293b", flexWrap: "wrap" },
  richBtn: { background: "none", border: "1px solid transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: "4px 10px", borderRadius: 5, fontFamily: "inherit" },
  richDivider: { width: 1, height: 18, background: "#1e293b", margin: "0 6px" },
  richArea: { minHeight: 90, padding: "14px 16px", color: "#e2e8f0", fontSize: 14, lineHeight: 1.8, outline: "none", fontFamily: "inherit" },

  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #1e293b", background: "#06060f", color: "#f1f5f9", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "'JetBrains Mono', monospace" },

  fieldLabel: { fontSize: 11, color: "var(--mk-text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "18px 0 6px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  editorSubtitle: { fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#3a4456", fontSize: 11 },

  navCounter: { fontSize: 13, color: "#3a4456" },
  navBtn: { background: "var(--mk-surface-2)", color: "#64748b", border: "1px solid #1e293b", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600 },
  markDoneBtn: { background: "linear-gradient(135deg,#8b7bff,#5b8def)", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, letterSpacing: "0.02em" },

  primaryBtn: { color: "#000000", border: "none", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" },

  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "14px 20px", background: "#0d0d1a", borderRadius: 10, border: "1px solid #1e293b", flexWrap: "wrap", gap: 10 },
  emptyCard: { background: "#0d0d1a", padding: "40px 24px", borderRadius: 12, textAlign: "center", color: "#3a4456", border: "1px solid #1e293b" },
  errorBanner: { background: "#0d0106", border: "1px solid #7f1d1d55", padding: "18px 22px", borderRadius: 10, display: "flex", gap: 12, alignItems: "center", color: "#fca5a5" },

  doneCard: { textAlign: "center", padding: "64px 24px", background: "#0d0d1a", borderRadius: 14, border: "1px solid #1e293b", marginTop: 24 },
  doneTitle: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: "22px 0 8px", fontFamily: "'Fraunces', serif" },
  doneSub: { fontSize: 15, color: "var(--mk-text-faint)", margin: 0 },

  flagCard: { background: "#161009", border: "1px solid #f5b54444", borderRadius: 12, padding: "16px 20px", marginBottom: 16 },
  flagCardTitle: { margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--mk-amber)" },
  flagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid #241a0f", flexWrap: "wrap" },
  flagRowText: { fontSize: 13, color: "#cbd5e1", flex: 1, minWidth: 160 },
  reopenBtn: { background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", color: "#7fb0ff", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 },
};