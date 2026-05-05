"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import { gradesService, type Grade } from "@/services/gradesService";

export const gradesKeys = {
  all: ["grades"] as const,
  list: () => [...gradesKeys.all, "list"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: gradesKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useGrades() {
  return useQuery<Grade[]>({
    queryKey: gradesKeys.list(),
    queryFn: () => gradesService.list(),
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Grade>) => gradesService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gradesService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
