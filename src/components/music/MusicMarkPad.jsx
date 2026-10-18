import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Eraser, Undo2, Redo2, Trash2, Check, X, Circle, Type } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   MUSIC MARK PAD — the marker's red pen over ONE student drawing sheet.

   The student's sheet is shown as a plain <img>; a transparent canvas sits on
   top with the marker's ink (red pen, ✓, ✗, circle, typed note). Only that
   overlay is exported (`onChange(overlayPng | "")`), so the student's original
   drawing is never altered and the marker can erase their own marks freely.
   Re-opening an already-marked sheet restores the saved overlay.
═══════════════════════════════════════════════════════════ */
const RED = "#e11d48";

const drawOp = (ctx, op) => {
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = RED; ctx.fillStyle = RED;
  if (op.type === "stroke") {
    ctx.globalCompositeOperation = op.erase ? "destination-out" : "source-over";
    ctx.lineWidth = op.erase ? op.size * 4 : op.size;
    const p = op.pts;
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
    if (p.length === 1) ctx.lineTo(p[0].x + 0.01, p[0].y + 0.01);
    for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
    if (p.length > 1) ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    ctx.stroke();
  } else if (op.type === "tick") {
    const { x, y, u } = op; ctx.lineWidth = u * 0.22;
    ctx.beginPath(); ctx.moveTo(x - u * 0.9, y + u * 0.05); ctx.lineTo(x - u * 0.3, y + u * 0.7); ctx.lineTo(x + u * 1.0, y - u * 0.9); ctx.stroke();
  } else if (op.type === "cross") {
    const { x, y, u } = op; ctx.lineWidth = u * 0.22;
    ctx.beginPath(); ctx.moveTo(x - u * 0.8, y - u * 0.8); ctx.lineTo(x + u * 0.8, y + u * 0.8); ctx.moveTo(x + u * 0.8, y - u * 0.8); ctx.lineTo(x - u * 0.8, y + u * 0.8); ctx.stroke();
  } else if (op.type === "circle") {
    ctx.lineWidth = 3;
    const cx = (op.a.x + op.b.x) / 2, cy = (op.a.y + op.b.y) / 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(4, Math.abs(op.b.x - op.a.x) / 2), Math.max(4, Math.abs(op.b.y - op.a.y) / 2), 0, 0, Math.PI * 2); ctx.stroke();
  } else if (op.type === "text") {
    ctx.font = `700 ${op.u}px system-ui, sans-serif`; ctx.textBaseline = "top";
    ctx.fillText(op.text, op.x, op.y);
  }
  ctx.restore();
};

