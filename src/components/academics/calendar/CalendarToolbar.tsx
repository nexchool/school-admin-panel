"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/services/academicCalendarService";

import { ENTRY_KIND_OPTIONS, type CalendarEntryKind } from "./calendarEntries";
import { EVENT_STATUS_OPTIONS } from "./calendarOptions";

/** Toggle a value in/out of a filter array. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Rounded filter chip shared by the kind and status filter rows. */
function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

export type CalendarViewMode = "month" | "week" | "list";

const VIEW_MODES: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "list", label: "List" },
];

interface ViewSwitcherProps {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
}

/** Month | Week | List pills — lives in the calendar card header (per the
 * reference design), so it stays visible in every view. */
export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onViewChange(mode.value)}
          aria-pressed={view === mode.value}
          className={cn(
            "rounded px-3 py-1 text-sm transition-colors",
            view === mode.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

interface CalendarToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  kinds: CalendarEntryKind[];
  onKindsChange: (kinds: CalendarEntryKind[]) => void;
  statuses: EventStatus[];
  onStatusesChange: (statuses: EventStatus[]) => void;
}

/** Search box + entry-kind and status filter chips with a Clear action. */
export function CalendarToolbar({
  search,
  onSearchChange,
  kinds,
  onKindsChange,
  statuses,
  onStatusesChange,
}: CalendarToolbarProps) {
  const hasFilters = search.trim() !== "" || kinds.length > 0 || statuses.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, holidays, exams…"
            className="w-64 pl-8"
            aria-label="Search calendar entries"
          />
        </div>
        {ENTRY_KIND_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={kinds.includes(opt.value)}
            label={opt.label}
            onClick={() => onKindsChange(toggle(kinds, opt.value))}
          />
        ))}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onSearchChange("");
              onKindsChange([]);
              onStatusesChange([]);
            }}
          >
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Status:</span>
        {EVENT_STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={statuses.includes(opt.value)}
            label={opt.label}
            onClick={() => onStatusesChange(toggle(statuses, opt.value))}
          />
        ))}
      </div>
    </div>
  );
}
