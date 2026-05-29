"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudentForm } from "@/components/forms/StudentForm";
import type { Student } from "@/types/student";
import type { ClassItem } from "@/services/classesService";
import type { CreateStudentInput } from "@/types/student";
import { friendlyErrorMessage, toastError } from "@/lib/errorToast";

interface StudentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Student;
  classes: ClassItem[];
  onSubmit: (data: CreateStudentInput) => Promise<void>;
}

export function StudentFormModal({
  open,
  onOpenChange,
  initialData,
  classes,
  onSubmit,
}: StudentFormModalProps) {
  const [formError, setFormError] = useState<string | null>(null);

  // Reset any stale server error each time the modal (re)opens.
  const [seededOpen, setSeededOpen] = useState(false);
  if (open !== seededOpen) {
    setSeededOpen(open);
    if (open) setFormError(null);
  }

  const handleSubmit = async (data: CreateStudentInput) => {
    setFormError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      // Surface server errors (403 BranchForbidden, 422 branch/class rules,
      // etc.) inline and via toast. Keep the modal OPEN so the user can fix
      // their input — only close on success.
      setFormError(friendlyErrorMessage(err, "Failed to save student"));
      toastError(err, "Failed to save student");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Student" : "Add Student"}
          </DialogTitle>
        </DialogHeader>
        {formError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <StudentForm
          initialData={initialData}
          classes={classes}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={initialData ? "Save Changes" : "Create Student"}
        />
      </DialogContent>
    </Dialog>
  );
}
