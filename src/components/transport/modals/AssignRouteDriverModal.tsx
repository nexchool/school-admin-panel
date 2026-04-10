"use client";

import { useEffect, useState } from "react";
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
import {
  transportService,
  type TransportBus,
  type TransportDriver,
  type TransportRoute,
  type TransportStaff,
} from "@/services/transportService";
import { toast } from "sonner";

type Props = {
  bus: TransportBus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
};

export function AssignRouteDriverModal({ bus, open, onOpenChange, onAssigned }: Props) {
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<TransportDriver[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [helpers, setHelpers] = useState<TransportStaff[]>([]);
  const [form, setForm] = useState({
    driver_id: "",
    route_id: "",
    helper_staff_id: "",
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: "",
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      transportService.listDrivers(),
      transportService.listRoutes(),
      transportService.listStaff(),
    ])
      .then(([d, r, staff]) => {
        setDrivers(d.filter((x) => x.status === "active"));
        setRoutes(r.filter((x) => (x.status ?? "active") === "active"));
        setHelpers(staff.filter((x) => x.role === "helper" || x.role === "attendant"));
      })
      .catch(() => {
        toast.error("Could not load drivers or routes");
      });
  }, [open]);

  useEffect(() => {
    if (bus && open) {
      const ar = bus.assigned_route as { id?: string } | null;
      const ad = bus.assigned_driver as { id?: string } | null;
      const ah = bus.assigned_helper as { id?: string } | null;
      setForm({
        driver_id: ad?.id ?? "",
        route_id: ar?.id ?? "",
        helper_staff_id: ah?.id ?? "",
        effective_from: new Date().toISOString().slice(0, 10),
        effective_to: "",
      });
    }
  }, [bus, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bus) return;
    setLoading(true);
    try {
      await transportService.createAssignment({
        bus_id: bus.id,
        driver_id: form.driver_id,
        route_id: form.route_id,
        helper_staff_id: form.helper_staff_id || undefined,
        effective_from: form.effective_from,
        effective_to: form.effective_to.trim() || undefined,
        status: "active",
      });
      toast.success("Route and crew updated for this bus");
      onAssigned();
      onOpenChange(false);
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onClose={() => onOpenChange(false)}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Assign route & driver</DialogTitle>
            <DialogDescription>
              Links this bus to a route and driver for the selected dates. Replaces the previous active
              assignment for this bus.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">
              Bus: <span className="font-medium">{bus?.bus_number ?? "—"}</span>
            </p>
            <div className="space-y-2">
              <Label>Route</Label>
              <Select
                value={form.route_id}
                onValueChange={(v) => setForm((f) => ({ ...f, route_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select
                value={form.driver_id}
                onValueChange={(v) => setForm((f) => ({ ...f, driver_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
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
                value={form.helper_staff_id || "_none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, helper_staff_id: v === "_none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {helpers.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ard_from">Effective from</Label>
                <Input
                  id="ard_from"
                  type="date"
                  required
                  value={form.effective_from}
                  onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ard_to">Effective to (optional)</Label>
                <Input
                  id="ard_to"
                  type="date"
                  value={form.effective_to}
                  onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !bus}>
              {loading ? "Saving…" : "Save assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
