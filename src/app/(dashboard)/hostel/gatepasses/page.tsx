"use client";

import { useEffect, useState } from "react";
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
  useGatepassColumn,
  useRejectGatepass,
} from "@/hooks/useHostel";

import type { GatepassStatus, HostelGatepass } from "@/services/hostelService";

/**
 * Screen 7 — Gatepass kanban board.
 *
 * Columns (responsive horizontal scroll on small screens, stacked tabs
 * on mobile):
 *
 *   1. Pending   — needs warden approval (security guard calls parent first)
 *   2. Approved  — student hasn't left yet
 *   3. Active    — currently out
 *   4. Overdue   — never returned by expected time, system flagged
 *   5. Closed    — completed (closed / rejected)
 *
 * Each column is its own paged query rather than one download split five
 * ways. The first four are naturally small — a hostel has only so many
 * children out at once — but "closed" holds every gatepass the school has
 * ever issued, so it is paged and its header count comes from the server.
 *
 * Search runs on the server for the same reason: filtering in the browser
 * only ever searched the rows already downloaded.
 */

const COLUMNS: {
  key: string;
  label: string;
  /** Status values shown in this column (allows merging if needed). */
  statuses: GatepassStatus[];
  emptyHint: string;
  /** A warden works the pending queue from the oldest request. */
  oldest?: boolean;
}[] = [
  {
    key: "pending",
    label: "Pending",
    statuses: ["pending"],
    emptyHint: "No requests waiting.",
    oldest: true,
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

/** Actions each card offers, wired once and shared by every column. */
interface CardActions {
  busy: boolean;
  onApprove: (gp: HostelGatepass) => void;
  onReject: (gp: HostelGatepass) => void;
  onCheckout: (gp: HostelGatepass) => void;
  onCheckin: (gp: HostelGatepass) => void;
}

function GatepassColumn({
  column,
  search,
  actions,
}: {
  column: (typeof COLUMNS)[number];
  search: string;
  actions: CardActions;
}) {
  const query = useGatepassColumn(column.statuses, {
    search,
    oldest: column.oldest,
  });

  const rows = query.data?.pages.flatMap((page) => page.gatepasses) ?? [];
  // From the envelope, not `rows.length` — the closed column is paged, so
  // counting what is loaded would report the page size as the column total.
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <section
      className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/30 p-3 lg:w-80"
      aria-label={`${column.label} column`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          {column.label}
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {query.isLoading ? "…" : total}
        </Badge>
      </header>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {query.isLoading ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : query.isError ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-xs text-destructive">Failed to load.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => query.refetch()}
            >
              <RotateCcw className="size-3.5" /> Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-md border border-dashed bg-background/50 p-4 text-center text-xs text-muted-foreground">
            {search ? "No matches in this column." : column.emptyHint}
          </p>
        ) : (
          <>
            {rows.map((gp) => (
              <GatepassCard
                key={gp.id}
                gp={gp}
                actions={
                  <GatepassQuickActions
                    gp={gp}
                    busy={actions.busy}
                    // Errors are surfaced via the hook's meta.errorFallback
                    // + the global mutation cache toast.
                    onApprove={() => actions.onApprove(gp)}
                    onReject={() => actions.onReject(gp)}
                    onCheckout={() => actions.onCheckout(gp)}
                    onCheckin={() => actions.onCheckin(gp)}
                  />
                }
              />
            ))}

            {query.hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage
                  ? "Loading…"
                  : `Show more (${rows.length} of ${total})`}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function GatepassesKanbanPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Every keystroke would otherwise be five queries, one per column.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const approve = useApproveGatepass();
  const reject = useRejectGatepass();
  const checkout = useGatepassCheckout();
  const checkin = useGatepassCheckin();

  const actions: CardActions = {
    busy:
      approve.isPending ||
      reject.isPending ||
      checkout.isPending ||
      checkin.isPending,
    onApprove: (gp) => approve.mutate(gp.id),
    onReject: (gp) => {
      // null = Cancel → abort; "" = OK with empty → proceed.
      const input = window.prompt("Reason for rejection (optional):");
      if (input === null) return;
      reject.mutate({ id: gp.id, reason: input.trim() || undefined });
    },
    onCheckout: (gp) => checkout.mutate(gp.id),
    onCheckin: (gp) => checkin.mutate(gp.id),
  };

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
          placeholder="Search name, admission number, parent phone, reason…"
          className="pl-9"
        />
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <GatepassColumn
            key={col.key}
            column={col}
            search={appliedSearch}
            actions={actions}
          />
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ListFilter className="size-3.5" />
        Mobile users: swipe columns horizontally. On tablet and up, all columns
        are visible at once.
      </p>
    </div>
  );
}
