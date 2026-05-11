/**
 * Hostel API client — typed wrappers over /api/hostel/* endpoints.
 *
 * Status strings stay in sync with the backend model constants:
 *  - Hostel/Room/Bed.status: active | inactive | maintenance | removed
 *  - Allocation.status:      active | completed | moved
 *  - Gatepass.status:        pending | approved | active | closed | rejected | overdue
 *  - Gatepass.type:          day_out | night_out
 */

import {
  apiDelete,
  apiGet,
  apiGetText,
  apiPatch,
  apiPost,
} from "@/services/api";

// ============================================================================
// Types
// ============================================================================

export type HostelStatus = "active" | "inactive" | "maintenance";
export type BedStatus = "active" | "maintenance" | "removed";
export type AllocationStatus = "active" | "completed" | "moved";
export type GatepassType = "day_out" | "night_out";
export type GatepassStatus =
  | "pending"
  | "approved"
  | "active"
  | "closed"
  | "rejected"
  | "overdue";

export interface Hostel {
  id: string;
  tenant_id: string;
  name: string;
  warden_name: string | null;
  warden_phone: string | null;
  address: string | null;
  capacity: number;
  status: HostelStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HostelRoom {
  id: string;
  hostel_id: string;
  room_number: string;
  /** e.g. "Ground Floor", "1st Floor" — used to group rooms on the grid. */
  floor: string;
  capacity: number;
  status: HostelStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HostelBed {
  id: string;
  room_id: string;
  bed_number: string;
  is_allocated: boolean;
  allocated_to_student_id: string | null;
  status: BedStatus;
}

export interface HostelAllocation {
  id: string;
  tenant_id: string;
  student_id: string;
  hostel_id: string;
  room_id: string;
  bed_id: string;
  academic_year_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  status: AllocationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HostelGatepass {
  id: string;
  tenant_id: string;
  student_id: string;
  hostel_id: string;
  type: GatepassType;
  status: GatepassStatus;
  requested_at: string;
  approved_at: string | null;
  actual_out_at: string | null;
  actual_in_at: string | null;
  departure_datetime: string;
  expected_return_datetime: string;
  reason: string | null;
  notes: string | null;
  parent_phone: string;
  parent_consent_status: string;
  parent_consent_notified_at: string | null;
  parent_notification_type: string | null;
  approved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HostelGatepassAudit {
  id: string;
  gatepass_id: string;
  action: string;
  actor_type: string;
  actor_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface HostelVisitor {
  id: string;
  tenant_id: string;
  phone: string;
  name: string;
  relation_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostelVisitorLog {
  id: string;
  visitor_id: string;
  student_id: string;
  hostel_id: string;
  room_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  purpose: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface OccupancyRow {
  hostel_id: string;
  hostel_name: string;
  status: HostelStatus;
  total_beds: number;
  active_allocations: number;
  vacant_beds: number;
  occupancy_pct: number;
}

// Standard server envelope.
interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

function unwrap<T>(env: ApiEnvelope<T>): T {
  // The shared.helpers.success_response wraps payload in { success, data }.
  return (env.data ?? (env as unknown as T)) as T;
}

// ============================================================================
// Hostels
// ============================================================================

export const hostelService = {
  // ---- Hostels ----
  async listHostels(): Promise<Hostel[]> {
    const env = await apiGet<ApiEnvelope<{ hostels: Hostel[] }>>("/hostel/hostels");
    return unwrap(env).hostels;
  },

  async getHostel(id: string): Promise<Hostel> {
    const env = await apiGet<ApiEnvelope<{ hostel: Hostel }>>(
      `/hostel/hostels/${id}`
    );
    return unwrap(env).hostel;
  },

  async createHostel(input: {
    name: string;
    capacity: number;
    warden_name?: string;
    warden_phone?: string;
    address?: string;
    status?: HostelStatus;
  }): Promise<Hostel> {
    const env = await apiPost<ApiEnvelope<{ hostel: Hostel }>>(
      "/hostel/hostels",
      input
    );
    return unwrap(env).hostel;
  },

  async updateHostel(
    id: string,
    patch: Partial<{
      name: string;
      capacity: number;
      warden_name: string | null;
      warden_phone: string | null;
      address: string | null;
      status: HostelStatus;
    }>
  ): Promise<Hostel> {
    const env = await apiPatch<ApiEnvelope<{ hostel: Hostel }>>(
      `/hostel/hostels/${id}`,
      patch
    );
    return unwrap(env).hostel;
  },

  async deleteHostel(id: string): Promise<void> {
    await apiDelete(`/hostel/hostels/${id}`);
  },

  // ---- Rooms ----
  async listRooms(hostelId: string): Promise<HostelRoom[]> {
    const env = await apiGet<ApiEnvelope<{ rooms: HostelRoom[] }>>(
      `/hostel/hostels/${hostelId}/rooms`
    );
    return unwrap(env).rooms;
  },

  async getRoom(
    id: string
  ): Promise<{ room: HostelRoom; beds: HostelBed[] }> {
    return unwrap(
      await apiGet<ApiEnvelope<{ room: HostelRoom; beds: HostelBed[] }>>(
        `/hostel/rooms/${id}`
      )
    );
  },

  async createRoom(input: {
    hostel_id: string;
    room_number: string;
    floor?: string;
    capacity: number;
    status?: HostelStatus;
  }): Promise<HostelRoom> {
    const env = await apiPost<ApiEnvelope<{ room: HostelRoom }>>(
      "/hostel/rooms",
      input
    );
    return unwrap(env).room;
  },

  async updateRoom(
    id: string,
    patch: Partial<{
      room_number: string;
      floor: string;
      capacity: number;
      status: HostelStatus;
    }>
  ): Promise<HostelRoom> {
    const env = await apiPatch<ApiEnvelope<{ room: HostelRoom }>>(
      `/hostel/rooms/${id}`,
      patch
    );
    return unwrap(env).room;
  },

  async deleteRoom(id: string): Promise<void> {
    await apiDelete(`/hostel/rooms/${id}`);
  },

  // ---- Beds ----
  async createBed(input: {
    room_id: string;
    bed_number: string;
    status?: BedStatus;
  }): Promise<HostelBed> {
    const env = await apiPost<ApiEnvelope<{ bed: HostelBed }>>(
      "/hostel/beds",
      input
    );
    return unwrap(env).bed;
  },

  async updateBed(
    id: string,
    patch: Partial<{ bed_number: string; status: BedStatus }>
  ): Promise<HostelBed> {
    const env = await apiPatch<ApiEnvelope<{ bed: HostelBed }>>(
      `/hostel/beds/${id}`,
      patch
    );
    return unwrap(env).bed;
  },

  async deleteBed(id: string): Promise<void> {
    await apiDelete(`/hostel/beds/${id}`);
  },

  // ---- Allocations ----
  async listAllocations(filters?: {
    hostel_id?: string;
    room_id?: string;
    student_id?: string;
    status?: AllocationStatus;
    academic_year_id?: string;
  }): Promise<HostelAllocation[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    const qs = params.toString();
    const env = await apiGet<ApiEnvelope<{ allocations: HostelAllocation[] }>>(
      `/hostel/allocations${qs ? `?${qs}` : ""}`
    );
    return unwrap(env).allocations;
  },

  async createAllocation(input: {
    student_id: string;
    hostel_id: string;
    room_id: string;
    bed_id: string;
    check_in_at: string; // ISO 8601
    academic_year_id?: string | null;
    notes?: string | null;
  }): Promise<HostelAllocation> {
    const env = await apiPost<ApiEnvelope<{ allocation: HostelAllocation }>>(
      "/hostel/allocations",
      input
    );
    return unwrap(env).allocation;
  },

  async checkoutAllocation(id: string): Promise<HostelAllocation> {
    const env = await apiPatch<ApiEnvelope<{ allocation: HostelAllocation }>>(
      `/hostel/allocations/${id}/checkout`
    );
    return unwrap(env).allocation;
  },

  async getStudentAllocation(
    studentId: string
  ): Promise<HostelAllocation | null> {
    try {
      const env = await apiGet<ApiEnvelope<{ allocation: HostelAllocation }>>(
        `/hostel/students/${studentId}/allocation`
      );
      return unwrap(env).allocation;
    } catch {
      // No active allocation = 404. Return null instead of throwing.
      return null;
    }
  },

  // ---- Gatepasses ----
  async listGatepasses(filters?: {
    hostel_id?: string;
    student_id?: string;
    status?: GatepassStatus;
    type?: GatepassType;
  }): Promise<HostelGatepass[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    const qs = params.toString();
    const env = await apiGet<ApiEnvelope<{ gatepasses: HostelGatepass[] }>>(
      `/hostel/gatepasses${qs ? `?${qs}` : ""}`
    );
    return unwrap(env).gatepasses;
  },

  async getGatepass(
    id: string
  ): Promise<{ gatepass: HostelGatepass; audit_trail: HostelGatepassAudit[] }> {
    return unwrap(
      await apiGet<
        ApiEnvelope<{
          gatepass: HostelGatepass;
          audit_trail: HostelGatepassAudit[];
        }>
      >(`/hostel/gatepasses/${id}`)
    );
  },

  async listOverdueGatepasses(filters?: {
    hostel_id?: string;
  }): Promise<HostelGatepass[]> {
    const qs = filters?.hostel_id ? `?hostel_id=${filters.hostel_id}` : "";
    const env = await apiGet<ApiEnvelope<{ gatepasses: HostelGatepass[] }>>(
      `/hostel/gatepasses/overdue${qs}`
    );
    return unwrap(env).gatepasses;
  },

  async createGatepass(input: {
    student_id: string;
    hostel_id: string;
    type: GatepassType;
    departure_datetime: string;
    expected_return_datetime: string;
    parent_phone: string;
    reason?: string;
  }): Promise<HostelGatepass> {
    const env = await apiPost<ApiEnvelope<{ gatepass: HostelGatepass }>>(
      "/hostel/gatepasses",
      input
    );
    return unwrap(env).gatepass;
  },

  async approveGatepass(id: string): Promise<HostelGatepass> {
    const env = await apiPost<ApiEnvelope<{ gatepass: HostelGatepass }>>(
      `/hostel/gatepasses/${id}/approve`
    );
    return unwrap(env).gatepass;
  },

  async rejectGatepass(id: string, reason?: string): Promise<HostelGatepass> {
    const env = await apiPost<ApiEnvelope<{ gatepass: HostelGatepass }>>(
      `/hostel/gatepasses/${id}/reject`,
      reason ? { reason } : {}
    );
    return unwrap(env).gatepass;
  },

  async gatepassCheckout(id: string): Promise<HostelGatepass> {
    const env = await apiPost<ApiEnvelope<{ gatepass: HostelGatepass }>>(
      `/hostel/gatepasses/${id}/checkout`
    );
    return unwrap(env).gatepass;
  },

  async gatepassCheckin(id: string): Promise<HostelGatepass> {
    const env = await apiPost<ApiEnvelope<{ gatepass: HostelGatepass }>>(
      `/hostel/gatepasses/${id}/checkin`
    );
    return unwrap(env).gatepass;
  },

  // ---- Visitors ----
  async searchVisitors(phonePrefix: string): Promise<HostelVisitor[]> {
    const env = await apiGet<ApiEnvelope<{ visitors: HostelVisitor[] }>>(
      `/hostel/visitors/search?phone_prefix=${encodeURIComponent(phonePrefix)}`
    );
    return unwrap(env).visitors;
  },

  async visitorCheckIn(input: {
    phone: string;
    name: string;
    relation_type?: string;
    student_id: string;
    hostel_id: string;
    room_id?: string;
    purpose?: string;
  }): Promise<HostelVisitorLog> {
    const env = await apiPost<ApiEnvelope<{ visitor_log: HostelVisitorLog }>>(
      "/hostel/visitors",
      input
    );
    return unwrap(env).visitor_log;
  },

  async visitorCheckOut(logId: string): Promise<HostelVisitorLog> {
    const env = await apiPatch<ApiEnvelope<{ visitor_log: HostelVisitorLog }>>(
      `/hostel/visitor-logs/${logId}/checkout`
    );
    return unwrap(env).visitor_log;
  },

  async listVisitorLogs(filters?: {
    hostel_id?: string;
    student_id?: string;
    visitor_id?: string;
    open?: boolean;
    start_date?: string;
    end_date?: string;
  }): Promise<HostelVisitorLog[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      params.append(k, v === true ? "true" : String(v));
    });
    const qs = params.toString();
    const env = await apiGet<ApiEnvelope<{ visitor_logs: HostelVisitorLog[] }>>(
      `/hostel/visitor-logs${qs ? `?${qs}` : ""}`
    );
    return unwrap(env).visitor_logs;
  },

  // ---- Dashboard / reports ----
  async getDashboard(): Promise<{
    occupancy: OccupancyRow[];
    overdue_gatepasses: HostelGatepass[];
    visitors_inside: number;
  }> {
    return unwrap(
      await apiGet<
        ApiEnvelope<{
          occupancy: OccupancyRow[];
          overdue_gatepasses: HostelGatepass[];
          visitors_inside: number;
        }>
      >("/hostel/dashboard")
    );
  },

  async getOccupancyReport(): Promise<OccupancyRow[]> {
    const env = await apiGet<ApiEnvelope<{ occupancy: OccupancyRow[] }>>(
      "/hostel/reports/occupancy"
    );
    return unwrap(env).occupancy;
  },

  async downloadResidentsCsv(hostelId?: string): Promise<string> {
    const qs = hostelId ? `?hostel_id=${hostelId}` : "";
    return apiGetText(`/hostel/reports/residents.csv${qs}`);
  },
};

export type HostelService = typeof hostelService;
