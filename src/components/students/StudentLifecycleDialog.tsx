"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
import { RequiredMark } from "@/components/ui/required-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClasses } from "@/hooks/useClasses";
import type { ClassItem } from "@/types/class";
import {
  useGraduateStudent,
  useReEnrollStudent,
  useTransferStudentOut,
  useTransferStudentToSection,
  useWithdrawStudent,
} from "@/hooks/useStudentLifecycle";

export type LifecycleAct =
  | "withdraw"
  | "graduate"
  | "reEnroll"
  | "transferToSection"
  | "transferOut";

/**
 * What each act is called, and what it asks for.
 *
 * The wording is the school's, not the database's — an admin is recording
 * that a child left, not setting a column. `needsClass` decides whether the
 * form asks where they are going; everything else is shared, because every one
 * of these acts happens on a date and usually for a reason.
 */
const ACTS: Record<
  LifecycleAct,
  {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    needsClass?: boolean;
    classLabel?: string;
  }
> = {
  withdraw: {
    title: "Withdraw student",
    description:
      "The student leaves before completing their education. Their place in a class ends and the school stops being billed for them. Nothing is deleted — if they come back, they return as the same student.",
    confirmLabel: "Withdraw",
    destructive: true,
  },
  graduate: {
    title: "Record graduation",
    description:
      "The student has completed their education here. They keep their record and their history, and no longer hold a place in a class.",
    confirmLabel: "Record graduation",
  },
  reEnroll: {
    title: "Re-enroll student",
    description:
      "The student returns to the school. They are not admitted again — the same person, the same admission number, a new place in a class.",
    confirmLabel: "Re-enroll",
    needsClass: true,
    classLabel: "Class to join",
  },
  transferToSection: {
    title: "Move to another section",
    description:
      "The student moves to another section of the same academic year. They remain an active student — moving rooms is not leaving.",
    confirmLabel: "Move student",
    needsClass: true,
    classLabel: "Move to",
  },
  transferOut: {
    title: "Transfer to another school",
    description:
      "The student leaves for a different school. Kept apart from withdrawal because a school issues a transfer certificate for this and needs to find it again.",
    confirmLabel: "Record transfer",
    destructive: true,
  },
};

/**
 * How a class reads in a picker.
 *
 * `Class.name` is nullable — a class's identity is its grade and section, not
 * a label somebody typed — so the grade is what to show, falling back to the
 * label when a school has set one.
 */
function classLabel(c: ClassItem): string {
  return [c.grade_name || c.name || "Class", c.section].filter(Boolean).join(" ");
}

/**
 * What tells two same-named classes apart. A trust may run two boards on one
 * campus and parallel mediums in one grade, so "Std 5 A" is not always enough
 * to pick by.
 */
function classContext(c: ClassItem): string {
  return [c.programme_name, c.medium_name, c.school_unit_name]
    .filter(Boolean)
    .join(" · ");
}

type Props = {
  act: LifecycleAct | null;
  student: { id: string; name: string; class_id?: string | null };
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

export function StudentLifecycleDialog({ act, ...rest }: Props) {
  if (!act) return null;
  // Mounted only while an act is being recorded, and keyed by it, so each one
  // starts from a clean form. Resetting fields in an effect would do the same
  // thing by hand, a render late.
  return <LifecycleForm key={act} act={act} {...rest} />;
}

function LifecycleForm({
  act,
  student,
  onOpenChange,
  onDone,
}: Props & { act: LifecycleAct }) {
  const [reason, setReason] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [classId, setClassId] = useState("");
  const [destinationSchool, setDestinationSchool] = useState("");

  const withdraw = useWithdrawStudent();
  const graduate = useGraduateStudent();
  const reEnroll = useReEnrollStudent();
  const transferToSection = useTransferStudentToSection();
  const transferOut = useTransferStudentOut();

  const config = ACTS[act];
  const { data: classes, isLoading: classesLoading } = useClasses();

  const pending =
    withdraw.isPending ||
    graduate.isPending ||
    reEnroll.isPending ||
    transferToSection.isPending ||
    transferOut.isPending;

  // A section move must go somewhere else; offering the class they are
  // already in is offering a refusal.
  const classOptions = (classes ?? []).filter(
    (c) => !(act === "transferToSection" && c.id === student.class_id),
  );

  const canSubmit = !pending && (!config.needsClass || !!classId);

  const run = async () => {
    const shared = {
      id: student.id,
      reason: reason.trim() || undefined,
      occurredOn: occurredOn || undefined,
    };
    try {
      if (act === "withdraw") await withdraw.mutateAsync(shared);
      else if (act === "graduate") await graduate.mutateAsync(shared);
      else if (act === "reEnroll")
        await reEnroll.mutateAsync({ ...shared, classId });
      else if (act === "transferToSection")
        await transferToSection.mutateAsync({ ...shared, toClassId: classId });
      else
        await transferOut.mutateAsync({
          ...shared,
          destinationSchool: destinationSchool.trim() || undefined,
        });
      onOpenChange(false);
      onDone?.();
    } catch {
      // The mutation's own toast has already said what went wrong; the dialog
      // stays open so the admin can correct the date or pick another class.
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Student: </span>
            <span className="font-medium">{student.name}</span>
          </p>

          {config.needsClass && (
            <div className="space-y-2">
              <Label htmlFor="lifecycle-class">
                {config.classLabel}
                <RequiredMark />
              </Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="lifecycle-class">
                  <SelectValue
                    placeholder={
                      classesLoading ? "Loading classes…" : "Select a class"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex flex-col text-left">
                        <span>{classLabel(c)}</span>
                        {classContext(c) && (
                          <span className="text-xs text-muted-foreground">
                            {classContext(c)}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!classesLoading && classOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No other class is available in the active year.
                </p>
              )}
            </div>
          )}

          {act === "transferOut" && (
            <div className="space-y-2">
              <Label htmlFor="lifecycle-school">Destination school</Label>
              <Input
                id="lifecycle-school"
                value={destinationSchool}
                onChange={(e) => setDestinationSchool(e.target.value)}
                placeholder="Where the student is going"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lifecycle-date">Date</Label>
            <Input
              id="lifecycle-date"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for today.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifecycle-reason">Reason</Label>
            <Textarea
              id="lifecycle-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Recorded on the student's history"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={config.destructive ? "destructive" : "default"}
            onClick={run}
            disabled={!canSubmit}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
