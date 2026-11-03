import React, { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import API from "../../api";
import { C, S, errText } from "./lmsUtil";
import { BLOCK_LABEL, ADDABLE, ACCEPT, emptyBlock } from "./blockModel";

/* Editing side of lesson blocks (L3.1b). Block types and their allowed fields mirror backend/utils/lmsLessons.js
   (KEYS). Anything the server does not accept is never sent (see toPayload). The server sanitises again on save. */

/* ------------------------------- text block ------------------------------- */
function Tool({ label, active, run, disabled }) {
  return (
    <button type="button" aria-pressed={!!active} aria-label={label} title={label} disabled={disabled} onClick={run}
      style={{ ...S.btn, padding: "4px 10px", minHeight: 34, fontWeight: active ? 700 : 400, borderColor: active ? C.accent : C.border, color: active ? C.accent : C.text }}>{label}</button>
  );
}

function TextBlock({ block, onChange, label }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] } }), Underline, Placeholder.configure({ placeholder: "Write the lesson text here…" })],
    content: block.html || "<p></p>",
    editorProps: { attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true", style: "min-height:90px;outline:none;padding:10px;line-height:1.6" } },
    onUpdate: ({ editor: ed }) => onChange({ html: ed.getHTML() }),
  });
  if (!editor) return <div style={{ minHeight: 120 }} />;
  const c = (fn) => () => fn(editor.chain().focus()).run();
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8 }}>
      <div role="toolbar" aria-label="Text formatting" style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: 6, borderBottom: `1px solid ${C.border}` }}>
        <Tool label="Bold" active={editor.isActive("bold")} run={c((x) => x.toggleBold())} />
        <Tool label="Italic" active={editor.isActive("italic")} run={c((x) => x.toggleItalic())} />
        <Tool label="Underline" active={editor.isActive("underline")} run={c((x) => x.toggleUnderline())} />
        <Tool label="Heading" active={editor.isActive("heading", { level: 2 })} run={c((x) => x.toggleHeading({ level: 2 }))} />
        <Tool label="Subheading" active={editor.isActive("heading", { level: 3 })} run={c((x) => x.toggleHeading({ level: 3 }))} />
        <Tool label="Bullets" active={editor.isActive("bulletList")} run={c((x) => x.toggleBulletList())} />
        <Tool label="Numbers" active={editor.isActive("orderedList")} run={c((x) => x.toggleOrderedList())} />
        <Tool label="Quote" active={editor.isActive("blockquote")} run={c((x) => x.toggleBlockquote())} />
        <Tool label="Undo" run={c((x) => x.undo())} disabled={!editor.can().undo()} />
        <Tool label="Redo" run={c((x) => x.redo())} disabled={!editor.can().redo()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/* ------------------------------ media fields ------------------------------ */
function UrlField({ courseId, block, onChange, label, allowUpload, setMsg }) {
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const fileRef = useRef(null);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await API.post(`/lms/courses/${courseId}/media`, fd);
      onChange({ url: r.data.file.url, title: block.title || (block.type === "image" ? undefined : r.data.file.name) });
      setList(null);
      setMsg({ ok: true, text: `Uploaded ${r.data.file.name}.` });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Upload failed.") }); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const loadList = async () => {
    try { const r = await API.get(`/lms/courses/${courseId}/media`, { params: { pageSize: 50 } }); setList((r.data.items || []).filter((f) => block.type === "file" || f.kind === block.type)); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };
  const id = `${block.k}-url`;
  return (
    <div>
      <label style={S.label} htmlFor={id}>{label}</label>
      <input id={id} value={block.url || ""} onChange={(e) => onChange({ url: e.target.value })} maxLength={600} style={{ ...S.input, width: "100%" }}
        placeholder={allowUpload ? "Upload a file, or paste an address" : "https://…"} />
      {allowUpload && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <input ref={fileRef} type="file" accept={ACCEPT[block.type] || undefined} disabled={busy} onChange={(e) => upload(e.target.files?.[0])} aria-label={`Upload ${BLOCK_LABEL[block.type].toLowerCase()} file`} style={{ fontSize: 13, maxWidth: "100%" }} />
          {busy && <span role="status" style={{ fontSize: 13, color: C.muted }}>Uploading…</span>}
          <button type="button" style={S.btn} onClick={loadList}>Choose from uploaded</button>
        </div>
      )}
      {list && (list.length === 0
        ? <p style={{ fontSize: 13, color: C.muted }}>Nothing uploaded yet.</p>
        : <select aria-label="Uploaded files" style={{ ...S.input, width: "100%", marginTop: 8 }} defaultValue="" onChange={(e) => { const f = list.find((x) => String(x.id) === e.target.value); if (f) { onChange({ url: f.url, title: block.title || (block.type === "image" ? undefined : f.name) }); setList(null); } }}>
          <option value="" disabled>Select a file…</option>
          {list.map((f) => <option key={f.id} value={f.id}>{f.name} ({Math.max(1, Math.round(f.sizeBytes / 1024))} KB)</option>)}
        </select>)}
    </div>
  );
}

