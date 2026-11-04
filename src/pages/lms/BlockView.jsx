import React from "react";
import { resolvePhotoUrl } from "../../api";
import { C } from "./lmsUtil";

/* Read-only rendering of lesson blocks (L3.1b). Used by the teacher "Preview as student" and, later, the student lesson player.
   Text html is ALREADY sanitised by the server on every save and every read (allow-list), so it is safe to inject here.
   Media urls are local uploads (resolved against the backend origin) or YouTube/Vimeo links; embeds are sandboxed. */

const resolveMedia = (u) => resolvePhotoUrl(u);

export function BlockView({ block: b, urlMap }) {
  const media = (u) => (urlMap && urlMap.get(u)) || resolveMedia(u); // urlMap: blob URLs of files saved on the device (offline reading)
  switch (b.type) {
    case "text":
      return <div className="lms-richtext" style={{ lineHeight: 1.6, overflowWrap: "anywhere" }} dangerouslySetInnerHTML={{ __html: b.html || "" }} />;
    case "divider":
      return <hr style={{ border: 0, borderTop: `1px solid ${C.border}`, margin: "18px 0" }} />;
    case "image":
      return (
        <figure style={{ margin: "14px 0" }}>
          <img src={media(b.url)} alt={b.decorative ? "" : b.alt || ""} loading="lazy" style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }} />
          {b.caption && <figcaption style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{b.caption}</figcaption>}
        </figure>
      );
    case "video":
      return /^https?:\/\//i.test(b.url || "")
        ? <Frame url={b.url} title={b.title || "Video"} />
        : <figure style={{ margin: "14px 0" }}>{b.title && <figcaption style={{ fontWeight: 600, marginBottom: 4 }}>{b.title}</figcaption>}<video controls preload="metadata" src={media(b.url)} style={{ maxWidth: "100%", borderRadius: 8 }} /></figure>;
    case "audio":
      return <figure style={{ margin: "14px 0" }}>{b.title && <figcaption style={{ fontWeight: 600, marginBottom: 4 }}>{b.title}</figcaption>}<audio controls preload="none" src={media(b.url)} style={{ width: "100%" }} /></figure>;
    case "embed":
      return <Frame url={b.url} title={b.title || "Embedded video"} />;
    case "file":
      return <p style={{ margin: "12px 0" }}><a href={media(b.url)} target="_blank" rel="noopener noreferrer" download>Download: {b.title || "file"}</a></p>;
    case "link":
      return <p style={{ margin: "12px 0" }}><a href={b.url} target="_blank" rel="noopener noreferrer">{b.title || b.url}</a></p>;
    default:
      return null;
  }
}

function Frame({ url, title }) {
  return (
    <div style={{ position: "relative", paddingTop: "56.25%", margin: "14px 0", borderRadius: 8, overflow: "hidden", background: C.border }}>
      <iframe src={url} title={title} loading="lazy" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
    </div>
  );
}

export function BlockList({ blocks, urlMap }) {
  if (!blocks?.length) return <p style={{ color: C.muted }}>This lesson has no content yet.</p>;
  return <div>{blocks.map((b, i) => <BlockView key={b.id ?? i} block={b} urlMap={urlMap} />)}</div>;
}
