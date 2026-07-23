/**
 * notify — the single toast API for admin-web.
 *
 * Thin, typed wrapper over sonner. Every toast in the app should go through
 * `notify.*` (or the {@link file://./errorToast.ts} helpers, which delegate
 * here) so that:
 *   1. Titles, descriptions, actions, and durations follow one shape.
 *   2. The look is defined once — see the Toaster in `providers/Providers.tsx`
 *      and the `.toast-modern` rules in `app/globals.css`.
 *
 * Usage:
 *   import { notify } from "@/lib/notify";
 *
 *   notify.success("Student added", { description: "Aarav is now in 7-B." });
 *   notify.error("Couldn't save", { action: { label: "Retry", onClick: save } });
 *
 * For errors coming from the API, prefer `toastError` from `@/lib/errorToast`
 * — it maps raw DB/HTTP errors to friendly copy before it reaches the user.
 */

import { toast, type ExternalToast } from "sonner";

export type NotifyAction = {
  label: string;
  /** Runs when the action button is pressed; the toast dismisses afterwards. */
  onClick: () => void;
};

export type NotifyOptions = {
  /** Second line under the title. Keep it to specifics or next steps. */
  description?: string;
  /** Override the per-type default (see DURATION). Pass Infinity to persist. */
  duration?: number;
  /** Reuse an id to update/replace an existing toast instead of stacking. */
  id?: string | number;
  /** A single trailing button — "Retry", "View", … */
  action?: NotifyAction;
};

/** Per-type defaults. Errors linger longer because they ask the user to act. */
const DURATION = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
} as const;

function toExternal(
  opts: NotifyOptions | undefined,
  fallbackDuration: number | undefined,
): ExternalToast {
  return {
    description: opts?.description,
    duration: opts?.duration ?? fallbackDuration,
    id: opts?.id,
    action: opts?.action
      ? { label: opts.action.label, onClick: () => opts.action!.onClick() }
      : undefined,
  };
}

export const notify = {
  success(title: string, opts?: NotifyOptions) {
    return toast.success(title, toExternal(opts, DURATION.success));
  },
  error(title: string, opts?: NotifyOptions) {
    return toast.error(title, toExternal(opts, DURATION.error));
  },
  info(title: string, opts?: NotifyOptions) {
    return toast.info(title, toExternal(opts, DURATION.info));
  },
  warning(title: string, opts?: NotifyOptions) {
    return toast.warning(title, toExternal(opts, DURATION.warning));
  },
  /** Indeterminate progress. Persists until dismissed or replaced by `id`. */
  loading(title: string, opts?: NotifyOptions) {
    return toast.loading(title, toExternal(opts, opts?.duration ?? Infinity));
  },
  /** Dismiss one toast by id, or all toasts when called with no argument. */
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
