"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { studentsKeys } from "@/hooks/useStudents";
import {
  studentLifecycleService,
  type LifecycleInput,
  type LifecycleStudent,
  type ReEnrollInput,
  type TransferOutInput,
  type TransferSectionInput,
} from "@/services/studentLifecycleService";

/**
 * The lifecycle acts, as mutations.
 *
 * Each one changes more than the student it names — the class roll, the
 * billable headcount, the student's own history — so all of them invalidate
 * the whole `students` prefix rather than trying to patch a cache entry.
 * Being exact here would mean knowing every list a withdrawn child drops out
 * of, and being wrong once means showing a class a student who has left.
 *
 * Prefix invalidation reaches every tenant scope because `tenantId` is the
 * last segment of the key (see `.claude/rules/query-conventions.md`).
 */
function useLifecycleAction<TInput extends LifecycleInput>(
  act: (input: TInput) => Promise<LifecycleStudent>,
  toasts: { success: (student: LifecycleStudent) => string; error: string },
) {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: act,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: studentsKeys.all });
        // A student leaving or returning changes who is in a class and who
        // the school is billed for.
        queryClient.invalidateQueries({ queryKey: ["classes"] });
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      },
    },
    { success: toasts.success, error: toasts.error },
  );
}

export function useWithdrawStudent() {
  return useLifecycleAction<LifecycleInput>(studentLifecycleService.withdraw, {
    success: (student) => `${student.fullName} has been withdrawn`,
    error: "Couldn't withdraw this student",
  });
}

export function useGraduateStudent() {
  return useLifecycleAction<LifecycleInput>(studentLifecycleService.graduate, {
    success: (student) => `${student.fullName} has graduated`,
    error: "Couldn't record this graduation",
  });
}

export function useReEnrollStudent() {
  return useLifecycleAction<ReEnrollInput>(studentLifecycleService.reEnroll, {
    success: (student) => `${student.fullName} is enrolled again`,
    error: "Couldn't re-enroll this student",
  });
}

export function useTransferStudentToSection() {
  return useLifecycleAction<TransferSectionInput>(
    studentLifecycleService.transferToSection,
    {
      success: (student) =>
        student.currentClass
          ? `${student.fullName} moved to ${student.currentClass.name ?? ""} ${
              student.currentClass.section ?? ""
            }`.trim()
          : `${student.fullName} has been moved`,
      error: "Couldn't move this student",
    },
  );
}

export function useTransferStudentOut() {
  return useLifecycleAction<TransferOutInput>(
    studentLifecycleService.transferOut,
    {
      success: (student) => `${student.fullName} has been transferred out`,
      error: "Couldn't record this transfer",
    },
  );
}
