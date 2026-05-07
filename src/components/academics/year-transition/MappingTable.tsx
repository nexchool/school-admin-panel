"use client";

import type { ClassItem } from "@/types/class";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type MappingSelectionValue,
  selectionToApiValue,
} from "./mappingUtils";
import { Wand2 } from "lucide-react";

function formatClassLabel(c: ClassItem): string {
  const sec = c.section ? `-${c.section}` : "";
  const g =
    c.grade_level != null && c.grade_level !== undefined
      ? ` (Gr ${c.grade_level})`
      : "";
  return `${c.name}${sec}${g}`;
}

function selectValueFromSelection(sel: MappingSelectionValue | null): string {
  if (!sel) return "";
  if (sel.kind === "graduated") return "__graduated__";
  if (sel.kind === "repeat") return "__repeat__";
  return sel.classId;
}

function selectionFromSelectValue(v: string): MappingSelectionValue | null {
  if (!v) return null;
  if (v === "__graduated__") return { kind: "graduated" };
  if (v === "__repeat__") return { kind: "repeat" };
  return { kind: "class", classId: v };
}

export interface MappingTableProps {
  fromClasses: ClassItem[];
  nextClasses: ClassItem[];
  selections: Record<string, MappingSelectionValue | null>;
  onChange: (fromClassId: string, sel: MappingSelectionValue | null) => void;
  copyMap: Record<string, string> | null;
  onAutoMap: () => void;
}

export function MappingTable({
  fromClasses,
  nextClasses,
  selections,
  onChange,
  copyMap,
  onAutoMap,
}: MappingTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Map each current class to a destination in the next year, graduation, or repeat
          the same grade (parallel section in the next year — run &quot;Copy classes&quot;
          first for best results).
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onAutoMap}>
          <Wand2 className="mr-2 h-4 w-4" />
          Auto-map (grade +1)
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Current class</th>
              <th className="px-3 py-2 font-medium">Students</th>
              <th className="px-3 py-2 font-medium">Next year</th>
            </tr>
          </thead>
          <tbody>
            {fromClasses.map((row) => {
              const sel = selections[row.id] ?? null;
              const v = selectValueFromSelection(sel);
              const apiProbe = selectionToApiValue(
                sel,
                row,
                copyMap,
                nextClasses
              );
              const invalidRepeat =
                sel?.kind === "repeat" && !apiProbe && !copyMap?.[row.id];
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{formatClassLabel(row)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.student_count ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={v || undefined}
                      onValueChange={(nv) =>
                        onChange(row.id, selectionFromSelectValue(nv))
                      }
                    >
                      <SelectTrigger
                        className="max-w-[280px]"
                        aria-invalid={invalidRepeat || undefined}
                      >
                        <SelectValue placeholder="Choose destination…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__graduated__">Graduated</SelectItem>
                        <SelectItem value="__repeat__">Repeat same class</SelectItem>
                        {nextClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {formatClassLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {invalidRepeat && (
                      <p className="mt-1 text-xs text-destructive">
                        Run &quot;Copy classes&quot; or pick a specific class.
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
