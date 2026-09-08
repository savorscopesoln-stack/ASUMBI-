import React, { useState, useEffect, useRef } from "react";
import API, { resolvePhotoUrl } from "../../api";
import {
  UserRound,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  RotateCw,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted by the layout or
   another page. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }

    input:focus-visible, button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .profile-btn:hover { filter: brightness(0.95); }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
    }
    @media (max-width: 640px) {
      .profile-two-col { grid-template-columns: 1fr !important; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── glass-badge stylesheet (separate id, same pattern used
   elsewhere in the app) — frosted translucent pill with a warm
   glow bloom on hover, a lift/scale "pop", and a pulsing ring. ─── */
const injectBadgeStyles = () => {
  if (document.getElementById("glass-badge-tokens")) return;
  const el = document.createElement("style");
  el.id = "glass-badge-tokens";
  el.textContent = `
    .glass-badge {
      position: relative;
      z-index: 1;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: transform .3s cubic-bezier(.2,.8,.2,1), background-color .3s ease, border-color .3s ease;
      cursor: default;
    }
    .glass-badge::before {
      content: "";
      position: absolute;
      inset: -10px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(251,191,36,0.55), transparent 70%);
      opacity: 0;
      transform: scale(.7);
      transition: opacity .35s ease, transform .35s ease;
      z-index: -1;
      pointer-events: none;
    }
    .glass-badge:hover {
      transform: translateY(-2px) scale(1.07);
      background: rgba(255,255,255,0.22) !important;
      border-color: rgba(255,255,255,0.55) !important;
      animation: badgePulse 1.4s ease-out infinite;
    }
    .glass-badge:hover::before {
      opacity: 1;
      transform: scale(1.2);
    }
    @keyframes badgePulse {
      0%   { box-shadow: 0 0 0 0 rgba(251,191,36,0.45); }
      70%  { box-shadow: 0 0 0 12px rgba(251,191,36,0); }
      100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .glass-badge:hover { animation: none; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── ID-card stylesheet (separate id, same guard pattern) ───
   A flippable staff/student ID: each face IS the physical card —
   printed maroon base + frosted glass lamination + a faint
   guilloche security texture — sized to real CR80 portrait badge
   proportions and centered, not stretched across the page. Front
   and back are true 3D faces (backface-visibility hidden) so the
   flip is a real rotateY, not a content swap. A holographic seal
   and a glossy light sweep on hover round out the "real card"
   feel. The global prefers-reduced-motion rule above already
   zeroes out all transition/animation durations site-wide, so the
   flip, glow, shimmer and sweep all collapse to instant/static
   automatically for users who've asked for less motion. */
const injectIdCardStyles = () => {
  if (document.getElementById("id-card-tokens")) return;
  const el = document.createElement("style");
  el.id = "id-card-tokens";
  el.textContent = `
    .id-card-shell {
      width: min(272px, 84vw);
      margin: 0 auto 14px;
      position: relative;
      perspective: 1600px;
    }

    .id-card-flip {
      position: relative;
      width: 100%;
      aspect-ratio: 0.6285;
      transform-style: preserve-3d;
      transition: transform 0.7s cubic-bezier(.4,.2,.2,1);
      cursor: pointer;
    }
    .id-card-flip.is-flipped {
      transform: rotateY(180deg);
    }

    .id-card-face {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 16px;
      padding: 14px 12px 12px;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      background:
        repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 7px),
        linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.16)),
        linear-gradient(150deg, var(--primary), var(--primary-dark));
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.4);
      box-shadow: 0 2px 4px rgba(16,24,40,0.15), 0 14px 28px rgba(16,24,40,0.28), inset 0 1px 0 rgba(255,255,255,0.3);
      transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease;
      z-index: 1;
    }
    .id-card-face.id-card-back {
      transform: rotateY(180deg);
    }

    .id-card-face::after {
      content: "";
      position: absolute;
      top: 9px;
      left: 50%;
      transform: translateX(-50%);
      width: 34px;
      height: 7px;
      border-radius: 5px;
      background: rgba(0,0,0,0.32);
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
      z-index: 3;
    }

    .id-card-face::before {
      content: "";
      position: absolute;
      inset: -14px;
      border-radius: 26px;
      background: radial-gradient(ellipse at center, rgba(251,191,36,0.5), transparent 72%);
      opacity: 0;
      transform: scale(.9);
      transition: opacity .35s ease, transform .35s ease;
      z-index: -1;
      pointer-events: none;
    }

    .id-card-shine {
      position: absolute;
      inset: -55% -70%;
      background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.4) 50%, transparent 58%);
      transform: translateX(-130%) rotate(8deg);
      transition: transform 0.9s ease;
      pointer-events: none;
      z-index: 2;
    }
    .id-card-shell:hover .id-card-flip:not(.is-flipped) .id-card-front .id-card-shine,
    .id-card-shell:hover .id-card-flip.is-flipped .id-card-back .id-card-shine {
      transform: translateX(65%) rotate(8deg);
    }

    .id-card-hologram {
      position: absolute;
      bottom: 10px;
      right: 10px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: conic-gradient(from 90deg, #ff9a9e, #fbc2eb, #a1c4fd, #fad0c4, #c2e9fb, #ff9a9e);
      opacity: 0.62;
      mix-blend-mode: screen;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 3px rgba(255,255,255,0.85), 0 0 4px rgba(255,255,255,0.35);
      z-index: 4;
      animation: hologramShimmer 7s linear infinite;
    }
    .id-card-hologram svg {
      color: rgba(255,255,255,0.9);
    }
    @keyframes hologramShimmer {
      to { filter: hue-rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .id-card-hologram { animation: none; }
    }

    .id-card-shell:hover .id-card-face {
      background:
        repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 7px),
        linear-gradient(rgba(255,255,255,0.22), rgba(255,255,255,0.22)),
        linear-gradient(150deg, var(--primary), var(--primary-dark));
      border-color: rgba(255,255,255,0.5);
    }
    .id-card-shell:hover .id-card-flip:not(.is-flipped) .id-card-face.id-card-front {
      transform: translateY(-4px) scale(1.035);
    }
    .id-card-shell:hover .id-card-flip.is-flipped .id-card-face.id-card-back {
      transform: rotateY(180deg) translateY(-4px) scale(1.035);
    }
    .id-card-shell:hover .id-card-face::before {
      opacity: 1;
      transform: scale(1.08);
    }
    .id-card-shell:hover .id-card-flip:not(.is-flipped) .id-card-face.id-card-front {
      animation: idCardPulse 1.6s ease-out infinite;
    }
    .id-card-shell:hover .id-card-flip.is-flipped .id-card-face.id-card-back {
      animation: idCardPulse 1.6s ease-out infinite;
    }
    @keyframes idCardPulse {
      0%   { box-shadow: 0 0 0 0 rgba(251,191,36,0.45), 0 14px 28px rgba(16,24,40,0.28); }
      70%  { box-shadow: 0 0 0 14px rgba(251,191,36,0), 0 14px 28px rgba(16,24,40,0.28); }
      100% { box-shadow: 0 0 0 0 rgba(251,191,36,0), 0 14px 28px rgba(16,24,40,0.28); }
    }
    @media (prefers-reduced-motion: reduce) {
      .id-card-shell:hover .id-card-face { animation: none; }
    }

    .id-card-flip-btn {
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .id-card-flip-btn:hover {
      filter: brightness(0.97);
    }
  `;
  document.head.appendChild(el);
};

export default function StudentProfile() {
  injectStyles();
  injectBadgeStyles();
  injectIdCardStyles();

  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);

  // editable profile details (everything except name/admissionNo)
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assessmentNumber, setAssessmentNumber] = useState("");
  const [detailsMsg, setDetailsMsg] = useState("");
  const [detailsTone, setDetailsTone] = useState("success");
  const [savingDetails, setSavingDetails] = useState(false);

  // pending change request (once profile is already completed once)
  const [pendingRequest, setPendingRequest] = useState(null);

  // password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState("success");
  const [saving, setSaving] = useState(false);

  // profile photo
  const [photoMsg, setPhotoMsg] = useState("");
  const [photoTone, setPhotoTone] = useState("success");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // ID card flip state — front shows the student's photo ID,
  // back shows the "laminated" reverse of the badge.
  const [flipped, setFlipped] = useState(false);

  // Issue/expiry years shown on the back of the card — a real
  // student ID carries a validity window rather than none at all.
  const issueYear = new Date().getFullYear();
  const expiryYear = issueYear + 1;

  /* ================= LOAD PROFILE ================= */
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get("/student/profile");
      setUser(res.data);
      setStudentClass(res.data.studentClass || "");
      setGender(res.data.gender || "");
      setEmail(res.data.email || "");
      setPhone(res.data.phone || "");
      setAssessmentNumber(res.data.assessmentNumber || "");

      if (res.data.profileCompleted) {
        try {
          const reqRes = await API.get("/student/profile-change-requests/mine");
          if (reqRes.data && reqRes.data.status === "pending") {
            setPendingRequest(reqRes.data);
          }
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  /* ================= SAVE PROFILE DETAILS =================
     The very first save (right after the forced password change)
     goes straight onto the Students row and flips profileCompleted
     to 1. Every save after that is no longer applied directly — it's
     queued as a change request that needs admin approval instead. */
  const saveDetails = async () => {
    if (!studentClass.trim() || !gender.trim() || !email.trim() || !phone.trim()) {
      setDetailsTone("error");
      setDetailsMsg("Class, gender, email, and phone are required");
      return;
    }

    const payload = {
      studentClass: studentClass.trim(),
      gender: gender.trim(),
      email: email.trim(),
      phone: phone.trim(),
      assessmentNumber: assessmentNumber.trim(),
    };

    try {
      setDetailsMsg("");
      setSavingDetails(true);

      if (user.profileCompleted) {
        // second-and-later edit — goes to the approval queue, nothing
        // changes on the Students row yet
        const res = await API.post("/student/profile-change-requests", payload);
        setPendingRequest({ status: "pending", ...payload });
        setDetailsTone("success");
        setDetailsMsg(res.data?.message || "Change request submitted for admin approval");
      } else {
        // first-ever save — applies immediately
        const res = await API.put("/student/profile", payload);

        if (res.data?.token) localStorage.setItem("token", res.data.token);
        if (res.data?.user) localStorage.setItem("user", JSON.stringify(res.data.user));

        setUser((u) => ({ ...u, ...(res.data?.profile || {}) }));
        setDetailsTone("success");
        setDetailsMsg("Profile details updated");
      }
    } catch (err){
      console.log(err);
      setDetailsTone("error");
      setDetailsMsg(err.response?.data?.message || "Failed to update profile details");
    } finally {
      setSavingDetails(false);
    }
  };

  /* ================= PHOTO UPLOAD ================= */
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setPhotoMsg("");
      setUploadingPhoto(true);

      const fd = new FormData();
      fd.append("photo", file);

      const res = await API.put("/student/profile/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser((u) => ({ ...u, photoUrl: res.data.photoUrl }));
      setPhotoTone("success");
      setPhotoMsg("Profile photo updated");
    } catch (err) {
      console.log(err);
      setPhotoTone("error");
      setPhotoMsg(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ================= CHANGE PASSWORD ================= */
  const changePassword = async () => {
    try {
      setMsg("");
      setSaving(true);

      await API.put("/auth/change-password", {
        oldPassword,
        newPassword,
      });

      setMsgTone("success");
      setMsg("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      console.log(err);
      setMsgTone("error");
      setMsg(err.response?.data?.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */
  return (
    <main className="dash-main" style={D.main}>
      <header style={D.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserRound size={20} color="var(--primary)" />
          <div>
            <h1 style={D.pageTitle}>My Profile</h1>
            <p style={D.pageSub}>Your account details and security settings</p>
          </div>
        </div>
      </header>

      {/* ================= STUDENT ID CARD (flippable) ================= */}
      {!loading && (
        <div style={{ marginBottom: 26 }}>
          <div className="id-card-shell">
            <div
              className={`id-card-flip${flipped ? " is-flipped" : ""}`}
              onClick={() => setFlipped((f) => !f)}
              role="button"
              tabIndex={0}
              aria-label={flipped ? "Showing back of ID card, tap to flip" : "Showing front of ID card, tap to flip"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
              }}
            >
              {/* ---- FRONT FACE ---- */}
              <div className="id-card-face id-card-front">
                <div className="id-card-shine" />
                <div style={idFrontStyles.contentWrap}>
                  <div style={idFrontStyles.topBar}>
                    <div style={idFrontStyles.crest}>
                      <GraduationCap size={15} />
                    </div>
                    <span style={idFrontStyles.schoolName}>ASUMBI TTC</span>
                    <span style={idFrontStyles.subtitle}>STUDENT IDENTIFICATION</span>
                  </div>

                  <div style={idFrontStyles.photoBlock}>
                    <div style={idFrontStyles.avatarWrap}>
                      {user.photoUrl ? (
                        <img src={resolvePhotoUrl(user.photoUrl)} alt="Profile" style={idFrontStyles.avatarImg} />
                      ) : (
                        <div style={idFrontStyles.avatar}>{user.name?.charAt(0) || "S"}</div>
                      )}
                    </div>
                  </div>

                  <h2 style={idFrontStyles.name}>{user.name || "Student Name"}</h2>
                  <span style={idFrontStyles.role} className="glass-badge">
                    🎓 {studentClass || "Unassigned Class"}
                  </span>

                  <div style={idFrontStyles.detailsBox}>
                    <div style={idFrontStyles.detailRow}>
                      <span style={idFrontStyles.detailLabel}>ADM NO.</span>
                      <span style={idFrontStyles.detailValue}>{user.admissionNo || "N/A"}</span>
                    </div>
                    <div style={idFrontStyles.detailRow}>
                      <span style={idFrontStyles.detailLabel}>CLASS</span>
                      <span style={idFrontStyles.detailValue}>{studentClass || "N/A"}</span>
                    </div>
                  </div>

                  <span style={idFrontStyles.footerTag}>STUDENT ID</span>
                </div>
                <div className="id-card-hologram">
                  <ShieldCheck size={14} />
                </div>
              </div>

              {/* ---- BACK FACE ---- */}
              <div className="id-card-face id-card-back">
                <div className="id-card-shine" />
                <div style={idFrontStyles.contentWrap}>
                  <span style={idBackStyles.headerSub}>STUDENT ID — REVERSE</span>

                  <div style={idBackStyles.magStripe} />

                  <div style={idBackStyles.barcodeCard}>
                    <div style={idBackStyles.barcode} />
                    <span style={idBackStyles.barcodeNum}>{(user.admissionNo || "N/A").toUpperCase()}</span>
                  </div>

                  <div style={idBackStyles.metaRow}>
                    <div style={idBackStyles.metaDates}>
                      <div style={idBackStyles.metaLine}>
                        <span style={idBackStyles.detailLabel}>ISSUED</span>
                        <span style={idBackStyles.detailValue}>{issueYear}</span>
                      </div>
                      <div style={idBackStyles.metaLine}>
                        <span style={idBackStyles.detailLabel}>VALID THRU</span>
                        <span style={idBackStyles.detailValue}>{expiryYear}</span>
                      </div>
                    </div>
                    <div style={idBackStyles.qrBox} />
                  </div>

                  <div style={idBackStyles.signatureRow}>
                    <div style={idBackStyles.signatureLine} />
                    <span style={idBackStyles.signatureLabel}>Authorized Signature</span>
                  </div>

                  <p style={idBackStyles.fineprint}>
                    Property of ASUMBI TTC. If found, please return to the school
                    administration office.
                  </p>
                </div>
                <div className="id-card-hologram">
                  <ShieldCheck size={14} />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            style={idBackStyles.flipBtn}
            aria-label={flipped ? "Show front of ID card" : "Show back of ID card"}
          >
            <RotateCw size={12} />
            {flipped ? "View Front" : "View Back"}
          </button>
        </div>
      )}

      <div className="profile-two-col" style={D.twoCol}>
        {/* Profile info */}
        <section style={D.panel} aria-label="Profile information">
          <div style={D.panelHeader}>
            <h3 style={D.panelTitle}>Account Details</h3>
          </div>

          {loading ? (
            <div style={D.loadingState}>
              <Loader2 size={18} className="dash-spin" />
              Loading profile…
            </div>
          ) : (
            <div>
              <div style={D.photoBlock}>
                <div style={D.photoWrap}>
                  {user.photoUrl ? (
                    <img src={resolvePhotoUrl(user.photoUrl)} alt="Profile" style={D.photoImg} />
                  ) : (
                    <div style={D.photoFallback}>
                      <UserRound size={26} color="var(--text-muted)" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    style={D.photoEditBtn}
                    aria-label="Change profile photo"
                  >
                    {uploadingPhoto ? <Loader2 size={13} className="dash-spin" /> : <Camera size={13} />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    style={{ display: "none" }}
                  />
                </div>
                <div>
                  <p style={D.photoTitle}>Profile Photo</p>
                  <p style={D.photoHint}>
                    {user.photoUrl ? "Tap the camera icon to replace it — this also updates your ID card above." : "No photo on file yet — required for your student ID."}
                  </p>
                  {photoMsg && (
                    <div style={{ ...D.msg, marginTop: 4, color: photoTone === "success" ? "var(--success)" : "var(--destructive)" }}>
                      {photoTone === "success" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {photoMsg}
                    </div>
                  )}
                </div>
              </div>

              <div style={D.infoRow}>
                <span style={D.infoLabel}>Name</span>
                <span style={D.infoValue}>{user.name || "—"}</span>
              </div>
              <div style={D.infoRow}>
                <span style={D.infoLabel}>Admission No</span>
                <span style={D.infoValue}>{user.admissionNo || "—"}</span>
              </div>
              <div style={{ ...D.infoRow, borderBottom: "none" }}>
                <span style={D.infoLabel}>Role</span>
                <span style={D.infoValue}>{user.role || "—"}</span>
              </div>
            </div>
          )}
        </section>

        {/* Editable profile details — everything except name/admissionNo */}
        <section style={D.panel} aria-label="Profile details">
          <div style={D.panelHeader}>
            <h3 style={D.panelTitle}>Profile Details</h3>
            {user.profileCompleted ? (
              <p style={D.pendingHint}>
                Already set up once — any change now needs admin approval before it applies.
              </p>
            ) : null}
          </div>

          {pendingRequest && (
            <div style={{ ...D.msg, ...D.pendingBanner }}>
              <AlertTriangle size={13} />
              You have a change request awaiting admin approval. Submitting again will update that same request.
            </div>
          )}

          <div style={D.formGroup}>
            <label style={D.label}>Class</label>
            <input
              type="text"
              placeholder="e.g. Form 2 East"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={D.input}
            />
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={D.input}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={D.input}
              autoComplete="email"
            />
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>Phone Number</label>
            <input
              type="tel"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={D.input}
              autoComplete="tel"
            />
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>Assessment Number</label>
            <input
              type="text"
              value={assessmentNumber}
              onChange={(e) => setAssessmentNumber(e.target.value)}
              style={D.input}
            />
          </div>

          <button
            onClick={saveDetails}
            disabled={savingDetails}
            className="profile-btn"
            style={{ ...D.button, opacity: savingDetails ? 0.6 : 1 }}
          >
            {savingDetails ? <Loader2 size={15} className="dash-spin" /> : null}
            {savingDetails
              ? "Saving…"
              : user.profileCompleted
              ? "Submit for Approval"
              : "Save Details"}
          </button>

          {detailsMsg && (
            <div style={{ ...D.msg, color: detailsTone === "success" ? "var(--success)" : "var(--destructive)" }}>
              {detailsTone === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {detailsMsg}
            </div>
          )}
        </section>

        {/* Password change */}
        <section style={D.panel} aria-label="Change password">
          <div style={D.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={17} color="var(--text-secondary)" />
              <h3 style={D.panelTitle}>Change Password</h3>
            </div>
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>Old Password</label>
            <input
              type="password"
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={D.input}
            />
          </div>

          <div style={D.formGroup}>
            <label style={D.label}>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={D.input}
            />
          </div>

          <button
            onClick={changePassword}
            disabled={saving || !oldPassword || !newPassword}
            className="profile-btn"
            style={{ ...D.button, opacity: saving || !oldPassword || !newPassword ? 0.6 : 1 }}
          >
            {saving ? <Loader2 size={15} className="dash-spin" /> : null}
            {saving ? "Updating…" : "Update Password"}
          </button>

          {msg && (
            <div style={{ ...D.msg, color: msgTone === "success" ? "var(--success)" : "var(--destructive)" }}>
              {msgTone === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {msg}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ================= STYLES ================= */
const D = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  pageHeader: { marginBottom: 22 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    alignItems: "start",
  },

  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  panelHeader: { marginBottom: 14 },
  pendingHint: {
    margin: "4px 0 0",
    fontSize: 11.5,
    color: "var(--warning, #B45309)",
    fontWeight: 600,
  },
  pendingBanner: {
    background: "var(--warning-tint, #FFFBEB)",
    color: "var(--warning, #B45309)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    marginBottom: 14,
  },
  panelTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" },

  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "20px 0",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
  },

  photoBlock: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingBottom: 16,
    marginBottom: 4,
    borderBottom: "1px solid var(--border)",
  },
  photoWrap: { position: "relative", width: 64, height: 64, flexShrink: 0 },
  photoImg: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid var(--border)",
  },
  photoFallback: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "var(--primary-tint)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--border)",
  },
  photoEditBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "var(--primary)",
    color: "#fff",
    border: "2px solid var(--card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  photoTitle: { margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--text)" },
  photoHint: { margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
    gap: 12,
  },
  infoLabel: { fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 700 },
  infoValue: { fontSize: 13.5, color: "var(--text)", fontWeight: 600, textAlign: "right" },

  formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-secondary)",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 13.5,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  button: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "11px 16px",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13.5,
    fontFamily: "inherit",
    marginTop: 4,
  },

  msg: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    fontSize: 12.5,
    fontWeight: 600,
  },
};

/* ===== ID CARD — front face (portrait badge layout) ===== */
const idFrontStyles = {
  contentWrap: {
    position: "relative",
    zIndex: 3,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  topBar: {
    marginTop: 6,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  crest: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.9)",
    color: "var(--primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid rgba(255,255,255,0.6)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    marginBottom: 3,
  },
  schoolName: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1.2,
    color: "#fff",
  },
  subtitle: {
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.72)",
  },
  photoBlock: {
    display: "flex",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  avatarWrap: { position: "relative", width: 64, height: 64, flexShrink: 0 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#fff",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 800,
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2.5px solid rgba(255,255,255,0.85)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  },
  name: {
    margin: 0,
    textAlign: "center",
    fontSize: 15,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1.2,
    padding: "0 6px",
  },
  role: {
    marginTop: 6,
    alignSelf: "center",
    padding: "3px 10px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "#FDE68A",
    fontWeight: 800,
    fontSize: 9.5,
    width: "fit-content",
    maxWidth: "90%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  detailsBox: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    paddingTop: 10,
    borderTop: "1px dashed rgba(255,255,255,0.3)",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  detailLabel: {
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.65)",
  },
  detailValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    textAlign: "right",
  },
  footerTag: {
    marginTop: 8,
    alignSelf: "center",
    background: "rgba(255,255,255,0.92)",
    color: "var(--primary-dark)",
    padding: "2px 12px",
    borderRadius: 20,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
  },
};

/* ===== ID CARD — back face + flip control ===== */
const idBackStyles = {
  headerSub: {
    display: "block",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 12,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.7)",
  },
  magStripe: {
    height: 30,
    borderRadius: 4,
    background: "rgba(10,10,10,0.75)",
    marginBottom: 14,
  },
  barcodeCard: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 6,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
  },
  barcode: {
    width: "100%",
    height: 34,
    backgroundImage:
      "repeating-linear-gradient(90deg, #111 0px, #111 2px, transparent 2px, transparent 3px, #111 3px, #111 6px, transparent 6px, transparent 8px, #111 8px, #111 9px, transparent 9px, transparent 13px)",
  },
  barcodeNum: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    color: "#111",
  },
  metaRow: {
    marginTop: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaDates: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  metaLine: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.6)",
  },
  detailValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
  },
  qrBox: {
    width: 38,
    height: 38,
    borderRadius: 5,
    border: "2px solid rgba(255,255,255,0.85)",
    backgroundColor: "#fff",
    backgroundImage:
      "repeating-conic-gradient(#111 0% 25%, #fff 0% 50%)",
    backgroundSize: "8px 8px",
  },
  signatureRow: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  signatureLine: {
    height: 18,
    borderBottom: "1px solid rgba(255,255,255,0.6)",
  },
  signatureLabel: {
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.75)",
  },
  fineprint: {
    marginTop: "auto",
    fontSize: 9.5,
    lineHeight: 1.4,
    fontWeight: 500,
    color: "rgba(255,255,255,0.75)",
  },
  flipBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    width: "fit-content",
    margin: "0 auto",
    padding: "6px 14px",
    borderRadius: 20,
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
  },
};