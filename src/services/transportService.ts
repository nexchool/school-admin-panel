import { apiGet, apiPost, apiPut, apiDelete, apiGetBlob } from "@/services/api";

export interface TransportBusOperational {
  code: "ok" | "no_active_route" | "no_active_schedules";
  message: string | null;
  derived_state?: string | null;
}

export interface TransportBus {
  id: string;
  bus_number: string;
  vehicle_number?: string | null;
  capacity: number;
  status: string;
  occupancy_count?: number;
  occupancy_percent?: number;
  occupancy_health?: string;
  assigned_driver?: Record<string, unknown> | null;
  assigned_helper?: Record<string, unknown> | null;
  assigned_route?: { id: string; name: string } | null;
  transport_operational?: TransportBusOperational;
}

export interface TransportDriver {
  id: string;
  name: string;
  phone?: string | null;
  alternate_phone?: string | null;
  license_number?: string | null;
  address?: string | null;
  status: string;
}

export interface TransportStaff extends TransportDriver {
  role?: string;
}

export type TransportFeeCycle = "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface TransportRoute {
  id: string;
  name: string;
  start_point?: string | null;
  end_point?: string | null;
  approx_stops?: unknown;
  pickup_time?: string | null;
  drop_time?: string | null;
  status?: string;
  stops?: TransportStop[];
  default_fee?: number | null;
  fee_cycle?: TransportFeeCycle | null;
  is_reverse_enabled?: boolean;
  approx_stops_needs_review?: boolean;
  stops_count?: number;
  schedules_count?: number;
  /** Present on PUT /routes/:id when status is newly set to inactive and linked data exists */
  deactivate_warnings?: {
    active_enrollments: number;
    active_schedules_remaining?: number;
    schedules_deactivated_future_windows?: number;
  };
}

export interface TransportRouteScheduleRow {
  id: string;
  route: { id: string; name: string } | null;
  bus: { id: string; bus_number: string } | null;
  driver: { id: string; name: string; phone?: string | null } | null;
  helper: { id: string; name: string; phone?: string | null } | null;
  shift_type: "pickup" | "drop";
  start_time: string;
  end_time: string;
  academic_year_id: string;
  is_reverse_enabled: boolean;
  reverse_of_schedule_id: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Day-level schedule segment (driver workload or bus timeline) */
export interface TransportScheduleTimelineBlock {
  /** Recurring schedule id; null when row comes from an override exception */
  schedule_id: string | null;
  /** Present when is_exception and segment is from transport_schedule_exceptions */
  exception_id?: string | null;
  route: { id: string; name: string } | null;
  bus?: { id: string; bus_number: string } | null;
  driver?: { id: string; name: string } | null;
  shift_type: string;
  start_time: string;
  end_time: string;
  is_exception?: boolean;
}

export interface DriverWorkloadResponse {
  staff: TransportStaff;
  workload: {
    date: string;
    assigned_routes_today: number;
    total_duty_minutes: number;
    total_duty_display: string;
    is_holiday: boolean;
    is_idle?: boolean;
    upcoming_duty_count?: number;
  };
  schedules_today: TransportScheduleTimelineBlock[];
  buses_assigned: Array<{ id: string; bus_number: string; capacity: number }>;
}

export type TransportScheduleExceptionType = "override" | "cancellation";

export interface TransportScheduleExceptionRow {
  id: string;
  academic_year_id: string;
  exception_date: string;
  exception_type: TransportScheduleExceptionType;
  route: { id: string; name: string } | null;
  bus: { id: string; bus_number: string } | null;
  driver: { id: string; name: string } | null;
  helper: { id: string; name: string } | null;
  shift_type: string | null;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  schedule_id: string | null;
  schedule: {
    id: string;
    route: { id: string; name: string } | null;
    shift_type: string;
    start_time: string;
    end_time: string;
  } | null;
  created_at?: string | null;
}

export interface ScheduleConflictResult {
  has_conflict: boolean;
  driver_conflict?: {
    conflicting_schedule_id: string;
    route_name: string;
    overlap_start: string;
    overlap_end: string;
  } | null;
  bus_conflict?: {
    conflicting_schedule_id: string;
    route_name: string;
    overlap_start: string;
    overlap_end: string;
  } | null;
}

export interface TransportStop {
  id: string;
  route_id?: string | null;
  name: string;
  sequence_order: number;
  pickup_time?: string | null;
  drop_time?: string | null;
  is_active: boolean;
  area?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  route_stop_id?: string;
}

/** Global stop master row (GET /api/transport/stops) */
export interface TransportGlobalStop extends TransportStop {
  usage_count?: number;
  used_in_routes?: { id: string; name: string; sequence_order: number }[];
}

export interface EnrollmentTransportHints {
  junction_pickup_time?: string | null;
  junction_drop_time?: string | null;
  schedule_pickup_windows: Array<{ start_time: string; end_time: string }>;
  pickup_time_display?: string | null;
}

export type TransportEnrollmentDerivedStatus = "active" | "route_inactive" | "schedule_missing";

export interface TransportEnrollment {
  id: string;
  student_id: string;
  bus_id: string;
  route_id: string;
  academic_year_id?: string | null;
  pickup_point?: string | null;
  drop_point?: string | null;
  pickup_stop_id?: string | null;
  drop_stop_id?: string | null;
  pickup_stop?: TransportStop | null;
  drop_stop?: TransportStop | null;
  monthly_fee: number;
  fee_cycle?: TransportFeeCycle | null;
  status: string;
  start_date: string;
  end_date?: string | null;
  student_name?: string;
  admission_number?: string;
  bus?: TransportBus;
  route?: TransportRoute;
  transport_hints?: EnrollmentTransportHints;
  /** Present when enrollment status is active */
  transport_status?: TransportEnrollmentDerivedStatus | null;
}

export interface TransportDashboard {
  academic_year_id?: string | null;
  total_buses: number;
  active_buses: number;
  total_students_on_transport: number;
  buses_near_capacity_count: number;
  occupancy_per_bus: {
    bus_id: string;
    bus_number: string;
    status?: string;
    capacity: number;
    occupancy: number;
    occupancy_percent: number;
    occupancy_health?: string;
  }[];
  route_distribution: { route_id: string; route_name: string; students: number }[];
  students_on_inactive_routes?: number;
  buses_without_active_routes?: number;
  drivers_without_schedules?: number;
}

export interface TransportBusAssignment {
  id: string;
  bus_id: string;
  driver_id: string;
  route_id: string;
  helper_staff_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
  driver?: TransportDriver | null;
  route?: TransportRoute | null;
  bus?: TransportBus | null;
  helper?: TransportStaff | null;
}

export interface TransportBusDetailsResponse {
  bus: TransportBus;
  driver: TransportDriver | null;
  helper: TransportStaff | null;
  route: TransportRoute | null;
  capacity: number;
  occupancy: number;
  occupancy_percent: number;
  occupancy_health: string;
  students: {
    enrollment_id: string;
    student_id: string;
    student_name: string | null;
    admission_number: string | null;
    pickup_point?: string | null;
    drop_point?: string | null;
  }[];
  schedule_timeline: TransportScheduleTimelineBlock[];
  timeline_date?: string | null;
  is_timeline_holiday?: boolean;
  transport_operational?: TransportBusOperational;
}

function qs(params: Record<string, string | undefined | null>): string {
  const e = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") e.set(k, v);
  }
  const s = e.toString();
  return s ? `?${s}` : "";
}

