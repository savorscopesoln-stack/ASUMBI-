/* Score formatting helpers — every score/average/mean shown in a report
   or transcript is rounded to 2 decimal places. */

// Numeric rounding to 2dp (returns a Number, or null for empty input).
export const round2 = (n) => {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  if (Number.isNaN(v)) return null;
  return Math.round((v + Number.EPSILON) * 100) / 100;
};

// Display string with exactly 2dp, e.g. 68.4 -> "68.40". Fallback when empty.
export const fmt2 = (n, fallback = "—") => {
  const v = round2(n);
  return v === null ? fallback : v.toFixed(2);
};
