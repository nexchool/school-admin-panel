import { apiGet } from "./api";

export interface DashboardOverview {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  academic_year: string;
}

export interface DashboardToday {
  lectures_today: number;
  attendance_marked_classes: number;
  total_classes: number;
  attendance_completion_percentage: number;
  pending_attendance_classes: number;
  schedule_overrides_count: number;
  last_attendance_marked_at: string | null;
}

export interface DashboardAlerts {
  timetable_conflicts: number;
  classes_without_timetable: number;
  subjects_without_teacher: number;
  classes_without_subjects: number;
  students_without_class: number;
  overdue_fees_students: number;
  transport_issues: number;
  total_issues: number;
}

export interface DailyCollection {
  date: string;
  amount: number;
}

export interface DashboardFinance {
  total_expected: number;
  total_collected: number;
  collection_percentage: number;
  total_outstanding: number;
  overdue_count: number;
  last_7_days_collection: DailyCollection[];
  last_week_collection_total: number;
  trend_percentage: number;
}

export interface DashboardTransport {
  enabled: boolean;
  total_buses?: number;
  active_buses?: number;
  students_on_transport?: number;
  buses_near_capacity?: number;
  students_on_inactive_routes?: number;
}

export interface UpcomingHoliday {
  name: string;
  date: string;
}

export interface DashboardActions {
  pending_leave_requests: number;
  upcoming_holidays: UpcomingHoliday[];
}

export interface DashboardData {
  overview: DashboardOverview;
  today: DashboardToday;
  alerts: DashboardAlerts;
  finance: DashboardFinance;
  transport: DashboardTransport;
  actions: DashboardActions;
  health_score: number;
}

export const dashboardService = {
  get: (): Promise<DashboardData> => apiGet<DashboardData>("/api/dashboard"),
};
