"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, BedDouble, Plus, RotateCcw, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  AllocationDialog,
  AllocationFormValues,
} from "@/components/hostel/AllocationDialog";

import {
  useAllocations,
  useCheckoutAllocation,
  useCreateAllocation,
  useCreateBed,
  useHostel,
  useRoom,
} from "@/hooks/useHostel";

import type { HostelAllocation, HostelBed } from "@/services/hostelService";

/**
 * Screen 3 — Room Detail.
 *
 * Sections:
 *   1. Room header (number, floor, capacity, status, edit button later).
 *   2. Bed layout: one card per bed; occupied beds show occupant info +
 *      Checkout; vacant beds show an Allocate button.
 *   3. Allocation history table (active first, then completed).
 */
export default function RoomDetailPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const roomQuery = useRoom(roomId);
  const room = roomQuery.data?.room;
  const beds = roomQuery.data?.beds ?? [];

  // Hostel name/warden + back-link target.
  const hostelQuery = useHostel(room?.hostel_id);

  // Allocations for this room — used for the history table; active rows
  // also drive the per-bed "Checkout" button.
  const allocationsQuery = useAllocations({
    room_id: roomId,
  });

  const activeAllocationsByBedId = useMemo(() => {
    const map = new Map<string, HostelAllocation>();
    for (const a of allocationsQuery.data ?? []) {
      if (a.status === "active" && !a.deleted_at) {
        map.set(a.bed_id, a);
      }
    }
    return map;
  }, [allocationsQuery.data]);

  // Sorted history rows: active first (most recent check_in), then completed.
  const historyRows = useMemo(() => {
    const rows = [...(allocationsQuery.data ?? [])];
    rows.sort((a, b) => {
      // Active rows first
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return (
        new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
      );
    });
    return rows;
  }, [allocationsQuery.data]);

  // ---- Dialog state ----
  const [allocateBed, setAllocateBed] = useState<HostelBed | null>(null);
  const createAllocation = useCreateAllocation();
  const checkoutAllocation = useCheckoutAllocation();
  const createBed = useCreateBed(roomId);
  const [adding, setAdding] = useState(false);

  async function handleAllocate(values: AllocationFormValues) {
    if (!allocateBed || !room) return;
    await createAllocation.mutateAsync({
      student_id: values.student_id,
      hostel_id: room.hostel_id,
      room_id: room.id,
      bed_id: allocateBed.id,
      check_in_at: values.check_in_at,
      notes: values.notes?.trim() || null,
    });
    setAllocateBed(null);
  }

  async function handleAddBed() {
    if (!room) return;
    setAdding(true);
    try {
      // Auto-generate a bed_number: next free letter slot (A1, A2, ...).
      const used = new Set(beds.map((b) => b.bed_number));
      let next = "A1";
      let i = 1;
      while (used.has(next)) {
        i += 1;
        next = `A${i}`;
      }
      await createBed.mutateAsync({
        room_id: room.id,
        bed_number: next,
      });
    } finally {
      setAdding(false);
    }
  }

  const isLoading = roomQuery.isLoading;
  const isError = roomQuery.isError;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {room && (
            <Link
              href={`/hostel/${room.hostel_id}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />{" "}
              {hostelQuery.data?.name ?? "Hostel"} · Rooms
            </Link>
          )}
          {room ? (
            <h1 className="text-2xl font-semibold tracking-tight">
              Room {room.room_number}
              <span className="ml-3 text-base font-normal text-muted-foreground">
                {room.floor}
              </span>
            </h1>
          ) : (
            <Skeleton className="h-7 w-44" />
          )}
          {room && room.status !== "active" && (
            <Badge variant="secondary" className="capitalize">
              <Wrench className="mr-1 size-3" /> {room.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAddBed}
            disabled={!room || adding || createBed.isPending}
          >
            <Plus className="mr-2 size-4" />
            {adding || createBed.isPending ? "Adding bed…" : "Add bed"}
          </Button>
        </div>
      </div>

      {/* Room summary stats */}
      {room && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <Stat label="Capacity" value={room.capacity} />
            <Stat
              label="Occupied"
              value={activeAllocationsByBedId.size}
              accent={activeAllocationsByBedId.size === room.capacity ? "rose" : "default"}
            />
            <Stat
              label="Vacant"
              value={Math.max(room.capacity - activeAllocationsByBedId.size, 0)}
              accent="emerald"
            />
            <Stat label="Beds configured" value={beds.length} />
          </CardContent>
        </Card>
      )}

      {/* Bed layout */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Bed layout
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-destructive">Failed to load room.</p>
              <Button
                variant="outline"
                onClick={() => roomQuery.refetch()}
                className="gap-2"
              >
                <RotateCcw className="size-4" /> Retry
              </Button>
            </CardContent>
          </Card>
        ) : beds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <BedDouble className="size-10 text-muted-foreground" />
              <p className="text-lg font-medium">No beds in this room</p>
              <p className="text-sm text-muted-foreground">
                Add at least one bed to begin allocating students.
              </p>
              <Button onClick={handleAddBed} disabled={adding}>
                <Plus className="mr-2 size-4" /> Add bed
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {beds
              .slice()
              .sort((a, b) =>
                a.bed_number.localeCompare(b.bed_number, undefined, {
                  numeric: true,
                })
              )
              .map((bed) => {
                const allocation = activeAllocationsByBedId.get(bed.id);
                const occupant = bed.occupant ?? null;
                return (
                  <BedCard
                    key={bed.id}
                    bed={bed}
                    occupantName={occupant?.name ?? null}
                    occupantAdmission={occupant?.admission_number ?? null}
                    occupantStudentId={occupant?.student_id ?? null}
                    onAllocate={() => setAllocateBed(bed)}
                    onCheckout={
                      allocation
                        ? async () => {
                            if (
                              window.confirm(
                                "Check out this student? This frees the bed and ends the current allocation."
                              )
                            ) {
                              await checkoutAllocation.mutateAsync(
                                allocation.id
                              );
                            }
                          }
                        : undefined
                    }
                    checkingOut={checkoutAllocation.isPending}
                  />
                );
              })}
          </div>
        )}
      </section>

      {/* Allocation history */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Allocation history
        </h2>

        {allocationsQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : historyRows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No allocations recorded for this room yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Bed</th>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Check-in</th>
                    <th className="px-4 py-2 font-medium">Check-out</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => {
                    const bed = beds.find((b) => b.id === row.bed_id);
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-2 tabular-nums">
                          {bed?.bed_number ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/hostel/students/${row.student_id}`}
                            className="text-primary hover:underline"
                          >
                            {row.student_id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="px-4 py-2 tabular-nums">
                          {new Date(row.check_in_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 tabular-nums">
                          {row.check_out_at
                            ? new Date(row.check_out_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant={
                              row.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <AllocationDialog
        open={Boolean(allocateBed)}
        onOpenChange={(open) => !open && setAllocateBed(null)}
        bedLabel={allocateBed ? `Bed ${allocateBed.bed_number}` : ""}
        roomLabel={room ? `Room ${room.room_number}` : undefined}
        hostelName={hostelQuery.data?.name}
        onSubmit={handleAllocate}
        saving={createAllocation.isPending}
      />
    </div>
  );
}

/** Single bed card — occupied or vacant. */
function BedCard({
  bed,
  occupantName,
  occupantAdmission,
  occupantStudentId,
  onAllocate,
  onCheckout,
  checkingOut,
}: {
  bed: HostelBed;
  occupantName: string | null;
  occupantAdmission: string | null;
  occupantStudentId: string | null;
  onAllocate: () => void;
  onCheckout?: () => void | Promise<void>;
  checkingOut?: boolean;
}) {
  const isMaintenance = bed.status === "maintenance";
  const isAllocated = Boolean(occupantName) || bed.is_allocated;

  return (
    <Card
      className={cn(
        "flex flex-col",
        isMaintenance && "bg-muted/40",
        !isMaintenance && isAllocated && "border-primary/40"
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BedDouble className="size-4 text-muted-foreground" />
          Bed {bed.bed_number}
          {isMaintenance && (
            <Badge variant="secondary" className="ml-auto capitalize">
              <Wrench className="mr-1 size-3" /> Maintenance
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3">
        {isMaintenance ? (
          <p className="text-sm text-muted-foreground">
            This bed is currently out of service.
          </p>
        ) : isAllocated ? (
          <>
            <div className="space-y-0.5">
              <div className="font-medium">{occupantName ?? "Occupied"}</div>
              {occupantAdmission && (
                <div className="text-xs text-muted-foreground">
                  {occupantAdmission}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {occupantStudentId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/hostel/students/${occupantStudentId}`}>
                    View student
                  </Link>
                </Button>
              )}
              {onCheckout && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Checking out…" : "Check out"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Vacant</p>
            <Button size="sm" onClick={onAllocate} className="self-start">
              <Plus className="mr-2 size-4" /> Allocate
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: number | string;
  accent?: "default" | "emerald" | "rose";
}) {
  const color = {
    default: "text-foreground",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[accent];
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}
