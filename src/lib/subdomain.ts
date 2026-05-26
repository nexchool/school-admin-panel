// Reserved platform subdomains — not tenant slugs.
const IGNORED_SUBDOMAINS = new Set(["www", "api", "app", "admin", "dashboard", "mail", "smtp", "ftp"]);

/**
 * Extracts the school subdomain from a hostname string.
 * Works for both *.localhost (dev) and *.nexchool.in (prod).
 *
 * Examples:
 *   mts.localhost:3000  → "mts"
 *   mts.nexchool.in     → "mts"
 *   localhost           → null
 *   nexchool.in         → null
 */
export function getSubdomain(hostname: string = ""): string | null {
  const host = hostname.split(":")[0].toLowerCase();
  const parts = host.split(".");

  const isLocalhost = parts[parts.length - 1] === "localhost";

  if (isLocalhost) {
    if (parts.length < 2) return null;
    const sub = parts[0];
    return sub && sub !== "localhost" && !IGNORED_SUBDOMAINS.has(sub) ? sub : null;
  }

  if (parts.length >= 3) {
    const sub = parts[0];
    return IGNORED_SUBDOMAINS.has(sub) ? null : sub;
  }

  return null;
}

/** Returns the subdomain from the current browser URL, or null. */
export function getCurrentSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  return getSubdomain(window.location.hostname);
}
