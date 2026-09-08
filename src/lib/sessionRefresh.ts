/**
 * Renewing an expired access token, exactly once — across every tab, not just
 * within one.
 *
 * A dashboard fires several requests at once, and when the access token
 * expires they all come back 401 together. Without coordination each one would
 * present the same refresh token, and because refresh tokens rotate — a token
 * may be spent once — the first would succeed and the rest would look to the
 * server exactly like a stolen token being replayed.
 *
 * The shared promise below handles that *within* a tab. It cannot handle it
 * *between* tabs, and that distinction is the whole reason this file has a
 * lock in it: the promise is per-JavaScript-context, while the token lives in
 * `localStorage` and is shared by every tab of the origin. Two tabs open on the
 * same school therefore start two renewals milliseconds apart, both holding the
 * same token — and a staff member with the timetable open in one tab and
 * attendance in another is not an attack.
 *
 * So renewal serializes on a Web Lock named for the origin. The tab that gets
 * there first renews; the others wait, find the access token already replaced,
 * and report success without spending anything. Where Web Locks is unavailable
 * the old behaviour stands, and the server's rotation grace window catches the
 * collision instead (`server/modules/auth/tokens.py`).
 *
 * The refresh call is a bare `fetch` rather than the app's own client, which
 * is not a shortcut: the client retries through *this* function, so routing
 * the refresh through it would be a loop.
 */

import { getApiUrl } from "@/lib/constants";
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  setAccessToken,
  setRefreshToken,
} from "@/lib/storage";

let inFlight: Promise<boolean> | null = null;

/** Named for the origin, because that is exactly the scope being serialized. */
const RENEWAL_LOCK = "nexchool-admin-web-session-renewal";

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

/**
 * Renew, unless the wait for the lock was itself the renewal.
 *
 * `staleAccessToken` is what this tab held when it decided it needed a new
 * one. If storage no longer holds that value by the time the lock is granted,
 * another tab has already renewed and this tab has nothing to do but read the
 * result — spending a second token here would be a pointless extra generation
 * and one more chance to race.
 */
async function renewUnlessAnotherTabDid(
  staleAccessToken: string | null
): Promise<boolean> {
  const current = await getAccessToken();
  if (current && current !== staleAccessToken) return true;
  return performRefresh();
}

function underOriginLock<T>(work: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator !== "undefined" ? navigator.locks : undefined;
  // Older Safari and any non-secure context have no Web Locks. Renewing
  // without the lock is what every tab did until now, and the server tolerates
  // the collision — so this degrades rather than failing.
  if (!locks) return work();
  // `LockManager.request` is typed as resolving whatever the callback returns,
  // which for an async callback nests one Promise inside another. The runtime
  // value is the settled result; the cast says so rather than restructuring a
  // three-line function around a typings quirk.
  return locks.request(RENEWAL_LOCK, work) as Promise<T>;
}

/** Renew the access token, joining a renewal already under way. */
export function refreshSession(): Promise<boolean> {
  if (!inFlight) {
    // Captured before the wait, so that "did somebody else renew?" is asked
    // against what this tab actually had when it started.
    const staleAccessToken = getAccessToken();
    inFlight = staleAccessToken
      .then((stale) => underOriginLock(() => renewUnlessAnotherTabDid(stale)))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
