import React, { useEffect, useState, useMemo } from "react";
import API from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AttendanceReport() {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState("Morning");
  const [classFilter, setClassFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  /* Hover state engine for buttons */
  const [hoveredBtn, setHoveredBtn] = useState(null);

  /* ================= LOAD DATA ================= */
  const loadData = async () => {
    try {
      setLoading(true);
      const [stuRes, attRes] = await Promise.all([
        API.get("/students"),
        API.get(`/attendance?date=${date}&session=${session}`),
      ]);
      setStudents(stuRes.data || []);
      setAttendance(attRes.data || []);
    } catch (err) {
      console.error("Error loading register:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, session]);

  /* ================= MAPS & FILTERS ================= */
  const attendanceMap = useMemo(() => {
    const map = new Map();
    attendance.forEach((a) => {
      map.set(String(a.studentId), a.status);
    });
    return map;
  }, [attendance]);

  const getStatus = (id) => attendanceMap.get(String(id)) || "Absent";

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = classFilter === "ALL" || s.studentClass === classFilter;
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, classFilter, search]);

  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    filteredStudents.forEach((s) => {
      const status = getStatus(s.id);
      if (status === "Present") present++;
      else if (status === "Late") late++;
      else absent++;
    });
    return { present, absent, late, total: filteredStudents.length };
  }, [filteredStudents, attendanceMap]);

  const classes = ["ALL", ...new Set(students.map((s) => s.studentClass))];

  /* ================= EXPORT PDF ================= */
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("ATTENDANCE REGISTER", 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${date}  |  Session: ${session}  |  Class: ${classFilter}`, 14, 23);

    const body = filteredStudents.map((s, i) => [
      i + 1,
      s.name,
      s.admissionNo,
      s.studentClass,
      getStatus(s.id),
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["#", "Name", "Admission No", "Class", "Status"]],
      body,
      headStyles: { fillKind: "solid", fillColor: [127, 29, 29] },
    });

    doc.save(`Attendance_${date}_${session}.pdf`);
  };

  return (
    <div style={styles.page}>
      <style>{customEngineStyles}</style>

      {/* HEADER SECTION */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Attendance Register</h2>
          <p style={styles.pageSubtitle}>
            Real-time master register and institutional tracking systems.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button 
            onClick={loadData} 
            onMouseEnter={() => setHoveredBtn("refresh")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{...styles.btnGhost, ...(hoveredBtn === "refresh" ? styles.btnGhostHover : {})}}
          >
            🔄 Refresh
          </button>
          <button 
            onClick={downloadPDF}
            onMouseEnter={() => setHoveredBtn("export")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{...styles.btnPrimary, ...(hoveredBtn === "export" ? styles.btnPrimaryHover : {})}}
          >
            📥 Export PDF
          </button>
        </div>
      </div>

      {/* FILTER STACK */}
      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <div style={styles.inputWrapper}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.inputWrapper}>
            <select value={session} onChange={(e) => setSession(e.target.value)} style={styles.select}>
              <option>Morning</option>
              <option>Afternoon</option>
            </select>
          </div>

          <div style={styles.inputWrapper}>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={styles.select}>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={styles.inputWrapper}>
            <input
              placeholder="Search by student details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      {/* PREMIUM KPI METRIC ROW */}
      <div style={styles.kpiGrid}>
        <KPI label="Present Metrics" value={summary.present} color="#10b981" />
        <KPI label="Absent Metrics" value={summary.absent} color="#f43f5e" />
        <KPI label="Late Markers" value={summary.late} color="#f59e0b" />
        <KPI label="Total Roster" value={summary.total} color="#3b82f6" />
      </div>

      {/* MODERN DATATABLE CONTEXT */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loading}>
            <div className="minimal-spinner"></div>
            Searching record indices...
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "60px" }}>#</th>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Admission Number</th>
                  <th style={styles.th}>Class Designation</th>
                  <th style={{ ...styles.th, textRight: "right" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.emptyState}>No matching student sequences found.</td>
                  </tr>
                ) : (
                  filteredStudents.map((s, i) => {
                    const status = getStatus(s.id);
                    return (
                      <tr key={s.id} className="table-row-premium">
                        <td style={styles.td}>{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ ...styles.td, fontWeight: 500, color: "#f1f5f9" }}>{s.name}</td>
                        <td style={styles.td}><code style={styles.code}>{s.admissionNo}</code></td>
                        <td style={styles.td}>{s.studentClass}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...badgeStyle(status) }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= COMPONENT MODULE METRICS ================= */
function KPI({ label, value, color }) {
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiLabel}>{label}</span>
      <div style={styles.kpiValueWrapper}>
        <span style={styles.kpiValue}>{value}</span>
        <span style={{ ...styles.kpiIndicator, background: color }} />
      </div>
    </div>
  );
}

/* ================= COMPONENT FUNCTIONAL STYLES ================= */
const badgeStyle = (status) => {
  if (status === "Present") return { background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.2)" };
  if (status === "Late") return { background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)" };
  return { background: "rgba(244, 63, 94, 0.1)", color: "#f43f5e", border: "1px solid rgba(244, 63, 94, 0.2)" };
};

const styles = {
  page: {
    padding: "0px 10px 40px 10px",
    background: "transparent",
    color: "#f1f5f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  /* --- HEADER BLOCK --- */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 24,
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: 28,
  },

  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#ffffff",
  },

  pageSubtitle: {
    margin: "6px 0 0 0",
    fontSize: 13.5,
    color: "#94a3b8",
    fontWeight: 400,
  },

  headerActions: {
    display: "flex",
    gap: 10,
  },

  btnPrimary: {
    background: "#9f1239",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  btnPrimaryHover: {
    background: "#e11d48",
    boxShadow: "0 4px 12px rgba(225, 29, 72, 0.2)",
  },

  btnGhost: {
    background: "rgba(255, 255, 255, 0.03)",
    color: "#cbd5e1",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  btnGhostHover: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
  },

  /* --- MINIMAL CONTROL BAR --- */
  filterCard: {
    marginBottom: 28,
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
  },

  inputWrapper: {
    position: "relative",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.06)",
    fontSize: 13.5,
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
    transition: "border-color 0.2s ease",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.06)",
    fontSize: 13.5,
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
    cursor: "pointer",
  },

  /* --- METRIC ROW --- */
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 32,
  },

  kpiCard: {
    background: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    padding: "16px 20px",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  kpiLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: "0.05em",
  },

  kpiValueWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  kpiValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#ffffff",
  },

  kpiIndicator: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },

  /* --- PREMIUM CORE GRID TABLE --- */
  tableCard: {
    background: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    overflow: "hidden",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },

  th: {
    padding: "14px 20px",
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    background: "rgba(0, 0, 0, 0.1)",
  },

  td: {
    padding: "14px 20px",
    fontSize: 13.5,
    color: "#94a3b8",
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
    verticalAlign: "middle",
  },

  code: {
    fontFamily: "monospace",
    background: "rgba(255,255,255,0.05)",
    padding: "3px 6px",
    borderRadius: 4,
    color: "#cbd5e1",
    fontSize: 12,
  },

  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },

  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#64748b",
    fontSize: 13.5,
  },

  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: "60px 20px",
    fontSize: 13.5,
    color: "#94a3b8",
  },
};

/* Micro CSS layout configurations for clean DOM interface hooks */
const customEngineStyles = `
  .table-row-premium {
    transition: background 0.15s ease;
  }
  .table-row-premium:hover {
    background: rgba(255, 255, 255, 0.015);
  }
  
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.5;
    cursor: pointer;
  }

  .minimal-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    border-top-color: #9f1239;
    animation: turnSpin 0.6s linear infinite;
  }

  @keyframes turnSpin {
    to { transform: rotate(360deg); }
  }
`;