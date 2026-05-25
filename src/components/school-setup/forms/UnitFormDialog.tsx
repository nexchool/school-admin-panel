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
import type { SchoolUnit } from "@/services/schoolUnitsService";

const unitFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  dise_no: z.string().optional(),
  gr_number_scheme: z.string().min(1, "GR Number Scheme is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;

type UnitFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: SchoolUnit | null;
  onSubmit: (values: UnitFormValues) => Promise<void>;
  saving?: boolean;
};

export function UnitFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  saving,
}: UnitFormDialogProps) {
  const isEdit = !!defaultValues;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: "",
      code: "",
      dise_no: "",
      gr_number_scheme: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        reset({
          name: defaultValues.name ?? "",
          code: defaultValues.code ?? "",
          dise_no: defaultValues.dise_no ?? "",
          gr_number_scheme: defaultValues.gr_number_scheme ?? "",
          phone: defaultValues.phone ?? "",
          address: defaultValues.address ?? "",
        });
      } else {
        reset({
          name: "",
          code: "",
          dise_no: "",
          gr_number_scheme: "",
          phone: "",
          address: "",
        });
      }
    }
  }, [open, defaultValues, reset]);

  const handleFormSubmit = async (values: UnitFormValues) => {
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
          <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>

        <form
          id="unit-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid grid-cols-2 gap-4"
        >
          {/* Name */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="unit-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unit-name"
              placeholder="e.g. Main Campus"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="unit-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unit-code"
              placeholder="e.g. MC"
              {...register("code")}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>

          {/* GR Number Scheme */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="unit-gr-scheme">
              GR Number Scheme <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unit-gr-scheme"
              placeholder="e.g. MN-{SEQ}"
              {...register("gr_number_scheme")}
            />
            {errors.gr_number_scheme && (
              <p className="text-xs text-destructive">
                {errors.gr_number_scheme.message}
              </p>
            )}
          </div>

          {/* U-DISE Code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-dise">U-DISE Code</Label>
            <Input
              id="unit-dise"
              placeholder="Optional"
              {...register("dise_no")}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-phone">Phone</Label>
            <Input
              id="unit-phone"
              placeholder="Optional"
              {...register("phone")}
            />
          </div>

          {/* Address */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="unit-address">Address</Label>
            <Input
              id="unit-address"
              placeholder="Optional"
              {...register("address")}
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
          <Button type="submit" form="unit-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
