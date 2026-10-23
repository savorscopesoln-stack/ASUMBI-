import React, { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import API from "../../api";
import { useC, extract, Modal, ModalSelect, ModalTextarea, FieldLabel, SaveButton } from "./shared";
import LinksResult from "./LinksResult";

/* =========================================================================
   SEND REPORT LINKS — gives every student their own download link for the
   report form (backend: controllers/reportLink.controller.js).

   • choose a class (or everyone), how long the links stay valid, and how to send:
     WhatsApp (Twilio) and/or SMS (Africa's Talking) as set up in Notification Settings,
     or neither — the links are then only created, to copy / download / open one
     by one in WhatsApp.
   • a student's link opens their report form with no password; it expires, and
     only that student's report form can be reached through it.
========================================================================= */

const DEFAULT_MESSAGE =
  "Hello {name}, your report form is ready. Download it here: {link} (link valid for {days} days)";

export default function SendReportLinksModal({ onClose, onToast }) {
  const C = useC();
  const [classes, setClasses] = useState([]);
  const [scope, setScope] = useState("class");
  const [className, setClassName] = useState("");
  const [days, setDays] = useState("14");
  const [whatsapp, setWhatsapp] = useState(false);
  const [sms, setSms] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [count, setCount] = useState(null);       // { students, withPhone, withoutPhone }
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/meta/classes");
        setClasses(extract(res).map((r) => r.class_name || r).filter(Boolean));
      } catch { onToast?.("Failed to load classes", "error"); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClass = scope === "class" ? className : "";
  const ready = scope === "all" || !!className;

  useEffect(() => {
    setCount(null);
    if (!ready) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await API.post("/main-exams/report-links/preview", { studentClass: selectedClass || "all" });
        if (!cancelled) setCount(res.data);
      } catch { /* the count is only a hint */ }
    })();
    return () => { cancelled = true; };
  }, [ready, selectedClass]);

  const channels = useMemo(() => [whatsapp && "whatsapp", sms && "sms"].filter(Boolean), [whatsapp, sms]);

  const run = async () => {
    if (!ready) return onToast?.("Choose a class first", "error");
    if (channels.length && !window.confirm(
      `Send each student their own report link by ${channels.join(" and ")}${count ? ` (${count.withPhone} of ${count.students} have a phone number)` : ""}?`
    )) return;
    try {
      setBusy(true);
      const res = await API.post("/main-exams/report-links/send", {
        studentClass: selectedClass || "all", channels, days: Number(days), message, baseUrl: window.location.origin,
      });
      setResult(res.data);
      onToast?.(channels.length ? "Report links sent" : "Report links created");
    } catch (err) {
      onToast?.(err?.response?.data?.message || "Could not create the report links", "error");
    } finally { setBusy(false); }
  };

  /* ---------------- result ---------------- */
  if (result) {
    return (
      <Modal title="Report links" onClose={onClose} maxWidth={760}>
        <LinksResult result={result} noun="link" csvName="report-links.csv" onToast={onToast} />
      </Modal>
    );
  }

  /* ---------------- form ---------------- */
  return (
    <Modal title="Send report links" onClose={onClose}>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
        Every student gets their own link. Opening it shows that student's report form with a Download PDF button — no password needed.
        The link stops working after the days you choose.
      </p>

      <FieldLabel>Students</FieldLabel>
      <ModalSelect value={scope} onChange={setScope} placeholder="Choose students…"
        options={[{ value: "class", label: "A specific class" }, { value: "all", label: "All students" }]} />
      {scope === "class" && (
        <>
          <FieldLabel>Class</FieldLabel>
          <ModalSelect value={className} onChange={setClassName} placeholder={classes.length ? "Select a class…" : "Loading classes…"}
            options={classes.map((c) => ({ value: c, label: c }))} />
        </>
      )}
      {ready && count && (
        <p style={{ margin: "-6px 0 14px", fontSize: 12, color: C.textMuted }}>
          {count.students} student{count.students === 1 ? "" : "s"} · {count.withPhone} with a valid phone number
          {count.withoutPhone > 0 ? ` · ${count.withoutPhone} without (they get a link to copy, but no message)` : ""}
        </p>
      )}

      <FieldLabel>Link valid for</FieldLabel>
      <ModalSelect value={days} onChange={setDays} placeholder="Choose…"
        options={[{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }]} />

      <FieldLabel>Send by</FieldLabel>
      <div style={{ display: "flex", gap: 18, margin: "0 0 6px", color: C.textPri, fontSize: 14 }}>
        <label style={{ display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} /> WhatsApp
        </label>
        <label style={{ display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} /> SMS
        </label>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
        {channels.length
          ? "Uses the sender set up under Notification Settings (SMS: Africa's Talking, WhatsApp: Twilio)."
          : "Nothing ticked: the links are only created. You can copy them, download them, or open each student in WhatsApp yourself."}
      </p>

      <FieldLabel>Message</FieldLabel>
      <ModalTextarea value={message} onChange={setMessage} rows={3} />
      <p style={{ margin: "-6px 0 16px", fontSize: 12, color: C.textMuted }}>
        {"{name}"} {"{link}"} {"{days}"} {"{class}"} are filled in for each student.
      </p>

      <SaveButton onClick={run} loading={busy} disabled={!ready}
        label={channels.length ? "Create links & send" : "Create links"} icon={<Send size={14} style={{ marginRight: 4 }} />} />
    </Modal>
  );
}
