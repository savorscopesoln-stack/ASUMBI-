import React, { useEffect, useState, useCallback } from "react";
import API, { resolvePhotoUrl } from "../../api";
import {
  Vote, FileText, CheckCircle2, Loader2, ChevronRight, X, Award,
  UserRound, Landmark, AlertTriangle, Info,
} from "lucide-react";

/* ─── shared design-token stylesheet — same tokens as StudentLayout;
   a no-op if already mounted. ─── */
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
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
    .sc-tab { transition: background .15s, color .15s; }
    .sc-tab.active { background: var(--primary); color: #fff; font-weight: 700; }
    .sc-candidate { transition: transform .15s, box-shadow .15s, border-color .15s; cursor: pointer; }
    .sc-candidate:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .sc-candidate.selected { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--primary-tint); }
    .sc-btn { cursor: pointer; transition: filter .15s, transform .1s; }
    .sc-btn:hover:not(:disabled) { filter: brightness(0.95); }
    .sc-btn:active:not(:disabled) { transform: translateY(1px); }
    .sc-btn:disabled { cursor: not-allowed; }
    .sc-card-hover { transition: box-shadow .15s, transform .15s; }
    .sc-card-hover:hover { box-shadow: var(--shadow); transform: translateY(-1px); }
    .sc-select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; }
  `;
  document.head.appendChild(el);
};

const TABS = [
  { key: "elections", label: "Elections", Icon: Landmark },
  { key: "apply", label: "Apply", Icon: FileText },
  { key: "vote", label: "Vote", Icon: Vote },
];

export default function StudentCouncilPortal() {
  injectStyles();
  const [tab, setTab] = useState("elections");
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/student-council/student/elections");
      setElections(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "var(--destructive)" : "var(--success)" }}>
          {toast.message}
        </div>
      )}

      <div style={S.header}>
        <div style={S.logoMark}><Vote size={20} color="#fff" /></div>
        <div>
          <h1 style={S.title}>Student Council</h1>
          <div style={S.subtitle}>Elections, applications & voting</div>
        </div>
      </div>

      <div style={S.tabBar}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} className={`sc-tab${tab === key ? " active" : ""}`} style={S.tabBtn} onClick={() => setTab(key)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={S.loadingBox}><Loader2 className="dash-spin" size={20} /> Loading…</div>
      ) : tab === "elections" ? (
        <ElectionsList elections={elections} />
      ) : tab === "apply" ? (
        <ApplyPanel elections={elections} showToast={showToast} />
      ) : (
        <VotePanel elections={elections} showToast={showToast} refreshElections={load} />
      )}
    </div>
  );
}

/* ═══════════════════════ SHARED BITS ═══════════════════════ */

function Avatar({ photoUrl, name, size = 40 }) {
  const url = resolvePhotoUrl(photoUrl);
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />;
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--primary-tint)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

const STAGE_LABELS = {
  DRAFT: "Draft", APPLICATIONS_OPEN: "Applications Open", APPLICATIONS_CLOSED: "Applications Closed",
  CANDIDATES_FINALIZED: "Candidates Finalized", VOTING_OPEN: "Voting Open",
  VOTING_CLOSED: "Voting Closed", RESULTS: "Results",
};
const STAGE_COLORS = {
  APPLICATIONS_OPEN: { bg: "var(--success-tint)", color: "var(--success)" },
  APPLICATIONS_CLOSED: { bg: "var(--warning-tint)", color: "var(--warning)" },
  CANDIDATES_FINALIZED: { bg: "var(--info-tint)", color: "var(--info)" },
  VOTING_OPEN: { bg: "var(--success-tint)", color: "var(--success)" },
  VOTING_CLOSED: { bg: "var(--warning-tint)", color: "var(--warning)" },
  RESULTS: { bg: "var(--primary-tint)", color: "var(--primary)" },
};

function StageBadge({ status }) {
  const c = STAGE_COLORS[status] || { bg: "var(--border)", color: "var(--text-secondary)" };
  return <span style={{ ...S.badge, background: c.bg, color: c.color }}>{STAGE_LABELS[status] || status}</span>;
}

/* ═══════════════════════ ELECTIONS LIST ═══════════════════════ */

function ElectionsList({ elections }) {
  // Results need to be reachable from the very first tab a student
  // lands on — burying them one click deep inside "Vote" is why they
  // weren't "reflecting" for anyone who didn't think to look there.
  // Every RESULTS-stage election gets an inline, expandable results
  // panel right on its card here.
  const [openId, setOpenId] = useState(null);
  const [resultsById, setResultsById] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [errorId, setErrorId] = useState(null);

  const toggleResults = async (e) => {
    if (openId === e.id) {
      setOpenId(null);
      return;
    }
    setOpenId(e.id);
    if (resultsById[e.id]) return;
    setLoadingId(e.id);
    setErrorId(null);
    try {
      const res = await API.get(`/student-council/student/elections/${e.id}/results`);
      setResultsById((prev) => ({ ...prev, [e.id]: res.data }));
    } catch (err) {
      console.log(err);
      setErrorId(e.id);
    } finally {
      setLoadingId(null);
    }
  };

  if (!elections.length) {
    return <div style={S.emptyBox}><Landmark size={28} color="var(--text-muted)" /><div style={{ marginTop: 8, color: "var(--text-muted)" }}>No elections have been announced yet.</div></div>;
  }
  return (
    <div style={S.grid2}>
      {elections.map((e) => (
        <div key={e.id} className="sc-card-hover" style={S.electionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{e.title}</div>
            <StageBadge status={e.status} />
          </div>
          {e.description && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>{e.description}</div>}

          {e.status === "RESULTS" && (
            <>
              <button className="sc-btn" style={S.viewResultsBtn} onClick={() => toggleResults(e)}>
                <Award size={14} />
                {openId === e.id ? "Hide Results" : "View Official Results"}
              </button>

              {openId === e.id && (
                loadingId === e.id ? (
                  <div style={{ ...S.loadingBox, padding: "18px 0" }}><Loader2 className="dash-spin" size={16} /> Loading results…</div>
                ) : errorId === e.id ? (
                  <div style={{ color: "var(--destructive)", fontSize: 12.5, marginTop: 10 }}>Couldn't load results — try again shortly.</div>
                ) : resultsById[e.id] ? (
                  <ResultsView results={resultsById[e.id]} compact />
                ) : null
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════ APPLY PANEL ═══════════════════════ */

function ApplyPanel({ elections, showToast }) {
  const applyable = elections.filter((e) => e.status === "APPLICATIONS_OPEN");
  const [electionId, setElectionId] = useState(applyable[0]?.id || "");
  const [posts, setPosts] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyingTo, setApplyingTo] = useState(null);

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [postsRes, appsRes] = await Promise.all([
        API.get(`/student-council/student/elections/${id}/posts`),
        API.get(`/student-council/student/elections/${id}/my-applications`),
      ]);
      setPosts(postsRes.data || []);
      setMyApplications(appsRes.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (electionId) load(electionId); }, [electionId, load]);

  if (!applyable.length) {
    return <div style={S.emptyBox}><FileText size={28} color="var(--text-muted)" /><div style={{ marginTop: 8, color: "var(--text-muted)" }}>Applications aren't open for any election right now.</div></div>;
  }

  return (
    <div>
      {applyable.length > 1 && (
        <select className="sc-select" value={electionId} onChange={(e) => setElectionId(Number(e.target.value))} style={S.select}>
          {applyable.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      )}

      {loading ? (
        <div style={S.loadingBox}><Loader2 className="dash-spin" size={18} /> Loading…</div>
      ) : (
        <div style={S.grid2}>
          {posts.map((p) => (
            <div key={p.id} className="sc-card-hover" style={S.postCard}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              {p.description && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}>{p.description}</div>}
              <div style={{ marginTop: 8 }}>
                {p.scope === "CLASS_BASED" ? (
                  <span style={{ ...S.badge, background: "var(--info-tint)", color: "var(--info)" }}>Class: {p.studentClass}</span>
                ) : (
                  <span style={{ ...S.badge, background: "var(--primary-tint)", color: "var(--primary)" }}>College-wide</span>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                {p.myApplicationStatus ? (
                  <span style={{ ...S.badge, background: "var(--success-tint)", color: "var(--success)" }}>
                    Applied — {p.myApplicationStatus}
                  </span>
                ) : (
                  <button className="sc-btn" style={S.smallPrimaryBtn} onClick={() => setApplyingTo(p)}>Apply</button>
                )}
              </div>
            </div>
          ))}
          {posts.length === 0 && <div style={{ color: "var(--text-muted)" }}>No posts available for you in this election.</div>}
        </div>
      )}

      {applyingTo && (
        <ApplyModal
          post={applyingTo}
          electionId={electionId}
          onClose={() => setApplyingTo(null)}
          onSubmitted={() => { setApplyingTo(null); load(electionId); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function ApplyModal({ post, electionId, onClose, onSubmitted, showToast }) {
  const [me, setMe] = useState(null);
  const [manifesto, setManifesto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/student/profile").then((res) => setMe(res.data)).catch(() => {});
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await API.post(`/student-council/student/elections/${electionId}/apply`, { postId: post.id, manifesto });
      showToast("Application submitted");
      onSubmitted();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to apply", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Apply — {post.title}</h3>
          <button onClick={onClose} style={S.iconBtn}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {me && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <Avatar photoUrl={me.photoUrl} name={me.name} size={56} />
              <div>
                <div style={{ fontWeight: 700 }}>{me.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{me.admissionNo} • {me.studentClass}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  <Info size={11} style={{ verticalAlign: "-1px" }} /> Your details & photo are pulled automatically from your profile.
                </div>
              </div>
            </div>
          )}
          <label style={S.label}>Manifesto</label>
          <textarea style={{ ...S.input, minHeight: 140 }} placeholder="Tell voters why they should elect you…" value={manifesto} onChange={(e) => setManifesto(e.target.value)} />
          <button className="sc-btn" style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }} disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="dash-spin" size={16} /> : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ VOTE PANEL ═══════════════════════ */

function VotePanel({ elections, showToast, refreshElections }) {
  const votable = elections.filter((e) => ["VOTING_OPEN", "VOTING_CLOSED", "RESULTS"].includes(e.status));
  const [electionId, setElectionId] = useState(votable[0]?.id || "");
  const [ballot, setBallot] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const statusRes = await API.get(`/student-council/student/elections/${id}/vote-status`);
      setVoteStatus(statusRes.data);

      const election = elections.find((e) => e.id === Number(id));
      if (election?.status === "RESULTS") {
        const resultsRes = await API.get(`/student-council/student/elections/${id}/results`).catch(() => null);
        setResults(resultsRes?.data || null);
      } else {
        setResults(null);
      }

      if (!statusRes.data.hasVoted && election?.status === "VOTING_OPEN") {
        const ballotRes = await API.get(`/student-council/student/elections/${id}/ballot`);
        setBallot(ballotRes.data);
      } else {
        setBallot(null);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [elections]);

  useEffect(() => { if (electionId) load(electionId); }, [electionId, load]);

  if (!votable.length) {
    return <div style={S.emptyBox}><Vote size={28} color="var(--text-muted)" /><div style={{ marginTop: 8, color: "var(--text-muted)" }}>Voting isn't open for any election right now.</div></div>;
  }

  const select = (postId, candidateId) => setSelections((prev) => ({ ...prev, [postId]: candidateId }));

  const allSelected = ballot && ballot.posts.every((p) => selections[p.post.id]);

  const submitVote = async () => {
    setSubmitting(true);
    try {
      const payload = { selections: Object.entries(selections).map(([postId, candidateId]) => ({ postId: Number(postId), candidateId })) };
      await API.post(`/student-council/student/elections/${electionId}/vote`, payload);
      setSubmitted(true);
      setConfirming(false);
      showToast("VOTE SUBMITTED");
      refreshElections();
      load(electionId);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit vote", "error");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {votable.length > 1 && (
        <select className="sc-select" value={electionId} onChange={(e) => { setElectionId(Number(e.target.value)); setSelections({}); setSubmitted(false); }} style={S.select}>
          {votable.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      )}

      {loading ? (
        <div style={S.loadingBox}><Loader2 className="dash-spin" size={18} /> Loading…</div>
      ) : submitted || voteStatus?.hasVoted ? (
        <div style={S.emptyBox}>
          <CheckCircle2 size={32} color="var(--success)" />
          <div style={{ marginTop: 8, fontWeight: 800, fontSize: 15 }}>You've already voted in this election</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            {voteStatus?.submittedAt ? `Submitted ${new Date(voteStatus.submittedAt).toLocaleString()}` : ""}
          </div>
          {results && <ResultsView results={results} />}
        </div>
      ) : results ? (
        <ResultsView results={results} />
      ) : !ballot ? (
        <div style={S.emptyBox}><AlertTriangle size={26} color="var(--text-muted)" /><div style={{ marginTop: 8, color: "var(--text-muted)" }}>The ballot isn't available right now.</div></div>
      ) : (
        <div>
          <div style={S.ballotHeader}>
            <div style={S.ballotHeaderTop}>
              <Landmark size={18} color="var(--primary)" />
              <div>
                <div style={S.ballotTitle}>Official Ballot</div>
                <div style={S.ballotSubtitle}>{ballot.election?.title || "Student Council Election"}</div>
              </div>
            </div>
            <div style={S.ballotInstructions}>
              Select one candidate for each position below. Review your choices before submitting — your vote is final and cannot be changed once cast.
            </div>
          </div>

          {ballot.posts.map(({ post, candidates }, postIdx) => (
            <div key={post.id} style={S.ballotPostBlock}>
              <div style={S.ballotPostHeader}>
                <span style={S.ballotPostNumber}>{postIdx + 1}</span>
                <div>
                  <div style={S.postGroupTitle}>{post.title}</div>
                  {post.description && <div style={S.ballotPostDesc}>{post.description}</div>}
                </div>
              </div>
              <div style={S.ballotCandidateList}>
                {candidates.map((c) => {
                  const isSelected = selections[post.id] === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`sc-candidate${isSelected ? " selected" : ""}`}
                      style={{ ...S.ballotRow, border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)" }}
                      onClick={() => select(post.id, c.id)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <span style={{ ...S.ballotRadio, ...(isSelected ? S.ballotRadioSelected : {}) }}>
                        {isSelected && <span style={S.ballotRadioDot} />}
                      </span>
                      <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                        <Avatar photoUrl={c.photoUrl} name={c.name} size={56} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{c.admissionNo} • {c.studentClass}</div>
                          {c.partyName && <div style={{ fontSize: 11.5, color: "var(--primary)", fontWeight: 700, marginTop: 2 }}>{c.partyName}</div>}
                        </div>
                        {isSelected && <CheckCircle2 size={18} color="var(--primary)" style={{ marginLeft: "auto", flexShrink: 0, alignSelf: "center" }} />}
                      </div>
                      {c.runningMateName && (
                        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar photoUrl={c.runningMatePhotoUrl} name={c.runningMateName} size={20} />
                          Running mate: {c.runningMateName}
                        </div>
                      )}
                      {c.manifesto && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", maxHeight: 54, overflow: "hidden" }}>
                          {c.manifesto}
                        </div>
                      )}
                    </div>
                  );
                })}
                {candidates.length === 0 && <div style={{ color: "var(--text-muted)" }}>No candidates for this post.</div>}
              </div>
            </div>
          ))}

          <div style={S.voteFooter}>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {Object.keys(selections).length} of {ballot.posts.length} posts selected
            </div>
            <button
              className="sc-btn"
              style={{ ...S.primaryBtn, opacity: allSelected ? 1 : 0.5 }}
              disabled={!allSelected}
              onClick={() => setConfirming(true)}
            >
              Review & Submit Vote <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {confirming && ballot && (
        <ConfirmVoteModal
          ballot={ballot}
          selections={selections}
          onClose={() => setConfirming(false)}
          onConfirm={submitVote}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function ConfirmVoteModal({ ballot, selections, onClose, onConfirm, submitting }) {
  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Confirm Your Vote</h3>
          <button onClick={onClose} style={S.iconBtn}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
            Once submitted, your vote is final and cannot be changed. Please review your selections.
          </div>
          {ballot.posts.map(({ post, candidates }) => {
            const chosen = candidates.find((c) => c.id === selections[post.id]);
            return (
              <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <Avatar photoUrl={chosen?.photoUrl} name={chosen?.name} size={36} />
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{post.title}</div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{chosen?.name}</div>
                </div>
              </div>
            );
          })}
          <button className="sc-btn" style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", marginTop: 16 }} disabled={submitting} onClick={onConfirm}>
            {submitting ? <Loader2 className="dash-spin" size={16} /> : "Confirm & Submit Vote"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsView({ results, compact }) {
  return (
    <div style={{ marginTop: compact ? 14 : 16, textAlign: "left" }}>
      <div style={S.resultsCertHeader}>
        <Award size={15} color="var(--primary)" />
        <span>Official Results</span>
      </div>

      {results.posts.map(({ post, results: postResults }) => {
        const total = postResults.reduce((sum, x) => sum + x.votes, 0);
        const top = postResults[0];
        const isTie = postResults.length > 1 && postResults[1]?.votes === top?.votes && (top?.votes || 0) > 0;

        return (
          <div key={post.id} style={S.resultsPostBlock}>
            <div style={S.resultsPostHeader}>
              <div style={S.postGroupTitle}>{post.title}</div>
              <div style={S.resultsTotalVotes}>{total} vote{total === 1 ? "" : "s"} cast</div>
            </div>

            {postResults.map((r, i) => {
              const pct = total ? Math.round((r.votes / total) * 100) : 0;
              const isWinner = i === 0 && (r.votes || 0) > 0 && !isTie;
              return (
                <div key={r.candidate?.studentId || i} style={{ ...S.resultRow, ...(isWinner ? S.resultRowWinner : {}) }}>
                  <div style={S.resultRank}>{i + 1}</div>
                  <Avatar photoUrl={r.candidate?.photoUrl} name={r.candidate?.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>
                        {r.candidate?.name || "Unknown"}
                        {r.candidate?.partyName && <span style={S.resultParty}> · {r.candidate.partyName}</span>}
                      </span>
                      {isWinner && <span style={S.electedTag}><Award size={11} /> ELECTED</span>}
                    </div>
                    <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${pct}%` }} /></div>
                    <div style={S.resultVoteCount}>{r.votes || 0} vote{(r.votes || 0) === 1 ? "" : "s"} · {pct}%</div>
                  </div>
                </div>
              );
            })}

            {isTie && <div style={S.tieNote}><AlertTriangle size={12} /> Tied for first place — pending official tiebreak.</div>}
            {postResults.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>No candidates for this post.</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════ STYLES ═══════════════════════ */

const S = {
  page: { fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  logoMark: { width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, var(--primary), var(--primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)", flexShrink: 0 },
  title: { margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" },
  subtitle: { fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600, marginTop: 1 },
  tabBar: { display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 20, overflowX: "auto" },
  tabBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: "10px 10px 0 0", border: "none", background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" },
  loadingBox: { display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", padding: 40, justifyContent: "center", fontWeight: 600, fontSize: 13.5 },
  emptyBox: { textAlign: "center", padding: "56px 20px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" },
  select: { width: "100%", maxWidth: 420, padding: "10px 34px 10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13.5, fontWeight: 600, marginBottom: 18, boxShadow: "var(--shadow-sm)", cursor: "pointer" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  electionCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, boxShadow: "var(--shadow-sm)" },
  postCard: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow-sm)" },
  candidateCard: { background: "var(--card)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow-sm)" },
  postGroupTitle: { fontWeight: 800, fontSize: 14.5, marginBottom: 12, color: "var(--primary)", letterSpacing: "-0.01em" },
  badge: { display: "inline-block", padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700 },
  smallPrimaryBtn: { background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12.5, boxShadow: "var(--shadow-sm)" },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 13.5, boxShadow: "var(--shadow-sm)" },
  voteFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", bottom: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginTop: 10, boxShadow: "0 8px 24px rgba(16,24,40,0.12)" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(15,17,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, backdropFilter: "blur(2px)" },
  modalCard: { background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginTop: 12, marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" },
  resultRow: { display: "flex", alignItems: "center", gap: 12, padding: "9px 0" },
  progressTrack: { height: 7, background: "var(--bg)", borderRadius: 4, marginTop: 5, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, var(--primary), var(--primary-dark))", borderRadius: 4, transition: "width .4s ease" },
  toast: { position: "fixed", top: 18, right: 18, color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" },

  /* ── elections list: inline "view results" ── */
  viewResultsBtn: { display: "flex", alignItems: "center", gap: 6, marginTop: 12, background: "var(--primary-tint)", color: "var(--primary)", border: "none", borderRadius: 9, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, width: "100%", justifyContent: "center" },

  /* ── official ballot ── */
  ballotHeader: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", marginBottom: 18, boxShadow: "var(--shadow-sm)" },
  ballotHeaderTop: { display: "flex", alignItems: "center", gap: 10 },
  ballotTitle: { fontWeight: 800, fontSize: 15.5, letterSpacing: "-0.01em" },
  ballotSubtitle: { fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600, marginTop: 1 },
  ballotInstructions: { fontSize: 12.5, color: "var(--text-secondary)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", lineHeight: 1.5 },
  ballotPostBlock: { marginBottom: 22, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow-sm)" },
  ballotPostHeader: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  ballotPostNumber: { flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" },
  ballotPostDesc: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  ballotCandidateList: { display: "flex", flexDirection: "column", gap: 10 },
  ballotRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, background: "var(--card)" },
  ballotRadio: { flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 },
  ballotRadioSelected: { borderColor: "var(--primary)" },
  ballotRadioDot: { width: 10, height: 10, borderRadius: "50%", background: "var(--primary)" },

  /* ── official results ── */
  resultsCertHeader: { display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 14 },
  resultsPostBlock: { marginBottom: 18, paddingBottom: 4 },
  resultsPostHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 },
  resultsTotalVotes: { fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" },
  resultRowWinner: { background: "var(--primary-tint)", borderRadius: 10, padding: "9px 8px", margin: "2px 0" },
  resultRank: { flexShrink: 0, width: 18, textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "var(--text-muted)" },
  resultParty: { color: "var(--text-muted)", fontWeight: 600 },
  electedTag: { display: "inline-flex", alignItems: "center", gap: 3, background: "var(--primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" },
  resultVoteCount: { fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 3 },
  tieNote: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--warning)", fontWeight: 600, marginTop: 6 },
};
