import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChatAssistant, { WaIcon } from "../components/ChatAssistant";
import { SITE, waLink } from "../config/site";
import Preview from "../components/LandingPreviews";

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
      --paper:#FAF8F4;
      --paper-dim:#EFE9DC;
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
    .doravo-landing .wrap{ width:100%; max-width:1280px; margin:0 auto; padding:0 clamp(20px, 4vw, 56px); }
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

    /* ---------- WhatsApp buttons (primary demo action) ---------- */
    .doravo-landing .btn-wa{ display:inline-flex; align-items:center; gap:9px; background:#25D366; color:#06260F; border:1px solid #25D366; text-decoration:none; padding:13px 24px; border-radius:3px; font-weight:700; font-size:15px; transition:transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s; box-shadow:0 10px 26px -12px rgba(37,211,102,0.7); }
    .doravo-landing .btn-wa:hover{ background:#1fbd5a; border-color:#1fbd5a; transform:translateY(-2px); }
    .doravo-landing .btn-wa.pulse{ animation:dvPulse 2.6s 3 1.2s; }
    .doravo-landing .navcta.wa{ display:inline-flex; align-items:center; gap:7px; background:#25D366; color:#06260F; }
    .doravo-landing .navcta.wa:hover{ background:#1fbd5a; }
    @keyframes dvPulse{ 0%{ box-shadow:0 0 0 0 rgba(37,211,102,0.5); } 70%{ box-shadow:0 0 0 16px rgba(37,211,102,0); } 100%{ box-shadow:0 0 0 0 rgba(37,211,102,0); } }
    .doravo-landing .cta-band .btn-wa{ background:#25D366; color:#06260F; border-color:#25D366; }
    .doravo-landing .cta-band .cta-alt{ margin-top:0; font-size:13.5px; color:var(--paper); opacity:0.85; flex-basis:100%; max-width:none; }
    .doravo-landing .cta-band .cta-alt a{ color:var(--white); }
    .doravo-landing .hero-contact{ margin-top:16px; font-size:13.5px; opacity:0.7; }
    .doravo-landing .hero-contact a{ color:var(--maroon); font-weight:600; }

    /* ---------- hero motion ---------- */
    .doravo-landing .hero{ position:relative; overflow:hidden; }
    .doravo-landing .product-frame{ transition:transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.5s cubic-bezier(0.16,1,0.3,1);  }
    .doravo-landing .feature-card{ transition:background 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .feature-card:hover{ transform:translateY(-3px); }
    @media (prefers-reduced-motion: reduce){
      .doravo-landing .btn-wa.pulse{ animation:none; }
    }

    /* ---------- how it works ---------- */
    .doravo-landing .how-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
    @media (max-width:800px){ .doravo-landing .how-grid{ grid-template-columns:1fr; } }
    .doravo-landing .how-card{ background:var(--white); border:1px solid var(--line); border-radius:8px; padding:28px 24px; transition:transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s; }
    .doravo-landing .how-card:hover{ transform:translateY(-3px); border-color:var(--maroon); }
    .doravo-landing .how-num{ width:38px; height:38px; border-radius:50%; background:var(--maroon); color:var(--white); display:flex; align-items:center; justify-content:center; font-weight:700; margin-bottom:14px; }
    .doravo-landing .how-card h4{ font-size:17px; margin-bottom:6px; }
    .doravo-landing .how-card p{ font-size:14.5px; opacity:0.8; }

    /* ---------- FAQ ---------- */
    .doravo-landing .faq-list{ max-width:820px; margin:0 auto; }
    .doravo-landing .faq-item{ border-bottom:1px solid var(--line); }
    .doravo-landing .faq-q{ width:100%; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:20px 0; background:none; border:none; cursor:pointer; text-align:left; font-family:'Fraunces', serif; font-size:18px; color:var(--maroon-ink); }
    .doravo-landing .faq-q span{ font-family:'Manrope',sans-serif; font-size:22px; color:var(--maroon); transition:transform 0.25s; }
    .doravo-landing .faq-item.open .faq-q span{ transform:rotate(45deg); }
    .doravo-landing .faq-a{ overflow:hidden; max-height:0; transition:max-height 0.35s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .faq-item.open .faq-a{ max-height:300px; }
    .doravo-landing .faq-a p{ padding:0 0 20px; font-size:15.5px; opacity:0.85; max-width:70ch; }

    /* ---------- floating WhatsApp + chat assistant ---------- */
    .doravo-landing .dv-wa-float{ position:fixed; left:18px; bottom:18px; z-index:60; width:56px; height:56px; border-radius:50%; background:#25D366; color:#06260F; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px rgba(37,211,102,0.5); transition:transform 0.25s; }
    .doravo-landing .dv-wa-float:hover{ transform:scale(1.07); }
    .doravo-landing .dv-wa-float svg{ width:28px; height:28px; }
    .doravo-landing .dv-chat-fab{ position:fixed; right:18px; bottom:18px; z-index:60; width:56px; height:56px; border-radius:50%; border:none; cursor:pointer; background:var(--maroon); color:var(--white); font-size:28px; line-height:1; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px rgba(122,27,54,0.45); transition:transform 0.25s, background 0.25s; }
    .doravo-landing .dv-chat-fab:hover{ background:var(--maroon-deep); transform:scale(1.07); }
    .doravo-landing .dv-chat{ position:fixed; right:18px; bottom:86px; z-index:61; width:min(370px, calc(100vw - 36px)); height:min(520px, calc(100vh - 120px)); display:flex; flex-direction:column; background:var(--white); border:1px solid var(--line); border-radius:12px; overflow:hidden; box-shadow:0 26px 60px -20px rgba(42,10,21,0.45); animation:dvChatIn 0.3s cubic-bezier(0.16,1,0.3,1); }
    @keyframes dvChatIn{ from{ opacity:0; transform:translateY(12px) scale(0.98); } to{ opacity:1; transform:none; } }
    .doravo-landing .dv-chat-head{ display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:var(--maroon); color:var(--white); font-family:'Fraunces',serif; }
    .doravo-landing .dv-chat-head button{ background:none; border:none; color:var(--white); font-size:24px; cursor:pointer; line-height:1; }
    .doravo-landing .dv-chat-body{ flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:var(--paper); }
    .doravo-landing .dv-msg{ max-width:86%; padding:10px 13px; border-radius:10px; font-size:14px; line-height:1.5; }
    .doravo-landing .dv-msg.bot{ background:var(--white); border:1px solid var(--line); align-self:flex-start; }
    .doravo-landing .dv-msg.me{ background:var(--maroon); color:var(--white); align-self:flex-end; }
    .doravo-landing .dv-chips{ display:flex; flex-wrap:wrap; gap:8px; }
    .doravo-landing .dv-chips button{ background:var(--white); border:1px solid var(--maroon); color:var(--maroon); border-radius:999px; padding:6px 12px; font-size:12.5px; font-weight:600; cursor:pointer; transition:background 0.2s, color 0.2s; }
    .doravo-landing .dv-chips button:hover{ background:var(--maroon); color:var(--white); }
    .doravo-landing .dv-chat-wa{ display:flex; align-items:center; justify-content:center; gap:8px; padding:11px; background:#25D366; color:#06260F; font-weight:700; font-size:13.5px; text-decoration:none; }
    .doravo-landing .dv-chat-input{ display:flex; gap:8px; padding:10px; border-top:1px solid var(--line); background:var(--white); }
    .doravo-landing .dv-chat-input input{ flex:1; padding:10px 12px; border:1px solid var(--line); border-radius:6px; font:inherit; font-size:14px; background:var(--white); color:var(--ink); }
    .doravo-landing .dv-chat-input button{ padding:0 16px; border:none; border-radius:6px; background:var(--maroon); color:var(--white); font-weight:600; cursor:pointer; }
    @media (max-width:560px){ .doravo-landing .dv-chat{ right:10px; bottom:80px; width:calc(100vw - 20px); } }

    /* ---------- polish: white + maroon + gold, subtle motion ---------- */
    .doravo-landing .eyebrow{ color:var(--brass); text-transform:uppercase; letter-spacing:0.12em; font-size:12px; display:flex; align-items:center; gap:10px; }
    .doravo-landing .eyebrow::before{ content:""; width:26px; height:1px; background:var(--brass); }
    .doravo-landing .sec-head h2::before{ content:""; display:block; width:34px; height:2px; background:var(--brass); margin-bottom:16px; }
    .doravo-landing .sec-head.center h2::before{ margin-left:auto; margin-right:auto; }
    .doravo-landing .tabs-section .sec-head h2::before, .doravo-landing .spot .sec-head h2::before{ background:var(--brass); }
    .doravo-landing .hero{ background:linear-gradient(180deg, var(--white) 0%, var(--paper) 100%); }
    .doravo-landing header{ background:rgba(255,255,255,0.94) !important; }
    .doravo-landing .hero-visual{ min-width:0; }
    .doravo-landing .hero h1 em{ font-style:normal; color:var(--maroon); }
    .doravo-landing .trust-items span{ font-weight:600; }
    @media (max-width:900px){ .doravo-landing .brand span{ display:none; } }
    @media (max-width:560px){ .doravo-landing .navlogin .label-full{ display:inline !important; } .doravo-landing .navcta.wa{ padding:9px 12px; } }

    .doravo-landing [data-rv]{ opacity:0; transform:translateY(18px); transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing [data-rv].rv-in{ opacity:1; transform:none; }
    @media (prefers-reduced-motion: reduce){ .doravo-landing [data-rv]{ opacity:1; transform:none; transition:none; } }

    .doravo-landing .feature-card{ position:relative; }
    .doravo-landing .feature-card::after{ content:""; position:absolute; left:0; top:0; height:2px; width:0; background:var(--brass); transition:width 0.4s cubic-bezier(0.16,1,0.3,1); }
    .doravo-landing .feature-card:hover::after{ width:100%; }
    .doravo-landing .feature-card .fprob{ font-size:12px; font-weight:700; letter-spacing:0.02em; color:var(--brass); opacity:1; line-height:1.4; }

    .doravo-landing .tab-visual{ background:none; padding:0; box-shadow:none; min-width:0; }
    .doravo-landing .tabs-section .pv-cap, .doravo-landing .spot .pv-cap{ color:var(--paper); opacity:0.7; }
    .doravo-landing .tab-btn{ position:relative; overflow:hidden; }
    .doravo-landing .tab-btn.active.auto::after{ content:""; position:absolute; left:0; bottom:0; height:2px; width:100%; background:var(--brass); transform-origin:left; animation:dvTabBar 8s linear both; }
    @keyframes dvTabBar{ from{ transform:scaleX(0); } to{ transform:scaleX(1); } }
    @media (prefers-reduced-motion: reduce){ .doravo-landing .tab-btn.active.auto::after{ animation:none; transform:scaleX(1); } }

    /* e-assessment spotlight */
    .doravo-landing .spot{ background:var(--white); border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
    .doravo-landing .spot-grid{ display:grid; grid-template-columns:0.95fr 1.05fr; gap:56px; align-items:start; }
    @media (max-width:920px){ .doravo-landing .spot-grid{ grid-template-columns:1fr; gap:36px; } }
    .doravo-landing .spot-steps{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
    .doravo-landing .spot-step{ display:flex; gap:16px; padding:18px 0; border-top:1px solid var(--line); }
    .doravo-landing .spot-step:first-child{ border-top:none; padding-top:0; }
    .doravo-landing .spot-n{ flex:none; width:30px; height:30px; border-radius:50%; border:1px solid var(--brass); color:var(--brass); font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; transition:background 0.3s, color 0.3s; }
    .doravo-landing .spot-step:hover .spot-n{ background:var(--brass); color:var(--white); }
    .doravo-landing .spot-step h4{ font-size:17px; margin-bottom:3px; color:var(--maroon-ink); }
    .doravo-landing .spot-step p{ font-size:14.5px; opacity:0.8; }
    .doravo-landing .spot-switch{ display:inline-flex; border:1px solid var(--line); border-radius:999px; padding:3px; margin-bottom:16px; background:var(--paper); }
    .doravo-landing .spot-switch button{ border:none; background:none; padding:7px 16px; border-radius:999px; font-weight:600; font-size:13px; cursor:pointer; color:var(--ink); transition:background 0.25s, color 0.25s; }
    .doravo-landing .spot-switch button.on{ background:var(--maroon); color:var(--white); }
    .doravo-landing .spot-visual{ position:sticky; top:96px; min-width:0; }
    .doravo-landing .spot .pv-cap{ color:var(--ink); opacity:0.58; }

    /* role + trust cards */
    .doravo-landing .role-grid{ grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); }
    .doravo-landing .role-card .role-tag{ color:var(--brass); letter-spacing:0.04em; text-transform:uppercase; }
    .doravo-landing .trust-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:20px; }
    .doravo-landing .trust-card{ background:var(--white); border:1px solid var(--line); border-top:2px solid var(--maroon); border-radius:6px; padding:24px 22px; }
    .doravo-landing .trust-card h4{ font-size:16px; margin-bottom:6px; }
    .doravo-landing .trust-card p{ font-size:14px; opacity:0.8; }
    .doravo-landing .trust-note{ margin-top:22px; font-size:13.5px; opacity:0.65; max-width:70ch; }
    .doravo-landing .how-num{ background:var(--white); color:var(--maroon); border:1px solid var(--brass); }
    .doravo-landing .how-card:hover .how-num{ background:var(--brass); color:var(--white); }
    .doravo-landing .how-card{ border-radius:6px; }
    .doravo-landing .why-item svg{ color:var(--brass); }

    /* ---------- responsive layout + more readable typography ---------- */
    .doravo-landing{ font-size:17px; }
    .doravo-landing .wrap{ width:100%; max-width:1480px; padding-left:clamp(24px,4.2vw,76px); padding-right:clamp(24px,4.2vw,76px); }
    .doravo-landing section{ padding-top:clamp(76px,6vw,100px); padding-bottom:clamp(76px,6vw,100px); }
    .doravo-landing .hero{ padding-top:clamp(76px,7vw,112px); padding-bottom:clamp(68px,6vw,96px); }
    .doravo-landing .hero-grid{ grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr); gap:clamp(44px,5vw,88px); }
    .doravo-landing .hero h1{ font-size:clamp(44px,4.1vw,68px); line-height:1.08; max-width:17ch; }
    .doravo-landing .hero .lede{ font-size:clamp(18px,1.25vw,21px); line-height:1.75; max-width:52ch; }
    .doravo-landing .eyebrow{ font-size:14px; }
    .doravo-landing .hero-note,.doravo-landing .hero-contact{ font-size:15px; }
    .doravo-landing .btn-primary,.doravo-landing .btn-ghost,.doravo-landing .btn-wa{ font-size:16px; padding:15px 25px; }
    .doravo-landing .navlinks{ gap:clamp(18px,2vw,32px); }
    .doravo-landing .navlinks a,.doravo-landing .navlogin{ font-size:15.5px; }
    .doravo-landing .navcta{ font-size:15px; padding:12px 20px; }
    .doravo-landing .brand img{ height:38px; }
    .doravo-landing .brand span{ font-size:22px; }
    .doravo-landing .sec-head{ max-width:780px; margin-bottom:clamp(36px,4vw,54px); }
    .doravo-landing .sec-head h2{ font-size:clamp(34px,3.1vw,48px); line-height:1.15; }
    .doravo-landing .sec-head p{ font-size:clamp(17px,1.15vw,19px); line-height:1.75; }
    .doravo-landing .ps-grid{ gap:clamp(24px,3vw,44px); }
    .doravo-landing .ps-card{ padding:clamp(28px,2.5vw,40px); }
    .doravo-landing .ps-card h3{ font-size:15px; }
    .doravo-landing .ps-card p,.doravo-landing .institution-copy p{ font-size:17px; line-height:1.8; }
    .doravo-landing .feature-grid{ grid-template-columns:repeat(4,minmax(0,1fr)); }
    .doravo-landing .feature-card{ padding:clamp(24px,2vw,34px); gap:15px; }
    .doravo-landing .feature-card h4,.doravo-landing .trust-card h4{ font-size:19px; line-height:1.35; }
    .doravo-landing .feature-card p{ font-size:15.5px; line-height:1.7; }
    .doravo-landing .feature-card .fprob{ font-size:14px; }
    .doravo-landing .trust-items span{ font-size:16px; padding:8px 24px; }
    .doravo-landing .tab-btn{ font-size:15.5px; padding:11px 20px; }
    .doravo-landing .tab-copy h3{ font-size:clamp(26px,2.2vw,34px); line-height:1.25; }
    .doravo-landing .tab-copy p{ font-size:17px; line-height:1.8; }
    .doravo-landing .tab-copy li{ font-size:16px; line-height:1.65; }
    .doravo-landing .role-grid{ grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:22px; }
    .doravo-landing .role-card{ padding:30px 26px; }
    .doravo-landing .role-card .role-tag{ font-size:13px; }
    .doravo-landing .role-card p,.doravo-landing .trust-card p{ font-size:16px; line-height:1.75; }
    .doravo-landing .spot-grid{ grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr); gap:clamp(34px,4.5vw,72px); align-items:start; }
    /* Keep the product preview in normal document flow so it cannot sit over
       the middle of the page while the visitor scrolls. */
    .doravo-landing .spot-visual{ position:relative; top:auto; min-width:0; }
    .doravo-landing .spot-step{ gap:18px; padding:22px 0; }
    .doravo-landing .spot-step h4,.doravo-landing .how-card h4{ font-size:19px; line-height:1.4; }
    .doravo-landing .spot-step p,.doravo-landing .how-card p,.doravo-landing .why-item p{ font-size:16px; line-height:1.75; }
    .doravo-landing .spot-n{ width:36px; height:36px; font-size:15px; }
    .doravo-landing .institution-section{ gap:clamp(36px,5vw,80px); }
    .doravo-landing .mock{ padding:clamp(24px,2.5vw,38px); }
    .doravo-landing .mock-caption,.doravo-landing .trust-note{ font-size:15px; line-height:1.7; }
    .doravo-landing .trust-grid{ grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:22px; }
    .doravo-landing .trust-card{ padding:28px; }
    .doravo-landing .how-grid{ gap:26px; }
    .doravo-landing .how-card{ padding:32px 28px; }
    .doravo-landing .faq-q{ font-size:21px; line-height:1.5; }
    .doravo-landing .faq-a p{ font-size:17px; line-height:1.8; }
    .doravo-landing .cta-band{ padding:clamp(36px,4vw,64px); gap:28px; }
    .doravo-landing .cta-band h2{ font-size:clamp(32px,3vw,44px); }
    .doravo-landing .cta-band p{ font-size:17px; line-height:1.75; }
    .doravo-landing .cta-band .cta-alt{ font-size:15px; }
    .doravo-landing .foot-brand p,.doravo-landing .foot-col a{ font-size:15px; line-height:1.7; }
    .doravo-landing .foot-col h5{ font-size:14px; }
    .doravo-landing .foot-bottom{ font-size:14px; }

    @media (max-width:1100px){
      .doravo-landing .wrap{ padding-left:28px; padding-right:28px; }
      .doravo-landing .hero-grid{ gap:36px; }
      .doravo-landing .hero h1{ font-size:clamp(40px,5vw,54px); }
      .doravo-landing .feature-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
      .doravo-landing .navlinks{ gap:16px; }
      .doravo-landing .navlinks a{ font-size:14px; }
    }
    @media (max-width:860px){
      .doravo-landing .wrap{ padding-left:24px; padding-right:24px; }
      .doravo-landing .hero-grid,.doravo-landing .spot-grid,.doravo-landing .institution-section{ grid-template-columns:minmax(0,1fr); }
      .doravo-landing .hero-grid{ gap:42px; }
      .doravo-landing .hero h1{ max-width:19ch; }
      .doravo-landing .spot-grid{ gap:34px; }
      .doravo-landing .spot-visual{ width:100%; }
      .doravo-landing .role-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
      .doravo-landing .cta-band{ align-items:flex-start; flex-direction:column; }
      .doravo-landing .foot-cols{ gap:32px; }
    }
    @media (max-width:560px){
      .doravo-landing{ font-size:16px; }
      .doravo-landing .wrap{ padding-left:18px; padding-right:18px; }
      .doravo-landing section{ padding-top:58px; padding-bottom:58px; }
      .doravo-landing .hero{ padding-top:54px; padding-bottom:52px; }
      .doravo-landing .hero h1{ font-size:clamp(36px,10vw,46px); }
      .doravo-landing .hero .lede{ font-size:17px; }
      .doravo-landing .hero-ctas,.doravo-landing .cta-band .cta-buttons{ width:100%; }
      .doravo-landing .hero-ctas > a,.doravo-landing .cta-band .cta-buttons > a{ width:100%; justify-content:center; text-align:center; }
      .doravo-landing .feature-grid,.doravo-landing .role-grid,.doravo-landing .how-grid{ grid-template-columns:minmax(0,1fr); }
      .doravo-landing .sec-head h2{ font-size:clamp(30px,8vw,38px); }
      .doravo-landing .sec-head p{ font-size:16px; }
      .doravo-landing .trust-items span{ font-size:14px; padding:5px 10px; }
      .doravo-landing .ps-card{ padding:24px 20px; }
      .doravo-landing .spot-switch{ max-width:100%; }
      .doravo-landing .spot-switch button{ padding:8px 12px; font-size:12.5px; }
      .doravo-landing .cta-band{ padding:28px 22px; }
      .doravo-landing .foot-grid,.doravo-landing .foot-cols{ flex-direction:column; gap:28px; }
      .doravo-landing .foot-bottom{ flex-direction:column; }
      .doravo-landing .dv-wa-float{ left:12px; bottom:12px; width:50px; height:50px; }
      .doravo-landing .dv-chat-fab{ right:12px; bottom:12px; width:50px; height:50px; }
    }

    /* ---------- laptops / desktops: wider layout, no more narrow centre column ---------- */
    @media (min-width:1280px){
      .doravo-landing .wrap{ max-width:1480px; padding:0 clamp(40px, 4vw, 80px); }
      .doravo-landing{ font-size:18px; }
      .doravo-landing section{ padding:96px 0; }
      .doravo-landing .hero{ padding:112px 0 88px; }
      .doravo-landing .hero-grid{ gap:84px; }
      .doravo-landing .hero h1{ font-size:clamp(52px, 4.4vw, 68px); }
      .doravo-landing .hero .lede{ font-size:21px; }
      .doravo-landing .sec-head{ max-width:820px; margin-bottom:56px; }
      .doravo-landing .sec-head h2{ font-size:clamp(38px, 3.2vw, 48px); }
      .doravo-landing .sec-head p{ font-size:20px; }
      .doravo-landing .navlinks a{ font-size:17px; }
      .doravo-landing .nav{ padding:18px 0; }
      .doravo-landing .btn-primary, .doravo-landing .btn-ghost, .doravo-landing .btn-wa{ font-size:17.5px; padding:17px 32px; }
      .doravo-landing .ps-card{ padding:40px 38px; }
      .doravo-landing .ps-card p{ font-size:19px; }
      .doravo-landing .feature-card{ padding:36px 30px; }
      .doravo-landing .feature-card h4{ font-size:21px; }
      .doravo-landing .feature-card p{ font-size:16.5px; }
      .doravo-landing .tab-copy h3{ font-size:32px; }
      .doravo-landing .tab-copy p{ font-size:19px; }
      .doravo-landing .tab-copy li{ font-size:17.5px; }
      .doravo-landing .tab-panel, .doravo-landing .spot-grid, .doravo-landing .institution-section{ gap:72px; }
      .doravo-landing .role-card p{ font-size:17.5px; }
      .doravo-landing .spot-step h4, .doravo-landing .how-card h4{ font-size:22px; }
      .doravo-landing .spot-step p, .doravo-landing .how-card p{ font-size:17.5px; }
      .doravo-landing .trust-card h4{ font-size:21px; }
      .doravo-landing .trust-card p{ font-size:17px; }
      .doravo-landing .institution-copy p{ font-size:19.5px; }
      .doravo-landing .faq-list{ max-width:980px; }
      .doravo-landing .faq-q{ font-size:22px; padding:24px 0; }
      .doravo-landing .faq-a p{ font-size:18.5px; }
      .doravo-landing .cta-band{ padding:72px 72px; }
      .doravo-landing .cta-band p{ font-size:19px; }
      .doravo-landing .foot-col a{ font-size:16px; }
    }

    /* ---------- large monitors / TVs ---------- */
    @media (min-width:1700px){
      .doravo-landing .wrap{ max-width:1760px; }
      .doravo-landing{ font-size:20px; }
      .doravo-landing section{ padding:120px 0; }
      .doravo-landing .hero{ padding:136px 0 104px; }
      .doravo-landing .hero h1{ font-size:clamp(64px, 4vw, 80px); }
      .doravo-landing .hero .lede{ font-size:24px; }
      .doravo-landing .sec-head{ max-width:940px; }
      .doravo-landing .sec-head h2{ font-size:clamp(46px, 2.8vw, 56px); }
      .doravo-landing .sec-head p{ font-size:22px; }
      .doravo-landing .brand span{ font-size:24px; }
      .doravo-landing .brand img{ height:42px; }
      .doravo-landing .navlinks a{ font-size:18.5px; }
      .doravo-landing .navcta, .doravo-landing .navlogin{ font-size:17px; }
      .doravo-landing .btn-primary, .doravo-landing .btn-ghost, .doravo-landing .btn-wa{ font-size:19px; padding:19px 36px; }
      .doravo-landing .ps-card p{ font-size:21px; }
      .doravo-landing .feature-card h4{ font-size:23px; }
      .doravo-landing .feature-card p{ font-size:18px; }
      .doravo-landing .feature-card .fprob{ font-size:15px; }
      .doravo-landing .tab-btn{ font-size:17.5px; }
      .doravo-landing .tab-copy h3{ font-size:36px; }
      .doravo-landing .tab-copy p{ font-size:21px; }
      .doravo-landing .tab-copy li{ font-size:19px; }
      .doravo-landing .role-card p{ font-size:19px; }
      .doravo-landing .spot-step h4, .doravo-landing .how-card h4, .doravo-landing .trust-card h4{ font-size:24px; }
      .doravo-landing .spot-step p, .doravo-landing .how-card p, .doravo-landing .trust-card p{ font-size:19px; }
      .doravo-landing .institution-copy p{ font-size:21px; }
      .doravo-landing .faq-list{ max-width:1100px; }
      .doravo-landing .faq-q{ font-size:24px; }
      .doravo-landing .faq-a p{ font-size:20px; }
      .doravo-landing .cta-band h2{ font-size:clamp(40px, 2.8vw, 52px); }
      .doravo-landing .cta-band p{ font-size:21px; }
      .doravo-landing .foot-brand p, .doravo-landing .foot-col a{ font-size:17px; }
      .doravo-landing .foot-bottom{ font-size:15.5px; }
    }
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
const SITE_URL = SITE.url; // canonical production domain (see src/config/site.js)
const CONTACT_EMAIL = SITE.email;
const WA_URL = waLink();

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
const PAGE_TITLE = "Doravo Core | School Management & E-Exams Platform by Doravo";
const PAGE_DESCRIPTION =
  "Doravo Core by Doravo is a school management platform for students, staff, online assessments and e-exams, attendance, fees and everyday school operations. Request a demo on WhatsApp.";

/* FAQ — used for the on-page accordion. The same questions and answers
   are also in index.html's FAQPage structured data so search engines and
   AI answer engines can read them without running JavaScript. Keep the
   two in sync when editing. */
const FAQS = [
  {
    q: "What is Doravo Core?",
    a: "Doravo Core is an education management platform by Doravo. It brings student and staff management, assessments and e-exams, attendance, fees, communication and everyday school operations into one platform.",
  },
  {
    q: "How do I request a demo of Doravo Core?",
    a: `Message Doravo on WhatsApp at ${SITE.whatsappDisplay} or email ${SITE.email}. We'll arrange a walkthrough for your school.`,
  },
  {
    q: "Can Doravo Core run online exams?",
    a: "Yes. You can create, sit and mark assessments online, including timed e-exams on dedicated exam devices, with results tied back to each student's record.",
  },
  {
    q: "Does Doravo Core handle school fees?",
    a: "Yes. Billing, payments and balances are tracked against your school's own fee structure and terms. Invoices can be downloaded and receipts are issued once a payment is confirmed.",
  },
  {
    q: "Can each school keep its own branding?",
    a: "Yes. Your logo, colours and report cards appear across your login screen, portals and printed documents. School groups get a dedicated workspace per campus.",
  },
  {
    q: "Who makes Doravo Core?",
    a: "Doravo Core is built and operated by Doravo.",
  },
];

const HOW_STEPS = [
  { n: "1", title: "Message us on WhatsApp", copy: "Tell us a little about your school and what you'd like to manage." },
  { n: "2", title: "See a live demo", copy: "We walk you through assessments, attendance, fees and the portals your team will use." },
  { n: "3", title: "Go live with your own branding", copy: "We set up your school with your logo and colours and help your staff get started." },
];

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
          alternateName: ["Doravo Core", "DoravoCore"],
          slogan: "Moving Education Forward",
          url: SITE_URL,
          logo: `${SITE_URL}/assets/doravo-core-lockup.png`,
          email: SITE.email,
          telephone: `+${SITE.whatsapp}`,
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "sales",
            telephone: `+${SITE.whatsapp}`,
            email: SITE.email,
            availableLanguage: ["English", "Swahili"],
          },
        },
        {
          "@type": "SoftwareApplication",
          name: "Doravo Core",
          alternateName: "DoravoCore",
          applicationCategory: "EducationApplication",
          operatingSystem: "Web",
          description: PAGE_DESCRIPTION,
          url: SITE_URL,
        },
        {
          "@type": "WebSite",
          name: "Doravo Core",
          url: SITE_URL,
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
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
    problem: "Records scattered across files and spreadsheets",
    desc: "Enrolment, class placement, academic history and everyday student records, kept in one place.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-4 3.1-6.5 7-6.5S19 16 19 20" /></svg>
    ),
  },
  {
    title: "Staff & Teacher Management",
    problem: "Staff details and assignments that live in one person's head",
    desc: "Organize staff records, teaching assignments and day-to-day administrative workflows.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.6-5.5 6-5.5s6 2.2 6 5.5M14 20c.3-2.6 1.9-4.3 4.3-4.3 1.6 0 2.9.8 3.7 2" /></svg>
    ),
  },
  {
    title: "Assessments & E-Exams",
    problem: "Paper exams that take weeks to set, sit and mark",
    desc: "Create, sit and mark assessments online, including timed e-exams on dedicated exam devices.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 4h11l3 3v13H5z" /><path d="M9 9h7M9 13h7M9 17h4" /></svg>
    ),
  },
  {
    title: "Attendance",
    problem: "Registers on paper that nobody can roll up",
    desc: "Daily registers taken by class or subject, rolling up into per-student and school-wide records.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M4 9h16M9 3v4M15 3v4" /></svg>
    ),
  },
  {
    title: "Fees",
    problem: "Chasing balances with no clear picture of who has paid",
    desc: "Billing, payments and balances tracked against your school's own fee structure and terms.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16v11H4z" /><path d="M4 10h16M8 14h3" /></svg>
    ),
  },
  {
    title: "Communication",
    problem: "Notices that don't reach the right people",
    desc: "Keep administrators, teachers, students and parents connected through centralized notifications.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v3M6 8c0-2 2.7-4 6-4s6 2 6 4c0 5 2 6 2 8H4c0-2 2-3 2-8z" /><path d="M10 19a2 2 0 004 0" /></svg>
    ),
  },
  {
    title: "Reports & Analytics",
    problem: "Reports compiled by hand at the end of term",
    desc: "Turn day-to-day academic and operational activity into information you can act on.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M2 20h20" /></svg>
    ),
  },
  {
    title: "School Administration",
    problem: "Gate, kitchen and leave-out processes held on paper",
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
    id: "fees",
    label: "Fees",
    title: "Fee balances you can see at a glance",
    desc: "Billing, payments and balances follow your school's own fee structure and terms, so the picture is always current.",
    bullets: ["Your own fee structure and terms", "Payments and balances in one place", "A statement for every student"],
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

const TAB_PREVIEW = {
  students: "students",
  assessments: "exam",
  attendance: "attendance",
  fees: "fees",
  teachers: "marking",
  reports: "reports",
  admin: "admin",
};

const SPOT_STEPS = [
  { title: "Set the assessment", copy: "Teachers build the questions and schedule the assessment from their own portal." },
  { title: "Students sit it on one device", copy: "Each student gets an exam token that locks to the first device that opens it. The exam is timed and answers are saved as they work." },
  { title: "Evidence is kept for markers", copy: "Camera photos taken during the exam, and screen captures where the student shares their screen, are available to markers." },
  { title: "Marking is shared out and tracked", copy: "Responses are allocated across teachers with live progress. Optional AI-assisted suggestions are there for the teacher to accept or change." },
  { title: "Results flow to the record", copy: "Marks are tied back to each student's record and carry through to report cards." },
];

const TRUST = [
  { title: "Role-based access", copy: "Administrators, teachers, students and parents each see only the portal built for them." },
  { title: "Fingerprint or face sign-in", copy: "Passkey sign-in is supported on devices that offer it, alongside the usual password." },
  { title: "One device per exam", copy: "An exam token binds to the first device that opens it, so a second device cannot take the same sitting." },
  { title: "Your own workspace", copy: "Each school has its own workspace, so one school's login has no reach into another's records." },
];

const ROLES = [
  { tag: "School administrators", copy: "Run students, staff and daily operations from one place, instead of stitched-together spreadsheets." },
  { tag: "Teachers", copy: "Classes, attendance, assessments and marking tools in one portal, branded to your school." },
  { tag: "Examinations officers", copy: "Schedule and oversee assessments and main examinations, and follow marking progress as it happens." },
  { tag: "Finance staff", copy: "Track fees, payments and balances against your school's own fee structure." },
  { tag: "Students", copy: "Sit assessments, see results and reach everyday school services from a single portal." },
];

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [openFaq, setOpenFaq] = useState(0);
  const [spotView, setSpotView] = useState("exam");
  const [autoTabs, setAutoTabs] = useState(true);

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
  const howRef = useReveal();
  const spotRef = useReveal();
  const trustRef = useReveal();
  const faqRef = useReveal();

  // Staggered scroll reveal for cards (set before paint so there is no flash).
  useLayoutEffect(() => {
    const root = document.querySelector(".doravo-landing");
    if (!root) return undefined;
    const targets = root.querySelectorAll(".feature-card, .role-card, .how-card, .trust-card, .spot-step, .hero-visual");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el, i) => {
      el.setAttribute("data-rv", "");
      el.style.transitionDelay = `${(i % 4) * 80}ms`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Product tabs advance on their own until the visitor takes control.
  useEffect(() => {
    if (!autoTabs) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const t = setTimeout(() => {
      setActiveTab((cur) => {
        const i = TABS.findIndex((x) => x.id === cur);
        return TABS[(i + 1) % TABS.length].id;
      });
    }, 8000);
    return () => clearTimeout(t);
  }, [autoTabs, activeTab]);

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
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#how-it-works">How it works</a>
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
            <a className="navcta wa" href={WA_URL} target="_blank" rel="noopener noreferrer">
              <WaIcon /> Request a Demo
            </a>
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
          <a href="#features" onClick={closeMobile}>Features</a>
          <a href="#solutions" onClick={closeMobile}>Solutions</a>
          <a href="#how-it-works" onClick={closeMobile}>How it works</a>
          <a href="#about" onClick={closeMobile}>About</a>
          <a href="#contact" onClick={closeMobile}>Contact</a>
          <div className="mobile-ctas">
            <SignInLink className="btn-ghost" onClick={closeMobile}>Sign In</SignInLink>
            <a className="btn-wa" href={WA_URL} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
              <WaIcon /> Request a Demo
            </a>
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
              <p className="eyebrow">School management &amp; e-examinations</p>
              <h1>Run your school and your exams from <em>one platform.</em></h1>
              <p className="lede">
                Doravo Core brings students, staff, attendance, fees and school operations together with
                online assessments and e-exams, so your team stops juggling spreadsheets and paper.
              </p>
              <div className="hero-ctas">
                <a className="btn-wa pulse" href={WA_URL} target="_blank" rel="noopener noreferrer">
                  <WaIcon /> Request a Demo on WhatsApp
                </a>
                <a className="btn-ghost" href="#platform">Explore the Platform</a>
              </div>
              <p className="hero-contact">
                Or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
              <p className="hero-note">Built around the everyday work of running a modern school.</p>
            </div>
            <div className="hero-visual">
              <Preview name="dashboard" />
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="trust-bar" style={{ padding: "34px 0" }} id="platform">
          <div className="wrap">
            <p className="trust-label">Built for the people who run a school</p>
            <div className="trust-items">
              <span>Principals</span>
              <span>Registrars</span>
              <span>Examinations officers</span>
              <span>Bursars</span>
              <span>ICT administrators</span>
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
                  <p className="fprob">{f.problem}</p>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* E-ASSESSMENT SPOTLIGHT — every step below is a feature that exists in the app */}
        <section className="spot" id="e-assessments">
          <div className="wrap">
            <div className="sec-head reveal" ref={spotRef}>
              <h2>E-assessments, from setting to results.</h2>
              <p>Run timed online exams without losing control of how they are sat or marked.</p>
            </div>
            <div className="spot-grid">
              <ol className="spot-steps">
                {SPOT_STEPS.map((st, i) => (
                  <li className="spot-step" key={st.title}>
                    <span className="spot-n">{i + 1}</span>
                    <div>
                      <h4>{st.title}</h4>
                      <p>{st.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="spot-visual">
                <div className="spot-switch" role="tablist" aria-label="Assessment views">
                  <button type="button" role="tab" aria-selected={spotView === "exam"} className={spotView === "exam" ? "on" : ""} onClick={() => setSpotView("exam")}>Student view</button>
                  <button type="button" role="tab" aria-selected={spotView === "marking"} className={spotView === "marking" ? "on" : ""} onClick={() => setSpotView("marking")}>Marking view</button>
                </div>
                <Preview name={spotView} key={spotView} />
              </div>
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
                  className={`tab-btn ${activeTab === t.id ? "active" : ""} ${autoTabs ? "auto" : ""}`}
                  onClick={() => { setAutoTabs(false); setActiveTab(t.id); }}
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
              <div className="tab-visual">
                <Preview name={TAB_PREVIEW[activeTab] || "dashboard"} />
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

        {/* TRUST & SECURITY — only capabilities that exist in the app */}
        <section id="trust">
          <div className="wrap">
            <div className="sec-head reveal" ref={trustRef}>
              <h2>Built with control in mind.</h2>
              <p>What the platform does today to keep school and exam data under your control.</p>
            </div>
            <div className="trust-grid">
              {TRUST.map((t) => (
                <div className="trust-card" key={t.title}>
                  <h4>{t.title}</h4>
                  <p>{t.copy}</p>
                </div>
              ))}
            </div>
            <p className="trust-note">
              We only describe capabilities the platform has today and do not list certifications we have not earned.
              Ask us about hosting and data handling during your demo.
            </p>
          </div>
        </section>

        <hr className="divider" />

        {/* HOW IT WORKS */}
        <section id="how-it-works">
          <div className="wrap">
            <div className="sec-head reveal" ref={howRef}>
              <h2>From first message to live school.</h2>
              <p>Getting started with Doravo Core takes three simple steps.</p>
            </div>
            <div className="how-grid">
              {HOW_STEPS.map((s) => (
                <div className="how-card" key={s.n}>
                  <div className="how-num">{s.n}</div>
                  <h4>{s.title}</h4>
                  <p>{s.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* FAQ — mirrored in index.html's FAQPage structured data */}
        <section id="faq">
          <div className="wrap">
            <div className="sec-head reveal" ref={faqRef}>
              <h2>Frequently asked questions.</h2>
              <p>Quick answers about Doravo Core.</p>
            </div>
            <div className="faq-list">
              {FAQS.map((f, i) => (
                <div className={`faq-item ${openFaq === i ? "open" : ""}`} key={f.q}>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    {f.q}
                    <span aria-hidden="true">+</span>
                  </button>
                  <div className="faq-a" role="region">
                    <p>{f.a}</p>
                  </div>
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
                <a className="btn-wa pulse" href={WA_URL} target="_blank" rel="noopener noreferrer">
                  <WaIcon /> Request a Demo on WhatsApp
                </a>
              </div>
              <p className="cta-alt">
                Prefer email? <a href={`mailto:${CONTACT_EMAIL}?subject=Doravo%20Core%20demo%20request`}>{CONTACT_EMAIL}</a>
              </p>
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
                <a href="#faq">FAQ</a>
                <a href="#contact">Contact</a>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer">WhatsApp {SITE.whatsappDisplay}</a>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
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

      <a
        className="dv-wa-float"
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Request a demo on WhatsApp"
      >
        <WaIcon />
      </a>
      <ChatAssistant />
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