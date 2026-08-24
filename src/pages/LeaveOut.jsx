import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { getStoredUser } from "../permissions";
import { useTheme } from "../context/ThemeContext";

/* Shares the single design-token stylesheet (CSS variables on
   :root / [data-theme='dark']) that Dashboard owns, instead of this
   page's old hardcoded dark maroon palette. injectDesignTokens() is
   idempotent (guarded by the "dash-tokens" id) so it's safe to call
   again here in case this page is the first one mounted. */
const injectDesignTokens = () => {
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
    @keyframes leaveSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(el);
};

const LEAVE_TYPE_LABELS = {
  short_stay: "Short Stay",
  long: "Long-Stay",
  emergency: "Emergency",
};

const LEAVE_TYPE_COLOR = (t) => {
  if (t === "emergency") return "var(--destructive)";
  if (t === "long") return "var(--info)";
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
  if (s === "approved" || s === "admin_granted") return "var(--success)";
  if (s === "rejected" || s === "denied") return "var(--destructive)";
  if (s === "cancelled") return "var(--text-muted)";
  if (s === "expired") return "var(--text-muted)";
  if (s === "revoked") return "var(--text-secondary)";
  return "var(--warning)"; // any pending_* stage
};

const PENDING_STATUSES = ["pending", "pending_subadmin2", "pending_final", "pending_admin"];

const DURATION_OPTIONS = [
  { value: 60, label: "1 Hour" },
  { value: 120, label: "2 Hours" },
  { value: 360, label: "6 Hours" },
  { value: 720, label: "12 Hours" },
  { value: 1440, label: "1 Day" },
  { value: 2880, label: "2 Days" },
  { value: 4320, label: "3 Days" },
  { value: 7200, label: "5 Days" },
];

/* Turns an array of plain objects into a downloadable CSV file. Kept
   dependency-free (no CSV library) since this is a one-off export
   button, not a recurring data-grid feature. */
