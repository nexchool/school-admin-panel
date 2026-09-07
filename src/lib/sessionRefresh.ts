/**
 * Renewing an expired access token, exactly once no matter who asked.
 *
 * A dashboard fires several requests at once, and when the access token
 * expires they all come back 401 together. Without a single flight each one
 * would present the same refresh token, and because refresh tokens now rotate
 * — a token may be spent once — the first would succeed and the rest would
 * look to the server exactly like a stolen token being replayed. The server
 * would do the right thing about that, which is to end the session; the user
 * would experience it as being signed out for opening a busy page.
 *
 * So the promise is shared. The first caller starts the refresh, every caller
 * that arrives while it is running waits on the same one, and all of them see
 * the same answer.
 *
 * The refresh call is a bare `fetch` rather than the app's own client, which
 * is not a shortcut: the client retries through *this* function, so routing
 * the refresh through it would be a loop.
 */

import { getApiUrl } from "@/lib/constants";
import {
  getRefreshToken,
  getTenantId,
  setAccessToken,
  setRefreshToken,
} from "@/lib/storage";

let inFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const [refreshToken, tenantId] = await Promise.all([
    getRefreshToken(),
    getTenantId(),
  ]);
  if (!refreshToken) return false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Surface": "admin-web",
  };
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  try {
    const response = await fetch(getApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return false;

    const payload = (await response.json()) as {
      data?: { access_token?: string; refresh_token?: string };
    };
    const next = payload?.data;
    if (!next?.access_token || !next?.refresh_token) return false;

    // Both, always. Storing the access token and dropping its replacement
    // would leave the next renewal presenting a spent token.
    await setAccessToken(next.access_token);
    await setRefreshToken(next.refresh_token);
    return true;
  } catch {
    // A network failure is not an expired session. The caller gives up on
    // this attempt and the next request tries again.
    return false;
  }
}

/** Renew the access token, joining a renewal already under way. */
export function refreshSession(): Promise<boolean> {
  if (!inFlight) {
    inFlight = performRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
