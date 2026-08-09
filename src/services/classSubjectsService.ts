import { gql } from "@/services/graphql";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/api";
import type { Teacher } from "@/types/teacher";
import type {
  ClassSubjectOffering,
  ClassSubjectTeacherAssignment,
  CreateClassSubjectInput,
  CreateSubjectTeacherInput,
  UpdateClassSubjectInput,
} from "@/types/classSubject";

const CLASS_SUBJECTS = `
  query ClassSubjects($classId: ID!) {
    classSubjects(classId: $classId) {
      id classId subjectId subjectName subjectCode weeklyPeriods
      isMandatory isElectiveBucket sortOrder status
      academicTermId academicTermName
    }
  }
`;

const SUBJECT_TEACHERS = `
  query SubjectTeachers($classId: ID!) {
    subjectTeachers(classId: $classId) {
      id classSubjectId teacherId teacherName employeeId role isActive
      effectiveFrom effectiveTo
    }
  }
`;


export const classSubjectsService = {
  listForClass: async (classId: string): Promise<ClassSubjectOffering[]> => {
    const data = await gql<{
      classSubjects: {
        id: string;
        classId: string;
        subjectId: string;
        subjectName: string | null;
        subjectCode: string | null;
        weeklyPeriods: number;
        isMandatory: boolean;
        isElectiveBucket: boolean;
        sortOrder: number | null;
        status: string | null;
        academicTermId: string | null;
        academicTermName: string | null;
      }[];
    }>(CLASS_SUBJECTS, { classId });
    return data.classSubjects.map(
      (row): ClassSubjectOffering => ({
        id: row.id,
        class_id: row.classId,
        subject_id: row.subjectId,
        subject_name: row.subjectName,
        subject_code: row.subjectCode,
        weekly_periods: row.weeklyPeriods,
        is_mandatory: row.isMandatory,
        is_elective_bucket: row.isElectiveBucket,
        sort_order: row.sortOrder,
        academic_term_id: row.academicTermId,
        academic_term_name: row.academicTermName,
        status: row.status ?? "active",
      }),
    );
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
    const data = await gql<{
      subjectTeachers: {
        id: string;
        classSubjectId: string;
        teacherId: string;
        teacherName: string | null;
        employeeId: string | null;
        role: string | null;
        isActive: boolean;
        effectiveFrom: string | null;
        effectiveTo: string | null;
      }[];
    }>(SUBJECT_TEACHERS, { classId });
    return data.subjectTeachers.map(
      (row): ClassSubjectTeacherAssignment => ({
        id: row.id,
        class_subject_id: row.classSubjectId,
        teacher_id: row.teacherId,
        teacher_name: row.teacherName,
        employee_id: row.employeeId,
        role: (row.role ?? "primary") as ClassSubjectTeacherAssignment["role"],
        effective_from: row.effectiveFrom,
        effective_to: row.effectiveTo,
        is_active: row.isActive,
      }),
    );
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
