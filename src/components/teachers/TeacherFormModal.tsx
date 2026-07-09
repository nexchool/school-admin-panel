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
import { FieldError } from "@/components/ui/field-error";
import {
  requiredString,
  optionalString,
  optionalEmail,
  optionalPhoneLoose,
  optionalDate,
  optionalNumberInRange,
} from "@/lib/validation/fields";
import type { Teacher, CreateTeacherInput } from "@/types/teacher";

interface TeacherFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Teacher;
  onSubmit: (data: CreateTeacherInput) => Promise<void>;
}

const teacherSchema = z.object({
  name: requiredString("Name"),
  email: optionalEmail,
  phone: optionalPhoneLoose,
  designation: optionalString,
  department: optionalString,
  qualification: optionalString,
  specialization: optionalString,
  experience_years: optionalNumberInRange(0, 80, "Experience (years)"),
  address: optionalString,
  date_of_joining: optionalDate,
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

const toDefaults = (t?: Teacher): TeacherFormValues => ({
  name: t?.name ?? "",
  email: t?.email ?? "",
  phone: t?.phone ?? "",
  designation: t?.designation ?? "",
  department: t?.department ?? "",
  qualification: t?.qualification ?? "",
  specialization: t?.specialization ?? "",
  experience_years: t?.experience_years ?? undefined,
  address: t?.address ?? "",
  date_of_joining: t?.date_of_joining ?? "",
});

export function TeacherFormModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: TeacherFormModalProps) {
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema) as any,
    defaultValues: toDefaults(initialData),
  });

  // Reseed when opened or when the edited teacher changes — the modal is mounted
  // persistently with initialData toggling, so a once-only seed shows stale fields.
  useEffect(() => {
    if (open) form.reset(toDefaults(initialData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const handleClose = (o: boolean) => {
    if (!o) form.reset(toDefaults(initialData));
    onOpenChange(o);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const trimmed = (v?: string) => {
      const t = (v ?? "").trim();
      return t === "" ? undefined : t;
    };
    try {
      await onSubmit({
        name: values.name.trim(),
        email: trimmed(values.email),
        phone: trimmed(values.phone),
        designation: trimmed(values.designation),
        department: trimmed(values.department),
        qualification: trimmed(values.qualification),
        specialization: trimmed(values.specialization),
        experience_years: values.experience_years,
        address: trimmed(values.address),
        date_of_joining: values.date_of_joining || undefined,
      });
      handleClose(false);
    } catch {
      // List page: error surfaced here. Detail page: parent toasts and rethrows.
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teacher_name">Name *</Label>
              <Input id="teacher_name" {...form.register("name")} placeholder="Full name" />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_email">Email</Label>
              <Input
                id="teacher_email"
                type="email"
                {...form.register("email")}
                placeholder="email@school.com"
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_phone">Phone</Label>
              <Input id="teacher_phone" {...form.register("phone")} placeholder="+91 9876543210" />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_designation">Designation</Label>
              <Input
                id="teacher_designation"
                {...form.register("designation")}
                placeholder="e.g. Senior Teacher"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_department">Department</Label>
              <Input
                id="teacher_department"
                {...form.register("department")}
                placeholder="e.g. Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_qualification">Qualification</Label>
              <Input
                id="teacher_qualification"
                {...form.register("qualification")}
                placeholder="e.g. M.Sc. Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_specialization">Specialization</Label>
              <Input
                id="teacher_specialization"
                {...form.register("specialization")}
                placeholder="e.g. Algebra"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher_experience">Experience (years)</Label>
              <Input
                id="teacher_experience"
                type="number"
                min={0}
                {...form.register("experience_years" as any)}
                placeholder="0"
              />
              <FieldError message={errors.experience_years?.message} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="teacher_doj">Date of Joining</Label>
              <Input id="teacher_doj" type="date" {...form.register("date_of_joining")} />
              <FieldError message={errors.date_of_joining?.message} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="teacher_address">Address</Label>
              <Input id="teacher_address" {...form.register("address")} placeholder="Full address" />
            </div>
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
