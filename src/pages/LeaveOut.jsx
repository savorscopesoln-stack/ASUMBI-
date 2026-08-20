import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { getStoredUser } from "../permissions";

const LEAVE_TYPE_LABELS = {
  short_stay: "Short Stay",
  long: "Long-Stay",
  emergency: "Emergency",
};

const LEAVE_TYPE_COLOR = (t) => {
  if (t === "emergency") return "#ef4444";
  if (t === "long") return "#3b82f6";
  return "#8b5cf6";
};

const STATUS_LABELS = {
  pending: "Pending",
  pending_subadmin2: "Pending Sub-Admin 2",
  pending_final: "Pending Final Approval",
  pending_admin: "Pending Admin",
  approved: "Approved",
  admin_granted: "Admin Granted",
  rejected: "Rejected",
  denied: "Rejected",
  cancelled: "Cancelled",
  revoked: "Revoked",
  expired: "Expired",
};

const STATUS_COLOR = (s) => {
  if (s === "approved" || s === "admin_granted") return "#22c55e";
  if (s === "rejected" || s === "denied") return "#ef4444";
  if (s === "cancelled") return "#9ca3af";
  if (s === "expired") return "#9ca3af";
  if (s === "revoked") return "#6b7280";
  return "#facc15"; // any pending_* stage
};

const PENDING_STATUSES = ["pending", "pending_subadmin2", "pending_final", "pending_admin"];

const DURATION_OPTIONS = [
  { value: 60, label: "1 Hour" },
  { value: 120, label: "2 Hours" },
  { value: 180, label: "3 Hours" },
  { value: 240, label: "4 Hours" },
  { value: 300, label: "5 Hours" },   
  { value: 360, label: "6 Hours" },
  { value: 480, label: "8 Hours" },
  { value: 600, label: "10 Hours" },
  { value: 720, label: "12 Hours" },
  { value: 1440, label: "1 Day" },
  { value: 2880, label: "2 Days" },
  { value: 4320, label: "3 Days" },
  { value: 5760, label: "4 Days" },
  { value: 7200, label: "5 Days" },
  { value: 10080, label: "1 Week" },
  { value: 20160, label: "2 Weeks" },
  { value: 30240, label: "3 Weeks" },
  { value: 40320, label: "4 Weeks" },
  { value: 52560, label: "1 Month" },
  { value: 105120, label: "2 Months" },
  { value: 157680, label: "3 Months" },
  { value: 210240, label: "4 Months" },
  { value: 262800, label: "5 Months" },
  { value: 315360, label: "6 Months" },
  { value: 367920, label: "7 Months" },
  { value: 420480, label: "8 Months" },
  { value: 473040, label: "9 Months" },
  { value: 403200, label: "10 Months" },
  { value: 525600, label: "11 Months" },
  { value: 525600, label: "1 Year" }, 

];

