import React, { useEffect, useState, useRef } from "react";
import API from "../../api";
import * as XLSX from "xlsx";

/* ================= GRADE ================= */
const getGrade = (p) => {
  if (p >= 75) return { g: "Distinction", c: "#22c55e" };
  if (p >= 60) return { g: "Credit", c: "#3b82f6" };
  if (p >= 40) return { g: "Pass", c: "#f59e0b" };
  return { g: "Fail", c: "#ef4444" };
};

/* ================= TIME LOGIC ================= */
const isExpired = (a) =>
  a?.endDate && new Date(a.endDate).getTime() < Date.now();

const isNotStarted = (a) =>
  a?.startDate && new Date(a.startDate).getTime() > Date.now();

const isLocked = (a) => {
  if (!a) return true;
  if (a.status !== "Active") return true;
  if (isExpired(a)) return true;
  if (isNotStarted(a)) return true;
  return false;
};

export default function MarksEntry() {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [students, setStudents] = useState([]);

  const [draftMarks, setDraftMarks] = useState({});

  const [importPreview, setImportPreview] = useState([]);

  const [saving, setSaving] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);

  const inputRefs = useRef({});

  /* ================= LOAD ================= */
  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await API.get("/assessments");
      setAssessments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };
/* ================= LOAD EXISTING MARKS (FIX) ================= */
const loadExistingMarks = async (studentList, subjectId) => {
  try {
    setLoadingMarks(true);

    const res = await API.get(`/marks/${selected.id}`, {
      params: { subjectId },
    });

    const marksList =
      res.data?.data ||
      res.data?.marks ||
      res.data ||
      [];

    const map = {};

    studentList.forEach((s) => {
      const found = marksList.find(
        (m) => String(m.studentId) === String(s.id)
      );

      map[s.id] = found ? found.rawScore || found.score : "";
    });

    setDraftMarks(map);
  } catch (err) {
    console.error("LOAD MARKS ERROR:", err);
  } finally {
    setLoadingMarks(false);
  }
};
  /* ================= TEMPLATE DOWNLOAD ================= */
  const downloadTemplate = () => {
    if (!students.length) {
      alert("Select class first");
      return;
    }

    const template = students.map((s) => ({
      "Student ID": s.id,
      "Student Name": s.name,
      Marks: "",
    }));

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks_Template");

    XLSX.writeFile(wb, "marks_template.xlsx");
  };

  /* ================= SELECT ASSESSMENT ================= */
  const selectAssessment = async (a) => {
    setSelected(a);
    setSelectedClass("");
    setSelectedSubject(null);
    setStudents([]);
    setDraftMarks({});
    setImportPreview([]);

    try {
      const id = a.id;

      const [classRes, subjectRes, allSubjectsRes] = await Promise.all([
        API.get(`/assessment-students/${id}`),
        API.get(`/assessments/${id}/subjects`),
        API.get(`/subjects`),
      ]);

      const assessmentSubjects = Array.isArray(subjectRes.data)
        ? subjectRes.data
        : [];

      const allSubjects = Array.isArray(allSubjectsRes.data)
        ? allSubjectsRes.data
        : [];

      setSubjects(
        assessmentSubjects.length > 0 ? assessmentSubjects : allSubjects
      );

      const studentList = Array.isArray(classRes.data) ? classRes.data : [];

      const uniqueClasses = [
        ...new Set(studentList.map((s) => s.studentClass)),
      ].map((c) => ({ studentClass: c }));

      setClasses(uniqueClasses);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= SUBJECT ================= */
  const selectSubject = (subject) => {
    setSelectedSubject(subject);
    setSelectedClass("");
    setStudents([]);
    setDraftMarks({});
    setImportPreview([]);
  };

 /* ================= CLASS ================= */
const selectClass = async (cls) => {
  if (!selectedSubject) {
    alert("Select subject first");
    return;
  }

  setSelectedClass(cls);

  try {
    const id = selected.id;

    const studentsRes = await API.get(`/assessment-students/${id}`, {
      params: { classLevel: cls },
    });

    const list = Array.isArray(studentsRes.data) ? studentsRes.data : [];

    setStudents(list);
    setImportPreview([]);

    // 🔥 FIX: DO NOT WIPE MARKS, LOAD EXISTING ONCE STUDENTS LOAD
    if (selectedSubject?.id) {
      loadExistingMarks(list, selectedSubject.id);
    }
  } catch (err) {
    console.error(err);
  }
};
  /* ================= CHANGE MARK ================= */
  const changeMark = (studentId, value) => {
    const max = selected?.totalMarks || 100;
    const safe = Math.min(Number(value || 0), max);

    setDraftMarks((prev) => ({
      ...prev,
      [studentId]: safe,
    }));
  };

  /* ================= KEY NAV ================= */
  const handleKeyNav = (e, index) => {
    const ids = students.map((s) => s.id);

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextId = ids[index + 1];
      if (nextId && inputRefs.current[nextId]) {
        inputRefs.current[nextId].focus();
      }
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevId = ids[index - 1];
      if (prevId && inputRefs.current[prevId]) {
        inputRefs.current[prevId].focus();
      }
    }
  };

  /* ================= EXCEL UPLOAD ================= */
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const preview = [];

      json.forEach((row) => {
        const id = row["Student ID"];
        const name = (row["Student Name"] || row["Name"] || "").toLowerCase().trim();
        const score = Number(row["Marks"] || row["Score"] || 0);

        let matchedStudent =
          students.find((s) => String(s.id) === String(id)) ||
          students.find((s) => s.name?.toLowerCase().trim() === name);

        if (matchedStudent) {
          preview.push({
            studentId: matchedStudent.id,
            name: matchedStudent.name,
            score,
            matched: true,
          });
        } else {
          preview.push({
            studentId: null,
            name,
            score,
            matched: false,
          });
        }
      });

      setImportPreview(preview);
    };

    reader.readAsArrayBuffer(file);
  };

  /* ================= APPLY IMPORT ================= */
  const applyImportedMarks = () => {
    const map = {};

    importPreview.forEach((row) => {
      if (row.matched && row.studentId) {
        map[row.studentId] = row.score;
      }
    });

    setDraftMarks((prev) => ({ ...prev, ...map }));
    alert("Marks applied");
  };

  /* ================= SAVE ================= */
  const saveAll = async () => {
  if (!selected?.id || !selectedSubject?.id) {
    alert("Select assessment and subject first");
    return;
  }

  setSaving(true);

  try {
    const payload = {
      assessmentId: Number(selected.id),
      subjectId: Number(selectedSubject.id),
      data: students
        .map((s) => ({
          studentId: Number(s.id),
          rawScore: Number(draftMarks[s.id] ?? 0),
        }))
        .filter((m) => !isNaN(m.studentId)),
    };

    console.log("SENDING PAYLOAD:", payload);

    const res = await API.post("/marks/save", payload);

    console.log("SAVE RESPONSE:", res.data);

    if (res.status === 200 || res.status === 201) {
      alert("Marks saved successfully");
    } else {
      alert("Save failed - unexpected response");
    }
  } catch (err) {
    console.error("SAVE ERROR:", err?.response?.data || err.message);
    alert("Error saving marks");
  } finally {
    setSaving(false);
  }
};

  const locked = isLocked(selected);

  return (
    <div style={styles.page}>
      <h1>Marks Entry System</h1>

      {/* ASSESSMENTS */}
      <div style={styles.card}>
        <h3>Assessments</h3>
        {assessments.map((a) => (
          <button
            key={a.id}
            onClick={() => selectAssessment(a)}
            style={{
              ...styles.btn,
              background: selected?.id === a.id ? "green" : "#333",
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* SUBJECTS */}
      {selected && (
        <div style={styles.card}>
          <h3>Subjects</h3>

          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSubject(s)}
              style={{
                ...styles.btn,
                background:
                  Number(selectedSubject?.id) === Number(s.id)
                    ? "blue"
                    : "#222",
              }}
            >
              {s.name}
            </button>
          ))}

          <button onClick={downloadTemplate} style={{ ...styles.btn, background: "#16a34a" }}>
            Download Excel Template
          </button>

          <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />

          {importPreview.length > 0 && (
            <button onClick={applyImportedMarks} style={{ ...styles.btn, background: "orange" }}>
              Apply Imported Marks
            </button>
          )}
        </div>
      )}

      {/* IMPORT PREVIEW */}
      {importPreview.length > 0 && (
        <div style={styles.card}>
          <h3>Preview</h3>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {importPreview.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.score}</td>
                  <td style={{ color: r.matched ? "lime" : "red" }}>
                    {r.matched ? "MATCHED" : "NOT FOUND"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CLASSES */}
      {selected && (
        <div style={styles.card}>
          <h3>Classes</h3>
          {classes.map((c, i) => (
            <button
              key={i}
              onClick={() => selectClass(c.studentClass)}
              style={{
                ...styles.btn,
                background:
                  selectedClass === c.studentClass ? "purple" : "#222",
              }}
            >
              {c.studentClass}
            </button>
          ))}
        </div>
      )}

      {/* TABLE */}
      {students.length > 0 && (
        <div style={styles.card}>
          <h3>Marks</h3>

          <table style={styles.table}>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <input
                      value={draftMarks[s.id] || ""}
                      onChange={(e) => changeMark(s.id, e.target.value)}
                      disabled={locked}
                      style={styles.input}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={saveAll} style={styles.saveBtn}>
            Save All
          </button>
        </div>
      )}
    </div>
  );
}
/* ================= LOAD EXISTING MARKS (FIX) ================= */
const loadExistingMarks = async (studentList, subjectId) => {
  try {
    setLoadingMarks(true);

    const res = await API.get(`/marks/${selected.id}`, {
      params: { subjectId },
    });

    const marksList =
      res.data?.data ||
      res.data?.marks ||
      res.data ||
      [];

    const map = {};

    studentList.forEach((s) => {
      const found = marksList.find(
        (m) => String(m.studentId) === String(s.id)
      );

      map[s.id] = found ? found.rawScore || found.score : "";
    });

    setDraftMarks(map);
  } catch (err) {
    console.error("LOAD MARKS ERROR:", err);
  } finally {
    setLoadingMarks(false);
  }
};
/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, background: "#111", color: "white", minHeight: "100vh" },
  card: { background: "#222", padding: 15, marginBottom: 15, borderRadius: 10 },
  btn: { margin: 5, padding: 10, borderRadius: 6, color: "white", border: "none" },
  table: { width: "100%", marginTop: 10 },
  input: { width: 80, padding: 5 },
  saveBtn: {
    marginTop: 15,
    padding: 10,
    background: "green",
    color: "white",
    border: "none",
    borderRadius: 6,
    width: "100%",
  },
};