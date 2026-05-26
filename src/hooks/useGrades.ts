"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import { gradesService, type Grade } from "@/services/gradesService";
import { useAuth } from "@/components/providers/AuthProvider";

export const gradesKeys = {
  all: ["grades"] as const,
  list: () => [...gradesKeys.all, "list"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: gradesKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useGrades() {
  const { tenantId } = useAuth();
  return useQuery<Grade[]>({
    queryKey: [...gradesKeys.list(), tenantId],
    queryFn: () => gradesService.list(),
    enabled: !!tenantId,
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Grade>) => gradesService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Grade>) =>
      gradesService.update(id, data),
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
