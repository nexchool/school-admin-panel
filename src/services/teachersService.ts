import { gql } from "@/services/graphql";
import {
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
  department_id?: string;
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
  /** Department catalogue facet — every *active* department, whether or not
   *  it is tied to a teacher yet (not just names currently in use). Inactive
   *  departments are excluded by the server's `list_active_departments`.
   *  See Task 5 on the server. */
  departments: { id: string; name: string }[];
  designations: string[];
}

const TEACHER_FIELDS = `
  id name employeeId email phone address designation department departmentId
  dateOfJoining status qualification specialization experienceYears
  profilePicture userId
`;

const TEACHERS = `
  query Teachers(
    $first: Int!, $offset: Int, $orderBy: TeacherOrder!,
    $direction: TeacherOrderDirection!, $where: TeacherFilter
  ) {
    teachers(
      first: $first, offset: $offset, orderBy: $orderBy,
      direction: $direction, where: $where
    ) {
      totalCount
      departments { id name }
      designations
      nodes { ${TEACHER_FIELDS} }
    }
  }
`;

const TEACHER = `
  query Teacher($id: ID!) {
    teacher(id: $id) {
      ${TEACHER_FIELDS}
      subjects { id name code }
    }
  }
`;

type TeacherNode = {
  id: string;
  name: string | null;
  employeeId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  designation: string | null;
  department: string | null;
  departmentId: string | null;
  dateOfJoining: string | null;
  status: string | null;
  qualification: string | null;
  specialization: string | null;
  experienceYears: number | null;
  profilePicture: string | null;
  userId: string | null;
};

/** Returns `Teacher` directly — no cast through `unknown`, so the compiler
 *  checks every declared field is filled. A cast here is what let an
 *  incomplete calendar mapper reach the browser and throw on mount. */
function toTeacher(node: TeacherNode): Teacher {
  return {
    id: node.id,
    user_id: node.userId ?? undefined,
    name: node.name ?? "",
    email: node.email ?? undefined,
    profile_picture: node.profilePicture ?? undefined,
    employee_id: node.employeeId ?? "",
    designation: node.designation ?? undefined,
    department: node.department ?? undefined,
    department_id: node.departmentId,
    qualification: node.qualification ?? undefined,
    specialization: node.specialization ?? undefined,
    experience_years: node.experienceYears ?? undefined,
    phone: node.phone ?? undefined,
    address: node.address ?? undefined,
    date_of_joining: node.dateOfJoining ?? undefined,
    status: node.status ?? "",
  };
}

/** Mirrors `TeacherOrder` in the schema. */
const ORDER_FIELD: Record<string, string> = {
  employee_id: "EMPLOYEE_ID",
  name: "NAME",
  designation: "DESIGNATION",
  department: "DEPARTMENT",
  date_of_joining: "DATE_OF_JOINING",
};

/** The server's page cap. */
const MAX_PER_PAGE = 100;

export const teachersService = {
  getTeachers: async (
    params?: TeachersListParams
  ): Promise<TeachersListResult> => {
    const page = params?.page ?? 1;
    const perPage = Math.min(params?.per_page ?? 20, MAX_PER_PAGE);

    const where: Record<string, unknown> = {};
    if (params?.search) {
      where.search = params.search;
      where.searchField = (params.search_field ?? "all").toUpperCase();
    }
    if (params?.status) where.status = params.status;
    if (params?.department_id) where.departmentId = params.department_id;
    if (params?.designation) where.designation = params.designation;
    if (params?.date_of_joining_from) {
      where.joinedOnOrAfter = params.date_of_joining_from;
    }
    if (params?.date_of_joining_to) {
      where.joinedOnOrBefore = params.date_of_joining_to;
    }

    const data = await gql<{
      teachers: {
        totalCount: number;
        departments: { id: string; name: string }[];
        designations: string[];
        nodes: TeacherNode[];
      };
    }>(TEACHERS, {
      first: perPage,
      offset: (page - 1) * perPage,
      orderBy: ORDER_FIELD[params?.sort_by ?? "employee_id"] ?? "EMPLOYEE_ID",
      direction: (params?.sort_dir ?? "asc").toUpperCase(),
      where,
    });

    const total = data.teachers.totalCount;
    return {
      items: data.teachers.nodes.map(toTeacher),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
      departments: data.teachers.departments,
      designations: data.teachers.designations,
    };
  },

  getTeacher: async (id: string): Promise<Teacher> => {
    const data = await gql<{
      teacher: (TeacherNode & {
        subjects: { id: string; name: string; code: string | null }[];
      }) | null;
    }>(TEACHER, { id });
    if (!data.teacher) {
      throw new Error("That teacher is no longer on record.");
    }
    return {
      ...toTeacher(data.teacher),
      subjects: data.teacher.subjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code ?? undefined,
      })),
    };
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

  /** Delete many teachers in one request (server caps the batch at 500). */
  bulkDelete: async (
    teacherIds: string[]
  ): Promise<{ deleted: number; missing: string[] }> => {
    return apiPost<{ deleted: number; missing: string[] }>(
      "/api/teachers/bulk-delete",
      { teacher_ids: teacherIds }
    );
  },

  /** Set status for many teachers at once. */
  bulkUpdateStatus: async (
    teacherIds: string[],
    status: string
  ): Promise<{ updated: number; missing: string[] }> => {
    return apiPost<{ updated: number; missing: string[] }>(
      "/api/teachers/bulk-status",
      { teacher_ids: teacherIds, status }
    );
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
