import React, { useEffect, useState } from "react";
import API from "../api";
import * as XLSX from "xlsx";

/* ================= STUDENTS PAGE ================= */
export default function Students() {
  const [uploadType] = useState("students");

  const [activeData, setActiveData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedRows, setSelectedRows] = useState([]);

  const [yearFilter, setYearFilter] = useState([]);
  const [genderFilter, setGenderFilter] = useState([]);
  const [streamFilter, setStreamFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);

  const [openFilter, setOpenFilter] = useState(null);

  /* ================= COLUMN VISIBILITY ================= */
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({});

  /* ================= EDIT STATES ================= */
  const [editingRow, setEditingRow] = useState(null);
  const [tempRow, setTempRow] = useState({});

  useEffect(() => {
    pullRecords();

    const handleClickOutside = () => {
      setOpenFilter(null);
      setShowColumnsMenu(false);
    };

    window.addEventListener("click", handleClickOutside);

    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  /* ================= LOAD ================= */
  const pullRecords = async () => {
    try {
      const res = await API.get("/records", {
        params: { type: uploadType, page: 1, limit: 500 },
      });

      const data = res.data.records || [];

      setActiveData(data);

      const headers = data.length ? Object.keys(data[0]) : [];

      setPreviewHeaders(headers);

      const visibilityInit = {};

      headers.forEach((h) => {
        visibilityInit[h] = true;
      });

      setColumnVisibility(visibilityInit);

    } catch (err) {
      console.log(err);
    }
  };

  /* ================= SAVE ================= */
  const autoSaveRecord = async (updatedRow) => {
    return await API.post("/update-records", {
      type: uploadType,
      data: [updatedRow],
    });
  };

  /* ================= STATUS ================= */
  const setStatus = async (id, status) => {
    const row = activeData.find((r) => r.id === id);

    if (!row) return;

    const updatedRow = {
      ...row,
      status,
    };

    try {
      await autoSaveRecord(updatedRow);

      setActiveData((prev) =>
        prev.map((r) =>
          r.id === id ? updatedRow : r
        )
      );

    } catch (err) {
      console.log(err);
      alert("Status update failed");
    }
  };

  /* ================= SELECT ================= */
  const toggleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    setSelectedRows(filteredData().map((r) => r.id));
  };

  const clearSelection = () => setSelectedRows([]);

  /* ================= MASS STATUS ================= */
  const massUpdateStatus = async (status) => {
    try {

      const updated = activeData.map((row) => {
        if (!selectedRows.includes(row.id)) return row;

        return {
          ...row,
          status,
        };
      });

      setActiveData(updated);

      const changedRows = updated.filter((r) =>
        selectedRows.includes(r.id)
      );

      await API.post("/update-records", {
        type: uploadType,
        data: changedRows,
      });

      alert("Updated successfully");

    } catch (err) {
      console.log(err);
      alert("Mass update failed");
    }
  };

  /* ================= FILTER ================= */
  const filteredData = () =>
    activeData.filter((row) => {

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        String(row.name || "")
          .toLowerCase()
          .includes(search) ||
        String(row.admissionNo || "")
          .toLowerCase()
          .includes(search);

      return (
        matchesSearch &&
        (yearFilter.length === 0 ||
          yearFilter.includes(String(row.yearOfStudy))) &&
        (genderFilter.length === 0 ||
          genderFilter.includes(String(row.gender))) &&
        (streamFilter.length === 0 ||
          streamFilter.includes(String(row.studentClass))) &&
        (statusFilter.length === 0 ||
          statusFilter.includes(
            String(row.status || "").toLowerCase()
          ))
      );
    });

  /* ================= FILTER TOGGLE ================= */
  const toggleArray = (value, state, setState) => {
    setState(
      state.includes(value)
        ? state.filter((v) => v !== value)
        : [...state, value]
    );
  };

  /* ================= COLUMN TOGGLE ================= */
  const toggleColumn = (col) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [col]: !prev[col],
    }));
  };

  const visibleHeaders = previewHeaders.filter(
    (h) => columnVisibility[h] !== false
  );

  /* ================= EXCEL ================= */
  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData());

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Students");

    XLSX.writeFile(wb, "students_records.xlsx");
  };

  /* ================= PRINT ================= */
  const handlePrint = () => {

    const filters = `
      Year: ${yearFilter.join(", ") || "All"} |
      Gender: ${genderFilter.join(", ") || "All"} |
      Class: ${streamFilter.join(", ") || "All"} |
      Status: ${statusFilter.join(", ") || "All"}
    `;

    const printHeaders = visibleHeaders.filter(
      (h) => h !== "createdAt"
    );

    const tableHTML = `
      <html>
      <head>
        <title>Students Report</title>

        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 40px;
            color: #334155;
          }

          h2 {
            text-align: center;
            color: #0f172a;
            font-weight: 700;
            margin-bottom: 5px;
          }

          .meta-info {
            text-align: center;
            font-size: 14px;
            color: #64748b;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px dashed #cbd5e1;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            font-size: 13px;
            text-align: left;
          }

          th {
            background: #f8fafc;
            color: #0f172a;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }

          tr:nth-child(even) {
            background: #f8fafc;
          }
        </style>
      </head>

      <body>

        <h2>STUDENTS REPORT</h2>
        <div class="meta-info">
          <strong>Applied Filters:</strong> ${filters}
        </div>

        <table>
          <thead>
            <tr>
              ${printHeaders
                .map((h) => `<th>${h}</th>`)
                .join("")}
            </tr>
          </thead>

          <tbody>
            ${filteredData()
              .map(
                (row) => `
                  <tr>
                    ${printHeaders
                      .map(
                        (h) =>
                          `<td>${row[h] || ""}</td>`
                      )
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

    win.document.write(tableHTML);

    win.document.close();

    win.print();
  };

  return (
    <div style={styles.page}>

      {/* TOP HEADER STATUS BAR */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={() => window.history.back()}
        >
          <span style={{ marginRight: 6 }}>←</span> Back
        </button>

        <h2 style={styles.title}>
          🎓 Student Database Management
        </h2>
      </div>

      <div style={styles.mainContainer}>
        {/* SEARCH & FILTERS CONTROL CARD */}
        <div style={styles.controlCard}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              style={styles.search}
              placeholder="Search cleanly by Name or Admission Number..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />
          </div>

          <div style={styles.cardRow}>
            {/* YEAR */}
            <div
              style={{
                ...styles.dropdown,
                background: yearFilter.length > 0 ? "#eff6ff" : "#f8fafc",
                borderColor: yearFilter.length > 0 ? "#2563eb" : "#cbd5e1",
                color: yearFilter.length > 0 ? "#1d4ed8" : "#334155"
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(
                  openFilter === "year" ? null : "year"
                );
              }}
            >
              <span>Year {yearFilter.length > 0 && `(${yearFilter.length})`}</span>
              <span style={styles.chevron}>▾</span>

              {openFilter === "year" && (
                <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.dropHeader}>Filter by Year</div>
                  {["1", "2", "3", "4"].map((y) => (
                    <label key={y} style={styles.item}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={yearFilter.includes(y)}
                        onChange={() =>
                          toggleArray(
                            y,
                            yearFilter,
                            setYearFilter
                          )
                        }
                      />
                      Year {y}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* GENDER */}
            <div
              style={{
                ...styles.dropdown,
                background: genderFilter.length > 0 ? "#eff6ff" : "#f8fafc",
                borderColor: genderFilter.length > 0 ? "#2563eb" : "#cbd5e1",
                color: genderFilter.length > 0 ? "#1d4ed8" : "#334155"
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(
                  openFilter === "gender" ? null : "gender"
                );
              }}
            >
              <span>Gender {genderFilter.length > 0 && `(${genderFilter.length})`}</span>
              <span style={styles.chevron}>▾</span>

              {openFilter === "gender" && (
                <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.dropHeader}>Filter by Gender</div>
                  {["Male", "Female"].map((g) => (
                    <label key={g} style={styles.item}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={genderFilter.includes(g)}
                        onChange={() =>
                          toggleArray(
                            g,
                            genderFilter,
                            setGenderFilter
                          )
                        }
                      />
                      {g}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* CLASS */}
            <div
              style={{
                ...styles.dropdown,
                background: streamFilter.length > 0 ? "#eff6ff" : "#f8fafc",
                borderColor: streamFilter.length > 0 ? "#2563eb" : "#cbd5e1",
                color: streamFilter.length > 0 ? "#1d4ed8" : "#334155"
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(
                  openFilter === "stream" ? null : "stream"
                );
              }}
            >
              <span>Class {streamFilter.length > 0 && `(${streamFilter.length})`}</span>
              <span style={styles.chevron}>▾</span>

              {openFilter === "stream" && (
                <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.dropHeader}>Filter by Class</div>
                  <div style={styles.dropScrollArea}>
                    {Array.from(
                      { length: 26 },
                      (_, i) => String.fromCharCode(65 + i)
                    ).map((s) => (
                      <label key={s} style={styles.item}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={streamFilter.includes(s)}
                          onChange={() =>
                            toggleArray(
                              s,
                              streamFilter,
                              setStreamFilter
                            )
                          }
                        />
                        Class {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STATUS */}
            <div
              style={{
                ...styles.dropdown,
                background: statusFilter.length > 0 ? "#eff6ff" : "#f8fafc",
                borderColor: statusFilter.length > 0 ? "#2563eb" : "#cbd5e1",
                color: statusFilter.length > 0 ? "#1d4ed8" : "#334155"
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(
                  openFilter === "status" ? null : "status"
                );
              }}
            >
              <span>Status {statusFilter.length > 0 && `(${statusFilter.length})`}</span>
              <span style={styles.chevron}>▾</span>

              {openFilter === "status" && (
                <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.dropHeader}>Filter by Status</div>
                  {["active", "inactive"].map((s) => (
                    <label key={s} style={styles.item}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={statusFilter.includes(s)}
                        onChange={() =>
                          toggleArray(
                            s,
                            statusFilter,
                            setStatusFilter
                          )
                        }
                      />
                      <span style={{ textTransform: 'capitalize' }}>{s}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMNS */}
            <div
              style={{
                ...styles.dropdown,
                background: showColumnsMenu ? "#f1f5f9" : "#f8fafc",
                borderColor: showColumnsMenu ? "#94a3b8" : "#cbd5e1",
                color: "#334155"
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowColumnsMenu(!showColumnsMenu);
              }}
            >
              <span>Columns to print</span>
              <span style={styles.chevron}>▾</span>

              {showColumnsMenu && (
                <div style={styles.drop} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.dropHeader}>Visible Columns</div>
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
              )}
              
            </div>
            <div style={styles.actionsBar}>
          <div style={styles.actionGroupLeft}>
            <button style={styles.btnSec} onClick={selectAllFiltered}>
              Select All Filtered
            </button>
            <button style={styles.btnSec} onClick={clearSelection}>
              Clear Selection
            </button>
            {selectedRows.length > 0 && (
              <span style={styles.selectionBadge}>
                {selectedRows.length} Row(s) selected
              </span>
            )}
          </div>

          <div style={styles.actionGroupRight}>
            <button style={styles.btnGreen} onClick={() => massUpdateStatus("active")}>
              🚀 Activate Bulk
            </button>
            <button style={styles.btnRed} onClick={() => massUpdateStatus("inactive")}>
              🔒 Deactivate Bulk
            </button>
            <div style={styles.divider}></div>
            <button style={styles.btnBlue} onClick={handlePrint}>
              🖨️ Print Report
            </button>
            <button style={styles.btnGreenDark} onClick={handleDownloadExcel}>
              📥 Export Excel
            </button>
          </div>
        </div>
          </div>
        </div>

        {/* BATCH ACTION CONTROLS BAR */}
        

        {/* MAIN DATA STORAGE SHEET TABLE */}
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={{ width: 60, textAlign: 'center', padding: '16px 12px' }}>Select</th>
                {visibleHeaders.map((h) => (
                  <th key={h} style={styles.tableHeaderCell}>{h}</th>
                ))}
                <th style={{ textAlign: 'center', width: 260, padding: '16px 12px' }}>Administrative Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredData().length === 0 ? (
                <tr>
                  <td colSpan={visibleHeaders.length + 2} style={styles.emptyState}>
                    No student records match the selected parameters.
                  </td>
                </tr>
              ) : (
                filteredData().map((row) => {
                  const isEditing = editingRow === row.id;

                  return (
                    <tr key={row.id} style={isEditing ? styles.editingRowItem : styles.tableRowItem}>
                      
                      {/* SELECT BOX ROW CELL */}
                      <td style={{ textAlign: 'center', padding: "14px 12px" }}>
                        <input
                          type="checkbox"
                          style={styles.tableCheckbox}
                          checked={selectedRows.includes(row.id)}
                          onChange={() => toggleSelectRow(row.id)}
                        />
                      </td>

                      {/* DATA COLUMNS ITERATOR */}
                      {visibleHeaders.map((h) => (
                        <td key={h} style={styles.tableCell}>
                          {isEditing ? (
                            <input
                              value={tempRow[h] ?? row[h] ?? ""}
                              onChange={(e) =>
                                setTempRow({
                                  ...tempRow,
                                  [h]: e.target.value,
                                })
                              }
                              style={styles.activeEditingInput}
                            />
                          ) : (
                            h === 'status' ? (
                              <span style={{
                                ...styles.statusPill,
                                ...(String(row[h]).toLowerCase() === 'active' ? styles.statusActive : styles.statusInactive)
                              }}>
                                {row[h] || "Unset"}
                              </span>
                            ) : (
                              <span style={styles.cellStaticText}>{row[h] ?? ""}</span>
                            )
                          )}
                        </td>
                      ))}

                      {/* STRUCTURAL ACTIONS BUTTON MATRIX */}
                      <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                        <div style={styles.cellActionContainer}>
                          {isEditing ? (
                            <>
                              <button
                                style={styles.saveBtn}
                                onClick={async () => {
                                  const updatedRow = {
                                    ...row,
                                    ...tempRow,
                                  };

                                  try {
                                    await autoSaveRecord(updatedRow);
                                    setActiveData((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id ? updatedRow : r
                                      )
                                    );
                                    setEditingRow(null);
                                    setTempRow({});
                                    alert("Student updated successfully");
                                  } catch (err) {
                                    console.log(err);
                                    alert("Update failed");
                                  }
                                }}
                              >
                                Save
                              </button>
                              <button
                                style={styles.cancelBtn}
                                onClick={() => {
                                  setEditingRow(null);
                                  setTempRow({});
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={styles.editBtn}
                                onClick={() => {
                                  setEditingRow(row.id);
                                  setTempRow(row);
                                }}
                              >
                                Edit Data
                              </button>
                              <button
                                style={styles.activeInlineBtn}
                                onClick={() => setStatus(row.id, "active")}
                              >
                                Activate
                              </button>
                              <button
                                style={styles.inactiveInlineBtn}
                                onClick={() => setStatus(row.id, "inactive")}
                              >
                                Inactivate
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================= THEME STYLES ARCHITECTURE ================= */
const styles = {
  page: {
    padding: "32px 40px",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)", // High-end hardware subtle depth gradient
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: "#0f172a",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
    paddingBottom: "18px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.8)"
  },

  backBtn: {
    padding: "9px 18px",
    background: "#ffffff",
    color: "#475569",
    borderRadius: "9px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
    transition: "all 0.15s ease"
  },

  title: {
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: "800",
    margin: 0,
    letterSpacing: "-0.6px"
  },

  mainContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },

  controlCard: {
    background: "rgba(255, 255, 255, 0.85)", // Glassmorphism backdrop premium touch
    backdropFilter: "blur(8px)",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.6)",
    border: "1px solid #e2e8f0"
  },

  searchWrap: {
    position: "relative",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center"
  },

  searchIcon: {
    position: "absolute",
    left: "16px",
    color: "#64748b",
    fontSize: "15px"
  },

  search: {
    width: "100%",
    padding: "13px 16px 13px 46px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
    transition: "all 0.15s ease",
    color: "#1e293b"
  },

  cardRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  dropdown: {
    background: "#ffffff",
    padding: "11px 18px",
    borderRadius: "9px",
    color: "#334155",
    cursor: "pointer",
    position: "relative",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: "160px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    userSelect: "none",
    transition: "all 0.15s ease"
  },

  chevron: {
    marginLeft: "10px",
    color: "#64748b",
    fontSize: "12px"
  },

  drop: {
    position: "absolute",
    background: "#ffffff",
    color: "#0f172a",
    padding: "8px 0",
    borderRadius: "10px",
    top: "calc(100% + 8px)",
    left: 0,
    zIndex: 100,
    width: "230px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    border: "1px solid #cbd5e1",
  },

  dropHeader: {
    padding: "8px 16px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#64748b",
    borderBottom: "1px solid #f1f5f9",
    marginBottom: "6px",
    letterSpacing: "0.5px"
  },

  dropScrollArea: {
    maxHeight: "240px",
    overflowY: "auto"
  },

  item: {
    display: "flex",
    alignItems: "center",
    padding: "9px 16px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#334155",
    transition: "background-color 0.15s"
  },

  checkbox: {
    marginRight: "12px",
    accentColor: "#2563eb",
    transform: "scale(1.05)"
  },

  actionsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(8px)",
    padding: "16px 24px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.6)"
  },

  actionGroupLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  actionGroupRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  selectionBadge: {
    fontSize: "12px",
    background: "#e0f2fe",
    padding: "6px 14px",
    borderRadius: "20px",
    color: "#0369a1",
    fontWeight: "700",
    marginLeft: "6px",
    letterSpacing: "0.2px"
  },

  divider: {
    width: "1px",
    height: "26px",
    background: "#cbd5e1",
    margin: "0 6px"
  },

  btnSec: {
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
  },

  btnGreen: {
    background: "#059669",
    color: "#ffffff",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(4, 120, 87, 0.2)"
  },

  btnRed: {
    background: "#dc2626",
    color: "#ffffff",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(185, 28, 28, 0.2)"
  },

  btnBlue: {
    background: "#2563eb",
    color: "#ffffff",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(29, 78, 216, 0.2)"
  },

  btnGreenDark: {
    background: "#065f46",
    color: "#ffffff",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(6, 95, 70, 0.2)"
  },

  tableCard: {
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.02)",
    overflow: "hidden",
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    textAlign: "left"
  },

  tableHeaderRow: {
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0"
  },

  tableHeaderCell: {
    padding: "16px",
    color: "#475569",
    fontWeight: "700",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.6px"
  },

  tableRowItem: {
    borderBottom: "1px solid #e2e8f0",
    transition: "background-color 0.1s ease",
    background: "#ffffff"
  },

  editingRowItem: {
    borderBottom: "1px solid #93c5fd",
    background: "#f0f7ff"
  },

  tableCell: {
    padding: "14px 16px",
    color: "#334155",
    verticalAlign: "middle"
  },

  cellStaticText: {
    fontSize: "13.5px",
    color: "#1e293b",
    fontWeight: "500"
  },

  tableCheckbox: {
    accentColor: "#2563eb",
    transform: "scale(1.1)",
    cursor: "pointer"
  },

  activeEditingInput: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #2563eb",
    outline: "none",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.12)",
    fontSize: "13px",
    background: "#ffffff"
  },

  statusPill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  statusActive: {
    background: "#d1fae5",
    color: "#065f46",
    border: "1px solid #a7f3d0"
  },

  statusInactive: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca"
  },

  cellActionContainer: {
    display: "flex",
    gap: "6px",
    justifyContent: "center"
  },

  editBtn: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.1s"
  },

  activeInlineBtn: {
    background: "#ecfdf5",
    color: "#059669",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "1px solid #a7f3d0",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.1s"
  },

  inactiveInlineBtn: {
    background: "#fff5f5",
    color: "#dc2626",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "1px solid #fed7d7",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.1s"
  },

  saveBtn: {
    background: "#059669",
    color: "#ffffff",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer"
  },

  cancelBtn: {
    background: "#475569",
    color: "#ffffff",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer"
  },

  emptyState: {
    padding: "56px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    fontStyle: "italic",
    fontWeight: "500"
  }
};