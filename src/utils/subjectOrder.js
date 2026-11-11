// Subjects are always listed by subject code, lowest to highest
// ("9811" < "9812" < "9822E" < "9824A"; numbers compare as numbers).
// Subjects without a code go last, alphabetically by name.
export function compareSubjectsByCode(a, b) {
  const ca = String(a?.code ?? a?.subjectCode ?? "").trim();
  const cb = String(b?.code ?? b?.subjectCode ?? "").trim();
  if (ca && !cb) return -1;
  if (!ca && cb) return 1;
  if (ca && cb) {
    const c = ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
    if (c !== 0) return c;
  }
  return String(a?.name ?? a?.subject ?? a?.subjectName ?? "").localeCompare(
    String(b?.name ?? b?.subject ?? b?.subjectName ?? ""), undefined, { numeric: true, sensitivity: "base" });
}
export const sortSubjectsByCode = (list) => [...(list || [])].sort(compareSubjectsByCode);
