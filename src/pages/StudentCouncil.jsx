import React, { useEffect, useState, useCallback } from "react";
import API, { resolvePhotoUrl } from "../api";
import {
  Vote, Plus, Users, FileText, Flag, Layers, BarChart3, CheckCircle2,
  XCircle, Loader2, ChevronRight, X, Search, UserRound, Trash2,
  AlertTriangle, PlayCircle, StopCircle, Award, Landmark, Ban, RotateCcw,
} from "lucide-react";

/* ─── shared design-token stylesheet — same tokens as the rest of
   the admin app; a no-op if already mounted. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    :root {
      --bg: #F8FAFC; --card: #FFFFFF; --card-elevated: #FFFFFF; --border: #E2E5EA;
      --text: #0B0F19; --text-secondary: #384152; --text-muted: #64748B;
      --primary: #8B1E2D; --primary-dark: #6F1725; --primary-tint: #FBEAEC;
      --success: #15803D; --success-tint: #ECFDF3; --warning: #B45309; --warning-tint: #FFFBEB;
      --destructive: #DC2626; --destructive-tint: #FEF2F2; --info: #1D4ED8; --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04); --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px; --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115; --card: #171A21; --card-elevated: #1D2129; --border: #323844;
      --text: #FFFFFF; --text-secondary: #C7CCD6; --text-muted: #9198A6;
      --primary: #E8A0A8; --primary-dark: #F3C0C6; --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80; --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24; --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185; --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF; --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3); --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    body { background: var(--bg); }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
    .sc-tab { transition: background .15s, color .15s; }
    .sc-tab:hover { background: var(--primary-tint); color: var(--primary-dark); }
    .sc-tab.active { background: var(--primary); color: #fff; font-weight: 700; }
    .sc-btn { transition: filter .15s; cursor: pointer; }
    .sc-btn:hover { filter: brightness(0.95); }
    .sc-row:hover { background: var(--bg); }
    .sc-card:hover { box-shadow: var(--shadow); }
  `;
  document.head.appendChild(el);
};

const STAGES = [
  "DRAFT", "APPLICATIONS_OPEN", "APPLICATIONS_CLOSED",
  "CANDIDATES_FINALIZED", "VOTING_OPEN", "VOTING_CLOSED", "RESULTS",
];
const STAGE_LABELS = {
  DRAFT: "Draft", APPLICATIONS_OPEN: "Applications Open", APPLICATIONS_CLOSED: "Applications Closed",
  CANDIDATES_FINALIZED: "Candidates Finalized", VOTING_OPEN: "Voting Open",
  VOTING_CLOSED: "Voting Closed", RESULTS: "Results",
};

const TABS = [
  { key: "posts", label: "Posts", Icon: Layers },
  { key: "applications", label: "Applications", Icon: FileText },
  { key: "candidates", label: "Candidates", Icon: Users },
  { key: "parties", label: "Parties", Icon: Flag },
  { key: "voting", label: "Voting & Results", Icon: BarChart3 },
];

export default function StudentCouncil() {
  injectStyles();

  const [elections, setElections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [toast, setToast] = useState(null);
  const [showNewElection, setShowNewElection] = useState(false);
  const [busy, setBusy] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadElections = useCallback(async () => {
    try {
      const res = await API.get("/student-council/elections");
      setElections(res.data || []);
      if (!selectedId && res.data?.length) setSelectedId(res.data[0].id);
    } catch (err) {
      console.log(err);
    }
  }, [selectedId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return setDetail(null);
    try {
      const res = await API.get(`/student-council/elections/${id}`);
      setDetail(res.data);
    } catch (err) {
      console.log(err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadElections();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const refreshAll = async () => {
    await Promise.all([loadElections(), loadDetail(selectedId)]);
  };

  const doTransition = async (action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await API.post(`/student-council/elections/${selectedId}/${action}`);
      showToast("Done");
      await refreshAll();
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const election = detail?.election;
  const stageIndex = election ? STAGES.indexOf(election.status) : -1;

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "var(--destructive)" : "var(--success)" }}>
          {toast.message}
        </div>
      )}

      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logoMark}><Vote size={20} color="#fff" /></div>
          <div>
            <h1 style={S.title}>Student Council — Elections</h1>
            <div style={S.subtitle}>Election Officer control center</div>
          </div>
        </div>
        <button className="sc-btn" style={S.primaryBtn} onClick={() => setShowNewElection(true)}>
          <Plus size={16} /> New Election
        </button>
      </div>

      {loading ? (
        <div style={S.loadingBox}><Loader2 className="dash-spin" size={22} /> Loading…</div>
      ) : elections.length === 0 ? (
        <div style={S.emptyBox}>
          <Vote size={32} color="var(--text-muted)" />
          <div style={{ marginTop: 8, fontWeight: 700 }}>No elections yet</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
            Create your first election to get started.
          </div>
          <button className="sc-btn" style={S.primaryBtn} onClick={() => setShowNewElection(true)}>
            <Plus size={16} /> Create Election
          </button>
        </div>
      ) : (
        <>
          {/* Election selector */}
          <div style={S.selectorRow}>
            <select
              value={selectedId || ""}
              onChange={(e) => { setSelectedId(Number(e.target.value)); setActiveTab("posts"); }}
              style={S.select}
            >
              {elections.map((e) => (
                <option key={e.id} value={e.id}>{e.title} — {STAGE_LABELS[e.status]}</option>
              ))}
            </select>
          </div>

          {election && (
            <>
              {/* Stage progress */}
              <div style={S.stageCard}>
                <div style={S.stageRow}>
                  {STAGES.map((s, i) => (
                    <React.Fragment key={s}>
                      <div style={{ ...S.stagePill, ...(i <= stageIndex ? S.stagePillDone : {}) }}>
                        {STAGE_LABELS[s]}
                      </div>
                      {i < STAGES.length - 1 && <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                    </React.Fragment>
                  ))}
                </div>

                <div style={S.stageActions}>
                  {election.status === "DRAFT" && (
                    <button disabled={busy} className="sc-btn" style={S.actionBtn} onClick={() => doTransition("open-applications")}>
                      <PlayCircle size={15} /> Open Applications
                    </button>
                  )}
                  {election.status === "APPLICATIONS_OPEN" && (
                    <button disabled={busy} className="sc-btn" style={S.actionBtn} onClick={() => doTransition("close-applications", "Close applications for this election?")}>
                      <StopCircle size={15} /> Close Applications
                    </button>
                  )}
                  {election.status === "APPLICATIONS_CLOSED" && (
                    <button disabled={busy} className="sc-btn" style={S.actionBtn} onClick={() => doTransition("finalize-candidates", "Finalize all approved candidates? This locks their party/running mate/manifesto.")}>
                      <CheckCircle2 size={15} /> Finalize Candidates
                    </button>
                  )}
                  {election.status === "CANDIDATES_FINALIZED" && !detail.overview.ballotsGenerated && (
                    <button disabled={busy} className="sc-btn" style={S.actionBtn} onClick={() => doTransition("generate-ballots")}>
                      <Award size={15} /> Generate Ballots
                    </button>
                  )}
                  {election.status === "CANDIDATES_FINALIZED" && detail.overview.ballotsGenerated && (
                    <button disabled={busy} className="sc-btn" style={S.actionBtn} onClick={() => doTransition("open-voting")}>
                      <PlayCircle size={15} /> Open Voting
                    </button>
                  )}
                  {election.status === "VOTING_OPEN" && (
                    <button disabled={busy} className="sc-btn" style={{ ...S.actionBtn, background: "var(--destructive)" }} onClick={() => doTransition("close-voting", "Close voting? Students will no longer be able to vote.")}>
                      <StopCircle size={15} /> Close Voting
                    </button>
                  )}
                  {election.status === "VOTING_CLOSED" && (
                    <button disabled={busy} className="sc-btn" style={S.actionBtn} onClick={() => doTransition("publish-results", "Publish results to students?")}>
                      <BarChart3 size={15} /> Publish Results
                    </button>
                  )}
                </div>
              </div>

              {/* Overview stats */}
              <div style={S.statsGrid}>
                <StatCard label="Applications" value={detail.overview.totalApplications} Icon={FileText} />
                <StatCard label="Candidates" value={detail.overview.candidateCount} Icon={Users} />
                <StatCard label="Registered Voters" value={detail.overview.registeredVoters} Icon={UserRound} />
                <StatCard label="Votes Submitted" value={detail.overview.votesSubmitted} Icon={CheckCircle2} />
                <StatCard label="Turnout" value={`${detail.overview.votingPercentage}%`} Icon={BarChart3} />
              </div>

              {/* Tabs */}
              <div style={S.tabBar}>
                {TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    className={`sc-tab${activeTab === key ? " active" : ""}`}
                    style={S.tabBtn}
                    onClick={() => setActiveTab(key)}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <div style={S.tabContent}>
                {activeTab === "posts" && (
                  <PostsTab electionId={election.id} election={election} posts={detail.posts} onChange={refreshAll} showToast={showToast} />
                )}
                {activeTab === "applications" && (
                  <ApplicationsTab electionId={election.id} election={election} posts={detail.posts} onChange={refreshAll} showToast={showToast} />
                )}
                {activeTab === "candidates" && (
                  <CandidatesTab electionId={election.id} election={election} parties={detail.parties} onChange={refreshAll} showToast={showToast} />
                )}
                {activeTab === "parties" && (
                  <PartiesTab electionId={election.id} election={election} parties={detail.parties} onChange={refreshAll} showToast={showToast} />
                )}
                {activeTab === "voting" && (
                  <VotingResultsTab electionId={election.id} election={election} />
                )}
              </div>
            </>
          )}
        </>
      )}

      {showNewElection && (
        <NewElectionModal
          onClose={() => setShowNewElection(false)}
          onCreated={async (id) => {
            setShowNewElection(false);
            await loadElections();
            setSelectedId(id);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

/* ═══════════════════════ SHARED BITS ═══════════════════════ */

function StatCard({ label, value, Icon }) {
  return (
    <div className="sc-card" style={S.statCard}>
      <div style={S.statIcon}><Icon size={16} color="var(--primary)" /></div>
      <div>
        <div style={S.statValue}>{value}</div>
        <div style={S.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { bg: "var(--warning-tint)", color: "var(--warning)" },
    approved: { bg: "var(--success-tint)", color: "var(--success)" },
    rejected: { bg: "var(--destructive-tint)", color: "var(--destructive)" },
    suspended: { bg: "var(--destructive-tint)", color: "var(--destructive)" },
    active: { bg: "var(--success-tint)", color: "var(--success)" },
  };
  const c = map[status] || { bg: "var(--border)", color: "var(--text-secondary)" };
  return <span style={{ ...S.badge, background: c.bg, color: c.color }}>{status}</span>;
}

function Avatar({ photoUrl, name, size = 40 }) {
  const url = resolvePhotoUrl(photoUrl);
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />;
  }
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--primary-tint)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={S.iconBtn}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════ NEW ELECTION MODAL ═══════════════════════ */

function NewElectionModal({ onClose, onCreated, showToast }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return showToast("Title is required", "error");
    setSaving(true);
    try {
      const res = await API.post("/student-council/elections", { title, description });
      showToast("Election created");
      onCreated(res.data.id);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create election", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Election" onClose={onClose}>
      <label style={S.label}>Election Title</label>
      <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Student Council Elections 2026" />
      <label style={S.label}>Description (optional)</label>
      <textarea style={{ ...S.input, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />
      <button className="sc-btn" style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }} disabled={saving} onClick={submit}>
        {saving ? <Loader2 className="dash-spin" size={16} /> : <Plus size={16} />} Create Election
      </button>
    </Modal>
  );
}

/* ═══════════════════════ POSTS TAB ═══════════════════════ */

function PostsTab({ electionId, election, posts, onChange, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const canEdit = ["DRAFT", "APPLICATIONS_OPEN"].includes(election.status);

  const remove = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await API.delete(`/student-council/posts/${postId}`);
      showToast("Post deleted");
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete post", "error");
    }
  };

  return (
    <div>
      <div style={S.tabHeaderRow}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {posts.length} post{posts.length !== 1 ? "s" : ""} — college-wide or tied to a class.
        </div>
        {canEdit && (
          <button className="sc-btn" style={S.smallPrimaryBtn} onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Post
          </button>
        )}
      </div>

      <div style={S.grid3}>
        {posts.map((p) => (
          <div key={p.id} className="sc-card" style={S.postCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              {canEdit && (
                <button style={S.iconBtnSmall} onClick={() => remove(p.id)}><Trash2 size={14} color="var(--destructive)" /></button>
              )}
            </div>
            {p.description && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>{p.description}</div>}
            <div style={{ marginTop: 8 }}>
              {p.scope === "CLASS_BASED" ? (
                <span style={{ ...S.badge, background: "var(--info-tint)", color: "var(--info)" }}>Class: {p.studentClass}</span>
              ) : (
                <span style={{ ...S.badge, background: "var(--primary-tint)", color: "var(--primary)" }}>College-wide</span>
              )}
            </div>
          </div>
        ))}
        {posts.length === 0 && <div style={{ color: "var(--text-muted)" }}>No posts yet.</div>}
      </div>

      {showForm && (
        <PostFormModal electionId={electionId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); onChange(); }} showToast={showToast} />
      )}
    </div>
  );
}

function PostFormModal({ electionId, onClose, onSaved, showToast }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("COLLEGE_WIDE");
  const [studentClass, setStudentClass] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/student-classes").then((res) => setClassOptions((res.data || []).map((r) => r.studentClass).filter(Boolean))).catch(() => {});
  }, []);

  const submit = async () => {
    if (!title.trim()) return showToast("Post title is required", "error");
    if (scope === "CLASS_BASED" && !studentClass) return showToast("Select a class", "error");
    setSaving(true);
    try {
      await API.post(`/student-council/elections/${electionId}/posts`, { title, description, scope, studentClass });
      showToast("Post added");
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add post", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Election Post" onClose={onClose}>
      <label style={S.label}>Post Title</label>
      <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chairperson" />
      <label style={S.label}>Description (optional)</label>
      <input style={S.input} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label style={S.label}>Scope</label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="sc-btn" style={{ ...S.toggleBtn, ...(scope === "COLLEGE_WIDE" ? S.toggleBtnActive : {}) }} onClick={() => setScope("COLLEGE_WIDE")}>College-wide</button>
        <button className="sc-btn" style={{ ...S.toggleBtn, ...(scope === "CLASS_BASED" ? S.toggleBtnActive : {}) }} onClick={() => setScope("CLASS_BASED")}>Class-based</button>
      </div>
      {scope === "CLASS_BASED" && (
        <>
          <label style={S.label}>Class</label>
          <input
            style={S.input}
            list="sc-class-options"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            placeholder="e.g. BIO/Y2/A"
          />
          <datalist id="sc-class-options">
            {classOptions.map((c) => <option key={c} value={c} />)}
          </datalist>
        </>
      )}
      <button className="sc-btn" style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }} disabled={saving} onClick={submit}>
        {saving ? <Loader2 className="dash-spin" size={16} /> : <Plus size={16} />} Add Post
      </button>
    </Modal>
  );
}

