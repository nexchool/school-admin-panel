"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject, SubjectType } from "@/types/subject";
import type { Teacher } from "@/types/teacher";

const TYPE_ORDER: SubjectType[] = ["core", "elective", "activity", "other"];

const TYPE_LABEL: Record<string, string> = {
  core: "Core",
  elective: "Elective",
  activity: "Activity",
  other: "Other",
};

export interface AddClassSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  assignedSubjectIds: Set<string>;
  availableTeachers: Teacher[];
  subjectTeachersEnabled: boolean;
  onSubmit: (data: {
    subject_id: string;
    weekly_periods: number;
    is_mandatory: boolean;
    teacher_ids: string[];
  }) => Promise<void>;
}

export function AddClassSubjectModal({
  open,
  onOpenChange,
  subjects,
  assignedSubjectIds,
  availableTeachers,
  subjectTeachersEnabled,
  onSubmit,
}: AddClassSubjectModalProps) {
  const [subjectId, setSubjectId] = useState("");
  const [weeklyPeriods, setWeeklyPeriods] = useState("4");
  const [optional, setOptional] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(
    () => new Set()
  );
  const [submitting, setSubmitting] = useState(false);

  const pool = useMemo(() => {
    return subjects.filter(
      (s) => s.is_active !== false && !assignedSubjectIds.has(s.id)
    );
  }, [subjects, assignedSubjectIds]);

  const grouped = useMemo(() => {
    const m = new Map<string, Subject[]>();
    for (const t of TYPE_ORDER) m.set(t, []);
    for (const s of pool) {
      const k = (s.subject_type as SubjectType) || "core";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return m;
  }, [pool]);

  useEffect(() => {
    if (!open) return;
    setSubjectId("");
    setWeeklyPeriods("4");
    setOptional(false);
    setSelectedTeachers(new Set());
  }, [open]);

  const toggleTeacher = (id: string) => {
    setSelectedTeachers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const periods = parseInt(weeklyPeriods, 10);
    if (!subjectId || Number.isNaN(periods) || periods < 1) return;
    setSubmitting(true);
    try {
      await onSubmit({
        subject_id: subjectId,
        weekly_periods: periods,
        is_mandatory: !optional,
        teacher_ids: subjectTeachersEnabled
          ? Array.from(selectedTeachers)
          : [],
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add subject to class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {pool.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No active subjects available, or all are already assigned.
                  </div>
                ) : (
                  TYPE_ORDER.map((typeKey) => {
                    const list = grouped.get(typeKey) ?? [];
                    if (list.length === 0) return null;
                    return (
                      <SelectGroup key={typeKey}>
                        <SelectLabel>{TYPE_LABEL[typeKey] ?? typeKey}</SelectLabel>
                        {list.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.code ? ` (${s.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Periods per week</Label>
            <Input
              type="number"
              min={1}
              max={40}
              value={weeklyPeriods}
              onChange={(e) => setWeeklyPeriods(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="opt-subject"
              type="checkbox"
              className="size-4 rounded border-input"
              checked={optional}
              onChange={(e) => setOptional(e.target.checked)}
            />
            <Label htmlFor="opt-subject" className="font-normal">
              Elective (not required for all students)
            </Label>
          </div>

          {subjectTeachersEnabled && availableTeachers.length > 0 && (
            <div className="space-y-2">
              <Label>Teachers (optional)</Label>
              <p className="text-xs text-muted-foreground">
                First selected becomes primary when none exists; others are
                assistants.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {availableTeachers.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={selectedTeachers.has(t.id)}
                      onChange={() => toggleTeacher(t.id)}
                    />
                    <span>
                      {t.name}{" "}
                      <span className="text-muted-foreground">
                        ({t.employee_id})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {subjectTeachersEnabled && availableTeachers.length === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              No teachers are available for this class year. You can assign
              teachers later.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !subjectId || pool.length === 0}>
              {submitting ? "Saving…" : "Add subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
