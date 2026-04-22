import {
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  BulkImportPreviewRow,
  BulkImportPreviewResult,
  BulkImportResult,
} from "@/services/studentsService";

export type { BulkImportPreviewRow, BulkImportPreviewResult, BulkImportResult };
import type {
  Teacher,
  CreateTeacherInput,
  UpdateTeacherInput,
  CreateTeacherResponse,
} from "@/types/teacher";

export type TeachersSortBy =
  | "employee_id"
  | "name"
  | "designation"
  | "department"
  | "date_of_joining";

export type TeachersSearchField =
  | "all"
  | "name"
  | "employee_id"
  | "email"
  | "phone";

export interface TeachersListParams {
  page?: number;
  per_page?: number;
  sort_by?: TeachersSortBy;
  sort_dir?: "asc" | "desc";
  search?: string;
  search_field?: TeachersSearchField;
  status?: string;
  department?: string;
  designation?: string;
  date_of_joining_from?: string;
  date_of_joining_to?: string;
}

export interface TeachersListResult {
  items: Teacher[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  departments: string[];
  designations: string[];
}

export const teachersService = {
  getTeachers: async (
    params?: TeachersListParams
  ): Promise<TeachersListResult> => {
    let url = "/api/teachers/";
    if (params) {
      const qp = new URLSearchParams();
      if (params.search) qp.set("search", params.search);
      if (params.search_field) qp.set("search_field", params.search_field);
      if (params.sort_by) qp.set("sort_by", params.sort_by);
      if (params.sort_dir) qp.set("sort_dir", params.sort_dir);
      if (params.page !== undefined) qp.set("page", String(params.page));
      if (params.per_page !== undefined) qp.set("per_page", String(params.per_page));
      if (params.status) qp.set("status", params.status);
      if (params.department) qp.set("department", params.department);
      if (params.designation) qp.set("designation", params.designation);
      if (params.date_of_joining_from) qp.set("date_of_joining_from", params.date_of_joining_from);
      if (params.date_of_joining_to) qp.set("date_of_joining_to", params.date_of_joining_to);
      const qs = qp.toString();
      if (qs) url += `?${qs}`;
    }
    const data = await apiGet<Partial<TeachersListResult> | Teacher[]>(url);
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        per_page: data.length,
        total_pages: 1,
        departments: [],
        designations: [],
      };
    }
    return {
      items: data?.items ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      per_page: data?.per_page ?? 0,
      total_pages: data?.total_pages ?? 1,
      departments: data?.departments ?? [],
      designations: data?.designations ?? [],
    };
  },

  getTeacher: async (id: string): Promise<Teacher> => {
    return apiGet<Teacher>(`/api/teachers/${id}`);
  },

  createTeacher: async (
    data: CreateTeacherInput
  ): Promise<CreateTeacherResponse> => {
    const res = await apiPost<CreateTeacherResponse>("/api/teachers/", data);
    if (res && "teacher" in res) return res;
    return { teacher: res as Teacher };
  },

  updateTeacher: async (
    id: string,
    data: UpdateTeacherInput
  ): Promise<Teacher> => {
    return apiPut<Teacher>(`/api/teachers/${id}`, data);
  },

  deleteTeacher: async (id: string): Promise<void> => {
    await apiDelete(`/api/teachers/${id}`);
  },

  bulkImportPreview: async (
    formData: FormData
  ): Promise<BulkImportPreviewResult> => {
    return apiPostForm<BulkImportPreviewResult>(
      "/api/teachers/bulk-import/preview",
      formData
    );
  },

  bulkImport: async (formData: FormData): Promise<BulkImportResult> => {
    return apiPostForm<BulkImportResult>("/api/teachers/bulk-import", formData);
  },
};
