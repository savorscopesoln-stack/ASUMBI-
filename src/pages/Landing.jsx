import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChatAssistant, { WaIcon } from "../components/ChatAssistant";
import { SITE, waLink } from "../config/site";

/* Doravo Core landing, remade after the "Orbid" reference video:
   preloader counter -> drifting reeded-glass gradient hero -> funnel bars
   -> black serif sections -> barcode stats -> white closing sections.
   Copy, SEO, sign-in routing, FAQ and WhatsApp links are unchanged. */

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


const injectStyles = () => {
  if (document.getElementById("landing-tokens")) return;
  const el = document.createElement("style");
  el.id = "landing-tokens";
  el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600&display=swap');
.dv{--ink:#0a0a0a;--paper:#fff;--maroon:#7A1B36;--ember:#d8452b;--rose:#e8896f;--lilac:#b9a6ec;--mute:rgba(255,255,255,.62);
 margin:0;background:var(--ink);color:var(--paper);font:400 15px/1.55 'Inter Tight',sans-serif;-webkit-font-smoothing:antialiased;scroll-behavior:smooth;overflow-x:clip}
.dv *{box-sizing:border-box}.dv h1,.dv h2,.dv h3,.dv .serif{font-family:'Instrument Serif',serif;font-weight:400;margin:0;letter-spacing:-.01em;line-height:1}
.dv p{margin:0}:where(.dv a){color:inherit}.dv img{display:block;max-width:100%}.dv em{font-style:italic}
.dv :focus-visible{outline:2px solid var(--lilac);outline-offset:3px}
.dv .wrap{max-width:1240px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
/* preloader */
.dv-pre{position:fixed;inset:0;z-index:200;background:radial-gradient(120% 90% at 70% 60%,#6b1d1a,#2a0a0a 60%,#160505);overflow:hidden;transition:transform .9s cubic-bezier(.76,0,.24,1)}
.dv-pre.done{transform:translateY(-100%)}
.dv-beam{position:absolute;width:42vmax;height:18vmax;background:linear-gradient(90deg,rgba(255,170,150,.85),rgba(255,120,100,0) 80%);filter:blur(2px);transform-origin:0 50%}
.dv-beam::after{content:"";position:absolute;left:-14px;top:50%;width:28px;height:28px;margin-top:-14px;border-radius:50%;background:#fff;box-shadow:0 0 40px 14px rgba(255,200,180,.8)}
.dv-beam.a{left:16%;top:42%;clip-path:polygon(0 48%,100% 0,100% 100%,0 52%);transform:rotate(18deg);animation:beamA 3s ease-in-out infinite alternate}
.dv-beam.b{left:84%;top:34%;clip-path:polygon(0 48%,100% 0,100% 100%,0 52%);transform:rotate(160deg);animation:beamB 3s ease-in-out infinite alternate}
@keyframes beamA{to{transform:rotate(30deg)}}@keyframes beamB{to{transform:rotate(148deg)}}
.dv-desk{position:absolute;left:48%;bottom:24%;width:120px;height:4px;background:#1a0505;box-shadow:0 30px 0 -1px #1a0505}
.dv-count{position:absolute;right:clamp(20px,4vw,48px);bottom:clamp(14px,3vw,36px);font:italic 400 clamp(56px,9vw,120px)/1 'Instrument Serif',serif;color:#fff}
/* nav */
.dv-nav{position:fixed;top:14px;left:0;right:0;z-index:60;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(14px,2.4vw,32px);pointer-events:none}
.dv-nav>*{pointer-events:auto}
.dv-chip{background:#fff;color:#111;border-radius:7px;padding:7px 12px;display:flex;align-items:center;gap:8px;text-decoration:none;font:600 14px 'Inter Tight'}
.dv-chip img{height:20px;width:auto}
.dv-pill{display:flex;gap:4px;background:#fff;border-radius:9px;padding:5px}
.dv-pill a{color:#111;text-decoration:none;font-size:13px;font-weight:500;padding:6px 12px;border-radius:6px;transition:background .2s}
.dv-pill a:hover{background:#eee}
.dv-right{display:flex;gap:8px;align-items:center}
.dv-btn{display:inline-flex;align-items:center;gap:8px;background:#0a0a0a;color:#fff;text-decoration:none;font:500 13px 'Inter Tight';padding:11px 18px;border-radius:8px;border:0;cursor:pointer;transition:transform .2s,background .2s}
.dv-btn:hover{transform:translateY(-1px);background:#222}
.dv-nav .dv-btn:not(.light){box-shadow:0 0 0 1px rgba(255,255,255,.28)}
.dv-btn.light{background:#fff;color:#111}.dv-btn.light:hover{background:#eee}
.dv-btn.line{background:transparent;border:1px solid currentColor;color:inherit}
.dv-btn svg{width:13px;height:13px}
.dv-burger{display:none;background:#fff;color:#111;border:0;border-radius:7px;width:38px;height:38px;align-items:center;justify-content:center;cursor:pointer}
.dv-burger svg{width:18px;height:18px}
@media(max-width:900px){.dv-pill{display:none}.dv-burger{display:flex}.dv-right .dv-signin{display:none}}
/* hero */
.dv-hero{position:relative;min-height:100svh;display:flex;align-items:flex-end;justify-content:center;text-align:center;padding:120px 20px 12vh;overflow:hidden;background:#c9432b}
.dv-mesh{position:absolute;inset:-20%;filter:blur(30px);animation:hue 28s ease-in-out infinite alternate}
.dv-mesh i{position:absolute;border-radius:50%}
.dv-mesh i:nth-child(1){width:60%;height:70%;left:-5%;top:20%;background:#f08a4b;animation:drift 18s ease-in-out infinite alternate}
.dv-mesh i:nth-child(2){width:50%;height:60%;right:-5%;bottom:-10%;background:#e5481c;animation:drift 22s ease-in-out infinite alternate-reverse}
.dv-mesh i:nth-child(3){width:45%;height:50%;left:30%;top:-10%;background:#a82c34;animation:drift 25s ease-in-out infinite alternate}
@keyframes drift{to{transform:translate(12%,-10%) scale(1.15)}}
@keyframes hue{0%{filter:blur(30px) hue-rotate(0)}100%{filter:blur(30px) hue-rotate(-62deg) saturate(.8) brightness(1.25)}}
.dv-reed{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.1) 0 1px,rgba(0,0,0,.07) 1px 2px,transparent 2px 7px);mix-blend-mode:overlay;pointer-events:none}
.dv-hero-in{position:relative;color:#111;max-width:860px}
.dv-hero h1{font-size:clamp(44px,7.4vw,98px);line-height:.95;color:#0a0a0a}
.dv-hero p.lede{max-width:52ch;margin:22px auto 26px;font-size:15px;color:#1a0a08}
.dv-hero .acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.dv-hero .btn-ghost{color:#111}
.dv-hero .mail{margin-top:16px;font-size:13px;color:#2a1411}
/* funnel */
.dv-funnel{background:var(--ink);padding:0 0 4px;margin-top:-1px}
.dv-funnel div{height:12px;margin:0 auto 6px;border-radius:3px;background:#d9d2f6;transform:scaleX(0);transition:transform .9s cubic-bezier(.16,1,.3,1)}
.dv-funnel.in div{transform:scaleX(1)}
.dv-funnel.alt{background:#fff}.dv-funnel.alt div{background:#0a0a0a}
/* dark sections */
.dv-sec{padding:clamp(80px,12vw,160px) 0;position:relative}
.dv-big{font-size:clamp(48px,8.4vw,120px);line-height:.98;text-align:center}
.dv-big .chip{display:inline-block;width:1.7em;height:.62em;border-radius:6px;vertical-align:middle;margin:0 .12em;background:linear-gradient(110deg,#7A1B36,#e5481c,#f08a4b,#b9a6ec);background-size:200% 100%;animation:chip 8s linear infinite alternate}@keyframes chip{to{background-position:100% 0}}
.dv-about-grid{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:40px;margin-top:80px;align-items:start}
.dv-about-grid .tag{font-size:12px;letter-spacing:.04em;color:var(--mute)}
.dv-about-grid p{color:var(--mute);font-size:14px;max-width:44ch}
.dv-about-grid p+p{margin-top:14px}
@media(max-width:860px){.dv-about-grid{grid-template-columns:1fr;gap:24px;margin-top:48px}}
/* features */
.dv-svc{background:radial-gradient(90% 60% at 50% 0,#3b0f1f,#0a0a0a 70%)}
.dv-h2{font-size:clamp(40px,6vw,84px);text-align:center;max-width:14ch;margin:0 auto}
.dv-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:80px;align-items:start}
.dv-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:22px;backdrop-filter:blur(6px)}
.dv-card:nth-child(4n+2){margin-top:44px}.dv-card:nth-child(4n+3){margin-top:88px}.dv-card:nth-child(4n){margin-top:132px}
.dv-card .fi svg{width:22px;height:22px;color:var(--rose)}
.dv-card h3{font-size:26px;margin:18px 0 10px;line-height:1.05}
.dv-card .pr{font-size:12.5px;color:var(--rose);margin-bottom:8px}
.dv-card p{font-size:13.5px;color:var(--mute)}
@media(max-width:980px){.dv-cards{grid-template-columns:repeat(2,1fr)}.dv-card:nth-child(n){margin-top:0}.dv-card:nth-child(2n){margin-top:36px}}
@media(max-width:560px){.dv-cards{grid-template-columns:1fr}.dv-card:nth-child(n){margin-top:0}}
/* stats */
.dv-stat-head{display:flex;justify-content:space-between;gap:40px;align-items:flex-start;flex-wrap:wrap}
.dv-stat-head h2{font-size:clamp(48px,8vw,116px)}.dv-stat-head p{max-width:34ch;color:var(--mute);font-size:13.5px}
.dv-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:70px;align-items:end;min-height:380px}
.dv-bar .n{font:400 clamp(30px,3.4vw,46px)/1 'Instrument Serif',serif}.dv-bar b{display:block;font-weight:600;font-size:13px;margin-top:6px}.dv-bar span.s{font-size:12px;color:var(--mute)}
.dv-code{margin-top:14px;height:var(--h);background:repeating-linear-gradient(90deg,#fff 0 3px,transparent 3px 7px);clip-path:inset(100% 0 0 0);transition:clip-path 1.1s cubic-bezier(.16,1,.3,1)}
.dv-bars.in .dv-code{clip-path:inset(0)}
@media(max-width:700px){.dv-bars{grid-template-columns:repeat(2,1fr);gap:30px 12px}}
/* steps / light sections */
.dv-light{background:#fff;color:#0a0a0a}
.dv-light .dv-h2,.dv-light h2{color:#0a0a0a}
.dv-light .sub{text-align:center;color:#555;max-width:48ch;margin:18px auto 0}
.dv-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:64px;align-items:start}
.dv-step{border-top:2px solid #0a0a0a;padding-top:14px}
.dv-step:nth-child(even){margin-top:40px}
.dv-step h3{font-size:26px;margin-bottom:8px;line-height:1.05}.dv-step p{font-size:13px;color:#555}
@media(max-width:900px){.dv-steps{grid-template-columns:1fr}.dv-step:nth-child(n){margin-top:0}}
.dv-roles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:64px}
.dv-role{border:1px solid #ddd;border-radius:8px;padding:18px}.dv-role h3{font-size:24px;margin-bottom:8px;line-height:1.05}.dv-role p{font-size:13px;color:#555}
@media(max-width:980px){.dv-roles{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.dv-roles{grid-template-columns:1fr}}
.dv-trust{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin-top:64px}
.dv-trust h3{font-size:28px;margin-bottom:10px;line-height:1.05}.dv-trust p{font-size:13.5px;color:var(--mute)}
@media(max-width:860px){.dv-trust{grid-template-columns:1fr 1fr}}
.dv-how{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:64px}
.dv-how .n{font:italic 400 64px/1 'Instrument Serif',serif}.dv-how h3{font-size:28px;margin:12px 0 8px;line-height:1.05}.dv-how p{font-size:14px;color:#555}
@media(max-width:760px){.dv-how{grid-template-columns:1fr}}
/* faq */
.dv-faq{max-width:780px;margin:56px auto 0}
.dv-q{border-top:1px solid #ddd}.dv-q:last-child{border-bottom:1px solid #ddd}
.dv-q button{width:100%;text-align:left;background:none;border:0;padding:22px 0;font:400 28px/1.1 'Instrument Serif',serif;display:flex;justify-content:space-between;gap:16px;cursor:pointer;color:#0a0a0a}
.dv-q .a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}.dv-q.open .a{grid-template-rows:1fr}
.dv-q .a>div{overflow:hidden}.dv-q .a p{padding-bottom:22px;color:#555;max-width:62ch}
.dv-q .pl{transition:transform .3s}.dv-q.open .pl{transform:rotate(45deg)}
/* cta + footer */
.dv-cta{position:relative;text-align:center;overflow:hidden;background:#c9432b;color:#0a0a0a;padding:clamp(90px,14vw,180px) 20px}
.dv-cta .dv-mesh{animation-duration:22s}.dv-cta>div:last-child{position:relative}
.dv-cta h2{font-size:clamp(44px,7vw,100px);max-width:13ch;margin:0 auto 24px}.dv-cta p{max-width:46ch;margin:0 auto 28px}
.dv-foot{background:#0a0a0a;padding:64px 0 28px}
.dv-foot-grid{display:grid;grid-template-columns:1.4fr 2fr;gap:40px}
.dv-foot p{color:var(--mute);font-size:13px;max-width:36ch;margin-top:14px}
.dv-fcols{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.dv-fcols h5{margin:0 0 12px;font-size:12px;color:var(--mute);font-weight:500}.dv-fcols a{display:block;text-decoration:none;font-size:13.5px;padding:4px 0;color:#fff}.dv-fcols a:hover{color:var(--rose)}
.dv-fbot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;color:var(--mute)}
@media(max-width:760px){.dv-foot-grid,.dv-fcols{grid-template-columns:1fr}}
/* drawer */
.dv-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .3s;z-index:90}.dv-ov.open{opacity:1;pointer-events:auto}
.dv-dr{position:fixed;top:0;left:0;bottom:0;width:min(86vw,360px);background:#0a0a0a;z-index:100;transform:translateX(-100%);transition:transform .35s cubic-bezier(.16,1,.3,1);padding:20px;display:flex;flex-direction:column;gap:18px;overflow:auto}
.dv-dr.open{transform:none}.dv-dr h2{font:500 12px 'Inter Tight';color:var(--mute);margin:14px 0 6px}
.dv-dr a{display:block;text-decoration:none;padding:7px 0;font:400 26px 'Instrument Serif',serif}
.dv-dr .top{display:flex;justify-content:space-between;align-items:center}
.dv-dr .top button{background:none;border:0;color:#fff;cursor:pointer;width:36px;height:36px}
.dv-dr .foot{margin-top:auto;display:flex;flex-direction:column;gap:10px}
.dv-dr .foot a{font:500 14px 'Inter Tight';text-align:center}
.dv-wa{position:fixed;right:18px;bottom:18px;z-index:70;width:52px;height:52px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.dv-wa svg{width:26px;height:26px}
.dv .reveal{opacity:0;transform:translateY(14px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}.dv .reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.dv *{animation:none!important;transition:none!important}.dv .reveal{opacity:1;transform:none}.dv-funnel div{transform:none}.dv-code{clip-path:none}}
`;
  document.head.appendChild(el);
};

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg>
);

const Mesh = () => (<><div className="dv-mesh" aria-hidden="true"><i /><i /><i /></div><div className="dv-reed" aria-hidden="true" /></>);

/* Tapered bars that draw in when scrolled to, as in the reference. */
const Funnel = ({ alt }) => {
  const ref = useReveal();
  return (
    <div className={`dv-funnel ${alt ? "alt" : ""}`} ref={ref} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{ width: `${96 - i * 6.6}%`, height: Math.max(2, 12 - i * 0.8), transitionDelay: `${i * 45}ms` }} />
      ))}
    </div>
  );
};

/* Honest "stats": counts that come from the product's own content, not invented figures. */
const COUNTS = [
  { n: FEATURES.length, label: "Connected modules", sub: "Students to school administration", h: 120 },
  { n: ROLES.length, label: "Role-based portals", sub: "Each person sees their own", h: 200 },
  { n: TRUST.length, label: "Access controls", sub: "Passkeys, one device per exam", h: 280 },
  { n: 1, label: "Platform", sub: "One workspace for your school", h: 340 },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [skipPre] = useState(() => typeof window === "undefined" || !!(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || sessionStorage.getItem("dv-pre")));
  const [pct, setPct] = useState(skipPre ? 100 : 0);
  const [loaded, setLoaded] = useState(skipPre);
  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const barsRef = useReveal();
  const aboutRef = useReveal();
  const gridRef = useReveal();
  const svcRef = useReveal();
  const stepsRef = useReveal();
  const faqRef = useReveal();

  useEffect(() => { injectStyles(); injectSEO(); }, []);

  // Preloader: counts to 100 once per session, then lifts away.
  useEffect(() => {
    if (skipPre) return undefined;
    document.body.style.overflow = "hidden";
    const start = performance.now(); let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 2600);
      setPct(Math.round(p * p * (3 - 2 * p) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => { setLoaded(true); document.body.style.overflow = ""; sessionStorage.setItem("dv-pre", "1"); }, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = ""; };
  }, [skipPre]);

  // Side menu: scroll lock, focus, Tab trap, Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const ft = setTimeout(() => closeBtnRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") { setMenuOpen(false); menuBtnRef.current?.focus(); return; }
      if (e.key === "Tab" && drawerRef.current) {
        const f = drawerRef.current.querySelectorAll("a[href], button:not([disabled])");
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(ft); document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const closeAndFocus = () => { setMenuOpen(false); menuBtnRef.current?.focus(); };

  return (
    <div className="dv">
      <div className={`dv-pre ${loaded ? "done" : ""}`} aria-hidden="true">
        <div className="dv-beam a" /><div className="dv-beam b" /><div className="dv-desk" />
        <div className="dv-count">{pct}%</div>
      </div>

      <header className="dv-nav">
        <div style={{ display: "flex", gap: 8 }}>
          <button ref={menuBtnRef} type="button" className="dv-burger" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <a className="dv-chip" href="#top"><img src="/assets/doravo-icon.png" alt="Doravo Core" /></a>
        </div>
        <nav className="dv-pill" aria-label="Primary">
          <a href="#features">Features</a><a href="#e-assessments">E-exams</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><a href="#contact">Contact</a>
        </nav>
        <div className="dv-right">
          <SignInLink className="dv-btn light dv-signin">Sign In</SignInLink>
          <a className="dv-btn" href={WA_URL} target="_blank" rel="noopener noreferrer">Request a demo <Arrow /></a>
        </div>
      </header>

      <div className={`dv-ov ${menuOpen ? "open" : ""}`} onClick={closeAndFocus} aria-hidden="true" />
      <aside id="site-menu" ref={drawerRef} className={`dv-dr ${menuOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Site menu" aria-hidden={!menuOpen}>
        <div className="top">
          <span className="serif" style={{ fontSize: 26 }}>Doravo Core</span>
          <button ref={closeBtnRef} type="button" aria-label="Close menu" onClick={closeAndFocus}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <nav aria-label="Site menu">
          {MENU_GROUPS.map((g) => (
            <div key={g.title}><h2>{g.title}</h2>{g.links.map(([l, h]) => <a key={h} href={h} onClick={closeMenu}>{l}</a>)}</div>
          ))}
        </nav>
        <div className="foot">
          <SignInLink className="dv-btn line" onClick={closeMenu}>Sign In</SignInLink>
          <a className="dv-btn light" href={WA_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>Request a demo</a>
        </div>
      </aside>

      <main id="top">
        <section className="dv-hero">
          <Mesh />
          <div className="dv-hero-in">
            <h1>Run your school and your exams from <em>one platform</em></h1>
            <p className="lede">Doravo Core brings students, staff, attendance, fees and school operations together with online assessments and e-exams, so your team stops juggling spreadsheets and paper.</p>
            <div className="acts">
              <a className="dv-btn" href={WA_URL} target="_blank" rel="noopener noreferrer"><WaIcon /> Request a demo on WhatsApp</a>
              <a className="dv-btn line btn-ghost" href="#about">See how it works</a>
            </div>
            <p className="mail">Or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </div>
        </section>
        <Funnel />

        <section className="dv-sec" id="about">
          <div className="wrap" ref={aboutRef}>
            <h2 className="dv-big">Your school.<br /><em>Your</em> <span className="chip" aria-hidden="true" /> own space</h2>
            <div className="dv-about-grid reveal" ref={gridRef}>
              <div className="tag">Why Doravo Core</div>
              <div className="tag">Built for school teams</div>
              <div>
                <p>Running a school shouldn't feel fragmented. Students, staff, assessments, attendance and communication share one connected workspace.</p>
                <p>Your logo, colours and report cards appear across your login screen, portals and printed documents. School groups get a dedicated workspace per campus.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="dv-sec dv-svc" id="features">
          <div className="wrap">
            <h2 className="dv-h2 reveal" ref={svcRef}>Everything your school needs, <em>connected</em></h2>
            <div className="dv-cards">
              {FEATURES.map((f) => (
                <article className="dv-card" key={f.title}>
                  <div className="fi">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p className="pr">{f.problem}</p>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dv-sec" id="platform">
          <div className="wrap">
            <div className="dv-stat-head">
              <h2>One platform, <em>every role</em></h2>
              <p>Built around the people who run a school: principals, registrars, examinations officers, bursars and ICT administrators.</p>
              <a className="dv-btn light" href={WA_URL} target="_blank" rel="noopener noreferrer">Request a demo <Arrow /></a>
            </div>
            <div className="dv-bars" ref={barsRef}>
              {COUNTS.map((c) => (
                <div className="dv-bar" key={c.label}>
                  <div className="n">{c.n}</div><b>{c.label}</b><span className="s">{c.sub}</span>
                  <div className="dv-code" style={{ "--h": `${c.h}px` }} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <Funnel alt />

        <section className="dv-sec dv-light" id="e-assessments">
          <div className="wrap" ref={stepsRef}>
            <h2 className="dv-h2" style={{ maxWidth: "16ch" }}>E-assessments, from setting to <em>results</em></h2>
            <p className="sub">Run timed online exams without losing control of how they are sat or marked.</p>
            <div className="dv-steps">
              {SPOT_STEPS.map((s) => (<div className="dv-step" key={s.title}><h3>{s.title}</h3><p>{s.copy}</p></div>))}
            </div>
            <h2 className="dv-h2" style={{ marginTop: 140, maxWidth: "16ch" }}>Built for everyone at <em>your school</em></h2>
            <div className="dv-roles">
              {ROLES.map((r) => (<div className="dv-role" key={r.tag}><h3>{r.tag}</h3><p>{r.copy}</p></div>))}
            </div>
          </div>
        </section>

        <section className="dv-sec" id="trust">
          <div className="wrap">
            <h2 className="dv-h2">Built with <em>control</em> in mind</h2>
            <div className="dv-trust">
              {TRUST.map((t) => (<div key={t.title}><h3>{t.title}</h3><p>{t.copy}</p></div>))}
            </div>
          </div>
        </section>

        <section className="dv-sec dv-light" id="how-it-works">
          <div className="wrap">
            <h2 className="dv-h2">From first message to <em>live school</em></h2>
            <div className="dv-how">
              {HOW_STEPS.map((s) => (<div key={s.n}><div className="n">{s.n}</div><h3>{s.title}</h3><p>{s.copy}</p></div>))}
            </div>
            <div id="faq" style={{ paddingTop: 120 }}>
              <h2 className="dv-h2" ref={faqRef}>Frequently asked <em>questions</em></h2>
              <div className="dv-faq">
                {FAQS.map((f, i) => (
                  <div className={`dv-q ${openFaq === i ? "open" : ""}`} key={f.q}>
                    <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>{f.q}<span className="pl" aria-hidden="true">+</span></button>
                    <div className="a" role="region"><div><p>{f.a}</p></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="dv-cta" id="contact">
          <Mesh />
          <div>
            <h2>Ready to move education <em>forward?</em></h2>
            <p>See how Doravo Core can bring your school's academic and administrative operations together.</p>
            <a className="dv-btn" href={WA_URL} target="_blank" rel="noopener noreferrer"><WaIcon /> Request a demo on WhatsApp</a>
            <p style={{ marginTop: 16, fontSize: 13 }}>Prefer email? <a href={`mailto:${CONTACT_EMAIL}?subject=Doravo%20Core%20demo%20request`}>{CONTACT_EMAIL}</a></p>
          </div>
        </section>
      </main>

      <footer className="dv-foot">
        <div className="wrap">
          <div className="dv-foot-grid">
            <div>
              <img src="/assets/doravo-core-lockup.png" alt="Doravo Core" style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }} />
              <p>Education management software for schools, built so each one keeps its own identity, with room to add campuses later.</p>
            </div>
            <div className="dv-fcols">
              <div><h5>Platform</h5><a href="#platform">Why Doravo Core</a><a href="#features">Features</a><a href="#e-assessments">E-assessments</a></div>
              <div><h5>Company</h5><a href="#about">About</a><a href="#faq">FAQ</a><a href="#contact">Contact</a><a href={WA_URL} target="_blank" rel="noopener noreferrer">WhatsApp {SITE.whatsappDisplay}</a><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
              <div><h5>Account</h5><SignInLink>Sign In</SignInLink></div>
            </div>
          </div>
          <div className="dv-fbot"><span>&copy; 2026 Doravo. All rights reserved.</span><span>Moving Education Forward</span></div>
        </div>
      </footer>

      <a className="dv-wa" href={WA_URL} target="_blank" rel="noopener noreferrer" aria-label="Request a demo on WhatsApp"><WaIcon /></a>
      <ChatAssistant />
    </div>
  );
}