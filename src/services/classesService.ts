import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  ClassItem,
  ClassDetail,
  CreateClassInput,
  SubjectLoad,
  CreateSubjectLoadInput,
} from "@/types/class";
import type { Student } from "@/types/student";
import type { Teacher } from "@/types/teacher";

export type { ClassItem, ClassDetail, CreateClassInput, SubjectLoad, CreateSubjectLoadInput };

/** Backend now stores Class.name nullable (display label only — identity
 *  lives on the structural FKs). The UI types still treat it as a plain
 *  string, so we coalesce here at the service boundary. */
function normalizeClass<T extends { name?: string | null }>(c: T): T {
  if (c == null) return c;
  return { ...c, name: c.name ?? "" } as T;
}

export const classesService = {
  getClasses: async (params?: {
    academic_year_id?: string | null;
    school_unit_id?: string | null;
  }): Promise<ClassItem[]> => {
    const sp = new URLSearchParams();
    if (params?.academic_year_id) sp.set("academic_year_id", params.academic_year_id);
    if (params?.school_unit_id) sp.set("school_unit_id", params.school_unit_id);
    const qs = sp.toString();
    const url = `/api/classes/${qs ? `?${qs}` : ""}`;
    const data = await apiGet<ClassItem[]>(url);
    return Array.isArray(data) ? data.map(normalizeClass) : [];
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
