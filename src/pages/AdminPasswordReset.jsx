import React, { useEffect, useMemo, useState } from "react";
import API from "../api";

/* =========================================================
   ADMIN: PASSWORD RESET
   Lets an admin find any account (Users / Students / Teachers)
   and reset its password back to the system default. The account
   is flagged so it's forced to set its own password on next login.
========================================================= */

const TYPES = [
  { key: "users", source: "Users", label: "Users (admin/sub-admin)" },
  { key: "students", source: "Students", label: "Students" },
  { key: "teachers", source: "Teachers", label: "Teachers" },
];

export default function AdminPasswordReset() {
  const [type, setType] = useState("users");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState(null);
  const [result, setResult] = useState(null); // { username, defaultPassword }

  const activeType = TYPES.find((t) => t.key === type);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get(`/records?type=${type}`);
        if (!cancelled) {
          setRecords(Array.isArray(res.data?.records) ? res.data.records : []);
        }
      } catch (err) {
        console.log(err);
        if (!cancelled) setError("Failed to load accounts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [type]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) =>
      (r.username || "").toLowerCase().includes(q) ||
      (r.name || "").toLowerCase().includes(q)
    );
  }, [records, search]);

  const resetPassword = async (record) => {
    const label = record.name ? `${record.name} (${record.username})` : record.username;
    if (!window.confirm(`Reset the password for ${label} to the default? They'll be required to set a new one on next login.`)) {
      return;
    }

    try {
      setResettingId(record.id);
      setError("");
      const res = await API.put("/auth/admin/reset-password", {
        id: record.id,
        source: activeType.source,
      });

      setResult({
        username: res.data.username,
        defaultPassword: res.data.defaultPassword,
      });

      // reflect the flag locally without a full refetch
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, mustChangePassword: true } : r))
      );

    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Reset failed");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070b14] to-[#0b1220] text-white p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🔑 Password Reset</h1>
        <p className="text-white/60 text-sm">
          Reset a forgotten password back to the default. The account will be
          required to choose a new password the next time it logs in.
        </p>
      </div>

      {/* RESULT BANNER */}
      {result && (
        <div className="bg-green-500/15 border border-green-500/30 text-green-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            ✅ Password for <span className="font-semibold">{result.username}</span> reset to{" "}
            <code className="px-2 py-0.5 bg-black/30 rounded">{result.defaultPassword}</code>
            . Share this with them directly — they'll be asked to change it on next login.
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 self-start sm:self-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* TYPE TABS */}
      <div className="flex gap-2 mb-4">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setType(t.key); setSearch(""); }}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              type === t.key
                ? "bg-indigo-500 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or username..."
        className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 outline-none w-full md:w-80 mb-4"
      />

      {/* TABLE */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-white/5 animate-pulse rounded-lg border border-white/10" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-white/60 text-center mt-10">No accounts found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="text-left p-3">Name / Username</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-3">
                    <div className="font-medium">{r.name || r.username}</div>
                    {r.name && <div className="text-white/50 text-xs">{r.username}</div>}
                  </td>
                  <td className="p-3 text-white/70">{r.role || "—"}</td>
                  <td className="p-3">
                    {r.mustChangePassword ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300">
                        Pending password change
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/50">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => resetPassword(r)}
                      disabled={resettingId === r.id}
                      className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {resettingId === r.id ? "Resetting..." : "Reset to default"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
