"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { transportService, type TransportBus } from "@/services/transportService";
import { OccupancyHealthBadge, StatusBadge } from "@/components/transport/transport-badges";
import { AddBusModal } from "@/components/transport/modals/AddBusModal";
import { EditBusModal } from "@/components/transport/modals/EditBusModal";
import { AssignRouteDriverModal } from "@/components/transport/modals/AssignRouteDriverModal";
import { ConfirmDialog } from "@/components/transport/ConfirmDialog";
import { AlertTriangle, Bus, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function TransportFleetPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editBus, setEditBus] = useState<TransportBus | null>(null);
  const [assignBus, setAssignBus] = useState<TransportBus | null>(null);
  const [deactivateBus, setDeactivateBus] = useState<TransportBus | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["transport", "buses"],
    queryFn: () => transportService.listBuses(),
  });

  const routeOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const b of rows) {
      const r = b.assigned_route as { id?: string; name?: string } | null;
      if (r?.id && r.name) names.set(r.id, r.name);
    }
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((b) => b.status === "active").length;
    const near = rows.filter(
      (b) =>
        b.status === "active" &&
        (b.occupancy_health === "high" || b.occupancy_health === "full")
    ).length;
    const inactive = rows.filter((b) => b.status !== "active").length;
    return { total, active, near, inactive };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (routeFilter !== "all") {
        const rid = (b.assigned_route as { id?: string } | null)?.id;
        if (rid !== routeFilter) return false;
      }
      if (!q) return true;
      const vn = (b.vehicle_number ?? "").toLowerCase();
      return b.bus_number.toLowerCase().includes(q) || vn.includes(q);
    });
  }, [rows, search, statusFilter, routeFilter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transport", "buses"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["transport", "enrollments"] });
  };

  const exportCsv = async (b: TransportBus) => {
    try {
      await transportService.exportBusStudents(b.id);
      toast.success(`Exported students for ${b.bus_number}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const onDeactivate = async () => {
    if (!deactivateBus) return;
    setDeactivateLoading(true);
    try {
      await transportService.deleteBus(deactivateBus.id);
      toast.success("Bus deactivated");
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not deactivate");
      throw e;
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fleet</h1>
          <p className="text-muted-foreground">
            Your operational hub: buses, routes, drivers, and occupancy in one place.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add bus
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bus className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold tabular-nums">{kpis.total}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {kpis.active}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Near full</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {kpis.near}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold tabular-nums text-muted-foreground">
                {kpis.inactive}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All buses</CardTitle>
          <CardDescription>Search and filter; use row actions for assignments and exports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bus or vehicle number…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                {routeOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Bus #</th>
                  <th className="px-3 py-3 font-medium">Vehicle</th>
                  <th className="px-3 py-3 font-medium">Route</th>
                  <th className="px-3 py-3 font-medium">Capacity</th>
                  <th className="px-3 py-3 font-medium">Occupancy</th>
                  <th className="px-3 py-3 font-medium">Health</th>
                  <th className="px-3 py-3 font-medium">Driver</th>
                  <th className="px-3 py-3 font-medium">Helper</th>
                  <th className="px-3 py-3 font-medium">Ops</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium w-12" />
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td colSpan={11} className="px-3 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!isLoading &&
                  filtered.map((b) => {
                    const routeName = (b.assigned_route as { name?: string } | null)?.name;
                    const driverName = (b.assigned_driver as { name?: string } | null)?.name;
                    const helperName = (b.assigned_helper as { name?: string } | null)?.name;
                    return (
                      <tr key={b.id} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="px-3 py-3 font-medium">{b.bus_number}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {b.vehicle_number ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          {routeName ? (
                            <Badge variant="secondary" className="font-normal">
                              {routeName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums">{b.capacity}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {b.occupancy_count ?? 0}{" "}
                          <span className="text-muted-foreground">
                            ({b.occupancy_percent ?? 0}%)
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <OccupancyHealthBadge health={b.occupancy_health} />
                        </td>
                        <td className="px-3 py-3">{driverName ?? "—"}</td>
                        <td className="px-3 py-3">{helperName ?? "—"}</td>
                        <td className="px-3 py-3">
                          {b.status === "active" &&
                          b.transport_operational &&
                          b.transport_operational.code !== "ok" ? (
                            <span
                              className="inline-flex items-center gap-1 text-amber-200 dark:text-amber-500"
                              title={b.transport_operational.message ?? ""}
                            >
                              <AlertTriangle className="size-4 shrink-0" aria-hidden />
                              <span className="max-w-[140px] truncate text-xs">
                                {b.transport_operational.code === "no_active_schedules"
                                  ? "No schedules"
                                  : "No active route"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/transport/fleet/${b.id}`}>View details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditBus(b)}>Edit bus</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAssignBus(b)}>
                                Assign / change route & driver
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/transport/fleet/${b.id}#students`}>
                                  View students
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportCsv(b)}>Export CSV</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={b.status !== "active"}
                                onClick={() => setDeactivateBus(b)}
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
            {!isLoading && filtered.length === 0 && (
              <div className="px-3 py-12 text-center text-muted-foreground">
                {rows.length === 0
                  ? "No buses added yet. Use Add bus to register your fleet."
                  : "No buses match your filters."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddBusModal open={addOpen} onOpenChange={setAddOpen} onCreated={invalidate} />
      <EditBusModal
        bus={editBus}
        open={!!editBus}
        onOpenChange={(o) => !o && setEditBus(null)}
        onSaved={invalidate}
      />
      <AssignRouteDriverModal
        bus={assignBus}
        open={!!assignBus}
        onOpenChange={(o) => !o && setAssignBus(null)}
        onAssigned={invalidate}
      />
      <ConfirmDialog
        open={!!deactivateBus}
        onOpenChange={(o) => !o && setDeactivateBus(null)}
        title="Deactivate this bus?"
        description="Only allowed when no students are actively enrolled. Historical data is kept."
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deactivateLoading}
        onConfirm={onDeactivate}
      />
    </div>
  );
}
