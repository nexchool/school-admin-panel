"use client";

/**
 * The cycles inside one academic year.
 *
 * An academic year is what the organization reports under; a cycle is when it
 * is actually open. A school has exactly one and never opens this dialog. A
 * trust running GSEB June-to-April alongside CBSE April-to-March has two, and
 * this is where it says so.
 *
 * Deliberately a dialog off the years table rather than a screen of its own:
 * cycles belong to a year, and a school that needs none should not find a
 * navigation entry teaching them the concept exists.
 *
 * The caller keys this on the year, so opening a different one — or closing —
 * remounts it with fresh state. That is the house pattern for resetting a
 * dialog; `react-hooks/set-state-in-effect` forbids the reset-in-effect form.
 */

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAcademicCycles,
  useArchiveAcademicCycle,
  useCreateAcademicCycle,
  useUpdateAcademicCycle,
} from "@/hooks/useAcademicCycles";
import type { AcademicCycle } from "@/services/academicStructureService";
import type { AcademicYear } from "@/services/academicYearsService";

type Props = {
  year: AcademicYear | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
};

const KINDS = [
  { value: "main", label: "Main" },
  { value: "short_course", label: "Short course" },
];

function fmt(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export function AcademicCyclesDialog({
  year,
  open,
  onOpenChange,
  canManage,
}: Props) {
  const { data: cycles = [], isLoading } = useAcademicCycles(year?.id, {
    enabled: open,
  });
  const create = useCreateAcademicCycle();
  const update = useUpdateAcademicCycle();
  const archive = useArchiveAcademicCycle();

  const [editing, setEditing] = useState<AcademicCycle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleKind, setCycleKind] = useState("short_course");
  // The server is authoritative on whether a cycle can be retired — it knows
  // what still operates in it. Its refusal is shown verbatim rather than
  // guessed at here.
  const [error, setError] = useState("");

  const startAdding = () => {
    setEditing(null);
    setName("");
    // A new cycle starts from the year it sits in — the common case is a
    // shorter period inside it, so this is a helpful default, not a rule.
    setStartDate(year?.start_date?.slice(0, 10) ?? "");
    setEndDate(year?.end_date?.slice(0, 10) ?? "");
    setCycleKind("short_course");
    setError("");
    setShowForm(true);
  };

  const startEditing = (cycle: AcademicCycle) => {
    setEditing(cycle);
    setName(cycle.name);
    setStartDate(cycle.startDate.slice(0, 10));
    setEndDate(cycle.endDate.slice(0, 10));
    setCycleKind(cycle.cycleKind);
    setError("");
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!year) return;
    setError("");
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          changes: { name, startDate, endDate, cycleKind },
        });
      } else {
        await create.mutateAsync({
          academicYearId: year.id,
          name,
          startDate,
          endDate,
          cycleKind,
        });
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the cycle.");
    }
  };

  const remove = async (cycle: AcademicCycle) => {
    setError("");
    try {
      await archive.mutateAsync(cycle.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not retire the cycle.",
      );
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Academic cycles</DialogTitle>
          <DialogDescription>
            The periods {year?.name ?? "this year"} is actually taught in. Most
            schools have one. Add another when a board or a short course runs to
            different dates.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="divide-y rounded-md border">
            {cycles.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                No cycles yet.
              </p>
            ) : (
              cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cycle.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(cycle.startDate)} – {fmt(cycle.endDate)}
                      {cycle.cycleKind === "main" ? " · Main" : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditing(cycle)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit {cycle.name}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => remove(cycle)}
                        disabled={archive.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Retire {cycle.name}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}

        {canManage && !showForm ? (
          <Button type="button" variant="outline" onClick={startAdding}>
            <Plus className="mr-2 h-4 w-4" />
            Add cycle
          </Button>
        ) : null}

        {showForm ? (
          <form onSubmit={submit} className="space-y-3 rounded-md border p-3">
            <div className="space-y-2">
              <Label htmlFor="cycle-name">Name</Label>
              <Input
                id="cycle-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CBSE, Grade 11 Vacation, JEE"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cycle-start">Starts</Label>
                <Input
                  id="cycle-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle-end">Ends</Label>
                <Input
                  id="cycle-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle-kind">Kind</Label>
                <Select value={cycleKind} onValueChange={setCycleKind}>
                  <SelectTrigger id="cycle-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind.value} value={kind.value}>
                        {kind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {editing ? "Save cycle" : "Add cycle"}
              </Button>
            </div>
          </form>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
