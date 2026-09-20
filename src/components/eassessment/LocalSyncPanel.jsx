import React, { useEffect, useState } from "react";
import API from "../../api"; // adjust relative path to wherever api.js lives from this file's location
import {
  Server, PlusCircle, ShieldOff, RotateCw, CheckCircle2, AlertTriangle,
  XCircle, Loader2, ArrowDownCircle, ArrowUpCircle, Clock, Copy, ClipboardCheck, Trash2, X,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the rest
   of the app (see StudentProfile.jsx); a no-op if already mounted by
   the layout or another page. Kept in sync so this panel doesn't look
   like a bolted-on prototype. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    :root {
      --bg: #F8FAFC; --card: #FFFFFF; --border: #E2E5EA; --text: #0B0F19;
      --text-secondary: #384152; --text-muted: #64748B; --primary: #8B1E2D;
      --primary-dark: #6F1725; --primary-tint: #FBEAEC; --success: #15803D;
      --success-tint: #ECFDF3; --warning: #B45309; --warning-tint: #FFFBEB;
      --destructive: #DC2626; --destructive-tint: #FEF2F2; --info: #1D4ED8;
      --info-tint: #EFF6FF; --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06); --radius: 14px; --radius-sm: 10px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }
    .profile-btn:hover { filter: brightness(0.95); }
  `;
  document.head.appendChild(el);
};

const STATUS_BADGE = {
  ok: { bg: "var(--success-tint)", fg: "var(--success)", label: "OK", Icon: CheckCircle2 },
  error: { bg: "var(--destructive-tint)", fg: "var(--destructive)", label: "Failed", Icon: XCircle },
  duplicate: { bg: "var(--warning-tint)", fg: "var(--warning)", label: "Duplicate", Icon: AlertTriangle },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.ok;
  const Icon = s.Icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

// A labeled value with its own "Copy" button — used for the one-time
// token/tenant-key reveal so the admin can copy each value straight
// into the local exam server's operator page without hand-transcribing
// it (a likely source of mistyped tenant keys / stuck sync).
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for non-HTTPS / older browsers where the Clipboard
        // API isn't available.
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Copy failed", err);
      alert("Couldn't copy automatically — select the text and copy it manually.");
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
        <code style={{ flex: 1, display: "block", background: "var(--card)", padding: 10, borderRadius: "var(--radius-sm)", wordBreak: "break-all", fontSize: 12.5, border: "1px solid var(--border)" }}>
          {value}
        </code>
        <button
          onClick={doCopy}
          className="profile-btn"
          style={{
            ...S.smallBtnGhost,
            flexShrink: 0,
            background: copied ? "var(--success-tint)" : "var(--bg)",
            color: copied ? "var(--success)" : "var(--text)",
            borderColor: copied ? "var(--success)" : "var(--border)",
          }}
        >
          {copied ? <><ClipboardCheck size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
    </div>
  );
}

export default function LocalSyncPanel({ assessments = [] }) {
  injectStyles();

  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState([]);
  const [justCreatedToken, setJustCreatedToken] = useState(null); // shown once only
  const [busyDeviceId, setBusyDeviceId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [dRes, lRes] = await Promise.all([
        API.get("/local-sync/devices"),
        API.get("/local-sync/logs"),
      ]);
      setDevices(dRes.data.devices || []);
      setLogs(lRes.data.logs || []);
    } catch (err) {
      console.error("Failed to load local sync data", err);
      setLoadError(err?.response?.data?.message || "Couldn't load devices/logs — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const toggleAssessment = (id) => {
    setSelectedAssessmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateDevice = async () => {
    if (!newDeviceName.trim() || !selectedAssessmentIds.length) {
      alert("Give the device a name and pick at least one assessment.");
      return;
    }
    try {
      const res = await API.post("/local-sync/devices", {
        device_name: newDeviceName.trim(),
        assessment_ids: selectedAssessmentIds,
      });
      setJustCreatedToken({ device_name: newDeviceName.trim(), token: res.data.token, tenant_key: res.data.tenant_key });
      setNewDeviceName("");
      setSelectedAssessmentIds([]);
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create device");
    }
  };

  // Sync-activity history only — never touches devices, tokens or any
  // pulled/pushed exam data (see deleteSyncLogs in syncController.js).
  const handleDeleteLogs = async (scope) => {
    const msg = scope === "failed"
      ? "Delete all FAILED entries from the sync activity log?"
      : "Delete the ENTIRE sync activity log? Devices and exam data are not affected.";
    if (!window.confirm(msg)) return;
    try {
      await API.delete(`/local-sync/logs?scope=${scope}`);
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete logs");
    }
  };

  const handleDeleteLog = async (id) => {
    try {
      await API.delete(`/local-sync/logs/${id}`);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete log entry");
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke this device? It will no longer be able to pull or push.")) return;
    setBusyDeviceId(id);
    try {
      await API.put(`/local-sync/devices/${id}/revoke`);
      loadAll();
    } finally {
      setBusyDeviceId(null);
    }
  };

  // Resync path: issues a fresh token for an existing device and
  // re-activates it (works whether it was revoked, or you just want to
  // rotate its token). The device keeps its name, assessment assignments,
  // and history — only the token changes, so the admin doesn't lose
  // context re-registering it from scratch.
  const handleReissue = async (device) => {
    if (!window.confirm(
      device.is_active
        ? `Reissue a new token for "${device.device_name}"? The old token will stop working immediately.`
        : `Reissue a new token for "${device.device_name}" and reactivate it?`
    )) return;
    setBusyDeviceId(device.id);
    try {
      const res = await API.put(`/local-sync/devices/${device.id}/reissue`);
      setJustCreatedToken({ device_name: device.device_name, token: res.data.token, tenant_key: res.data.tenant_key, isReissue: true });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reissue token");
    } finally {
      setBusyDeviceId(null);
    }
  };

  return (
    <div style={S.main}>
      <div style={S.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Server size={19} color="var(--text-secondary)" />
          <h3 style={S.pageTitle}>Local Sync — Offline Exam Servers</h3>
        </div>
        <p style={S.pageSub}>
          Register a local exam server to get it a scoped access token. It uses that token to{" "}
          <strong>pull</strong> a question package while it still has internet, then — once students
          finish offline — <strong>push</strong> the collected answers back here. Nothing else on your
          account is reachable with that token.
        </p>
      </div>

      {loadError && (
        <div style={{ ...S.panel, borderColor: "var(--destructive)", background: "var(--destructive-tint)", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <AlertTriangle size={16} color="var(--destructive)" />
          <span style={{ color: "var(--destructive)", fontWeight: 600, fontSize: 13 }}>{loadError}</span>
          <button onClick={loadAll} className="profile-btn" style={{ ...S.smallBtn, marginLeft: "auto" }}>Retry</button>
        </div>
      )}

      {/* ---- Register a new device ---- */}
      <section style={S.panel}>
        <div style={S.panelHeader}>
          <PlusCircle size={16} color="var(--text-secondary)" />
          <h3 style={S.panelTitle}>Register a new local server</h3>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Device name</label>
          <input
            type="text"
            placeholder="e.g. Computer Lab 2"
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            style={S.input}
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Assessments this server is allowed to sync</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 160, overflowY: "auto", padding: "2px 0" }}>
            {assessments.map((a) => (
              <label key={a.id} style={{
                display: "flex", alignItems: "center", gap: 6, border: `1px solid ${selectedAssessmentIds.includes(a.id) ? "var(--primary)" : "var(--border)"}`,
                background: selectedAssessmentIds.includes(a.id) ? "var(--primary-tint)" : "transparent",
                borderRadius: 999, padding: "5px 10px", fontSize: 12.5, cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={selectedAssessmentIds.includes(a.id)}
                  onChange={() => toggleAssessment(a.id)}
                  style={{ margin: 0 }}
                />
                {a.title}
              </label>
            ))}
            {!assessments.length && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No assessments available yet.</span>}
          </div>
        </div>

        <button onClick={handleCreateDevice} className="profile-btn" style={S.button}>
          <PlusCircle size={15} /> Register &amp; generate token
        </button>
      </section>

      {/* ---- One-time token display ---- */}
      {justCreatedToken && (
        <section style={{ ...S.panel, border: "2px solid var(--warning)", background: "var(--warning-tint)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={16} color="var(--warning)" />
            <strong style={{ color: "var(--warning)", fontSize: 13.5 }}>Copy this token now — it will not be shown again.</strong>
          </div>
          <p style={{ margin: "4px 0 8px", fontSize: 13, color: "var(--text-secondary)" }}>Device: {justCreatedToken.device_name}</p>

          <CopyField label="Sync token" value={justCreatedToken.token} />
          <CopyField label="Tenant key (required alongside the token — see note below)" value={justCreatedToken.tenant_key || "default"} />

          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 10 }}>
            {justCreatedToken.isReissue
              ? <>The old token no longer works. On this machine, apply <strong>both</strong> values above together — via the operator page's "Apply a reissued sync token" fields (token + tenant key), or by updating <code>SYNC_TOKEN</code> and <code>SYNC_TENANT_KEY</code> in its <code>.env</code> file — and resume syncing. Applying the token alone without the tenant key will keep failing.</>
              : <>Enter these as <code>SYNC_TOKEN</code> and <code>SYNC_TENANT_KEY</code> in the local exam server's <code>.env</code> file (or paste both into its operator page). This cloud hosts multiple schools on separate databases, so the tenant key must go in along with the token, or sync will fail.</>}
          </p>
          <button onClick={() => setJustCreatedToken(null)} className="profile-btn" style={{ ...S.smallBtn, marginTop: 10 }}>Done</button>
        </section>
      )}

      {/* ---- Devices table ---- */}
      <section style={S.panel}>
        <div style={S.panelHeader}>
          <Server size={16} color="var(--text-secondary)" />
          <h3 style={S.panelTitle}>Registered devices</h3>
        </div>
        {loading ? (
          <div style={S.loadingState}><Loader2 size={15} className="dash-spin" /> Loading…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr style={S.trHead}>
                  <th style={S.th}>Device</th>
                  <th style={S.th}>Assessments</th>
                  <th style={S.th}>Last pull</th>
                  <th style={S.th}>Last push</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th} />
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} style={S.tr}>
                    <td style={S.td}>{d.device_name}</td>
                    <td style={S.td}>{(d.assessments || []).map((a) => a.title).join(", ") || "—"}</td>
                    <td style={{ ...S.td, color: "var(--text-muted)" }}>{d.last_pull_at ? new Date(d.last_pull_at).toLocaleString() : "never"}</td>
                    <td style={{ ...S.td, color: "var(--text-muted)" }}>{d.last_push_at ? new Date(d.last_push_at).toLocaleString() : "never"}</td>
                    <td style={S.td}>
                      {d.is_active
                        ? <span style={{ ...S.pill, background: "var(--success-tint)", color: "var(--success)" }}><CheckCircle2 size={11} /> Active</span>
                        : <span style={{ ...S.pill, background: "var(--destructive-tint)", color: "var(--destructive)" }}><ShieldOff size={11} /> Revoked</span>}
                    </td>
                    <td style={{ ...S.td, display: "flex", gap: 8 }}>
                      {d.is_active && (
                        <button onClick={() => handleRevoke(d.id)} disabled={busyDeviceId === d.id} className="profile-btn" style={S.smallBtnGhost}>
                          <ShieldOff size={12} /> Revoke
                        </button>
                      )}
                      <button onClick={() => handleReissue(d)} disabled={busyDeviceId === d.id} className="profile-btn" style={S.smallBtnGhost}>
                        {busyDeviceId === d.id ? <Loader2 size={12} className="dash-spin" /> : <RotateCw size={12} />}
                        {d.is_active ? "Rotate token" : "Reissue & resync"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!devices.length && (
                  <tr><td colSpan={6} style={{ ...S.td, color: "var(--text-muted)", textAlign: "center" }}>No local servers registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Sync activity log ---- */}
      <section style={S.panel}>
        <div style={S.panelHeader}>
          <Clock size={16} color="var(--text-secondary)" />
          <h3 style={S.panelTitle}>Recent sync activity</h3>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={loadAll} className="profile-btn" style={S.smallBtnGhost}>Refresh</button>
            <button onClick={() => handleDeleteLogs("failed")} disabled={!logs.some((l) => l.status === "error")} className="profile-btn"
              style={{ ...S.smallBtnGhost, opacity: logs.some((l) => l.status === "error") ? 1 : 0.5 }}>
              Delete failed
            </button>
            <button onClick={() => handleDeleteLogs("all")} disabled={!logs.length} className="profile-btn"
              style={{ ...S.smallBtnGhost, color: "var(--destructive)", opacity: logs.length ? 1 : 0.5 }}>
              <Trash2 size={12} style={{ verticalAlign: -1, marginRight: 4 }} />Delete all
            </button>
          </div>
        </div>
        <p style={{ margin: "-6px 0 12px", fontSize: 12, color: "var(--text-muted)" }}>
          Every pull and push attempt across all devices — successes and failures, with why.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr style={S.trHead}>
                <th style={S.th}>When</th>
                <th style={S.th}>Device</th>
                <th style={S.th}>Direction</th>
                <th style={S.th}>Records</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Details</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={S.tr}>
                  <td style={{ ...S.td, color: "var(--text-muted)" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td style={S.td}>{l.device_name}</td>
                  <td style={S.td}>
                    {l.direction === "pull"
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ArrowDownCircle size={13} color="var(--info)" /> Pull</span>
                      : <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ArrowUpCircle size={13} color="var(--primary)" /> Push</span>}
                  </td>
                  <td style={S.td}>{l.record_count}</td>
                  <td style={S.td}><StatusBadge status={l.status} /></td>
                  <td style={{ ...S.td, color: l.status === "error" ? "var(--destructive)" : "var(--text-muted)", maxWidth: 320 }}>
                    {l.message || (l.status === "ok" ? "—" : "No further detail")}
                  </td>
                  <td style={S.td}>
                    <button onClick={() => handleDeleteLog(l.id)} title="Delete this entry" className="profile-btn" style={{ ...S.smallBtnGhost, padding: "4px 7px" }}>
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={7} style={{ ...S.td, color: "var(--text-muted)", textAlign: "center" }}>No sync activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ================= STYLES ================= */
const S = {
  main: { fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", padding: 4 },
  pageHeader: { marginBottom: 20 },
  pageTitle: { margin: 0, fontSize: 19, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)", maxWidth: 720, lineHeight: 1.6 },

  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "18px 20px", marginBottom: 20, boxShadow: "var(--shadow-sm)",
  },
  panelHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  panelTitle: { margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--text)" },

  loadingState: { display: "flex", alignItems: "center", gap: 10, padding: "16px 0", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 },

  formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" },
  input: {
    padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--bg)", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", width: "100%", maxWidth: 320, boxSizing: "border-box",
  },

  button: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--primary)",
    color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 13.5, fontFamily: "inherit",
  },
  smallBtn: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "var(--primary)",
    color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: "inherit",
  },
  smallBtnGhost: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", background: "var(--bg)",
    color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit",
  },

  pill: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700 },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.8, minWidth: 640 },
  trHead: { textAlign: "left", borderBottom: "1px solid var(--border)" },
  th: { padding: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-secondary)" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: 9, fontSize: 12.8, color: "var(--text)" },
};
