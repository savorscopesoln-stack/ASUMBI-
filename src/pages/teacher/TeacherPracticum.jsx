import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import {
  Wrench, Users, School, MapPin, CalendarDays, ClipboardCheck,
  ChevronDown, ChevronUp, Save, Loader2, Inbox, CheckCircle2, XCircle,
} from "lucide-react";

const ASSESSMENT_NUMBERS = [1, 2, 3, 4, 5, 6];

export default function TeacherPracticum() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [rows, setRows] = useState([]);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [drafts, setDrafts] = useState({}); // { [assessmentRowId]: { score, remarks, assessedDate } }
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null); // { ok, message }

  /* ================= LOAD SESSIONS ================= */
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingSessions(true);
        const res = await API.get(`/practicum/teacher/${user.id}/sessions`);
        const list = res.data || [];
        setSessions(list);
        if (list.length) setSessionId(String(list[0].id));
      } catch (err) {
        console.error("Error fetching practicum sessions:", err);
      } finally {
        setLoadingSessions(false);
      }
    };
    if (user.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= LOAD ASSIGNMENTS ================= */
  const loadAssignments = async (sid) => {
    if (!sid) return;
    try {
      setLoadingRows(true);
      const res = await API.get(`/practicum/teacher/${user.id}/assignments`, {
        params: { sessionId: sid },
      });
      setTeacherInfo(res.data?.teacher || null);
      setRows(res.data?.rows || []);
    } catch (err) {
      console.error("Error fetching practicum assignments:", err);
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    loadAssignments(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ================= GROUP BY DAY ================= */
  const groupedByDay = useMemo(() => {
    const days = [...new Set(rows.map((r) => r.day || "Unscheduled"))];
    return days.map((day) => ({
      day,
      rows: rows.filter((r) => (r.day || "Unscheduled") === day),
    }));
  }, [rows]);

  /* ================= STATS ================= */
  const stats = useMemo(() => {
    const students = rows.length;
    const schools = new Set(rows.map((r) => r.schoolName).filter(Boolean)).size;
    const regions = new Set(rows.map((r) => r.regionName).filter(Boolean)).size;
    const totalAssessments = students * 6;
    const completed = rows.reduce(
      (sum, r) => sum + r.assessments.filter((a) => a.score !== null && a.score !== undefined).length,
      0
    );
    return { students, schools, regions, totalAssessments, completed };
  }, [rows]);

  const currentSession = sessions.find((s) => String(s.id) === String(sessionId));

  /* ================= ASSESSMENT DRAFTS ================= */
  const draftFor = (row) => {
    if (drafts[row.id]) return drafts[row.id];
    return {
      score: row.score ?? "",
      remarks: row.remarks ?? "",
      assessedDate: row.assessedDate ? String(row.assessedDate).slice(0, 10) : "",
    };
  };

  const setDraftField = (rowId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || draftFor({ id: rowId, score: "", remarks: "", assessedDate: "" })), [field]: value },
    }));
  };

  const saveAssessment = async (assignmentId, assessmentRow) => {
    const draft = draftFor(assessmentRow);
    setSavingId(assessmentRow.id);
    try {
      await API.put(`/practicum/assessments/${assessmentRow.id}`, {
        score: draft.score === "" ? null : Number(draft.score),
        remarks: draft.remarks || "",
        assessedDate: draft.assessedDate || new Date().toISOString().slice(0, 10),
      });
      setToast({ ok: true, message: "Assessment saved." });
      loadAssignments(sessionId);
    } catch (err) {
      setToast({ ok: false, message: err.response?.data?.error || "Failed to save assessment." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {toast && (
        <div style={{ ...S.toast, ...(toast.ok ? S.toastOk : S.toastErr) }}>
          {toast.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.headerIcon}><Wrench size={18} color="#fff" /></div>
          <div>
            <h2 style={S.pageTitle}>Practicum</h2>
            <p style={S.pageSub}>
              Your assigned trainees{teacherInfo?.researchDay ? ` — standing research day: ${teacherInfo.researchDay}` : ""}
            </p>
          </div>
        </div>

        {sessions.length > 0 && (
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={S.sessionSelect}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.studentCount} student{s.studentCount === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        )}
      </div>

      {loadingSessions ? (
        <div style={S.emptyState}><Loader2 size={20} className="tp-spin" /></div>
      ) : sessions.length === 0 ? (
        <div style={S.emptyCard}>
          <Inbox size={28} color="var(--text-muted)" />
          <p style={S.emptyTitle}>No practicum assignments yet</p>
          <p style={S.emptySub}>You have not been assigned any practicum trainees for supervision.</p>
        </div>
      ) : (
        <>
          {/* STATS */}
          <div style={S.statGrid}>
            <StatCard icon={<Users size={16} />} label="Students" value={stats.students} />
            <StatCard icon={<School size={16} />} label="Schools" value={stats.schools} />
            <StatCard icon={<MapPin size={16} />} label="Regions" value={stats.regions} />
            <StatCard
              icon={<ClipboardCheck size={16} />}
              label="Assessments done"
              value={`${stats.completed}/${stats.totalAssessments}`}
            />
          </div>

          {currentSession && (
            <div style={S.sessionMeta}>
              <CalendarDays size={13} />
              {currentSession.term} • {currentSession.date ? new Date(currentSession.date).toLocaleDateString() : "—"}
            </div>
          )}

          {/* ASSIGNMENTS BY DAY */}
          {loadingRows ? (
            <div style={S.emptyState}><Loader2 size={20} className="tp-spin" /></div>
          ) : rows.length === 0 ? (
            <div style={S.emptyCard}>
              <Inbox size={28} color="var(--text-muted)" />
              <p style={S.emptyTitle}>No students in this session</p>
            </div>
          ) : (
            groupedByDay.map((group) => (
              <div key={group.day} style={S.dayCard}>
                <div style={S.dayHeader}>
                  <CalendarDays size={14} color="var(--primary)" />
                  <span>{group.day}</span>
                  <span style={S.dayCount}>{group.rows.length} student{group.rows.length === 1 ? "" : "s"}</span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Student</th>
                        <th style={S.th}>School</th>
                        <th style={S.th}>Region</th>
                        <th style={S.th}>Deploy date</th>
                        {ASSESSMENT_NUMBERS.map((n) => (
                          <th style={S.th} key={n}>A{n}</th>
                        ))}
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((r) => {
                        const isOpen = expandedId === r.assignmentId;
                        return (
                          <React.Fragment key={r.assignmentId}>
                            <tr>
                              <td style={S.td}><b>{r.studentName}</b></td>
                              <td style={S.td}>{r.schoolName || "—"}</td>
                              <td style={S.td}>{r.regionName || "—"}</td>
                              <td style={S.td}>{r.deployDate ? new Date(r.deployDate).toLocaleDateString() : "—"}</td>
                              {ASSESSMENT_NUMBERS.map((n) => {
                                const cell = r.assessments.find((a) => a.assessmentNumber === n);
                                const hasScore = cell && cell.score !== null && cell.score !== undefined;
                                return (
                                  <td style={S.tdCenter} key={n}>
                                    {hasScore ? cell.score : "—"}
                                  </td>
                                );
                              })}
                              <td style={S.td}>
                                <button
                                  style={S.expandBtn}
                                  onClick={() => setExpandedId(isOpen ? null : r.assignmentId)}
                                >
                                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {isOpen ? "Close" : "Assess"}
                                </button>
                              </td>
                            </tr>

                            {isOpen && (
                              <tr>
                                <td colSpan={5 + ASSESSMENT_NUMBERS.length} style={S.expandCell}>
                                  <div style={S.assessGrid}>
                                    {r.assessments.map((a) => {
                                      const draft = draftFor(a);
                                      return (
                                        <div key={a.id} style={S.assessCard}>
                                          <div style={S.assessCardHead}>
                                            Assessment {a.assessmentNumber}
                                          </div>
                                          <div style={S.assessRow}>
                                            <label style={S.assessLabel}>Score</label>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={draft.score}
                                              onChange={(e) => setDraftField(a.id, "score", e.target.value)}
                                              style={S.scoreInput}
                                            />
                                          </div>
                                          <div style={S.assessRow}>
                                            <label style={S.assessLabel}>Date</label>
                                            <input
                                              type="date"
                                              value={draft.assessedDate}
                                              onChange={(e) => setDraftField(a.id, "assessedDate", e.target.value)}
                                              style={S.dateInput}
                                            />
                                          </div>
                                          <textarea
                                            placeholder="Remarks…"
                                            value={draft.remarks}
                                            onChange={(e) => setDraftField(a.id, "remarks", e.target.value)}
                                            style={S.remarksInput}
                                          />
                                          <button
                                            style={S.saveBtn}
                                            disabled={savingId === a.id}
                                            onClick={() => saveAssessment(r.assignmentId, a)}
                                          >
                                            {savingId === a.id ? <Loader2 size={13} className="tp-spin" /> : <Save size={13} />}
                                            Save
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={S.statCard}>
      <div style={S.statIcon}>{icon}</div>
      <div>
        <div style={S.statValue}>{value}</div>
        <div style={S.statLabel}>{label}</div>
      </div>
    </div>
  );
}

const CSS = `
  .tp-spin { animation: tpspin 0.8s linear infinite; }
  @keyframes tpspin { to { transform: rotate(360deg); } }
`;

const S = {
  page: { color: "var(--text)", fontFamily: "'Inter', sans-serif" },
  toast: {
    position: "fixed", top: 16, right: 16, zIndex: 999, display: "flex", alignItems: "center", gap: 8,
    padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow)",
  },
  toastOk: { background: "var(--success-tint)", color: "var(--success)" },
  toastErr: { background: "var(--destructive-tint)", color: "var(--destructive)" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 10, background: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { margin: 0, fontSize: 19, fontWeight: 800 },
  pageSub: { margin: "2px 0 0", fontSize: 12.5, color: "var(--text-secondary)" },
  sessionSelect: {
    padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", fontSize: 13, fontWeight: 600,
  },

  emptyState: { display: "flex", justifyContent: "center", padding: "60px 0", color: "var(--primary)" },
  emptyCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: "56px 20px", background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 14, textAlign: "center",
  },
  emptyTitle: { margin: "8px 0 0", fontWeight: 700, fontSize: 14.5 },
  emptySub: { margin: 0, fontSize: 12.5, color: "var(--text-muted)" },

  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14 },
  statCard: {
    display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)",
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 9, background: "var(--primary-tint)", color: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  statValue: { fontSize: 19, fontWeight: 800, lineHeight: 1.1 },
  statLabel: { fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, fontWeight: 600 },

  sessionMeta: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)",
    marginBottom: 16, fontWeight: 600,
  },

  dayCard: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
    marginBottom: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)",
  },
  dayHeader: {
    display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
    background: "var(--bg)", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13.5,
  },
  dayCount: { marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "9px 12px", background: "var(--card)", color: "var(--text-muted)", fontWeight: 800,
    fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".03em", textAlign: "left",
    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid var(--border)" },
  tdCenter: { padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "center", color: "var(--text-secondary)" },

  expandBtn: {
    display: "flex", alignItems: "center", gap: 4, background: "var(--primary-tint)", color: "var(--primary)",
    border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
    whiteSpace: "nowrap",
  },

  expandCell: { padding: "14px 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)" },
  assessGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 },
  assessCard: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 10,
    display: "flex", flexDirection: "column", gap: 6,
  },
  assessCardHead: { fontSize: 11.5, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".03em" },
  assessRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 },
  assessLabel: { fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 },
  scoreInput: { width: 60, padding: "5px 7px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 12.5 },
  dateInput: { padding: "5px 7px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 11.5 },
  remarksInput: {
    width: "100%", minHeight: 44, padding: 6, borderRadius: 6, border: "1px solid var(--border)",
    background: "var(--bg)", color: "var(--text)", fontSize: 12, resize: "vertical", boxSizing: "border-box",
    fontFamily: "inherit",
  },
  saveBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "var(--primary)",
    color: "#fff", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
  },
};
