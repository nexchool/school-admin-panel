"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { useAuth } from "@/components/providers/AuthProvider";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

export function useDashboard() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...dashboardKeys.all, tenantId],
    queryFn: () => dashboardService.get(),
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
