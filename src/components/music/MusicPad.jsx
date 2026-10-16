import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Eraser, Minus, Undo2, Redo2, Trash2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   MUSIC PAD — one drawing sheet for a music paper.

   What the student gets
   ─────────────────────
   • A paper (white) with an optional printed template: treble / bass / grand
     staves, plain staves, or blank.
   • Tools: pen, eraser, straight line (stems, beams, bar lines, ledger lines),
     slur (arc above) and tie/slur (arc below).
   • Music symbols to stamp: notes, rests, accidentals, clefs, time signatures,
     dynamics, dots, fermata, staccato, accents, bar lines. Notes, accidentals,
     dots and rests SNAP to the staff lines/spaces; notes outside the staff get
     their ledger lines automatically. Press, drag to fine-tune, release to place.
   • Undo / redo / clear (inline confirm — never a native dialog, because a
     native dialog blurs the window and the exam page counts that as leaving).

   How it stores
   ─────────────
   The sheet is flattened to a PNG data URL (staves + symbols + ink) and handed
   to `onChange(png, templateId)`. An untouched sheet reports "" so it never
   counts as an answer. A saved sheet is re-opened from that PNG; the eraser then
   removes ink but the printed template re-appears underneath.

   Symbols are drawn with the Bravura music font (SIL OFL, served from
   /fonts/Bravura.woff2) so every device draws the same clefs and notes.
═══════════════════════════════════════════════════════════ */

const W = 1000;               // logical paper width (CSS scales it to fit)
const S = 16;                 // staff space in px
const INK = "#111111";
const FONT = "Bravura, 'Noto Music', 'Segoe UI Symbol', serif";

/* ── printed templates ─────────────────────────────────────── */
const buildTemplate = (id) => {
  const L = 40, R = W - 40;
  const staves = [];   // {top, kind:'treble'|'bass'|'plain'}
  const joins = [];    // grand-staff brace lines [{y1,y2}]
  let H = 640;
  if (id === "treble" || id === "bass" || id === "plain") {
    const n = id === "plain" ? 8 : 6;
    const gap = id === "plain" ? 80 : 124;
    H = 40 + n * gap;
    for (let i = 0; i < n; i++) staves.push({ top: 56 + i * gap, kind: id });
  } else if (id === "grand") {
    const n = 3, sysH = 4 * S + 60 + 4 * S, gap = 56;
    H = 24 + n * (sysH + gap);
    for (let i = 0; i < n; i++) {
      const t = 40 + i * (sysH + gap);
      staves.push({ top: t, kind: "treble" });
      staves.push({ top: t + 4 * S + 60, kind: "bass" });
      joins.push({ y1: t, y2: t + 4 * S + 60 + 4 * S });
    }
  }
  return { id, L, R, H, staves, joins };
};

const TEMPLATES = [
  { id: "blank", label: "Blank paper" },
  { id: "treble", label: "Treble staves" },
  { id: "bass", label: "Bass staves" },
  { id: "grand", label: "Grand staves" },
  { id: "plain", label: "Plain staves (no clef)" },
];

