import React, { useState } from "react";
import { resolvePhotoUrl } from "../../api";
import { Camera, X, Monitor } from "lucide-react";

/* Shared by the teacher marking screen, the teacher submissions list and the
   admin E-Assessments page. Shows the student's profile photo plus every
   camera photo taken during the exam. Clicking a photo opens a detail view
   with the webcam picture, the full-screen screenshot taken at the same
   moment (if the student shared their screen), the question they were on and
   what they had answered at that point. Uses CSS variables only, so it works
   in every theme. */
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 853e0a02d5414d2f5c3111bc55b224aa8926e443
export default function EvidenceGallery({ evidence, title, emptyText, questionId }) {
  const [detail, setDetail] = useState(null); // { kind: "profile" } | { kind: "photo", photo }
  const [bigShot, setBigShot] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const profileUrl = resolvePhotoUrl(evidence?.profile_photo_url);
  const allPhotos = evidence?.photos || [];
  // When questionId is given (teacher marking screen), only show photos taken
  // while the student was on THAT question, so the screen isn't flooded.
  // The student's profile photo always stays for comparison.
  const filtering = questionId != null && !showAll;
  const photos = filtering ? allPhotos.filter((ph) => ph.question_id === questionId) : allPhotos;
  const hiddenCount = filtering ? allPhotos.length - photos.length : 0;

  if (!profileUrl && !photos.length && !hiddenCount) {
<<<<<<< HEAD
=======
=======
export default function EvidenceGallery({ evidence, title, emptyText }) {
  const [detail, setDetail] = useState(null); // { kind: "profile" } | { kind: "photo", photo }
  const [bigShot, setBigShot] = useState(null);

  const profileUrl = resolvePhotoUrl(evidence?.profile_photo_url);
  const photos = evidence?.photos || [];

  if (!profileUrl && !photos.length) {
>>>>>>> 875f706a1a1dacd88126fcb262f50b95bf8d9f60
>>>>>>> 853e0a02d5414d2f5c3111bc55b224aa8926e443
    return (
      <div style={st.empty}>
        <Camera size={13} /> {emptyText || "No camera photos were captured for this student."}
      </div>
    );
  }

  const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString() : "");
  const fmtFull = (d) => (d ? new Date(d).toLocaleString() : "");

  return (
    <div style={st.wrap}>
      {title !== null && (
        <div style={st.title}><Camera size={13} /> {title || "Student photos — compare before flagging"}</div>
      )}
      <div style={st.grid}>
        {profileUrl && (
          <button type="button" style={st.thumbBtn} onClick={() => setDetail({ kind: "profile" })} title="Profile photo">
            <img src={profileUrl} alt="Profile" style={st.thumb} loading="lazy" />
            <span style={st.caption}>Profile</span>
          </button>
        )}
        {photos.map((ph) => (
          <button key={ph.id} type="button" style={st.thumbBtn} onClick={() => setDetail({ kind: "photo", photo: ph })}
            title={`${ph.reason || "Camera photo"} · ${fmtFull(ph.created_at)}`}>
            <div style={{ position: "relative" }}>
              <img src={resolvePhotoUrl(ph.photo_url)} alt="Camera" style={st.thumb} loading="lazy" />
              {ph.screenshot_url && <span style={st.badge} title="Screenshot attached"><Monitor size={10} /></span>}
            </div>
            <span style={st.caption}>
              {ph.question_number ? `Q${ph.question_number} · ` : ""}{ph.reason === "exam start" ? "Start" : fmtTime(ph.created_at)}
            </span>
          </button>
        ))}
      </div>

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 853e0a02d5414d2f5c3111bc55b224aa8926e443
      {questionId != null && !photos.length && !showAll && (
        <div style={st.empty}><Camera size={13} /> No camera photos were taken while this question was open.</div>
      )}
      {questionId != null && (hiddenCount > 0 || showAll) && (
        <button type="button" style={st.linkBtn} onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show only this question's photos" : `Show all ${allPhotos.length} photos (${hiddenCount} from other questions)`}
        </button>
      )}

<<<<<<< HEAD
=======
=======
>>>>>>> 875f706a1a1dacd88126fcb262f50b95bf8d9f60
>>>>>>> 853e0a02d5414d2f5c3111bc55b224aa8926e443
      {detail && (
        <div style={st.overlay} onClick={() => { setDetail(null); setBigShot(null); }}>
          <div style={st.box} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={st.close} onClick={() => { setDetail(null); setBigShot(null); }} aria-label="Close"><X size={16} /></button>

            {detail.kind === "profile" ? (
              <>
                <img src={profileUrl} alt="Profile" style={st.bigImg} />
                <div style={st.meta}>Profile photo</div>
              </>
            ) : (
              <>
                <div style={st.metaTop}>
                  {detail.photo.reason === "exam start" ? "Exam start photo" : (detail.photo.reason || "Camera photo")}
                  {" · "}{fmtFull(detail.photo.created_at)}
                </div>
                <div style={st.pair}>
                  <div style={st.pairCol}>
                    <div style={st.label}>Webcam</div>
                    <img src={resolvePhotoUrl(detail.photo.photo_url)} alt="Webcam" style={st.bigImg} />
                  </div>
                  {detail.photo.screenshot_url ? (
                    <div style={st.pairCol}>
                      <div style={st.label}>Screen at that moment (click to enlarge)</div>
                      <img src={resolvePhotoUrl(detail.photo.screenshot_url)} alt="Screen" style={{ ...st.bigImg, cursor: "zoom-in" }}
                        onClick={() => setBigShot(resolvePhotoUrl(detail.photo.screenshot_url))} />
                    </div>
                  ) : (
                    <div style={{ ...st.pairCol, ...st.noShot }}>No screenshot — the student did not share their screen.</div>
                  )}
                </div>

                <div style={st.qBox}>
                  <div style={st.label}>
                    {detail.photo.question_number ? `Question ${detail.photo.question_number} — what the student was working on` : "Question"}
                  </div>
                  <div style={st.qText}>
                    {detail.photo.question_text || "Not recorded for this photo."}
                  </div>
                  {detail.photo.answer_text ? (
                    <>
                      <div style={{ ...st.label, marginTop: 8 }}>Their answer at that moment</div>
                      <div style={st.aText}>{detail.photo.answer_text}</div>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {bigShot && (
        <div style={{ ...st.overlay, zIndex: 1100 }} onClick={() => setBigShot(null)}>
          <img src={bigShot} alt="Screen" style={{ maxWidth: "96vw", maxHeight: "94vh", borderRadius: 6 }} />
        </div>
      )}
    </div>
  );
}

const st = {
  wrap: { margin: "10px 0 14px", padding: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm, 8px)" },
  title: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 },
  grid: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, flexWrap: "wrap" },
  thumbBtn: { flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: 0, cursor: "pointer" },
  thumb: { width: 96, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", background: "#000", display: "block" },
  badge: { position: "absolute", right: 3, bottom: 3, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 4, padding: "2px 3px", display: "flex" },
  caption: { fontSize: 10, color: "var(--text-secondary)" },
<<<<<<< HEAD
  linkBtn: { marginTop: 6, background: "none", border: "none", padding: 0, fontSize: 11, color: "var(--primary)", cursor: "pointer", textDecoration: "underline" },
=======
<<<<<<< HEAD
  linkBtn: { marginTop: 6, background: "none", border: "none", padding: 0, fontSize: 11, color: "var(--primary)", cursor: "pointer", textDecoration: "underline" },
=======
>>>>>>> 875f706a1a1dacd88126fcb262f50b95bf8d9f60
>>>>>>> 853e0a02d5414d2f5c3111bc55b224aa8926e443
  empty: { display: "flex", alignItems: "center", gap: 6, margin: "8px 0", fontSize: 12, color: "var(--text-secondary)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  box: { position: "relative", width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto", background: "var(--card)", color: "var(--text)", borderRadius: 10, padding: 14 },
  close: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 },
  metaTop: { fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", margin: "0 34px 10px 0" },
  meta: { marginTop: 6, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" },
  pair: { display: "flex", gap: 12, flexWrap: "wrap" },
  pairCol: { flex: "1 1 280px", minWidth: 0 },
  label: { fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
  bigImg: { display: "block", width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 6, background: "#000" },
  noShot: { display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 12, color: "var(--text-secondary)", border: "1px dashed var(--border)", borderRadius: 6, padding: 12 },
  qBox: { marginTop: 12, padding: 10, border: "1px solid var(--border)", borderLeft: "3px solid var(--primary)", borderRadius: 6, background: "var(--bg)" },
  qText: { fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  aText: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text-secondary)", maxHeight: 160, overflowY: "auto" },
};
