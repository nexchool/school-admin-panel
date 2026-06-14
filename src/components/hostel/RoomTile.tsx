"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

import type { HostelRoom } from "@/services/hostelService";

type RoomTileProps = {
  room: HostelRoom;
  /** Number of active allocations on this room (resolved by parent). */
  occupied: number;
};

/**
 * Modern room tile for the rooms grid: a clean surface card with a status dot,
 * the room number, floor, and an occupancy progress bar. The state colour is an
 * accent (dot + bar + label) rather than a full background fill, so the grid
 * reads calmly and the bars give occupancy at a glance.
 *
 * State:
 *   - status='maintenance' → zinc + wrench (overrides occupancy colour)
 *   - occupied === capacity → rose ("Full")
 *   - occupancy ≥ 0.75      → amber ("N free")
 *   - otherwise             → emerald ("N free")
 */
export function RoomTile({ room, occupied }: RoomTileProps) {
  const capacity = Math.max(room.capacity, 0);
  const safeOccupied = Math.max(Math.min(occupied, capacity || occupied), 0);
  const ratio = capacity === 0 ? 0 : safeOccupied / capacity;
  const free = Math.max(capacity - safeOccupied, 0);
  const isMaintenance = room.status === "maintenance";

  // Single per-state palette so dot, bar, hover border and label stay in sync.
  const palette = isMaintenance
    ? {
        dot: "bg-zinc-400",
        bar: "bg-zinc-400",
        hover: "hover:border-zinc-300 dark:hover:border-zinc-600",
        label: "Maintenance",
        labelColor: "text-zinc-500 dark:text-zinc-400",
      }
    : ratio >= 1
      ? {
          dot: "bg-rose-500",
          bar: "bg-rose-500",
          hover: "hover:border-rose-300 dark:hover:border-rose-800",
          label: "Full",
          labelColor: "text-rose-600 dark:text-rose-400",
        }
      : ratio >= 0.75
        ? {
            dot: "bg-amber-500",
            bar: "bg-amber-500",
            hover: "hover:border-amber-300 dark:hover:border-amber-800",
            label: `${free} free`,
            labelColor: "text-amber-600 dark:text-amber-400",
          }
        : {
            dot: "bg-emerald-500",
            bar: "bg-emerald-500",
            hover: "hover:border-emerald-300 dark:hover:border-emerald-800",
            label: `${free} free`,
            labelColor: "text-emerald-600 dark:text-emerald-400",
          };

  return (
    <Link
      href={`/hostel/rooms/${room.id}`}
      aria-label={`Room ${room.room_number}, ${safeOccupied} of ${capacity} beds occupied${
        isMaintenance ? ", under maintenance" : ""
      }`}
      className={cn(
        "group relative flex aspect-square min-h-[140px] flex-col rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        palette.hover,
        isMaintenance && "opacity-95",
      )}
    >
      {/* Top: status dot + label + maintenance icon */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", palette.dot)} aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Room
          </span>
        </span>
        {isMaintenance && (
          <Wrench className="size-3.5 text-muted-foreground" aria-hidden />
        )}
      </div>

      {/* Room number + floor */}
      <div className="mt-1 flex flex-1 flex-col justify-center">
        <span className="text-3xl font-bold leading-none tabular-nums">
          {room.room_number}
        </span>
        {room.floor && (
          <span className="mt-1 truncate text-xs text-muted-foreground">
            {room.floor}
          </span>
        )}
      </div>

      {/* Occupancy bar + counts */}
      <div className="space-y-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", palette.bar)}
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold tabular-nums">
            {safeOccupied}
            <span className="text-muted-foreground">/{capacity}</span>
          </span>
          <span className={cn("font-medium", palette.labelColor)}>
            {palette.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
