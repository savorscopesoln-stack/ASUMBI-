import React, { useEffect, useMemo, useState } from "react";
import API from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get("/users");
        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.log(err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // FILTER USERS
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      (u.username || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [users, search]);

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-300";
      case "sub_admin":
        return "bg-amber-500/20 text-amber-300";
      case "teacher":
        return "bg-blue-500/20 text-blue-300";
      default:
        return "bg-green-500/20 text-green-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070b14] to-[#0b1220] text-white p-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">👥 Users</h1>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username..."
          className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 outline-none w-full md:w-64"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 bg-white/5 animate-pulse rounded-xl border border-white/10"
            />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-white/60 text-center mt-10">
          No users found
        </div>
      ) : (
        // USER CARDS
        <div className="grid md:grid-cols-3 gap-4">

          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >

              {/* TOP ROW */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold">
                  {user.username}
                </div>

                <span
                  className={`px-2 py-1 text-xs rounded-full ${getRoleColor(
                    user.role
                  )}`}
                >
                  {user.role || "user"}
                </span>
              </div>

              {/* DETAILS */}
              <div className="text-sm text-white/70 space-y-1">
                <p>🆔 ID: {user.id}</p>
                <p>📧 {user.email || "No email"}</p>
              </div>

              {/* PAGE ACCESS (sub-admins only — admins have full access) */}
              {user.role === "sub_admin" && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Array.isArray(user.permissions) ? user.permissions : []).length > 0 ? (
                    user.permissions.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                      No pages granted
                    </span>
                  )}
                </div>
              )}

              {/* FOOTER */}
              <div className="mt-3 flex justify-end">
                <button className="text-xs px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30">
                  View
                </button>
              </div>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}