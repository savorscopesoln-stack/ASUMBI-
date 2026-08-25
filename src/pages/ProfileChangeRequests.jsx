import React, { useEffect, useState } from "react";
import API from "../api";

/* =========================================================
   ADMIN: PROFILE CHANGE REQUESTS
   A student's profile fields (class, gender, email, phone,
   assessment number) can only be edited freely the first time,
   right after their forced password change. Every edit after
   that lands here as a pending request instead of applying
   straight away — approving it copies the requested values onto
   the Students row, rejecting it just closes the request out.
========================================================= */

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const FIELDS = [
  { key: "studentClass", currentKey: "currentClass", label: "Class" },
  { key: "gender", currentKey: "currentGender", label: "Gender" },
  { key: "email", currentKey: "currentEmail", label: "Email" },
  { key: "phone", currentKey: "currentPhone", label: "Phone" },
  { key: "assessmentNumber", currentKey: "currentAssessmentNumber", label: "Assessment No" },
];

export default function ProfileChangeRequests() {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async (status) => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/student/profile-change-requests?status=${status}`);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  const approve = async (id) => {
    if (!window.confirm("Approve this change? It will be applied to the student's record immediately.")) {
      return;
    }
    try {
      setActingId(id);
      setError("");
      await API.put(`/student/profile-change-requests/${id}/approve`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Approval failed");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    try {
      setActingId(id);
      setError("");
      await API.put(`/student/profile-change-requests/${id}/reject`, {
        reason: rejectReason.trim(),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Rejection failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070b14] to-[#0b1220] text-white p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🧾 Profile Change Requests</h1>
        <p className="text-white/60 text-sm">
          A student can only edit their own profile freely the first time. Every
          later change waits here for your approval before it takes effect.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              tab === t.key
                ? "bg-indigo-500 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-lg border border-white/10" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-white/60 text-center mt-10">No {tab} requests</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="font-medium">{r.studentName}</div>
                  <div className="text-white/50 text-xs">
                    Admission No: {r.admissionNo} · Requested{" "}
                    {new Date(r.requested_at).toLocaleString()}
                  </div>
                </div>

                {tab === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={actingId === r.id}
                      className="text-xs px-3 py-1.5 rounded bg-green-500/20 text-green-200 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      {actingId === r.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}
                      disabled={actingId === r.id}
                      className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {tab === "approved" && (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300">
                    Approved by {r.reviewed_by_name || "—"}
                  </span>
                )}

                {tab === "rejected" && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300">
                    Rejected by {r.reviewed_by_name || "—"}
                  </span>
                )}
              </div>

              {tab === "rejected" && r.rejection_reason && (
                <div className="text-white/60 text-xs mb-3">
                  Reason: {r.rejection_reason}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-white/50">
                    <tr>
                      <th className="text-left py-1 pr-4">Field</th>
                      <th className="text-left py-1 pr-4">Current</th>
                      <th className="text-left py-1">Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELDS.map((f) => {
                      const requestedKey = `requested_${f.key}`;
                      const current = r[f.currentKey] || "—";
                      const requested = r[requestedKey] || "—";
                      const changed = (r[f.currentKey] || "") !== (r[requestedKey] || "");
                      return (
                        <tr key={f.key} className="border-t border-white/10">
                          <td className="py-1.5 pr-4 text-white/70">{f.label}</td>
                          <td className="py-1.5 pr-4 text-white/50">{current}</td>
                          <td className={`py-1.5 ${changed ? "text-yellow-300 font-medium" : "text-white/50"}`}>
                            {requested}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rejectingId === r.id && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 outline-none text-sm"
                  />
                  <button
                    onClick={() => reject(r.id)}
                    disabled={actingId === r.id}
                    className="text-xs px-3 py-2 rounded bg-red-500/30 text-red-100 hover:bg-red-500/40 disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ════════════════════════════════
   STYLES — CSS-variable driven, matching Dashboard.jsx's design
   tokens (light/dark theme swap without re-render)
════════════════════════════════ */
const T = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  container: {
    maxWidth: "100%",
    margin: "0 auto",
    padding: "24px 32px 56px",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    flexWrap: "wrap",
    gap: 14,
  },

  backBtn: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    width: 36,
    height: 36,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  pageSub: { margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  themeToggle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 34,
    height: 34,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },

  searchWrap: {
    position: "relative",
    marginBottom: 18,
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    color: "var(--text-muted)",
  },
  search: {
    width: "100%",
    padding: "11px 14px 11px 42px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  filterLabel: {
    color: "var(--text-secondary)",
    fontSize: "12.5px",
    fontWeight: 700,
    marginRight: "2px",
  },
  dropdown: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    padding: "8px 14px",
    borderRadius: "20px",
    color: "var(--text)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    position: "relative",
    userSelect: "none",
  },
  drop: {
    position: "absolute",
    background: "var(--card-elevated)",
    color: "var(--text)",
    padding: "8px",
    borderRadius: "10px",
    top: "calc(100% + 6px)",
    left: 0,
    zIndex: 999,
    boxShadow: "var(--shadow)",
    minWidth: "220px",
    border: "1px solid var(--border)",
  },
  dropScroll: {
    maxHeight: "220px",
    overflowY: "auto",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    color: "var(--text)",
    width: "100%",
    boxSizing: "border-box",
    fontWeight: 500,
  },
  checkbox: {
    accentColor: "var(--primary)",
    width: "15px",
    height: "15px",
    cursor: "pointer",
  },

  actionsToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  actionGroupLeft: { display: "flex", gap: "10px" },
  actionGroupRight: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },

  btnBase: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: "12.5px",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    minHeight: 38,
    boxSizing: "border-box",
  },

  tableWrap: {
    overflowX: "auto",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13.5px", textAlign: "left" },
  th: {
    padding: "12px 16px",
    background: "var(--bg)",
    color: "var(--text-secondary)",
    fontWeight: 800,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid var(--border)",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "12px 16px",
    color: "var(--text)",
    verticalAlign: "middle",
    background: "var(--card)",
  },

  badgeActive: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    backgroundColor: "var(--success-tint)",
    color: "var(--success)",
    fontWeight: "700",
    fontSize: "11px",
    letterSpacing: "0.5px",
  },
  badgeInactive: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    backgroundColor: "var(--destructive-tint)",
    color: "var(--destructive)",
    fontWeight: "700",
    fontSize: "11px",
    letterSpacing: "0.5px",
  },

  inputActive: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: "6px",
    border: "1px solid var(--primary)",
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  tableActionsLayout: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  rowEditBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    backgroundColor: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  rowStatusBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    backgroundColor: "var(--card)",
    color: "var(--primary)",
    border: "1px solid var(--primary)",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  rowSaveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    backgroundColor: "var(--success)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  rowCancelBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    backgroundColor: "var(--text-muted)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  emptyState: {
    padding: "44px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "13.5px",
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
};
