"use client";

import Link from "next/link";
import { AlertTriangle, Building2, BedDouble, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Hostel } from "@/services/hostelService";

type OccupancySummary = {
  total_beds: number;
  active_allocations: number;
  vacant_beds: number;
  occupancy_pct: number;
};

type HostelCardProps = {
  hostel: Hostel;
  occupancy?: OccupancySummary;
  overdueCount?: number;
  onManage?: () => void;
};

/**
 * Compact summary card for a single hostel.
 *
 * Color semantics for the occupancy bar:
 *  - < 90%  → green (room to spare)
 *  - 90-99% → amber (almost full)
 *  - = 100% → red   (no vacant beds)
 *
 * `overdueCount > 0` shows an alert badge so wardens can spot trouble
 * from the overview page itself.
 */
export function HostelCard({
  hostel,
  occupancy,
  overdueCount = 0,
  onManage,
}: HostelCardProps) {
  const pct = occupancy?.occupancy_pct ?? 0;
  const totalBeds = occupancy?.total_beds ?? hostel.capacity;
  const occupied = occupancy?.active_allocations ?? 0;
  const vacant = occupancy?.vacant_beds ?? Math.max(totalBeds - occupied, 0);

  const occupancyColor =
    pct >= 100
      ? "bg-rose-500"
      : pct >= 90
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 className="size-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{hostel.name}</CardTitle>
              {hostel.address && (
                <p className="text-sm text-muted-foreground truncate">
                  {hostel.address}
                </p>
              )}
            </div>
          </div>
          {hostel.status !== "active" && (
            <Badge variant="secondary" className="capitalize shrink-0">
              {hostel.status}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {/* Occupancy bar */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Occupancy</span>
            <span className="font-medium tabular-nums">
              {occupied}/{totalBeds} ({pct.toFixed(0)}%)
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className={cn(
                "h-full transition-[width] duration-300",
                occupancyColor
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1 text-muted-foreground">
              <BedDouble className="size-3.5" /> Vacant
            </dt>
            <dd className="font-semibold tabular-nums">{vacant}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-muted-foreground">
              <Users className="size-3.5" /> Residents
            </dt>
            <dd className="font-semibold tabular-nums">{occupied}</dd>
          </div>
        </dl>

        {/* Alerts */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              {overdueCount} overdue {overdueCount === 1 ? "gatepass" : "gatepasses"}
            </span>
          </div>
        )}
        {overdueCount === 0 && (
          <p className="text-sm text-muted-foreground">No active alerts.</p>
        )}

        {/* Action */}
        <Button asChild variant="default" className="mt-auto" onClick={onManage}>
          <Link href={`/hostel/${hostel.id}`}>Manage</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
