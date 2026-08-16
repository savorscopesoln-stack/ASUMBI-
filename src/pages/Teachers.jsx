import React, { useEffect, useState } from "react";
import API from "../api";
import * as XLSX from "xlsx";

/* ================= TEACHERS PAGE ================= */
export default function Teachers() {
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
        String(row.name || "").toLowerCase().includes(search);

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
          body { font-family: -apple-system, sans-serif; padding: 30px; background-color: #161920; color: #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #3a3f4d; padding: 10px 14px; font-size: 13px; text-align: left; }
          th { background: #1f232e; color: #cbb494; font-weight: 600; }
          tr:nth-child(even) { background: #1a1e27; }
        </style>
      </head>
      <body>
        <h2 style="color: #cbb494; font-size: 22px; letter-spacing: 0.5px;">TEACHERS DATABASE REPORT</h2>
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
                      .map((h) => `<td>${r[h] || ""}</td>`)
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
    "Teaching Practice"
  ];

  return (
    <div style={styles.page}>
      <div style={styles.appContainer}>
        
        {/* HEADER SECTION */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => window.history.back()}>
            ← Back
          </button>
          <h2 style={styles.title}>
            Teachers Database <span style={styles.titleDivider}>|</span> <span style={styles.titleSub}>Management Suite</span>
          </h2>
        </div>

        {/* SEARCH BAR INPUT */}
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.search}
            placeholder="Search by Name, Employee ID, or Keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FILTER GROUP SELECTORS */}
        <div style={styles.filterBar}>
          <span style={styles.filterLabel}>Filter by:</span>

          {/* SUBJECT DROPDOWN */}
          <div style={styles.dropdown} onClick={(e) => {
            e.stopPropagation();
            setOpenFilter(openFilter === "subject" ? null : "subject");
          }}>
            <span>Subject {subjectFilter.length > 0 && `(${subjectFilter.length})`}</span>
            <span style={styles.arrow}>▾</span>
            {openFilter === "subject" && (
              <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropScroll}>
                  {subjects.map((s) => (
                    <label key={s} style={styles.item}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
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

          {/* STATUS DROPDOWN */}
          <div style={styles.dropdown} onClick={(e) => {
            e.stopPropagation();
            setOpenFilter(openFilter === "status" ? null : "status");
          }}>
            <span>Status {statusFilter.length > 0 && `(${statusFilter.length})`}</span>
            <span style={styles.arrow}>▾</span>
            {openFilter === "status" && (
              <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                {["active", "inactive"].map((s) => (
                  <label key={s} style={styles.item}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={statusFilter.includes(s)}
                      onChange={() => toggleArray(s, statusFilter, setStatusFilter)}
                    />
                    <span style={{ textTransform: "capitalize" }}>{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* COLUMN VISIBILITY DROPDOWN */}
          <div style={styles.dropdown} onClick={(e) => {
            e.stopPropagation();
            setShowColumnsMenu(!showColumnsMenu);
          }}>
            <span>Visible Columns</span>
            <span style={styles.arrow}>▾</span>
            {showColumnsMenu && (
              <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropScroll}>
                  {previewHeaders.map((col) => (
                    <label key={col} style={styles.item}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
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

        {/* ACTION AND CONTROLS UTILITY TOOLBAR */}
        <div style={styles.actionsToolbar}>
          <div style={styles.actionGroupLeft}>
            <button style={styles.btnGoldSelect} onClick={selectAll}>✓ SELECT ALL</button>
            <button style={styles.btnSecondary} onClick={clearSelection}>✕ CLEAR</button>
          </div>
          
          <div style={styles.actionGroupRight}>
            <button style={styles.btnGreen} onClick={handleExcel}>⤓ EXPORT EXCEL</button>
            <button style={styles.btnSecondary} onClick={handlePrint}>🖨 PRINT REPORT</button>
            <button style={styles.btnActiveMass} onClick={() => massUpdateStatus("active")}>✓ ACTIVATE</button>
            <button style={styles.btnInactiveMass} onClick={() => massUpdateStatus("inactive")}>⊘ DEACTIVATE</button>
          </div>
        </div>

        {/* INTERACTIVE DATA TABLE */}
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: "center", width: "70px" }}>Select</th>
                {visibleHeaders.map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
                <th style={{ ...styles.th, textAlign: "center", width: "240px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredData().map((row) => {
                const isEditing = editingRow === row.id;
                const isChecked = selectedRows.includes(row.id);

                return (
                  <tr key={row.id} style={{ ...styles.tr, backgroundColor: isChecked ? "#212633" : "transparent" }}>
                    
                    {/* SELECTION CELL */}
                    <td style={{ textAlign: "center", padding: "14px 10px" }}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={isChecked}
                        onChange={() => toggleSelectRow(row.id)}
                      />
                    </td>

                    {/* DYNAMIC FIELD DATA CELLS */}
                    {visibleHeaders.map((h) => {
                      const isStatusField = h.toLowerCase() === "status";
                      const cellValue = row[h];
                      
                      return (
                        <td key={h} style={styles.td}>
                          {isEditing ? (
                            <input
                              value={tempRow[h] ?? cellValue ?? ""}
                              onChange={(e) =>
                                setTempRow({
                                  ...tempRow,
                                  [h]: e.target.value,
                                })
                              }
                              style={styles.inputActive}
                            />
                          ) : (
                            isStatusField ? (
                              <span style={String(cellValue).toLowerCase() === "active" ? styles.badgeActive : styles.badgeInactive}>
                                {String(cellValue).toUpperCase()}
                              </span>
                            ) : (
                              <span style={styles.cellText}>{cellValue || "—"}</span>
                            )
                          )}
                        </td>
                      );
                    })}

                    {/* ROW CONTROLS CELL */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={styles.tableActionsLayout}>
                        {isEditing ? (
                          <>
                            <button style={styles.rowSaveBtn} onClick={() => handleSave(row)}>Save</button>
                            <button style={styles.rowCancelBtn} onClick={handleCancel}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button style={styles.rowEditBtn} onClick={() => handleEditClick(row)}>✏ Edit</button>
                            <button style={styles.rowStatusBtn} onClick={() => setStatus(row.id, "active")}>🛈 Status</button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredData().length === 0 && (
            <div style={styles.emptyState}>No matching teacher profiles found.</div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ================= THEMED DESIGN COMPONENT STYLES ================= */
const styles = {
  page: {
    padding: "3px 2px",
    minHeight: "100vh",
    backgroundColor: "#11141c", // High-fidelity dark layout body background
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#e2e8f0",
  },

  appContainer: {
    maxWidth: "98%",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    marginBottom: "24px",
  },

  backBtn: {
    padding: "8px 16px",
    background: "transparent",
    color: "#94a3b8",
    borderRadius: "6px",
    border: "1px solid #2e3545",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.2s",
  },

  title: {
    color: "#cbb494", // Premium champagne gold headings
    fontSize: "26px",
    fontWeight: "600",
    margin: 0,
    letterSpacing: "0.5px",
  },

  titleDivider: {
    color: "#2e3545",
    margin: "0 10px",
    fontWeight: "300",
  },

  titleSub: {
    color: "#ffffff",
    fontWeight: "400",
    fontSize: "24px",
  },

  searchWrap: {
    position: "relative",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
  },

  searchIcon: {
    position: "absolute",
    left: "18px",
    fontSize: "16px",
    color: "#64748b",
  },

  search: {
    width: "100%",
    padding: "14px 16px 14px 48px",
    borderRadius: "30px", // Fully pill-shaped search input matching the layout sample
    border: "1px solid #cbb494",
    backgroundColor: "transparent",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },

  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },

  filterLabel: {
    color: "#94a3b8",
    fontSize: "14px",
    marginRight: "4px",
  },

  dropdown: {
    background: "transparent",
    border: "1px solid #cbb494",
    padding: "8px 18px",
    borderRadius: "20px",
    color: "#cbb494",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    position: "relative",
    userSelect: "none",
  },

  arrow: {
    color: "#cbb494",
    fontSize: "12px",
  },

  drop: {
    position: "absolute",
    background: "#1a1f2c",
    color: "#e2e8f0",
    padding: "10px",
    borderRadius: "8px",
    top: "calc(100% + 6px)",
    left: 0,
    zIndex: 999,
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
    minWidth: "220px",
    border: "1px solid #3a4257",
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
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#cbd5e1",
    width: "100%",
    boxSizing: "border-box",
  },

  checkbox: {
    accentColor: "#cbb494",
    width: "15px",
    height: "15px",
    cursor: "pointer",
  },

  actionsToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  actionGroupLeft: {
    display: "flex",
    gap: "12px",
  },

  actionGroupRight: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },

  /* Button Architectures */
  btnGoldSelect: {
    backgroundColor: "#cbb494",
    color: "#11141c",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    letterSpacing: "0.3px",
  },

  btnSecondary: {
    backgroundColor: "#222733",
    color: "#cbd5e1",
    padding: "10px 18px",
    border: "1px solid #3a4257",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },

  btnGreen: {
    backgroundColor: "#0d6e46",
    color: "#ffffff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },

  btnActiveMass: {
    backgroundColor: "#115e42",
    color: "#ffffff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },

  btnInactiveMass: {
    backgroundColor: "#7f1d1d",
    color: "#ffffff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },

  tableCard: {
    background: "#161a24",
    borderRadius: "12px",
    border: "1px solid #cbb494", // Outer gold borders mapping directly to sample file
    overflowX: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    textAlign: "left",
  },

  th: {
    background: "#11141c",
    color: "#cbb494",
    padding: "14px 16px",
    fontWeight: "500",
    fontSize: "13px",
    borderBottom: "1px solid #cbb494",
    textTransform: "capitalize",
  },

  tr: {
    borderBottom: "1px solid #2e3545",
    transition: "background-color 0.15s ease",
  },

  td: {
    padding: "14px 16px",
    color: "#e2e8f0",
    verticalAlign: "middle",
  },

  cellText: {
    fontSize: "14px",
  },

  /* Badges for System Status Grid */
  badgeActive: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    color: "#34d399",
    fontWeight: "600",
    fontSize: "11px",
    letterSpacing: "0.5px",
    border: "1px solid rgba(16, 185, 129, 0.2)",
  },

  badgeInactive: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#f87171",
    fontWeight: "600",
    fontSize: "11px",
    letterSpacing: "0.5px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },

  /* Row Editing Control Overrides */
  inputActive: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #cbb494",
    backgroundColor: "#11141c",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },

  tableActionsLayout: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    alignItems: "center",
  },

  rowEditBtn: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    color: "#e2e8f0",
    border: "1px solid #4a546e",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
  },

  rowStatusBtn: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    color: "#cbb494",
    border: "1px solid #cbb494",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
  },

  rowSaveBtn: {
    padding: "6px 12px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
  },

  rowCancelBtn: {
    padding: "6px 12px",
    backgroundColor: "#475569",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
  },

  emptyState: {
    padding: "48px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
  },
};