"use client";

import { useEffect, useRef } from "react";
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toastError, toastSuccess } from "@/lib/errorToast";

/**
 * Toast behaviour layered on top of a mutation. Omit a field to skip that toast.
 *
 * - `success` / `successDescription` may be static strings or functions of
 *   `(data, variables)` so the message can include counts or names.
 * - `error` is the fallback title; the friendly reason from the API becomes the
 *   description automatically (see `toastError`). Omit to stay silent on error
 *   (e.g. when a modal surfaces the error inline instead).
 * - `retry` adds a "Retry" button that re-runs the mutation with the same
 *   variables. Only meaningful alongside `error`.
 */
export type MutationToasts<TData, TVars> = {
  success?: string | ((data: TData, variables: TVars) => string);
  successDescription?:
    | string
    | ((data: TData, variables: TVars) => string | undefined);
  error?: string;
  retry?: boolean;
};

/**
 * `useMutation` + standardized toasts. The caller's own `onSuccess`/`onError`
 * (cache invalidation, navigation, closing modals) still run — the toast fires
 * around them, never instead of them.
 *
 * Centralize toasts here for mutations that map 1:1 to a user action. Keep
 * toasts at the call site for mutations fired in a loop (would spam) or in a
 * composite flow that shows one combined message.
 */
export function useAppMutation<TData, TVars, TError = unknown, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVars, TContext>,
  toasts?: MutationToasts<TData, TVars>,
): UseMutationResult<TData, TError, TVars, TContext> {
  // Latest-ref for the Retry action: onError can't reference `mutation` inside
  // its own config, so it calls through this ref, which an effect keeps pointed
  // at the live `mutate`. By the time a Retry can fire (post-error, post-mount)
  // the effect has already run.
  const mutateRef = useRef<(variables: TVars) => void>(() => {});

  const mutation = useMutation<TData, TError, TVars, TContext>({
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      options.onSuccess?.(data, variables, onMutateResult, context);
      if (toasts?.success !== undefined) {
        const title =
          typeof toasts.success === "function"
            ? toasts.success(data, variables)
            : toasts.success;
        const description =
          typeof toasts.successDescription === "function"
            ? toasts.successDescription(data, variables)
            : toasts.successDescription;
        toastSuccess(title, description ? { description } : undefined);
      }
    },
    onError: (error, variables, onMutateResult, context) => {
      options.onError?.(error, variables, onMutateResult, context);
      if (toasts?.error !== undefined) {
        toastError(error, toasts.error, {
          onRetry: toasts.retry
            ? () => mutateRef.current(variables)
            : undefined,
        });
      }
    },
  });

  useEffect(() => {
    mutateRef.current = mutation.mutate;
  }, [mutation.mutate]);

  return mutation;
}
