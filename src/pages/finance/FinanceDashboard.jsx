import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import { useTheme } from "../../context/ThemeContext";

/* =========================================================================
   DORAVO FINANCE DASHBOARD
   ─────────────────────────────────────────────────────────────────────
   Protected page for role === "finance" only (see App.jsx's route for
   the ProtectedRoute allowedRoles gate — this page assumes it, it
   doesn't re-check role itself, same as every other admin page here).

   Talks to backend/routes/finance.js exclusively — every request goes
   through a :tenantKey in the URL, because Finance (unlike every
   other role in this app) isn't scoped to one institution; it picks
   one from the list on the left and acts on that institution's
   wallet specifically. See finance.controller.js's header comment
   for why that's the one deliberate exception to "always use the
   logged-in user's own tenant" in this codebase.

   Reuses the same CSS-variable design-token system as
   AdminPasswordReset.jsx / Users.jsx (`injectDesignTokens`, toggled
   by ThemeContext) so this looks like part of the same product
   instead of a bolted-on tool.
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
    .fin-row:hover { background: var(--card-elevated) !important; }
    .fin-tab:hover { filter: brightness(0.97); }
  `;
  document.head.appendChild(el);
};

const s = {
  page: { fontFamily: "Inter, sans-serif", background: "var(--bg)", color: "var(--text)", minHeight: "100vh", display: "flex" },
  sidebar: { width: 300, borderRight: "1px solid var(--border)", background: "var(--card)", padding: 20, overflowY: "auto" },
  main: { flex: 1, padding: 28, overflowY: "auto" },
  h1: { fontSize: 20, fontWeight: 800, margin: 0 },
  muted: { color: "var(--text-muted)", fontSize: 13 },
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, boxShadow: "var(--shadow-sm)", marginBottom: 16 },
  instRow: (active) => ({
    padding: "10px 12px", borderRadius: "var(--radius-sm)", cursor: "pointer", marginBottom: 6,
    background: active ? "var(--primary-tint)" : "transparent",
    border: active ? "1px solid var(--primary)" : "1px solid transparent",
  }),
  tabs: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  tab: (active) => ({
    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "var(--primary)" : "var(--card-elevated)",
    color: active ? "#fff" : "var(--text-secondary)",
    border: "1px solid var(--border)",
  }),
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 },
  stat: { background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 14 },
  statVal: { fontSize: 22, fontWeight: 800 },
  input: { width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" },
  btn: { padding: "9px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 },
  btnSmall: { padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--card-elevated)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: 12, marginRight: 6 },
  pill: (status) => ({
    display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    background: status === "paid" ? "var(--success-tint)" : status === "void" ? "var(--destructive-tint)" : "var(--warning-tint)",
    color: status === "paid" ? "var(--success)" : status === "void" ? "var(--destructive)" : "var(--warning)",
  }),
  btnDanger: { padding: "9px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--destructive)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 6px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontWeight: 600 },
  td: { padding: "8px 6px", borderBottom: "1px solid var(--border)" },
  banner: (tone) => ({
    padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 14, fontSize: 13,
    background: tone === "error" ? "var(--destructive-tint)" : "var(--success-tint)",
    color: tone === "error" ? "var(--destructive)" : "var(--success)",
  }),
};

const TABS = ["Overview", "Invoices", "Verify Payment", "Receipts", "Issue Credits", "Reverse Credits", "Ledger", "Audit Log"];

const EMPTY_INVOICE_FORM = { creditQuantity: "", unitPrice: "", currency: "KES", taxRate: "", dueDate: "", notes: "" };
const EMPTY_PAY_FORM = { amount: "", currency: "KES", method: "", paymentReference: "", notes: "", invoiceId: "" };
const money = (currency, n) => `${currency} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinanceDashboard() {
  injectDesignTokens();
  const { theme, toggleTheme } = useTheme();

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [selected, setSelected] = useState(null); // tenantKey
  const [wallet, setWallet] = useState(null);
  const [institutionProfile, setInstitutionProfile] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [ledger, setLedger] = useState([]);
  const [payments, setPayments] = useState([]);
  const [issuances, setIssuances] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [message, setMessage] = useState(null); // { tone, text }
  const [busy, setBusy] = useState(false);

  // ---- form state ----
  const [payForm, setPayForm] = useState(EMPTY_PAY_FORM);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [confirmTarget, setConfirmTarget] = useState(null); // invoice being marked paid from the Invoices tab
  const [confirmForm, setConfirmForm] = useState({ method: "", paymentReference: "", notes: "" });
  const [issueForm, setIssueForm] = useState({ paymentId: "", creditQuantity: "", unitPrice: "", currency: "KES", notes: "" });
  const [issueConfirming, setIssueConfirming] = useState(false);
  const [reverseForm, setReverseForm] = useState({ issuanceId: "", quantity: "", reason: "" });

  useEffect(() => {
    (async () => {
      try {
        setLoadingInstitutions(true);
        const res = await API.get("/finance/institutions");
        setInstitutions(res.data?.institutions || []);
      } catch (err) {
        setMessage({ tone: "error", text: err.response?.data?.message || "Failed to load institutions" });
      } finally {
        setLoadingInstitutions(false);
      }
    })();
  }, []);

  const loadWallet = async (tenantKey) => {
    try {
      const res = await API.get(`/finance/institutions/${tenantKey}/wallet`);
      setWallet(res.data?.wallet || null);
      setInstitutionProfile(res.data?.institution || null);
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to load wallet" });
    }
  };

  const loadTabData = async (tenantKey, activeTab) => {
    try {
      if (activeTab === "Ledger") {
        const res = await API.get(`/finance/institutions/${tenantKey}/ledger`);
        setLedger(res.data?.ledger || []);
      } else if (activeTab === "Invoices") {
        const res = await API.get(`/finance/institutions/${tenantKey}/invoices`);
        setInvoices(res.data?.invoices || []);
      } else if (activeTab === "Receipts") {
        const res = await API.get(`/finance/institutions/${tenantKey}/receipts`);
        setReceipts(res.data?.receipts || []);
      } else if (activeTab === "Verify Payment" || activeTab === "Issue Credits") {
        const res = await API.get(`/finance/institutions/${tenantKey}/payments`);
        setPayments(res.data?.payments || []);
        if (activeTab === "Verify Payment") {
          const inv = await API.get(`/finance/institutions/${tenantKey}/invoices`);
          setInvoices(inv.data?.invoices || []);
        }
      } else if (activeTab === "Reverse Credits") {
        const res = await API.get(`/finance/institutions/${tenantKey}/issuances`);
        setIssuances(res.data?.issuances || []);
      } else if (activeTab === "Audit Log") {
        const res = await API.get(`/finance/institutions/${tenantKey}/audit-log`);
        setAuditLog(res.data?.auditLog || []);
      }
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to load data" });
    }
  };

  const selectInstitution = async (tenantKey) => {
    setSelected(tenantKey);
    setMessage(null);
    setTab("Overview");
    setWallet(null);
    setConfirmTarget(null);
    await loadWallet(tenantKey);
  };

  useEffect(() => {
    if (selected) loadTabData(selected, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selected]);

  const refreshWallet = () => selected && loadWallet(selected);

  /* ---- PDF downloads ----
     Documents are rendered by the backend and arrive as a PDF blob; we read
     the filename from Content-Disposition (exposed via CORS) and trigger the
     browser download ourselves so it happens automatically. */
  const downloadPdf = async (path, fallbackName) => {
    const res = await API.get(path, { responseType: "blob" });
    const disposition = res.headers?.["content-disposition"] || "";
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const filename = match ? match[1] : fallbackName;
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  // Used by the automatic downloads: the document already exists server-side,
  // so a failed download must not look like a failed creation.
  const autoDownload = async (path, fallbackName, label) => {
    try {
      await downloadPdf(path, fallbackName);
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: `${label} was created, but the automatic download failed — use its Download button.` });
      return false;
    }
  };

  const manualDownload = async (path, fallbackName) => {
    try {
      await downloadPdf(path, fallbackName);
    } catch (err) {
      setMessage({ tone: "error", text: "Could not download the document" });
    }
  };

  const invoicePath = (inv) => `/finance/institutions/${selected}/invoices/${inv.id}/pdf`;
  const receiptPath = (r) => `/finance/institutions/${selected}/receipts/${r.id}/pdf`;

  /* ---- invoices ---- */
  const invoicePreviewTotal = useMemo(() => {
    const q = Number(invoiceForm.creditQuantity), p = Number(invoiceForm.unitPrice), t = Number(invoiceForm.taxRate || 0);
    if (!(q > 0) || !(p > 0)) return null;
    return q * p * (1 + (Number.isFinite(t) ? t : 0) / 100);
  }, [invoiceForm.creditQuantity, invoiceForm.unitPrice, invoiceForm.taxRate]);

  const submitCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await API.post(`/finance/institutions/${selected}/invoices`, {
        creditQuantity: Number(invoiceForm.creditQuantity),
        unitPrice: Number(invoiceForm.unitPrice),
        currency: invoiceForm.currency,
        taxRate: invoiceForm.taxRate === "" ? 0 : Number(invoiceForm.taxRate),
        dueDate: invoiceForm.dueDate || null,
        notes: invoiceForm.notes || null,
      });
      const inv = res.data.invoice;
      setInvoiceForm(EMPTY_INVOICE_FORM);
      loadTabData(selected, "Invoices");
      const ok = await autoDownload(res.data.pdfPath, `${inv.invoice_number}.pdf`, `Invoice ${inv.invoice_number}`);
      if (ok) setMessage({ tone: "success", text: `Invoice ${inv.invoice_number} created and downloaded.` });
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to create invoice" });
    } finally {
      setBusy(false);
    }
  };

  const submitVoidInvoice = async (inv) => {
    const reason = window.prompt(`Void invoice ${inv.invoice_number}? Enter a reason (required):`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await API.post(`/finance/institutions/${selected}/invoices/${inv.id}/void`, { reason: reason.trim() });
      setMessage({ tone: "success", text: `Invoice ${inv.invoice_number} voided.` });
      loadTabData(selected, "Invoices");
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to void invoice" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- payment confirmation (+ receipt) ----
     One backend call records the payment, issues the receipt and, when an
     invoice is attached, marks it paid. The receipt is then downloaded. */
  const confirmPayment = async (body, refreshTab) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await API.post(`/finance/institutions/${selected}/payments/verify`, body);
      const { payment, receipt, invoice } = res.data;
      loadTabData(selected, refreshTab);
      const ok = await autoDownload(receipt.pdfPath, `${receipt.receipt_number}.pdf`, `Receipt ${receipt.receipt_number}`);
      if (ok) {
        setMessage({
          tone: "success",
          text: invoice
            ? `Payment ${payment.payment_reference} confirmed — invoice ${invoice.invoice_number} marked paid, receipt ${receipt.receipt_number} downloaded.`
            : `Payment ${payment.payment_reference} confirmed — receipt ${receipt.receipt_number} downloaded.`,
        });
      }
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to verify payment" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitVerifyPayment = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const ok = await confirmPayment({
      invoiceId: payForm.invoiceId ? Number(payForm.invoiceId) : null,
      amount: payForm.amount === "" ? undefined : Number(payForm.amount),
      currency: payForm.currency,
      method: payForm.method || null,
      paymentReference: payForm.paymentReference || null,
      notes: payForm.notes || null,
    }, "Verify Payment");
    if (ok) setPayForm(EMPTY_PAY_FORM);
  };

  const submitConfirmInvoicePayment = async (e) => {
    e.preventDefault();
    if (!selected || !confirmTarget) return;
    const ok = await confirmPayment({
      invoiceId: confirmTarget.id,
      method: confirmForm.method || null,
      paymentReference: confirmForm.paymentReference || null,
      notes: confirmForm.notes || null,
    }, "Invoices");
    if (ok) {
      setConfirmTarget(null);
      setConfirmForm({ method: "", paymentReference: "", notes: "" });
    }
  };

  const selectInvoiceForPayment = (invoiceId) => {
    const inv = invoices.find((i) => String(i.id) === String(invoiceId));
    setPayForm(inv
      ? { ...payForm, invoiceId, amount: String(inv.total_amount), currency: inv.currency }
      : { ...payForm, invoiceId: "" });
  };

  const submitIssueCredits = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!issueConfirming) {
      setIssueConfirming(true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await API.post(`/finance/institutions/${selected}/credits/issue`, {
        paymentId: issueForm.paymentId ? Number(issueForm.paymentId) : null,
        creditQuantity: Number(issueForm.creditQuantity),
        unitPrice: issueForm.unitPrice ? Number(issueForm.unitPrice) : null,
        currency: issueForm.currency,
        notes: issueForm.notes || null,
        confirm: true,
      });
      setMessage({ tone: "success", text: `Issued ${res.data.receipt.credit_quantity} credits — reference ${res.data.receipt.issuance_reference}.` });
      setIssueForm({ paymentId: "", creditQuantity: "", unitPrice: "", currency: "KES", notes: "" });
      setIssueConfirming(false);
      refreshWallet();
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to issue credits" });
    } finally {
      setBusy(false);
    }
  };

  const submitReverseCredits = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!window.confirm(`Reverse ${reverseForm.quantity} credit(s) from issuance #${reverseForm.issuanceId}? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await API.post(`/finance/institutions/${selected}/credits/reverse`, {
        issuanceId: Number(reverseForm.issuanceId),
        quantity: Number(reverseForm.quantity),
        reason: reverseForm.reason,
      });
      setMessage({ tone: "success", text: "Credits reversed." });
      setReverseForm({ issuanceId: "", quantity: "", reason: "" });
      refreshWallet();
      loadTabData(selected, "Reverse Credits");
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to reverse credits" });
    } finally {
      setBusy(false);
    }
  };

  const selectedRow = useMemo(() => institutions.find((i) => i.tenantKey === selected), [institutions, selected]);

  return (
    <div style={s.page}>
      {/* INSTITUTIONS SIDEBAR */}
      <div style={s.sidebar}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 style={s.h1}>💳 Doravo Finance</h1>
          <button onClick={toggleTheme} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
            {theme === "dark" ? "☀" : "🌙"}
          </button>
        </div>
        <p style={s.muted}>Institutions</p>
        {loadingInstitutions && <p style={s.muted}>Loading…</p>}
        {institutions.map((inst) => (
          <div
            key={inst.tenantKey}
            className="fin-row"
            style={s.instRow(selected === inst.tenantKey)}
            onClick={() => selectInstitution(inst.tenantKey)}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{inst.institutionName}</div>
            {inst.error ? (
              <div style={{ fontSize: 12, color: "var(--destructive)" }}>{inst.error}</div>
            ) : (
              <div style={s.muted}>{inst.availableCredits} available · {inst.reservedCredits} reserved</div>
            )}
          </div>
        ))}
      </div>

      {/* MAIN PANEL */}
      <div style={s.main}>
        {!selected && <p style={s.muted}>Select an institution to view its wallet.</p>}

        {selected && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{institutionProfile?.schoolName || selectedRow?.institutionName || selected}</h2>
              <p style={s.muted}>{institutionProfile?.email || ""} {institutionProfile?.phone ? `· ${institutionProfile.phone}` : ""}</p>
            </div>

            {message && <div style={s.banner(message.tone)}>{message.text}</div>}

            <div style={s.statGrid}>
              <div style={s.stat}><div style={s.muted}>Available</div><div style={s.statVal}>{wallet?.available_credits ?? "—"}</div></div>
              <div style={s.stat}><div style={s.muted}>Reserved</div><div style={s.statVal}>{wallet?.reserved_credits ?? "—"}</div></div>
              <div style={s.stat}><div style={s.muted}>Total purchased</div><div style={s.statVal}>{wallet?.total_purchased ?? "—"}</div></div>
              <div style={s.stat}><div style={s.muted}>Total allocated</div><div style={s.statVal}>{wallet?.total_allocated ?? "—"}</div></div>
            </div>

            <div style={s.tabs}>
              {TABS.map((t) => (
                <div key={t} className="fin-tab" style={s.tab(tab === t)} onClick={() => { setTab(t); setIssueConfirming(false); }}>
                  {t}
                </div>
              ))}
            </div>

            {tab === "Overview" && (
              <div style={s.card}>
                <p style={s.muted}>
                  Create an invoice under "Invoices" (the PDF downloads automatically). When the institution pays, confirm the payment
                  — from the invoice or under "Verify Payment" — and its receipt is generated and downloaded automatically.
                  "Verify Payment" records a manually-confirmed institutional payment, then "Issue Credits"
                  to deposit credits into this wallet against it. "Reverse Credits" corrects an unused, already-delivered
                  issuance with a mandatory reason — it never touches credits already reserved for a funded examination.
                </p>
              </div>
            )}

            {tab === "Invoices" && (
              <div style={s.card}>
                <h3 style={{ marginTop: 0, fontSize: 14 }}>New invoice</h3>
                <p style={s.muted}>The PDF downloads automatically as soon as the invoice is created.</p>
                <form onSubmit={submitCreateInvoice}>
                  <label style={s.label}>Credit quantity</label>
                  <input style={s.input} type="number" min="1" step="1" required
                    value={invoiceForm.creditQuantity} onChange={(e) => setInvoiceForm({ ...invoiceForm, creditQuantity: e.target.value })} />
                  <label style={s.label}>Unit price</label>
                  <input style={s.input} type="number" min="0.01" step="0.01" required
                    value={invoiceForm.unitPrice} onChange={(e) => setInvoiceForm({ ...invoiceForm, unitPrice: e.target.value })} />
                  <label style={s.label}>Currency</label>
                  <input style={s.input} maxLength={3} value={invoiceForm.currency} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value.toUpperCase() })} />
                  <label style={s.label}>Tax rate % (optional)</label>
                  <input style={s.input} type="number" min="0" max="100" step="0.01"
                    value={invoiceForm.taxRate} onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRate: e.target.value })} />
                  <label style={s.label}>Due date (optional)</label>
                  <input style={s.input} type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                  <label style={s.label}>Notes (optional, printed on the invoice)</label>
                  <input style={s.input} maxLength={500} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
                  {invoicePreviewTotal !== null && (
                    <p style={{ ...s.muted, marginTop: 0 }}>Invoice total: <strong>{money(invoiceForm.currency || "KES", invoicePreviewTotal)}</strong></p>
                  )}
                  <button style={s.btn} disabled={busy} type="submit">{busy ? "Creating…" : "Create invoice & download"}</button>
                </form>

                {confirmTarget && (
                  <form onSubmit={submitConfirmInvoicePayment} style={{ ...s.stat, marginTop: 24 }}>
                    <h3 style={{ marginTop: 0, fontSize: 14 }}>
                      Confirm payment for {confirmTarget.invoice_number} — {money(confirmTarget.currency, confirmTarget.total_amount)}
                    </h3>
                    <p style={s.muted}>Only confirm once you have reconciled the money in the bank / M-Pesa statement. This marks the invoice paid and downloads the receipt.</p>
                    <label style={s.label}>Method (bank transfer, M-Pesa, etc.)</label>
                    <input style={s.input} value={confirmForm.method} onChange={(e) => setConfirmForm({ ...confirmForm, method: e.target.value })} />
                    <label style={s.label}>Payment reference (bank / M-Pesa code — leave blank to auto-generate)</label>
                    <input style={s.input} value={confirmForm.paymentReference} onChange={(e) => setConfirmForm({ ...confirmForm, paymentReference: e.target.value })} />
                    <label style={s.label}>Notes</label>
                    <input style={s.input} value={confirmForm.notes} onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })} />
                    <button style={s.btn} disabled={busy} type="submit">{busy ? "Confirming…" : "Confirm payment & download receipt"}</button>{" "}
                    <button style={s.btnSmall} type="button" onClick={() => setConfirmTarget(null)}>Cancel</button>
                  </form>
                )}

                <h3 style={{ marginTop: 24, fontSize: 14 }}>Invoices</h3>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Number</th><th style={s.th}>Credits</th><th style={s.th}>Total</th><th style={s.th}>Status</th><th style={s.th}>Due</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={s.td}>{inv.invoice_number}</td>
                        <td style={s.td}>{inv.credit_quantity}</td>
                        <td style={s.td}>{money(inv.currency, inv.total_amount)}</td>
                        <td style={s.td}><span style={s.pill(inv.status)}>{inv.status}</span></td>
                        <td style={s.td}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}</td>
                        <td style={s.td}>
                          <button style={s.btnSmall} type="button" onClick={() => manualDownload(invoicePath(inv), `${inv.invoice_number}.pdf`)}>Download PDF</button>
                          {inv.status === "issued" && (
                            <>
                              <button style={s.btnSmall} type="button" onClick={() => { setConfirmTarget(inv); setConfirmForm({ method: "", paymentReference: "", notes: "" }); }}>Confirm payment</button>
                              <button style={s.btnSmall} type="button" disabled={busy} onClick={() => submitVoidInvoice(inv)}>Void</button>
                            </>
                          )}
                          {inv.status === "paid" && inv.receipt_id && (
                            <button style={s.btnSmall} type="button" onClick={() => manualDownload(receiptPath({ id: inv.receipt_id }), "receipt.pdf")}>Receipt</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!invoices.length && <tr><td style={s.td} colSpan={6}><span style={s.muted}>No invoices yet.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "Receipts" && (
              <div style={s.card}>
                <p style={s.muted}>A receipt is generated automatically each time a payment is confirmed. Payments confirmed before receipts existed can still get one from the Verify Payment tab.</p>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Receipt</th><th style={s.th}>Payment ref</th><th style={s.th}>Invoice</th><th style={s.th}>Amount</th><th style={s.th}>Date</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id}>
                        <td style={s.td}>{r.receipt_number}</td>
                        <td style={s.td}>{r.payment_reference}</td>
                        <td style={s.td}>{r.invoice_number || "—"}</td>
                        <td style={s.td}>{money(r.currency, r.amount)}</td>
                        <td style={s.td}>{new Date(r.issued_at).toLocaleDateString()}</td>
                        <td style={s.td}><button style={s.btnSmall} type="button" onClick={() => manualDownload(receiptPath(r), `${r.receipt_number}.pdf`)}>Download PDF</button></td>
                      </tr>
                    ))}
                    {!receipts.length && <tr><td style={s.td} colSpan={6}><span style={s.muted}>No receipts yet.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "Verify Payment" && (
              <div style={s.card}>
                <form onSubmit={submitVerifyPayment}>
                  <label style={s.label}>Settles invoice (optional)</label>
                  <select style={s.input} value={payForm.invoiceId} onChange={(e) => selectInvoiceForPayment(e.target.value)}>
                    <option value="">— payment not tied to an invoice —</option>
                    {invoices.filter((i) => i.status === "issued").map((i) => (
                      <option key={i.id} value={i.id}>{i.invoice_number} · {money(i.currency, i.total_amount)}</option>
                    ))}
                  </select>
                  <label style={s.label}>Amount{payForm.invoiceId ? " (defaults to the invoice total)" : ""}</label>
                  <input style={s.input} type="number" min="0.01" step="0.01" required={!payForm.invoiceId}
                    value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                  <label style={s.label}>Currency</label>
                  <input style={s.input} value={payForm.currency} onChange={(e) => setPayForm({ ...payForm, currency: e.target.value })} />
                  <label style={s.label}>Method (bank transfer, M-Pesa, etc.)</label>
                  <input style={s.input} value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} />
                  <label style={s.label}>Payment reference (leave blank to auto-generate)</label>
                  <input style={s.input} value={payForm.paymentReference} onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })} />
                  <label style={s.label}>Notes</label>
                  <input style={s.input} value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                  <button style={s.btn} disabled={busy} type="submit">{busy ? "Verifying…" : "Verify payment & download receipt"}</button>
                </form>

                <h3 style={{ marginTop: 24, fontSize: 14 }}>Verified payments</h3>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Reference</th><th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Verified</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td style={s.td}>{p.payment_reference}</td>
                        <td style={s.td}>{p.currency} {Number(p.amount).toLocaleString()}</td>
                        <td style={s.td}>{p.method || "—"}</td>
                        <td style={s.td}>{new Date(p.verified_at).toLocaleString()}</td>
                        <td style={s.td}>
                          <button style={s.btnSmall} type="button"
                            onClick={() => manualDownload(`/finance/institutions/${selected}/payments/${p.id}/receipt`, `receipt-${p.payment_reference}.pdf`)}>
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "Issue Credits" && (
              <div style={s.card}>
                <form onSubmit={submitIssueCredits}>
                  <label style={s.label}>Linked payment (optional)</label>
                  <select style={s.input} value={issueForm.paymentId} onChange={(e) => setIssueForm({ ...issueForm, paymentId: e.target.value })}>
                    <option value="">— none —</option>
                    {payments.map((p) => (
                      <option key={p.id} value={p.id}>{p.payment_reference} · {p.currency} {Number(p.amount).toLocaleString()}</option>
                    ))}
                  </select>
                  <label style={s.label}>Credit quantity</label>
                  <input style={s.input} type="number" min="1" step="1" required
                    value={issueForm.creditQuantity} onChange={(e) => setIssueForm({ ...issueForm, creditQuantity: e.target.value })} />
                  <label style={s.label}>Unit price (wholesale credit price snapshot)</label>
                  <input style={s.input} type="number" min="0" step="0.01"
                    value={issueForm.unitPrice} onChange={(e) => setIssueForm({ ...issueForm, unitPrice: e.target.value })} />
                  <label style={s.label}>Notes</label>
                  <input style={s.input} value={issueForm.notes} onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })} />
                  {issueConfirming && (
                    <div style={s.banner("error")}>
                      Confirm: issue {issueForm.creditQuantity || 0} credit(s) to this institution? This cannot be undone except by a reversal.
                    </div>
                  )}
                  <button style={s.btn} disabled={busy} type="submit">
                    {busy ? "Issuing…" : issueConfirming ? "Confirm & issue" : "Review & issue"}
                  </button>
                </form>
              </div>
            )}

            {tab === "Reverse Credits" && (
              <div style={s.card}>
                <form onSubmit={submitReverseCredits}>
                  <label style={s.label}>Issuance</label>
                  <select style={s.input} required value={reverseForm.issuanceId} onChange={(e) => setReverseForm({ ...reverseForm, issuanceId: e.target.value })}>
                    <option value="">— select —</option>
                    {issuances.filter((i) => i.state === "delivered" || i.state === "reconciled").map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.issuance_reference} · {i.credit_quantity - i.reversed_quantity} reversible of {i.credit_quantity}
                      </option>
                    ))}
                  </select>
                  <label style={s.label}>Quantity to reverse</label>
                  <input style={s.input} type="number" min="1" step="1" required
                    value={reverseForm.quantity} onChange={(e) => setReverseForm({ ...reverseForm, quantity: e.target.value })} />
                  <label style={s.label}>Reason (required)</label>
                  <input style={s.input} required value={reverseForm.reason} onChange={(e) => setReverseForm({ ...reverseForm, reason: e.target.value })} />
                  <button style={s.btnDanger} disabled={busy} type="submit">{busy ? "Reversing…" : "Reverse credits"}</button>
                </form>

                <h3 style={{ marginTop: 24, fontSize: 14 }}>Issuances</h3>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Reference</th><th style={s.th}>Qty</th><th style={s.th}>Reversed</th><th style={s.th}>State</th></tr></thead>
                  <tbody>
                    {issuances.map((i) => (
                      <tr key={i.id}>
                        <td style={s.td}>{i.issuance_reference}</td>
                        <td style={s.td}>{i.credit_quantity}</td>
                        <td style={s.td}>{i.reversed_quantity}</td>
                        <td style={s.td}>{i.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  </tbody>
                </table>
              </div>
            )}

            {tab === "Audit Log" && (
              <div style={s.card}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Action</th><th style={s.th}>Actor</th><th style={s.th}>When</th></tr></thead>
                  <tbody>
                    {auditLog.map((a) => (
                      <tr key={a.id}>
                        <td style={s.td}>{a.action}</td>
                        <td style={s.td}>{a.actor_role || "—"} #{a.actor_id ?? "—"}</td>
                        <td style={s.td}>{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