export default function MusicMarkPad({ sheetPng, overlayPng = "", onChange, label = "Student's music sheet" }) {
  const canvasRef = useRef(null);
  const baseRef = useRef(null);       // restored overlay image
  const opsRef = useRef([]);
  const redoRef = useRef([]);
  const draftRef = useRef(null);
  const [dim, setDim] = useState(null);            // natural size of the sheet
  const [tool, setTool] = useState("pen");
  const [counts, setCounts] = useState({ ops: 0, redo: 0, base: false });
  const [noteAt, setNoteAt] = useState(null);      // {x,y} canvas px while typing a note
  const [noteText, setNoteText] = useState("");
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    const img = new Image();
    img.onload = () => setDim({ w: img.naturalWidth || 1000, h: img.naturalHeight || 600 });
    img.src = sheetPng;
  }, [sheetPng]);

  const paint = useCallback(() => {
    const cv = canvasRef.current; if (!cv || !dim) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (baseRef.current) ctx.drawImage(baseRef.current, 0, 0, cv.width, cv.height);
    for (const op of opsRef.current) drawOp(ctx, op);
    if (draftRef.current) drawOp(ctx, draftRef.current);
  }, [dim]);

  useEffect(() => {
    if (!dim) return;
    const cv = canvasRef.current; cv.width = dim.w; cv.height = dim.h;
    if (overlayPng) {
      const img = new Image();
      img.onload = () => { baseRef.current = img; setCounts((c) => ({ ...c, base: true })); paint(); };
      img.src = overlayPng;
    } else paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim]);

  const emit = useCallback(() => {
    setCounts({ ops: opsRef.current.length, redo: redoRef.current.length, base: !!baseRef.current });
    paint();
    const dirty = opsRef.current.length > 0 || !!baseRef.current;
    onChangeRef.current?.(dirty ? canvasRef.current.toDataURL("image/png") : "");
  }, [paint]);

  const u = dim ? Math.max(18, dim.w / 28) : 30;            // size unit for ticks/crosses/text
  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * dim.w) / r.width, y: ((e.clientY - r.top) * dim.h) / r.height };
  };
  const down = (e) => {
    if (!dim || noteAt) return;
    e.preventDefault(); canvasRef.current.setPointerCapture?.(e.pointerId);
    const p = pos(e);
    if (tool === "pen" || tool === "eraser") draftRef.current = { type: "stroke", erase: tool === "eraser", size: 4, pts: [p] };
    else if (tool === "circle") draftRef.current = { type: "circle", a: p, b: p };
    else if (tool === "tick" || tool === "cross") { opsRef.current.push({ type: tool, x: p.x, y: p.y, u }); redoRef.current = []; emit(); }
    else if (tool === "note") { setNoteAt(p); setNoteText(""); }
    paint();
  };
  const move = (e) => {
    const d = draftRef.current; if (!d) return;
    const p = pos(e);
    if (d.type === "stroke") d.pts.push(p); else d.b = p;
    paint();
  };
  const up = () => {
    const d = draftRef.current; if (!d) return;
    draftRef.current = null;
    if (d.type === "stroke" || (d.type === "circle" && Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 8)) { opsRef.current.push(d); redoRef.current = []; }
    emit();
  };
  const commitNote = () => {
    const t = noteText.trim();
    if (t && noteAt) { opsRef.current.push({ type: "text", x: noteAt.x, y: noteAt.y, text: t.slice(0, 80), u: u * 0.8 }); redoRef.current = []; }
    setNoteAt(null); setNoteText(""); emit();
  };

  const btn = (active, dis) => ({
    display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 10px", borderRadius: 8,
    border: `1px solid ${active ? RED : "var(--border)"}`, background: active ? "#fff1f2" : "var(--bg)",
    color: active ? RED : "var(--text)", fontSize: 13, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.45 : 1,
  });
  const hasInk = counts.ops > 0 || counts.base;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card, var(--bg))" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
        <button type="button" style={btn(tool === "pen")} onClick={() => setTool("pen")}><Pencil size={14} /> Red pen</button>
        <button type="button" style={btn(tool === "tick")} onClick={() => setTool("tick")} title="Place a tick"><Check size={15} /> Tick</button>
        <button type="button" style={btn(tool === "cross")} onClick={() => setTool("cross")} title="Place a cross"><X size={15} /> Cross</button>
        <button type="button" style={btn(tool === "circle")} onClick={() => setTool("circle")} title="Circle a mistake — drag"><Circle size={14} /> Circle</button>
        <button type="button" style={btn(tool === "note")} onClick={() => setTool("note")} title="Type a short comment on the sheet"><Type size={14} /> Note</button>
        <button type="button" style={btn(tool === "eraser")} onClick={() => setTool("eraser")} title="Erase your marks (never the student's drawing)"><Eraser size={14} /> Erase marks</button>
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(false, !counts.ops)} disabled={!counts.ops} onClick={() => { const o = opsRef.current.pop(); if (o) { redoRef.current.push(o); emit(); } }} aria-label="Undo"><Undo2 size={14} /></button>
        <button type="button" style={btn(false, !counts.redo)} disabled={!counts.redo} onClick={() => { const o = redoRef.current.pop(); if (o) { opsRef.current.push(o); emit(); } }} aria-label="Redo"><Redo2 size={14} /></button>
        <button type="button" style={btn(false, !hasInk)} disabled={!hasInk} onClick={() => { opsRef.current = []; redoRef.current = []; baseRef.current = null; emit(); }}><Trash2 size={14} /> Clear marks</button>
      </div>
      <div style={{ padding: 10, background: "var(--bg)" }}>
        <div style={{ position: "relative", lineHeight: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
          <img src={sheetPng} alt={label} draggable={false} style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }} />
          <canvas
            ref={canvasRef}
            data-testid="mark-canvas"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: tool === "eraser" ? "cell" : tool === "note" ? "text" : "crosshair" }}
          />
          {noteAt && dim && (
            <input
              autoFocus value={noteText} maxLength={80} placeholder="Type note, press Enter"
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitNote(); if (e.key === "Escape") { setNoteAt(null); setNoteText(""); } }}
              onBlur={commitNote}
              style={{ position: "absolute", left: `${(noteAt.x / dim.w) * 100}%`, top: `${(noteAt.y / dim.h) * 100}%`, transform: "translate(0,-4px)", fontSize: 13, padding: "3px 6px", border: `1px solid ${RED}`, borderRadius: 6, color: RED, background: "#fff", lineHeight: 1.3, minWidth: 140 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
