"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MiniMonthCalendarProps {
  /** ISO yyyy-mm-dd; the calendar opens on this month. */
  startDate: string;
  endDate: string;
  /** Tailwind bg class for the highlighted range (e.g. "bg-red-500"). */
  highlightClass?: string;
}

/** Compact single-month calendar that highlights an event's date range —
 * used inside the event details dialog. Navigable across months. */
export function MiniMonthCalendar({
  startDate,
  endDate,
  highlightClass = "bg-primary",
}: MiniMonthCalendarProps) {
  const [month, setMonth] = useState(startDate.slice(0, 7)); // yyyy-mm
  const [y, m] = month.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(y, m, 0).getDate();
  const leading = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isoOf = (day: number) => `${month}-${String(day).padStart(2, "0")}`;
  const inRange = (day: number) => {
    const iso = isoOf(day);
    return iso >= startDate && iso <= endDate;
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w.slice(0, 2)}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <div
              key={day}
              className={cn(
                "flex h-7 items-center justify-center rounded-full text-xs",
                inRange(day)
                  ? cn(highlightClass, "font-semibold text-white")
                  : "text-foreground",
              )}
            >
              {day}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
