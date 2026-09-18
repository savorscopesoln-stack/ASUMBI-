import { useEffect, useState, useCallback } from "react";
import API from "../api";
import { DEFAULT_GRADING_SYSTEM } from "../utils/grading";

/* =========================================================
   useGradingSystem
   ---------------------------------------------------------
   Backs every report screen that used to hard-code its own
   grade boundaries (reports.jsx's getKnecGrade/getOverallResult/
   getRemark, StudentReport.jsx's own CBC-style scale,
   TeacherReports.jsx's own three-band scale) — they all now read
   the ONE scale set from Admin → E-Assessments → Grading System.

   Same module-level cache pattern as useSchoolSettings: several
   independent components on one page (e.g. a batch of report
   slips) read this, so we fetch once and share it. Call refresh()
   after a save on the admin Grading System tab to bust it for
   every other consumer currently mounted.
========================================================= */

let cache = null; // grading system object | null
let inFlight = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(cache));

const load = async (force = false) => {
  if (cache && !force) return cache;
  if (inFlight && !force) return inFlight;

  inFlight = API.get("/e-assessments/grading-system")
    .then((res) => {
      cache = res.data || DEFAULT_GRADING_SYSTEM;
      notify();
      return cache;
    })
    .catch(() => {
      cache = cache || DEFAULT_GRADING_SYSTEM;
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export default function useGradingSystem() {
  const [gradingSystem, setGradingSystem] = useState(cache || DEFAULT_GRADING_SYSTEM);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setGradingSystem);
    if (!cache) {
      load().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => listeners.delete(setGradingSystem);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load(true);
    setLoading(false);
  }, []);

  return { gradingSystem, loading, refresh };
}
