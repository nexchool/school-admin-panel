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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassSubjectTableRow } from "@/types/classSubject";
import type { Teacher } from "@/types/teacher";

export interface AssignTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ClassSubjectTableRow | null;
  availableTeachers: Teacher[];
  existingTeacherIds: Set<string>;
  onSubmit: (data: { teacher_id: string; role: "primary" | "assistant" | "guest" }) => Promise<void>;
}

export function AssignTeacherModal({
  open,
  onOpenChange,
  row,
  availableTeachers,
  existingTeacherIds,
  onSubmit,
}: AssignTeacherModalProps) {
  const [teacherId, setTeacherId] = useState("");
  const [role, setRole] = useState<"primary" | "assistant" | "guest">("assistant");
  const [submitting, setSubmitting] = useState(false);

  const pickable = availableTeachers.filter((t) => !existingTeacherIds.has(t.id));

  useEffect(() => {
    if (!open) return;
    setTeacherId("");
    const hasPrimary =
      row?.teachers.some((a) => a.role === "primary" && a.is_active) ?? false;
    setRole(hasPrimary ? "assistant" : "primary");
  }, [open, row]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) return;
    setSubmitting(true);
    try {
      await onSubmit({ teacher_id: teacherId, role });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign teacher</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {row?.subject_name ?? "Subject"}
          </p>
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {pickable.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.employee_id})
                  </SelectItem>
                ))}
                {pickable.length === 0 && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No teachers available to add.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setRole(v as "primary" | "assistant" | "guest")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
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
              disabled={submitting || !teacherId || pickable.length === 0}
            >
              {submitting ? "Saving…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
