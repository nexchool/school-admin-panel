import { apiGet } from "./api";

/**
 * Carried by every dashboard section the server composes per caller.
 *
 * `visible: false` is a fact about the *person* — they may not see this — and
 * the only correct rendering is nothing at all.
 *
 * Deliberately not the same field as `enabled`, which is a fact about the
 * *school*: it is not on that plan, and the UI answers it with an upsell
 * placeholder. Telling a finance officer that Transport is not part of their
 * plan would be a lie about the school in order to describe a fact about them.
 *
 * Every other field on a section is optional because of this: when a section
 * is withheld, `{visible: false}` is the entire object.
 */
export interface SectionVisibility {
  visible?: boolean;
}

export interface DashboardOverview extends SectionVisibility {
  total_students?: number;
  total_teachers?: number;
  total_classes?: number;
  academic_year?: string;
}

export interface DashboardToday extends SectionVisibility {
  /** Backend returns `{enabled: false}` when the attendance feature is off
   * for this tenant, in which case the other fields are absent. */
  enabled?: boolean;
  lectures_today?: number;
  attendance_marked_classes?: number;
  total_classes?: number;
  attendance_completion_percentage?: number;
  pending_attendance_classes?: number;
  schedule_overrides_count?: number;
  last_attendance_marked_at?: string | null;
}

export interface DashboardAlerts extends SectionVisibility {
  timetable_conflicts?: number;
  classes_without_timetable?: number;
  subjects_without_teacher?: number;
  classes_without_subjects?: number;
  students_without_class?: number;
  overdue_fees_students?: number;
  transport_issues?: number;
  total_issues?: number;
}

export interface DailyCollection {
  date: string;
  amount: number;
}

export interface DashboardFinance extends SectionVisibility {
  /** `{enabled: false}` when the finance feature is off. */
  enabled?: boolean;
  total_expected?: number;
  total_collected?: number;
  collection_percentage?: number;
  total_outstanding?: number;
  overdue_count?: number;
  last_7_days_collection?: DailyCollection[];
  last_week_collection_total?: number;
  trend_percentage?: number;
}

export interface DashboardTransport extends SectionVisibility {
  enabled?: boolean;
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

export interface DashboardActions extends SectionVisibility {
  pending_leave_requests?: number;
  upcoming_holidays?: UpcomingHoliday[];
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
