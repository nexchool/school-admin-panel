"use client";

import { useTenantQuery } from "@/hooks/useTenantQuery";
import { gql } from "@/services/graphql";

export interface StudentAttendanceDay {
  date: string;
  status: string;
  remarks: string | null;
}

export interface StudentAttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  days: StudentAttendanceDay[];
}

const STUDENT_ATTENDANCE = `
  query StudentAttendance($studentId: ID!, $month: String) {
    studentAttendance(studentId: $studentId, month: $month) {
      totalDays present absent late percentage
      days { date status remarks }
    }
  }
`;

/**
 * One student's attendance. `month` is YYYY-MM; omit for their whole time at
 * the school.
 *
 * Reads the register sessions rather than the legacy attendance table, so a
 * day nobody took the register is absent from the history rather than counted
 * against the child. The counts are summarised server-side — two screens
 * counting "days missed" themselves is two chances to disagree.
 */
export function useStudentAttendance(
  studentId: string | undefined,
  month?: string,
) {
  return useTenantQuery({
    queryKey: ["attendance", "student", studentId ?? "", month ?? "all"],
    queryFn: async () => {
      const data = await gql<{ studentAttendance: StudentAttendanceSummary }>(
        STUDENT_ATTENDANCE,
        { studentId, month },
      );
      return data.studentAttendance;
    },
    enabled: !!studentId,
  });
}
