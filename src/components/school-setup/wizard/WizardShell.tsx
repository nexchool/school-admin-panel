"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSetupStatus } from "@/hooks/useSchoolSetup";
import {
  WIZARD_STEPS,
  getStep,
  getNextStep,
  getPrevStep,
  type WizardStep,
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

// Wizard step key → field in the SetupStatus payload.
const STATUS_KEY: Record<SetupStepKey, string> = {
  units: "units",
  programmes: "programmes",
  grades: "grades",
  "academic-year": "academic_year",
  classes: "classes",
  subjects: "subjects",
  terms: "terms",
  complete: "overall",
};

type WizardShellProps = {
  stepKey: SetupStepKey;
  children: ReactNode;
  canContinue: boolean;
  onContinue: () => Promise<void> | void;
  saving?: boolean;
  primaryLabel?: string;
};

/** Horizontal numbered rail showing every step's done/current/pending state. */
function StepRail({
  current,
  statusData,
}: {
  current: SetupStepKey;
  statusData: Record<string, unknown> | undefined;
}) {
  const stateOf = (s: WizardStep): "done" | "now" | "pending" => {
    if (s.key === current) return "now";
    const mod = statusData?.[STATUS_KEY[s.key]] as
      | { ready?: boolean; is_setup_complete?: boolean }
      | undefined;
    if (s.key === "complete") return mod?.is_setup_complete ? "done" : "pending";
    return mod?.ready ? "done" : "pending";
  };

  return (
    <nav
      aria-label="Setup progress"
      className="flex items-start gap-1 overflow-x-auto pb-1"
    >
      {WIZARD_STEPS.map((s, i) => {
        const state = stateOf(s);
        const prevDone = i > 0 && stateOf(WIZARD_STEPS[i - 1]) === "done";
        return (
          <Fragment key={s.key}>
            {i > 0 && (
              <div
                className={cn(
                  "mt-4 h-px w-4 shrink-0 sm:w-8",
                  prevDone ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <Link
              href={s.href}
              aria-current={s.key === current ? "step" : undefined}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  state === "done" &&
                    "border-primary bg-primary text-primary-foreground",
                  state === "now" &&
                    "border-primary text-primary ring-2 ring-primary/25",
                  state === "pending" &&
                    "border-border bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-4" /> : s.number}
              </span>
              <span
                className={cn(
                  "hidden max-w-[5rem] truncate text-[11px] font-medium sm:block",
                  s.key === current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.shortTitle}
                {s.optional ? " ·" : ""}
              </span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}

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
  const { data: statusData } = useSetupStatus();

  // Most steps save per-row in dialogs; the primary button only advances. Use
  // "Continue" unless a caller genuinely batch-saves on click (passes a label).
  const continueLabel = primaryLabel ?? "Continue";

  const handleContinue = async () => {
    await onContinue();
    if (next) {
      router.push(next.href);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <StepRail
        current={stepKey}
        statusData={statusData as Record<string, unknown> | undefined}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Step {step.number} of {WIZARD_STEPS.length}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{step.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step.description}
          </p>
        </div>
        <Badge variant={BADGE_VARIANT[status]} className="self-start">
          {BADGE_LABEL[status]}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-6">{children}</div>

      <div className="flex flex-wrap items-center justify-between gap-2">
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
