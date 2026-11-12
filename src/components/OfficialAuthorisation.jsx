import React, { useMemo } from "react";
import { resolveFileUrl } from "../api";

/* =========================================================================
   OFFICIAL AUTHORISATION

   A 1:1 copy of the "Official Authorisation" section of the student Report
   Form (pages/Student/StudentReport.jsx) — same markup, same styles, same
   stamp behaviour — so the Transcript shows its stamps and signatures
   exactly the way the Report Form does:

     - one "<Title>'s Remarks" card per Class Teacher / Lecturer of the
       student's class (remarks box; Name / Signature / Date), with that
       teacher's OWN stamp floating over the card;
     - one "Approved By" card per signatory (name, title; Signature and
       Official Stamp), with that signatory's OWN stamp floating over it;
     - a stamp falls back to the school-wide stamp when the person has not
       uploaded one, and the dashed "Official Stamp" placeholder shows only
       when no stamp exists anywhere.

   If the Report Form's authorisation section is ever changed, change this
   file to match (the PDF twin is drawSignatureBlock in
   backend/utils/transcriptPdf.js).
========================================================================= */

const getStyles = (primary) => ({
  section: { position: "relative", zIndex: 1, padding: 0, marginTop: 1 },
  sectionLabelBar: {
    borderLeft: `4px solid ${primary}`,
    paddingLeft: 9,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: primary,
    textTransform: "uppercase",
  },
  authGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
  },
  authCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 12px",
    position: "relative",
    overflow: "visible",
  },
  authCardTitle: {
    margin: "0 0 9px",
    fontSize: 10.5,
    fontWeight: 800,
    color: primary,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  remarksBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    minHeight: 22,
    padding: 8,
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
  },
  sigGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
    marginTop: 6,
  },
  sigItem: { textAlign: "center" },
  sigLabel: {
    margin: "0 0 5px",
    fontSize: 9.5,
    color: "#64748b",
    fontWeight: 600,
  },
  sigLine: {
    borderBottom: "1px solid #334155",
    width: "80%",
    margin: "0 auto",
  },
  stampBox: {
    width: "1.4in",
    height: "0.7in",
    margin: "0 auto",
    border: "1.5px dashed #94a3b8",
    borderRadius: 4,
  },
  sigImage: {
    display: "block",
    maxWidth: "80%",
    maxHeight: 32,
    margin: "0 auto",
    objectFit: "contain",
  },
  stampOverlayImage: {
    position: "absolute",
    top: 2,
    right: 4,
    width: "2in",
    height: "1in",
    objectFit: "contain",
    opacity: 0.85,
    transform: "rotate(-8deg)",
    mixBlendMode: "multiply",
    pointerEvents: "none",
    zIndex: 5,
  },
});

