import React, { useEffect, useRef, useState } from "react";
import API, { resolvePhotoUrl } from "../api";
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

/* =========================================================
   SECTION REGISTRY
   One entry per editable area of the public website. This is the
   single place that defines what an admin can edit — adding a new
   editable field/section later means adding an entry here AND a
   matching section_key in the backend (routes/website.js
   VALID_SECTIONS + utils/ensureSchema.js default seed).

   Field types: "text" | "textarea" | "number" | "checkbox" |
   "image" | "select" (needs `options`).

   kind "list": a top-level array.
     - itemType "string": each item is plain text (e.g. announcements).
     - itemType "object": each item has itemFields (e.g. news).
   kind "object": a top-level object with `fields`, and optionally
     `subLists` — named nested arrays (e.g. principal.bio paragraphs,
     whyUs.items, siteMeta.socialLinks) rendered the same way a
     top-level list would be, just scoped inside the object.
========================================================= */
const ICON_OPTIONS = ["Compass", "FileText", "Users", "GraduationCap", "BookOpen", "Heart"];

const SECTIONS = [
  { key: "hero", label: "Hero (Homepage Banner)", kind: "object",
    fields: [
      { key: "kicker", label: "Kicker pill text", type: "text" },
      { key: "eyebrow", label: "Eyebrow line", type: "text" },
      { key: "headline", label: "Headline (blank line = line break)", type: "textarea" },
      { key: "subtitle", label: "Subtitle paragraph", type: "textarea" },
      { key: "backgroundImage", label: "Background photo (optional)", type: "image" },
    ] },
  { key: "announcements", label: "Announcement Ticker", kind: "list", itemType: "string", newItem: () => "" },
  { key: "principal", label: "Principal's Message", kind: "object",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "title", label: "Title / credentials line", type: "text" },
      { key: "yearsLabel", label: "\"Years as Principal\" badge (e.g. 15 yrs)", type: "text" },
      { key: "quote", label: "Pull-quote", type: "textarea" },
      { key: "photo", label: "Portrait photo", type: "image" },
    ],
    subLists: [{ key: "bio", label: "Bio paragraphs", itemType: "string", newItem: () => "" }] },
  { key: "stats", label: "Stats Strip", kind: "list", itemType: "object", newItem: () => ({ label: "", value: 0 }),
    itemFields: [ { key: "label", label: "Label", type: "text" }, { key: "value", label: "Value", type: "number" } ] },
  { key: "milestones", label: "Milestones (Our Story)", kind: "list", itemType: "object", newItem: () => ({ year: "", text: "", current: false }),
    itemFields: [
      { key: "year", label: "Year", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "current", label: "Mark as current milestone", type: "checkbox" },
    ] },
  { key: "academicsIntro", label: "Academics Section Intro", kind: "object",
    fields: [
      { key: "kicker", label: "Kicker", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro paragraph", type: "textarea" },
    ] },
  { key: "departments", label: "Departments", kind: "list", itemType: "object", newItem: () => ({ index: "", slug: "", name: "", description: "", overview: "", staff: "" }),
    itemFields: [
      { key: "index", label: "Number (e.g. 01)", type: "text" },
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "URL slug (e.g. sciences-mathematics — leave blank to auto-generate from name)", type: "text" },
      { key: "description", label: "Short description (shown on cards)", type: "textarea" },
      { key: "overview", label: "Full overview (shown on the department's own page)", type: "textarea" },
      { key: "staff", label: "Department staff (one name per line, optional)", type: "textarea" },
    ] },
  { key: "programmes", label: "Programmes (Academics page + detail pages)", kind: "list", itemType: "object",
    newItem: () => ({ name: "", slug: "", duration: "", entry: "", overview: "", subjects: "", careerPathways: "", entryRequirements: "" }),
    itemFields: [
      { key: "name", label: "Programme name", type: "text" },
      { key: "slug", label: "URL slug (leave blank to auto-generate from name)", type: "text" },
      { key: "duration", label: "Duration", type: "text" },
      { key: "entry", label: "Entry requirement (short, shown in the table)", type: "text" },
      { key: "overview", label: "Overview (shown on the programme's own page)", type: "textarea" },
      { key: "subjects", label: "Subjects / specializations (one per line)", type: "textarea" },
      { key: "careerPathways", label: "Career pathways (one per line)", type: "textarea" },
      { key: "entryRequirements", label: "Entry requirements, full detail (one per line)", type: "textarea" },
    ] },
  { key: "quickLinks", label: "Quick Link Cards (Vision / Mission / etc.)", kind: "list", itemType: "object",
    newItem: () => ({ icon: "Compass", title: "", text: "", linkHref: "", linkLabel: "" }),
    itemFields: [
      { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "linkHref", label: "Link URL (optional)", type: "text" },
      { key: "linkLabel", label: "Link label (optional)", type: "text" },
    ] },
  { key: "whyUs", label: "Why Choose Us", kind: "object",
    fields: [ { key: "kicker", label: "Kicker", type: "text" }, { key: "heading", label: "Heading", type: "text" } ],
    subLists: [{ key: "items", label: "Reasons", itemType: "object", newItem: () => ({ num: "", title: "", text: "" }),
      itemFields: [
        { key: "num", label: "Number / stat (e.g. 58)", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ] }] },
  { key: "gallery", label: "Campus Gallery", kind: "list", itemType: "object",
    newItem: () => ({ label: "", image: null, tall: false, video: false }),
    itemFields: [
      { key: "label", label: "Caption / alt text", type: "text" },
      { key: "image", label: "Photo", type: "image" },
      { key: "tall", label: "Tall tile (spans 2 rows in the grid)", type: "checkbox" },
      { key: "video", label: "Show \"Watch tour\" video button on this tile", type: "checkbox" },
    ] },
  { key: "news", label: "News & Announcements", kind: "list", itemType: "object",
    newItem: () => ({ tag: "", tagColor: "maroon", title: "", slug: "", excerpt: "", body: "", date: "", image: null }),
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "slug", label: "URL slug (leave blank to auto-generate from title)", type: "text" },
      { key: "tag", label: "Tag", type: "text" },
      { key: "tagColor", label: "Tag color", type: "select", options: ["maroon", "green", "gold"] },
      { key: "excerpt", label: "Excerpt (shown on the News list)", type: "textarea" },
      { key: "body", label: "Full article body (shown on the article's own page)", type: "textarea" },
      { key: "date", label: "Date (display text, e.g. 24 July 2026)", type: "text" },
      { key: "image", label: "Photo", type: "image" },
    ] },
  { key: "testimonials", label: "Testimonials", kind: "list", itemType: "object",
    newItem: () => ({ initials: "", quote: "", name: "", detail: "", photo: null }),
    itemFields: [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "name", label: "Name", type: "text" },
      { key: "initials", label: "Initials (used only if no photo)", type: "text" },
      { key: "detail", label: "Detail line (e.g. Diploma in Teacher Education, 2022)", type: "text" },
      { key: "photo", label: "Photo (optional — replaces the initials circle)", type: "image" },
    ] },
  { key: "partners", label: "Partner Organisations", kind: "list", itemType: "string", newItem: () => "" },
  { key: "visit", label: "Plan Your Visit", kind: "object",
    fields: [
      { key: "kicker", label: "Kicker", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro paragraph", type: "textarea" },
      { key: "mapImage", label: "Map / directions photo", type: "image" },
    ] },
  { key: "faqs", label: "FAQs", kind: "list", itemType: "object", newItem: () => ({ q: "", a: "" }),
    itemFields: [ { key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" } ] },
  { key: "admissionSteps", label: "How to Apply — Steps", kind: "list", itemType: "object",
    newItem: () => ({ step: "", title: "", text: "" }),
    itemFields: [
      { key: "step", label: "Step number", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
    ] },
  { key: "admissionRequirements", label: "Admission Requirements List", kind: "list", itemType: "string", newItem: () => "" },
  { key: "admissionsExternal", label: "Official Admissions Link", kind: "object",
    fields: [
      { key: "label", label: "Button label", type: "text" },
      { key: "url", label: "External admissions URL (leave blank to hide the button)", type: "text" },
      { key: "note", label: "Note shown alongside the button", type: "textarea" },
    ] },
  { key: "events", label: "Events", kind: "list", itemType: "object",
    newItem: () => ({ title: "", description: "", date: "", time: "", location: "", image: null, status: "upcoming", featured: false }),
    itemFields: [
      { key: "title", label: "Event title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "date", label: "Date (display text, e.g. 14 November 2026)", type: "text" },
      { key: "time", label: "Time (optional)", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "image", label: "Photo", type: "image" },
      { key: "status", label: "Status", type: "select", options: ["upcoming", "past"] },
      { key: "featured", label: "Featured event", type: "checkbox" },
    ] },
  { key: "finalCta", label: "Final Call-to-Action Banner", kind: "object",
    fields: [
      { key: "kicker", label: "Kicker", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "primaryLabel", label: "Primary button label", type: "text" },
      { key: "secondaryLabel", label: "Secondary button label", type: "text" },
    ] },
  { key: "aboutIntro", label: "About Page — Vision & Mission", kind: "object",
    fields: [
      { key: "visionHeading", label: "Vision heading", type: "text" },
      { key: "visionText", label: "Vision text", type: "textarea" },
      { key: "missionHeading", label: "Mission heading", type: "text" },
      { key: "missionText", label: "Mission text", type: "textarea" },
    ] },
  { key: "coreValues", label: "About Page — Core Values", kind: "list", itemType: "object",
    newItem: () => ({ title: "", text: "" }),
    itemFields: [ { key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" } ] },
  { key: "accreditations", label: "Accreditation Badges", kind: "list", itemType: "string", newItem: () => "" },
  { key: "siteMeta", label: "Site Identity, Contact & Footer", kind: "object",
    fields: [
      { key: "schoolName", label: "School name (shown in header)", type: "text" },
      { key: "tagline", label: "Tagline (shown under school name)", type: "text" },
      { key: "logoUrl", label: "Logo (optional — replaces the default crest)", type: "image" },
      { key: "addressLine1", label: "Address line 1", type: "text" },
      { key: "addressLine2", label: "Address line 2", type: "text" },
      { key: "officeHours", label: "Office hours", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "copyrightText", label: "Footer copyright line", type: "text" },
    ],
    subLists: [{ key: "socialLinks", label: "Social media links", itemType: "object",
      newItem: () => ({ platform: "F", url: "" }),
      itemFields: [
        { key: "platform", label: "Platform letter/label (e.g. F, X, Y, I)", type: "text" },
        { key: "url", label: "URL", type: "text" },
      ] }] },
  { key: "pageHeroes", label: "Inner Page Banners", kind: "page-heroes" },
  { key: "leadership", label: "College Leadership", kind: "list", itemType: "object",
    newItem: () => ({ name: "", position: "", bio: "", qualifications: "", photo: null }),
    itemFields: [
      { key: "name", label: "Name", type: "text" },
      { key: "position", label: "Position (e.g. Deputy Principal)", type: "text" },
      { key: "qualifications", label: "Qualifications (optional)", type: "text" },
      { key: "bio", label: "Short biography", type: "textarea" },
      { key: "photo", label: "Photograph", type: "image" },
    ] },
  { key: "downloads", label: "Downloads & Resources", kind: "list", itemType: "object",
    newItem: () => ({ title: "", category: "General", file: null, date: "" }),
    itemFields: [
      { key: "title", label: "Document title", type: "text" },
      { key: "category", label: "Category", type: "select",
        options: ["Prospectus", "Forms", "Policies", "Handbooks", "Calendars", "General"] },
      { key: "file", label: "File (PDF, Word, or Excel)", type: "file" },
      { key: "date", label: "Date / last updated (display text)", type: "text" },
    ] },
];

const PAGE_HERO_KEYS = [
  { key: "about", label: "About Page" },
  { key: "academics", label: "Academics Page" },
  { key: "admissions", label: "Admissions Page" },
  { key: "contact", label: "Contact Page" },
  { key: "news", label: "News Page" },
  { key: "programmes", label: "Programmes Page" },
  { key: "departments", label: "Departments Page" },
  { key: "gallery", label: "Campus Gallery Page" },
  { key: "events", label: "Events Page" },
  { key: "downloads", label: "Downloads Page" },
  { key: "leadership", label: "Leadership Page" },
];

/* ================= IMAGE FIELD ================= */
function ImageField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const url = resolvePhotoUrl(value);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await API.post("/website/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.url);
    } catch (err) {
      alert(err?.response?.data?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.imageFieldRow}>
        {url ? (
          <img src={url} alt="" style={styles.imageThumb} />
        ) : (
          <div style={styles.imageThumbEmpty}>No image</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
          <button type="button" style={styles.secondaryBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
          </button>
          {url && (
            <button type="button" style={styles.dangerBtnSm} onClick={() => onChange(null)} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= FILE FIELD (documents — PDF/Word/Excel) ================= */
function FileField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const url = value ? resolvePhotoUrl(value) : null;
  const filename = value ? String(value).split("/").pop() : null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await API.post("/website/upload-file", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.url);
    } catch (err) {
      alert(err?.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.imageFieldRow}>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
            {filename}
          </a>
        ) : (
          <div style={styles.imageThumbEmpty}>No file</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" style={{ display: "none" }} onChange={handleFile} />
          <button type="button" style={styles.secondaryBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
          </button>
          {url && (
            <button type="button" style={styles.dangerBtnSm} onClick={() => onChange(null)} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= FIELD RENDERER (single scalar/image field) ================= */
function FieldInput({ field, value, onChange }) {
  if (field.type === "image") return <ImageField label={field.label} value={value} onChange={onChange} />;
  if (field.type === "file") return <FileField label={field.label} value={value} onChange={onChange} />;
  if (field.type === "checkbox") {
    return (
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <div style={styles.field}>
        <label style={styles.label}>{field.label}</label>
        <select style={styles.input} value={value ?? field.options[0]} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div style={styles.field}>
        <label style={styles.label}>{field.label}</label>
        <textarea style={styles.textarea} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <div style={styles.field}>
        <label style={styles.label}>{field.label}</label>
        <input type="number" style={styles.input} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }
  return (
    <div style={styles.field}>
      <label style={styles.label}>{field.label}</label>
      <input type="text" style={styles.input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ================= STRING LIST (top-level or sub-list) ================= */
function StringListEditor({ items, onChange, newItem }) {
  const list = items || [];
  return (
    <div>
      {list.map((item, i) => (
        <div key={i} style={styles.listRow}>
          <textarea style={styles.textarea} value={item} onChange={(e) => onChange(list.map((v, idx) => (idx === i ? e.target.value : v)))} />
          <button type="button" style={styles.dangerBtnSm} onClick={() => onChange(list.filter((_, idx) => idx !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" style={styles.secondaryBtn} onClick={() => onChange([...list, newItem()])}>+ Add</button>
    </div>
  );
}

/* ================= OBJECT LIST (top-level or sub-list) ================= */
function ObjectListEditor({ items, itemFields, onChange, newItem }) {
  const list = items || [];
  const updateItem = (i, fieldKey, value) =>
    onChange(list.map((it, idx) => (idx === i ? { ...it, [fieldKey]: value } : it)));

  return (
    <div>
      {list.map((item, i) => (
        <div key={i} style={styles.itemCard}>
          <div style={styles.itemCardHeader}>
            <span style={styles.itemCardIndex}>#{i + 1}</span>
            <button type="button" style={styles.dangerBtnSm} onClick={() => onChange(list.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
          {itemFields.map((f) => (
            <FieldInput key={f.key} field={f} value={item?.[f.key]} onChange={(v) => updateItem(i, f.key, v)} />
          ))}
        </div>
      ))}
      <button type="button" style={styles.secondaryBtn} onClick={() => onChange([...list, newItem()])}>+ Add</button>
    </div>
  );
}

/* ================= LIST SECTION (top-level "list" kind) ================= */
function ListSection({ section, data, onChange }) {
  if (section.itemType === "string") {
    return <StringListEditor items={data} onChange={onChange} newItem={section.newItem} />;
  }
  return <ObjectListEditor items={data} itemFields={section.itemFields} onChange={onChange} newItem={section.newItem} />;
}

/* ================= OBJECT SECTION (top-level "object" kind, with optional subLists) ================= */
function ObjectSection({ section, data, onChange }) {
  const obj = data || {};
  const updateField = (fieldKey, value) => onChange({ ...obj, [fieldKey]: value });

  return (
    <div>
      {section.fields.map((f) => (
        <FieldInput key={f.key} field={f} value={obj[f.key]} onChange={(v) => updateField(f.key, v)} />
      ))}
      {(section.subLists || []).map((sl) => (
        <div key={sl.key} style={styles.field}>
          <label style={styles.label}>{sl.label}</label>
          {sl.itemType === "string" ? (
            <StringListEditor items={obj[sl.key]} onChange={(v) => updateField(sl.key, v)} newItem={sl.newItem} />
          ) : (
            <ObjectListEditor items={obj[sl.key]} itemFields={sl.itemFields} onChange={(v) => updateField(sl.key, v)} newItem={sl.newItem} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================= PAGE HEROES (special-cased: fixed named sub-forms, not a repeatable list) ================= */
const PAGE_HERO_FIELDS = [
  { key: "eyebrow", label: "Eyebrow", type: "text" },
  { key: "title", label: "Title", type: "text" },
  { key: "lead", label: "Lead paragraph (optional)", type: "textarea" },
];
function PageHeroesSection({ data, onChange }) {
  const obj = data || {};
  return (
    <div>
      {PAGE_HERO_KEYS.map((p) => (
        <div key={p.key} style={styles.itemCard}>
          <div style={styles.itemCardHeader}>
            <span style={styles.itemCardIndex}>{p.label}</span>
          </div>
          {PAGE_HERO_FIELDS.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={obj[p.key]?.[f.key]}
              onChange={(v) => onChange({ ...obj, [p.key]: { ...(obj[p.key] || {}), [f.key]: v } })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ================= PAGE ================= */
export default function Website() {
  const { theme, toggleTheme } = useTheme();
  useEffect(() => { injectDesignTokens(); }, []);

  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const [data, setData] = useState({});
  const [meta, setMeta] = useState({});
  const [loadedKeys, setLoadedKeys] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const activeSection = SECTIONS.find((s) => s.key === activeKey);

  const notify = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  const emptyValueFor = (section) => {
    if (section.kind === "list") return [];
    return {};
  };

  const loadSection = async (key) => {
    setLoading(true);
    try {
      const res = await API.get(`/website/${key}`);
      const section = SECTIONS.find((s) => s.key === key);
      setData((prev) => ({ ...prev, [key]: res.data?.content ?? emptyValueFor(section) }));
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

  const setSectionData = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

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

  const renderActiveSection = () => {
    if (!loadedKeys[activeKey]) return <p style={styles.hint}>Loading…</p>;
    const value = data[activeKey];
    const onChange = (v) => setSectionData(activeKey, v);

    if (activeSection.kind === "page-heroes") return <PageHeroesSection data={value} onChange={onChange} />;
    if (activeSection.kind === "list") return <ListSection section={activeSection} data={value} onChange={onChange} />;
    return <ObjectSection section={activeSection} data={value} onChange={onChange} />;
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
            Edits here — including photos — go live on the public marketing website, usually within about a minute.
            Site navigation (menus and page routing) isn&rsquo;t editable here; only content and images are.
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
            <button key={s.key} style={activeKey === s.key ? styles.tabActive : styles.tab} onClick={() => setActiveKey(s.key)}>
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
  subtitle: { margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", maxWidth: 620 },
  iconBtn: {
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)",
    width: 38, height: 38, borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", fontSize: 15, flexShrink: 0,
  },
  layout: { display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" },
  tabRail: { display: "flex", flexDirection: "column", gap: 4, minWidth: 240, flexShrink: 0, maxHeight: "80vh", overflowY: "auto" },
  tab: {
    textAlign: "left", padding: "9px 14px", borderRadius: "var(--radius-sm)", border: "1px solid transparent",
    background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  tabActive: {
    textAlign: "left", padding: "9px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary)",
    background: "var(--primary-tint)", color: "var(--primary)", cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  card: {
    flex: 1, minWidth: 340, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
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
  imageFieldRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  imageThumb: { width: 96, height: 72, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card-elevated)" },
  imageThumbEmpty: { width: 96, height: 72, borderRadius: "var(--radius-sm)", border: "1px dashed var(--border)", background: "var(--card-elevated)", color: "var(--text-muted)", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 4 },
  fileLink: { display: "flex", alignItems: "center", width: 220, minHeight: 72, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card-elevated)", color: "var(--primary)", fontSize: 12.5, fontWeight: 600, textDecoration: "none", wordBreak: "break-all" },
  toast: {
    position: "fixed", top: 16, right: 16, zIndex: 999, color: "#fff", padding: "10px 16px", borderRadius: 8,
    boxShadow: "var(--shadow)", maxWidth: "90vw", fontWeight: 600, fontSize: 13,
  },
};
