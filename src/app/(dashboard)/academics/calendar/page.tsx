"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toastError } from "@/lib/errorToast";
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
} from "@/components/academics/calendar/CalendarMonthGrid";
import { CalendarWeekView } from "@/components/academics/calendar/CalendarWeekView";
import { CalendarListView } from "@/components/academics/calendar/CalendarListView";
import {
  CalendarToolbar,
  ViewSwitcher,
  type CalendarViewMode,
} from "@/components/academics/calendar/CalendarToolbar";
import { DayEventsDialog } from "@/components/academics/calendar/DayEventsDialog";
import { EntryEditController } from "@/components/academics/calendar/EntryEditController";
import { EventDetailsDialog } from "@/components/academics/calendar/EventDetailsDialog";
import { UpcomingEventsPanel } from "@/components/academics/calendar/UpcomingEventsPanel";
import {
  buildCalendarEntries,
  entriesOnDate,
  filterEntries,
  type CalendarEntry,
  type CalendarEntryKind,
} from "@/components/academics/calendar/calendarEntries";
import { academicCalendarService } from "@/services/academicCalendarService";
import type {
  CalendarExportFormat,
  EventStatus,
} from "@/services/academicCalendarService";
import {
  formatDisplayDate,
  todayIso,
  weekStartOf,
} from "@/components/academics/calendar/calendarOptions";

function clampIso(iso: string, min: string, max: string): string {
  return iso < min ? min : iso > max ? max : iso;
}

type PrintMode = "full" | "month" | "holidays" | "semesters" | "events";

// Dashboard entry kind → backend export section key (for filtered exports).
const KIND_TO_SECTION: Record<CalendarEntryKind, string> = {
  holiday: "public_holidays",
  vacation: "vacations",
  exam: "exam_windows",
  event: "events",
  semester: "semesters",
};

const EXPORT_EXT: Record<CalendarExportFormat, string> = {
  pdf: "pdf",
  excel: "xlsx",
  csv: "csv",
};

