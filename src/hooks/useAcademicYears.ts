import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  academicYearsService,
  type AcademicYear,
} from "@/services/academicYearsService";
import { schoolSetupKeys } from "@/hooks/useSchoolSetup";

export const academicYearsKeys = {
  all: ["academicYears"] as const,
  list: (activeOnly?: boolean) =>
    [...academicYearsKeys.all, "list", activeOnly] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: academicYearsKeys.all });
  qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
}

export function useAcademicYears(
  activeOnly = false,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: academicYearsKeys.list(activeOnly),
    queryFn: () => academicYearsService.getAcademicYears(activeOnly),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation<
    AcademicYear,
    Error,
    { name: string; start_date: string; end_date: string; is_active?: boolean }
  >({
    mutationFn: (payload) => academicYearsService.createAcademicYear(payload),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateAcademicYear() {
  const qc = useQueryClient();
  return useMutation<
    AcademicYear,
    Error,
    {
      id: string;
      data: Partial<{
        name: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
      }>;
    }
  >({
    mutationFn: ({ id, data }) =>
      academicYearsService.updateAcademicYear(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}
