"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    // Goes through the service rather than fetching here. This hook used to
    // hold its own copy of the request, with a different set of filters from
    // the service's — two readers of one endpoint, which is how a filter comes
    // to work on one screen and not another.
    queryFn: () => holidayService.getHolidays(params),
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
