"use client";

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { toastError } from "@/lib/errorToast";

/**
 * Global mutation error toaster — safety net for mutations that don't
 * handle errors themselves.
 *
 * Behaviour:
 *   - If the mutation defines its own onError (component-level call or
 *     hook-level option), we assume it handles errors and STAY OUT to
 *     avoid double toasts.
 *   - Otherwise we fire a friendly toast via toastError() so unhandled
 *     errors never disappear silently.
 *
 * Per-mutation overrides:
 *   meta: { silent: true }            → never auto-toast (handled inline)
 *   meta: { errorFallback: "..." }    → custom fallback message
 *   meta: { autoToast: true }         → toast EVEN IF onError is set
 *                                       (use when both inline UI + toast
 *                                       are desired)
 */
const mutationCache = new MutationCache({
  onError: (err, _variables, _context, mutation) => {
    const meta = (mutation.options.meta ?? {}) as {
      silent?: boolean;
      errorFallback?: string;
      autoToast?: boolean;
    };
    if (meta.silent) return;

    // If the mutation has its own onError, defer — unless meta.autoToast
    // explicitly says we should toast on top of the inline handling.
    const hasOwnOnError =
      typeof mutation.options.onError === "function" ||
      typeof (mutation.state.variables as { onError?: unknown })?.onError ===
        "function";
    if (hasOwnOnError && !meta.autoToast) return;

    toastError(err, meta.errorFallback);
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache,
        defaultOptions: {
          queries: {
            // Fewer duplicate calls: data stays "fresh" longer; tab focus won't refetch everything.
            staleTime: 2 * 60 * 1000, // 2 minutes
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
