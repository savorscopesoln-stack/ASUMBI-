import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useCourseLabel } from "./lmsUtil";
import { Notice, Pager, Skeleton } from "./lmsUi";

/* Student announcements (L4.4c, S75). Frontend only. Backend: GET /lms/me/announcements?page&pageSize
   (published only, pinned first, school-wide + courses the learner is actively enrolled in; the server decides).
   Text is always shown as plain text (never HTML). Online only (no device copy). */

const PAGE_SIZE = 10;
const when = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; };

function Item({ a, schoolLabel }) {
  const [open, setOpen] = useState(false);
  const body = String(a.body || ""), long = body.length > 280;
  return (
    <li style={{ ...S.box, listStyle: "none" }}>
      <div style={{ fontSize: 12, color: C.muted }}>{a.pinned ? "Pinned · " : ""}{a.courseTitle || schoolLabel}{a.publishedAt ? ` · ${when(a.publishedAt)}` : ""}</div>
      <h2 style={{ fontSize: 16, margin: "2px 0 6px" }}>{a.title}</h2>
      {body && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{open || !long ? body : `${body.slice(0, 280)}…`}</p>}
      {long && <button type="button" style={{ ...S.btn, marginTop: 8 }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Show less" : "Read more"}</button>}
    </li>
  );
}

export default function StudentAnnouncements() {
  const label = useCourseLabel();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await API.get("/lms/me/announcements", { params: { page, pageSize: PAGE_SIZE } });
      setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE });
      setMsg(null); setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, "Could not load announcements.") }); setState("error"); }
    }
  }, [page]);
  // load() sets state only after the await (same pattern as StudentCourses/StudentPlanner); the rule flags it here anyway (S76)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const retry = () => { setState("loading"); load(); };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Announcements</h1>
      <p style={S.sub}>News from your school and your {label.many.toLowerCase()}.</p>
      <Notice msg={msg} />
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={retry}>Try again</button>
      ) : data.items.length === 0 ? (
        <p style={{ color: C.muted }}>No announcements yet.</p>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0 }}>
          {data.items.map((a) => <Item key={a.id} a={a} schoolLabel="School" />)}
        </ul>
      )}
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={state === "loading"} />
    </div>
  );
}