async function downloadBlob(filename: string, endpoint: string): Promise<void> {
  const blob = await apiGetBlob(endpoint);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const transportService = {
  listBuses: (academicYearId?: string) =>
    apiGet<TransportBus[]>(`/api/transport/buses${qs({ academic_year_id: academicYearId })}`),
  getBus: (id: string) => apiGet<TransportBus>(`/api/transport/buses/${id}`),
  getBusDetails: (
    busId: string,
    params?: { academicYearId?: string; date?: string }
  ) =>
    apiGet<TransportBusDetailsResponse>(
      `/api/transport/buses/${busId}/details${qs({
        academic_year_id: params?.academicYearId,
        date: params?.date,
      })}`
    ),
  createBus: (body: {
    bus_number: string;
    vehicle_number?: string;
    capacity: number;
    status?: string;
  }) => apiPost<TransportBus>("/api/transport/buses", body),
  updateBus: (
    id: string,
    body: Partial<{ bus_number: string; vehicle_number: string; capacity: number; status: string }>
  ) => apiPut<TransportBus>(`/api/transport/buses/${id}`, body),
  deleteBus: (id: string) => apiDelete(`/api/transport/buses/${id}`),

  listDrivers: () => apiGet<TransportDriver[]>("/api/transport/drivers"),
  createDriver: (body: Partial<TransportDriver>) => apiPost<TransportDriver>("/api/transport/drivers", body),
  updateDriver: (id: string, body: Partial<TransportDriver>) =>
    apiPut<TransportDriver>(`/api/transport/drivers/${id}`, body),
  deleteDriver: (id: string) => apiDelete(`/api/transport/drivers/${id}`),

  listStaff: (role?: string) =>
    apiGet<TransportStaff[]>(`/api/transport/staff${qs({ role: role ?? undefined })}`),
  createStaff: (body: Partial<TransportStaff>) => apiPost<TransportStaff>("/api/transport/staff", body),
  updateStaff: (id: string, body: Partial<TransportStaff>) =>
    apiPut<TransportStaff>(`/api/transport/staff/${id}`, body),
  deleteStaff: (id: string) => apiDelete(`/api/transport/staff/${id}`),
  getDriverWorkload: (staffId: string, params: { date?: string; academicYearId: string }) =>
    apiGet<DriverWorkloadResponse>(
      `/api/transport/staff/${staffId}/workload${qs({
        date: params.date,
        academic_year_id: params.academicYearId,
      })}`
    ),

  listRoutes: () => apiGet<TransportRoute[]>("/api/transport/routes"),
  getRoute: (id: string, includeStops = true) =>
    apiGet<TransportRoute>(`/api/transport/routes/${id}${qs({ include_stops: includeStops ? "true" : "false" })}`),
  createRoute: (body: Partial<TransportRoute>) => apiPost<TransportRoute>("/api/transport/routes", body),
  updateRoute: (id: string, body: Partial<TransportRoute>) =>
    apiPut<TransportRoute>(`/api/transport/routes/${id}`, body),
  deleteRoute: (id: string) => apiDelete(`/api/transport/routes/${id}`),

  listGlobalStops: (opts?: {
    search?: string;
    area?: string;
    includeInactive?: boolean;
    withUsage?: boolean;
  }) =>
    apiGet<TransportGlobalStop[]>(
      `/api/transport/stops${qs({
        search: opts?.search,
        area: opts?.area,
        include_inactive: opts?.includeInactive ? "true" : undefined,
        with_usage: opts?.withUsage === false ? "false" : undefined,
      })}`
    ),
  getGlobalStop: (id: string) => apiGet<TransportGlobalStop>(`/api/transport/stops/${id}`),
  createGlobalStop: (body: {
    name: string;
    area?: string | null;
    landmark?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    is_active?: boolean;
  }) => apiPost<TransportGlobalStop>("/api/transport/stops", body),

  listStops: (routeId: string, includeInactive = false) =>
    apiGet<TransportStop[]>(
      `/api/transport/routes/${routeId}/stops${qs({ include_inactive: includeInactive ? "true" : undefined })}`
    ),
  createStop: (routeId: string, body: Partial<TransportStop>) =>
    apiPost<TransportStop>(`/api/transport/routes/${routeId}/stops`, body),
  updateStop: (stopId: string, body: Partial<TransportStop>) =>
    apiPut<TransportStop>(`/api/transport/stops/${stopId}`, body),
  /** Hard-delete; fails with 409 if stop is on any route. Prefer updateStop({ is_active: false }) to soft-disable. */
  deleteStop: (stopId: string) => apiDelete(`/api/transport/stops/${stopId}`),
  reorderStops: (routeId: string, stopIds: string[]) =>
    apiPost<TransportStop[]>(`/api/transport/routes/${routeId}/stops/reorder`, { stop_ids: stopIds }),
  syncRouteStops: (
    routeId: string,
    body: {
      stops: {
        stop_id: string;
        sequence_order: number;
        pickup_time?: string | null;
        drop_time?: string | null;
      }[];
    }
  ) =>
    apiPost<{ stops: TransportStop[] }>(`/api/transport/routes/${routeId}/stops/sync`, body),

  listSchedules: (params: {
    academicYearId: string;
    routeId?: string;
    busId?: string;
    driverId?: string;
    shiftType?: "pickup" | "drop";
    isActive?: boolean;
  }) =>
    apiGet<TransportRouteScheduleRow[]>(
      `/api/transport/schedules${qs({
        academic_year_id: params.academicYearId,
        route_id: params.routeId,
        bus_id: params.busId,
        driver_id: params.driverId,
        shift_type: params.shiftType,
        is_active:
          params.isActive === undefined ? undefined : params.isActive ? "true" : "false",
      })}`
    ),
  getSchedule: (id: string) => apiGet<TransportRouteScheduleRow>(`/api/transport/schedules/${id}`),
  checkScheduleConflict: (body: {
    route_id: string;
    bus_id: string;
    driver_id: string;
    helper_id?: string | null;
    shift_type: "pickup" | "drop";
    start_time: string;
    end_time: string;
    academic_year_id: string;
    is_reverse_enabled?: boolean;
    reverse_start_time?: string | null;
    reverse_end_time?: string | null;
  }) => apiPost<ScheduleConflictResult>("/api/transport/schedules/conflict-check", body),
  createSchedule: (body: {
    route_id: string;
    bus_id: string;
    driver_id: string;
    helper_id?: string | null;
    shift_type: "pickup" | "drop";
    start_time: string;
    end_time: string;
    academic_year_id: string;
    is_reverse_enabled?: boolean;
    reverse_start_time?: string | null;
    reverse_end_time?: string | null;
  }) =>
    apiPost<{
      schedule: TransportRouteScheduleRow;
      reverse_schedule?: TransportRouteScheduleRow;
    }>("/api/transport/schedules", body),
  updateSchedule: (
    id: string,
    body: Partial<{
      route_id: string;
      bus_id: string;
      driver_id: string;
      helper_id: string | null;
      shift_type: "pickup" | "drop";
      start_time: string;
      end_time: string;
      academic_year_id: string;
      is_active: boolean;
    }>
  ) => apiPut<TransportRouteScheduleRow>(`/api/transport/schedules/${id}`, body),
  deleteSchedule: (id: string) => apiDelete(`/api/transport/schedules/${id}`),

  listScheduleExceptions: (params: {
    academicYearId: string;
    exceptionDate?: string;
    exceptionType?: TransportScheduleExceptionType;
  }) =>
    apiGet<TransportScheduleExceptionRow[]>(
      `/api/transport/schedules/exceptions${qs({
        academic_year_id: params.academicYearId,
        exception_date: params.exceptionDate,
        exception_type: params.exceptionType,
      })}`
    ),
  createScheduleException: (
    body:
      | {
          academic_year_id: string;
          exception_date: string;
          exception_type: "override";
          route_id: string;
          bus_id: string;
          driver_id: string;
          helper_id?: string | null;
          shift_type: "pickup" | "drop";
          start_time: string;
          end_time: string;
          reason?: string | null;
        }
      | {
          academic_year_id: string;
          exception_date: string;
          exception_type: "cancellation";
          schedule_id: string;
          reason?: string | null;
        }
  ) => apiPost<TransportScheduleExceptionRow>("/api/transport/schedules/exceptions", body),
  deleteScheduleException: (id: string) => apiDelete(`/api/transport/schedules/exceptions/${id}`),

  busesForRoute: (routeId: string, opts?: { onDate?: string; academicYearId?: string }) =>
    apiGet<TransportBus[]>(
      `/api/transport/routes/${routeId}/buses${qs({ on_date: opts?.onDate, academic_year_id: opts?.academicYearId })}`
    ),

  listAssignments: () => apiGet<TransportBusAssignment[]>("/api/transport/bus-assignments"),
  createAssignment: (body: {
    bus_id: string;
    driver_id: string;
    route_id: string;
    helper_staff_id?: string | null;
    effective_from: string;
    effective_to?: string | null;
    status?: string;
  }) => apiPost("/api/transport/bus-assignments", body),

  listEnrollments: (academicYearId?: string) =>
    apiGet<TransportEnrollment[]>(`/api/transport/enrollments${qs({ academic_year_id: academicYearId })}`),
  enroll: (body: {
    student_id: string;
    bus_id: string;
    route_id: string;
    academic_year_id?: string;
    pickup_point?: string;
    drop_point?: string;
    pickup_stop_id?: string;
    drop_stop_id?: string;
    monthly_fee: number;
    start_date: string;
    end_date?: string | null;
    fee_cycle?: TransportFeeCycle;
  }) => apiPost<TransportEnrollment>("/api/transport/enroll", body),
  updateEnrollment: (id: string, body: Partial<Record<string, unknown>>) =>
    apiPut<TransportEnrollment>(`/api/transport/enroll/${id}`, body),
  deactivateEnrollment: (id: string) => apiDelete(`/api/transport/enroll/${id}`),

  getDashboard: (academicYearId?: string) =>
    apiGet<TransportDashboard>(`/api/transport/dashboard${qs({ academic_year_id: academicYearId })}`),

  upsertFeePlan: (body: { route_id: string; amount: number; academic_year_id?: string }) =>
    apiPost("/api/transport/fee-plans", body),
  listFeePlans: (academicYearId?: string) =>
    apiGet<{ id: string; route_id: string; amount: number; academic_year_id?: string }[]>(
      `/api/transport/fee-plans${qs({ academic_year_id: academicYearId })}`
    ),

  exportBusStudents: (busId: string, academicYearId?: string) =>
    downloadBlob(
      `transport-bus-${busId}-students.csv`,
      `/api/transport/buses/${busId}/export/students${qs({ academic_year_id: academicYearId })}`
    ),
  exportRouteStudents: (routeId: string, academicYearId?: string) =>
    downloadBlob(
      `transport-route-${routeId}-students.csv`,
      `/api/transport/routes/${routeId}/export/students${qs({ academic_year_id: academicYearId })}`
    ),
  exportContactSheet: (academicYearId?: string) =>
    downloadBlob(
      "transport-contact-sheet.csv",
      `/api/transport/export/contact-sheet${qs({ academic_year_id: academicYearId })}`
    ),
};
