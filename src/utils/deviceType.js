import { useEffect, useState } from "react";

/* Marking is only allowed on laptops, PCs and MacBooks.
   Anything that is a phone or tablet (iPhone, iPad, Android) is blocked.

   Detection is layered so "Request Desktop Website" doesn't bypass it:
   1. User-Agent says Android / iPhone / iPad / iPod / Mobile
   2. userAgentData.mobile (Chromium)
   3. iPadOS in desktop mode: reports a Mac UA but has a touch screen
      (a real MacBook has maxTouchPoints === 0)
   4. Touch-only device: primary pointer is coarse and no mouse/trackpad
      exists (Android "desktop site" mode)
   5. Small touch screen (fallback, the old rule)
   Touch-screen Windows laptops are fine: they also have a fine pointer. */

const SMALL_TOUCH_QUERY = "(pointer: coarse) and (max-width: 1024px), (pointer: coarse) and (max-height: 500px)";

export function isPhoneOrTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|CriOS.*Mobile/i.test(ua)) return true;
  if (navigator.userAgentData?.mobile === true) return true;
  if (/Macintosh|Mac OS X/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true;
  if (typeof window !== "undefined" && window.matchMedia) {
    const m = (q) => window.matchMedia(q).matches;
    const touchOnly = m("(pointer: coarse)") && !m("(any-pointer: fine)") && !m("(any-hover: hover)");
    if (touchOnly) return true;
    if (m(SMALL_TOUCH_QUERY) && !m("(any-pointer: fine)")) return true;
  }
  return false;
}

export function useIsPhone() {
  const [blocked, setBlocked] = useState(isPhoneOrTablet);
  useEffect(() => {
    const check = () => setBlocked(isPhoneOrTablet());
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  return blocked;
}
