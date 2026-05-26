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
import type { AcademicProgramme } from "@/services/programmesService";

const BOARD_OPTIONS = [
  { value: "CBSE", label: "CBSE" },
  { value: "GSEB", label: "GSEB" },
  { value: "ICSE", label: "ICSE" },
  { value: "IB", label: "IB" },
  { value: "Custom", label: "Custom" },
] as const;

const MEDIUM_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Gujarati", label: "Gujarati" },
  { value: "Hindi", label: "Hindi" },
  { value: "Other", label: "Other" },
] as const;

const programmeFormSchema = z.object({
  board: z.enum(["CBSE", "GSEB", "ICSE", "IB", "Custom"], {
    error: "Board is required",
  }),
  medium: z.string().min(1, "Medium is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
});

export type ProgrammeFormValues = z.infer<typeof programmeFormSchema>;

type ProgrammeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: AcademicProgramme | null;
  onSubmit: (values: ProgrammeFormValues) => Promise<void>;
  saving?: boolean;
};

export function ProgrammeFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  saving,
}: ProgrammeFormDialogProps) {
  const isEdit = !!defaultValues;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProgrammeFormValues>({
    resolver: zodResolver(programmeFormSchema),
    defaultValues: {
      board: "CBSE",
      medium: "",
      name: "",
      code: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        reset({
          board: (defaultValues.board as ProgrammeFormValues["board"]) ?? "CBSE",
          medium: defaultValues.medium ?? "",
          name: defaultValues.name ?? "",
          code: defaultValues.code ?? "",
        });
      } else {
        reset({
          board: "CBSE",
          medium: "",
          name: "",
          code: "",
        });
      }
    }
  }, [open, defaultValues, reset]);

  const board = watch("board");
  const medium = watch("medium");

  // Auto-suggest name when board+medium are set but name is still empty
  useEffect(() => {
    if (board && medium) {
      const currentName = getValues("name");
      if (!currentName) {
        setValue("name", `${board} ${medium}`, { shouldValidate: false });
      }
    }
  }, [board, medium, getValues, setValue]);

  const handleFormSubmit = async (values: ProgrammeFormValues) => {
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
          <DialogTitle>
            {isEdit ? "Edit Programme" : "Add Programme"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="programme-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid grid-cols-2 gap-4"
        >
          {/* Board */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="programme-board">
              Board <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="board"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="programme-board">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.board && (
              <p className="text-xs text-destructive">{errors.board.message}</p>
            )}
          </div>

          {/* Medium */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="programme-medium">
              Medium <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="medium"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="programme-medium">
                    <SelectValue placeholder="Select medium" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.medium && (
              <p className="text-xs text-destructive">
                {errors.medium.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="programme-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="programme-name"
              placeholder="e.g. CBSE English"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="programme-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="programme-code"
              placeholder="e.g. CBSE-ENG"
              {...register("code")}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
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
          <Button type="submit" form="programme-form" disabled={saving}>
            {saving
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add Programme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
