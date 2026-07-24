"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import { useClasses } from "@/hooks/useClasses";
import { classAssignmentLabel } from "@/components/subjects/SubjectFormModal";
import type { ExamType, ExamWindow } from "@/services/academicCalendarService";

import { EXAM_TYPE_OPTIONS } from "./calendarOptions";

const examWindowSchema = z
  .object({
    name: z.string().trim().min(1, "Exam name is required"),
    exam_type: z.enum(["unit_test", "mid_term", "final", "pre_board", "board", "other"]),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    description: z.string().trim().optional(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: "End date cannot be before start date",
    path: ["end_date"],
  });

type ExamWindowFormValues = z.infer<typeof examWindowSchema>;

interface ExamWindowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  initialData?: ExamWindow | null;
  onSubmit: (payload: Partial<ExamWindow>) => Promise<void>;
}

/** Add/edit an examination window (wizard step 6 and dashboard). */
export function ExamWindowFormDialog({
  open,
  onOpenChange,
  academicYearId,
  initialData,
  onSubmit,
}: ExamWindowFormDialogProps) {
  const isEdit = !!initialData;
  const { data: classes = [] } = useClasses({ academic_year_id: academicYearId });
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  const toDefaults = (): ExamWindowFormValues => ({
    name: initialData?.name ?? "",
    exam_type: initialData?.exam_type ?? "mid_term",
    start_date: initialData?.start_date ?? "",
    end_date: initialData?.end_date ?? "",
    description: initialData?.description ?? "",
  });

  const form = useForm<ExamWindowFormValues>({
    resolver: zodResolver(examWindowSchema),
    defaultValues: toDefaults(),
  });

  useEffect(() => {
    if (open) {
      form.reset(toDefaults());
      setSelectedClassIds(new Set(initialData?.applicable_class_ids ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        academic_year_id: academicYearId,
        name: values.name.trim(),
        exam_type: values.exam_type as ExamType,
        start_date: values.start_date,
        end_date: values.end_date,
        applicable_class_ids: Array.from(selectedClassIds),
        description: values.description?.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // Parent toasts API errors; keep the dialog open for correction.
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Examination" : "Add Examination"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exam_name">Exam Name *</Label>
              <Input
                id="exam_name"
                {...form.register("name")}
                placeholder="e.g. Mid Term Exam"
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_type">Exam Type</Label>
              <Select
                value={form.watch("exam_type")}
                onValueChange={(v) =>
                  form.setValue("exam_type", v as ExamWindowFormValues["exam_type"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="exam_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exam_start">Start Date *</Label>
              <Input id="exam_start" type="date" {...form.register("start_date")} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_end">End Date *</Label>
              <Input id="exam_end" type="date" {...form.register("end_date")} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Applicable Classes</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty to apply to all classes.
            </p>
            {selectedClassIds.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {classes
                  .filter((c) => selectedClassIds.has(c.id))
                  .map((c) => (
                    <span
                      key={c.id}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {classAssignmentLabel(c)}
                      <button
                        type="button"
                        aria-label={`Remove ${classAssignmentLabel(c)}`}
                        onClick={() => toggleClass(c.id)}
                        className="hover:text-primary/70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
            {classes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No classes found for this academic year.
              </p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {classes.map((c) => (
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
            <Label htmlFor="exam_description">Description</Label>
            <Textarea
              id="exam_description"
              {...form.register("description")}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Exam"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
