import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PasskeyCard from "../components/PasskeyCard";

/* /profile for admin / sub-admin / module-admin accounts (the sidebar profile
   card links here). Students and teachers have their own profile pages, which
   embed the same PasskeyCard. */
export default function AccountSecurity() {
  const navigate = useNavigate();
  let user = {};
  try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 18px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-muted, #64748B)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 style={{ margin: "14px 0 4px", fontSize: 26, fontWeight: 800, color: "var(--text, #0B0F19)" }}>My account</h1>
      <p style={{ margin: 0, color: "var(--text-muted, #64748B)" }}>{user.username} · {user.role}</p>
      <PasskeyCard />
    </main>
  );
}
