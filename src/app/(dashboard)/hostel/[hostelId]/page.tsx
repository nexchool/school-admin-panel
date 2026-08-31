"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RoomTile } from "@/components/hostel/RoomTile";
import {
  HostelFormDialog,
  HostelFormValues,
} from "@/components/hostel/HostelFormDialog";
import {
  RoomFormDialog,
  RoomFormValues,
} from "@/components/hostel/RoomFormDialog";

import {
  useCreateRoom,
  useHostel,
  useDeleteHostel,
  useRooms,
  useUpdateHostel,
} from "@/hooks/useHostel";

import type { HostelRoom } from "@/services/hostelService";

/**
 * Screen 2 — Rooms grid for a single hostel.
 *
 * Layout:
 *   - Header: back link, hostel name, warden line, "Edit" / "Delete" /
 *     "Add room" CTAs.
 *   - Rooms grouped by `floor` (case-insensitive sort, "Ground Floor" wins).
 *   - Each group: responsive grid of square RoomTile components, 2-5 cols
 *     depending on viewport.
 *
 * Data:
 *   - useHostel(hostelId)            → name + warden info (header).
 *   - useRooms(hostelId)             → rooms list.
 *   - useRooms(hostelId)             → each room carries its occupied_count,
 *                                       counted on the server.
 */
export default function RoomsGridPage() {
  const params = useParams<{ hostelId: string }>();
  const hostelId = params.hostelId;
  const router = useRouter();

  const hostelQuery = useHostel(hostelId);
  const roomsQuery = useRooms(hostelId);
  const createRoom = useCreateRoom();
  const updateHostel = useUpdateHostel(hostelId);
  const deleteHostel = useDeleteHostel();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // room_id → beds currently taken. Counted on the server: fetching every
  // active allocation to tally them here sent hundreds of rows to render a
  // handful of numbers, and would count only the first page now that the
  // allocations endpoint is paged.
  const occupiedByRoomId = useMemo(() => {
    const map = new Map<string, number>();
    for (const room of roomsQuery.data ?? []) {
      map.set(room.id, room.occupied_count ?? 0);
    }
    return map;
  }, [roomsQuery.data]);

  // Rooms grouped by floor, with floor names ordered so "Ground Floor"
  // appears first and the rest sort alphabetically.
  const groupedRooms = useMemo(() => {
    const groups = new Map<string, HostelRoom[]>();
    for (const room of roomsQuery.data ?? []) {
      const key = room.floor || "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(room);
    }
    for (const list of groups.values()) {
      list.sort((a, b) =>
        a.room_number.localeCompare(b.room_number, undefined, {
          numeric: true,
        })
      );
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === b) return 0;
      // Pin "Ground Floor" first.
      if (/ground/i.test(a)) return -1;
      if (/ground/i.test(b)) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [roomsQuery.data]);

  async function handleCreate(values: RoomFormValues) {
    await createRoom.mutateAsync({
      hostel_id: hostelId,
      room_number: values.room_number,
      floor: values.floor,
      capacity: values.capacity,
    });
    setCreateOpen(false);
  }

  async function handleUpdateHostel(values: HostelFormValues) {
    // Empty maps to null, not undefined. This is a PATCH, so an omitted key
    // means "leave unchanged" — mapping blank to undefined (the way the create
    // handler does) would make a warden phone impossible to remove once set.
    await updateHostel.mutateAsync({
      name: values.name,
      capacity: values.capacity,
      warden_name: values.warden_name?.trim() || null,
      warden_phone: values.warden_phone?.trim() || null,
      address: values.address?.trim() || null,
    });
    setEditOpen(false);
  }

  async function handleDeleteHostel() {
    // Deliberately not caught: the server refuses with 409 while students are
    // still allocated, and ConfirmDialog keeps itself open when onConfirm
    // throws so the toast explaining why stays next to the button that failed.
    await deleteHostel.mutateAsync(hostelId);
    router.push("/hostel");
  }

  const isLoading = hostelQuery.isLoading || roomsQuery.isLoading;
  const isError = hostelQuery.isError || roomsQuery.isError;

  return (
    <div className="space-y-6">
      {/* Breadcrumb / header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/hostel"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All hostels
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {hostelQuery.data?.name ?? "Hostel"} ·{" "}
            <span className="text-muted-foreground">Rooms</span>
          </h1>
          {hostelQuery.data?.warden_name && (
            <p className="text-sm text-muted-foreground">
              Warden: {hostelQuery.data.warden_name}
              {hostelQuery.data.warden_phone
                ? ` · ${hostelQuery.data.warden_phone}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={!hostelQuery.data}
          >
            <Pencil className="mr-2 size-4" /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            disabled={!hostelQuery.data}
            aria-label="Delete hostel"
          >
            <Trash2 className="mr-2 size-4" /> Delete
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" /> Add room
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <LegendDot tone="emerald" label="Vacant beds" />
        <LegendDot tone="amber" label="Nearly full (≥75%)" />
        <LegendDot tone="rose" label="Full" />
        <LegendDot tone="zinc" label="Maintenance" />
      </div>

      {/* Content */}
      {isLoading ? (
        <RoomsGridSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-destructive">Failed to load rooms.</p>
            <Button
              variant="outline"
              onClick={() => {
                roomsQuery.refetch();
                hostelQuery.refetch();
              }}
              className="gap-2"
            >
              <RotateCcw className="size-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : groupedRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-lg font-medium">No rooms yet</p>
            <p className="text-sm text-muted-foreground">
              Add the first room to start tracking beds and allocations.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" /> Add room
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedRooms.map(([floor, rooms]) => (
            <section key={floor} className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {floor}
                <span className="ml-2 font-normal normal-case text-muted-foreground/80">
                  · {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {rooms.map((room) => (
                  <RoomTile
                    key={room.id}
                    room={room}
                    occupied={occupiedByRoomId.get(room.id) ?? 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <RoomFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        hostelName={hostelQuery.data?.name}
        onSubmit={handleCreate}
        saving={createRoom.isPending}
      />

      <HostelFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        defaultValues={hostelQuery.data}
        onSubmit={handleUpdateHostel}
        saving={updateHostel.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this hostel?"
        description={
          hostelQuery.data
            ? `${hostelQuery.data.name} and its rooms will no longer appear. Students still allocated must be checked out first.`
            : undefined
        }
        confirmLabel="Delete hostel"
        variant="destructive"
        onConfirm={handleDeleteHostel}
        loading={deleteHostel.isPending}
      />
    </div>
  );
}

function LegendDot({
  tone,
  label,
}: {
  tone: "emerald" | "amber" | "rose" | "zinc";
  label: string;
}) {
  const cls = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    zinc: "bg-zinc-400",
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${cls}`} aria-hidden />
      {label}
    </span>
  );
}

function RoomsGridSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square min-h-[120px] rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
