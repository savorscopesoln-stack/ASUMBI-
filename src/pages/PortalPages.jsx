import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { NAV_GROUPS as STUDENT_NAV_GROUPS } from "./Student/StudentLayout";
import { NAV_GROUPS as TEACHER_NAV_GROUPS } from "./teacher/TeacherLayout";

/* Pages that are the portal's landing page — disabling either would
   leave that role with nowhere to go after login, so the toggle is
   locked off here (and rejected on the backend too, just in case). */
const LOCKED_PATHS = new Set(["/student", "/teacher/dashboard"]);

// Flatten the *actual* live nav registries from each layout — the
// exact same arrays that render the sidebars — into a flat list of
// { key, label, path }. This is what makes future pages automatic:
// add an item to NAV_GROUPS in StudentLayout.jsx (or NAV_ITEMS in
// TeacherLayout.jsx) and it shows up here with zero extra wiring.
const STUDENT_PAGES = STUDENT_NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ label: i.name, path: i.path, group: g.label }))
);
const TEACHER_PAGES = TEACHER_NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ label: i.name, path: i.path, group: g.label }))
);

export default function PortalPages() {
  const [settings, setSettings] = useState([]); // rows from PortalPageSettings
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/portal-pages");
      setSettings(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const enabledMap = useMemo(() => {
    const m = {};
    settings.forEach((s) => { m[`${s.portal}:${s.page_key}`] = s.enabled; });
    return m;
  }, [settings]);

  const isEnabled = (portal, path) => enabledMap[`${portal}:${path}`] !== false;

  const toggle = async (portal, path, current) => {
    const nextEnabled = !current;
    const key = `${portal}:${path}`;
    if (!nextEnabled && LOCKED_PATHS.has(path)) return;

    if (!nextEnabled) {
      const ok = window.confirm(
        `Hide this page from every ${portal === "student" ? "Student" : "Teacher"} account? They will no longer see or be able to open it.`
      );
      if (!ok) return;
    }

    try {
      setBusyKey(key);
      await API.put("/portal-pages", { portal, page_key: path, enabled: nextEnabled });
      setSettings((prev) => {
        const others = prev.filter((s) => !(s.portal === portal && s.page_key === path));
        return [...others, { portal, page_key: path, enabled: nextEnabled }];
      });
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update page");
    } finally {
      setBusyKey(null);
    }
  };

  const renderPortal = (portal, pages, title) => {
    const groups = {};
    pages.forEach((p) => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span style={styles.badge}>{pages.length} pages</span>
        </div>

        {Object.entries(groups).map(([groupLabel, items]) => (
          <div key={groupLabel} style={{ marginBottom: 18 }}>
            <div style={styles.groupLabel}>{groupLabel}</div>
            <div style={styles.pageList}>
              {items.map((p) => {
                const enabled = isEnabled(portal, p.path);
                const locked = LOCKED_PATHS.has(p.path);
                const key = `${portal}:${p.path}`;
                return (
                  <div key={p.path} style={styles.pageRow}>
                    <div>
                      <div style={styles.pageName}>{p.label}</div>
                      <div style={styles.pagePath}>{p.path}{locked ? " · always on" : ""}</div>
                    </div>
                    <button
                      onClick={() => !locked && toggle(portal, p.path, enabled)}
                      disabled={locked || busyKey === key}
                      style={{
                        ...styles.toggle,
                        background: enabled ? "linear-gradient(135deg,#15803d,#22c55e)" : "#3f3f46",
                        opacity: locked ? 0.6 : 1,
                        cursor: locked ? "not-allowed" : "pointer",
                      }}
                      aria-label={enabled ? `Disable ${p.label}` : `Enable ${p.label}`}
                      title={locked ? "This is the portal's landing page and can't be disabled" : undefined}
                    >
                      <span style={{ ...styles.knob, transform: enabled ? "translateX(18px)" : "translateX(0)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.layout}>
      <div style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Portal Pages</h1>
            <p style={styles.subtitle}>
              Switch pages on or off for the Student and Teacher portals. Disabled pages disappear
              from their sidebar and can't be opened directly, even by URL.
            </p>
            <button onClick={() => window.history.back()} style={styles.backBtn}>← Back</button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loaderWrap}>
            <div style={styles.loader}></div>
            <p style={{ marginTop: 20 }}>Loading page settings...</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {renderPortal("student", STUDENT_PAGES, "🎓 Student Portal")}
            {renderPortal("teacher", TEACHER_PAGES, "🧑‍🏫 Teacher Portal")}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f0f0f 0%, #1b0a0a 45%, #090909 100%)",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
  },
  main: { flex: 1, padding: 35, maxWidth: "100%" },
  header: { marginBottom: 30 },
  title: { margin: 0, fontSize: 32, fontWeight: 800 },
  subtitle: { marginTop: 8, color: "#9ca3af", fontSize: 15, maxWidth: 640 },
  backBtn: {
    marginTop: 14, padding: "10px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700,
    color: "#fff", background: "linear-gradient(135deg,#991b1b,#dc2626)", boxShadow: "0 8px 20px rgba(220,38,38,0.25)",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 24 },
  card: {
    background: "rgba(255,255,255,0.05)", backdropFilter: "blur(14px)", borderRadius: 24, padding: 24,
    border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  badge: { background: "rgba(220,38,38,0.15)", color: "#fca5a5", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700 },
  groupLabel: { fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.6, color: "#9ca3af", fontWeight: 800, marginBottom: 10 },
  pageList: { display: "flex", flexDirection: "column", gap: 8 },
  pageRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "rgba(0,0,0,0.25)", padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)",
  },
  pageName: { fontSize: 14, fontWeight: 700 },
  pagePath: { fontSize: 11.5, color: "#9ca3af", marginTop: 2 },
  toggle: {
    width: 40, height: 22, borderRadius: 999, border: "none", position: "relative", padding: 2, flexShrink: 0,
    transition: "background 0.15s ease",
  },
  knob: {
    display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff",
    transition: "transform 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
  },
  loaderWrap: { height: "50vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  loader: { width: 70, height: 70, border: "6px solid rgba(255,255,255,0.08)", borderTop: "6px solid #dc2626", borderRadius: "50%", animation: "spin 1s linear infinite" },
};
