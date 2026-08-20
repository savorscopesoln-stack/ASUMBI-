import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, Sun, Moon, DoorOpen, CheckCircle2, Clock, Archive,
  Printer, AlertTriangle, Inbox, FileEdit, Siren,
} from "lucide-react";

const PENDING_STAGE_LABEL = {
  pending: "Pending",
  pending_subadmin2: "Pending Sub-Admin 2",
  pending_final: "Pending Final Approval",
  pending_admin: "Pending Admin",
};

const LEAVE_TYPES = [
  { value: "short_stay", label: "Short Stay", hint: "A few hours, back the same day" },
  { value: "long", label: "Long Leave", hint: "Overnight or multi-day" },
  { value: "emergency", label: "Emergency", hint: "Urgent, needs immediate attention" },
];

/* ─── shared design-token stylesheet ───
   Same id/contents as the dashboard's token sheet, so this page
   inherits the same palette + dark-mode support. Injecting twice
   is a no-op if the dashboard already mounted it.
*/
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes softPulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }

    .dash-spin { animation: spin 0.8s linear infinite; }
    .dash-skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--card-elevated) 50%, var(--border) 75%); background-size: 200% 100%; animation: softPulse 1.4s ease-in-out infinite; border-radius: 8px; }

    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-icon-btn:hover { background: var(--bg); }

    button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
      .dash-two-col { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── page-specific additive rules ─── */
const injectLeaveStyles = () => {
  if (document.getElementById("leave-page-styles")) return;
  const el = document.createElement("style");
  el.id = "leave-page-styles";
  el.textContent = `
    @media (max-width: 640px) {
      .leave-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
      .leave-form-row { flex-direction: column !important; }
    }
    .leave-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--primary-tint) !important; }
  `;
  document.head.appendChild(el);
};

export default function StudentLeaveOut() {
  injectStyles();
  injectLeaveStyles();

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [form, setForm] = useState({ reason: "", date: "", time: "", leave_type: "short_stay" });
  const [leaves, setLeaves] = useState([]);

  /* ================= LOAD ================= */
  const loadLeaves = async () => {
    try {
      const res = await API.get("/leave-outs/student", {
        params: { studentId: user.id },
      });
      setLeaves(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user.id) loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  /* ================= SUBMIT ================= */
  const submit = async () => {
    if (!form.reason) {
      alert("Reason required");
      return;
    }

    const requestDate =
      form.date && form.time
        ? `${form.date}T${form.time}:00`
        : new Date().toISOString();

    try {
      await API.post("/leave-outs", {
        student_id: user.id,
        reason: form.reason,
        request_date: requestDate,
        leave_type: form.leave_type,
      });

      setForm({ reason: "", date: "", time: "", leave_type: "short_stay" });
      loadLeaves();
      alert("Leave request submitted");
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= LEAVE TYPE LABEL ================= */
  const typeLabel = (value) =>
    LEAVE_TYPES.find((t) => t.value === value)?.label || "Short Stay";

  /* ================= FORMAT DURATION ================= */
  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    const hours = minutes / 60;
    if (minutes < 60) return `${minutes} mins`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    if (hours < 168) return `${(hours / 24).toFixed(1)} days`;
    return `${(hours / 168).toFixed(1)} weeks`;
  };

  /* ================= PRINT ================= */
  const printLeave = (l) => {
    const win = window.open("", "", "width=1100,height=900");

    const expected = new Date(
      new Date(l.approved_at).getTime() + l.duration * 60000
    );

    const permitId = `LP-${l.id}-${Date.now().toString().slice(-6)}`;

    const verifyCode = btoa(
      `${l.id}-${l.student_id}-${l.approved_at}`
    ).slice(0, 12);

    win.document.write(`
      <html>
      <head>
        <title>Official Leave Permit</title>
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
            font-size: 80px;
            font-weight: 900;
            color: rgba(139, 30, 45, 0.03);
            letter-spacing: 10px;
            z-index: 1;
            pointer-events: none;
            white-space: nowrap;
          }
          .topbar {
            height: 8px;
            background: linear-gradient(90deg, #6F1725, #8B1E2D, #B45A64);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 35px 40px;
            border-bottom: 1px solid #e2e8f0;
            position: relative;
            z-index: 2;
          }
          .logoBox {
            width: 80px;
            height: 80px;
            border-radius: 14px;
            background: rgba(139, 30, 45, 0.05);
            border: 1px solid rgba(139, 30, 45, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 38px;
          }
          .centerHeader {
            flex: 1;
            text-align: center;
            padding: 0 30px;
          }
          .school {
            margin: 0;
            color: #8B1E2D;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .sub {
            margin-top: 6px;
            color: #64748b;
            font-size: 13px;
            font-weight: 500;
            letter-spacing: 0.2px;
          }
          .badge {
            margin-top: 14px;
            display: inline-block;
            background: #fafafa;
            border: 1px solid #e2e8f0;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #8B1E2D;
            text-transform: uppercase;
          }
          .meta {
            text-align: right;
            font-size: 13px;
            color: #475569;
            min-width: 200px;
            line-height: 1.5;
          }
          .meta p { margin: 4px 0; }
          .infoGrid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            padding: 40px;
            position: relative;
            z-index: 2;
          }
          .infoCard {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
          }
          .label {
            background: #f8fafc;
            padding: 10px 16px;
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
          }
          .value {
            padding: 16px;
            font-size: 15px;
            font-weight: 600;
            color: #0f172a;
          }
          .statusBar {
            margin: 0 40px;
            padding: 20px 24px;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 2;
          }
          .statusLeft h3 {
            margin: 0;
            color: #065f46;
            font-size: 16px;
            font-weight: 700;
          }
          .statusLeft p {
            margin: 4px 0 0 0;
            color: #047857;
            font-size: 13px;
            line-height: 1.4;
          }
          .approved {
            background: #065f46;
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .security {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 40px;
            position: relative;
            z-index: 2;
          }
          .securityCard {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            background: #ffffff;
          }
          .securityTitle {
            margin-top: 0;
            margin-bottom: 12px;
            color: #0f172a;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .verifyCode {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            letter-spacing: 4px;
            background: #0f172a;
            color: #ffffff;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            font-weight: 700;
          }
          .notice {
            color: #64748b;
            font-size: 12px;
            line-height: 1.6;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            padding: 0 40px 40px 40px;
            position: relative;
            z-index: 2;
          }
          .signBox { text-align: center; }
          .line {
            border-bottom: 1px solid #94a3b8;
            margin-top: 50px;
            margin-bottom: 8px;
          }
          .signLabel {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          .bottom {
            border-top: 1px solid #e2e8f0;
            padding: 24px 40px;
            text-align: center;
            color: #94a3b8;
            font-size: 11px;
            line-height: 1.6;
            position: relative;
            z-index: 2;
          }
          .stamp {
            position: absolute;
            right: 60px;
            bottom: 110px;
            width: 110px;
            height: 110px;
            border-radius: 50%;
            border: 3px dashed rgba(139, 30, 45, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(139, 30, 45, 0.35);
            font-weight: 800;
            font-size: 14px;
            transform: rotate(-12deg);
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .paper { width: 100%; box-shadow: none; border: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="paper">
          <div class="watermark">OFFICIAL PERMIT</div>
          <div class="topbar"></div>
          <div class="header">
            <div class="logoBox">🏫</div>
            <div class="centerHeader">
              <h1 class="school">ASUMBI SMART CAMPUS</h1>
              <div class="sub">Institutional Student Leave Authorization System</div>
              <div class="badge">Official Student Leave Permit</div>
            </div>
            <div class="meta">
              <p><b>Issue Date:</b> ${new Date().toLocaleDateString()}</p>
              <p><b>Permit No:</b> ${permitId}</p>
              <p><b>Status:</b> Approved</p>
            </div>
          </div>
          <div class="infoGrid">
            <div class="infoCard">
              <div class="label">Student Name</div>
              <div class="value">${user.name || "N/A"}</div>
            </div>
            <div class="infoCard">
              <div class="label">Admission Number</div>
              <div class="value">${user.id || "N/A"}</div>
            </div>
            <div class="infoCard">
              <div class="label">Reason For Leave</div>
              <div class="value">${l.reason}</div>
            </div>
            <div class="infoCard">
              <div class="label">Leave Type</div>
              <div class="value">${typeLabel(l.leave_type)}</div>
            </div>
            <div class="infoCard">
              <div class="label">Approved Duration</div>
              <div class="value">${formatDuration(l.duration)}</div>
            </div>
            <div class="infoCard">
              <div class="label">Approved At</div>
              <div class="value">${new Date(l.approved_at).toLocaleString()}</div>
            </div>
            <div class="infoCard">
              <div class="label">Expected Return</div>
              <div class="value">${expected.toLocaleString()}</div>
            </div>
          </div>
          <div class="statusBar">
            <div class="statusLeft">
              <h3>Leave Authorization Approved</h3>
              <p>Student is officially permitted to leave the institution within the approved duration.</p>
            </div>
            <div class="approved">✔ VERIFIED</div>
          </div>
          <div class="security">
            <div class="securityCard">
              <h3 class="securityTitle">Verification Code</h3>
              <div class="verifyCode">${verifyCode}</div>
            </div>
            <div class="securityCard">
              <h3 class="securityTitle">Security Notice</h3>
              <div class="notice">
                This document is digitally generated and recognized by the institutional administration system. Any unauthorized alteration, duplication, or misuse invalidates this permit immediately.
              </div>
            </div>
          </div>
          <div class="footer">
            <div class="signBox"><div class="line"></div><div class="signLabel">Student Signature</div></div>
            <div class="signBox"><div class="line"></div><div class="signLabel">Dean Of Students</div></div>
            <div class="signBox"><div class="line"></div><div class="signLabel">Official Institution Stamp</div></div>
          </div>
          <div class="stamp">APPROVED</div>
          <div class="bottom">
            Generated By ASUMBI SMART CAMPUS SYSTEM • Official Leave Management Portal<br/><br/>
            This permit remains valid only within the approved duration and must be presented upon request.
          </div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.print();
  };

  /* ================= FILTERS =================
     Emergency/Long-Stay now move through extra stages
     (pending_subadmin2 / pending_final / pending_admin) before landing
     on "approved", and an Admin can grant a leave directly
     ("admin_granted") with no stages at all — both count as an active
     permit alongside a plain "approved" short-stay leave. */
  const active = leaves.filter((l) => l.status === "approved" || l.status === "admin_granted");
  const pending = leaves.filter((l) =>
    ["pending", "pending_subadmin2", "pending_final", "pending_admin"].includes(l.status)
  );
  const history = leaves.filter((l) =>
    ["denied", "rejected", "expired", "revoked", "cancelled"].includes(l.status)
  );

  const statCards = [
    { label: "Active Permits", value: active.length, Icon: CheckCircle2, tint: "success" },
    { label: "Pending Review", value: pending.length, Icon: Clock, tint: "warning" },
    { label: "Archived", value: history.length, Icon: Archive, tint: "neutral" },
  ];
  const tintStyles = {
    success: { bg: "var(--success-tint)", fg: "var(--success)" },
    warning: { bg: "var(--warning-tint)", fg: "var(--warning)" },
    neutral: { bg: "var(--bg)", fg: "var(--text-secondary)" },
  };

  return (
    <main className="dash-main" style={D.main}>

      {/* ── Header ── */}
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button style={D.backBtn} className="dash-icon-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={D.pageTitle}>Leave &amp; Gate Pass</h1>
            <p style={D.pageSub}>Submit requests and print certified permits once approved</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="dash-icon-btn"
          style={D.themeToggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      {/* ── Stat cards ── */}
      <section className="dash-stats-grid" style={D.statsGrid} aria-label="Leave summary">
        {statCards.map((sc) => {
          const t = tintStyles[sc.tint];
          return (
            <div key={sc.label} className="dash-card" style={D.statCard}>
              <div style={{ ...D.statIconWrap, background: t.bg }}>
                <sc.Icon size={20} color={t.fg} strokeWidth={2} />
              </div>
              <div style={D.statInfo}>
                <div style={D.statLabel}>{sc.label}</div>
                <div style={D.statValue}>{sc.value}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Main split: form + records ── */}
      <div className="dash-two-col" style={D.twoCol}>

        {/* Request form */}
        <section className="dash-card" style={D.panel} aria-label="New leave request">
          <div style={D.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileEdit size={17} color="var(--text-secondary)" />
              <h3 style={D.panelTitle}>New Request</h3>
            </div>
          </div>
          <p style={D.formHelp}>Fill in the details below to file a leave request.</p>

          <div style={D.fieldGroup}>
            <label style={D.fieldLabel}>Reason for Leave</label>
            <input
              placeholder="e.g. Medical appointment, family visit…"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              style={D.input}
              className="leave-input"
            />
          </div>

          <div style={D.fieldGroup}>
            <label style={D.fieldLabel}>Leave Type</label>
            <div style={D.typeGrid}>
              {LEAVE_TYPES.map((t) => {
                const active = form.leave_type === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setForm({ ...form, leave_type: t.value })}
                    style={{
                      ...D.typeCard,
                      ...(active ? D.typeCardActive : {}),
                    }}
                  >
                    {t.value === "emergency" && (
                      <Siren size={14} color={active ? "#fff" : "var(--destructive)"} />
                    )}
                    <span style={D.typeCardLabel}>{t.label}</span>
                    <span style={{ ...D.typeCardHint, ...(active ? { color: "rgba(255,255,255,0.85)" } : {}) }}>
                      {t.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="leave-form-row" style={D.formRow}>
            <div style={{ ...D.fieldGroup, flex: 1 }}>
              <label style={D.fieldLabel}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={D.input}
                className="leave-input"
              />
            </div>
            <div style={{ ...D.fieldGroup, flex: 1 }}>
              <label style={D.fieldLabel}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                style={D.input}
                className="leave-input"
              />
            </div>
          </div>

          <button style={D.submitBtn} onClick={submit}>Submit Request</button>
        </section>

        {/* Records */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <section className="dash-card" style={D.panel} aria-label="Active permits">
            <div style={D.panelHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={17} color="var(--success)" />
                <h3 style={D.panelTitle}>Active Permits</h3>
              </div>
              <span style={D.panelBadge}>{active.length}</span>
            </div>

            {active.length === 0 ? (
              <div style={D.emptyState}>
                <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div>No active permits</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {active.map((l) => (
                  <div key={l.id} className="leave-row" style={D.row}>
                    <div style={{ minWidth: 0 }}>
                      <div style={D.rowTitle}>{l.reason}</div>
                      <div style={D.rowMeta}>{typeLabel(l.leave_type)} · Authorized {new Date(l.approved_at).toLocaleString()}</div>
                      {(l.final_approver_name || l.granted_by_name) && (
                        <div style={D.rowMeta}>
                          {l.is_admin_granted ? `Granted by ${l.granted_by_name}` : `Approved by ${l.final_approver_name}`}
                        </div>
                      )}
                      <div style={D.rowMeta}>Duration: {formatDuration(l.duration)}</div>
                    </div>
                    <button onClick={() => printLeave(l)} style={D.printBtn}>
                      <Printer size={13} /> Print
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-card" style={D.panel} aria-label="Pending requests">
            <div style={D.panelHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={17} color="var(--warning)" />
                <h3 style={D.panelTitle}>Pending Review</h3>
              </div>
              <span style={D.panelBadge}>{pending.length}</span>
            </div>

            {pending.length === 0 ? (
              <div style={D.emptyState}>
                <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div>No pending requests</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.map((l) => (
                  <div key={l.id} className="leave-row" style={D.row}>
                    <div style={{ minWidth: 0 }}>
                      <div style={D.rowTitle}>{l.reason}</div>
                      <div style={D.rowMeta}>{typeLabel(l.leave_type)} · Submitted {new Date(l.request_date).toLocaleString()}</div>
                      {l.status === "pending_subadmin2" && (
                        <div style={D.rowMeta}>Awaiting Sub-Admin 2 approval</div>
                      )}
                      {l.status === "pending_final" && (
                        <div style={D.rowMeta}>
                          Approved by {l.subadmin2_approver_name || "Sub-Admin 2"} · awaiting final approval
                        </div>
                      )}
                      {l.status === "pending_admin" && (
                        <div style={D.rowMeta}>Awaiting Admin approval</div>
                      )}
                    </div>
                    <span style={{ ...D.badge, background: "var(--warning-tint)", color: "var(--warning)" }}>
                      <Clock size={12} /> {PENDING_STAGE_LABEL[l.status] || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-card" style={D.panel} aria-label="Leave history">
            <div style={D.panelHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Archive size={17} color="var(--text-secondary)" />
                <h3 style={D.panelTitle}>History</h3>
              </div>
              <span style={D.panelBadge}>{history.length}</span>
            </div>

            {history.length === 0 ? (
              <div style={D.emptyState}>
                <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div>No past records</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map((l) => {
                  const isRejected = l.status === "denied" || l.status === "rejected";
                  return (
                    <div key={l.id} className="leave-row" style={D.row}>
                      <div style={{ minWidth: 0 }}>
                        <div style={D.rowTitle}>{l.reason}</div>
                        <div style={D.rowMeta}>{typeLabel(l.leave_type)}</div>
                        {isRejected && l.rejected_by_name && (
                          <div style={D.rowMeta}>Rejected by {l.rejected_by_name}{l.deny_reason ? ` — ${l.deny_reason}` : ""}</div>
                        )}
                        {l.status === "revoked" && (
                          <div style={D.revokedNote}>
                            <AlertTriangle size={12} /> Revoked by management — report immediately
                          </div>
                        )}
                      </div>
                      <span style={{
                        ...D.badge,
                        background: isRejected ? "var(--destructive-tint)" : "var(--bg)",
                        color: isRejected ? "var(--destructive)" : "var(--text-secondary)",
                        border: isRejected ? "none" : "1px solid var(--border)",
                        textTransform: "uppercase",
                      }}>
                        {isRejected ? "Rejected" : l.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}

/* ════════════════════════════════
   STYLES — token-driven, mirrors
   the dashboard's "D" style object
════════════════════════════════ */
const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
    flexWrap: "wrap",
    gap: 14,
  },
  backBtn: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 36,
    height: 36,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  pageTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "4px 0 0", fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 },
  themeToggle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 34,
    height: 34,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  /* ── stat cards ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginBottom: 26,
  },
  statCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow 0.15s ease",
  },
  statIconWrap: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 3 },
  statValue: { fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },

  /* ── layout ── */
  twoCol: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: 20,
    alignItems: "start",
  },

  /* ── panels ── */
  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },
  panelBadge: {
    background: "var(--primary-tint)",
    color: "var(--primary)",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },

  /* ── form ── */
  formHelp: { color: "var(--text-secondary)", fontSize: 13, margin: "0 0 18px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" },
  formRow: { display: "flex", gap: 16 },
  typeGrid: { display: "flex", flexDirection: "column", gap: 8 },
  typeCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  typeCardActive: {
    background: "var(--primary)",
    borderColor: "var(--primary)",
    color: "#fff",
  },
  typeCardLabel: { fontSize: 13, fontWeight: 700, color: "inherit" },
  typeCardHint: { fontSize: 11.5, color: "var(--text-muted)" },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    outline: "none",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  submitBtn: {
    width: "100%",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    marginTop: 4,
    boxShadow: "var(--shadow-sm)",
  },

  /* ── record rows ── */
  emptyState: {
    padding: "28px 0",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: "var(--radius-sm)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    gap: 12,
  },
  rowTitle: { fontWeight: 700, color: "var(--text)", fontSize: 13.5, marginBottom: 3 },
  rowMeta: { color: "var(--text-muted)", fontSize: 12 },
  revokedNote: {
    display: "flex", alignItems: "center", gap: 5,
    color: "var(--destructive)", fontSize: 12, fontWeight: 600, marginTop: 4,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  printBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    boxShadow: "var(--shadow-sm)",
    flexShrink: 0,
  },
};