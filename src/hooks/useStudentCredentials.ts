"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import { studentsKeys } from "@/hooks/useStudents";
import {
  studentCredentialsService,
  type BulkTarget,
  type CredentialStatus,
} from "@/services/studentCredentialsService";

export const studentCredentialsKeys = {
  all: ["student-credentials"] as const,
  status: (studentId: string) =>
    [...studentCredentialsKeys.all, "status", studentId] as const,
};

/**
 * Whether this child can sign in, and how.
 *
 * Cached like any other read because it carries no secret — there is no
 * password in this payload and no endpoint that would produce one. The
 * plaintext lives only in the response to the mutation that generated it, and
 * is deliberately never written into this cache.
 */
export function useStudentCredentialStatus(
  studentId: string,
  options?: { enabled?: boolean },
) {
  return useTenantQuery<CredentialStatus>({
    queryKey: studentCredentialsKeys.status(studentId),
    queryFn: () => studentCredentialsService.getStatus(studentId),
    enabled: options?.enabled ?? true,
  });
}

function useCredentialRefresh() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: studentCredentialsKeys.all });
    // A student who can now sign in reads differently in the list too.
    queryClient.invalidateQueries({ queryKey: studentsKeys.all });
  };
}

export function useIssueStudentCredential() {
  const refresh = useCredentialRefresh();
  return useAppMutation(
    {
      mutationFn: ({
        studentId,
        reset,
      }: {
        studentId: string;
        reset?: boolean;
      }) => studentCredentialsService.issue(studentId, { reset }),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        result.status === "reset"
          ? "New password created. The old one no longer works."
          : "Password created",
      error: "Couldn't create a password for this student",
    },
  );
}

export function useIssueStudentPin() {
  const refresh = useCredentialRefresh();
  return useAppMutation(
    {
      mutationFn: ({ studentId, reset }: { studentId: string; reset?: boolean }) =>
        studentCredentialsService.issuePin(studentId, { reset }),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        result.status === "reset"
          ? "New PIN created. The old one no longer works."
          : "PIN created",
      error: "Couldn't create a PIN for this student",
    },
  );
}

export function useForceStudentPinChange() {
  const refresh = useCredentialRefresh();
  return useAppMutation(
    {
      mutationFn: (studentId: string) =>
        studentCredentialsService.forcePinChange(studentId),
      onSuccess: refresh,
    },
    {
      success: "They'll be asked to choose a new PIN next time they sign in",
      error: "Couldn't ask for a PIN change",
    },
  );
}

export function useForceStudentPasswordChange() {
  const refresh = useCredentialRefresh();
  return useAppMutation(
    {
      mutationFn: (studentId: string) =>
        studentCredentialsService.forceChange(studentId),
      onSuccess: refresh,
    },
    {
      success: "They'll be asked to choose a new password next time they sign in",
      error: "Couldn't ask for a password change",
    },
  );
}

export function useBulkIssueStudentCredentials() {
  const refresh = useCredentialRefresh();
  return useAppMutation(
    {
      mutationFn: ({
        target,
        reset,
      }: {
        target: BulkTarget;
        reset?: boolean;
      }) => studentCredentialsService.bulkIssue(target, { reset }),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        `${result.issued} password${result.issued === 1 ? "" : "s"} created`,
      error: "Couldn't create passwords for this class",
    },
  );
}

export function useBackfillAdmissionIds() {
  const refresh = useCredentialRefresh();
  return useAppMutation(
    {
      mutationFn: (target: BulkTarget) =>
        studentCredentialsService.backfillAdmissionIds(target),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        `${result.issued} student${
          result.issued === 1 ? "" : "s"
        } can now sign in with their admission number`,
      error: "Couldn't set up admission-number sign-in",
    },
  );
}
