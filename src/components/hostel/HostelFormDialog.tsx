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
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Hostel } from "@/services/hostelService";

/**
 * Form for creating or editing a hostel.
 *
 * - `name` and `capacity` are required (matches backend POST validator).
 * - `warden_name`, `warden_phone`, `address` are optional.
 * - Capacity must be a positive integer.
 */
const hostelFormSchema = z.object({
  name: z.string().trim().min(1, "Hostel name is required"),
  // RHF + <input type="number"> gives us a number via valueAsNumber, but if
  // the field is blank we get NaN. Validate the resulting number directly.
  capacity: z
    .number({ error: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .positive("Capacity must be greater than zero"),
  warden_name: z.string().trim().optional().or(z.literal("")),
  warden_phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
});

export type HostelFormValues = z.infer<typeof hostelFormSchema>;

type HostelFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Hostel | null;
  onSubmit: (values: HostelFormValues) => Promise<void>;
  saving?: boolean;
};

export function HostelFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  saving,
}: HostelFormDialogProps) {
  const isEdit = Boolean(defaultValues);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HostelFormValues>({
    resolver: zodResolver(hostelFormSchema),
    defaultValues: {
      name: "",
      capacity: 0,
      warden_name: "",
      warden_phone: "",
      address: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: defaultValues?.name ?? "",
        capacity: defaultValues?.capacity ?? 0,
        warden_name: defaultValues?.warden_name ?? "",
        warden_phone: defaultValues?.warden_phone ?? "",
        address: defaultValues?.address ?? "",
      });
    }
  }, [open, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit hostel" : "Create hostel"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the hostel's details. Capacity is the total number of beds you plan to support."
                : "Add a new hostel facility. You can add rooms and beds once the hostel is created."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Boys Hostel A"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="capacity">Total bed capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                aria-invalid={Boolean(errors.capacity)}
                {...register("capacity", { valueAsNumber: true })}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive">
                  {errors.capacity.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="warden_name">Warden name (optional)</Label>
                <Input
                  id="warden_name"
                  placeholder="e.g. Mr. Iyer"
                  {...register("warden_name")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="warden_phone">Warden phone (optional)</Label>
                <Input
                  id="warden_phone"
                  placeholder="+91 98xxxxxxxx"
                  {...register("warden_phone")}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                placeholder="North Campus, Block B"
                {...register("address")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create hostel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
