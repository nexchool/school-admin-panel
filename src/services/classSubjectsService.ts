import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/api";
import type { Teacher } from "@/types/teacher";
import type {
  ClassSubjectOffering,
  ClassSubjectTeacherAssignment,
  CreateClassSubjectInput,
  CreateSubjectTeacherInput,
  UpdateClassSubjectInput,
} from "@/types/classSubject";

export const classSubjectsService = {
  listForClass: async (classId: string): Promise<ClassSubjectOffering[]> => {
    const data = await apiGet<{ items: ClassSubjectOffering[] }>(
      `/api/classes/${encodeURIComponent(classId)}/subjects`
    );
    return Array.isArray(data?.items) ? data.items : [];
  },

  create: async (
    classId: string,
    body: CreateClassSubjectInput
  ): Promise<ClassSubjectOffering> => {
    return apiPost<ClassSubjectOffering>(
      `/api/classes/${encodeURIComponent(classId)}/subjects`,
      body
    );
  },

  /** Assign subject(s) to class(es) in one shot; already-assigned active
   *  pairs are skipped server-side. */
  bulkAssign: async (body: {
    class_ids: string[];
    subject_ids: string[];
    weekly_periods?: number;
  }): Promise<{ created_count: number; skipped_count: number }> => {
    return apiPost<{ created_count: number; skipped_count: number }>(
      "/api/class-subjects/bulk-assign",
      body
    );
  },

  update: async (
    classId: string,
    classSubjectId: string,
    body: UpdateClassSubjectInput
  ): Promise<ClassSubjectOffering> => {
    return apiPatch<ClassSubjectOffering>(
      `/api/classes/${encodeURIComponent(classId)}/subjects/${encodeURIComponent(classSubjectId)}`,
      body
    );
  },

  remove: async (classId: string, classSubjectId: string): Promise<void> => {
    await apiDelete(
      `/api/classes/${encodeURIComponent(classId)}/subjects/${encodeURIComponent(classSubjectId)}`
    );
  },

  listSubjectTeachers: async (
    classId: string
  ): Promise<ClassSubjectTeacherAssignment[]> => {
    const data = await apiGet<{ items: ClassSubjectTeacherAssignment[] }>(
      `/api/classes/${encodeURIComponent(classId)}/subject-teachers`
    );
    return Array.isArray(data?.items) ? data.items : [];
  },

  /** Active teachers in the tenant — for assigning to class subjects (not homeroom picker). */
  listSubjectTeacherCandidates: async (classId: string): Promise<Teacher[]> => {
    const data = await apiGet<{ items: Teacher[] }>(
      `/api/classes/${encodeURIComponent(classId)}/subject-teacher-candidates`
    );
    return Array.isArray(data?.items) ? data.items : [];
  },

  assignTeacher: async (
    classId: string,
    body: CreateSubjectTeacherInput
  ): Promise<ClassSubjectTeacherAssignment> => {
    return apiPost<ClassSubjectTeacherAssignment>(
      `/api/classes/${encodeURIComponent(classId)}/subject-teachers`,
      body
    );
  },

  removeTeacherAssignment: async (
    classId: string,
    assignmentId: string
  ): Promise<void> => {
    await apiDelete(
      `/api/classes/${encodeURIComponent(classId)}/subject-teachers/${encodeURIComponent(assignmentId)}`
    );
  },

  /** Timetable entries for usage checks (requires timetable feature + permission). */
  getTimetableItems: async (
    classId: string
  ): Promise<{ items: { class_subject_id?: string }[] }> => {
    return apiGet<{ items: { class_subject_id?: string }[] }>(
      `/api/classes/${encodeURIComponent(classId)}/timetable`
    );
  },
};
