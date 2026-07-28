import {
  apiGet,
  apiGetBlob,
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  ClassItem,
  ClassDetail,
  ClassesListFilters,
  ClassesListResponse,
  ClassesStats,
  CreateClassInput,
  SubjectLoad,
  CreateSubjectLoadInput,
} from "@/types/class";
import type { Student } from "@/types/student";
import type { Teacher } from "@/types/teacher";

export type {
  ClassItem,
  ClassDetail,
  ClassesListFilters,
  ClassesListResponse,
  ClassesStats,
  CreateClassInput,
  SubjectLoad,
  CreateSubjectLoadInput,
};

/** Backend now stores Class.name nullable (display label only — identity
 *  lives on the structural FKs). The UI types still treat it as a plain
 *  string, so we coalesce here at the service boundary. */
function normalizeClass<T extends { name?: string | null }>(c: T): T {
  if (c == null) return c;
  return { ...c, name: c.name ?? "" } as T;
}

/** Serialize list filters, skipping empty values so the URL stays clean. */
function listQueryString(params?: ClassesListFilters): string {
  const sp = new URLSearchParams();
  if (!params) return "";
  const entries: [string, unknown][] = [
    ["academic_year_id", params.academic_year_id],
    ["school_unit_id", params.school_unit_id],
    ["programme_id", params.programme_id],
    ["grade_id", params.grade_id],
    ["department_id", params.department_id],
    ["search", params.search],
    ["search_field", params.search_field],
    ["sort_by", params.sort_by],
    ["sort_dir", params.sort_dir],
    ["page", params.page],
    ["per_page", params.per_page],
  ];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  return sp.toString();
}

export const classesService = {
  /**
   * Full (unpaginated) class list.
   *
   * The endpoint returns an envelope; this unwraps to a plain array because
   * the structured class pickers build their Branch → Programme → Grade
   * dropdowns off the whole list. Deliberately sends no `page`, which is what
   * makes the backend return every row.
   */
  getClasses: async (params?: {
    academic_year_id?: string | null;
    school_unit_id?: string | null;
  }): Promise<ClassItem[]> => {
    const qs = listQueryString(params);
    const url = `/api/classes/${qs ? `?${qs}` : ""}`;
    const data = await apiGet<ClassesListResponse>(url);
    const items = data?.items;
    return Array.isArray(items) ? items.map(normalizeClass) : [];
  },

  /** Paginated list for the classes table — returns the envelope intact. */
  listClasses: async (
    params?: ClassesListFilters
  ): Promise<ClassesListResponse> => {
    const qs = listQueryString(params);
    const data = await apiGet<ClassesListResponse>(
      `/api/classes/${qs ? `?${qs}` : ""}`
    );
    return {
      items: Array.isArray(data?.items) ? data.items.map(normalizeClass) : [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      per_page: data?.per_page ?? 0,
      total_pages: data?.total_pages ?? 1,
    };
  },

  /** Aggregate totals for the overview header, over the same filters. */
  getClassesStats: async (
    params?: ClassesListFilters
  ): Promise<ClassesStats> => {
    const qs = listQueryString(params);
    return apiGet<ClassesStats>(`/api/classes/stats${qs ? `?${qs}` : ""}`);
  },

  /** CSV of the filtered list. Pagination params are ignored server-side. */
  exportClasses: async (params?: ClassesListFilters): Promise<Blob> => {
    const qs = listQueryString({ ...params, page: undefined, per_page: undefined });
    return apiGetBlob(`/api/classes/export${qs ? `?${qs}` : ""}`);
  },

  getClass: async (id: string): Promise<ClassDetail> => {
    const data = await apiGet<ClassDetail>(`/api/classes/${id}`);
    return normalizeClass(data);
  },

  createClass: async (data: CreateClassInput): Promise<ClassItem> => {
    const out = await apiPost<ClassItem>("/api/classes/", data);
    return normalizeClass(out);
  },

  updateClass: async (
    id: string,
    data: Partial<CreateClassInput>
  ): Promise<ClassItem> => {
    const out = await apiPut<ClassItem>(`/api/classes/${id}`, data);
    return normalizeClass(out);
  },

  deleteClass: async (id: string): Promise<void> => {
    await apiDelete(`/api/classes/${id}`);
  },

  getUnassignedStudents: async (
    classId: string
  ): Promise<Student[]> => {
    const data = await apiGet<Student[]>(
      `/api/classes/${classId}/unassigned-students`
    );
    return Array.isArray(data) ? data : [];
  },

  assignStudent: async (
    classId: string,
    studentId: string
  ): Promise<void> => {
    await apiPost(`/api/classes/${classId}/students`, {
      student_id: studentId,
    });
  },

  removeStudent: async (
    classId: string,
    studentId: string
  ): Promise<void> => {
    await apiDelete(`/api/classes/${classId}/students/${studentId}`);
  },

  getAvailableClassTeachers: async (
    classId?: string
  ): Promise<Teacher[]> => {
    const params = classId ? `?class_id=${classId}` : "";
    const data = await apiGet<Teacher[]>(
      `/api/classes/meta/available-class-teachers${params}`
    );
    return Array.isArray(data) ? data : [];
  },

  getUnassignedTeachers: async (classId: string): Promise<Teacher[]> => {
    const data = await apiGet<Teacher[]>(
      `/api/classes/${classId}/unassigned-teachers`
    );
    return Array.isArray(data) ? data : [];
  },

  assignTeacher: async (
    classId: string,
    teacherId: string,
    subjectId: string,
    isClassTeacher = false
  ): Promise<void> => {
    await apiPost(`/api/classes/${classId}/teachers`, {
      teacher_id: teacherId,
      subject_id: subjectId,
      is_class_teacher: isClassTeacher,
    });
  },

  removeTeacher: async (
    classId: string,
    teacherId: string
  ): Promise<void> => {
    await apiDelete(`/api/classes/${classId}/teachers/${teacherId}`);
  },

  getSubjectLoads: async (classId: string): Promise<SubjectLoad[]> => {
    const data = await apiGet<SubjectLoad[]>(
      `/api/classes/${classId}/subject-load`
    );
    return Array.isArray(data) ? data : [];
  },

  createSubjectLoad: async (
    classId: string,
    data: CreateSubjectLoadInput
  ): Promise<SubjectLoad> => {
    return apiPost<SubjectLoad>(
      `/api/classes/${classId}/subject-load`,
      data
    );
  },

  updateSubjectLoad: async (
    classId: string,
    loadId: string,
    weeklyPeriods: number
  ): Promise<SubjectLoad> => {
    return apiPut<SubjectLoad>(
      `/api/classes/${classId}/subject-load/${loadId}`,
      { weekly_periods: weeklyPeriods }
    );
  },

  deleteSubjectLoad: async (
    classId: string,
    loadId: string
  ): Promise<void> => {
    await apiDelete(`/api/classes/${classId}/subject-load/${loadId}`);
  },
};
