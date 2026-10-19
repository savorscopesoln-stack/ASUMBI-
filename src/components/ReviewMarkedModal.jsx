import React, { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X, Flag } from "lucide-react";
import { answerToSafeHtml, sanitizeHtml } from "../utils/safeHtml";
import { withMusicOverlays } from "../utils/musicAnswer";

/* ═══════════════════════════════════════════════════════════
   ReviewMarkedModal — flip through everything already marked.

   Shows each marked answer exactly as it was marked (green ✓ points, red ✗
   points, score, the teacher's remarks) with three buttons:
     Back   – previous marked answer
     Next   – next marked answer
     Remark – reopen THIS answer in the marking panel to mark it again
   ← / → keys flip, Esc closes. Read-only: nothing here changes a mark.
═══════════════════════════════════════════════════════════ */
export default function ReviewMarkedModal({
  items, startIndex = 0, getHtml, getScore, getRemark, getAnnotations, isFlagged, onRemark, onClose,
}) {
  const [idx, setIdx] = useState(Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)));
  const total = items.length;
  const item = items[idx] || null;

  const back = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const next = useCallback(() => setIdx((i) => Math.min(i + 1, Math.max(total - 1, 0))), [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  if (!item) {
    return (
      <div style={st.overlay} onClick={onClose}>
        <div style={st.card} onClick={(e) => e.stopPropagation()}>
          <div style={st.head}>
            <strong>Review marked</strong>
            <button type="button" style={st.iconBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
          <p style={{ padding: 28, color: "var(--text-secondary)" }}>Nothing has been marked yet.</p>
        </div>
      </div>
    );
  }

  const score = getScore(item);
  const max = item.max_marks ?? "–";
  const html = withMusicOverlays(sanitizeHtml(getHtml(item) || "", { stripTitles: true }), getAnnotations ? getAnnotations(item) : null);
  const remark = getRemark ? getRemark(item) : "";
  const remarkHtml = remark ? answerToSafeHtml(remark) : "";
  const hasRemark = !!String(remarkHtml).replace(/<[^>]*>/g, "").trim();
  const questionHtml = item.question_text ? answerToSafeHtml(item.question_text) : "";
  const full = Number(score) >= Number(item.max_marks);

  return (
    <div style={st.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Review marked answers">
      <div style={st.card} onClick={(e) => e.stopPropagation()}>
        <div style={st.head}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15 }}>Reviewing {idx + 1} of {total}</strong>
            <span style={st.pill}>Student {item._student_id ?? "?"}</span>
            {isFlagged && isFlagged(item) && (
              <span style={{ ...st.pill, color: "var(--warning)", borderColor: "var(--warning)" }}><Flag size={11} /> Flagged</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...st.score, color: full ? "var(--success, #16a34a)" : Number(score) > 0 ? "var(--primary)" : "#ef4444" }}>
              {score} / {max}
            </span>
            <button type="button" style={st.iconBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
        </div>

        <div style={st.body}>
          {questionHtml && (
            <div style={st.question}>
              <div style={st.label}>Question</div>
              <div dangerouslySetInnerHTML={{ __html: questionHtml }} />
            </div>
          )}
          <div style={st.label}>Answer as marked</div>
          <div className="ruled-paper" style={{ borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: html }} />
          {hasRemark && (
            <div style={{ ...st.question, marginTop: 14 }}>
              <div style={st.label}>Your remarks</div>
              <div dangerouslySetInnerHTML={{ __html: remarkHtml }} />
            </div>
          )}
        </div>

        <div style={st.foot}>
          <button type="button" className="mkp-btn" style={{ ...st.btn, opacity: idx === 0 ? 0.45 : 1 }} onClick={back} disabled={idx === 0}>
            <ChevronLeft size={16} /> Back
          </button>
          <button type="button" className="mkp-btn" style={{ ...st.btn, ...st.remarkBtn }} onClick={() => onRemark(item)} title="Reopen this answer to mark it again">
            <RotateCcw size={15} /> Remark
          </button>
          <button type="button" className="mkp-btn" style={{ ...st.btn, opacity: idx >= total - 1 ? 0.45 : 1 }} onClick={next} disabled={idx >= total - 1}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

const st = {
  overlay: { position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 },
  card: { background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 14, width: "100%", maxWidth: 880, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.35)" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" },
  body: { padding: "16px 18px", overflowY: "auto", flex: 1 },
  foot: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 18px", borderTop: "1px solid var(--border)" },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 },
  question: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 14 },
  pill: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, border: "1px solid var(--border)", borderRadius: 20, padding: "2px 10px", color: "var(--text-secondary)" },
  score: { fontSize: 18, fontWeight: 800 },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "inline-flex", padding: 4 },
  btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 110, padding: "10px 18px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer" },
  remarkBtn: { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" },
};
