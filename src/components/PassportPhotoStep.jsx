import React, { useCallback, useEffect, useRef, useState } from "react";
import API from "../api";

/* =========================================================================
   PASSPORT PHOTO STEP

   Shown on /report-download (right after the username is checked) and on
   report links (/r/…) when the student has no photo on file. The student can
   pick a photo from the device, take one with the phone camera, or use the
   live camera on a computer — and it is saved straight away (POST
   /report-access/photo), after which the download unlocks.

   Props:
     name      – student's name (for the greeting)
     token     – Bearer token for the upload (step-up token or report session)
     onDone    – called with the server's "ready" response once the photo is saved
     onExpired – called when the token timed out (go back to the username step)
     onCancel  – optional "Not you? Start over"
========================================================================= */

const S = {
  card: { width: "100%", maxWidth: 420, background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 14, padding: "28px 24px", boxShadow: "0 8px 30px rgba(15,23,42,0.06)", color: "var(--text, #0f172a)" },
  h1: { margin: "0 0 6px", fontSize: 21, fontWeight: 800 },
  sub: { margin: "0 0 14px", fontSize: 14, lineHeight: 1.5, color: "var(--text-muted, #64748b)" },
  warn: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, lineHeight: 1.45, background: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b", fontWeight: 600 },
  err: { margin: "0 0 14px", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  tips: { margin: "0 0 14px", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted, #64748b)" },
  frame: { width: 150, height: 188, margin: "0 auto 14px", borderRadius: 8, border: "2px dashed var(--border, #cbd5e1)", background: "var(--input-bg, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "var(--text-muted, #94a3b8)", fontSize: 12, textAlign: "center" },
  row: { display: "flex", gap: 10, marginBottom: 10 },
  btn: { flex: 1, padding: "12px 10px", fontSize: 14.5, fontWeight: 700, border: "none", borderRadius: 9, cursor: "pointer", background: "var(--primary, #1d4ed8)", color: "var(--primary-text, #fff)" },
  btnOutline: { flex: 1, padding: "12px 10px", fontSize: 14.5, fontWeight: 700, borderRadius: 9, cursor: "pointer", background: "transparent", color: "var(--primary, #1d4ed8)", border: "1.5px solid var(--primary, #1d4ed8)" },
  link: { background: "none", border: "none", padding: 0, color: "var(--primary, #1d4ed8)", fontWeight: 600, cursor: "pointer", fontSize: 13 },
};

const MAX_SIDE = 1200;

/* Shrinks big phone photos (and converts HEIC-like formats the browser can decode) to a JPEG so the
   upload is small and always within the server's 5MB limit. Falls back to the original file. */
const toJpeg = (fileOrBlob) =>
  new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(fileOrBlob);
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => resolve(b || fileOrBlob), "image/jpeg", 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(fileOrBlob); };
      img.src = url;
    } catch {
      resolve(fileOrBlob);
    }
  });

export default function PassportPhotoStep({ name, token, onDone, onExpired, onCancel }) {
  const [blob, setBlob] = useState(null);       // the photo waiting to be uploaded
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [camOpen, setCamOpen] = useState(false);
  const fileRef = useRef(null);
  const phoneCamRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const canLiveCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOpen(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const accept = async (file) => {
    setError("");
    if (!file) return;
    if (!/^image\//i.test(file.type || "image/")) { setError("Please choose an image file (a photo)."); return; }
    const jpeg = await toJpeg(file);
    if (jpeg.size > 5 * 1024 * 1024) { setError("That photo is too large. Please choose a smaller one."); return; }
    setBlob(jpeg);
    setPreview(URL.createObjectURL(jpeg));
  };

  const openCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 1200 } }, audio: false });
      streamRef.current = stream;
      setCamOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      });
    } catch {
      setError("We couldn't open the camera. Allow camera access, or choose a photo from your device instead.");
    }
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    canvas.toBlob(async (b) => {
      stopCamera();
      if (b) await accept(b);
    }, "image/jpeg", 0.92);
  };

  const upload = async () => {
    if (!blob) { setError("Choose a photo or take one with the camera first."); return; }
    setError("");
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append("photo", blob, "passport.jpg");
      const { data } = await API.post("/report-access/photo", fd, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });
      onDone(data);
    } catch (err) {
      if (err?.response?.data?.expired && onExpired) { onExpired(); return; }
      setError(err?.response?.data?.message || "Could not save your photo. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => { setBlob(null); setPreview(""); setError(""); };

  return (
    <div style={S.card}>
      <h1 style={S.h1}>Upload your passport photo</h1>
      <p style={S.sub}>Hi {name || "student"}.</p>
      <div style={S.warn} role="status">
        Please upload a clear, official passport photo to continue. Your report form and transcript need your photo.
      </div>
      <ul style={S.tips}>
        <li>Face the camera straight on, with your whole face and shoulders in view.</li>
        <li>Plain light background, good light, no hat, no sunglasses, no filters.</li>
      </ul>
      {error && <div style={S.err} role="alert">{error}</div>}

      {camOpen ? (
        <>
          <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 10, background: "#000", marginBottom: 12, transform: "scaleX(-1)" }} />
          <div style={S.row}>
            <button type="button" style={S.btn} onClick={snap}>📸 Take photo</button>
            <button type="button" style={S.btnOutline} onClick={stopCamera}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div style={S.frame}>
            {preview ? <img src={preview} alt="Your photo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Photo preview"}
          </div>

          {/* hidden pickers: the file picker, and the phone's own camera app (front camera) */}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" style={{ display: "none" }}
            onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={phoneCamRef} type="file" accept="image/*" capture="user" style={{ display: "none" }}
            onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }} />

          <div style={S.row}>
            <button type="button" style={S.btnOutline} onClick={() => fileRef.current?.click()} disabled={busy}>🖼️ Upload photo</button>
            <button type="button" style={S.btnOutline} disabled={busy}
              onClick={() => (canLiveCamera && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? openCamera() : phoneCamRef.current?.click())}>
              📷 Use camera
            </button>
          </div>

          <button type="button" style={{ ...S.btn, width: "100%", opacity: busy || !blob ? 0.6 : 1 }} onClick={upload} disabled={busy || !blob}>
            {busy ? "Saving…" : "Save photo & continue"}
          </button>
          {blob && !busy && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button type="button" style={S.link} onClick={clear}>Choose a different photo</button>
            </div>
          )}
        </>
      )}

      {onCancel && !camOpen && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button type="button" style={S.link} onClick={onCancel}>Not you? Start over</button>
        </div>
      )}
    </div>
  );
}
