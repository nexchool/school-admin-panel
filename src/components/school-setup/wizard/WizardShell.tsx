"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getStep,
  getNextStep,
  getPrevStep,
} from "./wizard-steps";
import {
  useSetupStepStatus,
  type SetupStepKey,
  type StepBadge,
} from "@/hooks/useSetupStepStatus";

const BADGE_LABEL: Record<StepBadge, string> = {
  done: "COMPLETE",
  now: "IN PROGRESS",
  pending: "PENDING",
  optional: "OPTIONAL",
};

const BADGE_VARIANT: Record<StepBadge, "default" | "secondary" | "outline"> = {
  done: "default",
  now: "secondary",
  pending: "outline",
  optional: "outline",
};

type WizardShellProps = {
  stepKey: SetupStepKey;
  children: ReactNode;
  canContinue: boolean;
  onContinue: () => Promise<void> | void;
  saving?: boolean;
  primaryLabel?: string;
};

export function WizardShell({
  stepKey,
  children,
  canContinue,
  onContinue,
  saving,
  primaryLabel,
}: WizardShellProps) {
  const router = useRouter();
  const step = getStep(stepKey);
  const next = getNextStep(stepKey);
  const prev = getPrevStep(stepKey);
  const status = useSetupStepStatus(stepKey);

  const continueLabel =
    primaryLabel ?? (status === "done" ? "Save changes" : "Save & Continue");

  const handleContinue = async () => {
    await onContinue();
    if (next && status !== "done") {
      router.push(next.href);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Step {step.number} of 8</p>
          <h1 className="text-2xl font-semibold">{step.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
        </div>
        <Badge variant={BADGE_VARIANT[status]}>{BADGE_LABEL[status]}</Badge>
      </div>

      <div className="rounded-lg border bg-card p-6">{children}</div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={!prev || !!saving}
          onClick={() => prev && router.push(prev.href)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {step.optional && next && (
            <Button
              variant="ghost"
              onClick={() => router.push(next.href)}
              disabled={saving}
            >
              Skip
            </Button>
          )}
          <Button onClick={handleContinue} disabled={!canContinue || !!saving}>
            {continueLabel}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