export default function LeaveOutAdmin() {
  const user = getStoredUser();
  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  /* Sub-Admin 2 is an Emergency-only reviewer: it may never see any
     other leave type, and — per explicit request — it must never see
     counts/totals of any kind either (no analytics card, no "N
     Requests" badge). Everything below keyed off this one flag so
     there's a single place enforcing it on the UI side; the backend
     enforces the same thing independently (see leaveOutRoutes.js). */
  const isSubAdmin2 = role === "sub_admin_2";

  const [leaves, setLeaves] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [duration, setDuration] = useState(120);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(isSubAdmin2 ? "emergency" : "all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [rejectModal, setRejectModal] = useState(null); // { id, reason }
  const [grantModal, setGrantModal] = useState(null); // form state while open
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    instantLoad();
  }, []);

  const instantLoad = async () => {
    try {
      setLoading(true);
      // Sub-Admin 2 never sees analytics/counters, so don't even fetch
      // them — one less thing the backend has to reject.
      await Promise.all([loadLeaves(), ...(isSubAdmin2 ? [] : [loadAnalytics()]), loadStudents()]);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaves = async () => {
    const res = await API.get("/leave-outs");
    setLeaves(res.data || []);
  };

  const loadAnalytics = async () => {
    const res = await API.get("/leave-outs/analytics");
    setAnalytics(res.data || []);
  };

  const loadStudents = async () => {
    try {
      const res = await API.get("/students");
      setStudents(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // Reload after any action. Skips analytics entirely for Sub-Admin 2.
  const refresh = async () => Promise.all([loadLeaves(), ...(isSubAdmin2 ? [] : [loadAnalytics()])]);

  const getStudent = (id) => students.find((x) => x.id === id);
  const getStudentName = (id) => getStudent(id)?.name || `Student ${id}`;
  const getStudentAdmission = (id) => getStudent(id)?.admissionNo || "";

  const leaveTypeLabel = (t) => LEAVE_TYPE_LABELS[t] || "Short Stay";
  const statusLabel = (s) => STATUS_LABELS[s] || s;

  /* ================= PERMISSION HELPERS (mirrors backend rules) ================= */
  const canAct = (l) => {
    if (l.leave_type === "long") return l.status === "pending_admin" && role === "admin";
    if (l.leave_type === "emergency") {
      if (l.status === "pending_subadmin2") return ["sub_admin_2", "admin"].includes(role);
      if (l.status === "pending_final") return ["sub_admin", "admin"].includes(role);
      return false;
    }
    return l.status === "pending" && ["admin", "sub_admin", "sub_admin_2"].includes(role);
  };

  const canRevoke = (l) => {
    if (["revoked", "rejected", "denied", "cancelled", "expired"].includes(l.status)) return false;
    if (l.leave_type === "long" && role !== "admin") return false;
    return true;
  };

  /* ================= ACTIONS ================= */

  const approve = async (l) => {
    if (!window.confirm(`Approve this ${leaveTypeLabel(l.leave_type)} request for ${getStudentName(l.student_id)}?`)) return;
    try {
      setBusyId(l.id);
      await API.put(`/leave-outs/${l.id}/approve`, { approvedAt: new Date(), duration });
      await refresh();
    } catch (err) {
      alert(err?.response?.data?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (l) => setRejectModal({ id: l.id, reason: "" });

  const confirmReject = async () => {
    if (!rejectModal) return;
    try {
      setBusyId(rejectModal.id);
      await API.put(`/leave-outs/${rejectModal.id}/deny`, { reason: rejectModal.reason });
      setRejectModal(null);
      await refresh();
    } catch (err) {
      alert(err?.response?.data?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (l) => {
    if (!window.confirm(`Revoke this leave for ${getStudentName(l.student_id)}? The student will be notified to report back immediately.`)) return;
    try {
      setBusyId(l.id);
      await API.put(`/leave-outs/${l.id}/revoke`);
      await refresh();
    } catch (err) {
      alert(err?.response?.data?.message || "Revoke failed");
    } finally {
      setBusyId(null);
    }
  };

  const openForceGrant = () => {
    setGrantModal({
      student_id: students[0]?.id || "",
      leave_type: "short_stay",
      request_date: new Date().toISOString().slice(0, 10),
      duration: 120,
      reason: "",
    });
  };

  const submitForceGrant = async () => {
    if (!grantModal?.student_id) {
      alert("Select a student.");
      return;
    }
    const studentName = getStudentName(Number(grantModal.student_id));
    if (!window.confirm(`Force-grant ${leaveTypeLabel(grantModal.leave_type)} leave to ${studentName} immediately, with no approval required? This action is logged.`)) return;

    try {
      setBusyId("grant");
      await API.post("/leave-outs/force-grant", {
        student_id: Number(grantModal.student_id),
        leave_type: grantModal.leave_type,
        request_date: grantModal.request_date,
        duration: Number(grantModal.duration) || undefined,
        reason: grantModal.reason,
      });
      setGrantModal(null);
      await refresh();
    } catch (err) {
      alert(err?.response?.data?.message || "Force grant failed");
    } finally {
      setBusyId(null);
    }
  };

  /* ================= FILTER ================= */

  const filteredLeaves = useMemo(() => {
    const term = search.toLowerCase().trim();
    return leaves.filter((l) => {
      // Belt-and-braces: even though the backend already scopes
      // Sub-Admin 2 to emergency-only leaves, never render anything
      // else here either.
      if (isSubAdmin2 && l.leave_type !== "emergency") return false;
      if (typeFilter !== "all" && l.leave_type !== typeFilter) return false;

      if (statusFilter === "pending" && !PENDING_STATUSES.includes(l.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "pending" && l.status !== statusFilter) return false;

      if (!term) return true;
      return (
        getStudentName(l.student_id).toLowerCase().includes(term) ||
        getStudentAdmission(l.student_id).toLowerCase().includes(term) ||
        String(l.student_id).includes(term)
      );
    });
  }, [leaves, search, typeFilter, statusFilter, students]);

  /* ================= UI ================= */

  return (
    <div style={styles.layout}>
      <div style={styles.main}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{isSubAdmin2 ? "Emergency Leave-Outs" : "Leave Management"}</h1>
            <p style={styles.subtitle}>
              {isSubAdmin2
                ? "Review and act on Emergency leave requests."
                : "Approvals, Emergency & Long-Stay workflows, and leave history."}
            </p>
            <button onClick={() => window.history.back()} style={styles.backBtn}>
              ← Back
            </button>
          </div>

          <div style={styles.headerRight}>
            {isAdmin && (
              <button onClick={openForceGrant} style={styles.forceGrantBtn}>
                ⚡ Force Give Leave
              </button>
            )}
            <input
              placeholder="🔍 Search name or admission no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.search}
            />
          </div>
        </div>

        {loading ? (
          <div style={styles.loaderWrap}>
            <div style={styles.loader}></div>
            <p style={{ marginTop: 20 }}>Loading Leave Dashboard...</p>
          </div>
        ) : (
          <>
            {/* ================= TOP GRID ================= */}
            <div style={isSubAdmin2 ? styles.topGridSingle : styles.topGrid}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3>⚙️ Approval Settings</h3>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Default Return Time (used when approving)</label>
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={styles.input}>
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Admin 2 is locked to Emergency only — there is
                    nothing else for this filter to do, so it's hidden
                    rather than shown disabled. */}
                {!isSubAdmin2 && (
                  <div style={styles.field}>
                    <label style={styles.label}>Filter by Leave Type</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.input}>
                      <option value="all">All Types</option>
                      <option value="short_stay">Short Stay</option>
                      <option value="emergency">Emergency</option>
                      <option value="long">Long-Stay</option>
                    </select>
                  </div>
                )}

                <div style={styles.field}>
                  <label style={styles.label}>Filter by Status / Stage</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending (any stage)</option>
                    <option value="pending_subadmin2">Pending Sub-Admin 2</option>
                    <option value="pending_final">Pending Final Approval</option>
                    <option value="pending_admin">Pending Admin</option>
                    <option value="approved">Approved</option>
                    <option value="admin_granted">Admin Granted</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="revoked">Revoked</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* ANALYTICS — never shown to Sub-Admin 2. That role gets
                  no counts or totals of any kind, per policy. */}
              {!isSubAdmin2 && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3>📊 Leave Analytics</h3>
                </div>

                <div style={styles.analyticsGrid}>
                  {analytics.map((a) => (
                    <div key={a.student_id} style={styles.analyticsCard}>
                      <h4 style={styles.analyticsName}>{getStudentName(a.student_id)}</h4>
                      <div style={styles.analyticsRow}><span>Total</span><strong>{a.totalLeaves}</strong></div>
                      <div style={styles.analyticsRow}><span style={{ color: "#22c55e" }}>Approved</span><strong>{a.approvedLeaves}</strong></div>
                      <div style={styles.analyticsRow}><span style={{ color: "#facc15" }}>Pending</span><strong>{a.pendingLeaves}</strong></div>
                      <div style={styles.analyticsRow}><span style={{ color: "#ef4444" }}>Rejected</span><strong>{a.deniedLeaves}</strong></div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* ================= REQUESTS TABLE ================= */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3>📋 {isSubAdmin2 ? "Emergency Leave Requests" : "Leave Requests"}</h3>
                {/* No count badge for Sub-Admin 2 — "even the counter or
                    number of leaves shouldn't show". */}
                {!isSubAdmin2 && <div style={styles.badge}>{filteredLeaves.length} Requests</div>}
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Reason</th>
                      <th style={styles.th}>Submitted</th>
                      <th style={styles.th}>Status / Stage</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.length === 0 && (
                      <tr><td colSpan={6} style={styles.emptyCell}>No leave requests match these filters.</td></tr>
                    )}
                    {filteredLeaves.map((l) => (
                      <React.Fragment key={l.id}>
                        <tr style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.studentName}>{getStudentName(l.student_id)}</div>
                            <div style={styles.studentId}>
                              {getStudentAdmission(l.student_id) || `ID ${l.student_id}`}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.typeBadge, color: LEAVE_TYPE_COLOR(l.leave_type), border: `1px solid ${LEAVE_TYPE_COLOR(l.leave_type)}` }}>
                              {leaveTypeLabel(l.leave_type)}
                            </span>
                            {l.is_admin_granted ? (
                              <div style={styles.grantedTag}>Admin Granted</div>
                            ) : null}
                          </td>
                          <td style={{ ...styles.td, maxWidth: 220 }}>{l.reason || "—"}</td>
                          <td style={styles.td}>{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.status, color: STATUS_COLOR(l.status), border: `1px solid ${STATUS_COLOR(l.status)}` }}>
                              {statusLabel(l.status)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actions}>
                              {canAct(l) && (
                                <>
                                  <button onClick={() => approve(l)} disabled={busyId === l.id} style={styles.approve}>Approve</button>
                                  <button onClick={() => openReject(l)} disabled={busyId === l.id} style={styles.deny}>Reject</button>
                                </>
                              )}
                              {canRevoke(l) && (
                                <button onClick={() => revoke(l)} disabled={busyId === l.id} style={styles.revoke}>Revoke</button>
                              )}
                              <button onClick={() => setExpandedId(expandedId === l.id ? null : l.id)} style={styles.historyBtn}>
                                {expandedId === l.id ? "Hide" : "History"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedId === l.id && (
                          <tr>
                            <td colSpan={6} style={styles.historyCell}>
                              <ApprovalHistory leave={l} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= REJECT MODAL ================= */}
      {rejectModal && (
        <div style={styles.modalOverlay} onClick={() => setRejectModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Reject Leave Request</h3>
            <p style={{ color: "#9ca3af", fontSize: 13.5 }}>
              This will notify the student with the reason below. This cannot be undone.
            </p>
            <textarea
              placeholder="Reason for rejection..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              style={styles.textarea}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setRejectModal(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmReject} disabled={busyId === rejectModal.id} style={styles.deny}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FORCE GRANT MODAL ================= */}
      {grantModal && (
        <div style={styles.modalOverlay} onClick={() => setGrantModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>⚡ Force Give Leave</h3>
            <p style={{ color: "#9ca3af", fontSize: 13.5 }}>
              Grants leave immediately with no approval workflow. Recorded as Admin Granted with your account and timestamp.
            </p>

            <div style={styles.field}>
              <label style={styles.label}>Student</label>
              <select
                value={grantModal.student_id}
                onChange={(e) => setGrantModal({ ...grantModal, student_id: e.target.value })}
                style={styles.input}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.admissionNo ? `(${s.admissionNo})` : ""}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Leave Type</label>
              <select
                value={grantModal.leave_type}
                onChange={(e) => setGrantModal({ ...grantModal, leave_type: e.target.value })}
                style={styles.input}
              >
                <option value="short_stay">Short Stay</option>
                <option value="emergency">Emergency</option>
                <option value="long">Long-Stay</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Start Date</label>
              <input
                type="date"
                value={grantModal.request_date}
                onChange={(e) => setGrantModal({ ...grantModal, request_date: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Duration</label>
              <select
                value={grantModal.duration}
                onChange={(e) => setGrantModal({ ...grantModal, duration: e.target.value })}
                style={styles.input}
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Reason / Notes</label>
              <textarea
                placeholder="Why this leave is being granted directly..."
                value={grantModal.reason}
                onChange={(e) => setGrantModal({ ...grantModal, reason: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setGrantModal(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={submitForceGrant} disabled={busyId === "grant"} style={styles.forceGrantBtn}>
                Grant Leave Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= APPROVAL HISTORY ================= */
function ApprovalHistory({ leave: l }) {
  const fmt = (d) => (d ? new Date(d).toLocaleString() : null);
  const rows = [];

  rows.push({ label: "Submitted", who: l.submitted_by_name || `Student ${l.student_id}`, when: fmt(l.createdAt) });

  if (l.subadmin2_approver_name) {
    rows.push({ label: "Approved (Sub-Admin 2)", who: l.subadmin2_approver_name, when: fmt(l.subadmin2_approved_at) });
  }
  if (l.final_approver_name) {
    rows.push({ label: "Final Approval", who: l.final_approver_name, when: fmt(l.final_approved_at) });
  }
  if (l.rejected_by_name) {
    rows.push({ label: `Rejected${l.reject_stage ? ` (${STATUS_LABELS[l.reject_stage] || l.reject_stage})` : ""}`, who: l.rejected_by_name, when: fmt(l.rejected_at), bad: true });
  }
  if (l.granted_by_name) {
    rows.push({ label: "Admin Granted", who: l.granted_by_name, when: fmt(l.granted_at) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 4px" }}>
      {l.deny_reason && l.status === "rejected" && (
        <div style={{ color: "#fca5a5", fontSize: 13 }}>Reason: {l.deny_reason}</div>
      )}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: r.bad ? "#fca5a5" : "#d1d5db", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
          <span><strong>{r.label}</strong> — {r.who}</span>
          <span style={{ color: "#9ca3af" }}>{r.when || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f0f0f 0%, #1b0a0a 45%, #090909 100%)",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
  },
  main: { flex: 1, padding: 35, maxWidth: "100%", overflowX: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, flexWrap: "wrap", gap: 20 },
  title: { margin: 0, fontSize: 32, fontWeight: 800 },
  subtitle: { marginTop: 8, color: "#9ca3af", fontSize: 15 },
  backBtn: {
    marginTop: 14, padding: "10px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700,
    color: "#fff", background: "linear-gradient(135deg,#991b1b,#dc2626)", boxShadow: "0 8px 20px rgba(220,38,38,0.25)",
    display: "flex", alignItems: "center", gap: 8,
  },
  headerRight: { display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" },
  forceGrantBtn: {
    padding: "12px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700, color: "#111",
    background: "linear-gradient(135deg,#fde047,#f59e0b)", boxShadow: "0 8px 20px rgba(245,158,11,0.3)",
  },
  search: {
    width: 280, padding: 13, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", fontSize: 14,
  },
  topGrid: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 28 },
  topGridSingle: { display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 28, maxWidth: 480 },
  card: {
    background: "rgba(255,255,255,0.05)", backdropFilter: "blur(14px)", borderRadius: 24, padding: 24,
    border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  badge: { background: "rgba(220,38,38,0.15)", color: "#fca5a5", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700 },
  field: { marginBottom: 18 },
  label: { display: "block", marginBottom: 8, color: "#d1d5db", fontSize: 13, fontWeight: 600 },
  input: {
    width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)", color: "#fff", outline: "none", fontSize: 14, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", minHeight: 90, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)", color: "#fff", outline: "none", resize: "vertical", fontSize: 14, boxSizing: "border-box",
  },
  analyticsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 },
  analyticsCard: { background: "rgba(0,0,0,0.28)", padding: 18, borderRadius: 18, border: "1px solid rgba(255,255,255,0.05)" },
  analyticsName: { marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700 },
  analyticsRow: { display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#d1d5db", fontSize: 14 },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 780 },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#9ca3af", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.05)" },
  td: { padding: "14px 10px", fontSize: 13.5, verticalAlign: "top" },
  emptyCell: { padding: "30px 10px", textAlign: "center", color: "#9ca3af" },
  historyCell: { padding: "6px 14px 16px", background: "rgba(0,0,0,0.2)" },

  studentName: { fontWeight: 700, fontSize: 14.5 },
  studentId: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  typeBadge: { display: "inline-block", padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" },
  grantedTag: { marginTop: 4, fontSize: 10.5, color: "#fde047", fontWeight: 700 },
  status: { padding: "6px 12px", borderRadius: 999, textTransform: "uppercase", fontWeight: 700, fontSize: 11, background: "rgba(255,255,255,0.03)", whiteSpace: "nowrap" },

  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  approve: { padding: "8px 14px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#15803d,#22c55e)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  deny: { padding: "8px 14px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#991b1b,#ef4444)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  revoke: { padding: "8px 14px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#c2410c,#f97316)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  historyBtn: { padding: "8px 14px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, background: "transparent", color: "#d1d5db", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  cancelBtn: { padding: "10px 16px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, background: "transparent", color: "#d1d5db", fontWeight: 700, cursor: "pointer" },

  loaderWrap: { height: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  loader: { width: 70, height: 70, border: "6px solid rgba(255,255,255,0.08)", borderTop: "6px solid #dc2626", borderRadius: "50%", animation: "spin 1s linear infinite" },

  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 1000, padding: 20,
  },
  modal: {
    background: "#161616", borderRadius: 20, padding: 26, width: "100%", maxWidth: 460,
    border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto",
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 },
};
