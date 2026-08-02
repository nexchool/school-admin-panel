"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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
import { requiredString, optionalStringMax, optionalPhoneLoose } from "@/lib/validation/fields";
import { useCreateSchoolUnit, useUpdateSchoolUnit } from "@/hooks/useSchoolUnits";
import { ApiException } from "@/services/api";
import type { ActiveStatus, SchoolUnit } from "@/services/schoolUnitsService";

const STATUS_OPTIONS: { value: ActiveStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const branchSchema = z.object({
  name: requiredString("Branch name").max(
    255,
    "Branch name must be 255 characters or fewer"
  ),
  code: requiredString("Branch code").max(
    32,
    "Branch code must be 32 characters or fewer"
  ),
  status: z.enum(["active", "inactive"]).default("active"),
  // Lenient: a campus contact is often a landline with an STD code.
  phone: optionalPhoneLoose,
  address: optionalStringMax(1000, "Address"),
  dise_no: optionalStringMax(64, "DISE number"),
  index_no: optionalStringMax(64, "Index number"),
  recognition_no: optionalStringMax(64, "Recognition number"),
  gr_number_scheme: optionalStringMax(64, "GR number scheme"),
});

type BranchFormValues = z.infer<typeof branchSchema>;

/** Optional text fields go to the API as null, not "" — matches server _clean(). */
const orNull = (value: string | undefined): string | null => value?.trim() || null;

interface BranchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null means create mode. */
  branch: SchoolUnit | null;
}

export function BranchFormModal({
  open,
  onOpenChange,
  branch,
}: BranchFormModalProps) {
  const isEdit = !!branch;
  const createBranch = useCreateSchoolUnit();
  const updateBranch = useUpdateSchoolUnit();

  const toDefaults = (): BranchFormValues => ({
    name: branch?.name ?? "",
    code: branch?.code ?? "",
    status: branch?.status ?? "active",
    phone: branch?.phone ?? "",
    address: branch?.address ?? "",
    dise_no: branch?.dise_no ?? "",
    index_no: branch?.index_no ?? "",
    recognition_no: branch?.recognition_no ?? "",
    gr_number_scheme: branch?.gr_number_scheme ?? "",
  });

  const form = useForm<BranchFormValues>({
    // Same cast DepartmentFormModal uses: zodResolver's inferred input/output
    // types diverge from RHF's generic because of .default() on status.
    resolver: zodResolver(branchSchema) as never,
    defaultValues: toDefaults(),
  });

  // Reseed when opened or when the edited branch changes — the modal is
  // mounted persistently with `branch` toggling null<->row.
  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branch]);

  const handleClose = (o: boolean) => {
    if (!o) form.reset(toDefaults());
    onOpenChange(o);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: Partial<SchoolUnit> = {
      name: values.name.trim(),
      code: values.code.trim(),
      status: values.status,
      phone: orNull(values.phone),
      address: orNull(values.address),
      dise_no: orNull(values.dise_no),
      index_no: orNull(values.index_no),
      recognition_no: orNull(values.recognition_no),
      gr_number_scheme: orNull(values.gr_number_scheme),
    };

    try {
      if (isEdit && branch) {
        await updateBranch.mutateAsync({ id: branch.id, data: payload });
      } else {
        await createBranch.mutateAsync(payload);
      }
      handleClose(false);
    } catch (error) {
      // A duplicate code lands on the Code field rather than a toast, keyed off
      // the server's error code rather than its message text.
      const body =
        error instanceof ApiException
          ? (error.data as { error?: string } | undefined)
          : undefined;
      if (body?.error === "DuplicateError" && error instanceof ApiException) {
        form.setError("code", { message: error.message });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  });

  const { errors, isSubmitting } = form.formState;
  const status = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* The dialog itself is capped and scrolls internally: DialogContent is
          centred with no max-height of its own, so an unconstrained tall form
          clips off both the top and bottom of the viewport. Header and footer
          stay pinned; only the field area scrolls. */}
      <DialogContent
        className="flex max-h-[min(85dvh,44rem)] flex-col overflow-hidden sm:max-w-lg"
        onClose={() => handleClose(false)}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit Branch" : "New Branch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="no-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto">
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identity
              </h3>

              <div className="space-y-2">
                <Label htmlFor="branch_name">Name *</Label>
                {/* No autoFocus: --ring is near-black, so a focused field opens
                    with a heavy dark ring. Every other form modal (departments,
                    subjects, …) opens unfocused — match them. */}
                <Input
                  id="branch_name"
                  {...form.register("name")}
                  placeholder="e.g. North Campus"
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
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.status?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </h3>

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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Regulatory
              </h3>

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
                <Input id="branch_recognition" {...form.register("recognition_no")} />
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
          </div>

          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
