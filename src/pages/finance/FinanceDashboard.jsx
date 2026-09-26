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

const TABS = ["Overview", "Verify Payment", "Issue Credits", "Reverse Credits", "Ledger", "Audit Log"];

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
  const [payForm, setPayForm] = useState({ amount: "", currency: "KES", method: "", paymentReference: "", notes: "" });
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
      } else if (activeTab === "Verify Payment" || activeTab === "Issue Credits") {
        const res = await API.get(`/finance/institutions/${tenantKey}/payments`);
        setPayments(res.data?.payments || []);
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
    await loadWallet(tenantKey);
  };

  useEffect(() => {
    if (selected) loadTabData(selected, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selected]);

  const refreshWallet = () => selected && loadWallet(selected);

  const submitVerifyPayment = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await API.post(`/finance/institutions/${selected}/payments/verify`, {
        amount: Number(payForm.amount),
        currency: payForm.currency,
        method: payForm.method || null,
        paymentReference: payForm.paymentReference || null,
        notes: payForm.notes || null,
      });
      setMessage({ tone: "success", text: `Payment ${res.data.payment.payment_reference} verified.` });
      setPayForm({ amount: "", currency: "KES", method: "", paymentReference: "", notes: "" });
      loadTabData(selected, "Verify Payment");
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Failed to verify payment" });
    } finally {
      setBusy(false);
    }
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
                  Select "Verify Payment" to record a manually-confirmed institutional payment, then "Issue Credits"
                  to deposit credits into this wallet against it. "Reverse Credits" corrects an unused, already-delivered
                  issuance with a mandatory reason — it never touches credits already reserved for a funded examination.
                </p>
              </div>
            )}

            {tab === "Verify Payment" && (
              <div style={s.card}>
                <form onSubmit={submitVerifyPayment}>
                  <label style={s.label}>Amount</label>
                  <input style={s.input} type="number" min="0.01" step="0.01" required
                    value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                  <label style={s.label}>Currency</label>
                  <input style={s.input} value={payForm.currency} onChange={(e) => setPayForm({ ...payForm, currency: e.target.value })} />
                  <label style={s.label}>Method (bank transfer, M-Pesa, etc.)</label>
                  <input style={s.input} value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} />
                  <label style={s.label}>Payment reference (leave blank to auto-generate)</label>
                  <input style={s.input} value={payForm.paymentReference} onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })} />
                  <label style={s.label}>Notes</label>
                  <input style={s.input} value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                  <button style={s.btn} disabled={busy} type="submit">{busy ? "Verifying…" : "Verify payment"}</button>
                </form>

                <h3 style={{ marginTop: 24, fontSize: 14 }}>Verified payments</h3>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Reference</th><th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Verified</th></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td style={s.td}>{p.payment_reference}</td>
                        <td style={s.td}>{p.currency} {Number(p.amount).toLocaleString()}</td>
                        <td style={s.td}>{p.method || "—"}</td>
                        <td style={s.td}>{new Date(p.verified_at).toLocaleString()}</td>
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
