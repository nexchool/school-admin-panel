"use client";

import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateCalendar } from "@/hooks/useAcademicCalendar";
import { toastError } from "@/lib/errorToast";
import type { AcademicCalendar, WeeklyHolidaysConfig } from "@/services/academicCalendarService";

import { WEEKDAY_OPTIONS } from "../calendarOptions";

interface StepWeeklyHolidaysProps {
  calendar: AcademicCalendar;
}

/** Step 2 — weekly holidays. Every toggle saves immediately; the server keeps
 * recurring weekly-off holiday rows in sync with the selected days. */
export function StepWeeklyHolidays({ calendar }: StepWeeklyHolidaysProps) {
  const updateCalendar = useUpdateCalendar();
  const config = calendar.weekly_holidays_config;

  const save = (next: WeeklyHolidaysConfig) => {
    updateCalendar.mutate(
      { id: calendar.id, data: { weekly_holidays_config: next } },
      { onError: (err) => toastError(err, "Could not save weekly holidays") },
    );
  };

  const toggleDay = (day: number) => {
    const days = config.days.includes(day)
      ? config.days.filter((d) => d !== day)
      : [...config.days, day];
    save({ ...config, days });
  };

  const toggleSaturdayOption = (key: "second_saturday" | "fourth_saturday") => {
    if (!config[key] && config.days.includes(5)) {
      toast.info("Saturday is already a full weekly holiday.");
      return;
    }
    save({ ...config, [key]: !config[key] });
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Set Weekly Holidays</CardTitle>
        <CardDescription>Select the days that are weekly holidays.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Weekly Holidays</p>
          <div className="space-y-2 rounded-md border border-border p-3">
            {WEEKDAY_OPTIONS.map((d) => (
              <label key={d.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={config.days.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                  disabled={updateCalendar.isPending}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Additional Options</p>
          <div className="space-y-2 rounded-md border border-border p-3">
            {(
              [
                { key: "second_saturday", label: "Second Saturday" },
                { key: "fourth_saturday", label: "Fourth Saturday" },
              ] as const
            ).map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center justify-between text-sm">
                <span>{opt.label}</span>
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={config[opt.key]}
                  onChange={() => toggleSaturdayOption(opt.key)}
                  disabled={updateCalendar.isPending || config.days.includes(5)}
                />
              </label>
            ))}
          </div>
          {config.days.includes(5) && (
            <p className="text-xs text-muted-foreground">
              Saturday is selected as a full weekly holiday, so the second/fourth
              Saturday options are not needed.
            </p>
          )}
        </div>

        <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
          All selected days will be marked as holidays every week.
        </p>
      </CardContent>
    </Card>
  );
}
