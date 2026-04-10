"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { transportService } from "@/services/transportService";
import { ScheduleTimeline } from "@/components/transport/ScheduleTimeline";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { ArrowLeft } from "lucide-react";

function localTodayIso() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TransportStaffWorkloadPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { data: academicYears = [], isLoading: ayLoading } = useAcademicYears(true);
  const [academicYearId, setAcademicYearId] = useState("");
  const [day, setDay] = useState(localTodayIso);

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const workloadQ = useQuery({
    queryKey: ["transport", "staff", id, "workload", day, academicYearId],
    queryFn: () =>
      transportService.getDriverWorkload(id!, { date: day, academicYearId }),
    enabled: !!id && !!academicYearId,
  });

  const data = workloadQ.data;
  const staff = data?.staff;

  const title = useMemo(() => staff?.name ?? "Staff workload", [staff?.name]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/transport/staff" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {workloadQ.isLoading ? <Skeleton className="h-8 w-56" /> : title}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Recurring schedules minus cancellations for this date, plus override exceptions. Holidays
            hide regular runs; overrides still appear.
          </p>
        </div>
      </div>

      {workloadQ.error && (
        <p className="text-sm text-destructive">{(workloadQ.error as Error).message}</p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Academic year</label>
          {ayLoading ? (
            <Skeleton className="h-9 w-56" />
          ) : (
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              <option value="">Select…</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </div>
      </div>

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>
                {data.workload.date}
                {data.workload.is_holiday ? (
                  <Badge variant="secondary" className="ml-2">
                    Holiday (regular runs off)
                  </Badge>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Routes</span>
                <span className="tabular-nums font-medium">
                  {data.workload.assigned_routes_today}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Duty time</span>
                <span className="tabular-nums font-medium">{data.workload.total_duty_display}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Upcoming duties</span>
                <span className="tabular-nums font-medium">
                  {data.workload.upcoming_duty_count ?? "—"}
                </span>
              </div>
              {data.workload.is_idle === true && !data.workload.is_holiday ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-750 dark:text-amber-500">
                  No active route schedules for this date — driver is idle for future windows on
                  active routes only.
                </p>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize">{staff?.role ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{staff?.status ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buses in use</CardTitle>
              <CardDescription>From schedules on this date.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.buses_assigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">None for this day.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.buses_assigned.map((b) => (
                    <li key={b.id} className="flex justify-between gap-2">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/dashboard/transport/fleet/${b.id}`}
                      >
                        {b.bus_number}
                      </Link>
                      <span className="text-muted-foreground tabular-nums">cap. {b.capacity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>
              Chronological order for the selected day. Rows marked Exception are from schedule
              overrides.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.workload.is_holiday && data.schedules_today.length > 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Calendar holiday: only exception overrides are listed (no regular recurring runs).
              </p>
            ) : null}
            <ScheduleTimeline blocks={data.schedules_today} />
          </CardContent>
        </Card>
      )}

      {!workloadQ.isLoading && !data && academicYearId && (
        <p className="text-sm text-muted-foreground">Could not load workload.</p>
      )}
    </div>
  );
}
