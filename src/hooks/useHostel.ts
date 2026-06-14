/**
 * React Query hooks for the hostel module.
 *
 * Query-key convention mirrors useStudents / useFinanceSummary:
 *   hostelKeys.<entity>.<scope>(args?)
 *
 * Mutations invalidate the entity's `.all` key plus any sibling that
 * depends on the mutated data (e.g., allocations after a hostel rename).
 */

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";

import {
  AllocationStatus,
  BedStatus,
  GatepassStatus,
  GatepassType,
  Hostel,
  HostelAllocation,
  HostelGatepass,
  HostelGatepassAudit,
  HostelRoom,
  HostelStatus,
  hostelService,
  HostelVisitor,
  HostelVisitorLog,
  OccupancyRow,
} from "@/services/hostelService";
import { toastSuccess } from "@/lib/errorToast";
import { useAuth } from "@/components/providers/AuthProvider";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const hostelKeys = {
  hostels: {
    all: ["hostel", "hostels"] as const,
    detail: (id: string) => ["hostel", "hostels", id] as const,
  },
  rooms: {
    forHostel: (hostelId: string) =>
      ["hostel", "rooms", "forHostel", hostelId] as const,
    detail: (id: string) => ["hostel", "rooms", id] as const,
  },
  allocations: {
    all: ["hostel", "allocations"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["hostel", "allocations", "list", filters ?? {}] as const,
    forStudent: (studentId: string) =>
      ["hostel", "allocations", "forStudent", studentId] as const,
  },
  gatepasses: {
    all: ["hostel", "gatepasses"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["hostel", "gatepasses", "list", filters ?? {}] as const,
    detail: (id: string) => ["hostel", "gatepasses", id] as const,
    overdue: ["hostel", "gatepasses", "overdue"] as const,
  },
  visitors: {
    logs: (filters?: Record<string, unknown>) =>
      ["hostel", "visitor-logs", filters ?? {}] as const,
    search: (prefix: string) =>
      ["hostel", "visitors", "search", prefix] as const,
  },
  dashboard: ["hostel", "dashboard"] as const,
  reports: {
    occupancy: ["hostel", "reports", "occupancy"] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Hostels
// ---------------------------------------------------------------------------

export function useHostels(
  options?: Omit<UseQueryOptions<Hostel[]>, "queryKey" | "queryFn">
) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.hostels.all, tenantId],
    queryFn: () => hostelService.listHostels(),
    staleTime: 30_000,
    ...options,
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}

export function useHostel(id: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.hostels.detail(id ?? ""), tenantId],
    queryFn: () => hostelService.getHostel(id as string),
    enabled: Boolean(id) && !!tenantId,
    staleTime: 30_000,
  });
}

export function useCreateHostel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      capacity: number;
      warden_name?: string;
      warden_phone?: string;
      address?: string;
      status?: HostelStatus;
    }) => hostelService.createHostel(input),
    onSuccess: (hostel) => {
      qc.invalidateQueries({ queryKey: hostelKeys.hostels.all });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess(`Hostel "${hostel.name}" created.`);
    },
    meta: { errorFallback: "Couldn't create the hostel. Please try again." },
  });
}

export function useUpdateHostel(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      patch: Parameters<typeof hostelService.updateHostel>[1]
    ) => hostelService.updateHostel(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostelKeys.hostels.all });
      qc.invalidateQueries({ queryKey: hostelKeys.hostels.detail(id) });
      toastSuccess("Hostel updated.");
    },
    meta: { errorFallback: "Couldn't update the hostel. Please try again." },
  });
}

export function useDeleteHostel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hostelService.deleteHostel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostelKeys.hostels.all });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess("Hostel deleted.");
    },
    meta: { errorFallback: "Couldn't delete the hostel." },
  });
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export function useRooms(hostelId: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.rooms.forHostel(hostelId ?? ""), tenantId],
    queryFn: () => hostelService.listRooms(hostelId as string),
    enabled: Boolean(hostelId) && !!tenantId,
  });
}

