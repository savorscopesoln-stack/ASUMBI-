import React, { useEffect, useMemo, useState } from "react";
import { Download, Send } from "lucide-react";
import API from "../../api";
import { useC, extract, Modal, ModalSelect, ModalTextarea, FieldLabel, SaveButton } from "./shared";
import LinksResult, { downloadBlob } from "./LinksResult";

/* =========================================================================
   DOWNLOAD TRANSCRIPTS

   Download
     • All students, one class, or ONE student
     • all exams, or a single main examination
     • for a class / everyone: one combined PDF, or a ZIP with a separate PDF for
       each student
   Send
     • texts every student in the selection their OWN transcript download link
       (WhatsApp through Twilio and/or SMS through Africa's Talking, as set up in Notification Settings), or
       only creates the links to copy / download as CSV / open in WhatsApp by hand.
       Only students who have released marks get a link.
   Backend: controllers/transcript.controller.js (download) and
   controllers/reportLink.controller.js (links, kind "transcript").
========================================================================= */

const DEFAULT_MESSAGE =
  "Hello {name}, your transcript is ready. Download it here: {link} (link valid for {days} days)";

export default function TranscriptsModal({ exams = [], onClose, onToast }) {
  const C = useC();
  const [classes, setClasses] = useState([]);
  const [scope, setScope] = useState("class");           // "class" | "all" | "student"
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [examId, setExamId] = useState("all");
  const [separate, setSeparate] = useState(false);

  const [whatsapp, setWhatsapp] = useState(false);
  const [sms, setSms] = useState(false);
  const [days, setDays] = useState("14");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [count, setCount] = useState(null);              // { students, withPhone, withoutPhone }

  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
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

  // the students of the chosen class, for "a single student"
  useEffect(() => {
    setStudentId("");
    setStudents([]);
    if (scope !== "student" || !className) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setStudentsLoading(true);
        const res = await API.get("/students", { params: { classLevel: className } });
        const rows = (Array.isArray(res.data) ? res.data : extract(res)) || [];
        if (!cancelled) {
          setStudents(rows
            .map((r) => ({ id: r.id, name: r.name, admissionNo: r.admissionNo }))
            .sort((a, b) => String(a.name).localeCompare(String(b.name))));
        }
      } catch { onToast?.("Failed to load students", "error"); }
      finally { if (!cancelled) setStudentsLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, className]);

  const ready = scope === "all" || (scope === "class" && !!className) || (scope === "student" && !!className && !!studentId);

  // what the server needs to know about the selection (same shape for download and sending)
  const selection = useMemo(() => ({
    studentClass: scope === "class" ? className : "all",
    studentId: scope === "student" ? Number(studentId) || undefined : undefined,
    examId,
  }), [scope, className, studentId, examId]);

  useEffect(() => {
    setCount(null);
    if (!ready) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await API.post("/main-exams/report-links/preview", { kind: "transcript", ...selection });
        if (!cancelled) setCount(res.data);
      } catch { /* the count is only a hint */ }
    })();
    return () => { cancelled = true; };
  }, [ready, selection]);

  const channels = useMemo(() => [whatsapp && "whatsapp", sms && "sms"].filter(Boolean), [whatsapp, sms]);

  const serverMessage = async (err, fallback) => {
    try {
      const text = await err?.response?.data?.text?.();      // blob responses carry their error as JSON text
      if (text) return JSON.parse(text).message || fallback;
    } catch { /* fall through */ }
    return err?.response?.data?.message || fallback;
  };

  const download = async () => {
    if (!ready) return onToast?.(scope === "student" ? "Choose a class and a student first" : "Choose a class first", "error");
    try {
      setDownloading(true);
      const res = await API.get("/main-exams/transcripts/download", {
        params: {
          scope,
          className: scope === "all" ? undefined : className,
          studentId: scope === "student" ? studentId : undefined,
          examId,
          separate: separate && scope !== "student" ? 1 : undefined,
        },
        responseType: "blob",
      });
      const disposition = res.headers?.["content-disposition"] || "";
      const filename = /filename="?([^"]+)"?/i.exec(disposition)?.[1] || (separate ? "transcripts.zip" : "transcripts.pdf");
      const type = res.headers?.["content-type"] || "application/pdf";
      downloadBlob(new Blob([res.data], { type }), filename);
      onClose();
    } catch (err) {
      onToast?.(await serverMessage(err, "No transcripts found for this selection, or the download failed"), "error");
    } finally { setDownloading(false); }
  };

  const send = async () => {
    if (!ready) return onToast?.(scope === "student" ? "Choose a class and a student first" : "Choose a class first", "error");
    if (channels.length && !window.confirm(
      `Send ${count?.students === 1 ? "this student" : "each student"} their transcript link by ${channels.join(" and ")}${count ? ` (${count.withPhone} of ${count.students} have a phone number)` : ""}?`
    )) return;
    try {
      setSending(true);
      const res = await API.post("/main-exams/report-links/send", {
        kind: "transcript", ...selection, channels, days: Number(days), message, baseUrl: window.location.origin,
      });
      setResult(res.data);
      onToast?.(channels.length ? "Transcript links sent" : "Transcript links created");
    } catch (err) {
      onToast?.(err?.response?.data?.message || "Could not create the transcript links", "error");
    } finally { setSending(false); }
  };

  if (result) {
    return (
      <Modal title="Transcript links" onClose={onClose} maxWidth={760}>
        <LinksResult result={result} noun="transcript link" csvName="transcript-links.csv" onToast={onToast} />
      </Modal>
    );
  }

  const checkbox = (checked, onChange, label) => (
    <label style={{ display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
  const hint = { margin: "-6px 0 14px", fontSize: 12, color: C.textMuted, lineHeight: 1.5 };

  return (
    <Modal title="Transcripts" onClose={onClose}>
      <FieldLabel>Students</FieldLabel>
      <ModalSelect value={scope} onChange={(v) => { setScope(v); setSeparate(false); }} placeholder="Choose students…"
        options={[
          { value: "class", label: "A specific class" },
          { value: "student", label: "A single student" },
          { value: "all", label: "All students" },
        ]} />

      {scope !== "all" && (
        <>
          <FieldLabel>Class</FieldLabel>
          <ModalSelect value={className} onChange={setClassName} placeholder={classes.length ? "Select a class…" : "Loading classes…"}
            options={classes.map((c) => ({ value: c, label: c }))} />
        </>
      )}
      {scope === "student" && className && (
        <>
          <FieldLabel>Student</FieldLabel>
          <ModalSelect value={studentId} onChange={setStudentId}
            placeholder={studentsLoading ? "Loading students…" : students.length ? "Select a student…" : "No students in this class"}
            options={students.map((s) => ({ value: String(s.id), label: s.admissionNo ? `${s.name} (${s.admissionNo})` : s.name }))} />
        </>
      )}

      <FieldLabel>Exam</FieldLabel>
      <ModalSelect value={examId} onChange={setExamId} placeholder="Choose an exam…"
        options={[{ value: "all", label: "All exams the student has done" }, ...exams.map((e) => ({ value: String(e.id), label: e.name }))]} />
      <p style={hint}>Only exams with released marks show on a transcript — a student with none yet is skipped rather than given a blank page.</p>

      {scope !== "student" && (
        <div style={{ margin: "0 0 14px", color: C.textPri, fontSize: 14 }}>
          {checkbox(separate, setSeparate, "A separate PDF for each student (downloads as a ZIP)")}
        </div>
      )}

      <SaveButton onClick={download} loading={downloading} disabled={!ready}
        label={scope === "student" ? "Download PDF" : separate ? "Download ZIP" : "Download PDF"}
        icon={<Download size={14} style={{ marginRight: 4 }} />} />

      {/* ---------------- send ---------------- */}
      <div style={{ margin: "22px 0 0", paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: C.textPri }}>Send to students</p>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
          Each student gets their own link that downloads their transcript — no password. It stops working after the days you choose.
        </p>
        {ready && count && (
          <p style={hint}>
            {count.students} student{count.students === 1 ? "" : "s"} with released marks · {count.withPhone} with a valid phone number
            {count.withoutPhone > 0 ? ` · ${count.withoutPhone} without (they get a link to copy, but no message)` : ""}
          </p>
        )}

        <FieldLabel>Send by</FieldLabel>
        <div style={{ display: "flex", gap: 18, margin: "0 0 6px", color: C.textPri, fontSize: 14 }}>
          {checkbox(whatsapp, setWhatsapp, "WhatsApp")}
          {checkbox(sms, setSms, "SMS")}
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
          {channels.length
            ? "Uses the sender set up under Notification Settings (SMS: Africa's Talking, WhatsApp: Twilio)."
            : "Nothing ticked: the links are only created. You can copy them, download them, or open each student in WhatsApp yourself."}
        </p>

        <FieldLabel>Link valid for</FieldLabel>
        <ModalSelect value={days} onChange={setDays} placeholder="Choose…"
          options={[{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }]} />

        <FieldLabel>Message</FieldLabel>
        <ModalTextarea value={message} onChange={setMessage} rows={3} />
        <p style={{ margin: "-6px 0 16px", fontSize: 12, color: C.textMuted }}>
          {"{name}"} {"{link}"} {"{days}"} {"{class}"} are filled in for each student.
        </p>

        <SaveButton onClick={send} loading={sending} disabled={!ready}
          label={channels.length ? "Create links & send" : "Create links"} icon={<Send size={14} style={{ marginRight: 4 }} />} />
      </div>
    </Modal>
  );
}
