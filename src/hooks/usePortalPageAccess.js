import { useCallback, useEffect, useState } from "react";
import API from "../api";

/* =========================================================
   PORTAL PAGE ACCESS
   Single hook shared by StudentLayout and TeacherLayout so both
   portals gate the exact same way. A page is identified by its
   route (e.g. "/student/meals") — that's also the key stored on
   the backend, so any page added to a portal's nav array in the
   future is automatically controllable from the admin "Portal
   Pages" screen with no extra wiring.

   A page with no row in the backend yet is treated as ENABLED —
   only an explicit admin toggle turns a page off. That's what
   makes "future pages" work automatically: nothing has to be
   registered before it shows up.
========================================================= */
export function usePortalPageAccess(portal) {
  const [disabledPaths, setDisabledPaths] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await API.get(`/portal-pages/${portal}`);
      const rows = res.data || [];
      setDisabledPaths(
        rows.filter((r) => r.enabled === false).map((r) => r.page_key)
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoaded(true);
    }
  }, [portal]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isEnabled = useCallback(
    (path) => !disabledPaths.includes(path),
    [disabledPaths]
  );

  // Is this pathname currently sitting on a disabled page? Covers
  // nested sub-routes too (e.g. "/student/e-assessments/12" is
  // governed by "/student/e-assessments" being enabled).
  const isPathDisabled = useCallback(
    (pathname) =>
      disabledPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      ),
    [disabledPaths]
  );

  return { loaded, isEnabled, isPathDisabled, reload };
}
