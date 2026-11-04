import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import UpgradePrompt from "../../components/UpgradePrompt";
import { C, S, errText, isModuleNotLicensed, useCourseLabel, useDebounced } from "./lmsUtil";
import { Notice, Pager, Skeleton, StatusBadge, Tabs } from "./lmsUi";

/* Student side of the LMS (L2.6): "My courses" and "Browse".
   Backend: GET /lms/my/courses, GET /lms/catalogue, POST /lms/courses/:id/enrol|withdraw.
   The server decides everything (who may join, enrolment mode); this screen only shows the answer. */

const PAGE_SIZE = 12;

function CourseCard({ c, children }) {
  return (
    <li style={{ ...S.box, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: C.muted }}>{c.code}{c.academicYear ? ` · ${c.academicYear}` : ""}{c.semester ? ` · ${c.semester}` : ""}</div>
      <h3 style={{ margin: 0, fontSize: 16 }}>{c.title}</h3>
      {c.teacherName && <div style={{ fontSize: 13, color: C.muted }}>{c.teacherName}{c.className ? ` · ${c.className}` : ""}</div>}
      {c.description && <p style={{ margin: "4px 0", fontSize: 13, color: C.muted, lineHeight: 1.45 }}>{c.description}</p>}
      <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
    </li>
  );
}

export default function StudentCourses() {
  const label = useCourseLabel();
  const [tab, setTab] = useState("mine");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE, enrolmentMode: null });
  const [state, setState] = useState("loading"); // loading | ready | unlicensed | error
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setPage(1); }, [tab, dq]);

  const load = useCallback(async () => {
    setState((s) => (s === "ready" ? s : "loading"));
    try {
      const url = tab === "mine" ? "/lms/my/courses" : "/lms/catalogue";
      const r = await API.get(url, { params: { q: dq || undefined, page, pageSize: PAGE_SIZE } });
      setData({ items: r.data.items || [], total: r.data.total || 0, pageSize: r.data.pageSize || PAGE_SIZE, enrolmentMode: r.data.enrolmentMode || null });
      setState("ready");
    } catch (e) {
      if (isModuleNotLicensed(e)) setState("unlicensed");
      else { setMsg({ ok: false, text: errText(e, `Could not load ${label.many.toLowerCase()}.`) }); setState("error"); }
    }
  }, [tab, dq, page, label.many]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, path, okText) => {
    setBusyId(id); setMsg(null);
    try {
      const r = await API.post(`/lms/courses/${id}/${path}`);
      setMsg({ ok: true, text: path === "enrol" && r.data?.status === "pending" ? "Request sent. Your teacher will approve it." : okText });
      await load();
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
    finally { setBusyId(null); }
  };

  if (state === "unlicensed") return <UpgradePrompt module="lms" />;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{label.many}</h1>
      <p style={S.sub}>{tab === "mine" ? `The ${label.many.toLowerCase()} you are taking.` : `${label.many} you can join.`}</p>
      <Tabs tabs={[["mine", `My ${label.many.toLowerCase()}`], ["browse", "Browse"]]} value={tab} onChange={(t) => { setMsg(null); setTab(t); }} />
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="lms-s-q" style={{ ...S.label, margin: "0 0 4px" }}>Search</label>
        <input id="lms-s-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or code" maxLength={100} style={{ ...S.input, width: "100%", maxWidth: 360 }} />
      </div>
      <Notice msg={msg} />
      {tab === "browse" && data.enrolmentMode === "closed" && state === "ready" && (
        <p style={{ ...S.sub, color: C.text }}>Joining is closed right now. Please ask your teacher to enrol you.</p>
      )}
      {state === "loading" ? <Skeleton /> : state === "error" ? (
        <button type="button" style={S.btn} onClick={load}>Try again</button>
      ) : data.items.length === 0 ? (
        <p style={{ color: C.muted }}>{dq ? "Nothing matches your search." : tab === "mine" ? `You are not in any ${label.many.toLowerCase()} yet. Open Browse to find one.` : `No ${label.many.toLowerCase()} to join right now.`}</p>
      ) : (
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, padding: 0, margin: 0 }}>
          {data.items.map((c) => (
            <CourseCard key={c.id} c={c}>
              {tab === "mine" ? (
                <>
                  <StatusBadge status={c.myStatus === "pending" ? "pending" : "active"} />
                  {c.myStatus !== "pending" && <Link to={`/student/courses/${c.id}/learn`} style={{ ...S.btnPrimary, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open</Link>}
                  {c.myStatus !== "pending" && <Link to={`/student/courses/${c.id}/assignments`} style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Assignments</Link>}
                  <button type="button" style={S.btn} disabled={busyId === c.id}
                    onClick={() => { if (window.confirm(c.myStatus === "pending" ? "Cancel your request?" : `Leave ${c.title}?`)) act(c.id, "withdraw", "Done."); }}>
                    {c.myStatus === "pending" ? "Cancel request" : "Leave"}
                  </button>
                </>
              ) : c.canRequest ? (
                <button type="button" style={S.btnPrimary} disabled={busyId === c.id} onClick={() => act(c.id, "enrol", "You have joined.")}>
                  {busyId === c.id ? "Please wait…" : data.enrolmentMode === "approval" ? "Request to join" : "Join"}
                </button>
              ) : (
                <span style={{ fontSize: 13, color: C.muted }}>{c.previouslyEnrolled ? "Please ask your teacher to enrol you." : "Joining is closed."}</span>
              )}
            </CourseCard>
          ))}
        </ul>
      )}
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={state === "loading"} />
    </div>
  );
}
