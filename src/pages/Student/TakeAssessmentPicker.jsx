import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  MonitorCheck,
  Clock,
  Loader2,
  Inbox,
  AlertTriangle,
  FileText,
  PlayCircle,
  Timer,
  BookOpen,
  Eye,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  GraduationCap,
  RefreshCw,
} from "lucide-react";

const injectPickerStyles = () => {
  if (document.getElementById("doravo-assessment-picker-styles")) return;

  const style = document.createElement("style");
  style.id = "doravo-assessment-picker-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    .assessment-picker {
      --ap-bg: var(--bg, #F8FAFC);
      --ap-card: var(--card, #FFFFFF);
      --ap-border: var(--border, #E2E5EA);
      --ap-text: var(--text, #0B0F19);
      --ap-secondary: var(--text-secondary, #384152);
      --ap-muted: var(--text-muted, #64748B);
      --ap-primary: var(--primary, #8B1E2D);
      --ap-primary-dark: var(--primary-dark, #6F1725);
      --ap-tint: var(--primary-tint, #FBEAEC);
      --ap-gold: #D4AF37;
      color: var(--ap-text);
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .assessment-picker * { box-sizing: border-box; }
    .ap-shell { width: 100%; max-width: 1440px; margin: 0 auto; }
    .ap-hero {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 28px;
      padding: clamp(24px, 4vw, 42px);
      border-radius: 24px;
      background: linear-gradient(118deg, #6F1725 0%, #8B1E2D 58%, #A83242 100%);
      color: #fff;
      box-shadow: 0 16px 36px rgba(111, 23, 37, .16);
      margin-bottom: 30px;
    }
    .ap-hero::before, .ap-hero::after {
      content: "";
      position: absolute;
      z-index: -1;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 50%;
      pointer-events: none;
    }
    .ap-hero::before { width: 330px; height: 330px; right: -80px; top: -190px; }
    .ap-hero::after { width: 240px; height: 240px; right: 90px; bottom: -190px; }
    .ap-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      color: #F5DFA0; font-size: 12px; font-weight: 800;
      letter-spacing: .13em; text-transform: uppercase; margin-bottom: 13px;
    }
    .ap-hero h1 {
      margin: 0; color: #fff; font-size: clamp(27px, 3.1vw, 39px);
      line-height: 1.12; letter-spacing: -.04em; font-weight: 800;
    }
    .ap-hero-copy {
      max-width: 680px; margin: 13px 0 0; color: rgba(255,255,255,.84);
      font-size: 15px; line-height: 1.75;
    }
    .ap-hero-tip {
      display: flex; align-items: center; gap: 10px; margin-top: 22px;
      color: rgba(255,255,255,.94); font-size: 13px; font-weight: 600;
    }
    .ap-hero-tip svg { color: #F5DFA0; flex-shrink: 0; }
    .ap-hero-art {
      display: grid; place-items: center; width: 124px; height: 124px;
      border-radius: 28px; border: 1px solid rgba(255,255,255,.24);
      background: rgba(255,255,255,.10); color: #F5DFA0;
      transform: rotate(3deg); flex-shrink: 0;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.14);
    }
    .ap-hero-art svg { width: 60px; height: 60px; }

    .ap-section { margin: 0 0 34px; }
    .ap-section-heading {
      display: flex; justify-content: space-between; align-items: center;
      gap: 16px; margin-bottom: 17px;
    }
    .ap-section-title-wrap { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .ap-section-mark {
      width: 42px; height: 42px; border-radius: 13px;
      display: grid; place-items: center; color: var(--ap-primary);
      background: var(--ap-tint); flex-shrink: 0;
    }
    .ap-section-title { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 800; letter-spacing: -.025em; }
    .ap-section-sub { margin: 4px 0 0; font-size: 12px; color: var(--ap-muted); line-height: 1.5; }
    .ap-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 32px; height: 28px; padding: 0 9px; border-radius: 9px;
      background: var(--ap-card); border: 1px solid var(--ap-border);
      color: var(--ap-secondary); font-size: 12px; font-weight: 800;
    }
    .ap-live-label {
      display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px;
      border: 1px solid rgba(21,128,61,.18); border-radius: 999px;
      background: var(--success-tint, #ECFDF3); color: var(--success, #15803D);
      font-size: 11px; font-weight: 800; white-space: nowrap;
    }
    .ap-live-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: ap-pulse 1.5s ease-in-out infinite; }
    @keyframes ap-pulse { 50% { opacity: .4; } }

    .ap-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 390px), 1fr));
      gap: 18px; align-items: stretch;
    }
    .ap-card {
      position: relative; min-width: 0; overflow: hidden;
      display: flex; flex-direction: column; border: 1px solid var(--ap-border);
      border-radius: 19px; background: var(--ap-card);
      box-shadow: 0 2px 8px rgba(15,23,42,.025);
      transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
    }
    .ap-card:hover { transform: translateY(-2px); border-color: rgba(139,30,45,.45); box-shadow: 0 12px 28px rgba(15,23,42,.07); }
    .ap-card.ap-selected { border-color: var(--ap-primary); box-shadow: 0 0 0 3px var(--ap-tint), 0 12px 28px rgba(15,23,42,.05); }
    .ap-card-stripe { height: 4px; width: 100%; background: linear-gradient(90deg, var(--ap-primary), var(--ap-gold)); }
    .ap-card-content { display: flex; flex: 1; flex-direction: column; padding: 22px; }
    .ap-card-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 17px; }
    .ap-open-chip {
      display: inline-flex; align-items: center; gap: 7px; border-radius: 8px;
      padding: 7px 9px; color: var(--success, #15803D);
      background: var(--success-tint, #ECFDF3); font-size: 11px; font-weight: 800;
    }
    .ap-open-chip .ap-live-dot { width: 6px; height: 6px; }
    .ap-duration { display: inline-flex; align-items: center; gap: 6px; color: var(--ap-muted); font-size: 12px; font-weight: 700; }
    .ap-card-title { margin: 0; color: var(--ap-text); font-size: 21px; line-height: 1.32; font-weight: 800; letter-spacing: -.025em; overflow-wrap: anywhere; }
    .ap-subject {
      display: flex; align-items: center; gap: 8px; margin: 10px 0 0;
      color: var(--ap-secondary); font-size: 13px; font-weight: 600;
    }
    .ap-subject svg { color: var(--ap-primary); flex-shrink: 0; }
    .ap-divider { height: 1px; background: var(--ap-border); margin: 20px 0 16px; }
    .ap-time-panel {
      display: flex; align-items: center; gap: 13px; padding: 15px;
      border: 1px solid rgba(21,128,61,.12); border-radius: 13px;
      background: var(--success-tint, #ECFDF3);
    }
    .ap-time-panel.ap-urgent { background: var(--warning-tint, #FFFBEB); border-color: rgba(180,83,9,.18); }
    .ap-time-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; background: rgba(255,255,255,.66); color: var(--success, #15803D); flex-shrink: 0; }
    .ap-time-panel.ap-urgent .ap-time-icon { color: var(--warning, #B45309); }
    .ap-time-label { color: var(--ap-secondary); font-size: 11px; font-weight: 700; margin-bottom: 3px; }
    .ap-time-value { color: var(--ap-text); font-size: 22px; line-height: 1.2; font-weight: 800; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
    .ap-time-note { margin-top: 3px; color: var(--ap-muted); font-size: 10px; }
    .ap-card-actions { display: flex; align-items: stretch; gap: 9px; margin-top: auto; padding-top: 20px; }
    .ap-btn {
      min-height: 45px; display: inline-flex; align-items: center; justify-content: center;
      gap: 8px; border-radius: 11px; padding: 11px 14px; font-family: inherit;
      font-size: 12px; font-weight: 800; cursor: pointer; text-decoration: none;
      transition: background .16s ease, transform .16s ease, border-color .16s ease;
    }
    .ap-btn:active { transform: translateY(1px); }
    .ap-btn-primary { flex: 1; border: 1px solid var(--ap-primary); background: var(--ap-primary); color: #fff; }
    .ap-btn-primary:hover { background: var(--ap-primary-dark); border-color: var(--ap-primary-dark); }
    .ap-btn-secondary { border: 1px solid var(--ap-border); background: var(--ap-card); color: var(--ap-secondary); }
    .ap-btn-secondary:hover, .ap-btn-secondary.ap-btn-active { border-color: var(--ap-primary); color: var(--ap-primary); background: var(--ap-tint); }

    .ap-empty {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 48px 22px; border: 1px dashed var(--ap-border); border-radius: 18px;
      background: var(--ap-card);
    }
    .ap-empty-icon { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 18px; background: var(--ap-tint); color: var(--ap-primary); margin-bottom: 15px; }
    .ap-empty-title { margin: 0; color: var(--ap-text); font-size: 17px; font-weight: 800; }
    .ap-empty-copy { max-width: 390px; margin: 7px 0 0; color: var(--ap-muted); font-size: 13px; line-height: 1.65; }
    .ap-reassurance {
      display: flex; align-items: center; justify-content: center; gap: 9px;
      margin-top: 18px; color: var(--ap-muted); font-size: 11px; line-height: 1.5; text-align: center;
    }
    .ap-reassurance svg { color: var(--success, #15803D); flex-shrink: 0; }
    .ap-error {
      display: flex; align-items: center; gap: 11px; padding: 13px 15px; margin-bottom: 22px;
      border: 1px solid var(--destructive, #DC2626); border-radius: 12px;
      background: var(--destructive-tint, #FEF2F2); color: var(--ap-text); font-size: 13px;
    }
    .ap-error-message { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .ap-retry { display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px; border: 1px solid var(--ap-border); border-radius: 8px; background: var(--ap-card); color: var(--ap-text); font: inherit; font-weight: 800; cursor: pointer; flex-shrink: 0; }
    .ap-loading { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 200px; color: var(--ap-secondary); font-size: 13px; font-weight: 700; }
    .ap-spin { animation: ap-spin .8s linear infinite; }
    @keyframes ap-spin { to { transform: rotate(360deg); } }

    .ap-cover-wrap { overflow: hidden; height: min(75vh, 900px); min-height: 360px; border: 1px solid var(--ap-border); border-radius: 16px; background: var(--ap-card); box-shadow: 0 6px 24px rgba(15,23,42,.05); }
    .ap-cover-frame { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
    .ap-cover-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .ap-cover-title { margin: 0; font-size: 18px; font-weight: 800; }
    .ap-cover-name { color: var(--ap-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .assessment-picker button:focus-visible { outline: 3px solid var(--ap-gold); outline-offset: 3px; }
    @media (max-width: 680px) {
      .ap-hero { grid-template-columns: 1fr; padding: 25px 21px; border-radius: 18px; }
      .ap-hero-art { display: none; }
      .ap-hero-copy { font-size: 13px; }
      .ap-hero-tip { align-items: flex-start; font-size: 12px; }
      .ap-section-heading { align-items: flex-start; }
      .ap-section-title { font-size: 18px; }
      .ap-card-content { padding: 17px; }
      .ap-card-title { font-size: 19px; }
      .ap-card-actions { flex-direction: column; }
      .ap-btn { width: 100%; }
      .ap-btn-secondary { min-height: 42px; }
      .ap-cover-wrap { min-height: 320px; height: 62vh; }
    }
    @media (prefers-reduced-motion: reduce) {
      .assessment-picker *, .assessment-picker *::before, .assessment-picker *::after {
        animation-duration: .01ms !important; animation-iteration-count: 1 !important;
        transition-duration: .01ms !important; scroll-behavior: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
};

const END_KEYS = [
  "end_time",
  "ends_at",
  "scheduled_end",
  "end_at",
  "available_until",
  "closes_at",
];

const pickTime = (row, keys) => {
  for (const key of keys) {
    if (row?.[key]) {
      const timestamp = new Date(row[key]).getTime();
      if (!Number.isNaN(timestamp)) return timestamp;
    }
  }
  return null;
};

const pad2 = (number) => String(number).padStart(2, "0");

const fmtCountdown = (milliseconds) => {
  if (milliseconds <= 0) return "0s";
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(minutes)}m`;
  if (hours > 0) return `${hours}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  return `${minutes}m ${pad2(seconds)}s`;
};

export default function TakeAssessmentPicker() {
  injectPickerStyles();

  const navigate = useNavigate();
  const [data, setData] = useState({ active: [], fetchedAt: Date.now() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/e-assessments/public/covers");
      const payload = response.data || {};
      setData({
        active: Array.isArray(payload.active) ? payload.active : [],
        fetchedAt: Date.now(),
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "We couldn't load assessments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
    const poll = setInterval(fetchAssessments, 60000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const active = useMemo(() => {
    const relativeEnd = (seconds) =>
      seconds === null || seconds === undefined
        ? null
        : data.fetchedAt + Number(seconds) * 1000;

    return data.active
      .map((row) => ({
        ...row,
        _end: relativeEnd(row.seconds_until_end) ?? pickTime(row, END_KEYS),
      }))
      .filter((row) => row._end === null || row._end > now);
  }, [data, now]);

  const selected =
    active.find((assessment) => String(assessment.id) === String(selectedId)) ||
    active.find((assessment) => assessment.cover_page_url) ||
    active[0] ||
    null;

  return (
    <main
      className="assessment-picker dash-main"
      style={{
        padding: "clamp(20px, 3vw, 40px) clamp(16px, 3vw, 42px) 56px",
        background: "var(--bg, #F8FAFC)",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div className="ap-shell">
        <header className="ap-hero">
          <div>
            <div className="ap-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Your next achievement starts here
            </div>
            <h1>Ready to show what you know?</h1>
            <p className="ap-hero-copy">
              Choose an assessment that is open, take a steady breath, and do your best.
              Read each question carefully and trust the preparation you have put in.
            </p>
            <div className="ap-hero-tip">
              <ShieldCheck size={17} aria-hidden="true" />
              Have your username and exam password ready before you begin.
            </div>
          </div>
          <div className="ap-hero-art" aria-hidden="true">
            <GraduationCap />
          </div>
        </header>

        {error && !loading && (
          <div className="ap-error" role="alert">
            <AlertTriangle size={19} aria-hidden="true" />
            <span className="ap-error-message">{error}</span>
            <button className="ap-retry" onClick={fetchAssessments} type="button">
              <RefreshCw size={14} aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {loading && data.active.length === 0 ? (
          <div className="ap-loading" role="status" aria-live="polite">
            <Loader2 size={21} className="ap-spin" aria-hidden="true" />
            Checking for open assessments…
          </div>
        ) : (
          <>
            <section className="ap-section" aria-labelledby="ap-open-heading">
              <div className="ap-section-heading">
                <div className="ap-section-title-wrap">
                  <div className="ap-section-mark">
                    <MonitorCheck size={21} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="ap-open-heading" className="ap-section-title">
                      Open assessments
                    </h2>
                    <p className="ap-section-sub">
                      Select a paper below when you're ready to begin.
                    </p>
                  </div>
                  <span className="ap-count" aria-label={`${active.length} open assessments`}>
                    {active.length}
                  </span>
                </div>
                <span className="ap-live-label">
                  <span className="ap-live-dot" aria-hidden="true" />
                  Live updates
                </span>
              </div>

              {active.length === 0 ? (
                <div className="ap-empty">
                  <div className="ap-empty-icon">
                    <Inbox size={27} aria-hidden="true" />
                  </div>
                  <h3 className="ap-empty-title">No assessment is open just yet</h3>
                  <p className="ap-empty-copy">
                    You're in the right place. When your teacher opens an assessment,
                    it will appear here automatically. You can come back shortly.
                  </p>
                  <div className="ap-reassurance">
                    <ShieldCheck size={15} aria-hidden="true" />
                    Keep preparing — your next opportunity will show up here.
                  </div>
                </div>
              ) : (
                <div className="ap-grid">
                  {active.map((assessment) => {
                    const isSelected =
                      selected &&
                      String(selected.id) === String(assessment.id);
                    const timeLeft = assessment._end
                      ? assessment._end - now
                      : null;
                    const urgent =
                      timeLeft !== null && timeLeft < 10 * 60 * 1000;

                    return (
                      <article
                        key={assessment.id}
                        className={`ap-card${isSelected ? " ap-selected" : ""}`}
                      >
                        <div className="ap-card-stripe" aria-hidden="true" />
                        <div className="ap-card-content">
                          <div className="ap-card-top">
                            <span className="ap-open-chip">
                              <span className="ap-live-dot" aria-hidden="true" />
                              Open now
                            </span>
                            {assessment.duration_minutes ? (
                              <span className="ap-duration">
                                <Clock size={15} aria-hidden="true" />
                                {assessment.duration_minutes} minutes allowed
                              </span>
                            ) : null}
                          </div>

                          <h3 className="ap-card-title">{assessment.title}</h3>
                          {assessment.subject && (
                            <p className="ap-subject">
                              <BookOpen size={16} aria-hidden="true" />
                              {assessment.subject}
                            </p>
                          )}

                          <div className="ap-divider" />

                          <div className={`ap-time-panel${urgent ? " ap-urgent" : ""}`}>
                            <div className="ap-time-icon">
                              <Timer size={22} aria-hidden="true" />
                            </div>
                            <div>
                              <div className="ap-time-label">
                                {assessment._end ? "Time remaining to start/submit" : "Time allowed"}
                              </div>
                              <div className="ap-time-value">
                                {assessment._end
                                  ? fmtCountdown(timeLeft)
                                  : `${assessment.duration_minutes || "Not set"}${
                                      assessment.duration_minutes ? " minutes" : ""
                                    }`}
                              </div>
                              <div className="ap-time-note">
                                {urgent
                                  ? "The closing time is approaching."
                                  : "Work calmly and keep an eye on your time."}
                              </div>
                            </div>
                          </div>

                          <div className="ap-card-actions">
                            <button
                              className="ap-btn ap-btn-primary"
                              type="button"
                              onClick={() =>
                                navigate(`/take-assessment/${assessment.id}`)
                              }
                            >
                              <PlayCircle size={18} aria-hidden="true" />
                              Start assessment
                              <ArrowUpRight size={15} aria-hidden="true" />
                            </button>
                            {assessment.cover_page_url && (
                              <button
                                className={`ap-btn ap-btn-secondary${
                                  isSelected ? " ap-btn-active" : ""
                                }`}
                                type="button"
                                aria-pressed={!!isSelected}
                                onClick={() => setSelectedId(assessment.id)}
                              >
                                <Eye size={16} aria-hidden="true" />
                                View cover
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <div className="ap-reassurance">
                <ShieldCheck size={15} aria-hidden="true" />
                Take your time to read instructions carefully. You can do this.
              </div>
            </section>

            {selected?.cover_page_url && (
              <section className="ap-section" aria-label="Selected assessment cover page">
                <div className="ap-section-heading">
                  <div className="ap-section-title-wrap">
                    <div className="ap-section-mark">
                      <FileText size={20} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="ap-cover-title">Assessment cover page</h2>
                      <div className="ap-cover-name">{selected.title}</div>
                    </div>
                  </div>
                </div>
                <div className="ap-cover-wrap">
                  <iframe
                    key={selected.id}
                    src={`${resolveFileUrl(selected.cover_page_url)}#toolbar=0&navpanes=0&view=FitH`}
                    title={`${selected.title} cover page`}
                    className="ap-cover-frame"
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
