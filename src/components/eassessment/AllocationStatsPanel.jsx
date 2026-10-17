import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";

/* Allocated-responses stats + top-3 board, shown on the marking pages.

   A teacher is allocated students (or single questions of them), so the work
   is counted in RESPONSES: e.g. 13 questions x 30 allocated students = 390
   responses, of which N are marked so far. The top-3 board is built from the
   number of responses each teacher has marked on this assessment, and stays
   blank until somebody has marked something.

   `queue` is every response allocated to this teacher (marked or not) and
   `markedCount` how many of them are marked — both come straight from the
   marking page, so the figures move the moment a question is marked, ahead
   of the 30s database sync. */

const MEDALS = ["🥇", "🥈", "🥉"];
const REFRESH_MS = 30000;

const box = {
  background: "var(--card, #fff)", border: "1px solid var(--border, #E2E5EA)", borderRadius: 14, padding: 16, marginBottom: 16,
};
const muted = { color: "var(--text-muted, #64748B)", fontSize: 12 };

function Slot({ place, row, isMe }) {
  const filled = !!row;
  return (
    <div
      style={{
        flex: 1, minWidth: 0, padding: "12px 10px", borderRadius: 12, textAlign: "center",
        border: filled ? `1.5px solid ${isMe ? "var(--primary, #8B1E2D)" : "var(--border, #E2E5EA)"}` : "1.5px dashed var(--border, #E2E5EA)",
        background: filled ? "var(--card, #fff)" : "transparent",
        minHeight: 92,
      }}
      aria-label={filled ? `Place ${place}: ${row.name}` : `Place ${place}: empty until marking starts`}
    >
      <div style={{ fontSize: 22, lineHeight: 1, opacity: filled ? 1 : 0.25 }}>{MEDALS[place - 1]}</div>
      {filled ? (
        <>
          <div style={{ marginTop: 6, fontWeight: 700, fontSize: 13.5, color: "var(--text, #0B0F19)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.name}{isMe ? " (you)" : ""}
          </div>
          <div style={{ ...muted, marginTop: 2 }}>
            <strong style={{ color: "var(--text, #0B0F19)" }}>{row.marked}</strong> marked{row.percent != null ? ` · ${row.percent}%` : ""}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 10, ...muted }}>—</div>
      )}
    </div>
  );
}

export default function AllocationStatsPanel({ assessmentId, queue, markedCount }) {
  const stats = useMemo(() => {
    const questions = new Set();
    const students = new Set();
    for (const q of queue) {
      if (q.question_id != null) questions.add(q.question_id);
      students.add(q._submission_id ?? q._student_id ?? "?");
    }
    const responses = queue.length;
    const marked = Math.min(markedCount, responses);
    return {
      questions: questions.size,
      students: students.size,
      responses,
      marked,
      remaining: Math.max(0, responses - marked),
      percent: responses ? Math.round((marked / responses) * 100) : 0,
    };
  }, [queue, markedCount]);

  const [board, setBoard] = useState(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!assessmentId) return undefined;
    let alive = true;
    const load = async () => {
      if (inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const r = await API.get("/e-assessments/marking-leaderboard", { params: { assessmentId } });
        if (alive) setBoard(r.data);
      } catch {
        /* the board is optional — keep showing the last good one (or blanks) */
      } finally {
        inFlight.current = false;
      }
    };
    load();
    const iv = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(iv); };
  }, [assessmentId]);

  const top3 = useMemo(() => {
    const me = board?.me;
    const rows = (board?.assessments?.[0]?.teachers || []).map((t) => ({
      id: t.teacher_id, name: t.teacher_name, marked: t.marked || 0, percent: t.percent,
    }));
    // this page knows my count right now; the database copy can be up to 30s behind
    const mine = rows.find((r) => r.id === me);
    if (mine) mine.marked = Math.max(mine.marked, stats.marked);
    else if (me != null && stats.marked > 0) rows.push({ id: me, name: "You", marked: stats.marked, percent: stats.percent });
    return rows
      .filter((r) => r.marked > 0)
      .sort((a, b) => b.marked - a.marked || (b.percent ?? -1) - (a.percent ?? -1) || a.name.localeCompare(b.name))
      .slice(0, 3)
      .map((r) => ({ ...r, isMe: r.id === me }));
  }, [board, stats.marked, stats.percent]);

  if (!stats.responses) return null;

  const formula = stats.questions * stats.students === stats.responses
    ? `${stats.questions} question${stats.questions !== 1 ? "s" : ""} × ${stats.students} allocated student${stats.students !== 1 ? "s" : ""} = ${stats.responses} responses`
    : `${stats.responses} responses across ${stats.questions} question${stats.questions !== 1 ? "s" : ""} and ${stats.students} allocated student${stats.students !== 1 ? "s" : ""}`;

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #0B0F19)" }}>Your allocated responses</div>
        <div style={muted}>{formula}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <div style={{ flex: 1, height: 10, borderRadius: 99, background: "var(--border, #E2E5EA)", overflow: "hidden" }}>
          <div style={{ width: `${stats.percent}%`, height: "100%", borderRadius: 99, background: stats.percent >= 100 ? "var(--success, #15803D)" : "var(--primary, #8B1E2D)", transition: "width .4s" }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", color: "var(--text, #0B0F19)" }}>
          {stats.marked} / {stats.responses} marked
          <span style={{ ...muted, marginLeft: 6 }}>({stats.percent}%)</span>
        </div>
      </div>
      <div style={{ ...muted, marginTop: 4 }}>{stats.remaining} response{stats.remaining !== 1 ? "s" : ""} still to mark</div>

      <div style={{ marginTop: 14, fontWeight: 700, fontSize: 13, color: "var(--text, #0B0F19)" }}>
        Top markers <span style={{ ...muted, fontWeight: 400 }}>· by responses marked on this assessment</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {[1, 2, 3].map((place) => (
          <Slot key={place} place={place} row={top3[place - 1]} isMe={!!top3[place - 1]?.isMe} />
        ))}
      </div>
      {top3.length === 0 && <div style={{ ...muted, marginTop: 8 }}>The top 3 fills in as soon as marking stats come in.</div>}
    </div>
  );
}
