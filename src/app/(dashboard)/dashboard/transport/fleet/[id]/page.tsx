"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { transportService, type TransportBusAssignment } from "@/services/transportService";
import { ScheduleTimeline } from "@/components/transport/ScheduleTimeline";
import { OccupancyHealthBadge, StatusBadge } from "@/components/transport/transport-badges";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { ConfirmDialog } from "@/components/transport/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

export default function BusDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYears(true);
  const [timelineAcademicYearId, setTimelineAcademicYearId] = useState("");
  const [timelineDate, setTimelineDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [removeEnr, setRemoveEnr] = useState<{
    enrollmentId: string;
    label: string;
  } | null>(null);
  const [moveRow, setMoveRow] = useState<{
    enrollmentId: string;
    studentName: string;
    routeId: string;
  } | null>(null);
  const [targetBusId, setTargetBusId] = useState("");

  useEffect(() => {
    if (!timelineAcademicYearId && academicYears.length > 0) {
      setTimelineAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, timelineAcademicYearId]);

  const detailQ = useQuery({
    queryKey: ["transport", "bus", id, "details", timelineAcademicYearId, timelineDate],
    queryFn: () =>
      transportService.getBusDetails(id!, {
        academicYearId: timelineAcademicYearId,
        date: timelineDate,
      }),
    enabled: !!id && !!timelineAcademicYearId,
  });

  const assignmentsQ = useQuery({
    queryKey: ["transport", "assignments"],
    queryFn: () => transportService.listAssignments(),
    enabled: !!id,
  });

  const routeId = detailQ.data?.route?.id;
  const stopsQ = useQuery({
    queryKey: ["transport", "route", routeId, "stops"],
    queryFn: () => transportService.listStops(routeId!, false),
    enabled: !!routeId,
  });

  const moveBusesQ = useQuery({
    queryKey: ["transport", "route", moveRow?.routeId, "buses"],
    queryFn: () =>
      transportService.busesForRoute(moveRow!.routeId, {
        academicYearId: undefined,
      }),
    enabled: !!moveRow?.routeId,
  });

  const activeAssignment = useMemo(() => {
    if (!id || !assignmentsQ.data) return null;
    const list = assignmentsQ.data as TransportBusAssignment[];
    const forBus = list.filter((a) => a.bus_id === id && a.status === "active");
    return forBus[0] ?? null;
  }, [assignmentsQ.data, id]);

  const data = detailQ.data;

  const exportCsv = async () => {
    if (!id || !data) return;
    try {
      await transportService.exportBusStudents(id);
      toast.success("Export started");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const removeStudent = async () => {
    if (!removeEnr) return;
    await transportService.deactivateEnrollment(removeEnr.enrollmentId);
    toast.success("Student removed from this bus");
    queryClient.invalidateQueries({ queryKey: ["transport", "bus", id, "details"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "buses"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "dashboard"] });
  };

  const confirmMove = async () => {
    if (!moveRow || !targetBusId) return;
    await transportService.updateEnrollment(moveRow.enrollmentId, { bus_id: targetBusId });
    toast.success("Student moved to another bus");
    setMoveRow(null);
    setTargetBusId("");
    queryClient.invalidateQueries({ queryKey: ["transport", "bus", id, "details"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "buses"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "dashboard"] });
  };

  useEffect(() => {
    if (moveRow && moveBusesQ.data?.length) {
      const first = moveBusesQ.data.find((b) => b.id !== id);
      setTargetBusId(first?.id ?? moveBusesQ.data[0].id);
    }
  }, [moveRow, moveBusesQ.data, id]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/transport/fleet" aria-label="Back to fleet">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detailQ.isLoading || academicYearsLoading ? (
              <Skeleton className="inline-block h-8 w-40" />
            ) : (
              <>Bus {data?.bus.bus_number ?? "—"}</>
            )}
          </h1>
          <p className="text-muted-foreground">Details, crew, students, and stops.</p>
        </div>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={!data}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      {detailQ.error && (
        <p className="text-sm text-destructive">{(detailQ.error as Error).message}</p>
      )}

      {data &&
        data.bus.status === "active" &&
        data.transport_operational &&
        data.transport_operational.code !== "ok" && (
          <div
            role="status"
            className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-550 dark:text-amber-500"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="font-medium">
                {data.transport_operational.code === "no_active_schedules"
                  ? "No active pickup schedule for this bus"
                  : "This bus has no active route assigned"}
              </p>
              <p className="text-amber-550 dark:text-amber-500">
                {data.transport_operational.message ??
                  "Resolve the route assignment or reactivate schedules before relying on this bus for future runs."}
              </p>
            </div>
          </div>
        )}

      {(academicYearsLoading || detailQ.isLoading) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card id="info">
              <CardHeader>
                <CardTitle className="text-base">Bus info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Bus number</span>
                  <span className="font-medium">{data.bus.bus_number}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span>{data.bus.vehicle_number ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="tabular-nums">{data.capacity}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={data.bus.status} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment</CardTitle>
                <CardDescription>Route and crew currently effective.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Route</span>
                  <span className="text-right font-medium">{data.route?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Driver</span>
                  <span className="text-right">{data.driver?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Helper</span>
                  <span className="text-right">{data.helper?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <span className="text-muted-foreground">Effective</span>
                  <span className="text-right tabular-nums">
                    {activeAssignment?.effective_from
                      ? activeAssignment.effective_from
                      : "—"}{" "}
                    → {activeAssignment?.effective_to ?? "open"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card id="schedule-timeline">
            <CardHeader>
              <CardTitle className="text-base">Schedule for the day</CardTitle>
              <CardDescription>
                Recurring schedules for this bus, minus cancellation exceptions for this date, plus
                override exceptions. Regular runs are hidden on school holidays; overrides still show.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bus-tl-date">
                    Date
                  </label>
                  <Input
                    id="bus-tl-date"
                    type="date"
                    className="w-[11rem]"
                    value={timelineDate}
                    onChange={(e) => setTimelineDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bus-tl-ay">
                    Academic year
                  </label>
                  <select
                    id="bus-tl-ay"
                    className="flex h-9 min-w-[12rem] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={timelineAcademicYearId}
                    onChange={(e) => setTimelineAcademicYearId(e.target.value)}
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {data.is_timeline_holiday ? (
                <p className="text-sm text-muted-foreground">
                  This date is marked as a school holiday — recurring runs are hidden; any exception
                  overrides for this bus still appear below.
                </p>
              ) : null}
              <ScheduleTimeline
                blocks={data.schedule_timeline ?? []}
                emptyLabel={
                  data.is_timeline_holiday
                    ? "No runs on this date (holiday with no exception overrides for this bus)."
                    : "No schedules assigned to this bus for this academic year."
                }
              />
            </CardContent>
          </Card>

          <Card id="occupancy">
            <CardHeader>
              <CardTitle className="text-base">Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {data.occupancy} / {data.capacity}{" "}
                    <span className="text-muted-foreground">({data.occupancy_percent}%)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Students assigned to this bus</p>
                </div>
                <OccupancyHealthBadge health={data.occupancy_health} />
              </div>
              <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    data.occupancy_health === "full" || data.occupancy_health === "high"
                      ? "h-full rounded-full bg-amber-500"
                      : "h-full rounded-full bg-emerald-500"
                  }
                  style={{ width: `${Math.min(100, data.occupancy_percent)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card id="students">
            <CardHeader>
              <CardTitle className="text-base">Students on this bus</CardTitle>
              <CardDescription>Active transport seats for the current year.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Admission</th>
                      <th className="px-3 py-2 font-medium">Pickup / drop</th>
                      <th className="px-3 py-2 font-medium w-40" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s) => (
                      <tr key={s.enrollment_id} className="border-b border-border/60">
                        <td className="px-3 py-2">{s.student_name ?? s.student_id}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {s.admission_number ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {[s.pickup_point, s.drop_point].filter(Boolean).join(" → ") || "—"}
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setMoveRow({
                                enrollmentId: s.enrollment_id,
                                studentName: s.student_name ?? s.student_id,
                                routeId: data.route?.id ?? "",
                              })
                            }
                            disabled={!data.route?.id}
                          >
                            Move
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() =>
                              setRemoveEnr({
                                enrollmentId: s.enrollment_id,
                                label: s.student_name ?? s.student_id,
                              })
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.students.length === 0 && (
                  <p className="px-3 py-8 text-center text-muted-foreground">
                    No students assigned yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stops covered</CardTitle>
              <CardDescription>From the assigned route (pickup / drop order).</CardDescription>
            </CardHeader>
            <CardContent>
              {stopsQ.isLoading && <Skeleton className="h-24" />}
              {!stopsQ.isLoading && (stopsQ.data?.length ?? 0) > 0 && (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {stopsQ.data
                    ?.slice()
                    .sort((a, b) => a.sequence_order - b.sequence_order)
                    .map((st) => (
                      <li key={st.id}>
                        <span className="font-medium">{st.name}</span>
                        {st.pickup_time || st.drop_time ? (
                          <span className="text-muted-foreground">
                            {" "}
                            ({[st.pickup_time, st.drop_time].filter(Boolean).join(" · ")})
                          </span>
                        ) : null}
                      </li>
                    ))}
                </ol>
              )}
              {!stopsQ.isLoading && !routeId && (
                <p className="text-sm text-muted-foreground">Assign a route to this bus to see stops.</p>
              )}
              {!stopsQ.isLoading && routeId && (stopsQ.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No stops defined for this route yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!removeEnr}
        onOpenChange={(o) => !o && setRemoveEnr(null)}
        title="Remove student from transport?"
        description={`This ends the transport seat for ${removeEnr?.label ?? "this student"}.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={removeStudent}
      />

      <Dialog open={!!moveRow} onOpenChange={(o) => !o && setMoveRow(null)}>
        <DialogContent onClose={() => setMoveRow(null)}>
          <DialogHeader>
            <DialogTitle>Move to another bus</DialogTitle>
            <DialogDescription>
              Choose a bus on the same route ({moveRow?.studentName}). Capacity rules still apply.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Target bus</Label>
            <Select value={targetBusId} onValueChange={setTargetBusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                {(moveBusesQ.data ?? [])
                  .filter((b) => b.id !== id)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bus_number} — {b.occupancy_count ?? 0}/{b.capacity} seats (
                      {b.occupancy_percent ?? 0}%)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {(moveBusesQ.data ?? []).filter((b) => b.id !== id).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No other buses on this route. Assign another bus to this route from Fleet first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmMove}
              disabled={
                !targetBusId ||
                (moveBusesQ.data ?? []).filter((b) => b.id !== id).length === 0
              }
            >
              Move student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
