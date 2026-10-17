import API, { resolveFileUrl } from "../api";

/* =========================================================
   schoolInfo
   One place for every non-React report (jsPDF exports, print
   windows) to get the school's details from School Settings,
   instead of hard-coding a school name into each document.

   getSchoolInfo()            -> { name, shortName, motto, address,
                                   phone, email, website, logoUrl,
                                   logoDataUrl, contactLine }
   drawSchoolHeader(doc, info) -> draws logo + name + contact lines
                                   at the top of a jsPDF page and
                                   returns the y (in doc units) to
                                   continue from.
   schoolHeaderHtml(info)     -> same header as an HTML string for
                                   documents built in a print window.
========================================================= */

let cache = null;
let inFlight = null;

const toDataUrl = async (url) => {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null; // a missing/blocked logo must never stop a report from downloading
  }
};

/* Sync version for the useSchoolSettings() hook value — print windows must be
   opened synchronously from the click (awaiting first gets them popup-blocked). */
export function schoolInfoFromSettings(s) {
  const info = {
    name: s?.schoolName || "",
    shortName: s?.shortName || "",
    motto: s?.motto || "",
    address: s?.address || "",
    phone: s?.phone || "",
    email: s?.email || "",
    website: s?.website || "",
    logoUrl: s?.logoUrl ? resolveFileUrl(s.logoUrl) : null,
    logoDataUrl: null,
  };
  info.contactLine = [
    info.address,
    info.phone && `Tel: ${info.phone}`,
    info.email && `Email: ${info.email}`,
    info.website,
  ].filter(Boolean).join("  |  ");
  return info;
}

export async function getSchoolInfo() {
  if (cache) return cache;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    let s = null;
    try {
      const res = await API.get("/school-settings");
      s = res.data?.settings || null;
    } catch { /* fall through to an empty header */ }
    const logoUrl = s?.logoUrl ? resolveFileUrl(s.logoUrl) : null;
    const logoDataUrl = logoUrl ? await toDataUrl(logoUrl) : null;
    const info = {
      name: s?.schoolName || "",
      shortName: s?.shortName || "",
      motto: s?.motto || "",
      address: s?.address || "",
      phone: s?.phone || "",
      email: s?.email || "",
      website: s?.website || "",
      logoUrl,
      logoDataUrl,
    };
    info.contactLine = [
      info.address,
      info.phone && `Tel: ${info.phone}`,
      info.email && `Email: ${info.email}`,
      info.website,
    ].filter(Boolean).join("  |  ");
    // only cache a real answer, so a failed first load is retried next time
    if (s) cache = info;
    return info;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

/* Draws the school block (logo left, name/motto/contact centred, rule under it).
   All sizes are given in points and converted to the document's own unit, so it
   works for both `new jsPDF()` (mm) and `{ unit: "pt" }` documents.
   Returns the y position (in doc units) just below the block. */
export function drawSchoolHeader(doc, info, { margin, top, color = [139, 30, 45] } = {}) {
  const k = doc.internal.scaleFactor; // points per doc unit
  const u = (pt) => pt / k;
  const pageW = doc.internal.pageSize.getWidth();
  const m = margin ?? u(36);
  const y0 = top ?? u(26);
  const LOGO = u(46);

  if (!info || (!info.name && !info.contactLine && !info.logoDataUrl)) return y0;

  if (info.logoDataUrl) {
    try {
      const fmt = /^data:image\/jpe?g/i.test(info.logoDataUrl) ? "JPEG" : "PNG";
      doc.addImage(info.logoDataUrl, fmt, m, y0 - u(6), LOGO, LOGO);
    } catch { /* unsupported image: skip the logo, keep the text */ }
  }

  // keep the text centred on the page but clear of the logo on both sides
  const textW = pageW - 2 * (m + LOGO + u(8));
  const cx = pageW / 2;
  let y = y0 + u(6);

  if (info.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(info.name.toUpperCase(), textW);
    doc.text(lines, cx, y, { align: "center" });
    y += lines.length * u(16);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  if (info.motto) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize(`"${info.motto}"`, textW), cx, y, { align: "center" });
    y += u(11);
    doc.setFont("helvetica", "normal");
  }
  if (info.contactLine) {
    doc.setTextColor(90, 90, 90);
    const lines = doc.splitTextToSize(info.contactLine, textW);
    doc.text(lines, cx, y, { align: "center" });
    y += lines.length * u(10);
  }

  y = Math.max(y, y0 - u(6) + LOGO) + u(4);
  doc.setDrawColor(...color);
  doc.setLineWidth(u(1.2));
  doc.line(m, y, pageW - m, y);
  doc.setTextColor(0, 0, 0);
  return y + u(10);
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Same header as HTML, for documents opened in a print window. */
export function schoolHeaderHtml(info, color = "#8B1E2D") {
  if (!info) return "";
  return `
    <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid ${color};padding-bottom:8px;margin-bottom:12px;">
      ${info.logoUrl ? `<img src="${esc(info.logoUrl)}" alt="" style="width:54px;height:54px;object-fit:contain;" />` : ""}
      <div style="flex:1;text-align:center;">
        <div style="font-size:17px;font-weight:800;text-transform:uppercase;">${esc(info.name)}</div>
        ${info.motto ? `<div style="font-size:11px;font-style:italic;color:#555;">"${esc(info.motto)}"</div>` : ""}
        ${info.contactLine ? `<div style="font-size:11px;color:#555;">${esc(info.contactLine)}</div>` : ""}
      </div>
      ${info.logoUrl ? `<div style="width:54px;"></div>` : ""}
    </div>`;
}
