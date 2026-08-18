import React, { useEffect, useState } from "react";
import API from "../../api";
import { Bell, Inbox, CheckCheck, Loader2 } from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted by the layout or
   another page. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
  `;
  document.head.appendChild(el);
};

export default function StudentNotifications() {
  injectStyles();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id) => {
    // instant UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await API.put(`/notifications/${id}/read`);
    } catch (err) {
      console.log(err);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await API.put("/notifications/read-all");
    } catch (err) {
      console.log(err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatTime = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <main className="dash-main" style={D.main}>
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={20} color="var(--primary)" />
          <div>
            <h1 style={D.pageTitle}>Notifications</h1>
            <p style={D.pageSub}>Alerts and updates from the campus system</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button style={D.markAllBtn} onClick={markAllRead} disabled={markingAll}>
            <CheckCheck size={14} />
            {markingAll ? "Marking…" : `Mark all ${unreadCount} as read`}
          </button>
        )}
      </header>

      <section style={D.panel}>
        {loading ? (
          <div style={D.emptyState}>
            <Loader2 size={22} className="dash-spin" color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>Loading notifications…</div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={D.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No notifications yet</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{ ...D.row, ...(n.isRead ? {} : D.rowUnread) }}
              onClick={() => !n.isRead && markRead(n.id)}
              role={!n.isRead ? "button" : undefined}
            >
              <div style={D.rowTop}>
                <span style={D.rowTitle}>
                  {!n.isRead && <span style={D.dot} />}
                  {n.title || "Notification"}
                </span>
                <span style={D.rowTime}>{formatTime(n.createdAt)}</span>
              </div>
              <div style={D.rowMessage}>{n.message}</div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  pageHeader: {
    marginBottom: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },
  markAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12.5,
  },
  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  row: {
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
    fontSize: 13.5,
    color: "var(--text)",
    cursor: "pointer",
  },
  rowUnread: {
    background: "var(--primary-tint)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginBottom: 2,
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 3,
  },
  rowTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 700,
    color: "var(--text)",
  },
  rowTime: { fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0 },
  rowMessage: { color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--primary)",
    display: "inline-block",
  },
};