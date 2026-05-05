"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassItem } from "@/types/class";

interface Props {
  classes: ClassItem[];
  /** Currently chosen class id (controlled). */
  value: string;
  onChange: (classId: string) => void;
}

const ANY = "__any__";

/**
 * Dependent dropdowns: School Unit → Programme → Grade → Class.
 *
 * Driven entirely off the `classes` array — no extra requests. We derive
 * each level's options from what's actually wired up in the data, so the
 * admin never picks a combination that doesn't exist.
 *
 * Filter state is held as `null` overrides; until the user touches a
 * dropdown, the active filter mirrors the currently selected class. That
 * keeps everything in sync without setState-in-effect machinery.
 */
export function StructuredClassPicker({ classes, value, onChange }: Props) {
  const selected = classes.find((c) => c.id === value);

  const [unitOverride, setUnitOverride] = useState<string | null>(null);
  const [programmeOverride, setProgrammeOverride] = useState<string | null>(null);
  const [gradeOverride, setGradeOverride] = useState<string | null>(null);

  const unitId =
    unitOverride ?? selected?.school_unit_id ?? ANY;
  const programmeId =
    programmeOverride ?? selected?.programme_id ?? ANY;
  const gradeId =
    gradeOverride ?? selected?.grade_id ?? ANY;

  const units = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classes) {
      const id = c.school_unit_id ?? ANY;
      const name = c.school_unit_name ?? "Unassigned (legacy)";
      if (!m.has(id)) m.set(id, name);
    }
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [classes]);

  const programmes = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classes) {
      if (unitId !== ANY && (c.school_unit_id ?? ANY) !== unitId) continue;
      const id = c.programme_id ?? ANY;
      const name = c.programme_name ?? "Unassigned";
      if (!m.has(id)) m.set(id, name);
    }
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [classes, unitId]);

  const grades = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classes) {
      if (unitId !== ANY && (c.school_unit_id ?? ANY) !== unitId) continue;
      if (programmeId !== ANY && (c.programme_id ?? ANY) !== programmeId)
        continue;
      const id =
        c.grade_id ?? `legacy:${c.name ?? c.grade_level ?? "—"}`;
      const name =
        c.grade_name ??
        c.name ??
        (c.grade_level != null ? `Grade ${c.grade_level}` : "—");
      if (!m.has(id)) m.set(id, name);
    }
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [classes, unitId, programmeId]);

  const sections = useMemo(() => {
    return classes
      .filter((c) => {
        if (unitId !== ANY && (c.school_unit_id ?? ANY) !== unitId)
          return false;
        if (programmeId !== ANY && (c.programme_id ?? ANY) !== programmeId)
          return false;
        if (gradeId !== ANY) {
          const gid =
            c.grade_id ?? `legacy:${c.name ?? c.grade_level ?? "—"}`;
          if (gid !== gradeId) return false;
        }
        return true;
      })
      .sort((a, b) => (a.section ?? "").localeCompare(b.section ?? ""));
  }, [classes, unitId, programmeId, gradeId]);

  // Filter changes already clear `value` via the explicit `onChange("")`
  // calls below, so the parent never sees a stale id.

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>School unit</Label>
        <Select
          value={unitId}
          onValueChange={(v) => {
            setUnitOverride(v);
            setProgrammeOverride(ANY);
            setGradeOverride(ANY);
            onChange("");
          }}
          disabled={units.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            {units
              .filter((u) => u.id !== ANY)
              .map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Programme</Label>
        <Select
          value={programmeId}
          onValueChange={(v) => {
            setProgrammeOverride(v);
            setGradeOverride(ANY);
            onChange("");
          }}
          disabled={programmes.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            {programmes
              .filter((p) => p.id !== ANY)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Grade</Label>
        <Select
          value={gradeId}
          onValueChange={(v) => {
            setGradeOverride(v);
            onChange("");
          }}
          disabled={grades.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            {grades
              .filter((g) => g.id !== ANY)
              .map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Class / section</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {sections.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No classes match. Adjust filters above.
              </div>
            ) : (
              sections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {(c.grade_name ?? c.name ?? "—") +
                    (c.section ? ` — ${c.section}` : "")}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
