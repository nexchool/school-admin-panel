"use client";

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  teachersService,
  type TeachersListParams,
  type TeachersListResult,
} from "@/services/teachersService";
import type {
  Teacher,
  CreateTeacherInput,
  UpdateTeacherInput,
  CreateTeacherResponse,
} from "@/types/teacher";

export const teachersKeys = {
  all: ["teachers"] as const,
  list: (params?: TeachersListParams) =>
    [...teachersKeys.all, "list", params] as const,
  detail: (id: string) => [...teachersKeys.all, "detail", id] as const,
};

export function useTeachers(params?: TeachersListParams) {
  return useQuery<TeachersListResult>({
    queryKey: teachersKeys.list(params),
    queryFn: () => teachersService.getTeachers(params),
    placeholderData: keepPreviousData,
  });
}

export function useTeacher(id: string | null) {
  return useQuery({
    queryKey: teachersKeys.detail(id ?? ""),
    queryFn: () => teachersService.getTeacher(id!),
    enabled: !!id,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeacherInput) =>
      teachersService.createTeacher(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachersKeys.all });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeacherInput }) =>
      teachersService.updateTeacher(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teachersKeys.all });
      queryClient.invalidateQueries({
        queryKey: teachersKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teachersService.deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachersKeys.all });
    },
  });
}
