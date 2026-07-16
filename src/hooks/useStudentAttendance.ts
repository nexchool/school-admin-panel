"use client";

import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendanceService";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Attendance summary for a single student. Tenant-scoped (tenantId is the last
 * queryKey segment; gated on tenantId + studentId). `month` is YYYY-MM; omit for
 * all-time.
 */
export function useStudentAttendance(
  studentId: string | undefined,
  month?: string
) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ["attendance", "student", studentId ?? "", month ?? "all", tenantId],
    queryFn: () => attendanceService.getStudentAttendance(studentId!, month),
    enabled: !!studentId && !!tenantId,
  });
}
