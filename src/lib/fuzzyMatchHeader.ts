function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]+/g, "");
}

/**
 * Find the best matching candidate for an expected field name.
 *
 * 1. Exact match after normalizing separators + case.
 * 2. Substring match (either direction).
 * 3. Returns null if no match is found.
 */
export function fuzzyMatchHeader(
  expected: string,
  candidates: string[],
): string | null {
  const target = normalize(expected);
  for (const c of candidates) {
    if (normalize(c) === target) return c;
  }
  for (const c of candidates) {
    const n = normalize(c);
    if (n.includes(target) || target.includes(n)) return c;
  }
  return null;
}
