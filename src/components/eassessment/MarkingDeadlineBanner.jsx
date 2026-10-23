import React, { useEffect, useRef, useState } from "react";
import API from "../../api";

/* Live countdown to the marking deadline an admin set for this assessment
   (E-Assessments > Marking > Deadline). Shows nothing when no deadline is set.
   The server works out the seconds left, so a wrong device clock cannot change it;
   the page then only counts down locally and re-syncs every few minutes.
   It is a reminder only: marking is never blocked once the deadline passes. */

const RESYNC_MS = 5 * 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");

function parts(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function tone(secondsLeft) {
  if (secondsLeft <= 0) return { bg: "rgba(220,38,38,.12)", border: "#dc2626", fg: "#b91c1c" };
  if (secondsLeft <= 3600) return { bg: "rgba(220,38,38,.10)", border: "#ef4444", fg: "#b91c1c" };
  if (secondsLeft <= 86400) return { bg: "rgba(245,158,11,.14)", border: "#f59e0b", fg: "#b45309" };
  return { bg: "rgba(34,197,94,.10)", border: "#22c55e", fg: "#15803d" };
}

export default function MarkingDeadlineBanner({ assessmentId, style }) {
  const [info, setInfo] = useState(null); // { deadline, secondsLeft }
  const [, setTick] = useState(0);
  const syncedAt = useRef(0);

  useEffect(() => {
    if (!assessmentId) return undefined;
    let alive = true;
    const load = () => {
      API.get(`/e-assessments/marking-deadline/${assessmentId}`)
        .then((r) => {
          if (!alive) return;
          const d = r?.data;
          syncedAt.current = Date.now();
          setInfo(d?.deadline && Number.isFinite(Number(d.seconds_left))
            ? { deadline: d.deadline, secondsLeft: Number(d.seconds_left) } : null);
        })
        .catch(() => {});
    };
    load();
    const resync = setInterval(load, RESYNC_MS);
    return () => { alive = false; clearInterval(resync); };
  }, [assessmentId]);

  useEffect(() => {
    if (!info) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [info]);

  if (!info) return null;

  const left = info.secondsLeft - (Date.now() - syncedAt.current) / 1000;
  const over = left <= 0;
  const c = tone(left);
  const p = parts(over ? -left : left);
  const cells = [];
  if (p.d > 0) cells.push([p.d, "d"]);
  cells.push([p.d > 0 ? pad(p.h) : p.h, "h"], [pad(p.m), "m"], [pad(p.s), "s"]);
  const when = new Date(info.deadline).toLocaleString([], { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div role="timer" aria-live="off"
      style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", marginBottom: 14,
        borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, color: c.fg, ...style }}>
      <span style={{ fontSize: 18 }} aria-hidden="true">⏰</span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>{over ? "Marking deadline has passed" : "Marking deadline"}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{over ? "Please finish marking as soon as you can · was due " : "Due "}{when}</div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 4, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 20 }}>
        {over && <span style={{ fontSize: 12, fontWeight: 700, marginRight: 4 }}>Overdue by</span>}
        {cells.map(([v, u]) => (
          <span key={u}>{v}<span style={{ fontSize: 11, fontWeight: 700, marginLeft: 1, marginRight: 4 }}>{u}</span></span>
        ))}
      </div>
    </div>
  );
}
