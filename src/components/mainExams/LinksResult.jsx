import React from "react";
import { Copy, Download, MessageCircle } from "lucide-react";
import { useC } from "./shared";

/* The list shown after student download links were created / sent
   (report forms or transcripts): a summary, copy-all / CSV buttons, and one row
   per student with the delivery status, an "open WhatsApp" button for sending it
   by hand, and a copy button. Used by SendReportLinksModal and TranscriptsModal. */

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
}

export const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }
};

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const miniBtn = (C) => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 8, cursor: "pointer",
  border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri, fontSize: 12.5, fontWeight: 600,
});

export default function LinksResult({ result, noun = "link", csvName = "links.csv", onToast }) {
  const C = useC();
  const s = result.summary;
  const links = result.links || [];

  const copyAll = async () => {
    const ok = await copyText(links.map((l) => `${l.name}\t${l.url}`).join("\n"));
    onToast?.(ok ? "All links copied" : "Could not copy", ok ? "success" : "error");
  };
  const downloadCsv = () => {
    const rows = [["Name", "Class", "Phone", "Link", "Message"], ...links.map((l) => [l.name, l.class, l.phone, l.url, l.message])];
    downloadBlob(new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), csvName);
  };
  const chip = (text, tone) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap",
      color: tone === "ok" ? C.success : tone === "bad" ? C.danger : C.textMuted,
      border: `1px solid ${tone === "ok" ? C.success : tone === "bad" ? C.danger : C.border}` }}>{text}</span>
  );

  return (
    <>
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: C.textPri, lineHeight: 1.5 }}>
        Created <b>{s.students}</b> {noun}{s.students === 1 ? "" : "s"}, valid for <b>{result.days}</b> days.
        {result.channels.includes("whatsapp") && <> WhatsApp: <b>{s.whatsapp.sent}</b> sent, {s.whatsapp.failed} failed, {s.whatsapp.skipped} skipped.</>}
        {result.channels.includes("sms") && <> SMS: <b>{s.sms.sent}</b> sent, {s.sms.failed} failed, {s.sms.skipped} skipped.</>}
      </p>
      {result.channels.includes("whatsapp") && s.whatsapp.failed > 0 && (
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
          WhatsApp only delivers a business message to someone who messaged you in the last 24 hours, unless it is sent as a template WhatsApp has approved.
          For the ones that failed, use the “WhatsApp” button on their row to send it yourself, or send by SMS.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" onClick={copyAll} className="btn-hover" style={miniBtn(C)}><Copy size={13} /> Copy all links</button>
        <button type="button" onClick={downloadCsv} className="btn-hover" style={miniBtn(C)}><Download size={13} /> Download CSV</button>
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        {links.map((l) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{l.name}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted }}>{l.class || "No class"}{l.phone ? ` · ${l.phone}` : " · no phone number"}</div>
            </div>
            {l.whatsapp !== "-" && chip(`WhatsApp ${l.whatsapp}`, l.whatsapp === "sent" ? "ok" : l.whatsapp === "failed" ? "bad" : "")}
            {l.sms !== "-" && chip(`SMS ${l.sms}`, l.sms === "sent" ? "ok" : l.sms === "failed" ? "bad" : "")}
            {l.waDigits && (
              <a href={`https://wa.me/${l.waDigits}?text=${encodeURIComponent(l.message)}`} target="_blank" rel="noreferrer"
                className="btn-hover" style={{ ...miniBtn(C), textDecoration: "none" }} title="Open this student's chat in WhatsApp with the message ready to send">
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            <button type="button" className="btn-hover" style={miniBtn(C)}
              onClick={async () => { const ok = await copyText(l.url); onToast?.(ok ? `Link for ${l.name} copied` : "Could not copy", ok ? "success" : "error"); }}>
              <Copy size={13} /> Copy
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
