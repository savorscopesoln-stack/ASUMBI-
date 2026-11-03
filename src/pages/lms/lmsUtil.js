import { useEffect, useState } from "react";
import API from "../../api";
import { isModuleNotLicensed } from "../../components/UpgradePrompt";

/* Non-component helpers for the LMS screens (L2.6): theme colours, shared styles, error text and hooks.
   Colours come from the portal's CSS variables (with light fallbacks) so the screens follow light/dark theme. */

export const C = {
  card: "var(--card, #fff)", border: "var(--border, #E2E5EA)", text: "var(--text, #0f172a)",
  muted: "var(--muted, #475569)", accent: "var(--accent, #1d4ed8)",
};
export const S = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "4px 0 40px", color: C.text },
  h1: { fontSize: 22, margin: "0 0 4px" },
  sub: { margin: "0 0 16px", color: C.muted, fontSize: 14 },
  box: { border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.card },
  input: { padding: "9px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text, fontSize: 14, boxSizing: "border-box", minHeight: 40 },
  btn: { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 14, minHeight: 40 },
  btnPrimary: { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.accent}`, background: C.accent, color: "#fff", cursor: "pointer", fontSize: 14, minHeight: 40 },
  label: { display: "block", fontSize: 13, fontWeight: 600, margin: "10px 0 4px" },
};

/* Plain-language message from an API error. 403/409/400 messages are written for end users by the backend. */
export function errText(e, fallback = "Something went wrong. Please try again.") {
  if (!e?.response) return "Could not reach the server. Check your connection and try again.";
  return e.response.data?.message || fallback;
}
export { isModuleNotLicensed };

/* Tenant terminology (settings.terminology.course, e.g. "Subject"). Falls back to "Course". */
export function useCourseLabel() {
  const [one, setOne] = useState("Course");
  useEffect(() => {
    let alive = true;
    API.get("/lms/settings/public").then((r) => { const t = r.data?.settings?.terminology?.course; if (alive && t) setOne(String(t)); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return { one, many: /s$/i.test(one) ? one : `${one}s` };
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

