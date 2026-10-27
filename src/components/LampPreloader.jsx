import React, { useLayoutEffect } from "react";

/* =========================================================
   LAMP REVEAL
   Two lamps sweep their beams onto a figure at a desk while a
   serif percentage counts up. At 100% the scene flashes to
   peach-white, an orange reeded-glass layer settles, and the
   hero text pulls into focus (driven by .lamp-on / .lamp-off
   on the .doravo-landing root).

   Props
     pct     0-100 counter value (owned by Landing)
     loaded  true once the reveal should hand over to the page
========================================================= */

const injectLampStyles = () => {
  if (document.getElementById("lamp-preloader-styles")) return;
  const el = document.createElement("style");
  el.id = "lamp-preloader-styles";
  el.textContent = `
    §.lp{ position:fixed; inset:0; z-index:200; overflow:hidden; background:#120403; --p:0;
      transition:opacity .9s ease .5s, visibility 0s 1.4s; }
    §.lp.out{ opacity:0; visibility:hidden; pointer-events:none; }
    §.lp-scene{ position:absolute; inset:0; transform-origin:50% 62%; transition:transform .7s cubic-bezier(.16,1,.3,1); }
    §.lp.flash .lp-scene, §.lp.out .lp-scene{ transform:scale(1.14); }
    §.lp svg{ position:absolute; inset:0; width:100%; height:100%; display:block; }

    /* beams: brightness follows the counter */
    §.lp-cone{ opacity:calc(.38 + var(--p) * .62); mix-blend-mode:screen; }
    §.lp-bob{ animation:lpBob 5.2s ease-in-out infinite alternate; }
    §.lp-sw{ transform-origin:0 0; animation:lpSwing 3.6s ease-in-out infinite alternate; }
    §.lp-r .lp-bob{ animation-duration:6.4s; animation-delay:-2s; }
    §.lp-r .lp-sw{ animation-duration:4.4s; animation-delay:-1.3s; }
    @keyframes lpBob{ from{ transform:translateY(-70px); } to{ transform:translateY(80px); } }
    @keyframes lpSwing{ from{ transform:rotate(6deg); } to{ transform:rotate(40deg); } }

    /* silhouette shades and their glowing slits */
    §.lp-eyes{ animation:lpEyes 5.5s ease-in-out infinite alternate; }
    §.lp-eyes.r{ animation-duration:7s; animation-delay:-2.5s; }
    §.lp-slit{ transform-box:fill-box; transform-origin:50% 50%; animation:lpBlink 4.2s ease-in-out infinite; }
    @keyframes lpEyes{ from{ transform:translate(-26px,-16px); } to{ transform:translate(30px,22px); } }
    @keyframes lpBlink{ 0%,86%,100%{ transform:scaleY(1); } 92%{ transform:scaleY(.12); } }

    §.lp-grain{ mix-blend-mode:overlay; opacity:.22; animation:lpGrain .5s steps(3) infinite; }
    @keyframes lpGrain{ 0%{ transform:translate(0,0); } 33%{ transform:translate(-14px,9px); } 66%{ transform:translate(11px,-12px); } 100%{ transform:translate(0,0); } }
    §.lp-vig{ position:absolute; inset:0; pointer-events:none; background:radial-gradient(120% 90% at 50% 60%, transparent 45%, rgba(0,0,0,.55) 100%); }

    §.lp-count{ position:absolute; right:clamp(20px,4vw,48px); bottom:clamp(14px,3vw,36px);
      font:italic 400 clamp(56px,9vw,120px)/1 'Fraunces',serif; color:#fff; text-shadow:0 0 40px rgba(255,170,140,.45); }

    /* flash and reeded glass */
    §.lp-reed{ position:absolute; inset:0; opacity:0; transform:scaleX(1.22); background:
        repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 1px,rgba(0,0,0,.09) 1px 2px,transparent 2px 7px),
        radial-gradient(90% 90% at 50% 55%,#e5481c,#c9432b 70%,#a82c34); }
    §.lp.flash .lp-reed, §.lp.out .lp-reed{ opacity:1; transition:opacity .01s .4s; }
    §.lp.out .lp-reed{ transform:scaleX(1); transition:transform 1.3s cubic-bezier(.16,1,.3,1), opacity .01s; }
    §.lp-flash{ position:absolute; inset:0; opacity:0; pointer-events:none;
      background:radial-gradient(circle at 50% 62%,#fff 0,#ffe3d6 38%,#ffb49b 100%); transition:opacity .45s ease; }
    §.lp.flash .lp-flash{ opacity:1; }
    §.lp.out .lp-flash{ opacity:0; transition:opacity .7s ease .1s; }

    /* hero choreography once the lamp hands over */
    §.lamp-off .hero .eyebrow, §.lamp-off .hero h1, §.lamp-off .hero .lede,
    §.lamp-off .hero .hero-ctas, §.lamp-off .hero .hero-contact, §.lamp-off .hero .hero-note{
      opacity:0; transform:translateY(28px); filter:blur(14px); }
    §.lamp-off header{ opacity:0; transform:translateY(-14px); }
    §.lamp-off .hero .mesh{ transform:scale(1.35); }
    §.lamp-on .hero .eyebrow, §.lamp-on .hero h1, §.lamp-on .hero .lede,
    §.lamp-on .hero .hero-ctas, §.lamp-on .hero .hero-contact, §.lamp-on .hero .hero-note{
      transition:opacity 1.1s var(--ease), transform 1.1s var(--ease), filter 1.1s var(--ease); }
    §.lamp-on .hero .eyebrow{ transition-delay:.35s; }
    §.lamp-on .hero h1{ transition-delay:.5s; }
    §.lamp-on .hero .lede{ transition-delay:.75s; }
    §.lamp-on .hero .hero-ctas{ transition-delay:.9s; }
    §.lamp-on .hero .hero-contact{ transition-delay:1s; }
    §.lamp-on .hero .hero-note{ transition-delay:1.1s; }
    §.lamp-on header{ transition:opacity .9s ease .6s, transform .9s var(--ease) .6s; }
    §.lamp-on .hero .mesh{ transition:transform 2.4s var(--ease); }

    @media (prefers-reduced-motion: reduce){
      §.lp, §.lp *{ animation:none !important; transition:none !important; }
    }
  `.replace(/§/g, ".doravo-landing ");
  document.head.appendChild(el);
};

