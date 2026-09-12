import React, { useEffect, useState } from "react";
import API from "../../api"; // adjust relative path to wherever api.js lives from this file's location

/* ═══════════════════════════════════════════════════════════
   LOCAL SYNC PANEL
   Drop this in as a new tab inside AdminEAssessments.jsx:

     import LocalSyncPanel from "../components/eassessment/LocalSyncPanel";
     const TABS = [ ...existing tabs..., { label: "Local Sync", icon: IconServer } ];
     {activeTab === 5 && <LocalSyncPanel assessments={list} />}

   `assessments` = the same `list` array AdminEAssessments already loads
   (needs at least { id, title }).
═══════════════════════════════════════════════════════════ */
export default function LocalSyncPanel({ assessments = [] }) {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState([]);
  const [justCreatedToken, setJustCreatedToken] = useState(null); // shown once only

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dRes, lRes] = await Promise.all([
        API.get("/local-sync/devices"),
        API.get("/local-sync/logs"),
      ]);
      setDevices(dRes.data.devices || []);
      setLogs(lRes.data.logs || []);
    } catch (err) {
      console.error("Failed to load local sync data", err);
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
      setJustCreatedToken({ device_name: newDeviceName.trim(), token: res.data.token });
      setNewDeviceName("");
      setSelectedAssessmentIds([]);
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create device");
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke this device? It will no longer be able to pull or push.")) return;
    await API.put(`/local-sync/devices/${id}/revoke`);
    loadAll();
  };

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ marginBottom: 4 }}>Local Sync — Offline Exam Servers</h3>
      <p style={{ color: "#777", marginBottom: 20, maxWidth: 700 }}>
        Register a local exam server here to get it a scoped access token.
        The local server uses that token to <strong>pull</strong> a question
        package for its assigned assessment(s) while it still has internet,
        then — once students finish offline — <strong>push</strong> the
        collected answers back here. Nothing else on your account is
        reachable with that token.
      </p>

      {/* ---- Register a new device ---- */}
      <div style={{ border: "1px solid #e2e2e2", borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <h4 style={{ marginTop: 0 }}>Register a new local server</h4>
        <input
          type="text"
          placeholder="e.g. Computer Lab 2"
          value={newDeviceName}
          onChange={(e) => setNewDeviceName(e.target.value)}
          style={{ padding: 8, width: 280, marginBottom: 12, display: "block" }}
        />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
            Assessments this server is allowed to sync:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 160, overflowY: "auto" }}>
            {assessments.map((a) => (
              <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #ddd", borderRadius: 6, padding: "4px 8px" }}>
                <input
                  type="checkbox"
                  checked={selectedAssessmentIds.includes(a.id)}
                  onChange={() => toggleAssessment(a.id)}
                />
                {a.title}
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleCreateDevice} style={{ padding: "8px 16px" }}>
          Register &amp; generate token
        </button>
      </div>

      {/* ---- One-time token display ---- */}
      {justCreatedToken && (
        <div style={{ border: "2px solid #d97706", background: "#fffbeb", borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <strong>Copy this token now — it will not be shown again.</strong>
          <p style={{ margin: "8px 0" }}>Device: {justCreatedToken.device_name}</p>
          <code style={{ display: "block", background: "#fff", padding: 10, borderRadius: 6, wordBreak: "break-all" }}>
            {justCreatedToken.token}
          </code>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
            Enter this as <code>SYNC_TOKEN</code> in the local exam server's <code>.env</code> file.
          </p>
          <button onClick={() => setJustCreatedToken(null)} style={{ marginTop: 8 }}>Done</button>
        </div>
      )}

      {/* ---- Devices table ---- */}
      <h4>Registered devices</h4>
      {loading ? <p>Loading…</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: 8 }}>Device</th>
              <th style={{ padding: 8 }}>Assessments</th>
              <th style={{ padding: 8 }}>Last pull</th>
              <th style={{ padding: 8 }}>Last push</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 8 }}>{d.device_name}</td>
                <td style={{ padding: 8 }}>{(d.assessments || []).map((a) => a.title).join(", ") || "—"}</td>
                <td style={{ padding: 8 }}>{d.last_pull_at ? new Date(d.last_pull_at).toLocaleString() : "never"}</td>
                <td style={{ padding: 8 }}>{d.last_push_at ? new Date(d.last_push_at).toLocaleString() : "never"}</td>
                <td style={{ padding: 8 }}>{d.is_active ? "Active" : "Revoked"}</td>
                <td style={{ padding: 8 }}>
                  {d.is_active && <button onClick={() => handleRevoke(d.id)}>Revoke</button>}
                </td>
              </tr>
            ))}
            {!devices.length && (
              <tr><td colSpan={6} style={{ padding: 8, color: "#888" }}>No local servers registered yet.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* ---- Sync activity log ---- */}
      <h4>Recent sync activity</h4>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>When</th>
            <th style={{ padding: 8 }}>Device</th>
            <th style={{ padding: 8 }}>Direction</th>
            <th style={{ padding: 8 }}>Records</th>
            <th style={{ padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{new Date(l.createdAt).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{l.device_name}</td>
              <td style={{ padding: 8 }}>{l.direction === "pull" ? "⬇ Pull" : "⬆ Push"}</td>
              <td style={{ padding: 8 }}>{l.record_count}</td>
              <td style={{ padding: 8 }}>{l.status}</td>
            </tr>
          ))}
          {!logs.length && (
            <tr><td colSpan={5} style={{ padding: 8, color: "#888" }}>No sync activity yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
