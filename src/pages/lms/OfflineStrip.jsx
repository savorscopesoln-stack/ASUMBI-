import React, { useCallback, useEffect, useRef, useState } from "react";
import { C, S } from "./lmsUtil";
import { Notice } from "./lmsUi";

/* "Offline work" strip (L10.3e, D-121) for the student course player. Shows what this learner did offline and has not reached the server yet, and lets them send it or settle it.
   It is a thin screen over frontend/src/utils/lmsOfflineQueue.js (D-120): it holds no data of its own, it reads the queue (summary/list) and calls flush / resolveDraft /
   resolveQuiz / retry / discard. The parent builds the queue (per learner) and passes it in, so this file never touches storage or the network directly.
   - Renders NOTHING when the learner is online and the queue is empty for this course (no clutter for the normal case).
   - Offline: says so in plain words and that work is kept on the device. Back online with waiting items: sends them (also on the Sync now button).
   - A conflict is never settled for the learner: both versions are shown as plain text; the learner chooses (draft: keep the saved one / keep mine / keep both; quiz: per question).
   - A refused item keeps the learner's text; "Try again" re-queues it, "Remove from this device" asks twice before it deletes anything.
   - Everything the learner wrote is rendered as TEXT (React escapes it); status changes are announced (role="status"/"alert"); buttons are real buttons with 40 px minimum height.
   The queue has no change event, so the strip re-reads it every 2 s and on the browser's online/offline/storage events. */

const POLL_MS = 2000, MSG_MS = 6000;
const show = (v) => (typeof v === "string" ? v : v === null || v === undefined ? "(no answer)" : JSON.stringify(v));
const nameOf = (e) => (e.type === "submission_draft" ? `Draft for assignment ${e.assignmentId}` : e.type === "quiz_answers" ? `Quiz answers (quiz ${e.quizId})` : "Lesson progress");

function describe(r) {
  if (!r) return { ok: false, text: "Nothing was sent." };
  if (r.busy) return { ok: true, text: "A sync is already running." };
  const why = { offline: "Could not reach the server. Your work is still saved on this device.", signed_out: "Your sign-in has expired. Sign in again; your work is still saved on this device.",
    server: "The server did not answer properly. Try again in a moment. Your work is still saved on this device.", storage: "This device has no room left to keep your work. Reconnect and sync first." };
  if (r.stoppedBy) return { ok: false, text: why[r.stoppedBy] || why.server };
  const need = (r.conflict || 0) + (r.rejected || 0);
  return { ok: true, text: `Sent ${r.applied + r.duplicate} item${r.applied + r.duplicate === 1 ? "" : "s"}.${need ? ` ${need} need${need === 1 ? "s" : ""} your attention below.` : ""}` };
}

