"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import type { Holiday } from "@/services/holidayService";

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
  return useQuery<Holiday[]>({
    queryKey: holidayKeys.list(params),
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
