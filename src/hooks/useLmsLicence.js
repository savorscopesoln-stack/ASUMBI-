import { useEffect, useState } from "react";
import API from "../api";

/* Is the LMS licensed for this school? Reads /api/tenant/modules (any signed-in user may).
   Used to hide LMS menu items; the server still enforces the licence on every request.
   A successful answer is cached for the session; a failed request is NOT cached, so a
   network blip does not hide the menu until the next full reload. While unknown, the
   menu stays hidden (fails closed). */
let cached = null;

export default function useLmsLicence() {
  const [state, setState] = useState(cached || { loaded: false, enabled: false });
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    API.get("/tenant/modules")
      .then((r) => {
        cached = { loaded: true, enabled: !!r.data?.modules?.lms?.enabled };
        if (alive) setState(cached);
      })
      .catch(() => { if (alive) setState({ loaded: true, enabled: false }); });
    return () => { alive = false; };
  }, []);
  return state;
}
