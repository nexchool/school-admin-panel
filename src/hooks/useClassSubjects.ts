"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { classSubjectsService } from "@/services/classSubjectsService";
import type {
  ClassSubjectOffering,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
  CreateSubjectTeacherInput,
} from "@/types/classSubject";

export const classSubjectsKeys = {
  all: ["class-subjects"] as const,
  list: (classId: string) => [...classSubjectsKeys.all, "list", classId] as const,
  teachers: (classId: string) =>
    [...classSubjectsKeys.all, "subject-teachers", classId] as const,
};

export function useClassSubjectOfferings(classId: string | null) {
  return useQuery({
    queryKey: classSubjectsKeys.list(classId ?? ""),
    queryFn: () => classSubjectsService.listForClass(classId!),
    enabled: !!classId,
  });
}

export function useClassSubjectTeachers(
  classId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: classSubjectsKeys.teachers(classId ?? ""),
    queryFn: () => classSubjectsService.listSubjectTeachers(classId!),
    enabled: !!classId && (options?.enabled ?? true),
  });
}

export function useCreateClassSubject(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassSubjectInput) =>
      classSubjectsService.create(classId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: classSubjectsKeys.list(classId),
      });
    },
  });
}

export function useUpdateClassSubject(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      classSubjectId,
      input,
    }: {
      classSubjectId: string;
      input: UpdateClassSubjectInput;
    }) => classSubjectsService.update(classId, classSubjectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: classSubjectsKeys.list(classId),
      });
    },
  });
}

export function useRemoveClassSubject(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classSubjectId: string) =>
      classSubjectsService.remove(classId, classSubjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: classSubjectsKeys.list(classId),
      });
      queryClient.invalidateQueries({
        queryKey: classSubjectsKeys.teachers(classId),
      });
    },
  });
}

export function useAssignSubjectTeacher(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubjectTeacherInput) =>
      classSubjectsService.assignTeacher(classId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: classSubjectsKeys.teachers(classId),
      });
    },
  });
}

export function useRemoveSubjectTeacher(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      classSubjectsService.removeTeacherAssignment(classId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: classSubjectsKeys.teachers(classId),
      });
    },
  });
}

export type { ClassSubjectOffering };
