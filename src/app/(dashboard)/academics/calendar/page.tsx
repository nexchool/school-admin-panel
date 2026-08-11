"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CalendarPlus,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  MoreVertical,
  Plus,
  Printer,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
  useArchiveCalendar,
  useCalendarDays,
  useCalendarSummary,
  useDeleteCalendar,
  useExamWindows,
  useRestoreCalendar,
  useSchoolEvents,
} from "@/hooks/useAcademicCalendar";
import { useHolidays } from "@/hooks/useHolidays";
import { useTerms } from "@/hooks/useTerms";
import type { CalendarDay } from "@/services/academicCalendarService";

import { AddEventDialog } from "@/components/academics/calendar/AddEventDialog";
import { CalendarActivityDialog } from "@/components/academics/calendar/CalendarActivityDialog";
import { CalendarImportDialog } from "@/components/academics/calendar/CalendarImportDialog";
import { CalendarPreferencesDialog } from "@/components/academics/calendar/CalendarPreferencesDialog";
import { ConfirmDialog } from "@/components/academics/calendar/ConfirmDialog";
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
  CalendarPreferences,
  EventStatus,
} from "@/services/academicCalendarService";
import { triggerDownload } from "@/lib/download";
import {
  todayIso,
  weekStartOf,
} from "@/components/academics/calendar/calendarOptions";

function clampIso(iso: string, min: string, max: string): string {
  return iso < min ? min : iso > max ? max : iso;
}

type PrintMode = "full" | "holidays" | "semesters" | "events";

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

// Print produces a PDF via the backend export; each mode maps to its sections.
const PRINT_SECTIONS: Record<PrintMode, string[] | undefined> = {
  full: undefined,
  holidays: ["public_holidays", "vacations", "weekly_holidays"],
  semesters: ["semesters"],
  events: ["events", "exam_windows"],
};

