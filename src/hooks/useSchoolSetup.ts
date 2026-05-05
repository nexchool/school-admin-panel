"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  schoolSetupService,
  type DuplicatePayload,
  type PromoteYearPayload,
  type SetupStatus,
} from "@/services/schoolSetupService";

export const schoolSetupKeys = {
  status: ["school-setup", "status"] as const,
};

export function useSetupStatus() {
  return useQuery<SetupStatus>({
    queryKey: schoolSetupKeys.status,
    queryFn: () => schoolSetupService.setup.status(),
    retry: 2,
    staleTime: 30_000,
  });
}

export function useCompleteSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => schoolSetupService.setup.complete(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
    },
  });
}

function invalidateStatus(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useDuplicateStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DuplicatePayload) =>
      schoolSetupService.setup.duplicateStructure(payload),
    onSuccess: () => invalidateStatus(qc),
  });
}

export function usePromoteYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PromoteYearPayload) =>
      schoolSetupService.setup.promoteYear(payload),
    onSuccess: () => invalidateStatus(qc),
  });
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      academicYearId,
    }: {
      file: File;
      academicYearId: string;
    }) => schoolSetupService.setup.importCsv(file, academicYearId),
    onSuccess: () => invalidateStatus(qc),
  });
}
