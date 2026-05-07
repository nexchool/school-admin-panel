"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AcademicTerm } from "@/services/academicTermsService";

const termFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    code: z.string().optional(),
    // Stored as string from the DOM input; parsed to number in submit handler
    sequence: z
      .string()
      .min(1, "Sequence is required")
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, {
        message: "Sequence must be at least 1",
      }),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    is_active: z.boolean(),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: "End date must be after start date",
    path: ["end_date"],
  });

type TermFormRaw = z.infer<typeof termFormSchema>;

export type TermFormValues = {
  name: string;
  code?: string;
  sequence: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type TermFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: AcademicTerm | null;
  defaultSequence?: number;
  activeYearName?: string | null;
  onSubmit: (values: TermFormValues) => Promise<void>;
  saving?: boolean;
};

export function TermFormDialog({
  open,
  onOpenChange,
  defaultValues,
  defaultSequence = 1,
  activeYearName,
  onSubmit,
  saving,
}: TermFormDialogProps) {
  const isEdit = !!defaultValues;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TermFormRaw>({
    resolver: zodResolver(termFormSchema),
    defaultValues: {
      name: "",
      code: "",
      sequence: String(defaultSequence),
      start_date: "",
      end_date: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        reset({
          name: defaultValues.name ?? "",
          code: defaultValues.code ?? "",
          sequence: String(defaultValues.sequence ?? defaultSequence),
          start_date: defaultValues.start_date ?? "",
          end_date: defaultValues.end_date ?? "",
          is_active: defaultValues.is_active ?? true,
        });
      } else {
        reset({
          name: "",
          code: "",
          sequence: String(defaultSequence),
          start_date: "",
          end_date: "",
          is_active: true,
        });
      }
    }
  }, [open, defaultValues, defaultSequence, reset]);

  const handleFormSubmit = async (raw: TermFormRaw) => {
    const values: TermFormValues = {
      ...raw,
      sequence: Number(raw.sequence),
    };
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Term" : "Add Term"}</DialogTitle>
        </DialogHeader>

        {activeYearName && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            This term will be associated with:{" "}
            <span className="font-medium text-foreground">{activeYearName}</span>
          </div>
        )}

        <form
          id="term-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid grid-cols-2 gap-4"
        >
          {/* Name */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="term-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="term-name"
              placeholder="e.g. Term 1"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-code">Code</Label>
            <Input
              id="term-code"
              placeholder="e.g. T1"
              {...register("code")}
            />
          </div>

          {/* Sequence */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-sequence">
              Sequence <span className="text-destructive">*</span>
            </Label>
            <Input
              id="term-sequence"
              type="number"
              min={1}
              {...register("sequence")}
            />
            {errors.sequence && (
              <p className="text-xs text-destructive">
                {errors.sequence.message}
              </p>
            )}
          </div>

          {/* Start date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-start">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="term-start"
              type="date"
              {...register("start_date")}
            />
            {errors.start_date && (
              <p className="text-xs text-destructive">
                {errors.start_date.message}
              </p>
            )}
          </div>

          {/* End date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-end">
              End Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="term-end"
              type="date"
              {...register("end_date")}
            />
            {errors.end_date && (
              <p className="text-xs text-destructive">
                {errors.end_date.message}
              </p>
            )}
          </div>

          {/* Is Active */}
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="term-active"
              type="checkbox"
              className="size-4 rounded border-input"
              {...register("is_active")}
            />
            <Label htmlFor="term-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" form="term-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add Term"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
