import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo2, Redo2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   ESSAY EDITOR
   Rich text input for essay-type exam questions — replaces the old
   plain <textarea>. Stores/returns HTML (editor.getHTML()), which is
   exactly what the marking screens (teacher/Marking.jsx,
   teacher/AllQuestionsMarking.jsx) and AdminEAssessments' review view
   already expect and render — they detect and pass through HTML
   answers unchanged, and treat a plain-text answer (from before this
   editor existed) as backward-compatible too. Nothing on the marking
   side needed to change.

   Kept deliberately minimal (bold/italic/underline/lists/undo-redo) —
   an exam answer doesn't need headings, tables, images, or links, and
   a bigger toolbar just adds surface area for distraction during a
   timed assessment.
═══════════════════════════════════════════════════════════ */
export default function EssayEditor({ value, onChange, disabled = false, placeholder = "Type your answer here…" }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Store "" instead of Tiptap's empty-paragraph HTML so an
      // untouched question still counts as genuinely unanswered
      // (matches the old textarea's empty-string behavior).
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Keep the editor in sync if `value` changes from outside (e.g.
  // restoring a saved-in-progress answer after a page reload) without
  // fighting the user's own typing — only resets when genuinely
  // different from what's currently in the editor.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (incoming !== current && !(incoming === "" && current === "<p></p>")) {
      editor.commands.setContent(incoming, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const ToolbarBtn = ({ onClick, active, disabled: btnDisabled, label, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || btnDisabled}
      aria-label={label}
      title={label}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: 6, border: "1px solid transparent",
        background: active ? "var(--primary-tint)" : "transparent",
        color: active ? "var(--primary)" : "var(--text-secondary)",
        cursor: disabled || btnDisabled ? "not-allowed" : "pointer",
        opacity: disabled || btnDisabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm, 10px)",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
          padding: "6px 8px", borderBottom: "1px solid var(--border)",
          background: "var(--card, var(--bg))",
        }}
      >
        <ToolbarBtn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolbarBtn>
        <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
        <ToolbarBtn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarBtn>
        <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
        <ToolbarBtn label="Undo" btnDisabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn label="Redo" btnDisabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarBtn>
      </div>

      <EditorContent
        editor={editor}
        className="essay-editor-content"
        style={{ minHeight: 180, maxHeight: 420, overflowY: "auto", padding: "12px 14px", fontSize: 14, color: "var(--text)" }}
      />

      <style>{`
        .essay-editor-content .ProseMirror { outline: none; min-height: 156px; }
        .essay-editor-content .ProseMirror p { margin: 0 0 8px; line-height: 1.6; }
        .essay-editor-content .ProseMirror p:last-child { margin-bottom: 0; }
        .essay-editor-content .ProseMirror ul, .essay-editor-content .ProseMirror ol { padding-left: 22px; margin: 0 0 8px; }
        .essay-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
