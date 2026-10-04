import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

/* =========================================================================
   INSTITUTION EXAMINATION WALLET

   Institution-admin-facing (protect + requirePage("Wallet") on the
   backend — see routes/wallet.js). Everything here operates on the
   logged-in admin's OWN tenant only; there's no institution picker
   like FinanceDashboard.jsx has, because an institution admin only
   ever has one institution.

   "Request Credits via Email/WhatsApp" never calls a backend action
   that sends anything — GET /api/wallet/credit-request just returns a
   prefilled mailto:/wa.me URL (built in
   utils/creditRequestMessage.service.js) that this page opens in the
   browser via window.location.href — no request is ever recorded
   anywhere, per spec (institutions request credits exclusively by
   email/WhatsApp, no internal request queue).
========================================================================= */

const injectDesignTokens = () => {
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
      --success: #4ADE80; --success-tint: rgba(22,163,74,0.18); --warning: #FBBF24; --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185; --destructive-tint: rgba(220,38,38,0.18); --info: #7DA6FF; --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3); --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    body { background: var(--bg); transition: background-color .2s ease; }
    .wlt-row:hover { background: var(--card-elevated) !important; }
    .wlt-tab:hover { filter: brightness(0.97); }
    .wlt-checkrow:hover { background: var(--card-elevated) !important; }
  `;
  document.head.appendChild(el);
};

const s = {
  page: { fontFamily: "Inter, sans-serif", background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 28 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  h1: { fontSize: 22, fontWeight: 800, margin: 0 },
  muted: { color: "var(--text-muted)", fontSize: 13 },
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, boxShadow: "var(--shadow-sm)", marginBottom: 16 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 },
  stat: { background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 14 },
  statVal: { fontSize: 24, fontWeight: 800 },
  tabs: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  tab: (active) => ({
    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "var(--primary)" : "var(--card-elevated)",
    color: active ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)",
  }),
  btn: { padding: "10px 18px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 },
  btnSecondary: { padding: "10px 18px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card-elevated)", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontSize: 14 },
  btnDisabled: { padding: "10px 18px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card-elevated)", color: "var(--text-muted)", fontWeight: 700, cursor: "not-allowed", fontSize: 14 },
  input: { width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, marginBottom: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 6px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontWeight: 600 },
  td: { padding: "8px 6px", borderBottom: "1px solid var(--border)" },
  banner: (tone) => ({
    padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 14, fontSize: 13,
    background: tone === "error" ? "var(--destructive-tint)" : tone === "warning" ? "var(--warning-tint)" : "var(--success-tint)",
    color: tone === "error" ? "var(--destructive)" : tone === "warning" ? "var(--warning)" : "var(--success)",
  }),
  badge: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--primary-tint)", color: "var(--primary)" },
};

const TABS = ["Overview", "Request Credits", "Invoices", "Receipts", "Examinations", "Ledger"];

const fmtMoney = (currency, n) =>
  `${currency || ""} ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const statusTone = (st) =>
  st === "paid" ? { background: "var(--success-tint)", color: "var(--success)" }
  : st === "void" ? { background: "var(--destructive-tint)", color: "var(--destructive)" }
  : { background: "var(--warning-tint)", color: "var(--warning)" };

export default function InstitutionWallet() {
  injectDesignTokens();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState("Overview");
  const [overview, setOverview] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [exams, setExams] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // request-credits form
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [requestInfo, setRequestInfo] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // allocation panel
  const [allocatingExam, setAllocatingExam] = useState(null); // { id, name, cohort_year }
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [allocConfirming, setAllocConfirming] = useState(false);
  const [allocBusy, setAllocBusy] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);

  // Gap fix: manage (remove) already-allocated students on the same
  // exam, right next to the "allocate more" list — previously
  // removeStudentAllocation existed on the backend with nothing in the
  // UI able to call it.
  const [allocatedStudents, setAllocatedStudents] = useState([]);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const loadOverview = async () => {
    try {
      const res = await API.get("/wallet");
      setOverview(res.data);
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to load wallet" });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOverview();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (tab === "Ledger") {
          const res = await API.get("/wallet/ledger");
          setLedger(res.data?.ledger || []);
        } else if (tab === "Invoices") {
          const res = await API.get("/wallet/invoices");
          setInvoices(res.data?.invoices || []);
        } else if (tab === "Receipts") {
          const res = await API.get("/wallet/receipts");
          setReceipts(res.data?.receipts || []);
        } else if (tab === "Examinations") {
          const res = await API.get("/wallet/exams");
          setExams(res.data?.examinations || []);
        }
      } catch (err) {
        setMessage({ tone: "error", text: err.response?.data?.message || "Failed to load data" });
      }
    })();
  }, [tab]);

  // The backend renders the PDF; we read its filename from Content-Disposition
  // (exposed via CORS) and trigger the browser download ourselves.
  const downloadPdf = async (key, path, fallbackName) => {
    setDownloadingKey(key);
    setMessage(null);
    try {
      const res = await API.get(path, { responseType: "blob" });
      const match = /filename="?([^";]+)"?/i.exec(res.headers?.["content-disposition"] || "");
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = match ? match[1] : fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage({ tone: "error", text: "Could not download the document. Please try again." });
    } finally {
      setDownloadingKey(null);
    }
  };

  const loadRequestInfo = async () => {
    setRequestLoading(true);
    setMessage(null);
    try {
      const qty = requestedQuantity ? `?requestedQuantity=${encodeURIComponent(requestedQuantity)}` : "";
      const res = await API.get(`/wallet/credit-request${qty}`);
      setRequestInfo(res.data);
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to prepare credit request" });
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "Request Credits") loadRequestInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openAllocation = async (exam) => {
    setAllocatingExam(exam);
    setSelectedStudentIds(new Set());
    setAllocConfirming(false);
    setStudentSearch("");
    setMessage(null);
    setRemoveConfirmId(null);
    try {
      const [eligibleRes, allocatedRes] = await Promise.all([
        API.get(`/wallet/exams/${exam.id}/eligible-students`),
        API.get(`/wallet/exams/${exam.id}/allocated-students`),
      ]);
      setEligibleStudents(eligibleRes.data?.students || []);
      setAvailableCredits(eligibleRes.data?.availableCredits || 0);
      setAllocatedStudents(allocatedRes.data?.students || []);
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to load student lists" });
    }
  };

  const refreshAllocationLists = async () => {
    if (!allocatingExam) return;
    try {
      const [eligibleRes, allocatedRes] = await Promise.all([
        API.get(`/wallet/exams/${allocatingExam.id}/eligible-students${studentSearch ? `?search=${encodeURIComponent(studentSearch)}` : ""}`),
        API.get(`/wallet/exams/${allocatingExam.id}/allocated-students`),
      ]);
      setEligibleStudents(eligibleRes.data?.students || []);
      setAvailableCredits(eligibleRes.data?.availableCredits || 0);
      setAllocatedStudents(allocatedRes.data?.students || []);
    } catch {
      /* keep previous lists on a transient refresh error */
    }
  };

  const searchEligible = async (q) => {
    setStudentSearch(q);
    if (!allocatingExam) return;
    try {
      const res = await API.get(`/wallet/exams/${allocatingExam.id}/eligible-students?search=${encodeURIComponent(q)}`);
      setEligibleStudents(res.data?.students || []);
    } catch {
      /* keep previous list on a transient search error */
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => setSelectedStudentIds(new Set(eligibleStudents.map((s2) => s2.id)));
  const clearSelection = () => setSelectedStudentIds(new Set());

  const submitAllocation = async () => {
    if (!allocConfirming) {
      setAllocConfirming(true);
      return;
    }
    setAllocBusy(true);
    setMessage(null);
    try {
      const res = await API.post(`/wallet/exams/${allocatingExam.id}/allocate`, {
        studentIds: Array.from(selectedStudentIds),
      });
      setMessage({ tone: "success", text: `Allocated credits to ${res.data.reserved} student(s).` });
      setSelectedStudentIds(new Set());
      setAllocConfirming(false);
      await refreshAllocationLists();
      loadOverview();
      if (tab === "Examinations") {
        const res2 = await API.get("/wallet/exams");
        setExams(res2.data?.examinations || []);
      }
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to allocate credits" });
      setAllocConfirming(false);
    } finally {
      setAllocBusy(false);
    }
  };

  // Gap fix: release exactly one already-allocated student's reserved
  // credit — a two-step confirm (click "Remove" → click "Confirm
  // remove"/"Cancel") matching the same confirm-before-commit pattern
  // the allocate button above uses, since this also moves real money
  // (a reserved credit back to available) and shouldn't fire on a
  // single misclick.
  const removeAllocation = async (student) => {
    if (removeConfirmId !== student.id) {
      setRemoveConfirmId(student.id);
      return;
    }
    setRemoveBusy(true);
    setMessage(null);
    try {
      await API.delete(`/wallet/exams/${allocatingExam.id}/students/${student.id}`);
      setMessage({ tone: "success", text: `Released ${student.name}'s reserved credit back to available.` });
      setRemoveConfirmId(null);
      await refreshAllocationLists();
      loadOverview();
      if (tab === "Examinations") {
        const res2 = await API.get("/wallet/exams");
        setExams(res2.data?.examinations || []);
      }
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to remove this student's allocation" });
    } finally {
      setRemoveBusy(false);
    }
  };

  const shortfall = Math.max(0, selectedStudentIds.size - availableCredits);

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.h1}>💳 Examination Wallet</h1>
          <p style={s.muted}>{overview?.institution?.schoolName || ""}</p>
        </div>
        <button onClick={toggleTheme} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </div>

      {message && <div style={s.banner(message.tone)}>{message.text}</div>}
      {loading && <p style={s.muted}>Loading…</p>}

      {!loading && (
        <>
          <div style={s.statGrid}>
            <div style={s.stat}><div style={s.muted}>Available credits</div><div style={s.statVal}>{overview?.wallet?.available_credits ?? 0}</div></div>
            <div style={s.stat}><div style={s.muted}>Reserved credits</div><div style={s.statVal}>{overview?.wallet?.reserved_credits ?? 0}</div></div>
            <div style={s.stat}><div style={s.muted}>Total purchased</div><div style={s.statVal}>{overview?.wallet?.total_purchased ?? 0}</div></div>
            <div style={s.stat}><div style={s.muted}>Total allocated</div><div style={s.statVal}>{overview?.wallet?.total_allocated ?? 0}</div></div>
            <div style={s.stat}><div style={s.muted}>Registered eligible students</div><div style={s.statVal}>{overview?.registeredEligibleStudents ?? 0}</div></div>
          </div>

          <div style={s.tabs}>
            {TABS.map((t) => (
              <div key={t} className="wlt-tab" style={s.tab(tab === t)} onClick={() => setTab(t)}>{t}</div>
            ))}
          </div>

          {tab === "Overview" && (
            <div style={s.card}>
              <p style={s.muted}>
                Each credit funds one student for one complete main examination — every subject, scheduling,
                submissions, marking, analytics, results and report card. Out of credits? Use "Request Credits" to
                reach Doravo Finance by email or WhatsApp. Your invoices and payment receipts are under "Invoices" and
                "Receipts". Once Finance verifies your payment and deposits credits,
                come back here and allocate them to eligible students under "Examinations".
              </p>
            </div>
          )}

          {tab === "Request Credits" && (
            <div style={s.card}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>How many credits do you want to request? (optional)</label>
              <input style={s.input} type="number" min="1" step="1" value={requestedQuantity}
                onChange={(e) => setRequestedQuantity(e.target.value)}
                onBlur={loadRequestInfo} placeholder="e.g. 50" />

              {requestLoading && <p style={s.muted}>Preparing…</p>}

              {requestInfo && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  {requestInfo.email?.configured ? (
                    <a href={requestInfo.email.mailtoUrl} style={{ textDecoration: "none" }}>
                      <button style={s.btn}>✉️ Request via Email</button>
                    </a>
                  ) : (
                    <button style={s.btnDisabled} disabled title={requestInfo.email?.message}>✉️ Request via Email</button>
                  )}

                  {requestInfo.whatsapp?.configured ? (
                    <a href={requestInfo.whatsapp.waUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <button style={s.btn}>💬 Request via WhatsApp</button>
                    </a>
                  ) : (
                    <button style={s.btnDisabled} disabled title={requestInfo.whatsapp?.message}>💬 Request via WhatsApp</button>
                  )}

                  <button
                    style={s.btnSecondary}
                    onClick={() => navigator.clipboard?.writeText(
                      `${overview?.institution?.schoolName || ""} (tenant: ${overview?.tenant || ""}) — Ref: ${requestInfo.reference}`
                    )}
                  >
                    📋 Copy institution & wallet details
                  </button>
                </div>
              )}
              {(requestInfo?.email?.message || requestInfo?.whatsapp?.message) && (
                <p style={{ ...s.muted, marginTop: 10 }}>
                  {requestInfo?.email?.message} {requestInfo?.whatsapp?.message}
                </p>
              )}
            </div>
          )}

          {tab === "Invoices" && (
            <div style={s.card}>
              <p style={{ ...s.muted, marginTop: 0 }}>
                Invoices Doravo Finance has raised for your institution. Quote the invoice number as your payment
                reference; a receipt appears under "Receipts" once Finance confirms the payment.
              </p>
              <table style={s.table}>
                <thead>
                  <tr><th style={s.th}>Invoice</th><th style={s.th}>Issued</th><th style={s.th}>Due</th><th style={s.th}>Credits</th><th style={s.th}>Total</th><th style={s.th}>Status</th><th style={s.th}></th></tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="wlt-row">
                      <td style={{ ...s.td, fontWeight: 700 }}>{inv.invoice_number}</td>
                      <td style={s.td}>{fmtDay(inv.issue_date)}</td>
                      <td style={s.td}>{inv.due_date ? fmtDay(inv.due_date) : "On receipt"}</td>
                      <td style={s.td}>{inv.credit_quantity}</td>
                      <td style={s.td}>{fmtMoney(inv.currency, inv.total_amount)}</td>
                      <td style={s.td}><span style={{ ...s.badge, ...statusTone(inv.status) }}>{String(inv.status).toUpperCase()}</span></td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button style={{ ...s.btnSecondary, padding: "6px 10px", fontSize: 12 }}
                            disabled={downloadingKey === `inv-${inv.id}`}
                            onClick={() => downloadPdf(`inv-${inv.id}`, `/wallet/invoices/${inv.id}/pdf`, `${inv.invoice_number}.pdf`)}>
                            {downloadingKey === `inv-${inv.id}` ? "Preparing…" : "⬇ Invoice"}
                          </button>
                          {inv.receipt_id && (
                            <button style={{ ...s.btnSecondary, padding: "6px 10px", fontSize: 12 }}
                              disabled={downloadingKey === `rct-${inv.receipt_id}`}
                              onClick={() => downloadPdf(`rct-${inv.receipt_id}`, `/wallet/receipts/${inv.receipt_id}/pdf`, "receipt.pdf")}>
                              {downloadingKey === `rct-${inv.receipt_id}` ? "Preparing…" : "⬇ Receipt"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!invoices.length && <tr><td style={s.td} colSpan={7}><span style={s.muted}>No invoices yet.</span></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Receipts" && (
            <div style={s.card}>
              <p style={{ ...s.muted, marginTop: 0 }}>
                A receipt is issued for every payment Doravo Finance confirms. Credits are added to your wallet
                separately once issued.
              </p>
              <table style={s.table}>
                <thead>
                  <tr><th style={s.th}>Receipt</th><th style={s.th}>Date</th><th style={s.th}>Invoice</th><th style={s.th}>Method</th><th style={s.th}>Reference</th><th style={s.th}>Amount</th><th style={s.th}></th></tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="wlt-row">
                      <td style={{ ...s.td, fontWeight: 700 }}>{r.receipt_number}</td>
                      <td style={s.td}>{fmtDay(r.issued_at)}</td>
                      <td style={s.td}>{r.invoice_number || "—"}</td>
                      <td style={s.td}>{r.payment_method || "—"}</td>
                      <td style={s.td}>{r.payment_reference}</td>
                      <td style={s.td}>{fmtMoney(r.currency, r.amount)}</td>
                      <td style={s.td}>
                        <button style={{ ...s.btnSecondary, padding: "6px 10px", fontSize: 12 }}
                          disabled={downloadingKey === `rct-${r.id}`}
                          onClick={() => downloadPdf(`rct-${r.id}`, `/wallet/receipts/${r.id}/pdf`, `${r.receipt_number}.pdf`)}>
                          {downloadingKey === `rct-${r.id}` ? "Preparing…" : "⬇ Download"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!receipts.length && <tr><td style={s.td} colSpan={7}><span style={s.muted}>No receipts yet.</span></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Examinations" && !allocatingExam && (
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr><th style={s.th}>Examination</th><th style={s.th}>Status</th><th style={s.th}>Reserved</th><th style={s.th}>Consumed</th><th style={s.th}></th></tr>
                </thead>
                <tbody>
                  {exams.map((ex) => (
                    <tr key={ex.id}>
                      <td style={s.td}>{ex.name}</td>
                      <td style={s.td}><span style={s.badge}>{ex.status}</span></td>
                      <td style={s.td}>{ex.reserved_count}</td>
                      <td style={s.td}>{ex.consumed_count}</td>
                      <td style={s.td}>
                        {ex.status !== "cancelled" && (
                          <button style={s.btnSecondary} onClick={() => openAllocation(ex)}>Allocate credits</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!exams.length && <tr><td style={s.td} colSpan={5}><span style={s.muted}>No examinations yet.</span></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Examinations" && allocatingExam && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Allocate credits — {allocatingExam.name}</h3>
                <button style={s.btnSecondary} onClick={() => setAllocatingExam(null)}>← Back</button>
              </div>

              <p style={s.muted}>{availableCredits} credit(s) available · {selectedStudentIds.size} selected{shortfall > 0 ? ` · short by ${shortfall}` : ""}</p>

              <input style={s.input} placeholder="Search by name or admission number…" value={studentSearch}
                onChange={(e) => searchEligible(e.target.value)} />

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button style={s.btnSecondary} onClick={selectAllVisible}>Select all shown</button>
                <button style={s.btnSecondary} onClick={clearSelection}>Clear selection</button>
              </div>

              <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}></th><th style={s.th}>Name</th><th style={s.th}>Admission No.</th><th style={s.th}>Class</th></tr></thead>
                  <tbody>
                    {eligibleStudents.map((st) => (
                      <tr key={st.id} className="wlt-checkrow" style={{ cursor: "pointer" }} onClick={() => toggleStudent(st.id)}>
                        <td style={s.td}><input type="checkbox" readOnly checked={selectedStudentIds.has(st.id)} /></td>
                        <td style={s.td}>{st.name}</td>
                        <td style={s.td}>{st.admissionNo}</td>
                        <td style={s.td}>{st.studentClass}</td>
                      </tr>
                    ))}
                    {!eligibleStudents.length && <tr><td style={s.td} colSpan={4}><span style={s.muted}>No eligible students found.</span></td></tr>}
                  </tbody>
                </table>
              </div>

              {allocConfirming && (
                <div style={s.banner(shortfall > 0 ? "error" : "warning")}>
                  {shortfall > 0
                    ? `Cannot allocate — need ${selectedStudentIds.size} credits, only ${availableCredits} available.`
                    : `Confirm: allocate 1 credit each to ${selectedStudentIds.size} student(s) for "${allocatingExam.name}"? This reserves ${selectedStudentIds.size} credit(s) and cannot be undone except by Doravo Finance.`}
                </div>
              )}

              <button
                style={selectedStudentIds.size === 0 ? s.btnDisabled : s.btn}
                disabled={selectedStudentIds.size === 0 || allocBusy || (allocConfirming && shortfall > 0)}
                onClick={submitAllocation}
              >
                {allocBusy ? "Allocating…" : allocConfirming ? "Confirm allocation" : "Review allocation"}
              </button>

              {/* ── MANAGE ALLOCATIONS (gap fix) ──
                  Everyone currently holding a reserved (not yet
                  consumed) credit on this exam, with a way to release
                  a single one back to available — e.g. the student
                  withdrew or transferred. Consumed credits (the exam
                  already ran for that student) don't appear here; only
                  Doravo Finance can reverse those. */}
              <h4 style={{ margin: "22px 0 8px" }}>Currently allocated ({allocatedStudents.length})</h4>
              <p style={{ ...s.muted, marginTop: -4, marginBottom: 10 }}>
                These students each hold one reserved credit on this examination. Removing one releases that credit
                back to your available balance.
              </p>
              <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Name</th><th style={s.th}>Admission No.</th><th style={s.th}>Class</th><th style={s.th}>Allocated</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {allocatedStudents.map((st) => (
                      <tr key={st.id}>
                        <td style={s.td}>{st.name}</td>
                        <td style={s.td}>{st.admissionNo}</td>
                        <td style={s.td}>{st.studentClass}</td>
                        <td style={s.td}>{st.allocated_at ? new Date(st.allocated_at).toLocaleDateString() : "—"}</td>
                        <td style={s.td}>
                          {removeConfirmId === st.id ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                style={{ ...s.btn, padding: "6px 10px", fontSize: 12, background: "var(--destructive)" }}
                                disabled={removeBusy}
                                onClick={() => removeAllocation(st)}
                              >
                                {removeBusy ? "Removing…" : "Confirm remove"}
                              </button>
                              <button
                                style={{ ...s.btnSecondary, padding: "6px 10px", fontSize: 12 }}
                                disabled={removeBusy}
                                onClick={() => setRemoveConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              style={{ ...s.btnSecondary, padding: "6px 10px", fontSize: 12 }}
                              onClick={() => removeAllocation(st)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!allocatedStudents.length && <tr><td style={s.td} colSpan={5}><span style={s.muted}>No students currently allocated.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "Ledger" && (
            <div style={s.card}>
              <table style={s.table}>
                <thead><tr><th style={s.th}>Type</th><th style={s.th}>Δ</th><th style={s.th}>Available after</th><th style={s.th}>Reserved after</th><th style={s.th}>When</th></tr></thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id}>
                      <td style={s.td}>{l.entry_type}</td>
                      <td style={s.td}>{l.credit_delta > 0 ? `+${l.credit_delta}` : l.credit_delta}</td>
                      <td style={s.td}>{l.available_after}</td>
                      <td style={s.td}>{l.reserved_after}</td>
                      <td style={s.td}>{new Date(l.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!ledger.length && <tr><td style={s.td} colSpan={5}><span style={s.muted}>No transactions yet.</span></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
