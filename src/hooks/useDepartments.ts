"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/AuthProvider";
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

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => departmentsService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateDepartmentInput) =>
      departmentsService.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
