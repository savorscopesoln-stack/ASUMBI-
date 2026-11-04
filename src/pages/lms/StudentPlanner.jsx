import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { FILE_BASE_URL } from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed } from "./lmsUtil";
import { Notice, Skeleton } from "./lmsUi";

/* Student planner (L4.5c, S74). Frontend only. Backend: GET /lms/me/planner (from/to, max 120 days, 500 rows),
   GET /lms/me/planner.ics, and the calendar link: GET/POST/DELETE /lms/me/planner/feed.
   The secret calendar link is returned ONCE by POST: it is shown here once and never stored on the device.
   Online only (no device copy). */

const WINDOW_DAYS = 14, DAY = 864e5;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayKey = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayLabel = (iso) => new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
const timeLabel = (x) => (x.allDay ? "All day" : new Date(x.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
const rangeLabel = (a, b) => `${a.toLocaleDateString([], { day: "numeric", month: "short" })} to ${new Date(b.getTime() - DAY).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`;

export default function StudentPlanner() {
  const [offset, setOffset] = useState(0); // windows of 14 days away from today
  const [data, setData] = useState({ items: [], truncated: false });
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);
  const [feed, setFeed] = useState(null); // { active, lastUsedAt } | null (unknown)
  const [link, setLink] = useState(null); // shown once after creating
  const [busy, setBusy] = useState(false);

  const from = new Date(startOfToday().getTime() + offset * WINDOW_DAYS * DAY);
  const to = new Date(from.getTime() + WINDOW_DAYS * DAY);
  const params = { from: from.toISOString(), to: to.toISOString() };

  const load = useCallback(async () => {
    setState((s) => (s === "ready" ? s : "loading"));
    try {
      const r = await API.get("/lms/me/planner", { params });
      setData({ items: r.data.items || [], truncated: !!r.data.truncated }); setState("ready"); setMsg(null);
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, "Could not load your planner.") }); setState("error"); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);
  useEffect(() => { load(); }, [load]);

  const loadFeed = useCallback(async () => {
    try { const r = await API.get("/lms/me/planner/feed"); setFeed({ active: !!r.data.active, lastUsedAt: r.data.lastUsedAt || null }); } catch { setFeed(null); }
  }, []);
  useEffect(() => { loadFeed(); }, [loadFeed]);

  const download = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await API.get("/lms/me/planner.ics", { params, responseType: "blob" });
      const url = URL.createObjectURL(r.data); const a = document.createElement("a");
      a.href = url; a.download = "my-planner.ics"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMsg({ ok: true, text: "Calendar file downloaded." });
    } catch (e) { setMsg({ ok: false, text: errText(e, "Could not download the calendar file.") }); } finally { setBusy(false); }
  };
  const createFeed = async () => {
    if (feed?.active && !window.confirm("This replaces your current calendar link. The old link will stop working. Continue?")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await API.post("/lms/me/planner/feed");
      setLink(`${FILE_BASE_URL || window.location.origin}${r.data.path}`); await loadFeed();
    } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };
  const revokeFeed = async () => {
    if (!window.confirm("Stop sharing your calendar link? Calendars using it will stop updating.")) return;
    setBusy(true); setMsg(null);
    try { await API.delete("/lms/me/planner/feed"); setLink(null); await loadFeed(); setMsg({ ok: true, text: "Calendar link turned off." }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMsg({ ok: true, text: "Link copied." }); } catch { setMsg({ ok: false, text: "Could not copy. Select the link and copy it by hand." }); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  const groups = [];
  for (const x of data.items) { const k = dayKey(x.startsAt); if (!k) continue; const g = groups[groups.length - 1]; if (g && g.k === k) g.items.push(x); else groups.push({ k, at: x.startsAt, items: [x] }); }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>My planner</h1>
      <p style={S.sub}>Deadlines and events from your courses.</p>
      <nav aria-label="Planner dates" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" style={S.btn} onClick={() => setOffset((o) => o - 1)} disabled={state === "loading"}>Earlier</button>
        <button type="button" style={S.btn} onClick={() => setOffset(0)} disabled={state === "loading" || offset === 0}>Today</button>
        <button type="button" style={S.btn} onClick={() => setOffset((o) => o + 1)} disabled={state === "loading"}>Later</button>
        <span style={{ fontSize: 14, color: C.muted }} aria-live="polite">{rangeLabel(from, to)}</span>
      </nav>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={load}>Try again</button>
      ) : groups.length === 0 ? (
        <p style={{ color: C.muted }}>Nothing planned in these dates.</p>
      ) : (
        <div>
          {groups.map((g) => (
            <section key={g.k} aria-label={dayLabel(g.at)} style={{ ...S.box, marginBottom: 10 }}>
              <h2 style={{ fontSize: 15, margin: "0 0 6px" }}>{dayLabel(g.at)}</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((x) => (
                  <li key={x.key} style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <span><span style={{ fontSize: 13, color: C.muted }}>{timeLabel(x)} · </span><strong>{x.title}</strong>
                      <span style={{ fontSize: 13, color: C.muted }}> · {x.courseTitle}</span>
                      {x.description && <div style={{ fontSize: 13, color: C.muted }}>{String(x.description).slice(0, 200)}</div>}</span>
                    {x.kind === "assignment_due" && <Link to={`/student/courses/${x.courseId}/assignments`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open</Link>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {data.truncated && <p style={{ fontSize: 13, color: C.muted }}>Too many items to show. Choose shorter dates with Earlier or Later.</p>}
        </div>
      )}

      <section aria-labelledby="lms-p-cal" style={{ ...S.box, marginTop: 18 }}>
        <h2 id="lms-p-cal" style={{ fontSize: 16, margin: "0 0 6px" }}>Use in your phone calendar</h2>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: C.muted }}>Download these dates once, or add a private link so your calendar keeps updating by itself. Anyone with the link can see your dates, so do not share it.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={S.btn} disabled={busy} onClick={download}>Download calendar file</button>
          <button type="button" style={S.btn} disabled={busy} onClick={createFeed}>{feed?.active ? "Make a new link" : "Create calendar link"}</button>
          {feed?.active && <button type="button" style={S.btn} disabled={busy} onClick={revokeFeed}>Turn link off</button>}
        </div>
        {feed?.active && !link && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>A calendar link is on. For safety it cannot be shown again; make a new link if you lost it.</p>}
        {link && (
          <div role="status" style={{ marginTop: 10 }}>
            <label htmlFor="lms-p-link" style={S.label}>Your link (shown only now)</label>
            <input id="lms-p-link" readOnly value={link} onFocus={(e) => e.target.select()} style={{ ...S.input, width: "100%" }} />
            <button type="button" style={{ ...S.btnPrimary, marginTop: 8 }} onClick={copy}>Copy link</button>
          </div>
        )}
      </section>
    </div>
  );
}
