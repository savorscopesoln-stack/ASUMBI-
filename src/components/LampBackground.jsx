import React, { useEffect, useLayoutEffect, useRef } from "react";

/* =========================================================
   LAMP BACKGROUND
   Looping hero background: two spotlights aimed at a person
   reading a book. Every few seconds the book turns to show its
   "Education" cover and moves forward toward the viewer, then
   settles back. Nothing plays "once": it loops forever behind the
   hero content (no preloader, no scroll lock).

   Colours are the app's maroon palette only:
     #7A1B36 / #4A0E22 / #33091A  (maroon, deep, darkest)
     #E8A0A8 / #F3C0C6 / #FFECF1  (soft pink light)

   Built to stay smooth on phones:
     - only transform / opacity are animated (compositor only)
     - no blur filters, no SVG filters, no grain, no blend modes
     - the layer is isolated with `contain`
     - animation pauses while the hero is off screen
     - motion is switched off for prefers-reduced-motion by the
       landing page's global rule (the scene is then static)

   The beams are re-aimed at the reader on mount and on resize,
   so they hit the person on any screen shape.
   Landing.jsx defines --sceneH on .hero (scene size).
========================================================= */

const injectStyles = () => {
  if (document.getElementById("lamp-background-styles")) return;
  const el = document.createElement("style");
  el.id = "lamp-background-styles";
  el.textContent = `
    §.lb{ position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; contain:layout paint style;
      --W:clamp(560px,105vmax,1500px); --aimL:32deg; --aimR:32deg;
      background:radial-gradient(120% 90% at 50% 100%,#7A1B36 0%,#4A0E22 58%,#33091A 100%); }
    §.lb, §.lb *{ transition:none; }
    §.lb.paused *{ animation-play-state:paused; }

    /* soft light pools that drift slowly */
    §.lb-glow{ position:absolute; width:min(70vmax,1100px); height:min(70vmax,1100px); border-radius:50%;
      background:radial-gradient(circle at center,rgba(232,160,168,.30) 0,rgba(232,160,168,.10) 38%,rgba(232,160,168,0) 68%);
      will-change:transform; animation:lbDrift 22s ease-in-out infinite alternate; }
    §.lb-glow.g1{ left:-18%; top:-30%; }
    §.lb-glow.g2{ right:-22%; bottom:-42%; animation-duration:28s; animation-direction:alternate-reverse; }
    @keyframes lbDrift{ to{ transform:translate3d(10%,8%,0) scale(1.12); } }

    /* two lamps, one each side; the right one is mirrored */
    §.lb-lamp{ position:absolute; width:0; height:0; }
    §.lb-lamp.l{ left:0; top:24%; }
    §.lb-lamp.r{ right:0; top:38%; transform:scaleX(-1); }

    /* each beam is a soft cone (conic gradient) faded along its length by a static mask.
       It swings a few degrees either side of the angle that points at the reader. */
    §.lb-beam{ position:absolute; left:0; top:calc(var(--W) / -2); width:var(--W); height:var(--W);
      transform-origin:0 50%; will-change:transform;
      background:conic-gradient(from 0deg at 0 50%,
        rgba(255,236,241,0) 0deg 77deg,
        rgba(255,236,241,.46) 85deg,
        rgba(255,236,241,.46) 95deg,
        rgba(255,236,241,0) 103deg 360deg);
      -webkit-mask-image:radial-gradient(circle at 0 50%,#000 0,rgba(0,0,0,.85) 50%,rgba(0,0,0,.7) 66%,transparent 92%);
      mask-image:radial-gradient(circle at 0 50%,#000 0,rgba(0,0,0,.85) 50%,rgba(0,0,0,.7) 66%,transparent 92%); }
    §.lb-lamp.l .lb-beam{ animation:lbSwingL 7s ease-in-out infinite alternate; }
    §.lb-lamp.r .lb-beam{ animation:lbSwingR 9s ease-in-out infinite alternate; animation-delay:-3s; }
    @keyframes lbSwingL{ from{ transform:rotate(calc(var(--aimL) - 6deg)); } to{ transform:rotate(calc(var(--aimL) + 6deg)); } }
    @keyframes lbSwingR{ from{ transform:rotate(calc(var(--aimR) - 6deg)); } to{ transform:rotate(calc(var(--aimR) + 6deg)); } }

    §.lb-bulb{ position:absolute; left:-9px; top:-9px; width:18px; height:18px; border-radius:50%; background:#fff;
      box-shadow:0 0 0 8px rgba(255,236,241,.22), 0 0 34px 14px rgba(232,160,168,.6); }

    /* the reader */
    §.lb-scene{ position:absolute; left:50%; bottom:0; width:var(--sceneH,200px); height:var(--sceneH,200px); transform:translateX(-50%); }
    §.lb-pool{ position:absolute; left:-45%; right:-45%; bottom:-8%; height:62%;
      background:radial-gradient(closest-side,rgba(255,236,241,.62),rgba(232,160,168,.24) 55%,rgba(232,160,168,0));
      animation:lbPulse 4s ease-in-out infinite alternate; }
    @keyframes lbPulse{ from{ opacity:.6; } to{ opacity:1; } }
    §.lb-scene svg{ position:absolute; inset:0; width:100%; height:100%; display:block; }

    /* the book: dark back cover faces us while it is read; it turns to show "Education" and comes forward */
    §.lb-bookwrap{ position:absolute; left:50%; top:68%; width:34%; height:25%; margin:-12.5% 0 0 -17%; perspective:700px; }
    §.lb-book{ position:absolute; inset:0; transform-style:preserve-3d;
      animation:lbForward 12s cubic-bezier(.45,0,.2,1) infinite; }
    §.bk{ position:absolute; inset:0; border-radius:3px 6px 6px 3px; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
    §.bk-back{ background:linear-gradient(90deg,#33091A,#5C1731); border:1px solid rgba(243,192,198,.55); }
    §.bk-front{ transform:rotateY(180deg); background:linear-gradient(135deg,#FFF6F8,#F3C0C6); border-left:6px solid #7A1B36;
      display:flex; align-items:center; justify-content:center; text-align:center;
      font:italic 600 calc(var(--sceneH,200px) * .048)/1 'Fraunces',serif; letter-spacing:.06em; color:#4A0E22; }
    @keyframes lbForward{
      0%,16%{ transform:translate3d(0,0,0) rotateY(0deg) scale(1); }
      40%,64%{ transform:translate3d(0,-10%,0) rotateY(180deg) scale(2.3); }
      88%,100%{ transform:translate3d(0,0,0) rotateY(360deg) scale(1); }
    }

    /* keeps the headline readable where a beam crosses it */
    §.lb-shade{ position:absolute; inset:0; background:radial-gradient(90% 80% at 22% 50%,rgba(51,9,26,.38),rgba(51,9,26,0) 72%); }
    §.lb-reed{ position:absolute; inset:0; background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,rgba(0,0,0,.05) 1px 2px,transparent 2px 7px); }

    @media (max-width:700px){
      §.lb-glow.g2{ display:none; }
      §.lb-bulb{ width:14px; height:14px; left:-7px; top:-7px; box-shadow:0 0 0 6px rgba(255,236,241,.2), 0 0 24px 10px rgba(232,160,168,.55); }
      §.lb-beam{ opacity:.9; }
    }
  `.replace(/§/g, ".doravo-landing ");
  document.head.appendChild(el);
};

