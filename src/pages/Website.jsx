import React, { useEffect, useState } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

/* Shares the single design-token stylesheet (CSS variables on
   :root / [data-theme='dark']) that Dashboard owns. injectDesignTokens()
   is idempotent (guarded by the "dash-tokens" id) so it's safe to call
   again here in case this page is the first one mounted. */
const injectDesignTokens = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    body { background: var(--bg); transition: background-color .2s ease; }
  `;
  document.head.appendChild(el);
};

/* Section registry — each entry knows its own default "new item" shape
   and which kind of editor it needs (list-of-strings, list-of-objects,
   or a single object form). Adding a new editable section to the
   public site later just means adding one entry here + a matching
   section_key in the backend's VALID_SECTIONS + website_content seed. */
const SECTIONS = [
  { key: "announcements", label: "Announcements", kind: "string-list", newItem: () => "" },
  { key: "hero", label: "Hero", kind: "object", fields: [
    { key: "kicker", label: "Kicker pill text", type: "text" },
    { key: "eyebrow", label: "Eyebrow line", type: "text" },
    { key: "headline", label: "Headline (use a blank line for a line break)", type: "textarea" },
    { key: "subtitle", label: "Subtitle paragraph", type: "textarea" },
  ] },
  { key: "principal", label: "Principal's Message", kind: "object", fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "title", label: "Title / credentials line", type: "text" },
    { key: "yearsLabel", label: "\"Years as Principal\" badge (e.g. 15 yrs)", type: "text" },
    { key: "quote", label: "Pull-quote", type: "textarea" },
  ], listField: { key: "bio", label: "Bio paragraphs", newItem: () => "" } },
  { key: "stats", label: "Stats Strip", kind: "object-list", newItem: () => ({ label: "", value: 0 }),
    itemFields: [
      { key: "label", label: "Label", type: "text" },
      { key: "value", label: "Value", type: "number" },
    ] },
  { key: "milestones", label: "Milestones", kind: "object-list", newItem: () => ({ year: "", text: "", current: false }),
    itemFields: [
      { key: "year", label: "Year", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "current", label: "Mark as current milestone", type: "checkbox" },
    ] },
  { key: "news", label: "News & Announcements", kind: "object-list", newItem: () => ({ tag: "", tagColor: "maroon", title: "", excerpt: "", date: "" }),
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "tag", label: "Tag", type: "text" },
      { key: "tagColor", label: "Tag color (maroon / green / gold)", type: "text" },
      { key: "excerpt", label: "Excerpt", type: "textarea" },
      { key: "date", label: "Date (display text, e.g. 24 July 2026)", type: "text" },
    ] },
  { key: "testimonials", label: "Testimonials", kind: "object-list", newItem: () => ({ initials: "", quote: "", name: "", detail: "" }),
    itemFields: [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "name", label: "Name", type: "text" },
      { key: "initials", label: "Initials (avatar)", type: "text" },
      { key: "detail", label: "Detail line (e.g. Diploma in Teacher Education, 2022)", type: "text" },
    ] },
  { key: "faqs", label: "FAQs", kind: "object-list", newItem: () => ({ q: "", a: "" }),
    itemFields: [
      { key: "q", label: "Question", type: "text" },
      { key: "a", label: "Answer", type: "textarea" },
    ] },
];

export default function Website() {
  const { theme, toggleTheme } = useTheme();
  useEffect(() => { injectDesignTokens(); }, []);

  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const [data, setData] = useState({}); // { [sectionKey]: content }
  const [meta, setMeta] = useState({}); // { [sectionKey]: { updated_by_name, updated_at } }
  const [loadedKeys, setLoadedKeys] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const activeSection = SECTIONS.find((s) => s.key === activeKey);

  const notify = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  const loadSection = async (key) => {
    setLoading(true);
    try {
      const res = await API.get(`/website/${key}`);
      const section = SECTIONS.find((s) => s.key === key);
      const fallback = section.kind === "string-list" || section.kind === "object-list" ? [] : {};
      setData((prev) => ({ ...prev, [key]: res.data?.content ?? fallback }));
      setMeta((prev) => ({ ...prev, [key]: { updated_by_name: res.data?.updated_by_name, updated_at: res.data?.updated_at } }));
      setLoadedKeys((prev) => ({ ...prev, [key]: true }));
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to load section", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadedKeys[activeKey]) loadSection(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const setSectionData = (key, updater) => {
    setData((prev) => ({ ...prev, [key]: typeof updater === "function" ? updater(prev[key]) : updater }));
  };

  const saveSection = async (key) => {
    setSaving(true);
    try {
      await API.put(`/website/${key}`, { content: data[key] });
      notify("Saved — live on the website within about a minute.");
      loadSection(key);
    } catch (err) {
      notify(err?.response?.data?.message || "Save failed", true);
    } finally {
      setSaving(false);
    }
  };

  /* ================= RENDER HELPERS ================= */

  const renderStringList = (section) => {
    const items = data[section.key] || [];
    return (
      <div>
        {items.map((item, i) => (
          <div key={i} style={styles.listRow}>
            <textarea
              style={styles.textarea}
              value={item}
              onChange={(e) =>
                setSectionData(section.key, (prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
              }
            />
            <button
              style={styles.dangerBtnSm}
              onClick={() => setSectionData(section.key, (prev) => prev.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          style={styles.secondaryBtn}
          onClick={() => setSectionData(section.key, (prev) => [...(prev || []), section.newItem()])}
        >
          + Add
        </button>
      </div>
    );
  };

  const renderObjectListItemField = (section, item, index, field) => {
    const value = item?.[field.key] ?? (field.type === "checkbox" ? false : "");
    const onChange = (v) =>
      setSectionData(section.key, (prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, [field.key]: v } : it))
      );

    if (field.type === "checkbox") {
      return (
        <label key={field.key} style={styles.checkboxRow}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    }
    if (field.type === "textarea") {
      return (
        <div key={field.key} style={styles.field}>
          <label style={styles.label}>{field.label}</label>
          <textarea style={styles.textarea} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    }
    if (field.type === "number") {
      return (
        <div key={field.key} style={styles.field}>
          <label style={styles.label}>{field.label}</label>
          <input
            type="number"
            style={styles.input}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    }
    return (
      <div key={field.key} style={styles.field}>
        <label style={styles.label}>{field.label}</label>
        <input type="text" style={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  };

  const renderObjectList = (section) => {
    const items = data[section.key] || [];
    return (
      <div>
        {items.map((item, i) => (
          <div key={i} style={styles.itemCard}>
            <div style={styles.itemCardHeader}>
              <span style={styles.itemCardIndex}>#{i + 1}</span>
              <button
                style={styles.dangerBtnSm}
                onClick={() => setSectionData(section.key, (prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
            {section.itemFields.map((f) => renderObjectListItemField(section, item, i, f))}
          </div>
        ))}
        <button
          style={styles.secondaryBtn}
          onClick={() => setSectionData(section.key, (prev) => [...(prev || []), section.newItem()])}
        >
          + Add
        </button>
      </div>
    );
  };

  const renderObjectForm = (section) => {
    const obj = data[section.key] || {};
    return (
      <div>
        {section.fields.map((f) => (
          <div key={f.key} style={styles.field}>
            <label style={styles.label}>{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                style={styles.textarea}
                value={obj[f.key] ?? ""}
                onChange={(e) => setSectionData(section.key, (prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            ) : (
              <input
                type="text"
                style={styles.input}
                value={obj[f.key] ?? ""}
                onChange={(e) => setSectionData(section.key, (prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            )}
          </div>
        ))}

        {section.listField && (
          <div style={styles.field}>
            <label style={styles.label}>{section.listField.label}</label>
            {(obj[section.listField.key] || []).map((para, i) => (
              <div key={i} style={styles.listRow}>
                <textarea
                  style={styles.textarea}
                  value={para}
                  onChange={(e) =>
                    setSectionData(section.key, (prev) => ({
                      ...prev,
                      [section.listField.key]: (prev[section.listField.key] || []).map((v, idx) => (idx === i ? e.target.value : v)),
                    }))
                  }
                />
                <button
                  style={styles.dangerBtnSm}
                  onClick={() =>
                    setSectionData(section.key, (prev) => ({
                      ...prev,
                      [section.listField.key]: (prev[section.listField.key] || []).filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              style={styles.secondaryBtn}
              onClick={() =>
                setSectionData(section.key, (prev) => ({
                  ...prev,
                  [section.listField.key]: [...(prev[section.listField.key] || []), section.listField.newItem()],
                }))
              }
            >
              + Add paragraph
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderActiveSection = () => {
    if (!loadedKeys[activeKey]) return <p style={styles.hint}>Loading…</p>;
    if (activeSection.kind === "string-list") return renderStringList(activeSection);
    if (activeSection.kind === "object-list") return renderObjectList(activeSection);
    return renderObjectForm(activeSection);
  };

  const activeMeta = meta[activeKey];

  return (
    <div className="pz-app" style={styles.page}>
      {toast && (
        <div style={{ ...styles.toast, background: toast.isError ? "var(--destructive)" : "var(--success)" }}>
          {toast.msg}
        </div>
      )}

      <div style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Website Content</h1>
          <p style={styles.subtitle}>
            Edits here go live on the public marketing website — usually within about a minute.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          style={styles.iconBtn}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.tabRail}>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              style={activeKey === s.key ? styles.tabActive : styles.tab}
              onClick={() => setActiveKey(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>{activeSection.label}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {activeMeta?.updated_at && (
                <span style={styles.hint}>
                  Last saved {new Date(activeMeta.updated_at).toLocaleString()}
                  {activeMeta.updated_by_name ? ` by ${activeMeta.updated_by_name}` : ""}
                </span>
              )}
              <button style={styles.primaryBtn} onClick={() => saveSection(activeKey)} disabled={saving || loading}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "var(--bg)", minHeight: "100vh", color: "var(--text)", fontFamily: "'Inter', system-ui, sans-serif", padding: 24 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text)" },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" },
  iconBtn: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)",
    width: 38, height: 38, borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", fontSize: 15, flexShrink: 0,
  },
  layout: { display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" },
  tabRail: { display: "flex", flexDirection: "column", gap: 4, minWidth: 200, flexShrink: 0 },
  tab: {
    textAlign: "left", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid transparent",
    background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
  },
  tabActive: {
    textAlign: "left", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary)",
    background: "var(--primary-tint)", color: "var(--primary)", cursor: "pointer", fontSize: 13.5, fontWeight: 700,
  },
  card: {
    flex: 1, minWidth: 320, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: 22, boxShadow: "var(--shadow-sm)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)", borderLeft: "3px solid var(--primary)", paddingLeft: 10 },
  hint: { fontSize: 11.5, color: "var(--text-muted)" },
  field: { marginBottom: 16 },
  label: { display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" },
  input: {
    width: "100%", padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", outline: "none", fontSize: 13.5, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", minHeight: 70, padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", outline: "none", fontSize: 13.5, boxSizing: "border-box", resize: "vertical",
  },
  listRow: { display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, fontWeight: 600 },
  itemCard: { background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 14 },
  itemCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  itemCardIndex: { fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 },
  primaryBtn: { background: "var(--primary)", padding: "9px 16px", color: "#fff", border: "1px solid var(--primary)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 13 },
  secondaryBtn: { border: "1px solid var(--border)", background: "var(--card)", padding: "8px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text)", fontSize: 13, fontWeight: 600 },
  dangerBtnSm: { border: "1px solid var(--destructive)", background: "var(--destructive-tint)", color: "var(--destructive)", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 },
  toast: {
    position: "fixed", top: 16, right: 16, zIndex: 999, color: "#fff", padding: "10px 16px", borderRadius: 8,
    boxShadow: "var(--shadow)", maxWidth: "90vw", fontWeight: 600, fontSize: 13,
  },
};
