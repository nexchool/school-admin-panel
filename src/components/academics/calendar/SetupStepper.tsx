"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const SETUP_STEPS = [
  "Create Academic Year",
  "Set Weekly Holidays",
  "Add Public Holidays",
  "Add Vacations",
  "Set Semesters",
  "Set Examination Windows",
  "Add School Events",
  "Review Summary",
  "Generate Calendar",
] as const;

export function SetupStepper({ activeStep }: { activeStep: number }) {
  return (
    <nav aria-label="Progress" className="mb-6 overflow-x-auto pb-1">
      <ol className="flex items-center gap-2 md:gap-3">
        {SETUP_STEPS.map((label, i) => {
          const done = i < activeStep;
          const current = i === activeStep;
          return (
            <li key={label} className="flex shrink-0 items-center gap-2 text-sm">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && !done && "border-primary bg-primary/10 text-primary",
                  !done && !current && "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden whitespace-nowrap text-xs font-medium xl:inline",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < SETUP_STEPS.length - 1 && (
                <span className="h-px w-4 shrink-0 bg-border" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
