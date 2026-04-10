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
import { transportService, type TransportRoute } from "@/services/transportService";
import { AddRouteModal } from "@/components/transport/modals/AddRouteModal";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Row = TransportRoute & {
  stopsCount: number;
  studentsCount: number;
  busesCount: number;
  defaultFee: number | null;
};

async function fetchRoutesTable(): Promise<Row[]> {
  const [routes, buses, enrollments, feePlans] = await Promise.all([
    transportService.listRoutes(),
    transportService.listBuses(),
    transportService.listEnrollments(),
    transportService.listFeePlans(),
  ]);

  const feeByRoute = new Map<string, number>();
  for (const fp of feePlans) {
    feeByRoute.set(fp.route_id, fp.amount);
  }

  const activeEnrByRoute = new Map<string, number>();
  for (const e of enrollments) {
    if (e.status !== "active") continue;
    activeEnrByRoute.set(e.route_id, (activeEnrByRoute.get(e.route_id) ?? 0) + 1);
  }

  const busesByRoute = new Map<string, number>();
  for (const b of buses) {
    if (b.status !== "active") continue;
    const rid = (b.assigned_route as { id?: string } | null)?.id;
    if (rid) busesByRoute.set(rid, (busesByRoute.get(rid) ?? 0) + 1);
  }

  return routes.map((r) => {
    const fromPlan = feeByRoute.get(r.id);
    const fromRoute = r.default_fee != null ? Number(r.default_fee) : null;
    return {
      ...r,
      stopsCount: r.stops_count ?? 0,
      studentsCount: activeEnrByRoute.get(r.id) ?? 0,
      busesCount: busesByRoute.get(r.id) ?? 0,
      defaultFee: fromPlan ?? fromRoute,
    };
  });
}

export default function TransportRoutesPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["transport", "routes", "table"],
    queryFn: fetchRoutesTable,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const se = `${r.start_point ?? ""} ${r.end_point ?? ""}`.toLowerCase();
      return r.name.toLowerCase().includes(q) || se.includes(q);
    });
  }, [rows, search]);

  const exportRoute = async (id: string) => {
    try {
      await transportService.exportRouteStudents(id);
      toast.success("Export started");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routes</h1>
          <p className="text-muted-foreground max-w-xl">
            Routes define pickup/drop areas. Buses are assigned separately.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add route
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All routes</CardTitle>
          <CardDescription>Stops, students, and buses help you see coverage at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search routes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Route</th>
                  <th className="px-3 py-3 font-medium">Start → End</th>
                  <th className="px-3 py-3 font-medium">Stops</th>
                  <th className="px-3 py-3 font-medium">Students</th>
                  <th className="px-3 py-3 font-medium">Active buses</th>
                  <th className="px-3 py-3 font-medium">Default fee</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-3 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!isLoading &&
                  filtered.map((r) => {
                    const isInactive = (r.status ?? "active") === "inactive";
                    return (
                    <tr
                      key={r.id}
                      className={`border-b border-border/60 hover:bg-muted/30 ${isInactive ? "bg-muted/20 opacity-90" : ""}`}
                    >
                      <td className="px-3 py-3 font-medium">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {r.name}
                          {isInactive ? (
                            <Badge
                              variant="secondary"
                              className="font-normal text-muted-foreground"
                            >
                              Inactive
                            </Badge>
                          ) : null}
                          {r.approx_stops_needs_review ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/50 font-normal text-amber-900 dark:text-amber-100"
                            >
                              Review stops
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {(r.start_point ?? "—") + " → " + (r.end_point ?? "—")}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{r.stopsCount}</td>
                      <td className="px-3 py-3 tabular-nums">{r.studentsCount}</td>
                      <td className="px-3 py-3 tabular-nums">{r.busesCount}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {r.defaultFee != null ? r.defaultFee.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={isInactive ? "secondary" : "outline"}
                          className="capitalize"
                        >
                          {r.status ?? "active"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/transport/routes/${r.id}`}>View details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/transport/routes/${r.id}?edit=1`}>Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/transport/routes/${r.id}#stops`}>
                                Manage stops
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportRoute(r.id)}>Export CSV</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                  })}
              </tbody>
            </table>
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-10 text-center text-muted-foreground">
                {rows.length === 0 ? "No routes yet. Create one to define pickup areas." : "No match."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AddRouteModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["transport", "routes"] });
          queryClient.invalidateQueries({ queryKey: ["transport", "routes", "table"] });
        }}
      />
    </div>
  );
}
