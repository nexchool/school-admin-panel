"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses, useMergeSections } from "@/hooks/useClasses";
import type { ClassDetail } from "@/types/class";

interface MergeSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The section being retired. */
  section: ClassDetail;
  /** Called with the surviving section's id once the merge lands. */
  onMerged: (intoClassId: string) => void;
}

/**
 * Retire a section by moving its children into another.
 *
 * The confirmation is the point of this dialog. A merge moves every child in
 * the section at once and cannot be undone from the UI, so it names the number
 * of children and both sections in a sentence rather than asking "are you
 * sure?" over an operation the user has to reconstruct from memory.
 */
export function MergeSectionModal({
  open,
  onOpenChange,
  section,
  onMerged,
}: MergeSectionModalProps) {
  const [intoId, setIntoId] = useState("");
  const [reason, setReason] = useState("");
  const merge = useMergeSections();

  // Only sections of the same academic year can absorb this one — merging
  // across years is promotion, which the server refuses. Offering them would
  // be offering a choice that always fails.
  const { data: candidates = [], isLoading } = useClasses({
    academic_year_id: section.academic_year_id ?? null,
  });

  const options = useMemo(
    () => candidates.filter((row) => row.id !== section.id),
    [candidates, section.id],
  );

  const studentCount = section.students?.length ?? 0;
  const target = options.find((row) => row.id === intoId);
  const sectionName = section.display_name ?? section.name;

  const close = () => {
    setIntoId("");
    setReason("");
    onOpenChange(false);
  };

  const submit = () => {
    if (!intoId) return;
    merge.mutate(
      { sourceId: section.id, intoId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          const survivor = intoId;
          close();
          onMerged(survivor);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge {sectionName} into another section</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="merge-target">Move students into</Label>
            <Select value={intoId} onValueChange={setIntoId}>
              <SelectTrigger id="merge-target">
                <SelectValue
                  placeholder={
                    isLoading ? "Loading sections…" : "Select a section"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.display_name ?? row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && options.length === 0 && (
              <p className="text-sm text-muted-foreground">
                There is no other section in this academic year to merge into.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merge-reason">Reason (optional)</Label>
            <Input
              id="merge-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Grade 8 lost students mid-year"
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground">
              Recorded against the section and on each student&apos;s timeline.
            </p>
          </div>

          {target && (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p>
                  {studentCount === 0
                    ? `No students will move. `
                    : `${studentCount} ${
                        studentCount === 1 ? "student" : "students"
                      } will move from ${sectionName} to ${
                        target.display_name ?? target.name
                      }. `}
                  {sectionName} will stop accepting students.
                </p>
                <p className="text-xs">
                  Its attendance, marks and reports stay attached to it — they
                  happened there. This cannot be undone here.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={!intoId || merge.isPending}
            className="gap-2"
          >
            {merge.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Merge section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
