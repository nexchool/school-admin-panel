"use client";

import Link from "next/link";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { type CalendarEntry } from "./calendarEntries";
import { formatDisplayDate } from "./calendarOptions";

const IMPACT: Record<CalendarEntry["kind"], { attendance: string; timetable: string }> = {
  holiday: {
    attendance: "Non-working day — attendance is not expected.",
    timetable: "No lectures are scheduled on this date.",
  },
  vacation: {
    attendance: "Vacation period — attendance is not expected.",
    timetable: "No lectures are scheduled during this period.",
  },
  exam: {
    attendance: "Working days — attendance applies as usual.",
    timetable: "Dates are reserved for examinations; the timetable avoids them.",
  },
  event: {
    attendance: "No impact — the day remains a working day.",
    timetable: "No impact on scheduled lectures.",
  },
  semester: {
    attendance: "Defines the reporting period for attendance summaries.",
    timetable: "Used by exams, reports and academic planning.",
  },
};

/** Soft icon-tile tint per kind (pairs with entryColorClass dots). */
const ICON_TILE: Record<CalendarEntry["kind"], string> = {
  holiday: "bg-red-50 text-red-500",
  vacation: "bg-violet-50 text-violet-500",
  exam: "bg-blue-50 text-blue-500",
  event: "bg-amber-50 text-amber-500",
  semester: "bg-emerald-50 text-emerald-600",
};

const RELATED_LINK: Partial<Record<CalendarEntry["kind"], { href: string; label: string }>> = {
  holiday: { href: "/holidays", label: "Open Holidays module" },
  vacation: { href: "/holidays", label: "Open Holidays module" },
  semester: { href: "/academics/terms", label: "Open Semesters / Terms" },
};

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface EventDetailsDialogProps {
  entry: CalendarEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: (entry: CalendarEntry) => void;
  onDelete: (entry: CalendarEntry) => void;
}

/** Read-only detail sheet for any calendar entry, with audit + impact info. */
export function EventDetailsDialog({
  entry,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onDelete,
}: EventDetailsDialogProps) {
  if (!entry) return null;
  const impact = IMPACT[entry.kind];
  const related = RELATED_LINK[entry.kind];

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Date",
      value:
        entry.endDate !== entry.startDate
          ? `${formatDisplayDate(entry.startDate)} – ${formatDisplayDate(entry.endDate)}`
          : formatDisplayDate(entry.startDate),
    },
    { label: "Type", value: entry.typeLabel },
    { label: "Applies To", value: entry.appliesTo },
    { label: "Status", value: entry.status },
    { label: "Created By", value: entry.createdByName ?? "—" },
    { label: "Created On", value: formatTimestamp(entry.createdAt) },
  ];
  if (entry.updatedByName || entry.updatedAt) {
    rows.push(
      { label: "Last Modified By", value: entry.updatedByName ?? "—" },
      { label: "Last Modified On", value: formatTimestamp(entry.updatedAt) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                ICON_TILE[entry.kind],
              )}
            >
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {entry.name}
              <Badge variant="secondary">{entry.typeLabel}</Badge>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="font-medium">{row.value}</p>
            </div>
          ))}
        </div>

        {entry.description && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Description</p>
            <p>{entry.description}</p>
          </div>
        )}

        <div className="rounded-md border border-border p-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Impact
          </p>
          <p>
            <span className="text-muted-foreground">Attendance:</span> {impact.attendance}
          </p>
          <p>
            <span className="text-muted-foreground">Timetable:</span> {impact.timetable}
          </p>
          {related && (
            <p className="mt-1">
              <span className="text-muted-foreground">Related:</span>{" "}
              <Link href={related.href} className="text-primary hover:underline">
                {related.label} →
              </Link>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onEdit(entry)}>
                <Pencil className="mr-1 h-4 w-4" /> Edit Event
              </Button>
              <Button variant="destructive" onClick={() => onDelete(entry)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete Event
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
