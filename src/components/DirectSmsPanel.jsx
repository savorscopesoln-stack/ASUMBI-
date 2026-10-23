import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../api";
import {
  Send, Phone, UserPlus, Pencil, Trash2, Search, X, RefreshCw, Plus,
  CheckCircle2, XCircle, Save,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DIRECT SMS
   Send an SMS straight from the system to typed phone numbers and/or
   saved contacts, and manage the contacts address book.
   Uses the same CSS variables as the rest of the admin portal, so it
   follows light/dark theme automatically.
═══════════════════════════════════════════════════════════ */

const C = {
  bg: "var(--bg)", card: "var(--card)", border: "var(--border)",
  textPri: "var(--text)", textSec: "var(--text-secondary)", textMuted: "var(--text-muted)",
  accent: "var(--primary)", success: "var(--success)", danger: "var(--destructive)",
  warning: "var(--warning)", white: "#ffffff",
};

const sx = {
  twoCol: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, alignItems: "start" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)" },
  label: { fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "block" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textPri, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textPri, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: C.accent, color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 12px", borderRadius: 999, background: "var(--primary-tint)", color: C.accent, fontSize: 12.5, fontWeight: 600 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "inline-flex" },
  muted: { fontSize: 12, color: C.textMuted },
};

/* Mirror of the server-side normalisation, so typos are caught while typing.
   The server re-validates everything — this is only for instant feedback. */
export const normalizePhone = (raw) => {
  let p = String(raw || "").trim().replace(/[\s\-().]/g, "");
  if (!p) return null;
  if (p.startsWith("0") && p.length === 10) p = "+254" + p.slice(1);
  if (!p.startsWith("+")) p = "+" + p;
  return /^\+\d{8,15}$/.test(p) ? p : null;
};

const SEGMENT = 160;

export default function DirectSmsPanel({ showToast }) {
  /* ── compose ── */
  const [numberInput, setNumberInput] = useState("");
  const [typed, setTyped] = useState([]);              // normalized typed numbers
  const [selectedIds, setSelectedIds] = useState([]);  // saved-contact ids
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [inputError, setInputError] = useState("");

  /* ── contacts ── */
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: null, name: "", phone: "", note: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  /* ── log ── */
  const [log, setLog] = useState([]);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const res = await API.get("/broadcast-notifications/contacts");
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, [showToast]);

  const loadLog = useCallback(async () => {
    try {
      const res = await API.get("/broadcast-notifications/sms");
      setLog(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load SMS log", err);
    }
  }, []);

  useEffect(() => { loadContacts(); loadLog(); }, [loadContacts, loadLog]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const contactByPhone = useMemo(() => new Map(contacts.map((c) => [c.phone, c])), [contacts]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.note || "").toLowerCase().includes(q));
  }, [contacts, search]);

  /* ── typed numbers ── */
  // Accepts one number, or several separated by commas / spaces-after-comma / new lines
  // (e.g. pasted from a spreadsheet).
  const addTyped = () => {
    const parts = numberInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const bad = [];
    const good = [];
    for (const part of parts) {
      const p = normalizePhone(part);
      if (p) good.push(p); else bad.push(part);
    }
    if (good.length) setTyped((prev) => [...new Set([...prev, ...good])]);
    if (bad.length) {
      setInputError(`Not a valid number: ${bad.join(", ")}`);
      setNumberInput(bad.join(", "));
    } else {
      setInputError("");
      setNumberInput("");
    }
  };

  const toggleContact = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const recipientCount = useMemo(() => {
    const phones = new Set(typed);
    selectedIds.forEach((id) => { const c = contactById.get(id); if (c) phones.add(c.phone); });
    return phones.size;
  }, [typed, selectedIds, contactById]);

  const handleSend = async () => {
    // Include a number that was typed but not yet added with Enter / "Add".
    let pending = [];
    if (numberInput.trim()) {
      const parts = numberInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      const bad = parts.filter((p) => !normalizePhone(p));
      if (bad.length) return setInputError(`Not a valid number: ${bad.join(", ")}`);
      pending = parts.map(normalizePhone);
    }
    const numbers = [...new Set([...typed, ...pending])];

    if (!numbers.length && !selectedIds.length) return showToast("error", "Add a phone number or pick a contact");
    if (!message.trim()) return showToast("error", "Message is required");

    setSending(true);
    setResults(null);
    try {
      const res = await API.post("/broadcast-notifications/sms", {
        message: message.trim(),
        numbers,
        contactIds: selectedIds,
      });
      setResults(res.data?.results || []);
      showToast(res.data?.failed ? "error" : "success", res.data?.message || "SMS sent");
      if (!res.data?.failed) {
        setMessage(""); setTyped([]); setSelectedIds([]); setNumberInput(""); setInputError("");
      }
      loadLog();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  /* ── contacts CRUD ── */
  const openNewContact = (prefill = {}) => {
    setForm({ id: null, name: prefill.name || "", phone: prefill.phone || "", note: "" });
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };
  const openEditContact = (c) => {
    setForm({ id: c.id, name: c.name, phone: c.phone, note: c.note || "" });
    setFormOpen(true);
  };

  const saveContact = async () => {
    if (!form.name.trim()) return showToast("error", "Contact name is required");
    if (!normalizePhone(form.phone)) return showToast("error", "Enter a valid phone number, e.g. 0712345678");
    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone, note: form.note.trim() };
      if (form.id) await API.put(`/broadcast-notifications/contacts/${form.id}`, body);
      else await API.post("/broadcast-notifications/contacts", body);
      showToast("success", form.id ? "Contact updated" : "Contact saved");
      setFormOpen(false);
      setForm({ id: null, name: "", phone: "", note: "" });
      loadContacts();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (c) => {
    if (!window.confirm(`Delete contact "${c.name}"?`)) return;
    try {
      await API.delete(`/broadcast-notifications/contacts/${c.id}`);
      setSelectedIds((prev) => prev.filter((id) => id !== c.id));
      showToast("success", "Contact deleted");
      loadContacts();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to delete contact");
    }
  };

  const len = message.length;
  const segments = Math.max(1, Math.ceil(len / SEGMENT));

  return (
    <div className="notif-two-col" style={sx.twoCol}>
      {/* ══════════ COMPOSE ══════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={sx.card}>
          <label style={sx.label}>Phone numbers</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Phone size={15} style={{ position: "absolute", left: 12, top: 12, color: C.textMuted }} />
              <input
                type="tel"
                inputMode="tel"
                placeholder="e.g. 0712 345 678 or +254712345678"
                value={numberInput}
                onChange={(e) => { setNumberInput(e.target.value); setInputError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }}
                style={{ ...sx.input, paddingLeft: 36, borderColor: inputError ? C.danger : C.border }}
              />
            </div>
            <button style={sx.secondaryBtn} onClick={addTyped}><Plus size={14} /> Add</button>
          </div>
          {inputError
            ? <p style={{ ...sx.muted, color: C.danger, margin: "6px 0 0" }}>{inputError}</p>
            : <p style={{ ...sx.muted, margin: "6px 0 0" }}>Press Enter to add. Paste several separated by commas. Numbers starting with 0 are treated as Kenyan (+254).</p>}

          {(typed.length > 0 || selectedIds.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {selectedIds.map((id) => {
                const c = contactById.get(id);
                if (!c) return null;
                return (
                  <span key={`c${id}`} style={sx.chip}>
                    {c.name} · {c.phone}
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => toggleContact(id)} />
                  </span>
                );
              })}
              {typed.map((p) => {
                const known = contactByPhone.get(p);
                return (
                  <span key={`t${p}`} style={{ ...sx.chip, background: C.bg, border: `1px solid ${C.border}`, color: C.textSec }}>
                    {known ? `${known.name} · ${p}` : p}
                    {!known && (
                      <button
                        title="Save as contact"
                        style={{ ...sx.iconBtn, padding: 0, color: C.accent }}
                        onClick={() => openNewContact({ phone: p })}
                      >
                        <UserPlus size={13} />
                      </button>
                    )}
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => setTyped((prev) => prev.filter((x) => x !== p))} />
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <label style={sx.label}>Message</label>
            <textarea
              placeholder="Write your SMS…"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              style={sx.textarea}
            />
            <p style={{ ...sx.muted, margin: "6px 0 0", textAlign: "right" }}>
              {len} character{len === 1 ? "" : "s"} · {segments} SMS part{segments === 1 ? "" : "s"} per recipient
            </p>
          </div>

          <button
            style={{ ...sx.primaryBtn, width: "100%", marginTop: 20, opacity: sending ? 0.7 : 1 }}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <RefreshCw size={15} className="dash-spin" /> : <Send size={15} />}
            {sending ? "Sending…" : recipientCount > 1 ? `Send SMS to ${recipientCount} recipients` : "Send SMS"}
          </button>

          {results && (
            <div style={{ marginTop: 18, border: `1px solid ${C.border}`, borderRadius: 12 }}>
              {results.map((r) => (
                <div key={r.phone} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", padding: "9px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.textPri }}>{r.name ? `${r.name} · ` : ""}{r.phone}</span>
                  {r.status === "sent"
                    ? <span style={{ color: C.success, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}><CheckCircle2 size={13} /> Sent</span>
                    : <span style={{ color: C.danger, display: "flex", alignItems: "center", gap: 4, fontWeight: 600, textAlign: "right" }}><XCircle size={13} /> {r.reason || "Failed"}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════ RECENT ══════════ */}
        <div style={sx.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={{ ...sx.label, marginBottom: 0 }}>Recent direct SMS</label>
            <button style={sx.iconBtn} onClick={loadLog} title="Refresh"><RefreshCw size={14} /></button>
          </div>
          {log.length === 0 ? (
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>No direct SMS sent yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
              {log.map((row) => (
                <div key={row.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>
                      {row.recipientName ? `${row.recipientName} · ` : ""}{row.phone}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: row.status === "sent" ? C.success : C.danger }}>
                      {row.status === "sent" ? "Sent" : "Failed"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.textSec, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{row.message}</p>
                  {row.reason && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: C.warning }}>{row.reason}</p>}
                  <p style={{ margin: "6px 0 0", ...sx.muted, fontSize: 11 }}>
                    {new Date(row.createdAt).toLocaleString()}{row.createdByName ? ` · ${row.createdByName}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ CONTACTS ══════════ */}
      <div style={sx.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <label style={{ ...sx.label, marginBottom: 0 }}>Contacts ({contacts.length})</label>
          <button style={sx.secondaryBtn} onClick={() => openNewContact()}><UserPlus size={14} /> Add contact</button>
        </div>

        {formOpen && (
          <div ref={formRef} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, background: C.bg }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: C.textPri }}>
              {form.id ? "Edit contact" : "New contact"}
            </p>
            <input placeholder="Name" value={form.name} maxLength={150}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ ...sx.input, marginBottom: 8, background: C.card }} />
            <input placeholder="Phone, e.g. 0712345678" type="tel" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              style={{ ...sx.input, marginBottom: 8, background: C.card }} />
            <input placeholder="Note (optional)" value={form.note} maxLength={300}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              style={{ ...sx.input, marginBottom: 10, background: C.card }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...sx.primaryBtn, padding: "10px 16px", fontSize: 13, opacity: saving ? 0.7 : 1 }} onClick={saveContact} disabled={saving}>
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
              <button style={sx.secondaryBtn} onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: C.textMuted }} />
          <input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...sx.input, paddingLeft: 36 }} />
        </div>

        <div style={{ maxHeight: 560, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          {contactsLoading ? (
            <p style={{ padding: 14, fontSize: 13, color: C.textMuted, margin: 0 }}>Loading…</p>
          ) : filteredContacts.length === 0 ? (
            <p style={{ padding: 14, fontSize: 13, color: C.textMuted, margin: 0 }}>
              {contacts.length ? "No matching contacts." : "No contacts yet. Add one to message it quickly later."}
            </p>
          ) : (
            filteredContacts.map((c) => {
              const picked = selectedIds.includes(c.id);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: `1px solid ${C.border}`, background: picked ? "var(--primary-tint)" : "transparent" }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => toggleContact(c.id)} title="Click to add / remove as recipient">
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textPri, display: "flex", alignItems: "center", gap: 6 }}>
                      {c.name} {picked && <CheckCircle2 size={13} style={{ color: C.accent }} />}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.phone}{c.note ? ` · ${c.note}` : ""}
                    </div>
                  </div>
                  <button style={sx.iconBtn} title="Edit" onClick={() => openEditContact(c)}><Pencil size={14} /></button>
                  <button style={{ ...sx.iconBtn, color: C.danger }} title="Delete" onClick={() => deleteContact(c)}><Trash2 size={14} /></button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
