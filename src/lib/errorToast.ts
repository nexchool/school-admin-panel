/**
 * Centralized error → toast helper.
 *
 * Every mutation / explicit catch in the app should route through here so:
 *   1. The user sees a friendly, actionable message — never a raw DB error,
 *      stack trace, or Python exception class name.
 *   2. We have one place to extend the pattern → message map when new
 *      backend errors start showing up.
 *
 * Usage:
 *   import { toastError, toastSuccess } from "@/lib/errorToast";
 *
 *   try {
 *     await mutation.mutateAsync(input);
 *     toastSuccess("Saved.");
 *   } catch (err) {
 *     toastError(err, "Couldn't save. Please try again.");
 *   }
 *
 *   // Inside react-query:
 *   useMutation({
 *     mutationFn: ...,
 *     onError: (err) => toastError(err, "Couldn't approve the request."),
 *   });
 */

import { toast } from "sonner";
import { ApiException } from "@/services/api";

/**
 * Map raw error fragments (substrings) to user-friendly messages. Order
 * matters — first match wins, so put more specific patterns above generic
 * ones.
 *
 * Add a new entry whenever a backend error surfaces in the UI that
 * shouldn't be shown verbatim. Each rule should:
 *   - match: a lowercase substring of the raw error message
 *   - friendly: the message we show to the user
 */
type RewriteRule = { match: string; friendly: string };

const REWRITES: RewriteRule[] = [
  // ---- Postgres / SQLAlchemy native messages ----
  {
    match: "uniqueviolation",
    friendly: "That value is already taken. Please choose a different one.",
  },
  {
    match: "duplicate key value",
    friendly: "That entry already exists. Please use unique values.",
  },
  {
    match: "foreignkeyviolation",
    friendly:
      "This item is linked to other records. Remove or reassign them first.",
  },
  {
    match: "violates foreign key constraint",
    friendly:
      "This item is linked to other records. Remove or reassign them first.",
  },
  {
    match: "notnullviolation",
    friendly: "A required field is missing. Please fill in all required fields.",
  },
  {
    match: "violates not-null constraint",
    friendly: "A required field is missing. Please fill in all required fields.",
  },
  {
    match: "checkviolation",
    friendly: "One or more values are out of the allowed range.",
  },
  {
    match: "violates check constraint",
    friendly: "One or more values are out of the allowed range.",
  },
  {
    match: "stringdatarighttruncation",
    friendly: "One of the fields is too long. Please shorten it.",
  },
  {
    match: "invalidtextrepresentation",
    friendly: "One of the values is in the wrong format.",
  },
  {
    match: "operationalerror",
    friendly:
      "We're having trouble reaching the database. Please try again in a moment.",
  },

  // ---- Common backend ValueError text used across services ----
  {
    match: "bed already occupied",
    friendly:
      "That bed is already occupied. Check the student out first or pick a different bed.",
  },
  {
    match: "student already has active allocation",
    friendly:
      "This student already has an active allocation. Check them out before reallocating.",
  },
  {
    match: "active gatepass",
    friendly:
      "This student already has an open gatepass. Close it before creating a new one.",
  },
  {
    match: "cannot transition",
    friendly:
      "This action isn't allowed from the current status. Refresh and try again.",
  },
  {
    match: "already checked out",
    friendly: "This entry has already been checked out.",
  },

  // ---- HTTP-shaped issues ----
  {
    match: "session has expired",
    friendly: "Your session has expired. Please log in again.",
  },
  {
    match: "failed to fetch",
    friendly:
      "Couldn't reach the server. Check your internet connection and try again.",
  },
  {
    match: "networkerror",
    friendly:
      "Network error. Check your internet connection and try again.",
  },
];

/**
 * Returns a user-friendly message for the given error. Never returns
 * raw SQL or Python class names.
 */
export function friendlyErrorMessage(err: unknown, fallback?: string): string {
  const raw = rawMessage(err);
  if (!raw) return fallback ?? "Something went wrong. Please try again.";

  const lower = raw.toLowerCase();
  for (const rule of REWRITES) {
    if (lower.includes(rule.match)) return rule.friendly;
  }

  // Heuristic: if the message looks technical (contains parentheses with
  // SQL, mentions psycopg2 / sqlalchemy / Traceback), fall back to a
  // generic message rather than leaking it.
  if (
    /psycopg2|sqlalchemy|traceback|stacktrace|exception:|at line \d+/i.test(raw)
  ) {
    return fallback ?? "Something went wrong on our side. Please try again.";
  }

  // Cap length so a verbose backend message doesn't blow up the toast.
  if (raw.length > 200) return raw.slice(0, 200) + "…";
  return raw;
}

function rawMessage(err: unknown): string | null {
  if (err instanceof ApiException) {
    // ApiException already pulled the message out of the response envelope.
    if (err.message) return err.message;
    if (err.data && typeof err.data === "object") {
      const o = err.data as Record<string, unknown>;
      if (typeof o.message === "string") return o.message;
      if (typeof o.error === "string") return o.error;
    }
    return null;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return null;
}

/** Show a user-friendly error toast. */
export function toastError(err: unknown, fallback?: string): void {
  toast.error(friendlyErrorMessage(err, fallback));
}

/** Convenience wrapper so callers don't need to import sonner directly. */
export function toastSuccess(message: string): void {
  toast.success(message);
}

/** Convenience wrapper for informational toasts. */
export function toastInfo(message: string): void {
  toast.info(message);
}
