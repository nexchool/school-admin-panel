"use client";

import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/useAppMutation";
import { subjectsService } from "@/services/subjectsService";
import { classSubjectsService } from "@/services/classSubjectsService";
import { classSubjectsKeys } from "@/hooks/useClassSubjects";
import type {
  CreateSubjectInput,
  SubjectsListParams,
  UpdateSubjectInput,
} from "@/types/subject";
import { useAuth } from "@/components/providers/AuthProvider";
import { schoolSetupKeys } from "@/hooks/useSchoolSetup";

export const subjectsKeys = {
  all: ["subjects"] as const,
  list: () => [...subjectsKeys.all, "list"] as const,
  paginated: (params: SubjectsListParams) =>
    [...subjectsKeys.all, "paginated", params] as const,
  detail: (id: string) => [...subjectsKeys.all, "detail", id] as const,
};

export function useSubjects() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...subjectsKeys.list(), tenantId],
    queryFn: () => subjectsService.getSubjects(),
    enabled: !!tenantId,
  });
}

/** Server-paginated + searchable catalogue for the /subjects listing. */
export function useSubjectsList(params: SubjectsListParams) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...subjectsKeys.paginated(params), tenantId],
    queryFn: () => subjectsService.listSubjects(params),
    enabled: !!tenantId,
    placeholderData: keepPreviousData,
  });
}

export function useSubject(id: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...subjectsKeys.detail(id ?? ""), tenantId],
    queryFn: () => subjectsService.getSubject(id!),
    enabled: !!id && !!tenantId,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (input: CreateSubjectInput) =>
        subjectsService.createSubject(input),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
        // Keep the wizard's completion status fresh (matches the other masters).
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    {
      success: (_, input) => {
        const n = input.class_ids?.length ?? 0;
        return n > 0
          ? `Subject created and assigned to ${n} class${n === 1 ? "" : "es"}`
          : "Subject created";
      },
      error: "Couldn't create the subject",
      retry: true,
    },
  );
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({ id, input }: { id: string; input: UpdateSubjectInput }) =>
        subjectsService.updateSubject(id, input),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
        queryClient.invalidateQueries({
          queryKey: subjectsKeys.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    { success: "Subject updated", error: "Couldn't update the subject", retry: true },
  );
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (id: string) => subjectsService.deleteSubject(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    { success: "Subject deleted", error: "Couldn't delete the subject", retry: true },
  );
}

/** Assign one subject to many classes from the catalogue listing. */
export function useAssignSubjectClasses() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (input: {
        subjectId: string;
        classIds: string[];
        weeklyPeriods?: number;
      }) =>
        classSubjectsService.bulkAssign({
          class_ids: input.classIds,
          subject_ids: [input.subjectId],
          weekly_periods: input.weeklyPeriods,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
        queryClient.invalidateQueries({ queryKey: classSubjectsKeys.all });
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    {
      success: (result) => {
        const created = result?.created_count ?? 0;
        const skipped = result?.skipped_count ?? 0;
        const base = `Assigned to ${created} class${created === 1 ? "" : "es"}`;
        return skipped > 0 ? `${base} (${skipped} already assigned)` : base;
      },
      error: "Couldn't assign the subject to classes",
      retry: true,
    },
  );
}
