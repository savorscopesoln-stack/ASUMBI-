/* ═══════════════════════════════════════════════════════════
   ruledTyping — "exercise book" typing help for the essay answer box.

   What it does, for students who struggle with typing:
     1. A new sentence starts with a CAPITAL letter, automatically
        (start of a line, or after  .  !  ?  followed by a space).
     2. A lone "i" becomes "I" (also i'm / i'll / i've / i'd).
     3. When the student presses ENTER, the line they just finished
        gets a FULL STOP if it doesn't already end in . ! ? : ;
        and the cursor moves to a new line (ready for a capital).

   Everything goes through document.execCommand("insertText"), so the
   browser's own Undo (Ctrl+Z) still works and the editor's normal
   "input" pipeline (autosave, word count) fires as usual.

   Deliberately NOT applied inside table cells (a cell may hold a unit
   like "cm" or a single word — capitalising / punctuating it would be
   wrong) and never during IME / braille composition, so contracted
   braille input is not disturbed.
═══════════════════════════════════════════════════════════ */

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "TD", "TH", "BLOCKQUOTE"]);

// "start of a sentence" = nothing but spaces so far, or end of a sentence + space(s)
const SENTENCE_START = /(?:^\s*|[.!?…]["'”’)\]]*\s+)$/;
// "e.g. the", "i.e. the", "etc. and", "vs. the" — not real sentence ends
const ABBREVIATION_END = /(?:\be\.g|\bi\.e|\betc|\bvs|\bcf)\.\s+$/i;
// a line that is already finished
const ALREADY_ENDED = /[.!?…:;]["'”’)\]]*$/;

const caretRange = (root) => {
  const sel = window.getSelection();
  if (!root || !sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return root.contains(range.startContainer) ? range : null;
};

const blockOf = (root, node) => {
  let n = node && node.nodeType === 3 ? node.parentNode : node;
  while (n && n !== root) {
    if (BLOCK_TAGS.has(n.tagName)) return n;
    n = n.parentNode;
  }
  return root;
};

const inTableCell = (block) => block && (block.tagName === "TD" || block.tagName === "TH");

const textBeforeCaret = (block, range) => {
  const r = document.createRange();
  r.selectNodeContents(block);
  r.setEnd(range.startContainer, range.startOffset);
  return r.toString();
};

const textAfterCaret = (block, range) => {
  const r = document.createRange();
  r.selectNodeContents(block);
  r.setStart(range.endContainer, range.endOffset);
  return r.toString();
};

// Character offset inside `block` -> DOM point (same counting as Range.toString()).
const pointAt = (block, offset) => {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let last = null;
  let n = walker.nextNode();
  while (n) {
    last = n;
    if (remaining <= n.nodeValue.length) return { node: n, offset: remaining };
    remaining -= n.nodeValue.length;
    n = walker.nextNode();
  }
  return last ? { node: last, offset: last.nodeValue.length } : { node: block, offset: 0 };
};

const selectOffsets = (block, from, to) => {
  const a = pointAt(block, from);
  const b = pointAt(block, to);
  const r = document.createRange();
  r.setStart(a.node, a.offset);
  r.setEnd(b.node, b.offset);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
};

const placeCaret = (block, offset) => {
  const p = pointAt(block, offset);
  const r = document.createRange();
  r.setStart(p.node, p.offset);
  r.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
};

const isLowerLetter = (ch) => !!ch && ch !== ch.toUpperCase() && ch === ch.toLowerCase() && ch.toUpperCase().length === 1;

/* ── 1. capital letter as the student types the first letter of a sentence ──
   Attach as a NATIVE "beforeinput" listener (React's onBeforeInput is a
   synthetic polyfill and does not carry inputType / isComposing). */
export function handleBeforeInput(e, root) {
  if (e.isComposing || e.inputType !== "insertText") return false;
  const ch = e.data;
  if (!ch || ch.length !== 1 || !isLowerLetter(ch)) return false;

  const range = caretRange(root);
  if (!range || !range.collapsed) return false;
  const block = blockOf(root, range.startContainer);
  if (inTableCell(block)) return false;

  const before = textBeforeCaret(block, range);
  if (!SENTENCE_START.test(before) || ABBREVIATION_END.test(before)) return false;

  e.preventDefault();
  document.execCommand("insertText", false, ch.toUpperCase());
  return true;
}

/* ── 2. fix the word just finished (after a space / punctuation / Enter) ──
   Covers keyboards that don't deliver clean per-letter events (phones),
   and the lone "i" -> "I".
   trailing = how many characters after the word are already before the caret
              (1 when a space/punctuation mark was just typed, 0 on Enter).
   allowI   = also turn a lone "i" into "I" (off for IME composition end, where
              a "word" may only be a fragment). */
export function fixWordBeforeCaret(root, trailing = 1, allowI = true) {
  const range = caretRange(root);
  if (!range || !range.collapsed) return false;
  const block = blockOf(root, range.startContainer);
  if (inTableCell(block)) return false;

  const before = textBeforeCaret(block, range);
  const body = before.slice(0, before.length - trailing);
  const m = body.match(/([\p{L}'’]+)$/u);
  if (!m) return false;

  const word = m[1];
  const wordStart = body.length - word.length;
  const prev = body.slice(0, wordStart);
  if (/[\p{L}\p{N}-]$/u.test(prev)) return false; // part of a longer token (e.g. "3i", "x-i")

  let fixTo = null;
  // a bare "i" right after "(" is a roman numeral like (i) — leave it alone
  if (allowI && /^i(?:['’](?:m|ll|ve|d))?$/.test(word) && !(word === "i" && /\($/.test(prev))) fixTo = "I";
  else if (isLowerLetter(word[0]) && SENTENCE_START.test(prev) && !ABBREVIATION_END.test(prev)) fixTo = word[0].toUpperCase();
  if (!fixTo) return false;

  const caretOffset = before.length;
  selectOffsets(block, wordStart, wordStart + 1);
  document.execCommand("insertText", false, fixTo);
  placeCaret(block, caretOffset);
  return true;
}

// Called from the editor's onInput: tidy up when a space / punctuation was typed.
export function handleAfterInput(nativeEvent, root) {
  if (!nativeEvent || nativeEvent.isComposing) return false;
  if (nativeEvent.inputType !== "insertText") return false;
  if (!nativeEvent.data || !/^[\s\u00a0.,;:!?]$/.test(nativeEvent.data)) return false;
  return fixWordBeforeCaret(root, 1, true);
}

/* ── 3. ENTER: finish the line with a full stop, then start a new line ──
   Returns true when it handled the key (caller needn't do anything else). */
// opts: the paper's switches — { capitals, fullstop }. With both off Enter is left to the browser.
export function handleEnterKey(e, root, opts = {}) {
  const { capitals = true, fullstop = true } = opts;
  if (!capitals && !fullstop) return false;
  if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.isComposing || e.nativeEvent?.isComposing) return false;

  let range = caretRange(root);
  if (!range) return false;
  let block = blockOf(root, range.startContainer);
  if (inTableCell(block)) return false; // keep the browser's normal behaviour in a table

  e.preventDefault();

  if (range.collapsed) {
    const after = textAfterCaret(block, range);
    // only when Enter is pressed at the END of a line (not when splitting one in the middle)
    if (!/\S/.test(after)) {
      if (capitals) fixWordBeforeCaret(root, 0, true); // capital / "I" on the last word first
      range = caretRange(root);
      block = range ? blockOf(root, range.startContainer) : block;
      if (range) {
        const before = textBeforeCaret(block, range);
        // ignore trailing spaces and stray commas when deciding what the line ends with
        const base = before.replace(/[\s\u00a0,]+$/, "");
        if (fullstop && /\S/.test(base) && !ALREADY_ENDED.test(base)) {
          if (before.length > base.length) selectOffsets(block, base.length, before.length);
          document.execCommand("insertText", false, ".");
        }
      }
    }
  }

  document.execCommand("insertParagraph");
  return true;
}

// New lines should be <p>, not <div>, so every line is a real paragraph.
export function setParagraphSeparator() {
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* unsupported — harmless */ }
}
