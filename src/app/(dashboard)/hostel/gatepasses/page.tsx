"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ListFilter,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  GatepassCard,
  GatepassQuickActions,
} from "@/components/hostel/GatepassCard";
import {
  useApproveGatepass,
  useGatepassCheckin,
  useGatepassCheckout,
  useGatepasses,
  useRejectGatepass,
} from "@/hooks/useHostel";

import type { HostelGatepass } from "@/services/hostelService";

/**
 * Screen 7 — Gatepass kanban board.
 *
 * Columns (responsive horizontal scroll on small screens, stacked tabs
 * on mobile):
 *
 *   1. Pending   — needs warden approval (security guard calls parent first)
 *   2. Approved  — student hasn't left yet
 *   3. Active    — currently out
 *   4. Closed    — completed (closed / rejected)
 *   5. Overdue   — never returned by expected time, system flagged
 *
 * Each card surfaces the actions appropriate for its column.
 */

const COLUMNS: {
  key: string;
  label: string;
  /** Status values shown in this column (allows merging if needed). */
  statuses: HostelGatepass["status"][];
  emptyHint: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    statuses: ["pending"],
    emptyHint: "No requests waiting.",
  },
  {
    key: "approved",
    label: "Approved",
    statuses: ["approved"],
    emptyHint: "No approved gatepasses awaiting checkout.",
  },
  {
    key: "active",
    label: "Active",
    statuses: ["active"],
    emptyHint: "Nobody is currently out.",
  },
  {
    key: "overdue",
    label: "Overdue",
    statuses: ["overdue"],
    emptyHint: "No overdue gatepasses.",
  },
  {
    key: "closed",
    label: "Closed",
    statuses: ["closed", "rejected"],
    emptyHint: "No closed gatepasses to show.",
  },
];

export default function GatepassesKanbanPage() {
  const [search, setSearch] = useState("");

  const gatepassesQuery = useGatepasses();
  const approve = useApproveGatepass();
  const reject = useRejectGatepass();
  const checkout = useGatepassCheckout();
  const checkin = useGatepassCheckin();

  const filteredByColumn = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = gatepassesQuery.data ?? [];
    const matches = (gp: HostelGatepass) =>
      !term ||
      [gp.student_id, gp.parent_phone, gp.reason ?? "", gp.type]
        .join(" ")
        .toLowerCase()
        .includes(term);

    return COLUMNS.map((col) => ({
      ...col,
      rows: all
        .filter((gp) => col.statuses.includes(gp.status) && matches(gp))
        .sort((a, b) => {
          // For pending, oldest-first so wardens process the oldest.
          if (col.key === "pending") {
            return (
              new Date(a.requested_at).getTime() -
              new Date(b.requested_at).getTime()
            );
          }
          // Otherwise newest-first.
          return (
            new Date(b.requested_at).getTime() -
            new Date(a.requested_at).getTime()
          );
        }),
    }));
  }, [gatepassesQuery.data, search]);

  const busy =
    approve.isPending ||
    reject.isPending ||
    checkout.isPending ||
    checkin.isPending;

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
          <h1 className="text-2xl font-semibold tracking-tight">Gatepasses</h1>
          <p className="text-muted-foreground">
            Approve, monitor, and close out student gatepasses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/hostel/gatepasses/create">
              <Plus className="mr-2 size-4" /> New gatepass
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by student, parent phone, reason…"
          className="pl-9"
        />
      </div>

      {/* Content */}
      {gatepassesQuery.isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <Skeleton key={col.key} className="h-96 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : gatepassesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-destructive">Failed to load gatepasses.</p>
            <Button
              variant="outline"
              onClick={() => gatepassesQuery.refetch()}
              className="gap-2"
            >
              <RotateCcw className="size-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {filteredByColumn.map((col) => (
            <section
              key={col.key}
              className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/30 p-3 lg:w-80"
              aria-label={`${col.label} column`}
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {col.label}
                </h2>
                <Badge variant="secondary" className="tabular-nums">
                  {col.rows.length}
                </Badge>
              </header>
              <div className="flex flex-col gap-3 overflow-y-auto">
                {col.rows.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-background/50 p-4 text-center text-xs text-muted-foreground">
                    {col.emptyHint}
                  </p>
                ) : (
                  col.rows.map((gp) => (
                    <GatepassCard
                      key={gp.id}
                      gp={gp}
                      actions={
                        <GatepassQuickActions
                          gp={gp}
                          busy={busy}
                          // Errors are surfaced via the hook's meta.errorFallback
                          // + the global mutation cache toast.
                          onApprove={() => approve.mutate(gp.id)}
                          onReject={() => {
                            // null = Cancel → abort; "" = OK with empty → proceed.
                            const input = window.prompt(
                              "Reason for rejection (optional):"
                            );
                            if (input === null) return;
                            reject.mutate({ id: gp.id, reason: input.trim() || undefined });
                          }}
                          onCheckout={() => checkout.mutate(gp.id)}
                          onCheckin={() => checkin.mutate(gp.id)}
                        />
                      }
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ListFilter className="size-3.5" />
        Mobile users: swipe columns horizontally. On tablet and up, all columns
        are visible at once.
      </p>
    </div>
  );
}
