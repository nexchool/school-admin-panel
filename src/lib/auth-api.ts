/**
 * Auth-related API URL checks (shared by api client).
 * 401 on these routes means "bad credentials" etc., not "session expired".
 */
export function isPublicAuthApiUrl(url: string): boolean {
  let pathname = url;
  try {
    pathname = new URL(url, "http://localhost").pathname;
  } catch {
    pathname = (url.split("?")[0] ?? url).replace(/^https?:\/\/[^/]+/, "");
  }
  return (
    pathname.includes("/api/auth/login") ||
    pathname.includes("/api/auth/register") ||
    pathname.includes("/api/auth/password/forgot") ||
    pathname.includes("/api/auth/password/reset")
  );
}
