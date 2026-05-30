/**
 * Decoupled bridge so the plain `api.ts` module can ask the auth layer to
 * refresh permissions when a tenant-scoped request returns 403, WITHOUT a
 * circular import (api.ts → AuthProvider → api.ts). Mirrors the module-level
 * mechanism the 401 path uses (inline storage clear + redirect): instead of a
 * component reaching into `api.ts`, `AuthProvider` registers a callback here
 * and `api.ts` invokes it.
 *
 * Why a 403 self-correct: backend enforces fresh permissions per request. When
 * a School Admin revokes a logged-in sub-admin's module, the sub-admin's cached
 * permissions (from login/profile) go stale — the sidebar still shows the
 * module and navigating there 403s into a dead page. Refreshing the profile on
 * a 403 lets the sidebar + RouteGuard re-evaluate and redirect off a now-
 * forbidden route. A user who merely lacked a fine-grained sub-action keeps
 * their page (RouteGuard still grants the route); only that action failed.
 *
 * Loop guard: a burst of 403s (or a 403 from the refresh's own /profile call)
 * must not cause an infinite refresh loop. We throttle to at most one refresh
 * per `MIN_REFRESH_INTERVAL_MS`. The redirect target `/dashboard` and
 * `/profile` are always-allowed, so once perms update there's no re-trigger.
 */

/** Minimum gap between two permission refreshes triggered by 403s. */
export const MIN_REFRESH_INTERVAL_MS = 5000;

type ForbiddenHandler = () => void;

let handler: ForbiddenHandler | null = null;
// -Infinity so the very first 403 after mount always passes the throttle
// (any finite `now` is more than MIN_REFRESH_INTERVAL_MS past -Infinity).
let lastRefreshAt = Number.NEGATIVE_INFINITY;

/**
 * Register the handler invoked on a 403. Returns an unsubscribe fn so the
 * provider can clean up on unmount. Only one handler is active at a time;
 * registering replaces any prior handler.
 */
export function registerForbiddenHandler(fn: ForbiddenHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/**
 * Invoke the registered handler, throttled to one call per
 * `MIN_REFRESH_INTERVAL_MS`. Safe to call on every 403 — a rapid burst results
 * in a single refresh. No-op when no handler is registered (e.g. pre-mount or
 * on the public login page).
 *
 * @param now injectable clock for deterministic tests.
 */
export function notifyForbidden(now: number = Date.now()): void {
  if (!handler) return;
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) return;
  lastRefreshAt = now;
  handler();
}

/** Test-only: reset module state between cases. */
export function __resetForbiddenHandlerForTests(): void {
  handler = null;
  lastRefreshAt = Number.NEGATIVE_INFINITY;
}
