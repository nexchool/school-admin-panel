"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { transportService, type TransportGlobalStop, type TransportStop } from "@/services/transportService";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type StopRow = TransportGlobalStop | TransportStop;

function groupByArea(stops: StopRow[]): [string, StopRow[]][] {
  const m = new Map<string, StopRow[]>();
  for (const s of stops) {
    const a = (s as TransportGlobalStop).area?.trim() || "Other";
    if (!m.has(a)) m.set(a, []);
    m.get(a)!.push(s);
  }
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export function StopSearchSelect({
  routeId,
  value,
  onChange,
  disabled,
  placeholder = "Select stop…",
  className,
  excludeIds,
}: {
  routeId?: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Hide these stop ids from the list (e.g. already on the route). */
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: stops = [], isLoading } = useQuery({
    queryKey: ["transport", "stop-search", routeId ?? "global"],
    queryFn: () =>
      routeId
        ? transportService.listStops(routeId, true)
        : transportService.listGlobalStops({ withUsage: false, includeInactive: true }),
  });

  const filtered = useMemo(() => {
    const ex = new Set(excludeIds ?? []);
    let list = stops.filter((s) => !ex.has(s.id));
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((s) => {
      const g = s as TransportGlobalStop;
      return (
        s.name.toLowerCase().includes(t) ||
        (g.area && g.area.toLowerCase().includes(t)) ||
        (g.landmark && g.landmark.toLowerCase().includes(t))
      );
    });
  }, [stops, q, excludeIds]);

  const groups = useMemo(() => groupByArea(filtered), [filtered]);

  const selected = stops.find((s) => s.id === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          <span className="truncate text-left">
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            placeholder="Search name, area…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">Loading…</div>
          ) : groups.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">No stops</div>
          ) : (
            groups.map(([area, list], gi) => (
              <div key={area}>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {area}
                </DropdownMenuLabel>
                {list.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="cursor-pointer"
                    onSelect={() => {
                      onChange(s.id);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span>{s.name}</span>
                      {(s as TransportGlobalStop).landmark ? (
                        <span className="text-xs text-muted-foreground">
                          {(s as TransportGlobalStop).landmark}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuItem>
                ))}
                {gi < groups.length - 1 ? <DropdownMenuSeparator /> : null}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
