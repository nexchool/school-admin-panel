import { useQuery } from "@tanstack/react-query";
import { academicYearsService } from "@/services/academicYearsService";

export const academicYearsKeys = {
  all: ["academicYears"] as const,
  list: (activeOnly?: boolean) =>
    [...academicYearsKeys.all, "list", activeOnly] as const,
};

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
