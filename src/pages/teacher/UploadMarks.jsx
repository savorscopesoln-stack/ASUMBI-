import React, { useEffect, useState } from "react";
import API from "../../api";
import * as XLSX from "xlsx";

/* ================= GRADE ================= */
const getGrade = (p) => {
  if (p >= 75) return { g: "Distinction", c: "#22c55e" };
  if (p >= 60) return { g: "Credit", c: "#facc15" };
  if (p >= 40) return { g: "Pass", c: "#f97316" };
  return { g: "Fail", c: "#ef4444" };
};

export default function MarksEntryUpload() {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);

  const [classes, setClasses] = useState([]);

  // 🔥 FIXED: SUBJECT STATE WAS MISSING
  const [subjects, setSubjects] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});

  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    API.get("/assessments")
      .then((r) => setAssessments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAssessments([]));
  }, []);

  /* ================= SELECT ASSESSMENT ================= */
  const selectAssessment = async (a) => {
    setSelected(a);
    setSelectedClass("");
    setSelectedSubject(null);
    setStudents([]);
    setMarks({});
    setSubjects([]); // 🔥 reset subjects properly

    try {
      const id = a.id;

      const [classRes, subjectRes] = await Promise.all([
        API.get(`/assessment-students/${id}`),
        API.get(`/assessments/${id}/subjects`),
      ]);

      const studentList = Array.isArray(classRes.data) ? classRes.data : [];
      const subjectList = Array.isArray(subjectRes.data) ? subjectRes.data : [];

      setStudents(studentList);
      setSubjects(subjectList); // 🔥 FIX: NOW SUBJECTS WILL SHOW

      const uniqueClasses = [
        ...new Set(studentList.map((s) => s.studentClass)),
      ].map((c) => ({ studentClass: c }));

      setClasses(uniqueClasses);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= SUBJECT ================= */
  const selectSubject = (subject) => {
    setSelectedSubject(subject);
    setSelectedClass("");
    setStudents([]);
    setMarks({});
  };

  /* ================= CLASS ================= */
  const selectClass = async (cls) => {
    if (!selectedSubject) return alert("Select subject first");

    setSelectedClass(cls);

    try {
      const [studentsRes, marksRes] = await Promise.all([
        API.get(`/assessment-students/${selected.id}`, {
          params: { classLevel: cls },
        }),
        API.get(`/marks/${selected.id}`, {
          params: { subjectId: selectedSubject.id },
        }),
      ]);

      const studentList = Array.isArray(studentsRes.data)
        ? studentsRes.data
        : [];

      const marksList = Array.isArray(marksRes.data) ? marksRes.data : [];

      setStudents(studentList);

      const map = {};
      studentList.forEach((s) => {
        const found = marksList.find(
          (m) => Number(m.studentId) === Number(s.id)
        );
        map[s.id] = found ? found.rawScore : "";
      });

      setMarks(map);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= CHANGE MARK ================= */
  const changeMark = (studentId, value) => {
    const safe = Number(value || 0);

    setMarks((prev) => ({
      ...prev,
      [studentId]: safe,
    }));
  };

  /* ================= SAVE ALL ================= */
  const saveAll = async () => {
    setSaving(true);

    try {
      await API.post("/marks/save", {
        assessmentId: selected.id,
        data: students.map((s) => ({
          studentId: s.id,
          subjectId: selectedSubject.id,
          rawScore: marks[s.id] || 0,
        })),
      });

      alert("Saved successfully");
    } catch (err) {
      console.log(err);
    } finally {
      setSaving(false);
    }
  };

  /* ================= UPLOAD EXCEL ================= */
  const handleUpload = async (file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const payload = [];

      json.forEach((row) => {
        const studentId = row["ADM.NO"];
        if (!studentId) return;

        subjects.forEach((sub) => {
          payload.push({
            studentId: Number(studentId),
            subjectId: sub.id,
            rawScore: Number(row[sub.code] || 0),
          });
        });
      });

      try {
        setUploading(true);

        await API.post("/marks/save", {
          assessmentId: selected.id,
          data: payload,
        });

        setUploadMsg("✔ Upload Successful");
      } catch (err) {
        console.log(err);
        setUploadMsg("❌ Upload Failed");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const locked = !selected;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>MARKS ENTRY SYSTEM</h2>

      {/* ================= ASSESSMENTS ================= */}
      <div style={styles.card}>
        <h3 style={styles.h3}>Assessments</h3>
        {assessments.map((a) => (
          <button
            key={a.id}
            onClick={() => selectAssessment(a)}
            style={{
              ...styles.btn,
              background: selected?.id === a.id ? "#800000" : "#111",
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* ================= SUBJECTS (NOW FIXED) ================= */}
      {selected && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Subjects</h3>

          {subjects.length === 0 && (
            <p style={{ color: "yellow" }}>No subjects found</p>
          )}

          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSubject(s)}
              style={{
                ...styles.btn,
                background:
                  selectedSubject?.id === s.id ? "#16a34a" : "#222",
              }}
            >
              {s.name} ({s.code})
            </button>
          ))}
        </div>
      )}

      {/* ================= CLASSES + UPLOAD ================= */}
      {selected && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Classes</h3>

          {classes.map((c, i) => (
            <button
              key={i}
              onClick={() => selectClass(c.studentClass)}
              style={{
                ...styles.btn,
                background:
                  selectedClass === c.studentClass ? "#800000" : "#222",
              }}
            >
              {c.studentClass}
            </button>
          ))}

          {/* UPLOAD */}
          <div style={styles.uploadBox}>
            <h4 style={{ color: "yellow" }}>Upload Excel Marks</h4>

            <input
              type="file"
              onChange={(e) => handleUpload(e.target.files[0])}
              style={styles.file}
            />

            {uploading && <p style={{ color: "lightgreen" }}>Uploading...</p>}
            {uploadMsg && <p style={{ color: "yellow" }}>{uploadMsg}</p>}
          </div>
        </div>
      )}

      {/* ================= MARKS ================= */}
      {students.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.h3}>
            Enter Marks - {selectedSubject?.name}
          </h3>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Marks</th>
                <th>%</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>
              {students.map((s) => {
                const raw = marks[s.id] || 0;
                const grade = getGrade(raw);

                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>
                      <input
                        value={marks[s.id] || ""}
                        onChange={(e) =>
                          changeMark(s.id, e.target.value)
                        }
                        style={styles.input}
                      />
                    </td>
                    <td>{raw}%</td>
                    <td style={{ color: grade.c }}>{grade.g}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button onClick={saveAll} style={styles.saveBtn}>
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, background: "#000", minHeight: "100vh", color: "#fff" },
  title: { color: "yellow" },
  h3: { color: "#fff" },

  card: {
    background: "#1a0000",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    border: "1px solid #800000",
  },

  btn: {
    margin: 5,
    padding: 10,
    borderRadius: 6,
    color: "#fff",
    border: "none",
  },

  table: { width: "100%", marginTop: 10, color: "#fff" },

  input: {
    width: 80,
    padding: 5,
    background: "#111",
    color: "#fff",
    border: "1px solid #800000",
  },

  saveBtn: {
    marginTop: 15,
    padding: 10,
    background: "#800000",
    color: "#fff",
    border: "none",
    width: "100%",
  },

  uploadBox: {
    marginTop: 15,
    padding: 10,
    border: "1px dashed yellow",
  },

  file: { marginTop: 10, color: "#fff" },
};