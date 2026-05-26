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
import { useAuth } from "@/components/providers/AuthProvider";

export const teachersKeys = {
  all: ["teachers"] as const,
  list: (tenantId: string | null, params?: TeachersListParams) =>
    [...teachersKeys.all, "list", tenantId, params] as const,
  detail: (tenantId: string | null, id: string) =>
    [...teachersKeys.all, "detail", tenantId, id] as const,
};

export function useTeachers(params?: TeachersListParams) {
  const { tenantId } = useAuth();
  return useQuery<TeachersListResult>({
    queryKey: teachersKeys.list(tenantId, params),
    queryFn: () => teachersService.getTeachers(params),
    enabled: !!tenantId,
    placeholderData: keepPreviousData,
  });
}

export function useTeacher(id: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: teachersKeys.detail(tenantId, id ?? ""),
    queryFn: () => teachersService.getTeacher(id!),
    enabled: !!id && !!tenantId,
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
    onSuccess: () => {
      // Prefix invalidation — covers list + every tenant-scoped detail key.
      queryClient.invalidateQueries({ queryKey: teachersKeys.all });
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
