/* Score formatting helpers — every score/average/mean shown in a report
   or transcript is rounded DOWN to a whole number (70.99 -> 70). */

// Numeric floor (returns a Number, or null for empty input).
// Name kept as round2 so existing imports keep working.
export const round2 = (n) => {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  if (Number.isNaN(v)) return null;
  return Math.floor(v + 1e-9);
};

// Display string, whole number only, e.g. 68.99 -> "68". Fallback when empty.
export const fmt2 = (n, fallback = "—") => {
  const v = round2(n);
  return v === null ? fallback : String(v);
};
