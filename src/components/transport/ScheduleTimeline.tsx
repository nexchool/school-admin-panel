"use client";

import { Badge } from "@/components/ui/badge";
import type { TransportScheduleTimelineBlock } from "@/services/transportService";

export function ScheduleTimeline({
  blocks,
  emptyLabel = "No scheduled runs for this day.",
}: {
  blocks: TransportScheduleTimelineBlock[];
  emptyLabel?: string;
}) {
  if (blocks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {blocks.map((b) => (
        <li
          key={b.schedule_id ?? b.exception_id ?? `${b.start_time}-${b.end_time}`}
          className="relative"
        >
          <span className="absolute -left-[5px] top-2 size-2 rounded-full bg-primary" aria-hidden />
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
            <div className="flex flex-wrap items-center gap-2 font-medium leading-tight">
              <span>{b.route?.name ?? "Route"}</span>
              {b.is_exception ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  Exception
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 text-muted-foreground">
              <span className="tabular-nums">
                {b.start_time}–{b.end_time}
              </span>
              {" · "}
              <span className="capitalize">{b.shift_type}</span>
              {b.driver?.name ? (
                <>
                  {" · "}
                  {b.driver.name}
                </>
              ) : b.bus?.bus_number ? (
                <>
                  {" · "}
                  <span className="tabular-nums">Bus {b.bus.bus_number}</span>
                </>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
