"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { FieldError } from "@/components/ui/field-error";
import type { AcademicTerm } from "@/services/academicTermsService";

const semesterSchema = z
  .object({
    name: z.string().trim().min(1, "Semester name is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: "End date cannot be before start date",
    path: ["end_date"],
  });

type SemesterFormValues = z.infer<typeof semesterSchema>;

interface SemesterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  /** Next sequence number when creating (existing count + 1). */
  nextSequence: number;
  initialData?: AcademicTerm | null;
  onSubmit: (payload: Partial<AcademicTerm>) => Promise<void>;
}

/** Add/edit a semester — persisted as an academic term (wizard step 5). */
export function SemesterFormDialog({
  open,
  onOpenChange,
  academicYearId,
  nextSequence,
  initialData,
  onSubmit,
}: SemesterFormDialogProps) {
  const isEdit = !!initialData;

  const toDefaults = (): SemesterFormValues => ({
    name: initialData?.name ?? `Semester ${nextSequence}`,
    start_date: initialData?.start_date ?? "",
    end_date: initialData?.end_date ?? "",
  });

  const form = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: toDefaults(),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        academic_year_id: academicYearId,
        name: values.name.trim(),
        start_date: values.start_date,
        end_date: values.end_date,
        ...(isEdit ? {} : { sequence: nextSequence }),
      });
      onOpenChange(false);
    } catch {
      // Parent toasts API errors; keep the dialog open for correction.
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Semester" : "Add Semester"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="semester_name">Semester Name *</Label>
            <Input
              id="semester_name"
              {...form.register("name")}
              placeholder="e.g. Semester 1"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="semester_start">Start Date *</Label>
              <Input id="semester_start" type="date" {...form.register("start_date")} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester_end">End Date *</Label>
              <Input id="semester_end" type="date" {...form.register("end_date")} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Semester"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
