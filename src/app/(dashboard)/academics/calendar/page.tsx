"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import {
  useAcademicCalendarState,
  useCalendarDays,
  useCalendarSummary,
  useSchoolEvents,
} from "@/hooks/useAcademicCalendar";
import { useHolidays } from "@/hooks/useHolidays";

import { AddEventDialog } from "@/components/academics/calendar/AddEventDialog";
import { CalendarMonthGrid } from "@/components/academics/calendar/CalendarMonthGrid";
import { formatDisplayDate } from "@/components/academics/calendar/calendarOptions";

interface UpcomingItem {
  id: string;
  date: string;
  name: string;
  kind: "holiday" | "event";
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
  const { data: holidays = [] } = useHolidays({ academic_year_id: academicYearId });

  const [addEventOpen, setAddEventOpen] = useState(false);

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const items: UpcomingItem[] = [
      ...holidays
        .filter((h) => !h.is_recurring && (h.start_date ?? "") >= today)
        .map((h) => ({
          id: h.id,
          date: h.start_date!,
          name: h.name,
          kind: "holiday" as const,
        })),
      ...events
        .filter((e) => e.event_date >= today)
        .map((e) => ({
          id: e.id,
          date: e.event_date,
          name: e.name,
          kind: "event" as const,
        })),
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [holidays, events]);

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
    { label: "Exam Days", value: summary?.exam_days, tone: "text-blue-600" },
    { label: "Events", value: summary?.event_count, tone: "text-amber-600" },
    { label: "Vacation Days", value: summary?.vacation_days, tone: "text-violet-600" },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/academics/calendar/setup?year=${academicYearId}`}>
                <Settings2 className="mr-1 h-4 w-4" />
                {calendar.status === "published" ? "Edit Setup" : "Resume Setup"}
              </Link>
            </Button>
            <Button onClick={() => setAddEventOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Event
            </Button>
          </div>
        )}
      </div>

      {calendar.status === "draft" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          This calendar is still a draft — finish the setup wizard and generate
          it so other modules can use it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.tone}`}>{s.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            {days.length > 0 && year ? (
              <CalendarMonthGrid
                days={days}
                yearStart={year.start_date}
                yearEnd={year.end_date}
              />
            ) : (
              <Skeleton className="h-80" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              upcoming.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.kind === "holiday" ? "bg-red-500" : "bg-amber-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDate(item.date)} ·{" "}
                      {item.kind === "holiday" ? "Holiday" : "Event"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {academicYearId && (
        <AddEventDialog
          open={addEventOpen}
          onOpenChange={setAddEventOpen}
          academicYearId={academicYearId}
        />
      )}
    </div>
  );
}
