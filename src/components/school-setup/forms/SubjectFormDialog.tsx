"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject } from "@/types/subject";

const SUBJECT_TYPE_OPTIONS = [
  { value: "core", label: "Core" },
  { value: "elective", label: "Elective" },
  { value: "activity", label: "Activity" },
  { value: "other", label: "Other" },
] as const;

const subjectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  subject_type: z
    .enum(["core", "elective", "activity", "other"])
    .optional(),
  description: z.string().optional(),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;

type SubjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Subject | null;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
  saving?: boolean;
};

export function SubjectFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  saving,
}: SubjectFormDialogProps) {
  const isEdit = !!defaultValues;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: "",
      code: "",
      subject_type: "core",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        reset({
          name: defaultValues.name ?? "",
          code: defaultValues.code ?? "",
          subject_type:
            (defaultValues.subject_type as SubjectFormValues["subject_type"]) ??
            "core",
          description: defaultValues.description ?? "",
        });
      } else {
        reset({
          name: "",
          code: "",
          subject_type: "core",
          description: "",
        });
      }
    }
  }, [open, defaultValues, reset]);

  const handleFormSubmit = async (values: SubjectFormValues) => {
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
          <DialogTitle>{isEdit ? "Edit Subject" : "Add Subject"}</DialogTitle>
        </DialogHeader>

        <form
          id="subject-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid grid-cols-2 gap-4"
        >
          {/* Name */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="subject-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject-name"
              placeholder="e.g. Mathematics"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-code">Code</Label>
            <Input
              id="subject-code"
              placeholder="e.g. MATH"
              {...register("code")}
            />
          </div>

          {/* Subject Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-type">Type</Label>
            <Controller
              name="subject_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "core"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="subject-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subject_type && (
              <p className="text-xs text-destructive">
                {errors.subject_type.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="subject-description">Description</Label>
            <textarea
              id="subject-description"
              rows={3}
              placeholder="Optional description"
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("description")}
            />
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
          <Button type="submit" form="subject-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
