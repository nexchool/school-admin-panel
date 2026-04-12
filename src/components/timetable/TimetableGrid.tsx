"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { TimetableEntry, BellSchedulePeriod } from "@/types/timetable";

const DOW_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function fmtTime(t?: string | null) {
  if (!t) return "";
  return t.includes("T") ? (t.split("T")[1]?.slice(0, 5) ?? "") : t.slice(0, 5);
}

interface Props {
  entries: TimetableEntry[];
  periods: BellSchedulePeriod[];
  workingDays: number[];
  /** If provided, renders each non-empty cell as clickable. */
  onCellClick?: (entry: TimetableEntry | null, day: number, period: number) => void;
  readOnly?: boolean;
  className?: string;
}

export function TimetableGrid({ entries, periods, workingDays, onCellClick, readOnly, className }: Props) {
  const cellMap = useMemo(() => {
    const m = new Map<string, TimetableEntry>();
    entries.forEach((e) => m.set(`${e.day_of_week}-${e.period_number}`, e));
    return m;
  }, [entries]);

  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No bell schedule configured. Set a bell schedule on this version.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-14 border border-border bg-muted/40 px-2 py-2 text-xs font-semibold text-muted-foreground" />
            {periods.map((p) => (
              <th
                key={p.period_number}
                className="min-w-[110px] border border-border bg-muted/40 px-3 py-2 text-center text-xs font-semibold text-muted-foreground"
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
                const hasConflict = (entry?.conflict_flags?.length ?? 0) > 0;
                const isClickable = !readOnly && !!onCellClick;

                return (
                  <td
                    key={p.period_number}
                    className={cn(
                      "border border-border align-top",
                      isClickable && "cursor-pointer",
                      entry
                        ? hasConflict
                          ? "bg-destructive/5 hover:bg-destructive/10"
                          : "bg-card hover:bg-muted/30"
                        : "bg-muted/10 hover:bg-muted/20"
                    )}
                    onClick={() => isClickable && onCellClick?.(entry ?? null, dow, p.period_number)}
                  >
                    {entry ? (
                      <div className="min-h-[72px] space-y-0.5 p-2">
                        <div className="flex items-start justify-between gap-1">
                          <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                            {entry.subject_name ?? "—"}
                          </span>
                          {hasConflict && (
                            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-destructive" />
                          )}
                        </div>
                        {entry.teacher_name && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {entry.teacher_name}
                          </div>
                        )}
                        {entry.room && (
                          <div className="truncate text-[10px] text-muted-foreground/70">
                            {entry.room}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="min-h-[72px]" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
