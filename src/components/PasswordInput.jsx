import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Accessible password field with a visibility toggle.
 * Purely presentational — value/onChange are controlled by the parent form,
 * so it doesn't touch auth state or logic.
 */
export default function PasswordInput({
  id = "password",
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
  inputStyle,
  wrapStyle,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...wrapStyle }}>
      <label htmlFor={id} style={authStyles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          style={{ ...authStyles.input, paddingRight: 42, ...inputStyle }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          style={authStyles.eyeBtn}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

const authStyles = {
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-secondary)",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 11,
    color: "var(--text)",
    fontSize: 14.5,
    fontFamily: "inherit",
    outline: "none",
    minHeight: 46,
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  eyeBtn: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    width: 34,
    height: 34,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};

export { authStyles };