import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { PenLine, AlertTriangle, Flag, BookOpen, X } from "lucide-react";
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
   GLOBAL STYLES — shared design tokens (identical id/tokens to the
   rest of the app, e.g. StudentProfile; a no-op if already mounted)
   plus a small page-specific block for things inline styles can't do
   (keyframes, media queries, hover/focus, injected highlight marks).
═══════════════════════════════════════════════════════════ */
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

const injectMarkingStyles = () => {
  if (document.getElementById("marking-tokens")) return;
  const style = document.createElement("style");
  style.id = "marking-tokens";
  style.textContent = `
    @keyframes mkp-spin { to { transform: rotate(360deg); } }
    @keyframes mkp-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes mkp-pop { 0% { background-color: rgba(251,191,36,.6); } 100% { background-color: rgba(251,191,36,.26); } }
    @keyframes mkp-pulse-ring { 0%,100% { box-shadow: 0 0 0 0 var(--primary); } 50% { box-shadow: 0 0 0 6px transparent; } }
    @keyframes mkp-ring-in { from { stroke-dashoffset: 999; } }
    @keyframes mkp-stamp-in { from { opacity: 0; transform: scale(1.4) rotate(-14deg); } to { opacity: 1; transform: scale(1) rotate(-8deg); } }

    * { box-sizing: border-box; }

    .mkp-root {
      min-height: 100%; background: var(--bg); color: var(--text);
      padding: 28px 32px 110px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      max-width: 880px; margin: 0 auto;
    }
    @media (max-width: 720px) { .mkp-root { padding: 20px 14px 100px; } }

    .mkp-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
    @media (max-width: 560px) { .mkp-topbar { flex-direction: column; align-items: stretch; } .mkp-topbar > button, .mkp-topbar-actions { width: 100%; } }

    .mkp-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 560px) { .mkp-stats-row { grid-template-columns: 1fr 1fr; } .mkp-stats-row > :last-child { grid-column: span 2; } }

    .mkp-essay-readonly { user-select: text; caret-color: transparent; outline: none; }
    .mkp-essay-readonly:focus { outline: none; }
    .hl-mark { background: rgba(251,191,36,.28); border-bottom: 2px solid var(--warning); border-radius: 3px; padding: 1px 3px; cursor: pointer; position: relative; animation: mkp-pop .45s ease; transition: background .15s ease; color: inherit; }
    .hl-mark:hover { background: rgba(251,191,36,.5); }
    .hl-mark::after { content: "+" attr(data-mark); position: absolute; top: -9px; right: -6px; background: var(--warning); color: var(--card); font-size: 9px; font-weight: 800; border-radius: 5px; padding: 0 3px; line-height: 13px; font-variant-numeric: tabular-nums; pointer-events: none; }

    .mkp-btn { transition: filter .15s ease, opacity .2s ease, background .2s ease; cursor: pointer; font-family: inherit; }
    .mkp-btn:hover:not(:disabled) { filter: brightness(0.95); }
    .mkp-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .mkp-btn:disabled { cursor: not-allowed; }

    .mkp-dot { transition: all .2s ease; }
    .mkp-dot.mkp-dot-flagged { box-shadow: 0 0 0 2px var(--warning) inset; }
    .mkp-dot.mkp-dot-current { animation: mkp-pulse-ring 1.7s ease infinite; }
    .mkp-dot:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

    .mkp-toast { animation: mkp-toast-in .25s ease both; }
    .mkp-stepper-btn { transition: background .15s ease, opacity .15s ease; }
    .mkp-stepper-btn:hover:not(:disabled) { background: var(--bg); }
    .mkp-flag-btn.active { background: var(--warning-tint) !important; border-color: var(--warning) !important; color: var(--warning) !important; }

    .mkp-rail-wrap { display: flex; gap: 14px; overflow-x: auto; padding: 4px 2px 14px; margin-bottom: 4px; }
    .mkp-rail-wrap::-webkit-scrollbar { height: 6px; }
    .mkp-rail-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }
    .mkp-rail-chip { transition: filter .18s ease; cursor: pointer; border-radius: 10px; }
    .mkp-rail-chip:hover { filter: brightness(0.9); }
    .mkp-rail-chip.current { animation: mkp-pulse-ring 1.9s ease infinite; }
    .mkp-rail-ring circle.mkp-ring-fill { animation: mkp-ring-in .5s ease-out; }

    .mkp-qcard-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 6px; }
    .mkp-qcard-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .mkp-navrow { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
    @media (max-width: 560px) { .mkp-navrow { flex-direction: column; align-items: stretch; } .mkp-navrow-side { display: flex; gap: 10px; justify-content: space-between; } .mkp-navrow-side > button { flex: 1; } .mkp-nav-counter { order: 3; text-align: center; } }

    .mkp-rich-btn:hover { background: var(--bg) !important; color: var(--text) !important; }
    .mkp-rich-wrap:focus-within { border-color: var(--primary) !important; }

    .mkp-stamp { display: inline-flex; align-items: center; gap: 8px; border: 2.5px dashed var(--success); color: var(--success); border-radius: 12px; padding: 10px 22px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; font-size: 13px; transform: rotate(-8deg); animation: mkp-stamp-in .4s cubic-bezier(.2,.9,.3,1.2) both; }

    /* ── KNEC-style marking layout: toolbar strip, answer / quick-mark / scheme
       three-up, and a bottom coloured action bar — see Marking.jsx render ── */
    .mkp-toolbar-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 10px 14px; margin: 14px 0 18px; flex-wrap: wrap;
    }
    .mkp-response-id { font-size: 12.5px; font-weight: 700; color: var(--success); font-variant-numeric: tabular-nums; }
    .mkp-flagbar-btn {
      background: var(--warning-tint); border: 1px solid var(--warning); color: var(--warning);
      border-radius: 8px; padding: 7px 14px; font-size: 12.5px; font-weight: 700;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .mkp-flagbar-btn.active { background: var(--warning); color: #fff; }
    .mkp-skipbar-btn {
      background: var(--destructive-tint); border: 1px solid var(--destructive); color: var(--destructive);
      border-radius: 8px; padding: 7px 14px; font-size: 12.5px; font-weight: 700;
    }

    .mkp-triptych { display: grid; grid-template-columns: 1fr 96px 1fr; gap: 20px; align-items: start; margin-top: 4px; }
    @media (max-width: 780px) {
      .mkp-triptych { grid-template-columns: 1fr; }
      .mkp-triptych-controls { flex-direction: row !important; justify-content: center; }
    }

    .mkp-triptych-controls { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 30px; }
    .mkp-quickmark {
      width: 44px; height: 44px; border-radius: 10px; font-size: 18px; font-weight: 800;
      display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);
      background: var(--card); color: var(--text-secondary);
    }
    .mkp-quickmark.full { color: var(--success); border-color: var(--success); }
    .mkp-quickmark.full:hover:not(:disabled) { background: var(--success-tint); }
    .mkp-quickmark.zero { color: var(--destructive); border-color: var(--destructive); }
    .mkp-quickmark.zero:hover:not(:disabled) { background: var(--destructive-tint); }
    .mkp-quickmark.review { color: var(--warning); border-color: var(--warning); }
    .mkp-quickmark.review:hover:not(:disabled) { background: var(--warning-tint); }
    .mkp-quickmark.review.active { background: var(--warning); color: #fff; }
    .mkp-score-fraction {
      width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--primary);
      display: flex; align-items: center; justify-content: center; color: var(--primary);
      font-weight: 800; font-size: 13px; font-variant-numeric: tabular-nums; text-align: center;
    }

    .mkp-scheme-heading { color: var(--destructive); font-weight: 800; font-size: 13px; text-decoration: underline; margin: 0 0 8px; }
    .mkp-answer-heading { color: var(--destructive); font-weight: 500; font-size: 13px; text-decoration: underline; margin: 0 0 8px; text-transform: lowercase; }

    .mkp-actionbar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; }
    @media (max-width: 560px) { .mkp-actionbar { grid-template-columns: 1fr 1fr; } }
    .mkp-actionbtn { border: none; border-radius: var(--radius-sm); padding: 12px 10px; font-size: 13px; font-weight: 700; color: #fff; }
    .mkp-actionbtn.back { background: var(--info); }
    .mkp-actionbtn.skip { background: var(--destructive); }
    .mkp-actionbtn.done { background: var(--success); }

    /* ── top tab strip mirroring the KNEC dashboard's
       DashBoard / MarkingProgress / Review / Live Marking / Flags row ── */
    .mkp-tabstrip { display: flex; align-items: center; gap: 2px; border-bottom: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; }
    .mkp-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 12px 18px; font-size: 13.5px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; font-family: inherit; }
    .mkp-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 800; }
    .mkp-tab:hover:not(.active) { color: var(--text); }
  `;
  document.head.appendChild(style);
};

