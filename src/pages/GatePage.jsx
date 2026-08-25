import React, { useEffect, useRef, useState } from "react";
import API from "../api";
import {
  DoorOpen, LogIn, LogOut, CheckCircle2, XCircle, Printer,
  Calendar, ArrowLeft, Loader2, IdCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── shared design-token stylesheet — same tokens as the rest of
   the admin app; a no-op if already mounted. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    :root {
      --bg: #F8FAFC; --card: #FFFFFF; --card-elevated: #FFFFFF; --border: #E2E5EA;
      --text: #0B0F19; --text-secondary: #384152; --text-muted: #64748B;
      --primary: #8B1E2D; --primary-dark: #6F1725; --primary-tint: #FBEAEC;
      --success: #15803D; --success-tint: #ECFDF3; --warning: #B45309; --warning-tint: #FFFBEB;
      --destructive: #DC2626; --destructive-tint: #FEF2F2; --info: #1D4ED8; --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04); --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px; --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115; --card: #171A21; --card-elevated: #1D2129; --border: #323844;
      --text: #FFFFFF; --text-secondary: #C7CCD6; --text-muted: #9198A6;
      --primary: #E8A0A8; --primary-dark: #F3C0C6; --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80; --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24; --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185; --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF; --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3); --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    body { background: var(--bg); }
  `;
  document.head.appendChild(el);
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function GatePage() {
  injectStyles();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReport = async (d) => {
    try {
      setLoading(true);
      const res = await API.get("/gate/report", { params: { date: d } });
      setRows(res.data?.rows || []);
    } catch (err) {
      console.log(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(date);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const verify = async (e) => {
    e.preventDefault();
    if (!code.trim() || verifying) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await API.post("/gate/verify", { code: code.trim() });
      setResult({ ok: true, message: res.data.message, action: res.data.action, leave: res.data.leave || null });
      // The pass is only ever printed at EXIT, right after verification —
      // never on re-entry. Auto-fire it here for the thermal printer so
      // the gate officer doesn't need an extra click; the manual button
      // below still covers a jam/misfire reprint.
      if (res.data.action === "exit" && res.data.leave) {
        printLeaveOutPass(res.data.leave, "exit");
      }
      if (date === todayStr()) loadReport(date);
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.message || "Verification failed" });
    } finally {
      setCode("");
      setVerifying(false);
      inputRef.current?.focus();
    }
  };

  const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

  const typeLabel = (t) =>
    ({ short_stay: "Short Stay", long: "Long-Stay Leave", emergency: "Emergency Leave" }[t] || t || "—");

  /* ================= OFFICIAL LEAVE-OUT PASS (THERMAL RECEIPT) =================
     Printed ONLY at the moment of EXIT, right after gate-code verification
     succeeds (auto-triggered from verify() below) — never on re-entry. The
     pass is always an "exit pass": even when reprinted later from the
     day's report table, it shows the same exit-time snapshot rather than
     generating a fresh document at re-entry.

     Sized for a thermal receipt printer (58/80mm roll) rather than a full
     sheet — narrow fixed width, high-contrast black/white only (thermal
     heads don't render color or soft shadows), monospace-leaning type for
     legibility at low DPI, and @page { size } so the OS print dialog picks
     the roll width automatically instead of defaulting to A4/Letter.

     Includes every relevant Students-table field the backend now returns:
     name, admission no, class, gender, phone, email, year of study, and
     status — in addition to the leave/gate details. (There is no "hostel"
     column anywhere in the current schema, so it can't be printed; add one
     to the Students table + the /gate SELECTs above if that's needed.) */
  const printLeaveOutPass = (leave, action) => {
    if (!leave) return;

    // This document only ever represents the EXIT event. If it's somehow
    // invoked with a reentry-only payload (no exit_time at all), bail —
    // there is nothing to print.
    if (!leave.exit_time) return;

    const win = window.open("", "", "width=420,height=650");

    const exitTime = leave.exit_time ? new Date(leave.exit_time) : null;
    const expectedReturn = leave.expected_return
      ? new Date(leave.expected_return)
      : exitTime
      ? new Date(exitTime.getTime() + (leave.duration || 0) * 60000)
      : null;

    const passId = `GP-${leave.id}-${(leave.gate_code || "").slice(-6)}`;
    const verifyCode = (leave.gate_code || "").toUpperCase();

    const fmtT = (d) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
    const fmtD = (d) => (d ? d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) : "—");
    const durationLabel = (mins) => {
      if (!mins) return "—";
      if (mins < 60) return `${mins} mins`;
      const hrs = mins / 60;
      if (hrs < 24) return `${hrs % 1 === 0 ? hrs : hrs.toFixed(1)} hrs`;
      return `${(hrs / 24).toFixed(1)} days`;
    };

    // Only render rows for fields the student record actually has —
    // a receipt has no room for "N/A" padding.
    const rows = [
      ["Name", leave.student_name],
      ["Adm No", leave.admissionNo],
      ["Class", leave.studentClass],
      ["Gender", leave.gender],
      ["Year", leave.yearOfStudy ? `Year ${leave.yearOfStudy}` : null],
      ["Phone", leave.phone],
      ["Email", leave.email],
      ["Status", leave.studentStatus],
    ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "" && String(v).toLowerCase() !== "unknown");

    const rowsHtml = rows
      .map(([label, value]) => `<div class="row"><span class="rl">${label}</span><span class="rv">${escapeHtml(String(value))}</span></div>`)
      .join("");

    function escapeHtml(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    win.document.write(`
      <html>
      <head>
        <title>Exit Pass — ${leave.student_name || ""}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0; background: #fff; color: #000;
            font-family: 'Courier New', ui-monospace, monospace;
          }
          .receipt { width: 76mm; margin: 0 auto; padding: 3mm 3mm 6mm; }
          .center { text-align: center; }
          .school { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
          .sub { margin: 2px 0 0; font-size: 9.5px; }
          .title {
            margin: 6px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 1px;
            text-transform: uppercase; border-top: 1px dashed #000; border-bottom: 1px dashed #000;
            padding: 4px 0;
          }
          .metaLine { display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px; }
          .section { margin-top: 8px; }
          .sectionTitle {
            font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
            border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 4px;
          }
          .row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; padding: 1.5px 0; }
          .rl { color: #333; }
          .rv { font-weight: 700; text-align: right; max-width: 46mm; word-break: break-word; }
          .timeGrid { display: flex; justify-content: space-between; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
          .timeBox { text-align: center; flex: 1; }
          .timeLabel { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          .timeValue { font-size: 16px; font-weight: 800; margin-top: 2px; }
          .timeSub { font-size: 8.5px; margin-top: 1px; }
          .codeBlock {
            margin-top: 10px; text-align: center; border: 1px dashed #000; padding: 6px 4px;
            font-size: 15px; font-weight: 800; letter-spacing: 3px;
          }
          .codeLabel { font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
          .notice { margin-top: 8px; font-size: 8.5px; line-height: 1.4; text-align: center; }
          .signArea { margin-top: 14px; border-top: 1px dashed #000; padding-top: 10px; }
          .signLine { border-bottom: 1px solid #000; margin: 14px 6px 3px; }
          .signLabel { font-size: 8.5px; text-align: center; }
          .footer { margin-top: 10px; font-size: 8px; text-align: center; line-height: 1.5; }
          @media print { .receipt { padding-bottom: 2mm; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <h1 class="school">ASUMBI SMART CAMPUS</h1>
            <p class="sub">Gate &amp; Leave-Out Verification</p>
          </div>
          <div class="title center">Official Exit Pass</div>

          <div class="metaLine"><span>Pass No</span><span>${passId}</span></div>
          <div class="metaLine"><span>Issued</span><span>${fmtD(new Date())} ${fmtT(new Date())}</span></div>
          <div class="metaLine"><span>Leave Type</span><span>${typeLabel(leave.leave_type)}</span></div>

          <div class="section">
            <div class="sectionTitle">Student Details</div>
            ${rowsHtml}
          </div>

          <div class="section">
            <div class="sectionTitle">Reason</div>
            <div style="font-size: 11px;">${escapeHtml(leave.reason || "—")}</div>
          </div>

          <div class="timeGrid">
            <div class="timeBox">
              <div class="timeLabel">Time Out</div>
              <div class="timeValue">${fmtT(exitTime)}</div>
              <div class="timeSub">${fmtD(exitTime)}</div>
            </div>
            <div class="timeBox">
              <div class="timeLabel">Expected In</div>
              <div class="timeValue">${fmtT(expectedReturn)}</div>
              <div class="timeSub">${durationLabel(leave.duration)}</div>
            </div>
          </div>

          <div class="codeBlock">
            <div class="codeLabel">Gate Verification Code</div>
            ${verifyCode || "—"}
          </div>

          <div class="notice">
            Valid only for the named student within the approved leave window.
            Present on request while off campus. Verified by ${escapeHtml(leave.verified_by || "gate staff")}.
          </div>

          <div class="signArea">
            <div class="signLine"></div>
            <div class="signLabel">Student / Guardian Signature</div>
            <div class="signLine"></div>
            <div class="signLabel">Gate Officer</div>
          </div>

          <div class="footer">
            Asumbi Smart Campus — Gate Desk<br/>
            This is a system-generated pass. Unauthorized duplication or
            alteration invalidates it immediately.
          </div>
        </div>
        <script>window.onload = function(){ window.print(); };</script>
      </body>
      </html>
    `);

    win.document.close();
  };

  const printReport = () => {
    const win = window.open("", "", "width=1100,height=900");
    const body = rows.map((r) => `
      <tr>
        <td>${r.student_name || "—"}</td>
        <td>${r.admissionNo || "—"}</td>
        <td>${r.studentClass || "—"}</td>
        <td>${r.leave_type || "—"}</td>
        <td>${fmtTime(r.exit_time)}</td>
        <td>${fmtTime(r.reentry_time)}</td>
        <td>${r.gate_status === "returned" ? "Returned" : r.gate_status === "out" ? "Out" : "—"}</td>
      </tr>
    `).join("");

    win.document.write(`
      <html>
        <head>
          <title>Gate Report — ${date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 2px; }
            p { color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Gate Report</h1>
          <p>${date} — ${rows.length} record(s)</p>
          <table>
            <thead>
              <tr><th>Student</th><th>Admission No</th><th>Class</th><th>Leave Type</th><th>Exit</th><th>Re-entry</th><th>Status</th></tr>
            </thead>
            <tbody>${body || "<tr><td colspan=7>No records for this day.</td></tr>"}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <main style={S.main}>
      <header style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DoorOpen size={20} color="var(--primary)" />
          <div>
            <h1 style={S.title}>Gate</h1>
            <p style={S.sub}>Verify leave gate codes and record exit / re-entry times.</p>
          </div>
        </div>
      </header>

      <section style={S.panel}>
        <form onSubmit={verify} style={S.verifyRow}>
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter gate code…"
            style={S.codeInput}
            autoFocus
          />
          <button type="submit" style={S.verifyBtn} disabled={verifying || !code.trim()}>
            {verifying ? <Loader2 size={15} className="dash-spin" /> : <LogOut size={15} />}
            Verify
          </button>
        </form>

        {result && (
          <div style={{ ...S.resultBanner, ...(result.ok ? S.resultOk : S.resultErr) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {result.message}
            </div>
            {result.ok && result.leave && result.action === "exit" && (
              <button
                style={S.passBtn}
                onClick={() => printLeaveOutPass(result.leave, "exit")}
              >
                <IdCard size={13} /> Reprint Exit Pass
              </button>
            )}
          </div>
        )}
      </section>

      <section style={S.panel}>
        <div style={S.reportHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={15} color="var(--text-secondary)" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
            {date !== todayStr() && (
              <button style={S.todayBtn} onClick={() => setDate(todayStr())}>Today</button>
            )}
          </div>
          <button style={S.printBtn} onClick={printReport} disabled={loading || rows.length === 0}>
            <Printer size={14} /> Print Report
          </button>
        </div>

        {loading ? (
          <div style={S.emptyState}><Loader2 size={20} className="dash-spin" /></div>
        ) : rows.length === 0 ? (
          <div style={S.emptyState}>No gate activity for this day.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Student", "Admission No", "Class", "Leave Type", "Exit", "Re-entry", "Status", "Pass"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}>{r.student_name || "—"}</td>
                    <td style={S.td}>{r.admissionNo || "—"}</td>
                    <td style={S.td}>{r.studentClass || "—"}</td>
                    <td style={S.td}>{r.leave_type || "—"}</td>
                    <td style={S.td}>{fmtTime(r.exit_time)}</td>
                    <td style={S.td}>{fmtTime(r.reentry_time)}</td>
                    <td style={S.td}>
                      <span style={{
                        ...S.statusPill,
                        ...(r.gate_status === "returned" ? S.pillDone : r.gate_status === "out" ? S.pillOut : S.pillWait),
                      }}>
                        {r.gate_status === "returned" ? <><LogIn size={11} /> Returned</> : r.gate_status === "out" ? <><LogOut size={11} /> Out</> : "—"}
                      </span>
                    </td>
                    <td style={S.td}>
                      {r.exit_time ? (
                        <button
                          style={S.reprintBtn}
                          title="Reprint this student's exit pass"
                          onClick={() =>
                            printLeaveOutPass(
                              {
                                id: r.id,
                                gate_code: r.gate_code,
                                reason: r.reason,
                                leave_type: r.leave_type,
                                duration: r.duration,
                                student_name: r.student_name,
                                admissionNo: r.admissionNo,
                                studentClass: r.studentClass,
                                gender: r.gender,
                                phone: r.phone,
                                email: r.email,
                                yearOfStudy: r.yearOfStudy,
                                studentStatus: r.studentStatus,
                                exit_time: r.exit_time,
                                verified_by: r.exit_verified_by_name,
                              },
                              "exit"
                            )
                          }
                        >
                          <Printer size={12} />
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const S = {
  main: { padding: "24px 28px 56px", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", minHeight: "100vh" },
  header: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 },
  backBtn: {
    alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, background: "var(--card)",
    border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "6px 12px",
    borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 800 },
  sub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)" },
  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "20px 22px", marginBottom: 20, boxShadow: "var(--shadow-sm)",
  },
  verifyRow: { display: "flex", gap: 10 },
  codeInput: {
    flex: 1, padding: "14px 16px", fontSize: 18, letterSpacing: 4, fontFamily: "monospace",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)",
    color: "var(--text)", outline: "none",
  },
  verifyBtn: {
    display: "flex", alignItems: "center", gap: 8, padding: "0 22px", borderRadius: "var(--radius-sm)",
    border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  resultBanner: {
    marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: 600, flexWrap: "wrap",
  },
  resultOk: { background: "var(--success-tint)", color: "var(--success)" },
  resultErr: { background: "var(--destructive-tint)", color: "var(--destructive)" },
  passBtn: {
    display: "flex", alignItems: "center", gap: 6, background: "var(--success)", color: "#fff",
    border: "none", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 12.5,
    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  },
  reprintBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)",
    borderRadius: 7, cursor: "pointer",
  },
  reportHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  dateInput: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" },
  todayBtn: { background: "var(--primary-tint)", color: "var(--primary)", border: "none", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  printBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  emptyState: { padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "9px 12px", background: "var(--bg)", color: "var(--text-secondary)", fontWeight: 800, fontSize: 11, textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderBottom: "1px solid var(--border)" },
  statusPill: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  pillOut: { background: "var(--warning-tint)", color: "var(--warning)" },
  pillDone: { background: "var(--success-tint)", color: "var(--success)" },
  pillWait: { background: "var(--bg)", color: "var(--text-muted)" },
};