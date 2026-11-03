import React from "react";

/* Shown when the API answers 403 MODULE_NOT_LICENSED (see api.js, which lets that
   code pass through without logging the user out). Reusable by every LMS screen:
     <UpgradePrompt module="lms" flag="lms_quizzes" />
   Use isModuleNotLicensed(error) to decide when to render it. */
export const isModuleNotLicensed = (err) =>
  err?.response?.status === 403 && err?.response?.data?.code === "MODULE_NOT_LICENSED";

export default function UpgradePrompt({ module = "lms", flag = null, onBack }) {
  return (
    <div role="status" style={{ maxWidth: 520, margin: "48px auto", padding: 24, border: "1px solid #E2E5EA", borderRadius: 12, background: "#fff", textAlign: "center", color: "#0f172a" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>This feature is not in your plan yet</h2>
      <p style={{ margin: "0 0 16px", color: "#475569", lineHeight: 1.5 }}>
        {module === "lms" ? "The Learning Management System" : "This module"}
        {flag ? ` (${flag})` : ""} is not included in your institution's licence. Please contact Doravo to enable it.
      </p>
      {onBack && <button type="button" onClick={onBack} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", cursor: "pointer" }}>Go back</button>}
    </div>
  );
}
