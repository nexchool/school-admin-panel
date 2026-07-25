import {
  apiGet,
  apiGetBlob,
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

/** What an import row will do: add a student, or enrich one already on record. */
export type BulkImportAction = "create" | "update";

export type BulkImportPreviewRow = {
  row_number: number;
  values: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  valid: boolean;
  /** Null on invalid rows, which resolve to no action. */
  action: BulkImportAction | null;
};

export type BulkImportPreviewResult = {
  preview: BulkImportPreviewRow[];
  errors: unknown[];
  summary: {
    valid: number;
    invalid: number;
    total: number;
    create: number;
    update: number;
  };
  headers: string[];
};

export type BulkImportFailedRow = {
  row_number: number;
  email: string;
  errors: string[];
};

export type BulkImportResult = {
  total: number;
  /** Newly created students. Kept for compatibility; equals `created`. */
  success: number;
  created: number;
  updated: number;
  failed: number;
  failed_rows: BulkImportFailedRow[];
};

export type StudentsSortBy =
  | "admission_number"
  | "name"
  | "class"
  | "programme"
  | "roll_number";

export type StudentsSearchField =
  | "all"
  | "name"
  | "admission_number"
  | "email"
  | "guardian_phone"
  | "programme";

export interface StudentsListParams {
  page?: number;
  per_page?: number;
  sort_by?: StudentsSortBy;
  sort_dir?: "asc" | "desc";
  search?: string;
  search_field?: StudentsSearchField;
  class_id?: string;
  class_ids?: string[];
  academic_year_id?: string;
  programme_id?: string;
  gender?: string;
  student_status?: string;
  is_transport_opted?: boolean;
  admission_date_from?: string;
  admission_date_to?: string;
  include_transport_summary?: boolean;
}

export interface StudentsListResult {
  items: Student[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Shared filter/search/sort params (everything except pagination). */
function appendStudentFilters(qp: URLSearchParams, params: StudentsListParams) {
  if (params.class_ids?.length) {
    qp.set("class_ids", params.class_ids.join(","));
  } else if (params.class_id) {
    qp.set("class_id", params.class_id);
  }
  if (params.academic_year_id) qp.set("academic_year_id", params.academic_year_id);
  if (params.programme_id) qp.set("programme_id", params.programme_id);
  if (params.search) qp.set("search", params.search);
  if (params.search_field) qp.set("search_field", params.search_field);
  if (params.sort_by) qp.set("sort_by", params.sort_by);
  if (params.sort_dir) qp.set("sort_dir", params.sort_dir);
  if (params.gender) qp.set("gender", params.gender);
  if (params.student_status) qp.set("student_status", params.student_status);
  if (params.is_transport_opted !== undefined) {
    qp.set("is_transport_opted", params.is_transport_opted ? "true" : "false");
  }
  if (params.admission_date_from) qp.set("admission_date_from", params.admission_date_from);
  if (params.admission_date_to) qp.set("admission_date_to", params.admission_date_to);
}

export const studentsService = {
  getStudents: async (
    params?: StudentsListParams
  ): Promise<StudentsListResult> => {
    let url = "/api/students/";
    if (params) {
      const qp = new URLSearchParams();
      appendStudentFilters(qp, params);
      if (params.page !== undefined) qp.set("page", String(params.page));
      if (params.per_page !== undefined) qp.set("per_page", String(params.per_page));
      if (params.include_transport_summary) qp.set("include_transport_summary", "true");
      const qs = qp.toString();
      if (qs) url += `?${qs}`;
    }
    const data = await apiGet<Partial<StudentsListResult> | Student[]>(url);
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        per_page: data.length,
        total_pages: 1,
      };
    }
    return {
      items: data?.items ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      per_page: data?.per_page ?? 0,
      total_pages: data?.total_pages ?? 1,
    };
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

  /** Delete many students in one request (server caps the batch at 500). */
  bulkDelete: async (
    studentIds: string[]
  ): Promise<{ deleted: number; missing: string[] }> => {
    return apiPost<{ deleted: number; missing: string[] }>(
      "/api/students/bulk-delete",
      { student_ids: studentIds }
    );
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

  /** Set student_status for many students at once. */
  bulkUpdateStatus: async (
    studentIds: string[],
    studentStatus: string
  ): Promise<{ updated: number; missing: string[] }> => {
    return apiPost<{ updated: number; missing: string[] }>(
      "/api/students/bulk-status",
      { student_ids: studentIds, student_status: studentStatus }
    );
  },

  /** Download the filtered student list as a CSV blob (pagination ignored). */
  exportStudents: async (params?: StudentsListParams): Promise<Blob> => {
    let url = "/api/students/export";
    if (params) {
      const qp = new URLSearchParams();
      appendStudentFilters(qp, params);
      const qs = qp.toString();
      if (qs) url += `?${qs}`;
    }
    return apiGetBlob(url);
  },
};
