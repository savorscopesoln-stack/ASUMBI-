import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brush, Pencil, Eraser, PaintBucket, Minus, Square, Circle, Type, Undo2, Redo2, Trash2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   ART PAD — one drawing / colouring sheet for an Art & Craft paper.

   What the student gets
   ─────────────────────
   • A white paper with an optional printed guide: plain, squared grid, dots,
     ruled lines, a drawing frame, or a symmetry cross (for patterns/designs).
   • Tools: brush, pencil, eraser, paint-bucket fill, straight line, rectangle,
     ellipse (outline or filled) and typed labels.
   • A colour palette plus a custom colour, and a size slider.
   • Undo / redo / clear (inline confirm — never a native dialog, because a
     native dialog blurs the window and the exam page counts that as leaving).

   How it stores
   ─────────────
   Exactly like the music pad: the sheet is flattened to a PNG data URL and
   handed to `onChange(png, templateId)`. An untouched sheet reports "" so it
   never counts as an answer. Template ids start with "art-", which is how the
   marking screens know this sheet belongs to an art paper. Marking, the red
   pen overlay, the model answer and the marked paper all reuse the music-paper
   pipeline (a sheet is just an <img data-music-sheet> inside the answer).
═══════════════════════════════════════════════════════════ */

const W = 900;                 // logical paper size (CSS scales it to fit)
const H = 640;
const MAX_UNDO = 15;           // ink snapshots kept for undo (each ≈ 2.3 MB in memory)
const MAX_PNG_CHARS = 1_400_000;

const PALETTE = [
  "#111111", "#6b7280", "#ffffff", "#dc2626", "#ea580c", "#f59e0b", "#facc15", "#84cc16",
  "#16a34a", "#0d9488", "#0ea5e9", "#2563eb", "#7c3aed", "#db2777", "#92400e", "#fda4af",
];

export const ART_TEMPLATES = [
  { id: "art-blank", label: "Plain paper" },
  { id: "art-grid", label: "Squared grid" },
  { id: "art-dots", label: "Dotted paper" },
  { id: "art-ruled", label: "Ruled lines" },
  { id: "art-frame", label: "Drawing frame" },
  { id: "art-sym", label: "Symmetry cross" },
];

const TOOLS = [
  { id: "brush", label: "Brush", Icon: Brush },
  { id: "pencil", label: "Pencil", Icon: Pencil },
  { id: "eraser", label: "Eraser", Icon: Eraser },
  { id: "fill", label: "Fill", Icon: PaintBucket },
  { id: "line", label: "Line", Icon: Minus },
  { id: "rect", label: "Box", Icon: Square },
  { id: "ellipse", label: "Circle", Icon: Circle },
  { id: "text", label: "Text", Icon: Type },
];

/* ── printed guides ───────────────────────────────────────── */
const drawTemplate = (ctx, id) => {
  ctx.save();
  ctx.strokeStyle = "#cbd5e1"; ctx.fillStyle = "#cbd5e1"; ctx.lineWidth = 1;
  if (id === "art-grid") {
    for (let x = 30; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (let y = 30; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  } else if (id === "art-dots") {
    for (let x = 30; x < W; x += 30) for (let y = 30; y < H; y += 30) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === "art-ruled") {
    for (let y = 40; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(30, y + 0.5); ctx.lineTo(W - 30, y + 0.5); ctx.stroke(); }
  } else if (id === "art-frame") {
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);
  } else if (id === "art-sym") {
    ctx.setLineDash([10, 8]); ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, H / 2); ctx.lineTo(W - 12, H / 2); ctx.stroke();
  }
  ctx.restore();
};

