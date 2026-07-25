"use client";

import {
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarRange,
  FileText,
  Flag,
  PartyPopper,
  Sun,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarSummary } from "@/hooks/useAcademicCalendar";
import type { AcademicCalendar } from "@/services/academicCalendarService";

import { WEEKDAY_OPTIONS } from "../calendarOptions";

interface StepReviewProps {
  calendar: AcademicCalendar;
}

/** Step 8 — review summary before generating the calendar. */
export function StepReview({ calendar }: StepReviewProps) {
  const { data: summary, isLoading } = useCalendarSummary(calendar.id);

  if (isLoading || !summary) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Review Academic Calendar Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const cfg = summary.weekly_holidays_config;
  const weeklyLabels = [
    ...WEEKDAY_OPTIONS.filter((d) => cfg.days.includes(d.value)).map((d) => d.label),
    ...(cfg.second_saturday ? ["2nd Saturday"] : []),
    ...(cfg.fourth_saturday ? ["4th Saturday"] : []),
  ];

  const items = [
    {
      icon: Calendar,
      label: "Academic Year",
      value: summary.academic_year.name,
      detail: `${summary.academic_year.start_date} → ${summary.academic_year.end_date}`,
    },
    {
      icon: Sun,
      label: "Weekly Holidays",
      value: weeklyLabels.length ? weeklyLabels.join(", ") : "None",
      detail: `${summary.weekly_holiday_days} days`,
    },
    {
      icon: Flag,
      label: "Public Holidays",
      value: `${summary.public_holiday_days} days`,
    },
    {
      icon: CalendarRange,
      label: "Vacations",
      value: `${summary.vacation_days} days`,
    },
    {
      icon: BookOpen,
      label: "Semesters",
      value: `${summary.semester_count}`,
    },
    {
      icon: FileText,
      label: "Exam Windows",
      value: `${summary.exam_window_count}`,
      detail: `${summary.exam_days} exam days`,
    },
    {
      icon: PartyPopper,
      label: "School Events",
      value: `${summary.event_count}`,
    },
    {
      icon: CalendarCheck,
      label: "Total Working Days (Approx.)",
      value: `${summary.working_days} days`,
      detail: `of ${summary.total_days} total days`,
      highlight: true,
    },
  ];

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Review Academic Calendar Summary</CardTitle>
        <CardDescription>
          Please review all details before generating the calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.label}
              className={
                item.highlight
                  ? "rounded-md border border-primary/30 bg-primary/5 p-3"
                  : "rounded-md border border-border p-3"
              }
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              <p className="mt-1 text-sm font-semibold">{item.value}</p>
              {item.detail && (
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              )}
            </div>
          ))}
        </div>
        <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
          Once generated, the calendar will be used by all modules.
        </p>
      </CardContent>
    </Card>
  );
}
