"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { transportService } from "@/services/transportService";
import { CreateScheduleModal } from "@/components/transport/CreateScheduleModal";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function TransportSchedulesPage() {
  const qc = useQueryClient();
  const { data: academicYears = [], isLoading: ayLoading } = useAcademicYears(true);
  const [academicYearId, setAcademicYearId] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const schedulesQ = useQuery({
    queryKey: ["transport", "schedules", academicYearId],
    queryFn: () =>
      transportService.listSchedules({
        academicYearId,
        isActive: true,
      }),
    enabled: !!academicYearId,
  });

  const rows = useMemo(() => schedulesQ.data ?? [], [schedulesQ.data]);

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this schedule? Paired reverse runs are deactivated too.")) return;
    try {
      await transportService.deleteSchedule(id);
      toast.success("Schedule deactivated");
      qc.invalidateQueries({ queryKey: ["transport", "schedules"] });
      qc.invalidateQueries({ queryKey: ["transport", "routes"] });
      qc.invalidateQueries({ queryKey: ["transport", "schedule-exceptions"] });
      qc.invalidateQueries({ queryKey: ["transport", "bus"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground max-w-xl">
            Recurring daily time windows for routes (per academic year). Driver and bus overlaps are
            blocked.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={!academicYearId}
          >
            <Plus className="mr-2 size-4" />
            Add schedule
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/transport/schedules/exceptions">Schedule exceptions</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Academic year</label>
        {ayLoading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
          >
            <option value="">Select year…</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {schedulesQ.error && (
        <p className="text-sm text-destructive">{(schedulesQ.error as Error).message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active schedules</CardTitle>
          <CardDescription>
            Pickup and drop shifts for each route; reverse pairs share the same bus and driver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Route</th>
                  <th className="px-3 py-3 font-medium">Bus</th>
                  <th className="px-3 py-3 font-medium">Driver</th>
                  <th className="px-3 py-3 font-medium">Shift</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Pair</th>
                  <th className="px-3 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {schedulesQ.isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-3 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!schedulesQ.isLoading &&
                  rows.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-3 font-medium">{s.route?.name ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums">{s.bus?.bus_number ?? "—"}</td>
                      <td className="px-3 py-3">{s.driver?.name ?? "—"}</td>
                      <td className="px-3 py-3 capitalize">{s.shift_type}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {s.start_time}–{s.end_time}
                      </td>
                      <td className="px-3 py-3">
                        {s.reverse_of_schedule_id ? (
                          <Badge variant="secondary">Reverse leg</Badge>
                        ) : s.is_reverse_enabled ? (
                          <Badge variant="outline">+ reverse</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void deactivate(s.id)}
                        >
                          Deactivate
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!schedulesQ.isLoading && !academicYearId && (
              <p className="px-3 py-10 text-center text-muted-foreground">
                Choose an academic year to load schedules.
              </p>
            )}
            {!schedulesQ.isLoading && academicYearId && rows.length === 0 && (
              <p className="px-3 py-10 text-center text-muted-foreground">
                No schedules for this year yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateScheduleModal
        open={addOpen}
        onOpenChange={setAddOpen}
        academicYearId={academicYearId}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["transport", "schedules"] });
          qc.invalidateQueries({ queryKey: ["transport", "routes"] });
          qc.invalidateQueries({ queryKey: ["transport", "workload"] });
          qc.invalidateQueries({ queryKey: ["transport", "bus"] });
        }}
      />
    </div>
  );
}
