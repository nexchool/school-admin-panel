"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  ChevronLeft,
  Download,
  ListChecks,
  RotateCcw,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  useHostelDashboard,
  useHostels,
} from "@/hooks/useHostel";
import { hostelService } from "@/services/hostelService";
import { toastError, toastSuccess } from "@/lib/errorToast";

import type {
  HostelGatepass,
  OccupancyRow,
} from "@/services/hostelService";

/**
 * Screen 9 — Hostel dashboard (occupancy + alerts).
 *
 * Pulls /api/hostel/dashboard once and renders:
 *   - KPI strip: total beds, occupied, vacant, occupancy %, visitors inside,
 *     overdue gatepasses
 *   - Per-hostel occupancy table with progress bars
 *   - Overdue gatepass alert list with deep links to each gatepass
 *   - Quick navigation tiles back to the operational screens
 *
 * 'Download CSV' triggers the residents.csv backend export and saves the
 * file via a blob URL.
 */
export default function HostelDashboardPage() {
  const dashboardQuery = useHostelDashboard();
  const hostelsQuery = useHostels();

  const aggregates = useMemo(() => {
    const occ = dashboardQuery.data?.occupancy ?? [];
    const totalBeds = occ.reduce((a, r) => a + r.total_beds, 0);
    const totalOccupied = occ.reduce((a, r) => a + r.active_allocations, 0);
    const totalVacant = Math.max(totalBeds - totalOccupied, 0);
    const pct = totalBeds === 0 ? 0 : Math.round((totalOccupied / totalBeds) * 1000) / 10;
    return { totalBeds, totalOccupied, totalVacant, pct };
  }, [dashboardQuery.data]);

  const hostelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of hostelsQuery.data ?? []) map.set(h.id, h.name);
    return map;
  }, [hostelsQuery.data]);

  async function handleDownloadResidentsCsv() {
    try {
      const csv = await hostelService.downloadResidentsCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hostel-residents-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toastSuccess("Residents CSV downloaded.");
    } catch (err) {
      toastError(err, "Couldn't download the residents CSV.");
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/hostel"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Hostels
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Occupancy, alerts, and live counts across every hostel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadResidentsCsv}>
            <Download className="mr-2 size-4" /> Residents CSV
          </Button>
          <Button variant="outline" onClick={() => dashboardQuery.refetch()}>
            <RotateCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={BedDouble}
          label="Total beds"
          value={
            dashboardQuery.isLoading ? "…" : String(aggregates.totalBeds)
          }
        />
        <KpiCard
          icon={Users}
          label="Occupied"
          value={
            dashboardQuery.isLoading
              ? "…"
              : `${aggregates.totalOccupied} (${aggregates.pct}%)`
          }
          tone={aggregates.pct >= 90 ? "amber" : "default"}
        />
        <KpiCard
          icon={BedDouble}
          label="Vacant"
          value={
            dashboardQuery.isLoading ? "…" : String(aggregates.totalVacant)
          }
          tone="emerald"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Overdue gatepasses"
          value={
            dashboardQuery.isLoading
              ? "…"
              : String(dashboardQuery.data?.overdue_gatepasses.length ?? 0)
          }
          tone={
            (dashboardQuery.data?.overdue_gatepasses.length ?? 0) > 0
              ? "rose"
              : "default"
          }
        />
      </div>

      {/* Occupancy table + overdue list */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Occupancy by hostel</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : dashboardQuery.isError ? (
              <p className="text-sm text-destructive">Failed to load.</p>
            ) : (dashboardQuery.data?.occupancy ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hostels yet. Add a hostel to start tracking occupancy.
              </p>
            ) : (
              <ul className="space-y-3">
                {dashboardQuery.data!.occupancy.map((row) => (
                  <OccupancyRowItem key={row.hostel_id} row={row} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-rose-500" />
              Overdue gatepasses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (dashboardQuery.data?.overdue_gatepasses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overdue gatepasses. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {dashboardQuery.data!.overdue_gatepasses.map((gp) => (
                  <OverdueGatepassRow
                    key={gp.id}
                    gp={gp}
                    hostelName={hostelNameById.get(gp.hostel_id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          href="/hostel/gatepasses"
          icon={ListChecks}
          title="Gatepasses"
          subtitle="Approve, monitor, close out"
        />
        <QuickLinkCard
          href="/hostel/visitors"
          icon={Users}
          title="Visitors"
          subtitle="Live + history"
          accent={
            dashboardQuery.data?.visitors_inside
              ? "emerald"
              : "default"
          }
          badge={
            dashboardQuery.data?.visitors_inside
              ? `${dashboardQuery.data.visitors_inside} inside`
              : undefined
          }
        />
        <QuickLinkCard
          href="/hostel/gatekeeper"
          icon={ChevronLeft}
          title="Gate operations"
          subtitle="Checkout / check-in"
        />
        <QuickLinkCard
          href="/hostel"
          icon={Building2}
          title="Manage hostels"
          subtitle="Rooms, beds, allocations"
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
  tone?: "default" | "emerald" | "amber" | "rose";
}) {
  const accent = {
    default: "",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-md bg-muted p-2">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-xl font-semibold tabular-nums", accent)}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function OccupancyRowItem({ row }: { row: OccupancyRow }) {
  const tone =
    row.occupancy_pct >= 100
      ? "bg-rose-500"
      : row.occupancy_pct >= 90
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <li className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <Link
          href={`/hostel/${row.hostel_id}`}
          className="font-medium hover:underline"
        >
          {row.hostel_name}
        </Link>
        <span className="tabular-nums text-muted-foreground">
          {row.active_allocations}/{row.total_beds} ·{" "}
          <span className="font-medium text-foreground">
            {row.occupancy_pct.toFixed(0)}%
          </span>{" "}
          · {row.vacant_beds} vacant
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          role="progressbar"
          aria-valuenow={row.occupancy_pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn("h-full transition-[width]", tone)}
          style={{ width: `${Math.min(row.occupancy_pct, 100)}%` }}
        />
      </div>
    </li>
  );
}

function OverdueGatepassRow({
  gp,
  hostelName,
}: {
  gp: HostelGatepass;
  hostelName?: string;
}) {
  return (
    <li className="rounded-md border border-rose-200 bg-rose-50/50 p-2 text-xs dark:border-rose-900/40 dark:bg-rose-950/20">
      <div className="flex items-center justify-between">
        <Link
          href={`/hostel/gatepasses/${gp.id}`}
          className="font-medium text-rose-900 hover:underline dark:text-rose-100"
        >
          {gp.student_id.slice(0, 8)}…
        </Link>
        <Badge variant="destructive">Overdue</Badge>
      </div>
      <p className="text-rose-900/80 dark:text-rose-200/80">
        Expected return{" "}
        {new Date(gp.expected_return_datetime).toLocaleString()}
      </p>
      {hostelName && (
        <p className="text-muted-foreground">{hostelName}</p>
      )}
    </li>
  );
}

function QuickLinkCard({
  href,
  icon: Icon,
  title,
  subtitle,
  accent = "default",
  badge,
}: {
  href: string;
  icon: typeof BedDouble;
  title: string;
  subtitle: string;
  accent?: "default" | "emerald";
  badge?: string;
}) {
  const accentBg = {
    default: "bg-muted",
    emerald:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40",
  }[accent];
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40",
        accentBg
      )}
    >
      <div className="rounded-md bg-background p-2">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {badge && <Badge variant="default">{badge}</Badge>}
      <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" />
    </Link>
  );
}
