import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ================= GRADE ================= */
const getKnecGrade = (score) => {
  if (score >= 80) return { grade: 1, label: "Distinction" };
  if (score >= 75) return { grade: 2, label: "Distinction" };
  if (score >= 70) return { grade: 3, label: "Credit" };
  if (score >= 60) return { grade: 4, label: "Credit" };
  if (score >= 50) return { grade: 5, label: "Pass" };
  if (score >= 40) return { grade: 6, label: "Pass" };
  return { grade: 7, label: "Fail" };
};

export default function TeacherPortal() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marks, setMarks] = useState([]);

  const [selectedClass, setSelectedClass] = useState("A");

  const reportRef = useRef();

  /* ================= LOAD ================= */
  useEffect(() => {
    (async () => {
      const [s, sub, m] = await Promise.all([
        API.get("/students"),
        API.get("/subjects"),
        API.get("/marks"),
      ]);

      setStudents(s.data || []);
      setSubjects(sub.data || []);
      setMarks(m.data || []);
    })();
  }, []);

  /* ================= FILTER CLASS ================= */
  const classStudents = useMemo(() => {
    return students.filter((s) => s.studentClass === selectedClass);
  }, [students, selectedClass]);

  /* ================= COMPUTE RESULTS ================= */
  const results = useMemo(() => {
    return classStudents.map((student) => {
      let total = 0;

      subjects.forEach((sub) => {
        const found = marks.find(
          (m) => m.studentId === student.id && m.subjectId === sub.id
        );
        total += found ? Number(found.score) : 0;
      });

      const avg = Math.round(total / (subjects.length || 1));

      return {
        ...student,
        avg,
        grade: getKnecGrade(avg),
      };
    }).sort((a, b) => b.avg - a.avg);
  }, [classStudents, subjects, marks]);

  /* ================= PDF EXPORT ================= */
  const downloadPDF = async () => {
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 0, 0, 210, 297);
    pdf.save(`CLASS_${selectedClass}_REPORT.pdf`);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>👨‍🏫 TEACHER PORTAL</h1>

      {/* CLASS SELECT */}
      <div style={styles.controls}>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="A">Class A</option>
          <option value="B">Class B</option>
          <option value="C">Class C</option>
        </select>

        <button onClick={downloadPDF} style={styles.button}>
          DOWNLOAD CLASS REPORT
        </button>
      </div>

      {/* REPORT */}
      <div ref={reportRef} style={styles.card}>
        <h2>ASUMBI TTC</h2>
        <h3>CLASS {selectedClass} PERFORMANCE</h3>

        <table style={styles.table}>
          <thead>
            <tr style={styles.head}>
              <th>#</th>
              <th>Name</th>
              <th>Admission</th>
              <th>Average</th>
              <th>Grade</th>
            </tr>
          </thead>

          <tbody>
            {results.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td>{s.name}</td>
                <td>{s.admissionNo}</td>
                <td>{s.avg}</td>
                <td>
                  {s.grade.grade} ({s.grade.label})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    background: "#0b0b0b",
    minHeight: "100vh",
    padding: 20,
    color: "#fff",
  },

  title: {
    color: "#7f1d1d",
    textAlign: "center",
  },

  controls: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },

  button: {
    background: "#16a34a",
    color: "#fff",
    padding: 10,
    border: "none",
  },

  card: {
    background: "#fff",
    color: "#000",
    padding: 20,
    width: "210mm",
    margin: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  head: {
    background: "#7f1d1d",
    color: "#fff",
  },
};