import { useState } from "react";
import API from "../../api";
import AiMarkingPanel from "./AiMarkingPanel";
import AiReviewPanel from "./AiReviewPanel";
import AiSchemePanel from "./AiSchemePanel";
import AiCalibrationPanel from "./AiCalibrationPanel";
import AiAnalyticsPanel from "./AiAnalyticsPanel";

/* Teacher-side AI marking tools, mounted once on the Marking page.
   Collapsed by default so manual marking is untouched. The server keeps
   jobs/worker OFF unless AI_MARKING_JOBS_ENABLED / AI_MARKING_WORKER_ENABLED
   are "true". `API` already has baseURL ending in /api, hence the basePath. */
const BASE = "/e-assessments/ai-marking";
const TABS = ["Schemes", "AI marking", "Review", "Calibration", "Usage"];

export default function AiMarkingTools({ assessmentId = null }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("Schemes");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{ marginTop: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 18px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--text)" }}>AI-assisted marking (optional)</summary>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
                  border: "1px solid var(--border)", background: tab === t ? "var(--primary)" : "var(--card)", color: tab === t ? "#fff" : "var(--text)" }}>
                {t}
              </button>
            ))}
          </div>
          {tab === "Schemes" && (<><AiSchemePanel api={API} basePath={BASE} assessmentId={assessmentId} onChanged={refresh} /><div style={{ height: 16 }} /><AiCalibrationPanel key={tick} api={API} basePath={BASE} assessmentId={assessmentId} /></>)}
          {tab === "AI marking" && <AiMarkingPanel key={tick} api={API} basePath={BASE} assessmentId={assessmentId} />}
          {tab === "Review" && <AiReviewPanel api={API} basePath={BASE} assessmentId={assessmentId} onChanged={refresh} />}
          {tab === "Calibration" && <AiCalibrationPanel api={API} basePath={BASE} assessmentId={assessmentId} />}
          {tab === "Usage" && <AiAnalyticsPanel api={API} />}
        </div>
      )}
    </details>
  );
}
