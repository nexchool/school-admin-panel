"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";

export const financeSummaryKeys = {
  all: ["finance", "summary"] as const,
  detail: (params?: { academic_year_id?: string; class_id?: string; include_recent_payments?: number }) =>
    [...financeSummaryKeys.all, params] as const,
};

export function useFinanceSummary(params?: {
  academic_year_id?: string;
  class_id?: string;
  include_recent_payments?: number;
}) {
  return useQuery({
    queryKey: financeSummaryKeys.detail(params),
    queryFn: () => financeService.getSummary(params),
    staleTime: 30_000,
  });
}
