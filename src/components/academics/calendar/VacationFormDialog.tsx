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
import { FieldError } from "@/components/ui/field-error";
import type { CreateHolidayPayload, Holiday } from "@/services/holidayService";

import { APPLIES_TO_OPTIONS } from "./calendarOptions";

const vacationSchema = z
  .object({
    name: z.string().trim().min(1, "Vacation name is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    applies_to: z.enum(["entire_school", "students", "teachers", "staff"]),
    description: z.string().trim().optional(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: "End date cannot be before start date",
    path: ["end_date"],
  });

type VacationFormValues = z.infer<typeof vacationSchema>;

interface VacationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  initialData?: Holiday | null;
  onSubmit: (payload: CreateHolidayPayload) => Promise<void>;
}

/** Add/edit a vacation period (a range holiday of type "vacation"). */
export function VacationFormDialog({
  open,
  onOpenChange,
  academicYearId,
  initialData,
  onSubmit,
}: VacationFormDialogProps) {
  const isEdit = !!initialData;

  const toDefaults = (): VacationFormValues => ({
    name: initialData?.name ?? "",
    start_date: initialData?.start_date ?? "",
    end_date: initialData?.end_date ?? "",
    applies_to: (initialData?.applies_to as VacationFormValues["applies_to"]) ?? "entire_school",
    description: initialData?.description ?? "",
  });

  const form = useForm<VacationFormValues>({
    resolver: zodResolver(vacationSchema),
    defaultValues: toDefaults(),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name.trim(),
        holiday_type: "vacation",
        start_date: values.start_date,
        end_date: values.end_date,
        is_recurring: false,
        academic_year_id: academicYearId,
        applies_to: values.applies_to,
        description: values.description?.trim() || undefined,
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
          <DialogTitle>{isEdit ? "Edit Vacation" : "Add Vacation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vacation_name">Vacation Name *</Label>
            <Input
              id="vacation_name"
              {...form.register("name")}
              placeholder="e.g. Summer Vacation"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vacation_start">Start Date *</Label>
              <Input id="vacation_start" type="date" {...form.register("start_date")} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacation_end">End Date *</Label>
              <Input id="vacation_end" type="date" {...form.register("end_date")} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacation_applies_to">Applies To</Label>
            <Select
              value={form.watch("applies_to")}
              onValueChange={(v) =>
                form.setValue("applies_to", v as VacationFormValues["applies_to"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="vacation_applies_to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLIES_TO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacation_description">Description</Label>
            <Input
              id="vacation_description"
              {...form.register("description")}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Vacation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
