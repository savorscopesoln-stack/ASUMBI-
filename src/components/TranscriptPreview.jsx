import React, { useEffect, useMemo } from "react";

/* Shows a transcript PDF on screen first; the student then chooses to download it.
   No print button (the viewer toolbar is hidden too, and the page itself is hidden when printing). */
export default function TranscriptPreview({ blob, name, onDownload }) {
  const url = useMemo(() => (blob ? window.URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) window.URL.revokeObjectURL(url); }, [url]);
  if (!url) return null;
  return (
    <div className="tp-root" style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <style>{"@media print { .tp-root { display: none !important; } }"}</style>
      <iframe
        title="Transcript preview"
        src={`${url}#toolbar=0&navpanes=0&view=FitH`}
        style={{ width: "100%", height: "72vh", minHeight: 420, border: "1px solid var(--border, #cbd5e1)", borderRadius: 10, background: "#fff" }}
      />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
        <button type="button" onClick={onDownload}
          style={{ padding: "12px 22px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, background: "var(--primary, #1d4ed8)", color: "var(--primary-text, #fff)" }}>
          Download transcript
        </button>
      </div>
      <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12.5, color: "var(--text-muted, #64748b)" }}>{name}</p>
    </div>
  );
}
