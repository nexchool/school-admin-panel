"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import {
  schoolUnitsService,
  type SchoolUnit,
} from "@/services/schoolUnitsService";
import { useAuth } from "@/components/providers/AuthProvider";

export const schoolUnitsKeys = {
  all: ["school-units"] as const,
  list: () => [...schoolUnitsKeys.all, "list"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: schoolUnitsKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useSchoolUnits(options?: { enabled?: boolean }) {
  const { tenantId } = useAuth();
  return useQuery<SchoolUnit[]>({
    queryKey: [...schoolUnitsKeys.list(), tenantId],
    queryFn: () => schoolUnitsService.list(),
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}

// No `error` toast on any of these: the branch modal and delete dialog surface
// failures inline (duplicate code on the Code field, SCHOOL_UNIT_IN_USE as a
// "Set to inactive" offer). useAppMutation still defines onError, which keeps
// the global MutationCache from firing a duplicate toast on top.
export function useCreateSchoolUnit() {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (data: Partial<SchoolUnit>) => schoolUnitsService.create(data),
      onSuccess: () => invalidateAll(qc),
    },
    { success: "Branch created" },
  );
}

export function useUpdateSchoolUnit() {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({ id, data }: { id: string; data: Partial<SchoolUnit> }) =>
        schoolUnitsService.update(id, data),
      onSuccess: () => invalidateAll(qc),
    },
    { success: "Branch updated" },
  );
}

export function useDeleteSchoolUnit() {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (id: string) => schoolUnitsService.remove(id),
      onSuccess: () => invalidateAll(qc),
    },
    { success: "Branch deleted" },
  );
}
