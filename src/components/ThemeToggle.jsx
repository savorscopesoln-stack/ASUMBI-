import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Small, accessible light/dark toggle.
 * Reads/writes the app-wide ThemeContext — no local theme state here.
 */
export default function ThemeToggle({ style }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="theme-toggle-btn"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        width: 38,
        height: 38,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s ease, color 0.15s ease",
        ...style,
      }}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}