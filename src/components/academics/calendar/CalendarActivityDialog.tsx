"use client";

import { useState, type ComponentType } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarPlus,
  CheckCircle2,
  Download,
  FileInput,
  Loader2,
  Pencil,
  Printer,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCalendarActivity } from "@/hooks/useAcademicCalendar";
import type { CalendarActivityEntry } from "@/services/academicCalendarService";

// ── Action → icon + label + colour tone ──────────────────────────────────────

type Tone = "green" | "blue" | "red" | "amber" | "emerald" | "violet" | "indigo" | "slate";

interface ActionMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}

const ACTION_META: Record<string, ActionMeta> = {
  calendar_created: { label: "Calendar created", icon: CalendarPlus, tone: "green" },
  calendar_updated: { label: "Calendar updated", icon: Pencil, tone: "blue" },
  calendar_deleted: { label: "Calendar deleted", icon: Trash2, tone: "red" },
  calendar_archived: { label: "Calendar archived", icon: Archive, tone: "amber" },
  calendar_restored: { label: "Calendar restored", icon: ArchiveRestore, tone: "emerald" },
  calendar_published: { label: "Calendar published", icon: CheckCircle2, tone: "emerald" },
  preferences_updated: { label: "Preferences updated", icon: SlidersHorizontal, tone: "indigo" },
  import_completed: { label: "Import completed", icon: FileInput, tone: "violet" },
  export_completed: { label: "Export completed", icon: Download, tone: "slate" },
  print_executed: { label: "Print executed", icon: Printer, tone: "slate" },
  school_event_created: { label: "Event added", icon: CalendarPlus, tone: "green" },
  school_event_updated: { label: "Event updated", icon: Pencil, tone: "blue" },
  school_event_deleted: { label: "Event deleted", icon: Trash2, tone: "red" },
  exam_window_created: { label: "Exam window added", icon: CalendarPlus, tone: "green" },
  exam_window_updated: { label: "Exam window updated", icon: Pencil, tone: "blue" },
  exam_window_deleted: { label: "Exam window deleted", icon: Trash2, tone: "red" },
};

const TONE_TILE: Record<Tone, string> = {
  green: "bg-emerald-500/10 text-emerald-600",
  blue: "bg-blue-500/10 text-blue-600",
  red: "bg-red-500/10 text-red-600",
  amber: "bg-amber-500/10 text-amber-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  indigo: "bg-indigo-500/10 text-indigo-600",
  slate: "bg-foreground/5 text-muted-foreground",
};

/** Resolve an action to its display meta, inferring a sensible default from
 * the verb (e.g. any "*_created" → green add, "*_deleted" → red trash). */
function metaFor(action: string): ActionMeta {
  if (ACTION_META[action]) return ACTION_META[action];
  const words = action.replace(/_/g, " ");
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  if (/(created|added)$/.test(action)) return { label, icon: CalendarPlus, tone: "green" };
  if (/(updated|changed)$/.test(action)) return { label, icon: Pencil, tone: "blue" };
  if (/(deleted|removed)$/.test(action)) return { label, icon: Trash2, tone: "red" };
  return { label, icon: Sparkles, tone: "slate" };
}

// ── Date / time helpers (client-side) ─────────────────────────────────────────

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(iso: string | null): string {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function prettyField(field: string): string {
  const words = field.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function changeEntries(
  entry: CalendarActivityEntry,
): { field: string; from: string; to: string }[] {
  const changes = entry.meta?.changes as
    | Record<string, { from: unknown; to: unknown }>
    | undefined;
  if (!changes || typeof changes !== "object") return [];
  return Object.entries(changes).map(([field, { from, to }]) => ({
    field: prettyField(field),
    from: from == null || from === "" ? "—" : String(from),
    to: to == null || to === "" ? "—" : String(to),
  }));
}

/** Split the newest-first list into contiguous day groups. */
function groupByDay(items: CalendarActivityEntry[]) {
  const groups: { label: string; items: CalendarActivityEntry[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  const totalItems = data?.pagination.total_items ?? 0;
  const groups = groupByDay(items);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Activity history</DialogTitle>
          <DialogDescription>
            {totalItems > 0
              ? `${totalItems} ${totalItems === 1 ? "change" : "changes"} to this calendar, most recent first.`
              : "Every change to this calendar, most recent first."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.label}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((entry) => {
                      const meta = metaFor(entry.action);
                      const Icon = meta.icon;
                      const changes = changeEntries(entry);
                      return (
                        <li
                          key={entry.id}
                          className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              TONE_TILE[meta.tone],
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="text-sm font-medium">{meta.label}</p>
                              <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {timeLabel(entry.created_at)}
                              </time>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entry.description}
                            </p>
                            {changes.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {changes.map((c) => (
                                  <span
                                    key={c.field}
                                    className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs"
                                  >
                                    <span className="text-muted-foreground">{c.field}</span>
                                    <span className="text-muted-foreground/60 line-through">
                                      {c.from}
                                    </span>
                                    <span className="text-muted-foreground/60">→</span>
                                    <span className="font-medium text-foreground">{c.to}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {entry.actor_name}
                              {entry.actor_role ? (
                                <span className="capitalize"> · {entry.actor_role}</span>
                              ) : null}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm">
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
