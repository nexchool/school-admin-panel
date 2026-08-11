"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/useAppMutation";
import { classesService } from "@/services/classesService";
import { useActiveUnit } from "@/contexts/ActiveUnitContext";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import { studentsKeys } from "@/hooks/useStudents";
import type { ClassesListFilters, CreateClassInput } from "@/types/class";

type ListFilters = {
  academic_year_id?: string | null;
  school_unit_id?: string | null;
};

export const classesKeys = {
  all: ["classes"] as const,
  list: (params?: ListFilters) => [...classesKeys.all, "list", params] as const,
  paginated: (params?: ClassesListFilters) =>
    [...classesKeys.all, "paginated", params] as const,
  stats: (params?: ClassesListFilters) =>
    [...classesKeys.all, "stats", params] as const,
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
  const { tenantId } = useAuth();

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
    queryKey: [...classesKeys.list(params), tenantId],
    queryFn: () =>
      classesService.getClasses({
        academic_year_id: academic_year_id ?? undefined,
        school_unit_id: school_unit_id ?? undefined,
      }),
    enabled: !!tenantId && !!academic_year_id,
  });
}

/**
 * Paginated/filterable class list for the classes table.
 *
 * Distinct from {@link useClasses}, which fetches the *whole* list for the
 * structured pickers. Filters are passed through verbatim; the caller owns
 * them (the classes page keeps them in the URL).
 *
 * Gated on `academic_year_id` as well as tenant: the active year resolves
 * asynchronously (ActiveScopeProvider starts it at null) and the backend reads
 * a missing year as "every year", so firing early would flash totals and rows
 * pooled across archived years before snapping to the right ones.
 *
 * `placeholderData` keeps the previous page on screen while the next one
 * loads, so paging doesn't flash an empty table.
 */
export function useClassesList(filters: ClassesListFilters) {
  return useTenantQuery({
    queryKey: classesKeys.paginated(filters),
    queryFn: () => classesService.listClasses(filters),
    enabled: !!filters.academic_year_id,
    placeholderData: keepPreviousData,
  });
}

/** Aggregate header totals over the same filters as {@link useClassesList}. */
export function useClassesStats(filters: ClassesListFilters) {
  return useTenantQuery({
    queryKey: classesKeys.stats(filters),
    queryFn: () => classesService.getClassesStats(filters),
    enabled: !!filters.academic_year_id,
    placeholderData: keepPreviousData,
  });
}

export function useClass(id: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...classesKeys.detail(id ?? ""), tenantId],
    queryFn: () => classesService.getClass(id!),
    enabled: !!id && !!tenantId,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (data: CreateClassInput) => classesService.createClass(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: classesKeys.all });
        // Keep the wizard's completion status fresh (matches the other masters).
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    { success: "Class created", error: "Couldn't create the class", retry: true },
  );
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
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
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    { success: "Class updated", error: "Couldn't update the class", retry: true },
  );
}

/**
 * Two sections become one.
 *
 * Invalidates more than the two sections involved: the children moved, so
 * every student list and every class roster is now wrong, and the absorbed
 * section has left every picker. Prefix invalidation on `classesKeys.all`
 * covers the class side; students are cleared by their own prefix.
 */
export function useMergeSections() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({
        sourceId,
        intoId,
        reason,
      }: { sourceId: string; intoId: string; reason?: string }) =>
        classesService.mergeSections(sourceId, intoId, reason),
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: classesKeys.all });
        queryClient.invalidateQueries({
          queryKey: classesKeys.detail(variables.sourceId),
        });
        queryClient.invalidateQueries({
          queryKey: classesKeys.detail(variables.intoId),
        });
        queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      },
    },
    {
      success: "Sections merged",
      error: "Couldn't merge the sections",
      retry: false,
    },
  );
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (id: string) => classesService.deleteClass(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: classesKeys.all });
        queryClient.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
    },
    { success: "Class deleted", error: "Couldn't delete the class", retry: true },
  );
}
