import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import { downloadTablesPdf } from "../../utils/pdfExport";
import { RefreshCw, Download, Trophy, Timer, Flag, Users, CheckCircle2 } from "lucide-react";

/* Marking leaderboard — shared by the admin "Marking" tab and the teacher page.
   Everyone sees the same board: each teacher's allocation, marking progress,
   speed, and who finished an assessment first. */

const css = {
  card: { background: "var(--card, #fff)", border: "1px solid var(--border, #E2E5EA)", borderRadius: 14, padding: 16 },
  muted: { color: "var(--text-muted, #64748B)", fontSize: 12 },
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-muted, #64748B)", padding: "8px 10px", whiteSpace: "nowrap" },
  td: { padding: "10px", fontSize: 13.5, color: "var(--text, #0B0F19)", borderTop: "1px solid var(--border, #E2E5EA)", whiteSpace: "nowrap" },
};

const MEDALS = ["🥇", "🥈", "🥉"];
const medal = (n) => MEDALS[n - 1] || `#${n}`;

const fmtWhen = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const fmtDur = (mins) => {
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 48) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
};

const SORTS = {
<<<<<<< HEAD
  progress: { label: "Progress", fn: (a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.wins - a.wins || b.marked - a.marked },
  speed:    { label: "Speed",    fn: (a, b) => (b.items_per_hour ?? -1) - (a.items_per_hour ?? -1) || b.marked - a.marked },
  wins:     { label: "First finishes", fn: (a, b) => b.wins - a.wins || b.podiums - a.podiums || b.marked - a.marked },
  marked:   { label: "Most marked", fn: (a, b) => b.marked - a.marked || (b.percent ?? -1) - (a.percent ?? -1) },
=======
  progress: { label: "Progress", fn: (a, b) => b.percent - a.percent || b.wins - a.wins || b.marked - a.marked },
  speed:    { label: "Speed",    fn: (a, b) => (b.items_per_hour ?? -1) - (a.items_per_hour ?? -1) || b.percent - a.percent },
  wins:     { label: "First finishes", fn: (a, b) => b.wins - a.wins || b.podiums - a.podiums || b.percent - a.percent },
  marked:   { label: "Most marked", fn: (a, b) => b.marked - a.marked || b.percent - a.percent },
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
};

function Bar({ pct, done }) {
  return (
    <div style={{ minWidth: 110, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--border, #E2E5EA)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", borderRadius: 99, background: done ? "var(--success, #15803D)" : "var(--primary, #8B1E2D)", transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, width: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ ...css.card, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
      <div style={{ color: "var(--primary, #8B1E2D)" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        <div style={css.muted}>{label}</div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, icon, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, cursor: disabled ? "default" : "pointer",
        border: "1px solid var(--border, #E2E5EA)", background: "var(--card, #fff)", color: "var(--text, #0B0F19)", fontSize: 13, fontWeight: 600, opacity: disabled ? .6 : 1 }}>
      {icon}{children}
    </button>
  );
}

export default function MarkingLeaderboard({ title = "Marking Leaderboard" }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [assessmentId, setAssessmentId] = useState("");
<<<<<<< HEAD
  const [sortKey, setSortKey] = useState("marked");
=======
  const [sortKey, setSortKey] = useState("progress");
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
  const inFlight = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (inFlight.current) return; // never stack requests on a slow database
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const r = await API.get("/e-assessments/marking-leaderboard", { params: assessmentId ? { assessmentId } : {} });
      setData(r.data);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Could not load marking stats");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const iv = setInterval(() => { if (!document.hidden) load(true); }, 30000);
    return () => clearInterval(iv);
  }, [load]);

  // the assessment picker must keep listing every assessment even while one is selected
  const [allAssessments, setAllAssessments] = useState([]);
  useEffect(() => {
    if (!assessmentId && data?.assessments) {
      setAllAssessments(data.assessments.map((a) => ({ id: a.e_assessment_id, title: a.title })));
    }
  }, [data, assessmentId]);

  const teachers = useMemo(() => {
    const list = [...(data?.teachers || [])].sort(SORTS[sortKey].fn);
    return list.map((t, i) => ({ ...t, rank: i + 1 }));
  }, [data, sortKey]);

  const exportPdf = (onlyAssessment) => {
    const as = onlyAssessment ? [onlyAssessment] : (data?.assessments || []);
    const sections = [];
    if (!onlyAssessment) {
      sections.push({
        heading: `Overall ranking — by ${SORTS[sortKey].label.toLowerCase()}`,
        head: ["Rank", "Teacher", "Allocated", "Marked", "Remaining", "Progress", "Speed (per hr)", "First finishes", "Last activity"],
<<<<<<< HEAD
        body: teachers.map((t) => [t.rank, t.teacher_name, t.allocated || "Open", t.marked, t.allocated ? t.remaining : "—", t.percent == null ? "Open" : `${t.percent}%`,
=======
        body: teachers.map((t) => [t.rank, t.teacher_name, t.allocated, t.marked, t.remaining, `${t.percent}%`,
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
          t.items_per_hour ?? "—", t.wins, fmtWhen(t.last_activity)]),
      });
    }
    as.forEach((a) => sections.push({
      heading: a.title,
      note: a.first_finisher
        ? `First to finish: ${a.first_finisher.teacher_name} (${fmtWhen(a.first_finisher.finished_at)})  ·  ${a.marked} of ${a.allocated} marked (${a.percent}%)`
        : `Nobody has finished yet  ·  ${a.marked} of ${a.allocated} marked (${a.percent}%)`,
      head: ["Place", "Teacher", "Allocated", "Marked", "Remaining", "Progress", "Finished at", "Time taken", "Speed (per hr)"],
<<<<<<< HEAD
      body: a.teachers.map((c) => [c.finish_place ? `${c.finish_place}` : "—", c.teacher_name, c.open ? "Open" : c.allocated, c.marked, c.open ? "—" : c.remaining,
        c.percent == null ? "Open" : `${c.percent}%`, fmtWhen(c.finished_at), fmtDur(c.turnaround_minutes), c.items_per_hour ?? "—"]),
=======
      body: a.teachers.map((c) => [c.finish_place ? `${c.finish_place}` : "—", c.teacher_name, c.allocated, c.marked, c.remaining,
        `${c.percent}%`, fmtWhen(c.finished_at), fmtDur(c.turnaround_minutes), c.items_per_hour ?? "—"]),
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
    }));
    downloadTablesPdf({
      title: onlyAssessment ? `Marking report — ${onlyAssessment.title}` : "Marking Leaderboard",
      subtitle: `${data.summary.marked} of ${data.summary.allocated} items marked (${data.summary.percent}%)`,
      sections,
      filename: onlyAssessment ? `marking-${onlyAssessment.title.replace(/[^\w]+/g, "_")}` : "marking-leaderboard",
    });
  };

  if (loading && !data) return <div style={{ ...css.card, ...css.muted }}>Loading marking stats…</div>;
  if (err && !data) return <div style={{ ...css.card, color: "var(--destructive, #DC2626)" }}>{err} <Btn onClick={() => load()} icon={<RefreshCw size={14} />}>Retry</Btn></div>;
  if (!data) return null;

  const podium = teachers.slice(0, 3);
  const s = data.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <div style={css.muted}>Load allocation, marking progress and who marks fastest · updates every 30s</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--border, #E2E5EA)", background: "var(--card, #fff)", color: "var(--text, #0B0F19)", fontSize: 13, maxWidth: 240 }}>
            <option value="">All assessments</option>
            {allAssessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <Btn onClick={() => load()} icon={<RefreshCw size={14} />}>Refresh</Btn>
          <Btn onClick={() => exportPdf()} icon={<Download size={14} />} disabled={!teachers.length}>Download PDF</Btn>
        </div>
      </div>

      {err && <div style={{ ...css.muted, color: "var(--warning, #B45309)" }}>Showing the last loaded stats — {err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <Stat icon={<Users size={20} />} label="Teachers marking" value={s.teachers} />
        <Stat icon={<Flag size={20} />} label="Items allocated" value={s.allocated} />
        <Stat icon={<CheckCircle2 size={20} />} label="Items marked" value={s.marked} />
        <Stat icon={<Timer size={20} />} label="Remaining" value={s.remaining} />
        <Stat icon={<Trophy size={20} />} label="Overall progress" value={`${s.percent}%`} />
      </div>

      {!teachers.length ? (
        <div style={{ ...css.card, ...css.muted, textAlign: "center", padding: 30 }}>
          No marking has been allocated yet. Assign submissions to teachers and they will appear here.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={css.muted}>Rank by:</span>
            {Object.entries(SORTS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setSortKey(k)}
                style={{ padding: "6px 12px", borderRadius: 99, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                  border: "1px solid var(--border, #E2E5EA)",
                  background: sortKey === k ? "var(--primary, #8B1E2D)" : "var(--card, #fff)",
                  color: sortKey === k ? "#fff" : "var(--text, #0B0F19)" }}>{v.label}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {podium.map((t) => (
              <div key={t.teacher_id} style={{ ...css.card, textAlign: "center", borderColor: t.rank === 1 ? "var(--primary, #8B1E2D)" : undefined }}>
                <div style={{ fontSize: 34 }}>{medal(t.rank)}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t.teacher_name}{t.teacher_id === data.me ? " (you)" : ""}</div>
<<<<<<< HEAD
                <div style={css.muted}>{t.percent == null ? `${t.marked} marked (open marking)` : `${t.marked} marked · ${t.percent}% of allocation`}</div>
=======
                <div style={css.muted}>{t.marked} of {t.allocated} marked · {t.percent}%</div>
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
                <div style={css.muted}>{t.items_per_hour != null ? `${t.items_per_hour}/hr` : "speed n/a"} · {t.wins} first finish{t.wins === 1 ? "" : "es"}</div>
              </div>
            ))}
          </div>

          <div style={{ ...css.card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                {["Rank", "Teacher", "Allocated", "Marked", "Remaining", "Progress", "Speed", "1st finishes", "Last activity"].map((h) => <th key={h} style={css.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.teacher_id} style={t.teacher_id === data.me ? { background: "var(--primary-tint, #FBEAEC)" } : undefined}>
                    <td style={{ ...css.td, fontWeight: 700 }}>{medal(t.rank)}</td>
                    <td style={{ ...css.td, fontWeight: 600 }}>{t.teacher_name}{t.teacher_id === data.me ? " (you)" : ""}</td>
<<<<<<< HEAD
                    <td style={css.td}>{t.allocated ? t.allocated : "Open"}{t.allocated && t.open_marked ? ` +${t.open_marked} open` : ""}</td>
                    <td style={css.td}>{t.marked}</td>
                    <td style={css.td}>{t.allocated ? t.remaining : "—"}</td>
                    <td style={css.td}>{t.percent == null ? <span style={css.muted}>Open marking</span> : <Bar pct={t.percent} done={t.percent === 100} />}</td>
=======
                    <td style={css.td}>{t.allocated}</td>
                    <td style={css.td}>{t.marked}</td>
                    <td style={css.td}>{t.remaining}</td>
                    <td style={css.td}><Bar pct={t.percent} done={t.percent === 100} /></td>
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
                    <td style={css.td}>{t.items_per_hour != null ? `${t.items_per_hour}/hr` : "—"}</td>
                    <td style={css.td}>{t.wins}</td>
                    <td style={css.td}>{fmtWhen(t.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
<<<<<<< HEAD
          <div style={css.muted}>Open marking = work a teacher marked that was never assigned to them, so there is no fixed allocation to measure progress against. Speed is items marked per hour; for work marked before tracking began it is estimated from the teacher's marking session.</div>
=======
          <div style={css.muted}>Speed is items marked per hour while a teacher was actively marking. It only counts work marked after tracking began.</div>
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19

          <h4 style={{ margin: "6px 0 0", fontSize: 15 }}>The race — who finished each assessment first</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
            {data.assessments.map((a) => (
              <div key={a.e_assessment_id} style={css.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.title}</div>
<<<<<<< HEAD
                    <div style={css.muted}>{a.subject ? `${a.subject} · ` : ""}{a.marked} of {a.allocated} marked{a.has_open_pool ? " (incl. open pool)" : ""}</div>
=======
                    <div style={css.muted}>{a.subject ? `${a.subject} · ` : ""}{a.marked} of {a.allocated} marked</div>
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
                  </div>
                  <Btn onClick={() => exportPdf(a)} icon={<Download size={13} />}>PDF</Btn>
                </div>
                <div style={{ margin: "10px 0" }}><Bar pct={a.percent} done={a.percent === 100} /></div>
                <div style={{ fontSize: 13, marginBottom: 8, color: a.first_finisher ? "var(--success, #15803D)" : "var(--text-muted, #64748B)", fontWeight: 600 }}>
                  {a.first_finisher
                    ? `🏁 ${a.first_finisher.teacher_name} finished first · ${fmtWhen(a.first_finisher.finished_at)}`
                    : "No one has finished yet — the race is on"}
                </div>
                {a.teachers.map((c) => (
                  <div key={c.teacher_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border, #E2E5EA)",
                    background: c.teacher_id === data.me ? "var(--primary-tint, #FBEAEC)" : undefined }}>
                    <span style={{ width: 30, fontWeight: 700 }}>{c.finish_place ? medal(c.finish_place) : "·"}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.teacher_name}</span>
<<<<<<< HEAD
                    <span style={{ ...css.muted, whiteSpace: "nowrap" }}>{c.open ? `${c.marked} marked (open)` : `${c.marked}/${c.allocated}`}{c.turnaround_minutes != null ? ` · ${fmtDur(c.turnaround_minutes)}` : ""}</span>
                    <div style={{ width: 90 }}>{c.percent == null ? null : <Bar pct={c.percent} done={c.finished} />}</div>
=======
                    <span style={{ ...css.muted, whiteSpace: "nowrap" }}>{c.marked}/{c.allocated}{c.turnaround_minutes != null ? ` · ${fmtDur(c.turnaround_minutes)}` : ""}</span>
                    <div style={{ width: 90 }}><Bar pct={c.percent} done={c.finished} /></div>
>>>>>>> 71026baeb12d438d804c370a29bf110ee1ab2e19
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
