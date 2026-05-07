"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks";
import { useSetupStatus } from "@/hooks/useSchoolSetup";
import {
  WIZARD_STEPS,
  type WizardStep,
} from "@/components/school-setup/wizard/wizard-steps";
import type { SetupStepKey } from "@/hooks/useSetupStepStatus";

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

function pickFirstIncomplete(
  data: Record<string, unknown> | undefined,
): WizardStep {
  if (!data) return WIZARD_STEPS[0];
  for (const step of WIZARD_STEPS) {
    if (step.key === "complete") continue;
    const moduleStatus = data[STEP_TO_STATUS_KEY[step.key]] as
      | { ready?: boolean; status?: string; optional?: boolean }
      | undefined;
    if (step.optional && moduleStatus?.optional) continue;
    if (moduleStatus?.ready === true) continue;
    if (moduleStatus?.status === "complete") continue;
    return step;
  }
  return WIZARD_STEPS[WIZARD_STEPS.length - 1];
}

export default function SchoolSetupPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("school_setup.manage");
  const { data, isLoading } = useSetupStatus();

  useEffect(() => {
    if (!canManage) return;
    if (isLoading || !data) return;
    const overall = (data as { overall?: { is_setup_complete?: boolean } })
      .overall;
    if (overall?.is_setup_complete) {
      router.replace("/school-setup/complete");
      return;
    }
    const target = pickFirstIncomplete(
      data as unknown as Record<string, unknown>,
    );
    router.replace(target.href);
  }, [canManage, isLoading, data, router]);

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>School setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You don&rsquo;t have permission to run school setup. Ask your
            administrator for the <code>school_setup.manage</code> permission.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Loading…
    </div>
  );
}
