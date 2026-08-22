import React from "react";
import { Bell } from "lucide-react";
import NotificationInbox from "../../components/NotificationInbox";

/* TeacherLayout now injects the shared "dash-tokens" stylesheet
   (same one Student/Admin use), so NotificationInbox's CSS
   variables resolve to the normal light/dark theme automatically —
   no scoped dark override needed here anymore. Just make sure the
   spinner keyframe it references exists. */
const injectSpinKeyframe = () => {
  if (document.getElementById("dash-spin-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-spin-tokens";
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }
  `;
  document.head.appendChild(el);
};

export default function TeacherNotifications() {
  injectSpinKeyframe();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Bell size={19} color="var(--primary)" />
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: -0.01 }}>Notifications</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>Alerts from the admin portal and the system.</p>
        </div>
      </div>

      <NotificationInbox />
    </div>
  );
}
