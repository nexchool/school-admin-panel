"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  mediumsService,
  type CreateMediumInput,
  type MediumDto,
} from "@/services/mediumsService";
import {
  subjectContextsService,
  type SubjectContextDto,
  type SubjectContextUpsertInput,
} from "@/services/subjectContextsService";

export const subjectContextKeys = {
  all: ["subject-contexts"] as const,
  forGrade: (programmeId: string, gradeId: string) =>
    [...subjectContextKeys.all, programmeId, gradeId] as const,
};

export const mediumKeys = {
  all: ["mediums"] as const,
};

export function useMediums() {
  return useQuery<MediumDto[]>({
    queryKey: mediumKeys.all,
    queryFn: () => mediumsService.list(),
  });
}

export function useCreateMedium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMediumInput) => mediumsService.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediumKeys.all });
    },
  });
}

export function useSubjectContexts(
  programmeId: string,
  gradeId: string,
  enabled = true,
) {
  return useQuery<SubjectContextDto[]>({
    queryKey: subjectContextKeys.forGrade(programmeId, gradeId),
    queryFn: () =>
      subjectContextsService.list({
        programme_id: programmeId,
        grade_id: gradeId,
      }),
    enabled: enabled && !!programmeId && !!gradeId,
  });
}

export function useBulkUpsertSubjectContexts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      programme_id: string;
      grade_id: string;
      contexts: SubjectContextUpsertInput[];
      delete_missing?: boolean;
    }) => subjectContextsService.bulkUpsert(payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: subjectContextKeys.forGrade(
          variables.programme_id,
          variables.grade_id,
        ),
      });
    },
  });
}

export function useApplySubjectContexts() {
  return useMutation({
    mutationFn: (payload: { programme_id: string; grade_id: string }) =>
      subjectContextsService.apply(payload),
  });
}
