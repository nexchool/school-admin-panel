"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiException } from "@/services/api";
import { transportService } from "@/services/transportService";
import { EditRouteModal } from "@/components/transport/modals/EditRouteModal";
import { RouteStopEditor } from "@/components/transport/RouteStopEditor";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setEditOpen(true);
  }, [searchParams]);

  const routeQ = useQuery({
    queryKey: ["transport", "route", id],
    queryFn: () => transportService.getRoute(id!, true),
    enabled: !!id,
  });

  const feeQ = useQuery({
    queryKey: ["transport", "fee-plans"],
    queryFn: () => transportService.listFeePlans(),
  });

  const busesQ = useQuery({
    queryKey: ["transport", "buses"],
    queryFn: () => transportService.listBuses(),
  });

  const defaultFee = useMemo(() => {
    if (!id || !feeQ.data) return "";
    const fp = feeQ.data.find((f) => f.route_id === id);
    if (fp) return String(fp.amount);
    const r = routeQ.data;
    if (r?.default_fee != null) return String(r.default_fee);
    return "";
  }, [feeQ.data, id, routeQ.data]);

  const busesOnRoute = useMemo(() => {
    if (!id || !busesQ.data) return [];
    return busesQ.data.filter(
      (b) => b.status === "active" && (b.assigned_route as { id?: string } | null)?.id === id
    );
  }, [busesQ.data, id]);

  const route = routeQ.data;
  const stops = useMemo(() => {
    const s = route?.stops ?? [];
    return s.slice().sort((a, b) => a.sequence_order - b.sequence_order);
  }, [route?.stops]);

  const enrollQ = useQuery({
    queryKey: ["transport", "enrollments"],
    queryFn: () => transportService.listEnrollments(),
    enabled: !!id,
  });

  const studentsOnRoute = useMemo(() => {
    if (!id || !enrollQ.data) return 0;
    return enrollQ.data.filter((e) => e.route_id === id && e.status === "active").length;
  }, [enrollQ.data, id]);

  const displayDefaultFee = useMemo(() => {
    if (defaultFee) return parseFloat(defaultFee).toFixed(2);
    if (route?.default_fee != null) return Number(route.default_fee).toFixed(2);
    return "—";
  }, [defaultFee, route?.default_fee]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transport", "route", id] });
    queryClient.invalidateQueries({ queryKey: ["transport", "routes"] });
  };

  const markStopsReviewed = async () => {
    if (!id) return;
    try {
      await transportService.updateRoute(id, { approx_stops_needs_review: false });
      toast.success("Marked as reviewed");
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  };

  const exportCsv = async () => {
    if (!id) return;
    try {
      await transportService.exportRouteStudents(id);
      toast.success("Export started");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const deleteRoute = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await transportService.deleteRoute(id);
      toast.success("Route deleted");
      queryClient.invalidateQueries({ queryKey: ["transport", "routes"] });
      queryClient.invalidateQueries({ queryKey: ["transport", "routes", "table"] });
      setDeleteOpen(false);
      router.replace("/dashboard/transport/routes");
    } catch (e: unknown) {
      if (e instanceof ApiException && (e.status === 409 || e.status === 404)) {
        const raw = e.data as { details?: { usage?: Record<string, number> } } | undefined;
        const u = raw?.details?.usage;
        if (e.status === 409 && u) {
          toast.error(
            `${e.message} Schedules: ${u.schedules ?? 0}, enrollments: ${u.enrollments ?? 0}, fee plans: ${u.fee_plans ?? 0}, assignments: ${u.assignments ?? 0}, exceptions: ${u.schedule_exceptions ?? 0}.`
          );
        } else {
          toast.error(e.message);
        }
      } else {
        toast.error(e instanceof Error ? e.message : "Could not delete route");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/transport/routes" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {routeQ.isLoading ? <Skeleton className="h-8 w-48" /> : route?.name ?? "Route"}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Routes define pickup/drop areas. Buses are assigned separately.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button type="button" variant="secondary" onClick={exportCsv} disabled={!route}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      {routeQ.error && (
        <p className="text-sm text-destructive">{(routeQ.error as Error).message}</p>
      )}

      {route && (
        <>
          {(route.status ?? "active") === "inactive" ? (
            <div
              role="status"
              className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
            >
              This route is inactive and cannot be used for new schedules, enrollments, or bus
              assignments. Existing schedules and enrollments are unchanged.
            </div>
          ) : null}
          {route.approx_stops_needs_review ? (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-foreground">
                The approximate stop list for this route may need review (import or corridor change).
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={() => void markStopsReviewed()}>
                Mark as reviewed
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Route info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Corridor</span>
                  <span>
                    {(route.start_point ?? "—") + " → " + (route.end_point ?? "—")}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Students</span>
                  <span className="tabular-nums">{studentsOnRoute}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Default fee</span>
                  <span className="tabular-nums">{displayDefaultFee}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Fee cycle</span>
                  <span className="capitalize">{(route.fee_cycle ?? "monthly").replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Reverse route</span>
                  <span>{route.is_reverse_enabled ? "Enabled" : "Off"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{route.status ?? "active"}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buses on this route</CardTitle>
                <CardDescription>Active buses with a current assignment to this route.</CardDescription>
              </CardHeader>
              <CardContent>
                {busesQ.isLoading ? (
                  <Skeleton className="h-16" />
                ) : busesOnRoute.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active buses yet. Assign from Fleet → row actions → Assign route & driver.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {busesOnRoute.map((b) => (
                      <li key={b.id} className="flex justify-between gap-2">
                        <Link
                          className="font-medium text-primary hover:underline"
                          href={`/dashboard/transport/fleet/${b.id}`}
                        >
                          {b.bus_number}
                        </Link>
                        <span className="text-muted-foreground tabular-nums">
                          {b.occupancy_count ?? 0}/{b.capacity}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card id="stops">
            <CardHeader>
              <CardTitle className="text-base">Stops</CardTitle>
              <CardDescription>
                Add stops from the global master, set pickup/drop times, reorder with Up/Down or drag rows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteStopEditor routeId={id} stops={stops} />
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Delete route</CardTitle>
              <CardDescription>
                Permanently removes this route only when it has no schedules, enrollments, fee plans,
                assignments, or schedule exceptions. Otherwise the API returns a usage breakdown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deleteOpen ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-muted-foreground">This cannot be undone. Continue?</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deleting}
                      onClick={() => void deleteRoute()}
                    >
                      {deleting ? "Deleting…" : "Delete permanently"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete route…
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <EditRouteModal
        route={route ?? null}
        open={editOpen}
        onOpenChange={setEditOpen}
        defaultFee={defaultFee}
        onSaved={() => {
          invalidate();
          queryClient.invalidateQueries({ queryKey: ["transport", "fee-plans"] });
          queryClient.invalidateQueries({ queryKey: ["transport", "routes", "table"] });
        }}
      />
    </div>
  );
}
