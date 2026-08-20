import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import {
  ArrowLeft, Mail, MessageSquare, Smartphone, Save, RefreshCw, CheckCircle2,
  XCircle, Send, Eye, EyeOff, Database, Cloud, CircleSlash,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION SETTINGS — admin-only configuration page for
   wiring up the API credentials the broadcast Notifications
   feature sends through (SMTP for email, Twilio for SMS +
   WhatsApp). Lets an admin plug these in from the browser
   instead of needing server/.env access.

   Deliberately not reachable by a sub_admin even if they were
   granted the "Notifications" broadcast page — the backend
   route is gated with `adminOnly`, and this page is only linked
   to / routable for the "admin" role (see App.jsx).
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
    .dash-icon-btn:hover { background: var(--bg); }
    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 6px;
    }
    @media (max-width: 900px) {
      .notif-main { padding: 20px 16px 48px !important; }
      .notif-settings-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(el);
};

const C = {
  bg: "var(--bg)", card: "var(--card)", border: "var(--border)",
  textPri: "var(--text)", textSec: "var(--text-secondary)", textMuted: "var(--text-muted)",
  accent: "var(--primary)", success: "var(--success)", danger: "var(--destructive)",
  warning: "var(--warning)", info: "var(--info)", white: "#ffffff",
};

const sx = {
  page: { minHeight: "100vh", padding: "28px 40px 60px", fontFamily: "Inter, sans-serif", background: C.bg },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 20 },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0", marginBottom: 8 },
  pageTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em" },
  pageSub: { margin: "6px 0 0", fontSize: 14, color: C.textMuted },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 24 },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  cardTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 15.5, fontWeight: 800, color: C.textPri, margin: 0 },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 },
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textPri, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  fieldWrap: { marginBottom: 14 },
  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: "none", background: C.accent, color: C.white, fontSize: 13.5, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, fontSize: 13.5, fontWeight: 700, cursor: "pointer" },
  eyeBtn: { position: "absolute", right: 10, top: 8, background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 },
};

const SourceBadge = ({ source }) => {
  if (source === "database") {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.success, background: "var(--success-tint)", padding: "3px 9px", borderRadius: 999 }}><Database size={11} /> Saved here</span>;
  }
  if (source === "environment") {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.info, background: "var(--info-tint)", padding: "3px 9px", borderRadius: 999 }}><Cloud size={11} /> From server env</span>;
  }
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.textMuted, background: C.bg, padding: "3px 9px", borderRadius: 999 }}><CircleSlash size={11} /> Not configured</span>;
};