/* ═══════════════════════ APPLICATIONS TAB ═══════════════════════ */

function ApplicationsTab({ electionId, election, posts, onChange, showToast }) {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await API.get(`/student-council/elections/${electionId}/applications`, { params });
      setApplications(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [electionId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try {
      await API.put(`/student-council/applications/${id}/approve`);
      showToast("Application approved");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve", "error");
    }
  };

  const reject = async (id) => {
    const reason = window.prompt("Reason for rejection (optional):") || "";
    try {
      await API.put(`/student-council/applications/${id}/reject`, { reason });
      showToast("Application rejected");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject", "error");
    }
  };

  const suspend = async (id) => {
    if (!window.confirm("Suspend this applicant? They'll be removed from the candidate list until reactivated.")) return;
    const reason = window.prompt("Reason for suspension (optional):") || "";
    try {
      await API.put(`/student-council/applications/${id}/suspend`, { reason });
      showToast("Application suspended");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to suspend", "error");
    }
  };

  const reactivate = async (id) => {
    try {
      await API.put(`/student-council/applications/${id}/reactivate`);
      showToast("Application reactivated");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reactivate", "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Permanently delete this application? This cannot be undone.")) return;
    try {
      await API.delete(`/student-council/applications/${id}`);
      showToast("Application deleted");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete", "error");
    }
  };

  return (
    <div>
      <div style={S.tabHeaderRow}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={S.selectSmall}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={S.loadingBox}><Loader2 className="dash-spin" size={18} /> Loading…</div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}></th>
                <th style={S.th}>Name</th>
                <th style={S.th}>Admission No.</th>
                <th style={S.th}>Class</th>
                <th style={S.th}>Post</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Applied</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="sc-row">
                  <td style={S.td}><Avatar photoUrl={a.photoUrl} name={a.name} size={32} /></td>
                  <td style={S.td}>
                    <button style={S.linkBtn} onClick={() => setSelected(a)}>{a.name}</button>
                  </td>
                  <td style={S.td}>{a.admissionNo}</td>
                  <td style={S.td}>{a.studentClass}</td>
                  <td style={S.td}>{a.postTitle}</td>
                  <td style={S.td}><StatusBadge status={a.status} /></td>
                  <td style={S.td}>{new Date(a.appliedAt).toLocaleDateString()}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button style={S.miniBtn} title="View" onClick={() => setSelected(a)}><Search size={13} color="var(--text-muted)" /></button>
                      {a.status === "pending" && (
                        <>
                          <button style={S.miniBtn} title="Approve" onClick={() => approve(a.id)}><CheckCircle2 size={13} color="var(--success)" /></button>
                          <button style={S.miniBtn} title="Reject" onClick={() => reject(a.id)}><XCircle size={13} color="var(--destructive)" /></button>
                          <button style={S.miniBtn} title="Suspend" onClick={() => suspend(a.id)}><Ban size={13} color="var(--warning)" /></button>
                        </>
                      )}
                      {a.status === "approved" && (
                        <button style={S.miniBtn} title="Suspend" onClick={() => suspend(a.id)}><Ban size={13} color="var(--warning)" /></button>
                      )}
                      {a.status === "suspended" && (
                        <button style={S.miniBtn} title="Reactivate" onClick={() => reactivate(a.id)}><RotateCcw size={13} color="var(--success)" /></button>
                      )}
                      {a.status !== "approved" && (
                        <button style={S.miniBtn} title="Delete" onClick={() => remove(a.id)}><Trash2 size={13} color="var(--destructive)" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr><td style={S.td} colSpan={8}>No applications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ApplicantDetailModal
          application={selected}
          onClose={() => setSelected(null)}
          onApprove={approve}
          onReject={reject}
          onSuspend={suspend}
          onReactivate={reactivate}
          onDelete={remove}
          showToast={showToast}
          onChange={() => { load(); onChange(); }}
        />
      )}
    </div>
  );
}

function ApplicantDetailModal({ application, onClose, onApprove, onReject, onSuspend, onReactivate, onDelete, showToast, onChange }) {
  const [manifesto, setManifesto] = useState(application.manifesto || "");
  const [saving, setSaving] = useState(false);

  const saveManifesto = async () => {
    setSaving(true);
    try {
      await API.put(`/student-council/applications/${application.id}/manifesto`, { manifesto });
      showToast("Manifesto updated");
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update manifesto", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Applicant Details" onClose={onClose} width={560}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar photoUrl={application.photoUrl} name={application.name} size={64} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{application.name}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{application.admissionNo} • {application.studentClass}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{application.gender || "—"} • Year {application.yearOfStudy}{application.Phone ? ` • ${application.Phone}` : ""}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Applying for: {application.postTitle}</div>
        <StatusBadge status={application.status} />
        {application.rejectionReason && (
          <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--destructive)" }}>Reason: {application.rejectionReason}</div>
        )}
      </div>

      <label style={S.label}>Manifesto</label>
      <textarea style={{ ...S.input, minHeight: 120 }} value={manifesto} onChange={(e) => setManifesto(e.target.value)} />
      <button className="sc-btn" style={{ ...S.smallPrimaryBtn, marginTop: 8 }} disabled={saving} onClick={saveManifesto}>
        {saving ? <Loader2 className="dash-spin" size={14} /> : "Save Manifesto"}
      </button>

      {application.status === "approved" && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-muted)", background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
          This applicant is now a candidate. Assign their <strong>party</strong> and <strong>running mate</strong> from the <strong>Candidates</strong> tab.
        </div>
      )}

      {application.status === "pending" && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="sc-btn" style={{ ...S.actionBtn, flex: 1, justifyContent: "center" }} onClick={() => { onApprove(application.id); onClose(); }}>
            <CheckCircle2 size={15} /> Approve
          </button>
          <button className="sc-btn" style={{ ...S.actionBtn, flex: 1, justifyContent: "center", background: "var(--destructive)" }} onClick={() => { onReject(application.id); onClose(); }}>
            <XCircle size={15} /> Reject
          </button>
          <button className="sc-btn" style={{ ...S.actionBtn, flex: 1, justifyContent: "center", background: "var(--warning)" }} onClick={() => { onSuspend(application.id); onClose(); }}>
            <Ban size={15} /> Suspend
          </button>
        </div>
      )}

      {application.status === "approved" && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="sc-btn" style={{ ...S.actionBtn, flex: 1, justifyContent: "center", background: "var(--warning)" }} onClick={() => { onSuspend(application.id); onClose(); }}>
            <Ban size={15} /> Suspend
          </button>
        </div>
      )}

      {application.status === "suspended" && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="sc-btn" style={{ ...S.actionBtn, flex: 1, justifyContent: "center" }} onClick={() => { onReactivate(application.id); onClose(); }}>
            <RotateCcw size={15} /> Reactivate
          </button>
        </div>
      )}

      {application.status !== "approved" && (
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="sc-btn" style={{ ...S.actionBtn, flex: 1, justifyContent: "center", background: "var(--destructive)" }} onClick={() => { onDelete(application.id); onClose(); }}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════ CANDIDATES TAB ═══════════════════════ */

function CandidatesTab({ electionId, election, parties, onChange, showToast }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningMateFor, setRunningMateFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/student-council/elections/${electionId}/candidates`);
      setCandidates(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => { load(); }, [load]);

  const assignParty = async (candidateId, partyId) => {
    try {
      await API.put(`/student-council/candidates/${candidateId}/party`, { partyId: partyId || null });
      showToast("Party assigned");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign party", "error");
    }
  };

  const removeRunningMate = async (candidateId) => {
    try {
      await API.delete(`/student-council/candidates/${candidateId}/running-mate`);
      showToast("Running mate removed");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove running mate", "error");
    }
  };

  const suspendCandidate = async (candidateId) => {
    if (!window.confirm("Suspend this candidate? They'll be excluded from ballots/voting until reactivated.")) return;
    try {
      await API.put(`/student-council/candidates/${candidateId}/suspend`);
      showToast("Candidate suspended");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to suspend candidate", "error");
    }
  };

  const reactivateCandidate = async (candidateId) => {
    try {
      await API.put(`/student-council/candidates/${candidateId}/reactivate`);
      showToast("Candidate reactivated");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reactivate candidate", "error");
    }
  };

  const unfinalizeCandidate = async (candidateId) => {
    if (!window.confirm("Unfinalize this candidate to allow editing again?")) return;
    try {
      await API.put(`/student-council/candidates/${candidateId}/unfinalize`);
      showToast("Candidate unfinalized");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to unfinalize candidate", "error");
    }
  };

  const removeCandidate = async (candidateId) => {
    if (!window.confirm("Remove this candidate? Their application will be marked rejected.")) return;
    try {
      await API.delete(`/student-council/candidates/${candidateId}`);
      showToast("Candidate removed");
      load();
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove candidate", "error");
    }
  };

  // group by post
  const byPost = {};
  for (const c of candidates) {
    if (!byPost[c.postTitle]) byPost[c.postTitle] = [];
    byPost[c.postTitle].push(c);
  }

  return (
    <div>
      {loading ? (
        <div style={S.loadingBox}><Loader2 className="dash-spin" size={18} /> Loading…</div>
      ) : Object.keys(byPost).length === 0 ? (
        <div style={{ color: "var(--text-muted)" }}>No candidates yet — approve applications first.</div>
      ) : (
        Object.entries(byPost).map(([postTitle, list]) => (
          <div key={postTitle} style={{ marginBottom: 22 }}>
            <div style={S.postGroupTitle}>{postTitle}</div>
            <div style={S.grid3}>
              {list.map((c) => (
                <div key={c.id} className="sc-card" style={S.candidateCard}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Avatar photoUrl={c.photoUrl} name={c.name} size={48} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.admissionNo} • {c.studentClass}</div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      {c.status === "suspended" && <StatusBadge status="suspended" />}
                      {c.isFinalized && <span style={{ ...S.badge, background: "var(--success-tint)", color: "var(--success)" }}>Finalized</span>}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={{ ...S.label, marginTop: 0 }}>Party</label>
                    <select
                      style={S.selectSmall}
                      value={c.partyId || ""}
                      disabled={c.isFinalized}
                      onChange={(e) => assignParty(c.id, e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Independent</option>
                      {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label style={{ ...S.label, marginTop: 0 }}>Running Mate</label>
                    {c.runningMateStudentId ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar photoUrl={c.runningMatePhotoUrl} name={c.runningMateName} size={28} />
                        <div style={{ fontSize: 12.5 }}>{c.runningMateName}</div>
                        {!c.isFinalized && (
                          <button style={S.iconBtnSmall} onClick={() => removeRunningMate(c.id)}><Trash2 size={12} color="var(--destructive)" /></button>
                        )}
                      </div>
                    ) : (
                      !c.isFinalized && (
                        <button className="sc-btn" style={S.miniOutlineBtn} onClick={() => setRunningMateFor(c)}>
                          <Plus size={12} /> Assign
                        </button>
                      )
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    {c.status === "active" ? (
                      <button className="sc-btn" style={{ ...S.miniOutlineBtn, color: "var(--warning)", borderColor: "var(--warning)" }} onClick={() => suspendCandidate(c.id)}>
                        <Ban size={12} /> Suspend
                      </button>
                    ) : (
                      <button className="sc-btn" style={{ ...S.miniOutlineBtn, color: "var(--success)", borderColor: "var(--success)" }} onClick={() => reactivateCandidate(c.id)}>
                        <RotateCcw size={12} /> Reactivate
                      </button>
                    )}
                    {c.isFinalized ? (
                      <button className="sc-btn" style={S.miniOutlineBtn} onClick={() => unfinalizeCandidate(c.id)}>
                        <XCircle size={12} /> Unfinalize
                      </button>
                    ) : (
                      <button className="sc-btn" style={{ ...S.miniOutlineBtn, color: "var(--destructive)", borderColor: "var(--destructive)" }} onClick={() => removeCandidate(c.id)}>
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {runningMateFor && (
        <RunningMateModal
          candidate={runningMateFor}
          onClose={() => setRunningMateFor(null)}
          onAssigned={() => { setRunningMateFor(null); load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function RunningMateModal({ candidate, onClose, onAssigned, showToast }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [roleLabel, setRoleLabel] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) return setResults([]);
      setSearching(true);
      try {
        const res = await API.get("/students", { params: { search, status: "active" } });
        setResults((res.data || []).filter((s) => s.id !== candidate.studentId));
      } catch (err) {
        console.log(err);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, candidate.studentId]);

  const assign = async (studentId) => {
    try {
      await API.put(`/student-council/candidates/${candidate.id}/running-mate`, { studentId, roleLabel });
      showToast("Running mate assigned");
      onAssigned();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign running mate", "error");
    }
  };

  return (
    <Modal title={`Assign Running Mate — ${candidate.name}`} onClose={onClose}>
      <label style={S.label}>Role label (optional)</label>
      <input style={S.input} value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="e.g. Deputy Chairperson" />
      <label style={S.label}>Search student</label>
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: "var(--text-muted)" }} />
        <input style={{ ...S.input, paddingLeft: 30 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or admission no." />
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 8 }}>
        {searching && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Searching…</div>}
        {results.map((s) => (
          <button key={s.id} className="sc-row" style={S.studentResultRow} onClick={() => assign(s.id)}>
            <Avatar photoUrl={s.photoUrl} name={s.name} size={32} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.admissionNo} • {s.studentClass}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ═══════════════════════ PARTIES TAB ═══════════════════════ */

function PartiesTab({ electionId, election, parties, onChange, showToast }) {
  const [showForm, setShowForm] = useState(false);

  const remove = async (id) => {
    if (!window.confirm("Delete this party?")) return;
    try {
      await API.delete(`/student-council/parties/${id}`);
      showToast("Party deleted");
      onChange();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete party", "error");
    }
  };

  return (
    <div>
      <div style={S.tabHeaderRow}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{parties.length} part{parties.length === 1 ? "y" : "ies"}</div>
        <button className="sc-btn" style={S.smallPrimaryBtn} onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Party
        </button>
      </div>

      <div style={S.grid3}>
        {parties.map((p) => (
          <div key={p.id} className="sc-card" style={S.postCard}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: p.colorHex || "var(--primary)" }} />
                <div style={{ fontWeight: 700 }}>{p.name}</div>
              </div>
              <button style={S.iconBtnSmall} onClick={() => remove(p.id)}><Trash2 size={14} color="var(--destructive)" /></button>
            </div>
            {p.slogan && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6, fontStyle: "italic" }}>"{p.slogan}"</div>}
          </div>
        ))}
        {parties.length === 0 && <div style={{ color: "var(--text-muted)" }}>No parties yet — candidates can also run as Independent.</div>}
      </div>

      {showForm && (
        <PartyFormModal electionId={electionId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); onChange(); }} showToast={showToast} />
      )}
    </div>
  );
}

function PartyFormModal({ electionId, onClose, onSaved, showToast }) {
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [colorHex, setColorHex] = useState("#8B1E2D");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return showToast("Party name is required", "error");
    setSaving(true);
    try {
      await API.post(`/student-council/elections/${electionId}/parties`, { name, slogan, colorHex });
      showToast("Party added");
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add party", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add School Party" onClose={onClose}>
      <label style={S.label}>Party Name</label>
      <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Party A" />
      <label style={S.label}>Slogan (optional)</label>
      <input style={S.input} value={slogan} onChange={(e) => setSlogan(e.target.value)} />
      <label style={S.label}>Color</label>
      <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} style={{ width: 60, height: 34, border: "1px solid var(--border)", borderRadius: 8 }} />
      <button className="sc-btn" style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }} disabled={saving} onClick={submit}>
        {saving ? <Loader2 className="dash-spin" size={16} /> : <Plus size={16} />} Add Party
      </button>
    </Modal>
  );
}

/* ═══════════════════════ VOTING & RESULTS TAB ═══════════════════════ */

function VotingResultsTab({ electionId, election }) {
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    let interval;
    const loadProgress = () => API.get(`/student-council/elections/${electionId}/progress`).then((r) => setProgress(r.data)).catch(() => {});
    loadProgress();
    if (election.status === "VOTING_OPEN") interval = setInterval(loadProgress, 5000);
    return () => interval && clearInterval(interval);
  }, [electionId, election.status]);

  useEffect(() => {
    if (["VOTING_CLOSED", "RESULTS"].includes(election.status)) {
      API.get(`/student-council/elections/${electionId}/results`).then((r) => setResults(r.data)).catch(() => {});
    }
  }, [electionId, election.status]);

  return (
    <div>
      {progress && (
        <div style={S.statsGrid}>
          <StatCard label="Registered Voters" value={progress.registeredVoters} Icon={UserRound} />
          <StatCard label="Votes Submitted" value={progress.votesSubmitted} Icon={CheckCircle2} />
          <StatCard label="Remaining" value={progress.remainingVoters} Icon={AlertTriangle} />
          <StatCard label="Turnout" value={`${progress.votingPercentage}%`} Icon={BarChart3} />
        </div>
      )}

      {!results && !["VOTING_CLOSED", "RESULTS"].includes(election.status) && (
        <div style={{ color: "var(--text-muted)", marginTop: 12 }}>
          Full results become available once voting has closed.
        </div>
      )}

      {results && (
        <div style={{ marginTop: 16 }}>
          {results.posts.map(({ post, results: postResults }) => (
            <div key={post.id} style={{ marginBottom: 20 }}>
              <div style={S.postGroupTitle}><Landmark size={14} style={{ marginRight: 6 }} />{post.title}</div>
              {postResults.map((r, i) => {
                const total = postResults.reduce((sum, x) => sum + x.votes, 0) || 1;
                const pct = Math.round((r.votes / total) * 100);
                return (
                  <div key={r.candidate?.studentId || i} style={S.resultRow}>
                    <Avatar photoUrl={r.candidate?.photoUrl} name={r.candidate?.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                        <span>{r.candidate?.name || "Unknown"} {i === 0 && r.votes > 0 && <Award size={12} color="var(--warning)" style={{ marginLeft: 4 }} />}</span>
                        <span>{r.votes} vote{r.votes !== 1 ? "s" : ""} ({pct}%)</span>
                      </div>
                      <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${pct}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ STYLES ═══════════════════════ */

const S = {
  page: { padding: "24px 28px 56px", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", maxWidth: 1200, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  logoMark: { width: 40, height: 40, borderRadius: 12, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { margin: 0, fontSize: 19, fontWeight: 800 },
  subtitle: { fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13.5 },
  smallPrimaryBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5 },
  loadingBox: { display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", padding: 30, justifyContent: "center" },
  emptyBox: { textAlign: "center", padding: "60px 20px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" },
  selectorRow: { marginBottom: 16 },
  select: { width: "100%", maxWidth: 420, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13.5, fontWeight: 600 },
  selectSmall: { padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 12.5, width: "100%" },
  stageCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 },
  stageRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  stagePill: { padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" },
  stagePillDone: { background: "var(--primary-tint)", color: "var(--primary)", border: "1px solid var(--primary)" },
  stageActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  actionBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--success)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 14px", fontWeight: 700, fontSize: 13 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 },
  statCard: { display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" },
  statIcon: { width: 32, height: 32, borderRadius: 8, background: "var(--primary-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statValue: { fontSize: 17, fontWeight: 800 },
  statLabel: { fontSize: 11, color: "var(--text-muted)", fontWeight: 600 },
  tabBar: { display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 18, overflowX: "auto", paddingBottom: 2 },
  tabBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: "10px 10px 0 0", border: "none", background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" },
  tabContent: { animation: "fadeUp .25s ease both" },
  tabHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 },
  postCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 },
  candidateCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 },
  postGroupTitle: { display: "flex", alignItems: "center", fontWeight: 800, fontSize: 14, marginBottom: 10, color: "var(--primary)" },
  badge: { display: "inline-block", padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" },
  tableWrap: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", fontWeight: 700 },
  td: { padding: "10px 12px", borderBottom: "1px solid var(--border)" },
  linkBtn: { background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 },
  miniBtn: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  miniOutlineBtn: { display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px dashed var(--border)", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" },
  iconBtnSmall: { background: "transparent", border: "none", cursor: "pointer", padding: 2 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(15,17,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modalCard: { background: "var(--card)", borderRadius: 16, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginTop: 12, marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" },
  toggleBtn: { flex: 1, padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12.5 },
  toggleBtnActive: { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" },
  studentResultRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 6px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer" },
  resultRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0" },
  progressTrack: { height: 6, background: "var(--bg)", borderRadius: 4, marginTop: 4, overflow: "hidden" },
  progressFill: { height: "100%", background: "var(--primary)", borderRadius: 4 },
  toast: { position: "fixed", top: 18, right: 18, color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" },
};
