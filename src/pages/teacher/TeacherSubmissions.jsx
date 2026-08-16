import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";
import jsPDF from "jspdf";

/* ─────────────────────────────────────────────
   Design tokens — strict black & white system,
   available as a light and a dark theme. Every
   value below is a CSS custom property so the
   whole page repaints instantly on toggle with
   no re-render of the tree itself.
───────────────────────────────────────────── */
const C = {
  bg:         "var(--bg)",
  surface:    "var(--surface)",
  card:       "var(--card)",
  cardHover:  "var(--card-hover)",
  elevated:   "var(--elevated)",
  border:     "var(--border)",
  borderHi:   "var(--border-hi)",
  white:      "var(--invert)",       // the "bright" accent — white in dark, black in light
  invertText: "var(--invert-text)",  // text drawn on top of the accent
  textPri:    "var(--text-pri)",
  textSec:    "var(--text-sec)",
  textMuted:  "var(--text-muted)",
};

const FONT_UI   = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SF Mono', ui-monospace, monospace";

const THEME_KEY = "tv_theme_preference";

/* ─────────────────────────────────────────────
   Icon set — thin, precise, single-stroke.
   Every icon shares stroke width + cap style so
   the set reads as one considered family.
───────────────────────────────────────────── */
const Icon = ({ children, size = 16, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

const IconSearch    = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>;
const IconX          = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>;
const IconRefresh    = (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5" /></Icon>;
const IconArrowLeft  = (p) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Icon>;
const IconLock       = (p) => <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></Icon>;
const IconUnlock     = (p) => <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 7.5-2" /></Icon>;
const IconCheck      = (p) => <Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>;
const IconCheckCircle= (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></Icon>;
const IconClock      = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
const IconFile       = (p) => <Icon {...p}><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" /><path d="M14 3.5V8h4" /></Icon>;
const IconDownload   = (p) => <Icon {...p}><path d="M12 4v11m0 0l-4-4m4 4l4-4" /><path d="M5 18.5h14" /></Icon>;
const IconChevron    = ({ dir = "down", ...p }) => <Icon {...p}><path d={dir === "up" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} /></Icon>;
const IconChevronsUD = (p) => <Icon {...p}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></Icon>;
const IconAlert      = (p) => <Icon {...p}><path d="M12 3.5L2.5 20h19L12 3.5z" /><path d="M12 10v4.2" /><circle cx="12" cy="17.3" r="0.6" fill="currentColor" stroke="none" /></Icon>;
const IconInbox      = (p) => <Icon {...p}><path d="M4 12h4l2 3h4l2-3h4" /><path d="M5 12L4 5.5a1 1 0 0 1 1-1.1h14a1 1 0 0 1 1 1.1L19 12v6.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V12z" /></Icon>;
const IconLayers     = (p) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5M3 17.5l9 5 9-5" /></Icon>;
const IconTrend      = (p) => <Icon {...p}><path d="M4 16l6-6 4 4 6-8" /><path d="M14 6h6v6" /></Icon>;
const IconSigma      = (p) => <Icon {...p}><path d="M18 5H7l6 7-6 7h11" /></Icon>;
const IconPercent    = (p) => <Icon {...p}><path d="M18 6L6 18" /><circle cx="7.5" cy="7.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /></Icon>;
const IconFilter     = (p) => <Icon {...p}><path d="M4 5h16M7 12h10M10.5 19h3" /></Icon>;
const IconSun        = (p) => <Icon {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.6M12 18.9v2.6M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8" /></Icon>;
const IconMoon       = (p) => <Icon {...p}><path d="M20.2 14.7A8.5 8.5 0 1 1 9.3 3.8a7 7 0 0 0 10.9 10.9z" /></Icon>;

export default function TeacherSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assessmentId = id;

  const [submissions, setSubmissions]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField]       = useState("submitted_at");
  const [sortDir, setSortDir]           = useState("desc");
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [toast, setToast]               = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [remarkModal, setRemarkModal]   = useState(null);
  const [remarkReason, setRemarkReason] = useState("");
  const [remarkReasonErr, setRemarkReasonErr] = useState("");
  const reasonRef = useRef(null);

  /* ─────────────────────────────────────────────
     Theme — persisted in localStorage, falls back
     to the OS-level preference on first visit.
  ───────────────────────────────────────────── */
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch { /* ignore */ }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ─────────────────────────────────────────────
     localStorage — persists remark requests and
     reasons across page refreshes, exactly as the
     original did. Only cleared when the DB returns
     remark_status = "approved" (admin approved).
  ───────────────────────────────────────────── */
  const REMARK_KEY = `remark_requests_${assessmentId}`;

  const getStoredRequests = () => {
    try { return JSON.parse(localStorage.getItem(REMARK_KEY) || "{}"); }
    catch { return {}; }
  };

  const setStoredRequest = (subId, reason = "") => {
    try {
      const stored = getStoredRequests();
      stored[subId] = { requested: true, reason };
      localStorage.setItem(REMARK_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
  };

  const clearStoredRequest = (subId) => {
    try {
      const stored = getStoredRequests();
      delete stored[subId];
      localStorage.setItem(REMARK_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
  };

  /* ─────────────────────────────────────────────
     Status helpers — reading DB columns:
       remark_requested : tinyint(1)  1 = requested
       remark_status    : "pending" | "approved" | null
       remark_reason    : text

     Priority: DB values win; localStorage fills the
     gap for submissions not yet synced from the DB.
  ───────────────────────────────────────────── */
  const isMarked   = (sub) => sub.score !== null && sub.score !== undefined;
  const isApproved = (sub) => sub.remark_status === "approved";
  const isPending  = (sub) =>
    sub.remark_requested == 1 && sub.remark_status === "pending";

  // Locked = marked but NOT yet approved for a remark
  const isLocked = (sub) =>
    isMarked(sub) &&
    !isApproved(sub);

  /* ─────────────────────────────────────────────
     Fetch — merges DB data with localStorage so
     state is always consistent after a refresh.
  ───────────────────────────────────────────── */
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/e-assessments/submissions/${assessmentId}`);
      let data = [];
      if (Array.isArray(res.data))                   data = res.data;
      else if (Array.isArray(res.data?.data))        data = res.data.data;
      else if (Array.isArray(res.data?.submissions)) data = res.data.submissions;

      const stored = getStoredRequests();

      data = data.map(sub => {
        /* ── DB says approved → clear localStorage, unlock ── */
        if (sub.remark_status === "approved") {
          clearStoredRequest(sub.id);
          return sub;
        }

        /* ── DB already shows pending → trust it ── */
        if (sub.remark_requested == 1 && sub.remark_status === "pending") {
          return sub;
        }

        /* ── DB not yet updated but localStorage has a request
              (e.g. teacher requested, page refreshed before DB
              propagated) → apply optimistic state ── */
        const local = stored[sub.id];
        if (local?.requested) {
          return {
            ...sub,
            remark_requested: 1,
            remark_status:    "pending",
            remark_reason:    local.reason || sub.remark_reason || "",
          };
        }

        return sub;
      });

      setSubmissions(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load submissions.");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (assessmentId) fetchSubmissions(); }, [assessmentId]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total   = submissions.length;
    const marked  = submissions.filter(isMarked).length;
    const pending = total - marked;
    const locked  = submissions.filter(isLocked).length;
    const scores  = submissions.map(s => Number(s.score)).filter(n => !isNaN(n) && n !== 0);
    const average = scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
    const highest  = scores.length ? Math.max(...scores) : "—";
    const passRate = scores.length
      ? Math.round((scores.filter(n => n >= 50).length / scores.length) * 100) : "—";
    return { total, marked, pending, locked, average, highest, passRate };
  }, [submissions]);

  /* ── Filter + sort ── */
  const processed = useMemo(() => {
    let list = submissions.filter(s => {
      const name = String(s.student_name || s.student_id || "").toLowerCase();
      const matchSearch = name.includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all"       ? true :
        statusFilter === "marked"    ? isMarked(s) :
        statusFilter === "pending"   ? !isMarked(s) :
        statusFilter === "locked"    ? isLocked(s) :
        statusFilter === "requested" ? isPending(s) :
        statusFilter === "approved"  ? isApproved(s) : true;
      return matchSearch && matchStatus;
    });
    list = [...list].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === "submitted_at") { av = new Date(av || 0); bv = new Date(bv || 0); }
      else { av = Number(av) || 0; bv = Number(bv) || 0; }
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [submissions, search, statusFilter, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <IconChevronsUD size={12} style={{ color: C.textMuted, marginLeft: 5 }} />;
    return <IconChevron dir={sortDir === "asc" ? "up" : "down"} size={12} style={{ color: C.textPri, marginLeft: 5 }} />;
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () =>
    setSelectedIds(prev =>
      prev.size === processed.length ? new Set() : new Set(processed.map(s => s.id)));

  /* ── Open remark modal ── */
  const openRemarkModal = (sub) => {
    if (isPending(sub)) {
      showToast("Remark already requested for this submission.", "error");
      return;
    }
    setRemarkReason("");
    setRemarkReasonErr("");
    setRemarkModal({ sub });
    setTimeout(() => reasonRef.current?.focus(), 80);
  };

  /* ── Submit remark request ──
     1. Validates reason is not empty
     2. POSTs { reason } to the backend
     3. Saves to localStorage so refresh keeps the state
     4. Optimistically updates local React state
  ── */
  const submitRemarkRequest = async () => {
    if (!remarkReason.trim()) {
      setRemarkReasonErr("Please enter a reason before submitting.");
      return;
    }
    const sub = remarkModal.sub;
    try {
      setRequestingId(sub.id);
      await API.post(`/e-assessments/submissions/${sub.id}/request-remark`, {
        reason: remarkReason.trim(),
      });

      // Persist to localStorage — survives refresh
      setStoredRequest(sub.id, remarkReason.trim());

      // Optimistic update matching exact DB columns
      setSubmissions(prev =>
        prev.map(x =>
          x.id === sub.id
            ? {
                ...x,
                remark_requested: 1,
                remark_status:    "pending",
                remark_reason:    remarkReason.trim(),
              }
            : x
        )
      );
      setRemarkModal(null);
      showToast("Remark request sent to admin.");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to send remark request.", "error");
    } finally {
      setRequestingId(null);
    }
  };

  /* ── Bulk export ── */
  const exportSelected = () => {
    const targets = submissions.filter(s => selectedIds.has(s.id));
    if (!targets.length) { showToast("Select at least one submission.", "error"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Bulk Assessment Report", 20, 20);
    doc.setFontSize(11);
    let y = 35;
    targets.forEach((s, i) => {
      doc.text(
        `${i + 1}. ${s.student_name || s.student_id}  |  Score: ${s.score ?? "Pending"}  |  Status: ${s.status || "Submitted"}`,
        20, y
      );
      y += 10;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`bulk_report_assessment_${assessmentId}.pdf`);
    showToast(`Exported ${targets.length} submissions.`);
  };
  const isRemarkCompleted = (sub) =>
    sub.remark_completed == 1 || sub.remark_status === "completed";

  /* ── Single PDF ── */
  const downloadReport = (s) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Assessment Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Student:       ${s.student_name || s.student_id}`, 20, 40);
    doc.text(`Submission ID: ${s.id}`,                           20, 52);
    doc.text(`Score:         ${s.score ?? "Not Marked"}`,        20, 64);
    doc.text(`Status:        ${s.status || "Submitted"}`,        20, 76);
    doc.text(`Submitted:     ${s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}`, 20, 88);
    if (s.remark_reason) doc.text(`Remark Reason: ${s.remark_reason}`, 20, 100);
    doc.save(`submission_${s.id}.pdf`);
    showToast("PDF downloaded.");
  };

  const ThemeToggle = () => (
    <button
      className="tv-btn tv-btn-icon"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
    </button>
  );

  if (loading) return (
    <div style={{ ...s.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} data-theme={theme}>
      <GlobalStyle />
      <div style={s.spinner} />
      <p style={{ color: C.textSec, marginTop: 18, fontSize: 13, letterSpacing: "0.02em" }}>Loading submissions…</p>
    </div>
  );

  return (
    <div style={s.page} data-theme={theme}>
      <GlobalStyle />

      {/* Toast */}
      {toast && (
        <div style={s.toast} className="tv-toast">
          <span style={{ color: C.textPri, opacity: 0.9 }}>
            {toast.type === "error" ? <IconX size={15} /> : <IconCheck size={15} />}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Remark-reason modal */}
      {remarkModal && (
        <div style={s.modalBackdrop} onClick={() => setRemarkModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: C.textPri, letterSpacing: "-0.01em" }}>
              Request remark
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textSec }}>
              {remarkModal.sub.student_name || `Student #${remarkModal.sub.student_id}`}
              <span style={{ color: C.textMuted, margin: "0 8px" }}>·</span>
              <span style={{ fontFamily: FONT_MONO, color: C.textPri }}>{remarkModal.sub.score} pts</span>
            </p>

            <label style={s.label}>
              Reason for remark
            </label>
            <textarea
              ref={reasonRef}
              rows={4}
              placeholder="Explain why this submission should be re-marked…"
              value={remarkReason}
              onChange={e => { setRemarkReason(e.target.value); setRemarkReasonErr(""); }}
              style={{ ...s.textarea, borderColor: remarkReasonErr ? C.textPri : C.border }}
              className="tv-textarea"
            />
            {remarkReasonErr && (
              <p style={{ margin: "7px 0 0", fontSize: 12, color: C.textPri, display: "flex", alignItems: "center", gap: 6 }}>
                <IconAlert size={13} /> {remarkReasonErr}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
              <button className="tv-btn tv-btn-ghost" onClick={() => setRemarkModal(null)}>
                Cancel
              </button>
              <button
                className="tv-btn tv-btn-solid"
                style={{ opacity: requestingId === remarkModal.sub.id ? 0.5 : 1 }}
                disabled={requestingId === remarkModal.sub.id}
                onClick={submitRemarkRequest}
              >
                {requestingId === remarkModal.sub.id ? "Requesting…" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="tv-btn tv-btn-ghost tv-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => navigate(-1)}>
            <IconArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={s.title}>Submissions</h1>
            <p style={s.subtitle}>
              Assessment <span style={{ fontFamily: FONT_MONO, color: C.textPri }}>#{assessmentId}</span>
            </p>
          </div>
        </div>

        <div style={s.headerActions}>
          <div style={s.searchWrap}>
            <IconSearch size={15} style={{ position: "absolute", left: 12, color: C.textMuted }} />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={s.search}
              className="tv-input"
            />
            {search && (
              <button style={s.clearBtn} onClick={() => setSearch("")} aria-label="Clear search">
                <IconX size={13} />
              </button>
            )}
          </div>

          <div style={s.selectWrap}>
            <IconFilter size={13} style={{ position: "absolute", left: 12, color: C.textMuted, pointerEvents: "none" }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={s.select} className="tv-input">
              <option value="all">All statuses</option>
              <option value="marked">Marked</option>
              <option value="pending">Pending</option>
              <option value="locked">Locked</option>
              <option value="requested">Remark requested</option>
              <option value="approved">Approved for remark</option>
            </select>
          </div>

          <button className="tv-btn tv-btn-icon" onClick={fetchSubmissions} title="Refresh" aria-label="Refresh">
            <IconRefresh size={15} />
          </button>

          <ThemeToggle />
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        <StatCard label="Total"     value={stats.total}    icon={<IconLayers size={17} />} />
        <StatCard label="Marked"    value={stats.marked}   icon={<IconCheckCircle size={17} />} />
        <StatCard label="Pending"   value={stats.pending}  icon={<IconClock size={17} />} />
        <StatCard label="Locked"    value={stats.locked}   icon={<IconLock size={17} />} />
        <StatCard label="Avg score" value={stats.average}  icon={<IconSigma size={17} />} mono />
        <StatCard label="Highest"   value={stats.highest}  icon={<IconTrend size={17} />} mono />
        <StatCard label="Pass rate"
          value={stats.passRate === "—" ? "—" : `${stats.passRate}%`}
          icon={<IconPercent size={17} />} mono />
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBanner}>
          <IconAlert size={16} />
          <span>{error}</span>
          <button className="tv-btn tv-btn-ghost tv-btn-sm" style={{ marginLeft: "auto" }} onClick={fetchSubmissions}>Retry</button>
        </div>
      )}

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <div style={s.bulkBar}>
          <span style={{ color: C.textSec, fontSize: 13 }}>
            <span style={{ fontFamily: FONT_MONO, color: C.textPri }}>{selectedIds.size}</span> selected
          </span>
          <button className="tv-btn tv-btn-solid tv-btn-sm" onClick={exportSelected}>
            <IconDownload size={14} /> Export PDF
          </button>
          <button className="tv-btn tv-btn-ghost tv-btn-sm" onClick={() => setSelectedIds(new Set())}>Clear</button>
        </div>
      )}

      {/* Table */}
      {!error && processed.length === 0 ? (
        <div style={s.empty}>
          <IconInbox size={30} style={{ color: C.textMuted, marginBottom: 14 }} />
          <p style={{ color: C.textSec, fontSize: 14 }}>No submissions match your filters.</p>
          {(search || statusFilter !== "all") && (
            <button
              className="tv-btn tv-btn-ghost tv-btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <Th style={{ width: 40 }}>
                  <input type="checkbox"
                    checked={selectedIds.size === processed.length && processed.length > 0}
                    onChange={toggleAll}
                    className="tv-checkbox"
                  />
                </Th>
                <Th>#</Th>
                <Th>Student</Th>
                <Th onClick={() => handleSort("score")} style={{ cursor: "pointer" }}>
                  Score <SortIcon field="score" />
                </Th>
                <Th>Status</Th>
                <Th onClick={() => handleSort("submitted_at")} style={{ cursor: "pointer" }}>
                  Submitted <SortIcon field="submitted_at" />
                </Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {processed.map((sub, i) => {
                const marked   = isMarked(sub);
                const locked   = isLocked(sub);
                const approved = isApproved(sub);
                const pending  = isPending(sub);
                const isSelected = selectedIds.has(sub.id);

                /* ── Status label driven entirely by DB columns ── */
                let statusLabel;
                if (!marked) {
                  statusLabel = sub.status || "Submitted";
                } else if (approved) {
                  statusLabel = "Approved for remark";
                } else if (pending) {
                  statusLabel = "Remark requested";
                } else {
                  statusLabel = "Marked";
                }

                return (
                  <tr key={sub.id} className="tv-row" style={{ background: isSelected ? "var(--card-hover)" : "transparent" }}>
                    <Td>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(sub.id)} className="tv-checkbox" />
                    </Td>
                    <Td style={{ color: C.textMuted, fontSize: 12, fontFamily: FONT_MONO }}>{i + 1}</Td>
                    <Td>
                      <div style={{ fontWeight: 500, color: C.textPri, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}>
                        {sub.student_name || `Student #${sub.student_id}`}
                        {locked && !approved && (
                          <span title="Locked — awaiting admin approval to remark" style={{ color: C.textMuted, display: "flex" }}>
                            <IconLock size={12} />
                          </span>
                        )}
                        {approved && (
                          <span title="Approved by admin — you may remark" style={{ color: C.textPri, display: "flex" }}>
                            <IconUnlock size={12} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontFamily: FONT_MONO }}>ID {sub.id}</div>
                      {sub.remark_reason && (
                        <div
                          style={{ fontSize: 11, color: C.textSec, marginTop: 3, fontStyle: "italic", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={sub.remark_reason}
                        >
                          {sub.remark_reason}
                        </div>
                      )}
                    </Td>
                    <Td>
                      {marked
                        ? <ScoreBadge score={sub.score} />
                        : <span style={{ color: C.textMuted, fontSize: 13 }}>—</span>}
                    </Td>
                    <Td><StatusPill status={statusLabel} /></Td>
                    <Td style={{ color: C.textSec, fontSize: 12.5, fontFamily: FONT_MONO }}>
                      {sub.submitted_at
                        ? new Date(sub.submitted_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>

                        {/* Mark (unmarked) or Remark (approved) — hidden while locked+pending */}
                        {(!marked || (approved && !isRemarkCompleted(sub))) && (
                          <button
                            className="tv-btn tv-btn-ghost tv-btn-sm"
                            onClick={() => navigate(`/teacher/e-assessments/marking/${sub.id}`)}
                          >
                            {marked ? "Remark" : "Mark"}
                          </button>
                        )}

                        {/* Request Remark — only when locked and not yet pending */}
                        {locked && !pending && !approved && !isRemarkCompleted(sub) && (
                          <button
                            className="tv-btn tv-btn-ghost tv-btn-sm"
                            onClick={() => openRemarkModal(sub)}
                          >
                            Request remark
                          </button>
                        )}

                        {/* Awaiting admin — when remark_requested=1 and remark_status=pending */}
                        {pending && (
                          <span className="tv-btn tv-btn-sm" style={{ color: C.textMuted, border: `1px solid ${C.border}`, cursor: "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <IconClock size={12} /> Awaiting admin
                          </span>
                        )}

                        <button
                          className="tv-btn tv-btn-icon tv-btn-sm"
                          onClick={() => downloadReport(sub)}
                          title="Download PDF"
                          aria-label="Download PDF"
                        >
                          <IconFile size={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={s.tableFooter}>
            <span>{processed.length} of {submissions.length} submissions</span>
            {selectedIds.size > 0 && <span style={{ color: C.textPri }}>{selectedIds.size} selected</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ label, value, icon, mono }) {
  return (
    <div className="tv-stat" style={s.statCard}>
      <div style={s.statIconWrap}>{icon}</div>
      <div>
        <div style={{ fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.textPri, fontFamily: mono ? FONT_MONO : FONT_UI, letterSpacing: "-0.01em" }}>{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    "Marked":               { filled: true,  Icon: IconCheckCircle },
    "Submitted":            { filled: false, Icon: IconClock },
    "Pending":               { filled: false, Icon: IconClock },
    "Remark requested":      { filled: false, Icon: IconClock },
    "Approved for remark":   { filled: true,  Icon: IconUnlock },
  };
  const t = map[status] || map["Submitted"];
  const { Icon: I, filled } = t;
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 500, padding: "4px 10px 4px 8px", borderRadius: 99,
      background: filled ? C.white : "transparent",
      color: filled ? C.invertText : C.textSec,
      border: `1px solid ${filled ? C.white : C.border}`,
      display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    }}>
      <I size={11.5} />
      {status}
    </span>
  );
}

function ScoreBadge({ score }) {
  return (
    <span style={{ fontWeight: 600, fontSize: 14, color: C.textPri, fontFamily: FONT_MONO }}>
      {score}<span style={{ fontSize: 10.5, color: C.textMuted, marginLeft: 3, fontFamily: FONT_UI }}>pts</span>
    </span>
  );
}

function Th({ children, style, onClick }) {
  return (
    <th onClick={onClick} style={{ padding: "13px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", userSelect: "none", ...style }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>{children}</span>
    </th>
  );
}

function Td({ children, style }) {
  return (
    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

/* ── Global stylesheet: theme variables + hover/focus
      states live here so interaction and theme swaps
      don't trigger React re-renders — keeps the page
      feeling instant. ── */
function GlobalStyle() {
  return (
    <style>{`
      [data-theme='dark'] {
        --bg:#000000; --surface:#0a0a0a; --card:#0d0d0d; --card-hover:#161616; --elevated:#161616;
        --border:#1c1c1c; --border-hi:#2e2e2e;
        --text-pri:#f5f5f5; --text-sec:#8a8a8a; --text-muted:#4a4a4a;
        --invert:#ffffff; --invert-text:#000000;
        --selection: rgba(255,255,255,0.2);
        --shadow-toast: 0 12px 32px rgba(0,0,0,0.6);
        --shadow-modal: 0 24px 64px rgba(0,0,0,0.7);
        --backdrop: rgba(0,0,0,0.75);
      }
      [data-theme='light'] {
        --bg:#fafafa; --surface:#f1f1f1; --card:#ffffff; --card-hover:#f2f2f2; --elevated:#ffffff;
        --border:#e6e6e6; --border-hi:#d1d1d1;
        --text-pri:#111111; --text-sec:#6b6b6b; --text-muted:#a8a8a8;
        --invert:#000000; --invert-text:#ffffff;
        --selection: rgba(0,0,0,0.12);
        --shadow-toast: 0 8px 24px rgba(0,0,0,0.1);
        --shadow-modal: 0 20px 48px rgba(0,0,0,0.16);
        --backdrop: rgba(0,0,0,0.35);
      }

      @keyframes tv-spin { to { transform: rotate(360deg); } }
      @keyframes tv-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      * { box-sizing: border-box; }
      ::selection { background: var(--selection); }

      .tv-row { transition: background-color 0.12s ease; }
      .tv-row:hover { background: var(--card-hover) !important; }

      .tv-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        border: 1px solid var(--border); background: transparent; color: var(--text-pri);
        padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
        font-family: ${FONT_UI}; cursor: pointer; white-space: nowrap;
        transition: background-color 0.12s ease, border-color 0.12s ease, opacity 0.12s ease, transform 0.08s ease;
      }
      .tv-btn:hover { background: var(--card-hover); border-color: var(--border-hi); }
      .tv-btn:active { transform: scale(0.97); }
      .tv-btn:disabled { cursor: default; }
      .tv-btn-sm { padding: 6px 11px; font-size: 12.5px; border-radius: 7px; }
      .tv-btn-icon { padding: 8px; width: 34px; height: 34px; }
      .tv-btn-ghost { border-color: var(--border); }
      .tv-btn-solid { background: var(--invert); color: var(--invert-text); border-color: var(--invert); font-weight: 600; }
      .tv-btn-solid:hover { filter: brightness(0.88); }

      .tv-input {
        background: var(--surface); border: 1px solid var(--border); color: var(--text-pri);
        font-family: ${FONT_UI}; outline: none; transition: border-color 0.12s ease;
      }
      .tv-input:focus { border-color: var(--border-hi); }
      .tv-input::placeholder { color: var(--text-muted); }

      .tv-textarea { transition: border-color 0.12s ease; }
      .tv-textarea:focus { outline: none; border-color: var(--border-hi) !important; }

      .tv-checkbox {
        appearance: none; -webkit-appearance: none; width: 16px; height: 16px;
        border: 1px solid var(--border-hi); border-radius: 4px; cursor: pointer; position: relative;
        transition: background-color 0.12s ease, border-color 0.12s ease;
      }
      .tv-checkbox:checked { background: var(--invert); border-color: var(--invert); }
      .tv-checkbox:checked::after {
        content: ""; position: absolute; left: 5px; top: 1px; width: 4px; height: 8px;
        border: solid var(--invert-text); border-width: 0 1.6px 1.6px 0; transform: rotate(45deg);
      }

      .tv-stat { transition: border-color 0.15s ease, background-color 0.15s ease; }
      .tv-stat:hover { border-color: var(--border-hi); background: var(--card-hover); }

      .tv-toast { animation: tv-in 0.18s ease; }

      select.tv-input { appearance: none; -webkit-appearance: none; cursor: pointer; }
    `}</style>
  );
}

const s = {
  page: {
    minHeight: "100vh", background: C.bg, color: C.textPri,
    padding: "32px 32px 60px", fontFamily: FONT_UI, maxWidth: 1220, margin: "0 auto",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  spinner: {
    width: 28, height: 28, border: `2px solid ${C.border}`, borderTopColor: C.textPri,
    borderRadius: "50%", animation: "tv-spin 0.7s linear infinite",
  },
  toast: {
    position: "fixed", top: 22, right: 22, zIndex: 9999, padding: "12px 18px",
    borderRadius: 9, border: `1px solid ${C.borderHi}`, background: C.elevated,
    fontSize: 13.5, color: C.textPri, display: "flex", alignItems: "center", gap: 10,
    boxShadow: "var(--shadow-toast)",
  },
  modalBackdrop: {
    position: "fixed", inset: 0, zIndex: 9998, background: "var(--backdrop)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    backdropFilter: "blur(2px)",
  },
  modalBox: {
    background: C.elevated, border: `1px solid ${C.borderHi}`, borderRadius: 14,
    padding: "26px 26px 22px", width: "100%", maxWidth: 440,
    boxShadow: "var(--shadow-modal)",
  },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" },
  textarea: {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.textPri, fontSize: 13.5, padding: "10px 13px", resize: "vertical",
    fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.55,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 30 },
  title: { margin: 0, fontSize: 22, fontWeight: 600, color: C.textPri, letterSpacing: "-0.015em" },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: C.textSec },
  headerActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  search: { padding: "9px 34px 9px 34px", borderRadius: 8, fontSize: 13.5, minWidth: 210 },
  clearBtn: { position: "absolute", right: 9, background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 3, display: "flex" },
  selectWrap: { position: "relative", display: "flex", alignItems: "center" },
  select: { padding: "9px 14px 9px 32px", borderRadius: 8, fontSize: 13.5, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 10, marginBottom: 26 },
  statCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 },
  statIconWrap: { width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textPri, flexShrink: 0 },
  errorBanner: { background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 10, padding: "13px 16px", marginBottom: 18, display: "flex", gap: 11, alignItems: "center", color: C.textPri, fontSize: 13.5 },
  bulkBar: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" },
  tableWrap: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableFooter: { padding: "11px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textMuted },
  empty: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "56px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
};