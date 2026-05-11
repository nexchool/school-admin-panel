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
 * Big, tap-friendly tile representing a single room on the rooms grid.
 *
 * Color rules (matches the design mockup):
 *   - status='maintenance'  → grey  + wrench icon (overrides capacity-based color)
 *   - occupied === capacity → red   (full)
 *   - occupied / capacity ≥ 0.75 → amber (nearing full)
 *   - otherwise             → green (vacancy available)
 */
export function RoomTile({ room, occupied }: RoomTileProps) {
  const capacity = Math.max(room.capacity, 0);
  const ratio = capacity === 0 ? 0 : occupied / capacity;
  const isMaintenance = room.status === "maintenance";

  // Background + text color per state. Light/dark variants so the tile
  // reads well in both themes.
  let tone: string;
  if (isMaintenance) {
    tone =
      "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60";
  } else if (ratio >= 1) {
    tone =
      "border-rose-300 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:hover:bg-rose-950/50";
  } else if (ratio >= 0.75) {
    tone =
      "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:hover:bg-amber-950/50";
  } else {
    tone =
      "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50";
  }

  return (
    <Link
      href={`/hostel/rooms/${room.id}`}
      aria-label={`Room ${room.room_number}, ${occupied} of ${capacity} beds occupied${
        isMaintenance ? ", under maintenance" : ""
      }`}
      className={cn(
        "group relative flex aspect-square min-h-[120px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        tone
      )}
    >
      {isMaintenance && (
        <Wrench
          className="absolute right-2 top-2 size-4 text-muted-foreground"
          aria-hidden
        />
      )}

      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        Room
      </span>
      <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
        {room.room_number}
      </span>
      <span className="text-sm font-medium tabular-nums">
        {occupied}/{capacity}
      </span>
      {isMaintenance && (
        <span className="text-xs font-medium text-muted-foreground">
          Maintenance
        </span>
      )}
    </Link>
  );
}
