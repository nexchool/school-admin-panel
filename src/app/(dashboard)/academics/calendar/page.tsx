"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, Download, Plus, Printer, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import {
  useAcademicCalendarState,
  useCalendarDays,
  useCalendarSummary,
  useExamWindows,
  useSchoolEvents,
} from "@/hooks/useAcademicCalendar";
import { useHolidays } from "@/hooks/useHolidays";
import { useTerms } from "@/hooks/useTerms";
import type { CalendarDay } from "@/services/academicCalendarService";

import { AddEventDialog } from "@/components/academics/calendar/AddEventDialog";
import {
  CalendarMonthGrid,
  monthKey,
  monthLabel,
} from "@/components/academics/calendar/CalendarMonthGrid";
import { CalendarWeekView } from "@/components/academics/calendar/CalendarWeekView";
import { CalendarListView } from "@/components/academics/calendar/CalendarListView";
import {
  CalendarToolbar,
  type CalendarViewMode,
} from "@/components/academics/calendar/CalendarToolbar";
import { DayEventsDialog } from "@/components/academics/calendar/DayEventsDialog";
import { EntryEditController } from "@/components/academics/calendar/EntryEditController";
import { EventDetailsDialog } from "@/components/academics/calendar/EventDetailsDialog";
import { UpcomingEventsPanel } from "@/components/academics/calendar/UpcomingEventsPanel";
import {
  buildCalendarEntries,
  entriesOnDate,
  entriesToCsv,
  filterEntries,
  type CalendarEntry,
  type CalendarEntryKind,
} from "@/components/academics/calendar/calendarEntries";
import {
  formatDisplayDate,
  todayIso,
  weekStartOf,
} from "@/components/academics/calendar/calendarOptions";

function clampIso(iso: string, min: string, max: string): string {
  return iso < min ? min : iso > max ? max : iso;
}

