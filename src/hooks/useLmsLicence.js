import { useEffect, useState } from "react";
import API from "../api";

/* Is the LMS licensed for this school? Reads /api/tenant/modules (any signed-in user may).
   Used to hide LMS menu items; the server still enforces the licence on every request.
   A successful answer is cached for the session; a failed request is NOT cached, so a
   network blip does not hide the menu until the next full reload. While unknown, the
   menu stays hidden (fails closed). `flags` = the LMS sub-flags the school has (e.g. "lms_discussions"), [] while unknown (S97, A241). */
let cached = null;
const NONE = { loaded: false, enabled: false, flags: [] };

export default function useLmsLicence() {
  const [state, setState] = useState(cached || NONE);
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    API.get("/tenant/modules")
      .then((r) => {
        const lms = r.data?.modules?.lms; cached = { loaded: true, enabled: !!lms?.enabled, flags: lms?.enabled && Array.isArray(lms.flags) ? lms.flags : [] };
        if (alive) setState(cached);
      })
      .catch(() => { if (alive) setState({ loaded: true, enabled: false, flags: [] }); });
    return () => { alive = false; };
  }, []);
  return state;
}
