"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  transportService,
  type TransportBus,
  type TransportEnrollment,
  type TransportFeeCycle,
  type TransportRoute,
} from "@/services/transportService";
import { studentsService } from "@/services/studentsService";
import type { Student } from "@/types/student";
import { EnrollmentWizardModal } from "@/components/transport/modals/EnrollmentWizardModal";
import { StatusBadge } from "@/components/transport/transport-badges";
import { ConfirmDialog } from "@/components/transport/ConfirmDialog";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const FEE_CYCLE_OPTIONS: { value: TransportFeeCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half yearly" },
  { value: "yearly", label: "Yearly" },
];

function feeCycleLabel(c: TransportFeeCycle | null | undefined): string {
  if (!c) return "—";
  return FEE_CYCLE_OPTIONS.find((o) => o.value === c)?.label ?? c.replace(/_/g, " ");
}

function TransportHealthBadge({ enrollment }: { enrollment: TransportEnrollment }) {
  if (enrollment.status !== "active") {
    return <span className="text-muted-foreground">—</span>;
  }
  const s = enrollment.transport_status;
  if (!s || s === "active") {
    return <Badge variant="outline" className="font-normal">OK</Badge>;
  }
  if (s === "route_inactive") {
    return (
      <Badge variant="secondary" className="border-amber-500/50 font-normal text-amber-900 dark:text-amber-100" title="Route is inactive — enrollment unchanged">
        Route inactive
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="border-amber-500/50 font-normal text-amber-900 dark:text-amber-100" title="No active pickup schedule for this bus and route">
      No schedule
    </Badge>
  );
}

export default function TransportStudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransportEnrollment | null>(null);
  const [moveRow, setMoveRow] = useState<TransportEnrollment | null>(null);
  const [deactivateRow, setDeactivateRow] = useState<TransportEnrollment | null>(null);
  const [targetBusId, setTargetBusId] = useState("");
  const [editForm, setEditForm] = useState({
    monthly_fee: "",
    start_date: "",
    pickup_stop_id: "",
    drop_stop_id: "",
    fee_cycle: "monthly" as TransportFeeCycle,
  });

  const enrollQ = useQuery({
    queryKey: ["transport", "enrollments"],
    queryFn: () => transportService.listEnrollments(),
  });

  const studentsQ = useQuery({
    queryKey: ["students", "all"],
    queryFn: () => studentsService.getStudents(),
  });

  const routesQ = useQuery({
    queryKey: ["transport", "routes"],
    queryFn: () => transportService.listRoutes(),
  });

  const moveBusesQ = useQuery({
    queryKey: ["transport", "route", moveRow?.route_id, "buses-move"],
    queryFn: () =>
      transportService.busesForRoute(moveRow!.route_id, {
        academicYearId: moveRow?.academic_year_id ?? undefined,
      }),
    enabled: !!moveRow?.route_id,
  });

  const editStopsQ = useQuery({
    queryKey: ["transport", "route", editRow?.route_id, "stops-edit"],
    queryFn: () => transportService.listStops(editRow!.route_id, false),
    enabled: !!editRow?.route_id,
  });

  const studentById = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of studentsQ.data ?? []) m.set(s.id, s);
    return m;
  }, [studentsQ.data]);

  const rows = enrollQ.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.student_name ?? "").toLowerCase();
      const adm = (r.admission_number ?? "").toLowerCase();
      const cls = (studentById.get(r.student_id)?.class_name ?? "").toLowerCase();
      return name.includes(q) || adm.includes(q) || cls.includes(q);
    });
  }, [rows, search, studentById]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transport", "enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "buses"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "dashboard"] });
  };

  const openEdit = (r: TransportEnrollment) => {
    setEditRow(r);
    const routeDefault = routesQ.data?.find((rt) => rt.id === r.route_id)?.fee_cycle;
    setEditForm({
      monthly_fee: String(r.monthly_fee),
      start_date: r.start_date?.slice(0, 10) ?? "",
      pickup_stop_id: r.pickup_stop_id ?? "",
      drop_stop_id: r.drop_stop_id ?? "",
      fee_cycle: (r.fee_cycle ?? routeDefault ?? "monthly") as TransportFeeCycle,
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    await transportService.updateEnrollment(editRow.id, {
      monthly_fee: parseFloat(editForm.monthly_fee),
      start_date: editForm.start_date,
      pickup_stop_id: editForm.pickup_stop_id || null,
      drop_stop_id: editForm.drop_stop_id || null,
      fee_cycle: editForm.fee_cycle,
    });
    toast.success("Enrollment updated");
    setEditRow(null);
    invalidate();
  };

  const confirmMove = async () => {
    if (!moveRow || !targetBusId) return;
    await transportService.updateEnrollment(moveRow.id, { bus_id: targetBusId });
    toast.success("Student moved to another bus");
    setMoveRow(null);
    setTargetBusId("");
    invalidate();
  };

  const doDeactivate = async () => {
    if (!deactivateRow) return;
    await transportService.deactivateEnrollment(deactivateRow.id);
    toast.success("Transport enrollment deactivated");
    invalidate();
  };

  const driverForBus = (b?: TransportBus | null) =>
    (b?.assigned_driver as { name?: string } | null)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students on transport</h1>
          <p className="text-muted-foreground">
            Who rides which bus, from which stop — without using a separate “assignments” screen.
          </p>
        </div>
        <Button type="button" onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 size-4" />
          Assign student to transport
        </Button>
      </div>

      {enrollQ.error && (
        <p className="text-sm text-destructive">{(enrollQ.error as Error).message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrollments</CardTitle>
          <CardDescription>Search by name, admission no., or class.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Admission</th>
                  <th className="px-3 py-3 font-medium">Class</th>
                  <th className="px-3 py-3 font-medium">Route</th>
                  <th className="px-3 py-3 font-medium">Bus</th>
                  <th className="px-3 py-3 font-medium">Pickup stop</th>
                  <th className="px-3 py-3 font-medium">Pickup time</th>
                  <th className="px-3 py-3 font-medium">Fee</th>
                  <th className="px-3 py-3 font-medium">Fee cycle</th>
                  <th className="px-3 py-3 font-medium">Driver</th>
                  <th className="px-3 py-3 font-medium">Guardian phone</th>
                  <th className="px-3 py-3 font-medium">Transport health</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {enrollQ.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={14} className="px-3 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!enrollQ.isLoading &&
                  filtered.map((r) => {
                    const st = studentById.get(r.student_id);
                    const pickup =
                      r.pickup_stop?.name ??
                      r.pickup_point ??
                      "—";
                    const needsAttention =
                      r.status === "active" &&
                      r.transport_status &&
                      r.transport_status !== "active";
                    return (
                      <tr
                        key={r.id}
                        className={
                          needsAttention
                            ? "border-b border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                            : "border-b border-border/60 hover:bg-muted/30"
                        }
                      >
                        <td className="px-3 py-3 font-medium">{r.student_name ?? r.student_id}</td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {r.admission_number ?? st?.admission_number ?? "—"}
                        </td>
                        <td className="px-3 py-3">{st?.class_name ?? "—"}</td>
                        <td className="px-3 py-3">{r.route?.name ?? "—"}</td>
                        <td className="px-3 py-3">{r.bus?.bus_number ?? "—"}</td>
                        <td className="px-3 py-3 text-muted-foreground">{pickup}</td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {r.transport_hints?.pickup_time_display ?? "—"}
                        </td>
                        <td className="px-3 py-3 tabular-nums">{r.monthly_fee}</td>
                        <td className="px-3 py-3 text-muted-foreground">{feeCycleLabel(r.fee_cycle)}</td>
                        <td className="px-3 py-3">{driverForBus(r.bus ?? null)}</td>
                        <td className="px-3 py-3 tabular-nums">{st?.guardian_phone ?? "—"}</td>
                        <td className="px-3 py-3">
                          <TransportHealthBadge enrollment={r} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={r.status !== "active"}
                                onClick={() => {
                                  setMoveRow(r);
                                  setTargetBusId("");
                                }}
                              >
                                Move bus
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={r.status !== "active"}
                                onClick={() => setDeactivateRow(r)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/students/${r.student_id}`}>View student</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!enrollQ.isLoading && filtered.length === 0 && (
              <p className="px-3 py-10 text-center text-muted-foreground">
                {rows.length === 0
                  ? "No students assigned yet. Use Assign student to transport."
                  : "No matching enrollments."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <EnrollmentWizardModal
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        students={studentsQ.data ?? []}
        routes={routesQ.data ?? []}
        onDone={invalidate}
      />

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent onClose={() => setEditRow(null)}>
          <DialogHeader>
            <DialogTitle>Edit transport</DialogTitle>
            <DialogDescription>Update fee, billing cycle, dates, and optional stops.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {editRow?.transport_hints?.pickup_time_display && (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pickup time (hint): </span>
                {editRow.transport_hints.pickup_time_display}
                {editRow.transport_hints.schedule_pickup_windows?.length ? (
                  <span className="block pt-1">
                    Schedule windows:{" "}
                    {editRow.transport_hints.schedule_pickup_windows
                      .map((w) => `${w.start_time}–${w.end_time}`)
                      .join(", ")}
                  </span>
                ) : null}
              </p>
            )}
            <div className="space-y-2">
              <Label>Monthly fee</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.monthly_fee}
                onChange={(e) => setEditForm((f) => ({ ...f, monthly_fee: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee cycle</Label>
              <Select
                value={editForm.fee_cycle}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, fee_cycle: v as TransportFeeCycle }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_CYCLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editStopsQ.data && editStopsQ.data.filter((s) => s.is_active).length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Pickup stop</Label>
                  <Select
                    value={editForm.pickup_stop_id || "_none"}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, pickup_stop_id: v === "_none" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {editStopsQ.data
                        .filter((s) => s.is_active)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.sequence_order}. {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Drop stop</Label>
                  <Select
                    value={editForm.drop_stop_id || "_none"}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, drop_stop_id: v === "_none" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {editStopsQ.data
                        .filter((s) => s.is_active)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.sequence_order}. {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveRow} onOpenChange={(o) => !o && setMoveRow(null)}>
        <DialogContent onClose={() => setMoveRow(null)}>
          <DialogHeader>
            <DialogTitle>Move bus</DialogTitle>
            <DialogDescription>
              Same route, different bus. {moveRow?.student_name ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Bus</Label>
            <Select
              value={targetBusId}
              onValueChange={setTargetBusId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                {(moveBusesQ.data ?? [])
                  .filter((b) => b.id !== moveRow?.bus_id)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bus_number} — {b.occupancy_count ?? 0}/{b.capacity}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveRow(null)}>
              Cancel
            </Button>
            <Button onClick={confirmMove} disabled={!targetBusId}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateRow}
        onOpenChange={(o) => !o && setDeactivateRow(null)}
        title="Deactivate transport for this student?"
        description="They will lose their seat; you can assign again later."
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={doDeactivate}
      />
    </div>
  );
}
