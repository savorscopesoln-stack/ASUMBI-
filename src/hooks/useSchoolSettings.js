import { useEffect, useState, useCallback } from "react";
import API from "../api";

/* =========================================================
   useSchoolSettings
   Backs every screen that used to hard-code this school's
   identity (name, address, phone/email, exam centre code,
   number of classes) and its officials (Principal, Dean, etc.)
   — the Login screen, StudentReport, TeacherReports, reports.jsx,
   and the School Settings admin form itself. See backend
   routes/schoolSettings.js (GET is public, no auth required).

   Module-level cache: the same settings/officials are read by
   several independent components on one page load (e.g. a
   report list rendering many slips), so this avoids firing the
   same GET once per mounted component. Call refresh() after a
   save on the admin page to bust it for every other consumer
   currently mounted.
========================================================= */

let cache = null; // { settings, officials } | null
let inFlight = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(cache));

const load = async (force = false) => {
  if (cache && !force) return cache;
  if (inFlight && !force) return inFlight;

  inFlight = API.get("/school-settings")
    .then((res) => {
      cache = {
        settings: res.data?.settings || null,
        officials: res.data?.officials || [],
      };
      notify();
      return cache;
    })
    .catch(() => {
      cache = cache || { settings: null, officials: [] };
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export default function useSchoolSettings() {
  const [data, setData] = useState(cache || { settings: null, officials: [] });
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setData);
    if (!cache) {
      load().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => listeners.delete(setData);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load(true);
    setLoading(false);
  }, []);

  const settings = data?.settings;
  const officials = data?.officials || [];

  // Find one official by (case-insensitive) title match — used
  // wherever a report currently expects a specific role by name,
  // e.g. getOfficial("dean of curriculum") or getOfficial("principal").
  const getOfficial = useCallback(
    (titleMatch) => {
      const needle = String(titleMatch || "").toLowerCase();
      return officials.find((o) => String(o.title || "").toLowerCase().includes(needle)) || null;
    },
    [officials]
  );

  const signatory = officials.find((o) => o.isSignatory) || officials[officials.length - 1] || null;

  return { settings, officials, loading, refresh, getOfficial, signatory };
}
