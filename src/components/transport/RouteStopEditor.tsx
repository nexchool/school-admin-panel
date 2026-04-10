"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transportService, type TransportStop } from "@/services/transportService";
import { StopSearchSelect } from "./StopSearchSelect";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

function sortBySeq(st: TransportStop[]) {
  return st.slice().sort((a, b) => a.sequence_order - b.sequence_order);
}

export function RouteStopEditor({ routeId, stops }: { routeId: string; stops: TransportStop[] }) {
  const qc = useQueryClient();
  const [items, setItems] = useState<TransportStop[]>([]);
  const [dragIx, setDragIx] = useState<number | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    setItems(sortBySeq(stops));
  }, [stops]);

  const persist = async (next: TransportStop[]) => {
    if (next.length < 1) {
      toast.error("Route must have at least one stop");
      return;
    }
    await transportService.syncRouteStops(routeId, {
      stops: next.map((s, i) => ({
        stop_id: s.id,
        sequence_order: i + 1,
        pickup_time: s.pickup_time || undefined,
        drop_time: s.drop_time || undefined,
      })),
    });
    qc.invalidateQueries({ queryKey: ["transport", "route", routeId] });
    qc.invalidateQueries({ queryKey: ["transport", "routes"] });
    qc.invalidateQueries({ queryKey: ["transport", "global-stops"] });
    qc.invalidateQueries({ queryKey: ["transport", "stop-search"] });
    toast.success("Stops updated");
  };

  const move = (ix: number, dir: -1 | 1) => {
    const j = ix + dir;
    if (j < 0 || j >= items.length) return;
    const n = items.slice();
    [n[ix], n[j]] = [n[j], n[ix]];
    const withSeq = n.map((row, i) => ({ ...row, sequence_order: i + 1 }));
    setItems(withSeq);
    void persist(withSeq);
  };

  const updateTime = (ix: number, field: "pickup_time" | "drop_time", value: string) => {
    const n = items.map((row, i) =>
      i === ix ? { ...row, [field]: value.trim() || null } : row
    );
    setItems(n);
    void persist(n);
  };

  const removeRow = (ix: number) => {
    if (items.length <= 1) {
      toast.error("Route must have at least one stop");
      return;
    }
    const n = items.filter((_, i) => i !== ix);
    setItems(n);
    void persist(n);
  };

  const addExisting = async (stopId: string | null) => {
    if (!stopId) return;
    if (items.some((s) => s.id === stopId)) {
      toast.error("Stop already on this route");
      return;
    }
    try {
      const g = await transportService.getGlobalStop(stopId);
      const row: TransportStop = {
        id: g.id,
        name: g.name,
        sequence_order: items.length + 1,
        pickup_time: null,
        drop_time: null,
        is_active: g.is_active,
        area: g.area,
        landmark: g.landmark,
      };
      const n = [...items, row];
      setItems(n);
      setPickerKey((k) => k + 1);
      await persist(n);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not add stop");
    }
  };

  const onDragStart = (ix: number) => setDragIx(ix);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (to: number) => {
    if (dragIx === null || dragIx === to) {
      setDragIx(null);
      return;
    }
    const n = items.slice();
    const [row] = n.splice(dragIx, 1);
    n.splice(to, 0, row);
    const withSeq = n.map((r, i) => ({ ...r, sequence_order: i + 1 }));
    setItems(withSeq);
    setDragIx(null);
    void persist(withSeq);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Add existing stop from master</Label>
          <StopSearchSelect
            key={pickerKey}
            value={null}
            onChange={(id) => void addExisting(id)}
            excludeIds={items.map((s) => s.id)}
            placeholder="Pick a stop to add…"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="w-8 px-1" />
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Area</th>
              <th className="px-2 py-2 font-medium">Pickup</th>
              <th className="px-2 py-2 font-medium">Drop</th>
              <th className="px-2 py-2 font-medium">Order</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.map((s, ix) => (
              <tr
                key={s.id}
                className="border-b border-border/60"
                draggable
                onDragStart={() => onDragStart(ix)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(ix)}
              >
                <td className="px-1 py-1 text-muted-foreground">
                  <GripVertical className="size-4 cursor-grab" aria-hidden />
                </td>
                <td className="px-2 py-2 tabular-nums">{ix + 1}</td>
                <td className="px-2 py-2 font-medium">{s.name}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.area ?? "—"}</td>
                <td className="px-2 py-2">
                  <Input
                    className="h-8 min-w-[5.5rem]"
                    placeholder="HH:MM"
                    defaultValue={s.pickup_time ?? ""}
                    key={`${s.id}-pu-${s.pickup_time}`}
                    onBlur={(e) => updateTime(ix, "pickup_time", e.target.value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    className="h-8 min-w-[5.5rem]"
                    placeholder="HH:MM"
                    defaultValue={s.drop_time ?? ""}
                    key={`${s.id}-dr-${s.drop_time}`}
                    onBlur={(e) => updateTime(ix, "drop_time", e.target.value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={ix === 0}
                      onClick={() => move(ix, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={ix >= items.length - 1}
                      onClick={() => move(ix, 1)}
                    >
                      Down
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => removeRow(ix)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="px-3 py-8 text-center text-muted-foreground">No stops — add from master above.</p>
        )}
      </div>
    </div>
  );
}
