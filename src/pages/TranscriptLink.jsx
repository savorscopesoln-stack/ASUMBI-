import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";

/* =========================================================================
   TRANSCRIPT LINK PAGE  —  /t/:token   (public, no login)

   Opened from the link a school sends a student. The token is sent as a Bearer
   token to GET /auth/transcript-link, which returns that one student's
   transcript PDF; the page saves it and also keeps a "Download again" button.
   Nothing is stored in the browser, and no one is signed in or out.
========================================================================= */
export default function TranscriptLink() {
  const { token } = useParams();
  const [state, setState] = useState({ status: "loading", message: "" });
  const file = useRef(null);

  const save = useCallback(() => {
    if (!file.current) return;
    const url = window.URL.createObjectURL(file.current.blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.current.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get("/auth/transcript-link", {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });
        if (cancelled) return;
        const disposition = res.headers?.["content-disposition"] || "";
        const name = /filename="?([^"]+)"?/i.exec(disposition)?.[1] || "transcript.pdf";
        file.current = { blob: new Blob([res.data], { type: "application/pdf" }), name };
        setState({ status: "ready", message: "" });
        save();
      } catch (err) {
        let message = "This link could not be opened. Please check your connection and try again.";
        try {
          const text = await err?.response?.data?.text?.();
          if (text) message = JSON.parse(text).message || message;
        } catch { /* keep the generic message */ }
        if (!cancelled) setState({ status: "error", message });
      }
    })();
    return () => { cancelled = true; };
  }, [token, save]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" }}>
      <div style={{ maxWidth: 420, textAlign: "center", background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 14, padding: "28px 24px" }}>
        {state.status === "loading" && <p style={{ margin: 0, fontWeight: 600 }}>Preparing your transcript…</p>}
        {state.status === "ready" && (
          <>
            <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>Your transcript is ready</p>
            <p style={{ margin: "0 0 16px", color: "var(--text-muted, #64748b)", lineHeight: 1.5 }}>It should have downloaded automatically. If not, use the button below.</p>
            <button type="button" onClick={save} style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, background: "var(--primary, #6366f1)", color: "var(--on-primary, #fff)" }}>
              Download again
            </button>
          </>
        )}
        {state.status === "error" && (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Can't open this transcript</p>
            <p style={{ margin: 0, color: "var(--text-muted, #64748b)", lineHeight: 1.5 }}>{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
