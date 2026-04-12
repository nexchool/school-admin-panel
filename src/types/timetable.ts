export interface TimetableVersion {
  id: string;
  class_id: string;
  bell_schedule_id: string | null;
  label: string | null;
  status: "draft" | "active" | "archived" | string;
  effective_from: string | null;
  effective_to: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TimetableEntry {
  id: string;
  timetable_version_id: string;
  class_subject_id: string;
  subject_name: string | null;
  subject_code: string | null;
  teacher_id: string;
  teacher_name: string | null;
  day_of_week: number;
  period_number: number;
  room: string | null;
  notes: string | null;
  entry_status: string;
  period_label?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  editable?: boolean;
  conflict_flags?: string[];
}

export interface BellSchedulePeriod {
  id: string;
  bell_schedule_id: string;
  period_number: number;
  period_kind: string;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  sort_order: number;
}

export interface BellSchedule {
  id: string;
  name: string;
  lesson_periods: BellSchedulePeriod[];
}

export interface ClassSubjectOffering {
  id: string;
  class_id: string;
  subject_id: string;
  subject_name: string | null;
  subject_code: string | null;
  weekly_periods: number;
  is_mandatory: boolean;
  status: string;
}

export interface SubjectTeacherAssignment {
  id: string;
  class_subject_id: string;
  teacher_id: string;
  teacher_name: string | null;
  employee_id: string | null;
  role: "primary" | "assistant" | "guest" | string;
  is_active: boolean;
}

export interface TimetableBundle {
  timetable_version: TimetableVersion | null;
  items: TimetableEntry[];
  bell_schedule: BellSchedule | null;
  working_days: number[];
  editable: boolean;
}

export interface GenerateTimetableResult {
  timetable_version: TimetableVersion;
  entries_placed: number;
  total_required: number;
  unplaced_periods: number | null;
  warnings: string[];
}

export interface ClassWithTimetableStatus {
  id: string;
  name: string;
  section: string;
  academic_year: string | null;
  academic_year_id: string | null;
  has_active_timetable: boolean;
  active_version_label: string | null;
  draft_count: number;
  conflict_count: number;
}

export type TimetableConflictType =
  | "teacher_double_booked"
  | "room_conflict"
  | "period_overflow"
  | string;
