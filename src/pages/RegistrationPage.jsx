import React, { useState, useEffect } from "react";
import API from "../api";
import { PAGES } from "../permissions";

/* ================= REGISTRATION PAGE ================= */
export default function RegistrationPage() {
  const [type, setType] = useState("student");
  const [mode, setMode] = useState("manual"); // manual | upload
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  // Profile photo — required for manual student/teacher registration
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const f = e.target.files[0] || null;
    setPhoto(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  };

  useEffect(() => {
    // Revoke the object URL when it's replaced/unmounted to avoid leaks
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const [form, setForm] = useState({
    name: "",
    admissionNo: "",
    studentClass: "",
    gender: "",
    yearOfStudy: "",
    subject: "",
    phone: "",
    staffId: "",
    username: "",
    role: "sub_admin",
    permissions: [],
    email: "",
  });

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const togglePermission = (key) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
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
      username: "",
      role: "sub_admin",
      permissions: [],
      email: "",
    });
    setPhoto(null);
    setPhotoPreview(null);
  };

  /* ================= VALIDATION ================= */
  const isValid = () => {
    if (type === "account") {
      if (!form.username || !form.role) return false;
      // Admins get full access automatically; a sub-admin needs at
      // least one page picked now, since there's no separate step
      // to grant access later.
      if (form.role === "sub_admin" && form.permissions.length === 0) return false;
      return true;
    }

    if (!form.name) return false;

    // A profile photo is required for both student and teacher
    // registration — the account can't be created without one.
    if (!photo) return false;

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
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("admissionNo", form.admissionNo);
        fd.append("studentClass", form.studentClass);
        fd.append("gender", form.gender);
        fd.append("yearOfStudy", form.yearOfStudy);
        fd.append("photo", photo);

        const res = await API.post("/register/student", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const { username, password } = res.data.credentials;
        setMessage(`✅ Student registered  
Username: ${username}  
Temporary password: ${password}  
They'll be required to change it on first login.`);
      }

      if (type === "teacher") {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("subject", form.subject);
        fd.append("phone", form.phone);
        fd.append("staffId", form.staffId);
        fd.append("photo", photo);

        const res = await API.post("/register/teacher", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const { username, password } = res.data.credentials;
        setMessage(`✅ Teacher registered  
Username: ${username}  
Temporary password: ${password}  
They'll be required to change it on first login.`);
      }

      if (type === "account") {
        const res = await API.post("/register/user", {
          username: form.username,
          role: form.role,
          email: form.email,
          permissions: form.role === "sub_admin" ? form.permissions : [],
        });

        const { username, password, role, permissions } = res.data.credentials;
        const accessLine =
          role === "sub_admin"
            ? `\nPages granted: ${(permissions || []).join(", ") || "none"}`
            : "";
        setMessage(`✅ Account created (${role})  
Username: ${username}  
Temporary password: ${password}  
They'll be required to change it on first login — share it with them directly.${accessLine}`);
      }

      resetForm();

    } catch (err) {
      console.error(err);
      setMessage(`❌ ${err.response?.data?.message || "Registration failed"}`);
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
            <button onClick={() => { setType("account"); setMode("manual"); }} style={type === "account" ? styles.activeTab : styles.tab}>
              Admin / Sub-admin
            </button>
          </div>

          {/* MODE SELECT */}
          <div style={styles.tabs}>
            <button onClick={() => setMode("manual")} style={mode === "manual" ? styles.activeTab : styles.tab}>
              Manual Entry
            </button>
            {type !== "account" && (
              <button onClick={() => setMode("upload")} style={mode === "upload" ? styles.activeTab : styles.tab}>
                Bulk Upload
              </button>
            )}
          </div>

          {/* ================= MANUAL ================= */}
          {mode === "manual" && (
            <div style={styles.card}>

              {type !== "account" && (
                <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} style={styles.input} />
              )}

              {type !== "account" && (
                <div style={styles.photoRow}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
                  ) : (
                    <div style={styles.photoPlaceholder}>No photo</div>
                  )}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      style={styles.input}
                    />
                    <p style={{ fontSize: 11.5, color: "#aaa", margin: "4px 0 0" }}>
                      Profile photo is required (JPG, PNG, or WEBP)
                    </p>
                  </div>
                </div>
              )}

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

              {type === "account" && (
                <>
                  <input name="username" placeholder="Username" value={form.username} onChange={handleChange} style={styles.input} />
                  <input name="email" placeholder="Email (optional)" value={form.email} onChange={handleChange} style={styles.input} />
                  <select name="role" value={form.role} onChange={handleChange} style={styles.input}>
                    <option value="sub_admin">Sub Admin</option>
                    <option value="admin">Admin</option>
                  </select>

                  {form.role === "sub_admin" && (
                    <div style={styles.permBox}>
                      <p style={styles.permTitle}>
                        Pages this sub-admin can access
                      </p>
                      <div style={styles.permGrid}>
                        {PAGES.map((p) => (
                          <label key={p.key} style={styles.permItem}>
                            <input
                              type="checkbox"
                              checked={form.permissions.includes(p.key)}
                              onChange={() => togglePermission(p.key)}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                      {form.permissions.length === 0 && (
                        <p style={styles.permHint}>
                          Select at least one page — this is the only chance to set access; it isn't editable later without recreating the account.
                        </p>
                      )}
                    </div>
                  )}

                  {form.role === "admin" && (
                    <p style={styles.permHint}>
                      Admin accounts always have full access to every page.
                    </p>
                  )}
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
          {mode === "upload" && type !== "account" && (
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
  },
  permBox: {
    background: "#150000",
    border: "1px solid #444",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    textAlign: "left",
  },
  permTitle: {
    margin: "0 0 8px",
    fontSize: 13,
    fontWeight: 600,
    color: "#ddd",
  },
  permGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  permItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#ccc",
  },
  permHint: {
    marginTop: 8,
    fontSize: 11.5,
    color: "#aaa",
  },
  photoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  photoPreview: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #444",
    flexShrink: 0,
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "1px dashed #555",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9.5,
    color: "#888",
    textAlign: "center",
    flexShrink: 0,
  },
};