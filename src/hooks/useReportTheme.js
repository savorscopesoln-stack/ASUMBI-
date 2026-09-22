import { useEffect, useState, useCallback } from "react";
import API from "../api";

/* =========================================================
   useReportTheme
   Backs every screen that needs the ACTUAL colors behind a
   School Settings "Report Theme" key (slate, navy, teal, ...),
   not just its swatch — see backend/utils/reportThemes.js and
   GET /api/school-settings/report-themes (public, same reasoning
   as school-settings itself: no session needed, nothing sensitive,
   just a static list of color palettes).

   Historically only the School Settings picker fetched this list
   (to render swatches) while every *report* (StudentReport.jsx's
   printable card) stayed hard-coded maroon regardless of the
   school's chosen theme. This hook is what lets a report resolve
   { primary, onPrimary, zebra, rule } for whatever key is saved on
   SchoolSettings.reportTheme, so "change the theme" actually
   re-colors the header band, section labels, table header and
   zebra rows instead of just the picker itself.

   Module-level cache: the catalog is completely static per
   deployment, so every mounted consumer shares one GET.
========================================================= */

const FALLBACK_THEME = { key: "slate", name: "Slate (default)", primary: "#7f1d1d", onPrimary: "#ffffff", zebra: "#f8fafc", rule: "#e2e8f0" };

let cache = null; // { themes, defaultKey } | null
let inFlight = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(cache));

const load = async (force = false) => {
  if (cache && !force) return cache;
  if (inFlight && !force) return inFlight;

  inFlight = API.get("/school-settings/report-themes")
    .then((res) => {
      cache = {
        themes: res.data?.themes?.length ? res.data.themes : [FALLBACK_THEME],
        defaultKey: res.data?.default || "slate",
      };
      notify();
      return cache;
    })
    .catch(() => {
      cache = cache || { themes: [FALLBACK_THEME], defaultKey: "slate" };
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/* themeKey: the value from SchoolSettings.reportTheme (may be null/
   unrecognized — resolves to the default palette exactly like the
   backend's resolveReportTheme() does, so screen and PDF always
   agree). Returns { key, name, primary, onPrimary, zebra, rule, loading }. */
export default function useReportTheme(themeKey) {
  const [data, setData] = useState(cache);
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

  const themes = data?.themes || [FALLBACK_THEME];
  const defaultKey = data?.defaultKey || "slate";
  const resolved =
    themes.find((t) => t.key === themeKey) ||
    themes.find((t) => t.key === defaultKey) ||
    themes[0] ||
    FALLBACK_THEME;

  return { ...resolved, themes, loading, refresh };
}