export function useRoom(roomId: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.rooms.detail(roomId ?? ""), tenantId],
    queryFn: () => hostelService.getRoom(roomId as string),
    enabled: Boolean(roomId) && !!tenantId,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hostelService.createRoom,
    onSuccess: (room) => {
      qc.invalidateQueries({
        queryKey: hostelKeys.rooms.forHostel(room.hostel_id),
      });
      toastSuccess(`Room ${room.room_number} added.`);
    },
    meta: { errorFallback: "Couldn't add the room. Please try again." },
  });
}

export function useUpdateRoom(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof hostelService.updateRoom>[1]) =>
      hostelService.updateRoom(roomId, patch),
    onSuccess: (room) => {
      qc.invalidateQueries({
        queryKey: hostelKeys.rooms.forHostel(room.hostel_id),
      });
      qc.invalidateQueries({ queryKey: hostelKeys.rooms.detail(roomId) });
      toastSuccess("Room updated.");
    },
    meta: { errorFallback: "Couldn't update the room." },
  });
}

export function useDeleteRoom(hostelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => hostelService.deleteRoom(roomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostelKeys.rooms.forHostel(hostelId) });
      toastSuccess("Room deleted.");
    },
    meta: { errorFallback: "Couldn't delete the room." },
  });
}

// ---------------------------------------------------------------------------
// Beds
// ---------------------------------------------------------------------------

export function useCreateBed(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hostelService.createBed,
    onSuccess: (bed) => {
      qc.invalidateQueries({ queryKey: hostelKeys.rooms.detail(roomId) });
      toastSuccess(`Bed ${bed.bed_number} added.`);
    },
    meta: { errorFallback: "Couldn't add the bed." },
  });
}

export function useUpdateBed(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: Partial<{ bed_number: string; status: BedStatus }>;
    }) => hostelService.updateBed(input.id, input.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostelKeys.rooms.detail(roomId) });
      toastSuccess("Bed updated.");
    },
    meta: { errorFallback: "Couldn't update the bed." },
  });
}

export function useDeleteBed(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bedId: string) => hostelService.deleteBed(bedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostelKeys.rooms.detail(roomId) });
      toastSuccess("Bed removed.");
    },
    meta: { errorFallback: "Couldn't remove the bed." },
  });
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export function useAllocations(filters?: {
  hostel_id?: string;
  room_id?: string;
  student_id?: string;
  status?: AllocationStatus;
  academic_year_id?: string;
}) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.allocations.list(filters as Record<string, unknown>), tenantId],
    queryFn: () => hostelService.listAllocations(filters),
    enabled: !!tenantId,
  });
}

export function useStudentAllocation(studentId: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.allocations.forStudent(studentId ?? ""), tenantId],
    queryFn: () =>
      hostelService.getStudentAllocation(studentId as string),
    enabled: Boolean(studentId) && !!tenantId,
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hostelService.createAllocation,
    onSuccess: (allocation: HostelAllocation) => {
      qc.invalidateQueries({ queryKey: hostelKeys.allocations.all });
      qc.invalidateQueries({
        queryKey: hostelKeys.rooms.detail(allocation.room_id),
      });
      qc.invalidateQueries({
        queryKey: hostelKeys.allocations.forStudent(allocation.student_id),
      });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess("Student allocated to the bed.");
    },
    meta: { errorFallback: "Couldn't allocate the student. Please try again." },
  });
}

export function useCheckoutAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hostelService.checkoutAllocation(id),
    onSuccess: (allocation: HostelAllocation) => {
      qc.invalidateQueries({ queryKey: hostelKeys.allocations.all });
      qc.invalidateQueries({
        queryKey: hostelKeys.rooms.detail(allocation.room_id),
      });
      qc.invalidateQueries({
        queryKey: hostelKeys.allocations.forStudent(allocation.student_id),
      });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess("Student checked out. Bed is now vacant.");
    },
    meta: { errorFallback: "Couldn't check out the student." },
  });
}

// ---------------------------------------------------------------------------
// Gatepasses
// ---------------------------------------------------------------------------

export function useGatepasses(
  filters?: {
    hostel_id?: string;
    student_id?: string;
    status?: GatepassStatus;
    type?: GatepassType;
  },
  options?: { enabled?: boolean },
) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.gatepasses.list(filters as Record<string, unknown>), tenantId],
    queryFn: () => hostelService.listGatepasses(filters),
    // Callers (e.g. the gatekeeper) gate on a selected student so we don't fetch
    // every gatepass in the tenant with only a status filter before one is picked.
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}

