"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  type TransportFeeCycle,
  type TransportRoute,
} from "@/services/transportService";
import { StopSearchSelect } from "@/components/transport/StopSearchSelect";
import type { Student } from "@/types/student";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = ["Student", "Route", "Bus", "Pickup stop", "Confirm"] as const;

const FEE_CYCLES: { value: TransportFeeCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half yearly" },
  { value: "yearly", label: "Yearly" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  routes: TransportRoute[];
  onDone: () => void;
};

export function EnrollmentWizardModal({ open, onOpenChange, students, routes, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [busId, setBusId] = useState("");
  const [pickupStopId, setPickupStopId] = useState<string | null>(null);
  const [dropStopId, setDropStopId] = useState<string | null>(null);
  const [monthlyFee, setMonthlyFee] = useState("");
  const [feeCycle, setFeeCycle] = useState<TransportFeeCycle>("monthly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [feePlans, setFeePlans] = useState<{ route_id: string; amount: number }[]>([]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );
  const academicYearId = selectedStudent?.academic_year_id;

  const selectedRoute = routes.find((r) => r.id === routeId);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setStudentId("");
      setRouteId("");
      setBusId("");
      setPickupStopId(null);
      setDropStopId(null);
      setMonthlyFee("");
      setFeeCycle("monthly");
      setStartDate(new Date().toISOString().slice(0, 10));
      return;
    }
    transportService.listFeePlans().then(setFeePlans).catch(() => setFeePlans([]));
  }, [open]);

  useEffect(() => {
    if (!routeId || !selectedRoute) return;
    const fp = feePlans.find((f) => f.route_id === routeId);
    if (fp) setMonthlyFee(String(fp.amount));
    else if (selectedRoute.default_fee != null) setMonthlyFee(String(selectedRoute.default_fee));
  }, [routeId, feePlans, selectedRoute]);

  useEffect(() => {
    if (!selectedRoute) return;
    setFeeCycle((selectedRoute.fee_cycle as TransportFeeCycle) ?? "monthly");
  }, [selectedRoute]);

  const stopsQ = useQuery({
    queryKey: ["transport", "route", routeId, "stops-enroll"],
    queryFn: () => transportService.listStops(routeId, false),
    enabled: !!routeId && open,
  });

  const busesQ = useQuery({
    queryKey: ["transport", "route", routeId, "buses-enroll", academicYearId],
    queryFn: () => transportService.busesForRoute(routeId, { academicYearId: academicYearId }),
    enabled: !!routeId && !!open,
  });

  const schedHintQ = useQuery({
    queryKey: ["transport", "schedules", "enroll-hint", routeId, busId, academicYearId],
    queryFn: () =>
      transportService.listSchedules({
        academicYearId: academicYearId!,
        routeId,
        busId,
        shiftType: "pickup",
        isActive: true,
      }),
    enabled: !!routeId && !!busId && !!academicYearId && open,
  });

  useEffect(() => {
    if (!routeId || !open) {
      setBusId("");
      setPickupStopId(null);
      setDropStopId(null);
    }
  }, [routeId, open]);

  const activeStops = useMemo(
    () => (stopsQ.data ?? []).filter((s) => s.is_active),
    [stopsQ.data]
  );
  const buses = busesQ.data ?? [];
  const selectedBus = buses.find((b) => b.id === busId);

  const canNext = () => {
    if (step === 0) return !!studentId && !!academicYearId;
    if (step === 1) return !!routeId;
    if (step === 2) return !!busId;
    if (step === 3) {
      if (activeStops.length > 0) return !!pickupStopId;
      return true;
    }
    return true;
  };

  const submit = async () => {
    setLoading(true);
    try {
      await transportService.enroll({
        student_id: studentId,
        route_id: routeId,
        bus_id: busId,
        academic_year_id: academicYearId,
        monthly_fee: parseFloat(monthlyFee),
        start_date: startDate,
        pickup_stop_id: pickupStopId ?? undefined,
        drop_stop_id: dropStopId ?? undefined,
        fee_cycle: feeCycle,
      });
      toast.success("Student assigned to transport");
      onDone();
      onOpenChange(false);
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>Assign student to transport</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 py-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.admission_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStudent && (
              <div className="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Class</span>
                  <span>{selectedStudent.class_name ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Academic year</span>
                  <span>{selectedStudent.academic_year ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Transport</span>
                  <span>
                    {selectedStudent.is_transport_opted ? "Opted in" : "Not opted in"}
                    {selectedStudent.transport?.bus
                      ? ` · ${String((selectedStudent.transport.bus as { bus_number?: string }).bus_number ?? "")}`
                      : ""}
                  </span>
                </div>
              </div>
            )}
            {studentId && !academicYearId && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Set an academic year on the student profile before enrolling.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Route</Label>
              <Select
                value={routeId}
                onValueChange={(v) => {
                  setRouteId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose route" />
                </SelectTrigger>
                <SelectContent>
                  {routes
                    .filter((r) => (r.status ?? "active") === "active")
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRoute && (
              <p className="text-sm text-muted-foreground">
                {selectedRoute.start_point ?? "—"} → {selectedRoute.end_point ?? "—"}
              </p>
            )}
            {routeId && (
              <p className="text-sm">
                Default fee (plan):{" "}
                <span className="font-medium tabular-nums">
                  {monthlyFee ? parseFloat(monthlyFee).toFixed(2) : "—"}
                </span>
                {selectedRoute?.default_fee != null && !monthlyFee && (
                  <span className="text-muted-foreground">
                    {" "}
                    (route default {Number(selectedRoute.default_fee).toFixed(2)})
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bus</Label>
              <Select value={busId} onValueChange={setBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((b) => {
                    const blocked =
                      b.occupancy_health === "full" ||
                      b.occupancy_health === "invalid" ||
                      b.status !== "active";
                    return (
                      <SelectItem key={b.id} value={b.id} disabled={blocked}>
                        {b.bus_number} — {b.occupancy_count ?? 0}/{b.capacity} (
                        {b.occupancy_percent ?? 0}%)
                        {blocked ? " (unavailable)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {busesQ.isLoading && <p className="text-sm text-muted-foreground">Loading buses…</p>}
            {selectedBus && (
              <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="tabular-nums">
                    {selectedBus.occupancy_count ?? 0}/{selectedBus.capacity} (
                    {selectedBus.occupancy_percent ?? 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver</span>
                  <span>
                    {(selectedBus.assigned_driver as { name?: string } | null)?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Helper</span>
                  <span>
                    {(selectedBus.assigned_helper as { name?: string } | null)?.name ?? "—"}
                  </span>
                </div>
              </div>
            )}
            {schedHintQ.data && schedHintQ.data.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">Pickup schedule (this bus and route)</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {schedHintQ.data.map((s) => (
                    <li key={s.id} className="tabular-nums">
                      {s.start_time}–{s.end_time} ({s.shift_type})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {busId && schedHintQ.isSuccess && (!schedHintQ.data || schedHintQ.data.length === 0) && (
              <p className="text-xs text-muted-foreground">
                No pickup schedule rows for this bus yet. Per-stop times on the route still apply when
                set.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            {stopsQ.isLoading && <p className="text-sm text-muted-foreground">Loading stops…</p>}
            {activeStops.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Pickup stop</Label>
                  <StopSearchSelect
                    routeId={routeId}
                    value={pickupStopId}
                    onChange={setPickupStopId}
                    placeholder="Select pickup stop…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Drop stop (optional)</Label>
                  <StopSearchSelect
                    routeId={routeId}
                    value={dropStopId}
                    onChange={setDropStopId}
                    excludeIds={pickupStopId ? [pickupStopId] : []}
                    placeholder="Select drop stop…"
                  />
                </div>
                {pickupStopId && (
                  <p className="text-xs text-muted-foreground">
                    Use stops that belong to this route. Times shown on the enrollment list come from
                    per-stop junction times or the bus schedule.
                  </p>
                )}
              </>
            ) : (
              !stopsQ.isLoading && (
                <p className="text-sm text-muted-foreground">
                  No stops configured for this route yet. Add stops on the route detail page first.
                </p>
              )
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-2 rounded-md border border-border p-3">
              <Row label="Student" value={selectedStudent?.name ?? "—"} />
              <Row label="Route" value={selectedRoute?.name ?? "—"} />
              <Row label="Bus" value={selectedBus?.bus_number ?? "—"} />
              <Row
                label="Pickup / drop"
                value={
                  [
                    activeStops.find((s) => s.id === pickupStopId)?.name,
                    dropStopId ? activeStops.find((s) => s.id === dropStopId)?.name : null,
                  ]
                    .filter(Boolean)
                    .join(" → ") || "—"
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ew_fee">Monthly fee amount</Label>
              <Input
                id="ew_fee"
                type="number"
                step="0.01"
                min="0"
                required
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee cycle</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={feeCycle}
                onChange={(e) => setFeeCycle(e.target.value as TransportFeeCycle)}
              >
                {FEE_CYCLES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Defaults from the route; you can override for this enrollment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ew_sd">Start date</Label>
              <Input
                id="ew_sd"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button type="button" disabled={loading || !monthlyFee} onClick={submit}>
                {loading ? "Saving…" : "Confirm & enroll"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
