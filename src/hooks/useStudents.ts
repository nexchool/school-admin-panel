"use client";

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/useAppMutation";
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
import { useAuth } from "@/components/providers/AuthProvider";

export const studentsKeys = {
  all: ["students"] as const,
  list: (tenantId: string | null, params?: StudentsListParams) =>
    [...studentsKeys.all, "list", tenantId, params] as const,
  detail: (tenantId: string | null, id: string) =>
    [...studentsKeys.all, "detail", tenantId, id] as const,
};

/**
 * If `params.academic_year_id` is undefined, the active academic year context
 * value is used. Pass an explicit string to override (explicit wins).
 *
 * Query is disabled until both tenant and academic year are known — this
 * prevents the wasted "first request with undefined params" that fires while
 * ActiveScopeProvider is still resolving the active year on a fresh login.
 */
export function useStudents(params?: StudentsListParams) {
  const { academicYearId } = useActiveAcademicYear();
  const { tenantId } = useAuth();
  const academicYear = params?.academic_year_id ?? academicYearId ?? undefined;
  const merged: StudentsListParams = {
    ...params,
    academic_year_id: academicYear,
  };

  return useQuery<StudentsListResult>({
    queryKey: studentsKeys.list(tenantId, merged),
    queryFn: () => studentsService.getStudents(merged),
    enabled: !!tenantId && !!academicYear,
    // Keep showing the previous page while a new page/search is fetching.
    placeholderData: keepPreviousData,
  });
}

/**
 * Student search for pickers (hostel allocation, gatepass, visitor check-in,
 * gatekeeper). Unlike {@link useStudents} this is gated only on tenant — it must
 * work even when no active academic year is set, since picking a resident or a
 * visitor's student is not year-scoped. The backend list endpoint treats
 * `academic_year_id` as optional, so omitting it returns all matching students.
 * Cached under a separate `"search"` namespace so it never collides with the
 * year-scoped main list.
 */
export function useStudentSearch(
  params?: StudentsListParams,
  opts?: { enabled?: boolean },
) {
  const { tenantId } = useAuth();
  return useQuery<StudentsListResult>({
    queryKey: [...studentsKeys.all, "search", tenantId, params],
    queryFn: () => studentsService.getStudents(params ?? {}),
    enabled: !!tenantId && (opts?.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: studentsKeys.detail(tenantId, id ?? ""),
    queryFn: () => studentsService.getStudent(id!),
    enabled: !!id && !!tenantId,
  });
}

// Create/update surface their errors inline in StudentFormModal (which keeps
// the modal open and shows a field-level message), so the hook only owns the
// success toast — adding an error toast here would double it.
export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (input: CreateStudentInput) =>
        studentsService.createStudent(input),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      },
    },
    { success: "Student added" },
  );
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({ id, input }: { id: string; input: UpdateStudentInput }) =>
        studentsService.updateStudent(id, input),
      onSuccess: () => {
        // Prefix invalidation — covers list + every tenant-scoped detail key.
        queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      },
    },
    { success: "Student updated" },
  );
}

// No centralized toast: this mutation is fired per-row inside a bulk-delete
// loop on the list page, so the call site shows one aggregated toast instead.
export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
    },
  });
}

export function useBulkUpdateStudentStatus() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({
        studentIds,
        studentStatus,
      }: {
        studentIds: string[];
        studentStatus: string;
      }) => studentsService.bulkUpdateStatus(studentIds, studentStatus),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      },
    },
    {
      success: (result) => {
        const n = result.updated;
        return `Updated ${n} student${n === 1 ? "" : "s"}`;
      },
      error: "Couldn't update the students",
      retry: true,
    },
  );
}
