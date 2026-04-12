import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/api";
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
