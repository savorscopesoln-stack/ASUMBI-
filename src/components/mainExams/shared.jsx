import React, { useState, useEffect } from "react";
import { Sun, Moon, X as IconX } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SHARED DESIGN TOKENS + PRIMITIVES — Main Examination pages
   ─────────────────────────────────────────────────────────
   Same stylesheet id ("dash-tokens"), same CSS variable names,
   and the same small set of reusable components AdminEAssessments.jsx
   already defines, so these two new pages (list + dashboard) look
   like a natural extension of the existing e-assessment admin UI
   (§46) instead of a bolted-on design system. injectStyles() is a
   no-op if AdminEAssessments.jsx (or Dashboard.jsx) already mounted
   the same sheet.
═══════════════════════════════════════════════════════════ */
export const injectStyles = () => {
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
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes softPulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }

    .dash-spin { animation: spin 0.8s linear infinite; }
    .dash-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: softPulse 1.4s ease-in-out infinite; border-radius: 8px; }

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-icon-btn:hover { background: var(--bg); }
    .btn-hover:hover { filter: brightness(0.97); }

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
      .dash-two-col { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }

    /* ── Shared print rules (Phase 8 — §5/§32) ─────────────────
       .no-print hides screen-only chrome (page header, tab bar,
       toggle buttons, toasts, etc.) when any page in this app calls
       window.print(). .mx-print-only is the reverse: an official-
       document sheet (institution header + a plain table) that's
       invisible on screen and only appears in the printed output —
       kept as generic, reusable utility classes rather than a
       one-off block so a later Reports/PDF phase (§29-§33) can reuse
       the same two classes instead of inventing its own. */
    .mx-print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .mx-print-only { display: block !important; }
      html, body { background: #ffffff !important; }
      .dash-main { padding: 0 !important; background: #ffffff !important; }
    }
  `;
  document.head.appendChild(el);
};

export const C = {
  bg: "var(--bg)", bgAlt: "var(--bg)", surface: "var(--card)", card: "var(--card)", cardHover: "var(--card-elevated)",
  border: "var(--border)", borderHi: "var(--border)",
  textPri: "var(--text)", textSec: "var(--text-secondary)", textMuted: "var(--text-muted)",
  accent: "var(--primary)",
  success: "var(--success)", danger: "var(--destructive)", warning: "var(--warning)", info: "var(--info)",
  white: "#ffffff",
};
export const useC = () => C;

export const extract = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || res?.data || []);

export function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="dash-icon-btn"
      style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export function StatCard({ label, value, icon, tone }) {
  const tint = tone ? C[tone] : C.textPri;
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.textPri, lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: C.bgAlt, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tint }}>
        {icon}
      </div>
    </div>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "32px 0 14px" }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {action}
    </div>
  );
}

export function Chip({ text, tone = "neutral", icon, uppercase }) {
  const color = tone === "neutral" ? C.textSec : C[tone] || C.textSec;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
      background: C.bgAlt, color, border: `1px solid ${C.border}`,
      textTransform: uppercase ? "uppercase" : "none", letterSpacing: uppercase ? "0.05em" : 0,
      whiteSpace: "nowrap",
    }}>
      {icon}{text}
    </span>
  );
}

// Subject-session / main-exam lifecycle badge (§7, §37). Deliberately its
// own map (not e-assessment's StatusBadge, which is approval status) —
// "draft/scheduled/active/ended" is a different vocabulary.
export function LifecycleBadge({ status }) {
  const s = String(status || "draft").toLowerCase();
  const tone = { draft: "neutral", scheduled: "info", active: "success", ended: "neutral", completed: "neutral", published: "info", archived: "neutral" }[s] || "neutral";
  const label = { ended: "Ended", scheduled: "Scheduled", active: "Active", draft: "Draft", completed: "Completed", published: "Published", archived: "Archived" }[s] || s;
  return <Chip text={label} tone={tone} uppercase />;
}

// Live "Active in Xh Ym" countdown for a subject session that's published
// (§7's 'scheduled') but hasn't gone active yet — so an admin watching the
// dashboard can see it's on track instead of wondering whether the
// scheduler is actually going to fire.
//
// start_time is fetched from the API as the "labelled EAT wall-clock"
// instant the exam scheduler itself now uses (see the timezone note in
// backend/utils/examScheduler.js) — i.e. `new Date(start_time)` here has
// the intended EAT digits sitting in its UTC getters, not real UTC. To
// diff against "now" correctly regardless of the *viewer's own* browser
// timezone, "now" has to be relabelled into that exact same shape before
// subtracting — otherwise an admin viewing from outside EAT would see a
// countdown that's off by their own UTC offset. This mirrors
// nowAsSchoolWallClock() server-side; the +3h cancels out on both sides
// of the subtraction, leaving the real remaining time regardless of
// either machine's timezone.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // East Africa Time is UTC+3, no DST
function msUntilActive(startTime) {
  if (!startTime) return null;
  const target = new Date(startTime);
  if (Number.isNaN(target.getTime())) return null;
  const nowAsEatWallClock = new Date(Date.now() + EAT_OFFSET_MS);
  return target.getTime() - nowAsEatWallClock.getTime();
}

function formatCountdown(ms) {
  let total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400); total -= days * 86400;
  const hours = Math.floor(total / 3600); total -= hours * 3600;
  const minutes = Math.floor(total / 60); total -= minutes * 60;
  const seconds = total;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Ticks once a second while a start_time is due within the next hour (so
// the last stretch counts down smoothly), otherwise once a minute — no
// point re-rendering every second for something 3 days out.
export function CountdownToActive({ startTime, status, style }) {
  const [msLeft, setMsLeft] = useState(() => msUntilActive(startTime));

  useEffect(() => {
    if (status !== "scheduled" || !startTime) return undefined;
    setMsLeft(msUntilActive(startTime));
    const tick = () => setMsLeft(msUntilActive(startTime));
    const fast = msUntilActive(startTime);
    const intervalMs = fast !== null && fast <= 60 * 60 * 1000 ? 1000 : 30000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [startTime, status]);

  if (status !== "scheduled" || !startTime || msLeft === null) return null;

  return (
    <span
      style={{
        fontSize: 11.5, fontWeight: 700,
        color: msLeft <= 0 ? "var(--warning)" : "var(--primary)",
        display: "inline-flex", alignItems: "center", gap: 4,
        ...style,
      }}
      title="Automatically goes active at its scheduled start time — no admin action needed"
    >
      {msLeft <= 0 ? "Starting any moment…" : `Active in ${formatCountdown(msLeft)}`}
    </span>
  );
}

// Catches render-time errors in whatever it wraps and shows a message
// instead of leaving the page blank. Pass `resetKey` (e.g. the active
// tab key) so switching away from the broken tab and back clears the
// error automatically, without needing a full page reload.
export class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Tab crashed:", error, info?.componentStack);
  }
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="dash-card"
          style={{
            background: C.card, border: `1px solid ${C.danger}`, borderRadius: 12,
            padding: "40px 24px", textAlign: "center", marginBottom: 24,
          }}
        >
          <p style={{ color: C.danger, fontWeight: 700, fontSize: 14, margin: "0 0 6px" }}>
            Something went wrong loading this tab.
          </p>
          <p style={{ color: C.textMuted, fontSize: 12.5, margin: "0 0 16px", fontFamily: "monospace", wordBreak: "break-word" }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-hover"
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.card, color: C.textSec, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function EmptyState({ icon, text }) {
  return (
    <div className="dash-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "56px 24px", textAlign: "center", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: C.textMuted }}>{icon}</div>
      <p style={{ color: C.textSec, fontSize: 14, margin: 0 }}>{text}</p>
    </div>
  );
}

export function ActionButton({ children, icon, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn-hover" style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "8px 14px", borderRadius: 8,
      border: `1px solid ${primary ? C.accent : C.border}`,
      background: primary ? C.accent : C.card,
      color: primary ? C.white : C.textSec,
      fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }}>
      {icon}{children}
    </button>
  );
}

export function MiniBtn({ children, icon, onClick, tone, grow, title, disabled }) {
  const color = !tone ? C.textSec : C[tone] || C.textSec;
  return (
    <button onClick={onClick} title={title} disabled={disabled} className="btn-hover" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
      padding: children ? "7px 12px" : "7px 9px", borderRadius: 7,
      border: `1px solid ${C.border}`, background: C.bgAlt, color,
      fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      flex: grow ? 1 : "0 0 auto",
    }}>
      {icon}{children}
    </button>
  );
}

export function FieldLabel({ children }) {
  return (
    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </p>
  );
}

export function ModalInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 14, outline: "none", marginBottom: 14, boxSizing: "border-box" }} />
  );
}

export function ModalTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value ?? ""} placeholder={placeholder} rows={rows}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 14, outline: "none", marginBottom: 14, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
  );
}

export function ModalSelect({ value, onChange, options, placeholder }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgAlt, color: value ? C.textPri : C.textMuted, fontSize: 14, outline: "none", marginBottom: 14, boxSizing: "border-box", cursor: "pointer" }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Modal({ title, children, onClose, maxWidth = 520 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 14, padding: "26px 26px 22px", width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPri }}>{title}</h2>
          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <IconX size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SaveButton({ onClick, loading, label, icon }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: 13, border: "none", borderRadius: 9,
      background: loading ? C.textMuted : C.accent, color: C.white,
      fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 8,
    }}>
      {loading ? "Please wait…" : <>{icon}{label}</>}
    </button>
  );
}

export function Th({ children }) {
  return (
    <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", background: C.bgAlt }}>
      {children}
    </th>
  );
}

export function Td({ children, style }) {
  return (
    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

export function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px", background: C.bgAlt, borderRadius: 8, gap: 14 }}>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri, textAlign: "right", wordBreak: "break-word" }}>{value ?? "—"}</span>
    </div>
  );
}

// Shared page-chrome styles (header/tabs/etc.) — same shape as
// AdminEAssessments.jsx's local `sx` object, factored out so both new
// pages use identical spacing/typography.
export const pageSx = {
  page: { minHeight: "100vh", background: C.bg, color: C.textPri, padding: "28px 28px 80px", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: "100%", margin: "0 auto", transition: "background .15s ease, color .15s ease" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 32 },
  pageTitle: { margin: "10px 0 4px", fontSize: 25, fontWeight: 800, color: C.textPri, letterSpacing: "-0.01em" },
  pageSub: { margin: 0, fontSize: 13, color: C.textSec, lineHeight: 1.5 },
  backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.textSec, cursor: "pointer", fontSize: 12, marginBottom: 8 },
  tabBar: { display: "flex", gap: 2, marginBottom: 28, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" },
  tab: { display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", background: "transparent", border: "none", borderBottom: "2px solid transparent", color: C.textMuted, fontWeight: 600, cursor: "pointer", fontSize: 13.5 },
  tabActive: { color: C.textPri, borderBottom: `2px solid ${C.accent}` },
  iconBtn: { padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textSec, cursor: "pointer", display: "flex", alignItems: "center" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 8 },
};

export const globalStyles = `
  .btn-hover:hover { filter: brightness(0.97); }
`;

// BUGFIX (times off by a fixed number of hours, e.g. 7:00 shown as
// 9:00): every start_time/end_time this app hands to these formatters
// is a mssql DATETIME column round-tripped with the driver's default
// useUTC:true — the column's literal wall-clock digits (what the admin
// typed, in East Africa Time — see the "Start Time (EAT)"/"End Time
// (EAT)" fields in MainExaminationDashboard.jsx) are what come back
// labeled as a "Z" UTC instant (see toDateTime() in
// examSubjectSession.controller.js). Formatting that with the
// *viewer's local browser timezone* (the old `undefined` default)
// re-shifted it by however far that browser's clock sits from UTC.
// Pinning timeZone: "UTC" here makes every viewer, on any device in
// any timezone, see the exact same EAT wall-clock time that's stored —
// which is what a fixed exam schedule needs anyway.
export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function fmtTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function fmtDateTime(v) {
  if (!v) return "—";
  return `${fmtDate(v)} · ${fmtTime(v)}`;
}

// "Tuesday" etc. — used by the Timetable's day-grouped list/print view.
export function fmtDayName(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
}

// Calendar-day key, read with UTC getters for the same reason as above:
// the Date object's "local" component getters depend on the viewer's
// browser timezone, but the value stored/returned is a UTC-labeled
// wall clock, not a real UTC instant — grouping by getFullYear/getDate
// (local) could silently roll a session into the wrong day for a
// viewer in a different timezone than whoever scheduled it. Used to
// group subject sessions by day for both the Calendar grid and the
// List/print table.
export function dateKeyOf(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
