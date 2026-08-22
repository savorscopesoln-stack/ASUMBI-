import React, { useEffect, useRef, useState } from "react";
import API from "../api";
import {
  Utensils, CheckCircle2, XCircle, ArrowLeft, Loader2, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export default function KitchenPage() {
  injectStyles();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLog = async () => {
    try {
      setLoading(true);
      const res = await API.get("/kitchen/log");
      setLog(res.data?.rows || []);
    } catch (err) {
      console.log(err);
      setLog([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLog();
    inputRef.current?.focus();
  }, []);

  const verify = async (e) => {
    e.preventDefault();
    if (!code.trim() || verifying) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await API.post("/kitchen/verify", { code: code.trim() });
      setResult({ ok: true, message: res.data.message });
      loadLog();
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.message || "Verification failed" });
    } finally {
      setCode("");
      setVerifying(false);
      inputRef.current?.focus();
    }
  };

  const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
  const slotLabel = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "—");

  return (
    <main style={S.main}>
      <header style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Utensils size={20} color="var(--primary)" />
          <div>
            <h1 style={S.title}>Kitchen</h1>
            <p style={S.sub}>Verify each student's single-use meal code for today.</p>
          </div>
        </div>
      </header>

      <section style={S.panel}>
        <form onSubmit={verify} style={S.verifyRow}>
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter meal code…"
            style={S.codeInput}
            autoFocus
          />
          <button type="submit" style={S.verifyBtn} disabled={verifying || !code.trim()}>
            {verifying ? <Loader2 size={15} className="dash-spin" /> : <Utensils size={15} />}
            Verify
          </button>
        </form>

        {result && (
          <div style={{ ...S.resultBanner, ...(result.ok ? S.resultOk : S.resultErr) }}>
            {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {result.message}
          </div>
        )}
      </section>

      <section style={S.panel}>
        <div style={S.reportHeader}>
          <h3 style={S.panelTitle}><Clock size={15} /> Today's Activity</h3>
        </div>

        {loading ? (
          <div style={S.emptyState}><Loader2 size={20} className="dash-spin" /></div>
        ) : log.length === 0 ? (
          <div style={S.emptyState}>No meal codes issued yet today.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Student", "Admission No", "Class", "Meal", "Verified At", "Status"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}>{r.student_name || "—"}</td>
                    <td style={S.td}>{r.admissionNo || "—"}</td>
                    <td style={S.td}>{r.studentClass || "—"}</td>
                    <td style={S.td}>{slotLabel(r.slot)}</td>
                    <td style={S.td}>{fmtTime(r.usedAt)}</td>
                    <td style={S.td}>
                      <span style={{ ...S.statusPill, ...(r.usedAt ? S.pillDone : S.pillWait) }}>
                        {r.usedAt ? "Verified" : "Pending"}
                      </span>
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
  panelTitle: { display: "flex", alignItems: "center", gap: 6, margin: 0, fontSize: 15, fontWeight: 800 },
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
    marginTop: 14, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
    borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: 600,
  },
  resultOk: { background: "var(--success-tint)", color: "var(--success)" },
  resultErr: { background: "var(--destructive-tint)", color: "var(--destructive)" },
  reportHeader: { marginBottom: 16 },
  emptyState: { padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "9px 12px", background: "var(--bg)", color: "var(--text-secondary)", fontWeight: 800, fontSize: 11, textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderBottom: "1px solid var(--border)" },
  statusPill: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  pillDone: { background: "var(--success-tint)", color: "var(--success)" },
  pillWait: { background: "var(--bg)", color: "var(--text-muted)" },
};
