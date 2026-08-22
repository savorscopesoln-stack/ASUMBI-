import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

/* Shares the single design-token stylesheet (CSS variables on
   :root / [data-theme='dark']) that Dashboard owns, instead of this
   page's old hardcoded dark Tailwind palette. injectDesignTokens() is
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
    .users-card-hover:hover { background: var(--card-elevated) !important; box-shadow: var(--shadow); }
    .users-view-btn:hover { filter: brightness(0.97); }
    @keyframes usersPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
    .users-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: usersPulse 1.4s ease-in-out infinite; }
  `;
  document.head.appendChild(el);
};

export default function Users() {
  const { theme, toggleTheme } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    injectDesignTokens();
  }, []);

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

  const getRoleTone = (role) => {
    switch (role) {
      case "admin":
        return { bg: "var(--destructive-tint)", fg: "var(--destructive)" };
      case "sub_admin":
        return { bg: "var(--warning-tint)", fg: "var(--warning)" };
      case "sub_admin_2":
        return { bg: "var(--primary-tint)", fg: "var(--primary)" };
      case "teacher":
        return { bg: "var(--info-tint)", fg: "var(--info)" };
      default:
        return { bg: "var(--success-tint)", fg: "var(--success)" };
    }
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>👥 Users</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", maxWidth: 420 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username..."
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

      {/* ERROR */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading ? (
        <div style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="users-skeleton" style={styles.skeletonCard} />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.emptyState}>
          No users found
        </div>
      ) : (
        // USER CARDS
        <div style={styles.grid}>
          {filteredUsers.map((user) => {
            const tone = getRoleTone(user.role);
            return (
              <div
                key={user.id}
                className="users-card-hover"
                style={styles.userCard}
              >
                {/* TOP ROW */}
                <div style={styles.userTop}>
                  <div style={styles.username}>
                    {user.username}
                  </div>

                  <span
                    style={{
                      ...styles.roleBadge,
                      background: tone.bg,
                      color: tone.fg,
                    }}
                  >
                    {user.role || "user"}
                  </span>
                </div>

                {/* DETAILS */}
                <div style={styles.details}>
                  <p style={styles.detailLine}>🆔 ID: {user.id}</p>
                  <p style={styles.detailLine}>📧 {user.email || "No email"}</p>
                </div>

                {/* PAGE ACCESS (sub-admins only — admins have full access) */}
                {(user.role === "sub_admin" || user.role === "sub_admin_2") && (
                  <div style={styles.permWrap}>
                    {(Array.isArray(user.permissions) ? user.permissions : []).length > 0 ? (
                      user.permissions.map((p) => (
                        <span key={p} style={styles.permChip}>
                          {p}
                        </span>
                      ))
                    ) : (
                      <span style={styles.permChipWarn}>
                        No pages granted
                      </span>
                    )}
                  </div>
                )}

                {/* FOOTER */}
                <div style={styles.footer}>
                  <button className="users-view-btn" style={styles.viewBtn}>
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= STYLES =================
   All colors reference the shared design-token CSS variables, so this
   page follows the same light/dark palette as Dashboard, Practicum,
   and Meals. */

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 24,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text)" },
  search: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    outline: "none",
    fontSize: 13.5,
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
  errorBanner: {
    background: "var(--destructive-tint)",
    color: "var(--destructive)",
    border: "1px solid var(--destructive)",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    marginBottom: 16,
    fontSize: 13.5,
    fontWeight: 600,
  },
  emptyState: {
    color: "var(--text-muted)",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  skeletonCard: {
    height: 112,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
  },
  userCard: {
    padding: 16,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    boxShadow: "var(--shadow-sm)",
    transition: "background 0.15s ease, box-shadow 0.15s ease",
  },
  userTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  username: { fontSize: 16, fontWeight: 700, color: "var(--text)" },
  roleBadge: {
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  details: { fontSize: 13, color: "var(--text-secondary)" },
  detailLine: { margin: "2px 0" },
  permWrap: { marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 },
  permChip: {
    fontSize: 10.5,
    padding: "3px 9px",
    borderRadius: 999,
    background: "var(--card-elevated)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
  permChipWarn: {
    fontSize: 10.5,
    padding: "3px 9px",
    borderRadius: 999,
    background: "var(--destructive-tint)",
    color: "var(--destructive)",
  },
  footer: { marginTop: 14, display: "flex", justifyContent: "flex-end" },
  viewBtn: {
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--info)",
    background: "var(--info-tint)",
    color: "var(--info)",
    cursor: "pointer",
  },
};