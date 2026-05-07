"use client";

import { usePathname } from "next/navigation";
import { useSetupStatus } from "@/hooks/useSchoolSetup";

export type SetupStepKey =
  | "units"
  | "programmes"
  | "grades"
  | "academic-year"
  | "classes"
  | "subjects"
  | "terms"
  | "complete";

export type StepBadge = "done" | "now" | "pending" | "optional";

// Maps wizard step keys to the corresponding field in SetupStatus.
// Note: "academic-year" maps to "academic_year"; "complete" maps to "overall".
const STEP_TO_STATUS_KEY: Record<SetupStepKey, string> = {
  units: "units",
  programmes: "programmes",
  grades: "grades",
  "academic-year": "academic_year",
  classes: "classes",
  subjects: "subjects",
  terms: "terms",
  complete: "overall",
};

export function useSetupStepStatus(step: SetupStepKey): StepBadge {
  const { data } = useSetupStatus();
  const pathname = usePathname() ?? "";
  const isActive =
    pathname === `/school-setup/${step}` ||
    (step === "complete" && pathname === "/school-setup/complete");

  if (isActive) return "now";

  if (!data) return "pending";

  const moduleStatus = (data as unknown as Record<string, unknown>)[
    STEP_TO_STATUS_KEY[step]
  ] as { ready?: boolean; is_setup_complete?: boolean; optional?: boolean } | undefined;

  if (step === "complete") {
    return moduleStatus?.is_setup_complete ? "done" : "pending";
  }

  // Terms is optional when the module says so or when data is absent.
  if (step === "terms") {
    if (!moduleStatus || moduleStatus.optional) return "optional";
  }

  if (moduleStatus?.ready) return "done";
  return "pending";
}
