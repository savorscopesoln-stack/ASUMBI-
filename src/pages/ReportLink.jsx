import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";
import StudentDownloadHub from "../components/StudentDownloadHub";
import PassportPhotoStep from "../components/PassportPhotoStep";

/* =========================================================================
   REPORT LINK PAGE  —  /r/:token   (public, no login)

   Opened from the download link a school sends to a student. The link's token
   is swapped (POST /auth/report-link) for a short-lived REPORT-ONLY session
   that is kept in this tab's sessionStorage — NOT localStorage — so opening a
   student's link never signs anyone out of, or into, the normal portal on the
   same browser. api.js and StudentReport.jsx use that session only while the
   address starts with /r/. Then the normal report form page is shown, with its
   own Download PDF button.
========================================================================= */
export default function ReportLink() {
  const { token } = useParams();
  const [state, setState] = useState({ status: "loading", message: "" });
  const [downloads, setDownloads] = useState({ mode: "report" });
  const [photoStep, setPhotoStep] = useState(null); // { token, name } while the student still has to add a passport photo

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        sessionStorage.removeItem("report_link_token");
        sessionStorage.removeItem("report_link_user");
        const res = await API.post("/auth/report-link", {}, { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        sessionStorage.setItem("report_link_token", res.data.token);
        sessionStorage.setItem("report_link_user", JSON.stringify(res.data.user));
        setDownloads(res.data.downloads || { mode: "report" });
        // No passport photo on file yet: ask for it right here before showing the report form.
        if (!res.data.user?.photoUrl) setPhotoStep({ token: res.data.token, name: res.data.user?.name || "" });
        setState({ status: "ready", message: "" });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err?.response?.data?.message || "This link could not be opened. Please check your connection and try again.",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.status === "ready" && photoStep) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg, #f8fafc)" }}>
        <PassportPhotoStep
          name={photoStep.name}
          token={photoStep.token}
          onDone={(data) => {
            sessionStorage.setItem("report_link_token", data.token);
            sessionStorage.setItem("report_link_user", JSON.stringify(data.user));
            setDownloads(data.downloads || downloads);
            setPhotoStep(null);
          }}
        />
      </div>
    );
  }

  if (state.status === "ready") return <StudentDownloadHub downloads={downloads} />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg, #f8fafc)", color: "var(--text, #0f172a)" }}>
      <div style={{ maxWidth: 420, textAlign: "center", background: "var(--card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 14, padding: "28px 24px" }}>
        {state.status === "loading" ? (
          <p style={{ margin: 0, fontWeight: 600 }}>Opening your report form…</p>
        ) : (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Can't open this report form</p>
            <p style={{ margin: 0, color: "var(--text-muted, #64748b)", lineHeight: 1.5 }}>{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
