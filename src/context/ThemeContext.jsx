import React, {
  createContext, useCallback, useContext, useEffect, useLayoutEffect,
  useMemo, useRef, useState,
} from "react";

/* =========================================================================
   THEME — one source of truth for the whole app
   ─────────────────────────────────────────────────────────
   Before this, four things each kept their own theme and fought each other
   (this context, StudentLayout's private hook, TeacherLayout's private hook
   and the teacher exam pages' own state — which defaulted to DARK). The
   result: toggling in one place left another thinking it was still dark, so
   the page "hung" on black and needed two clicks to come back.
   Everything now reads/writes THIS context only.

   TWO PREFERENCES
   • App theme   — localStorage "theme". Used everywhere outside the exams.
   • Exam theme  — sessionStorage "exam_theme". Used inside the E-Assessment
                   / exam feature (wrapped in <ExamThemeScope> in App.jsx).

   EXAM RULE: exams ALWAYS open in LIGHT. A student/teacher/admin can switch
   to dark when they need it; that choice sticks while they move around the
   exam feature in this browser session, then the next visit starts light
   again. Switching theme inside the exam feature never overwrites the
   person's normal app theme, and leaving the exam feature puts it back.
========================================================================= */

const ThemeContext = createContext(undefined);

const APP_KEY = "theme";
const EXAM_KEY = "exam_theme";
const VALID = ["light", "dark"];
const THEME_COLOR = { light: "#8B1E2D", dark: "#0F1115" };

const read = (store, key) => {
  try {
    const v = window[store].getItem(key);
    return VALID.includes(v) ? v : null;
  } catch {
    return null; // privacy mode / blocked storage
  }
};
const write = (store, key, value) => {
  try { window[store].setItem(key, value); } catch { /* ignore */ }
};

const readApp = () => read("localStorage", APP_KEY) || "light";
const readExam = () => read("sessionStorage", EXAM_KEY) || "light"; // exams start light

/** Stamp the theme onto <html> in one place so CSS, class- and attribute-based
 *  selectors, native controls and the mobile browser bar can never disagree. */
function applyToDocument(theme, inExam) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.classList.toggle("exam-scope", inExam);
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme; // native scrollbars/inputs follow the theme
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
}

export function ThemeProvider({ children }) {
  const [appTheme, setAppTheme] = useState(readApp);
  const [examTheme, setExamTheme] = useState(readExam);
  const [inExam, setInExam] = useState(false);
  const scopeCount = useRef(0); // several exam components may be mounted at once

  const theme = inExam ? examTheme : appTheme;

  const rafRef = useRef(0);

  // Apply before paint so a switch never flashes the wrong colours.
  useLayoutEffect(() => {
    const root = document.documentElement;
    // Freeze CSS transitions for this one frame: the app has a global
    // `* { transition: all .25s }`, which made theme switches smear/lag.
    root.classList.add("theme-switching");
    applyToDocument(theme, inExam);
    window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = window.requestAnimationFrame(() =>
        root.classList.remove("theme-switching")
      );
    });
  }, [theme, inExam]);

  // If the provider ever unmounts mid-switch, never leave transitions frozen.
  useEffect(() => () => {
    window.cancelAnimationFrame(rafRef.current);
    document.documentElement.classList.remove("theme-switching");
  }, []);

  // Persist each preference to its own store.
  useEffect(() => { write("localStorage", APP_KEY, appTheme); }, [appTheme]);
  useEffect(() => { write("sessionStorage", EXAM_KEY, examTheme); }, [examTheme]);

  // Keep other open tabs in step with the app theme.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === APP_KEY && VALID.includes(e.newValue)) setAppTheme(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    if (!VALID.includes(next)) return;
    (inExam ? setExamTheme : setAppTheme)(next);
  }, [inExam]);

  const toggleTheme = useCallback(() => {
    (inExam ? setExamTheme : setAppTheme)((t) => (t === "dark" ? "light" : "dark"));
  }, [inExam]);

  const enterExamScope = useCallback(() => {
    scopeCount.current += 1;
    setInExam(true);
  }, []);
  const leaveExamScope = useCallback(() => {
    scopeCount.current = Math.max(0, scopeCount.current - 1);
    setInExam(scopeCount.current > 0);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isExamScope: inExam, enterExamScope, leaveExamScope }),
    [theme, setTheme, toggleTheme, inExam, enterExamScope, leaveExamScope]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Wrap any exam-feature screen in this (see App.jsx). While it is mounted the
 * app uses the EXAM theme: light by default, dark only if the user switched
 * it this session. Moving between exam screens keeps the choice; leaving the
 * exam feature restores the person's normal app theme.
 */
export function ExamThemeScope({ children }) {
  const { enterExamScope, leaveExamScope } = useTheme();
  useLayoutEffect(() => {
    enterExamScope();
    return leaveExamScope;
  }, [enterExamScope, leaveExamScope]);
  return children;
}
