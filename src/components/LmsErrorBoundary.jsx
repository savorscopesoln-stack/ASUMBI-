import React from "react";

/* Catches a render crash in an LMS screen and shows a message instead of a blank page.
   Usage: <LmsErrorBoundary><LmsAdmin /></LmsErrorBoundary> */
export default class LmsErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("LMS screen crashed:", error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ maxWidth: 520, margin: "48px auto", padding: 24, border: "1px solid var(--border, #E2E5EA)", borderRadius: 14, background: "var(--card, #fff)", color: "var(--text, #0B0F19)", textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>This page could not be shown</h2>
        <p style={{ margin: "0 0 16px", color: "var(--text-muted, #64748B)", lineHeight: 1.5 }}>
          Something went wrong while displaying this screen. Please reload the page. If it keeps happening, tell your administrator.
        </p>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border, #E2E5EA)", background: "var(--card, #fff)", color: "var(--text, #0B0F19)", cursor: "pointer" }}>Reload</button>
      </div>
    );
  }
}
