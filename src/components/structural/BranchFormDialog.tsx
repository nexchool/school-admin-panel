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
import type { ActiveStatus, SchoolUnit } from "@/services/schoolUnitsService";

const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  code: z
    .string()
    .trim()
    .min(1, "Branch code is required")
    .max(32, "Code must be 32 characters or fewer"),
  status: z.enum(["active", "inactive"]),
  phone: z.string().trim().max(32, "Phone must be 32 characters or fewer"),
  address: z.string().trim(),
  dise_no: z.string().trim().max(64, "DISE number must be 64 characters or fewer"),
  index_no: z.string().trim().max(64, "Index number must be 64 characters or fewer"),
  recognition_no: z
    .string()
    .trim()
    .max(64, "Recognition number must be 64 characters or fewer"),
  gr_number_scheme: z
    .string()
    .trim()
    .max(64, "GR number scheme must be 64 characters or fewer"),
});

type BranchFormValues = z.infer<typeof branchSchema>;

/** Optional text fields go to the API as null, not "" — matches server _clean(). */
const orNull = (value: string): string | null => value.trim() || null;

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit or pass null to create; pass a unit to edit. */
  unit?: SchoolUnit | null;
  onSubmit: (payload: Partial<SchoolUnit>) => Promise<void>;
}

export function BranchFormDialog({
  open,
  onOpenChange,
  unit,
  onSubmit,
}: BranchFormDialogProps) {
  const isEdit = !!unit;

  const toDefaults = (): BranchFormValues => ({
    name: unit?.name ?? "",
    code: unit?.code ?? "",
    status: unit?.status ?? "active",
    phone: unit?.phone ?? "",
    address: unit?.address ?? "",
    dise_no: unit?.dise_no ?? "",
    index_no: unit?.index_no ?? "",
    recognition_no: unit?.recognition_no ?? "",
    gr_number_scheme: unit?.gr_number_scheme ?? "",
  });

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: toDefaults(),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name.trim(),
        code: values.code.trim(),
        status: values.status,
        phone: orNull(values.phone),
        address: orNull(values.address),
        dise_no: orNull(values.dise_no),
        index_no: orNull(values.index_no),
        recognition_no: orNull(values.recognition_no),
        gr_number_scheme: orNull(values.gr_number_scheme),
      });
      onOpenChange(false);
    } catch (error) {
      // Keep the dialog open so the admin can correct the input. A duplicate
      // code is by far the likeliest rejection, so route it to that field.
      const message =
        error instanceof Error ? error.message : "Could not save branch.";
      form.setError(/code/i.test(message) ? "code" : "root", { message });
    }
  });

  const { errors, isSubmitting } = form.formState;
  const status = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit branch" : "Add branch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto">
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Identity</h3>

            <div className="space-y-2">
              <Label htmlFor="branch_name">Name *</Label>
              <Input
                id="branch_name"
                {...form.register("name")}
                placeholder="e.g. North Campus"
                autoFocus
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branch_code">Code *</Label>
                <Input
                  id="branch_code"
                  {...form.register("code")}
                  placeholder="e.g. NC"
                  maxLength={32}
                />
                <FieldError message={errors.code?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    form.setValue("status", value as ActiveStatus, {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger id="branch_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.status?.message} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>

            <div className="space-y-2">
              <Label htmlFor="branch_phone">Phone</Label>
              <Input
                id="branch_phone"
                {...form.register("phone")}
                placeholder="e.g. +91 79 1234 5678"
              />
              <FieldError message={errors.phone?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_address">Address</Label>
              <Textarea
                id="branch_address"
                rows={3}
                {...form.register("address")}
                placeholder="Street, area, city, PIN"
              />
              <FieldError message={errors.address?.message} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Regulatory</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branch_dise">DISE No.</Label>
                <Input id="branch_dise" {...form.register("dise_no")} />
                <FieldError message={errors.dise_no?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_index">Index No.</Label>
                <Input id="branch_index" {...form.register("index_no")} />
                <FieldError message={errors.index_no?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_recognition">Recognition No.</Label>
              <Input
                id="branch_recognition"
                {...form.register("recognition_no")}
              />
              <FieldError message={errors.recognition_no?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_gr_scheme">GR Number Scheme</Label>
              <Input
                id="branch_gr_scheme"
                {...form.register("gr_number_scheme")}
                placeholder="e.g. NC-{SEQ}"
              />
              <p className="text-xs text-muted-foreground">
                {"{SEQ}"} is replaced with a zero-padded counter that increments
                per student admitted to this branch.
              </p>
              <FieldError message={errors.gr_number_scheme?.message} />
            </div>
          </section>

          <FieldError message={errors.root?.message} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
