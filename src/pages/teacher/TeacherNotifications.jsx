import React from "react";
import { Bell } from "lucide-react";
import NotificationInbox from "../../components/NotificationInbox";

/* TeacherLayout doesn't inject the shared "dash-tokens" stylesheet
   that NotificationInbox's CSS variables (--card, --border, --text…)
   rely on — the teacher portal has its own dark red/black theme
   entirely in inline styles instead. Rather than pull the whole
   light-mode token sheet into a dark portal, scope just the variables
   NotificationInbox actually uses to teacher-appropriate dark values,
   plus the "dash-spin" keyframe its loading spinner references. */
const injectScopedTokens = () => {
  if (document.getElementById("teacher-notif-tokens")) return;
  const el = document.createElement("style");
  el.id = "teacher-notif-tokens";
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    .teacher-notif-scope {
      --bg: transparent;
      --card: rgba(255,255,255,0.04);
      --card-elevated: rgba(255,255,255,0.07);
      --border: rgba(255,255,255,0.12);
      --text: #ffffff;
      --text-secondary: #d4d4d8;
      --text-muted: #9a9a9a;
      --primary: #f87171;
      --primary-tint: rgba(185,28,28,0.22);
      --destructive: #f87171;
      --shadow-sm: none;
      --shadow: none;
      --radius: 14px;
      --radius-sm: 10px;
    }
  `;
  document.head.appendChild(el);
};

export default function TeacherNotifications() {
  injectScopedTokens();

  return (
    <div className="teacher-notif-scope">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Bell size={19} color="#f87171" />
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 0.3 }}>Notifications</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#9a9a9a" }}>Alerts from the admin portal and the system.</p>
        </div>
      </div>

      <NotificationInbox />
    </div>
  );
}
