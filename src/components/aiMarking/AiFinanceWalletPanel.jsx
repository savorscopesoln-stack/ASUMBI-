import { useCallback, useEffect, useState } from "react";

/* Finance-only: AI marking price + wallet top-up + ledger for ONE institution.
   Talks to routes/finance.js:
     GET  /finance/institutions/:key/ai-marking            wallet, reconciliation, activePricing
     GET  /finance/institutions/:key/ai-marking/ledger
     GET  /finance/institutions/:key/ai-marking/pricing    price history
     POST /finance/institutions/:key/ai-marking/pricing    { pricePerAnswer, currency, confirm:true, ... }
     POST /finance/institutions/:key/ai-marking/topup      { amount, financeReference, confirm:true }
   `api` is the app's axios instance (baseURL already ends in /api). */
const box = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius, 14px)", padding: 16, marginBottom: 16 };
const input = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" };
const btn = { padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" };
const lbl = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 };
const th = { textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" };
const td = { padding: "6px 8px", fontSize: 13, borderBottom: "1px solid var(--border)" };
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 }));

export default function AiFinanceWalletPanel({ api, tenantKey }) {
  const base = `/finance/institutions/${encodeURIComponent(tenantKey)}/ai-marking`;
  const [overview, setOverview] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState({ pricePerAnswer: "", currency: "KES", notes: "" });
  const [topup, setTopup] = useState({ amount: "", financeReference: "", notes: "" });

  const load = useCallback(async () => {
    try {
      const [o, l, h] = await Promise.all([api.get(base), api.get(`${base}/ledger`), api.get(`${base}/pricing`)]);
      setOverview(o.data); setLedger(l.data?.ledger || []); setHistory(h.data?.pricing || []);
    } catch (e) {
      setMsg({ tone: "error", text: e.response?.data?.message || "Could not load AI marking wallet" });
    }
  }, [api, base]);
  useEffect(() => { setMsg(null); load(); }, [load]);

  const submit = async (kind) => {
    setBusy(true); setMsg(null);
    try {
      if (kind === "price") {
        if (price.pricePerAnswer === "" || Number(price.pricePerAnswer) < 0) throw new Error("Enter a price per answer (0 or more)");
        if (!window.confirm(`Set the price to ${price.currency} ${price.pricePerAnswer} per answer for this institution?`)) return;
        await api.post(`${base}/pricing`, { pricePerAnswer: Number(price.pricePerAnswer), currency: price.currency.trim() || "KES", notes: price.notes || null, confirm: true });
        setPrice({ ...price, pricePerAnswer: "", notes: "" });
        setMsg({ tone: "success", text: "Price saved." });
      } else {
        if (!(Number(topup.amount) > 0)) throw new Error("Enter a positive top-up amount");
        if (!topup.financeReference.trim()) throw new Error("A finance reference (e.g. payment/receipt number) is required");
        if (!window.confirm(`Add ${topup.amount} AI marking credits to this institution?`)) return;
        const r = await api.post(`${base}/topup`, { amount: Number(topup.amount), financeReference: topup.financeReference.trim(), notes: topup.notes || null, confirm: true });
        setTopup({ amount: "", financeReference: "", notes: "" });
        setMsg({ tone: "success", text: r.data?.alreadyApplied ? "That reference was already applied — nothing changed." : "Wallet topped up." });
      }
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: e.response?.data?.message || e.message || "Failed" });
    } finally { setBusy(false); }
  };

  const w = overview?.wallet; const p = overview?.activePricing; const rec = overview?.reconciliation;
  return (
    <div>
      {msg && <div style={{ ...box, borderLeft: `4px solid ${msg.tone === "error" ? "var(--destructive)" : "var(--success)"}` }}>{msg.text}</div>}

      <div style={{ ...box, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <div><span style={lbl}>Available credits</span><strong style={{ fontSize: 20 }}>{fmt(w?.available_balance)}</strong></div>
        <div><span style={lbl}>Reserved</span><strong style={{ fontSize: 20 }}>{fmt(w?.reserved_balance)}</strong></div>
        <div><span style={lbl}>Current price / answer</span><strong style={{ fontSize: 20 }}>{p ? `${p.currency} ${fmt(p.price_per_answer)}` : "Not set"}</strong></div>
        <div><span style={lbl}>Ledger check</span><strong style={{ fontSize: 20, color: rec ? (rec.ok ? "var(--success)" : "var(--destructive)") : undefined }}>{rec ? (rec.ok ? "Balanced" : "MISMATCH") : "—"}</strong></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Set AI marking price</h3>
          <p style={{ ...lbl, marginBottom: 10 }}>Applies from now to new quotes. Past prices are kept in history; teachers see the price before confirming a job.</p>
          <label style={lbl}>Price per answer</label>
          <input style={input} type="number" min="0" step="0.01" value={price.pricePerAnswer} onChange={(e) => setPrice({ ...price, pricePerAnswer: e.target.value })} placeholder="e.g. 5" />
          <label style={{ ...lbl, marginTop: 10 }}>Currency</label>
          <input style={input} value={price.currency} onChange={(e) => setPrice({ ...price, currency: e.target.value.toUpperCase() })} maxLength={3} />
          <label style={{ ...lbl, marginTop: 10 }}>Notes (optional)</label>
          <input style={input} value={price.notes} onChange={(e) => setPrice({ ...price, notes: e.target.value })} />
          <button style={{ ...btn, marginTop: 12, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => submit("price")}>Save price</button>
        </div>

        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Top up AI credits</h3>
          <p style={{ ...lbl, marginBottom: 10 }}>1 credit = 1 currency unit of marking. Use after you have verified payment. The reference must be unique; re-sending the same one does not add twice.</p>
          <label style={lbl}>Amount (credits)</label>
          <input style={input} type="number" min="0" step="0.01" value={topup.amount} onChange={(e) => setTopup({ ...topup, amount: e.target.value })} />
          <label style={{ ...lbl, marginTop: 10 }}>Finance reference</label>
          <input style={input} value={topup.financeReference} onChange={(e) => setTopup({ ...topup, financeReference: e.target.value })} placeholder="e.g. MPESA code / receipt no." />
          <label style={{ ...lbl, marginTop: 10 }}>Notes (optional)</label>
          <input style={input} value={topup.notes} onChange={(e) => setTopup({ ...topup, notes: e.target.value })} />
          <button style={{ ...btn, marginTop: 12, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => submit("topup")}>Add credits</button>
        </div>
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Price history</h3>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>From</th><th style={th}>Price</th><th style={th}>Notes</th></tr></thead>
          <tbody>{history.length === 0 && <tr><td style={td} colSpan={3}>No price set yet — teachers cannot start AI jobs until one is.</td></tr>}
            {history.map((h) => <tr key={h.id}><td style={td}>{new Date(h.effective_from).toLocaleString()}</td><td style={td}>{h.currency} {fmt(h.price_per_answer)}</td><td style={td}>{h.notes || ""}</td></tr>)}</tbody>
        </table></div>
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Wallet ledger (latest 50)</h3>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>When</th><th style={th}>Type</th><th style={th}>Change</th><th style={th}>Available after</th><th style={th}>Reference / reason</th></tr></thead>
          <tbody>{ledger.length === 0 && <tr><td style={td} colSpan={5}>No entries yet.</td></tr>}
            {ledger.map((l) => <tr key={l.id}><td style={td}>{new Date(l.createdAt).toLocaleString()}</td><td style={td}>{l.entry_type}</td><td style={td}>{fmt(l.amount_delta)}</td><td style={td}>{fmt(l.available_after)}</td><td style={td}>{l.finance_reference || l.reason || ""}</td></tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}