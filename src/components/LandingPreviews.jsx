import React, { useEffect, useState } from "react";
import { SCREENSHOTS } from "../config/screenshots";

/* =========================================================
   INTERFACE PREVIEWS (landing page)
   Small, code-drawn previews of real Doravo Core screens,
   built from the app's own layout, labels and colour tokens
   (Inter, #8B1E2D, white cards on #F8FAFC).

   HONESTY: these are illustrative, NOT screenshots. Every
   preview is wrapped by <Frame> which prints "Illustrative
   preview · sample data". Names and figures inside are
   placeholders, not real students, schools or statistics.

   To use a REAL screenshot instead: drop the image in
   public/assets/screenshots/ and set its path in
   src/config/screenshots.js. Any key set there replaces that preview automatically.
========================================================= */


const injectPreviewStyles = () => {
  if (document.getElementById("landing-previews")) return;
  const el = document.createElement("style");
  el.id = "landing-previews";
  el.textContent = `
    .doravo-landing .pv-wrap{ position:relative; }
    .doravo-landing .pv-frame{ background:#fff; border:1px solid #E2E5EA; border-radius:12px; overflow:hidden; box-shadow:0 30px 60px -34px rgba(42,10,21,0.45), 0 2px 6px rgba(16,24,40,0.05); }
    .doravo-landing .pv-bar{ display:flex; align-items:center; gap:7px; padding:10px 14px; background:#F8FAFC; border-bottom:1px solid #E2E5EA; }
    .doravo-landing .pv-dot{ width:9px; height:9px; border-radius:50%; background:#D5D9E0; }
    .doravo-landing .pv-url{ margin-left:10px; flex:1; max-width:260px; font:500 11px 'Inter',sans-serif; color:#64748B; background:#fff; border:1px solid #E2E5EA; border-radius:999px; padding:3px 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .doravo-landing .pv-cap{ margin-top:12px; font-size:12.5px; color:var(--ink); opacity:0.58; display:flex; align-items:center; gap:8px; }
    .doravo-landing .pv-cap::before{ content:""; width:18px; height:1px; background:var(--brass); }
    .doravo-landing .pv-shot{ display:block; width:100%; height:auto; }

    .doravo-landing .pv{ font-family:'Inter',system-ui,sans-serif; font-size:12px; line-height:1.4; color:#0B0F19; background:#F8FAFC; display:flex; min-height:300px; text-align:left; }
    .doravo-landing .pv *{ box-sizing:border-box; }
    .doravo-landing .pv-side{ width:128px; flex:none; background:#fff; border-right:1px solid #E2E5EA; padding:14px 10px; display:flex; flex-direction:column; gap:4px; }
    .doravo-landing .pv-brand{ display:flex; align-items:center; gap:6px; font-weight:700; font-size:12px; color:#8B1E2D; padding:0 6px 10px; }
    .doravo-landing .pv-mark{ width:16px; height:16px; border-radius:4px; background:#8B1E2D; flex:none; box-shadow:inset -4px -4px 0 #B8923F; }
    .doravo-landing .pv-nav{ padding:7px 9px; border-radius:7px; color:#384152; font-weight:500; }
    .doravo-landing .pv-nav.on{ background:#FBEAEC; color:#8B1E2D; font-weight:600; }
    .doravo-landing .pv-main{ flex:1; min-width:0; padding:16px; display:flex; flex-direction:column; gap:12px; }
    .doravo-landing .pv-h{ font-weight:700; font-size:14px; }
    .doravo-landing .pv-sub{ color:#64748B; font-size:11px; }
    .doravo-landing .pv-row{ display:grid; gap:10px; }
    .doravo-landing .pv-row.c4{ grid-template-columns:repeat(4,1fr); }
    .doravo-landing .pv-row.c2{ grid-template-columns:1.3fr 1fr; }
    .doravo-landing .pv-row.c3{ grid-template-columns:repeat(3,1fr); }
    .doravo-landing .pv-card{ background:#fff; border:1px solid #E2E5EA; border-radius:10px; padding:11px 12px; min-width:0; }
    .doravo-landing .pv-k{ color:#64748B; font-size:10.5px; margin-bottom:3px; }
    .doravo-landing .pv-v{ font-weight:700; font-size:18px; letter-spacing:-0.01em; }
    .doravo-landing .pv-tag{ display:inline-block; font-size:10px; font-weight:600; padding:2px 8px; border-radius:999px; }
    .doravo-landing .pv-tag.ok{ background:#ECFDF3; color:#15803D; }
    .doravo-landing .pv-tag.warn{ background:#FFFBEB; color:#B45309; }
    .doravo-landing .pv-tag.red{ background:#FBEAEC; color:#8B1E2D; }
    .doravo-landing .pv-tag.gold{ background:#F6EEDC; color:#7A5B1E; }
    .doravo-landing .pv-list{ display:flex; flex-direction:column; }
    .doravo-landing .pv-li{ display:flex; align-items:center; gap:9px; padding:8px 0; border-top:1px solid #EEF0F3; }
    .doravo-landing .pv-li:first-child{ border-top:none; }
    .doravo-landing .pv-av{ width:22px; height:22px; border-radius:50%; background:#EADBDF; flex:none; }
    .doravo-landing .pv-grow{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .doravo-landing .pv-track{ height:6px; border-radius:99px; background:#EEF0F3; overflow:hidden; }
    .doravo-landing .pv-fill{ height:100%; border-radius:99px; background:#8B1E2D; transform-origin:left; animation:pvGrow 1.3s cubic-bezier(0.16,1,0.3,1) both; }
    .doravo-landing .pv-fill.gold{ background:#B8923F; }
    .doravo-landing .pv-bars{ display:flex; align-items:flex-end; gap:8px; height:84px; padding-top:6px; }
    .doravo-landing .pv-bars i{ flex:1; background:#8B1E2D; border-radius:4px 4px 0 0; transform-origin:bottom; animation:pvRise 1s cubic-bezier(0.16,1,0.3,1) both; }
    .doravo-landing .pv-bars i:nth-child(even){ background:#B8923F; }
    .doravo-landing .pv-axis{ display:flex; gap:8px; margin-top:5px; color:#64748B; font-size:10px; }
    .doravo-landing .pv-axis span{ flex:1; text-align:center; }
    @keyframes pvGrow{ from{ transform:scaleX(0); } to{ transform:scaleX(1); } }
    @keyframes pvRise{ from{ transform:scaleY(0); } to{ transform:scaleY(1); } }
    @keyframes pvIn{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } }
    @keyframes pvPop{ 0%{ transform:scale(0.7); opacity:0; } 100%{ transform:scale(1); opacity:1; } }
    @keyframes pvBlink{ 50%{ opacity:0.35; } }
    .doravo-landing .pv-in{ animation:pvIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
    .doravo-landing .pv-pop{ animation:pvPop 0.4s cubic-bezier(0.16,1,0.3,1) both; }

    .doravo-landing .pv-opt{ display:flex; align-items:center; gap:9px; border:1px solid #E2E5EA; background:#fff; border-radius:9px; padding:9px 11px; }
    .doravo-landing .pv-opt .r{ width:13px; height:13px; border-radius:50%; border:1.5px solid #B5BCC8; flex:none; }
    .doravo-landing .pv-opt.sel{ border-color:#8B1E2D; background:#FBEAEC; }
    .doravo-landing .pv-opt.sel .r{ border-color:#8B1E2D; background:radial-gradient(circle,#8B1E2D 45%,transparent 50%); }
    .doravo-landing .pv-rec{ display:inline-flex; align-items:center; gap:6px; }
    .doravo-landing .pv-rec b{ width:7px; height:7px; border-radius:50%; background:#DC2626; animation:pvBlink 1.6s infinite; }
    .doravo-landing .pv-dotsrow{ display:flex; gap:5px; flex-wrap:wrap; }
    .doravo-landing .pv-dotsrow i{ width:18px; height:18px; border-radius:5px; background:#EEF0F3; font:600 9.5px 'Inter',sans-serif; font-style:normal; color:#64748B; display:flex; align-items:center; justify-content:center; }
    .doravo-landing .pv-dotsrow i.d{ background:#ECFDF3; color:#15803D; }
    .doravo-landing .pv-dotsrow i.c{ background:#8B1E2D; color:#fff; }
    .doravo-landing .pv table{ width:100%; border-collapse:collapse; }
    .doravo-landing .pv th{ text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:#64748B; font-weight:600; padding:6px 8px; }
    .doravo-landing .pv td{ padding:8px; border-top:1px solid #EEF0F3; font-size:11.5px; }
    .doravo-landing .pv-sw{ display:inline-flex; gap:3px; }
    .doravo-landing .pv-sw b{ width:20px; height:20px; border-radius:6px; font:700 10px 'Inter',sans-serif; display:flex; align-items:center; justify-content:center; background:#EEF0F3; color:#64748B; }
    .doravo-landing .pv-sw b.p{ background:#ECFDF3; color:#15803D; }
    .doravo-landing .pv-sw b.a{ background:#FBEAEC; color:#8B1E2D; }
    .doravo-landing .pv-tabs{ display:flex; gap:14px; border-bottom:1px solid #E2E5EA; font-weight:600; color:#64748B; }
    .doravo-landing .pv-tabs span{ padding:0 0 8px; }
    .doravo-landing .pv-tabs span.on{ color:#8B1E2D; border-bottom:2px solid #8B1E2D; margin-bottom:-1px; }
    .doravo-landing .pv-big{ width:44px; height:44px; border-radius:50%; background:#EADBDF; flex:none; }
    @media (max-width:640px){
      .doravo-landing .pv-side{ display:none; }
      .doravo-landing .pv-row.c4{ grid-template-columns:repeat(2,1fr); }
      .doravo-landing .pv-row.c2, .doravo-landing .pv-row.c3{ grid-template-columns:1fr; }
    }
    @media (prefers-reduced-motion: reduce){
      .doravo-landing .pv-fill, .doravo-landing .pv-bars i, .doravo-landing .pv-in, .doravo-landing .pv-pop, .doravo-landing .pv-rec b{ animation:none; }
    }
  `;
  document.head.appendChild(el);
};