export default function AdminNotificationSettings() {
  injectStyles();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [showSecrets, setShowSecrets] = useState({ emailPassword: false, twilioAuthToken: false });

  /* form fields — mirrors NotificationSettings columns. Secret fields
     start blank; a blank secret on save means "leave whatever's
     already stored alone" (see backend/utils/notificationSettingsStore.js). */
  const [emailHost, setEmailHost] = useState("");
  const [emailPort, setEmailPort] = useState("");
  const [emailSecure, setEmailSecure] = useState(false);
  const [emailUser, setEmailUser] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailFrom, setEmailFrom] = useState("");

  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioSmsFrom, setTwilioSmsFrom] = useState("");
  const [twilioWhatsappFrom, setTwilioWhatsappFrom] = useState("");

  const [testTo, setTestTo] = useState({ email: "", sms: "", whatsapp: "" });
  const [testing, setTesting] = useState({ email: false, sms: false, whatsapp: false });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/notification-settings");
      setSettings(res.data);
      setEmailHost(res.data?.email?.host || "");
      setEmailPort(res.data?.email?.port ?? "");
      setEmailSecure(!!res.data?.email?.secure);
      setEmailUser(res.data?.email?.user || "");
      setEmailFrom(res.data?.email?.from || "");
      setTwilioSmsFrom(res.data?.sms?.smsFrom || "");
      setTwilioWhatsappFrom(res.data?.whatsapp?.whatsappFrom || "");
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveEmail = async () => {
    setSaving(true);
    try {
      const payload = {
        emailHost: emailHost.trim(),
        emailPort: emailPort === "" ? "" : Number(emailPort),
        emailSecure,
        emailUser: emailUser.trim(),
        emailFrom: emailFrom.trim(),
      };
      if (emailPassword.trim()) payload.emailPassword = emailPassword.trim();
      await API.put("/notification-settings", payload);
      showToast("success", "Email settings saved");
      setEmailPassword("");
      loadSettings();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to save email settings");
    } finally {
      setSaving(false);
    }
  };

  const saveTwilio = async () => {
    setSaving(true);
    try {
      const payload = {
        twilioAccountSid: twilioAccountSid.trim(),
        twilioSmsFrom: twilioSmsFrom.trim(),
        twilioWhatsappFrom: twilioWhatsappFrom.trim(),
      };
      if (twilioAuthToken.trim()) payload.twilioAuthToken = twilioAuthToken.trim();
      await API.put("/notification-settings", payload);
      showToast("success", "SMS / WhatsApp settings saved");
      setTwilioAuthToken("");
      loadSettings();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to save SMS/WhatsApp settings");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (channel) => {
    const to = testTo[channel]?.trim();
    if (!to) return showToast("error", "Enter a destination to send the test to");
    setTesting((prev) => ({ ...prev, [channel]: true }));
    try {
      const res = await API.post("/notification-settings/test", { channel, to });
      showToast("success", res.data?.message || "Test sent");
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Test failed to send");
    } finally {
      setTesting((prev) => ({ ...prev, [channel]: false }));
    }
  };

  return (
    <div className="notif-main" style={sx.page} data-theme={theme}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999, display: "flex", alignItems: "center", gap: 10,
          background: C.card, border: `1px solid ${toast.type === "error" ? C.danger : C.success}`,
          borderRadius: 12, padding: "12px 18px", boxShadow: "var(--shadow)", maxWidth: 380,
        }}>
          {toast.type === "error" ? <XCircle size={16} style={{ color: C.danger, flexShrink: 0 }} /> : <CheckCircle2 size={16} style={{ color: C.success, flexShrink: 0 }} />}
          <span style={{ color: C.textPri, fontSize: 13.5 }}>{toast.msg}</span>
        </div>
      )}

      <div style={sx.header}>
        <div>
          <button style={sx.backBtn} className="dash-icon-btn" onClick={() => navigate("/notifications/compose")}>
            <ArrowLeft size={14} /> Back to Notifications
          </button>
          <h1 style={sx.pageTitle}>Notification Settings</h1>
          <p style={sx.pageSub}>Connect the APIs the broadcast notifications feature sends through.</p>
        </div>
        <ThemeToggle />
      </div>

      {loading ? (
        <p style={{ fontSize: 13.5, color: C.textMuted }}>Loading…</p>
      ) : (
        <div className="notif-settings-grid" style={sx.grid}>
          {/* ══════════ EMAIL ══════════ */}
          <div style={sx.card}>
            <div style={sx.cardHeader}>
              <h2 style={sx.cardTitle}><Mail size={17} /> Email (SMTP)</h2>
              {settings && <SourceBadge source={settings.email.source} />}
            </div>

            <div style={sx.row}>
              <div>
                <label style={sx.fieldLabel}>SMTP Host</label>
                <input style={sx.input} placeholder="smtp.gmail.com" value={emailHost} onChange={(e) => setEmailHost(e.target.value)} />
              </div>
              <div>
                <label style={sx.fieldLabel}>Port</label>
                <input style={sx.input} placeholder="587" value={emailPort} onChange={(e) => setEmailPort(e.target.value)} />
              </div>
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>SMTP Username</label>
              <input style={sx.input} placeholder="notifications@school.ac.ke" value={emailUser} onChange={(e) => setEmailUser(e.target.value)} />
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>
                SMTP Password {settings?.email?.passwordSet && <span style={{ color: C.textMuted, fontWeight: 500 }}>(saved — leave blank to keep)</span>}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...sx.input, paddingRight: 36 }}
                  type={showSecrets.emailPassword ? "text" : "password"}
                  placeholder={settings?.email?.passwordSet ? "•••••••• (leave blank to keep)" : "App password / SMTP password"}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
                <button type="button" style={sx.eyeBtn} onClick={() => setShowSecrets((p) => ({ ...p, emailPassword: !p.emailPassword }))}>
                  {showSecrets.emailPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>"From" address (optional)</label>
              <input style={sx.input} placeholder="Defaults to the SMTP username" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSec, marginBottom: 18, cursor: "pointer" }}>
              <input type="checkbox" checked={emailSecure} onChange={(e) => setEmailSecure(e.target.checked)} />
              Use TLS/SSL (usually on for port 465, off for 587)
            </label>

            <button style={{ ...sx.primaryBtn, width: "100%", opacity: saving ? 0.7 : 1 }} onClick={saveEmail} disabled={saving}>
              <Save size={14} /> Save Email Settings
            </button>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
              <label style={sx.fieldLabel}>Send a test email to…</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={sx.input}
                  placeholder="someone@example.com"
                  value={testTo.email}
                  onChange={(e) => setTestTo((p) => ({ ...p, email: e.target.value }))}
                />
                <button style={{ ...sx.secondaryBtn, flexShrink: 0 }} onClick={() => sendTest("email")} disabled={testing.email}>
                  {testing.email ? <RefreshCw size={14} className="dash-spin" /> : <Send size={14} />} Test
                </button>
              </div>
            </div>
          </div>

          {/* ══════════ SMS + WHATSAPP (TWILIO) ══════════ */}
          <div style={sx.card}>
            <div style={sx.cardHeader}>
              <h2 style={sx.cardTitle}><MessageSquare size={17} /> SMS &amp; WhatsApp (Twilio)</h2>
              {settings && <SourceBadge source={settings.sms.source} />}
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>Twilio Account SID</label>
              <input style={sx.input} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} />
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>
                Twilio Auth Token {settings?.sms?.authTokenSet && <span style={{ color: C.textMuted, fontWeight: 500 }}>(saved — leave blank to keep)</span>}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...sx.input, paddingRight: 36 }}
                  type={showSecrets.twilioAuthToken ? "text" : "password"}
                  placeholder={settings?.sms?.authTokenSet ? "•••••••• (leave blank to keep)" : "Auth token"}
                  value={twilioAuthToken}
                  onChange={(e) => setTwilioAuthToken(e.target.value)}
                />
                <button type="button" style={sx.eyeBtn} onClick={() => setShowSecrets((p) => ({ ...p, twilioAuthToken: !p.twilioAuthToken }))}>
                  {showSecrets.twilioAuthToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>SMS sender number</label>
              <input style={sx.input} placeholder="+15551234567" value={twilioSmsFrom} onChange={(e) => setTwilioSmsFrom(e.target.value)} />
            </div>

            <div style={sx.fieldWrap}>
              <label style={sx.fieldLabel}>WhatsApp sender number</label>
              <input style={sx.input} placeholder="+15551234567 (Twilio WhatsApp-enabled number)" value={twilioWhatsappFrom} onChange={(e) => setTwilioWhatsappFrom(e.target.value)} />
            </div>

            <button style={{ ...sx.primaryBtn, width: "100%", opacity: saving ? 0.7 : 1 }} onClick={saveTwilio} disabled={saving}>
              <Save size={14} /> Save SMS / WhatsApp Settings
            </button>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
              <label style={sx.fieldLabel}>Send a test SMS to…</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  style={sx.input}
                  placeholder="+2547XXXXXXXX"
                  value={testTo.sms}
                  onChange={(e) => setTestTo((p) => ({ ...p, sms: e.target.value }))}
                />
                <button style={{ ...sx.secondaryBtn, flexShrink: 0 }} onClick={() => sendTest("sms")} disabled={testing.sms}>
                  {testing.sms ? <RefreshCw size={14} className="dash-spin" /> : <Send size={14} />} Test
                </button>
              </div>

              <label style={sx.fieldLabel}><Smartphone size={12} style={{ verticalAlign: "-2px" }} /> Send a test WhatsApp to…</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={sx.input}
                  placeholder="+2547XXXXXXXX"
                  value={testTo.whatsapp}
                  onChange={(e) => setTestTo((p) => ({ ...p, whatsapp: e.target.value }))}
                />
                <button style={{ ...sx.secondaryBtn, flexShrink: 0 }} onClick={() => sendTest("whatsapp")} disabled={testing.whatsapp}>
                  {testing.whatsapp ? <RefreshCw size={14} className="dash-spin" /> : <Send size={14} />} Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settings?.updatedAt && (
        <p style={{ fontSize: 11.5, color: C.textMuted, marginTop: -8 }}>
          Last saved {new Date(settings.updatedAt).toLocaleString()}{settings.updatedByName ? ` by ${settings.updatedByName}` : ""}
        </p>
      )}
    </div>
  );
}
