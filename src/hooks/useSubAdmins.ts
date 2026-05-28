"use client";

import {
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { useTenantQuery } from "@/hooks/useTenantQuery";
import {
  subAdminsService,
  type CreateSubAdminPayload,
  type SubAdminModuleCatalogEntry,
  type SubAdminsListParams,
  type SubAdminsListResult,
  type UpdateSubAdminPayload,
} from "@/services/subAdminsService";

/**
 * Query keys for sub-admins. `all` is the prefix used for mutation
 * invalidation — because `useTenantQuery` appends tenantId as the LAST key
 * segment, prefix invalidation on `all` matches across every tenant scope
 * (per `.claude/rules/query-conventions.md`). Do NOT add tenantId to the
 * invalidation key.
 */
export const subAdminsKeys = {
  all: ["sub-admins"] as const,
  list: (params?: SubAdminsListParams) =>
    [...subAdminsKeys.all, "list", params] as const,
  modules: () => [...subAdminsKeys.all, "modules"] as const,
};

export function useSubAdmins(params?: SubAdminsListParams, enabled = true) {
  return useTenantQuery<SubAdminsListResult>({
    queryKey: subAdminsKeys.list(params),
    queryFn: () => subAdminsService.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSubAdminModules(enabled = true) {
  return useTenantQuery<SubAdminModuleCatalogEntry[]>({
    queryKey: subAdminsKeys.modules(),
    queryFn: () => subAdminsService.getModules(),
    // The catalog is static for the app lifetime; cache it aggressively.
    staleTime: 60 * 60 * 1000,
    enabled,
  });
}

export function useCreateSubAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubAdminPayload) =>
      subAdminsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAdminsKeys.all });
    },
  });
}

export function useUpdateSubAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSubAdminPayload }) =>
      subAdminsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAdminsKeys.all });
    },
  });
}

export function useSuspendSubAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subAdminsService.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAdminsKeys.all });
    },
  });
}

export function useRestoreSubAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subAdminsService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAdminsKeys.all });
    },
  });
}

export function useResetSubAdminPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      subAdminsService.resetPassword(id, password),
  });
}

export function useDeleteSubAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subAdminsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAdminsKeys.all });
    },
  });
}
