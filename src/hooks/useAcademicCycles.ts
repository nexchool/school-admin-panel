import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  academicStructureService,
  type AcademicCycle,
  type AcademicCycleChanges,
  type AcademicCycleInput,
} from "@/services/academicStructureService";
import { useAuth } from "@/components/providers/AuthProvider";

export const academicCyclesKeys = {
  all: ["academicCycles"] as const,
  list: (academicYearId?: string) =>
    [...academicCyclesKeys.all, "list", academicYearId] as const,
};

/**
 * The cycles inside one academic year.
 *
 * Gated on the year, not merely enabled by it: asking for the cycles of "no
 * year" would return the wrong list to a form that has not been filled in yet.
 */
export function useAcademicCycles(
  academicYearId?: string,
  options?: { enabled?: boolean },
) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...academicCyclesKeys.list(academicYearId), tenantId],
    queryFn: () => academicStructureService.academicCycles(academicYearId!),
    enabled: !!tenantId && !!academicYearId && (options?.enabled ?? true),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  // Prefix invalidation: tenantId is the last key segment, so this reaches
  // every year's list without naming one.
  qc.invalidateQueries({ queryKey: academicCyclesKeys.all });
  // A class's cycle choices come from this list.
  qc.invalidateQueries({ queryKey: ["classes"] });
}

export function useCreateAcademicCycle() {
  const qc = useQueryClient();
  return useMutation<AcademicCycle, Error, AcademicCycleInput>({
    mutationFn: (input) => academicStructureService.addAcademicCycle(input),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateAcademicCycle() {
  const qc = useQueryClient();
  return useMutation<
    AcademicCycle,
    Error,
    { id: string; changes: AcademicCycleChanges }
  >({
    mutationFn: ({ id, changes }) =>
      academicStructureService.updateAcademicCycle(id, changes),
    onSuccess: () => invalidate(qc),
  });
}

export function useArchiveAcademicCycle() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => academicStructureService.archiveAcademicCycle(id),
    onSuccess: () => invalidate(qc),
  });
}
