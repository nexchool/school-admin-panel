"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { classesService } from "@/services/classesService";
import { useActiveUnit } from "@/contexts/ActiveUnitContext";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import type { CreateClassInput } from "@/types/class";

type ListFilters = {
  academic_year_id?: string | null;
  school_unit_id?: string | null;
};

export const classesKeys = {
  all: ["classes"] as const,
  list: (params?: ListFilters) => [...classesKeys.all, "list", params] as const,
  detail: (id: string) => [...classesKeys.all, "detail", id] as const,
};

/**
 * If `overrides` is provided, those values override the context.
 * Pass `null` (not `undefined`) to explicitly clear a filter; `undefined`
 * means "use context value". This lets per-page filter UIs override one
 * scope (e.g. year) while inheriting the other (unit) from the header.
 */
export function useClasses(overrides?: ListFilters) {
  const { unitId } = useActiveUnit();
  const { academicYearId } = useActiveAcademicYear();

  const academic_year_id =
    overrides && "academic_year_id" in overrides
      ? overrides.academic_year_id
      : academicYearId;
  const school_unit_id =
    overrides && "school_unit_id" in overrides
      ? overrides.school_unit_id
      : unitId;

  const params: ListFilters = { academic_year_id, school_unit_id };

  return useQuery({
    queryKey: classesKeys.list(params),
    queryFn: () =>
      classesService.getClasses({
        academic_year_id: academic_year_id ?? undefined,
        school_unit_id: school_unit_id ?? undefined,
      }),
  });
}

export function useClass(id: string | null) {
  return useQuery({
    queryKey: classesKeys.detail(id ?? ""),
    queryFn: () => classesService.getClass(id!),
    enabled: !!id,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClassInput) => classesService.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classesKeys.all });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: string; data: Partial<CreateClassInput> }) =>
      classesService.updateClass(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: classesKeys.all });
      queryClient.invalidateQueries({
        queryKey: classesKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classesService.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classesKeys.all });
    },
  });
}
