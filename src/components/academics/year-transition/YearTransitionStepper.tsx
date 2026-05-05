"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Academic years",
  "Class mapping",
  "Preview",
  "Promote",
  "Rollovers",
  "Activate",
] as const;

export function YearTransitionStepper({ activeStep }: { activeStep: number }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 md:gap-4">
        {STEPS.map((label, i) => {
          const done = i < activeStep;
          const current = i === activeStep;
          return (
            <li key={label} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium",
                  done && "border-primary bg-primary text-primary-foreground",
                  current &&
                    !done &&
                    "border-primary bg-primary/10 text-primary",
                  !done && !current && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden font-medium sm:inline",
                  current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="hidden h-px w-6 bg-border md:block" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
