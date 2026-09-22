import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolvePhotoUrl } from "../api";
import useSchoolSettings from "../hooks/useSchoolSettings";
import {
  ArrowLeft, Save, CheckCircle2, XCircle, Building2, Plus, Trash2,
  Star, Upload,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SCHOOL SETTINGS — this school's own identity (name, address,
   phone/email, exam-body centre code, number of classes, logo)
   plus the officials (Principal, Dean, etc.) whose names appear
   on downloaded reports and certificates. Doravo Core itself
   isn't tied to any one school, so every report/slip reads this
   table instead of a hard-coded string — see backend
   routes/schoolSettings.js and utils/ensureSchema.js.

   Grantable like "Website" (see App.jsx / permissions.js) —
   this is the school's own data, not a platform-level setting.
═══════════════════════════════════════════════════════════ */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    :root {
      --bg: #F8FAFC; --card: #FFFFFF; --card-elevated: #FFFFFF; --border: #E2E5EA;
      --text: #0B0F19; --text-secondary: #384152; --text-muted: #64748B;
      --primary: #8B1E2D; --primary-dark: #6F1725; --primary-tint: #FBEAEC;
      --success: #15803D; --success-tint: #ECFDF3; --warning: #B45309; --warning-tint: #FFFBEB;
      --destructive: #DC2626; --destructive-tint: #FEF2F2; --info: #1D4ED8; --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04); --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px; --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115; --card: #171A21; --card-elevated: #1D2129; --border: #323844;
      --text: #FFFFFF; --text-secondary: #C7CCD6; --text-muted: #9198A6;
      --primary: #E8A0A8; --primary-dark: #F3C0C6; --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80; --success-tint: rgba(22,163,74,0.18); --warning: #FBBF24; --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185; --destructive-tint: rgba(220,38,38,0.18); --info: #7DA6FF; --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3); --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    body { background: var(--bg); transition: background-color .2s ease; }
    @media (max-width: 900px) {
      .ss-main { padding: 20px 16px 48px !important; }
      .ss-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(el);
};

const C = {
  card: "var(--card)", border: "var(--border)",
  textPri: "var(--text)", textSec: "var(--text-secondary)", textMuted: "var(--text-muted)",
  accent: "var(--primary)", success: "var(--success)", danger: "var(--destructive)", white: "#ffffff",
};

const sx = {
  page: { minHeight: "100vh", padding: "28px 40px 60px", fontFamily: "Inter, sans-serif", background: "var(--bg)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 20 },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0", marginBottom: 8 },
  pageTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 },
  pageSub: { margin: "6px 0 0", fontSize: 14, color: C.textMuted },
  grid: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, alignItems: "start" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 24 },
  cardTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 15.5, fontWeight: 800, color: C.textPri, margin: "0 0 18px" },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 },
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg)", color: C.textPri, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  fieldWrap: { marginBottom: 14 },
  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: "none", background: C.accent, color: C.white, fontSize: 13.5, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  dangerBtnSm: { display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, background: "var(--destructive-tint)", color: C.danger, cursor: "pointer" },
  officialRow: { display: "grid", gridTemplateColumns: "auto 50px 1fr 1fr auto auto", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` },
  rankInput: { width: 50, padding: "10px 8px", borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg)", color: C.textPri, fontSize: 13, fontFamily: "inherit", textAlign: "center", boxSizing: "border-box" },
  logoBox: { width: 96, height: 96, borderRadius: 12, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", overflow: "hidden", flexShrink: 0 },
};

const emptyForm = {
  schoolName: "", shortName: "", motto: "", centreCode: "",
  address: "", phone: "", email: "", website: "", numberOfClasses: "", logoUrl: "",
  reportTheme: "",
};

export default function SchoolSettings() {
  const navigate = useNavigate();
  const { settings, officials, classTeachers, loading, refresh } = useSchoolSettings();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // Fixed catalog of downloaded-PDF-report color palettes — see backend
  // utils/reportThemes.js. Fetched once; falls back to just the default
  // "Slate" swatch if the request fails so the picker still renders.
  const [reportThemes, setReportThemes] = useState([{ key: "slate", name: "Slate (default)", primary: "#2c3e50" }]);

  useEffect(() => {
    API.get("/school-settings/report-themes")
      .then((res) => { if (res.data?.themes?.length) setReportThemes(res.data.themes); })
      .catch(() => {});
  }, []);

  const [newOfficial, setNewOfficial] = useState({ title: "", name: "", teacherId: "" });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  // Teachers to pick from instead of hand-typing a name — see
  // GET /school-settings/officials/teachers.
  const [teachers, setTeachers] = useState([]);
  useEffect(() => {
    API.get("/school-settings/officials/teachers")
      .then((res) => setTeachers(res.data?.teachers || []))
      .catch(() => {});
  }, []);

  // Every class in use (Students.studentClass) — see GET /api/meta/classes
  // — so a Class Teacher / Lecturer can be assigned per class instead of
  // typing the class name freehand and risking a mismatch with the
  // report card's lookup.
  const [classes, setClasses] = useState([]);
  useEffect(() => {
    API.get("/meta/classes")
      .then((res) => setClasses((res.data || []).map((r) => r.class_name).filter(Boolean)))
      .catch(() => {});
  }, []);

  const [newClassTeacher, setNewClassTeacher] = useState({ className: "", title: "Class Teacher / Lecturer", name: "", teacherId: "" });
  const [editingCtId, setEditingCtId] = useState(null);
  const [editCtDraft, setEditCtDraft] = useState({});

  useEffect(() => injectStyles(), []);

  useEffect(() => {
    if (settings) {
      setForm({
        schoolName: settings.schoolName || "",
        shortName: settings.shortName || "",
        motto: settings.motto || "",
        centreCode: settings.centreCode || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        numberOfClasses: settings.numberOfClasses ?? "",
        logoUrl: settings.logoUrl || "",
        reportTheme: settings.reportTheme || "",
      });
    }
  }, [settings]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleLogoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await API.post("/school-settings/logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, logoUrl: res.data.url }));
      showToast("success", "Logo uploaded — remember to save.");
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.schoolName.trim()) {
      showToast("error", "School name is required");
      return;
    }
    setSaving(true);
    try {
      await API.put("/school-settings", form);
      await refresh();
      showToast("success", "School details saved");
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addOfficial = async () => {
    if (!newOfficial.title.trim()) return;
    if (!newOfficial.teacherId && !newOfficial.name.trim()) {
      showToast("error", "Pick a teacher or type a name");
      return;
    }
    try {
      await API.post("/school-settings/officials", {
        title: newOfficial.title.trim(),
        name: newOfficial.name.trim(),
        teacherId: newOfficial.teacherId || null,
        sortOrder: officials.length + 1,
        isSignatory: false,
      });
      setNewOfficial({ title: "", name: "", teacherId: "" });
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to add official");
    }
  };

  const startEdit = (o) => {
    setEditingId(o.id);
    setEditDraft({
      title: o.title,
      name: o.teacherId ? "" : (o.name || ""),
      teacherId: o.teacherId || "",
      sortOrder: o.sortOrder,
      isSignatory: !!o.isSignatory,
    });
  };

  const saveEdit = async (id) => {
    try {
      await API.put(`/school-settings/officials/${id}`, editDraft);
      setEditingId(null);
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to update official");
    }
  };

  const deleteOfficial = async (id) => {
    if (!window.confirm("Remove this official?")) return;
    try {
      await API.delete(`/school-settings/officials/${id}`);
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to remove official");
    }
  };

  /* ── Class Teachers / Lecturers (per-class rank) ──
     Same add/edit/delete shape as Officials above, but every entry is
     scoped to one class — see routes/schoolSettings.js's /class-teachers
     endpoints. Printed automatically on a student's own report card
     for their class instead of a blank hand-signed line. */
  const addClassTeacher = async () => {
    if (!newClassTeacher.className) {
      showToast("error", "Pick a class");
      return;
    }
    if (!newClassTeacher.teacherId && !newClassTeacher.name.trim()) {
      showToast("error", "Pick a teacher or type a name");
      return;
    }
    try {
      const sameClassCount = classTeachers.filter((c) => c.className === newClassTeacher.className).length;
      await API.post("/school-settings/class-teachers", {
        className: newClassTeacher.className,
        title: newClassTeacher.title.trim() || "Class Teacher / Lecturer",
        name: newClassTeacher.name.trim(),
        teacherId: newClassTeacher.teacherId || null,
        sortOrder: sameClassCount + 1,
      });
      setNewClassTeacher({ className: "", title: "Class Teacher / Lecturer", name: "", teacherId: "" });
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to add class teacher");
    }
  };

  const startEditCt = (c) => {
    setEditingCtId(c.id);
    setEditCtDraft({
      className: c.className,
      title: c.title,
      name: c.teacherId ? "" : (c.name || ""),
      teacherId: c.teacherId || "",
      sortOrder: c.sortOrder,
    });
  };

  const saveEditCt = async (id) => {
    try {
      await API.put(`/school-settings/class-teachers/${id}`, editCtDraft);
      setEditingCtId(null);
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to update class teacher");
    }
  };

  const deleteClassTeacher = async (id) => {
    if (!window.confirm("Remove this class teacher?")) return;
    try {
      await API.delete(`/school-settings/class-teachers/${id}`);
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to remove class teacher");
    }
  };

  return (
    <div style={sx.page} className="ss-main">
      <button style={sx.backBtn} onClick={() => navigate("/dashboard")}>
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div style={sx.header}>
        <div>
          <h1 style={sx.pageTitle}><Building2 size={24} color={C.accent} /> School Settings</h1>
          <p style={sx.pageSub}>
            This school's own identity — every report, result slip, and certificate downloaded
            from Doravo Core pulls these details instead of a value baked into the code.
          </p>
        </div>
      </div>

      {toast && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
          background: C.card, border: `1px solid ${toast.type === "error" ? C.danger : C.success}`,
          marginBottom: 18, width: "fit-content",
        }}>
          {toast.type === "error" ? <XCircle size={16} style={{ color: C.danger }} /> : <CheckCircle2 size={16} style={{ color: C.success }} />}
          <span style={{ color: C.textPri, fontSize: 13.5 }}>{toast.msg}</span>
        </div>
      )}

      <div style={sx.grid} className="ss-grid">
        {/* ── LEFT: school details form ── */}
        <div style={sx.card}>
          <h3 style={sx.cardTitle}>School details</h3>

          <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
            <div style={sx.logoBox}>
              {form.logoUrl ? (
                <img src={resolvePhotoUrl(form.logoUrl)} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <Building2 size={28} color={C.textMuted} />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoPick} />
              <button type="button" style={sx.secondaryBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload size={14} /> {uploading ? "Uploading…" : form.logoUrl ? "Replace logo" : "Upload logo"}
              </button>
              <span style={{ fontSize: 11.5, color: C.textMuted }}>Shown on the login screen and at the top of downloaded reports.</span>
            </div>
          </div>

          <div style={sx.fieldWrap}>
            <label style={sx.fieldLabel}>School name *</label>
            <input style={sx.input} value={form.schoolName} onChange={handleField("schoolName")} placeholder="e.g. Asumbi Teachers Training College" />
          </div>

          <div style={sx.row}>
            <div>
              <label style={sx.fieldLabel}>Short name</label>
              <input style={sx.input} value={form.shortName} onChange={handleField("shortName")} placeholder="e.g. ASUMBI TTC" />
            </div>
            <div>
              <label style={sx.fieldLabel}>Centre code</label>
              <input style={sx.input} value={form.centreCode} onChange={handleField("centreCode")} placeholder="e.g. ASB-214" />
            </div>
          </div>

          <div style={sx.fieldWrap}>
            <label style={sx.fieldLabel}>Motto / tagline</label>
            <input style={sx.input} value={form.motto} onChange={handleField("motto")} />
          </div>

          <div style={sx.fieldWrap}>
            <label style={sx.fieldLabel}>Address</label>
            <input style={sx.input} value={form.address} onChange={handleField("address")} placeholder="P.O. Box …" />
          </div>

          <div style={sx.row}>
            <div>
              <label style={sx.fieldLabel}>Phone</label>
              <input style={sx.input} value={form.phone} onChange={handleField("phone")} />
            </div>
            <div>
              <label style={sx.fieldLabel}>Email</label>
              <input style={sx.input} value={form.email} onChange={handleField("email")} />
            </div>
          </div>

          <div style={sx.row}>
            <div>
              <label style={sx.fieldLabel}>Website</label>
              <input style={sx.input} value={form.website} onChange={handleField("website")} placeholder="https://…" />
            </div>
            <div>
              <label style={sx.fieldLabel}>Number of classes</label>
              <input style={sx.input} type="number" min="0" value={form.numberOfClasses} onChange={handleField("numberOfClasses")} />
            </div>
          </div>

          <div style={sx.fieldWrap}>
            <label style={sx.fieldLabel}>Report theme</label>
            <p style={{ margin: "-2px 0 10px", fontSize: 11.5, color: C.textMuted }}>
              Colors every downloaded PDF report (Main Examination Summary, Subject Results,
              Grade Distribution, Timetable, and every other report export) is drawn in.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {reportThemes.map((t) => {
                const selected = (form.reportTheme || "slate") === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, reportTheme: t.key }))}
                    title={t.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 10,
                      border: `2px solid ${selected ? t.primary : C.border}`,
                      background: selected ? `${t.primary}14` : C.card,
                      cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: C.textPri,
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: t.primary, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button style={{ ...sx.primaryBtn, marginTop: 8 }} onClick={handleSave} disabled={saving || loading}>
            <Save size={15} /> {saving ? "Saving…" : "Save school details"}
          </button>
        </div>

        {/* ── RIGHT: officials list ── */}
        <div style={sx.card}>
          <h3 style={sx.cardTitle}>Officials</h3>
          <p style={{ margin: "-10px 0 16px", fontSize: 12.5, color: C.textMuted }}>
            Anyone whose rank/name should appear on a result slip or certificate — Principal, Dean of
            Curriculum, Dean of Students, or any other role. Pick an existing teacher or type a name,
            give them a rank/order, and star as many as you like — every starred official appears on
            the report's signature line, in the order shown.
          </p>

          {officials.map((o) => (
            <div key={o.id} style={sx.officialRow}>
              {editingId === o.id ? (
                <>
                  <button
                    type="button"
                    title="Show on report signature line"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onClick={() => setEditDraft((d) => ({ ...d, isSignatory: !d.isSignatory }))}
                  >
                    <Star size={16} color={editDraft.isSignatory ? C.accent : C.textMuted} fill={editDraft.isSignatory ? C.accent : "none"} />
                  </button>
                  <input
                    style={sx.rankInput} type="number" title="Sign/display order"
                    value={editDraft.sortOrder ?? 0}
                    onChange={(e) => setEditDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                  />
                  <input style={sx.input} placeholder="Rank / title (e.g. Deputy Principal)" value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} />
                  {editDraft.teacherId ? (
                    <select
                      style={sx.input} value={editDraft.teacherId}
                      onChange={(e) => setEditDraft((d) => ({ ...d, teacherId: e.target.value, name: "" }))}
                    >
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      <option value="">— Type a name instead —</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input style={sx.input} value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Full name" />
                      {teachers.length > 0 && (
                        <select style={{ ...sx.input, maxWidth: 40 }} value="" title="Pick a teacher instead" onChange={(e) => e.target.value && setEditDraft((d) => ({ ...d, teacherId: e.target.value, name: "" }))}>
                          <option value="">↴</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                  <button style={sx.secondaryBtn} onClick={() => saveEdit(o.id)}>Save</button>
                  <button style={sx.secondaryBtn} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <Star size={16} color={o.isSignatory ? C.accent : C.textMuted} fill={o.isSignatory ? C.accent : "none"} />
                  <div style={{ fontSize: 12.5, color: C.textMuted, textAlign: "center" }}>#{o.sortOrder}</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPri }}>{o.title}</div>
                  </div>
                  <div style={{ fontSize: 13.5, color: C.textSec }}>
                    {o.name || <em style={{ color: C.textMuted }}>No name set</em>}
                    {o.teacherId && <span style={{ marginLeft: 6, fontSize: 11, color: C.textMuted }}>(linked teacher)</span>}
                  </div>
                  <button style={sx.secondaryBtn} onClick={() => startEdit(o)}>Edit</button>
                  <button style={sx.dangerBtnSm} onClick={() => deleteOfficial(o.id)}><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 16 }}>
            <input style={sx.input} placeholder="Rank / title (e.g. Dean of Students)" value={newOfficial.title} onChange={(e) => setNewOfficial((n) => ({ ...n, title: e.target.value }))} />
            {newOfficial.teacherId ? (
              <select style={sx.input} value={newOfficial.teacherId} onChange={(e) => setNewOfficial((n) => ({ ...n, teacherId: e.target.value, name: "" }))}>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                <option value="">— Type a name instead —</option>
              </select>
            ) : (
              <select
                style={sx.input} value=""
                onChange={(e) => e.target.value === "__custom__" ? setNewOfficial((n) => ({ ...n, teacherId: "" })) : setNewOfficial((n) => ({ ...n, teacherId: e.target.value, name: "" }))}
              >
                <option value="">Select a teacher…</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ""}</option>)}
              </select>
            )}
            <button style={sx.primaryBtn} onClick={addOfficial}><Plus size={15} /></button>
          </div>
          {!newOfficial.teacherId && (
            <input
              style={{ ...sx.input, marginTop: 8 }} placeholder="…or type a full name instead"
              value={newOfficial.name} onChange={(e) => setNewOfficial((n) => ({ ...n, name: e.target.value }))}
            />
          )}
        </div>
      </div>

      {/* ── Class Teachers / Lecturers — one rank per class, full width ── */}
      <div style={{ ...sx.card, marginTop: 0 }}>
        <h3 style={sx.cardTitle}>Class Teachers / Lecturers</h3>
        <p style={{ margin: "-10px 0 16px", fontSize: 12.5, color: C.textMuted }}>
          The teacher (or lecturer) in charge of each class — unlike Officials above, this is
          per-class, not school-wide. Give each one a rank/title (defaults to "Class Teacher /
          Lecturer" but can be relabelled, e.g. "Form Tutor" or "Assistant Class Teacher"). The
          top-ranked entry for a class is printed automatically on that class's student report
          cards, in place of a blank hand-signed line.
        </p>

        {classTeachers.length === 0 && (
          <p style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 14 }}>No class teachers assigned yet.</p>
        )}

        {classTeachers.map((c) => (
          <div key={c.id} style={sx.officialRow}>
            {editingCtId === c.id ? (
              <>
                <div style={{ fontSize: 12.5, color: C.textMuted, textAlign: "center" }}>#{c.sortOrder}</div>
                <select style={sx.input} value={editCtDraft.className} onChange={(e) => setEditCtDraft((d) => ({ ...d, className: e.target.value }))}>
                  {classes.map((cn) => <option key={cn} value={cn}>{cn}</option>)}
                  {!classes.includes(editCtDraft.className) && editCtDraft.className && (
                    <option value={editCtDraft.className}>{editCtDraft.className}</option>
                  )}
                </select>
                <input style={sx.input} placeholder="Rank / title (e.g. Class Teacher / Lecturer)" value={editCtDraft.title} onChange={(e) => setEditCtDraft((d) => ({ ...d, title: e.target.value }))} />
                {editCtDraft.teacherId ? (
                  <select
                    style={sx.input} value={editCtDraft.teacherId}
                    onChange={(e) => setEditCtDraft((d) => ({ ...d, teacherId: e.target.value, name: "" }))}
                  >
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    <option value="">— Type a name instead —</option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input style={sx.input} value={editCtDraft.name} onChange={(e) => setEditCtDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Full name" />
                    {teachers.length > 0 && (
                      <select style={{ ...sx.input, maxWidth: 40 }} value="" title="Pick a teacher instead" onChange={(e) => e.target.value && setEditCtDraft((d) => ({ ...d, teacherId: e.target.value, name: "" }))}>
                        <option value="">↴</option>
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                )}
                <button style={sx.secondaryBtn} onClick={() => saveEditCt(c.id)}>Save</button>
                <button style={sx.secondaryBtn} onClick={() => setEditingCtId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12.5, color: C.textMuted, textAlign: "center" }}>#{c.sortOrder}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPri }}>{c.className}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPri }}>{c.title}</div>
                </div>
                <div style={{ fontSize: 13.5, color: C.textSec }}>
                  {c.name || <em style={{ color: C.textMuted }}>No name set</em>}
                  {c.teacherId && <span style={{ marginLeft: 6, fontSize: 11, color: C.textMuted }}>(linked teacher)</span>}
                </div>
                <button style={sx.secondaryBtn} onClick={() => startEditCt(c)}>Edit</button>
                <button style={sx.dangerBtnSm} onClick={() => deleteClassTeacher(c.id)}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginTop: 16 }}>
          <select style={sx.input} value={newClassTeacher.className} onChange={(e) => setNewClassTeacher((n) => ({ ...n, className: e.target.value }))}>
            <option value="">Select a class…</option>
            {classes.map((cn) => <option key={cn} value={cn}>{cn}</option>)}
          </select>
          <input style={sx.input} placeholder="Rank / title" value={newClassTeacher.title} onChange={(e) => setNewClassTeacher((n) => ({ ...n, title: e.target.value }))} />
          {newClassTeacher.teacherId ? (
            <select style={sx.input} value={newClassTeacher.teacherId} onChange={(e) => setNewClassTeacher((n) => ({ ...n, teacherId: e.target.value, name: "" }))}>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              <option value="">— Type a name instead —</option>
            </select>
          ) : (
            <select
              style={sx.input} value=""
              onChange={(e) => e.target.value && setNewClassTeacher((n) => ({ ...n, teacherId: e.target.value, name: "" }))}
            >
              <option value="">Select a teacher…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ""}</option>)}
            </select>
          )}
          <button style={sx.primaryBtn} onClick={addClassTeacher}><Plus size={15} /></button>
        </div>
        {!newClassTeacher.teacherId && (
          <input
            style={{ ...sx.input, marginTop: 8 }} placeholder="…or type a full name instead"
            value={newClassTeacher.name} onChange={(e) => setNewClassTeacher((n) => ({ ...n, name: e.target.value }))}
          />
        )}
      </div>
    </div>
  );
}
