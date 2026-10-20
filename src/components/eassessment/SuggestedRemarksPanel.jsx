import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api";
import { RefreshCw, Send, ChevronDown, ChevronRight, CheckCircle2, Clock } from "lucide-react";

/* Suggested remarks — Admin → E-Assessments → Marking.
   Written answers a teacher marked 0, grouped by the teacher who marked them.
   The admin can push one, several, or all of them back to that teacher (with an
   optional note). A push-back never changes a mark: it puts the answer back in
   the teacher's marking queue. Answers already waiting on the teacher show as
   "With teacher" and can't be sent twice. */

const css = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 },
  muted: { color: "var(--text-muted)", fontSize: 12 },
  input: { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13 },
  btn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  btnPrimary: { background: "var(--primary)", color: "#fff", border: "1px solid var(--primary)" },
};
const fmtWhen = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function SuggestedRemarksPanel({ showToast }) {
  const [data, setData] = useState({ groups: [], total: 0, pending: 0, truncated: false });
  const [loading, setLoading] = useState(true);
  const [assessmentId, setAssessmentId] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(() => new Set());        // selected answer ids
  const [open, setOpen] = useState(() => new Set());      // expanded answer ids
  const [collapsed, setCollapsed] = useState(() => new Set()); // collapsed teacher ids
  const [dialog, setDialog] = useState(null);             // { title, body: {answerIds | all…}, count, teachers }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API.get("/e-assessments/admin/zero-marked", { params: assessmentId ? { assessmentId } : {} });
      setData(r.data || { groups: [], total: 0, pending: 0, truncated: false });
      setSel(new Set());
    } catch (e) {
      showToast && showToast(e?.response?.data?.message || "Could not load suggested remarks", "error");
    } finally { setLoading(false); }
  }, [assessmentId, showToast]);

  useEffect(() => { load(); }, [load]);

  // assessments present in the full (unfiltered by search) list, for the filter dropdown
  const [assessmentOptions, setAssessmentOptions] = useState([]);
  useEffect(() => {
    if (assessmentId) return; // keep the options from the unfiltered load
    const m = new Map();
    data.groups.forEach((g) => g.items.forEach((i) => m.set(i.e_assessment_id, i.assessment_title || `#${i.e_assessment_id}`)));
    setAssessmentOptions([...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]))));
  }, [data, assessmentId]);

  const needle = q.trim().toLowerCase();
  const groups = useMemo(() => data.groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !needle
        || `${i.student_name} ${i.assessment_title} ${i.subject_name} ${g.teacher_name}`.toLowerCase().includes(needle)),
    }))
    .filter((g) => g.items.length), [data, needle]);

  const sendable = (i) => i.return_status !== "pending";
  const shownItems = groups.flatMap((g) => g.items);
  const shownSendable = shownItems.filter(sendable);

  const toggle = (set, setter, id) => setter((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroup = (g) => {
    const ids = g.items.filter(sendable).map((i) => i.answer_id);
    const allOn = ids.length > 0 && ids.every((id) => sel.has(id));
    setSel((prev) => { const n = new Set(prev); ids.forEach((id) => (allOn ? n.delete(id) : n.add(id))); return n; });
  };

  const askPush = (title, answerIds, teachers) => {
    setNote("");
    setDialog({ title, answerIds, count: answerIds.length, teachers });
  };
  const teachersOf = (ids) => {
    const s = new Set(ids);
    return groups.filter((g) => g.items.some((i) => s.has(i.answer_id))).length;
  };

  const confirmPush = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      const r = await API.post("/e-assessments/admin/zero-marked/push-back", { answerIds: dialog.answerIds, note });
      showToast && showToast(r.data?.message || "Pushed back");
      setDialog(null);
      await load();
    } catch (e) {
      showToast && showToast(e?.response?.data?.message || "Could not push back", "error");
    } finally { setBusy(false); }
  };

  const selectedIds = [...sel];

  return (
    <div>
      <div style={{ ...css.card, padding: 14, marginBottom: 14 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: "var(--text)" }}>Suggested remarks</p>
        <p style={{ margin: "0 0 12px", ...css.muted, lineHeight: 1.5 }}>
          Written answers marked <b>0</b>, grouped by the teacher who marked them. Push one, several or all back so the
          teacher can take another look. Blank answers and already-released marks are left out.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, teacher, subject…" aria-label="Search" style={{ ...css.input, minWidth: 220 }} />
          <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} aria-label="Filter by assessment" style={css.input}>
            <option value="">All assessments</option>
            {assessmentOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
          <button type="button" style={css.btn} onClick={load} disabled={loading}><RefreshCw size={13} /> Refresh</button>
          <span style={{ flex: 1 }} />
          <button type="button" style={{ ...css.btn, ...css.btnPrimary, opacity: selectedIds.length ? 1 : .5 }} disabled={!selectedIds.length}
            onClick={() => askPush(`Push ${selectedIds.length} selected answer${selectedIds.length === 1 ? "" : "s"} back`, selectedIds, teachersOf(selectedIds))}>
            <Send size={13} /> Push back selected ({selectedIds.length})
          </button>
          <button type="button" style={{ ...css.btn, opacity: shownSendable.length ? 1 : .5 }} disabled={!shownSendable.length}
            onClick={() => askPush(`Push back all ${shownSendable.length} answer${shownSendable.length === 1 ? "" : "s"}`, shownSendable.map((i) => i.answer_id), teachersOf(shownSendable.map((i) => i.answer_id)))}>
            <Send size={13} /> Push back all ({shownSendable.length})
          </button>
        </div>
        <p style={{ margin: "10px 0 0", ...css.muted }}>
          {data.total} zero-marked answer{data.total === 1 ? "" : "s"} · {data.pending} already with teachers
          {data.truncated ? " · list capped — narrow by assessment to see the rest" : ""}
        </p>
      </div>

      {loading ? <p style={css.muted}>Loading…</p> : groups.length === 0 ? (
        <div style={{ ...css.card, padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <CheckCircle2 size={24} style={{ marginBottom: 6 }} /><br />No zero-marked answers to review{needle || assessmentId ? " for this filter" : ""}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((g) => {
            const sendIds = g.items.filter(sendable).map((i) => i.answer_id);
            const allOn = sendIds.length > 0 && sendIds.every((id) => sel.has(id));
            const isCollapsed = collapsed.has(g.teacher_id);
            return (
              <div key={g.teacher_id} style={{ ...css.card, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", flexWrap: "wrap" }}>
                  <input type="checkbox" checked={allOn} disabled={!sendIds.length} onChange={() => toggleGroup(g)} aria-label={`Select all answers marked by ${g.teacher_name}`} />
                  <button type="button" onClick={() => toggle(collapsed, setCollapsed, g.teacher_id)} aria-expanded={!isCollapsed}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: 800, fontSize: 14.5, padding: 0 }}>
                    {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}{g.teacher_name}
                  </button>
                  <span style={css.muted}>{g.items.length} marked 0{g.pending ? ` · ${g.pending} with teacher` : ""}</span>
                  <span style={{ flex: 1 }} />
                  <button type="button" style={{ ...css.btn, opacity: sendIds.length ? 1 : .5 }} disabled={!sendIds.length}
                    onClick={() => askPush(`Push back ${sendIds.length} answer${sendIds.length === 1 ? "" : "s"} to ${g.teacher_name}`, sendIds, 1)}>
                    <Send size={13} /> Push back all to {g.teacher_name.split(" ")[0]}
                  </button>
                </div>

                {!isCollapsed && g.items.map((i) => {
                  const expanded = open.has(i.answer_id);
                  const pend = i.return_status === "pending";
                  return (
                    <div key={i.answer_id} style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <input type="checkbox" style={{ marginTop: 4 }} checked={sel.has(i.answer_id)} disabled={pend}
                        onChange={() => toggle(sel, setSel, i.answer_id)} aria-label={`Select answer by ${i.student_name}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 13.5, color: "var(--text)" }}>{i.student_name}</strong>
                          <span style={css.muted}>{[i.assessment_title, i.subject_name].filter(Boolean).join(" · ")}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--destructive)" }}>0 / {i.max_marks ?? "–"}</span>
                          {pend && <span style={{ ...css.muted, display: "inline-flex", gap: 4, alignItems: "center", color: "var(--warning)" }}><Clock size={12} /> With teacher since {fmtWhen(i.returned_at)}</span>}
                          {!pend && i.return_status === "done" && <span style={{ ...css.muted, display: "inline-flex", gap: 4, alignItems: "center" }}><CheckCircle2 size={12} /> Re-marked once, still 0</span>}
                        </div>
                        {i.question_text && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}><b>Q:</b> {i.question_text}</p>}
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap",
                          ...(expanded ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>
                          <b>Answer:</b> {i.answer_preview || "—"}
                        </p>
                        {expanded && i.teacher_remark && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}><b>Teacher's remark:</b> {i.teacher_remark}</p>}
                        {expanded && pend && i.return_note && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}><b>Your note:</b> {i.return_note}</p>}
                        <button type="button" onClick={() => toggle(open, setOpen, i.answer_id)}
                          style={{ background: "none", border: "none", padding: 0, marginTop: 4, color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {expanded ? "Show less" : "Show more"}
                        </button>
                      </div>
                      <button type="button" style={{ ...css.btn, opacity: pend ? .5 : 1, flexShrink: 0 }} disabled={pend}
                        onClick={() => askPush(`Push back to ${g.teacher_name}`, [i.answer_id], 1)}>
                        <Send size={12} /> Push back
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {dialog && (
        <div role="dialog" aria-modal="true" aria-label={dialog.title} onClick={() => !busy && setDialog(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...css.card, width: "min(480px, 100%)", padding: 18 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 15, color: "var(--text)" }}>{dialog.title}</p>
            <p style={{ margin: "0 0 12px", ...css.muted, lineHeight: 1.5 }}>
              {dialog.count} answer{dialog.count === 1 ? "" : "s"} will go back to the teacher{dialog.teachers > 1 ? "s" : ""} who marked {dialog.count === 1 ? "it" : "them"}.
              Marks stay as they are until the teacher re-marks. Each teacher is notified.
            </p>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} placeholder="Optional note for the teacher (e.g. “Please check this against the marking guide”)"
              style={{ ...css.input, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" style={css.btn} disabled={busy} onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" style={{ ...css.btn, ...css.btnPrimary }} disabled={busy} onClick={confirmPush}>
                <Send size={13} /> {busy ? "Sending…" : "Push back"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
