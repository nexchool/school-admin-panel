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
import type { SchoolEvent } from "@/services/academicCalendarService";

import {
  APPLIES_TO_OPTIONS,
  EVENT_DESCRIPTION_MAX,
  EVENT_NAME_MAX,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from "./calendarOptions";

const eventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Event name is required")
    .max(EVENT_NAME_MAX, `Name must be ${EVENT_NAME_MAX} characters or fewer`),
  event_type: z.enum(["activity", "event", "meeting", "celebration", "training", "other"]),
  status: z.enum(["draft", "active", "archived", "cancelled"]),
  event_date: z.string().min(1, "Date is required"),
  applies_to: z.enum(["entire_school", "students", "teachers", "staff"]),
  description: z
    .string()
    .trim()
    .max(EVENT_DESCRIPTION_MAX, `Description must be ${EVENT_DESCRIPTION_MAX} characters or fewer`)
    .optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface SchoolEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  initialData?: SchoolEvent | null;
  /** Preselected type when creating (e.g. "training" from the Add Event chooser). */
  initialType?: EventFormValues["event_type"];
  onSubmit: (payload: Partial<SchoolEvent>) => Promise<void>;
}

/** Add/edit a school event (wizard step 7 and dashboard). */
export function SchoolEventFormDialog({
  open,
  onOpenChange,
  academicYearId,
  initialData,
  initialType,
  onSubmit,
}: SchoolEventFormDialogProps) {
  const isEdit = !!initialData;

  const toDefaults = (): EventFormValues => ({
    name: initialData?.name ?? "",
    event_type: initialData?.event_type ?? initialType ?? "event",
    status: initialData?.status ?? "active",
    event_date: initialData?.event_date ?? "",
    applies_to: initialData?.applies_to ?? "entire_school",
    description: initialData?.description ?? "",
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: toDefaults(),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData, initialType]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        academic_year_id: academicYearId,
        name: values.name.trim(),
        event_type: values.event_type,
        status: values.status,
        event_date: values.event_date,
        applies_to: values.applies_to,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit School Event" : "Add School Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_name">Event Name *</Label>
            <Input
              id="event_name"
              {...form.register("name")}
              placeholder="e.g. Sports Day"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={form.watch("event_type")}
                onValueChange={(v) =>
                  form.setValue("event_type", v as EventFormValues["event_type"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="event_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Date *</Label>
              <Input id="event_date" type="date" {...form.register("event_date")} />
              <FieldError message={errors.event_date?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event_applies_to">Applies To</Label>
              <Select
                value={form.watch("applies_to")}
                onValueChange={(v) =>
                  form.setValue("applies_to", v as EventFormValues["applies_to"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="event_applies_to">
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
              <Label htmlFor="event_status">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", v as EventFormValues["status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="event_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_description">Description</Label>
            <Textarea
              id="event_description"
              {...form.register("description")}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