export default function AcademicCalendarPage() {
  const { hasAnyPermission } = useAuth();
  const canManage = hasAnyPermission(["academic_calendar.manage"]);

  const { academicYearId: activeYearId } = useActiveAcademicYear();
  const { data: years = [], isLoading: yearsLoading } = useAcademicYears();
  const academicYearId = activeYearId ?? years[0]?.id;
  const year = years.find((y) => y.id === academicYearId);

  const { data: calendar, isLoading: calendarLoading } =
    useAcademicCalendarState(academicYearId);
  const { data: summary } = useCalendarSummary(calendar?.id);
  const { data: days = [] } = useCalendarDays(calendar?.id);
  const { data: events = [] } = useSchoolEvents(academicYearId);
  const { data: examWindows = [] } = useExamWindows(academicYearId);
  const { data: holidays = [] } = useHolidays({ academic_year_id: academicYearId });
  const { data: terms = [] } = useTerms(academicYearId);

  // View state — all client-side, no reloads.
  const [view, setView] = useState<CalendarViewMode>("month");
  const [search, setSearch] = useState("");
  const [kinds, setKinds] = useState<CalendarEntryKind[]>([]);
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const [weekOverride, setWeekOverride] = useState<string | null>(null);

  // Dialog state.
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [detailsEntry, setDetailsEntry] = useState<CalendarEntry | null>(null);
  const [actionEntry, setActionEntry] = useState<CalendarEntry | null>(null);
  const [actionMode, setActionMode] = useState<"edit" | "delete" | null>(null);
  const [dayDialog, setDayDialog] = useState<CalendarDay | null>(null);

  const entries = useMemo(
    () => buildCalendarEntries({ holidays, examWindows, events, terms }),
    [holidays, examWindows, events, terms],
  );
  const filteredEntries = useMemo(
    () => filterEntries(entries, { search, kinds }),
    [entries, search, kinds],
  );

  const yearStart = year?.start_date ?? todayIso();
  const yearEnd = year?.end_date ?? todayIso();
  const clampedToday = clampIso(todayIso(), yearStart, yearEnd);
  const month = monthOverride ?? monthKey(clampedToday);
  const weekStart = weekOverride ?? weekStartOf(clampedToday);
  const yearMonths = useMemo(() => {
    const keys: string[] = [];
    for (const d of days) {
      const key = monthKey(d.date);
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }, [days]);

  const goToToday = () => {
    setMonthOverride(monthKey(clampedToday));
    setWeekOverride(weekStartOf(clampedToday));
  };

  const openDetails = (entry: CalendarEntry) => {
    setDayDialog(null);
    setDetailsEntry(entry);
  };

  const startAction = (entry: CalendarEntry, mode: "edit" | "delete") => {
    setDetailsEntry(null);
    setActionEntry(entry);
    setActionMode(mode);
  };

  const exportCsv = () => {
    const csv = entriesToCsv(filteredEntries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `academic-calendar-${year?.name ?? "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (yearsLoading || (academicYearId && calendarLoading)) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Empty state — no year yet, or no calendar started for the active year.
  if (!academicYearId || !calendar) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Academic Calendar</h1>
        <Card className="mx-auto mt-10 max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CalendarPlus className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {year
                  ? `No academic calendar set up for ${year.name} yet.`
                  : "No academic year found."}
              </p>
              <p className="text-sm text-muted-foreground">
                Run the guided setup to configure the year, holidays, vacations,
                semesters, exams and events.
              </p>
            </div>
            {canManage && (
              <Button asChild>
                <Link
                  href={
                    academicYearId
                      ? `/academics/calendar/setup?year=${academicYearId}`
                      : "/academics/calendar/setup"
                  }
                >
                  Start Calendar Setup
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Working Days", value: summary?.working_days, tone: "text-green-600" },
    { label: "Public Holidays", value: summary?.public_holiday_days, tone: "text-red-600" },
    { label: "Weekly Holidays", value: summary?.weekly_holiday_days, tone: "text-muted-foreground" },
    { label: "Vacation Days", value: summary?.vacation_days, tone: "text-violet-600" },
    { label: "Exam Days", value: summary?.exam_days, tone: "text-blue-600" },
    { label: "School Events", value: summary?.event_count, tone: "text-amber-600" },
    { label: "Teacher Training", value: summary?.events_by_type?.training ?? 0, tone: "text-yellow-600" },
    { label: "Parent Meetings", value: summary?.events_by_type?.meeting ?? 0, tone: "text-pink-600" },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Academic Calendar</h1>
            <Badge variant={calendar.status === "published" ? "default" : "secondary"}>
              {calendar.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {year?.name} · Academics › Academic Calendar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={goToToday}>
            <CalendarCheck className="mr-1 h-4 w-4" /> Today
          </Button>
          <Select value={month} onValueChange={(m) => setMonthOverride(m)}>
            <SelectTrigger className="w-40" aria-label="Jump to month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/academics/calendar/setup?year=${academicYearId}`}>
                  <Settings2 className="mr-1 h-4 w-4" />
                  {calendar.status === "published" ? "Edit Setup" : "Resume Setup"}
                </Link>
              </Button>
              <Button onClick={() => setAddEventOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Event
              </Button>
            </>
          )}
        </div>
      </div>

      {calendar.status === "draft" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 print:hidden">
          This calendar is still a draft — finish the setup wizard and generate
          it so other modules can use it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 print:hidden">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.tone}`}>{s.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="print:hidden">
        <CalendarToolbar
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          kinds={kinds}
          onKindsChange={setKinds}
        />
      </div>

      <div className="print:hidden">
        {view === "month" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                {days.length > 0 && year ? (
                  <CalendarMonthGrid
                    days={days}
                    yearStart={yearStart}
                    yearEnd={yearEnd}
                    month={month}
                    onMonthChange={setMonthOverride}
                    onDayClick={setDayDialog}
                  />
                ) : (
                  <Skeleton className="h-80" />
                )}
              </CardContent>
            </Card>
            <UpcomingEventsPanel entries={filteredEntries} onEntryClick={openDetails} />
          </div>
        )}

        {view === "week" && year && (
          <Card>
            <CardContent className="p-4">
              <CalendarWeekView
                days={days}
                entries={filteredEntries}
                yearStart={yearStart}
                yearEnd={yearEnd}
                weekStart={weekStart}
                onWeekChange={setWeekOverride}
                onEntryClick={openDetails}
              />
            </CardContent>
          </Card>
        )}

        {view === "list" && (
          <CalendarListView entries={filteredEntries} onEntryClick={openDetails} />
        )}
      </div>

      {/* Print-friendly rendering: summary + full entry list. */}
      <div className="hidden print:block">
        <h2 className="text-lg font-semibold">
          Academic Calendar — {year?.name}
        </h2>
        <p className="mb-3 text-sm">
          Working days: {summary?.working_days} of {summary?.total_days} · Public
          holidays: {summary?.public_holiday_days} · Vacation days:{" "}
          {summary?.vacation_days} · Exam days: {summary?.exam_days}
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border p-1 text-left">Date</th>
              <th className="border border-border p-1 text-left">Name</th>
              <th className="border border-border p-1 text-left">Type</th>
              <th className="border border-border p-1 text-left">Applies To</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.key}>
                <td className="border border-border p-1">
                  {formatDisplayDate(entry.startDate)}
                  {entry.endDate !== entry.startDate &&
                    ` – ${formatDisplayDate(entry.endDate)}`}
                </td>
                <td className="border border-border p-1">{entry.name}</td>
                <td className="border border-border p-1">{entry.typeLabel}</td>
                <td className="border border-border p-1">{entry.appliesTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {academicYearId && (
        <AddEventDialog
          open={addEventOpen}
          onOpenChange={setAddEventOpen}
          academicYearId={academicYearId}
        />
      )}

      <EventDetailsDialog
        entry={detailsEntry}
        open={detailsEntry !== null}
        onOpenChange={(open) => !open && setDetailsEntry(null)}
        canManage={canManage}
        onEdit={(entry) => startAction(entry, "edit")}
        onDelete={(entry) => startAction(entry, "delete")}
      />

      <DayEventsDialog
        day={dayDialog}
        entries={dayDialog ? entriesOnDate(filteredEntries, dayDialog.date) : []}
        open={dayDialog !== null}
        onOpenChange={(open) => !open && setDayDialog(null)}
        onEntryClick={openDetails}
      />

      {academicYearId && (
        <EntryEditController
          academicYearId={academicYearId}
          entry={actionEntry}
          mode={actionMode}
          onClose={() => {
            setActionEntry(null);
            setActionMode(null);
          }}
        />
      )}
    </div>
  );
}
