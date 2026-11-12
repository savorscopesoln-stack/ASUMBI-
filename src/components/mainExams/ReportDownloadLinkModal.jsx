import React, { useMemo, useState } from "react";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import QRCode from "../../utils/QRCode";
import { useC, Modal, FieldLabel, ModalTextarea } from "./shared";
import { copyText, miniBtn } from "./LinksResult";

/* =========================================================================
   REPORT DOWNLOAD LINK — one link for the whole school (no per-student
   tokens, nothing to send out one by one).

   The link opens /report-download (pages/ReportDownload.jsx): the student
   types their username; if their profile is already filled in their report
   form opens with a Download PDF button, and if not they are first asked to
   fill in their details (like after their first login) and the download then
   unlocks. Share it however you like: copy it, send it on WhatsApp, put it on
   a notice board as the QR code, or paste it in a class group.
========================================================================= */

const DEFAULT_MESSAGE =
  "Hello, you can download your report form here: {link} — type your username, update your details if asked, then tap Download PDF.";

export default function ReportDownloadLinkModal({ onClose, onToast }) {
  const C = useC();
  const link = useMemo(() => `${window.location.origin}/report-download`, []);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const text = message.replace(/\{link\}/gi, link);
  const btn = miniBtn(C);

  const copy = async (what, value) => {
    const ok = await copyText(value);
    onToast?.(ok ? `${what} copied` : "Could not copy", ok ? "success" : "error");
  };

  return (
    <Modal title="Report download link" onClose={onClose} maxWidth={560}>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
        One link for every student. They type their username — if their profile details are filled in they can
        download their report form straight away, and if not they are asked to fill them in first (like after
        their first login).
      </p>

      <FieldLabel>Link</FieldLabel>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 16px", flexWrap: "wrap" }}>
        <input readOnly value={link} onFocus={(e) => e.target.select()}
          style={{ flex: "1 1 240px", minWidth: 0, padding: "10px 12px", fontSize: 13.5, borderRadius: 9,
            border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri }} />
        <button type="button" style={btn} onClick={() => copy("Link", link)}><Copy size={13} /> Copy</button>
        <a href={link} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none" }}><ExternalLink size={13} /> Open</a>
      </div>

      <FieldLabel>Message to share</FieldLabel>
      <ModalTextarea value={message} onChange={setMessage} rows={3} />
      <p style={{ margin: "-6px 0 12px", fontSize: 12, color: C.textMuted }}>{"{link}"} is replaced with the link above.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 18px" }}>
        <button type="button" style={btn} onClick={() => copy("Message", text)}><Copy size={13} /> Copy message</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
          style={{ ...btn, textDecoration: "none" }}><MessageCircle size={13} /> Share on WhatsApp</a>
      </div>

      <FieldLabel>QR code</FieldLabel>
      <div style={{ display: "inline-block", background: "#fff", padding: 12, borderRadius: 10, border: `1px solid ${C.border}` }}>
        {QRCode ? <QRCode value={link} size={132} /> : null}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textMuted }}>Print it or show it on a screen — scanning opens the same page.</p>
    </Modal>
  );
}
