import React, { useState } from "react";
import API from "../api";

/* ================= REGISTRATION PAGE ================= */
export default function RegistrationPage() {
  const [type, setType] = useState("student");
  const [mode, setMode] = useState("manual"); // manual | upload
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    name: "",
    admissionNo: "",
    studentClass: "",
    gender: "",
    yearOfStudy: "",
    subject: "",
    phone: "",
    staffId: "",
  });

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const resetForm = () => {
    setForm({
      name: "",
      admissionNo: "",
      studentClass: "",
      gender: "",
      yearOfStudy: "",
      subject: "",
      phone: "",
      staffId: "",
    });
  };

  /* ================= VALIDATION ================= */
  const isValid = () => {
    if (!form.name) return false;

    if (type === "student") {
      return (
        form.admissionNo &&
        form.studentClass &&
        form.gender &&
        form.yearOfStudy
      );
    }

    if (type === "teacher") {
      return form.subject && form.phone && form.staffId;
    }

    return false;
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    if (!isValid()) {
      setMessage("⚠️ Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      if (type === "student") {
        await API.post("/register/student", {
          name: form.name,
          admissionNo: form.admissionNo,
          studentClass: form.studentClass,
          gender: form.gender,
          yearOfStudy: form.yearOfStudy,
        });

        setMessage(`✅ Student registered  
Username: ${form.admissionNo}  
Password: 1234`);
      }

      if (type === "teacher") {
        await API.post("/register/teacher", {
          name: form.name,
          subject: form.subject,
          phone: form.phone,
          staffId: form.staffId,
        });

        setMessage(`✅ Teacher registered  
Username: ${form.staffId}  
Password: 1234`);
      }

      resetForm();

    } catch (err) {
      console.error(err);
      setMessage("❌ Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPLOAD ================= */
  const uploadFile = async () => {
    if (!file) {
      setMessage("⚠️ Please select a file");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type + "s"); // students / teachers

      const res = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(`✅ Uploaded ${res.data.inserted} ${type}s successfully`);

    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      <button style={styles.backBtn} onClick={() => window.history.back()}>
        ← Back
      </button>

      <h1>📌 Registration Module</h1>

      <button
        onClick={() => setOpen(!open)}
        style={open ? styles.closeBtn : styles.openBtn}
      >
        {open ? "Close Registration" : "Open Registration"}
      </button>

      {message && <p style={styles.message}>{message}</p>}

      {open && (
        <div style={styles.centerWrap}>

          {/* TYPE SELECT */}
          <div style={styles.tabs}>
            <button onClick={() => setType("student")} style={type === "student" ? styles.activeTab : styles.tab}>
              Student
            </button>
            <button onClick={() => setType("teacher")} style={type === "teacher" ? styles.activeTab : styles.tab}>
              Teacher
            </button>
          </div>

          {/* MODE SELECT */}
          <div style={styles.tabs}>
            <button onClick={() => setMode("manual")} style={mode === "manual" ? styles.activeTab : styles.tab}>
              Manual Entry
            </button>
            <button onClick={() => setMode("upload")} style={mode === "upload" ? styles.activeTab : styles.tab}>
              Bulk Upload
            </button>
          </div>

          {/* ================= MANUAL ================= */}
          {mode === "manual" && (
            <div style={styles.card}>

              <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} style={styles.input} />

              {type === "student" && (
                <>
                  <input name="admissionNo" placeholder="Admission No" value={form.admissionNo} onChange={handleChange} style={styles.input} />
                  <input name="studentClass" placeholder="Class" value={form.studentClass} onChange={handleChange} style={styles.input} />
                  <input name="gender" placeholder="Gender" value={form.gender} onChange={handleChange} style={styles.input} />
                  <input name="yearOfStudy" placeholder="Year of Study" value={form.yearOfStudy} onChange={handleChange} style={styles.input} />
                </>
              )}

              {type === "teacher" && (
                <>
                  <input name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} style={styles.input} />
                  <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} style={styles.input} />
                  <input name="staffId" placeholder="Staff ID" value={form.staffId} onChange={handleChange} style={styles.input} />
                </>
              )}

              <button
                onClick={submit}
                disabled={loading || !isValid()}
                style={{
                  ...styles.btn,
                  opacity: loading || !isValid() ? 0.6 : 1
                }}
              >
                {loading ? "Saving..." : "Register"}
              </button>

            </div>
          )}

          {/* ================= UPLOAD ================= */}
          {mode === "upload" && (
            <div style={styles.card}>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                style={styles.input}
              />

              <button onClick={uploadFile} disabled={loading} style={styles.btn}>
                {loading ? "Uploading..." : "Upload File"}
              </button>

              <p style={{ fontSize: 12, color: "#aaa" }}>
                Upload {type}s Excel/CSV file
              </p>

            </div>
          )}

        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    background: "#0b0000",
    color: "white",
    textAlign: "center",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 20,
    padding: "8px 12px",
    background: "#333",
    color: "white",
    border: "none",
    borderRadius: 6,
  },
  openBtn: {
    padding: 10,
    background: "green",
    border: "none",
    borderRadius: 6,
    marginBottom: 20,
  },
  closeBtn: {
    padding: 10,
    background: "#800000",
    border: "none",
    borderRadius: 6,
    marginBottom: 20,
  },
  centerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  tabs: {
    display: "flex",
    gap: 10,
    marginBottom: 15,
  },
  tab: {
    padding: 10,
    background: "#333",
    border: "none",
    borderRadius: 6,
    color: "white",
  },
  activeTab: {
    padding: 10,
    background: "#800000",
    border: "none",
    borderRadius: 6,
    color: "white",
  },
  card: {
    background: "#1a0000",
    padding: 20,
    borderRadius: 10,
    width: 400,
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #444",
    background: "#111",
    color: "white",
  },
  btn: {
    width: "100%",
    padding: 10,
    background: "#800000",
    color: "white",
    border: "none",
    borderRadius: 6,
  },
  message: {
    marginBottom: 10,
    color: "#facc15",
    whiteSpace: "pre-line"
  }
};