"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import {
  attendanceCorrectionsService,
  type AttendanceCorrection,
} from "@/services/attendanceCorrectionsService";

export const correctionKeys = {
  all: ["attendance-corrections"] as const,
  pending: () => [...correctionKeys.all, "pending"] as const,
  forRecord: (recordId: string) =>
    [...correctionKeys.all, "record", recordId] as const,
};

/** What is waiting on a decision. */
export function usePendingCorrections(options?: { enabled?: boolean }) {
  return useTenantQuery({
    queryKey: correctionKeys.pending(),
    queryFn: () => attendanceCorrectionsService.pending(),
    enabled: options?.enabled ?? true,
  });
}

/** One register entry's history of changes. */
export function useRecordCorrections(recordId: string | null) {
  return useTenantQuery({
    queryKey: correctionKeys.forRecord(recordId ?? ""),
    queryFn: () => attendanceCorrectionsService.forRecord(recordId!),
    enabled: !!recordId,
  });
}

/**
 * Anything that decides a correction may change a mark, so all three
 * invalidate attendance as well as the queue. A register left showing the old
 * value is the thing this workflow exists to prevent.
 */
function useInvalidateAfterDeciding() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: correctionKeys.all });
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
  };
}

export function useRequestCorrection() {
  const invalidate = useInvalidateAfterDeciding();
  return useAppMutation(
    {
      mutationFn: (input: {
        recordId: string;
        toStatus: string;
        reason: string;
      }) => attendanceCorrectionsService.request(input),
      onSuccess: invalidate,
    },
    {
      // Whether it took effect depends on the school's own setting, and on
      // whether the person asking could have approved it anyway. Saying
      // "sent for approval" when the register already changed would be a lie.
      success: (result) =>
        result.applied ? "The register has been corrected" : "Sent for approval",
      error: "Couldn't ask for this correction",
    },
  );
}

export function useApproveCorrection() {
  const invalidate = useInvalidateAfterDeciding();
  return useAppMutation(
    {
      mutationFn: (input: { id: string; note?: string }) =>
        attendanceCorrectionsService.approve(input),
      onSuccess: invalidate,
    },
    { success: "Correction approved", error: "Couldn't approve this correction" },
  );
}

export function useRejectCorrection() {
  const invalidate = useInvalidateAfterDeciding();
  return useAppMutation(
    {
      mutationFn: (input: { id: string; note?: string }) =>
        attendanceCorrectionsService.reject(input),
      onSuccess: invalidate,
    },
    { success: "Correction rejected", error: "Couldn't reject this correction" },
  );
}

export type { AttendanceCorrection };
