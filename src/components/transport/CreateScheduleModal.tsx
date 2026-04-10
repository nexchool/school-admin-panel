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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  transportService,
  type ScheduleConflictResult,
} from "@/services/transportService";
import { ScheduleConflictBanner } from "@/components/transport/ScheduleConflictBanner";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  onCreated: () => void;
};

export function CreateScheduleModal({ open, onOpenChange, academicYearId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<ScheduleConflictResult | null>(null);
  const [form, setForm] = useState({
    route_id: "",
    bus_id: "",
    driver_id: "",
    helper_id: "",
    shift_type: "pickup" as "pickup" | "drop",
    start_time: "",
    end_time: "",
    pair_reverse: false,
    reverse_start_time: "",
    reverse_end_time: "",
  });

  const routesQ = useQuery({
    queryKey: ["transport", "routes"],
    queryFn: () => transportService.listRoutes(),
    enabled: open,
  });
  const busesQ = useQuery({
    queryKey: ["transport", "buses"],
    queryFn: () => transportService.listBuses(),
    enabled: open,
  });
  const driversQ = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => transportService.listDrivers(),
    enabled: open,
  });
  const helpersQ = useQuery({
    queryKey: ["transport", "staff", "helpers"],
    queryFn: () => transportService.listStaff(),
    enabled: open,
  });

  const selectedRoute = useMemo(
    () => routesQ.data?.find((r) => r.id === form.route_id),
    [routesQ.data, form.route_id]
  );

  useEffect(() => {
    if (!open) {
      setConflict(null);
      setForm({
        route_id: "",
        bus_id: "",
        driver_id: "",
        helper_id: "",
        shift_type: "pickup",
        start_time: "",
        end_time: "",
        pair_reverse: false,
        reverse_start_time: "",
        reverse_end_time: "",
      });
    }
  }, [open]);

  useEffect(() => {
    setConflict(null);
  }, [
    form.route_id,
    form.bus_id,
    form.driver_id,
    form.shift_type,
    form.start_time,
    form.end_time,
    form.pair_reverse,
    form.reverse_start_time,
    form.reverse_end_time,
  ]);

  const runConflictCheck = async (): Promise<ScheduleConflictResult | null> => {
    if (
      !form.route_id ||
      !form.bus_id ||
      !form.driver_id ||
      !form.start_time ||
      !form.end_time ||
      !academicYearId
    ) {
      return null;
    }
    const body = {
      route_id: form.route_id,
      bus_id: form.bus_id,
      driver_id: form.driver_id,
      helper_id: form.helper_id.trim() || undefined,
      shift_type: form.shift_type,
      start_time: form.start_time.trim(),
      end_time: form.end_time.trim(),
      academic_year_id: academicYearId,
      is_reverse_enabled: form.pair_reverse && !!selectedRoute?.is_reverse_enabled,
      reverse_start_time: form.reverse_start_time.trim() || undefined,
      reverse_end_time: form.reverse_end_time.trim() || undefined,
    };
    return transportService.checkScheduleConflict(body);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicYearId) {
      toast.error("Select an academic year on the schedules page first.");
      return;
    }
    setLoading(true);
    setConflict(null);
    try {
      const check = await runConflictCheck();
      if (check?.has_conflict) {
        setConflict(check);
        toast.error("Resolve driver or bus overlaps before saving.");
        return;
      }
      await transportService.createSchedule({
        route_id: form.route_id,
        bus_id: form.bus_id,
        driver_id: form.driver_id,
        helper_id: form.helper_id.trim() || undefined,
        shift_type: form.shift_type,
        start_time: form.start_time.trim(),
        end_time: form.end_time.trim(),
        academic_year_id: academicYearId,
        is_reverse_enabled: form.pair_reverse && !!selectedRoute?.is_reverse_enabled,
        reverse_start_time: form.reverse_start_time.trim() || undefined,
        reverse_end_time: form.reverse_end_time.trim() || undefined,
      });
      toast.success("Schedule created");
      onCreated();
      onOpenChange(false);
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Could not create schedule");
    } finally {
      setLoading(false);
    }
  };

  const helperOptions =
    helpersQ.data?.filter((s) => s.role === "helper" || s.role === "attendant") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New schedule</DialogTitle>
            <DialogDescription>
              Assign a bus and driver to a route for a daily time window. Conflicts are checked
              before save.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Route</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                required
                value={form.route_id}
                onChange={(e) => setForm((f) => ({ ...f, route_id: e.target.value }))}
              >
                <option value="">Select route…</option>
                {(routesQ.data ?? []).map((r) => {
                  const inactive = (r.status ?? "active") === "inactive";
                  return (
                    <option key={r.id} value={r.id} disabled={inactive}>
                      {r.name}
                      {inactive ? " (inactive)" : ""}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-muted-foreground">
                Inactive routes cannot be used for new schedules. Historical schedules are unchanged.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Bus</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                required
                value={form.bus_id}
                onChange={(e) => setForm((f) => ({ ...f, bus_id: e.target.value }))}
              >
                <option value="">Select bus…</option>
                {(busesQ.data ?? [])
                  .filter((b) => b.status === "active")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                required
                value={form.driver_id}
                onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}
              >
                <option value="">Select driver…</option>
                {(driversQ.data ?? [])
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Helper (optional)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.helper_id}
                onChange={(e) => setForm((f) => ({ ...f, helper_id: e.target.value }))}
              >
                <option value="">None</option>
                {helperOptions
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.shift_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shift_type: e.target.value as "pickup" | "drop" }))
                }
              >
                <option value="pickup">Pickup</option>
                <option value="drop">Drop</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="time"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>
            {selectedRoute?.is_reverse_enabled ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.pair_reverse}
                  onChange={(e) => setForm((f) => ({ ...f, pair_reverse: e.target.checked }))}
                  className="size-4 rounded border-input"
                />
                Create paired reverse schedule (opposite shift)
              </label>
            ) : null}
            {selectedRoute?.is_reverse_enabled && form.pair_reverse ? (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                <p className="col-span-2 text-xs text-muted-foreground">
                  Optional: set reverse run times if they cannot be inferred from per-stop drop
                  times on the route.
                </p>
                <div className="space-y-2">
                  <Label>Reverse start</Label>
                  <Input
                    type="time"
                    value={form.reverse_start_time}
                    onChange={(e) => setForm((f) => ({ ...f, reverse_start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reverse end</Label>
                  <Input
                    type="time"
                    value={form.reverse_end_time}
                    onChange={(e) => setForm((f) => ({ ...f, reverse_end_time: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
            <ScheduleConflictBanner result={conflict} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !academicYearId}>
              {loading ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
