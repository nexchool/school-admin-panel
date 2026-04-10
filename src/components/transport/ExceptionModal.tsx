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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transportService } from "@/services/transportService";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  onCreated: () => void;
};

export function ExceptionModal({ open, onOpenChange, academicYearId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<"override" | "cancellation">("override");
  const [form, setForm] = useState({
    exception_date: "",
    route_id: "",
    bus_id: "",
    driver_id: "",
    helper_id: "",
    shift_type: "pickup" as "pickup" | "drop",
    start_time: "",
    end_time: "",
    schedule_id: "",
    reason: "",
  });

  const routesQ = useQuery({
    queryKey: ["transport", "routes"],
    queryFn: () => transportService.listRoutes(),
    enabled: open,
  });
  const busesQ = useQuery({
    queryKey: ["transport", "route", form.route_id, "buses-exception", academicYearId],
    queryFn: () =>
      transportService.busesForRoute(form.route_id, { academicYearId }),
    enabled: open && kind === "override" && !!form.route_id && !!academicYearId,
  });
  const driversQ = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => transportService.listDrivers(),
    enabled: open && kind === "override",
  });
  const helpersQ = useQuery({
    queryKey: ["transport", "staff", "helpers"],
    queryFn: () => transportService.listStaff(),
    enabled: open && kind === "override",
  });
  const schedulesQ = useQuery({
    queryKey: ["transport", "schedules", academicYearId, "exceptions-modal"],
    queryFn: () =>
      transportService.listSchedules({
        academicYearId,
        isActive: true,
      }),
    enabled: open && !!academicYearId && kind === "cancellation",
  });

  const selectedRoute = useMemo(
    () => routesQ.data?.find((r) => r.id === form.route_id),
    [routesQ.data, form.route_id]
  );

  useEffect(() => {
    if (!open) {
      setKind("override");
      setForm({
        exception_date: "",
        route_id: "",
        bus_id: "",
        driver_id: "",
        helper_id: "",
        shift_type: "pickup",
        start_time: "",
        end_time: "",
        schedule_id: "",
        reason: "",
      });
    }
  }, [open]);

  const submit = async () => {
    if (!academicYearId) {
      toast.error("Academic year is required");
      return;
    }
    if (!form.exception_date.trim()) {
      toast.error("Select a date");
      return;
    }
    setLoading(true);
    try {
      if (kind === "cancellation") {
        if (!form.schedule_id) {
          toast.error("Select a recurring schedule to cancel");
          setLoading(false);
          return;
        }
        await transportService.createScheduleException({
          academic_year_id: academicYearId,
          exception_date: form.exception_date,
          exception_type: "cancellation",
          schedule_id: form.schedule_id,
          reason: form.reason.trim() || undefined,
        });
      } else {
        if (
          !form.route_id ||
          !form.bus_id ||
          !form.driver_id ||
          !form.start_time ||
          !form.end_time
        ) {
          toast.error("Fill route, bus, driver, and times for an override");
          setLoading(false);
          return;
        }
        await transportService.createScheduleException({
          academic_year_id: academicYearId,
          exception_date: form.exception_date,
          exception_type: "override",
          route_id: form.route_id,
          bus_id: form.bus_id,
          driver_id: form.driver_id,
          helper_id: form.helper_id.trim() || undefined,
          shift_type: form.shift_type,
          start_time: form.start_time,
          end_time: form.end_time,
          reason: form.reason.trim() || undefined,
        });
      }
      toast.success("Exception saved");
      onCreated();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save exception");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule exception</DialogTitle>
          <DialogDescription>
            Run a route on a holiday with chosen resources, or cancel one recurring run for a single
            date. Base recurring schedules stay unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as "override" | "cancellation")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="override">Override (run on this date)</SelectItem>
                <SelectItem value="cancellation">Cancellation (skip this date)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Exception date</Label>
            <Input
              type="date"
              value={form.exception_date}
              onChange={(e) => setForm((f) => ({ ...f, exception_date: e.target.value }))}
            />
          </div>

          {kind === "cancellation" ? (
            <div className="space-y-2">
              <Label>Recurring schedule to cancel</Label>
              <Select
                value={form.schedule_id || "_none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, schedule_id: v === "_none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select…</SelectItem>
                  {(schedulesQ.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {(s.route?.name ?? "Route")} · {s.shift_type}{" "}
                      {s.start_time}–{s.end_time} · {s.bus?.bus_number ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Route</Label>
                <Select
                  value={form.route_id || "_none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, route_id: v === "_none" ? "" : v, bus_id: "", driver_id: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select…</SelectItem>
                    {(routesQ.data ?? []).map((r) => {
                      const inactive = (r.status ?? "active") === "inactive";
                      return (
                        <SelectItem key={r.id} value={r.id} disabled={inactive}>
                          {r.name}
                          {inactive ? " (inactive)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Overrides cannot target inactive routes. Use cancellation for existing schedules instead.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bus</Label>
                <Select
                  value={form.bus_id || "_none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, bus_id: v === "_none" ? "" : v }))
                  }
                  disabled={!form.route_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.route_id ? "Select bus" : "Select route first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select…</SelectItem>
                    {(busesQ.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bus_number} ({b.capacity} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Driver</Label>
                <Select
                  value={form.driver_id || "_none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, driver_id: v === "_none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select…</SelectItem>
                    {(driversQ.data ?? [])
                      .filter((d) => d.status === "active")
                      .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Helper (optional)</Label>
                <Select
                  value={form.helper_id || "_none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, helper_id: v === "_none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(helpersQ.data ?? [])
                      .filter((h) => h.role === "helper" || h.role === "attendant")
                      .map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shift</Label>
                <Select
                  value={form.shift_type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, shift_type: v as "pickup" | "drop" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>

              {selectedRoute?.is_reverse_enabled ? (
                <p className="text-xs text-muted-foreground">
                  This route allows reverse scheduling; this modal only creates the one-off window
                  above (not a paired reverse exception).
                </p>
              ) : null}
            </>
          )}

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g. Sports day"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
