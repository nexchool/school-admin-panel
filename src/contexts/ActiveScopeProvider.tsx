"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useSetupStatus } from "@/hooks/useSchoolSetup";
import { ActiveUnitProvider, useActiveUnit } from "./ActiveUnitContext";
import {
  ActiveAcademicYearProvider,
  useActiveAcademicYear,
} from "./ActiveAcademicYearContext";

function ActiveScopeSync() {
  const { user, isAuthenticated } = useAuth();
  const { data: units } = useSchoolUnits();
  const { data: years } = useAcademicYears();
  const { data: status } = useSetupStatus();
  const { unitId, setUnitId } = useActiveUnit();
  const { academicYearId, setAcademicYearId } = useActiveAcademicYear();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (unitId) return; // already set; don't override user's switcher choice
    const next =
      user?.default_unit_id ??
      units?.find((u) => u.status === "active")?.id ??
      null;
    if (next) setUnitId(next);
  }, [isAuthenticated, user?.default_unit_id, units, unitId, setUnitId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (academicYearId) return;
    const next =
      status?.academic_year?.active_id ??
      years?.find((y) => y.is_active)?.id ??
      null;
    if (next) setAcademicYearId(next);
  }, [
    isAuthenticated,
    status?.academic_year?.active_id,
    years,
    academicYearId,
    setAcademicYearId,
  ]);

  return null;
}

export function ActiveScopeProvider({ children }: { children: ReactNode }) {
  return (
    <ActiveUnitProvider initialUnitId={null}>
      <ActiveAcademicYearProvider initialAcademicYearId={null}>
        <ActiveScopeSync />
        {children}
      </ActiveAcademicYearProvider>
    </ActiveUnitProvider>
  );
}
