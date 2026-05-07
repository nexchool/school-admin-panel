"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  schoolSetupService,
  type DuplicatePayload,
  type PromoteYearPayload,
  type SetupStatus,
  type TemplateGroup,
  type TemplateItem,
} from "@/services/schoolSetupService";

export const schoolSetupKeys = {
  status: ["school-setup", "status"] as const,
  templates: ["school-setup", "templates"] as const,
  templateItems: (groupId: string) =>
    ["school-setup", "templates", groupId, "items"] as const,
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

export function useImportExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      academicYearId,
      mapping,
    }: {
      file: File;
      academicYearId: string;
      mapping?: Record<string, string>;
    }) => schoolSetupService.setup.importExcel(file, academicYearId, mapping),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      invalidateStatus(qc);
    },
  });
}

/**
 * @deprecated Use {@link useImportExcel} instead. Kept for backward-compat
 * until CsvImportDialog is replaced in Task 31.
 */
export const useImportCsv = useImportExcel;

export function useParseImportHeaders() {
  return useMutation({
    mutationFn: (file: File) =>
      schoolSetupService.setup.parseImportHeaders(file),
  });
}

export function useTemplates() {
  return useQuery<{ data: TemplateGroup[] }>({
    queryKey: schoolSetupKeys.templates,
    queryFn: () => schoolSetupService.setup.listTemplates(),
  });
}

export function useTemplateItems(groupId: string | null) {
  return useQuery<{ data: TemplateItem[] }>({
    queryKey: groupId
      ? schoolSetupKeys.templateItems(groupId)
      : ["school-setup", "templates", null, "items"],
    queryFn: () => schoolSetupService.setup.templateItems(groupId!),
    enabled: !!groupId,
  });
}

export function useApplySubjectOfferings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (academicYearId: string) =>
      schoolSetupService.setup.applySubjectOfferings(academicYearId),
    onSuccess: () => {
      invalidateStatus(qc);
      qc.invalidateQueries({ queryKey: ["class-subjects"] });
    },
  });
}
