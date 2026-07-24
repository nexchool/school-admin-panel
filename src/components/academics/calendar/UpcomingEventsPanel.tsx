"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { entryColorClass, type CalendarEntry } from "./calendarEntries";
import { addDaysIso, formatDisplayDate, todayIso } from "./calendarOptions";

interface UpcomingEventsPanelProps {
  entries: CalendarEntry[];
  onEntryClick: (entry: CalendarEntry) => void;
  /** Shows a "View all" action (switches to the List view). */
  onViewAll?: () => void;
}

/** Upcoming entries bucketed into Today / Tomorrow / Next 7 / Next 30 days. */
export function UpcomingEventsPanel({
  entries,
  onEntryClick,
  onViewAll,
}: UpcomingEventsPanelProps) {
  const today = todayIso();

  const buckets = useMemo(() => {
    const upcoming = entries
      .filter((e) => e.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const inRange = (e: CalendarEntry, from: string, to: string) =>
      e.startDate <= to && e.endDate >= from;

    const tomorrow = addDaysIso(today, 1);
    const sevenDays = addDaysIso(today, 7);
    const thirtyDays = addDaysIso(today, 30);
    const used = new Set<string>();
    const take = (predicate: (e: CalendarEntry) => boolean) => {
      const picked = upcoming.filter((e) => !used.has(e.key) && predicate(e));
      picked.forEach((e) => used.add(e.key));
      return picked;
    };

    return [
      { label: "Today", items: take((e) => inRange(e, today, today)) },
      { label: "Tomorrow", items: take((e) => inRange(e, tomorrow, tomorrow)) },
      { label: "Next 7 Days", items: take((e) => e.startDate <= sevenDays) },
      { label: "Next 30 Days", items: take((e) => e.startDate <= thirtyDays).slice(0, 6) },
    ].filter((bucket) => bucket.items.length > 0);
  }, [entries, today]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          buckets.map((bucket) => (
            <div key={bucket.label} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {bucket.label}
              </p>
              {bucket.items.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => onEntryClick(entry)}
                  className="flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      entryColorClass(entry),
                    )}
                  />
                  <span>
                    <span className="block text-sm font-medium">{entry.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDisplayDate(entry.startDate)}
                      {entry.endDate !== entry.startDate &&
                        ` – ${formatDisplayDate(entry.endDate)}`}{" "}
                      · {entry.typeLabel}
                      {entry.kind === "exam" && ` · ${entry.appliesTo}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="block w-full text-right text-xs font-medium text-primary hover:underline"
          >
            View all →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
