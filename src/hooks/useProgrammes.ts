"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import {
  programmesService,
  type AcademicProgramme,
} from "@/services/programmesService";

export const programmesKeys = {
  all: ["programmes"] as const,
  list: () => [...programmesKeys.all, "list"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: programmesKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useProgrammes() {
  return useQuery<AcademicProgramme[]>({
    queryKey: programmesKeys.list(),
    queryFn: () => programmesService.list(),
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AcademicProgramme>) =>
      programmesService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AcademicProgramme> }) =>
      programmesService.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => programmesService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
