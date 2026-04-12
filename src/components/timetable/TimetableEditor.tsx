"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Plus, AlertTriangle } from "lucide-react";
import type { TimetableEntry, BellSchedulePeriod } from "@/types/timetable";

const DOW_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function fmtTime(t?: string | null) {
  if (!t) return "";
  return t.includes("T") ? (t.split("T")[1]?.slice(0, 5) ?? "") : t.slice(0, 5);
}

// ─── Draggable entry chip ─────────────────────────────────────────────────────

interface EntryChipProps {
  entry: TimetableEntry;
  isDragging?: boolean;
}

function EntryChip({ entry, isDragging }: EntryChipProps) {
  const hasConflict = (entry.conflict_flags?.length ?? 0) > 0;
  return (
    <div
      className={cn(
        "space-y-0.5 rounded px-1 py-0.5",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
          {entry.subject_name ?? "—"}
        </span>
        {hasConflict && <AlertTriangle className="mt-0.5 size-3 shrink-0 text-destructive" />}
      </div>
      {entry.teacher_name && (
        <div className="truncate text-[11px] text-muted-foreground">{entry.teacher_name}</div>
      )}
      {entry.room && (
        <div className="truncate text-[10px] text-muted-foreground/70">{entry.room}</div>
      )}
    </div>
  );
}

// ─── Draggable cell ───────────────────────────────────────────────────────────

interface DraggableCellProps {
  entry: TimetableEntry;
  onEdit: (entry: TimetableEntry) => void;
}

function DraggableCell({ entry, onEdit }: DraggableCellProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.id,
    data: { entry },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "min-h-[72px] cursor-grab select-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit(entry);
      }}
    >
      <EntryChip entry={entry} />
    </div>
  );
}

// ─── Droppable cell ───────────────────────────────────────────────────────────

interface DroppableCellProps {
  id: string;
  day: number;
  period: number;
  entry: TimetableEntry | null;
  onAdd: (day: number, period: number) => void;
  onEdit: (entry: TimetableEntry) => void;
  isOver?: boolean;
}

function DroppableCell({ id, day, period, entry, onAdd, onEdit }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { day, period } });
  const hasConflict = (entry?.conflict_flags?.length ?? 0) > 0;

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "border border-border align-top transition-colors",
        isOver
          ? "bg-primary/10 ring-2 ring-inset ring-primary/40"
          : entry
          ? hasConflict
            ? "bg-destructive/5"
            : "bg-card"
          : "bg-muted/10"
      )}
    >
      {entry ? (
        <DraggableCell entry={entry} onEdit={onEdit} />
      ) : (
        <button
          type="button"
          className="flex min-h-[72px] w-full items-center justify-center text-muted-foreground/30 hover:text-muted-foreground/60"
          onClick={() => onAdd(day, period)}
        >
          <Plus className="size-4" />
        </button>
      )}
    </td>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

interface Props {
  entries: TimetableEntry[];
  periods: BellSchedulePeriod[];
  workingDays: number[];
  onMove: (entryId: string, day: number, period: number) => void;
  onSwap: (entryAId: string, entryBId: string) => void;
  onAdd: (day: number, period: number) => void;
  onEdit: (entry: TimetableEntry) => void;
  busy?: boolean;
  className?: string;
}

export function TimetableEditor({
  entries,
  periods,
  workingDays,
  onMove,
  onSwap,
  onAdd,
  onEdit,
  busy,
  className,
}: Props) {
  const [activeEntry, setActiveEntry] = useState<TimetableEntry | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const cellMap = useMemo(() => {
    const m = new Map<string, TimetableEntry>();
    entries.forEach((e) => m.set(`${e.day_of_week}-${e.period_number}`, e));
    return m;
  }, [entries]);

  const handleDragStart = (event: DragStartEvent) => {
    const entry = (event.active.data.current as { entry: TimetableEntry })?.entry;
    setActiveEntry(entry ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);
    if (!event.over || !event.active.data.current) return;

    const srcEntry = (event.active.data.current as { entry: TimetableEntry }).entry;
    const { day, period } = event.over.data.current as { day: number; period: number };

    if (srcEntry.day_of_week === day && srcEntry.period_number === period) return;

    const targetEntry = cellMap.get(`${day}-${period}`);
    if (targetEntry) {
      onSwap(srcEntry.id, targetEntry.id);
    } else {
      onMove(srcEntry.id, day, period);
    }
  };

  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No bell schedule periods found. Configure a bell schedule first.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-x-auto", busy && "pointer-events-none opacity-60", className)}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-14 border border-border bg-muted/40 px-2 py-2 text-xs font-semibold text-muted-foreground" />
              {periods.map((p) => (
                <th
                  key={p.period_number}
                  className="min-w-[120px] border border-border bg-muted/40 px-3 py-2 text-center text-xs font-semibold text-muted-foreground"
                >
                  <div>{p.label ?? `P${p.period_number}`}</div>
                  {(p.starts_at || p.ends_at) && (
                    <div className="mt-0.5 font-normal text-muted-foreground/70">
                      {fmtTime(p.starts_at)}
                      {p.starts_at && p.ends_at ? "–" : ""}
                      {fmtTime(p.ends_at)}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workingDays.map((dow) => (
              <tr key={dow}>
                <td className="border border-border bg-muted/20 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                  {DOW_SHORT[dow] ?? `D${dow}`}
                </td>
                {periods.map((p) => {
                  const entry = cellMap.get(`${dow}-${p.period_number}`);
                  const cellId = `cell-${dow}-${p.period_number}`;
                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      day={dow}
                      period={p.period_number}
                      entry={entry ?? null}
                      onAdd={onAdd}
                      onEdit={onEdit}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <DragOverlay dropAnimation={null}>
          {activeEntry ? (
            <div className="w-[120px] rounded border border-primary/40 bg-card px-2 py-1.5 shadow-lg">
              <EntryChip entry={activeEntry} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="mt-2 text-[11px] text-muted-foreground/60">
        Drag cells to move or swap. Click + to add. Double-click a cell to edit.
      </p>
    </div>
  );
}
