/* =========================================================
   SUB-ADMIN PAGE PERMISSIONS
   Single source of truth for the pages an admin can grant a
   "sub_admin" account access to at setup time. Keep the keys
   here in sync with backend/utils/pages.js — they must be the
   exact same strings, since that's what's stored on the
   account and sent back after login.
========================================================= */

export const PAGES = [
  { key: "Dashboard",        label: "Dashboard",         route: "/dashboard" },
  { key: "Students",         label: "Students",          route: "/students" },
  { key: "Teachers",         label: "Teachers",          route: "/teachers" },
  { key: "Marks",            label: "Marks",              route: "/Marks" },
  { key: "Assessments",      label: "Assessments",       route: "/assessment-feature" },
  { key: "E-Assessments",    label: "E-Assessments",     route: "/e-assessments" },
  { key: "Practicum",        label: "Practicum",         route: "/practicum" },
  { key: "Registration",     label: "Registration",      route: "/registration" },
  { key: "Users",            label: "Users",              route: "/Users" },
  { key: "Password Reset",   label: "Password Reset",    route: "/password-reset" },
  { key: "Leave-out",        label: "Leave-out",          route: "/leave-out" },
  { key: "Meals",            label: "Meals",               route: "/meals" },
  { key: "AttendanceReport", label: "Attendance Report",  route: "/attendance-report" },
  { key: "Reports",          label: "Reports",             route: "/reports" },
  { key: "Graduation",       label: "Graduation",         route: "/graduation" },
  { key: "Notifications",    label: "Notifications",      route: "/notifications" },
];

export const PAGE_KEYS = PAGES.map((p) => p.key);

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

/* Does this user have access to the given page key?
   - "admin" always has full access.
   - "sub_admin" only has whatever pages were granted at setup. */
export const hasPage = (user, pageKey) => {
  const role = String(user?.role || "").toLowerCase();
  if (role === "admin") return true;
  if (role !== "sub_admin") return false;
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  return perms.includes(pageKey);
};

/* Where should this user land after login? Admins/teachers/students go to
   their fixed home page; a sub_admin goes to the first page they were
   granted (falls back to /dashboard, which will just bounce to
   /unauthorized if they truly have nothing — better than a broken redirect). */
export const getDefaultRoute = (user) => {
  const role = String(user?.role || "").toLowerCase();

  if (role === "student") return "/student";
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/dashboard";

  if (role === "sub_admin") {
    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    const firstAllowed = PAGES.find((p) => perms.includes(p.key));
    return firstAllowed ? firstAllowed.route : "/dashboard";
  }

  return "/dashboard";
};