const hexToRgb = (hex) => {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "111111";
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export default function ArtPad({ initialPng = "", initialTemplate = "art-blank", onChange, disabled = false }) {
  const mainRef = useRef(null);
  const inkRef = useRef(null);            // transparent layer holding everything the student drew
  const undoRef = useRef([]);             // [{ data: ImageData, dirty }]
  const redoRef = useRef([]);
  const dirtyRef = useRef(false);
  const draftRef = useRef(null);          // shape being dragged
  const lastRef = useRef(null);           // last point of a freehand stroke
  const strokingRef = useRef(false);
  const textDoneRef = useRef(false);
  const startTpl = ART_TEMPLATES.some((t) => t.id === initialTemplate) ? initialTemplate : "art-blank";
  const [tplId, setTplId] = useState(startTpl);
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(8);
  const [filled, setFilled] = useState(false);
  const [counts, setCounts] = useState({ undo: 0, redo: 0, dirty: false });
  const [confirmClear, setConfirmClear] = useState(false);
  const [textAt, setTextAt] = useState(null);     // {x,y} canvas px while typing a label
  const [textVal, setTextVal] = useState("");
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const tplRef = useRef(tplId);
  useEffect(() => { tplRef.current = tplId; }, [tplId]);

  const sync = () => setCounts({ undo: undoRef.current.length, redo: redoRef.current.length, dirty: dirtyRef.current });

  /* paper + guide + ink (+ the shape being dragged) */
  const paint = useCallback(() => {
    const main = mainRef.current, ink = inkRef.current;
    if (!main || !ink) return;
    const ctx = main.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    drawTemplate(ctx, tplRef.current);
    ctx.drawImage(ink, 0, 0);
    const d = draftRef.current;
    if (d) drawShape(ctx, d);
    ctx.restore();
  }, []);

  /* set up the canvases once, restore a saved sheet if there is one */
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;
    main.width = W; main.height = H;
    if (!inkRef.current) { inkRef.current = document.createElement("canvas"); inkRef.current.width = W; inkRef.current.height = H; }
    paint();
    if (!initialPng) return undefined;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      inkRef.current.getContext("2d").drawImage(img, 0, 0, W, H);
      dirtyRef.current = true;
      sync();
      paint();
    };
    img.src = initialPng;
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { paint(); }, [tplId, paint]);

  /* hand the flattened sheet to the exam page */
  const emit = useCallback(() => {
    sync();
    if (!dirtyRef.current) { onChangeRef.current?.("", tplRef.current); return; }
    paint();
    try {
      let png = mainRef.current.toDataURL("image/png");
      if (png.length > MAX_PNG_CHARS) {            // very busy sheet: shrink a little so it always saves
        const small = document.createElement("canvas");
        small.width = Math.round(W * 0.7); small.height = Math.round(H * 0.7);
        small.getContext("2d").drawImage(mainRef.current, 0, 0, small.width, small.height);
        png = small.toDataURL("image/png");
      }
      onChangeRef.current?.(png, tplRef.current);
    } catch { /* tainted/unavailable: keep drawing */ }
  }, [paint]);

  /* undo history = snapshots of the ink layer taken just before each change */
  const snapshot = () => {
    const data = inkRef.current.getContext("2d").getImageData(0, 0, W, H);
    undoRef.current.push({ data, dirty: dirtyRef.current });
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
    redoRef.current = [];
  };
  const restore = (entry) => {
    inkRef.current.getContext("2d").putImageData(entry.data, 0, 0);
    dirtyRef.current = entry.dirty;
  };
  const undo = () => {
    const prev = undoRef.current.pop(); if (!prev) return;
    redoRef.current.push({ data: inkRef.current.getContext("2d").getImageData(0, 0, W, H), dirty: dirtyRef.current });
    restore(prev); paint(); emit();
  };
  const redo = () => {
    const next = redoRef.current.pop(); if (!next) return;
    undoRef.current.push({ data: inkRef.current.getContext("2d").getImageData(0, 0, W, H), dirty: dirtyRef.current });
    restore(next); paint(); emit();
  };
  const clearAll = () => {
    snapshot();
    inkRef.current.getContext("2d").clearRect(0, 0, W, H);
    dirtyRef.current = false;
    setConfirmClear(false); paint(); emit();
  };

  /* drawing primitives (used on the ink layer and for the live preview) */
  function drawShape(ctx, s) {
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.size;
    if (s.type === "line") {
      ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke();
    } else if (s.type === "rect") {
      const x = Math.min(s.a.x, s.b.x), y = Math.min(s.a.y, s.b.y), w = Math.abs(s.b.x - s.a.x), h = Math.abs(s.b.y - s.a.y);
      if (s.filled) ctx.fillRect(x, y, w, h); else ctx.strokeRect(x, y, w, h);
    } else if (s.type === "ellipse") {
      const cx = (s.a.x + s.b.x) / 2, cy = (s.a.y + s.b.y) / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(2, Math.abs(s.b.x - s.a.x) / 2), Math.max(2, Math.abs(s.b.y - s.a.y) / 2), 0, 0, Math.PI * 2);
      if (s.filled) ctx.fill(); else ctx.stroke();
    }
    ctx.restore();
  }

  const freehandSegment = (from, to) => {
    const ctx = inkRef.current.getContext("2d");
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = size * 2.5; ctx.strokeStyle = "#000"; }
    else { ctx.strokeStyle = color; ctx.lineWidth = tool === "pencil" ? Math.max(1.5, size / 3) : size; }
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x + 0.01, to.y + 0.01); ctx.stroke();
    ctx.restore();
  };

  /* paint-bucket: fill the connected area of similar colour under the click */
  const floodFill = (seed) => {
    const flat = document.createElement("canvas"); flat.width = W; flat.height = H;
    const fctx = flat.getContext("2d");
    fctx.fillStyle = "#fff"; fctx.fillRect(0, 0, W, H);
    drawTemplate(fctx, tplRef.current);
    fctx.drawImage(inkRef.current, 0, 0);
    const src = fctx.getImageData(0, 0, W, H).data;
    const x0 = Math.max(0, Math.min(W - 1, Math.floor(seed.x))), y0 = Math.max(0, Math.min(H - 1, Math.floor(seed.y)));
    const si = (y0 * W + x0) * 4;
    const tr = src[si], tg = src[si + 1], tb = src[si + 2];
    const [fr, fg, fb] = hexToRgb(color);
    if (Math.abs(tr - fr) < 6 && Math.abs(tg - fg) < 6 && Math.abs(tb - fb) < 6) return false;   // already this colour
    const TOL = 64;
    const near = (p) => Math.abs(src[p] - tr) <= TOL && Math.abs(src[p + 1] - tg) <= TOL && Math.abs(src[p + 2] - tb) <= TOL;
    const mask = new Uint8Array(W * H);
    const stack = [y0 * W + x0];
    mask[y0 * W + x0] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i - x) / W;
      if (x > 0 && !mask[i - 1] && near((i - 1) * 4)) { mask[i - 1] = 1; stack.push(i - 1); }
      if (x < W - 1 && !mask[i + 1] && near((i + 1) * 4)) { mask[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && !mask[i - W] && near((i - W) * 4)) { mask[i - W] = 1; stack.push(i - W); }
      if (y < H - 1 && !mask[i + W] && near((i + W) * 4)) { mask[i + W] = 1; stack.push(i + W); }
    }
    // grow the area by one pixel so the soft edge of a line doesn't leave a pale halo
    const grown = mask.slice();
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (mask[i]) continue;
        if (mask[i - 1] || mask[i + 1] || mask[i - W] || mask[i + W]) {
          const p = i * 4;
          if (Math.abs(src[p] - tr) + Math.abs(src[p + 1] - tg) + Math.abs(src[p + 2] - tb) <= 300) grown[i] = 1;
        }
      }
    }
    const ictx = inkRef.current.getContext("2d");
    const out = ictx.getImageData(0, 0, W, H);
    for (let i = 0; i < grown.length; i++) {
      if (!grown[i]) continue;
      const p = i * 4;
      out.data[p] = fr; out.data[p + 1] = fg; out.data[p + 2] = fb; out.data[p + 3] = 255;
    }
    ictx.putImageData(out, 0, 0);
    return true;
  };

  /* pointer */
  const pos = (e) => {
    const r = mainRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const down = (e) => {
    if (disabled || textAt) return;
    e.preventDefault();
    mainRef.current.setPointerCapture?.(e.pointerId);
    const p = pos(e);
    if (tool === "brush" || tool === "pencil" || tool === "eraser") {
      snapshot();
      strokingRef.current = true; lastRef.current = p;
      freehandSegment(p, p);
      if (tool !== "eraser") dirtyRef.current = true;
      paint();
    } else if (tool === "fill") {
      snapshot();
      if (floodFill(p)) { dirtyRef.current = true; paint(); emit(); }
      else { undoRef.current.pop(); sync(); }
    } else if (tool === "line" || tool === "rect" || tool === "ellipse") {
      draftRef.current = { type: tool, color, size, filled, a: p, b: p };
      paint();
    } else if (tool === "text") {
      textDoneRef.current = false;
      setTextAt(p); setTextVal("");
    }
  };
  const move = (e) => {
    if (strokingRef.current) {
      const p = pos(e);
      freehandSegment(lastRef.current, p);
      lastRef.current = p;
      paint();
    } else if (draftRef.current) {
      draftRef.current.b = pos(e);
      paint();
    }
  };
  const up = () => {
    if (strokingRef.current) {
      strokingRef.current = false; lastRef.current = null;
      emit();
      return;
    }
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 4) {
      snapshot();
      drawShape(inkRef.current.getContext("2d"), d);
      dirtyRef.current = true;
      emit();
    } else paint();
  };

  const commitText = () => {
    if (textDoneRef.current) return;
    textDoneRef.current = true;
    const t = textVal.trim();
    if (t && textAt) {
      snapshot();
      const ctx = inkRef.current.getContext("2d");
      ctx.save();
      ctx.fillStyle = color; ctx.textBaseline = "top";
      ctx.font = `700 ${Math.round(14 + size * 1.6)}px system-ui, sans-serif`;
      ctx.fillText(t.slice(0, 80), textAt.x, textAt.y);
      ctx.restore();
      dirtyRef.current = true;
      setTextAt(null); setTextVal("");
      emit();
    } else { setTextAt(null); setTextVal(""); }
  };

  const hasInk = counts.dirty;
  const btn = (active, dis) => ({
    display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 10px", borderRadius: 8,
    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`, background: active ? "var(--primary-tint)" : "var(--bg)",
    color: active ? "var(--primary)" : "var(--text)", fontSize: 13, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.45 : 1,
  });
  const shapeTool = tool === "rect" || tool === "ellipse";
  const hint = useMemo(() => ({
    brush: "Brush: press and drag to paint.",
    pencil: "Pencil: a thin line for outlines and details.",
    eraser: "Eraser: rub out what you drew.",
    fill: "Fill: tap inside a closed shape to colour it in.",
    line: "Line: drag from one point to another.",
    rect: "Box: drag from one corner to the opposite corner.",
    ellipse: "Circle / oval: drag across the area it should cover.",
    text: "Text: tap where the label goes, type, press Enter.",
  }[tool]), [tool]);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card, var(--bg))" }}>
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* tools */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {TOOLS.map(({ id, label, Icon }) => (
            <button key={id} type="button" disabled={disabled} style={btn(tool === id, disabled)} onClick={() => setTool(id)} title={label} aria-pressed={tool === id}>
              <Icon size={15} /> {label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button type="button" style={btn(false, !counts.undo)} disabled={!counts.undo} onClick={undo} aria-label="Undo"><Undo2 size={14} /></button>
          <button type="button" style={btn(false, !counts.redo)} disabled={!counts.redo} onClick={redo} aria-label="Redo"><Redo2 size={14} /></button>
          {confirmClear ? (
            <>
              <span style={{ fontSize: 12.5, color: "var(--destructive, #dc2626)", fontWeight: 700 }}>Clear everything?</span>
              <button type="button" style={{ ...btn(false), background: "var(--destructive, #dc2626)", color: "#fff", borderColor: "transparent" }} onClick={clearAll}>Yes, clear</button>
              <button type="button" style={btn(false)} onClick={() => setConfirmClear(false)}>Keep</button>
            </>
          ) : (
            <button type="button" style={btn(false, !hasInk || disabled)} disabled={!hasInk || disabled} onClick={() => setConfirmClear(true)}><Trash2 size={14} /> Clear</button>
          )}
        </div>

        {/* colours + size */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }} role="group" aria-label="Colours">
            {PALETTE.map((c) => (
              <button key={c} type="button" disabled={disabled} onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c}
                style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                  border: color === c ? "3px solid var(--primary)" : "1px solid var(--border)", boxShadow: color === c ? "0 0 0 2px var(--card, #fff)" : "none", padding: 0 }} />
            ))}
            <label title="Pick any colour" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="color" value={color} disabled={disabled} onChange={(e) => setColor(e.target.value)} style={{ width: 28, height: 24, padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer" }} />
              More
            </label>
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
            Size
            <input type="range" min={2} max={40} value={size} disabled={disabled} onChange={(e) => setSize(Number(e.target.value))} style={{ width: 110, accentColor: "var(--primary)" }} />
            <span style={{ minWidth: 18, textAlign: "right" }}>{size}</span>
          </label>
          {shapeTool && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={filled} disabled={disabled} onChange={(e) => setFilled(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
              Filled
            </label>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{hint}</p>
      </div>

      {/* paper */}
      <div style={{ padding: 10, background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)" }} htmlFor="art-template">Paper:</label>
          <select id="art-template" value={tplId} disabled={disabled || hasInk} onChange={(e) => setTplId(e.target.value)}
            title={hasInk ? "Clear the sheet to change the paper" : "Choose the printed guide"}
            style={{ height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card, var(--bg))", color: "var(--text)", padding: "0 8px", fontSize: 13 }}>
            {ART_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {hasInk && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Clear the sheet to change the paper.</span>}
        </div>
        <div style={{ position: "relative", lineHeight: 0 }}>
          <canvas
            ref={mainRef}
            data-testid="art-canvas"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              width: "100%", height: "auto", display: "block", background: "#fff", borderRadius: 8,
              border: "1px solid var(--border)", touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
              cursor: disabled ? "not-allowed" : tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair",
            }}
          />
          {textAt && (
            <input
              autoFocus value={textVal} maxLength={80} placeholder="Type, press Enter"
              onChange={(e) => setTextVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitText(); if (e.key === "Escape") { textDoneRef.current = true; setTextAt(null); setTextVal(""); } }}
              onBlur={commitText}
              style={{ position: "absolute", left: `${(textAt.x / W) * 100}%`, top: `${(textAt.y / H) * 100}%`, fontSize: 14, padding: "3px 6px", border: `1px solid ${color}`, borderRadius: 6, color: "#111", background: "#fff", lineHeight: 1.3, minWidth: 150 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
