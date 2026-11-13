import React from "react";
import { resolveFileUrl } from "../api";

/* =========================================================================
   DOWNLOAD BRANDING — the top of the public download page (/report-download)

     [school logo]      SCHOOL NAME      [government logo]
     ┌───────────────────────────────────────────────────┐
     │  the admin's typed message, in big letters        │
     └───────────────────────────────────────────────────┘
     ┌ Downloads are not open yet. They open on …        ┐   (only when closed)

   `info` is the answer of GET /report-access/info (public, no login):
     { notice, state: "open" | "not_open" | "closed", message, closesAt,
       school: { name, logoUrl, governmentLogoUrl } }

   The message is typed by the admin in Main Examinations → Report Download
   Link → "Message on the download page".

   Props
     info         the /report-access/info answer (null while loading: nothing is drawn)
     showLogos    draw the logo row (default true)
     showStatus   draw the open / closed banner (default true)
     profileHint  extra line in the closed banner: "you can still update your profile"
========================================================================= */

const fmtWhen = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; }
};

const LOGO = 68;

const S = {
  root: { width: "100%", display: "flex", flexDirection: "column", gap: 14 },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  logoSlot: { flex: `0 0 ${LOGO}px`, width: LOGO, height: LOGO, display: "flex", alignItems: "center", justifyContent: "center" },
  logo: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  name: { flex: 1, minWidth: 0, textAlign: "center", fontSize: 15, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", lineHeight: 1.3, color: "var(--text, #0f172a)", overflowWrap: "anywhere" },
  // Fixed light colours on purpose: the message must stay clear and readable in the dark theme too.
  notice: { padding: "18px 18px 20px", borderRadius: 14, background: "#fffbeb", border: "2px solid #f59e0b", borderLeftWidth: 8, color: "#451a03", boxShadow: "0 6px 22px rgba(180,83,9,0.12)" },
  noticeTag: { margin: "0 0 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b45309" },
  noticeText: { margin: 0, fontSize: "clamp(20px, 5.4vw, 27px)", fontWeight: 800, lineHeight: 1.35, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  closed: { padding: "12px 14px", borderRadius: 11, background: "#fef2f2", border: "1px solid #fecaca", color: "#7f1d1d", fontSize: 14, lineHeight: 1.5 },
  soon: { padding: "12px 14px", borderRadius: 11, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", fontSize: 14, lineHeight: 1.5 },
  open: { padding: "9px 14px", borderRadius: 11, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#14532d", fontSize: 13.5, fontWeight: 600 },
  bannerTitle: { margin: "0 0 3px", fontSize: 15, fontWeight: 800 },
};

function Logo({ url }) {
  if (!url) return <div style={S.logoSlot} aria-hidden="true" />;
  return (
    <div style={S.logoSlot}>
      <img src={resolveFileUrl(url)} alt="" style={S.logo}
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
    </div>
  );
}

export default function DownloadBranding({ info, showLogos = true, showStatus = true, profileHint = false }) {
  if (!info) return null;
  const school = info.school || {};
  const hasLogos = !!(school.logoUrl || school.governmentLogoUrl);
  const notice = String(info.notice || "").trim();
  const state = info.state || "open";

  return (
    <div style={S.root}>
      {showLogos && (hasLogos || school.name) && (
        <div style={S.head}>
          <Logo url={school.logoUrl} />
          <div style={S.name}>{school.name}</div>
          <Logo url={school.governmentLogoUrl} />
        </div>
      )}

      {notice && (
        <div style={S.notice} role="status">
          <p style={S.noticeTag}>Important message</p>
          <p style={S.noticeText}>{notice}</p>
        </div>
      )}

      {showStatus && state !== "open" && (
        <div style={state === "closed" ? S.closed : S.soon} role="status">
          <p style={S.bannerTitle}>{state === "closed" ? "Downloads are closed" : "Downloads are not open yet"}</p>
          <div>{info.message}</div>
          {profileHint && state !== "closed" && (
            <div style={{ marginTop: 6 }}>You can still update your profile details below, so you are ready when downloads open.</div>
          )}
          {profileHint && state === "closed" && (
            <div style={{ marginTop: 6 }}>If your profile details are not filled in yet, you can still update them below.</div>
          )}
        </div>
      )}

      {showStatus && state === "open" && info.closesAt && (
        <div style={S.open}>Downloads are open now · they close on {fmtWhen(info.closesAt)}.</div>
      )}
    </div>
  );
}
