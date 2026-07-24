"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import {
  holidayService,
  type CreateHolidayPayload,
  type Holiday,
} from "@/services/holidayService";
import { useAuth } from "@/components/providers/AuthProvider";

export type { Holiday } from "@/services/holidayService";

export const holidayKeys = {
  all: ["holidays"] as const,
  list: (params?: { academic_year_id?: string; include_recurring?: boolean }) =>
    [...holidayKeys.all, "list", params] as const,
};

/**
 * Fetch holidays, optionally filtered by academic year.
 * If the query fails the hook returns an empty array (non-blocking).
 */
export function useHolidays(params?: {
  academic_year_id?: string;
  include_recurring?: boolean;
}) {
  const { tenantId } = useAuth();
  return useQuery<Holiday[]>({
    queryKey: [...holidayKeys.list(params), tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.academic_year_id) q.set("academic_year_id", params.academic_year_id);
      if (params?.include_recurring === false) q.set("include_recurring", "false");
      const suffix = q.toString() ? `?${q.toString()}` : "";
      const url = `/api/holidays/${suffix}`;
      const data = await apiGet<Holiday[] | { data: Holiday[] }>(url);
      const arr = Array.isArray(data) ? data : (data as { data: Holiday[] })?.data;
      return Array.isArray(arr) ? arr : [];
    },
  });
}

function invalidateHolidayConsumers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: holidayKeys.all });
  // The academic calendar derives day classification and stats from holidays.
  qc.invalidateQueries({ queryKey: ["academic-calendar"] });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateHolidayPayload) =>
      holidayService.createHoliday(payload),
    onSuccess: () => invalidateHolidayConsumers(qc),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateHolidayPayload> }) =>
      holidayService.updateHoliday(id, data),
    onSuccess: () => invalidateHolidayConsumers(qc),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => holidayService.deleteHoliday(id),
    onSuccess: () => invalidateHolidayConsumers(qc),
  });
}
