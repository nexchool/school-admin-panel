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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { requiredString, optionalStringMax } from "@/lib/validation/fields";
import { useCreateDepartment, useUpdateDepartment } from "@/hooks/useDepartments";
import { ApiException } from "@/services/api";
import type { CreateDepartmentInput, Department, DepartmentStatus } from "@/types/department";

const STATUS_OPTIONS: { value: DepartmentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// display_order has no ready-made shared validator (the closest,
// optionalNonNegativeNumber, resolves to `number | undefined` rather than
// defaulting to 0), so it is composed directly here per the task brief.
const departmentSchema = z.object({
  name: requiredString("Department name").max(
    100,
    "Department name must be 100 characters or fewer"
  ),
  code: optionalStringMax(20, "Department code"),
  description: optionalStringMax(1000, "Description"),
  display_order: z.coerce
    .number({ message: "Enter a valid number for display order" })
    .int("Display order must be a whole number")
    .min(0, "Display order cannot be negative")
    .default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null means create mode. */
  department: Department | null;
}

export function DepartmentFormModal({
  open,
  onOpenChange,
  department,
}: DepartmentFormModalProps) {
  const isEdit = !!department;
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  const toDefaults = (): DepartmentFormValues => ({
    name: department?.name ?? "",
    code: department?.code ?? "",
    description: department?.description ?? "",
    display_order: department?.display_order ?? 0,
    status: department?.status ?? "active",
  });

  const form = useForm<DepartmentFormValues>({
    // Same cast SubjectFormModal uses: zodResolver's inferred input/output
    // types diverge from RHF's generic here because of the z.coerce +
    // .default() combination on display_order.
    resolver: zodResolver(departmentSchema) as never,
    defaultValues: toDefaults(),
  });

  // Reseed when opened or when the edited department changes — the modal is
  // mounted persistently with `department` toggling null<->row.
  useEffect(() => {
    if (open) {
      form.reset(toDefaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, department]);

  const handleClose = (o: boolean) => {
    if (!o) form.reset(toDefaults());
    onOpenChange(o);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const code = values.code?.trim();
    const description = values.description?.trim();
    const payload: CreateDepartmentInput = {
      name: values.name.trim(),
      code: code ? code : null,
      description: description ? description : null,
      display_order: values.display_order,
      status: values.status,
    };

    try {
      if (isEdit && department) {
        await updateDepartment.mutateAsync({ id: department.id, ...payload });
      } else {
        await createDepartment.mutateAsync(payload);
      }
      handleClose(false);
    } catch (error) {
      // Duplicate name/code lands on the offending field instead of a toast —
      // see useDepartments.ts and .claude/rules/query-conventions.md's sibling
      // note in the task brief on keying off error codes, not message text.
      const body =
        error instanceof ApiException
          ? (error.data as { error?: string } | undefined)
          : undefined;
      if (body?.error === "DuplicateError" && error instanceof ApiException) {
        const field = error.message.toLowerCase().includes("code") ? "code" : "name";
        form.setError(field, { message: error.message });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={() => handleClose(false)}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="department_name">Department Name *</Label>
            <Input
              id="department_name"
              {...form.register("name")}
              placeholder="e.g. Science"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_code">Department Code</Label>
            <Input
              id="department_code"
              {...form.register("code")}
              placeholder="e.g. SCI"
              className="uppercase"
            />
            <FieldError message={errors.code?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_description">Description</Label>
            <Textarea
              id="department_description"
              {...form.register("description")}
              placeholder="Optional description"
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="department_display_order">Display Order</Label>
              <Input
                id="department_display_order"
                type="number"
                min={0}
                {...form.register("display_order")}
              />
              <FieldError message={errors.display_order?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_status">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", v as DepartmentStatus, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="department_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.status?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
