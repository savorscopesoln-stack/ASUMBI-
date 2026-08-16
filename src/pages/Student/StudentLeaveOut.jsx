import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

export default function StudentLeaveOut() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [theme, setTheme] = useState("dark");
  const [form, setForm] = useState({
    reason: "",
    date: "",
    time: ""
  });
  const [leaves, setLeaves] = useState([]);

  /* ================= LOAD ================= */
  const loadLeaves = async () => {
    try {
      const res = await API.get("/leave-outs/student", {
        params: { studentId: user.id }
      });
      setLeaves(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user.id) loadLeaves();
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
        duration: 120
      });

      setForm({
        reason: "",
        date: "",
        time: ""
      });

      loadLeaves();
      alert("Leave request submitted");
    } catch (err) {
      console.log(err);
    }
  };

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
            color: rgba(153, 27, 27, 0.03);
            letter-spacing: 10px;
            z-index: 1;
            pointer-events: none;
            white-space: nowrap;
          }
          .topbar {
            height: 8px;
            background: linear-gradient(90deg, #7f1d1d, #b91c1c, #dc2626);
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
            background: rgba(153, 27, 27, 0.05);
            border: 1px solid rgba(153, 27, 27, 0.15);
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
            color: #7f1d1d;
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
            color: #7f1d1d;
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
            border: 3px dashed rgba(153, 27, 27, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(153, 27, 27, 0.35);
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

  /* ================= FILTERS ================= */
  const active = leaves.filter((l) => l.status === "approved");
  const pending = leaves.filter((l) => l.status === "pending");
  const history = leaves.filter((l) =>
    ["denied", "expired", "revoked"].includes(l.status)
  );

  const isDark = theme === "dark";

  return (
    <div 
      style={{
        ...styles.page,
        "--bg": isDark ? "#0b0f19" : "#f8fafc",
        "--card": isDark ? "#131926" : "#ffffff",
        "--border": isDark ? "#222c41" : "#e2e8f0",
        "--text": isDark ? "#f8fafc" : "#0f172a",
        "--subtext": isDark ? "#94a3b8" : "#64748b",
        "--input-bg": isDark ? "#0b0f19" : "#f1f5f9",
        backgroundColor: "var(--bg)",
        color: "var(--text)"
      }}
    >
      {/* EXCAPSULATED GLOBAL INTERACTION INTERFACE STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pageEntrance {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .dashboard-container-animate {
          animation: pageEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .interactive-btn { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important; }
        .interactive-btn:hover { transform: translateY(-1px); filter: brightness(1.15); box-shadow: 0 4px 12px rgba(185, 28, 28, 0.25); }
        .interactive-btn:active { transform: translateY(0); }
        .interactive-card { transition: transform 0.2s ease, border-color 0.2s ease !important; }
        .interactive-card:hover { border-color: #b91c1c !important; }
        .interactive-input { transition: all 0.2s ease !important; }
        .interactive-input:focus { border-color: #b91c1c !important; box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.15) !important; }
      `}} />

      <div style={styles.contentWidthFrame} className="dashboard-container-animate">
        
        {/* TOP NAVBAR LAYER */}
        <div style={styles.topBar}>
          <button style={styles.backBtn} onClick={() => navigate(-1)} className="interactive-btn">
            <span style={{ marginRight: 6 }}>←</span> Back
          </button>

          <button
            style={styles.toggle}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="interactive-btn"
          >
            {isDark ? "🎚️ Light UI" : "🕋 Dark UI"}
          </button>
        </div>

        {/* PROFILE CRIMSOM BANNER HERO */}
        <div style={styles.hero}>
          <div style={styles.heroGlowOverlay}></div>
          <div style={styles.heroContentFrame}>
            <div style={styles.heroBadgeBox}>Institutional Portal</div>
            <h1 style={styles.heroTitle}>Student Leave Registry</h1>
            <p style={styles.heroSub}>
              Submit leave requests, check authorization states, and generate certified printed gate passes.
            </p>
          </div>
        </div>

        {/* METADATA ANALYTIC COUNTERS GRID */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabelHeader}>
              <span style={{...styles.statusDotDot, backgroundColor: "#10b981"}} /> Active Permits
            </div>
            <div style={styles.statNumber}>{active.length}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabelHeader}>
              <span style={{...styles.statusDotDot, backgroundColor: "#f59e0b"}} /> Pending Review
            </div>
            <div style={styles.statNumber}>{pending.length}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabelHeader}>
              <span style={{...styles.statusDotDot, backgroundColor: "#64748b"}} /> Archived Audits
            </div>
            <div style={styles.statNumber}>{history.length}</div>
          </div>
        </div>

        {/* CENTRAL LAYOUT SPLITTER */}
        <div style={styles.mainDashboardGridSplitter}>
          
          {/* APPLICATION INTERFACE CARD */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>📝 File Authorization Request</h2>
            <p style={styles.formDescriptorText}>Provide comprehensive institutional data parameters below.</p>
            
            <div style={styles.formInputGroupSpacer}>
              <label style={styles.controlInputLabel}>Justification / Reason for Leave</label>
              <input
                placeholder="Specify precise context or medical/official reason..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                style={styles.input}
                className="interactive-input"
              />
            </div>

            <div style={styles.formRowFieldsFlex}>
              <div style={{ ...styles.formInputGroupSpacer, flex: 1 }}>
                <label style={styles.controlInputLabel}>Departure Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={styles.input}
                  className="interactive-input"
                />
              </div>

              <div style={{ ...styles.formInputGroupSpacer, flex: 1 }}>
                <label style={styles.controlInputLabel}>Departure Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  style={styles.input}
                  className="interactive-input"
                />
              </div>
            </div>

            <button style={styles.btn} onClick={submit} className="interactive-btn">
              Dispatch Request Parameters
            </button>
          </div>

          {/* DYNAMIC LEAVE RECORD ARRAYS CONTAINER */}
          <div style={styles.recordsLayoutColumn}>
            
            {/* ACTIVE PERMIT FEED */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>🟢 Approved Active Clearances</h2>
              {active.length === 0 ? (
                <div style={styles.emptyFeedPlaceholder}>No active operational clearances found.</div>
              ) : (
                active.map((l) => (
                  <div key={l.id} style={styles.row} className="interactive-card">
                    <div style={styles.rowMetadataBlock}>
                      <div style={styles.rowJustificationTitle}>{l.reason}</div>
                      <div style={styles.rowTimestampMetric}>
                        <strong>Authorized:</strong> {new Date(l.approved_at).toLocaleString()}
                      </div>
                      <div style={styles.rowTimestampMetric}>
                        <strong>Allocation Frame:</strong> {formatDuration(l.duration)}
                      </div>
                    </div>
                    <button onClick={() => printLeave(l)} style={styles.printBtn} className="interactive-btn">
                      🖨 Document
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* PENDING PERMIT FEED */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>🟡 Pending Academic Approvals</h2>
              {pending.length === 0 ? (
                <div style={styles.emptyFeedPlaceholder}>No outstanding request payloads pending overview.</div>
              ) : (
                pending.map((l) => (
                  <div key={l.id} style={styles.row} className="interactive-card">
                    <div style={styles.rowMetadataBlock}>
                      <div style={styles.rowJustificationTitle}>{l.reason}</div>
                      <div style={styles.rowTimestampMetric}>
                        <strong>Dispatched:</strong> {new Date(l.request_date).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ ...styles.badge, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                      Under Review
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* HISTORICAL PERMIT FEED */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>📜 Historical Clearance Registry</h2>
              {history.length === 0 ? (
                <div style={styles.emptyFeedPlaceholder}>No previous log registries archived.</div>
              ) : (
                history.map((l) => (
                  <div key={l.id} style={styles.row} className="interactive-card">
                    <div style={styles.rowMetadataBlock}>
                      <div style={styles.rowJustificationTitle}>{l.reason}</div>
                      {l.status === "revoked" && (
                        <div style={styles.revocationCriticalBanner}>
                          ⚠ Revocation Mandate issued by Management. Report immediately.
                        </div>
                      )}
                    </div>
                    <div 
                      style={{ 
                        ...styles.badge, 
                        background: l.status === "denied" ? "rgba(239, 68, 68, 0.12)" : "rgba(100, 116, 139, 0.12)", 
                        color: l.status === "denied" ? "#f87171" : "#94a3b8",
                        border: l.status === "denied" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(100, 116, 139, 0.2)",
                        textTransform: "uppercase"
                      }}
                    >
                      {l.status}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= THEME ARCHITECTURAL INTERACTION ENGINE ================= */
const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    transition: "background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    boxSizing: "border-box"
  },

  contentWidthFrame: {
    maxWidth: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column"
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px"
  },

  backBtn: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px"
  },

  toggle: {
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },

  hero: {
    background: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)",
    padding: "40px 32px",
    borderRadius: "16px",
    marginBottom: "32px",
    color: "#ffffff",
    boxShadow: "0 12px 40px -10px rgba(127, 29, 29, 0.35)",
    position: "relative",
    overflow: "hidden"
  },

  heroGlowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at top right, rgba(220, 38, 38, 0.3), transparent 60%)",
    pointerEvents: "none"
  },

  heroContentFrame: {
    position: "relative",
    zIndex: 2
  },

  heroBadgeBox: {
    display: "inline-block",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    marginBottom: "12px"
  },

  heroTitle: {
    fontSize: "28px",
    fontWeight: "800",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px"
  },

  heroSub: {
    opacity: 0.85,
    fontSize: "14px",
    lineHeight: "1.5",
    maxWidth: "600px",
    margin: 0
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "32px"
  },

  statCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)"
  },

  statLabelHeader: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--subtext)",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },

  statusDotDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%"
  },

  statNumber: {
    fontSize: "32px",
    fontWeight: "700",
    marginTop: "12px",
    letterSpacing: "-1px"
  },

  mainDashboardGridSplitter: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "32px",
    alignItems: "start",
    // Standard layout design matrix mapping
    "@media(minWidth: 860px)": {
      gridTemplateColumns: "400px 1fr"
    }
  },

  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
    marginBottom: "24px"
  },

  sectionTitle: {
    margin: "0 0 6px 0",
    fontSize: "16px",
    fontWeight: "700",
    letterSpacing: "-0.2px"
  },

  formDescriptorText: {
    color: "var(--subtext)",
    fontSize: "13px",
    margin: "0 0 20px 0"
  },

  formInputGroupSpacer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "16px"
  },

  controlInputLabel: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--subtext)"
  },

  formRowFieldsFlex: {
    display: "flex",
    gap: "16px"
  },

  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--input-bg)",
    color: "var(--text)",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box"
  },

  btn: {
    width: "100%",
    background: "#b91c1c",
    color: "#ffffff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    marginTop: "8px",
    boxShadow: "0 2px 4px rgba(185, 28, 28, 0.1)"
  },

  recordsLayoutColumn: {
    display: "flex",
    flexDirection: "column"
  },

  emptyFeedPlaceholder: {
    padding: "32px 12px",
    textAlign: "center",
    color: "var(--subtext)",
    fontSize: "13px"
  },

  row: {
    background: "var(--input-bg)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px"
  },

  rowMetadataBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },

  rowJustificationTitle: {
    fontWeight: "600",
    fontSize: "14px"
  },

  rowTimestampMetric: {
    color: "var(--subtext)",
    fontSize: "12px"
  },

  badge: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap"
  },

  printBtn: {
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },

  revocationCriticalBanner: {
    color: "#ef4444",
    marginTop: "6px",
    fontSize: "12px",
    fontWeight: "600"
  }
};

// Injection fix for dynamic inline responsive layouts mapping parameters
if (typeof window !== "undefined") {
  const widthValue = window.innerWidth;
  if (widthValue >= 860) {
    styles.mainDashboardGridSplitter.gridTemplateColumns = "400px 1fr";
  }
}