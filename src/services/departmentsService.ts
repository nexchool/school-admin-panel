import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";
import type {
  CreateDepartmentInput,
  Department,
  DepartmentStats,
  DepartmentsListParams,
  DepartmentsListResult,
  UpdateDepartmentInput,
} from "@/types/department";

export const departmentsService = {
  list: async (
    params: DepartmentsListParams
  ): Promise<DepartmentsListResult> => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("per_page", String(params.perPage ?? 20));
    if (params.search?.trim()) qs.set("search", params.search.trim());
    if (params.status) qs.set("status", params.status);
    if (params.sortBy) qs.set("sort_by", params.sortBy);
    if (params.sortDir) qs.set("sort_dir", params.sortDir);
    return apiGet<DepartmentsListResult>(`/api/departments?${qs.toString()}`);
  },

  stats: async (): Promise<DepartmentStats> =>
    apiGet<DepartmentStats>("/api/departments/stats"),

  get: async (id: string): Promise<Department> =>
    apiGet<Department>(`/api/departments/${id}`),

  create: async (data: CreateDepartmentInput): Promise<Department> =>
    apiPost<Department>("/api/departments", data),

  update: async (
    id: string,
    data: UpdateDepartmentInput
  ): Promise<Department> => apiPatch<Department>(`/api/departments/${id}`, data),

  remove: async (id: string): Promise<void> =>
    apiDelete<void>(`/api/departments/${id}`),
};
