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

  /* ================= OFFICIAL LEAVE-OUT PASS =================
     Printed the moment a valid gate code is verified (and reprintable
     later from any row in the day's report). Mirrors the security
     styling of the student portal's official leave permit — watermark,
     verification code block, stamp, signature lines — but framed
     around what the gate desk actually needs: Time Out and Expected
     Time In at a glance. */
  const printLeaveOutPass = (leave, action) => {
    if (!leave) return;
    const win = window.open("", "", "width=1100,height=900");

    const exitTime = leave.exit_time ? new Date(leave.exit_time) : null;
    const reentryTime = leave.reentry_time ? new Date(leave.reentry_time) : null;
    const expectedReturn = leave.expected_return
      ? new Date(leave.expected_return)
      : exitTime
      ? new Date(exitTime.getTime() + (leave.duration || 0) * 60000)
      : null;

    const isReturned = !!reentryTime;
    const returnedLate = leave.returned_late || (isReturned && expectedReturn && reentryTime > expectedReturn);

    const passId = `GP-${leave.id}-${(leave.gate_code || "").slice(-6)}`;
    const verifyCode = (leave.gate_code || "").toUpperCase();

    const fmtDT = (d) => (d ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");
    const fmtT = (d) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
    const durationLabel = (mins) => {
      if (!mins) return "—";
      if (mins < 60) return `${mins} mins`;
      const hrs = mins / 60;
      if (hrs < 24) return `${hrs.toFixed(1)} hrs`;
      return `${(hrs / 24).toFixed(1)} days`;
    };

    win.document.write(`
      <html>
      <head>
        <title>Official Leave-Out Pass</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px 30px;
            background: #f1f5f9;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .paper {
            width: 840px;
            margin: auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
            border: 1px solid #e2e8f0;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-25deg);
            font-size: 74px;
            font-weight: 900;
            color: rgba(139, 30, 45, 0.03);
            letter-spacing: 8px;
            z-index: 1;
            pointer-events: none;
            white-space: nowrap;
          }
          .topbar { height: 8px; background: linear-gradient(90deg, #6F1725, #8B1E2D, #B45A64); }
          .header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 35px 40px; border-bottom: 1px solid #e2e8f0; position: relative; z-index: 2;
          }
          .logoBox {
            width: 80px; height: 80px; border-radius: 14px; background: rgba(139, 30, 45, 0.05);
            border: 1px solid rgba(139, 30, 45, 0.15); display: flex; align-items: center;
            justify-content: center; font-size: 38px;
          }
          .centerHeader { flex: 1; text-align: center; padding: 0 30px; }
          .school { margin: 0; color: #8B1E2D; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; }
          .sub { margin-top: 6px; color: #64748b; font-size: 13px; font-weight: 500; letter-spacing: 0.2px; }
          .badge {
            margin-top: 14px; display: inline-block; background: #fafafa; border: 1px solid #e2e8f0;
            padding: 8px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px;
            color: #8B1E2D; text-transform: uppercase;
          }
          .meta { text-align: right; font-size: 13px; color: #475569; min-width: 200px; line-height: 1.5; }
          .meta p { margin: 4px 0; }
          .infoGrid {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
            padding: 40px 40px 0 40px; position: relative; z-index: 2;
          }
          .infoCard { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; }
          .label {
            background: #f8fafc; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #64748b;
            text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;
          }
          .value { padding: 16px; font-size: 15px; font-weight: 600; color: #0f172a; }
          .timeRow {
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 40px 0 40px;
            position: relative; z-index: 2;
          }
          .timeCard {
            border-radius: 12px; padding: 18px 20px; text-align: center;
            border: 1px solid #e2e8f0;
          }
          .timeCardOut { background: #fff7ed; border-color: #fed7aa; }
          .timeCardIn { background: #eff6ff; border-color: #bfdbfe; }
          .timeCardLabel {
            font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px;
          }
          .timeCardOut .timeCardLabel { color: #9a3412; }
          .timeCardIn .timeCardLabel { color: #1e3a8a; }
          .timeCardValue { font-size: 22px; font-weight: 800; margin-top: 6px; color: #0f172a; }
          .timeCardSub { font-size: 11.5px; color: #64748b; margin-top: 3px; }
          .statusBar {
            margin: 24px 40px 0 40px; padding: 20px 24px; border-radius: 12px;
            display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;
          }
          .statusOut { background: #fff7ed; border: 1px solid #fed7aa; }
          .statusReturned { background: #ecfdf5; border: 1px solid #a7f3d0; }
          .statusLate { background: #fef2f2; border: 1px solid #fecaca; }
          .statusLeft h3 { margin: 0; font-size: 16px; font-weight: 700; }
          .statusLeft p { margin: 4px 0 0 0; font-size: 13px; line-height: 1.4; }
          .statusOut .statusLeft h3, .statusOut .statusLeft p { color: #9a3412; }
          .statusReturned .statusLeft h3, .statusReturned .statusLeft p { color: #065f46; }
          .statusLate .statusLeft h3, .statusLate .statusLeft p { color: #991b1b; }
          .pillTag {
            padding: 8px 16px; border-radius: 30px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
            color: #ffffff;
          }
          .pillOut { background: #9a3412; }
          .pillReturned { background: #065f46; }
          .pillLate { background: #991b1b; }
          .security {
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 24px 40px 40px 40px;
            position: relative; z-index: 2;
          }
          .securityCard { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #ffffff; }
          .securityTitle {
            margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 14px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.5px;
          }
          .verifyCode {
            font-family: 'Courier New', monospace; font-size: 18px; letter-spacing: 4px; background: #0f172a;
            color: #ffffff; padding: 14px; border-radius: 8px; text-align: center; font-weight: 700;
          }
          .notice { color: #64748b; font-size: 12px; line-height: 1.6; }
          .footer {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; padding: 0 40px 40px 40px;
            position: relative; z-index: 2;
          }
          .signBox { text-align: center; }
          .line { border-bottom: 1px solid #94a3b8; margin-top: 50px; margin-bottom: 8px; }
          .signLabel { font-size: 12px; font-weight: 600; color: #475569; }
          .bottom {
            border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; color: #94a3b8;
            font-size: 11px; line-height: 1.6; position: relative; z-index: 2;
          }
          .stamp {
            position: absolute; right: 60px; bottom: 130px; width: 110px; height: 110px; border-radius: 50%;
            border: 3px dashed rgba(139, 30, 45, 0.2); display: flex; align-items: center; justify-content: center;
            color: rgba(139, 30, 45, 0.35); font-weight: 800; font-size: 13px; transform: rotate(-12deg);
            text-transform: uppercase; letter-spacing: 1px; text-align: center; line-height: 1.3;
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .paper { width: 100%; box-shadow: none; border: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="paper">
          <div class="watermark">OFFICIAL GATE PASS</div>
          <div class="topbar"></div>
          <div class="header">
            <div class="logoBox">🏫</div>
            <div class="centerHeader">
              <h1 class="school">ASUMBI SMART CAMPUS</h1>
              <div class="sub">Institutional Gate &amp; Leave-Out Verification System</div>
              <div class="badge">Official Leave-Out Pass</div>
            </div>
            <div class="meta">
              <p><b>Issue Date:</b> ${new Date().toLocaleDateString()}</p>
              <p><b>Pass No:</b> ${passId}</p>
              <p><b>Status:</b> ${isReturned ? (returnedLate ? "Returned (Late)" : "Returned") : "Out"}</p>
            </div>
          </div>

          <div class="infoGrid">
            <div class="infoCard">
              <div class="label">Student Name</div>
              <div class="value">${leave.student_name || "N/A"}</div>
            </div>
            <div class="infoCard">
              <div class="label">Admission Number</div>
              <div class="value">${leave.admissionNo || "N/A"}</div>
            </div>
            <div class="infoCard">
              <div class="label">Class</div>
              <div class="value">${leave.studentClass || "N/A"}</div>
            </div>
            <div class="infoCard">
              <div class="label">Leave Type</div>
              <div class="value">${typeLabel(leave.leave_type)}</div>
            </div>
            <div class="infoCard" style="grid-column: 1 / -1;">
              <div class="label">Reason For Leave</div>
              <div class="value">${leave.reason || "—"}</div>
            </div>
          </div>

          <div class="timeRow">
            <div class="timeCard timeCardOut">
              <div class="timeCardLabel">Time Out</div>
              <div class="timeCardValue">${fmtT(exitTime)}</div>
              <div class="timeCardSub">${exitTime ? exitTime.toLocaleDateString() : "—"}</div>
            </div>
            <div class="timeCard timeCardIn">
              <div class="timeCardLabel">${isReturned ? "Time In" : "Expected Time In"}</div>
              <div class="timeCardValue">${isReturned ? fmtT(reentryTime) : fmtT(expectedReturn)}</div>
              <div class="timeCardSub">
                ${isReturned ? (reentryTime ? reentryTime.toLocaleDateString() : "—") : `Approved duration: ${durationLabel(leave.duration)}`}
              </div>
            </div>
          </div>

          <div class="statusBar ${isReturned ? (returnedLate ? "statusLate" : "statusReturned") : "statusOut"}">
            <div class="statusLeft">
              <h3>${isReturned ? (returnedLate ? "Returned After Expected Time" : "Student Has Returned") : "Authorized To Exit Campus"}</h3>
              <p>
                ${isReturned
                  ? `Re-entry verified by ${leave.verified_by || "gate staff"} at ${fmtDT(reentryTime)}.`
                  : `Exit verified by ${leave.verified_by || "gate staff"} at ${fmtDT(exitTime)}. Must return by ${fmtDT(expectedReturn)}.`}
              </p>
            </div>
            <div class="pillTag ${isReturned ? (returnedLate ? "pillLate" : "pillReturned") : "pillOut"}">
              ${isReturned ? "✔ RETURNED" : "✔ VERIFIED"}
            </div>
          </div>

          <div class="security">
            <div class="securityCard">
              <h3 class="securityTitle">Gate Verification Code</h3>
              <div class="verifyCode">${verifyCode || "—"}</div>
            </div>
            <div class="securityCard">
              <h3 class="securityTitle">Security Notice</h3>
              <div class="notice">
                This pass is digitally generated and recognized by the institutional administration system.
                It is valid only for the student named above and only within the approved leave window.
                Any unauthorized alteration, duplication, or misuse invalidates this pass immediately and
                must be reported to the Dean of Students.
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="signBox"><div class="line"></div><div class="signLabel">Student Signature</div></div>
            <div class="signBox"><div class="line"></div><div class="signLabel">Gate / Security Officer</div></div>
            <div class="signBox"><div class="line"></div><div class="signLabel">Official Institution Stamp</div></div>
          </div>
          <div class="stamp">${isReturned ? "RETURNED" : "GATE<br/>CLEARED"}</div>
          <div class="bottom">
            Generated By ASUMBI SMART CAMPUS SYSTEM • Gate &amp; Leave-Out Verification Desk<br/><br/>
            Present this pass on request while off campus. It remains valid only within the approved duration.
          </div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.print();
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
            {result.ok && result.leave && (
              <button
                style={S.passBtn}
                onClick={() => printLeaveOutPass(result.leave, result.action)}
              >
                <IdCard size={13} /> Print Leave-Out Pass
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
                          title="Print / reprint this leave-out pass"
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
                                exit_time: r.exit_time,
                                reentry_time: r.reentry_time,
                                verified_by: r.reentry_time ? r.reentry_verified_by_name : r.exit_verified_by_name,
                              },
                              r.reentry_time ? "reentry" : "exit"
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
