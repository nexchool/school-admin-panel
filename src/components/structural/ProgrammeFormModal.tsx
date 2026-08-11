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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { optionalStringMax, requiredString } from "@/lib/validation/fields";
import { useCreateProgramme, useUpdateProgramme } from "@/hooks/useProgrammes";
import { ApiException } from "@/services/api";
import type { AcademicProgramme } from "@/services/programmesService";
import type { ActiveStatus } from "@/services/schoolUnitsService";

const programmeSchema = z.object({
  board: requiredString("Board").max(128, "Board must be 128 characters or fewer"),
  medium: optionalStringMax(64, "Medium"),
  code: requiredString("Code").max(32, "Code must be 32 characters or fewer"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type ProgrammeFormValues = z.infer<typeof programmeSchema>;

interface ProgrammeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null means create mode. */
  programme: AcademicProgramme | null;
}

/**
 * Add or correct a programme.
 *
 * The **name is not a field.** A programme's name is its board and, where the
 * school runs one board in more than one language, its medium — "GSEB
 * Gujarati". Letting somebody type a name independently of those two is how a
 * catalogue ends up with "GSEB Guj" next to "GSEB Gujarati Medium" naming the
 * same thing. It is composed on submit instead.
 */
export function ProgrammeFormModal({
  open,
  onOpenChange,
  programme,
}: ProgrammeFormModalProps) {
  const isEdit = !!programme;
  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();

  const toDefaults = (): ProgrammeFormValues => ({
    board: programme?.board ?? "",
    medium: programme?.medium ?? "",
    code: programme?.code ?? "",
    status: programme?.status ?? "active",
  });

  const form = useForm<ProgrammeFormValues>({
    // Same cast the other form modals use: zodResolver's inferred input/output
    // types diverge from RHF's generic because of `.default()` on status.
    resolver: zodResolver(programmeSchema) as never,
    defaultValues: toDefaults(),
  });

  // Reseeded on open because the modal stays mounted with `programme` toggling
  // between null and a row.
  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, programme]);

  const handleClose = (next: boolean) => {
    if (!next) form.reset(toDefaults());
    onOpenChange(next);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const board = values.board.trim();
    const medium = values.medium?.trim() ?? "";
    const payload = {
      name: medium ? `${board} ${medium}` : board,
      board,
      code: values.code.trim(),
      medium: medium || null,
      status: values.status,
    };

    try {
      if (isEdit && programme) {
        await updateProgramme.mutateAsync({ id: programme.id, data: payload });
        toast.success("Programme updated.");
      } else {
        await createProgramme.mutateAsync(payload);
        toast.success("Programme added.");
      }
      handleClose(false);
    } catch (error) {
      // A duplicate code belongs on the Code field, not in a toast that
      // disappears before the person has looked back at the form.
      if (error instanceof ApiException && error.status === 409) {
        form.setError("code", { message: error.message });
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  });

  const { errors, isSubmitting } = form.formState;
  const status = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onClose={() => handleClose(false)}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit programme" : "New programme"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="programme_board">Board *</Label>
              <Input
                id="programme_board"
                {...form.register("board")}
                placeholder="CBSE / GSEB / ICSE"
              />
              <FieldError message={errors.board?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="programme_medium">Medium</Label>
              <Input
                id="programme_medium"
                {...form.register("medium")}
                placeholder="e.g. English, Gujarati"
              />
              <FieldError message={errors.medium?.message} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="programme_code">Code *</Label>
              <Input
                id="programme_code"
                {...form.register("code")}
                placeholder="e.g. GSEB-GUJ"
                maxLength={32}
              />
              <FieldError message={errors.code?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="programme_status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  form.setValue("status", value as ActiveStatus, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="programme_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add programme"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
