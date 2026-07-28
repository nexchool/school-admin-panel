"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/AuthProvider";
import { useAppMutation } from "@/hooks/useAppMutation";
import { departmentsService } from "@/services/departmentsService";
import type {
  CreateDepartmentInput,
  DepartmentStats,
  DepartmentsListParams,
  DepartmentsListResult,
  UpdateDepartmentInput,
} from "@/types/department";

export const departmentsKeys = {
  all: ["departments"] as const,
  list: (params: DepartmentsListParams) =>
    [...departmentsKeys.all, "list", params] as const,
  stats: () => [...departmentsKeys.all, "stats"] as const,
};

/** Invalidate by the `all` prefix. tenantId is the LAST key segment, so a
 *  prefix invalidation matches every tenant scope — see
 *  .claude/rules/query-conventions.md. Never put tenantId in the
 *  invalidation key. */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: departmentsKeys.all });
}

export function useDepartments(params: DepartmentsListParams) {
  const { tenantId } = useAuth();
  return useQuery<DepartmentsListResult>({
    queryKey: [...departmentsKeys.list(params), tenantId],
    queryFn: () => departmentsService.list(params),
    enabled: !!tenantId,
  });
}

export function useDepartmentStats() {
  const { tenantId } = useAuth();
  return useQuery<DepartmentStats>({
    queryKey: [...departmentsKeys.stats(), tenantId],
    queryFn: () => departmentsService.stats(),
    enabled: !!tenantId,
  });
}

// The three mutations below use useAppMutation with `error` omitted: both the
// form modal (duplicate name/code, 409) and the delete dialog (in-use, 409)
// surface API failures inline against the offending field / dialog body, so a
// toast on top would double-report the same failure. `success` still fires so
// the happy path gets standard confirmation. See
// .superpowers/sdd/2026-07-28-departments-module/task-10-brief.md Step 1b.

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (data: CreateDepartmentInput) => departmentsService.create(data),
      onSuccess: () => invalidateAll(qc),
    },
    { success: "Department created" },
  );
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({ id, ...data }: { id: string } & UpdateDepartmentInput) =>
        departmentsService.update(id, data),
      onSuccess: () => invalidateAll(qc),
    },
    { success: "Department updated" },
  );
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (id: string) => departmentsService.remove(id),
      onSuccess: () => invalidateAll(qc),
    },
    { success: "Department deleted" },
  );
}
