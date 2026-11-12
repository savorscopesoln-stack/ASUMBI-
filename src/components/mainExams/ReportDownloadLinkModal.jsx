import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import { Copy, ExternalLink, MessageCircle, History } from "lucide-react";
import QRCode from "../../utils/QRCode";
import { useC, Modal, FieldLabel, ModalTextarea, SaveButton, fmtDateTime } from "./shared";
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

/* ISO <-> the value a <input type="datetime-local"> uses (the admin's own local time). */
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const MODE_OPTIONS = [
  { key: "report", label: "Report form" },
  { key: "transcript", label: "Transcript" },
  { key: "both", label: "Both" },
];

const KIND_LABEL = { report: "Report form", transcript: "Transcript" };
const SOURCE_LABEL = { "download-page": "Download page", "report-link": "Report link", "transcript-link": "Transcript link" };
const METHOD_LABEL = { pdf: "PDF", print: "Print", "transcript-pdf": "PDF" };

const DEFAULT_MESSAGE =
  "Hello, you can download your report form here: {link} — type your username, update your details if asked, then tap Download PDF.";

export default function ReportDownloadLinkModal({ onClose, onToast }) {
  const C = useC();
  const link = useMemo(() => `${window.location.origin}/report-download`, []);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const text = message.replace(/\{link\}/gi, link);
  const btn = miniBtn(C);

  /* What students may download, and when (utils/downloadAccess.js on the server). */
  const [access, setAccess] = useState({ mode: "report", opensAt: "", closesAt: "", requirePhoto: true });
  const [state, setState] = useState("open");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    API.get("/main-exams/download-access").then((r) => {
      if (cancelled) return;
      setAccess({ mode: r.data.mode || "report", opensAt: toLocalInput(r.data.opensAt), closesAt: toLocalInput(r.data.closesAt), requirePhoto: r.data.requirePhoto !== false });
      setState(r.data.state || "open");
      setLoaded(true);
    }).catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const saveAccess = async () => {
    try {
      setSaving(true);
      const r = await API.put("/main-exams/download-access", {
        mode: access.mode, opensAt: fromLocalInput(access.opensAt), closesAt: fromLocalInput(access.closesAt),
        requirePhoto: access.requirePhoto,
      });
      setAccess({ mode: r.data.mode, opensAt: toLocalInput(r.data.opensAt), closesAt: toLocalInput(r.data.closesAt), requirePhoto: r.data.requirePhoto !== false });
      setState(r.data.state || "open");
      onToast?.("Download settings saved", "success");
    } catch (err) {
      onToast?.(err?.response?.data?.message || "Could not save the download settings", "error");
    } finally { setSaving(false); }
  };

  /* Download history: who downloaded which report form / transcript, and when. */
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState({ items: [], total: 0, students: 0 });
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState("");
  const [histKind, setHistKind] = useState("all");
  const [histSearch, setHistSearch] = useState("");
  const loadHistory = async (kind = histKind, search = histSearch) => {
    try {
      setHistLoading(true); setHistError("");
      const r = await API.get("/main-exams/download-history", { params: { limit: 100, kind: kind === "all" ? undefined : kind, search: search.trim() || undefined } });
      setHistory({ items: r.data.items || [], total: r.data.total || 0, students: r.data.students || 0 });
    } catch (err) {
      setHistError(err?.response?.data?.message || "Could not load the download history");
    } finally { setHistLoading(false); }
  };
  useEffect(() => { if (showHistory) loadHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showHistory, histKind]);

  const stateText = { open: "Downloads are open now", not_open: "Downloads have not opened yet", closed: "Downloads are closed" }[state] || "";
  const stateColor = state === "open" ? C.success : state === "closed" ? C.danger : C.textMuted;
  const dtInput = { width: "100%", boxSizing: "border-box", padding: "9px 10px", fontSize: 13.5, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri };

  const copy = async (what, value) => {
    const ok = await copyText(value);
    onToast?.(ok ? `${what} copied` : "Could not copy", ok ? "success" : "error");
  };

  return (
    <Modal title="Report download link" onClose={onClose} maxWidth={560}>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
        One link for every student. They type their username — if their profile details are filled in they can
        download their report form or transcript (as set below) straight away, and if not they are asked to fill them in first (like after
        their first login).
      </p>

      {/* ── What can students download, and when? ── */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "0 0 18px", background: C.card }}>
        <FieldLabel>What can students download?</FieldLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 14px" }} role="radiogroup" aria-label="What students can download">
          {MODE_OPTIONS.map((o) => {
            const on = access.mode === o.key;
            return (
              <button key={o.key} type="button" role="radio" aria-checked={on} onClick={() => setAccess((a) => ({ ...a, mode: o.key }))}
                style={{ padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : "transparent", color: on ? "#fff" : C.textPri }}>
                {o.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <FieldLabel>Downloads open</FieldLabel>
            <input type="datetime-local" value={access.opensAt} style={dtInput}
              onChange={(e) => setAccess((a) => ({ ...a, opensAt: e.target.value }))} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <FieldLabel>Downloads close</FieldLabel>
            <input type="datetime-local" value={access.closesAt} style={dtInput}
              onChange={(e) => setAccess((a) => ({ ...a, closesAt: e.target.value }))} />
          </div>
        </div>
        <p style={{ margin: "8px 0 12px", fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
          Leave a time empty for no limit. Outside this window nobody can open the report download page, a student link
          or a transcript. Applies to this page, the links sent to students, and transcript links.
        </p>
        {/* Passport photo on/off */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", margin: "0 0 12px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPri }}>Require passport photo</div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>
              {access.requirePhoto
                ? "ON: a student with no photo on file is asked to add one before the report form or transcript unlocks."
                : "OFF: students can download without a passport photo."}
            </div>
          </div>
          <button type="button" role="switch" aria-checked={access.requirePhoto} aria-label="Require passport photo"
            onClick={() => setAccess((a) => ({ ...a, requirePhoto: !a.requirePhoto }))}
            style={{ flex: "none", width: 46, height: 26, borderRadius: 999, border: "none", padding: 3, cursor: "pointer",
              background: access.requirePhoto ? C.accent : C.border, display: "flex", justifyContent: access.requirePhoto ? "flex-end" : "flex-start", transition: "background .15s" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 130 }}><SaveButton onClick={saveAccess} loading={saving} label="Save" disabled={!loaded} /></div>
          {loaded && <span style={{ fontSize: 12.5, fontWeight: 700, color: stateColor }}>{stateText}</span>}
        </div>
      </div>

      {/* ── Download history ── */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "0 0 18px", background: C.card }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <FieldLabel>Download history</FieldLabel>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>See who downloaded which report form or transcript, and when.</div>
          </div>
          <button type="button" style={btn} onClick={() => setShowHistory((v) => !v)}><History size={13} /> {showHistory ? "Hide" : "View history"}</button>
        </div>
        {showHistory && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
              {[["all", "All"], ["report", "Report forms"], ["transcript", "Transcripts"]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setHistKind(k)}
                  style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: `1px solid ${histKind === k ? C.accent : C.border}`, background: histKind === k ? C.accent : "transparent", color: histKind === k ? "#fff" : C.textPri }}>{label}</button>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); loadHistory(); }} style={{ display: "flex", gap: 6, flex: "1 1 180px" }}>
                <input value={histSearch} onChange={(e) => setHistSearch(e.target.value)} placeholder="Search name, username or class"
                  style={{ flex: 1, minWidth: 0, padding: "6px 10px", fontSize: 12.5, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgAlt, color: C.textPri }} />
                <button type="submit" style={btn}>Search</button>
              </form>
            </div>
            {histError && <p style={{ margin: "0 0 8px", fontSize: 12.5, color: C.danger }}>{histError}</p>}
            <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMuted }}>
              {histLoading ? "Loading…" : `${history.total} download${history.total === 1 ? "" : "s"} by ${history.students} student${history.students === 1 ? "" : "s"}${history.total > history.items.length ? ` (showing the latest ${history.items.length})` : ""}`}
            </p>
            <div style={{ maxHeight: 280, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 9 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: C.textPri }}>
                <thead>
                  <tr style={{ textAlign: "left", background: C.bgAlt, position: "sticky", top: 0 }}>
                    {["Student", "Class", "Downloaded", "How", "When"].map((h) => <th key={h} style={{ padding: "7px 9px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {history.items.map((row) => (
                    <tr key={row.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "7px 9px" }}>{row.studentName || row.username || `#${row.studentId}`}</td>
                      <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{row.studentClass || "—"}</td>
                      <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{KIND_LABEL[row.kind] || row.kind} · {METHOD_LABEL[row.method] || row.method || "—"}</td>
                      <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{SOURCE_LABEL[row.source] || row.source || "—"}</td>
                      <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{fmtDateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                  {!histLoading && history.items.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 14, textAlign: "center", color: C.textMuted }}>No downloads recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