/* ── symbol palette (SMuFL code points in Bravura) ─────────── */
const g = (cp) => String.fromCodePoint(cp);
const NOTE_HEAD_W = 1.18;
const PALETTE = {
  Notes: [
    { id: "whole", label: "Whole note", kind: "note", up: g(0xe1d2), down: g(0xe1d2), w: 1.688 },
    { id: "half", label: "Half note", kind: "note", up: g(0xe1d3), down: g(0xe1d4), w: NOTE_HEAD_W },
    { id: "quarter", label: "Quarter note", kind: "note", up: g(0xe1d5), down: g(0xe1d6), w: NOTE_HEAD_W },
    { id: "eighth", label: "Eighth note", kind: "note", up: g(0xe1d7), down: g(0xe1d8), w: NOTE_HEAD_W },
    { id: "sixteenth", label: "Sixteenth note", kind: "note", up: g(0xe1d9), down: g(0xe1da), w: NOTE_HEAD_W },
    { id: "headBlack", label: "Filled note head (for beaming)", kind: "note", up: g(0xe0a4), down: g(0xe0a4), w: NOTE_HEAD_W },
    { id: "headOpen", label: "Open note head", kind: "note", up: g(0xe0a3), down: g(0xe0a3), w: NOTE_HEAD_W },
    { id: "dot", label: "Dot (dotted note)", kind: "dot", up: g(0xe1e7), down: g(0xe1e7), w: 0.4 },
  ],
  Rests: [
    { id: "restWhole", label: "Whole rest", kind: "rest", k: 2, up: g(0xe4e3), w: 1.13 },
    { id: "restHalf", label: "Half rest", kind: "rest", k: 4, up: g(0xe4e4), w: 1.13 },
    { id: "restQuarter", label: "Quarter rest", kind: "rest", k: 4, up: g(0xe4e5), w: 1.08 },
    { id: "restEighth", label: "Eighth rest", kind: "rest", k: 4, up: g(0xe4e6), w: 0.99 },
    { id: "restSixteenth", label: "Sixteenth rest", kind: "rest", k: 4, up: g(0xe4e7), w: 1.3 },
  ],
  Signs: [
    { id: "sharp", label: "Sharp", kind: "acc", up: g(0xe262), w: 1.0 },
    { id: "flat", label: "Flat", kind: "acc", up: g(0xe260), w: 0.9 },
    { id: "natural", label: "Natural", kind: "acc", up: g(0xe261), w: 0.67 },
    { id: "dsharp", label: "Double sharp", kind: "acc", up: g(0xe263), w: 1.0 },
    { id: "gclef", label: "Treble clef", kind: "clef", k: 6, up: g(0xe050), w: 2.68 },
    { id: "fclef", label: "Bass clef", kind: "clef", k: 2, up: g(0xe062), w: 2.74 },
    { id: "ts24", label: "2/4 time", kind: "time", top: "2", bot: "4", w: 1.7 },
    { id: "ts34", label: "3/4 time", kind: "time", top: "3", bot: "4", w: 1.7 },
    { id: "ts44", label: "4/4 time", kind: "time", top: "4", bot: "4", w: 1.7 },
    { id: "ts68", label: "6/8 time", kind: "time", top: "6", bot: "8", w: 1.7 },
    { id: "tsC", label: "Common time", kind: "clef", k: 4, up: g(0xe08a), w: 1.7 },
  ],
  Marks: [
    { id: "dynp", label: "p (piano)", kind: "free", up: g(0xe520), w: 1.2 },
    { id: "dynmp", label: "mp", kind: "free", up: g(0xe52c), w: 2.2 },
    { id: "dynmf", label: "mf", kind: "free", up: g(0xe52d), w: 2.2 },
    { id: "dynf", label: "f (forte)", kind: "free", up: g(0xe522), w: 1.2 },
    { id: "fermata", label: "Fermata (pause)", kind: "free", up: g(0xe4c0), w: 1.7 },
    { id: "stacc", label: "Staccato dot", kind: "free", up: g(0xe4a2), w: 0.4 },
    { id: "accent", label: "Accent", kind: "free", up: g(0xe4a0), w: 1.2 },
    { id: "bar1", label: "Bar line", kind: "bar", style: "single" },
    { id: "bar2", label: "Double bar line", kind: "bar", style: "double" },
    { id: "barF", label: "Final bar line", kind: "bar", style: "final" },
  ],
};

const SIZES = [{ id: "s", label: "Thin", px: 2 }, { id: "m", label: "Medium", px: 3.5 }, { id: "l", label: "Thick", px: 6 }];

/* ── helpers ───────────────────────────────────────────────── */
const nearestStaff = (tpl, y) => {
  let best = null, bd = Infinity;
  for (const st of tpl.staves) {
    const d = Math.abs(y - (st.top + 2 * S));
    if (d < bd) { bd = d; best = st; }
  }
  return best;
};

/** Where a stamp lands: snapped to the staff when one exists, free otherwise. */
const placeStamp = (tpl, stamp, x, y, stem) => {
  const st = tpl.staves.length ? nearestStaff(tpl, y) : null;
  const snapsVertically = stamp.kind === "note" || stamp.kind === "acc" || stamp.kind === "dot";
  let k = null, py = y;
  if (st) {
    if (stamp.kind === "rest" || stamp.kind === "clef" || stamp.kind === "time") {
      k = stamp.kind === "time" ? null : stamp.k;
    } else if (snapsVertically) {
      k = Math.max(-8, Math.min(16, Math.round((y - st.top) / (S / 2))));
    }
    if (k !== null) py = st.top + k * (S / 2);
    if (stamp.kind === "time") py = st.top; // numerals are positioned from the top line
  }
  let char = stamp.up;
  if (stamp.kind === "note" && stamp.down) {
    const down = stem === "down" || (stem === "auto" && k !== null && k < 4);
    char = down ? stamp.down : stamp.up;
  }
  const ledgers = [];
  if (stamp.kind === "note" && st && k !== null) {
    if (k <= -2) for (let kk = -2; kk >= k; kk -= 2) ledgers.push(st.top + kk * (S / 2));
    if (k >= 10) for (let kk = 10; kk <= k; kk += 2) ledgers.push(st.top + kk * (S / 2));
  }
  const barTop = st ? st.top : y - 2 * S;
  return { x, y: py, char, ledgers, barTop };
};

