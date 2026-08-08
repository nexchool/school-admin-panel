import {
  apiGet,
  apiGetBlob,
  apiPost,
  apiPostForm,
  apiPut,
  apiDelete,
} from "@/services/api";
import { gql } from "@/services/graphql";
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

const STUDENTS_QUERY = `
  query Students(
    $first: Int!, $offset: Int, $orderBy: StudentOrder, $direction: OrderDirection,
    $where: StudentFilter
  ) {
    students(
      first: $first, offset: $offset, orderBy: $orderBy, direction: $direction,
      where: $where
    ) {
      totalCount
      edges {
        node {
          id admissionNumber fullName status rollNumber gender guardianPhone
          academicYearId
          currentClass { id displayName programmeName }
        }
      }
    }
  }
`;

type StudentNode = {
  id: string;
  admissionNumber: string;
  fullName: string;
  status: string | null;
  rollNumber: number | null;
  gender: string | null;
  guardianPhone: string | null;
  academicYearId: string | null;
  currentClass: {
    id: string;
    displayName: string | null;
    programmeName: string | null;
  } | null;
};

/** GraphQL names things the way the business does; the app still speaks the
 *  REST payload's shape. Mapping here keeps that swap invisible to callers. */
function toStudent(node: StudentNode): Student {
  return {
    id: node.id,
    name: node.fullName,
    admission_number: node.admissionNumber,
    student_status: node.status ?? undefined,
    roll_number: node.rollNumber ?? undefined,
    gender: node.gender ?? undefined,
    guardian_phone: node.guardianPhone ?? undefined,
    academic_year_id: node.academicYearId ?? undefined,
    class_id: node.currentClass?.id,
    class_name: node.currentClass?.displayName ?? undefined,
    programme_name: node.currentClass?.programmeName ?? undefined,
  } as Student;
}

const SORT_FIELD: Record<StudentsSortBy, string> = {
  admission_number: "ADMISSION_NUMBER",
  name: "NAME",
  class: "CLASS",
  programme: "PROGRAMME",
  roll_number: "ROLL_NUMBER",
};

/** Everything except paging and ordering — the "which students" half. */
function whereFrom(params: StudentsListParams) {
  return {
    search: params.search || undefined,
    searchField: params.search_field || undefined,
    classId: params.class_ids?.length ? undefined : params.class_id || undefined,
    classIds: params.class_ids?.length ? params.class_ids : undefined,
    academicYearId: params.academic_year_id || undefined,
    programmeId: params.programme_id || undefined,
    status: params.student_status || undefined,
    gender: params.gender || undefined,
    isTransportOpted: params.is_transport_opted,
    admittedFrom: params.admission_date_from || undefined,
    admittedTo: params.admission_date_to || undefined,
  };
}

export const studentsService = {
  /**
   * One page of students.
   *
   * Offset paging because the screen has page numbers, which a cursor cannot
   * express — see `server/docs/architecture/graphql-conventions.md`. A list
   * that only ever moves forwards should ask for a cursor instead.
   *
   * A caller that passes no page size gets the first hundred rather than
   * every student in the school. Pickers and audience selectors were the
   * callers doing that, and on a fifteen-thousand-student trust it was one
   * request away from an outage.
   */
  getStudents: async (
    params?: StudentsListParams
  ): Promise<StudentsListResult> => {
    const asked = params ?? {};
    const perPage = Math.min(asked.per_page ?? 100, 100);
    const page = Math.max(1, asked.page ?? 1);

    const data = await gql<{
      students: { totalCount: number; edges: { node: StudentNode }[] };
    }>(STUDENTS_QUERY, {
      first: perPage,
      offset: (page - 1) * perPage,
      orderBy: SORT_FIELD[asked.sort_by ?? "admission_number"],
      direction: (asked.sort_dir ?? "asc").toUpperCase(),
      where: whereFrom(asked),
    });

    const total = data.students.totalCount;
    return {
      items: data.students.edges.map((edge) => toStudent(edge.node)),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
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
