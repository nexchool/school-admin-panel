"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import {
  schoolUnitsService,
  type SchoolUnit,
} from "@/services/schoolUnitsService";

export const schoolUnitsKeys = {
  all: ["school-units"] as const,
  list: () => [...schoolUnitsKeys.all, "list"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: schoolUnitsKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useSchoolUnits() {
  return useQuery<SchoolUnit[]>({
    queryKey: schoolUnitsKeys.list(),
    queryFn: () => schoolUnitsService.list(),
  });
}

export function useCreateSchoolUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SchoolUnit>) => schoolUnitsService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteSchoolUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schoolUnitsService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
