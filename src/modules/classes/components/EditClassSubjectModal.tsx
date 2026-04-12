"use client";

import { useEffect, useState } from "react";
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
import type { ClassSubjectTableRow } from "@/types/classSubject";

export interface EditClassSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ClassSubjectTableRow | null;
  onSubmit: (data: {
    weekly_periods: number;
    is_mandatory: boolean;
  }) => Promise<void>;
}

export function EditClassSubjectModal({
  open,
  onOpenChange,
  row,
  onSubmit,
}: EditClassSubjectModalProps) {
  const [weeklyPeriods, setWeeklyPeriods] = useState("4");
  const [optional, setOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!row || !open) return;
    setWeeklyPeriods(String(row.weekly_periods));
    setOptional(!row.is_mandatory);
  }, [row, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    const periods = parseInt(weeklyPeriods, 10);
    if (Number.isNaN(periods) || periods < 1) return;
    setSubmitting(true);
    try {
      await onSubmit({
        weekly_periods: periods,
        is_mandatory: !optional,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit class subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {row?.subject_name}
              {row?.subject_code ? ` (${row.subject_code})` : ""}
            </p>
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
              id="opt-edit"
              type="checkbox"
              className="size-4 rounded border-input"
              checked={optional}
              onChange={(e) => setOptional(e.target.checked)}
            />
            <Label htmlFor="opt-edit" className="font-normal">
              Elective (not required for all students)
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !row}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
