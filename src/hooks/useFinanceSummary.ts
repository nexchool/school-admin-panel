"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";

export const financeSummaryKeys = {
  all: ["finance", "summary"] as const,
  detail: (params?: { academic_year_id?: string; class_id?: string; include_recent_payments?: number }) =>
    [...financeSummaryKeys.all, params] as const,
};

/**
 * If `params.academic_year_id` is undefined, the active academic year context
 * value is used. Pass an explicit string to override (explicit wins).
 */
export function useFinanceSummary(params?: {
  academic_year_id?: string;
  class_id?: string;
  include_recent_payments?: number;
}) {
  const { academicYearId } = useActiveAcademicYear();
  const merged = {
    ...params,
    academic_year_id: params?.academic_year_id ?? academicYearId ?? undefined,
  };

  return useQuery({
    queryKey: financeSummaryKeys.detail(merged),
    queryFn: () => financeService.getSummary(merged),
    staleTime: 30_000,
  });
}
