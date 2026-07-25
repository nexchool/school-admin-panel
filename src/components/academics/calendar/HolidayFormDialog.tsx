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
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import type { CreateHolidayPayload, Holiday } from "@/services/holidayService";

import { APPLIES_TO_OPTIONS } from "./calendarOptions";

const HOLIDAY_TYPE_OPTIONS = [
  { value: "national", label: "National Holiday" },
  { value: "public", label: "Public Holiday" },
  { value: "regional", label: "Regional Holiday" },
  { value: "school", label: "School Holiday" },
  { value: "optional", label: "Optional Holiday" },
] as const;

const holidaySchema = z.object({
  name: z.string().trim().min(1, "Holiday name is required"),
  holiday_type: z.enum(["national", "public", "regional", "school", "optional"]),
  date: z.string().min(1, "Date is required"),
  applies_to: z.enum(["entire_school", "students", "teachers", "staff"]),
  description: z.string().trim().optional(),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  initialData?: Holiday | null;
  onSubmit: (payload: CreateHolidayPayload) => Promise<void>;
}

/** Add/edit a single-day public holiday (wizard step 3 and dashboard). */
export function HolidayFormDialog({
  open,
  onOpenChange,
  academicYearId,
  initialData,
  onSubmit,
}: HolidayFormDialogProps) {
  const isEdit = !!initialData;

  const toDefaults = (): HolidayFormValues => ({
    name: initialData?.name ?? "",
    holiday_type: (HOLIDAY_TYPE_OPTIONS.some((t) => t.value === initialData?.holiday_type)
      ? (initialData?.holiday_type as HolidayFormValues["holiday_type"])
      : "public"),
    date: initialData?.start_date ?? "",
    applies_to: (initialData?.applies_to as HolidayFormValues["applies_to"]) ?? "entire_school",
    description: initialData?.description ?? "",
  });

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
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
        holiday_type: values.holiday_type,
        start_date: values.date,
        end_date: values.date,
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
          <DialogTitle>{isEdit ? "Edit Public Holiday" : "Add Public Holiday"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holiday_name">Holiday Name *</Label>
            <Input
              id="holiday_name"
              {...form.register("name")}
              placeholder="e.g. Independence Day"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holiday_type">Holiday Type</Label>
              <Select
                value={form.watch("holiday_type")}
                onValueChange={(v) =>
                  form.setValue("holiday_type", v as HolidayFormValues["holiday_type"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="holiday_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday_date">Date *</Label>
              <Input id="holiday_date" type="date" {...form.register("date")} />
              <FieldError message={errors.date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday_applies_to">Applies To</Label>
            <Select
              value={form.watch("applies_to")}
              onValueChange={(v) =>
                form.setValue("applies_to", v as HolidayFormValues["applies_to"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="holiday_applies_to">
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
            <Label htmlFor="holiday_description">Description</Label>
            <Textarea
              id="holiday_description"
              {...form.register("description")}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