function useGlobalMarkingStyles() {
  injectStyles();
  injectMarkingStyles();
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const accent = {
    success: "var(--success)",
    error: "var(--destructive)",
    info: "var(--info)",
  }[toast.type || "info"];
  return (
    <div
      className="mkp-toast"
      style={{
        position: "fixed", bottom: 20, right: 20, left: 20, zIndex: 1000, margin: "0 auto", maxWidth: 380,
        background: "var(--card-elevated)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`,
        color: "var(--text)",
        padding: "12px 16px", borderRadius: "var(--radius-sm)", boxShadow: "0 12px 30px rgba(16,24,40,0.18)",
        display: "flex", alignItems: "center", gap: 14, fontSize: 13.5, fontWeight: 500,
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action.onClick(); onDismiss(); }}
          style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0, fontFamily: "inherit" }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, lineHeight: 1, display: "flex" }}
      >
        <X size={16} />
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
      <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: "var(--border)" }} strokeWidth="6" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ stroke: "var(--primary)", transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--text)", fontVariantNumeric: "tabular-nums" }} fontSize={size * 0.24} fontWeight="700">
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
              <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: "var(--border)" }} strokeWidth="3.5" fill="none" />
              <circle
                className="mkp-ring-fill" cx={size / 2} cy={size / 2} r={r}
                strokeWidth="3.5" fill="none"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ stroke: isComplete ? "var(--success)" : "var(--primary)", transition: "stroke-dashoffset .5s ease" }}
              />
              <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" style={{ fill: isCurrent ? "var(--primary)" : "var(--text-secondary)" }} fontSize={12} fontWeight="700">
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
    <div className="mkp-rich-wrap" style={s.richWrap}>
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
          style={{ ...s.richBtn, color: "var(--destructive)" }}
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
          <PenLine size={14} style={{ flexShrink: 0 }} />
          <span>Select the parts of the answer worth credit — a highlight is added automatically. Tap a highlight to remove it.</span>
        </div>
        {maxMarks != null && (
          <div style={s.markMeter}>
            <div style={s.markMeterBar}>
              <div style={{ ...s.markMeterFill, width: `${pct}%`, background: pct >= 100 ? "var(--success)" : "var(--primary)" }} />
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
        dangerouslySetInnerHTML={{ __html: html || '<em style="color:var(--text-muted)">No answer was submitted for this question.</em>' }}
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
  // Auto-graded MCQ marks — kept out of the essay `queue` (nothing for a
  // teacher to do with them) but still need to count toward the total
  // score/max shown here, same as Marking.jsx's autoScores does for a
  // single submission.
  const [mcqScores, setMcqScores]     = useState({});
  const [mcqMaxTotal, setMcqMaxTotal] = useState(0);
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

        // MCQs are auto-marked server-side at submission time — they never
        // need a teacher's input, so they don't belong in the essay queue.
        // But their marks are already earned and must still count toward
        // the total score/max shown while marking, or the running total
        // looks wrong (understated) for any assessment that mixes MCQ and
        // essay questions.
        const mcqInitialScores = {};
        let mcqMax = 0;
        data.forEach((sub) => {
          (sub.answers || [])
            .filter((a) => a.question_type !== "essay")
            .forEach((a) => {
              mcqInitialScores[a.id] = a.marks_awarded != null ? a.marks_awarded : 0;
              mcqMax += Number(a.max_marks) || 0;
            });
        });
        setMcqScores(mcqInitialScores);
        setMcqMaxTotal(mcqMax);

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
  const totalScore =
    Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0) +
    Object.values(mcqScores).reduce((s, v) => s + (Number(v) || 0), 0);
  const maxPossible = queue.reduce((s, q) => s + (Number(q.max_marks) || 0), 0) + mcqMaxTotal;
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

      // MCQ marks are auto-graded server-side and tracked separately in
      // mcqScores (see the load effect above) — they must be included here
      // too, or the backend never re-persists/finalizes them and the
      // submission can end up "marked" with a 0 (or understated) score.
      const computedScores = {
        ...mcqScores,
        ...queue.reduce((acc, q) => {
          const hls = highlights[q.id] || [];
          acc[q.id] = hls.reduce((sum, h) => sum + (Number(h.mark) || 0), 0);
          return acc;
        }, {}),
      };

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
          <p style={{ color: "var(--text-secondary)", marginTop: 20, fontSize: 13.5, fontWeight: 600 }}>Gathering the submissions…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="mkp-root">
        <div style={s.errorBanner}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════ RENDER: all done ══ */
  if (allDone)
    return (
      <div className="mkp-root">
        <Toast toast={toast} onDismiss={dismissToast} />
        <MarkingTabStrip />

        <div className="mkp-topbar">
          <div>
            <h2 style={s.heading}>Marking complete</h2>
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
              <span style={{ ...s.statValue, color: "var(--primary)" }}>
                {totalScore}{maxPossible > 0 && <span style={{ color: "var(--text-muted)", fontSize: 14 }}> / {maxPossible}</span>}
              </span>
            </div>
          </div>
        </div>

        {flaggedAnswers.length > 0 && (
          <div style={s.flagCard}>
            <p style={s.flagCardTitle}>
              <Flag size={14} /> {flaggedAnswers.length} question{flaggedAnswers.length !== 1 ? "s" : ""} flagged for a second look
            </p>
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
            style={{ ...s.primaryBtn, marginTop: 26, padding: "12px 36px", fontSize: 14, opacity: saving ? 0.6 : 1 }}
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
      <MarkingTabStrip />

      <div className="mkp-topbar">
        <div>
          <h2 style={s.heading}>Marking panel</h2>
          <p style={s.subheading}>
            <span style={s.accentText}>{remaining.length}</span> question{remaining.length !== 1 ? "s" : ""} left to mark
            {" · "}
            <span style={s.accentText}>{submissions.length}</span> submission{submissions.length !== 1 ? "s" : ""}
            {flaggedAnswers.length > 0 && <span style={{ color: "var(--warning)" }}> · {flaggedAnswers.length} flagged</span>}
            {!saved && queue.length > 0 && <span style={{ color: "var(--text-muted)" }}> · unsaved changes</span>}
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
            <span style={{ ...s.statValue, color: "var(--primary)" }}>{totalScore}</span>
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
                background: i === currentIdx ? "var(--primary)" : scores[a.id] != null ? "var(--success)" : "var(--border)",
                border: `2px solid ${i === currentIdx ? "var(--primary-dark)" : "transparent"}`,
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
            </div>
          </div>

          {/* ── Response toolbar — mirrors the KNEC marking screen's
              Response #  ·  Flag as Irregularity  ·  Skip this response row ── */}
          <div className="mkp-toolbar-row">
            <span className="mkp-response-id">Response #: R{String(current.id).padStart(6, "0")}</span>
            <button
              onClick={() => toggleFlag(current.id)}
              className={`mkp-btn mkp-flagbar-btn${flags[current.id] ? " active" : ""}`}
              title="Flag for a second look (F)"
            >
              <Flag size={13} /> {flags[current.id] ? "Flagged as irregularity" : "Flag as Irregularity"}
            </button>
            <button onClick={goNext} disabled={currentIdx >= remaining.length - 1} className="mkp-btn mkp-skipbar-btn">
              Skip this response
            </button>
          </div>

          <FieldLabel>Question</FieldLabel>
          <div style={s.questionBox}>{current.question_text}</div>

          {/* ── Answer (left) · quick-mark stack (middle) · marking scheme (right) ── */}
          <div className="mkp-triptych">
            <div>
              <p className="mkp-answer-heading">answer</p>
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
            </div>

            <div className="mkp-triptych-controls">
              <button
                type="button"
                className="mkp-btn mkp-quickmark full"
                title="Award full marks"
                onClick={() => handleScoreChange(current.id, current.max_marks ?? 0, current.max_marks)}
              >
                ✓
              </button>
              <button
                type="button"
                className="mkp-btn mkp-quickmark zero"
                title="Award zero"
                onClick={() => handleScoreChange(current.id, 0, current.max_marks)}
              >
                ✗
              </button>
              <button
                type="button"
                className={`mkp-btn mkp-quickmark review${flags[current.id] ? " active" : ""}`}
                title="Flag for review (F)"
                onClick={() => toggleFlag(current.id)}
              >
                R
              </button>
              <div className="mkp-score-fraction">
                {scores[current.id] ?? editableHlForCurrent.reduce((sum, h) => sum + (h.mark || 0), 0)}/{current.max_marks ?? "–"}
              </div>
            </div>

            <div>
              <p className="mkp-scheme-heading">Marking scheme</p>
              <div style={s.guideBox}>
                <div style={s.guideEyebrow}><BookOpen size={13} /> What a full-marks answer looks like</div>
                <div style={s.guideBody}>{current.marking_guide || "No marking guide was set for this question."}</div>
              </div>
            </div>
          </div>

          <FieldLabel>Feedback for the student</FieldLabel>
          <RichEditor value={remarks[current.id] || ""} onChange={(html) => handleRemarkChange(current.id, html)} />

          <p className="mkp-nav-counter" style={{ ...s.navCounter, textAlign: "center", marginTop: 18 }}>
            {currentIdx + 1} of {remaining.length} <span style={{ opacity: 0.8 }}>· ← → to move, Enter to mark, F to flag</span>
          </p>

          {/* ── Bottom action bar — Back / Restart / Save and Move / Refresh,
              mapped onto the same Previous / Skip / Mark&next / Save actions ── */}
          <div className="mkp-actionbar">
            <button onClick={goPrev} disabled={currentIdx === 0} className="mkp-btn mkp-actionbtn back" style={{ opacity: currentIdx === 0 ? 0.5 : 1 }}>
              Back
            </button>
            <button onClick={goNext} disabled={currentIdx >= remaining.length - 1} className="mkp-btn mkp-actionbtn skip" style={{ opacity: currentIdx >= remaining.length - 1 ? 0.5 : 1 }}>
              Skip
            </button>
            <button onClick={markAndAdvance} className="mkp-btn mkp-actionbtn done">
              Save and Move Next
            </button>
            <SaveBtn saving={saving} saved={saved} onClick={saveMarking} small />
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div style={s.footer}>
          <span style={{ color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 500 }}>
            Score so far: <strong style={{ color: "var(--text)" }}>{totalScore}</strong>
            {maxPossible > 0 && <span style={{ color: "var(--text-muted)" }}> / {maxPossible}</span>}
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
        background: saved ? "var(--success-tint)" : "var(--primary)",
        color: saved ? "var(--success)" : "#fff",
        border: saved ? "1px solid var(--success)" : "1px solid transparent",
        opacity: saving ? 0.6 : 1,
        fontSize: small ? 12.5 : 13.5,
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
      <span style={{ ...s.statValue, color: accent ? "var(--primary)" : "var(--text)" }}>{value}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return <p style={s.fieldLabel}>{children}</p>;
}

/* KNEC's dashboard keeps this same DashBoard/MarkingProgress/Review/Live
   Marking/Flags strip visible across every tab of the marking tool — this
   page only implements "Live Marking" (that's what this whole file is),
   so the others render disabled/inert; they're here for the same
   at-a-glance orientation, not as working navigation. */
function MarkingTabStrip({ active = "Live Marking" }) {
  const tabs = ["DashBoard", "MarkingProgress", "Review", "Live Marking", "Flags"];
  return (
    <div className="mkp-tabstrip">
      {tabs.map((t) => (
        <button key={t} type="button" className={`mkp-tab${t === active ? " active" : ""}`} disabled={t !== active}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — all colours come from the shared design tokens so light
   and dark themes both work, matching StudentProfile. Layout &
   responsive rules live in the injected stylesheet above.
═══════════════════════════════════════════════════════════ */
const s = {
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  spinner: { width: 34, height: 34, border: "3px solid var(--border)", borderTop: "3px solid var(--primary)", borderRadius: "50%", animation: "mkp-spin 0.8s linear infinite" },

  heading: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  subheading: { margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },
  accentText: { color: "var(--primary)", fontWeight: 800 },

  progressTrack: { height: 6, borderRadius: 4, background: "var(--border)", marginBottom: 18, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, background: "var(--primary)", transition: "width .4s cubic-bezier(.4,0,.2,1)" },

  statCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  statLabel: { fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 },
  statValue: { fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--text)" },

  railChip: { background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, padding: 2, fontFamily: "inherit" },
  railLabel: { fontSize: 10.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontWeight: 600 },

  dotRow: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: "50%", cursor: "pointer", padding: 0 },

  qCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px 24px", boxShadow: "var(--shadow-sm)" },

  badge: { background: "var(--primary-tint)", color: "var(--primary)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  essayPill: { background: "var(--info-tint)", color: "var(--info)", border: "1px solid var(--info)", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 },
  studentPill: { background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 },
  maxMarksBadge: { fontSize: 12, color: "var(--text-secondary)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px", fontWeight: 600 },
  awardedBadge: { background: "var(--success-tint)", color: "var(--success)", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  remainingBadge: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  flagToggle: { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 },

  questionBox: { background: "var(--bg)", border: "1px solid var(--border)", borderLeft: "3px solid var(--primary)", padding: "14px 16px", borderRadius: "var(--radius-sm)", fontSize: 14.5, lineHeight: 1.65, color: "var(--text)", fontWeight: 500 },

  guideBox: { background: "var(--info-tint)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: 4 },
  guideEyebrow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--info)", marginBottom: 8 },
  guideBody: { fontSize: 13.5, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" },

  essayOuter: { marginTop: 4 },
  essayHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" },
  essayHint: { fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 },
  markMeter: { display: "flex", alignItems: "center", gap: 8 },
  markMeterBar: { width: 80, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" },
  markMeterFill: { height: "100%", borderRadius: 99, transition: "width 0.3s ease" },
  markMeterLabel: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontWeight: 700 },

  essayText: { background: "var(--bg)", border: "1px solid var(--border)", borderLeft: "3px solid var(--info)", padding: "16px 18px", borderRadius: "var(--radius-sm)", fontSize: 14.5, lineHeight: 1.9, color: "var(--text)", cursor: "text", minHeight: 140 },

  hlList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 6 },
  hlListTitle: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px" },
  hlItem: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" },
  hlItemDot: { width: 7, height: 7, borderRadius: "50%", background: "var(--warning)", flexShrink: 0 },
  hlItemText: { flex: 1, color: "var(--text-secondary)", fontStyle: "italic", minWidth: 120 },
  stepper: { display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "2px 4px" },
  stepperBtn: { background: "none", border: "none", color: "var(--text)", width: 22, height: 22, borderRadius: 5, cursor: "pointer", fontSize: 14, lineHeight: 1, fontFamily: "inherit" },
  stepperVal: { color: "var(--warning)", fontWeight: 800, fontVariantNumeric: "tabular-nums", fontSize: 12, minWidth: 24, textAlign: "center" },
  hlItemRemove: { background: "none", border: "1px solid var(--destructive)", color: "var(--destructive)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" },

  richWrap: { border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--bg)" },
  richToolbar: { display: "flex", alignItems: "center", gap: 2, padding: "6px 10px", background: "var(--card)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" },
  richBtn: { background: "none", border: "1px solid transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontWeight: 600 },
  richDivider: { width: 1, height: 18, background: "var(--border)", margin: "0 6px" },
  richArea: { minHeight: 90, padding: "14px 16px", color: "var(--text)", fontSize: 14, lineHeight: 1.8, outline: "none", fontFamily: "inherit" },

  input: { width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13.5, boxSizing: "border-box", fontFamily: "inherit", fontVariantNumeric: "tabular-nums" },

  fieldLabel: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "18px 0 6px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  editorSubtitle: { fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)", fontSize: 11.5 },

  navCounter: { fontSize: 12.5, color: "var(--text-muted)", fontWeight: 500 },
  navBtn: { background: "var(--card)", color: "var(--text-secondary)", border: "1px solid var(--border)", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, boxShadow: "var(--shadow-sm)" },
  markDoneBtn: { background: "var(--primary)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: 700 },

  primaryBtn: { background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, whiteSpace: "nowrap" },

  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "12px 18px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", flexWrap: "wrap", gap: 10 },
  emptyCard: { background: "var(--card)", padding: "40px 24px", borderRadius: "var(--radius)", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)", fontWeight: 500 },
  errorBanner: { background: "var(--destructive-tint)", border: "1px solid var(--destructive)", padding: "16px 20px", borderRadius: "var(--radius-sm)", display: "flex", gap: 12, alignItems: "center", color: "var(--destructive)", fontWeight: 600, fontSize: 13.5 },

  doneCard: { textAlign: "center", padding: "56px 24px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", marginTop: 24 },
  doneTitle: { fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "22px 0 8px", letterSpacing: "-0.01em" },
  doneSub: { fontSize: 14, color: "var(--text-secondary)", margin: 0 },

  flagCard: { background: "var(--warning-tint)", border: "1px solid var(--warning)", borderRadius: "var(--radius-sm)", padding: "14px 18px", marginBottom: 16 },
  flagCardTitle: { display: "flex", alignItems: "center", gap: 6, margin: "0 0 10px", fontSize: 13.5, fontWeight: 800, color: "var(--warning)" },
  flagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" },
  flagRowText: { fontSize: 13, color: "var(--text-secondary)", flex: 1, minWidth: 160 },
  reopenBtn: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--primary)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 },
};