"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarDayType } from "@/services/academicCalendarService";

import { entriesOnDate, entryColorClass, type CalendarEntry } from "./calendarEntries";
import { addDaysIso, formatDisplayDate, todayIso } from "./calendarOptions";

const DAY_TYPE_LABEL: Record<CalendarDayType, string> = {
  working: "Working Day",
  weekly_holiday: "Weekly Holiday",
  public_holiday: "Public Holiday",
  vacation: "Vacation",
};

const DAY_TYPE_TINT: Record<CalendarDayType, string> = {
  working: "",
  weekly_holiday: "bg-muted/60",
  public_holiday: "bg-red-50",
  vacation: "bg-violet-50",
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
}: CalendarWeekViewProps) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const today = todayIso();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous week"
          disabled={addDaysIso(weekStart, 6) < yearStart}
          onClick={() => onWeekChange(addDaysIso(weekStart, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-medium">
          {formatDisplayDate(weekDates[0])} – {formatDisplayDate(weekDates[6])}
        </p>
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {weekDates.map((iso) => {
          const day = byDate.get(iso);
          const dayEntries = entriesOnDate(entries, iso);
          const inYear = iso >= yearStart && iso <= yearEnd;
          return (
            <div
              key={iso}
              className={cn(
                "min-h-28 rounded-md border border-border p-2",
                day && DAY_TYPE_TINT[day.day_type],
                iso === today && "ring-2 ring-primary",
                !inYear && "opacity-50",
              )}
            >
              <p className="text-xs font-medium">
                {new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {inYear ? (day ? DAY_TYPE_LABEL[day.day_type] : "Working Day") : "Outside year"}
              </p>
              <div className="mt-1.5 space-y-1">
                {dayEntries.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => onEntryClick(entry)}
                    className="flex w-full items-center gap-1.5 rounded bg-background/80 px-1.5 py-1 text-left text-xs hover:bg-background"
                  >
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", entryColorClass(entry))}
                    />
                    <span className="truncate">{entry.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
