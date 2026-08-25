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
