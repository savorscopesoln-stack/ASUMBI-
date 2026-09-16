import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* =========================================================
   LANDING
   Doravo Core's marketing landing page, living at the app's
   own "/" route. Shown to anyone who isn't logged in yet;
   logged-in users are bounced straight to their dashboard
   from App.jsx.

   This is a commercial SaaS marketing page for an EXISTING
   product — it sells what Doravo Core does for an institution
   rather than explaining how it's built underneath. Brand
   (Doravo, "Moving Education Forward", the maroon/ink identity,
   existing logo assets) is unchanged from what's already
   shipped; only the landing page's structure and copy have
   been reworked.

   No customer counts, testimonials, logos or ratings are
   included below because none exist yet to report honestly —
   see the note at the bottom of this file for what to wire up
   once that information is available.

   Styles are injected the same way Login.jsx injects its own
   design tokens (a single <style> tag, added once) rather than
   a new global CSS file — keeps this page self-contained and
   doesn't touch any other page's styling.
========================================================= */

const injectLandingStyles = () => {
  if (document.getElementById("landing-tokens")) return;
  const el = document.createElement("style");
  el.id = "landing-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');

    .doravo-landing{
      --maroon:#7A1B36;
      --maroon-deep:#3E0F1E;
      --maroon-ink:#2A0A15;
      --ink:#221A16;
      --paper:#EFE9DC;
      --paper-dim:#E3DAC6;
      --white:#FFFDF8;
      --brass:#9C7A3C;
      --line: rgba(34,26,22,0.14);
      --line-on-dark: rgba(255,253,248,0.18);

      margin:0;
      background:var(--paper);
      color:var(--ink);
      font-family:'Manrope', sans-serif;
      font-size:16px;
      line-height:1.6;
      -webkit-font-smoothing:antialiased;
      scroll-behavior:smooth;
    }
    .doravo-landing *{ box-sizing:border-box; }
    .doravo-landing h1,.doravo-landing h2,.doravo-landing h3,.doravo-landing h4,.doravo-landing .serif{
      font-family:'Fraunces', serif;
      font-weight:500;
      letter-spacing:-0.01em;
      margin:0;
      color:var(--maroon-ink);
    }
    .doravo-landing p{ margin:0; }
    .doravo-landing a{ color:inherit; }
    .doravo-landing img{ display:block; max-width:100%; }
    .doravo-landing button{ font-family:inherit; }
    .doravo-landing .wrap{ width:99%; max-width:1800px; margin:0 auto; padding:0; }
    @media (max-width:640px){ .doravo-landing .wrap{ width:97%; } }
    .doravo-landing :focus-visible{ outline:2px solid var(--maroon); outline-offset:3px; }

    /* ---------- header ---------- */
    .doravo-landing header{
      position:sticky; top:0; z-index:50;
      background:rgba(239,233,220,0.94);
      backdrop-filter:blur(6px);
      border-bottom:1px solid var(--line);
    }
    .doravo-landing .nav{ display:flex; align-items:center; justify-content:space-between; padding:14px 0; }
    .doravo-landing .brand{ display:flex; align-items:center; gap:11px; text-decoration:none; }
    .doravo-landing .brand img{ height:32px; width:auto; }
    .doravo-landing .brand span{ font-family:'Fraunces', serif; font-weight:500; font-size:19px; color:var(--maroon-ink); letter-spacing:0.01em; }
    .doravo-landing .navlinks{ display:flex; gap:30px; }
    .doravo-landing .navlinks a{ text-decoration:none; font-size:14.5px; color:var(--ink); opacity:0.78; padding:6px 0; border-bottom:1px solid transparent; background:none; border-left:none; border-right:none; border-top:none; cursor:pointer; transition:opacity 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .navlinks a:hover{ opacity:1; border-color:var(--maroon); }
    .doravo-landing .navcta{ display:inline-block; text-decoration:none; background:var(--maroon); color:var(--white); font-size:14px; font-weight:600; padding:10px 20px; border-radius:3px; white-space:nowrap; transition:background 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .navcta:hover{ background:var(--maroon-deep); transform:translateY(-1px); }
    .doravo-landing .nav-right{ display:flex; align-items:center; gap:16px; }

    /* ---------- sign-in button ---------- */
    .doravo-landing .navlogin{
      position:relative;
      display:inline-flex;
      align-items:center;
      gap:6px;
      text-decoration:none;
      font-size:14.5px;
      font-weight:700;
      color:var(--maroon-ink);
      background:var(--white);
      border:1.5px solid var(--maroon);
      padding:9px 20px;
      border-radius:999px;
      transition:transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1), color 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1);
      box-shadow:0 0 0 0 rgba(122,27,54,0.35);
      animation:navlogin-pulse 3.4s ease-in-out infinite;
      white-space:nowrap;
    }
    .doravo-landing .navlogin:hover{
      background:var(--maroon);
      color:var(--white);
      transform:translateY(-1px);
      box-shadow:0 6px 14px -8px rgba(122,27,54,0.5);
      animation-play-state:paused;
    }
    .doravo-landing .navlogin svg{ width:13px; height:13px; transition:transform 0.25s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .navlogin:hover svg{ transform:translateX(2px); }
    @keyframes navlogin-pulse{
      0%, 100%{ box-shadow:0 0 0 0 rgba(122,27,54,0.22); }
      50%{ box-shadow:0 0 0 5px rgba(122,27,54,0); }
    }
    @media (prefers-reduced-motion: reduce){
      .doravo-landing .navlogin{ animation:none; }
      .doravo-landing .reveal{ opacity:1 !important; transform:none !important; }
    }

    /* ---------- mobile nav ---------- */
    .doravo-landing .hamburger{
      display:none; background:none; border:1px solid var(--line); border-radius:4px;
      width:40px; height:40px; align-items:center; justify-content:center; cursor:pointer;
    }
    .doravo-landing .hamburger svg{ width:18px; height:18px; color:var(--maroon-ink); }
    .doravo-landing .mobile-menu{
      display:none; flex-direction:column; gap:2px; border-top:1px solid var(--line);
      background:var(--paper); padding:10px 0 18px;
    }
    .doravo-landing .mobile-menu.open{ display:flex; }
    .doravo-landing .mobile-menu a{ text-decoration:none; color:var(--ink); font-size:15px; padding:12px 0; border-bottom:1px solid var(--line); }
    .doravo-landing .mobile-menu .mobile-ctas{ display:flex; gap:10px; margin-top:14px; }
    .doravo-landing .mobile-menu .mobile-ctas > *{ flex:1; text-align:center; }

    @media (max-width:860px){
      .doravo-landing .navlinks{ display:none; }
      .doravo-landing .hamburger{ display:flex; }
      .doravo-landing .nav-right .navlogin span.label-full{ display:none; }
    }
    @media (min-width:861px){ .doravo-landing .mobile-menu{ display:none !important; } }

    /* ---------- reveal-on-scroll (single, restrained) ---------- */
    .doravo-landing .reveal{ opacity:0; transform:translateY(10px); transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .reveal.in{ opacity:1; transform:none; }

    /* ---------- hero ---------- */
    .doravo-landing .hero{ padding:80px 0 64px; }
    .doravo-landing .eyebrow{ font-size:13.5px; font-weight:600; color:var(--maroon); margin-bottom:14px; letter-spacing:0.01em; }
    .doravo-landing .hero-grid{ display:grid; grid-template-columns:1.05fr 0.95fr; gap:60px; align-items:center; }
    @media (max-width:900px){ .doravo-landing .hero-grid{ grid-template-columns:1fr; gap:44px; } }
    .doravo-landing .hero h1{ font-size:clamp(32px, 4.4vw, 50px); line-height:1.1; max-width:16ch; }
    .doravo-landing .hero .lede{ margin-top:20px; max-width:48ch; font-size:17px; color:var(--ink); opacity:0.86; }
    .doravo-landing .hero-ctas{ display:flex; gap:14px; margin-top:30px; flex-wrap:wrap; }
    .doravo-landing .btn-primary{ background:var(--maroon); color:var(--white); text-decoration:none; padding:13px 24px; border-radius:3px; font-weight:600; font-size:15px; display:inline-block; border:1px solid var(--maroon); transition:background 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .btn-primary:hover{ background:var(--maroon-deep); border-color:var(--maroon-deep); transform:translateY(-1px); }
    .doravo-landing .btn-ghost{ border:1px solid var(--ink); color:var(--ink); text-decoration:none; padding:12px 24px; border-radius:3px; font-weight:600; font-size:15px; display:inline-block; transition:background 0.25s cubic-bezier(0.16,1,0.3,1), color 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .btn-ghost:hover{ background:var(--ink); color:var(--white); transform:translateY(-1px); }
    .doravo-landing .hero-note{ margin-top:18px; font-size:13.5px; opacity:0.6; }

    /* ---------- hero product visual ---------- */
    .doravo-landing .product-frame{
      background:var(--white); border:1px solid var(--line); border-radius:10px;
      box-shadow:0 30px 60px -34px rgba(42,10,21,0.4);
      overflow:hidden;
    }
    .doravo-landing .product-frame .pf-bar{
      display:flex; align-items:center; gap:6px; padding:12px 16px; border-bottom:1px solid var(--line); background:var(--paper);
    }
    .doravo-landing .pf-dot{ width:8px; height:8px; border-radius:50%; background:var(--line); }
    .doravo-landing .pf-title{ margin-left:8px; font-size:12px; opacity:0.55; }
    .doravo-landing .product-frame .pf-body{ padding:22px 22px 26px; }
    .doravo-landing .pf-stat-row{ display:flex; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
    .doravo-landing .pf-stat{ flex:1; min-width:110px; border:1px solid var(--line); border-radius:6px; padding:12px 14px; }
    .doravo-landing .pf-stat .pf-label{ font-size:11.5px; opacity:0.55; margin-bottom:6px; }
    .doravo-landing .pf-stat .pf-bar-track{ height:6px; border-radius:3px; background:var(--paper-dim); overflow:hidden; }
    .doravo-landing .pf-stat .pf-bar-fill{ height:100%; background:var(--maroon); border-radius:3px; }
    .doravo-landing .pf-row{ display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
    .doravo-landing .pf-row:last-child{ border-bottom:none; }
    .doravo-landing .pf-avatar{ width:26px; height:26px; border-radius:50%; background:var(--paper-dim); flex:none; }
    .doravo-landing .pf-line{ height:8px; border-radius:2px; background:var(--paper-dim); flex:1; }
    .doravo-landing .pf-tag{ font-size:11px; padding:3px 9px; border-radius:999px; background:rgba(122,27,54,0.1); color:var(--maroon); font-weight:600; flex:none; }

    /* ---------- trust bar ---------- */
    .doravo-landing .trust-bar{ padding:34px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
    .doravo-landing .trust-bar .trust-label{ font-size:13px; opacity:0.6; margin-bottom:18px; text-align:center; }
    .doravo-landing .trust-items{ display:flex; justify-content:center; gap:0; flex-wrap:wrap; }
    .doravo-landing .trust-items span{ font-size:14px; font-weight:600; color:var(--maroon-ink); padding:6px 22px; border-left:1px solid var(--line); }
    .doravo-landing .trust-items span:first-child{ border-left:none; }
    @media (max-width:760px){ .doravo-landing .trust-items span{ border-left:none; padding:4px 14px; } }

    /* ---------- section shell ---------- */
    .doravo-landing section{ padding:72px 0; }
    .doravo-landing .sec-head{ max-width:640px; margin-bottom:44px; }
    .doravo-landing .sec-head.center{ margin-left:auto; margin-right:auto; text-align:center; }
    .doravo-landing .sec-head h2{ font-size:clamp(26px, 3vw, 34px); }
    .doravo-landing .sec-head p{ margin-top:14px; font-size:16px; opacity:0.82; }
    .doravo-landing .divider{ border:none; border-top:1px solid var(--line); margin:0; }

    /* ---------- problem / solution ---------- */
    .doravo-landing .ps-grid{ display:grid; grid-template-columns:1fr 1fr; gap:40px; }
    @media (max-width:800px){ .doravo-landing .ps-grid{ grid-template-columns:1fr; } }
    .doravo-landing .ps-card{ padding:30px 28px; border-radius:8px; }
    .doravo-landing .ps-card.problem{ background:var(--white); border:1px solid var(--line); }
    .doravo-landing .ps-card.solution{ background:var(--maroon); color:var(--white); }
    .doravo-landing .ps-card h3{ font-size:13px; text-transform:uppercase; letter-spacing:0.06em; font-family:'Manrope',sans-serif; font-weight:700; opacity:0.65; margin-bottom:16px; }
    .doravo-landing .ps-card.solution h3{ color:var(--white); }
    .doravo-landing .ps-card p{ font-size:15.5px; opacity:0.9; }
    .doravo-landing .ps-card.solution p{ opacity:0.92; }

    /* ---------- feature grid ---------- */
    .doravo-landing .feature-grid{ display:grid; grid-template-columns:repeat(4, 1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    @media (max-width:920px){ .doravo-landing .feature-grid{ grid-template-columns:repeat(2, 1fr); } }
    @media (max-width:560px){ .doravo-landing .feature-grid{ grid-template-columns:1fr; } }
    .doravo-landing .feature-card{ background:var(--white); padding:26px 24px; display:flex; flex-direction:column; gap:12px; transition:background 0.3s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .feature-card:hover{ background:var(--paper); }
    .doravo-landing .feature-card .fi{ width:34px; height:34px; border-radius:7px; background:rgba(122,27,54,0.08); display:flex; align-items:center; justify-content:center; }
    .doravo-landing .feature-card svg{ width:17px; height:17px; color:var(--maroon); }
    .doravo-landing .feature-card h4{ font-size:16px; }
    .doravo-landing .feature-card p{ font-size:13.5px; opacity:0.75; line-height:1.55; }

    /* ---------- product experience tabs ---------- */
    .doravo-landing .tabs-section{ background:var(--maroon-deep); color:var(--paper); }
    .doravo-landing .tabs-section .sec-head p{ color:var(--paper); opacity:0.78; }
    .doravo-landing .tabs-section h2{ color:var(--paper); }
    .doravo-landing .tabs-bar{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:30px; }
    .doravo-landing .tab-btn{
      background:transparent; border:1px solid var(--line-on-dark); color:var(--paper);
      padding:9px 18px; border-radius:999px; font-size:14px; cursor:pointer; opacity:0.72;
      transition:opacity 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s cubic-bezier(0.16,1,0.3,1), color 0.25s cubic-bezier(0.16,1,0.3,1);
    }
    .doravo-landing .tab-btn:hover{ opacity:1; }
    .doravo-landing .tab-btn.active{ background:var(--paper); color:var(--maroon-ink); opacity:1; border-color:var(--paper); font-weight:700; }
    .doravo-landing .tab-panel{ display:grid; grid-template-columns:0.95fr 1.05fr; gap:48px; align-items:center; }
    .doravo-landing .tab-fade{ animation:tab-fade-in 0.35s cubic-bezier(0.16,1,0.3,1); }
    @keyframes tab-fade-in{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
    @media (prefers-reduced-motion: reduce){ .doravo-landing .tab-fade{ animation:none; } }
    @media (max-width:860px){ .doravo-landing .tab-panel{ grid-template-columns:1fr; gap:32px; } }
    .doravo-landing .tab-copy h3{ color:var(--paper); font-size:22px; margin-bottom:12px; }
    .doravo-landing .tab-copy p{ font-size:15px; opacity:0.8; margin-bottom:18px; }
    .doravo-landing .tab-copy ul{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
    .doravo-landing .tab-copy li{ font-size:14.5px; opacity:0.85; padding-left:20px; position:relative; }
    .doravo-landing .tab-copy li::before{ content:""; position:absolute; left:0; top:8px; width:7px; height:7px; border-radius:50%; background:var(--brass); }
    .doravo-landing .tab-visual{ background:var(--paper); border-radius:8px; padding:22px; box-shadow:0 26px 50px -30px rgba(0,0,0,0.5); }
    .doravo-landing .tab-visual .pf-title{ opacity:0.6; }
    .doravo-landing .tab-visual img{ border-radius:6px; border:1px solid var(--line); }

    /* ---------- role-based value ---------- */
    .doravo-landing .role-grid{ display:grid; grid-template-columns:repeat(4, 1fr); gap:24px; }
    @media (max-width:920px){ .doravo-landing .role-grid{ grid-template-columns:repeat(2, 1fr); } }
    @media (max-width:560px){ .doravo-landing .role-grid{ grid-template-columns:1fr; } }
    .doravo-landing .role-card{ border:1px solid var(--line); border-radius:8px; padding:26px 22px; background:var(--white); transition:border-color 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .role-card:hover{ border-color:var(--maroon); transform:translateY(-2px); }
    .doravo-landing .role-card .role-tag{ font-size:12px; font-weight:700; color:var(--maroon); margin-bottom:12px; }
    .doravo-landing .role-card p{ font-size:14.5px; opacity:0.82; }

    /* ---------- built for your institution ---------- */
    .doravo-landing .institution-section{ display:grid; grid-template-columns:0.9fr 1.1fr; gap:60px; align-items:center; }
    @media (max-width:900px){ .doravo-landing .institution-section{ grid-template-columns:1fr; gap:40px; } }
    .doravo-landing .institution-copy p{ font-size:15.5px; opacity:0.85; margin-top:16px; }
    .doravo-landing .institution-copy p + p{ margin-top:12px; }
    .doravo-landing .mock{ background:var(--white); border:1px solid var(--line); border-radius:8px; padding:26px; box-shadow:0 26px 50px -30px rgba(42,10,21,0.35); }
    .doravo-landing .mock-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
    .doravo-landing .mock-head .tag{ font-size:12px; letter-spacing:0.03em; opacity:0.55; }
    .doravo-landing .mock-slot{ height:64px; border-radius:4px; background:repeating-linear-gradient(135deg, var(--paper-dim), var(--paper-dim) 8px, var(--paper) 8px, var(--paper) 16px); display:flex; align-items:center; justify-content:center; margin-bottom:16px; border:1px dashed var(--line); }
    .doravo-landing .mock-slot span{ font-size:12px; opacity:0.55; }
    .doravo-landing .mock-line{ height:9px; background:var(--paper-dim); border-radius:2px; margin-bottom:9px; }
    .doravo-landing .mock-line.w60{ width:60%; }
    .doravo-landing .mock-line.w80{ width:80%; }
    .doravo-landing .mock-line.w40{ width:40%; }
    .doravo-landing .mock-caption{ margin-top:18px; font-size:13px; opacity:0.6; text-align:center; }

    /* ---------- why doravo ---------- */
    .doravo-landing .why-list{ display:grid; grid-template-columns:1fr 1fr; gap:16px 40px; }
    @media (max-width:700px){ .doravo-landing .why-list{ grid-template-columns:1fr; } }
    .doravo-landing .why-item{ display:flex; gap:14px; align-items:flex-start; padding:16px 0; border-bottom:1px solid var(--line); }
    .doravo-landing .why-item svg{ width:15px; height:15px; color:var(--maroon); flex:none; margin-top:4px; }
    .doravo-landing .why-item p{ font-size:15px; opacity:0.85; }
    .doravo-landing .why-item strong{ display:block; color:var(--maroon-ink); font-size:15px; margin-bottom:2px; font-weight:700; }

    /* ---------- CTA ---------- */
    .doravo-landing .cta-band{ background:var(--maroon); color:var(--white); border-radius:8px; padding:56px 50px; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap; }
    .doravo-landing .cta-band h2{ color:var(--white); font-size:clamp(24px,3vw,32px); max-width:22ch; }
    .doravo-landing .cta-band p{ color:var(--paper); opacity:0.85; margin-top:10px; font-size:15px; max-width:40ch; }
    .doravo-landing .cta-band .cta-buttons{ display:flex; gap:12px; flex-wrap:wrap; }
    .doravo-landing .cta-band .btn-primary{ background:var(--white); color:var(--maroon); border-color:var(--white); }
    .doravo-landing .cta-band .btn-primary:hover{ background:var(--paper); }
    .doravo-landing .cta-band .btn-ghost{ border-color:var(--white); color:var(--white); }
    .doravo-landing .cta-band .btn-ghost:hover{ background:var(--white); color:var(--maroon); }

    /* ---------- footer ---------- */
    .doravo-landing footer{ border-top:1px solid var(--line); padding:50px 0 36px; }
    .doravo-landing .foot-grid{ display:flex; justify-content:space-between; gap:40px; flex-wrap:wrap; }
    .doravo-landing .foot-brand img{ height:28px; margin-bottom:14px; }
    .doravo-landing .foot-brand p{ font-size:13.5px; opacity:0.6; max-width:32ch; }
    .doravo-landing .foot-cols{ display:flex; gap:56px; flex-wrap:wrap; }
    .doravo-landing .foot-col h5{ font-size:12.5px; text-transform:uppercase; letter-spacing:0.06em; opacity:0.55; margin-bottom:14px; font-weight:700; font-family:'Manrope',sans-serif; }
    .doravo-landing .foot-col a{ display:block; text-decoration:none; font-size:14px; opacity:0.8; margin-bottom:10px; background:none; border:none; padding:0; cursor:pointer; text-align:left; }
    .doravo-landing .foot-col a:hover{ opacity:1; text-decoration:underline; }
    .doravo-landing .foot-bottom{ margin-top:42px; padding-top:22px; border-top:1px solid var(--line); font-size:13px; opacity:0.55; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  `;
  document.head.appendChild(el);
};

/* ---------------------------------------------------------
   SITE CONFIG
   Two values the audit flagged as unsafe to leave dynamic or
   placeholder-looking in production:

   - SITE_URL: canonical/OG URLs were previously built from
     window.location.href, which means the "canonical" identity
     of the page shifts depending on whatever hostname loaded
     it (a marketing domain, a tenant subdomain, a preview URL,
     localhost, etc). That's exactly the kind of thing that
     confuses search engines. Set this to the real production
     marketing domain before launch. Until then it falls back
     to window.location.origin so the page still works in dev/
     preview without crashing.
   - CONTACT_EMAIL: "hello@doravo.core" is not a real,
     registered domain — replace with the actual support/sales
     address once Doravo's official domain is finalized.
--------------------------------------------------------- */
const SITE_URL =
  typeof window !== "wwww.doravo.co.ke" ? window.location.origin : ""; // TODO: replace with e.g. "https://www.doravo.com" before launch
const CONTACT_EMAIL = "info@doravocore.co.ke"; // TODO: replace with a real, registered domain before launch

/* ---------------------------------------------------------
   SIGN IN DESTINATION
   This app is reachable at two production domains —
   www.doravocore.co.ke (the app itself: this landing page,
   /login, every dashboard) and www.doravo.co.ke (the company's
   shorter marketing-facing domain, which may also host a
   separate/duplicated copy of this same landing page). A
   visitor already on the app's own domain gets a same-app
   client-side <Link to="/login"> — no full reload needed. A
   visitor on any other host (the marketing domain, a preview
   URL, localhost) gets an absolute link straight to the real
   app's login page, so "Sign In" works correctly no matter
   which domain served this page.
--------------------------------------------------------- */
const APP_LOGIN_URL = "https://www.doravocore.co.ke/login";
const isOnAppDomain = () => {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "doravocore.co.ke" ||
    host === "www.doravocore.co.ke" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
};

/* Renders as an internal, client-side <Link> when this page is being
   served from the app's own domain, or a plain <a> pointing at the
   real app otherwise (e.g. when embedded on the marketing site). Takes
   the same props/children as the call sites below so it's a drop-in
   swap for the three places "Sign In" appears. */
const SignInLink = ({ className, onClick, children }) => {
  if (isOnAppDomain()) {
    return (
      <Link className={className} to="/login" onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a className={className} href={APP_LOGIN_URL} onClick={onClick}>
      {children}
    </a>
  );
};

/* ---------------------------------------------------------
   SEO: title, meta description, Open Graph / Twitter tags and
   JSON-LD structured data. Only known, real values are used —
   no ratings, review counts or user totals are fabricated.
--------------------------------------------------------- */
const PAGE_TITLE = "Doravo Core | School Management & Education Management Platform";
const PAGE_DESCRIPTION =
  "Doravo Core is an education management platform helping institutions manage students, staff, assessments, attendance and everyday school operations.";

const setMetaTag = (attr, key, content) => {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const injectSEO = () => {
  document.title = PAGE_TITLE;
  setMetaTag("name", "description", PAGE_DESCRIPTION);
  setMetaTag("property", "og:title", PAGE_TITLE);
  setMetaTag("property", "og:description", PAGE_DESCRIPTION);
  setMetaTag("property", "og:type", "website");
  setMetaTag("property", "og:image", `${SITE_URL}/assets/doravo-core-lockup.png`);
  setMetaTag("property", "og:url", SITE_URL);
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", PAGE_TITLE);
  setMetaTag("name", "twitter:description", PAGE_DESCRIPTION);
  setMetaTag("name", "twitter:image", `${SITE_URL}/assets/doravo-core-lockup.png`);

  // Note: this still runs client-side on mount, same as before. For a page
  // where SEO genuinely matters, the fundamental <title>/<meta description>/
  // <meta og:*> tags belong in the built index.html (or via server-side/
  // static rendering) so crawlers that don't execute JS still see them;
  // this effect can then update page-specific values on top of that base.
  // Left as-is here since that's a build-pipeline change, not a component one.
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", SITE_URL);

  if (!document.getElementById("landing-jsonld")) {
    const script = document.createElement("script");
    script.id = "landing-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Doravo",
          slogan: "Moving Education Forward",
          url: SITE_URL,
          logo: `${SITE_URL}/assets/doravo-core-lockup.png`,
        },
        {
          "@type": "SoftwareApplication",
          name: "Doravo Core",
          applicationCategory: "EducationApplication",
          operatingSystem: "Web",
          description: PAGE_DESCRIPTION,
        },
        {
          "@type": "WebSite",
          name: "Doravo Core",
          url: SITE_URL,
        },
      ],
    });
    document.head.appendChild(script);
  }
};

/* Restrained scroll-reveal: fades a handful of section headers
   in once, on first view. Respects prefers-reduced-motion via
   the CSS rule above, which is left as the single source of
   truth for whether motion happens at all. */
const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("in");
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return ref;
};

const FEATURES = [
  {
    title: "Student Management",
    desc: "Enrolment, class placement, academic history and everyday student records, kept in one place.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-4 3.1-6.5 7-6.5S19 16 19 20" /></svg>
    ),
  },
  {
    title: "Staff & Teacher Management",
    desc: "Organize staff records, teaching assignments and day-to-day administrative workflows.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.6-5.5 6-5.5s6 2.2 6 5.5M14 20c.3-2.6 1.9-4.3 4.3-4.3 1.6 0 2.9.8 3.7 2" /></svg>
    ),
  },
  {
    title: "Assessments & E-Exams",
    desc: "Create, sit and mark assessments online, including timed e-exams on dedicated exam devices.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 4h11l3 3v13H5z" /><path d="M9 9h7M9 13h7M9 17h4" /></svg>
    ),
  },
  {
    title: "Attendance",
    desc: "Daily registers taken by class or subject, rolling up into per-student and school-wide records.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M4 9h16M9 3v4M15 3v4" /></svg>
    ),
  },
  {
    title: "Fees",
    desc: "Billing, payments and balances tracked against your school's own fee structure and terms.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16v11H4z" /><path d="M4 10h16M8 14h3" /></svg>
    ),
  },
  {
    title: "Communication",
    desc: "Keep administrators, teachers, students and parents connected through centralized notifications.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v3M6 8c0-2 2.7-4 6-4s6 2 6 4c0 5 2 6 2 8H4c0-2 2-3 2-8z" /><path d="M10 19a2 2 0 004 0" /></svg>
    ),
  },
  {
    title: "Reports & Analytics",
    desc: "Turn day-to-day academic and operational activity into information you can act on.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M2 20h20" /></svg>
    ),
  },
  {
    title: "School Administration",
    desc: "Gate and visitor logs, kitchen and meal cards, leave-out requests and other everyday operations in one workspace.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7z" /></svg>
    ),
  },
];

const TABS = [
  {
    id: "students",
    label: "Students",
    title: "Every student record in one place",
    desc: "Enrolment, class placement and academic history stay together, and carry through to report cards and transcripts automatically.",
    bullets: ["Enrolment and class placement", "Academic history per student", "Report cards generated from live records"],
  },
  {
    id: "assessments",
    label: "Assessments",
    title: "Set, sit and mark assessments online",
    desc: "Run timed e-exams on dedicated exam devices alongside conventional coursework and marking.",
    bullets: ["Timed e-exams on exam devices", "Structured marking workflows", "Results tied back to student records"],
  },
  {
    id: "attendance",
    label: "Attendance",
    title: "Attendance, taken and rolled up automatically",
    desc: "Daily registers by class or subject roll up into attendance records without separate spreadsheets.",
    bullets: ["Class and subject-level registers", "Per-student attendance history", "No manual reconciliation"],
  },
  {
    id: "teachers",
    label: "Teachers",
    title: "A dashboard built around teaching, not admin",
    desc: "Teachers see their classes, assessments and attendance tools in one portal, branded to their own school.",
    bullets: ["Class and subject overview", "Assessment and marking tools", "School-branded portal"],
  },
  {
    id: "reports",
    label: "Reports",
    title: "Information you can act on",
    desc: "Notifications and reporting surface what's happening across the school, in real time, to the people who need it.",
    bullets: ["Real-time notifications", "School-level reporting", "Delivered only to your own dashboards"],
  },
  {
    id: "admin",
    label: "Administration",
    title: "The everyday operations of running a campus",
    desc: "Fees, gate and visitor logs, kitchen and meal cards, and leave-out requests, brought into one administrative workspace.",
    bullets: ["Fees and payment tracking", "Gate, visitor and meal-card logs", "Leave-out requests and approvals"],
  },
];

const ROLES = [
  { tag: "For Administrators", copy: "Keep school operations organized from one central platform, instead of stitched-together spreadsheets and processes." },
  { tag: "For Teachers", copy: "Spend less time on administrative processes and more time on teaching, with classes, assessments and attendance in one portal." },
  { tag: "For Students", copy: "Access academic information and everyday school services from a single portal built for them." },
  { tag: "For School Groups", copy: "Bring academic and administrative operations together across every campus, without losing each school's own identity." },
];

const WHY = [
  { title: "One connected platform", copy: "Students, staff, assessments, attendance and communication live in one place instead of several disconnected tools." },
  { title: "Centralized records", copy: "Information stays together and feeds report cards, transcripts and reporting without manual re-entry." },
  { title: "Role-based access", copy: "Administrators, teachers, students and parents each see a portal built around what they actually need to do." },
  { title: "Digital assessment capability", copy: "Assessments and timed e-exams run on the same platform as the records they update." },
  { title: "Your own branding", copy: "Your logo, colours and report cards look like yours — not shared with any other school on the platform." },
  { title: "Room to grow", copy: "Start with a single school and add campuses later without starting over on a new system." },
];

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
);

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  useEffect(() => {
    injectLandingStyles();
    injectSEO();
  }, []);

  const heroRef = useReveal();
  const problemRef = useReveal();
  const featuresRef = useReveal();
  const tabsRef = useReveal();
  const rolesRef = useReveal();
  const institutionRef = useReveal();
  const whyRef = useReveal();

  const activeTabData = TABS.find((t) => t.id === activeTab) || TABS[0];

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="doravo-landing">
      <header>
        <div className="wrap nav">
          <a className="brand" href="#top">
            <img src="/assets/doravo-icon.png" alt="Doravo mark" />
            <span>Doravo Core</span>
          </a>
          <nav className="navlinks">
            <a href="#platform">Platform</a>
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-right">
            <SignInLink className="navlogin">
              <span className="label-full">Sign In</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </SignInLink>
            <a className="navcta" href="#contact">Request a Demo</a>
            <button
              className="hamburger"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        <nav className={`mobile-menu wrap ${mobileOpen ? "open" : ""}`}>
          <a href="#platform" onClick={closeMobile}>Platform</a>
          <a href="#features" onClick={closeMobile}>Features</a>
          <a href="#solutions" onClick={closeMobile}>Solutions</a>
          <a href="#about" onClick={closeMobile}>About</a>
          <a href="#contact" onClick={closeMobile}>Contact</a>
          <div className="mobile-ctas">
            <SignInLink className="btn-ghost" onClick={closeMobile}>Sign In</SignInLink>
            <a className="btn-primary" href="#contact" onClick={closeMobile}>Request a Demo</a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* HERO
            Rewritten per audit: leads with the core value ("one
            connected platform") rather than opening on multi-campus
            positioning, so a single-school buyer doesn't read the
            product as being "for school groups". Multi-campus support
            is now a supporting line, not the headline framing. The
            founder-story hero-note has also been replaced with plain
            positioning copy. */}
        <section className="hero">
          <div className="wrap hero-grid" ref={heroRef}>
            <div>
              <p className="eyebrow">Education management, reimagined</p>
              <h1>One connected platform for running your school.</h1>
              <p className="lede">
                Doravo Core brings student management, staff, assessments, attendance,
                communication and everyday school operations together in one modern platform —
                for a single school today, and ready for more campuses whenever you need them.
              </p>
              <div className="hero-ctas">
                <a className="btn-primary" href="#contact">Request a Demo</a>
                <a className="btn-ghost" href="#platform">Explore the Platform</a>
              </div>
              <p className="hero-note">Built around the everyday work of running a modern school.</p>
            </div>
            {/* TODO (audit P0): replace this illustrative mockup with a real
                screenshot of the Doravo dashboard once one is available —
                a real screenshot reads as "an actual system" rather than
                a marketing illustration. Keeping the CSS mockup for now
                since no product screenshot was supplied to this component. */}
            <div className="product-frame" aria-hidden="true">
              <div className="pf-bar">
                <span className="pf-dot" /><span className="pf-dot" /><span className="pf-dot" />
                <span className="pf-title">Doravo Core — Overview</span>
              </div>
              <div className="pf-body">
                <div className="pf-stat-row">
                  <div className="pf-stat">
                    <div className="pf-label">Attendance today</div>
                    <div className="pf-bar-track"><div className="pf-bar-fill" style={{ width: "82%" }} /></div>
                  </div>
                  <div className="pf-stat">
                    <div className="pf-label">Assessments open</div>
                    <div className="pf-bar-track"><div className="pf-bar-fill" style={{ width: "48%" }} /></div>
                  </div>
                </div>
                <div className="pf-row"><span className="pf-avatar" /><span className="pf-line" style={{ maxWidth: "70%" }} /><span className="pf-tag">Graded</span></div>
                <div className="pf-row"><span className="pf-avatar" /><span className="pf-line" style={{ maxWidth: "55%" }} /><span className="pf-tag">Pending</span></div>
                <div className="pf-row"><span className="pf-avatar" /><span className="pf-line" style={{ maxWidth: "62%" }} /><span className="pf-tag">Enrolled</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="trust-bar" style={{ padding: "34px 0" }} id="platform">
          <div className="wrap">
            <p className="trust-label">Built for modern schools</p>
            <div className="trust-items">
              <span>Student Management</span>
              <span>Staff Management</span>
              <span>Assessments</span>
              <span>Attendance</span>
              <span>Communication</span>
              <span>Reports &amp; Analytics</span>
            </div>
          </div>
        </section>

        {/* PROBLEM / SOLUTION */}
        <section>
          <div className="wrap">
            <div className="sec-head reveal" ref={problemRef}>
              <h2>Running a school shouldn't feel fragmented.</h2>
              <p>
                Schools often manage students, staff, assessments, attendance and communication
                across disconnected processes. Doravo Core gives you one connected workspace for
                everyday academic and administrative operations.
              </p>
            </div>
            <div className="ps-grid">
              <div className="ps-card problem">
                <h3>Without a connected platform</h3>
                <p>
                  Records live in separate spreadsheets and tools, communication is scattered
                  across apps, and growing to a second campus means a second set of processes to
                  keep running.
                </p>
              </div>
              <div className="ps-card solution">
                <h3>With Doravo Core</h3>
                <p>
                  Students, staff, assessments, attendance and communication share one platform,
                  your school keeps its own identity, and adding a campus later doesn't mean
                  starting over.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* CORE FEATURES */}
        <section id="features">
          <div className="wrap">
            <div className="sec-head reveal" ref={featuresRef}>
              <h2>Everything your school needs, connected.</h2>
              <p>The modules you already rely on day to day, available from one platform.</p>
            </div>
            {/* TODO (audit P1): once real product screenshots exist, consider
                swapping some or all of these icon+text cards for a smaller
                number of larger visual blocks (screenshot + short caption)
                for a couple of headline features — that reads as more premium
                than an eight-card icon grid. Left as an icon grid for now
                since it's honest about not having screenshots to show yet,
                and eight genuinely distinct modules is a reasonable amount
                of information to scan this way. */}
            <div className="feature-grid">
              {FEATURES.map((f) => (
                <div className="feature-card" key={f.title}>
                  <div className="fi">{f.icon}</div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT EXPERIENCE TABS */}
        <section className="tabs-section" id="solutions">
          <div className="wrap">
            <div className="sec-head reveal" ref={tabsRef}>
              <h2>Designed around the way your school works.</h2>
              <p>One platform, built around the roles and routines that already run a school.</p>
            </div>
            <div className="tabs-bar" role="tablist" aria-label="Doravo Core product areas">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="tab-panel tab-fade" role="tabpanel" key={activeTab}>
              <div className="tab-copy">
                <h3>{activeTabData.title}</h3>
                <p>{activeTabData.desc}</p>
                <ul>
                  {activeTabData.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              {/* TODO (audit P0): this is the single highest-impact visual
                  swap the audit identified — replace this per-tab placeholder
                  with an actual screenshot of that area of Doravo (e.g.
                  activeTabData.screenshotUrl rendered as an <img>). Structured
                  so that once screenshots exist, only this block needs to
                  change; the tab logic/state above doesn't need to move. */}
              <div className="tab-visual">
                <div className="pf-bar" style={{ background: "transparent", border: "none", padding: "0 0 14px" }}>
                  <span className="pf-title" style={{ fontSize: 12 }}>{activeTabData.label} — preview</span>
                </div>
                <div className="mock-line w80" />
                <div className="mock-line w60" />
                <div className="mock-line w40" />
                <div className="mock-slot" style={{ marginTop: 14 }}>
                  <span>{activeTabData.label} workspace</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROLE-BASED VALUE */}
        <section>
          <div className="wrap">
            <div className="sec-head reveal" ref={rolesRef}>
              <h2>Built for everyone at your school.</h2>
              <p>The same platform, presented around what each person actually needs to do.</p>
            </div>
            <div className="role-grid">
              {ROLES.map((r) => (
                <div className="role-card" key={r.tag}>
                  <div className="role-tag">{r.tag}</div>
                  <p>{r.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* YOUR SCHOOL, YOUR IDENTITY
            Rewritten per audit: previously led with implementation
            details ("a login at one institution has no reach into
            another institution's records") that read as architecture
            explanation rather than a customer benefit. Multi-tenancy
            is kept, but framed as "what this means for you" instead
            of "how this is built". */}
        <section id="about">
          <div className="wrap institution-section reveal" ref={institutionRef}>
            <div className="institution-copy">
              <h2>Your school. Your own space.</h2>
              <p>
                Your logo, colours and report cards appear across your login screen, portals and
                printed documents — so Doravo Core looks and feels like your school, not a
                generic system.
              </p>
              <p>
                If you're part of a school group, each campus gets its own dedicated workspace
                and keeps its own identity, while still running on one platform underneath.
              </p>
            </div>
            <div className="mock">
              <div className="mock-head">
                <img src="/assets/doravo-icon.png" alt="" style={{ height: 24 }} />
                <span className="tag">Login — [Your school name]</span>
              </div>
              <div className="mock-slot"><span>Your logo &amp; colours</span></div>
              <div className="mock-line w60"></div>
              <div className="mock-line w80"></div>
              <div className="mock-line w40"></div>
              <p className="mock-caption">The same layout, your school's own look.</p>
            </div>
          </div>
        </section>

        {/* WHY DORAVO */}
        <section>
          <div className="wrap">
            <div className="sec-head reveal" ref={whyRef}>
              <h2>Built for connected education management.</h2>
              <p>What that means in practice, not just in principle.</p>
            </div>
            <div className="why-list">
              {WHY.map((w) => (
                <div className="why-item" key={w.title}>
                  <CheckIcon />
                  <p><strong>{w.title}</strong>{w.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="contact">
          <div className="wrap">
            <div className="cta-band">
              <div>
                <h2>Ready to move education forward?</h2>
                <p>See how Doravo Core can bring your school's academic and administrative operations together.</p>
              </div>
              <div className="cta-buttons">
                <a className="btn-primary" href={`mailto:${CONTACT_EMAIL}`}>Request a Demo</a>
                <a className="btn-ghost" href={`mailto:${CONTACT_EMAIL}`}>Contact Doravo</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <img src="/assets/doravo-core-lockup.png" alt="Doravo Core" style={{ height: 44, width: "auto" }} />
              <p>Education management software for schools — built so each one keeps its own identity, with room to add campuses later.</p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h5>Platform</h5>
                <a href="#platform">Why Doravo Core</a>
                <a href="#features">Features</a>
                <a href="#solutions">Solutions</a>
              </div>
              <div className="foot-col">
                <h5>Company</h5>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
              </div>
              <div className="foot-col">
                <h5>Account</h5>
                <SignInLink>Sign In</SignInLink>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>&copy; 2026 Doravo. All rights reserved.</span>
            <span>Moving Education Forward</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   NOTES FOR NEXT STEPS (not implemented here, by design):

   - Privacy Policy / Terms of Service: no routes exist for
     these yet, so no footer links were added rather than
     pointing at pages that don't exist. Add a Privacy/Terms
     route and link it from the "Company" footer column once
     that content exists.
   - robots.txt / sitemap.xml: added as sibling files in this
     delivery (robots.txt, sitemap.xml) — these are static files
     served from the app root, not React components, so they
     live alongside this file rather than inside Landing.jsx.
     Both use SITE_URL's placeholder domain; update the domain
     in sitemap.xml once the production domain is finalized.
   - SITE_URL / CONTACT_EMAIL: see the SITE CONFIG block above —
     both are placeholders (window.location.origin and
     hello@doravo.core) that need real values before launch.
   - Real screenshots: the hero visual and the per-tab preview
     panel are still illustrative mockups (see inline TODOs at
     each), since no actual product screenshots were supplied.
     These are the two highest-impact visual swaps once
     screenshots are available.
   - Typography: kept Fraunces + Manrope rather than switching to
     a single sans-serif family. A serif display face isn't
     inherently less "SaaS" — it reads as more institutional/
     editorial, which can suit a product sold to school
     administrators rather than working against it. Worth a
     second look once real screenshots are in place and you can
     judge the whole page together, but not changed unilaterally
     here since it's a bigger brand decision than a copy/structure
     fix.
   - No customer counts, testimonials, logos or ratings are
     included, since none were supplied to report honestly.
     The JSON-LD block intentionally omits aggregateRating for
     the same reason.
========================================================= */
