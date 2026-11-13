import React, { useCallback, useEffect, useRef, useState } from "react";
import API from "../../api";
import { Download, RefreshCw } from "lucide-react";
import { useC, FieldLabel } from "./shared";
import { miniBtn } from "./LinksResult";
import { getSchoolInfo, drawSchoolHeader } from "../../utils/schoolInfo";

/* =========================================================================
   PROFILE STATUS — who has filled in their profile details, and who has not.

   The public download page (/report-download) asks every student to fill in their
   profile once (class, gender, email, phone, assessment number). Students may do it
   even while downloads are closed, so the admin can follow up before downloads open.

   Data: GET /main-exams/profile-status  (utils/downloadAccess.js)
     -> { summary: { total, completed, pending }, classes, items: [...] }
   Lists active students only (an inactive student cannot use the page anyway).
   The list can be saved as a PDF (school logo left, government logo right).
========================================================================= */

const PAGE = 300;
const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Not updated" },
  { key: "completed", label: "Updated" },
];
const TAB_TITLE = { all: "All students", pending: "Students who have NOT updated their profile", completed: "Students who have updated their profile" };

export default function ProfileStatusPanel() {
  const C = useC();
  const btn = miniBtn(C);

  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState("pending"); // the admin mostly wants to chase the ones who have not
  const [cls, setCls] = useState("all");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [data, setData] = useState({ summary: { total: 0, completed: 0, pending: 0 }, classes: [], items: [] });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0); // ignore a slow answer that arrives after a newer request

  const params = useCallback((extra = {}) => ({
    status, class: cls === "all" ? undefined : cls, search: search.trim() || undefined, ...extra,
  }), [status, cls, search]);

  const load = useCallback(async (append = false, offset = 0) => {
    const mine = ++seq.current;
    try {
      setLoading(true); setError("");
      const r = await API.get("/main-exams/profile-status", { params: params({ limit: PAGE, offset }) });
      if (mine !== seq.current) return;
      setData((d) => ({
        summary: r.data.summary || d.summary,
        classes: r.data.classes?.length ? r.data.classes : d.classes,
        items: append ? [...d.items, ...(r.data.items || [])] : (r.data.items || []),
      }));
    } catch (err) {
      if (mine === seq.current) setError(err?.response?.data?.message || "Could not load the profile status list");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [params]);

  useEffect(() => { if (open) load(false, 0); }, [open, load]);

  const { summary } = data;
  const shownTotal = status === "completed" ? summary.completed : status === "pending" ? summary.pending : summary.total;
  const pct = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  const exportPdf = async () => {
    try {
      setExporting(true); setError("");
      const r = await API.get("/main-exams/profile-status", { params: params({ limit: 5000, offset: 0 }) });
      const rows = r.data.items || [];
      const sum = r.data.summary || summary;
      const [{ default: jsPDF }, atMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = atMod.default || atMod.autoTable;
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const school = await getSchoolInfo(); // school logo left, government logo right
      const top = drawSchoolHeader(doc, school, { margin: 40, top: 24 });

      doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(20);
      doc.text("Profile update status", 40, top + 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(90);
      const filters = [TAB_TITLE[status], cls !== "all" ? `Class: ${cls}` : "", search.trim() ? `Search: "${search.trim()}"` : ""].filter(Boolean).join("  ·  ");
      doc.text(filters, 40, top + 28);
      doc.text(`Generated ${new Date().toLocaleString()}`, 40, top + 41);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(20);
      doc.text(`Updated: ${sum.completed}     Not updated: ${sum.pending}     Total: ${sum.total}`, 40, top + 60);

      autoTable(doc, {
        startY: top + 72,
        margin: { left: 40, right: 40, bottom: 34 },
        head: [["#", "Student", "Username", "Class", "Phone", "Profile"]],
        body: rows.map((s, i) => [i + 1, s.name || "—", s.username || "—", s.studentClass || "—", s.phone || "—", s.profileCompleted ? "Updated" : "NOT updated"]),
        styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 26 } },
        didParseCell: (h) => {
          if (h.section === "body" && h.column.index === 5) {
            h.cell.styles.fontStyle = "bold";
            h.cell.styles.textColor = h.cell.raw === "Updated" ? [22, 101, 52] : [185, 28, 28];
          }
        },
        didDrawPage: () => {
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(140);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, W - 70, H - 16);
        },
      });
      if (!rows.length) { doc.setFontSize(10); doc.setTextColor(110); doc.text("No students match this selection.", 40, top + 90); }
      const day = new Date().toISOString().slice(0, 10);
      doc.save(`profile-status-${status}-${day}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create the PDF");
    } finally { setExporting(false); }
  };

  const tabStyle = (on) => ({ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : "transparent", color: on ? "#fff" : C.textPri });
  const badge = (done) => ({ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap",
    background: done ? "#dcfce7" : "#fee2e2", color: done ? "#166534" : "#991b1b" });
  const field = { padding: "6px 10px", fontSize: 12.5, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "0 0 18px", background: C.card }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <FieldLabel>Profile status</FieldLabel>
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>
            Who has filled in their profile details on the download page, and who has not. Students can do it even while downloads are closed.
          </div>
        </div>
        <button type="button" style={btn} onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Show list"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          {/* counts */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
            {[["Updated", summary.completed, "#166534", "#dcfce7"], ["Not updated", summary.pending, "#991b1b", "#fee2e2"], ["Students", summary.total, C.textPri, C.bgAlt]].map(([label, n, color, bg]) => (
              <div key={label} style={{ flex: "1 1 90px", padding: "9px 12px", borderRadius: 10, background: bg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{n}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color, opacity: 0.85 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#fee2e2", overflow: "hidden", margin: "0 0 4px" }} aria-hidden="true">
            <div style={{ width: `${pct}%`, height: "100%", background: "#22c55e", transition: "width .2s" }} />
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textMuted }}>{pct}% of the students{cls !== "all" || search.trim() ? " in this selection" : ""} have updated their profile.</p>

          {/* filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 10px" }}>
            {TABS.map((t) => <button key={t.key} type="button" style={tabStyle(status === t.key)} onClick={() => setStatus(t.key)}>{t.label}</button>)}
            <select value={cls} onChange={(e) => setCls(e.target.value)} style={field} aria-label="Class">
              <option value="all">All classes</option>
              {data.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <form onSubmit={(e) => { e.preventDefault(); setSearch(typed); }} style={{ display: "flex", gap: 6, flex: "1 1 170px" }}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search name or username" style={{ ...field, flex: 1, minWidth: 0 }} />
              <button type="submit" style={btn}>Search</button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
            <button type="button" style={btn} onClick={() => load(false, 0)} disabled={loading}><RefreshCw size={13} /> Refresh</button>
            <button type="button" style={btn} onClick={exportPdf} disabled={exporting || loading}><Download size={13} /> {exporting ? "Preparing…" : "Download list (PDF)"}</button>
          </div>

          {error && <p style={{ margin: "0 0 8px", fontSize: 12.5, color: C.danger }}>{error}</p>}
          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMuted }}>
            {loading && data.items.length === 0 ? "Loading…" : `Showing ${data.items.length} of ${shownTotal} student${shownTotal === 1 ? "" : "s"}`}
          </p>

          <div style={{ maxHeight: 320, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 9 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: C.textPri }}>
              <thead>
                <tr style={{ textAlign: "left", background: C.bgAlt, position: "sticky", top: 0 }}>
                  {["Student", "Class", "Username", "Phone", "Profile"].map((h) => <th key={h} style={{ padding: "7px 9px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "7px 9px" }}>{s.name || "—"}</td>
                    <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{s.studentClass || "—"}</td>
                    <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{s.username || "—"}</td>
                    <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{s.phone || "—"}</td>
                    <td style={{ padding: "7px 9px" }}><span style={badge(s.profileCompleted)}>{s.profileCompleted ? "Updated" : "Not updated"}</span></td>
                  </tr>
                ))}
                {!loading && data.items.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 14, textAlign: "center", color: C.textMuted }}>
                    {status === "pending" ? "Everyone in this selection has updated their profile." : "No students found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data.items.length < shownTotal && (
            <div style={{ marginTop: 8 }}>
              <button type="button" style={btn} onClick={() => load(true, data.items.length)} disabled={loading}>{loading ? "Loading…" : "Load more"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
