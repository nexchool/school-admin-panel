"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requiredString } from "@/lib/validation/fields";
import { useCreateTerm, useUpdateTerm } from "@/hooks/useTerms";
import { ApiException } from "@/services/api";
import type { AcademicTerm } from "@/services/academicTermsService";

const termSchema = z
  .object({
    name: requiredString("Term name").max(
      64,
      "Term name must be 64 characters or fewer",
    ),
    start_date: requiredString("Start date"),
    end_date: requiredString("End date"),
  })
  // Checked here rather than only on the server so the person sees it against
  // the field they got wrong, before a round trip.
  .refine((values) => values.end_date >= values.start_date, {
    path: ["end_date"],
    message: "The end date cannot be before the start date",
  });

type TermFormValues = z.infer<typeof termSchema>;

interface TermFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null means create mode. */
  term: AcademicTerm | null;
  /** The year a newly created term belongs to. */
  academicYearId: string;
  /** Where a new term lands in teaching order. */
  nextSequence: number;
}

export function TermFormModal({
  open,
  onOpenChange,
  term,
  academicYearId,
  nextSequence,
}: TermFormModalProps) {
  const isEdit = !!term;
  const createTerm = useCreateTerm();
  const updateTerm = useUpdateTerm();

  const toDefaults = (): TermFormValues => ({
    name: term?.name ?? "",
    start_date: term?.start_date?.slice(0, 10) ?? "",
    end_date: term?.end_date?.slice(0, 10) ?? "",
  });

  const form = useForm<TermFormValues>({
    resolver: zodResolver(termSchema) as never,
    defaultValues: toDefaults(),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, term]);

  const handleClose = (next: boolean) => {
    if (!next) form.reset(toDefaults());
    onOpenChange(next);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      start_date: values.start_date,
      end_date: values.end_date,
    };

    try {
      if (isEdit && term) {
        await updateTerm.mutateAsync({ id: term.id, data: payload });
        toast.success("Term updated.");
      } else {
        await createTerm.mutateAsync({
          ...payload,
          academic_year_id: academicYearId,
          sequence: nextSequence,
        });
        toast.success("Term added.");
      }
      handleClose(false);
    } catch (error) {
      toast.error(
        error instanceof ApiException || error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onClose={() => handleClose(false)}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit term" : "New term"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="term_name">Name *</Label>
            <Input
              id="term_name"
              {...form.register("name")}
              placeholder="e.g. Term 1"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="term_start">Starts *</Label>
              <Input id="term_start" type="date" {...form.register("start_date")} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term_end">Ends *</Label>
              <Input id="term_end" type="date" {...form.register("end_date")} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
