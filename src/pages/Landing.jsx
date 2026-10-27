import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChatAssistant, { WaIcon } from "../components/ChatAssistant";
import { SITE, waLink } from "../config/site";
import Preview from "../components/LandingPreviews";

/* =========================================================
   LANDING
   Layout, typography (Fraunces + Manrope), corporate white /
   cool-grey / maroon theme, copy, product previews, tabs,
   e-assessment spotlight, drawer, FAQ and chat assistant all
   come from the full landing page.

   Motion comes from the "Orbid" remake: session preloader with
   percentage counter, drifting reeded-glass gradient hero,
   tapered funnel bars, barcode stats and an animated gradient
   chip in the big serif statement.

   Styles are injected once as a single <style> tag. Selectors
   are written with a § placeholder that becomes .doravo-landing.
========================================================= */

const injectLandingStyles = () => {
  if (document.getElementById("landing-tokens")) return;
  const el = document.createElement("style");
  el.id = "landing-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap');

    §{
      --maroon:#7A1B36; --maroon-deep:#4A0E22; --maroon-ink:#161A26;
      --ink:#1E2433; --muted:#4A5266; --paper:#F4F6F9; --paper-dim:#E4E8EF;
      --white:#FFFFFF; --brass:#8C6B2A;
      --line:rgba(22,26,38,0.12); --line-on-dark:rgba(255,255,255,0.2);
      --ease:cubic-bezier(0.16,1,0.3,1);
      margin:0; background:#FFFFFF; color:var(--ink);
      font-family:'Manrope',sans-serif; font-size:17px; line-height:1.6;
      -webkit-font-smoothing:antialiased; scroll-behavior:smooth; overflow-x:clip;
    }
    § *{ box-sizing:border-box; }
    § h1,§ h2,§ h3,§ h4,§ .serif{ font-family:'Fraunces',serif; font-weight:500; letter-spacing:-0.01em; margin:0; color:var(--maroon-ink); }
    § p{ margin:0; }
    § a{ color:inherit; }
    § img{ display:block; max-width:100%; }
    § button{ font-family:inherit; }
    § em{ font-style:italic; }
    § .wrap{ width:100%; max-width:1480px; margin:0 auto; padding:0 clamp(24px,4.2vw,76px); }
    § :focus-visible{ outline:2px solid var(--maroon); outline-offset:3px; }

    /* ---------- preloader: counter, beams, lift-away ---------- */
    § .pre{ position:fixed; inset:0; z-index:200; background:radial-gradient(120% 90% at 70% 60%,#6b1d1a,#2a0a0a 60%,#160505); overflow:hidden; transition:transform .9s cubic-bezier(.76,0,.24,1), visibility 0s .9s; }
    § .pre.done{ transform:translateY(-100%); visibility:hidden; }
    § .beam{ position:absolute; width:42vmax; height:18vmax; background:linear-gradient(90deg,rgba(255,170,150,.85),rgba(255,120,100,0) 80%); filter:blur(2px); transform-origin:0 50%; clip-path:polygon(0 48%,100% 0,100% 100%,0 52%); }
    § .beam::after{ content:""; position:absolute; left:-14px; top:50%; width:28px; height:28px; margin-top:-14px; border-radius:50%; background:#fff; box-shadow:0 0 40px 14px rgba(255,200,180,.8); }
    § .beam.a{ left:16%; top:42%; transform:rotate(18deg); animation:dvBeamA 3s ease-in-out infinite alternate; }
    § .beam.b{ left:84%; top:34%; transform:rotate(160deg); animation:dvBeamB 3s ease-in-out infinite alternate; }
    @keyframes dvBeamA{ to{ transform:rotate(30deg); } }
    @keyframes dvBeamB{ to{ transform:rotate(148deg); } }
    § .desk{ position:absolute; left:48%; bottom:24%; width:120px; height:4px; background:#1a0505; box-shadow:0 30px 0 -1px #1a0505; }
    § .count{ position:absolute; right:clamp(20px,4vw,48px); bottom:clamp(14px,3vw,36px); font:italic 400 clamp(56px,9vw,120px)/1 'Fraunces',serif; color:#fff; }

    /* ---------- drifting gradient + reeded glass ---------- */
    § .mesh{ position:absolute; inset:-20%; filter:blur(30px); animation:dvHue 28s ease-in-out infinite alternate; pointer-events:none; }
    § .mesh i{ position:absolute; border-radius:50%; }
    § .mesh i:nth-child(1){ width:60%; height:70%; left:-5%; top:20%; background:#f08a4b; animation:dvDrift 18s ease-in-out infinite alternate; }
    § .mesh i:nth-child(2){ width:50%; height:60%; right:-5%; bottom:-10%; background:#e5481c; animation:dvDrift 22s ease-in-out infinite alternate-reverse; }
    § .mesh i:nth-child(3){ width:45%; height:50%; left:30%; top:-10%; background:#a82c34; animation:dvDrift 25s ease-in-out infinite alternate; }
    § .mesh.maroon{ animation:none; }
    § .mesh.maroon i:nth-child(1){ background:#a82c34; }
    § .mesh.maroon i:nth-child(2){ background:#7A1B36; }
    § .mesh.maroon i:nth-child(3){ background:#4A0E22; }
    § .reed{ position:absolute; inset:0; background:repeating-linear-gradient(90deg,rgba(255,255,255,.1) 0 1px,rgba(0,0,0,.07) 1px 2px,transparent 2px 7px); mix-blend-mode:overlay; pointer-events:none; }
    @keyframes dvDrift{ to{ transform:translate(12%,-10%) scale(1.15); } }
    @keyframes dvHue{ 0%{ filter:blur(30px) hue-rotate(0); } 100%{ filter:blur(30px) hue-rotate(-62deg) saturate(.8) brightness(1.25); } }

    /* ---------- funnel bars ---------- */
    § .funnel{ background:#FFFFFF; padding:0 0 4px; margin-top:-1px; }
    § .funnel div{ height:12px; margin:0 auto 6px; border-radius:3px; background:var(--bar,#161A26); transform:scaleX(0); transition:transform .9s var(--ease); }
    § .funnel.in div{ transform:scaleX(1); }

    /* ---------- header ---------- */
    § header{ position:sticky; top:0; z-index:50; background:rgba(255,255,255,0.96); backdrop-filter:blur(6px); border-top:3px solid var(--maroon); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(22,26,38,0.03), 0 8px 24px -18px rgba(22,26,38,0.25); }
    § .nav{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 0; }
    § .nav-left{ display:flex; align-items:center; gap:14px; min-width:0; }
    § .nav-right{ display:flex; align-items:center; gap:16px; }
    § .brand{ display:flex; align-items:center; gap:11px; text-decoration:none; }
    § .brand img{ height:38px; width:auto; }
    § .brand span{ font-family:'Fraunces',serif; font-weight:500; font-size:22px; color:var(--maroon-ink); letter-spacing:0.01em; }
    § .navlinks{ display:flex; gap:clamp(18px,2vw,32px); }
    § .navlinks a{ text-decoration:none; font-size:15.5px; font-weight:500; color:#2A3042; padding:6px 0; border-bottom:1px solid transparent; transition:color .2s var(--ease), border-color .2s var(--ease); }
    § .navlinks a:hover{ color:var(--maroon); border-color:var(--maroon); }
    § .navcta{ display:inline-flex; align-items:center; gap:7px; text-decoration:none; background:#25D366; color:#06260F; font-size:15px; font-weight:600; padding:12px 20px; min-height:46px; border-radius:8px; white-space:nowrap; transition:background .25s var(--ease), transform .25s var(--ease); }
    § .navcta:hover{ background:#1fbd5a; transform:translateY(-1px); }
    § .menu-btn{ display:inline-flex; align-items:center; gap:9px; height:46px; padding:0 16px; background:#FFFFFF; color:var(--maroon-ink); font-size:15.5px; font-weight:700; border:1.5px solid rgba(22,26,38,0.3); border-radius:8px; cursor:pointer; transition:border-color .2s, color .2s, background .2s; }
    § .menu-btn svg{ width:22px; height:22px; flex:none; }
    § .menu-btn:hover{ border-color:var(--maroon); color:var(--maroon); background:#FBF6F8; }
    § .navlogin{ display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:46px; padding:10px 24px; background:var(--maroon); color:#FFFFFF; text-decoration:none; border:2px solid var(--maroon); border-radius:8px; font-size:16px; font-weight:700; letter-spacing:0.01em; white-space:nowrap; box-shadow:0 8px 18px -10px rgba(122,27,54,0.7); transition:background .2s, border-color .2s, transform .2s, box-shadow .2s; }
    § .navlogin svg{ width:19px; height:19px; flex:none; }
    § .navlogin:hover{ background:var(--maroon-deep); border-color:var(--maroon-deep); transform:translateY(-1px); box-shadow:0 10px 20px -10px rgba(74,14,34,0.8); }
    § .navlogin:focus-visible, § .menu-btn:focus-visible{ outline:3px solid #1E2433; outline-offset:3px; }
    @media (max-width:1100px){ § .navlinks{ display:none; } }
    @media (max-width:560px){
      § .menu-label{ display:none; }
      § .menu-btn{ width:46px; padding:0; justify-content:center; }
      § .navcta{ display:none; }
      § .nav, § .nav-left{ gap:10px; }
      § .navlogin{ padding:10px 18px; }
    }

    /* ---------- side drawer ---------- */
    § .dv-overlay{ position:fixed; inset:0; z-index:70; background:rgba(15,18,30,0.55); opacity:0; visibility:hidden; transition:opacity .25s, visibility 0s .25s; }
    § .dv-overlay.open{ opacity:1; visibility:visible; transition:opacity .25s; }
    § .dv-drawer{ position:fixed; top:0; left:0; bottom:0; z-index:71; width:min(400px,90vw); display:flex; flex-direction:column; background:#FFFFFF; border-top:3px solid var(--maroon); box-shadow:24px 0 60px -20px rgba(15,18,30,0.45); transform:translateX(-100%); visibility:hidden; transition:transform .3s var(--ease), visibility 0s .3s; }
    § .dv-drawer.open{ transform:none; visibility:visible; transition:transform .3s var(--ease); }
    § .dv-drawer-head{ display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--line); }
    § .dv-drawer-close{ width:44px; height:44px; display:inline-flex; align-items:center; justify-content:center; background:#FFFFFF; color:var(--maroon-ink); border:1.5px solid rgba(22,26,38,0.3); border-radius:8px; cursor:pointer; }
    § .dv-drawer-close svg{ width:22px; height:22px; }
    § .dv-drawer-close:hover{ border-color:var(--maroon); color:var(--maroon); }
    § .dv-drawer-body{ flex:1; overflow-y:auto; padding:8px 20px 20px; }
    § .dv-drawer-group{ padding-top:18px; }
    § .dv-drawer-title{ font-family:'Manrope',sans-serif; font-size:12.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin:0 0 6px; }
    § .dv-drawer-group a{ display:flex; align-items:center; justify-content:space-between; padding:13px 4px; font-size:17.5px; font-weight:600; color:var(--maroon-ink); text-decoration:none; border-bottom:1px solid var(--line); }
    § .dv-drawer-group a::after{ content:"\\203A"; color:var(--maroon); font-size:22px; line-height:1; }
    § .dv-drawer-group a:hover{ color:var(--maroon); background:var(--paper); }
    § .dv-drawer-foot{ padding:18px 20px 22px; border-top:1px solid var(--line); background:var(--paper); display:flex; flex-direction:column; gap:12px; }
    § .dv-drawer-signin{ display:flex; align-items:center; justify-content:center; min-height:50px; background:var(--maroon); color:#FFFFFF; font-size:17px; font-weight:700; border-radius:8px; text-decoration:none; border:2px solid var(--maroon); }
    § .dv-drawer-signin:hover{ background:var(--maroon-deep); border-color:var(--maroon-deep); }
    § .dv-drawer-demo{ justify-content:center; width:100%; border-radius:8px; }
    § .dv-drawer-mail{ text-align:center; font-size:14.5px; color:var(--muted); text-decoration:underline; }

    /* ---------- reveal on scroll ---------- */
    § .reveal{ opacity:0; transform:translateY(10px); transition:opacity .7s var(--ease), transform .7s var(--ease); }
    § .reveal.in{ opacity:1; transform:none; }
    § [data-rv]{ opacity:0; transform:translateY(18px); transition:opacity .7s var(--ease), transform .7s var(--ease); }
    § [data-rv].rv-in{ opacity:1; transform:none; }

    /* ---------- buttons ---------- */
    § .btn-primary,§ .btn-ghost,§ .btn-wa{ display:inline-flex; align-items:center; gap:9px; text-decoration:none; font-weight:600; font-size:16px; padding:15px 25px; border-radius:3px; }
    § .btn-primary{ background:var(--maroon); color:#fff; border:1px solid var(--maroon); transition:background .25s var(--ease), transform .25s var(--ease); }
    § .btn-primary:hover{ background:var(--maroon-deep); transform:translateY(-1px); }
    § .btn-ghost{ border:1px solid var(--maroon-ink); color:var(--maroon-ink); transition:background .25s var(--ease), color .25s var(--ease), transform .25s var(--ease); }
    § .btn-ghost:hover{ background:var(--maroon-ink); color:#fff; transform:translateY(-1px); }
    § .btn-wa{ background:#25D366; color:#06260F; border:1px solid #25D366; font-weight:700; box-shadow:0 10px 26px -12px rgba(37,211,102,0.7); transition:transform .25s var(--ease), background .25s; }
    § .btn-wa:hover{ background:#1fbd5a; border-color:#1fbd5a; transform:translateY(-2px); }
    § .btn-wa.pulse{ animation:dvPulse 2.6s 3 1.2s; }
    @keyframes dvPulse{ 0%{ box-shadow:0 0 0 0 rgba(37,211,102,0.5); } 70%{ box-shadow:0 0 0 16px rgba(37,211,102,0); } 100%{ box-shadow:0 0 0 0 rgba(37,211,102,0); } }

    /* ---------- hero (gradient + reeded glass) ---------- */
    § .hero{ position:relative; overflow:hidden; background:#c9432b; padding:clamp(76px,7vw,112px) 0 clamp(68px,6vw,96px); }
    § .hero-grid{ position:relative; z-index:1; display:grid; grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr); gap:clamp(44px,5vw,88px); align-items:center; }
    § .eyebrow{ display:flex; align-items:center; gap:10px; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--maroon-ink); margin-bottom:14px; }
    § .eyebrow::before{ content:""; width:26px; height:1px; background:var(--maroon-ink); }
    § .hero h1{ font-size:clamp(44px,4.1vw,68px); line-height:1.08; max-width:17ch; color:#0a0a0a; }
    § .hero h1 em{ color:var(--maroon-deep); }
    § .hero .lede{ margin-top:20px; max-width:52ch; font-size:clamp(18px,1.25vw,21px); line-height:1.75; color:#1a0a08; }
    § .hero-ctas{ display:flex; gap:14px; margin-top:30px; flex-wrap:wrap; }
    § .hero .btn-ghost{ border-color:#111; color:#111; }
    § .hero .btn-ghost:hover{ background:#111; color:#fff; }
    § .hero-contact{ margin-top:16px; font-size:15px; color:#2a1411; }
    § .hero-contact a{ color:var(--maroon-deep); font-weight:700; }
    § .hero-note{ margin-top:18px; font-size:15px; color:#2a1411; }
    § .hero-visual{ min-width:0; }
    § .product-frame{ background:#fff; border:1px solid var(--line); border-radius:10px; box-shadow:0 30px 70px -36px rgba(22,26,38,0.45); overflow:hidden; }

    /* ---------- trust bar + barcode stats ---------- */
    § .trust-bar{ padding:34px 0; background:#FFFFFF; border-bottom:1px solid var(--line); }
    § .trust-bar .trust-label{ font-size:13px; color:var(--muted); margin-bottom:18px; text-align:center; }
    § .trust-items{ display:flex; justify-content:center; flex-wrap:wrap; }
    § .trust-items span{ font-size:16px; font-weight:600; color:var(--maroon-ink); padding:8px 24px; border-left:1px solid var(--line); }
    § .trust-items span:first-child{ border-left:none; }
    @media (max-width:760px){ § .trust-items span{ border-left:none; padding:5px 12px; font-size:14px; } }
    § .stats{ background:#FFFFFF; }
    § .stats-head{ display:flex; justify-content:space-between; align-items:flex-end; gap:40px; flex-wrap:wrap; }
    § .stats-head h2{ font-size:clamp(34px,5.4vw,76px); line-height:1.02; }
    § .stats-head p{ max-width:36ch; color:var(--muted); font-size:16px; line-height:1.7; }
    § .bars{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:56px; align-items:end; min-height:320px; }
    § .bar .n{ font:400 clamp(34px,3.6vw,54px)/1 'Fraunces',serif; color:var(--maroon-ink); }
    § .bar b{ display:block; font-weight:700; font-size:14.5px; margin-top:8px; color:var(--maroon-ink); }
    § .bar .s{ font-size:13.5px; color:var(--muted); }
    § .code{ margin-top:14px; height:var(--h); background:repeating-linear-gradient(90deg,var(--maroon) 0 3px,transparent 3px 7px); clip-path:inset(100% 0 0 0); transition:clip-path 1.1s var(--ease); }
    § .bars.in .code{ clip-path:inset(0); }
    @media (max-width:700px){ § .bars{ grid-template-columns:repeat(2,1fr); gap:30px 12px; } }

    /* ---------- section shell ---------- */
    § section{ padding:clamp(76px,6vw,100px) 0; }
    § .sec-head{ max-width:780px; margin-bottom:clamp(36px,4vw,54px); }
    § .sec-head h2{ font-size:clamp(34px,3.1vw,48px); line-height:1.15; }
    § .sec-head h2::before{ content:""; display:block; width:34px; height:2px; background:var(--maroon); margin-bottom:16px; }
    § .sec-head p{ margin-top:14px; font-size:clamp(17px,1.15vw,19px); line-height:1.75; color:var(--muted); }
    § .divider{ display:none; }
    § #problem,§ .spot,§ #about,§ #how-it-works,§ #contact{ background:#FFFFFF; }
    § #features,§ #roles,§ #trust,§ #faq,§ footer{ background:var(--paper); }

    /* ---------- problem / solution ---------- */
    § .ps-grid{ display:grid; grid-template-columns:1fr 1fr; gap:clamp(24px,3vw,44px); }
    @media (max-width:800px){ § .ps-grid{ grid-template-columns:1fr; } }
    § .ps-card{ padding:clamp(28px,2.5vw,40px); border-radius:8px; }
    § .ps-card.problem{ background:var(--paper); border:1px solid var(--line); }
    § .ps-card.solution{ background:linear-gradient(135deg,#7A1B36 0%,#4A0E22 100%); color:#fff; }
    § .ps-card h3{ font-family:'Manrope',sans-serif; font-size:15px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:16px; }
    § .ps-card.problem h3{ color:var(--maroon); }
    § .ps-card.solution h3{ color:#fff; opacity:.75; }
    § .ps-card p{ font-size:17px; line-height:1.8; }
    § .ps-card.problem p{ color:var(--muted); }
    § .ps-card.solution p{ color:#fff; opacity:.95; }

    /* ---------- features ---------- */
    § .feature-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    @media (max-width:1100px){ § .feature-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width:560px){ § .feature-grid{ grid-template-columns:minmax(0,1fr); } }
    § .feature-card{ position:relative; background:#FFFFFF; padding:clamp(24px,2vw,34px); display:flex; flex-direction:column; gap:15px; transition:background .3s var(--ease), transform .3s var(--ease); }
    § .feature-card:hover{ background:#FBFCFD; transform:translateY(-3px); }
    § .feature-card::after{ content:""; position:absolute; left:0; top:0; height:2px; width:0; background:var(--brass); transition:width .4s var(--ease); }
    § .feature-card:hover::after{ width:100%; }
    § .feature-card .fi{ width:34px; height:34px; border-radius:7px; background:rgba(122,27,54,0.08); display:flex; align-items:center; justify-content:center; }
    § .feature-card svg{ width:17px; height:17px; color:var(--maroon); }
    § .feature-card h4{ font-size:19px; line-height:1.35; }
    § .feature-card p{ font-size:15.5px; line-height:1.7; color:var(--muted); }
    § .feature-card .fprob{ font-size:14px; font-weight:700; letter-spacing:0.02em; color:var(--brass); line-height:1.4; }

    /* ---------- e-assessment spotlight ---------- */
    § .spot-grid{ display:grid; grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr); gap:clamp(34px,4.5vw,72px); align-items:start; }
    @media (max-width:860px){ § .spot-grid{ grid-template-columns:minmax(0,1fr); gap:34px; } }
    § .spot-steps{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
    § .spot-step{ display:flex; gap:18px; padding:22px 0; border-top:1px solid var(--line); }
    § .spot-step:first-child{ border-top:none; padding-top:0; }
    § .spot-n{ flex:none; width:36px; height:36px; border-radius:50%; border:1px solid var(--brass); color:var(--brass); font-weight:700; font-size:15px; display:flex; align-items:center; justify-content:center; transition:background .3s, color .3s; }
    § .spot-step:hover .spot-n{ background:var(--brass); color:#fff; }
    § .spot-step h4{ font-size:19px; line-height:1.4; margin-bottom:3px; }
    § .spot-step p{ font-size:16px; line-height:1.75; color:var(--muted); }
    § .spot-switch{ display:inline-flex; border:1px solid var(--line); border-radius:999px; padding:3px; margin-bottom:16px; background:var(--paper); }
    § .spot-switch button{ border:none; background:none; padding:7px 16px; border-radius:999px; font-weight:600; font-size:13px; cursor:pointer; color:var(--ink); transition:background .25s, color .25s; }
    § .spot-switch button.on{ background:var(--maroon); color:#fff; }
    § .spot-visual{ position:relative; min-width:0; }

    /* ---------- product tabs (dark band) ---------- */
    § .tabs-section{ background:linear-gradient(135deg,#4A0E22 0%,#2A0813 100%); color:#fff; }
    § .tabs-section h2,§ .tab-copy h3{ color:#fff; }
    § .tabs-section .sec-head p,§ .tab-copy p{ color:#E9DDE2; }
    § .tabs-section .sec-head h2::before{ background:#C9A25A; }
    § .tabs-bar{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:30px; }
    § .tab-btn{ position:relative; overflow:hidden; background:transparent; border:1px solid var(--line-on-dark); color:#F3EAEE; padding:11px 20px; border-radius:999px; font-size:15.5px; cursor:pointer; opacity:.85; transition:opacity .25s var(--ease), background .25s var(--ease), color .25s var(--ease); }
    § .tab-btn:hover{ opacity:1; }
    § .tab-btn.active{ background:#fff; color:var(--maroon); opacity:1; font-weight:700; border-color:#fff; }
    § .tab-btn.active.auto::after{ content:""; position:absolute; left:0; bottom:0; height:2px; width:100%; background:var(--brass); transform-origin:left; animation:dvTabBar 8s linear both; }
    @keyframes dvTabBar{ from{ transform:scaleX(0); } to{ transform:scaleX(1); } }
    § .tab-panel{ display:grid; grid-template-columns:.95fr 1.05fr; gap:48px; align-items:center; }
    § .tab-fade{ animation:dvTabFade .35s var(--ease); }
    @keyframes dvTabFade{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
    @media (max-width:860px){ § .tab-panel{ grid-template-columns:1fr; gap:32px; } }
    § .tab-copy h3{ font-size:clamp(26px,2.2vw,34px); line-height:1.25; margin-bottom:12px; }
    § .tab-copy p{ font-size:17px; line-height:1.8; margin-bottom:18px; }
    § .tab-copy ul{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
    § .tab-copy li{ position:relative; padding-left:20px; font-size:16px; line-height:1.65; color:#F3EAEE; }
    § .tab-copy li::before{ content:""; position:absolute; left:0; top:9px; width:7px; height:7px; border-radius:50%; background:#C9A25A; }
    § .tab-visual{ min-width:0; }

    /* ---------- roles ---------- */
    § .role-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:22px; }
    § .role-card{ background:#fff; border:1px solid var(--line); border-top:3px solid var(--maroon); border-radius:8px; padding:30px 26px; box-shadow:0 12px 28px -22px rgba(22,26,38,0.35); transition:border-color .3s var(--ease), transform .3s var(--ease); }
    § .role-card:hover{ border-color:var(--maroon); transform:translateY(-2px); }
    § .role-tag{ font-size:13px; font-weight:700; color:var(--brass); letter-spacing:0.04em; text-transform:uppercase; margin-bottom:12px; }
    § .role-card p{ font-size:16px; line-height:1.75; color:var(--muted); }

    /* ---------- your own space ---------- */
    § .institution-section{ display:grid; grid-template-columns:.9fr 1.1fr; gap:clamp(36px,5vw,80px); align-items:center; }
    @media (max-width:860px){ § .institution-section{ grid-template-columns:minmax(0,1fr); } }
    § .institution-copy h2{ font-size:clamp(34px,3.1vw,48px); line-height:1.15; }
    § .institution-copy p{ margin-top:16px; font-size:17px; line-height:1.8; color:var(--muted); }
    § .institution-copy p + p{ margin-top:12px; }
    § .chip{ display:inline-block; width:1.5em; height:.55em; border-radius:6px; vertical-align:middle; margin:0 .1em; background:linear-gradient(110deg,#7A1B36,#e5481c,#f08a4b,#b9a6ec); background-size:200% 100%; animation:dvChip 8s linear infinite alternate; }
    @keyframes dvChip{ to{ background-position:100% 0; } }
    § .mock{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:clamp(24px,2.5vw,38px); box-shadow:0 30px 60px -36px rgba(22,26,38,0.4); }
    § .mock-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
    § .mock-head .tag{ font-size:12px; letter-spacing:0.03em; color:var(--muted); }
    § .mock-slot{ height:64px; border-radius:4px; background:repeating-linear-gradient(135deg,#EEF1F5,#EEF1F5 8px,#F8F9FB 8px,#F8F9FB 16px); display:flex; align-items:center; justify-content:center; margin-bottom:16px; border:1px dashed var(--line); }
    § .mock-slot span{ font-size:12px; color:var(--muted); }
    § .mock-line{ height:9px; background:var(--paper-dim); border-radius:2px; margin-bottom:9px; }
    § .mock-line.w60{ width:60%; } § .mock-line.w80{ width:80%; } § .mock-line.w40{ width:40%; }
    § .mock-caption{ margin-top:18px; font-size:15px; line-height:1.7; color:var(--muted); text-align:center; }

    /* ---------- trust cards ---------- */
    § .trust-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:22px; }
    § .trust-card{ background:#fff; border:1px solid var(--line); border-top:2px solid var(--maroon); border-radius:6px; padding:28px; box-shadow:0 12px 28px -22px rgba(22,26,38,0.35); }
    § .trust-card h4{ font-size:19px; line-height:1.35; margin-bottom:6px; }
    § .trust-card p{ font-size:16px; line-height:1.75; color:var(--muted); }
    § .trust-note{ margin-top:22px; font-size:15px; line-height:1.7; color:var(--muted); max-width:70ch; }

    /* ---------- how it works ---------- */
    § .how-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:26px; }
    @media (max-width:800px){ § .how-grid{ grid-template-columns:1fr; } }
    § .how-card{ background:var(--paper); border:1px solid var(--line); border-radius:6px; padding:32px 28px; transition:transform .3s var(--ease), border-color .3s; }
    § .how-card:hover{ transform:translateY(-3px); border-color:var(--maroon); }
    § .how-num{ width:38px; height:38px; border-radius:50%; background:#fff; color:var(--maroon); border:1px solid var(--brass); display:flex; align-items:center; justify-content:center; font-weight:700; margin-bottom:14px; transition:background .3s, color .3s; }
    § .how-card:hover .how-num{ background:var(--brass); color:#fff; }
    § .how-card h4{ font-size:19px; line-height:1.4; margin-bottom:6px; }
    § .how-card p{ font-size:16px; line-height:1.75; color:var(--muted); }

    /* ---------- FAQ ---------- */
    § .faq-list{ max-width:820px; margin:0 auto; }
    § .faq-item{ border-bottom:1px solid var(--line); }
    § .faq-q{ width:100%; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:20px 0; background:none; border:none; cursor:pointer; text-align:left; font-family:'Fraunces',serif; font-size:21px; line-height:1.5; color:var(--maroon-ink); }
    § .faq-q span{ font-family:'Manrope',sans-serif; font-size:22px; color:var(--maroon); transition:transform .25s; }
    § .faq-item.open .faq-q span{ transform:rotate(45deg); }
    § .faq-a{ overflow:hidden; max-height:0; transition:max-height .35s var(--ease); }
    § .faq-item.open .faq-a{ max-height:300px; }
    § .faq-a p{ padding:0 0 20px; font-size:17px; line-height:1.8; color:var(--muted); max-width:70ch; }

    /* ---------- CTA band (maroon gradient + reeded glass) ---------- */
    § .cta-band{ position:relative; overflow:hidden; background:linear-gradient(120deg,#7A1B36 0%,#4A0E22 100%); color:#fff; border-radius:8px; padding:clamp(36px,4vw,64px); display:flex; align-items:center; justify-content:space-between; gap:28px; flex-wrap:wrap; box-shadow:0 30px 60px -36px rgba(74,14,34,0.6); }
    § .cta-band > :not(.mesh):not(.reed){ position:relative; z-index:1; }
    § .cta-band h2{ color:#fff; font-size:clamp(32px,3vw,44px); max-width:22ch; }
    § .cta-band p{ color:#F3EAEE; margin-top:10px; font-size:17px; line-height:1.75; max-width:40ch; }
    § .cta-band .cta-buttons{ display:flex; gap:12px; flex-wrap:wrap; }
    § .cta-band .cta-alt{ margin-top:0; font-size:15px; flex-basis:100%; max-width:none; }
    § .cta-band .cta-alt a{ color:#fff; }
    @media (max-width:860px){ § .cta-band{ align-items:flex-start; flex-direction:column; } }

    /* ---------- footer ---------- */
    § footer{ border-top:1px solid var(--line); padding:50px 0 36px; }
    § .foot-grid{ display:flex; justify-content:space-between; gap:40px; flex-wrap:wrap; }
    § .foot-brand img{ height:44px; width:auto; margin-bottom:14px; }
    § .foot-brand p{ font-size:15px; line-height:1.7; color:var(--muted); max-width:32ch; }
    § .foot-cols{ display:flex; gap:56px; flex-wrap:wrap; }
    § .foot-col h5{ font-family:'Manrope',sans-serif; font-size:14px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin:0 0 14px; font-weight:700; }
    § .foot-col a{ display:block; text-decoration:none; font-size:15px; line-height:1.7; color:var(--muted); margin-bottom:10px; }
    § .foot-col a:hover{ color:var(--maroon); text-decoration:underline; }
    § .foot-bottom{ margin-top:42px; padding-top:22px; border-top:1px solid var(--line); font-size:14px; color:var(--muted); display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }

    /* ---------- floating WhatsApp + chat assistant ---------- */
    § .dv-wa-float{ position:fixed; left:18px; bottom:18px; z-index:60; width:56px; height:56px; border-radius:50%; background:#25D366; color:#06260F; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px rgba(37,211,102,0.5); transition:transform .25s; }
    § .dv-wa-float:hover{ transform:scale(1.07); }
    § .dv-wa-float svg{ width:28px; height:28px; }
    § .dv-chat-fab{ position:fixed; right:18px; bottom:18px; z-index:60; width:56px; height:56px; border-radius:50%; border:none; cursor:pointer; background:var(--maroon); color:#fff; font-size:28px; line-height:1; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px rgba(122,27,54,0.45); transition:transform .25s, background .25s; }
    § .dv-chat-fab:hover{ background:var(--maroon-deep); transform:scale(1.07); }
    § .dv-chat{ position:fixed; right:18px; bottom:86px; z-index:61; width:min(370px,calc(100vw - 36px)); height:min(520px,calc(100vh - 120px)); display:flex; flex-direction:column; background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden; box-shadow:0 26px 60px -20px rgba(42,10,21,0.45); animation:dvChatIn .3s var(--ease); }
    @keyframes dvChatIn{ from{ opacity:0; transform:translateY(12px) scale(.98); } to{ opacity:1; transform:none; } }
    § .dv-chat-head{ display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:var(--maroon); color:#fff; font-family:'Fraunces',serif; }
    § .dv-chat-head button{ background:none; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1; }
    § .dv-chat-body{ flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:var(--paper); }
    § .dv-msg{ max-width:86%; padding:10px 13px; border-radius:10px; font-size:14px; line-height:1.5; }
    § .dv-msg.bot{ background:#fff; border:1px solid var(--line); align-self:flex-start; }
    § .dv-msg.me{ background:var(--maroon); color:#fff; align-self:flex-end; }
    § .dv-chips{ display:flex; flex-wrap:wrap; gap:8px; }
    § .dv-chips button{ background:#fff; border:1px solid var(--maroon); color:var(--maroon); border-radius:999px; padding:6px 12px; font-size:12.5px; font-weight:600; cursor:pointer; transition:background .2s, color .2s; }
    § .dv-chips button:hover{ background:var(--maroon); color:#fff; }
    § .dv-chat-wa{ display:flex; align-items:center; justify-content:center; gap:8px; padding:11px; background:#25D366; color:#06260F; font-weight:700; font-size:13.5px; text-decoration:none; }
    § .dv-chat-input{ display:flex; gap:8px; padding:10px; border-top:1px solid var(--line); background:#fff; }
    § .dv-chat-input input{ flex:1; padding:10px 12px; border:1px solid var(--line); border-radius:6px; font:inherit; font-size:14px; background:#fff; color:var(--ink); }
    § .dv-chat-input button{ padding:0 16px; border:none; border-radius:6px; background:var(--maroon); color:#fff; font-weight:600; cursor:pointer; }

    /* ---------- responsive ---------- */
    @media (max-width:1100px){
      § .wrap{ padding-left:28px; padding-right:28px; }
      § .hero-grid{ gap:36px; }
      § .hero h1{ font-size:clamp(40px,5vw,54px); }
    }
    @media (max-width:860px){
      § .wrap{ padding-left:24px; padding-right:24px; }
      § .hero-grid,§ .institution-section{ grid-template-columns:minmax(0,1fr); gap:42px; }
      § .hero h1{ max-width:19ch; }
      § .foot-cols{ gap:32px; }
    }
    @media (max-width:560px){
      § { font-size:16px; }
      § .wrap{ padding-left:18px; padding-right:18px; }
      § section{ padding-top:58px; padding-bottom:58px; }
      § .hero{ padding-top:54px; padding-bottom:52px; }
      § .hero h1{ font-size:clamp(36px,10vw,46px); }
      § .hero .lede{ font-size:17px; }
      § .hero-ctas,§ .cta-band .cta-buttons{ width:100%; }
      § .hero-ctas > a,§ .cta-band .cta-buttons > a{ width:100%; justify-content:center; text-align:center; }
      § .sec-head h2{ font-size:clamp(30px,8vw,38px); }
      § .sec-head p{ font-size:16px; }
      § .ps-card{ padding:24px 20px; }
      § .spot-switch button{ padding:8px 12px; font-size:12.5px; }
      § .cta-band{ padding:28px 22px; }
      § .foot-grid,§ .foot-cols{ flex-direction:column; gap:28px; }
      § .foot-bottom{ flex-direction:column; }
      § .dv-wa-float{ left:12px; bottom:12px; width:50px; height:50px; }
      § .dv-chat-fab{ right:12px; bottom:12px; width:50px; height:50px; }
      § .dv-chat{ right:10px; bottom:80px; width:calc(100vw - 20px); }
    }
    @media (min-width:1280px){
      § { font-size:18px; }
      § section{ padding:96px 0; }
      § .hero{ padding:112px 0 88px; }
      § .hero-grid{ gap:84px; }
      § .hero h1{ font-size:clamp(52px,4.4vw,68px); }
      § .hero .lede{ font-size:21px; }
      § .nav{ padding:18px 0; }
      § .sec-head{ max-width:820px; margin-bottom:56px; }
      § .sec-head h2{ font-size:clamp(38px,3.2vw,48px); }
      § .sec-head p{ font-size:20px; }
      § .btn-primary,§ .btn-ghost,§ .btn-wa{ font-size:17.5px; padding:17px 32px; }
      § .ps-card p,§ .institution-copy p{ font-size:19px; }
      § .feature-card{ padding:36px 30px; }
      § .feature-card h4,§ .trust-card h4{ font-size:21px; }
      § .feature-card p{ font-size:16.5px; }
      § .tab-copy h3{ font-size:32px; }
      § .tab-copy p{ font-size:19px; }
      § .tab-copy li{ font-size:17.5px; }
      § .tab-panel,§ .spot-grid,§ .institution-section{ gap:72px; }
      § .role-card p,§ .trust-card p{ font-size:17.5px; }
      § .spot-step h4,§ .how-card h4{ font-size:22px; }
      § .spot-step p,§ .how-card p{ font-size:17.5px; }
      § .faq-list{ max-width:980px; }
      § .faq-q{ font-size:22px; padding:24px 0; }
      § .faq-a p{ font-size:18.5px; }
      § .cta-band{ padding:72px; }
      § .cta-band p{ font-size:19px; }
      § .foot-col a{ font-size:16px; }
    }
    @media (min-width:1700px){
      § .wrap{ max-width:1760px; }
      § { font-size:20px; }
      § section{ padding:120px 0; }
      § .hero{ padding:136px 0 104px; }
      § .hero h1{ font-size:clamp(64px,4vw,80px); }
      § .hero .lede{ font-size:24px; }
      § .sec-head{ max-width:940px; }
      § .sec-head h2{ font-size:clamp(46px,2.8vw,56px); }
      § .sec-head p{ font-size:22px; }
      § .brand img{ height:42px; }
      § .brand span{ font-size:24px; }
      § .navlinks a{ font-size:18.5px; }
      § .btn-primary,§ .btn-ghost,§ .btn-wa{ font-size:19px; padding:19px 36px; }
      § .feature-card h4{ font-size:23px; }
      § .feature-card p{ font-size:18px; }
      § .tab-copy h3{ font-size:36px; }
      § .tab-copy p{ font-size:21px; }
      § .faq-list{ max-width:1100px; }
      § .faq-q{ font-size:24px; }
      § .cta-band h2{ font-size:clamp(40px,2.8vw,52px); }
    }

    @media (prefers-reduced-motion: reduce){
      § *{ animation:none !important; transition:none !important; }
      § .reveal,§ [data-rv]{ opacity:1; transform:none; }
      § .funnel div{ transform:none; }
      § .code{ clip-path:none; }
      § .tab-btn.active.auto::after{ transform:scaleX(1); }
    }
  `.replace(/§/g, ".doravo-landing");
  document.head.appendChild(el);
};

/* ---------------------------------------------------------
   SITE CONFIG
--------------------------------------------------------- */
const SITE_URL = SITE.url; // canonical production domain (see src/config/site.js)
const CONTACT_EMAIL = SITE.email;
const WA_URL = waLink();

/* ---------------------------------------------------------
   SIGN IN DESTINATION
   The app lives at www.doravocore.co.ke; the marketing domain
   (www.doravo.co.ke), previews and localhost may serve a copy of
   this page. On the app's own domain "Sign In" is a client-side
   <Link>; on any other host it is an absolute link to the real
   login page.
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
   JSON-LD structured data. Only known, real values are used.
--------------------------------------------------------- */
const PAGE_TITLE = "Doravo Core | School Management & E-Exams Platform by Doravo";
const PAGE_DESCRIPTION =
  "Doravo Core by Doravo is a school management platform for students, staff, online assessments and e-exams, attendance, fees and everyday school operations. Request a demo on WhatsApp.";

/* FAQ — mirrored in index.html's FAQPage structured data. Keep in sync. */
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

  // Runs client-side on mount. Base <title>/<meta> tags still belong in the
  // built index.html (or static rendering) so crawlers that skip JS see them.
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
        { "@type": "WebSite", name: "Doravo Core", url: SITE_URL },
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

/* Adds .in once the node is first scrolled into view. */
const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
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

const MENU_GROUPS = [
  {
    title: "Platform",
    links: [
      ["Why Doravo Core", "#platform"],
      ["Features", "#features"],
      ["E-assessments", "#e-assessments"],
      ["Solutions", "#solutions"],
    ],
  },
  {
    title: "For your school",
    links: [
      ["Who it's for", "#roles"],
      ["Your own space", "#about"],
      ["Security & control", "#trust"],
    ],
  },
  {
    title: "Get started",
    links: [
      ["How it works", "#how-it-works"],
      ["FAQ", "#faq"],
      ["Contact", "#contact"],
    ],
  },
];

/* Honest "stats": counts taken from the product's own content, not invented figures. */
const COUNTS = [
  { n: FEATURES.length, label: "Connected modules", sub: "Students to school administration", h: 90 },
  { n: ROLES.length, label: "Role-based portals", sub: "Each person sees their own", h: 150 },
  { n: TRUST.length, label: "Access controls", sub: "Passkeys, one device per exam", h: 210 },
  { n: 1, label: "Platform", sub: "One workspace for your school", h: 260 },
];

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg>
);

/* Drifting gradient blobs with a reeded-glass overlay. */
const Mesh = ({ tone }) => (
  <>
    <div className={`mesh ${tone || ""}`} aria-hidden="true"><i /><i /><i /></div>
    <div className="reed" aria-hidden="true" />
  </>
);

/* Tapered bars that draw in when scrolled to. */
const Funnel = ({ color }) => {
  const ref = useReveal();
  return (
    <div className="funnel" ref={ref} aria-hidden="true" style={color ? { "--bar": color } : undefined}>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{ width: `${96 - i * 6.6}%`, height: Math.max(2, 12 - i * 0.8), transitionDelay: `${i * 45}ms` }} />
      ))}
    </div>
  );
};

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [openFaq, setOpenFaq] = useState(0);
  const [spotView, setSpotView] = useState("exam");
  const [autoTabs, setAutoTabs] = useState(true);

  // Preloader plays once per session and never for reduced-motion visitors.
  const [skipPre] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return !!(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || sessionStorage.getItem("dv-pre"));
    } catch {
      return true;
    }
  });
  const [pct, setPct] = useState(skipPre ? 100 : 0);
  const [loaded, setLoaded] = useState(skipPre);

  // Styles go in before first paint so the preloader never flashes unstyled.
  useLayoutEffect(() => { injectLandingStyles(); }, []);
  useEffect(() => { injectSEO(); }, []);

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
  const statsRef = useReveal();
  const barsRef = useReveal();

  // Preloader: counts to 100, then lifts away.
  useEffect(() => {
    if (skipPre) return undefined;
    document.body.style.overflow = "hidden";
    const start = performance.now();
    let raf;
    let timer;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 2600);
      setPct(Math.round(p * p * (3 - 2 * p) * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        timer = setTimeout(() => {
          setLoaded(true);
          document.body.style.overflow = "";
          try { sessionStorage.setItem("dv-pre", "1"); } catch { /* storage unavailable */ }
        }, 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [skipPre]);

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

  const closeMenu = () => setMenuOpen(false);
  const closeMenuAndRefocus = () => {
    setMenuOpen(false);
    menuBtnRef.current?.focus();
  };

  // Side menu: lock page scroll, move focus in, trap Tab, close on Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const f = drawerRef.current.querySelectorAll("a[href], button:not([disabled])");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="doravo-landing">
      {/* PRELOADER */}
      <div className={`pre ${loaded ? "done" : ""}`} aria-hidden="true">
        <div className="beam a" /><div className="beam b" /><div className="desk" />
        <div className="count">{pct}%</div>
      </div>

      <header>
        <div className="wrap nav">
          <div className="nav-left">
            <button
              ref={menuBtnRef}
              type="button"
              className="menu-btn"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <span className="menu-label">Menu</span>
            </button>
            <a className="brand" href="#top">
              <img src="/assets/doravo-icon.png" alt="Doravo mark" />
              <span>Doravo Core</span>
            </a>
          </div>
          <nav className="navlinks" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-right">
            <SignInLink className="navlogin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
              </svg>
              <span className="label-full">Sign In</span>
            </SignInLink>
            <a className="navcta" href={WA_URL} target="_blank" rel="noopener noreferrer">
              <WaIcon /> Request a Demo
            </a>
          </div>
        </div>
      </header>

      {/* SIDE MENU — rendered outside <header> because the header's backdrop-filter
          would otherwise become the containing block for this fixed panel. */}
      <div className={`dv-overlay ${menuOpen ? "open" : ""}`} onClick={closeMenuAndRefocus} aria-hidden="true" />
      <aside
        id="site-menu"
        ref={drawerRef}
        className={`dv-drawer ${menuOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!menuOpen}
      >
        <div className="dv-drawer-head">
          <a className="brand" href="#top" onClick={closeMenu}>
            <img src="/assets/doravo-icon.png" alt="" />
            <span>Doravo Core</span>
          </a>
          <button ref={closeBtnRef} type="button" className="dv-drawer-close" aria-label="Close menu" onClick={closeMenuAndRefocus}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="dv-drawer-body" aria-label="Site menu">
          {MENU_GROUPS.map((g) => (
            <div className="dv-drawer-group" key={g.title}>
              <h2 className="dv-drawer-title">{g.title}</h2>
              {g.links.map(([label, href]) => (
                <a key={href} href={href} onClick={closeMenu}>{label}</a>
              ))}
            </div>
          ))}
        </nav>
        <div className="dv-drawer-foot">
          <SignInLink className="dv-drawer-signin" onClick={closeMenu}>Sign In</SignInLink>
          <a className="btn-wa dv-drawer-demo" href={WA_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
            <WaIcon /> Request a Demo
          </a>
          <a className="dv-drawer-mail" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </aside>

      <main id="top">
        {/* HERO — drifting gradient and reeded glass behind the full layout */}
        <section className="hero">
          <Mesh />
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
        <Funnel color="#7A1B36" />

        {/* TRUST BAR */}
        <section className="trust-bar" id="platform">
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

        {/* BARCODE STATS — counts come from the product's own content */}
        <section className="stats">
          <div className="wrap">
            <div className="stats-head reveal" ref={statsRef}>
              <h2>One platform, <em>every role.</em></h2>
              <p>Built around the people who run a school: principals, registrars, examinations officers, bursars and ICT administrators.</p>
            </div>
            <div className="bars" ref={barsRef}>
              {COUNTS.map((c) => (
                <div className="bar" key={c.label}>
                  <div className="n">{c.n}</div>
                  <b>{c.label}</b>
                  <span className="s">{c.sub}</span>
                  <div className="code" style={{ "--h": `${c.h}px` }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEM / SOLUTION */}
        <section id="problem">
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

        {/* CORE FEATURES */}
        <section id="features">
          <div className="wrap">
            <div className="sec-head reveal" ref={featuresRef}>
              <h2>Everything your school needs, connected.</h2>
              <p>The modules you already rely on day to day, available from one platform.</p>
            </div>
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
        <Funnel color="#4A0E22" />

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
        <section id="roles">
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

        {/* YOUR SCHOOL, YOUR IDENTITY */}
        <section id="about">
          <div className="wrap institution-section reveal" ref={institutionRef}>
            <div className="institution-copy">
              <h2>Your school. <span className="chip" aria-hidden="true" /> Your own space.</h2>
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
              <Mesh tone="maroon" />
              <div>
                <h2>Ready to move education <em>forward?</em></h2>
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
              <img src="/assets/doravo-core-lockup.png" alt="Doravo Core" />
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
   NOTES FOR NEXT STEPS
   - Privacy Policy / Terms: no routes yet, so no footer links.
   - robots.txt / sitemap.xml live alongside this file as static
     files; update the sitemap domain once production is final.
   - Real screenshots would replace the illustrative <Preview />
     mockups in the hero, spotlight and tabs.
   - No customer counts, testimonials, logos or ratings are shown
     and the JSON-LD omits aggregateRating, because none exist
     to report honestly. The barcode stats count the product's
     own modules, portals and controls.
========================================================= */