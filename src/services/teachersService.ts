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

export const teachersService = {
  getTeachers: async (params?: {
    search?: string;
    status?: string;
  }): Promise<Teacher[]> => {
    let url = "/api/teachers/";
    if (params) {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.status) q.set("status", params.status);
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    const data = await apiGet<Teacher[]>(url);
    return Array.isArray(data) ? data : [];
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
