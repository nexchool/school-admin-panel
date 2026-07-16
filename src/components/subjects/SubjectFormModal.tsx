"use client";

import { useEffect, useMemo, useState } from "react";
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
import { FieldError } from "@/components/ui/field-error";
import { requiredString, optionalString } from "@/lib/validation/fields";
import { useClasses } from "@/hooks/useClasses";
import { useProgrammes } from "@/hooks/useProgrammes";
import type { ClassItem } from "@/types/class";
import type {
  CreateSubjectInput,
  Subject,
  SubjectType,
} from "@/types/subject";

const SUBJECT_TYPES: { value: SubjectType; label: string }[] = [
  { value: "core", label: "Core" },
  { value: "elective", label: "Elective" },
  { value: "language", label: "Language" },
  { value: "activity", label: "Activity" },
  { value: "co_curricular", label: "Co-curricular" },
  { value: "other", label: "Other" },
];

const ALL_PROGRAMMES = "__all__";

// Code is required for NEW subjects (the catalogue and onboarding seed key on
// it) but optional when editing, so legacy subjects created without a code
// stay editable.
const buildSubjectSchema = (requireCode: boolean) =>
  z.object({
    name: requiredString("Name"),
    code: requireCode
      ? z
          .string()
          .trim()
          .min(1, "Subject code is required")
          .max(20, "Subject code must be 20 characters or fewer")
      : z
          .string()
          .trim()
          .max(20, "Subject code must be 20 characters or fewer")
          .optional()
          .or(z.literal("")),
    description: optionalString,
    subject_type: z.enum([
      "core",
      "elective",
      "language",
      "activity",
      "co_curricular",
      "other",
    ]),
    weekly_periods: z.coerce
      .number({ message: "Enter a valid number for weekly periods" })
      .int("Weekly periods must be a whole number")
      .min(1, "Weekly periods must be at least 1")
      .max(40, "Weekly periods must be at most 40"),
  });

type SubjectFormValues = z.infer<ReturnType<typeof buildSubjectSchema>>;

export function classAssignmentLabel(c: ClassItem): string {
  const base = c.name?.trim() || [c.grade_name, c.section].filter(Boolean).join(" - ") || c.section || c.id;
  const programme = c.programme_name ? ` · ${c.programme_name}` : "";
  return `${base}${programme}`;
}

interface SubjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Subject;
  onSubmit: (data: CreateSubjectInput) => Promise<void>;
  /** Whether the caller holds class_subject.manage — the backend rejects
   *  create-with-class_ids without it, so hide the section entirely. */
  canAssignClasses?: boolean;
}

export function SubjectFormModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  canAssignClasses = false,
}: SubjectFormModalProps) {
  const isEdit = !!initialData;
  const showClassAssignment = !isEdit && canAssignClasses;

  const toDefaults = (): SubjectFormValues => ({
    name: initialData?.name ?? "",
    code: initialData?.code ?? "",
    description: initialData?.description ?? "",
    subject_type: (SUBJECT_TYPES.some((t) => t.value === initialData?.subject_type)
      ? (initialData?.subject_type as SubjectType)
      : "core"),
    weekly_periods: 1,
  });

  const subjectSchema = useMemo(() => buildSubjectSchema(!isEdit), [isEdit]);
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema) as never,
    defaultValues: toDefaults(),
  });

  // Class assignment (create only): programme filter + class multi-select.
  const [programmeFilter, setProgrammeFilter] = useState<string>(ALL_PROGRAMMES);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const { data: programmes = [] } = useProgrammes();
  const { data: classes = [] } = useClasses();

  const visibleClasses = useMemo(() => {
    if (programmeFilter === ALL_PROGRAMMES) return classes;
    return classes.filter((c) => c.programme_id === programmeFilter);
  }, [classes, programmeFilter]);

  // Reseed when opened or when the edited subject changes — the modal is
  // mounted persistently with initialData toggling null<->row.
  useEffect(() => {
    if (open) {
      form.reset(toDefaults());
      setProgrammeFilter(ALL_PROGRAMMES);
      setSelectedClassIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const handleClose = (o: boolean) => {
    if (!o) form.reset(toDefaults());
    onOpenChange(o);
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const classIds = showClassAssignment ? Array.from(selectedClassIds) : [];
      const code = values.code?.trim();
      await onSubmit({
        name: values.name.trim(),
        code: code ? code.toUpperCase() : undefined,
        description: values.description?.trim() || undefined,
        subject_type: values.subject_type,
        ...(classIds.length === 0
          ? {}
          : { class_ids: classIds, weekly_periods: values.weekly_periods }),
      });
      handleClose(false);
    } catch {
      // Parent handler toasts API errors and rethrows when applicable.
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Subject" : "Add Subject"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject_name">Name *</Label>
            <Input
              id="subject_name"
              {...form.register("name")}
              placeholder="e.g. Mathematics"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subject_code">
                {isEdit ? "Subject code" : "Subject code *"}
              </Label>
              <Input
                id="subject_code"
                {...form.register("code")}
                placeholder="e.g. MATH"
                className="uppercase"
              />
              <FieldError message={errors.code?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_type">Type *</Label>
              <Select
                value={form.watch("subject_type")}
                onValueChange={(v) =>
                  form.setValue("subject_type", v as SubjectType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="subject_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.subject_type?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject_description">Description</Label>
            <Input
              id="subject_description"
              {...form.register("description")}
              placeholder="Optional description"
            />
            <FieldError message={errors.description?.message} />
          </div>

          {showClassAssignment && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label>Assign to classes (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Pick a programme to narrow the class list. Classes already
                carrying this subject are skipped automatically.
              </p>
              <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All programmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROGRAMMES}>All programmes</SelectItem>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {visibleClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No classes found for this programme in the active academic year.
                </p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                  {visibleClasses.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={selectedClassIds.has(c.id)}
                        onChange={() => toggleClass(c.id)}
                      />
                      <span>{classAssignmentLabel(c)}</span>
                    </label>
                  ))}
                </div>
              )}

              {selectedClassIds.size > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subject_weekly_periods">
                    Weekly periods per class
                  </Label>
                  <Input
                    id="subject_weekly_periods"
                    type="number"
                    min={1}
                    max={40}
                    className="w-28"
                    {...form.register("weekly_periods")}
                  />
                  <FieldError message={errors.weekly_periods?.message} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
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
