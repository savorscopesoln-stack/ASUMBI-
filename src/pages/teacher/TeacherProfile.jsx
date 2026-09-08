import React, { useState, useEffect, useRef } from "react";
import API, { resolvePhotoUrl } from "../../api";
import { Camera, Loader2, RotateCw } from "lucide-react";

/* ─── design-token stylesheet ───
   Copied verbatim from Dashboard.jsx (same id guard — if the user
   already visited /dashboard this is a no-op and both pages share
   one injected <style>). Replaces the old page-local "teacher-
   profile-tokens" stylesheet, which only carried a spin keyframe
   and left everything else as one-off hex values disconnected
   from the rest of the app. */
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

    .dash-btn { transition: filter 0.15s ease, background-color .15s ease, border-color .15s ease; }
    .dash-btn:hover { filter: brightness(0.97); }

    input:focus-visible, button:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }
  `;
  document.head.appendChild(el);
};

/* ─── glass-badge stylesheet (separate id on purpose) ───
   This MUST be its own <style> tag, not appended onto the shared
   "dash-tokens" block above. That block is guarded by
   `if (document.getElementById("dash-tokens")) return;`, and
   Dashboard.jsx / AddQuestions.jsx / TeacherReports.jsx all inject
   under that same id — so if the user visits any of those pages
   first in the same session, #dash-tokens already exists and this
   page's injectStyles() would bail out before ever adding the
   badge's hover/glow/pulse rules. Keeping this under its own id
   means it always mounts, no matter what page loaded first. */
const injectBadgeStyles = () => {
  if (document.getElementById("glass-badge-tokens")) return;
  const el = document.createElement("style");
  el.id = "glass-badge-tokens";
  el.textContent = `

    /* ── glass badge (tutor badge) ──
       Matches the glassmorphic product cards from the reference
       clip: frosted translucent surface + blur, a soft radial glow
       that blooms in behind it on hover, a gentle lift/scale "pop",
       and a pulsing ring echoing the clip's sound-wave ripple. */
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

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(el);
};

/* ─── ID-card stylesheet (separate id, same guard pattern) ───
   Turns the maroon ID plaque into a flippable staff ID: the
   plaque itself stays the solid maroon gradient "card body", and
   a frosted glass panel (the actual front/back "laminate") sits
   on top of it, reusing the same blur/glow/lift/pulse language as
   .glass-badge above. The flip uses a real 3D transform so both
   faces exist at once with backface-visibility hidden — no
   swapping content in and out, just a rotateY like a real badge
   spinning on a lanyard clip.
   Global prefers-reduced-motion rule above already zeroes out all
   transition/animation durations site-wide, so the flip, glow and
   pulse all automatically collapse to an instant, non-animated
   state for users who've asked for less motion — nothing extra
   needed here. */
const injectIdCardStyles = () => {
  if (document.getElementById("id-card-tokens")) return;
  const el = document.createElement("style");
  el.id = "id-card-tokens";
  el.textContent = `
    /* Outer shell just centers a fixed, card-shaped area on the
       page and hosts the 3D perspective — it has no background or
       padding of its own, so nothing "stretches" edge to edge. */
    .id-card-shell {
      width: min(272px, 84vw);
      margin: 0 auto 14px;
      position: relative;
      perspective: 1600px;
    }

    /* CR80 badge proportions (53.98mm x 85.60mm), portrait —
       real staff-lanyard ratio, not a wide banner. */
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

    /* Each face IS the physical card: printed maroon base +
       frosted glass lamination on top, full card size, real
       rounded-corner card radius and a floating drop shadow. */
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

    /* lanyard hole-punch slot at the top edge — the detail that
       actually reads as "a badge", not a generic rounded rect */
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

    /* amber glow bloom behind the card, card-shaped */
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

    /* hover lift + glow, only on the face currently facing up */
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

    /* pulsing ring ripple, only on the face currently on top */
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
      background: var(--primary-tint) !important;
      border-color: var(--primary) !important;
    }
  `;
  document.head.appendChild(el);
};

