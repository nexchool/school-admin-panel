"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { ENTRY_KIND_OPTIONS, type CalendarEntryKind } from "./calendarEntries";

export type CalendarViewMode = "month" | "week" | "list";

const VIEW_MODES: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "list", label: "List" },
];

interface CalendarToolbarProps {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  search: string;
  onSearchChange: (search: string) => void;
  kinds: CalendarEntryKind[];
  onKindsChange: (kinds: CalendarEntryKind[]) => void;
}

/** Search box, entry-kind filter chips and the Month/Week/List switcher. */
export function CalendarToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  kinds,
  onKindsChange,
}: CalendarToolbarProps) {
  const toggleKind = (kind: CalendarEntryKind) => {
    onKindsChange(
      kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind],
    );
  };
  const hasFilters = search.trim() !== "" || kinds.length > 0;

  return (
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

      <div className="flex flex-wrap items-center gap-1.5">
        {ENTRY_KIND_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleKind(opt.value)}
            aria-pressed={kinds.includes(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              kinds.includes(opt.value)
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {opt.label}
          </button>
        ))}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onSearchChange("");
              onKindsChange([]);
            }}
          >
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <div className="ml-auto flex rounded-md border border-border p-0.5">
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
    </div>
  );
}
