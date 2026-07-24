"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarDayType } from "@/services/academicCalendarService";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_TYPE_STYLES: Record<CalendarDayType, string> = {
  working: "",
  weekly_holiday: "bg-muted text-muted-foreground",
  public_holiday: "bg-red-50 text-red-700",
  vacation: "bg-violet-50 text-violet-700",
};

const LEGEND = [
  { label: "Working Day", className: "bg-green-500" },
  { label: "Weekly Holiday", className: "bg-muted-foreground/50" },
  { label: "Public Holiday", className: "bg-red-500" },
  { label: "Exam", className: "bg-blue-500" },
  { label: "Event", className: "bg-amber-500" },
  { label: "Vacation", className: "bg-violet-500" },
];

interface CalendarMonthGridProps {
  days: CalendarDay[];
  yearStart: string;
  yearEnd: string;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/** Month calendar rendering the per-day classification feed with exam/event
 * markers and a legend, navigable across the academic year. */
export function CalendarMonthGrid({ days, yearStart, yearEnd }: CalendarMonthGridProps) {
  const months = useMemo(() => {
    const keys: string[] = [];
    for (const d of days) {
      const key = monthKey(d.date);
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }, [days]);

  const todayKey = monthKey(new Date().toISOString().slice(0, 10));
  const [monthIndex, setMonthIndex] = useState(() => {
    const idx = months.indexOf(todayKey);
    return idx >= 0 ? idx : 0;
  });

  const currentMonth = months[Math.min(monthIndex, months.length - 1)];
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

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
          holidays: [],
        },
      );
    }
    return result;
  }, [currentMonth, byDate]);

  if (!currentMonth) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={monthIndex <= 0}
          onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-medium">{monthLabel(currentMonth)}</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          disabled={monthIndex >= months.length - 1}
          onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
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
            <div
              key={cell.date}
              title={cell.holidays.map((h) => h.name).join(", ") || undefined}
              className={cn(
                "relative flex h-12 flex-col items-center justify-center rounded-md border border-transparent text-sm",
                DAY_TYPE_STYLES[cell.day_type],
                cell.date < yearStart || cell.date > yearEnd
                  ? "text-muted-foreground/40"
                  : undefined,
              )}
            >
              {Number(cell.date.slice(8, 10))}
              {(cell.has_exam || cell.has_event) && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {cell.has_exam && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  {cell.has_event && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </span>
              )}
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", item.className)} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