export function useGatepass(id: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.gatepasses.detail(id ?? ""), tenantId],
    queryFn: () => hostelService.getGatepass(id as string),
    enabled: Boolean(id) && !!tenantId,
  });
}

export function useOverdueGatepasses(filters?: { hostel_id?: string }) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.gatepasses.overdue, tenantId, filters],
    queryFn: () => hostelService.listOverdueGatepasses(filters),
    enabled: !!tenantId,
  });
}

export function useCreateGatepass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hostelService.createGatepass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.all });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess("Gatepass request submitted.");
    },
    meta: { errorFallback: "Couldn't create the gatepass. Please try again." },
  });
}

function _invalidateAllGatepass(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.all });
  qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.overdue });
  qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
}

export function useApproveGatepass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hostelService.approveGatepass(id),
    onSuccess: (gp: HostelGatepass) => {
      qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.detail(gp.id) });
      _invalidateAllGatepass(qc);
      toastSuccess("Gatepass approved.");
    },
    meta: { errorFallback: "Couldn't approve the gatepass." },
  });
}

export function useRejectGatepass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      hostelService.rejectGatepass(input.id, input.reason),
    onSuccess: (gp: HostelGatepass) => {
      qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.detail(gp.id) });
      _invalidateAllGatepass(qc);
      toastSuccess("Gatepass rejected.");
    },
    meta: { errorFallback: "Couldn't reject the gatepass." },
  });
}

export function useGatepassCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hostelService.gatepassCheckout(id),
    onSuccess: (gp: HostelGatepass) => {
      qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.detail(gp.id) });
      _invalidateAllGatepass(qc);
      toastSuccess("Departure recorded.");
    },
    meta: { errorFallback: "Couldn't record the gate checkout." },
  });
}

export function useGatepassCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hostelService.gatepassCheckin(id),
    onSuccess: (gp: HostelGatepass) => {
      qc.invalidateQueries({ queryKey: hostelKeys.gatepasses.detail(gp.id) });
      _invalidateAllGatepass(qc);
      toastSuccess("Return recorded.");
    },
    meta: { errorFallback: "Couldn't record the return." },
  });
}

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

export function useVisitorLogs(filters?: {
  hostel_id?: string;
  student_id?: string;
  visitor_id?: string;
  open?: boolean;
  start_date?: string;
  end_date?: string;
}) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.visitors.logs(filters as Record<string, unknown>), tenantId],
    queryFn: () => hostelService.listVisitorLogs(filters),
    enabled: !!tenantId,
    // The "currently inside" panel refreshes every 30s in the spec.
    refetchInterval: filters?.open ? 30_000 : false,
  });
}

export function useVisitorSearch(phonePrefix: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.visitors.search(phonePrefix), tenantId],
    queryFn: () => hostelService.searchVisitors(phonePrefix),
    enabled: phonePrefix.length >= 3 && !!tenantId,
  });
}

export function useVisitorCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hostelService.visitorCheckIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hostel", "visitor-logs"] });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess("Visitor checked in.");
    },
    meta: { errorFallback: "Couldn't check the visitor in." },
  });
}

export function useVisitorCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => hostelService.visitorCheckOut(logId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hostel", "visitor-logs"] });
      qc.invalidateQueries({ queryKey: hostelKeys.dashboard });
      toastSuccess("Visitor checked out.");
    },
    meta: { errorFallback: "Couldn't check the visitor out." },
  });
}

// ---------------------------------------------------------------------------
// Dashboard / reports
// ---------------------------------------------------------------------------

export function useHostelDashboard() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.dashboard, tenantId],
    queryFn: () => hostelService.getDashboard(),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });
}

export function useOccupancyReport() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...hostelKeys.reports.occupancy, tenantId],
    queryFn: () => hostelService.getOccupancyReport(),
    enabled: !!tenantId,
  });
}

// Re-export domain types for consumers that already import from this hook.
export type {
  Hostel,
  HostelRoom,
  HostelAllocation,
  HostelGatepass,
  HostelGatepassAudit,
  HostelVisitor,
  HostelVisitorLog,
  OccupancyRow,
};
