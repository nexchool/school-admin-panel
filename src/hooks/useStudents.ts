"use client";

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  studentsService,
  type StudentsListParams,
  type StudentsListResult,
} from "@/services/studentsService";
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from "@/types/student";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";

export const studentsKeys = {
  all: ["students"] as const,
  list: (params?: StudentsListParams) =>
    [...studentsKeys.all, "list", params] as const,
  detail: (id: string) => [...studentsKeys.all, "detail", id] as const,
};

/**
 * If `params.academic_year_id` is undefined, the active academic year context
 * value is used. Pass an explicit string to override (explicit wins).
 */
export function useStudents(params?: StudentsListParams) {
  const { academicYearId } = useActiveAcademicYear();
  const merged: StudentsListParams = {
    ...params,
    academic_year_id:
      params?.academic_year_id ?? academicYearId ?? undefined,
  };

  return useQuery<StudentsListResult>({
    queryKey: studentsKeys.list(merged),
    queryFn: () => studentsService.getStudents(merged),
    // Keep showing the previous page while a new page/search is fetching.
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string | null) {
  return useQuery({
    queryKey: studentsKeys.detail(id ?? ""),
    queryFn: () => studentsService.getStudent(id!),
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentInput) =>
      studentsService.createStudent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudentInput }) =>
      studentsService.updateStudent(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      queryClient.invalidateQueries({
        queryKey: studentsKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
    },
  });
}
