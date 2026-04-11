import {
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  Student,
  CreateStudentInput,
  UpdateStudentInput,
  CreateStudentResponse,
} from "@/types/student";

export type BulkImportPreviewRow = {
  row_number: number;
  values: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  valid: boolean;
};

export type BulkImportPreviewResult = {
  preview: BulkImportPreviewRow[];
  errors: unknown[];
  summary: { valid: number; invalid: number; total: number };
  headers: string[];
};

export type BulkImportFailedRow = {
  row_number: number;
  email: string;
  errors: string[];
};

export type BulkImportResult = {
  total: number;
  success: number;
  failed: number;
  failed_rows: BulkImportFailedRow[];
};

export const studentsService = {
  getStudents: async (params?: {
    class_id?: string;
    class_ids?: string[];
    academic_year_id?: string;
    search?: string;
  }): Promise<Student[]> => {
    let url = "/api/students/";
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.class_ids?.length) {
        searchParams.set("class_ids", params.class_ids.join(","));
      } else if (params.class_id) {
        searchParams.set("class_id", params.class_id);
      }
      if (params.academic_year_id) {
        searchParams.set("academic_year_id", params.academic_year_id);
      }
      if (params.search) {
        searchParams.set("search", params.search);
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    const data = await apiGet<Student[]>(url);
    return Array.isArray(data) ? data : [];
  },

  getStudent: async (id: string): Promise<Student> => {
    return apiGet<Student>(`/api/students/${id}`);
  },

  createStudent: async (
    input: CreateStudentInput
  ): Promise<CreateStudentResponse> => {
    const res = await apiPost<CreateStudentResponse>("/api/students/", input);
    // Backend returns { student, credentials? } - normalize if wrapped
    if (res && "student" in res) return res as CreateStudentResponse;
    return { student: res as Student };
  },

  updateStudent: async (
    id: string,
    input: UpdateStudentInput
  ): Promise<Student> => {
    return apiPut<Student>(`/api/students/${id}`, input);
  },

  deleteStudent: async (id: string): Promise<void> => {
    await apiDelete(`/api/students/${id}`);
  },

  bulkImportPreview: async (
    formData: FormData
  ): Promise<BulkImportPreviewResult> => {
    return apiPostForm<BulkImportPreviewResult>(
      "/api/students/bulk-import/preview",
      formData
    );
  },

  bulkImport: async (formData: FormData): Promise<BulkImportResult> => {
    return apiPostForm<BulkImportResult>("/api/students/bulk-import", formData);
  },
};
