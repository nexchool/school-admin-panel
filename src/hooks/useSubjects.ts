"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { subjectsService } from "@/services/subjectsService";
import type {
  Subject,
  CreateSubjectInput,
  UpdateSubjectInput,
} from "@/types/subject";
import { useAuth } from "@/components/providers/AuthProvider";

export const subjectsKeys = {
  all: ["subjects"] as const,
  list: () => [...subjectsKeys.all, "list"] as const,
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
  return useMutation({
    mutationFn: (input: CreateSubjectInput) =>
      subjectsService.createSubject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubjectInput }) =>
      subjectsService.updateSubject(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
      queryClient.invalidateQueries({
        queryKey: subjectsKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectsService.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectsKeys.all });
    },
  });
}
