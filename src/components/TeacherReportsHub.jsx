import React, { useEffect, useState } from "react";
import API from "../api";

/* =========================================================================
   TEACHER REPORTS HUB — what a TEACHER sees after typing their username on the
   public Download page (/report-download).

   Students never get this screen: the server (POST /report-access/verify) only
   answers "teacher_ready" for a username that belongs to a teacher, and the
   endpoints below accept nothing but that teacher-only session (api.js attaches
   it from this tab's sessionStorage on this page).

   Three reports, each as PDF or Excel, for the examination the teacher picks:
     Subject Analysis · Overall Performance · Class Ranking
   They are the same files the Main Examination dashboard exports, so the
   numbers (and the Result column) always match.
========================================================================= */
const REPORTS = [
  { key: "subject-analysis", title: "Subject Analysis", desc: "Every subject ranked by mean, with the Result, highest and lowest candidate and pass rate." },
  { key: "overall-performance", title: "Overall Performance", desc: "Every candidate ranked across the whole examination, with marks per subject, mean and Result." },
  { key: "class-ranking", title: "Class Ranking", desc: "Every candidate ranked within their own class, with marks per subject, mean and Result." },
];

const S = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "24px 16px 48px", color: "var(--text, #0f172a)" },
  h1: { margin: "0 0 6px", fontSize: 22, fontWeight: 800 },
  sub: { margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: "var(--text-muted, #64748b)" },
  select: { width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 15, borderRadius: 9, border: "1px solid var(--border, #cbd5e1)", background: "var(--input-bg, #fff)", color: "inherit", marginBottom: 18 },
  card: { background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 },
  cardTitle: { margin: "0 0 4px", fontSize: 16, fontWeight: 800 },
  cardDesc: { margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.45, color: "var(--text-muted, #64748b)" },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: (primary, off) => ({ padding: "10px 18px", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.6 : 1,
    border: `1px solid ${primary ? "var(--primary, #1d4ed8)" : "var(--border, #cbd5e1)"}`,
    background: primary ? "var(--primary, #1d4ed8)" : "transparent", color: primary ? "var(--primary-text, #fff)" : "var(--text, #0f172a)" }),
  err: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
};

export default function TeacherReportsHub({ onExpired }) {
  const [exams, setExams] = useState(null); // null = loading
  const [examId, setExamId] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const readError = async (err, fallback) => {
    if (err?.response?.status === 401) { onExpired?.(); return "Your session timed out. Please enter your username again."; }
    try {
      const text = await err?.response?.data?.text?.();
      if (text) return JSON.parse(text).message || fallback;
    } catch { /* keep the fallback */ }
    return err?.response?.data?.message || fallback;
  };

  useEffect(() => {
    let cancelled = false;
    API.get("/report-access/teacher/exams")
      .then((r) => {
        if (cancelled) return;
        const list = r.data?.exams || [];
        setExams(list);
        if (list.length) setExamId(String(list[0].id));
      })
      .catch(async (err) => { if (!cancelled) { setExams([]); setError(await readError(err, "Could not load the examinations. Please try again.")); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (report, format) => {
    setError("");
    const key = `${report.key}:${format}`;
    try {
      setBusyKey(key);
      const res = await API.get(`/report-access/teacher/reports/${report.key}/${format}`, { responseType: "blob", params: { examId } });
      const disposition = res.headers?.["content-disposition"] || "";
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || `${report.key}.${ext}`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers?.["content-type"] || undefined }));
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(await readError(err, "Could not prepare the report. Please try again."));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Examination reports</h1>
      <p style={S.sub}>These reports are for teachers only. Choose an examination, then download the report as a PDF or an Excel file.</p>
      {error && <div style={S.err} role="alert">{error}</div>}

      {exams === null ? (
        <p style={S.sub}>Loading examinations…</p>
      ) : exams.length === 0 ? (
        <div style={S.card}><p style={{ ...S.cardDesc, margin: 0 }}>There are no examinations with results to report on yet.</p></div>
      ) : (
        <>
          <label htmlFor="tr-exam" style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Examination</label>
          <select id="tr-exam" style={S.select} value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}{ex.academic_year ? ` · ${ex.academic_year}` : ""}</option>)}
          </select>

          {REPORTS.map((r) => (
            <div key={r.key} style={S.card}>
              <p style={S.cardTitle}>{r.title}</p>
              <p style={S.cardDesc}>{r.desc}</p>
              <div style={S.row}>
                {["pdf", "excel"].map((f) => {
                  const k = `${r.key}:${f}`;
                  return (
                    <button key={f} type="button" style={S.btn(f === "pdf", !!busyKey || !examId)} disabled={!!busyKey || !examId} onClick={() => download(r, f)}>
                      {busyKey === k ? "Preparing…" : f === "pdf" ? "Download PDF" : "Download Excel"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