export default function OfflineStrip({ courseId, queue, onSynced }) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [items, setItems] = useState(() => queue.list(courseId));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null); // id of the item whose removal is awaiting a second click
  const [picks, setPicks] = useState({}); // quiz choices: { [itemId]: { [questionId]: "mine" | "server" } }
  const busyRef = useRef(false);

  const refresh = useCallback(() => setItems(queue.list(courseId)), [queue, courseId]);
  const count = (s) => items.filter((e) => e.state === s).length;
  const waiting = count("saved_locally"), sending = count("syncing"), conflicts = items.filter((e) => e.state === "conflict"), rejected = items.filter((e) => e.state === "rejected");

  const sync = useCallback(async () => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setMsg(null);
    try { const r = await queue.flush(courseId); refresh(); setMsg(describe(r)); if (r && r.applied && onSynced) onSynced(); }
    catch { setMsg({ ok: false, text: "Something went wrong while sending. Your work is still saved on this device." }); }
    finally { busyRef.current = false; setBusy(false); }
  }, [queue, courseId, refresh, onSynced]);

  useEffect(() => {
    const on = () => { setOnline(true); refresh(); sync(); }, off = () => { setOnline(false); refresh(); };
    window.addEventListener("online", on); window.addEventListener("offline", off); window.addEventListener("storage", refresh);
    const t = setInterval(refresh, POLL_MS);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("storage", refresh); clearInterval(t); };
  }, [refresh, sync]);

  async function act(fn, okText) {
    setBusy(true); setMsg(null);
    try { const r = await fn(); refresh(); setMsg(r && r.ok === false ? { ok: false, text: r.code === "CONFLICT_AGAIN" ? "The saved version changed again. Please look at both versions once more." : r.message || "That did not work. Your work is still saved on this device." } : { ok: true, text: okText }); if (r && r.ok !== false && onSynced) onSynced(); }
    catch { setMsg({ ok: false, text: "Something went wrong. Your work is still saved on this device." }); }
    finally { setBusy(false); }
  }

  /* a success message with nothing left waiting fades after a few seconds (so "Sent 2 items." is seen, then the strip disappears) */
  useEffect(() => { if (!(msg && msg.ok && items.length === 0)) return undefined; const t = setTimeout(() => setMsg(null), MSG_MS); return () => clearTimeout(t); }, [msg, items.length]);

  if (online && items.length === 0 && !msg) return null;
  const btn = { ...S.btn, padding: "8px 12px" };

  return (
    <section aria-label="Offline work" style={{ ...S.box, margin: "0 0 14px", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", fontSize: 14 }}>
          <strong>{online ? "Work saved on this device" : "You are offline"}</strong>
          <div style={{ color: C.muted }}>
            {online ? "Sent to your teacher when it is safe to do so." : "Keep going: what you do is saved on this device and sent when you are back online."}
          </div>
          <div style={{ marginTop: 4 }}>
            {items.length === 0 ? "Nothing waiting." : [waiting && `${waiting} waiting to send`, sending && `${sending} sending`, conflicts.length && `${conflicts.length} need${conflicts.length === 1 ? "s" : ""} your choice`, rejected.length && `${rejected.length} not accepted`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button type="button" style={S.btnPrimary} disabled={!online || busy || waiting === 0} onClick={sync}>{busy ? "Working…" : "Sync now"}</button>
      </div>
      <Notice msg={msg} />

      {conflicts.map((e) => (
        <div key={e.id} role="group" aria-label={`${nameOf(e)} needs your choice`} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <strong style={{ fontSize: 14 }}>{nameOf(e)} changed on the server</strong>
          <p style={{ margin: "4px 0 8px", color: C.muted, fontSize: 13 }}>Nothing is thrown away. Look at both and choose.</p>
          {e.type === "submission_draft" && e.conflict ? (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}><div style={{ fontSize: 12, color: C.muted }}>Saved on the server</div><div style={{ ...S.box, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 180, overflow: "auto" }}>{e.conflict.serverText}</div></div>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}><div style={{ fontSize: 12, color: C.muted }}>Written on this device</div><div style={{ ...S.box, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 180, overflow: "auto" }}>{e.text}</div></div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" style={btn} disabled={busy || !online} onClick={() => act(() => queue.resolveDraft(e.id, "keep_server"), "Kept the saved version.")}>Keep the saved version</button>
                <button type="button" style={btn} disabled={busy || !online} onClick={() => act(() => queue.resolveDraft(e.id, "keep_mine"), "Kept your version.")}>Keep mine</button>
                <button type="button" style={btn} disabled={busy || !online} onClick={() => act(() => queue.resolveDraft(e.id, "keep_both"), "Kept both versions.")}>Keep both</button>
              </div>
              {!online && <p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted }}>Reconnect to choose.</p>}
            </>
          ) : e.type === "quiz_answers" ? (
            <>
              {(e.items || []).filter((x) => x.state === "conflict").map((c) => {
                const name = `pick-${e.id}-${c.questionId}`, mine = e.answers && e.answers[c.questionId];
                return (
                  <fieldset key={c.questionId} style={{ border: `1px solid ${C.border}`, borderRadius: 8, margin: "0 0 8px", padding: 8 }}>
                    <legend style={{ fontSize: 13 }}>Question {c.questionId}</legend>
                    {[["mine", "Keep mine", mine ? mine.value : null], ["server", "Keep the saved answer", c.conflict ? c.conflict.serverAnswer : null]].map(([v, label, val]) => (
                      <label key={v} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", fontSize: 14 }}>
                        <input type="radio" name={name} value={v} checked={(picks[e.id] || {})[c.questionId] === v} onChange={() => setPicks((p) => ({ ...p, [e.id]: { ...(p[e.id] || {}), [c.questionId]: v } }))} />
                        <span style={{ overflowWrap: "anywhere" }}>{label}: <span style={{ color: C.muted }}>{show(val)}</span></span>
                      </label>
                    ))}
                  </fieldset>
                );
              })}
              {(() => { const need = (e.items || []).filter((x) => x.state === "conflict"), ready = need.length > 0 && need.every((c) => (picks[e.id] || {})[c.questionId]);
                return <button type="button" style={btn} disabled={busy || !ready} onClick={() => act(() => queue.resolveQuiz(e.id, picks[e.id]), "Choices saved. They will be sent next.")}>Apply my choices</button>; })()}
            </>
          ) : null}
          <div style={{ marginTop: 8 }}>
            {confirm === e.id
              ? <span role="alert" style={{ fontSize: 13 }}>Remove it from this device? It will not be sent. <button type="button" style={btn} onClick={() => { setConfirm(null); act(() => queue.discard(e.id), "Removed from this device."); }}>Yes, remove</button> <button type="button" style={btn} onClick={() => setConfirm(null)}>No, keep it</button></span>
              : <button type="button" style={{ ...btn, color: C.muted }} disabled={busy} onClick={() => setConfirm(e.id)}>Remove from this device</button>}
          </div>
        </div>
      ))}

      {rejected.map((e) => (
        <div key={e.id} role="group" aria-label={`${nameOf(e)} was not accepted`} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <strong style={{ fontSize: 14 }}>{nameOf(e)} was not accepted</strong>
          <p style={{ margin: "4px 0 8px", fontSize: 14 }}>{e.message || "The server did not accept this."} Your work is still saved on this device.</p>
          {e.type === "submission_draft" && <div style={{ ...S.box, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 140, overflow: "auto", marginBottom: 8 }}>{e.text}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={btn} disabled={busy} onClick={() => act(async () => queue.retry(e.id), "Queued to try again.")}>Try again</button>
            {confirm === e.id
              ? <span role="alert" style={{ fontSize: 13 }}>Remove it from this device? <button type="button" style={btn} onClick={() => { setConfirm(null); act(() => queue.discard(e.id), "Removed from this device."); }}>Yes, remove</button> <button type="button" style={btn} onClick={() => setConfirm(null)}>No, keep it</button></span>
              : <button type="button" style={{ ...btn, color: C.muted }} disabled={busy} onClick={() => setConfirm(e.id)}>Remove from this device</button>}
          </div>
        </div>
      ))}
    </section>
  );
}
