import { useMemo } from "react";
import { getUser } from "../utils/auth";
import { createReadCache } from "../utils/lmsReadCache";

/* The signed-in learner's device read cache (D-134). null unless a queue exists (`lms_offline` known) and a learner is signed in. */
export default function useReadCache(queue) {
  return useMemo(() => {
    if (!queue) return null;
    try { const u = getUser(); return u && u.id ? createReadCache({ storage: window.localStorage, userKey: `${u.role || "user"}-${u.id}` }) : null; } catch { return null; }
  }, [queue]);
}
