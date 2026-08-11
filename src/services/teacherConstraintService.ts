import { gql } from "@/services/graphql";
import {
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  TeacherSubject,
  TeacherAvailability,
  TeacherLeave,
  TeacherWorkload,
  CreateAvailabilityDTO,
  WorkloadDTO,
} from "@/types/teacher";

const TEACHER_SUBJECTS = `
  query TeacherSubjects($teacherId: ID!) {
    teacherSubjects(teacherId: $teacherId) {
      id teacherId subjectId subjectName subjectCode
    }
  }
`;

const TEACHER_AVAILABILITY = `
  query TeacherAvailability($teacherId: ID!) {
    teacherAvailability(teacherId: $teacherId) {
      id teacherId dayOfWeek periodNumber available
    }
  }
`;

const TEACHER_WORKLOAD = `
  query TeacherWorkload($teacherId: ID!) {
    teacherWorkload(teacherId: $teacherId) {
      id teacherId maxPeriodsPerDay maxPeriodsPerWeek
    }
  }
`;

const TEACHER_LEAVES = `
  query TeacherLeaves($status: String, $teacherId: ID) {
    teacherLeaves(status: $status, teacherId: $teacherId) {
      id teacherId teacherName teacherEmployeeId leaveType status reason
      startDate endDate workingDays academicYear
    }
  }
`;

// --- Teacher Subject Expertise ---
export const teacherSubjectService = {
  getSubjects: (teacherId: string) =>
    gql<{
      teacherSubjects: {
        id: string;
        teacherId: string;
        subjectId: string;
        subjectName: string | null;
        subjectCode: string | null;
      }[];
    }>(TEACHER_SUBJECTS, { teacherId }).then((data) =>
      data.teacherSubjects.map(
        (row): TeacherSubject => ({
          id: row.id,
          teacher_id: row.teacherId,
          subject_id: row.subjectId,
          subject_name: row.subjectName ?? undefined,
          subject_code: row.subjectCode ?? undefined,
        }),
      ),
    ),

  addSubject: (teacherId: string, subjectId: string) =>
    apiPost<TeacherSubject>(`/api/teachers/${teacherId}/subjects`, {
      subject_id: subjectId,
    }),

  removeSubject: (teacherId: string, subjectId: string) =>
    apiDelete<void>(`/api/teachers/${teacherId}/subjects/${subjectId}`),
};

// --- Teacher Availability ---
export const teacherAvailabilityService = {
  getAvailability: (teacherId: string) =>
    gql<{
      teacherAvailability: {
        id: string;
        teacherId: string;
        dayOfWeek: number;
        periodNumber: number;
        available: boolean;
      }[];
    }>(TEACHER_AVAILABILITY, { teacherId }).then((data) =>
      data.teacherAvailability.map(
        (row): TeacherAvailability => ({
          id: row.id,
          teacher_id: row.teacherId,
          day_of_week: row.dayOfWeek,
          period_number: row.periodNumber,
          available: row.available,
        }),
      ),
    ),

  createAvailability: (
    teacherId: string,
    data: CreateAvailabilityDTO
  ) =>
    apiPost<TeacherAvailability>(`/api/teachers/${teacherId}/availability`, data),

  updateAvailability: (
    teacherId: string,
    availabilityId: string,
    available: boolean
  ) =>
    apiPut<TeacherAvailability>(
      `/api/teachers/${teacherId}/availability/${availabilityId}`,
      { available }
    ),

  deleteAvailability: (teacherId: string, availabilityId: string) =>
    apiDelete<void>(`/api/teachers/${teacherId}/availability/${availabilityId}`),
};

// --- Teacher Leaves ---
export const teacherLeaveService = {
  listLeaves: async (params?: {
    teacher_id?: string;
    status?: string;
  }): Promise<TeacherLeave[]> => {
    const data = await gql<{
      teacherLeaves: {
        id: string;
        teacherId: string;
        teacherName: string | null;
        teacherEmployeeId: string | null;
        leaveType: string | null;
        status: string | null;
        reason: string | null;
        startDate: string | null;
        endDate: string | null;
        workingDays: number | null;
        academicYear: string | null;
      }[];
    }>(TEACHER_LEAVES, {
      status: params?.status ?? null,
      teacherId: params?.teacher_id ?? null,
    });
    return data.teacherLeaves.map(
      (row): TeacherLeave => ({
        id: row.id,
        teacher_id: row.teacherId,
        teacher_name: row.teacherName ?? undefined,
        teacher_employee_id: row.teacherEmployeeId ?? undefined,
        start_date: row.startDate ?? "",
        end_date: row.endDate ?? "",
        leave_type: row.leaveType ?? "",
        reason: row.reason ?? undefined,
        status: (row.status ?? "pending") as TeacherLeave["status"],
        working_days: row.workingDays ?? undefined,
        academic_year: row.academicYear ?? undefined,
      }),
    );
  },

  approveLeave: (leaveId: string) =>
    apiPut<TeacherLeave>(`/api/teachers/leaves/${leaveId}/approve`, {}),

  rejectLeave: (leaveId: string) =>
    apiPut<TeacherLeave>(`/api/teachers/leaves/${leaveId}/reject`, {}),
};

// --- Teacher Workload ---
export const teacherWorkloadService = {
  getWorkload: (teacherId: string) =>
    gql<{
      teacherWorkload: {
        id: string | null;
        teacherId: string | null;
        maxPeriodsPerDay: number | null;
        maxPeriodsPerWeek: number | null;
      };
    }>(TEACHER_WORKLOAD, { teacherId }).then(
      (data): TeacherWorkload => ({
        id: data.teacherWorkload.id,
        teacher_id: data.teacherWorkload.teacherId,
        max_periods_per_day: data.teacherWorkload.maxPeriodsPerDay,
        max_periods_per_week: data.teacherWorkload.maxPeriodsPerWeek,
      }),
    ),

  createWorkload: (teacherId: string, data: WorkloadDTO) =>
    apiPost<TeacherWorkload>(`/api/teachers/${teacherId}/workload`, data),

  updateWorkload: (teacherId: string, data: Partial<WorkloadDTO>) =>
    apiPut<TeacherWorkload>(`/api/teachers/${teacherId}/workload`, data),
};
