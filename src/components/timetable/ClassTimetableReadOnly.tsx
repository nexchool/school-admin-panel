"use client";

import { useMemo } from "react";
import { useTimetableVersions, useTimetableBundle } from "@/hooks/useTimetable";
import { TimetableGrid } from "./TimetableGrid";
import { Loader2, CalendarX } from "lucide-react";
import type { BellSchedulePeriod, TimetableEntry } from "@/types/timetable";

function derivePeriodsFromEntries(entries: TimetableEntry[]): BellSchedulePeriod[] {
  const nums = [...new Set(entries.map((e) => e.period_number))].sort((a, b) => a - b);
  return nums.map((n) => ({
    id: `derived-${n}`,
    bell_schedule_id: "",
    period_number: n,
    period_kind: "lesson",
    starts_at: null,
    ends_at: null,
    label: `P${n}`,
    sort_order: n,
  }));
}

export function ClassTimetableReadOnly({ classId }: { classId: string }) {
  const { data: versions, isLoading: versionsLoading } = useTimetableVersions(classId);
  const activeVersion = useMemo(() => versions?.find((v) => v.status === "active"), [versions]);

  const { data: bundle, isLoading: bundleLoading } = useTimetableBundle(
    classId,
    activeVersion?.id ?? null
  );

  const lessonPeriods = useMemo(() => {
    if (bundle?.bell_schedule?.lesson_periods?.length)
      return bundle.bell_schedule.lesson_periods;
    if (bundle?.items?.length) return derivePeriodsFromEntries(bundle.items);
    return [];
  }, [bundle]);

  const workingDays = useMemo(
    () => (bundle?.working_days?.length ? bundle.working_days : [1, 2, 3, 4, 5, 6]),
    [bundle]
  );

  if (versionsLoading || bundleLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeVersion || !bundle?.items?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
        <CalendarX className="size-8 opacity-40" />
        <p className="text-sm">No active timetable published yet.</p>
      </div>
    );
  }

  return (
    <div>
      {bundle.bell_schedule?.name && (
        <p className="mb-3 text-xs text-muted-foreground">
          Bell schedule: {bundle.bell_schedule.name}
        </p>
      )}
      <TimetableGrid
        entries={bundle.items}
        periods={lessonPeriods}
        workingDays={workingDays}
        readOnly
      />
    </div>
  );
}