export default function AcademicCalendarPage() {
  const { hasAnyPermission } = useAuth();
  // Per-action capabilities. hasAnyPermission treats `academic_calendar.manage`
  // as a superset, so an Admin (manage) sees everything; a sub-admin sees only
  // the actions their granular permissions allow.
  const canCreate = hasAnyPermission(["academic_calendar.create"]);
  const canEdit = hasAnyPermission(["academic_calendar.edit"]);
  const canDelete = hasAnyPermission(["academic_calendar.delete"]);
  const canArchive = hasAnyPermission(["academic_calendar.archive"]);
  const canExport = hasAnyPermission(["academic_calendar.export"]);
  const canImport = hasAnyPermission(["academic_calendar.import"]);
  const canPrint = hasAnyPermission(["academic_calendar.print"]);
  const canSettings = hasAnyPermission(["academic_calendar.settings"]);
  const canView = hasAnyPermission(["academic_calendar.read"]);
  const hasMenuAction =
    canView || canExport || canPrint || canEdit || canImport || canSettings ||
    canArchive || canDelete;

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


  // Dialog state.
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [detailsEntry, setDetailsEntry] = useState<CalendarEntry | null>(null);
  const [actionEntry, setActionEntry] = useState<CalendarEntry | null>(null);
  const [actionMode, setActionMode] = useState<"edit" | "delete" | null>(null);
  const [dayDialog, setDayDialog] = useState<CalendarDay | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const archiveCalendar = useArchiveCalendar();
  const restoreCalendar = useRestoreCalendar();
  const deleteCalendar = useDeleteCalendar();
  const prefsAppliedRef = useRef(false);

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

  // Print downloads a print-ready PDF from the backend (works with no printer);
  // each mode narrows the sections. Also logs "Print Executed".
  const printAs = async (mode: PrintMode) => {
    if (!calendar) return;
    try {
      const blob = await academicCalendarService.exportCalendar(
        calendar.id,
        "pdf",
        PRINT_SECTIONS[mode],
      );
      triggerDownload(blob, `academic-calendar-${year?.name ?? "export"}-${mode}.pdf`);
      academicCalendarService.logPrint(calendar.id, mode).catch(() => {});
    } catch (e) {
      toastError(e, "Could not generate the PDF");
    }
  };

  // Apply saved default view/month (the cheap-to-apply preferences).
  const applyPrefs = (prefs: CalendarPreferences) => {
    setView(prefs.default_view);
    if (prefs.default_month) setMonthOverride(prefs.default_month);
  };
  // Run once when the calendar first loads (controlled sync from server prefs).
  useEffect(() => {
    if (!calendar || prefsAppliedRef.current) return;
    prefsAppliedRef.current = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    applyPrefs(calendar.preferences);
  }, [calendar]);

  const handleArchive = () => {
    if (!calendar) return;
    archiveCalendar.mutate(calendar.id, {
      onSuccess: () => toast.success("Calendar archived"),
      onError: (e) => toastError(e, "Could not archive the calendar"),
    });
  };
  const handleRestore = () => {
    if (!calendar) return;
    restoreCalendar.mutate(calendar.id, {
      onSuccess: () => toast.success("Calendar restored"),
      onError: (e) => toastError(e, "Could not restore the calendar"),
    });
  };
  const handleConfirmDelete = () => {
    if (!calendar) return;
    deleteCalendar.mutate(calendar.id, {
      onSuccess: () => {
        toast.success("Draft calendar deleted");
        setDeleteOpen(false);
      },
      onError: (e) => toastError(e, "Could not delete the calendar"),
    });
  };

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
        <PageHeader title="Academic Calendar" />
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
            {canCreate && (
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
      <PageHeader
        className="print:hidden"
        title={
          <span className="flex items-center gap-2">
            Academic Calendar
            {calendar.status === "draft" && <Badge variant="secondary">Draft</Badge>}
            {calendar.status === "archived" && <Badge variant="outline">Archived</Badge>}
          </span>
        }
        description={year?.name}
        actions={
          <>
          {canEdit && (
            <Button onClick={() => setAddEventOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Event
            </Button>
          )}
          {hasMenuAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {canView && (
                <DropdownMenuItem onClick={() => setActivityOpen(true)}>
                  <History className="mr-2 h-4 w-4" /> Activity history
                </DropdownMenuItem>
              )}
              {canView &&
                (canExport || canPrint || canEdit || canImport || canSettings ||
                  canArchive || canDelete) && <DropdownMenuSeparator />}
              {canExport && (
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
              )}

              {canPrint && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => printAs("full")}>
                      Full calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => printAs("holidays")}>
                      Holiday list
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => printAs("semesters")}>
                      Semester schedule
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => printAs("events")}>
                      Event list
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {(canEdit || canImport || canSettings || canArchive || canDelete) && (
                <>
                  {(canExport || canPrint) && <DropdownMenuSeparator />}
                  {canEdit && calendar.status !== "archived" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/academics/calendar/setup?year=${academicYearId}`}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        {calendar.status === "published" ? "Edit Setup" : "Resume Setup"}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canImport && calendar.status !== "archived" && (
                    <DropdownMenuItem onClick={() => setImportOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" /> Import data
                    </DropdownMenuItem>
                  )}
                  {canSettings && (
                    <DropdownMenuItem onClick={() => setPrefsOpen(true)}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" /> Preferences
                    </DropdownMenuItem>
                  )}
                  {canArchive && calendar.status === "published" && (
                    <DropdownMenuItem onClick={handleArchive}>
                      <Archive className="mr-2 h-4 w-4" /> Archive calendar
                    </DropdownMenuItem>
                  )}
                  {canArchive && calendar.status === "archived" && (
                    <DropdownMenuItem onClick={handleRestore}>
                      <ArchiveRestore className="mr-2 h-4 w-4" /> Restore calendar
                    </DropdownMenuItem>
                  )}
                  {canDelete && calendar.status === "draft" && (
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete draft
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          </>
        }
      />

      {calendar.status === "draft" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 print:hidden">
          This calendar is still a draft — finish the setup wizard and generate
          it so other modules can use it.
        </p>
      )}

      {calendar.status === "archived" && (
        <p className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground print:hidden">
          This calendar is archived and read-only. Restore it from the ⋮ menu to
          make changes.
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
        canManage={canEdit}
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

      <CalendarImportDialog
        calendarId={calendar.id}
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <CalendarPreferencesDialog
        calendarId={calendar.id}
        preferences={calendar.preferences}
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        onSaved={applyPrefs}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Academic Calendar?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        isPending={deleteCalendar.isPending}
      />

      <CalendarActivityDialog
        calendarId={calendar.id}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </div>
  );
}
