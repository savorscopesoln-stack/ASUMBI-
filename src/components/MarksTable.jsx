import React, { useEffect, useState, useRef } from "react";
import API from "../api";

/* ================= HELPERS ================= */
const calculatePercentage = (score, totalMarks = 100) => {
  const s = Number(score);
  const t = Number(totalMarks);

  if (isNaN(s) || isNaN(t) || t === 0) return 0;

  return Math.round((s / t) * 100);
};

const calculateGrade = (p) => {
  if (p >= 75) return "Distinction";
  if (p >= 60) return "Credit";
  if (p >= 40) return "Pass";
  return "Fail";
};

/* ================= COMPONENT ================= */
export default function MarksTable() {
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [studentsMap, setStudentsMap] = useState({});

  const [assessmentId, setAssessmentId] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [rows, setRows] = useState([]);

  const [totalMarks, setTotalMarks] = useState(100);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const saveTimeout = useRef(null);

  /* ================= LOAD META ================= */
  useEffect(() => {
    loadMeta();
  }, []);

  const loadMeta = async () => {
    try {
      const [a, c, s, st] = await Promise.all([
        API.get("/assessments"),
        API.get("/student-classes"),
        API.get("/subjects"),
        API.get("/students"),
      ]);

      setAssessments(a.data || []);
      setClasses(c.data || []);

      const sub = {};

      (s.data || []).forEach((x) => {
        sub[x.id] = x.name;
      });

      setSubjectsMap(sub);

      const stu = {};

      (st.data || []).forEach((x) => {
        stu[x.id] = {
          name: x.name,
          adm: x.admissionNo,
        };
      });

      setStudentsMap(stu);
    } catch (err) {
      console.error("Meta load error:", err);
    }
  };

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  /* ================= LOAD MARKS ================= */
  const loadMarks = async () => {
    if (!assessmentId) {
      return alert("Select assessment");
    }

    try {
      setLoading(true);

      const res = await API.get(
        `/marks/${assessmentId}?classLevel=${classFilter}`
      );

      const data = res.data || [];

      if (data.length > 0) {
        setTotalMarks(Number(data[0]?.totalMarks || 100));
      }

      const formatted = data.map((m) => {
        const score = Number(m.score || 0);

        const total = Number(m.totalMarks || totalMarks || 100);

        const percentage = calculatePercentage(score, total);

        return {
          studentId: m.studentId,
          subjectId: m.subjectId,
          rawScore: score,
          percentage,
          grade: calculateGrade(percentage),
        };
      });

      setRows(formatted);
    } catch (err) {
      console.error("Load marks error:", err);
      alert("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTERED VIEW ================= */
  const filteredRows = rows
    .map((r, originalIndex) => ({
      ...r,
      originalIndex,
    }))
    .filter((r) => {
      if (!subjectFilter) return true;

      return String(r.subjectId) === String(subjectFilter);
    });

  /* ================= AUTO RECALC ================= */
  useEffect(() => {
    setRows((prev) =>
      prev.map((r) => {
        const percentage = calculatePercentage(
          r.rawScore,
          totalMarks
        );

        return {
          ...r,
          percentage,
          grade: calculateGrade(percentage),
        };
      })
    );
  }, [totalMarks]);

 
/* ================= AUTO SAVE ================= */
const autoSave = async (updatedRows) => {
  if (!assessmentId) return;

  try {
    setSaving(true);

    await API.post("/marks/save", {
      assessmentId,
      data: updatedRows.map((r) => ({
        studentId: r.studentId,
        subjectId: r.subjectId,
        rawScore: Number(r.rawScore || 0),
      })),
    });

    setIsEditing(false);
  } catch (err) {
    console.error("Autosave error:", err);
  } finally {
    setSaving(false);
  }
};

/* ================= EDIT MARK ================= */
const handleChange = (originalIndex, value) => {
  setIsEditing(true);

  const updated = [...rows];

  let score = Number(value);
  if (isNaN(score)) score = 0;
  if (score < 0) score = 0;
  if (score > totalMarks) score = totalMarks;

  const percentage = calculatePercentage(score, totalMarks);

  updated[originalIndex] = {
    ...updated[originalIndex],
    rawScore: score,
    percentage,
    grade: calculateGrade(percentage),
  };

  setRows(updated);

  // debounce save
  if (saveTimeout.current) {
    clearTimeout(saveTimeout.current);
  }

  saveTimeout.current = setTimeout(() => {
    autoSave(updated);
  }, 700);
};

/* ================= SAVE ALL ================= */
const saveAll = async () => {
  if (!assessmentId) {
    return alert("Select assessment first");
  }

  try {
    setSaving(true);

    await API.post("/marks/save", {
      assessmentId,
      data: rows.map((r) => ({
        studentId: r.studentId,
        subjectId: r.subjectId,
        rawScore: Number(r.rawScore || 0),
      })),
    });

    setIsEditing(false);
    alert("Marks saved successfully");
  } catch (err) {
    console.error("Save error:", err);
    alert("Failed to save marks");
  } finally {
    setSaving(false);
  }
};

  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            📊 Exam Marks Control Center
          </h2>

          <p style={styles.subtitle}>
            School grading & performance tracking system
          </p>
        </div>

        <div style={styles.actions}>
          <span
            style={{
              color: isEditing ? "#f59e0b" : "#16a34a",
              fontWeight: 700,
            }}
          >
            {isEditing ? "Editing..." : "Live Sync"}
          </span>

          <button
            onClick={loadMarks}
            style={styles.btn}
          >
            {loading ? "Loading..." : "Load"}
          </button>

          <button
            onClick={saveAll}
            style={styles.saveBtn}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* LIVE STATUS */}
      <div
        style={{
          marginBottom: 12,
          padding: "10px 14px",
          borderRadius: 10,

          background: saving
            ? "#fef3c7"
            : isEditing
            ? "#dbeafe"
            : "#dcfce7",

          color: "#111",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {saving
          ? "Saving marks..."
          : isEditing
          ? "Changes detected..."
          : "All marks synced"}
      </div>

      {/* CONTROLS */}
      <div style={styles.card}>
        <div style={styles.controls}>
          {/* ASSESSMENT */}
          <select
            value={assessmentId}
            onChange={(e) =>
              setAssessmentId(e.target.value)
            }
            style={styles.input}
          >
            <option value="">
              Select Assessment
            </option>

            {assessments.map((a) => (
              <option
                key={a.id}
                value={a.id}
              >
                {a.name}
              </option>
            ))}
          </select>

          {/* CLASS */}
          <select
            value={classFilter}
            onChange={(e) =>
              setClassFilter(e.target.value)
            }
            style={styles.input}
          >
            <option value="">
              Select Class
            </option>

            {classes.map((c, i) => (
              <option
                key={i}
                value={c.studentClass}
              >
                {c.studentClass}
              </option>
            ))}
          </select>

          {/* SUBJECT */}
          <select
            value={subjectFilter}
            onChange={(e) =>
              setSubjectFilter(e.target.value)
            }
            style={styles.input}
          >
            <option value="">
              All Subjects
            </option>

            {Object.entries(subjectsMap).map(
              ([id, name]) => (
                <option
                  key={id}
                  value={id}
                >
                  {name}
                </option>
              )
            )}
          </select>

          {/* TOTAL MARKS */}
          <input
            type="number"
            value={totalMarks}
            onChange={(e) =>
              setTotalMarks(Number(e.target.value))
            }
            style={styles.input}
            placeholder="Total Marks"
          />
        </div>
      </div>

      {/* TABLE */}
      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Student</th>

                <th style={styles.th}>Adm No</th>

                <th style={styles.th}>Subject</th>

                <th style={styles.th}>Score</th>

                <th style={styles.th}>%</th>

                <th style={styles.th}>Grade</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#64748b",
                    }}
                  >
                    No marks loaded
                  </td>
                </tr>
              )}

              {filteredRows.map((r) => {
                const s =
                  studentsMap[r.studentId] || {};

                const subjectName =
                  subjectsMap[r.subjectId] ||
                  "Unknown";

                return (
                  <tr
                    key={`${r.studentId}-${r.subjectId}`}
                    style={styles.row}
                  >
                    <td>
                      {s.name || "-"}
                    </td>

                    <td>
                      {s.adm || "-"}
                    </td>

                    <td>{subjectName}</td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        max={totalMarks}
                        value={r.rawScore ?? ""}
                        onChange={(e) =>
                          handleChange(
                            r.originalIndex,
                            e.target.value
                          )
                        }
                        style={{
                          ...styles.inputSmall,

                          border:
                            r.rawScore >= totalMarks
                              ? "2px solid #16a34a"
                              : "1px solid #cbd5e1",
                        }}
                      />
                    </td>

                    <td>
                      <strong>
                        {r.percentage}%
                      </strong>
                    </td>

                    <td>
                      <span
                        style={gradeStyle(
                          r.grade
                        )}
                      >
                        {r.grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Arial",
    color: "#111",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    flexWrap: "wrap",
    gap: 12,
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
  },

  subtitle: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
  },

  actions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
  },

  controls: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    minWidth: 180,
    outline: "none",
  },

  inputSmall: {
    width: 80,
    padding: 8,
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    transition: "all 0.2s ease",
    outline: "none",
    fontWeight: 700,
  },

  btn: {
    padding: "8px 14px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #ccc",
    cursor: "pointer",
    fontWeight: 600,
  },

  saveBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "#7f1d1d",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: 12,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 13,
  },

  row: {
    borderBottom: "1px solid #eee",
  },
};

const gradeStyle = (g) => ({
  padding: "4px 10px",
  borderRadius: 20,
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,

  background:
    g === "Distinction"
      ? "#16a34a"
      : g === "Credit"
      ? "#2563eb"
      : g === "Pass"
      ? "#f59e0b"
      : "#dc2626",
});