/* leaf-shaped glowing slit */
const SLIT = "M0 0 C30 -16 72 -16 100 -2 C68 10 28 12 0 0Z";

const Lamp = ({ x, y, flip, cls }) => (
  <g transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`} className={cls}>
    <g className="lp-bob">
      <g className="lp-sw">
        <g className="lp-cone">
          <polygon points="0,-16 1100,-300 1100,300 0,16" fill="url(#lpCone)" filter="url(#lpBlur)" />
          <polygon points="0,-10 900,-120 900,120 0,10" fill="url(#lpCone)" opacity=".7" />
        </g>
      </g>
      <circle r="58" fill="#ffb59b" opacity=".55" filter="url(#lpGlow)" />
      <circle r="21" fill="#fff" />
    </g>
  </g>
);

const Shade = ({ x, y, r }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className={`lp-eyes ${r ? "r" : ""}`}>
      <ellipse cx="60" cy="-10" rx="170" ry="120" fill="#1c0907" opacity=".85" filter="url(#lpBlur)" />
      <g filter="url(#lpGlow2)">
        <path className="lp-slit" d={SLIT} fill="#fff" transform="translate(-10 14)" />
        <path className="lp-slit" d={SLIT} fill="#fff" transform="translate(98 8) scale(.8)" />
      </g>
    </g>
  </g>
);

export default function LampPreloader({ pct = 0, loaded = false }) {
  useLayoutEffect(() => { injectLampStyles(); }, []);

  const phase = loaded ? "out" : pct >= 100 ? "flash" : "run";

  return (
    <div className={`lp ${phase}`} style={{ "--p": Math.min(1, pct / 100) }} aria-hidden="true">
      <div className="lp-scene">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="lpBg" cx="50%" cy="64%" r="78%">
              <stop offset="0" stopColor="#5a1a12" />
              <stop offset=".55" stopColor="#2a0b08" />
              <stop offset="1" stopColor="#120403" />
            </radialGradient>
            <linearGradient id="lpCone" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff2ea" stopOpacity=".95" />
              <stop offset=".45" stopColor="#ffb9a0" stopOpacity=".5" />
              <stop offset="1" stopColor="#ff8a6a" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="lpFloor" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#ffb9a0" stopOpacity=".5" />
              <stop offset="1" stopColor="#ffb9a0" stopOpacity="0" />
            </radialGradient>
            <filter id="lpBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
            <filter id="lpGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="16" /></filter>
            <filter id="lpGlow2" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3" /></filter>
            <filter id="lpNoise" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>

          <rect width="1600" height="900" fill="url(#lpBg)" />
          <ellipse cx="800" cy="672" rx="420" ry="60" fill="url(#lpFloor)" />

          {/* desk, chair and the seated figure */}
          <ellipse cx="800" cy="676" rx="150" ry="11" fill="#0c0302" opacity=".8" />
          <g fill="#f1c3ae">
            <rect x="706" y="590" width="196" height="8" rx="2" />
            <rect x="714" y="598" width="6" height="74" />
            <rect x="888" y="598" width="6" height="74" />
            <rect x="692" y="548" width="7" height="62" rx="2" />
            <rect x="692" y="608" width="52" height="6" rx="2" />
            <rect x="710" y="614" width="5" height="58" />
            <circle cx="752" cy="546" r="12" />
            <path d="M742 560 C738 580 738 596 742 608 L760 608 C764 592 762 574 758 560Z" />
            <path d="M756 572 L798 584 L798 590 L752 582Z" />
          </g>
          <rect x="820" y="582" width="26" height="8" rx="2" fill="#fff" opacity=".85" />

          <Shade x={150} y={120} />
          <Shade x={1330} y={110} r />
          <Lamp x={160} y={330} cls="lp-l" />
          <Lamp x={1450} y={300} flip cls="lp-r" />

          <rect className="lp-grain" x="-40" y="-40" width="1680" height="980" filter="url(#lpNoise)" />
        </svg>
        <div className="lp-vig" />
      </div>
      <div className="lp-reed" />
      <div className="lp-flash" />
      <div className="lp-count">{pct}%</div>
    </div>
  );
}
