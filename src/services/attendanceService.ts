import { apiGet } from "@/services/api";

export interface HolidayInfo {
  name?: string | null;
  is_recurring?: boolean;
  [key: string]: unknown;
}

export interface ClassAttendanceRow {
  student_id: string;
  student_name: string | null;
  admission_number: string | null;
  roll_number: number | null;
  status: string | null;
  remarks: string | null;
  marked: boolean;
  marked_by_user_id?: string | null;
  marked_by_name?: string | null;
  recorded_at?: string | null;
}

export interface ClassAttendanceData {
  class_id: string;
  class_name: string;
  date: string;
  is_holiday: boolean;
  holiday_info?: HolidayInfo | null;
  grade_level?: number | null;
  academic_year?: string | null;
  academic_year_id?: string | null;
  class_teacher_name?: string | null;
  class_start_date?: string | null;
  class_end_date?: string | null;
  date_within_academic_window?: boolean;
  total_students: number;
  marked_count: number;
  unmarked_count: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count?: number;
  attendance_rate_percent?: number | null;
  participation_rate_percent?: number | null;
  /** sessions_v2 (AttendanceSession) or legacy_table rows */
  attendance_source?: "sessions_v2" | "legacy_table";
  session_id?: string | null;
  session_status?: string | null;
  attendance: ClassAttendanceRow[];
}

export interface HolidayOccurrence {
  occurrence_date: string;
  name: string;
  is_recurring?: boolean;
  holiday_type?: string;
  [key: string]: unknown;
}

export interface CalendarHolidaysRange {
  start_date: string;
  end_date: string;
  total_days: number;
  working_days: number;
  holiday_days: number;
  occurrences: HolidayOccurrence[];
}

export const attendanceService = {
  getClassAttendance: async (classId: string, date: string) =>
    apiGet<ClassAttendanceData>(`/api/attendance/class/${classId}?date=${date}`),

  /** School holidays / weekly offs in range — same rules as attendance marking. */
  getCalendarHolidaysInRange: async (startDate: string, endDate: string) =>
    apiGet<CalendarHolidaysRange>(
      `/api/attendance/calendar-holidays?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    ),
};