export default function OfficialAuthorisation({
  primary = "#7f1d1d",
  classTeachers = [],
  signatories = [],
  dean,
  principal,
  signatory,
  schoolStampUrl,
}) {
  const styles = useMemo(() => getStyles(primary), [primary]);
  const schoolStampSrc = resolveFileUrl(schoolStampUrl);

  return (
    <div style={styles.section}>
      <div style={styles.sectionLabelBar}>
        <span style={styles.sectionLabel}>Official Authorisation</span>
      </div>
      <div style={styles.authGrid}>
        {classTeachers.length > 0 ? (
          classTeachers.map((ct, i) => {
            const ctStampSrc = resolveFileUrl(ct.stampUrl) || schoolStampSrc;
            return (
              <div style={styles.authCard} key={ct.id ?? i}>
                {ctStampSrc && <img src={ctStampSrc} alt="" style={styles.stampOverlayImage} />}
                <p style={styles.authCardTitle}>
                  {ct.title ? `${ct.title}'s Remarks` : "Class Teacher / Lecturer's Remarks"}
                </p>
                <div style={styles.remarksBox}>
                  <p style={{ color: "#94a3b8", fontSize: 8, margin: 0 }}>&nbsp;</p>
                </div>
                <div style={styles.sigGrid}>
                  <div style={styles.sigItem}>
                    <p style={styles.sigLabel}>Name</p>
                    {ct.name ? (
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 11.5, color: "#0f172a" }}>{ct.name}</p>
                    ) : (
                      <div style={styles.sigLine} />
                    )}
                  </div>
                  <div style={styles.sigItem}>
                    <p style={styles.sigLabel}>Signature</p>
                    {ct.signatureUrl ? (
                      <img src={resolveFileUrl(ct.signatureUrl)} alt="" style={styles.sigImage} />
                    ) : (
                      <div style={styles.sigLine} />
                    )}
                  </div>
                  <div style={styles.sigItem}>
                    <p style={styles.sigLabel}>Date</p>
                    <div style={styles.sigLine} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.authCard}>
            <p style={styles.authCardTitle}>Class Teacher / Lecturer's Remarks</p>
            <div style={styles.remarksBox}>
              <p style={{ color: "#94a3b8", fontSize: 8, margin: 0 }}>&nbsp;</p>
            </div>
            <div style={styles.sigGrid}>
              <div style={styles.sigItem}><p style={styles.sigLabel}>Name</p><div style={styles.sigLine} /></div>
              <div style={styles.sigItem}><p style={styles.sigLabel}>Signature</p><div style={styles.sigLine} /></div>
              <div style={styles.sigItem}><p style={styles.sigLabel}>Date</p><div style={styles.sigLine} /></div>
            </div>
          </div>
        )}

        {signatories.length > 0 ? (
          signatories.map((s) => {
            const sStampSrc = resolveFileUrl(s.stampUrl) || schoolStampSrc;
            return (
              <div style={styles.authCard} key={s.id}>
                {sStampSrc && <img src={sStampSrc} alt="" style={styles.stampOverlayImage} />}
                <p style={styles.authCardTitle}>Approved By</p>
                <div style={{ padding: "4px 0" }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{s.name || "—"}</p>
                  <p style={{ margin: "0 0 2px", color: "#64748b", fontSize: 12 }}>{s.title || "—"}</p>
                </div>
                <div style={styles.sigGrid}>
                  <div style={styles.sigItem}>
                    <p style={styles.sigLabel}>Signature</p>
                    {s.signatureUrl ? (
                      <img src={resolveFileUrl(s.signatureUrl)} alt="" style={styles.sigImage} />
                    ) : (
                      <div style={styles.sigLine} />
                    )}
                  </div>
                  <div style={styles.sigItem}>
                    <p style={styles.sigLabel}>Official Stamp</p>
                    {!sStampSrc && <div style={styles.stampBox} />}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.authCard}>
            {(() => {
              const fbStampSrc =
                resolveFileUrl(dean?.stampUrl || principal?.stampUrl || signatory?.stampUrl) || schoolStampSrc;
              return fbStampSrc ? <img src={fbStampSrc} alt="" style={styles.stampOverlayImage} /> : null;
            })()}
            <p style={styles.authCardTitle}>Approved By</p>
            <div style={{ padding: "4px 0" }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                {dean?.name || principal?.name || signatory?.name || "—"}
              </p>
              <p style={{ margin: "0 0 2px", color: "#64748b", fontSize: 12 }}>
                {dean?.title || principal?.title || signatory?.title || "—"}
              </p>
            </div>
            <div style={styles.sigGrid}>
              <div style={styles.sigItem}>
                <p style={styles.sigLabel}>Signature</p>
                {(dean?.signatureUrl || principal?.signatureUrl || signatory?.signatureUrl) ? (
                  <img
                    src={resolveFileUrl(dean?.signatureUrl || principal?.signatureUrl || signatory?.signatureUrl)}
                    alt=""
                    style={styles.sigImage}
                  />
                ) : (
                  <div style={styles.sigLine} />
                )}
              </div>
              <div style={styles.sigItem}>
                <p style={styles.sigLabel}>Official Stamp</p>
                {!(resolveFileUrl(dean?.stampUrl || principal?.stampUrl || signatory?.stampUrl) || schoolStampSrc) && (
                  <div style={styles.stampBox} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
