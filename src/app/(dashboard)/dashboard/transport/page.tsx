"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { transportService } from "@/services/transportService";
import { studentsService } from "@/services/studentsService";
import { OccupancyHealthBadge } from "@/components/transport/transport-badges";
import {
  AlertTriangle,
  Bus,
  Route,
  UserX,
  Users,
  Gauge,
  Moon,
  UserMinus,
} from "lucide-react";

function InsightCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "amber" | "red" | "emerald";
}) {
  const border =
    tone === "red"
      ? "border-red-500/30"
      : tone === "amber"
        ? "border-amber-500/30"
        : tone === "emerald"
          ? "border-emerald-500/30"
          : "border-border";
  return (
    <Card className={border}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={
            tone === "red"
              ? "size-4 text-red-600"
              : tone === "amber"
                ? "size-4 text-amber-600"
                : tone === "emerald"
                  ? "size-4 text-emerald-600"
                  : "size-4 text-muted-foreground"
          }
        />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function TransportOverviewPage() {
  const results = useQueries({
    queries: [
      {
        queryKey: ["transport", "dashboard"],
        queryFn: () => transportService.getDashboard(),
      },
      {
        queryKey: ["transport", "buses"],
        queryFn: () => transportService.listBuses(),
      },
      {
        queryKey: ["transport", "routes"],
        queryFn: () => transportService.listRoutes(),
      },
      {
        queryKey: ["transport", "enrollments"],
        queryFn: () => transportService.listEnrollments(),
      },
      {
        queryKey: ["students", "all"],
        queryFn: () => studentsService.getStudents(),
      },
    ],
  });

  const [dashQ, busesQ, routesQ, enrQ, studentsQ] = results;
  const loading = results.some((r) => r.isLoading);
  const err = results.find((r) => r.error)?.error as Error | undefined;

  const insights = useMemo(() => {
    const buses = busesQ.data ?? [];
    const routes = routesQ.data ?? [];
    const enrollments = enrQ.data ?? [];
    const students = studentsQ.data?.items ?? [];

    const activeEnrStudentIds = new Set(
      enrollments.filter((e) => e.status === "active").map((e) => e.student_id)
    );

    const routeIdsWithBus = new Set(
      buses
        .filter((b) => b.status === "active" && b.assigned_route?.id)
        .map((b) => b.assigned_route!.id)
    );

    const busesWithoutDriver = buses.filter(
      (b) => b.status === "active" && !b.assigned_driver
    ).length;

    const routesWithoutBus = routes.filter(
      (r) => (r.status ?? "active") === "active" && !routeIdsWithBus.has(r.id)
    ).length;

    const optedNotAssigned = students.filter(
      (s) => s.is_transport_opted && !activeEnrStudentIds.has(s.id)
    ).length;

    const inactiveBuses = buses.filter((b) => b.status !== "active").length;

    return {
      busesWithoutDriver,
      routesWithoutBus,
      optedNotAssigned,
      inactiveBuses,
    };
  }, [busesQ.data, routesQ.data, enrQ.data, studentsQ.data]);

  const data = dashQ.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Fleet health, occupancy, and what needs attention — at a glance.
          </p>
        </div>
        <Button asChild variant="default">
          <Link href="/dashboard/transport/fleet">Manage fleet</Link>
        </Button>
      </div>

      {err && <p className="text-sm text-destructive">{err.message}</p>}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total buses</CardTitle>
                <Bus className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">{data.total_buses}</div>
                <p className="text-xs text-muted-foreground">Registered vehicles</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active buses</CardTitle>
                <Gauge className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">{data.active_buses}</div>
                <p className="text-xs text-muted-foreground">Status = active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students on transport</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">
                  {data.total_students_on_transport}
                </div>
                <p className="text-xs text-muted-foreground">Current academic year</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Near capacity</CardTitle>
                <AlertTriangle className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">
                  {data.buses_near_capacity_count}
                </div>
                <p className="text-xs text-muted-foreground">71%+ occupancy</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Needs attention</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InsightCard
                title="Buses without driver"
                value={insights.busesWithoutDriver}
                hint="Active buses missing a driver assignment"
                icon={UserMinus}
                tone={insights.busesWithoutDriver > 0 ? "amber" : "emerald"}
              />
              <InsightCard
                title="Routes without bus"
                value={insights.routesWithoutBus}
                hint="Active routes with no bus covering them"
                icon={Route}
                tone={insights.routesWithoutBus > 0 ? "amber" : "emerald"}
              />
              <InsightCard
                title="Opted in, not assigned"
                value={insights.optedNotAssigned}
                hint="Transport opted but no active seat"
                icon={UserX}
                tone={insights.optedNotAssigned > 0 ? "red" : "emerald"}
              />
              <InsightCard
                title="Inactive buses"
                value={insights.inactiveBuses}
                hint="Maintenance, retired, or inactive"
                icon={Moon}
                tone="neutral"
              />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Route &amp; schedule health</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InsightCard
                title="Students on inactive routes"
                value={data.students_on_inactive_routes ?? 0}
                hint="Active enrollments tied to inactive routes — review assignments"
                icon={AlertTriangle}
                tone={(data.students_on_inactive_routes ?? 0) > 0 ? "amber" : "emerald"}
              />
              <InsightCard
                title="Buses without active route"
                value={data.buses_without_active_routes ?? 0}
                hint="No valid assignment + schedules for current academic year"
                icon={Bus}
                tone={(data.buses_without_active_routes ?? 0) > 0 ? "amber" : "emerald"}
              />
              <InsightCard
                title="Drivers without schedules"
                value={data.drivers_without_schedules ?? 0}
                hint="Active driver staff with no recurring schedule this year"
                icon={Users}
                tone={(data.drivers_without_schedules ?? 0) > 0 ? "amber" : "emerald"}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Occupancy by bus</CardTitle>
              <CardDescription>Progress shows seat usage; colors reflect load level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.occupancy_per_bus.map((b) => (
                <div key={b.bus_id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.bus_number}</span>
                      {b.status && b.status !== "active" ? (
                        <span className="text-muted-foreground">({b.status})</span>
                      ) : null}
                      <OccupancyHealthBadge health={b.occupancy_health} />
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {b.occupancy} / {b.capacity} ({b.occupancy_percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        b.occupancy_health === "full" || b.occupancy_health === "high"
                          ? "h-full rounded-full bg-amber-500 transition-all"
                          : "h-full rounded-full bg-emerald-500 transition-all"
                      }
                      style={{ width: `${Math.min(100, b.occupancy_percent)}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.occupancy_per_bus.length === 0 && (
                <p className="text-sm text-muted-foreground">No buses yet. Add vehicles under Fleet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Students by route</CardTitle>
              <CardDescription>Distribution of active enrollments.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.route_distribution.map((r) => (
                  <li key={r.route_id} className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0">
                    <span>{r.route_name}</span>
                    <span className="tabular-nums text-muted-foreground">{r.students} students</span>
                  </li>
                ))}
                {data.route_distribution.length === 0 && (
                  <li className="text-muted-foreground">No route distribution yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
