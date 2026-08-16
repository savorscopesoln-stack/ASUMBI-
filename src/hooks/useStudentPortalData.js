import { useEffect, useState, useCallback } from "react";
import API from "../api";
import socket from "../socket"; // shared connection — was previously opening a second, separate socket to a hardcoded localhost URL

export default function useStudentPortalData(admissionNo) {
  const [loading, setLoading] = useState(true);

  const [marks, setMarks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [meal, setMeal] = useState(null);

  /* ================= FETCH ================= */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l, mealRes] = await Promise.all([
        API.get("/student/marks", { params: { studentId: admissionNo } }),
        API.get("/leave-outs/student", { params: { studentId: admissionNo } }),
        API.get("/students-with-meals"),
      ]);

      setMarks(m.data || []);
      setLeaves(l.data || []);

      const myMeal = (mealRes.data || []).find(
        (x) => x.admissionNo === admissionNo
      );

      setMeal(myMeal || null);
    } finally {
      setLoading(false);
    }
  }, [admissionNo]);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    if (!admissionNo) return;

    fetchAll();

    // join personal room
    socket.emit("join", admissionNo);

    return () => {
      socket.off("marks-updated");
      socket.off("leave-updated");
      socket.off("meal-updated");
    };
  }, [admissionNo, fetchAll]);

  /* ================= REAL-TIME LISTENERS ================= */
  useEffect(() => {
    socket.on("marks-updated", () => {
      fetchAll();
    });

    socket.on("leave-updated", () => {
      fetchAll();
    });

    socket.on("meal-updated", () => {
      fetchAll();
    });

    return () => {
      socket.off("marks-updated");
      socket.off("leave-updated");
      socket.off("meal-updated");
    };
  }, [fetchAll]);

  /* ================= ANALYTICS ================= */
  const analytics = (() => {
    const scores = marks.map((m) => Number(m.percentage || 0));

    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    return {
      avg: Math.round(avg),
      subjects: marks.length,
      grade: getGrade(avg),
    };
  })();

  const leaveSummary = {
    active: leaves.filter((l) => l.status === "approved").length,
    pending: leaves.filter((l) => l.status === "pending").length,
  };

  const mealSummary = meal
    ? {
        total: meal.mealsAllocated || 0,
        used: meal.mealsUsed || 0,
        remaining: (meal.mealsAllocated || 0) - (meal.mealsUsed || 0),
      }
    : { total: 0, used: 0, remaining: 0 };

  const chartData = marks.map((m) => ({
    subject: m.subjectName,
    score: Number(m.percentage || 0),
  }));

  return {
    loading,
    analytics,
    leaveSummary,
    mealSummary,
    chartData,
  };
}

/* ================= GRADE (SHARED LOGIC) ================= */
function getGrade(score) {
  if (score >= 80) return { label: "Distinction", color: "#16a34a" };
  if (score >= 70) return { label: "Credit", color: "#2563eb" };
  if (score >= 50) return { label: "Pass", color: "#ca8a04" };
  return { label: "Fail", color: "#dc2626" };
}