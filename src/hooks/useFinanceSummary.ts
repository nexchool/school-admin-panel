"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useAuth } from "@/components/providers/AuthProvider";

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
  const { tenantId } = useAuth();
  const merged = {
    ...params,
    academic_year_id: params?.academic_year_id ?? academicYearId ?? undefined,
  };

  return useQuery({
    queryKey: [...financeSummaryKeys.detail(merged), tenantId],
    queryFn: () => financeService.getSummary(merged),
    enabled: !!tenantId && !!merged.academic_year_id,
    staleTime: 30_000,
  });
}
