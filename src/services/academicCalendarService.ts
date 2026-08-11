import { gql } from "@/services/graphql";
import {
  apiDelete,
  apiGet,
  apiGetBlob,
  apiPatch,
  apiPost,
  apiPostForm,
  apiPut,
} from "@/services/api";

import type { AcademicYear } from "@/services/academicYearsService";

export interface WeeklyHolidaysConfig {
  days: number[]; // 0=Mon … 6=Sun
  second_saturday: boolean;
  fourth_saturday: boolean;
}

export type CalendarStatus = "draft" | "published" | "archived";

export type CalendarExportFormat = "pdf" | "excel" | "csv";

export interface CalendarPreferences {
  default_view: "month" | "week" | "list";
  default_month: string | null; // yyyy-mm
  week_start: "monday" | "sunday";
  date_format: "dd_mmm_yyyy" | "yyyy_mm_dd" | "mm_dd_yyyy";
  time_format: "24h" | "12h";
  default_event_color: "amber" | "blue" | "green" | "red" | "violet" | "gray";
}

export type CalendarImportType =
  | "public_holidays"
  | "vacations"
  | "exam_windows"
  | "events";

export interface CalendarImportError {
  row: number;
  field: string;
  message: string;
}

export interface CalendarImportReport {
  import_type: CalendarImportType;
  total: number;
  imported: number;
  skipped: number;
  errors: CalendarImportError[];
}

export interface CalendarActivityEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  actor_name: string;
  actor_role: string;
  created_at: string | null;
  meta: Record<string, unknown> | null;
}