export default function LampBackground() {
  const ref = useRef(null);
  const sceneRef = useRef(null);

  useLayoutEffect(() => { injectStyles(); }, []);

  // Point both beams at the reader and size them to reach: runs on mount and on every resize.
  useEffect(() => {
    const root = ref.current;
    const scene = sceneRef.current;
    if (!root || !scene) return undefined;
    const aim = () => {
      const r = root.getBoundingClientRect();
      const s = scene.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const tx = s.left + s.width / 2 - r.left;
      const ty = s.top + s.height * 0.5 - r.top;
      const lamps = [
        { name: "--aimL", x: 0, y: r.height * 0.24 },
        { name: "--aimR", x: r.width, y: r.height * 0.38 },
      ];
      let reach = 0;
      lamps.forEach((l) => {
        const dx = Math.abs(tx - l.x);
        const dy = ty - l.y;
        root.style.setProperty(l.name, `${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1)}deg`);
        reach = Math.max(reach, Math.hypot(dx, dy));
      });
      root.style.setProperty("--W", `${Math.round(Math.max(560, reach * 1.35))}px`);
    };
    aim();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(aim);
      ro.observe(root);
    } else {
      window.addEventListener("resize", aim);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", aim);
    };
  }, []);

  // Pause the loop while the hero is scrolled out of view (saves battery on phones).
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => node.classList.toggle("paused", !entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lb" ref={ref} aria-hidden="true">
      <i className="lb-glow g1" />
      <i className="lb-glow g2" />
      <div className="lb-lamp l"><span className="lb-beam" /><span className="lb-bulb" /></div>
      <div className="lb-lamp r"><span className="lb-beam" /><span className="lb-bulb" /></div>

      <div className="lb-scene" ref={sceneRef}>
        <div className="lb-pool" />
        <svg viewBox="0 0 200 200" role="presentation">
          {/* chair back, shoulders and head as a lit silhouette */}
          <rect x="56" y="64" width="88" height="130" rx="12" fill="#2A0716" />
          <path d="M58 200 C54 150 64 116 100 108 C136 116 146 150 142 200 Z" fill="#1A040E" />
          <rect x="93" y="92" width="14" height="18" rx="5" fill="#1A040E" />
          <circle cx="100" cy="78" r="17" fill="#1A040E" />
          {/* rim light from the two lamps */}
          <path d="M84 70 C86 58 96 54 104 56" fill="none" stroke="#FFECF1" strokeOpacity=".65" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M116 72 C115 62 110 58 106 57" fill="none" stroke="#F3C0C6" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M62 150 C60 132 68 118 82 112" fill="none" stroke="#FFECF1" strokeOpacity=".4" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M138 150 C140 132 132 118 118 112" fill="none" stroke="#F3C0C6" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
          {/* arms reaching the book */}
          <path d="M70 118 Q56 138 76 152" fill="none" stroke="#1A040E" strokeWidth="13" strokeLinecap="round" />
          <path d="M130 118 Q144 138 124 152" fill="none" stroke="#1A040E" strokeWidth="13" strokeLinecap="round" />
        </svg>
        <div className="lb-bookwrap">
          <div className="lb-book">
            <div className="bk bk-back" />
            <div className="bk bk-front">EDUCATION</div>
          </div>
        </div>
      </div>

      <div className="lb-shade" />
      <div className="lb-reed" />
    </div>
  );
}
