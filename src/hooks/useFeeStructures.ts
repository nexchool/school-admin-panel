"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService, type CreateStructureInput } from "@/services/financeService";

export const feeStructureKeys = {
  all: ["finance", "structures"] as const,
  list: (params?: { academic_year_id?: string; class_id?: string }) =>
    [...feeStructureKeys.all, "list", params] as const,
  detail: (id: string) => [...feeStructureKeys.all, "detail", id] as const,
};

export function useFeeStructures(params?: { academic_year_id?: string; class_id?: string }) {
  return useQuery({
    queryKey: feeStructureKeys.list(params),
    queryFn: () => financeService.getStructures(params),
  });
}

export function useFeeStructure(id: string | undefined) {
  return useQuery({
    queryKey: feeStructureKeys.detail(id ?? ""),
    queryFn: () => financeService.getStructure(id!),
    enabled: !!id,
  });
}

export function useCreateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStructureInput) => financeService.createStructure(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeStructureKeys.all });
      qc.invalidateQueries({ queryKey: ["finance", "summary"] });
    },
  });
}

export function useUpdateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStructureInput> }) =>
      financeService.updateStructure(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: feeStructureKeys.all });
      qc.invalidateQueries({ queryKey: feeStructureKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["finance", "student-fees"] });
    },
  });
}

export function useDeleteFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeService.deleteStructure(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeStructureKeys.all });
      qc.invalidateQueries({ queryKey: ["finance", "summary"] });
      qc.invalidateQueries({ queryKey: ["finance", "student-fees"] });
    },
  });
}
