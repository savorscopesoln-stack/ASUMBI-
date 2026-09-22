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
  officialRow: { display: "grid", gridTemplateColumns: "auto 1fr 1fr auto auto", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` },
  logoBox: { width: 96, height: 96, borderRadius: 12, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", overflow: "hidden", flexShrink: 0 },
};

const emptyForm = {
  schoolName: "", shortName: "", motto: "", centreCode: "",
  address: "", phone: "", email: "", website: "", numberOfClasses: "", logoUrl: "",
  reportTheme: "",
};

export default function SchoolSettings() {
  const navigate = useNavigate();
  const { settings, officials, loading, refresh } = useSchoolSettings();

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

  const [newOfficial, setNewOfficial] = useState({ title: "", name: "" });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

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
    try {
      await API.post("/school-settings/officials", {
        title: newOfficial.title.trim(),
        name: newOfficial.name.trim(),
        sortOrder: officials.length + 1,
        isSignatory: officials.length === 0,
      });
      setNewOfficial({ title: "", name: "" });
      await refresh();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to add official");
    }
  };

  const startEdit = (o) => {
    setEditingId(o.id);
    setEditDraft({ title: o.title, name: o.name || "", sortOrder: o.sortOrder, isSignatory: !!o.isSignatory });
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
            Anyone whose title/name should appear on a result slip or certificate — Principal, Dean of
            Curriculum, Dean of Students, or any other role. The star marks whose name appears on the
            main signature line.
          </p>

          {officials.map((o) => (
            <div key={o.id} style={sx.officialRow}>
              {editingId === o.id ? (
                <>
                  <button
                    type="button"
                    title="Mark as main signatory"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onClick={() => setEditDraft((d) => ({ ...d, isSignatory: !d.isSignatory }))}
                  >
                    <Star size={16} color={editDraft.isSignatory ? C.accent : C.textMuted} fill={editDraft.isSignatory ? C.accent : "none"} />
                  </button>
                  <input style={sx.input} value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} />
                  <input style={sx.input} value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Full name" />
                  <button style={sx.secondaryBtn} onClick={() => saveEdit(o.id)}>Save</button>
                  <button style={sx.secondaryBtn} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <Star size={16} color={o.isSignatory ? C.accent : C.textMuted} fill={o.isSignatory ? C.accent : "none"} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPri }}>{o.title}</div>
                  </div>
                  <div style={{ fontSize: 13.5, color: C.textSec }}>{o.name || <em style={{ color: C.textMuted }}>No name set</em>}</div>
                  <button style={sx.secondaryBtn} onClick={() => startEdit(o)}>Edit</button>
                  <button style={sx.dangerBtnSm} onClick={() => deleteOfficial(o.id)}><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 16 }}>
            <input style={sx.input} placeholder="Title (e.g. Dean of Students)" value={newOfficial.title} onChange={(e) => setNewOfficial((n) => ({ ...n, title: e.target.value }))} />
            <input style={sx.input} placeholder="Full name" value={newOfficial.name} onChange={(e) => setNewOfficial((n) => ({ ...n, name: e.target.value }))} />
            <button style={sx.primaryBtn} onClick={addOfficial}><Plus size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
