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

const academicYearFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    is_active: z.boolean(),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: "End date must be after start date",
    path: ["end_date"],
  });

export type AcademicYearFormValues = z.infer<typeof academicYearFormSchema>;

type AcademicYearFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AcademicYearFormValues) => Promise<void>;
  saving?: boolean;
};

export function AcademicYearFormDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
}: AcademicYearFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearFormSchema),
    defaultValues: {
      name: "",
      start_date: "",
      end_date: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        start_date: "",
        end_date: "",
        is_active: true,
      });
    }
  }, [open, reset]);

  const handleFormSubmit = async (values: AcademicYearFormValues) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Create Academic Year</DialogTitle>
        </DialogHeader>

        <form
          id="academic-year-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ay-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ay-name"
              placeholder="e.g. 2025–26"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ay-start-date">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ay-start-date"
              type="date"
              {...register("start_date")}
            />
            {errors.start_date && (
              <p className="text-xs text-destructive">
                {errors.start_date.message}
              </p>
            )}
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ay-end-date">
              End Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ay-end-date"
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
          <div className="flex items-center gap-2">
            <input
              id="ay-is-active"
              type="checkbox"
              className="size-4 cursor-pointer accent-primary"
              {...register("is_active")}
            />
            <Label htmlFor="ay-is-active" className="cursor-pointer">
              Set as active year
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
          <Button type="submit" form="academic-year-form" disabled={saving}>
            {saving ? "Creating…" : "Create Academic Year"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
