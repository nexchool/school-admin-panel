"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarDayType } from "@/services/academicCalendarService";

import { todayIso } from "./calendarOptions";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_TYPE_STYLES: Record<CalendarDayType, string> = {
  working: "",
  weekly_holiday: "bg-muted text-muted-foreground",
  public_holiday: "bg-red-50 text-red-700",
  vacation: "bg-violet-50 text-violet-700",
};

export const CALENDAR_LEGEND = [
  { label: "Working Day", className: "bg-green-500" },
  { label: "Weekly Holiday", className: "bg-muted-foreground/50" },
  { label: "Public Holiday", className: "bg-red-500" },
  { label: "Vacation", className: "bg-violet-500" },
  { label: "Examination", className: "bg-blue-500" },
  { label: "School Event", className: "bg-amber-500" },
  { label: "Teacher Training", className: "bg-yellow-500" },
  { label: "Parent Meeting", className: "bg-pink-500" },
  { label: "Semester Start", className: "bg-blue-900" },
  { label: "Semester End", className: "bg-green-900" },
];

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

interface CalendarMonthGridProps {
  days: CalendarDay[];
  yearStart: string;
  yearEnd: string;
  /** Controlled month (YYYY-MM) — must be one of the year's months. */
  month: string;
  onMonthChange: (month: string) => void;
  onDayClick?: (day: CalendarDay) => void;
  showLegend?: boolean;
  /** Right side of the header row (view switcher + Today, per the design). */
  headerRight?: React.ReactNode;
}

/** Month calendar rendering the per-day classification feed with exam/event
 * dots, semester boundary markers and a legend. Fully controlled month. */
export function CalendarMonthGrid({
  days,
  yearStart,
  yearEnd,
  month,
  onMonthChange,
  onDayClick,
  showLegend = true,
  headerRight,
}: CalendarMonthGridProps) {
  const months = useMemo(() => {
    const keys: string[] = [];
    for (const d of days) {
      const key = monthKey(d.date);
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }, [days]);

  const monthIndex = Math.max(0, months.indexOf(month));
  const currentMonth = months[monthIndex] ?? months[0];
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const today = todayIso();

  const cells = useMemo(() => {
    if (!currentMonth) return [];
    const [y, m] = currentMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    // Monday-first offset: JS getDay() is 0=Sun.
    const leading = (first.getDay() + 6) % 7;
    const result: (CalendarDay | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${currentMonth}-${String(day).padStart(2, "0")}`;
      result.push(
        byDate.get(iso) ?? {
          date: iso,
          day_type: "working",
          has_exam: false,
          has_event: false,
          semester_start: null,
          semester_end: null,
          holidays: [],
        },
      );
    }
    return result;
  }, [currentMonth, byDate]);

  if (!currentMonth) return null;

  const describeDay = (cell: CalendarDay): string | undefined => {
    const parts = [
      ...cell.holidays.map((h) => h.name),
      ...(cell.semester_start ? [`${cell.semester_start} starts`] : []),
      ...(cell.semester_end ? [`${cell.semester_end} ends`] : []),
      ...(cell.has_exam ? ["Examination"] : []),
      ...(cell.has_event ? ["Event"] : []),
    ];
    return parts.length ? parts.join(", ") : undefined;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={monthIndex <= 0}
            onClick={() => onMonthChange(months[monthIndex - 1])}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-32 text-center font-medium">{monthLabel(currentMonth)}</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            disabled={monthIndex >= months.length - 1}
            onClick={() => onMonthChange(months[monthIndex + 1])}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {headerRight}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="py-1 font-medium">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <button
              type="button"
              key={cell.date}
              title={describeDay(cell)}
              onClick={() => onDayClick?.(cell)}
              className={cn(
                "relative flex h-12 flex-col items-center justify-center rounded-md border border-transparent text-sm transition-colors",
                DAY_TYPE_STYLES[cell.day_type],
                onDayClick && "cursor-pointer hover:border-primary/40",
                cell.date === today && "ring-2 ring-primary ring-offset-1",
                (cell.date < yearStart || cell.date > yearEnd) &&
                  "text-muted-foreground/40",
              )}
            >
              {/* Semester boundary markers: left bar = start, right bar = end. */}
              {cell.semester_start && (
                <span
                  className="absolute inset-y-1 left-0.5 w-1 rounded-full bg-blue-900"
                  title={`${cell.semester_start} starts`}
                />
              )}
              {cell.semester_end && (
                <span
                  className="absolute inset-y-1 right-0.5 w-1 rounded-full bg-green-900"
                  title={`${cell.semester_end} ends`}
                />
              )}
              {Number(cell.date.slice(8, 10))}
              {(cell.has_exam || cell.has_event) && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {cell.has_exam && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  {cell.has_event && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </span>
              )}
            </button>
          ),
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {CALENDAR_LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", item.className)} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
