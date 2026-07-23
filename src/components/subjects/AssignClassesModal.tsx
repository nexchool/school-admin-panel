"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClasses } from "@/hooks/useClasses";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useAssignSubjectClasses } from "@/hooks/useSubjects";
import { classAssignmentLabel } from "@/components/subjects/SubjectFormModal";
import type { SubjectListItem } from "@/types/subject";

const ALL_PROGRAMMES = "__all__";

interface AssignClassesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectListItem | null;
}

/** Assign a catalogue subject to classes it isn't offered in yet. */
export function AssignClassesModal({
  open,
  onOpenChange,
  subject,
}: AssignClassesModalProps) {
  const [programmeFilter, setProgrammeFilter] = useState<string>(ALL_PROGRAMMES);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [weeklyPeriods, setWeeklyPeriods] = useState("1");

  const { data: programmes = [] } = useProgrammes();
  const { data: classes = [] } = useClasses();
  const assignMutation = useAssignSubjectClasses();

  const assignedClassIds = useMemo(
    () => new Set((subject?.classes ?? []).map((c) => c.class_id)),
    [subject]
  );

  const availableClasses = useMemo(() => {
    const unassigned = classes.filter((c) => !assignedClassIds.has(c.id));
    if (programmeFilter === ALL_PROGRAMMES) return unassigned;
    return unassigned.filter((c) => c.programme_id === programmeFilter);
  }, [classes, assignedClassIds, programmeFilter]);

  // Reseed on open / subject change via adjust-state-during-render (the
  // modal stays mounted; an effect here would cascade renders).
  const seedKey = open ? subject?.id ?? null : null;
  const [lastSeedKey, setLastSeedKey] = useState<string | null>(null);
  if (seedKey !== lastSeedKey) {
    setLastSeedKey(seedKey);
    if (seedKey !== null) {
      setProgrammeFilter(ALL_PROGRAMMES);
      setSelectedClassIds(new Set());
      setWeeklyPeriods("1");
    }
  }

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;
    if (selectedClassIds.size === 0) {
      toast.error("Select at least one class.");
      return;
    }
    const periods = Number(weeklyPeriods);
    if (!Number.isInteger(periods) || periods < 1 || periods > 40) {
      toast.error("Weekly periods must be a whole number between 1 and 40.");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        subjectId: subject.id,
        classIds: Array.from(selectedClassIds),
        weeklyPeriods: periods,
      });
      onOpenChange(false);
    } catch {
      // Success + error toasts owned by useAssignSubjectClasses.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Assign {subject ? `"${subject.name}"` : "subject"} to classes
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Programme</Label>
            <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROGRAMMES}>All programmes</SelectItem>
                {programmes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Classes (active academic year)</Label>
            {availableClasses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {classes.length > 0 && assignedClassIds.size > 0
                  ? "This subject is already assigned to every matching class."
                  : "No classes found for this programme in the active academic year."}
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {availableClasses.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={selectedClassIds.has(c.id)}
                      onChange={() => toggleClass(c.id)}
                    />
                    <span>{classAssignmentLabel(c)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assign_weekly_periods">Weekly periods per class</Label>
            <Input
              id="assign_weekly_periods"
              type="number"
              min={1}
              max={40}
              className="w-28"
              value={weeklyPeriods}
              onChange={(e) => setWeeklyPeriods(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={assignMutation.isPending || selectedClassIds.size === 0}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
