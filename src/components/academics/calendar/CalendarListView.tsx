"use client";

import { cn } from "@/lib/utils";

import { entryColorClass, type CalendarEntry } from "./calendarEntries";
import { formatDisplayDate } from "./calendarOptions";

interface CalendarListViewProps {
  entries: CalendarEntry[];
  onEntryClick: (entry: CalendarEntry) => void;
}

/** Chronological table of every calendar entry (holidays, vacations, exams,
 * events, semesters). Rows open the details dialog. */
export function CalendarListView({ entries, onEntryClick }: CalendarListViewProps) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No calendar entries match the current search / filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Applies To</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Created By</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.key}
              onClick={() => onEntryClick(entry)}
              className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
            >
              <td className="whitespace-nowrap px-3 py-2">
                {formatDisplayDate(entry.startDate)}
                {entry.endDate !== entry.startDate && (
                  <span className="text-muted-foreground">
                    {" "}– {formatDisplayDate(entry.endDate)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", entryColorClass(entry))} />
                  {entry.name}
                </span>
              </td>
              <td className="px-3 py-2">{entry.typeLabel}</td>
              <td className="px-3 py-2">{entry.appliesTo}</td>
              <td className="px-3 py-2">{entry.createdByName ?? "—"}</td>
              <td className="px-3 py-2">{entry.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
