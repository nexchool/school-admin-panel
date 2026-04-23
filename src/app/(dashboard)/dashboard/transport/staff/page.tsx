"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  transportService,
  type DriverWorkloadResponse,
  type TransportBus,
  type TransportDriver,
  type TransportStaff,
} from "@/services/transportService";
import { StatusBadge } from "@/components/transport/transport-badges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AssignRouteDriverModal } from "@/components/transport/modals/AssignRouteDriverModal";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Row =
  | { kind: "legacy_driver"; id: string; driver: TransportDriver }
  | { kind: "transport_staff"; id: string; staff: TransportStaff };

export default function TransportStaffPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "driver" as "driver" | "helper",
    phone: "",
    license_number: "",
    address: "",
  });
  const [assignBus, setAssignBus] = useState<TransportBus | null>(null);
  const [pickBusOpen, setPickBusOpen] = useState(false);
  const [pickedBusId, setPickedBusId] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<Row | null>(null);
  const [deactivatingStaff, setDeactivatingStaff] = useState(false);

  const { data: academicYears = [] } = useAcademicYears(true);
  const [academicYearId, setAcademicYearId] = useState("");

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const driversQ = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => transportService.listDrivers(),
  });

  const allStaffQ = useQuery({
    queryKey: ["transport", "staff", "all"],
    queryFn: () => transportService.listStaff(),
  });

  const transportStaffIds = useMemo(
    () => (allStaffQ.data ?? []).map((s) => s.id),
    [allStaffQ.data]
  );

  const workloadQueries = useQueries({
    queries: transportStaffIds.map((sid) => ({
      queryKey: ["transport", "workload", sid, todayStr, academicYearId],
      queryFn: () =>
        transportService.getDriverWorkload(sid, {
          date: todayStr,
          academicYearId,
        }),
      enabled: !!academicYearId && transportStaffIds.length > 0,
    })),
  });

  const workloadByStaffId = useMemo(() => {
    const m = new Map<string, DriverWorkloadResponse>();
    transportStaffIds.forEach((sid, i) => {
      const d = workloadQueries[i]?.data;
      if (d) m.set(sid, d);
    });
    return m;
  }, [transportStaffIds, workloadQueries]);

  const busesQ = useQuery({
    queryKey: ["transport", "buses"],
    queryFn: () => transportService.listBuses(),
  });

  const rows: Row[] = useMemo(() => {
    const legacy: Row[] = (driversQ.data ?? []).map((d) => ({
      kind: "legacy_driver" as const,
      id: `ld-${d.id}`,
      driver: d,
    }));
    const ts: Row[] = (allStaffQ.data ?? []).map((s) => ({
      kind: "transport_staff" as const,
      id: `ts-${s.id}`,
      staff: s,
    }));
    return [...legacy, ...ts].sort((a, b) => {
      const na = a.kind === "legacy_driver" ? a.driver.name : a.staff.name;
      const nb = b.kind === "legacy_driver" ? b.driver.name : b.staff.name;
      return na.localeCompare(nb);
    });
  }, [driversQ.data, allStaffQ.data]);

  const busForLegacyDriver = (driverId: string) =>
    (busesQ.data ?? []).find(
      (b) => (b.assigned_driver as { id?: string } | null)?.id === driverId
    );

  const busForTransportHelper = (staffId: string) =>
    (busesQ.data ?? []).find(
      (b) => (b.assigned_helper as { id?: string } | null)?.id === staffId
    );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = r.kind === "legacy_driver" ? r.driver.name : r.staff.name;
      const phone = r.kind === "legacy_driver" ? r.driver.phone : r.staff.phone;
      const lic =
        r.kind === "legacy_driver" ? r.driver.license_number ?? "" : r.staff.license_number ?? "";
      return (
        name.toLowerCase().includes(q) ||
        (phone ?? "").toLowerCase().includes(q) ||
        lic.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transport", "drivers"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "staff"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "buses"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "workload"] });
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (form.role === "driver") {
        await transportService.createDriver({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          license_number: form.license_number.trim() || undefined,
          address: form.address.trim() || undefined,
          status: "active",
        });
      } else {
        await transportService.createStaff({
          name: form.name.trim(),
          role: "helper",
          phone: form.phone.trim() || undefined,
          license_number: form.license_number.trim() || undefined,
          address: form.address.trim() || undefined,
          status: "active",
        });
      }
      toast.success("Staff member added");
      setForm({ name: "", role: "driver", phone: "", license_number: "", address: "" });
      setAddOpen(false);
      invalidate();
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Failed");
    }
  };

  const performDeactivate = async () => {
    const r = deactivateTarget;
    if (!r) return;
    setDeactivatingStaff(true);
    try {
      if (r.kind === "legacy_driver") {
        await transportService.deleteDriver(r.driver.id);
        toast.success("Driver deactivated");
      } else {
        await transportService.deleteStaff(r.staff.id);
        toast.success("Staff deactivated");
      }
      invalidate();
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Could not deactivate");
      throw ex;
    } finally {
      setDeactivatingStaff(false);
    }
  };

  const workloadCell = (staffId: string, field: "routes" | "duty") => {
    const idx = transportStaffIds.indexOf(staffId);
    const pending = idx >= 0 && workloadQueries[idx]?.isPending;
    const w = workloadByStaffId.get(staffId);
    if (!academicYearId) return "—";
    if (pending) return <Skeleton className="inline-block h-4 w-10" />;
    if (!w) return "—";
    if (field === "routes") return w.workload.assigned_routes_today;
    return w.workload.total_duty_display;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">
            Legacy drivers, transport staff (including drivers on schedules), and helpers. Assign buses
            from here or from Fleet.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add staff
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directory</CardTitle>
          <CardDescription>
            Workload columns use transport schedules for transport staff (same IDs as route schedules).
            Pick an academic year to load today&apos;s snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Academic year (workload)</label>
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
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, phone, license…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Phone</th>
                  <th className="px-3 py-3 font-medium">License</th>
                  <th className="px-3 py-3 font-medium">Assigned bus</th>
                  <th className="px-3 py-3 font-medium">Routes today</th>
                  <th className="px-3 py-3 font-medium">Duty today</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {(driversQ.isLoading || allStaffQ.isLoading) &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-3 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!driversQ.isLoading &&
                  !allStaffQ.isLoading &&
                  filtered.map((r) => {
                    const isLegacy = r.kind === "legacy_driver";
                    const d = isLegacy ? r.driver : r.staff;
                    const assigned = isLegacy
                      ? busForLegacyDriver(d.id)
                      : busForTransportHelper(r.staff.id);
                    return (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-3 py-3 font-medium">
                          {isLegacy ? (
                            d.name
                          ) : (
                            <Link
                              className="text-primary hover:underline"
                              href={`/dashboard/transport/staff/${r.staff.id}`}
                            >
                              {r.staff.name}
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-3 capitalize">
                          {isLegacy ? "Driver (legacy)" : r.staff.role ?? "Staff"}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {d.phone ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          {isLegacy ? d.license_number ?? "—" : r.staff.license_number ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          {assigned ? (
                            <span className="font-medium">{assigned.bus_number}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {isLegacy ? "—" : workloadCell(r.staff.id, "routes")}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {isLegacy ? "—" : workloadCell(r.staff.id, "duty")}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {!isLegacy && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/transport/staff/${r.staff.id}`}>
                                    Workload and timeline
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                disabled={d.status !== "active"}
                                onClick={() => {
                                  if (assigned) setAssignBus(assigned);
                                  else {
                                    setPickedBusId("");
                                    setPickBusOpen(true);
                                  }
                                }}
                              >
                                Assign to bus
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={d.status !== "active"}
                                onClick={() => setDeactivateTarget(r)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!driversQ.isLoading && !allStaffQ.isLoading && filtered.length === 0 && (
              <p className="px-3 py-10 text-center text-muted-foreground">
                {rows.length === 0 ? "No drivers or transport staff yet." : "No matches."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <form onSubmit={submitAdd}>
            <DialogHeader>
              <DialogTitle>Add staff</DialogTitle>
              <DialogDescription>
                Drivers are added to the legacy driver roster; helpers to transport staff. Schedule
                drivers use transport staff (role driver).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as "driver" | "helper" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver (legacy roster)</SelectItem>
                    <SelectItem value="helper">Helper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              {form.role === "driver" && (
                <div className="space-y-2">
                  <Label>License</Label>
                  <Input
                    value={form.license_number}
                    onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pickBusOpen} onOpenChange={setPickBusOpen}>
        <DialogContent onClose={() => setPickBusOpen(false)}>
          <DialogHeader>
            <DialogTitle>Choose bus</DialogTitle>
            <DialogDescription>Select which bus to attach route and driver to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Bus</Label>
            <Select value={pickedBusId} onValueChange={setPickedBusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                {(busesQ.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bus_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickBusOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const b = (busesQ.data ?? []).find((x) => x.id === pickedBusId);
                if (b) {
                  setAssignBus(b);
                  setPickBusOpen(false);
                }
              }}
              disabled={!pickedBusId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignRouteDriverModal
        bus={assignBus}
        open={!!assignBus}
        onOpenChange={(o) => !o && setAssignBus(null)}
        onAssigned={invalidate}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title="Deactivate this person?"
        description="They must not be on an active assignment."
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deactivatingStaff}
        onConfirm={performDeactivate}
      />
    </div>
  );
}
