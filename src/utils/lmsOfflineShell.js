/* Registers the offline app shell (public/lms-sw.js, D-129). Only in a production build on a secure origin, and only called for a learner whose school
   has the `lms_offline` licence (see useOfflineQueue). Fails quietly: no service worker support or a failed registration just means no offline shell. */
export const SW_URL = "/lms-sw.js";
export function offlineShellSupported(env = {}) {
  const nav = env.navigator ?? (typeof navigator !== "undefined" ? navigator : null);
  const secure = env.isSecureContext ?? (typeof window !== "undefined" ? window.isSecureContext : false);
  const prod = env.prod ?? (typeof import.meta !== "undefined" && import.meta.env ? !!import.meta.env.PROD : false);
  return !!(nav && "serviceWorker" in nav && secure && prod);
}
let started = false;
export async function registerOfflineShell(env = {}) {
  if (started || !offlineShellSupported(env)) return { ok: false, started: false };
  started = true;
  try { const nav = env.navigator ?? navigator; await nav.serviceWorker.register(SW_URL, { scope: "/" }); return { ok: true, started: true }; }
  catch { started = false; return { ok: false, started: false }; }
}
export async function unregisterOfflineShell(env = {}) {
  try {
    const nav = env.navigator ?? navigator; const regs = await nav.serviceWorker.getRegistrations(); let n = 0;
    for (const r of regs) if (r.active && r.active.scriptURL.endsWith(SW_URL)) { await r.unregister(); n += 1; }
    if (typeof caches !== "undefined") for (const k of await caches.keys()) if (k.startsWith("doravo-lms-shell-")) await caches.delete(k);
    started = false; return { ok: true, removed: n };
  } catch { return { ok: false, removed: 0 }; }
}
