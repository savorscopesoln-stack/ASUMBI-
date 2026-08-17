import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(undefined);

const STORAGE_KEY = "theme";
const VALID_THEMES = ["light", "dark"];

/**
 * Reads the persisted theme from localStorage.
 * Falls back to "light" (the required default) if nothing
 * valid is stored yet, e.g. on a user's first visit.
 */
function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored)) return stored;
  } catch (err) {
    // localStorage can throw in some environments (privacy mode, etc.)
    console.warn("ThemeContext: unable to read localStorage", err);
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the theme to <html> so global/CSS-var-based styling
  // (like the [data-theme='dark'] tokens in Dashboard.jsx) and any
  // `.light` / `.dark` class-based CSS both work app-wide.
  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      console.warn("ThemeContext: unable to persist theme", err);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const value = { theme, setTheme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}