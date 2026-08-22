import React, { useEffect, useState } from "react";
import API from "../api";
import * as XLSX from "xlsx";
import {
  ArrowLeft, Search, ChevronDown, Download, Printer,
  CheckSquare, Square, Pencil, Save, X, Sun, Moon,
  ShieldCheck, ShieldOff, Inbox,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/* ─── design-token stylesheet — shared with Dashboard.jsx so every
   admin page (light/dark, colors, radius, shadows) looks the same.
   Guarded by id so it's only injected into <head> once app-wide. */
const injectStyles = () => {
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

    .dash-icon-btn:hover { background: var(--bg); }
    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }
    .dash-btn-secondary:hover { background: var(--bg) !important; }
    .dash-row:hover { background: var(--primary-tint) !important; }
    .dash-row.selected-row { background: var(--primary-tint) !important; }

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .teachers-toolrow { flex-direction: column; align-items: stretch !important; }
      .teachers-actions { flex-direction: column; align-items: stretch !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ================= TEACHERS PAGE ================= */
export default function Teachers() {
  injectStyles();
  const { theme, toggleTheme } = useTheme();

  const [uploadType] = useState("teachers");

  const [activeData, setActiveData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedRows, setSelectedRows] = useState([]);

  const [statusFilter, setStatusFilter] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState([]);

  const [openFilter, setOpenFilter] = useState(null);

  /* ================= COLUMN VISIBILITY ================= */
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({});

  /* ================= EDIT MODE ================= */
  const [editingRow, setEditingRow] = useState(null);
  const [tempRow, setTempRow] = useState({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pullRecords();

    const handleClick = () => {
      setOpenFilter(null);
      setShowColumnsMenu(false);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  /* ================= FETCH ================= */
  const pullRecords = async () => {
    setLoading(true);
    try {
      const res = await API.get("/records", {
        params: { type: uploadType, page: 1, limit: 500 },
      });

      const data = res.data.records || [];
      setActiveData(data);

      const headers = data.length ? Object.keys(data[0]) : [];
      setPreviewHeaders(headers);

      const init = {};
      headers.forEach((h) => (init[h] = true));
      setColumnVisibility(init);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTO SAVE ================= */
  const autoSave = async (row) => {
    try {
      await API.post("/update-records", {
        type: uploadType,
        data: [row],
      });
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= INLINE EDIT ================= */
  const handleEditClick = (row) => {
    setEditingRow(row.id);
    setTempRow(row);
  };

  const handleSave = async (row) => {
    const updatedRow = { ...row, ...tempRow };

    try {
      await autoSave(updatedRow);

      setActiveData((prev) =>
        prev.map((r) => (r.id === row.id ? updatedRow : r))
      );

      setEditingRow(null);
      setTempRow({});
    } catch (err) {
      console.log(err);
      alert("Update failed");
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setTempRow({});
  };

  /* ================= STATUS ================= */
  const setStatus = async (id, status) => {
    const row = activeData.find((r) => r.id === id);
    if (!row) return;

    const updated = { ...row, status };

    try {
      await autoSave(updated);

      setActiveData((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (err) {
      console.log(err);
      alert("Status update failed");
    }
  };

  /* ================= MASS STATUS ================= */
  const massUpdateStatus = async (status) => {
    const updated = activeData.map((row) => {
      if (!selectedRows.includes(row.id)) return row;
      return { ...row, status };
    });

    setActiveData(updated);

    const changed = updated.filter((r) =>
      selectedRows.includes(r.id)
    );

    await API.post("/update-records", {
      type: uploadType,
      data: changed,
    });
  };

  /* ================= HELPERS ================= */
  const toggleArray = (value, state, setState) => {
    setState(
      state.includes(value)
        ? state.filter((v) => v !== value)
        : [...state, value]
    );
  };

  const toggleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedRows(filteredData().map((r) => r.id));
  };

  const clearSelection = () => setSelectedRows([]);

  /* ================= FILTER ================= */
  const filteredData = () =>
    activeData.filter((row) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        String(row.name || "").toLowerCase().includes(search) ||
        String(row.staffId || "").toLowerCase().includes(search);

      return (
        matchesSearch &&
        (statusFilter.length === 0 ||
          statusFilter.includes(row.status)) &&
        (subjectFilter.length === 0 ||
          subjectFilter.includes(row.subject))
      );
    });

  /* ================= COLUMN CONTROL ================= */
  const toggleColumn = (col) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [col]: !prev[col],
    }));
  };

  const visibleHeaders = previewHeaders.filter(
    (h) => columnVisibility[h] !== false
  );

  /* ================= EXPORT ================= */
  const handleExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, "teachers.xlsx");
  };

  const handlePrint = () => {
    const html = `
      <html>
      <head>
        <title>Teachers Report</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 30px; background-color: #F8FAFC; color: #0B0F19; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #E2E5EA; padding: 10px 14px; font-size: 13px; text-align: left; }
          th { background: #FBEAEC; color: #8B1E2D; font-weight: 700; }
          tr:nth-child(even) { background: #F8FAFC; }
        </style>
      </head>
      <body>
        <h2 style="color: #8B1E2D; font-size: 22px; letter-spacing: 0.5px;">TEACHERS DATABASE REPORT</h2>
        <table>
          <thead>
            <tr>
              ${visibleHeaders.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${filteredData()
              .map(
                (r) => `
                  <tr>
                    ${visibleHeaders
                      .map((h) => `<td>${r[h] ?? ""}</td>`)
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  /* ================= SUBJECTS ================= */
  const subjects = [
    "Mathematics",
    "English",
    "Kiswahili",
    "Science & Technology",
    "Social Studies",
    "CRE",
    "IRE",
    "Biology",
    "Chemistry",
    "Physics",
    "Computer Studies",
    "Business Studies",
    "Agriculture",
    "Music",
    "Art & Design",
    "Educational Psychology",
    "Teaching Practice",
  ];

  return (
    <div style={T.page}>
      <div style={T.container}>

        {/* ── Header ── */}
        <header style={T.pageHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="dash-icon-btn"
              style={T.backBtn}
              onClick={() => window.history.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1 style={T.pageTitle}>Teachers</h1>
              <p style={T.pageSub}>Staff records, subjects and account status</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="dash-icon-btn"
            style={T.themeToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        {/* ── Main panel ── */}
        <section style={T.panel} aria-label="Teachers manager">

          {/* SEARCH */}
          <div style={T.searchWrap}>
            <Search size={16} style={T.searchIcon} />
            <input
              style={T.search}
              placeholder="Search by name or staff ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* FILTERS */}
          <div className="teachers-toolrow" style={T.filterBar}>
            <span style={T.filterLabel}>Filter by:</span>

            {/* SUBJECT */}
            <div
              style={T.dropdown}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === "subject" ? null : "subject");
              }}
            >
              <span>Subject {subjectFilter.length > 0 && `(${subjectFilter.length})`}</span>
              <ChevronDown size={14} />
              {openFilter === "subject" && (
                <div style={T.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={T.dropScroll}>
                    {subjects.map((s) => (
                      <label key={s} style={T.item}>
                        <input
                          type="checkbox"
                          style={T.checkbox}
                          checked={subjectFilter.includes(s)}
                          onChange={() => toggleArray(s, subjectFilter, setSubjectFilter)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STATUS */}
            <div
              style={T.dropdown}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === "status" ? null : "status");
              }}
            >
              <span>Status {statusFilter.length > 0 && `(${statusFilter.length})`}</span>
              <ChevronDown size={14} />
              {openFilter === "status" && (
                <div style={T.drop} onClick={(e) => e.stopPropagation()}>
                  {["active", "inactive"].map((s) => (
                    <label key={s} style={T.item}>
                      <input
                        type="checkbox"
                        style={T.checkbox}
                        checked={statusFilter.includes(s)}
                        onChange={() => toggleArray(s, statusFilter, setStatusFilter)}
                      />
                      <span style={{ textTransform: "capitalize" }}>{s}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN VISIBILITY */}
            <div
              style={T.dropdown}
              onClick={(e) => {
                e.stopPropagation();
                setShowColumnsMenu(!showColumnsMenu);
              }}
            >
              <span>Visible Columns</span>
              <ChevronDown size={14} />
              {showColumnsMenu && (
                <div style={T.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={T.dropScroll}>
                    {previewHeaders.map((col) => (
                      <label key={col} style={T.item}>
                        <input
                          type="checkbox"
                          style={T.checkbox}
                          checked={columnVisibility[col] !== false}
                          onChange={() => toggleColumn(col)}
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="teachers-actions" style={T.actionsToolbar}>
            <div style={T.actionGroupLeft}>
              <SecondaryBtn onClick={selectAll} Icon={CheckSquare}>Select All</SecondaryBtn>
              <SecondaryBtn onClick={clearSelection} Icon={Square}>Clear</SecondaryBtn>
            </div>

            <div style={T.actionGroupRight}>
              <SecondaryBtn onClick={handleExcel} Icon={Download}>Export Excel</SecondaryBtn>
              <SecondaryBtn onClick={handlePrint} Icon={Printer}>Print Report</SecondaryBtn>
              <PrimaryBtn onClick={() => massUpdateStatus("active")} Icon={ShieldCheck}>Activate</PrimaryBtn>
              <DestructiveBtn onClick={() => massUpdateStatus("inactive")} Icon={ShieldOff}>Deactivate</DestructiveBtn>
            </div>
          </div>

          {/* TABLE */}
          <div style={T.tableWrap}>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="dash-skeleton" style={{ height: 20, background: "var(--border)", borderRadius: 8 }} />
                ))}
              </div>
            ) : (
              <table style={T.table}>
                <thead>
                  <tr>
                    <th style={{ ...T.th, textAlign: "center", width: "56px" }}>Select</th>
                    {visibleHeaders.map((h) => (
                      <th key={h} style={T.th}>{h}</th>
                    ))}
                    <th style={{ ...T.th, textAlign: "center", width: "220px" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData().map((row) => {
                    const isEditing = editingRow === row.id;
                    const isChecked = selectedRows.includes(row.id);

                    return (
                      <tr
                        key={row.id}
                        className="dash-row"
                        style={{
                          ...T.tr,
                          backgroundColor: isChecked ? "var(--primary-tint)" : "transparent",
                        }}
                      >
                        {/* SELECT */}
                        <td style={{ ...T.td, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            style={T.checkbox}
                            checked={isChecked}
                            onChange={() => toggleSelectRow(row.id)}
                          />
                        </td>

                        {/* DATA CELLS */}
                        {visibleHeaders.map((h) => {
                          const isStatusField = h.toLowerCase() === "status";
                          const cellValue = row[h];

                          return (
                            <td key={h} style={T.td}>
                              {isEditing ? (
                                <input
                                  value={tempRow[h] ?? cellValue ?? ""}
                                  onChange={(e) =>
                                    setTempRow({
                                      ...tempRow,
                                      [h]: e.target.value,
                                    })
                                  }
                                  style={T.inputActive}
                                />
                              ) : isStatusField ? (
                                <span
                                  style={
                                    String(cellValue).toLowerCase() === "active"
                                      ? T.badgeActive
                                      : T.badgeInactive
                                  }
                                >
                                  {cellValue ? String(cellValue).toUpperCase() : "—"}
                                </span>
                              ) : (
                                <span>{cellValue ?? "—"}</span>
                              )}
                            </td>
                          );
                        })}

                        {/* ROW ACTIONS */}
                        <td style={{ ...T.td, textAlign: "center" }}>
                          <div style={T.tableActionsLayout}>
                            {isEditing ? (
                              <>
                                <button style={T.rowSaveBtn} onClick={() => handleSave(row)}>
                                  <Save size={13} /> Save
                                </button>
                                <button style={T.rowCancelBtn} onClick={handleCancel}>
                                  <X size={13} /> Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button style={T.rowEditBtn} onClick={() => handleEditClick(row)}>
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  style={T.rowStatusBtn}
                                  onClick={() =>
                                    setStatus(
                                      row.id,
                                      String(row.status).toLowerCase() === "active" ? "inactive" : "active"
                                    )
                                  }
                                >
                                  {String(row.status).toLowerCase() === "active" ? (
                                    <>
                                      <ShieldOff size={13} /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck size={13} /> Activate
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && filteredData().length === 0 && (
              <div style={T.emptyState}>
                <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div>No matching teacher profiles found.</div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── button helpers (Primary / Secondary / Destructive) — same
   hierarchy as Dashboard.jsx's PrimaryBtn/SecondaryBtn/DestructiveBtn ── */
function PrimaryBtn({ children, onClick, disabled = false, Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="dash-btn"
      style={{
        ...T.btnBase,
        background: "var(--success)",
        color: "#fff",
        border: "1px solid var(--success)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {Icon && <Icon size={14} strokeWidth={2.5} />}
      {children}
    </button>
  );
}
function SecondaryBtn({ children, onClick, disabled = false, Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="dash-btn dash-btn-secondary"
      style={{
        ...T.btnBase,
        background: "var(--card)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {Icon && <Icon size={14} strokeWidth={2.5} />}
      {children}
    </button>
  );
}
function DestructiveBtn({ children, onClick, disabled = false, Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="dash-btn"
      style={{
        ...T.btnBase,
        background: "var(--destructive)",
        color: "#fff",
        border: "1px solid var(--destructive)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {Icon && <Icon size={14} strokeWidth={2.5} />}
      {children}
    </button>
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
