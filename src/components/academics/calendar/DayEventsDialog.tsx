"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarDayType } from "@/services/academicCalendarService";

import { entryColorClass, type CalendarEntry } from "./calendarEntries";
import { formatDisplayDate } from "./calendarOptions";

const DAY_TYPE_LABEL: Record<CalendarDayType, string> = {
  working: "Working Day",
  weekly_holiday: "Weekly Holiday",
  public_holiday: "Public Holiday",
  vacation: "Vacation",
};

interface DayEventsDialogProps {
  day: CalendarDay | null;
  entries: CalendarEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryClick: (entry: CalendarEntry) => void;
}

/** Entries of a single day (opened by clicking a month-grid cell). */
export function DayEventsDialog({
  day,
  entries,
  open,
  onOpenChange,
  onEntryClick,
}: DayEventsDialogProps) {
  if (!day) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{formatDisplayDate(day.date)}</DialogTitle>
          <DialogDescription>
            {DAY_TYPE_LABEL[day.day_type]}
            {day.semester_start && ` · ${day.semester_start} starts`}
            {day.semester_end && ` · ${day.semester_end} ends`}
          </DialogDescription>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No holidays, exams or events on this day.
          </p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => onEntryClick(entry)}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", entryColorClass(entry))} />
                <span className="flex-1 truncate">{entry.name}</span>
                <span className="text-xs text-muted-foreground">{entry.typeLabel}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
