"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { HostelRoom } from "@/services/hostelService";

/**
 * Create / edit dialog for a HostelRoom.
 *
 * Notes:
 *   - `room_number` must be unique within (tenant, hostel) — that is enforced
 *     server-side (uq_hostel_rooms_tenant_hostel_room_number); we don't
 *     duplicate the check here, just surface server errors.
 *   - `floor` defaults to "Ground Floor" if blank (matches the server default).
 *   - `capacity` must be a positive integer.
 */
const roomFormSchema = z.object({
  room_number: z.string().trim().min(1, "Room number is required"),
  floor: z.string().trim().min(1, "Floor is required"),
  capacity: z
    .number({ error: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .positive("Capacity must be greater than zero")
    .max(50, "Capacity looks too high — max 50 beds per room"),
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;

type RoomFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: HostelRoom | null;
  /** Used to scope the dialog title and submit handler context. */
  hostelName?: string;
  onSubmit: (values: RoomFormValues) => Promise<void>;
  saving?: boolean;
};

export function RoomFormDialog({
  open,
  onOpenChange,
  defaultValues,
  hostelName,
  onSubmit,
  saving,
}: RoomFormDialogProps) {
  const isEdit = Boolean(defaultValues);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      room_number: "",
      floor: "Ground Floor",
      capacity: 4,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        room_number: defaultValues?.room_number ?? "",
        floor: defaultValues?.floor ?? "Ground Floor",
        capacity: defaultValues?.capacity ?? 4,
      });
    }
  }, [open, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit room" : "Add room"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the room's details. Reducing capacity below the current resident count is not allowed."
                : hostelName
                  ? `Add a new room to ${hostelName}.`
                  : "Add a new room to this hostel."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="room_number">Room number</Label>
              <Input
                id="room_number"
                placeholder="e.g. 101"
                aria-invalid={Boolean(errors.room_number)}
                {...register("room_number")}
              />
              {errors.room_number && (
                <p className="text-sm text-destructive">
                  {errors.room_number.message}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                placeholder="e.g. Ground Floor, 1st Floor"
                aria-invalid={Boolean(errors.floor)}
                {...register("floor")}
              />
              {errors.floor && (
                <p className="text-sm text-destructive">{errors.floor.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Rooms with the same floor name are grouped together.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="capacity">Bed capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={50}
                aria-invalid={Boolean(errors.capacity)}
                {...register("capacity", { valueAsNumber: true })}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive">
                  {errors.capacity.message}
                </p>
              )}
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
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
