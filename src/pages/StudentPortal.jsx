import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ================= KNEC GRADE SYSTEM ================= */
const getKnecGrade = (score) => {
  if (score >= 80) return { grade: 1, label: "Distinction" };
  if (score >= 75) return { grade: 2, label: "Distinction" };
  if (score >= 70) return { grade: 3, label: "Credit" };
  if (score >= 60) return { grade: 4, label: "Credit" };
  if (score >= 50) return { grade: 5, label: "Pass" };
  if (score >= 40) return { grade: 6, label: "Pass" };
  return { grade: 7, label: "Fail" };
};

const getOverallResult = (avg) => {
  if (avg >= 75) return "PASS WITH DISTINCTION";
  if (avg >= 60) return "PASS WITH CREDIT";
  if (avg >= 40) return "PASS";
  return "CRNM";
};

export default function StudentPortal() {
  const [admissionNo, setAdmissionNo] = useState("");
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allMarks, setAllMarks] = useState([]);

  // ✅ ADDED: MEALS STATE
  const [meal, setMeal] = useState(null);

  const reportRef = useRef();

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    (async () => {
      const [sub, m] = await Promise.all([
        API.get("/subjects"),
        API.get("/marks"),
      ]);

      setSubjects(sub.data || []);
      setAllMarks(m.data || []);
    })();
  }, []);

  /* ================= SEARCH STUDENT ================= */
  const findStudent = async () => {
    const res = await API.get("/students");

    const found = res.data.find(
      (s) => s.admissionNo === admissionNo
    );

    if (!found) return alert("Student not found");

    setStudent(found);

    const studentMarks = allMarks.filter(
      (m) => m.studentId === found.id
    );

    setMarks(studentMarks);

    // ✅ ADDED: FETCH MEAL CARD
    try {
      const mealRes = await API.get("/students-with-meals");
      const mealData = mealRes.data.find(
        (m) => m.admissionNo === found.admissionNo
      );

      setMeal(mealData || null);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= COMPUTE RESULT ================= */
  const result = useMemo(() => {
    if (!student) return null;

    let total = 0;
    let count = subjects.length;

    const subjectScores = {};

    subjects.forEach((sub) => {
      const found = marks.find((m) => m.subjectId === sub.id);
      const score = found ? Number(found.score) : 0;

      subjectScores[sub.id] = score;
      total += score;
    });

    const avg = Math.round(total / (count || 1));

    return {
      subjectScores,
      avg,
      grade: getKnecGrade(avg),
      result: getOverallResult(avg),
    };
  }, [student, marks, subjects]);

  /* ================= CLASS POSITION ================= */
  const classPosition = useMemo(() => {
    if (!student) return null;

    const grouped = {};

    allMarks.forEach((m) => {
      const s = m.studentId;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(m);
    });

    const averages = Object.keys(grouped).map((sid) => {
      let total = 0;
      let count = subjects.length;

      subjects.forEach((sub) => {
        const found = grouped[sid].find(
          (m) => m.subjectId === sub.id
        );
        total += found ? Number(found.score) : 0;
      });

      return {
        studentId: sid,
        avg: total / (count || 1),
      };
    });

    averages.sort((a, b) => b.avg - a.avg);

    const pos =
      averages.findIndex((a) => a.studentId === student.id) + 1;

    return pos;
  }, [student, allMarks, subjects]);

  /* ================= PDF EXPORT ================= */
  const downloadPDF = async () => {
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
    });

    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 0, 0, 210, 297);
    pdf.save(`${student.name}_RESULT.pdf`);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🎓 STUDENT PORTAL</h1>

      {/* LOGIN SECTION */}
      <div style={styles.loginBox}>
        <input
          placeholder="Enter Admission Number"
          value={admissionNo}
          onChange={(e) => setAdmissionNo(e.target.value)}
          style={styles.input}
        />

        <button onClick={findStudent} style={styles.button}>
          VIEW RESULTS
        </button>
      </div>

      {/* REPORT CARD */}
      {student && result && (
        <div ref={reportRef} style={styles.card}>
          <h2>ASUMBI TTC</h2>
          <h3>STUDENT PERFORMANCE REPORT</h3>

          <div style={styles.info}>
            <p><b>Name:</b> {student.name}</p>
            <p><b>Admission:</b> {student.admissionNo}</p>
            <p><b>Class:</b> {student.studentClass}</p>
            <p><b>Class Position:</b> {classPosition}</p>
          </div>

          {/* ================= MEAL CARD (NEW) ================= */}
          <div style={styles.mealCard}>
            <h3>🍽 MEAL STATUS</h3>

            <p>
              <b>Used:</b>{" "}
              {meal?.isActive ? meal.mealsUsed : 0}
            </p>

            <p>
              <b>Allocated:</b>{" "}
              {meal?.isActive ? meal.mealsAllocated : 0}
            </p>

            <p>
              <b>Remaining:</b>{" "}
              {meal?.isActive
                ? meal.mealsAllocated - meal.mealsUsed
                : 0}
            </p>

            <p
              style={{
                color: meal?.isActive ? "green" : "red",
              }}
            >
              <b>Status:</b>{" "}
              {meal?.isActive ? "ACTIVE" : "SUSPENDED"}
            </p>
          </div>

          <table style={styles.table}>
            <thead>
              <tr style={styles.head}>
                <th>Subject</th>
                <th>Score</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>
              {subjects.map((sub) => {
                const score = result.subjectScores[sub.id] || 0;
                const g = getKnecGrade(score);

                return (
                  <tr key={sub.id}>
                    <td>{sub.name}</td>
                    <td>{score}</td>
                    <td>
                      {g.grade} ({g.label})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={styles.summary}>
            <h3>Average: {result.avg}</h3>
            <h3>Grade: {result.grade.grade}</h3>
            <h3>Result: {result.result}</h3>
          </div>

          <button onClick={downloadPDF} style={styles.pdfBtn}>
            DOWNLOAD REPORT
          </button>
        </div>
      )}
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

  loginBox: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },

  input: {
    padding: 10,
    width: 250,
  },

  button: {
    background: "#7f1d1d",
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

  info: {
    marginBottom: 10,
  },

  mealCard: {
    background: "#f3f3f3",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  head: {
    background: "#7f1d1d",
    color: "#fff",
  },

  summary: {
    marginTop: 10,
    padding: 10,
    background: "#f3f3f3",
  },

  pdfBtn: {
    marginTop: 15,
    width: "100%",
    padding: 10,
    background: "#16a34a",
    color: "#fff",
    border: "none",
  },
};