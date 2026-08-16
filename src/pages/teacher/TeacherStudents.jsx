import React, { useEffect, useState, useMemo } from "react";
import API from "../../api";

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  /* ================= LOAD STUDENTS ================= */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/students");
        setStudents(res.data || []);
      } catch (err) {
        console.error("Error fetching students record stack:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ================= OPEN STUDENT ================= */
  const openStudent = (student) => {
    setSelected(student);
    setDetailsLoading(true);

    // Simulated network transition to smooth render operations
    const timer = setTimeout(() => {
      setDetailsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  };

  /* ================= FILTER LOGIC ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const nameString = s.name ? String(s.name) : "";
      const admString = s.admissionNo ? String(s.admissionNo) : "";
      
      return `${nameString} ${admString}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [students, search]);

  return (
    <div style={styles.page}>
      <style>{customEngineStyles}</style>

      {/* HEADER CONTROLS */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Student Directory</h2>
          <p style={styles.pageSubtitle}>Manage individual enrollment parameters and core profiles.</p>
        </div>

        <div style={styles.searchWrapper}>
          <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search by name or admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />
        </div>
      </div>

      {/* SYSTEM DIRECTORY CONTENT CONTAINER */}
      <div style={styles.mainViewContainer}>
        {loading ? (
          <div style={styles.centerFeedback}>
            <div className="directory-spinner"></div>
            <p style={styles.info}>Compiling institutional database index...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={styles.centerFeedback}>
            <p style={styles.info}>No matching student sequences discovered.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                style={styles.studentCard}
                className="student-card-premium"
                onClick={() => openStudent(s)}
              >
                <div style={styles.avatar}>
                  {s.name ? String(s.name).charAt(0).toUpperCase() : "?"}
                </div>

                <div style={{ overflow: "hidden" }}>
                  <h4 style={styles.name}>{s.name}</h4>
                  <p style={styles.meta}>
                    <span>ADM</span> <code style={styles.inlineCode}>{s.admissionNo}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL PROFILE STACK ================= */}
      {selected && (
        <div
          style={styles.modalOverlay}
          className="modal-overlay-fade"
          onClick={() => setSelected(null)}
        >
          <div
            style={styles.modal}
            className="modal-panel-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={styles.modalTitleContainer}>
                <div style={styles.modalAvatarMini}>
                  {selected.name ? String(selected.name).charAt(0).toUpperCase() : "👤"}
                </div>
                <div>
                  <h3 style={styles.modalTitle}>{selected.name}</h3>
                  <p style={styles.modalSubtitle}>Roster ID Reference Profile</p>
                </div>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelected(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {detailsLoading ? (
              <div style={styles.modalLoadingState}>
                <div className="directory-spinner"></div>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Parsing profile fields...</p>
              </div>
            ) : (
              <div style={styles.profile}>

                {/* STRUCTURAL GRID ROW 1 */}
                <div style={styles.profileDataRow}>
                  {/* BASIC INFO */}
                  <div style={styles.section}>
                    <h4 style={styles.sectionHeading}>📌 Basic Information</h4>
                    <div style={styles.field}><span style={styles.label}>Full Name:</span> <span style={styles.value}>{selected.name}</span></div>
                    <div style={styles.field}><span style={styles.label}>Admission:</span> <span style={styles.value}><code style={styles.inlineCode}>{selected.admissionNo}</code></span></div>
                    <div style={styles.field}><span style={styles.label}>Gender:</span> <span style={styles.value}>{selected.gender || "Not Specified"}</span></div>
                  </div>

                  {/* ACADEMIC INFO */}
                  <div style={styles.section}>
                    <h4 style={styles.sectionHeading}>🏫 Academic Info</h4>
                    <div style={styles.field}><span style={styles.label}>Class Form:</span> <span style={styles.value}>{selected.class || selected.studentClass || "N/A"}</span></div>
                    <div style={styles.field}><span style={styles.label}>Stream Axis:</span> <span style={styles.value}>{selected.stream || "N/A"}</span></div>
                    <div style={styles.field}>
                      <span style={styles.label}>Roster Status:</span> 
                      <span style={{...styles.statusBadge, ...(selected.status === "Inactive" ? styles.statusInactive : {})}}>
                        {selected.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* STRUCTURAL GRID ROW 2 */}
                <div style={styles.profileDataRow}>
                  {/* ADMIN INFO */}
                  <div style={styles.section}>
                    <h4 style={styles.sectionHeading}>🧾 Administrative</h4>
                    <div style={styles.field}><span style={styles.label}>Registry Date:</span> <span style={styles.value}>{selected.admissionDate || "N/A"}</span></div>
                    <div style={styles.field}><span style={styles.label}>Fee Balance:</span> <span style={{...styles.value, color: selected.feeBalance && selected.feeBalance !== "0" ? "#f43f5e" : "#10b981"}}>KES {selected.feeBalance || "0"}</span></div>
                    <div style={styles.field}><span style={styles.label}>Boarding Type:</span> <span style={styles.value}>{selected.boarding || "Day"}</span></div>
                  </div>

                  {/* CONTACT */}
                  <div style={styles.section}>
                    <h4 style={styles.sectionHeading}>📞 Emergency Contacts</h4>
                    <div style={styles.field}><span style={styles.label}>Phone Line:</span> <span style={styles.value}>{selected.phone || "N/A"}</span></div>
                    <div style={styles.field}><span style={styles.label}>Legal Guardian:</span> <span style={styles.value}>{selected.guardian || "N/A"}</span></div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= UX ARCHITECTURE SPECIFICATION ================= */
const styles = {
  page: {
    padding: "0px 10px 40px 10px",
    background: "transparent",
    color: "#f1f5f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  /* --- ACTIONS LAYOUT --- */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 24,
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16,
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
  },

  searchWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: 340,
  },

  searchIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    width: 16,
    height: 16,
    color: "#475569",
    pointerEvents: "none",
  },

  search: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 16px 11px 40px",
    borderRadius: 8,
    background: "#0f172a",
    color: "#f8fafc",
    border: "1px solid rgba(255,255,255,0.06)",
    fontSize: 13.5,
    outline: "none",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },

  /* --- MASTER DIRECTORY PANELS --- */
  mainViewContainer: {
    width: "100%",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 14,
  },

  studentCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.04)",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "linear-gradient(135deg, #9f1239 0%, #4c0519 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
    boxShadow: "0 4px 12px rgba(159, 18, 57, 0.15)",
    flexShrink: 0,
  },

  name: {
    margin: 0,
    fontSize: 14.5,
    fontWeight: 600,
    color: "#f1f5f9",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  meta: {
    margin: "4px 0 0 0",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },

  inlineCode: {
    fontFamily: "monospace",
    background: "rgba(255,255,255,0.05)",
    padding: "2px 5px",
    borderRadius: 4,
    color: "#cbd5e1",
    fontSize: 11.5,
    fontWeight: 400,
  },

  centerFeedback: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    width: "100%",
    boxSizing: "border-box",
  },

  info: {
    margin: 0,
    fontSize: 13.5,
    color: "#64748b",
    textAlign: "center",
  },

  /* --- HOVER/STATE INJECTIONS --- */
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.8)",
    backdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: 20,
  },

  modal: {
    background: "#0b0f19",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: 28,
    borderRadius: 16,
    width: "100%",
    maxWidth: 640,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: 20,
    marginBottom: 24,
  },

  modalTitleContainer: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  modalAvatarMini: {
    width: 38,
    height: 38,
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
  },

  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.01em",
  },

  modalSubtitle: {
    margin: "2px 0 0 0",
    fontSize: 12,
    color: "#64748b",
  },

  closeBtn: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 8,
    color: "#64748b",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  profile: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  profileDataRow: {
    display: "flex",
    gap: 16,
    width: "100%",
  },

  section: {
    flex: 1,
    padding: "16px 20px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  sectionHeading: {
    margin: "0 0 4px 0",
    fontSize: 12,
    fontWeight: 700,
    color: "#fbbf24",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  field: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    borderBottom: "1px solid rgba(255,255,255,0.02)",
    paddingBottom: 6,
  },

  label: {
    color: "#64748b",
    fontWeight: 500,
  },

  value: {
    color: "#cbd5e1",
    fontWeight: 500,
  },

  statusBadge: {
    background: "rgba(16, 185, 129, 0.1)",
    color: "#10b981",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },

  statusInactive: {
    background: "rgba(244, 63, 94, 0.1)",
    color: "#f43f5e",
  },

  modalLoadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: "40px 0",
  },
};

/* Mini core engineering layout adjustments inject directly to the engine stack */
const customEngineStyles = `
  .student-card-premium {
    will-change: transform, border-color, background;
  }
  .student-card-premium:hover {
    background: rgba(255, 255, 255, 0.02) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    transform: translateY(-2px);
  }
  
  .search-wrapper input:focus {
    border-color: #9f1239 !important;
    box-shadow: 0 0 0 1px #9f1239;
  }

  .modal-overlay-fade {
    animation: modFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .modal-panel-slide {
    animation: panelSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .close-btn:hover {
    color: #f1f5f9 !important;
    background: rgba(255,255,255,0.06) !important;
  }

  .directory-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    border-top-color: #fbbf24;
    animation: directoryTurn 0.6s linear infinite;
    margin-bottom: 8px;
  }

  @keyframes directoryTurn {
    to { transform: rotate(360deg); }
  }
  @keyframes modFade {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes panelSlide {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;