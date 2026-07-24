import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/services/api";

import type { AcademicYear } from "@/services/academicYearsService";

export interface WeeklyHolidaysConfig {
  days: number[]; // 0=Mon … 6=Sun
  second_saturday: boolean;
  fourth_saturday: boolean;
}

export type CalendarStatus = "draft" | "published";

export interface AcademicCalendar {
  id: string;
  academic_year_id: string;
  academic_year: AcademicYear | null;
  status: CalendarStatus;
  current_step: number;
  total_steps: number;
  weekly_holidays_config: WeeklyHolidaysConfig;
  published_summary: CalendarSummary | null;
  published_at: string | null;
  published_by: string | null;
}

export interface CalendarSummary {
  academic_year: AcademicYear;
  total_days: number;
  working_days: number;
  weekly_holiday_days: number;
  public_holiday_days: number;
  vacation_days: number;
  exam_days: number;
  semester_count: number;
  exam_window_count: number;
  event_count: number;
  weekly_holidays_config: WeeklyHolidaysConfig;
}

export type CalendarDayType =
  | "working"
  | "weekly_holiday"
  | "public_holiday"
  | "vacation";

export interface CalendarDay {
  date: string;
  day_type: CalendarDayType;
  has_exam: boolean;
  has_event: boolean;
  holidays: { id: string; name: string; holiday_type: string }[];
}

export type ExamType =
  | "unit_test"
  | "mid_term"
  | "final"
  | "pre_board"
  | "board"
  | "other";

export interface ExamWindow {
  id: string;
  academic_year_id: string;
  name: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  duration_days: number;
  applicable_class_ids: string[];
  description: string | null;
}

export type SchoolEventType =
  | "activity"
  | "event"
  | "meeting"
  | "celebration"
  | "training"
  | "other";

export type AppliesTo = "entire_school" | "students" | "teachers" | "staff";

export interface SchoolEvent {
  id: string;
  academic_year_id: string;
  name: string;
  event_type: SchoolEventType;
  event_date: string;
  description: string | null;
  applies_to: AppliesTo;
}

export interface PublishResult {
  calendar: AcademicCalendar;
  summary: CalendarSummary;
}

const BASE = "/api/academics/calendar";

export const academicCalendarService = {
  getCalendar: async (academicYearId: string): Promise<AcademicCalendar | null> => {
    // The shared envelope unwrap turns `data: null` into `{}` — normalize back
    // to null so "no calendar yet" is distinguishable from a real row.
    const result = await apiGet<AcademicCalendar | Record<string, never>>(
      `${BASE}?academic_year_id=${encodeURIComponent(academicYearId)}`,
    );
    return result && "id" in result ? (result as AcademicCalendar) : null;
  },
  createDraft: (academicYearId: string) =>
    apiPost<AcademicCalendar>(BASE, { academic_year_id: academicYearId }),
  updateCalendar: (
    id: string,
    data: {
      current_step?: number;
      weekly_holidays_config?: WeeklyHolidaysConfig;
    },
  ) => apiPatch<AcademicCalendar>(`${BASE}/${id}`, data),
  getSummary: (id: string) => apiGet<CalendarSummary>(`${BASE}/${id}/summary`),
  getDays: (id: string) => apiGet<CalendarDay[]>(`${BASE}/${id}/days`),
  publish: (id: string) => apiPost<PublishResult>(`${BASE}/${id}/publish`, {}),

  listExamWindows: (academicYearId: string) =>
    apiGet<ExamWindow[]>(
      `${BASE}/exam-windows?academic_year_id=${encodeURIComponent(academicYearId)}`,
    ),
  createExamWindow: (data: Partial<ExamWindow>) =>
    apiPost<ExamWindow>(`${BASE}/exam-windows`, data),
  updateExamWindow: (id: string, data: Partial<ExamWindow>) =>
    apiPut<ExamWindow>(`${BASE}/exam-windows/${id}`, data),
  deleteExamWindow: (id: string) =>
    apiDelete<void>(`${BASE}/exam-windows/${id}`),

  listEvents: (academicYearId: string) =>
    apiGet<SchoolEvent[]>(
      `${BASE}/events?academic_year_id=${encodeURIComponent(academicYearId)}`,
    ),
  createEvent: (data: Partial<SchoolEvent>) =>
    apiPost<SchoolEvent>(`${BASE}/events`, data),
  updateEvent: (id: string, data: Partial<SchoolEvent>) =>
    apiPut<SchoolEvent>(`${BASE}/events/${id}`, data),
  deleteEvent: (id: string) => apiDelete<void>(`${BASE}/events/${id}`),
};
