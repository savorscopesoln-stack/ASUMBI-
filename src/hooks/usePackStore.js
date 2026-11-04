import { useEffect, useMemo } from "react";
import { getUser } from "../utils/auth";
import { createPackStore, idbBackend } from "../utils/lmsOfflinePacks";
import { reconcileOfflineDeviceData } from "../utils/lmsOfflineWipe";

/* The signed-in learner's device pack store (L10.2b step 3). null unless a queue exists (= `lms_offline` known) and a learner is signed in. */
export default function usePackStore(queue) {
  useEffect(() => { reconcileOfflineDeviceData(); }, []); // finishes a pending wipe and wipes a previous person's packs
  return useMemo(() => {
    if (!queue) return null;
    try { const u = getUser(); return u && u.id ? createPackStore({ backend: idbBackend(), userKey: `${u.role || "user"}-${u.id}` }) : null; } catch { return null; }
  }, [queue]);
}
