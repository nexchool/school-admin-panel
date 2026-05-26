import { apiGet, apiGetBlob } from "@/services/api";

export type AuditLogEntry = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string;
  actor_role: string;
  module: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  unit_id: string | null;
  meta: Record<string, unknown> | null;
};

export type AuditLogPagination = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type AuditLogFilters = {
  date_from?: string;
  date_to?: string;
  module?: string[];
  action?: string[];
  user_id?: string;
  unit_id?: string;
  page?: number;
  page_size?: number;
};

function toQuery(f: AuditLogFilters): string {
  const sp = new URLSearchParams();
  if (f.date_from) sp.set("date_from", f.date_from);
  if (f.date_to) sp.set("date_to", f.date_to);
  if (f.user_id) sp.set("user_id", f.user_id);
  if (f.unit_id) sp.set("unit_id", f.unit_id);
  if (f.page) sp.set("page", String(f.page));
  if (f.page_size) sp.set("page_size", String(f.page_size));
  for (const m of f.module ?? []) sp.append("module", m);
  for (const a of f.action ?? []) sp.append("action", a);
  return sp.toString();
}

export const auditLogService = {
  list: (filters: AuditLogFilters) =>
    apiGet<{ data: AuditLogEntry[]; pagination: AuditLogPagination }>(
      `/api/audit-logs/${toQuery(filters) ? `?${toQuery(filters)}` : ""}`,
    ),
  exportXlsx: (filters: AuditLogFilters) =>
    apiGetBlob(`/api/audit-logs/export${toQuery(filters) ? `?${toQuery(filters)}` : ""}`),
};
