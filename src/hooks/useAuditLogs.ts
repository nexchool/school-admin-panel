"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditLogService, type AuditLogFilters } from "@/services/auditLogService";
import { useAuth } from "@/components/providers/AuthProvider";

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (f: AuditLogFilters) => [...auditLogKeys.all, "list", f] as const,
};

export function useAuditLogs(filters: AuditLogFilters) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...auditLogKeys.list(filters), tenantId],
    queryFn: () => auditLogService.list(filters),
    enabled: !!tenantId,
    placeholderData: keepPreviousData,
  });
}
