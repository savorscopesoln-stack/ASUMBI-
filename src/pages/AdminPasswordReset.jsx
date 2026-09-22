import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

/* =========================================================
   ADMIN: PASSWORD RESET
   Lets an admin find any account (Users / Students / Teachers)
   and reset its password back to the system default. The account
   is flagged so it's forced to set its own password on next login.

   BUGFIX (theme): this page used to be hardcoded to a permanent dark
   navy gradient (`bg-gradient-to-br from-[#070b14] ...`) with plain
   white text, completely ignoring the app's light/dark theme toggle
   (ThemeContext) — so it looked jarringly out of place next to every
   other admin page (Users, Teachers, Students, ...) whenever the app
   was in light mode, which is the default for a new session. Rewritten
   to use the same shared CSS-variable design-token system those pages
   already use (`--bg`, `--card`, `--text`, etc., toggled via
   `[data-theme='dark']` on <html> by ThemeContext) — see Users.jsx's
   own `injectDesignTokens()` for the pattern this follows.
========================================================= */

// Idempotent (guarded by the "dash-tokens" id), so it's safe to call
// again here even if another page already injected the same sheet.
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
    .pwreset-row:hover { background: var(--card-elevated) !important; }
    .pwreset-tab:hover { filter: brightness(0.97); }
    @keyframes pwresetPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
    .pwreset-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: pwresetPulse 1.4s ease-in-out infinite; }
  `;
  document.head.appendChild(el);
};

const TYPES = [
  { key: "users", source: "Users", label: "Users (admin/sub-admin)" },
  { key: "students", source: "Students", label: "Students" },
  { key: "teachers", source: "Teachers", label: "Teachers" },
];

export default function AdminPasswordReset() {
  // Synchronous + idempotent, same as Users.jsx — so the very first
  // paint is already themed, no flash of the old hardcoded palette.
  injectDesignTokens();

  const { theme, toggleTheme } = useTheme();

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
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔑 Password Reset</h1>
          <p style={styles.subtitle}>
            Reset a forgotten password back to the default. The account will be
            required to choose a new password the next time it logs in.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          style={styles.themeToggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </div>

      {/* RESULT BANNER */}
      {result && (
        <div style={styles.resultBanner}>
          <div>
            ✅ Password for <span style={{ fontWeight: 700 }}>{result.username}</span> reset to{" "}
            <code style={styles.codeChip}>{result.defaultPassword}</code>
            . Share this with them directly — they'll be asked to change it on next login.
          </div>
          <button onClick={() => setResult(null)} style={styles.dismissBtn}>
            Dismiss
          </button>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* TYPE TABS */}
      <div style={styles.tabRow}>
        {TYPES.map((t) => (
          <button
            key={t.key}
            className="pwreset-tab"
            onClick={() => { setType(t.key); setSearch(""); }}
            style={type === t.key ? styles.tabActive : styles.tabInactive}
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
        style={styles.search}
      />

      {/* TABLE */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pwreset-skeleton" style={styles.skeletonRow} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>No accounts found</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name / Username</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="pwreset-row" style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name || r.username}</div>
                    {r.name && <div style={styles.subCell}>{r.username}</div>}
                  </td>
                  <td style={{ ...styles.td, color: "var(--text-secondary)" }}>{r.role || "—"}</td>
                  <td style={styles.td}>
                    {r.mustChangePassword ? (
                      <span style={styles.badgeWarn}>Pending password change</span>
                    ) : (
                      <span style={styles.badgeNeutral}>Normal</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button
                      onClick={() => resetPassword(r)}
                      disabled={resettingId === r.id}
                      style={{
                        ...styles.resetBtn,
                        opacity: resettingId === r.id ? 0.5 : 1,
                        cursor: resettingId === r.id ? "default" : "pointer",
                      }}
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

/* ================= STYLES =================
   All colors reference the shared design-token CSS variables, so this
   page follows the same light/dark palette as Users, Dashboard, and
   every other page on the shared "dash-tokens" sheet. */
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text)" },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)", maxWidth: 560 },
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
  resultBanner: {
    background: "var(--success-tint)",
    border: "1px solid var(--success)",
    color: "var(--success)",
    padding: 14,
    borderRadius: "var(--radius)",
    marginBottom: 20,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13.5,
  },
  codeChip: {
    padding: "2px 8px",
    borderRadius: 6,
    background: "var(--card-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "monospace",
  },
  dismissBtn: {
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)",
    cursor: "pointer",
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
  tabRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tabActive: {
    padding: "9px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid var(--primary)",
    background: "var(--primary)",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  tabInactive: {
    padding: "9px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  search: {
    display: "block",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    outline: "none",
    fontSize: 13.5,
    width: "100%",
    maxWidth: 340,
    marginBottom: 18,
  },
  emptyState: { color: "var(--text-muted)", textAlign: "center", marginTop: 40, fontSize: 14 },
  skeletonRow: { height: 56, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--card)",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: {
    textAlign: "left",
    padding: 12,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-muted)",
    background: "var(--card-elevated)",
    borderBottom: "1px solid var(--border)",
  },
  tr: { borderTop: "1px solid var(--border)", transition: "background 0.15s ease" },
  td: { padding: 12, color: "var(--text)", verticalAlign: "middle" },
  subCell: { fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 },
  badgeWarn: {
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    background: "var(--warning-tint)",
    color: "var(--warning)",
    whiteSpace: "nowrap",
  },
  badgeNeutral: {
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    background: "var(--card-elevated)",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  resetBtn: {
    fontSize: 12,
    fontWeight: 700,
    padding: "7px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--destructive)",
    background: "var(--destructive-tint)",
    color: "var(--destructive)",
  },
};
