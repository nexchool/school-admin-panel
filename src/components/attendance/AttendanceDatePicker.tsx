"use client";

import * as React from "react";
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import type { DayButtonProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { attendanceService, type HolidayOccurrence } from "@/services/attendanceService";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseISODateLocal(ymd: string): Date {
  return parse(ymd, "yyyy-MM-dd", new Date());
}

function formatISODateLocal(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const START_YEAR = new Date().getFullYear() - 25;
const END_YEAR = new Date().getFullYear() + 10;

const CALENDAR_START = new Date(START_YEAR, 0, 1);
const CALENDAR_END = new Date(END_YEAR, 11, 31);

// ─── Holiday label context ─────────────────────────────────────────────────────

const HolidayContext = React.createContext<Map<string, HolidayOccurrence[]>>(new Map());

/**
 * Custom DayButton that shows a small holiday name label beneath the day number
 * for non-recurring (named) holidays.
 */
function HolidayAwareDayButton({ day, modifiers, children, className, ...rest }: DayButtonProps) {
  const holidayByDate = React.useContext(HolidayContext);

  const namedHoliday = React.useMemo(() => {
    if (!modifiers.holiday) return null;
    const entries = holidayByDate.get(day.isoDate);
    if (!entries?.length) return null;
    // Only show label for named (non-recurring) holidays, not weekly offs like Sunday
    const named = entries.find((h) => !h.is_recurring && h.name);
    return named ? String(named.name) : null;
  }, [modifiers.holiday, holidayByDate, day.isoDate]);

  return (
    <button type="button" className={className} {...rest}>
      {/* day number — keep original children */}
      <span className="leading-none">{children}</span>
      {namedHoliday && (
        <span
          className={cn(
            "mt-0.5 block w-full truncate px-0.5 text-center text-[0.5rem] font-medium leading-tight",
            // rose colour when holiday, white when selected (selected overrides background)
            modifiers.selected ? "text-white/80" : "text-rose-500"
          )}
          title={namedHoliday}
          aria-hidden
        >
          {namedHoliday}
        </span>
      )}
    </button>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function AttendanceDatePicker({ value, onChange, disabled, className, id }: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => parseISODateLocal(value), [value]);
  const [displayMonth, setDisplayMonth] = React.useState(() => startOfMonth(selected));

  React.useEffect(() => {
    setDisplayMonth(startOfMonth(selected));
  }, [selected]);

  const [holidayDates, setHolidayDates] = React.useState<Date[]>([]);
  const [holidayByDate, setHolidayByDate] = React.useState<Map<string, HolidayOccurrence[]>>(
    new Map()
  );
  const [holidayError, setHolidayError] = React.useState<string | null>(null);

  const isHoliday = React.useCallback(
    (d: Date) => holidayDates.some((h) => isSameDay(h, d)),
    [holidayDates]
  );

  const loadHolidays = React.useCallback(async (anchor: Date) => {
    const from = formatISODateLocal(startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }));
    const to = formatISODateLocal(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }));
    try {
      const data = await attendanceService.getCalendarHolidaysInRange(from, to);
      const map = new Map<string, HolidayOccurrence[]>();
      const dates: Date[] = [];
      const seen = new Set<string>();
      for (const o of data.occurrences ?? []) {
        const key = o.occurrence_date?.slice(0, 10);
        if (!key) continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(o);
        if (!seen.has(key)) {
          seen.add(key);
          dates.push(parseISODateLocal(key));
        }
      }
      setHolidayByDate(map);
      setHolidayDates(dates);
      setHolidayError(null);
    } catch (e) {
      setHolidayDates([]);
      setHolidayByDate(new Map());
      setHolidayError(e instanceof Error ? e.message : "Could not load holidays");
    }
  }, []);

  React.useEffect(() => {
    void loadHolidays(displayMonth);
  }, [displayMonth, loadHolidays]);

  const currentHolidayNames = React.useMemo(() => {
    const list = holidayByDate.get(value.slice(0, 10));
    if (!list?.length) return null;
    // Only named (non-recurring) holidays shown in the footer notice
    const names = list.filter((h) => !h.is_recurring && h.name).map((h) => String(h.name));
    return names.length ? names : null;
  }, [holidayByDate, value]);

  const displayValue = value ? format(parseISODateLocal(value), "EEE, d MMM yyyy") : null;

  // Taller day cells when any named holiday is in the visible month so the
  // label fits — achieved by expanding the rdp CSS custom properties.
  const hasNamedHolidaysThisMonth = React.useMemo(() => {
    for (const [, entries] of holidayByDate) {
      if (entries.some((h) => !h.is_recurring && h.name)) return true;
    }
    return false;
  }, [holidayByDate]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        {/* ── Trigger ───────────────────────────────────────────────────── */}
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full min-w-[220px] items-center gap-2.5 rounded-lg border border-input bg-background px-3 text-sm shadow-sm",
              "text-left transition-[box-shadow,border-color] duration-150",
              "hover:border-ring/50 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !value && "text-muted-foreground",
              open && "border-ring/50 shadow-md"
            )}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <CalendarDays
              className={cn(
                "size-4 shrink-0 transition-colors duration-150",
                open ? "text-primary" : "text-muted-foreground"
              )}
              strokeWidth={1.75}
            />
            {displayValue ? (
              <span className="flex-1 truncate text-foreground">{displayValue}</span>
            ) : (
              <span className="flex-1 text-muted-foreground">Pick a date</span>
            )}
          </button>
        </PopoverTrigger>

        {/* ── Popover panel ─────────────────────────────────────────────── */}
        <PopoverContent
          className="w-auto overflow-hidden rounded-xl border border-border/80 bg-card p-0 shadow-xl shadow-black/8 ring-1 ring-black/5 z-[100]"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Provide holiday map to the custom DayButton via context */}
          <HolidayContext.Provider value={holidayByDate}>
            <Calendar
              mode="single"
              captionLayout="dropdown"
              navLayout="around"
              startMonth={CALENDAR_START}
              endMonth={CALENDAR_END}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              selected={selected}
              onSelect={(d) => {
                if (!d || isHoliday(d)) return;
                onChange(formatISODateLocal(d));
                setOpen(false);
              }}
              disabled={isHoliday}
              initialFocus
              modifiers={{ holiday: holidayDates }}
              modifiersClassNames={{
                holiday: cn(
                  "rdp-day",
                  // Taller cell when label is present so it doesn't overflow
                  hasNamedHolidaysThisMonth && "!h-auto min-h-9",
                  "[&_.rdp-day_button]:h-full [&_.rdp-day_button]:flex-col [&_.rdp-day_button]:justify-center",
                  "[&_.rdp-day_button]:bg-rose-50 [&_.rdp-day_button]:text-rose-600",
                  "[&_.rdp-day_button]:!opacity-100",
                  "[&_.rdp-day_button]:hover:bg-rose-50 [&_.rdp-day_button]:hover:text-rose-600",
                  "[&_.rdp-day_button]:cursor-not-allowed"
                ),
              }}
              components={{ DayButton: HolidayAwareDayButton }}
            />
          </HolidayContext.Provider>

          {/* ── Legend / footer ───────────────────────────────────────── */}
          <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-rose-100">
                <span className="size-1.5 rounded-full bg-rose-500" />
              </span>
              <span>School holiday or weekly off — not selectable</span>
            </div>
            {holidayError && (
              <p className="mt-1 text-[0.7rem] text-muted-foreground/70">{holidayError}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Selected-date holiday notice ──────────────────────────────────── */}
      {currentHolidayNames && currentHolidayNames.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-rose-700" role="status">
          <span className="mt-px size-3.5 shrink-0 rounded-full bg-rose-100 inline-flex items-center justify-center">
            <span className="size-1.5 rounded-full bg-rose-500" />
          </span>
          <span>
            <span className="font-medium">Holiday:</span>{" "}
            {currentHolidayNames.join(" · ")} — choose a working day to view attendance.
          </span>
        </p>
      )}
    </div>
  );
}
