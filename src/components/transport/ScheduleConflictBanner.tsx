"use client";

import { AlertTriangle } from "lucide-react";
import type { ScheduleConflictResult } from "@/services/transportService";

export function ScheduleConflictBanner({ result }: { result: ScheduleConflictResult | null }) {
  if (!result?.has_conflict) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-foreground"
    >
      <div className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <span>Schedule conflict detected</span>
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
        {result.driver_conflict ? (
          <li>
            Driver overlaps with route &quot;{result.driver_conflict.route_name}&quot; (
            {result.driver_conflict.overlap_start}–{result.driver_conflict.overlap_end}).
          </li>
        ) : null}
        {result.bus_conflict ? (
          <li>
            Bus overlaps with route &quot;{result.bus_conflict.route_name}&quot; (
            {result.bus_conflict.overlap_start}–{result.bus_conflict.overlap_end}).
          </li>
        ) : null}
      </ul>
    </div>
  );
}