const drawOp = (ctx, op) => {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (op.type === "stroke") {
    ctx.globalCompositeOperation = op.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = INK;
    ctx.lineWidth = op.erase ? op.size * 4 : op.size;
    const p = op.pts;
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    if (p.length === 1) ctx.lineTo(p[0].x + 0.01, p[0].y + 0.01);
    for (let i = 1; i < p.length - 1; i++) {
      const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
      ctx.quadraticCurveTo(p[i].x, p[i].y, mx, my);
    }
    if (p.length > 1) ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    ctx.stroke();
  } else if (op.type === "line") {
    ctx.strokeStyle = INK;
    ctx.lineWidth = op.size;
    ctx.beginPath(); ctx.moveTo(op.a.x, op.a.y); ctx.lineTo(op.b.x, op.b.y); ctx.stroke();
  } else if (op.type === "slur") {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    const mx = (op.a.x + op.b.x) / 2, my = (op.a.y + op.b.y) / 2;
    const d = Math.hypot(op.b.x - op.a.x, op.b.y - op.a.y);
    const h = Math.min(46, Math.max(10, d * 0.22)) * (op.dir === "down" ? 1 : -1);
    ctx.beginPath(); ctx.moveTo(op.a.x, op.a.y); ctx.quadraticCurveTo(mx, my + h * 1.6, op.b.x, op.b.y); ctx.stroke();
  } else if (op.type === "stamp") {
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    const st = op.stamp;
    if (op.ledgers?.length) {
      ctx.lineWidth = 1.6;
      const half = (st.w * S) / 2 + S * 0.4;
      for (const ly of op.ledgers) { ctx.beginPath(); ctx.moveTo(op.x - half, ly); ctx.lineTo(op.x + half, ly); ctx.stroke(); }
    }
    if (st.kind === "bar") {
      const t = op.barTop, b = t + 4 * S;
      const line = (x, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, b); ctx.stroke(); };
      if (st.style === "single") line(op.x, 1.8);
      if (st.style === "double") { line(op.x - 3, 1.6); line(op.x + 3, 1.6); }
      if (st.style === "final") { line(op.x - 4, 1.6); line(op.x + 2, 5); }
    } else if (st.kind === "time") {
      ctx.font = `${4 * S}px ${FONT}`;
      ctx.textBaseline = "alphabetic";
      const dig = (ch) => String.fromCodePoint(0xe080 + Number(ch));
      const x = op.x - (st.w * S) / 2;
      ctx.fillText(dig(st.top), x, op.y + 2 * S);
      ctx.fillText(dig(st.bot), x, op.y + 4 * S);
    } else {
      ctx.font = `${4 * S}px ${FONT}`;
      ctx.textBaseline = "alphabetic";
      const w = (st.w || NOTE_HEAD_W) * S;
      ctx.fillText(op.char, op.x - w / 2, op.y);
    }
  }
  ctx.restore();
};

