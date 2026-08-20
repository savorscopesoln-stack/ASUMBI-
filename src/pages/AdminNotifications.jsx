import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import {
  ArrowLeft, Send, Clock, Users, GraduationCap, ShieldCheck, UserRound,
  Layers, Search, X, Mail, MessageSquare, Smartphone, Bell, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Trash2, ChevronDown,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — same stylesheet id as the rest of the app
   (Dashboard / AdminEAssessments etc.), so injecting it here is
   a no-op if any of those already mounted it, and this page
   automatically matches the rest of the admin portal.
═══════════════════════════════════════════════════════════ */
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
      --success: #4ADE80; --success-tint: rgba(22,163,74,0.18); --warning: #FBBF24; --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185; --destructive-tint: rgba(220,38,38,0.18); --info: #7DA6FF; --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3); --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    body { background: var(--bg); transition: background-color .2s ease; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }
    .dash-card:hover { box-shadow: var(--shadow); }
    .dash-icon-btn:hover { background: var(--bg); }
    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 6px;
    }
    @media (max-width: 900px) {
      .notif-main { padding: 20px 16px 48px !important; }
      .notif-two-col { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(el);
};

const C = {
  bg: "var(--bg)", card: "var(--card)", cardHover: "var(--card-elevated)",
  border: "var(--border)", textPri: "var(--text)", textSec: "var(--text-secondary)",
  textMuted: "var(--text-muted)", accent: "var(--primary)",
  success: "var(--success)", danger: "var(--destructive)", warning: "var(--warning)",
  info: "var(--info)", white: "#ffffff",
};

const sx = {
  page: { minHeight: "100vh", padding: "28px 40px 60px", fontFamily: "Inter, sans-serif", background: C.bg },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 28 },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0", marginBottom: 8 },
  pageTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em" },
  pageSub: { margin: "6px 0 0", fontSize: 14, color: C.textMuted },
  twoCol: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, alignItems: "start" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)" },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "block" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textPri, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textPri, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
  select: { padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textPri, fontSize: 13.5, fontWeight: 500, cursor: "pointer" },
  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: C.accent, color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 12px", borderRadius: 999, background: "var(--primary-tint)", color: C.accent, fontSize: 12.5, fontWeight: 600 },
  channelBtn: (active) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12,
    border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? "var(--primary-tint)" : C.card,
    color: active ? C.accent : C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", flex: "1 1 130px",
  }),
  recipientBtn: (active) => ({
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "12px 14px", borderRadius: 12,
    border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? "var(--primary-tint)" : C.card,
    color: active ? C.accent : C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
  }),
};

/* ── small pieces ── */
const IconBadge = ({ tone, children }) => {
  const map = {
    success: { bg: "var(--success-tint)", fg: C.success },
    warning: { bg: "var(--warning-tint)", fg: C.warning },
    danger: { bg: "var(--destructive-tint)", fg: C.danger },
    info: { bg: "var(--info-tint)", fg: C.info },
    muted: { bg: C.bg, fg: C.textMuted },
  }[tone || "muted"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: map.bg, color: map.fg, fontSize: 11.5, fontWeight: 700 }}>
      {children}
    </span>
  );
};

