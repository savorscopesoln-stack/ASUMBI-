import { useEffect } from "react";

/* Pure helpers for the lesson editor (L3.1b): block labels, server<->editor mapping, validation, unload guard. */

export const BLOCK_LABEL = { text: "Text", image: "Image", video: "Video", audio: "Audio", file: "File", link: "Link", embed: "Embed (YouTube/Vimeo)", divider: "Divider" };
export const ADDABLE = ["text", "image", "video", "audio", "file", "link", "embed", "divider"];
export const ACCEPT = { image: "image/*", video: "video/*", audio: "audio/*", file: "" };

let keySeq = 0;
export const newKey = () => `b${++keySeq}`;

/* Server blocks -> editor blocks (local key added; id/sortOrder dropped). */
export const fromServer = (list) => (list || []).map((b) => ({ k: newKey(), type: b.type, html: b.html, url: b.url, title: b.title, alt: b.alt, decorative: !!b.decorative, caption: b.caption }));
export const emptyBlock = (type) => ({ k: newKey(), type, html: type === "text" ? "<p></p>" : undefined, url: "", title: "", alt: "", decorative: false, caption: "" });

/* Editor blocks -> exactly the fields the server accepts for that type. */
export function toPayload(blocks) {
  return blocks.map((b) => {
    switch (b.type) {
      case "text": return { type: "text", html: b.html || "<p></p>" };
      case "divider": return { type: "divider" };
      case "image": { const o = { type: "image", url: b.url, decorative: !!b.decorative }; if (b.alt) o.alt = b.alt; if (b.caption) o.caption = b.caption; return o; }
      default: { const o = { type: b.type, url: b.url }; if (b.title) o.title = b.title; return o; }
    }
  });
}


/* Used by the editor to know whether the user has anything the server would reject for being empty. */
export function blockProblems(blocks) {
  const out = [];
  blocks.forEach((b, i) => {
    if (["image", "video", "audio", "file", "link", "embed"].includes(b.type) && !(b.url || "").trim()) out.push(`Block ${i + 1} (${BLOCK_LABEL[b.type].toLowerCase()}) needs a file or address.`);
    if (b.type === "image" && !b.decorative && !(b.alt || "").trim()) out.push(`Block ${i + 1} (image) needs a description, or tick "only decoration".`);
  });
  return out;
}

export function useBeforeUnload(active) {
  useEffect(() => {
    if (!active) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [active]);
}
