export interface Teacher {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  profile_picture?: string;
  employee_id: string;
  designation?: string;
  /** Resolved department name, returned for backward-compat display.
   *  Read-only here — department_id is the source of truth for writes. */
  department?: string;
  department_id: string | null;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  phone?: string;
  address?: string;
  date_of_joining?: string;
  status: string;
  created_at?: string;
  subjects?: { id: string; name: string; code?: string }[];
}

export interface CreateTeacherInput {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department_id?: string | null;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  address?: string;
  date_of_joining?: string;
}

export interface UpdateTeacherInput extends Partial<CreateTeacherInput> {
  status?: string;
}

export interface CreateTeacherResponse {
  teacher: Teacher;
  credentials?: {
    email: string;
    employee_id: string;
    password: string;
    must_reset: boolean;
  };
}

// --- Teacher Subject Expertise ---
export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  created_at?: string;
}

// --- Teacher Availability ---
export interface TeacherAvailability {
  id: string;
  teacher_id: string;
  day_of_week: number;
  period_number: number;
  available: boolean;
  created_at?: string;
}

export interface CreateAvailabilityDTO {
  day_of_week: number;
  period_number: number;
  available: boolean;
}

// --- Teacher Leaves ---
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface TeacherLeave {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_employee_id?: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
  status: LeaveStatus;
  working_days?: number;
  academic_year?: string;
  created_at?: string;
  updated_at?: string;
}

// --- Teacher Workload ---
export interface TeacherWorkload {
  id: string;
  teacher_id: string;
  max_periods_per_day: number;
  max_periods_per_week: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkloadDTO {
  max_periods_per_day: number;
  max_periods_per_week: number;
}
