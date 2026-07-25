"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarDayType } from "@/services/academicCalendarService";

import { entriesOnDate, entryColorClass, type CalendarEntry } from "./calendarEntries";
import { addDaysIso, todayIso } from "./calendarOptions";

interface DayTypeStyle {
  /** Top accent bar. */
  bar: string;
  /** Day-type pill. */
  badge: string;
  label: string;
  /** Soft full-cell tint. */
  tint: string;
}

const DAY_TYPE_STYLE: Record<CalendarDayType, DayTypeStyle> = {
  working: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600",
    label: "Working day",
    tint: "",
  },
  weekly_holiday: {
    bar: "bg-slate-400",
    badge: "bg-slate-500/10 text-slate-600",
    label: "Weekly off",
    tint: "bg-muted/40",
  },
  public_holiday: {
    bar: "bg-red-500",
    badge: "bg-red-500/10 text-red-600",
    label: "Public holiday",
    tint: "bg-red-500/[0.04]",
  },
  vacation: {
    bar: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-600",
    label: "Vacation",
    tint: "bg-violet-500/[0.04]",
  },
};

const OUTSIDE_STYLE: DayTypeStyle = {
  bar: "bg-border",
  badge: "bg-muted text-muted-foreground",
  label: "Outside year",
  tint: "opacity-60",
};

interface CalendarWeekViewProps {
  days: CalendarDay[];
  entries: CalendarEntry[];
  yearStart: string;
  yearEnd: string;
  /** Controlled Monday (ISO date). */
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  /** Right side of the header row (view switcher + Today, per the design). */
  headerRight?: React.ReactNode;
}

/** Seven-day columns: day classification plus the entry chips of each day. */
export function CalendarWeekView({
  days,
  entries,
  yearStart,
  yearEnd,
  weekStart,
  onWeekChange,
  onEntryClick,
  headerRight,
}: CalendarWeekViewProps) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const today = todayIso();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));

  const rangeLabel = `${new Date(`${weekDates[0]}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} – ${new Date(`${weekDates[6]}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous week"
            disabled={addDaysIso(weekStart, 6) < yearStart}
            onClick={() => onWeekChange(addDaysIso(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-medium tabular-nums">{rangeLabel}</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next week"
            disabled={weekStart > yearEnd}
            onClick={() => onWeekChange(addDaysIso(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {headerRight}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {weekDates.map((iso) => {
          const day = byDate.get(iso);
          const dayEntries = entriesOnDate(entries, iso);
          const inYear = iso >= yearStart && iso <= yearEnd;
          const isToday = iso === today;
          const style = inYear
            ? DAY_TYPE_STYLE[day?.day_type ?? "working"]
            : OUTSIDE_STYLE;
          const d = new Date(`${iso}T00:00:00`);

          return (
            <div
              key={iso}
              className={cn(
                "flex min-h-40 flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm",
                style.tint,
                isToday && "border-primary/60 ring-1 ring-primary/40",
              )}
            >
              <div className={cn("h-1 w-full", style.bar)} />

              <div className="flex items-start justify-between px-2.5 pt-2">
                <div className="leading-none">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {d.toLocaleDateString("en-IN", { weekday: "short" })}
                  </p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-semibold tabular-nums text-foreground">
                      {d.getDate()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {d.toLocaleDateString("en-IN", { month: "short" })}
                    </span>
                  </p>
                </div>
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Today
                  </span>
                )}
              </div>

              <div className="px-2.5 pt-1.5">
                <span
                  className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                    style.badge,
                  )}
                >
                  {style.label}
                </span>
              </div>

              <div className="mt-2 flex-1 space-y-1 px-2 pb-2">
                {dayEntries.length === 0 ? (
                  <p className="px-0.5 text-[11px] text-muted-foreground/50">
                    {inYear ? "No events" : ""}
                  </p>
                ) : (
                  dayEntries.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => onEntryClick(entry)}
                      className="flex w-full items-center gap-1.5 rounded-md border border-border/60 bg-background px-1.5 py-1 text-left text-xs transition-colors hover:border-border hover:bg-muted"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          entryColorClass(entry),
                        )}
                      />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
