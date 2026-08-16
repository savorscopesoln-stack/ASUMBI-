
import React, { useEffect, useMemo, useState } from "react";
import API from "../api";

import Tabs from "../components/Tabs";
import MarksTable from "../components/MarksTable";
import Analytics from "../components/Analytics";
import ResultsTable from "../components/ResultsTable";
import BulkActions from "../components/BulkActions";

export default function AssessmentFeature() {
  const [activeTab, setActiveTab] = useState("marks");

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    assessmentType: "Exam",
    subjectId: [],
    targetClass: [],
    term: "",
    year: "",
    totalMarks: 100,
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
  });

  /* ================= LOAD ================= */
  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchAssessments();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects");
      setSubjects(res.data || []);
    } catch (err) {
      console.error("Subjects error:", err);
      setSubjects([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await API.get("/student-classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error("Classes error:", err);
      setClasses([]);
    }
  };

  const fetchAssessments = async () => {
    try {
      const res = await API.get("/assessments");
      setAssessments(res.data || []);
    } catch (err) {
      console.error("Assessments error:", err);
      setAssessments([]);
    }
  };

  /* ================= STUDENTS ================= */
  const fetchStudents = async (classList) => {
    if (!classList?.length) return;

    try {
      let query = "/students?status=Active";

      if (!classList.includes("ALL")) {
        query += `&classLevel=${classList.join(",")}`;
      }

      const res = await API.get(query);

      setStudents(res.data || []);
    } catch (err) {
      console.error("Students error:", err);
      setStudents([]);
    }
  };

  useEffect(() => {
    if (form.targetClass.length > 0) {
      fetchStudents(form.targetClass);
    }
  }, [form.targetClass]);

  /* ================= TIME TICK ================= */
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  /* ================= HELPERS ================= */
  const cleanArray = (arr) => {
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((v) => v && v !== "ALL")
      .map((v) => String(v).trim());
  };

  const safeDateTime = (date, time) => {
    if (!date) return null;

    try {
      const combined = time ? `${date}T${time}` : `${date}T00:00`;
      return new Date(combined).toISOString();
    } catch {
      return null;
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      assessmentType: "Exam",
      subjectId: [],
      targetClass: [],
      term: "",
      year: "",
      totalMarks: 100,
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
    });

    setStudents([]);
    setSelectedStudents([]);
    setEditingId(null);
  };

  /* ================= CLASS ================= */
  const handleClassChange = (value) => {
    let updated = [...form.targetClass];

    if (value === "ALL") {
      updated = ["ALL"];
    } else {
      updated = updated.includes(value)
        ? updated.filter((v) => v !== value)
        : [...updated.filter((v) => v !== "ALL"), value];
    }

    setForm((prev) => ({
      ...prev,
      targetClass: updated,
    }));
  };

  /* ================= SUBJECT ================= */
  const handleSubjectChange = (value) => {
    let updated = [...form.subjectId];

    if (value === "ALL") {
      updated = ["ALL"];
    } else {
      updated = updated.includes(value)
        ? updated.filter((v) => v !== value)
        : [...updated.filter((v) => v !== "ALL"), value];
    }

    setForm((prev) => ({
      ...prev,
      subjectId: updated,
    }));
  };

  /* ================= STUDENT SELECT ================= */
  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedStudents(students.map((s) => s.id));
  };

  const clearAll = () => {
    setSelectedStudents([]);
  };

  /* ================= TOGGLE ACTIVE ================= */
  const toggleActive = async (a) => {
    try {
      const res = await API.put(`/assessments/${a.id}/toggle`);

      const updatedStatus = res.data?.status;

      setAssessments((prev) =>
        prev.map((item) =>
          item.id === a.id
            ? {
                ...item,
                status: updatedStatus || item.status,
              }
            : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= EDIT ================= */
  const editAssessment = (a) => {
    setEditingId(a.id);

    setForm({
      name: a.name || "",
      assessmentType: a.assessmentType || "Exam",
      subjectId: a.subjectId
        ? String(a.subjectId).split(",")
        : [],
      targetClass: a.targetClass
        ? String(a.targetClass).split(",")
        : [],
      term: a.term || "",
      year: a.year || "",
      totalMarks: a.totalMarks || 100,

      startDate: a.startDate
        ? new Date(a.startDate).toISOString().split("T")[0]
        : "",

      endDate: a.endDate
        ? new Date(a.endDate).toISOString().split("T")[0]
        : "",

      startTime: a.startDate
        ? new Date(a.startDate).toTimeString().slice(0, 5)
        : "",

      endTime: a.endDate
        ? new Date(a.endDate).toTimeString().slice(0, 5)
        : "",
    });

    setSelectedStudents(a.students || []);
  };

  /* ================= DELETE ================= */
  const deleteAssessment = async (id) => {
    if (!window.confirm("Delete this assessment?")) return;

    try {
      await API.delete(`/assessments/${id}`);
      fetchAssessments();

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= SAVE ================= */
  const saveAssessment = async () => {
    if (!form.name) {
      return alert("Assessment name required");
    }

    if (!form.subjectId.length) {
      return alert("Select at least one subject");
    }

    if (!form.targetClass.length) {
      return alert("Select at least one class");
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name,
        assessmentType: form.assessmentType,
        term: form.term,
        year: form.year,
        totalMarks: Number(form.totalMarks || 100),

        subjects: cleanArray(form.subjectId).map(Number),

        targetClass: cleanArray(form.targetClass).join(","),

        students: selectedStudents,

        startDate: safeDateTime(form.startDate, form.startTime),
        endDate: safeDateTime(form.endDate, form.endTime),
      };

      if (!editingId) {
        await API.post("/assessments", payload);
      } else {
        await API.put(`/assessments/${editingId}`, payload);
      }

      await fetchAssessments();
      resetForm();

      alert(editingId ? "Assessment updated" : "Assessment created");
    } catch (err) {
      console.error(err);
      alert("Failed to save assessment");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATUS ================= */
  const getStatus = (a) => {
    const now = new Date(nowTick);

    const start = a.startDate ? new Date(a.startDate) : null;
    const end = a.endDate ? new Date(a.endDate) : null;

    if (a.status === "Inactive") {
      return "Inactive";
    }

    if (start && now < start) {
      return "Scheduled";
    }

    if (end && now > end) {
      return "Expired";
    }

    return "Active";
  };

  /* ================= COUNTDOWN ================= */
  const getCountdown = (a) => {
    if (!a?.startDate || !a?.endDate) return "";

    const now = new Date(nowTick);
    const start = new Date(a.startDate);
    const end = new Date(a.endDate);

    let diff = 0;
    let label = "";

    if (a.status === "Inactive") return "";

    if (now < start) {
      diff = start - now;
      label = "Starts in";
    } else if (now >= start && now <= end) {
      diff = end - now;
      label = "Ends in";
    } else {
      return "";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    return `${label} ${days}d ${hours}h ${minutes}m`;
  };

  /* ================= MEMOS ================= */
  const activeAssessments = useMemo(() => {
    return assessments.filter((a) => getStatus(a) === "Active").length;
  }, [assessments, nowTick]);

  return (
    <div style={styles.page}>
      {/* ================= HEADER ================= */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Assessment System</h1>
        <p style={styles.subtitle}>
          Create, schedule & manage assessments
        </p>
      </div>

      {/* ================= TOP BUTTONS ================= */}
      <div style={styles.topBar}>
        <button onClick={saveAssessment} style={styles.saveBtn}>
          {loading
            ? "Saving..."
            : editingId
            ? "Update Assessment"
            : "Create Assessment"}
        </button>

        {editingId && (
          <button onClick={resetForm} style={styles.cancelBtn}>
            Cancel Edit
          </button>
        )}
      </div>

      {/* ================= STATS ================= */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3>Total Assessments</h3>
          <h1>{assessments.length}</h1>
        </div>

        <div style={styles.statCard}>
          <h3>Active</h3>
          <h1>{activeAssessments}</h1>
        </div>

        <div style={styles.statCard}>
          <h3>Students Selected</h3>
          <h1>{selectedStudents.length}</h1>
        </div>
      </div>

      {/* ================= FORM ================= */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Assessment Form</h2>

        <div style={styles.grid}>
          <input
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            placeholder="Assessment Name"
            style={styles.input}
          />

          <select
            value={form.assessmentType}
            onChange={(e) =>
              setForm({
                ...form,
                assessmentType: e.target.value,
              })
            }
            style={styles.input}
          >
            <option>Exam</option>
            <option>Assignment</option>
            <option>Test</option>
            <option>CAT</option>
            <option>Practical</option>
          </select>

          <input
            type="number"
            value={form.totalMarks}
            onChange={(e) =>
              setForm({
                ...form,
                totalMarks: e.target.value,
              })
            }
            placeholder="Total Marks"
            style={styles.input}
          />

          <input
            value={form.term}
            onChange={(e) =>
              setForm({ ...form, term: e.target.value })
            }
            placeholder="Term"
            style={styles.input}
          />

          <input
            value={form.year}
            onChange={(e) =>
              setForm({ ...form, year: e.target.value })
            }
            placeholder="Year"
            style={styles.input}
          />

          <select
            onChange={(e) => handleSubjectChange(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Subject</option>
            <option value="ALL">All Subjects</option>

            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            onChange={(e) => handleClassChange(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Class</option>
            <option value="ALL">All Classes</option>

            {classes.map((c, i) => (
              <option key={i} value={c.studentClass}>
                {c.studentClass}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm({
                ...form,
                startDate: e.target.value,
              })
            }
            style={styles.input}
          />

          <input
            type="time"
            value={form.startTime}
            onChange={(e) =>
              setForm({
                ...form,
                startTime: e.target.value,
              })
            }
            style={styles.input}
          />

          <input
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm({
                ...form,
                endDate: e.target.value,
              })
            }
            style={styles.input}
          />

          <input
            type="time"
            value={form.endTime}
            onChange={(e) =>
              setForm({
                ...form,
                endTime: e.target.value,
              })
            }
            style={styles.input}
          />
        </div>

        {/* ================= SELECTED TAGS ================= */}
        <div style={styles.tagsWrap}>
          {form.subjectId.map((s, i) => (
            <span key={i} style={styles.tag}>
              Subject: {s}
            </span>
          ))}

          {form.targetClass.map((c, i) => (
            <span key={i} style={styles.tag2}>
              Class: {c}
            </span>
          ))}
        </div>
      </div>

      {/* ================= STUDENTS ================= */}
      {students.length > 0 && (
        <div style={styles.card}>
          <div style={styles.studentsHeader}>
            <h2>Students ({students.length})</h2>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={selectAll} style={styles.smallBtn}>
                Select All
              </button>

              <button onClick={clearAll} style={styles.smallBtn2}>
                Clear
              </button>
            </div>
          </div>

          <div style={styles.studentGrid}>
            {students.map((s) => (
              <div
                key={s.id}
                onClick={() => toggleStudent(s.id)}
                style={{
                  ...styles.studentCard,
                  background: selectedStudents.includes(s.id)
                    ? "linear-gradient(135deg,#16a34a,#15803d)"
                    : "linear-gradient(135deg,#7f1d1d,#450a0a)",
                }}
              >
                {s.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ASSESSMENT LIST ================= */}
      <div style={styles.card}>
        <h1 style={styles.title2}>Available Assessments</h1>
        <p style={styles.subtitle}>Edit, activate and manage assessments</p>

        {assessments.length === 0 && (
          <div style={styles.emptyState}>
            No assessments available
          </div>
        )}

        {assessments.map((a) => {
          const status = getStatus(a);
          const countdown = getCountdown(a);

          return (
            <div key={a.id} style={styles.item}>
              <div style={styles.assessmentTop}>
                <div>
                  <h3 style={{ margin: 0 }}>{a.name}</h3>

                  <p style={{ marginTop: 6, opacity: 0.9 }}>
                    {a.assessmentType} • {a.term} • {a.year}
                  </p>
                </div>

                <span
                  style={{
                    ...styles.statusBadge,
                    background:
                      status === "Active"
                        ? "#16a34a"
                        : status === "Scheduled"
                        ? "#f59e0b"
                        : status === "Expired"
                        ? "#dc2626"
                        : "#6b7280",
                  }}
                >
                  {status}
                </span>
              </div>

              {countdown && (
                <p style={styles.countdown}>
                  ⏳ {countdown}
                </p>
              )}

              <div style={styles.actionRow}>
                <button
                  onClick={() => editAssessment(a)}
                  style={styles.editBtn}
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={() => deleteAssessment(a.id)}
                  style={styles.deleteBtn}
                >
                  🗑 Delete
                </button>

                <button
                  onClick={() => toggleActive(a)}
                  style={styles.toggleBtn}
                >
                  {a.status === "Inactive"
                    ? "Activate"
                    : "Deactivate"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= TABS ================= */}
      <div style={styles.tabsWrapper}>
        <Tabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* ================= CONTENT ================= */}
      <div style={styles.card}>
        <div style={styles.contentHeader}>
          {activeTab === "marks" && "📊 Marks Management"}
          {activeTab === "analytics" && "📈 Performance Analytics"}
          {activeTab === "results" && "🏆 Results Overview"}
        </div>

        <div style={styles.contentBody}>
          {activeTab === "marks" && (
            <MarksTable
              assessmentId={editingId || assessments[0]?.id}
            />
          )}

          {activeTab === "analytics" && <Analytics />}

          {activeTab === "results" && <ResultsTable />}
        </div>
      </div>

      {/* ================= BULK ACTIONS ================= */}
      <div style={styles.card}>
        <BulkActions />
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 28,
    background: "linear-gradient(135deg,#f4f4f4,#eef2f7)",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: 900,
    color: "#1f2937",
    marginBottom: 6,
  },

  title2: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    color: "#6b7280",
    fontSize: 14,
  },

  sectionTitle: {
    marginBottom: 18,
    color: "#111827",
  },

  topBar: {
    display: "flex",
    gap: 12,
    marginBottom: 18,
  },

  saveBtn: {
    flex: 1,
    padding: "14px 18px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg,#7f1d1d,#991b1b)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },

  cancelBtn: {
    padding: "14px 18px",
    borderRadius: 12,
    border: "none",
    background: "#d1d5db",
    fontWeight: 700,
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16,
    marginBottom: 18,
  },

  statCard: {
    background: "#670b0b",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },

  card: {
    background: "#fff",
    padding: 22,
    borderRadius: 16,
    marginBottom: 18,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    border: "1px solid #f1f1f1",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: 12,
  },

  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
  },

  tagsWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 18,
  },

  tag: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
  },

  tag2: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 700,
  },

  studentsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  studentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
    gap: 12,
  },

  studentCard: {
    padding: "12px 14px",
    borderRadius: 12,
    color: "white",
    textAlign: "center",
    fontWeight: 700,
    cursor: "pointer",
    transition: "0.2s",
  },

  smallBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },

  smallBtn2: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 10,
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
  },

  emptyState: {
    padding: 30,
    textAlign: "center",
    color: "#6b7280",
  },

  item: {
    padding: 18,
    background: "linear-gradient(135deg,#4a0f0f,#3c0606)",
    borderRadius: 16,
    color: "white",
    marginBottom: 14,
  },

  assessmentTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  countdown: {
    marginTop: 12,
    color: "#7dd3fc",
    fontWeight: 700,
  },

  actionRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
  },

  editBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },

  deleteBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 10,
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },

  toggleBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 10,
    background: "#f59e0b",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },

  tabsWrapper: {
    marginBottom: 18,
    padding: 10,
    borderRadius: 16,
    background: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },

  contentHeader: {
    padding: 16,
    borderRadius: 12,
    background: "linear-gradient(135deg,#111827,#1f2937)",
    color: "white",
    fontWeight: 700,
    marginBottom: 16,
  },

  contentBody: {
    minHeight: 220,
  },
};
