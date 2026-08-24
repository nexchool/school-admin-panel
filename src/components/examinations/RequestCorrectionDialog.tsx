"use client";

/**
 * Asking for a closed mark to be changed.
 *
 * Nothing here decides whether the change is allowed — the service does, and
 * re-checks it again at approval. This collects what is being asked for and
 * why, and shows the before/after plainly so the person raising it can see
 * what they are about to put in front of a reviewer.
 *
 * The mark does not move when this succeeds. That is the whole difference
 * between a correction and an edit.
 */

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredMark } from "@/components/ui/required-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRequestMarkCorrection } from "@/hooks/useExaminations";
import {
  MARK_STATUS_LABEL,
  STATUS_TAKES_MARKS,
  type MarkStatus,
  type RegisterStudent,
} from "@/types/examination";

interface Props {
  open: boolean;
  onClose: () => void;
  student: RegisterStudent;
  examMarkId: string;
  paperLabel: string;
  maxMarks: number;
  onRequested: () => void;
}

function describe(status: MarkStatus | null, marks?: number | null): string {
  if (!status) return "Not entered";
  if (!STATUS_TAKES_MARKS[status]) return MARK_STATUS_LABEL[status];
  return `${MARK_STATUS_LABEL[status]} · ${marks ?? "—"}`;
}

export function RequestCorrectionDialog({
  open,
  onClose,
  student,
  examMarkId,
  paperLabel,
  maxMarks,
  onRequested,
}: Props) {
  const [status, setStatus] = useState<MarkStatus>(
    (student.status as MarkStatus) ?? "present",
  );
  const [marks, setMarks] = useState(
    student.marksObtained === null || student.marksObtained === undefined
      ? ""
      : String(student.marksObtained),
  );
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const request = useRequestMarkCorrection();
  const takesMarks = STATUS_TAKES_MARKS[status];

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!reason.trim()) found.reason = "Say why this mark should change";
    if (takesMarks) {
      if (!marks.trim()) found.marks = "Enter the corrected mark";
      else if (!Number.isFinite(Number(marks)))
        found.marks = "Marks must be an ordinary number";
      else if (Number(marks) < 0) found.marks = "Marks cannot be negative";
      else if (Number(marks) > maxMarks)
        found.marks = `More than the paper's ${maxMarks}`;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setFailure(null);
    try {
      await request.mutateAsync({
        examMarkId,
        toStatus: status,
        toMarks: takesMarks ? Number(marks) : null,
        reason: reason.trim(),
      });
      onRequested();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "The correction was not raised",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a correction</DialogTitle>
          <DialogDescription>
            {student.fullName} · {student.admissionNumber} · {paperLabel}. The
            mark does not change until somebody who runs assessment approves
            this.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <span data-testid="correction-before">
              {describe(student.status, student.marksObtained)}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium" data-testid="correction-after">
              {describe(status, takesMarks ? Number(marks) : null)}
            </span>
          </div>

          <div>
            <Label htmlFor="correction-status">Corrected status</Label>
            <Select
              value={status}
              onValueChange={(next) => {
                setStatus(next as MarkStatus);
                if (!STATUS_TAKES_MARKS[next as MarkStatus]) setMarks("");
              }}
            >
              <SelectTrigger id="correction-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MARK_STATUS_LABEL) as MarkStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {MARK_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="correction-marks">Corrected marks</Label>
            <Input
              id="correction-marks"
              inputMode="decimal"
              value={marks}
              disabled={!takesMarks}
              onChange={(event) => setMarks(event.target.value)}
            />
            <FieldError message={errors.marks} />
          </div>

          <div>
            <Label htmlFor="correction-reason">
              Reason <RequiredMark />
            </Label>
            <Textarea
              id="correction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Question 7 was added up twice"
            />
            <FieldError message={errors.reason} />
          </div>

          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={request.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={request.isPending}>
            {request.isPending && (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            )}
            Request correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
