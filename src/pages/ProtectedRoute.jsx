import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  let user = {};
  let token = null;

  // ================= SAFE PARSE =================
  try {
    user = JSON.parse(localStorage.getItem("user")) || {};
  } catch (err) {
    user = {};
  }

  token = localStorage.getItem("token");

  // ================= NOT LOGGED IN =================
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ================= NORMALIZE ROLE =================
  const role = (user?.role || "").toLowerCase();

  const normalizedAllowedRoles = allowedRoles.map((r) =>
    r.toLowerCase()
  );

  // ================= ROLE CHECK =================
  if (
    !role ||
    (normalizedAllowedRoles.length > 0 &&
      !normalizedAllowedRoles.includes(role))
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ================= ALLOWED =================
  return children;
}