export interface CalendarActivityResult {
  items: CalendarActivityEntry[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface AcademicCalendar {
  id: string;
  academic_year_id: string;
  academic_year: AcademicYear | null;
  status: CalendarStatus;
  current_step: number;
  total_steps: number;
  weekly_holidays_config: WeeklyHolidaysConfig;
  preferences: CalendarPreferences;
  published_summary: CalendarSummary | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
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
  events_by_type: Partial<Record<SchoolEventType, number>>;
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
  semester_start: string | null;
  semester_end: string | null;
  holidays: { id: string; name: string; holiday_type: string }[];
}

export type ExamType =
  | "unit_test"
  | "mid_term"
  | "final"
  | "pre_board"
  | "board"
  | "other";

/** Lifecycle status shared by exam windows and school events. Only `active`
 * entries appear on the live calendar; the rest are managed in the list. */
export type EventStatus = "draft" | "active" | "archived" | "cancelled";

export interface AuditFields {
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ExamWindow extends AuditFields {
  id: string;
  academic_year_id: string;
  name: string;
  exam_type: ExamType;
  status: EventStatus;
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

export interface SchoolEvent extends AuditFields {
  id: string;
  academic_year_id: string;
  name: string;
  event_type: SchoolEventType;
  status: EventStatus;
  event_date: string;
  description: string | null;
  applies_to: AppliesTo;
}

export interface PublishResult {
  calendar: AcademicCalendar;
  summary: CalendarSummary;
}

const CALENDAR = `
  query AcademicCalendar($yearId: ID!) {
    academicCalendar(academicYearId: $yearId) {
      id academicYearId academicYearName status currentStep totalSteps
      publishedAt publishedBy archivedAt archivedBy
      weeklyHolidaysConfig { days secondSaturday fourthSaturday }
      preferences {
        defaultView defaultMonth weekStart dateFormat timeFormat
        defaultEventColor
      }
    }
  }
`;

const SUMMARY = `
  query CalendarSummary($calendarId: ID!) {
    calendarSummary(calendarId: $calendarId) {
      academicYear totalDays workingDays publicHolidayDays weeklyHolidayDays
      vacationDays examDays eventCount examWindowCount semesterCount
      eventsByType { eventType count }
      weeklyHolidaysConfig { days secondSaturday fourthSaturday }
    }
  }
`;

const DAYS = `
  query CalendarDays($calendarId: ID!) {
    calendarDays(calendarId: $calendarId) {
      date dayType hasEvent hasExam semesterStart semesterEnd
      holidays { id name holidayType }
    }
  }
`;

const EVENTS = `
  query CalendarEvents($yearId: ID!) {
    calendarEvents(academicYearId: $yearId) {
      id name eventType description startDate endDate isHoliday academicYearId
    }
  }
`;

const EXAM_WINDOWS = `
  query ExamWindows($yearId: ID!) {
    examWindows(academicYearId: $yearId) {
      id name examType startDate endDate academicYearId
    }
  }
`;

/** Every read below maps node → client explicitly. The schema is camelCase
 *  and these types are snake_case; asserting one onto the other is what
 *  rendered "Invalid Date" on another screen. */
type CalendarNode = {
  id: string;
  academicYearId: string;
  academicYearName: string | null;
  status: string;
  currentStep: number | null;
  totalSteps: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
  weeklyHolidaysConfig: {
    days: number[];
    secondSaturday: boolean;
    fourthSaturday: boolean;
  } | null;
  preferences: {
    defaultView: string;
    defaultMonth: string | null;
    weekStart: string;
    dateFormat: string;
    timeFormat: string;
    defaultEventColor: string;
  } | null;
};

/**
 * Every field the client type declares is filled here.
 *
 * The first version of this mapper dropped `preferences`, and the page threw
 * "Cannot read properties of undefined (reading 'default_view')" as it
 * mounted — `tsc` said nothing because the result was cast through `unknown`.
 * A cast that silences the compiler silences the only thing checking that a
 * mapper is complete.
 */
function toCalendar(node: CalendarNode): AcademicCalendar {
  return {
    id: node.id,
    academic_year_id: node.academicYearId,
    academic_year: node.academicYearName
      ? ({ id: node.academicYearId, name: node.academicYearName } as AcademicYear)
      : null,
    status: node.status as CalendarStatus,
    current_step: node.currentStep ?? 1,
    total_steps: node.totalSteps ?? 0,
    weekly_holidays_config: {
      days: node.weeklyHolidaysConfig?.days ?? [],
      second_saturday: node.weeklyHolidaysConfig?.secondSaturday ?? false,
      fourth_saturday: node.weeklyHolidaysConfig?.fourthSaturday ?? false,
    } as WeeklyHolidaysConfig,
    preferences: {
      default_view: (node.preferences?.defaultView ??
        "month") as CalendarPreferences["default_view"],
      default_month: node.preferences?.defaultMonth ?? null,
      week_start: (node.preferences?.weekStart ??
        "monday") as CalendarPreferences["week_start"],
      date_format: (node.preferences?.dateFormat ??
        "dd_mmm_yyyy") as CalendarPreferences["date_format"],
      time_format: (node.preferences?.timeFormat ??
        "24h") as CalendarPreferences["time_format"],
      default_event_color: (node.preferences?.defaultEventColor ??
        "amber") as CalendarPreferences["default_event_color"],
    },
    published_summary: null,
    published_at: node.publishedAt,
    published_by: node.publishedBy,
    archived_at: node.archivedAt,
    archived_by: node.archivedBy,
  };
}

const BASE = "/api/academics/calendar";

export const academicCalendarService = {
  getCalendar: async (academicYearId: string): Promise<AcademicCalendar | null> => {
    // "No calendar yet" is null here, not an empty object — the schema says
    // the field is nullable, so the old unwrap-`{}`-back-to-null dance is gone.
    const data = await gql<{ academicCalendar: CalendarNode | null }>(
      CALENDAR,
      { yearId: academicYearId },
    );
    return data.academicCalendar ? toCalendar(data.academicCalendar) : null;
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
  getSummary: async (id: string): Promise<CalendarSummary> => {
    const data = await gql<{ calendarSummary: Record<string, unknown> | null }>(
      SUMMARY,
      { calendarId: id },
    );
    const s = data.calendarSummary;
    if (!s) throw new Error("That calendar no longer exists.");
    const byType = (s.eventsByType as { eventType: string; count: number }[]) ?? [];
    const weekly = s.weeklyHolidaysConfig as
      | { days: number[]; secondSaturday: boolean; fourthSaturday: boolean }
      | null;
    return {
      academic_year: s.academicYear,
      total_days: s.totalDays,
      working_days: s.workingDays,
      public_holiday_days: s.publicHolidayDays,
      weekly_holiday_days: s.weeklyHolidayDays,
      vacation_days: s.vacationDays,
      exam_days: s.examDays,
      event_count: s.eventCount,
      exam_window_count: s.examWindowCount,
      semester_count: s.semesterCount,
      // The schema answers with a list because event types are the school's
      // to invent; the screens read a map.
      events_by_type: Object.fromEntries(
        byType.map((entry) => [entry.eventType, entry.count]),
      ),
      weekly_holidays_config: weekly
        ? {
            days: weekly.days,
            second_saturday: weekly.secondSaturday,
            fourth_saturday: weekly.fourthSaturday,
          }
        : undefined,
    } as unknown as CalendarSummary;
  },

  getDays: async (id: string): Promise<CalendarDay[]> => {
    const data = await gql<{
      calendarDays: {
        date: string;
        dayType: string;
        hasEvent: boolean;
        hasExam: boolean;
        semesterStart: boolean;
        semesterEnd: boolean;
        holidays: { id: string; name: string; holidayType: string | null }[];
      }[];
    }>(DAYS, { calendarId: id });
    return data.calendarDays.map(
      (day) =>
        ({
          date: day.date,
          day_type: day.dayType,
          has_event: day.hasEvent,
          has_exam: day.hasExam,
          semester_start: day.semesterStart,
          semester_end: day.semesterEnd,
          holidays: day.holidays.map((h) => ({
            id: h.id,
            name: h.name,
            holiday_type: h.holidayType,
          })),
        }) as unknown as CalendarDay,
    );
  },
  publish: (id: string) => apiPost<PublishResult>(`${BASE}/${id}/publish`, {}),

  /**
   * Download the calendar as a file. `sections` (backend keys) narrows the
   * export to the requested blocks; omit for the full calendar.
   */
  exportCalendar: (
    id: string,
    format: CalendarExportFormat,
    sections?: string[],
  ): Promise<Blob> => {
    const params = new URLSearchParams({ format });
    if (sections?.length) params.set("sections", sections.join(","));
    return apiGetBlob(`${BASE}/${id}/export?${params.toString()}`);
  },

  // ── Admin lifecycle ──────────────────────────────────────────────────────
  deleteCalendar: (id: string) => apiDelete<void>(`${BASE}/${id}`),
  archiveCalendar: (id: string) => apiPost<AcademicCalendar>(`${BASE}/${id}/archive`, {}),
  restoreCalendar: (id: string) => apiPost<AcademicCalendar>(`${BASE}/${id}/restore`, {}),
  updatePreferences: (id: string, prefs: Partial<CalendarPreferences>) =>
    apiPatch<AcademicCalendar>(`${BASE}/${id}/preferences`, prefs),

  // ── Import ───────────────────────────────────────────────────────────────
  getImportTemplate: (id: string, type: CalendarImportType): Promise<Blob> =>
    apiGetBlob(`${BASE}/${id}/import-template?type=${type}`),

  // ── Activity history + print log ──────────────────────────────────────────
  getActivity: (id: string, page = 1, pageSize = 20) =>
    apiGet<CalendarActivityResult>(
      `${BASE}/${id}/activity?page=${page}&page_size=${pageSize}`,
    ),
  logPrint: (id: string, mode: string) =>
    apiPost<void>(`${BASE}/${id}/print-log`, { mode }),
  importData: (id: string, type: CalendarImportType, file: File) => {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    return apiPostForm<CalendarImportReport>(`${BASE}/${id}/import`, fd);
  },

  listExamWindows: async (academicYearId: string): Promise<ExamWindow[]> => {
    const data = await gql<{ examWindows: Record<string, unknown>[] }>(
      EXAM_WINDOWS,
      { yearId: academicYearId },
    );
    return data.examWindows.map(
      (w) =>
        ({
          id: w.id,
          name: w.name,
          exam_type: w.examType,
          start_date: w.startDate,
          end_date: w.endDate,
          academic_year_id: w.academicYearId,
        }) as unknown as ExamWindow,
    );
  },
  createExamWindow: (data: Partial<ExamWindow>) =>
    apiPost<ExamWindow>(`${BASE}/exam-windows`, data),
  updateExamWindow: (id: string, data: Partial<ExamWindow>) =>
    apiPut<ExamWindow>(`${BASE}/exam-windows/${id}`, data),
  deleteExamWindow: (id: string) =>
    apiDelete<void>(`${BASE}/exam-windows/${id}`),

  listEvents: async (academicYearId: string): Promise<SchoolEvent[]> => {
    const data = await gql<{ calendarEvents: Record<string, unknown>[] }>(
      EVENTS,
      { yearId: academicYearId },
    );
    return data.calendarEvents.map(
      (e) =>
        ({
          id: e.id,
          name: e.name,
          event_type: e.eventType,
          description: e.description,
          start_date: e.startDate,
          end_date: e.endDate,
          is_holiday: e.isHoliday,
          academic_year_id: e.academicYearId,
        }) as unknown as SchoolEvent,
    );
  },
  createEvent: (data: Partial<SchoolEvent>) =>
    apiPost<SchoolEvent>(`${BASE}/events`, data),
  updateEvent: (id: string, data: Partial<SchoolEvent>) =>
    apiPut<SchoolEvent>(`${BASE}/events/${id}`, data),
  deleteEvent: (id: string) => apiDelete<void>(`${BASE}/events/${id}`),
};
