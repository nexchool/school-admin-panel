"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw, RotateCcw, Search, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  VisitorCheckInForm,
} from "@/components/hostel/VisitorCheckInForm";
import {
  useVisitorCheckIn,
  useVisitorCheckOut,
  useVisitorLogs,
} from "@/hooks/useHostel";

import type { HostelVisitorLog } from "@/services/hostelService";

/**
 * Screen 5 — Visitor log.
 *
 * Top of page  : "Currently inside" live panel (auto-refresh every 30s).
 * Middle       : Quick-entry check-in form.
 * Bottom       : Historical visitor log with text filter.
 */
export default function VisitorsPage() {
  const [historyFilter, setHistoryFilter] = useState("");

  const insideQuery = useVisitorLogs({ open: true });
  const historyQuery = useVisitorLogs({ open: false });
  const checkIn = useVisitorCheckIn();
  const checkOut = useVisitorCheckOut();

  const filteredHistory = useMemo(() => {
    const all = historyQuery.data ?? [];
    const q = historyFilter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((l) => {
      const haystack = [
        l.purpose ?? "",
        l.student_id,
        l.visitor_id,
        l.check_in_at,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [historyQuery.data, historyFilter]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/hostel"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Hostels
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Visitors</h1>
        <p className="text-muted-foreground">
          Real-time view of who is currently inside the hostel, plus a check-in
          form and full visit history.
        </p>
      </div>

      {/* Currently inside */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="size-4 text-emerald-600" />
            Currently inside
            <Badge variant="default" className="ml-2 tabular-nums">
              {insideQuery.data?.length ?? 0}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insideQuery.refetch()}
            disabled={insideQuery.isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`size-3.5 ${insideQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {insideQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : insideQuery.isError ? (
            <div className="flex flex-col items-start gap-2 text-sm text-destructive">
              <span>Failed to load.</span>
              <Button size="sm" variant="outline" onClick={() => insideQuery.refetch()}>
                <RotateCcw className="mr-2 size-3" />
                Retry
              </Button>
            </div>
          ) : (insideQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No visitors are currently inside.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insideQuery.data!.map((log) => (
                <CurrentlyInsideCard
                  key={log.id}
                  log={log}
                  onCheckOut={async () => {
                    if (window.confirm("Mark this visitor as checked out?")) {
                      await checkOut.mutateAsync(log.id);
                    }
                  }}
                  checkingOut={checkOut.isPending}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Check-in form */}
      <VisitorCheckInForm
        saving={checkIn.isPending}
        onSubmit={async (input) => {
          await checkIn.mutateAsync(input);
        }}
      />

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3 sm:items-center">
          <CardTitle className="text-base">Visit history</CardTitle>
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              placeholder="Filter purpose / student…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : historyQuery.isError ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-destructive">Failed to load history.</p>
              <Button size="sm" variant="outline" onClick={() => historyQuery.refetch()}>
                <RotateCcw className="mr-2 size-3" /> Retry
              </Button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {historyFilter ? "No visits match your filter." : "No past visits."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Check-in</th>
                    <th className="px-4 py-2 font-medium">Check-out</th>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Purpose</th>
                    <th className="px-4 py-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2 tabular-nums">
                        {new Date(row.check_in_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {row.check_out_at
                          ? new Date(row.check_out_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/hostel/students/${row.student_id}`}
                          className="text-primary hover:underline"
                        >
                          {row.student_name || `${row.student_id.slice(0, 8)}…`}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{row.purpose ?? "—"}</td>
                      <td className="px-4 py-2 tabular-nums">
                        {formatDuration(row.check_in_at, row.check_out_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CurrentlyInsideCard({
  log,
  onCheckOut,
  checkingOut,
}: {
  log: HostelVisitorLog;
  onCheckOut: () => void | Promise<void>;
  checkingOut: boolean;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {log.visitor_name || log.purpose || "Visit"}
        </p>
        <Badge variant="default">Inside</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Since {new Date(log.check_in_at).toLocaleTimeString()}{" "}
        ({formatDuration(log.check_in_at)})
      </p>
      <p className="text-xs text-muted-foreground">
        Student:{" "}
        <Link
          href={`/hostel/students/${log.student_id}`}
          className="text-primary hover:underline"
        >
          {log.student_name || `${log.student_id.slice(0, 8)}…`}
        </Link>
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onCheckOut}
        disabled={checkingOut}
        className="mt-1 self-start"
      >
        {checkingOut ? "Checking out…" : "Check out"}
      </Button>
    </li>
  );
}

function formatDuration(start: string, end?: string | null): string {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const minutes = Math.max(Math.round((endMs - startMs) / 60000), 0);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
