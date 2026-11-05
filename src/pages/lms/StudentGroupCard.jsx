import React, { useEffect, useState } from "react";
import API from "../../api";
import { C, S } from "./lmsUtil";

/* "My group" card (L8.2d, S96). Frontend only. GET /lms/courses/:id/learn/groups/mine -> { group: null | { id, name, members:[{name, mine}] } }.
   Members are shown as "First L." by the server (no ids, no admission numbers). Shown only when the learner is in a group; any error or no group renders nothing
   (the forums below still work). Plain text only. Online only. */
export default function StudentGroupCard({ courseId }) {
  const [group, setGroup] = useState(null);
  useEffect(() => {
    let alive = true;
    API.get(`/lms/courses/${courseId}/learn/groups/mine`).then((r) => { if (alive) setGroup(r.data && r.data.group ? r.data.group : null); }).catch(() => { if (alive) setGroup(null); });
    return () => { alive = false; };
  }, [courseId]);
  if (!group) return null;
  const members = group.members || [];
  return (
    <section aria-label="My group" style={{ ...S.box, margin: "0 0 14px" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Your group: {group.name}</h2>
      <p style={{ margin: "0 0 6px", fontSize: 13, color: C.muted }}>{members.length} member{members.length === 1 ? "" : "s"}. Your group may have its own forum below.</p>
      <ul aria-label="Group members" style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
        {members.map((m, i) => <li key={i}>{m.name}{m.mine ? " (you)" : ""}</li>)}
      </ul>
    </section>
  );
}
