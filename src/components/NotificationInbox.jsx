import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { Inbox, CheckCheck, Loader2 } from "lucide-react";

/* Read-side of the notifications system: lists whatever landed in
   Notifications for the logged-in account (admin/Users, teacher/
   Teachers, or student/Students — the API scopes it server-side by
   req.user.id + req.user.source), with mark-read / mark-all-read.

   Deliberately has no header/page-chrome of its own — the page that
   renders it (AdminNotifications' Inbox tab, TeacherNotifications)
   supplies the title/subtitle/back-button so this stays a drop-in
   list for any portal. */
export default function NotificationInbox({ onCountChange }) {
  const navigate = useNavigate();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onCountChange) return;
    onCountChange(notifications.filter((n) => !n.isRead).length);
  }, [notifications, onCountChange]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await API.put(`/notifications/${id}/read`);
    } catch (err) {
      console.log(err);
    }
  };

  // Clicking a notification marks it read (if needed) and, when it
  // carries a link back to the relevant leave/record, takes the user
  // straight there.
  const handleRowClick = (n) => {
    if (!n.isRead) markRead(n.id);
    if (n.link) navigate(n.link);
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
    <div>
      {unreadCount > 0 && (
        <div style={S.toolbar}>
          <button style={S.markAllBtn} onClick={markAllRead} disabled={markingAll}>
            <CheckCheck size={14} />
            {markingAll ? "Marking…" : `Mark all ${unreadCount} as read`}
          </button>
        </div>
      )}

      <div style={S.panel}>
        {loading ? (
          <div style={S.emptyState}>
            <Loader2 size={22} className="dash-spin" color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>Loading notifications…</div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={S.emptyState}>
            <Inbox size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div>No notifications yet</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{ ...S.row, ...(n.isRead ? {} : S.rowUnread), ...(n.link ? S.rowClickable : {}) }}
              onClick={() => handleRowClick(n)}
              role={!n.isRead || n.link ? "button" : undefined}
            >
              <div style={S.rowTop}>
                <span style={S.rowTitle}>
                  {!n.isRead && <span style={S.dot} />}
                  {n.title || "Notification"}
                </span>
                <span style={S.rowTime}>{formatTime(n.createdAt)}</span>
              </div>
              <div style={S.rowMessage}>{n.message}</div>
              {n.createdByName && (
                <div style={S.rowSender}>From {n.createdByName}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const S = {
  toolbar: { display: "flex", justifyContent: "flex-end", marginBottom: 12 },
  markAllBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)",
    padding: "8px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 12.5,
  },
  panel: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "20px 22px", boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600,
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  row: { padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5, color: "var(--text)", cursor: "pointer" },
  rowClickable: { cursor: "pointer" },
  rowUnread: { background: "var(--primary-tint)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 2 },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 3 },
  rowTitle: { display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--text)" },
  rowTime: { fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0 },
  rowMessage: { color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 },
  rowSender: { color: "var(--text-muted)", fontSize: 11.5, fontWeight: 600, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", display: "inline-block" },
};
