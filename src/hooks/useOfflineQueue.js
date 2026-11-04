import { useEffect, useMemo, useState } from "react";
import API from "../api";
import { getUser } from "../utils/auth";
import { createQueue } from "../utils/lmsOfflineQueue";
import { offlineLicensed, noResponse } from "../utils/lmsOfflineEnqueue";
import { registerOfflineShell } from "../utils/lmsOfflineShell";

/* The learner's offline queue for the LMS screens (L10.3f, D-124). Shared by the lesson player and the assignment screen so they cannot disagree.
   Returns `null` (no queue, no strip, nothing saved on the device) unless ALL of these hold: the school's licence lists `lms_offline` (read once from
   /tenant/modules; unknown or failed = no, fail closed), a learner is signed in, and the queue could be created. Only a successful "yes" is remembered for the session;
   a "no" or a failed request is asked again on the next visit. Work already on the device is never deleted when this returns null. */
let licenceCache = null;
const LKEY = () => { try { const u = getUser(); return u && u.id ? `doravo.lms.licence.v1.${u.role || "user"}-${u.id}` : null; } catch { return null; } };
const remember = (yes) => { try { const k = LKEY(); if (k) { if (yes) window.localStorage.setItem(k, "1"); else window.localStorage.removeItem(k); } } catch { /* optional */ } };
const remembered = () => { try { const k = LKEY(); return !!k && window.localStorage.getItem(k) === "1"; } catch { return false; } };
export default function useOfflineQueue() {
  const [ok, setOk] = useState(licenceCache === true);
  useEffect(() => {
    if (licenceCache === true) return undefined;
    let alive = true;
    API.get("/tenant/modules").then((r) => { const yes = offlineLicensed(r.data); if (yes) licenceCache = true; remember(yes); if (alive) setOk(yes); })
      .catch((e) => { if (alive && noResponse(e) && remembered()) setOk(true); /* network down: the last answer from the server is used so packs already on the device can be read; any real answer replaces it. Otherwise asked again on the next visit */ });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (ok) registerOfflineShell(); }, [ok]); // offline app shell: only for a licensed learner (D-129)
  return useMemo(() => {
    if (!ok) return null;
    try { const u = getUser(); return u && u.id ? createQueue({ storage: window.localStorage, post: (p, b) => API.post(p, b), userKey: `${u.role || "user"}-${u.id}` }) : null; } catch { return null; }
  }, [ok]);
}