export default function TeacherProfile() {
  injectStyles();
  injectBadgeStyles();
  injectIdCardStyles();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [user, setUser] = useState(storedUser);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // profile photo
  const [photoMsg, setPhotoMsg] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // ID card flip state — front shows the usual staff details,
  // back shows the "laminated" reverse of the badge.
  const [flipped, setFlipped] = useState(false);

  // Refresh from the server on mount so photoUrl reflects the latest
  // upload (localStorage's copy is only as fresh as the last login).
  useEffect(() => {
    API.get("/teacher/profile")
      .then((res) => {
        setUser((u) => ({ ...u, ...res.data }));
      })
      .catch((err) => console.log(err));
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setPhotoMsg("");
      setUploadingPhoto(true);

      const fd = new FormData();
      fd.append("photo", file);

      const res = await API.put("/teacher/profile/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = { ...user, photoUrl: res.data.photoUrl };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setPhotoMsg("✅ Profile photo updated");
    } catch (err) {
      console.log(err);
      setPhotoMsg(`❌ ${err.response?.data?.message || "Failed to upload photo"}`);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const changePassword = async () => {
    if (!oldPass || !newPass) {
      setMsg("⚠️ Fill all fields");
      return;
    }

    try {
      setLoading(true);
      await API.put("/auth/change-password", {
        oldPassword: oldPass,
        newPassword: newPass,
      });

      setMsg("✅ Password updated successfully");
      setOldPass("");
      setNewPass("");
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to update password"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>👤 Teacher Profile</h2>

      {/* ================= ID CARD (flippable) ================= */}
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
            <div style={idFrontStyles.topBar}>
              <span style={idFrontStyles.schoolName}>ASUMBI TTC</span>
              <span style={idFrontStyles.subtitle}>STAFF IDENTIFICATION</span>
            </div>

            <div style={idFrontStyles.photoBlock}>
              <div style={styles.avatarWrap}>
                {user.photoUrl ? (
                  <img src={resolvePhotoUrl(user.photoUrl)} alt="Profile" style={idFrontStyles.avatarImg} />
                ) : (
                  <div style={idFrontStyles.avatar}>{user.name?.charAt(0) || "T"}</div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadingPhoto}
                  style={styles.avatarEditBtn}
                  className="dash-btn"
                  aria-label="Change profile photo"
                >
                  {uploadingPhoto ? <Loader2 size={12} className="dash-spin" /> : <Camera size={12} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <h2 style={idFrontStyles.name}>{user.name || "Teacher Name"}</h2>
            <span style={idFrontStyles.role} className="glass-badge">
              {user.isClassTeacher ? "🎓 Class Teacher" : "📘 Subject Teacher"}
            </span>

            <div style={idFrontStyles.detailsBox}>
              <div style={idFrontStyles.detailRow}>
                <span style={idFrontStyles.detailLabel}>ID NO.</span>
                <span style={idFrontStyles.detailValue}>{user.username || "N/A"}</span>
              </div>
              <div style={idFrontStyles.detailRow}>
                <span style={idFrontStyles.detailLabel}>SUBJECT</span>
                <span style={idFrontStyles.detailValue}>{user.subject || "N/A"}</span>
              </div>
            </div>

            <span style={idFrontStyles.footerTag}>STAFF ID</span>
          </div>

          {/* ---- BACK FACE ---- */}
          <div className="id-card-face id-card-back">
            <span style={idBackStyles.headerSub}>STAFF ID — REVERSE</span>

            <div style={idBackStyles.magStripe} />

            <div style={idBackStyles.barcodeCard}>
              <div style={idBackStyles.barcode} />
              <span style={idBackStyles.barcodeNum}>{(user.username || "N/A").toUpperCase()}</span>
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
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="dash-btn id-card-flip-btn"
        style={idBackStyles.flipBtn}
        aria-label={flipped ? "Show front of ID card" : "Show back of ID card"}
      >
        <RotateCw size={12} />
        {flipped ? "View Front" : "View Back"}
      </button>

      {!user.photoUrl && (
        <p style={idFrontStyles.photoNudge}>⚠️ No profile photo on file — tap the camera icon on the card to add one.</p>
      )}
      {photoMsg && <p style={{ ...styles.message, textAlign: "center" }}>{photoMsg}</p>}

      {/* ================= PASSWORD ================= */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>🔒 Change Password</h3>

        <input
          type="password"
          placeholder="Old Password"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={changePassword}
          disabled={loading}
          className="dash-btn"
          style={{
            ...styles.btn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        {msg && <p style={styles.message}>{msg}</p>}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES — reads Dashboard.jsx's CSS variables directly, so
   this page matches its light background, white cards, borders,
   and maroon accent exactly (and stays in sync with the theme
   toggle via [data-theme='dark']).
========================================================= */
const styles = {
  page: {
    color: "var(--text)",
    padding: 20,
    background: "var(--bg)",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  title: {
    marginBottom: 16,
    fontWeight: 800,
    fontSize: 20,
    color: "var(--text)",
  },

  avatarWrap: { position: "relative", width: 64, height: 64, flexShrink: 0 },
  avatarEditBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "var(--success)",
    color: "#fff",
    border: "2px solid var(--card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },

  /* ===== PASSWORD CARD ===== */
  card: {
    background: "var(--card)",
    padding: 20,
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
  },

  sectionTitle: {
    marginBottom: 4,
    fontWeight: 800,
    fontSize: 15,
    color: "var(--text)",
  },

  input: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  btn: {
    background: "var(--primary)",
    color: "#fff",
    padding: 10,
    border: "1px solid var(--primary)",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontFamily: "inherit",
    fontSize: 14,
  },

  message: {
    marginTop: 8,
    fontSize: 13,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
};

/* ===== ID CARD — front face (portrait badge layout) ===== */
const idFrontStyles = {
  topBar: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
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
  photoNudge: {
    marginTop: 4,
    marginBottom: 4,
    fontSize: 12,
    textAlign: "center",
    color: "var(--warning)",
    fontWeight: 600,
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
    margin: "12px auto 0",
    padding: "6px 14px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};