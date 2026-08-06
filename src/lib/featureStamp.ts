/**
 * Notices, mid-session, that the school's enabled modules have changed.
 *
 * A super-admin switching Transport off used to reach a signed-in admin only
 * when they logged out and back in. Until then the sidebar kept offering a
 * module the school no longer had, and the only way to find out was to click
 * it and land on a 403.
 *
 * The API stamps every response with `X-Feature-Stamp`, a short value derived
 * from the enabled set. We hold the last one seen; when a response carries a
 * different one, the modules changed and we ask the auth layer to re-read the
 * profile. No polling, no extra request in the common case — the signal rides
 * along with work the app was doing anyway.
 *
 * Same decoupled-bridge shape as `forbiddenHandler.ts`, and for the same
 * reason: `api.ts` must not import `AuthProvider`, which imports `api.ts`.
 */

type FeatureChangeHandler = () => void;

let handler: FeatureChangeHandler | null = null;
let lastStamp: string | null = null;

/**
 * Register the handler invoked when the enabled module set changes. Returns an
 * unsubscribe fn. Only one handler is active at a time.
 */
export function registerFeatureChangeHandler(fn: FeatureChangeHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/**
 * Record the stamp from a response, and fire the handler if it differs from
 * the last one seen.
 *
 * The first stamp of a session is the baseline, not a change — firing on it
 * would mean every fresh login immediately re-fetched its own profile.
 *
 * `lastStamp` is updated before the handler runs so that a burst of parallel
 * requests carrying the new stamp results in one refresh, not one per request.
 */
export function noteFeatureStamp(stamp: string | null): void {
  if (!stamp) return;
  const previous = lastStamp;
  lastStamp = stamp;
  if (previous === null || previous === stamp) return;
  handler?.();
}

/** Forget the baseline — call on logout, so the next session starts clean. */
export function resetFeatureStamp(): void {
  lastStamp = null;
}

/** Test-only: reset module state between cases. */
export function __resetFeatureStampForTests(): void {
  handler = null;
  lastStamp = null;
}
