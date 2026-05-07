"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditLogService, type AuditLogFilters } from "@/services/auditLogService";

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (f: AuditLogFilters) => [...auditLogKeys.all, "list", f] as const,
};

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () => auditLogService.list(filters),
    placeholderData: keepPreviousData,
  });
}