function BlockBody({ courseId, block, onChange, setMsg, index }) {
  const t = block.type;
  const titleField = (lbl) => (
    <div><label style={S.label} htmlFor={`${block.k}-t`}>{lbl}</label><input id={`${block.k}-t`} value={block.title || ""} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} style={{ ...S.input, width: "100%" }} /></div>
  );
  if (t === "text") return <TextBlock block={block} onChange={onChange} label={`Text block ${index + 1}`} />;
  if (t === "divider") return <hr style={{ border: 0, borderTop: `2px dashed ${C.border}`, margin: "8px 0" }} />;
  if (t === "image") return (
    <div>
      <UrlField courseId={courseId} block={block} onChange={onChange} label="Image" allowUpload setMsg={setMsg} />
      <label style={S.label} htmlFor={`${block.k}-alt`}>Describe the image (for screen readers)</label>
      <input id={`${block.k}-alt`} value={block.alt || ""} onChange={(e) => onChange({ alt: e.target.value })} maxLength={300} disabled={block.decorative} style={{ ...S.input, width: "100%" }} />
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, margin: "8px 0" }}>
        <input type="checkbox" checked={block.decorative} onChange={(e) => onChange({ decorative: e.target.checked, alt: e.target.checked ? "" : block.alt })} /> This image is only decoration
      </label>
      <label style={S.label} htmlFor={`${block.k}-cap`}>Caption (optional)</label>
      <input id={`${block.k}-cap`} value={block.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} maxLength={300} style={{ ...S.input, width: "100%" }} />
    </div>
  );
  if (t === "video") return <div><UrlField courseId={courseId} block={block} onChange={onChange} label="Video file, or YouTube/Vimeo address" allowUpload setMsg={setMsg} />{titleField("Title (optional)")}</div>;
  if (t === "audio" || t === "file") return <div><UrlField courseId={courseId} block={block} onChange={onChange} label={t === "audio" ? "Audio" : "File"} allowUpload setMsg={setMsg} />{titleField(t === "file" ? "Name shown to students" : "Title (optional)")}</div>;
  if (t === "link") return <div><UrlField courseId={courseId} block={block} onChange={onChange} label="Web address (https://…)" setMsg={setMsg} />{titleField("Link text")}</div>;
  if (t === "embed") return <div><UrlField courseId={courseId} block={block} onChange={onChange} label="YouTube or Vimeo address" setMsg={setMsg} />{titleField("Title (optional)")}</div>;
  return null;
}

/* ------------------------------- block list ------------------------------- */
export function BlockEditorList({ courseId, blocks, setBlocks, setMsg }) {
  const [adding, setAdding] = useState("text");
  const update = (k, patch) => setBlocks((bs) => bs.map((b) => (b.k === k ? { ...b, ...patch } : b)));
  const move = (i, d) => setBlocks((bs) => { const j = i + d; if (j < 0 || j >= bs.length) return bs; const c = bs.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const remove = (i) => { if (blocks[i].type === "text" && (blocks[i].html || "").replace(/<[^>]*>/g, "").trim() && !window.confirm("Remove this text block?")) return; setBlocks((bs) => bs.filter((_, x) => x !== i)); };

  return (
    <div>
      {blocks.length === 0 && <p style={{ color: C.muted }}>No content yet. Add a block below.</p>}
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {blocks.map((b, i) => (
          <li key={b.k} style={{ ...S.box }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 14 }}>{i + 1}. {BLOCK_LABEL[b.type]}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" style={S.btn} aria-label={`Move block ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
                <button type="button" style={S.btn} aria-label={`Move block ${i + 1} down`} disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>Down</button>
                <button type="button" style={S.btn} aria-label={`Remove block ${i + 1}`} onClick={() => remove(i)}>Remove</button>
              </div>
            </div>
            <BlockBody courseId={courseId} block={b} index={i} onChange={(p) => update(b.k, p)} setMsg={setMsg} />
          </li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
        <div>
          <label htmlFor="add-block" style={{ ...S.label, margin: "0 0 4px" }}>Add a block</label>
          <select id="add-block" value={adding} onChange={(e) => setAdding(e.target.value)} style={S.input}>{ADDABLE.map((t) => <option key={t} value={t}>{BLOCK_LABEL[t]}</option>)}</select>
        </div>
        <button type="button" style={S.btn} onClick={() => setBlocks((bs) => (bs.length >= 200 ? bs : [...bs, emptyBlock(adding)]))}>Add</button>
      </div>
    </div>
  );
}