const downloadCsv = (filename, rows, columns) => {
  const escape = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(c.get(row))).join(",")).join("\n");
  const csv = `${header}\n${body}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function LeaveOutAdmin() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    injectDesignTokens();
  }, []);

  const user = getStoredUser();
  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isSubAdmin1 = role === "sub_admin";

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
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [duration, setDuration] = useState(120);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(isSubAdmin2 ? "emergency" : "all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [rejectModal, setRejectModal] = useState(null); // { id, reason }
  const [grantModal, setGrantModal] = useState(null); // form state while open
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Per-row code entry for Sub-Admin 1's unlock gate — keyed by leave id
  // so multiple locked rows can each hold their own in-progress code.
  const [codeInputs, setCodeInputs] = useState({});
  const [unlockingId, setUnlockingId] = useState(null);
  const [unlockError, setUnlockError] = useState({});

  /* ================= LOAD ================= */
  useEffect(() => {
    instantLoad();
  }, []);

  const instantLoad = async () => {
    try {
      setLoading(true);
      // Sub-Admin 2 never sees analytics/counters, so don't even fetch
      // them — one less thing the backend has to reject.
      await Promise.all([
        loadLeaves(),
        ...(isSubAdmin2 ? [] : [loadAnalytics()]),
        loadStudents(),
        loadApprovedLeaves(),
      ]);
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

  const loadApprovedLeaves = async () => {
    try {
      const res = await API.get("/leave-outs/approved");
      setApprovedLeaves(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // Reload after any action. Skips analytics entirely for Sub-Admin 2.
  const refresh = async () =>
    Promise.all([loadLeaves(), ...(isSubAdmin2 ? [] : [loadAnalytics()]), loadApprovedLeaves()]);

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

  /* ================= UNLOCK (Sub-Admin 1 code gate) =================
     A locked row (l.locked === true, only ever set for Sub-Admin 1)
     has no `reason` from the API and can't be approved/rejected until
     this succeeds. The student hands Sub-Admin 1 the code they were
     shown at submission time — this is the one place that code gets
     typed in. */
  const unlockLeave = async (l) => {
    const code = (codeInputs[l.id] || "").trim();
    if (!code) return;

    setUnlockingId(l.id);
    setUnlockError((prev) => ({ ...prev, [l.id]: "" }));
    try {
      await API.put(`/leave-outs/${l.id}/verify-code`, { code });
      setCodeInputs((prev) => ({ ...prev, [l.id]: "" }));
      await refresh();
    } catch (err) {
      setUnlockError((prev) => ({ ...prev, [l.id]: err?.response?.data?.message || "Incorrect code" }));
    } finally {
      setUnlockingId(null);
    }
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

  const exportApprovedCsv = () => {
    downloadCsv(
      `approved-leaves-${new Date().toISOString().slice(0, 10)}.csv`,
      approvedLeaves,
      [
        { label: "Student", get: (r) => r.student_name || `Student ${r.student_id}` },
        { label: "Admission No", get: (r) => r.admissionNo || "" },
        { label: "Class", get: (r) => r.studentClass || "" },
        { label: "Leave Type", get: (r) => leaveTypeLabel(r.leave_type) },
        { label: "Reason", get: (r) => r.reason || "" },
        { label: "Status", get: (r) => statusLabel(r.status) },
        { label: "Gate Code", get: (r) => r.gate_code || "" },
        { label: "Approved At", get: (r) => (r.approved_at ? new Date(r.approved_at).toLocaleString() : "") },
        { label: "Approved By", get: (r) => r.final_approver_name || r.granted_by_name || "" },
        { label: "Exit Time", get: (r) => (r.exit_time ? new Date(r.exit_time).toLocaleString() : "") },
        { label: "Reentry Time", get: (r) => (r.reentry_time ? new Date(r.reentry_time).toLocaleString() : "") },
      ]
    );
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
      // A locked row has no reason to search by anyway — student name/
      // admission no. still works fine since those come from the
      // /students list on the frontend, not the redacted API row.
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
            {isSubAdmin1 && (
              <p style={{ ...styles.subtitle, marginTop: 4, color: "var(--primary)" }}>
                🔒 New requests are locked until you enter the code the student gives you.
              </p>
            )}
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
            <button
              onClick={toggleTheme}
              style={styles.themeToggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loaderWrap}>
            <div style={styles.loader}></div>
            <p style={{ marginTop: 20, color: "var(--text-secondary)" }}>Loading Leave Dashboard...</p>
          </div>
        ) : (
          <>
            {/* ================= TOP GRID ================= */}
            <div style={isSubAdmin2 ? styles.topGridSingle : styles.topGrid}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardHeaderTitle}>⚙️ Approval Settings</h3>
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
                  <h3 style={styles.cardHeaderTitle}>📊 Leave Analytics</h3>
                </div>

                <div style={styles.analyticsGrid}>
                  {analytics.map((a) => (
                    <div key={a.student_id} style={styles.analyticsCard}>
                      <h4 style={styles.analyticsName}>{getStudentName(a.student_id)}</h4>
                      <div style={styles.analyticsRow}><span>Total</span><strong>{a.totalLeaves}</strong></div>
                      <div style={styles.analyticsRow}><span style={{ color: "var(--success)" }}>Approved</span><strong>{a.approvedLeaves}</strong></div>
                      <div style={styles.analyticsRow}><span style={{ color: "var(--warning)" }}>Pending</span><strong>{a.pendingLeaves}</strong></div>
                      <div style={styles.analyticsRow}><span style={{ color: "var(--destructive)" }}>Rejected</span><strong>{a.deniedLeaves}</strong></div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* ================= APPROVED LEAVES (report + download) ================= */}
            <div style={{ ...styles.card, marginBottom: 24 }}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardHeaderTitle}>✅ Approved Leave Records</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={styles.badge}>{approvedLeaves.length} Records</div>
                  <button onClick={exportApprovedCsv} disabled={!approvedLeaves.length} style={styles.downloadBtn}>
                    ⬇ Download CSV
                  </button>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Approved</th>
                      <th style={styles.th}>By</th>
                      <th style={styles.th}>Gate Code</th>
                      <th style={styles.th}>Exit / Re-entry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedLeaves.length === 0 && (
                      <tr><td colSpan={6} style={styles.emptyCell}>No approved leaves yet.</td></tr>
                    )}
                    {approvedLeaves.map((l) => (
                      <tr key={l.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.studentName}>{l.student_name || getStudentName(l.student_id)}</div>
                          <div style={styles.studentId}>{l.admissionNo || `ID ${l.student_id}`}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.typeBadge, color: LEAVE_TYPE_COLOR(l.leave_type), border: `1px solid ${LEAVE_TYPE_COLOR(l.leave_type)}` }}>
                            {leaveTypeLabel(l.leave_type)}
                          </span>
                        </td>
                        <td style={styles.td}>{l.approved_at ? new Date(l.approved_at).toLocaleString() : "—"}</td>
                        <td style={styles.td}>{l.final_approver_name || l.granted_by_name || "—"}</td>
                        <td style={{ ...styles.td, fontFamily: "monospace", fontWeight: 700 }}>{l.gate_code || "—"}</td>
                        <td style={styles.td}>
                          {l.exit_time ? new Date(l.exit_time).toLocaleTimeString() : "—"}
                          {" → "}
                          {l.reentry_time ? new Date(l.reentry_time).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ================= REQUESTS TABLE ================= */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardHeaderTitle}>📋 {isSubAdmin2 ? "Emergency Leave Requests" : "Leave Requests"}</h3>
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
                          <td style={{ ...styles.td, maxWidth: 220 }}>
                            {l.locked ? (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>🔒 Locked — enter code to view</span>
                            ) : (
                              l.reason || "—"
                            )}
                          </td>
                          <td style={styles.td}>{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.status, color: STATUS_COLOR(l.status), border: `1px solid ${STATUS_COLOR(l.status)}` }}>
                              {statusLabel(l.status)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {l.locked ? (
                              <div style={styles.unlockRow}>
                                <input
                                  placeholder="Enter code"
                                  value={codeInputs[l.id] || ""}
                                  onChange={(e) => setCodeInputs((prev) => ({ ...prev, [l.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") unlockLeave(l); }}
                                  style={styles.unlockInput}
                                  maxLength={12}
                                />
                                <button
                                  onClick={() => unlockLeave(l)}
                                  disabled={unlockingId === l.id || !(codeInputs[l.id] || "").trim()}
                                  style={styles.unlockBtn}
                                >
                                  🔓 Unlock
                                </button>
                                {unlockError[l.id] && (
                                  <div style={styles.unlockError}>{unlockError[l.id]}</div>
                                )}
                              </div>
                            ) : (
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
                            )}
                          </td>
                        </tr>

                        {expandedId === l.id && !l.locked && (
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
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>Reject Leave Request</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>
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
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>⚡ Force Give Leave</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>
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
  if (l.code_verified_by_name) {
    rows.push({ label: "Code Verified (Sub-Admin 1)", who: l.code_verified_by_name, when: fmt(l.code_verified_at) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 4px" }}>
      {l.deny_reason && l.status === "rejected" && (
        <div style={{ color: "var(--destructive)", fontSize: 13 }}>Reason: {l.deny_reason}</div>
      )}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: r.bad ? "var(--destructive)" : "var(--text-secondary)", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          <span><strong>{r.label}</strong> — {r.who}</span>
          <span style={{ color: "var(--text-muted)" }}>{r.when || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ================= STYLES =================
   All colors reference the shared design-token CSS variables, so this
   page follows the same light/dark palette as Dashboard, Practicum,
   Meals, and Users. */

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', sans-serif",
  },
  main: { flex: 1, padding: 35, maxWidth: "100%", overflowX: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, flexWrap: "wrap", gap: 20 },
  title: { margin: 0, fontSize: 30, fontWeight: 800, color: "var(--text)" },
  subtitle: { marginTop: 8, color: "var(--text-secondary)", fontSize: 14 },
  backBtn: {
    marginTop: 14, padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", cursor: "pointer", fontWeight: 700,
    color: "var(--text)", background: "var(--card)",
    display: "flex", alignItems: "center", gap: 8,
  },
  headerRight: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  forceGrantBtn: {
    padding: "12px 18px", borderRadius: "var(--radius-sm)", border: "1px solid var(--warning)", cursor: "pointer", fontWeight: 700, color: "#111",
    background: "var(--warning-tint)", boxShadow: "var(--shadow-sm)",
  },
  search: {
    width: 260, padding: 11, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", outline: "none", fontSize: 13.5,
  },
  themeToggle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 38,
    height: 38,
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 15,
    flexShrink: 0,
  },
  topGrid: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 24 },
  topGridSingle: { display: "grid", gridTemplateColumns: "1fr", gap: 20, marginBottom: 24, maxWidth: 480 },
  card: {
    background: "var(--card)", borderRadius: "var(--radius)", padding: 22,
    border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 },
  cardHeaderTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },
  badge: { background: "var(--primary-tint)", color: "var(--primary)", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  downloadBtn: {
    padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--success)", cursor: "pointer",
    fontWeight: 700, fontSize: 12.5, color: "var(--success)", background: "var(--success-tint)",
  },
  field: { marginBottom: 16 },
  label: { display: "block", marginBottom: 6, color: "var(--text-secondary)", fontSize: 12, fontWeight: 700 },
  input: {
    width: "100%", padding: 11, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", outline: "none", fontSize: 13.5, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", minHeight: 90, padding: 11, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", outline: "none", resize: "vertical", fontSize: 13.5, boxSizing: "border-box",
  },
  analyticsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 },
  analyticsCard: { background: "var(--card-elevated)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" },
  analyticsName: { marginTop: 0, marginBottom: 14, fontSize: 15, fontWeight: 700, color: "var(--text)" },
  analyticsRow: { display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--text-secondary)", fontSize: 13.5 },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 780 },
  th: { textAlign: "left", padding: "10px 10px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "13px 10px", fontSize: 13.5, verticalAlign: "top", color: "var(--text)" },
  emptyCell: { padding: "30px 10px", textAlign: "center", color: "var(--text-muted)" },
  historyCell: { padding: "6px 14px 16px", background: "var(--card-elevated)" },

  studentName: { fontWeight: 700, fontSize: 14, color: "var(--text)" },
  studentId: { color: "var(--text-muted)", fontSize: 12, marginTop: 2 },
  typeBadge: { display: "inline-block", padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" },
  grantedTag: { marginTop: 4, fontSize: 10.5, color: "var(--warning)", fontWeight: 700 },
  status: { padding: "6px 12px", borderRadius: 999, textTransform: "uppercase", fontWeight: 700, fontSize: 11, background: "var(--card-elevated)", whiteSpace: "nowrap" },

  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  approve: { padding: "8px 14px", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", background: "var(--success)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  deny: { padding: "8px 14px", border: "1px solid var(--destructive)", borderRadius: "var(--radius-sm)", background: "var(--destructive)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  revoke: { padding: "8px 14px", border: "1px solid var(--warning)", borderRadius: "var(--radius-sm)", background: "var(--warning)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  historyBtn: { padding: "8px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer", fontSize: 12.5 },
  cancelBtn: { padding: "10px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" },

  unlockRow: { display: "flex", flexDirection: "column", gap: 6, minWidth: 170 },
  unlockInput: {
    padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary)",
    background: "var(--bg)", color: "var(--text)", outline: "none", fontSize: 13, fontFamily: "monospace",
    letterSpacing: 1, boxSizing: "border-box",
  },
  unlockBtn: {
    padding: "8px 14px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)",
    color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5,
  },
  unlockError: { color: "var(--destructive)", fontSize: 11.5, fontWeight: 600 },

  loaderWrap: { height: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  loader: { width: 60, height: 60, border: "5px solid var(--border)", borderTop: "5px solid var(--primary)", borderRadius: "50%", animation: "leaveSpin 1s linear infinite" },

  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(10,10,10,0.5)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 1000, padding: 20,
  },
  modal: {
    background: "var(--card)", borderRadius: "var(--radius)", padding: 24, width: "100%", maxWidth: 460,
    border: "1px solid var(--border)", boxShadow: "var(--shadow)", maxHeight: "90vh", overflowY: "auto",
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 },
};