const d = (n) => ({ animationDelay: `${n}ms` });

/* Browser-style frame + honest caption */
export function Frame({ url, caption = "Illustrative preview · sample data", children }) {
  useEffect(injectPreviewStyles, []);
  return (
    <figure className="pv-wrap" style={{ margin: 0 }}>
      <div className="pv-frame" aria-hidden="true">
        <div className="pv-bar">
          <span className="pv-dot" /><span className="pv-dot" /><span className="pv-dot" />
          <span className="pv-url">{url}</span>
        </div>
        {children}
      </div>
      <figcaption className="pv-cap">{caption}</figcaption>
    </figure>
  );
}

const Side = ({ active }) => (
  <aside className="pv-side">
    <div className="pv-brand"><span className="pv-mark" />Doravo Core</div>
    {["Dashboard", "Students", "Teachers", "Fees", "Attendance", "Users"].map((n) => (
      <div key={n} className={`pv-nav ${n === active ? "on" : ""}`}>{n}</div>
    ))}
  </aside>
);

/* ---------- Admin dashboard (hero) ---------- */
export function DashboardPreview() {
  const bars = [62, 78, 70, 88, 81, 94];
  return (
    <div className="pv">
      <Side active="Dashboard" />
      <div className="pv-main">
        <div className="pv-in"><div className="pv-h">Overview</div><div className="pv-sub">Today at your school</div></div>
        <div className="pv-row c4">
          {[["Students", "—"], ["Teachers", "—"], ["Attendance", "92%"], ["Open assessments", "3"]].map(([k, v], i) => (
            <div className="pv-card pv-in" style={d(120 + i * 90)} key={k}>
              <div className="pv-k">{k}</div><div className="pv-v">{v}</div>
            </div>
          ))}
        </div>
        <div className="pv-row c2">
          <div className="pv-card pv-in" style={d(480)}>
            <div className="pv-k">Weekly attendance</div>
            <div className="pv-bars">
              {bars.map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${650 + i * 90}ms` }} />)}
            </div>
            <div className="pv-axis">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => <span key={x}>{x}</span>)}</div>
          </div>
          <div className="pv-card pv-in" style={d(600)}>
            <div className="pv-k">Recent assessments</div>
            <div className="pv-list">
              {[["Mathematics · Term test", "Graded", "ok"], ["English · Essay", "Marking", "gold"], ["Science · Quiz", "Scheduled", "warn"]].map(([t, s, c], i) => (
                <div className="pv-li pv-in" style={d(780 + i * 120)} key={t}>
                  <span className="pv-grow">{t}</span><span className={`pv-tag ${c}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- E-exam screen (student) ---------- */
export function ExamPreview() {
  const [sec, setSec] = useState(24 * 60 + 38);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <div className="pv" style={{ flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: "#fff", borderBottom: "1px solid #E2E5EA" }}>
        <span className="pv-h" style={{ flex: 1 }}>Term test · Mathematics</span>
        <span className="pv-rec"><b />Camera on</span>
        <span className="pv-tag red" style={{ fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</span>
      </div>
      <div className="pv-main">
        <div className="pv-sub pv-in">Question 4 of 12</div>
        <div className="pv-card pv-in" style={d(100)}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Which of these is a prime number?</div>
        </div>
        {["21", "29", "33", "39"].map((o, i) => (
          <div className={`pv-opt pv-in ${i === 1 ? "sel" : ""}`} style={d(220 + i * 90)} key={o}>
            <span className="r" />{o}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="pv-in">
          <div className="pv-dotsrow" style={{ flex: 1 }}>
            {Array.from({ length: 12 }, (_, i) => <i key={i} className={i < 3 ? "d" : i === 3 ? "c" : ""}>{i + 1}</i>)}
          </div>
          <span className="pv-tag ok">Answers saved</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Marking progress ---------- */
export function MarkingPreview() {
  const rows = [["Teacher A", 100], ["Teacher B", 78], ["Teacher C", 54]];
  return (
    <div className="pv" style={{ flexDirection: "column" }}>
      <div className="pv-main">
        <div className="pv-in"><div className="pv-h">Marking progress</div><div className="pv-sub">English · Essay assessment</div></div>
        <div className="pv-card pv-in" style={d(120)}>
          <div className="pv-k">Allocated responses marked</div>
          <div className="pv-track" style={{ margin: "6px 0 4px" }}><div className="pv-fill" style={{ width: "74%", animationDelay: "300ms" }} /></div>
          <div className="pv-sub">Moves as each question is marked</div>
        </div>
        <div className="pv-card pv-in" style={d(240)}>
          <div className="pv-k">By teacher</div>
          <div className="pv-list">
            {rows.map(([n, p], i) => (
              <div className="pv-li" key={n}>
                <span className="pv-tag gold">#{i + 1}</span>
                <span style={{ width: 70 }}>{n}</span>
                <div className="pv-track" style={{ flex: 1 }}><div className="pv-fill gold" style={{ width: `${p}%`, animationDelay: `${450 + i * 150}ms` }} /></div>
                <span className="pv-sub" style={{ width: 30, textAlign: "right" }}>{p}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pv-card pv-in" style={d(380)} >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="pv-tag gold">Suggestion</span>
            <span className="pv-grow">Suggested mark 7 / 10 · awaiting teacher review</span>
            <span className="pv-tag ok">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Students ---------- */
export function StudentsPreview() {
  return (
    <div className="pv">
      <Side active="Students" />
      <div className="pv-main">
        <div className="pv-card pv-in" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="pv-big" />
          <div style={{ flex: 1 }}>
            <div className="pv-h">Student name</div>
            <div className="pv-sub">Class · Admission no.</div>
          </div>
          <span className="pv-tag ok">Enrolled</span>
        </div>
        <div className="pv-tabs pv-in" style={d(120)}><span className="on">Profile</span><span>Marks</span><span>Attendance</span><span>Fees</span></div>
        <div className="pv-row c3">
          {[["Class", "Form 2"], ["Attendance", "94%"], ["Latest average", "—"]].map(([k, v], i) => (
            <div className="pv-card pv-in" style={d(240 + i * 90)} key={k}><div className="pv-k">{k}</div><div className="pv-v" style={{ fontSize: 15 }}>{v}</div></div>
          ))}
        </div>
        <div className="pv-card pv-in" style={d(520)}>
          <div className="pv-k">Academic history</div>
          {["Term 1", "Term 2", "Term 3"].map((t) => (
            <div className="pv-li" key={t}><span className="pv-grow">{t}</span><span className="pv-tag ok">Report card ready</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Attendance register ---------- */
export function AttendancePreview() {
  const marks = ["p", "p", "a", "p", "p", "p"];
  return (
    <div className="pv">
      <Side active="Attendance" />
      <div className="pv-main">
        <div className="pv-in" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}><div className="pv-h">Class register</div><div className="pv-sub">Form 2 · Mathematics</div></div>
          <span className="pv-tag ok">5 present</span><span className="pv-tag red">1 absent</span>
        </div>
        <div className="pv-card pv-in" style={d(120)}>
          <table>
            <thead><tr><th>Student</th><th style={{ textAlign: "right" }}>Status</th></tr></thead>
            <tbody>
              {marks.map((m, i) => (
                <tr key={i}>
                  <td>Student {String(i + 1).padStart(2, "0")}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className="pv-sw pv-pop" style={d(300 + i * 140)}>
                      <b className={m === "p" ? "p" : ""}>P</b><b className={m === "a" ? "a" : ""}>A</b>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pv-sub pv-in" style={d(1200)}>Registers roll up into per-student and school-wide records.</div>
      </div>
    </div>
  );
}

/* ---------- Fees ---------- */
export function FeesPreview() {
  return (
    <div className="pv">
      <Side active="Fees" />
      <div className="pv-main">
        <div className="pv-in"><div className="pv-h">Fee statement</div><div className="pv-sub">Student name · Term 2</div></div>
        <div className="pv-row c3">
          {[["Billed", "—"], ["Paid", "—"], ["Balance", "—"]].map(([k, v], i) => (
            <div className="pv-card pv-in" style={d(120 + i * 90)} key={k}><div className="pv-k">{k}</div><div className="pv-v" style={{ fontSize: 15 }}>{v}</div></div>
          ))}
        </div>
        <div className="pv-card pv-in" style={d(420)}>
          <div className="pv-k">Payments</div>
          {[["Tuition instalment", "Paid", "ok"], ["Boarding", "Paid", "ok"], ["Activity fee", "Pending", "warn"]].map(([t, s, c], i) => (
            <div className="pv-li pv-in" style={d(560 + i * 130)} key={t}>
              <span className="pv-grow">{t}</span><span className={`pv-tag ${c}`}>{s}</span>
            </div>
          ))}
        </div>
        <div className="pv-sub pv-in" style={d(1000)}>Balances follow your school's own fee structure.</div>
      </div>
    </div>
  );
}

/* ---------- Reports ---------- */
export function ReportsPreview() {
  return (
    <div className="pv">
      <Side active="Dashboard" />
      <div className="pv-main">
        <div className="pv-in"><div className="pv-h">Report card</div><div className="pv-sub">Generated from live records</div></div>
        <div className="pv-card pv-in" style={d(120)}>
          <table>
            <thead><tr><th>Subject</th><th>Marks</th><th style={{ width: "40%" }}>Progress</th></tr></thead>
            <tbody>
              {[["Mathematics", 78], ["English", 71], ["Science", 84], ["History", 66]].map(([s, m], i) => (
                <tr key={s}>
                  <td>{s}</td><td>{m}</td>
                  <td><div className="pv-track"><div className="pv-fill" style={{ width: `${m}%`, animationDelay: `${350 + i * 140}ms` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pv-card pv-in" style={d(700)} >
          <span className="pv-tag gold">Notification</span>{" "}
          <span>New results are available for Form 2.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- School administration ---------- */
export function AdminPreview() {
  return (
    <div className="pv">
      <Side active="Users" />
      <div className="pv-main">
        <div className="pv-in"><div className="pv-h">Operations</div><div className="pv-sub">Gate, meals and leave-out</div></div>
        <div className="pv-row c2">
          <div className="pv-card pv-in" style={d(120)}>
            <div className="pv-k">Gate & visitor log</div>
            {[["Visitor in", "09:12"], ["Delivery in", "10:05"], ["Visitor out", "10:40"]].map(([t, h], i) => (
              <div className="pv-li pv-in" style={d(260 + i * 120)} key={t}><span className="pv-grow">{t}</span><span className="pv-sub">{h}</span></div>
            ))}
          </div>
          <div className="pv-card pv-in" style={d(260)}>
            <div className="pv-k">Leave-out requests</div>
            {[["Request 1", "Approved", "ok"], ["Request 2", "Pending", "warn"]].map(([t, s, c], i) => (
              <div className="pv-li pv-in" style={d(420 + i * 120)} key={t}><span className="pv-grow">{t}</span><span className={`pv-tag ${c}`}>{s}</span></div>
            ))}
          </div>
        </div>
        <div className="pv-card pv-in" style={d(700)}>
          <div className="pv-k">Meal card</div>
          <div className="pv-dotsrow">{Array.from({ length: 14 }, (_, i) => <i key={i} className={i < 9 ? "d" : ""}>{i < 9 ? "✓" : ""}</i>)}</div>
        </div>
      </div>
    </div>
  );
}

const MAP = {
  dashboard: [DashboardPreview, "Doravo Core · Dashboard"],
  exam: [ExamPreview, "Doravo Core · E-assessment"],
  marking: [MarkingPreview, "Doravo Core · Marking"],
  students: [StudentsPreview, "Doravo Core · Students"],
  attendance: [AttendancePreview, "Doravo Core · Attendance"],
  fees: [FeesPreview, "Doravo Core · Fees"],
  reports: [ReportsPreview, "Doravo Core · Reports"],
  admin: [AdminPreview, "Doravo Core · Administration"],
};

/* Renders the real screenshot if one is configured, otherwise the coded preview. */
export default function Preview({ name }) {
  const [Comp, url] = MAP[name] || MAP.dashboard;
  const shot = SCREENSHOTS[name];
  return shot ? (
    <Frame url={url} caption="Product screenshot">
      <img className="pv-shot" src={shot} alt={`Doravo Core ${name} screen`} loading="lazy" />
    </Frame>
  ) : (
    <Frame url={url}>
      <Comp />
    </Frame>
  );
}
