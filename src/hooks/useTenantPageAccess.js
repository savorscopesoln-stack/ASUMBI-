import { useEffect, useSyncExternalStore } from "react";
import API from "../api";

/* Admin-portal pages Doravo Finance has switched off for this institution
   (GET /api/tenant/pages -> { disabled: { admin: [...] } }). Student/teacher pages arrive
   through usePortalPageAccess instead. One request per session, shared by every caller;
   a failed request fails OPEN (nothing hidden). */
const PENDING = { loaded: false, admin: [] };
let state = PENDING;
let started = false;
const listeners = new Set();

function load() {
  if (started) return;
  started = true;
  API.get("/tenant/pages")
    .then((r) => { state = { loaded: true, admin: r.data?.disabled?.admin || [] }; })
    .catch(() => { state = { loaded: true, admin: [] }; started = false; }) // not cached as "final": retried on next mount
    .finally(() => listeners.forEach((fn) => fn()));
}
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export default function useTenantPageAccess() {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { load(); }, []);
  return { loaded: s.loaded, isAdminPageOff: (key) => s.admin.includes(key) };
}
