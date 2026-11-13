import React, { useEffect, useRef, useState } from "react";
import API from "../api";
import StudentReport from "../pages/Student/StudentReport";
import TranscriptPreview from "./TranscriptPreview";

/* =========================================================================
   STUDENT DOWNLOAD HUB — what a student sees after opening a report link
   (/r/…) or the public Download page (/report-download).

   `downloads` comes from the server (Report Download Link → "When can students
   download?"):  { mode: "report" | "transcript" | "both", opensAt, closesAt }
     report      → just the report form (with its own Download PDF button)
     transcript  → just the transcript download
     both        → two tabs: Report form | Transcript

   The transcript comes from GET /report-access/transcript with this tab's
   report-only session (api.js attaches it on these pages). The server checks
   the open/close window again on every download.
========================================================================= */
const fmtWhen = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; }
};

const S = {
  bar: { display: "flex", gap: 8, justifyContent: "center", padding: "10px 16px", background: "var(--card, #fff)", borderBottom: "1px solid var(--border, #e2e8f0)" },
  tab: (on) => ({ padding: "8px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${on ? "var(--primary, #1d4ed8)" : "var(--border, #cbd5e1)"}`,
    background: on ? "var(--primary, #1d4ed8)" : "transparent", color: on ? "var(--primary-text, #fff)" : "var(--text, #0f172a)" }),
  wrap: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--text, #0f172a)" },
  card: { maxWidth: 420, width: "100%", textAlign: "center", background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 14, padding: "28px 24px" },
  btn: { padding: "12px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, background: "var(--primary, #1d4ed8)", color: "var(--primary-text, #fff)" },
  err: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  note: { margin: "14px 0 0", fontSize: 12.5, color: "var(--text-muted, #64748b)" },
};

function TranscriptPanel({ closesAt }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const file = useRef(null);
  const [preview, setPreview] = useState(null); // { blob, name } — shown on screen before any download
  // Exams the student may choose from (the school's allowed list). They can tick one or more.
  const [exams, setExams] = useState([]);
  const [picked, setPicked] = useState([]);
  useEffect(() => {
    let cancelled = false;
    API.get("/report-access/transcript-exams").then((r) => {
      if (cancelled) return;
      const list = r.data?.exams || [];
      setExams(list); setPicked(list.map((e) => e.id));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const toggle = (id) => { setDone(false); setPreview(null); setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };

  const save = () => {
    if (!file.current) return;
    const url = window.URL.createObjectURL(file.current.blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.current.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const download = async () => {
    setError(""); setDone(false); setPreview(null);
    try {
      setBusy(true);
      // Every exam ticked = no filter (the server then uses the school's full list).
      const params = exams.length > 1 && picked.length < exams.length ? { examIds: picked.join(",") } : undefined;
      const res = await API.get("/report-access/transcript", { responseType: "blob", params });
      const disposition = res.headers?.["content-disposition"] || "";
      const name = /filename="?([^"]+)"?/i.exec(disposition)?.[1] || "transcript.pdf";
      file.current = { blob: new Blob([res.data], { type: "application/pdf" }), name };
      setPreview(file.current); // render first; the student downloads from the preview
      setDone(true);
    } catch (err) {
      let message = "Could not download your transcript. Kindly check your connection and try again.";
      try {
        const text = await err?.response?.data?.text?.();
        if (text) message = JSON.parse(text).message || message;
      } catch { /* keep the generic message */ }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...S.wrap, flexDirection: "column", gap: 18, alignItems: "center" }}>
      <div style={S.card}>
        <p style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800 }}>Your transcript</p>
        <p style={{ margin: "0 0 18px", color: "var(--text-muted, #64748b)", lineHeight: 1.5, fontSize: 14 }}>
          View your examination results, then download the PDF.
        </p>
        {exams.length > 1 && (
          <div style={{ textAlign: "left", margin: "0 0 16px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700 }}>Choose the exams to include</p>
            <div style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 9, padding: "6px 10px", maxHeight: 190, overflow: "auto" }}>
              {exams.map((ex) => (
                <label key={ex.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={picked.includes(ex.id)} onChange={() => toggle(ex.id)} />
                  <span>{ex.name}{ex.academic_year ? ` · ${ex.academic_year}` : ""}{ex.term ? ` · ${ex.term}` : ""}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
              <button type="button" style={{ background: "none", border: "none", padding: 0, color: "var(--primary, #1d4ed8)", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }} onClick={() => { setDone(false); setPreview(null); setPicked(exams.map((e) => e.id)); }}>Select all</button>
              <button type="button" style={{ background: "none", border: "none", padding: 0, color: "var(--primary, #1d4ed8)", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }} onClick={() => { setDone(false); setPreview(null); setPicked([]); }}>Clear</button>
            </div>
          </div>
        )}
        {error && <div style={S.err} role="alert">{error}</div>}
        <button type="button" style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} onClick={download} disabled={busy || (exams.length > 1 && picked.length === 0)}>
          {busy ? "Preparing…" : preview ? "Refresh preview" : "View transcript"}
        </button>
        {closesAt && <p style={S.note}>Downloads close on {fmtWhen(closesAt)}.</p>}
      </div>
      {preview && <TranscriptPreview blob={preview.blob} name={preview.name} onDownload={save} />}
    </div>
  );
}

export default function StudentDownloadHub({ downloads }) {
  const mode = downloads?.mode || "report";
  const [tab, setTab] = useState(mode === "transcript" ? "transcript" : "report");

  if (mode === "report") return <StudentReport />;
  if (mode === "transcript") return <TranscriptPanel closesAt={downloads?.closesAt} />;

  return (
    <>
      <style>{"@media print { .dl-hub-tabs { display: none !important; } }"}</style>
      <div className="dl-hub-tabs" style={S.bar} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "report"} style={S.tab(tab === "report")} onClick={() => setTab("report")}>Report form</button>
        <button type="button" role="tab" aria-selected={tab === "transcript"} style={S.tab(tab === "transcript")} onClick={() => setTab("transcript")}>Transcript</button>
      </div>
      {tab === "report" ? <StudentReport /> : <TranscriptPanel closesAt={downloads?.closesAt} />}
    </>
  );
}
