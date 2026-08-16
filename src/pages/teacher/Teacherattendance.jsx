import React, { useEffect, useState, useMemo } from "react";
import API from "../../api";

/* ================= STATUS ================= */
const STATUS = ["Present", "Absent", "Late"];

/* ================= MAIN ================= */
export default function AttendanceRegister() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  const [session, setSession] = useState("Morning");

  /* ================= INIT ATTENDANCE ================= */
  const initAttendance = (studentsData, savedData = []) => {
    const map = {};

    savedData.forEach((a) => {
      map[String(a.studentId)] = a.status;
    });

    const init = {};
    studentsData.forEach((s) => {
      init[String(s.id)] = map[String(s.id)] || "Present";
    });

    setAttendance(init);
  };

  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [studentsRes, attendanceRes] = await Promise.all([
          API.get("/students"),
          API.get(`/attendance?date=${date}&session=${session}`),
        ]);

        const studentsData = studentsRes.data || [];
        const attendanceData = attendanceRes.data || [];

        setStudents(studentsData);

        initAttendance(studentsData, attendanceData);
      } catch (err) {
        console.log("LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [date, session]);

  /* ================= MANUAL RELOAD ================= */
  const forceLoadStudents = async () => {
    try {
      setLoading(true);

      const res = await API.get("/students");
      const studentsData = res.data || [];

      setStudents(studentsData);

      const init = {};
      studentsData.forEach((s) => {
        init[String(s.id)] = "Present";
      });

      setAttendance(init);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SET STATUS ================= */
  const setStatus = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [String(studentId)]: status,
    }));
  };

  /* ================= SUMMARY ================= */
  const summary = useMemo(() => {
    const values = Object.values(attendance);

    return {
      present: values.filter((v) => v === "Present").length,
      absent: values.filter((v) => v === "Absent").length,
      late: values.filter((v) => v === "Late").length,
      total: students.length,
    };
  }, [attendance, students]);

  /* ================= SAVE ================= */
  const saveAttendance = async () => {
    try {
      setSaving(true);

      await API.post("/attendance/save", {
        date,
        session,
        records: Object.entries(attendance).map(([studentId, status]) => ({
          studentId: Number(studentId),
          status,
        })),
      });

      alert("Attendance saved successfully!");
    } catch (err) {
      console.log(err);
      alert("Failed to save attendance");
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
          <h2>📋 Attendance Register</h2>
          <p style={{ opacity: 0.6 }}>
            {date} • {session} Session
          </p>
        </div>

        <div style={styles.controls}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={styles.input}
          />

          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            style={styles.input}
          >
            <option>Morning</option>
            <option>Afternoon</option>
          </select>

          {/* 🔄 FORCE LOAD BUTTON */}
          <button onClick={forceLoadStudents} style={styles.reloadBtn}>
            🔄 Load Students
          </button>

          <button
            onClick={saveAttendance}
            disabled={saving}
            style={styles.saveBtn}
          >
            {saving ? "Saving..." : "💾 Save"}
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div style={styles.summary}>
        <div>Present: {summary.present}</div>
        <div>Absent: {summary.absent}</div>
        <div>Late: {summary.late}</div>
        <div>Total: {summary.total}</div>
      </div>

      {/* STUDENTS LIST */}
      <div style={styles.card}>
        {loading ? (
          <p>Loading students...</p>
        ) : (
          students.map((s) => (
            <div key={s.id} style={styles.row}>
              <div>
                <b>{s.name}</b>
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  {s.admissionNo}
                </p>
              </div>

              <div style={styles.buttons}>
                {STATUS.map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(s.id, st)}
                    style={{
                      ...styles.btn,
                      background:
                        attendance[String(s.id)] === st
                          ? statusColor(st)
                          : "rgba(255,255,255,0.1)",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */
const statusColor = (st) => {
  if (st === "Present") return "#22c55e";
  if (st === "Absent") return "#ef4444";
  return "#f59e0b";
};

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    background: "#0b0000",
    color: "#fff",
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  controls: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  input: {
    padding: 8,
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
  },

  saveBtn: {
    background: "#7f1d1d",
    border: "none",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },

  reloadBtn: {
    background: "#1d4ed8",
    border: "none",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },

  summary: {
    display: "flex",
    gap: 20,
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },

  card: {
    background: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 12,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    alignItems: "center",
  },

  buttons: {
    display: "flex",
    gap: 8,
  },

  btn: {
    padding: "6px 10px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "#fff",
  },
};