const CHANNEL_OPTIONS = [
  { key: "in_app", label: "In-System", Icon: Bell },
  { key: "email", label: "Email", Icon: Mail },
  { key: "sms", label: "SMS", Icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", Icon: Smartphone },
];

const RECIPIENT_OPTIONS = [
  { key: "all", label: "Everyone", sub: "Students, teachers & admins", Icon: Layers },
  { key: "students", label: "All Students", sub: "Every active student", Icon: GraduationCap },
  { key: "teachers", label: "All Teachers", sub: "Every teacher account", Icon: UserRound },
  { key: "admins", label: "Admins", sub: "Admin & sub-admin accounts", Icon: ShieldCheck },
  { key: "class", label: "One Class", sub: "Pick a specific class", Icon: Users },
  { key: "specific", label: "Specific People", sub: "Hand-pick individuals", Icon: Search },
];

export default function AdminNotifications() {
  injectStyles();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── compose form state ── */
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState(["in_app"]);
  const [recipientType, setRecipientType] = useState("all");
  const [studentClass, setStudentClass] = useState("");
  const [classes, setClasses] = useState([]);
  const [sendMode, setSendMode] = useState("now"); // now | later
  const [scheduledFor, setScheduledFor] = useState("");
  const [sending, setSending] = useState(false);

  /* ── specific-person picker ── */
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]); // [{id, source, name, userType}]
  const searchTimer = useRef(null);

  /* ── history ── */
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadDirectoryMeta = useCallback(async () => {
    try {
      const res = await API.get("/broadcast-notifications/recipients");
      setClasses(res.data?.classes || []);
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await API.get("/broadcast-notifications");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load notification history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectoryMeta();
    loadHistory();
  }, [loadDirectoryMeta, loadHistory]);

  /* debounced people search */
  useEffect(() => {
    if (recipientType !== "specific") return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const res = await API.get("/broadcast-notifications/recipients", {
          params: pickerSearch ? { search: pickerSearch } : {},
        });
        setPickerResults(res.data?.results || []);
      } catch (err) {
        console.error("Recipient search failed", err);
      } finally {
        setPickerLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [pickerSearch, recipientType]);

  const toggleChannel = (key) => {
    setChannels((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  };

  const togglePerson = (person) => {
    setSelectedPeople((prev) => {
      const exists = prev.find((p) => p.id === person.id && p.source === person.source);
      if (exists) return prev.filter((p) => !(p.id === person.id && p.source === person.source));
      return [...prev, person];
    });
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setChannels(["in_app"]);
    setRecipientType("all");
    setStudentClass("");
    setSendMode("now");
    setScheduledFor("");
    setSelectedPeople([]);
    setPickerSearch("");
    setPickerResults([]);
  };

  const handleSend = async () => {
    if (!message.trim()) return showToast("error", "Message is required");
    if (!channels.length) return showToast("error", "Pick at least one channel");
    if (recipientType === "class" && !studentClass) return showToast("error", "Pick a class");
    if (recipientType === "specific" && !selectedPeople.length) return showToast("error", "Pick at least one person");
    if (sendMode === "later" && !scheduledFor) return showToast("error", "Pick a date & time to schedule for");

    setSending(true);
    try {
      const payload = {
        title: title.trim() || "Notification",
        message: message.trim(),
        channels,
        recipientType,
        studentClass: recipientType === "class" ? studentClass : undefined,
        recipientIds: recipientType === "specific"
          ? selectedPeople.map((p) => ({ id: p.id, source: p.source }))
          : undefined,
        scheduledFor: sendMode === "later" ? new Date(scheduledFor).toISOString() : undefined,
      };

      const res = await API.post("/broadcast-notifications", payload);

      if (res.data?.status === "sent") {
        const s = res.data.summary || {};
        showToast("success", `Sent to ${s.recipientCount ?? "?"} recipient(s)`);
      } else {
        showToast("success", res.data?.message || "Notification scheduled");
      }

      resetForm();
      loadHistory();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this scheduled notification?")) return;
    try {
      await API.delete(`/broadcast-notifications/${id}`);
      showToast("success", "Cancelled");
      loadHistory();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to cancel");
    }
  };

  const recipientLabel = (row) => {
    if (row.recipientType === "class") return `Class: ${row.studentClass || "—"}`;
    if (row.recipientType === "specific") return `${(row.recipientIds || []).length} specific people`;
    const opt = RECIPIENT_OPTIONS.find((o) => o.key === row.recipientType);
    return opt?.label || row.recipientType;
  };

  const statusBadge = (status) => {
    if (status === "sent") return <IconBadge tone="success"><CheckCircle2 size={12} /> Sent</IconBadge>;
    if (status === "pending") return <IconBadge tone="info"><Clock size={12} /> Scheduled</IconBadge>;
    if (status === "failed") return <IconBadge tone="danger"><XCircle size={12} /> Failed</IconBadge>;
    if (status === "cancelled") return <IconBadge tone="muted"><X size={12} /> Cancelled</IconBadge>;
    return <IconBadge tone="muted">{status}</IconBadge>;
  };

  return (
    <div className="notif-main" style={sx.page} data-theme={theme}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999, display: "flex", alignItems: "center", gap: 10,
          background: C.card, border: `1px solid ${toast.type === "error" ? C.danger : C.success}`,
          borderRadius: 12, padding: "12px 18px", boxShadow: "var(--shadow)",
        }}>
          {toast.type === "error" ? <XCircle size={16} style={{ color: C.danger }} /> : <CheckCircle2 size={16} style={{ color: C.success }} />}
          <span style={{ color: C.textPri, fontSize: 14 }}>{toast.msg}</span>
        </div>
      )}

      <div style={sx.header}>
        <div>
          <button style={sx.backBtn} className="dash-icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={sx.pageTitle}>Notifications</h1>
          <p style={sx.pageSub}>Send or schedule a broadcast to any group — in-system, email, SMS, and WhatsApp.</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="notif-two-col" style={sx.twoCol}>
        {/* ══════════ COMPOSE ══════════ */}
        <div style={sx.card}>
          <label style={sx.sectionLabel}>Message</label>
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ ...sx.input, marginBottom: 10 }}
          />
          <textarea
            placeholder="Write your notification…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={sx.textarea}
          />

          <div style={{ marginTop: 22 }}>
            <label style={sx.sectionLabel}>Send via</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {CHANNEL_OPTIONS.map(({ key, label, Icon }) => (
                <button key={key} style={sx.channelBtn(channels.includes(key))} onClick={() => toggleChannel(key)}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <label style={sx.sectionLabel}>Recipients</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {RECIPIENT_OPTIONS.map(({ key, label, sub, Icon }) => (
                <button key={key} style={sx.recipientBtn(recipientType === key)} onClick={() => setRecipientType(key)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon size={15} /> {label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>{sub}</span>
                </button>
              ))}
            </div>

            {recipientType === "class" && (
              <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={{ ...sx.select, width: "100%", marginTop: 12 }}>
                <option value="">Select a class…</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {recipientType === "specific" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: C.textMuted }} />
                  <input
                    placeholder="Search by name, admission no., staff ID, username…"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    style={{ ...sx.input, paddingLeft: 36 }}
                  />
                </div>

                {selectedPeople.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {selectedPeople.map((p) => (
                      <span key={`${p.source}-${p.id}`} style={sx.chip}>
                        {p.name}
                        <X size={12} style={{ cursor: "pointer" }} onClick={() => togglePerson(p)} />
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 10, maxHeight: 220, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  {pickerLoading ? (
                    <p style={{ padding: 14, fontSize: 13, color: C.textMuted, margin: 0 }}>Searching…</p>
                  ) : pickerResults.length === 0 ? (
                    <p style={{ padding: 14, fontSize: 13, color: C.textMuted, margin: 0 }}>No matches. Try a different search.</p>
                  ) : (
                    pickerResults.map((r) => {
                      const isSelected = selectedPeople.some((p) => p.id === r.id && p.source === r.source);
                      return (
                        <div
                          key={`${r.source}-${r.id}`}
                          onClick={() => togglePerson(r)}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "9px 14px", cursor: "pointer", fontSize: 13,
                            background: isSelected ? "var(--primary-tint)" : "transparent",
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <span style={{ color: C.textPri }}>
                            {r.name} <span style={{ color: C.textMuted, fontSize: 11.5 }}>· {r.userType}{r.studentClass ? ` · ${r.studentClass}` : ""}</span>
                          </span>
                          {isSelected && <CheckCircle2 size={14} style={{ color: C.accent }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 22 }}>
            <label style={sx.sectionLabel}>When</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button style={sx.channelBtn(sendMode === "now")} onClick={() => setSendMode("now")}>
                <Send size={14} /> Send now
              </button>
              <button style={sx.channelBtn(sendMode === "later")} onClick={() => setSendMode("later")}>
                <Clock size={14} /> Schedule for later
              </button>
              {sendMode === "later" && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  style={{ ...sx.input, flex: "1 1 220px" }}
                />
              )}
            </div>
          </div>

          <button
            style={{ ...sx.primaryBtn, width: "100%", marginTop: 24, opacity: sending ? 0.7 : 1 }}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <RefreshCw size={15} className="dash-spin" /> : (sendMode === "later" ? <Clock size={15} /> : <Send size={15} />)}
            {sending ? "Sending…" : sendMode === "later" ? "Schedule Notification" : "Send Notification"}
          </button>
        </div>

        {/* ══════════ HISTORY ══════════ */}
        <div style={sx.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={{ ...sx.sectionLabel, marginBottom: 0 }}>History</label>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }} onClick={loadHistory} title="Refresh">
              <RefreshCw size={14} className={historyLoading ? "dash-spin" : ""} />
            </button>
          </div>

          {historyLoading ? (
            <p style={{ fontSize: 13, color: C.textMuted }}>Loading…</p>
          ) : history.length === 0 ? (
            <p style={{ fontSize: 13, color: C.textMuted }}>No notifications sent yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 640, overflowY: "auto" }}>
              {history.map((row) => (
                <div key={row.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: C.textPri, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.title || "Notification"}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.textSec, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {row.message}
                      </p>
                    </div>
                    {statusBadge(row.status)}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    <IconBadge tone="muted">{recipientLabel(row)}</IconBadge>
                    {(row.channels || []).map((c) => (
                      <IconBadge key={c} tone="muted">{CHANNEL_OPTIONS.find((o) => o.key === c)?.label || c}</IconBadge>
                    ))}
                  </div>

                  {row.resultSummary && (
                    <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.textMuted }}>
                      {row.recipientCount ?? row.resultSummary.recipientCount ?? 0} recipient(s)
                      {row.resultSummary.errors?.length > 0 && (
                        <span style={{ color: C.warning }}> · {row.resultSummary.errors.length} issue(s)</span>
                      )}
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>
                      {row.status === "pending" && row.scheduledFor
                        ? `Scheduled for ${new Date(row.scheduledFor).toLocaleString()}`
                        : row.sentAt
                        ? `Sent ${new Date(row.sentAt).toLocaleString()}`
                        : new Date(row.createdAt).toLocaleString()}
                    </span>
                    {row.status === "pending" && (
                      <button
                        onClick={() => handleCancel(row.id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.danger, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
