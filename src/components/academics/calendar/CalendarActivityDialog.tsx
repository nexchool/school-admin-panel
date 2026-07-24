"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCalendarActivity } from "@/hooks/useAcademicCalendar";
import type { CalendarActivityEntry } from "@/services/academicCalendarService";

// Machine action → human label. Unknown actions are prettified from the string.
const ACTION_LABEL: Record<string, string> = {
  calendar_created: "Calendar created",
  calendar_updated: "Calendar updated",
  calendar_deleted: "Calendar deleted",
  calendar_archived: "Calendar archived",
  calendar_restored: "Calendar restored",
  calendar_published: "Calendar published",
  preferences_updated: "Preferences updated",
  import_completed: "Import completed",
  export_completed: "Export completed",
  print_executed: "Print executed",
  school_event_created: "Event added",
  school_event_updated: "Event updated",
  school_event_deleted: "Event deleted",
  exam_window_created: "Exam window added",
  exam_window_updated: "Exam window updated",
  exam_window_deleted: "Exam window deleted",
};

function labelFor(action: string): string {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  // e.g. "public_holiday_created" → "Public holiday created"
  const words = action.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function changeSummary(entry: CalendarActivityEntry): string | null {
  const changes = entry.meta?.changes as
    | Record<string, { from: unknown; to: unknown }>
    | undefined;
  if (!changes || typeof changes !== "object") return null;
  const parts = Object.entries(changes).map(
    ([field, { from, to }]) => `${field}: ${from ?? "—"} → ${to ?? "—"}`,
  );
  return parts.length ? parts.join(" · ") : null;
}

interface CalendarActivityDialogProps {
  calendarId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Chronological activity history for one calendar (newest first, paginated). */
export function CalendarActivityDialog({
  calendarId,
  open,
  onOpenChange,
}: CalendarActivityDialogProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCalendarActivity(calendarId, page, open);

  const items = data?.items ?? [];
  const totalPages = data?.pagination.total_pages ?? 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity history</DialogTitle>
          <DialogDescription>
            Every change to this calendar, most recent first.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {items.map((entry) => {
              const summary = changeSummary(entry);
              return (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-medium">{labelFor(entry.action)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatWhen(entry.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                  {summary && (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">{summary}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.actor_name}
                    {entry.actor_role ? ` · ${entry.actor_role}` : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
