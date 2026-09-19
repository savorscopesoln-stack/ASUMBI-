import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";
import {
  ClipboardCheck,
  AlertTriangle,
  Flag,
  Pencil,
  BookOpen,
  Loader2,
  CheckCircle2,
} from "lucide-react";

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
   GLOBAL STYLES
   1. The shared design-token stylesheet — byte-for-byte the same id
      and tokens as TeacherProfile / StudentProfile, so it is a no-op
      when the layout or another page has already mounted it.
   2. Marking-specific rules (media queries, keyframes, pseudo
      elements) — all colours come from the shared tokens, so the
      page follows the app's light / dark theme automatically.
═══════════════════════════════════════════════════════════ */
function injectMarkingStyles() {
  if (typeof document === "undefined") return;

  /* ─── shared tokens (identical to the Profile pages) ─── */
  if (!document.getElementById("dash-tokens")) {
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
  }

  /* drop the previous dark-only stylesheet if it is still mounted (HMR) */
  const legacy = document.getElementById("mkp-style-block-v2");
  if (legacy) legacy.remove();

  if (document.getElementById("mkp-style-block-v3")) return;
  const style = document.createElement("style");
  style.id = "mkp-style-block-v3";
  style.textContent = `
    @keyframes mkp-spin { to { transform: rotate(360deg); } }
    @keyframes mkp-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes mkp-toast-in { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes mkp-pop { 0% { background-color: rgba(251,191,36,.7); transform: scale(1.03); } 100% { background-color: rgba(251,191,36,.32); transform: scale(1); } }
    @keyframes mkp-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes mkp-pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,.5); } 50% { box-shadow: 0 0 0 6px rgba(251,191,36,0); } }
    @keyframes mkp-ring-in { from { stroke-dashoffset: 999; } }
    @keyframes mkp-stamp-in { from { opacity: 0; transform: scale(1.4) rotate(-14deg); } to { opacity: 1; transform: scale(1) rotate(-8deg); } }

    .mkp-root, .mkp-root * { box-sizing: border-box; }

    /* Page fills the whole area and the content column is 95% of its width
       (2.5% breathing room each side). */
    .mkp-root {
      width: 100%;
      min-height: 100vh;
      padding: 24px 2.5% 110px;
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    @media (max-width: 720px) { .mkp-root { padding: 16px 2.5% 100px; } }

    .mkp-card { animation: mkp-fade-up .28s cubic-bezier(.2,.8,.3,1) both; }

    .mkp-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
    @media (max-width: 560px) { .mkp-topbar { flex-direction: column; align-items: stretch; } .mkp-topbar > button, .mkp-topbar-actions { width: 100%; } }

    .mkp-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 560px) { .mkp-stats-row { grid-template-columns: 1fr 1fr; } .mkp-stats-row > :last-child { grid-column: span 2; } }

    .mkp-essay-readonly { user-select: text; caret-color: transparent; outline: none; }
    .mkp-essay-readonly:focus { outline: none; }
    .hl-mark { color: inherit; background: rgba(251,191,36,.32); border-bottom: 2px solid var(--warning); border-radius: 3px; padding: 1px 3px; cursor: pointer; position: relative; animation: mkp-pop .45s ease; transition: background .15s ease; }
    .hl-mark:hover { background: rgba(251,191,36,.55); }
    .hl-mark::after { content: "+" attr(data-mark); position: absolute; top: -9px; right: -6px; background: var(--warning); color: #fff; font-size: 9px; font-weight: 800; border-radius: 5px; padding: 0 4px; line-height: 13px; pointer-events: none; }

    .mkp-btn { transition: transform .15s ease, box-shadow .2s ease, background .2s ease, opacity .2s ease, filter .2s ease; cursor: pointer; font-family: inherit; }
    .mkp-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(0.95); box-shadow: var(--shadow); }
    .mkp-btn:active:not(:disabled) { transform: translateY(0); }
    .mkp-btn:disabled { cursor: not-allowed; }

    .mkp-dot { transition: all .2s ease; }
    .mkp-dot.mkp-dot-flagged { box-shadow: 0 0 0 2px var(--warning) inset; }
    .mkp-dot.mkp-dot-current { animation: mkp-pulse-ring 1.7s ease infinite; }

    .mkp-progress-track { position: relative; overflow: hidden; }
    .mkp-progress-fill { position: relative; overflow: hidden; background: var(--primary); }
    .mkp-progress-fill::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); background-size: 200px 100%; animation: mkp-shimmer 1.7s linear infinite; }

    .mkp-toast { animation: mkp-toast-in .28s cubic-bezier(.2,.9,.3,1.15); }
    .mkp-stepper-btn { transition: background .15s ease, opacity .15s ease; }
    .mkp-stepper-btn:hover:not(:disabled) { background: var(--primary-tint); }
    .mkp-stepper-btn:disabled { opacity: .35; cursor: not-allowed; }
    .mkp-flag-btn.active { background: var(--warning-tint) !important; border-color: var(--warning) !important; color: var(--warning) !important; }

    .mkp-rail-wrap { display: flex; gap: 14px; overflow-x: auto; padding: 4px 2px 14px; margin-bottom: 4px; }
    .mkp-rail-wrap::-webkit-scrollbar { height: 6px; }
    .mkp-rail-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }
    .mkp-rail-chip { transition: transform .18s ease, filter .18s ease; cursor: pointer; }
    .mkp-rail-chip:hover { transform: translateY(-2px); filter: brightness(0.95); }
    .mkp-rail-chip.current { animation: mkp-pulse-ring 1.9s ease infinite; border-radius: 50%; }
    .mkp-rail-ring circle.mkp-ring-fill { animation: mkp-ring-in .5s ease-out; }

    .mkp-qcard-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 6px; }
    .mkp-qcard-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .mkp-navrow { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
    @media (max-width: 560px) { .mkp-navrow { flex-direction: column; align-items: stretch; } .mkp-navrow-side { display: flex; gap: 10px; justify-content: space-between; } .mkp-navrow-side > button { flex: 1; } .mkp-nav-counter { order: 3; text-align: center; } }

    .mkp-rich-wrap:focus-within { border-color: var(--primary) !important; }
    .mkp-rich-btn:hover { background: var(--primary-tint) !important; color: var(--primary) !important; }
    .mkp-rich-area:empty::before { content: attr(data-placeholder); color: var(--text-muted); pointer-events: none; }

    .mkp-stamp { display: inline-flex; align-items: center; gap: 8px; border: 2.5px dashed var(--success); background: var(--success-tint); color: var(--success); border-radius: 12px; padding: 10px 22px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; font-size: 13px; transform: rotate(-8deg); animation: mkp-stamp-in .4s cubic-bezier(.2,.9,.3,1.2) both; }

    @media (prefers-reduced-motion: reduce) {
      .mkp-progress-fill::after, .mkp-dot.mkp-dot-current, .mkp-rail-chip.current { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

function useGlobalMarkingStyles() {
  // Idempotent + synchronous (same pattern as the Profile pages) so the
  // first paint is already themed.
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
        background: "var(--card-elevated)", border: "1px solid var(--border)", borderLeft: `4px solid ${accent}`,
        color: "var(--text)", padding: "12px 16px", borderRadius: "var(--radius-sm)",
        boxShadow: "0 12px 30px rgba(16,24,40,.22)",
        display: "flex", alignItems: "center", gap: 14, fontSize: 13.5, fontWeight: 600,
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action.onClick(); onDismiss(); }}
          style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 800, cursor: "pointer", fontSize: 13, padding: 0, fontFamily: "inherit" }}
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>
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
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth="6" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke="var(--primary)" strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize={size * 0.24} fontWeight="800" fontFamily="'Inter', system-ui, sans-serif">
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
              <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth="3.5" fill="none" />
              <circle
                className="mkp-ring-fill" cx={size / 2} cy={size / 2} r={r}
                stroke={isComplete ? "var(--success)" : "var(--primary)"} strokeWidth="3.5" fill="none"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset .5s ease" }}
              />
              <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill={isCurrent ? "var(--primary)" : "var(--text-secondary)"} fontSize={12} fontWeight="800" fontFamily="'Inter', system-ui, sans-serif">
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
        className="mkp-rich-area"
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
          <Pencil size={13} color="var(--primary)" />
          Select the parts of the answer worth credit — a highlight is added automatically. Tap a highlight to remove it.
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

        <div className="mkp-topbar">
          <div style={s.headingRow}>
            <ClipboardCheck size={20} color="var(--primary)" />
            <div>
              <h2 style={s.heading}>Marking complete</h2>
              <p style={s.subheading}>Every essay question in this batch has been marked.</p>
            </div>
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
                {totalScore}{maxPossible > 0 && <span style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 700 }}> / {maxPossible}</span>}
              </span>
            </div>
          </div>
        </div>

        {flaggedAnswers.length > 0 && (
          <div style={s.flagCard}>
            <p style={s.flagCardTitle}>
              <Flag size={14} />
              {flaggedAnswers.length} question{flaggedAnswers.length !== 1 ? "s" : ""} flagged for a second look
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
          <span className="mkp-stamp"><CheckCircle2 size={16} /> Graded</span>
          <p style={s.doneTitle}>Nice work — that's everyone marked</p>
          <p style={s.doneSub}>Save to lock in the scores for this batch.</p>
          <button
            onClick={saveMarking}
            disabled={saving}
            className="mkp-btn"
            style={{ ...s.primaryBtn, ...(saved ? s.savedBtn : null), marginTop: 26, padding: "13px 40px", fontSize: 14.5, opacity: saving ? 0.6 : 1 }}
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
        <div style={s.headingRow}>
          <ClipboardCheck size={20} color="var(--primary)" />
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
                border: `2px solid ${i === currentIdx ? "var(--primary-tint)" : "transparent"}`,
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
                <Flag size={12} /> {flags[current.id] ? "Flagged" : "Flag"}
              </button>
            </div>
          </div>

          <FieldLabel>Question</FieldLabel>
          <div style={s.questionBox}>{current.question_text}</div>

          <FieldLabel>Marking guide</FieldLabel>
          <div style={s.guideBox}>
            <div style={s.guideEyebrow}><BookOpen size={13} /> What a full-marks answer looks like</div>
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
            <button onClick={goPrev} disabled={currentIdx === 0} className="mkp-btn" style={{ ...s.navBtn, opacity: currentIdx === 0 ? 0.4 : 1 }}>
              ← Previous
            </button>

            <span className="mkp-nav-counter" style={s.navCounter}>
              {currentIdx + 1} of {remaining.length} <span style={{ opacity: 0.8 }}>· ← → to move, Enter to mark, F to flag</span>
            </span>

            <div className="mkp-navrow-side" style={{ display: "flex", gap: 10 }}>
              <button onClick={goNext} disabled={currentIdx >= remaining.length - 1} className="mkp-btn" style={{ ...s.navBtn, opacity: currentIdx >= remaining.length - 1 ? 0.4 : 1 }}>
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
          <span style={{ color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600 }}>
            Score so far: <strong style={{ color: "var(--text)", fontWeight: 800 }}>{totalScore}</strong>
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
        ...(saved ? s.savedBtn : null),
        opacity: saving ? 0.6 : 1,
        fontSize: small ? 12.5 : 13.5,
        padding: small ? "8px 16px" : "10px 22px",
      }}
    >
      {saving ? (
        <>
          <Loader2 size={14} className="dash-spin" /> Saving…
        </>
      ) : saved ? (
        <>
          <CheckCircle2 size={14} /> Saved
        </>
      ) : (
        "Save marks"
      )}
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

/* ═══════════════════════════════════════════════════════════
   STYLES — every colour is a shared design token (same set the
   Profile pages use), so light / dark switching is automatic.
   Layout & responsive rules live in the injected stylesheet.
═══════════════════════════════════════════════════════════ */
const s = {
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  spinner: { width: 36, height: 36, border: "3px solid var(--border)", borderTop: "3px solid var(--primary)", borderRadius: "50%", animation: "mkp-spin 0.8s linear infinite" },

  headingRow: { display: "flex", alignItems: "center", gap: 8 },
  heading: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  subheading: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },
  accentText: { color: "var(--primary)", fontWeight: 800 },

  progressTrack: { height: 6, borderRadius: 4, background: "var(--border)", marginBottom: 18 },
  progressFill: { height: "100%", borderRadius: 4, transition: "width .4s cubic-bezier(.4,0,.2,1)" },

  statCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0, boxShadow: "var(--shadow-sm)" },
  statLabel: { fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 },
  statValue: { fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" },

  railChip: { background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, padding: 0, fontFamily: "inherit" },
  railLabel: { fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700, fontVariantNumeric: "tabular-nums" },

  dotRow: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: "50%", cursor: "pointer", padding: 0 },

  qCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px 24px", boxShadow: "var(--shadow)" },

  badge: { background: "var(--primary-tint)", color: "var(--primary)", borderRadius: 6, padding: "4px 12px", fontSize: 13.5, fontWeight: 800 },
  essayPill: { background: "var(--info-tint)", color: "var(--info)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" },
  studentPill: { background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 },
  maxMarksBadge: { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 9px" },
  awardedBadge: { background: "var(--success-tint)", color: "var(--success)", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  remainingBadge: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
  flagToggle: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 12, fontWeight: 700 },

  questionBox: { background: "var(--bg)", border: "1px solid var(--border)", borderLeft: "3px solid var(--primary)", padding: "14px 16px", borderRadius: "var(--radius-sm)", fontSize: 15, lineHeight: 1.65, color: "var(--text)" },

  guideBox: { background: "var(--info-tint)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: 4 },
  guideEyebrow: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, color: "var(--info)", letterSpacing: "0.02em", marginBottom: 8 },
  guideBody: { fontSize: 14, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" },

  essayOuter: { marginTop: 4 },
  essayHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" },
  essayHint: { fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  markMeter: { display: "flex", alignItems: "center", gap: 8 },
  markMeterBar: { width: 80, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" },
  markMeterFill: { height: "100%", borderRadius: 99, transition: "width 0.3s ease" },
  markMeterLabel: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 700, fontVariantNumeric: "tabular-nums" },

  essayText: { background: "var(--bg)", border: "1px solid var(--border)", borderLeft: "3px solid var(--primary)", padding: "16px 18px", borderRadius: "var(--radius-sm)", fontSize: 15, lineHeight: 1.9, color: "var(--text)", cursor: "text", minHeight: 140 },

  hlList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 6 },
  hlListTitle: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px" },
  hlItem: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" },
  hlItemDot: { width: 7, height: 7, borderRadius: "50%", background: "var(--warning)", flexShrink: 0 },
  hlItemText: { flex: 1, color: "var(--text-secondary)", fontStyle: "italic", minWidth: 120 },
  stepper: { display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 4px" },
  stepperBtn: { background: "none", border: "none", color: "var(--text)", width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1, fontFamily: "inherit" },
  stepperVal: { color: "var(--warning)", fontWeight: 800, fontSize: 12, minWidth: 24, textAlign: "center", fontVariantNumeric: "tabular-nums" },
  hlItemRemove: { background: "var(--destructive-tint)", border: "1px solid transparent", color: "var(--destructive)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit" },

  richWrap: { border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--bg)" },
  richToolbar: { display: "flex", alignItems: "center", gap: 2, padding: "6px 10px", background: "var(--card)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" },
  richBtn: { background: "none", border: "1px solid transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 6, fontFamily: "inherit" },
  richDivider: { width: 1, height: 18, background: "var(--border)", margin: "0 6px" },
  richArea: { minHeight: 90, padding: "14px 16px", color: "var(--text)", fontSize: 14, lineHeight: 1.8, outline: "none", fontFamily: "inherit" },

  input: { width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", fontVariantNumeric: "tabular-nums" },

  fieldLabel: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "18px 0 6px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  editorSubtitle: { fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)", fontSize: 11.5 },

  navCounter: { fontSize: 12.5, color: "var(--text-muted)", fontWeight: 500 },
  navBtn: { background: "var(--card)", color: "var(--text-secondary)", border: "1px solid var(--border)", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700 },
  markDoneBtn: { background: "var(--primary)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: 700 },

  primaryBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--primary)", color: "#fff", border: "1px solid transparent", borderRadius: "var(--radius-sm)", fontWeight: 700, whiteSpace: "nowrap" },
  savedBtn: { background: "var(--success-tint)", color: "var(--success)", border: "1px solid var(--success)" },

  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "14px 20px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", flexWrap: "wrap", gap: 10 },
  emptyCard: { background: "var(--card)", padding: "40px 24px", borderRadius: "var(--radius)", textAlign: "center", color: "var(--text-muted)", fontWeight: 600, border: "1px solid var(--border)" },
  errorBanner: { background: "var(--destructive-tint)", border: "1px solid var(--destructive)", padding: "16px 20px", borderRadius: "var(--radius)", display: "flex", gap: 12, alignItems: "center", color: "var(--destructive)", fontSize: 13.5, fontWeight: 600 },

  doneCard: { textAlign: "center", padding: "64px 24px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", marginTop: 24 },
  doneTitle: { fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "22px 0 8px", letterSpacing: "-0.01em" },
  doneSub: { fontSize: 14, color: "var(--text-secondary)", fontWeight: 500, margin: 0 },

  flagCard: { background: "var(--warning-tint)", border: "1px solid var(--border)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: 16 },
  flagCardTitle: { display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "var(--warning)" },
  flagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" },
  flagRowText: { fontSize: 13, color: "var(--text)", fontWeight: 500, flex: 1, minWidth: 160 },
  reopenBtn: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--primary)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 },
};