const PRINT_MODE_LABEL: Record<PrintMode, string> = {
  full: "Full calendar",
  month: "Monthly schedule",
  holidays: "Holiday list",
  semesters: "Semester schedule",
  events: "Event list",
};

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  const [statuses, setStatuses] = useState<EventStatus[]>([]);
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const [weekOverride, setWeekOverride] = useState<string | null>(null);

  // Print: `printMode` picks what the print stylesheet renders; bumping
  // `printTick` fires window.print() after the DOM reflects the new mode.
  const [printMode, setPrintMode] = useState<PrintMode>("full");
  const [printTick, setPrintTick] = useState(0);

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
  // Live (active) entries drive the month/week/upcoming views; the List view
  // shows everything with its status so drafts/cancelled stay manageable.
  const liveEntries = useMemo(() => entries.filter((e) => e.isLive), [entries]);
  const filteredEntries = useMemo(
    () => filterEntries(entries, { search, kinds, statuses }),
    [entries, search, kinds, statuses],
  );

  const yearStart = year?.start_date ?? todayIso();
  const yearEnd = year?.end_date ?? todayIso();
  const clampedToday = clampIso(todayIso(), yearStart, yearEnd);
  const month = monthOverride ?? monthKey(clampedToday);
  const weekStart = weekOverride ?? weekStartOf(clampedToday);

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

  const exportAs = async (format: CalendarExportFormat) => {
    if (!calendar) return;
    // Respect the List view's kind filter when the user has narrowed it.
    const sections = kinds.length
      ? Array.from(new Set(kinds.map((k) => KIND_TO_SECTION[k])))
      : undefined;
    try {
      const blob = await academicCalendarService.exportCalendar(
        calendar.id,
        format,
        sections,
      );
      triggerDownload(
        blob,
        `academic-calendar-${year?.name ?? "export"}.${EXPORT_EXT[format]}`,
      );
      toast.success(`Calendar exported as ${format.toUpperCase()}`);
    } catch (e) {
      toastError(e, "Export failed");
    }
  };

  const requestPrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setPrintTick((t) => t + 1);
  };

  // Fire the browser print dialog once the print DOM reflects `printMode`.
  useEffect(() => {
    if (printTick > 0) window.print();
  }, [printTick]);

  // Entries the print layout renders, scoped to the chosen print mode. Uses
  // live entries only (drafts/cancelled events stay off the printout), matching
  // the backend export which is active-only.
  const printEntries = useMemo(() => {
    switch (printMode) {
      case "holidays":
        return liveEntries.filter((e) => e.kind === "holiday" || e.kind === "vacation");
      case "semesters":
        return liveEntries.filter((e) => e.kind === "semester");
      case "events":
        return liveEntries.filter((e) => e.kind === "exam" || e.kind === "event");
      case "month": {
        const start = `${month}-01`;
        const end = `${month}-31`; // lexicographic upper bound for yyyy-mm-dd
        return liveEntries.filter((e) => e.startDate <= end && e.endDate >= start);
      }
      default:
        return liveEntries;
    }
  }, [liveEntries, printMode, month]);

  if (yearsLoading || (academicYearId && calendarLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Empty state — no year yet, or no calendar started for the active year.
  if (!academicYearId || !calendar) {
    return (
      <div>
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
    { label: "Exam Days", value: summary?.exam_days, tone: "text-blue-600" },
    { label: "Events", value: summary?.event_count, tone: "text-amber-600" },
    { label: "Vacation Days", value: summary?.vacation_days, tone: "text-violet-600" },
  ];

  // View pills + Today live in the calendar card header (per the reference).
  const viewControls = (
    <div className="flex items-center gap-2">
      <ViewSwitcher view={view} onViewChange={setView} />
      <Button variant="outline" size="sm" onClick={goToToday}>
        Today
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Academic Calendar</h1>
            {calendar.status === "draft" && <Badge variant="secondary">Draft</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {year?.name} · Academics › Academic Calendar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" /> Export
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => exportAs("pdf")}>
                    <FileText className="mr-2 h-4 w-4" /> PDF document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("excel")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel workbook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("csv")}>
                    <Download className="mr-2 h-4 w-4" /> CSV file
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => requestPrint("full")}>
                    Full calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requestPrint("month")}>
                    This month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requestPrint("holidays")}>
                    Holiday list
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requestPrint("semesters")}>
                    Semester schedule
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requestPrint("events")}>
                    Event list
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/academics/calendar/setup?year=${academicYearId}`}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      {calendar.status === "published" ? "Edit Setup" : "Resume Setup"}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <Button onClick={() => setAddEventOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Event
            </Button>
          )}
        </div>
      </div>

      {calendar.status === "draft" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 print:hidden">
          This calendar is still a draft — finish the setup wizard and generate
          it so other modules can use it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:hidden">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-xs font-medium ${s.tone}`}>{s.label}</p>
              <p className="text-2xl font-semibold text-foreground">{s.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
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
                    headerRight={viewControls}
                  />
                ) : (
                  <Skeleton className="h-80" />
                )}
              </CardContent>
            </Card>
            <UpcomingEventsPanel
              entries={liveEntries}
              onEntryClick={openDetails}
              onViewAll={() => setView("list")}
            />
          </div>
        )}

        {view === "week" && year && (
          <Card>
            <CardContent className="p-4">
              <CalendarWeekView
                days={days}
                entries={liveEntries}
                yearStart={yearStart}
                yearEnd={yearEnd}
                weekStart={weekStart}
                onWeekChange={setWeekOverride}
                onEntryClick={openDetails}
                headerRight={viewControls}
              />
            </CardContent>
          </Card>
        )}

        {view === "list" && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">All Calendar Entries</p>
                {viewControls}
              </div>
              <CalendarToolbar
                search={search}
                onSearchChange={setSearch}
                kinds={kinds}
                onKindsChange={setKinds}
                statuses={statuses}
                onStatusesChange={setStatuses}
              />
              <CalendarListView entries={filteredEntries} onEntryClick={openDetails} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print-friendly rendering: summary + the chosen print mode's entries. */}
      <div className="hidden print:block">
        <h2 className="text-lg font-semibold">
          Academic Calendar — {year?.name}
        </h2>
        <p className="mb-1 text-sm text-muted-foreground">
          {PRINT_MODE_LABEL[printMode]}
        </p>
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
            {printEntries.map((entry) => (
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
        entries={dayDialog ? entriesOnDate(liveEntries, dayDialog.date) : []}
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
