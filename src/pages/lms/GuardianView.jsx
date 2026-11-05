import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL } from "../../api";
import { C, S } from "./lmsUtil";

/* Guardian view (L9.5b, S116) at /g/:school/:secret. PUBLIC, no login: the secret in the link is the credential (D-112, Q97). Frontend only.
   Reads GET {API}/lms-guardian/:school/:secret.json with plain fetch: no auth header, no cookies, no referrer, never cached. Every failure of the link answers 404.
   Shows ONLY: the learner's first name, per-course progress, and missed work. No grades, feedback, ids or other learners. Plain text only. */

const day = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString([], { dateStyle: "medium" }) : ""; };
const MSG = { 404: "This link is not valid or has expired. Please ask the school for a new one.", 429: "Too many requests. Please wait a minute and try again." };

export default function GuardianView() {
  const { school, secret } = useParams();
  const [data, setData] = useState(null), [state, setState] = useState("loading"), [msg, setMsg] = useState(""); // loading | ready | error
  useEffect(() => { // keep the page and the secret out of search engines and referrers
    const m = []; for (const [n, c] of [["robots", "noindex, nofollow"], ["referrer", "no-referrer"]]) { const e = document.createElement("meta"); e.name = n; e.content = c; document.head.appendChild(e); m.push(e); }
    return () => m.forEach((e) => e.remove());
  }, []);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE_URL}/lms-guardian/${encodeURIComponent(school)}/${encodeURIComponent(secret)}.json`, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
      if (!r.ok) { setMsg(MSG[r.status] || "Could not load this page. Please try again."); setState("error"); return; }
      setData(await r.json()); setState("ready");
    } catch { setMsg("Could not load this page. Check your connection and try again."); setState("error"); }
  }, [school, secret]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const courses = Array.isArray(data?.courses) ? data.courses : [], missed = data?.missedWork || { items: [], total: 0 };
  return (
    <main style={{ ...S.page, maxWidth: 720, margin: "0 auto" }}>
      {state === "loading" && <p role="status">Loading…</p>}
      {state === "error" && <div role="alert"><h1 style={S.h1}>Learning progress</h1><p>{msg}</p>{msg.startsWith("Could not") || msg.startsWith("Too many") ? <button type="button" style={S.btn} onClick={() => { setState("loading"); load(); }}>Try again</button> : null}</div>}
      {state === "ready" && (
        <>
          <h1 style={S.h1}>{data.learner?.name ? `${data.learner.name}’s learning` : "Learning progress"}</h1>
          <p style={S.sub}>Progress and missed work only. Grades and feedback are not shown. Updated {day(data.generatedAt)}.</p>
          <section aria-labelledby="gv-prog" style={{ ...S.box, marginBottom: 14 }}>
            <h2 id="gv-prog" style={{ fontSize: 16, margin: "0 0 8px" }}>Progress</h2>
            {courses.length === 0 ? <p style={{ margin: 0, color: C.muted }}>Not enrolled in any published course yet.</p> : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {courses.map((c, i) => (
                  <li key={`${c.code || ""}-${i}`}>
                    <strong>{c.title}</strong>{c.code ? <span style={{ fontSize: 12, color: C.muted }}> · {c.code}</span> : null}
                    <div role="progressbar" aria-label={`${c.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.percent || 0} style={{ height: 8, borderRadius: 999, background: C.border, margin: "4px 0", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, c.percent || 0))}%`, height: "100%", background: C.accent }} />
                    </div>
                    <span style={{ fontSize: 13, color: C.muted }}>{c.completedLessons} of {c.totalLessons} lessons · {c.percent || 0}%</span>
                  </li>))}
              </ul>)}
          </section>
          <section aria-labelledby="gv-miss" style={S.box}>
            <h2 id="gv-miss" style={{ fontSize: 16, margin: "0 0 8px" }}>Missed work</h2>
            {missed.items.length === 0 ? <p style={{ margin: 0, color: C.muted }}>Nothing is overdue.</p> : (
              <>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {missed.items.map((m, i) => <li key={i} style={{ fontSize: 14 }}><strong>{m.title}</strong><br /><span style={{ fontSize: 13, color: C.muted }}>{m.courseTitle} · was due {day(m.dueAt)}</span></li>)}
                </ul>
                {missed.more && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>{missed.total} item{missed.total === 1 ? "" : "s"} in total; the most recent are shown.</p>}
              </>)}
          </section>
        </>)}
    </main>
  );
}