/* ═══════════════════════════════════════════════════════════ */
export default function MusicPad({ initialPng = "", initialTemplate = "blank", onChange, disabled = false }) {
  const mainRef = useRef(null);
  const inkRef = useRef(null);             // transparent layer holding the student's ink
  const baseRef = useRef(null);            // image restored from a saved PNG
  const opsRef = useRef([]);
  const redoRef = useRef([]);
  const draftRef = useRef(null);           // op being drawn right now
  const hoverRef = useRef(null);           // {x,y} for stamp preview
  const [tplId, setTplId] = useState(initialTemplate);
  const [tool, setTool] = useState("pen");
  const [stamp, setStamp] = useState(null);
  const [tab, setTab] = useState("Notes");
  const [stem, setStem] = useState("auto");
  const [size, setSize] = useState("m");
  const [counts, setCounts] = useState({ ops: 0, redo: 0, base: false });
  const [confirmClear, setConfirmClear] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const tpl = useMemo(() => buildTemplate(tplId), [tplId]);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  /* font */
  useEffect(() => {
    const id = "bravura-font-face";
    if (!document.getElementById(id)) {
      const st = document.createElement("style");
      st.id = id;
      st.textContent = `@font-face{font-family:"Bravura";src:url("${import.meta.env.BASE_URL}fonts/Bravura.woff2") format("woff2");font-display:block}`;
      document.head.appendChild(st);
    }
    let alive = true;
    (document.fonts?.load ? document.fonts.load(`${4 * S}px Bravura`, "\uE050") : Promise.resolve())
      .catch(() => {})
      .then(() => { if (alive) setFontReady(true); });
    return () => { alive = false; };
  }, []);

  /* paint */
  const paint = useCallback(() => {
    const main = mainRef.current, ink = inkRef.current;
    if (!main || !ink) return;
    const ctx = main.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, main.width, main.height);
    // printed template
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.3;
    for (const st of tpl.staves) {
      for (let i = 0; i < 5; i++) { const y = st.top + i * S; ctx.beginPath(); ctx.moveTo(tpl.L, y); ctx.lineTo(tpl.R, y); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(tpl.L, st.top); ctx.lineTo(tpl.L, st.top + 4 * S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tpl.R, st.top); ctx.lineTo(tpl.R, st.top + 4 * S); ctx.stroke();
      if (st.kind === "treble" || st.kind === "bass") {
        ctx.font = `${4 * S}px ${FONT}`; ctx.textBaseline = "alphabetic";
        ctx.fillText(st.kind === "treble" ? g(0xe050) : g(0xe062), tpl.L + 8, st.top + (st.kind === "treble" ? 6 : 2) * (S / 2) * 1);
      }
    }
    for (const j of tpl.joins) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tpl.L, j.y1); ctx.lineTo(tpl.L, j.y2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tpl.R, j.y1); ctx.lineTo(tpl.R, j.y2); ctx.stroke(); }
    ctx.restore();
    // ink layer = restored base + committed ops (+ the stroke in progress)
    const ictx = ink.getContext("2d");
    ictx.clearRect(0, 0, ink.width, ink.height);
    if (baseRef.current) ictx.drawImage(baseRef.current, 0, 0, ink.width, ink.height);
    for (const op of opsRef.current) drawOp(ictx, op);
    if (draftRef.current && draftRef.current.type === "stroke") drawOp(ictx, draftRef.current);
    ctx.drawImage(ink, 0, 0);
    // transient previews (never part of the saved sheet)
    const d = draftRef.current;
    if (d && d.type !== "stroke") drawOp(ctx, d);
    if (tool === "stamp" && stamp && hoverRef.current && !disabled) {
      ctx.save(); ctx.globalAlpha = 0.45;
      const p = placeStamp(tpl, stamp, hoverRef.current.x, hoverRef.current.y, stem);
      drawOp(ctx, { type: "stamp", stamp, ...p });
      ctx.restore();
    }
  }, [tpl, tool, stamp, stem, disabled]);

  /* size the canvases when the template (height) changes, restore saved PNG once */
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (!inkRef.current) inkRef.current = document.createElement("canvas");
    main.width = W; main.height = tpl.H;
    inkRef.current.width = W; inkRef.current.height = tpl.H;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl]);

  useEffect(() => {
    if (!initialPng) return;
    const img = new Image();
    img.onload = () => {
      baseRef.current = img;
      setCounts((c) => ({ ...c, base: true }));
      paint();
    };
    img.src = initialPng;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { paint(); }, [paint, fontReady, counts]);

  /* export */
  const emit = useCallback(() => {
    const dirty = opsRef.current.length > 0 || !!baseRef.current;
    setCounts({ ops: opsRef.current.length, redo: redoRef.current.length, base: !!baseRef.current });
    if (!dirty) { onChangeRef.current?.("", tplId); return; }
    paint();
    try { onChangeRef.current?.(mainRef.current.toDataURL("image/png"), tplId); } catch { /* tainted/unavailable: keep drawing */ }
  }, [paint, tplId]);

  /* pointer */
  const pos = (e) => {
    const r = mainRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * tpl.H) / r.height };
  };
  const sizePx = SIZES.find((s) => s.id === size).px;

  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    mainRef.current.setPointerCapture?.(e.pointerId);
    const p = pos(e);
    if (tool === "pen" || tool === "eraser") draftRef.current = { type: "stroke", erase: tool === "eraser", size: sizePx, pts: [p] };
    else if (tool === "line") draftRef.current = { type: "line", size: sizePx, a: p, b: p };
    else if (tool === "slurUp" || tool === "slurDown") draftRef.current = { type: "slur", dir: tool === "slurDown" ? "down" : "up", a: p, b: p };
    else if (tool === "stamp" && stamp) { hoverRef.current = p; draftRef.current = { type: "stampDraft" }; }
    paint();
  };
  const move = (e) => {
    if (disabled) return;
    const p = pos(e);
    const d = draftRef.current;
    if (!d) { if (tool === "stamp") { hoverRef.current = p; paint(); } return; }
    if (d.type === "stroke") d.pts.push(p);
    else if (d.type === "line") d.b = (e.shiftKey ? { x: p.x, y: d.a.y } : p);
    else if (d.type === "slur") d.b = p;
    else if (d.type === "stampDraft") hoverRef.current = p;
    paint();
  };
  const up = (e) => {
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    const p = pos(e);
    let committed = null;
    if (d.type === "stroke") committed = d;
    else if (d.type === "line" || d.type === "slur") { if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 3) committed = d; }
    else if (d.type === "stampDraft" && stamp) { committed = { type: "stamp", stamp, ...placeStamp(tpl, stamp, p.x, p.y, stem) }; }
    if (committed) { opsRef.current.push(committed); redoRef.current = []; }
    emit();
  };
  const leave = () => { if (!draftRef.current && hoverRef.current) { hoverRef.current = null; paint(); } };

  const undo = () => { const o = opsRef.current.pop(); if (o) { redoRef.current.push(o); emit(); } };
  const redo = () => { const o = redoRef.current.pop(); if (o) { opsRef.current.push(o); emit(); } };
  const clearAll = () => { opsRef.current = []; redoRef.current = []; baseRef.current = null; setConfirmClear(false); emit(); };

  const hasInk = counts.ops > 0 || counts.base;
  const btn = (active, dis) => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, minWidth: 34, height: 34, padding: "0 10px",
    borderRadius: 8, border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "var(--primary-tint)" : "var(--bg)", color: active ? "var(--primary)" : "var(--text)",
    fontSize: 13, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.45 : 1,
  });
  const pick = (t, s = null) => { setTool(t); setStamp(s); hoverRef.current = null; };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card, var(--bg))", overflow: "hidden" }}>
      {/* tools */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
        <button type="button" style={btn(tool === "pen")} disabled={disabled} onClick={() => pick("pen")} title="Pen — draw freehand"><Pencil size={15} /> Pen</button>
        <button type="button" style={btn(tool === "eraser")} disabled={disabled} onClick={() => pick("eraser")} title="Eraser — removes your ink, never the printed staves"><Eraser size={15} /> Eraser</button>
        <button type="button" style={btn(tool === "line")} disabled={disabled} onClick={() => pick("line")} title="Straight line — stems, beams, bar lines (hold Shift for horizontal)"><Minus size={15} /> Line</button>
        <button type="button" style={btn(tool === "slurUp")} disabled={disabled} onClick={() => pick("slurUp")} title="Slur / tie curving up">
          <svg width="18" height="12" viewBox="0 0 18 12"><path d="M1 10 Q9 -2 17 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> Slur
        </button>
        <button type="button" style={btn(tool === "slurDown")} disabled={disabled} onClick={() => pick("slurDown")} title="Slur / tie curving down">
          <svg width="18" height="12" viewBox="0 0 18 12"><path d="M1 2 Q9 14 17 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> Tie
        </button>
        <span style={{ width: 1, height: 22, background: "var(--border)", margin: "0 2px" }} />
        {SIZES.map((s) => (
          <button key={s.id} type="button" style={btn(size === s.id)} disabled={disabled || !(tool === "pen" || tool === "eraser" || tool === "line")} onClick={() => setSize(s.id)} title={`${s.label} pen/line`}>
            <span style={{ display: "inline-block", width: 16, height: s.px, background: "currentColor", borderRadius: 3 }} />
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(false, disabled || !counts.ops)} disabled={disabled || !counts.ops} onClick={undo} title="Undo"><Undo2 size={15} /></button>
        <button type="button" style={btn(false, disabled || !counts.redo)} disabled={disabled || !counts.redo} onClick={redo} title="Redo"><Redo2 size={15} /></button>
        {!confirmClear ? (
          <button type="button" style={btn(false, disabled || !hasInk)} disabled={disabled || !hasInk} onClick={() => setConfirmClear(true)} title="Clear this sheet"><Trash2 size={15} /> Clear</button>
        ) : (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--text)" }}>
            Clear everything on this sheet?
            <button type="button" style={{ ...btn(false), borderColor: "#dc2626", color: "#dc2626" }} onClick={clearAll}>Yes, clear</button>
            <button type="button" style={btn(false)} onClick={() => setConfirmClear(false)}>Keep</button>
          </span>
        )}
      </div>

      {/* symbols */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
          {Object.keys(PALETTE).map((t) => (
            <button key={t} type="button" style={{ ...btn(tab === t), height: 28 }} onClick={() => setTab(t)}>{t}</button>
          ))}
          <span style={{ flex: 1 }} />
          {tab === "Notes" && (
            <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
              Stems:
              {["auto", "up", "down"].map((m) => (
                <button key={m} type="button" style={{ ...btn(stem === m), height: 26, padding: "0 8px", fontSize: 12, textTransform: "capitalize" }} onClick={() => setStem(m)}>{m}</button>
              ))}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PALETTE[tab].map((s) => {
            const active = tool === "stamp" && stamp?.id === s.id;
            return (
              <button key={s.id} type="button" disabled={disabled} title={s.label} aria-label={s.label}
                onClick={() => pick("stamp", s)}
                style={{ ...btn(active, disabled), width: 46, height: 46, padding: 0, flexDirection: "column" }}>
                {s.kind === "bar" ? (
                  <svg width="26" height="26" viewBox="0 0 26 26"><g stroke="currentColor" fill="none">
                    {s.style === "single" && <line x1="13" y1="3" x2="13" y2="23" strokeWidth="1.8" />}
                    {s.style === "double" && (<><line x1="10" y1="3" x2="10" y2="23" strokeWidth="1.6" /><line x1="15" y1="3" x2="15" y2="23" strokeWidth="1.6" /></>)}
                    {s.style === "final" && (<><line x1="9" y1="3" x2="9" y2="23" strokeWidth="1.6" /><line x1="15" y1="3" x2="15" y2="23" strokeWidth="5" /></>)}
                  </g></svg>
                ) : s.kind === "time" ? (
                  <span style={{ fontFamily: FONT, fontSize: 28, lineHeight: 1, display: "flex", flexDirection: "column" }}>
                    <span style={{ height: 14, overflow: "visible" }}>{String.fromCodePoint(0xe080 + Number(s.top))}</span>
                    <span style={{ height: 14 }}>{String.fromCodePoint(0xe080 + Number(s.bot))}</span>
                  </span>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: s.kind === "clef" && s.id !== "tsC" ? 26 : 30, lineHeight: "46px" }}>{s.up}</span>
                )}
              </button>
            );
          })}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          {tool === "stamp" && stamp
            ? `${stamp.label}: press where it goes, drag to adjust, release to place.${tpl.staves.length ? " It snaps to the staff lines and spaces." : ""}`
            : "Pick a pen or a symbol, then draw on the paper below."}
        </p>
      </div>

      {/* paper */}
      <div style={{ padding: 10, background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)" }} htmlFor="music-template">Paper:</label>
          <select id="music-template" value={tplId} disabled={disabled || hasInk} onChange={(e) => setTplId(e.target.value)}
            title={hasInk ? "Clear the sheet to change the paper" : "Choose the printed staves"}
            style={{ height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card, var(--bg))", color: "var(--text)", padding: "0 8px", fontSize: 13 }}>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {hasInk && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Clear the sheet to change the paper.</span>}
        </div>
        <canvas
          ref={mainRef}
          data-testid="music-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={leave}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            width: "100%", height: "auto", display: "block", background: "#fff", borderRadius: 8,
            border: "1px solid var(--border)", touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
            cursor: disabled ? "not-allowed" : tool === "eraser" ? "cell" : "crosshair",
          }}
        />
      </div>
    </div>
  );
}
