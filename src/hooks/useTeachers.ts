"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/useAppMutation";
import {
  teachersService,
  type TeachersListParams,
  type TeachersListResult,
} from "@/services/teachersService";
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
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
  return useAppMutation(
    {
      mutationFn: (input: CreateTeacherInput) =>
        teachersService.createTeacher(input),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: teachersKeys.all });
      },
    },
    { success: "Teacher created", error: "Couldn't create the teacher", retry: true },
  );
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({ id, input }: { id: string; input: UpdateTeacherInput }) =>
        teachersService.updateTeacher(id, input),
      onSuccess: () => {
        // Prefix invalidation — covers list + every tenant-scoped detail key.
        queryClient.invalidateQueries({ queryKey: teachersKeys.all });
      },
    },
    { success: "Teacher updated", error: "Couldn't update the teacher", retry: true },
  );
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (id: string) => teachersService.deleteTeacher(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: teachersKeys.all });
      },
    },
    { success: "Teacher deleted", error: "Couldn't delete the teacher", retry: true },
  );
}
