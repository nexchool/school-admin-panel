"use client";

import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Drop-in replacement for `useQuery` that scopes the cache by the active
 * tenant. Use this for ANY query that fetches tenant-scoped data.
 *
 * What it does:
 *   1. Appends the active `tenantId` from `useAuth()` to the queryKey, so
 *      a query cached for tenant A cannot be served to tenant B.
 *   2. Forces `enabled = !!tenantId && (caller's enabled ?? true)`, so the
 *      query does not fire before tenant context is ready (prevents the
 *      "wasted first request with undefined params" footgun).
 *
 * See `.claude/rules/query-conventions.md` for the project rule.
 *
 * @example
 *   const { data } = useTenantQuery({
 *     queryKey: ["students", "list", filters],
 *     queryFn: () => studentsService.list(filters),
 *   });
 */
export function useTenantQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const { tenantId } = useAuth();
  const callerEnabled = options.enabled;
  const enabled = !!tenantId && (callerEnabled === undefined ? true : callerEnabled !== false);
  return useQuery({
    ...options,
    queryKey: [...(options.queryKey as readonly unknown[]), tenantId] as unknown as TQueryKey,
    enabled,
  });
}

/**
 * Drop-in replacement for `useInfiniteQuery` with the same tenant-scoping
 * semantics as {@link useTenantQuery}.
 */
export function useTenantInfiniteQuery<
  TQueryFnData,
  TError = Error,
  // An infinite query's data is the accumulated pages, not one page. This
  // mirrors TanStack's own default; `TData = TQueryFnData` collapses it to a
  // single page and `data.pages` stops type-checking at every call site.
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  options: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
): UseInfiniteQueryResult<TData, TError> {
  const { tenantId } = useAuth();
  const callerEnabled = options.enabled;
  const enabled = !!tenantId && (callerEnabled === undefined ? true : callerEnabled !== false);
  return useInfiniteQuery({
    ...options,
    queryKey: [...(options.queryKey as readonly unknown[]), tenantId] as unknown as TQueryKey,
    enabled,
  });
}
