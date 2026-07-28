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
import { FieldError } from "@/components/ui/field-error";
import { requiredString, optionalString } from "@/lib/validation/fields";
import { useDepartments } from "@/hooks/useDepartments";
import type { ClassItem } from "@/types/class";
import type { AcademicYear } from "@/services/academicYearsService";

interface TeacherOption {
  id: string;
  name: string;
  employee_id?: string;
}

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ClassItem;
  academicYears: AcademicYear[];
  availableTeachers: TeacherOption[];
  onSubmit: (data: {
    name: string;
    section: string;
    academic_year_id: string;
    teacher_id?: string;
    department_id?: string | null;
  }) => Promise<void>;
}

const NONE_VALUE = "__none__";

const classSchema = z.object({
  name: requiredString("Name"),
  section: requiredString("Section"),
  academic_year_id: requiredString("Academic year"),
  teacher_id: optionalString,
  department_id: z.string().optional().nullable(),
});

type ClassFormValues = z.infer<typeof classSchema>;

export function ClassFormModal({
  open,
  onOpenChange,
  initialData,
  academicYears,
  availableTeachers,
  onSubmit,
}: ClassFormModalProps) {
  const toDefaults = (): ClassFormValues => ({
    name: initialData?.name ?? "",
    section: initialData?.section ?? "",
    academic_year_id: initialData?.academic_year_id ?? academicYears[0]?.id ?? "",
    teacher_id: initialData?.teacher_id ?? "",
    department_id: initialData?.department_id ?? "",
  });

  const form = useForm<ClassFormValues>({
    // zodResolver's inferred input/output types diverge from RHF's generic
    // here (same cast TeacherFormModal/DepartmentFormModal use for the same
    // reason).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(classSchema) as any,
    defaultValues: toDefaults(),
  });

  const { data: departmentsData } = useDepartments({
    status: "active",
    perPage: 100,
  });
  const departments = departmentsData?.items ?? [];

  // The active-departments facet omits a department that has since gone
  // inactive. If the class being edited is still assigned to it, that id
  // won't match any SelectItem and Radix falls back to the placeholder —
  // which reads identically to the real "None" entry. Inject a disabled
  // option for it so an inactive assignment stays visually distinct from
  // "no department", instead of looking like one (see TeacherFormModal for
  // the same pattern).
  const currentDepartmentId = initialData?.department_id ?? null;
  const isCurrentDepartmentInactive =
    !!currentDepartmentId &&
    !departments.some((d) => d.id === currentDepartmentId);

  // Reseed when opened or when the edited class changes — the modal is mounted
  // persistently with initialData toggling, so a once-only seed shows stale fields.
  useEffect(() => {
    if (open) form.reset(toDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const handleClose = (o: boolean) => {
    if (!o) form.reset(toDefaults());
    onOpenChange(o);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name.trim(),
        section: values.section.trim(),
        academic_year_id: values.academic_year_id,
        teacher_id: values.teacher_id ? values.teacher_id : undefined,
        department_id: values.department_id || null,
      });
      handleClose(false);
    } catch {
      // Parent handler toasts API errors and rethrows when applicable.
    }
  });

  const { errors, isSubmitting } = form.formState;
  const teacherId = form.watch("teacher_id") || "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class_name">Name *</Label>
            <Input id="class_name" {...form.register("name")} placeholder="e.g. Class 10" />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_section">Section *</Label>
            <Input id="class_section" {...form.register("section")} placeholder="e.g. A" />
            <FieldError message={errors.section?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_academic_year">Academic Year *</Label>
            <Select
              value={form.watch("academic_year_id") || undefined}
              onValueChange={(v) => form.setValue("academic_year_id", v, { shouldValidate: true })}
            >
              <SelectTrigger id="class_academic_year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.academic_year_id?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_teacher">Class Teacher (optional)</Label>
            <Select
              value={teacherId || NONE_VALUE}
              onValueChange={(v) => form.setValue("teacher_id", v === NONE_VALUE ? "" : v)}
            >
              <SelectTrigger id="class_teacher">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {availableTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_department">Department (optional)</Label>
            <Select
              value={form.watch("department_id") || NONE_VALUE}
              onValueChange={(v) =>
                form.setValue("department_id", v === NONE_VALUE ? "" : v)
              }
            >
              <SelectTrigger id="class_department">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {isCurrentDepartmentInactive && currentDepartmentId && (
                  <SelectItem value={currentDepartmentId} disabled>
                    {initialData?.department_name ?? "Unknown department"} (inactive)
                  </SelectItem>
                )}
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCurrentDepartmentInactive && (
              <p className="text-xs text-muted-foreground">
                This department is now inactive. Choose another to reassign,
                or leave it as-is to keep this class&apos;s current assignment.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : initialData ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
