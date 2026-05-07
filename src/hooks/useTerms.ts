"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import {
  academicTermsService,
  type AcademicTerm,
} from "@/services/academicTermsService";

export const termsKeys = {
  all: ["academic-terms"] as const,
  list: (academicYearId?: string) =>
    [...termsKeys.all, "list", academicYearId ?? "all"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: termsKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useTerms(academicYearId?: string) {
  return useQuery<AcademicTerm[]>({
    queryKey: termsKeys.list(academicYearId),
    queryFn: () => academicTermsService.list(academicYearId),
  });
}

export function useCreateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AcademicTerm>) =>
      academicTermsService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicTermsService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AcademicTerm> }) =>
      academicTermsService.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}
