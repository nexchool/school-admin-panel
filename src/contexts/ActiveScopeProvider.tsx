"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/hooks";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useSetupStatus } from "@/hooks/useSchoolSetup";
import { ActiveUnitProvider } from "./ActiveUnitContext";
import { ActiveAcademicYearProvider } from "./ActiveAcademicYearContext";

export function ActiveScopeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { data: units } = useSchoolUnits();
  const { data: years } = useAcademicYears();
  const { data: status } = useSetupStatus();

  if (!isAuthenticated) {
    return (
      <ActiveUnitProvider initialUnitId={null}>
        <ActiveAcademicYearProvider initialAcademicYearId={null}>
          {children}
        </ActiveAcademicYearProvider>
      </ActiveUnitProvider>
    );
  }

  const initialUnitId =
    user?.default_unit_id ??
    units?.find((u) => u.status === "active")?.id ??
    null;

  const initialAcademicYearId =
    status?.academic_year?.active_id ??
    years?.find((y) => y.is_active)?.id ??
    null;

  return (
    <ActiveUnitProvider initialUnitId={initialUnitId}>
      <ActiveAcademicYearProvider initialAcademicYearId={initialAcademicYearId}>
        {children}
      </ActiveAcademicYearProvider>
    </ActiveUnitProvider>
  );
}
