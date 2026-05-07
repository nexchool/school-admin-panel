"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGrades } from "@/hooks/useGrades";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useMediums } from "@/hooks/useSubjectContexts";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import type { ClassItem } from "@/types/class";

const STREAM_OPTIONS = [
  { value: "science", label: "Science" },
  { value: "commerce", label: "Commerce" },
  { value: "arts", label: "Arts" },
  { value: "general", label: "General" },
] as const;

const classFormSchema = z.object({
  name: z.string().min(1, "Section name is required"),
  grade_id: z.string().min(1, "Grade is required"),
  programme_id: z.string().min(1, "Programme is required"),
  medium_id: z.string().optional(),
  school_unit_id: z.string().min(1, "School unit is required"),
  stream: z.string().optional(),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;

type ClassFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: ClassItem | null;
  onSubmit: (values: ClassFormValues) => Promise<void>;
  saving?: boolean;
};

/** Returns true when the grade sequence indicates a senior secondary class (11/12). */
function isSeniorSecondary(sequence: number | undefined): boolean {
  if (sequence == null) return false;
  return sequence >= 11;
}

export function ClassFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  saving,
}: ClassFormDialogProps) {
  const isEdit = !!defaultValues;

  const { data: grades = [] } = useGrades();
  const { data: programmes = [] } = useProgrammes();
  const { data: units = [] } = useSchoolUnits();
  const { data: mediums = [] } = useMediums();
  const { academicYearId } = useActiveAcademicYear();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      grade_id: "",
      programme_id: "",
      medium_id: "",
      school_unit_id: "",
      stream: "",
    },
  });

  const watchedGradeId = watch("grade_id");
  const selectedGrade = grades.find((g) => g.id === watchedGradeId);
  const showStream = isSeniorSecondary(selectedGrade?.sequence);

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        reset({
          name: defaultValues.name ?? "",
          grade_id: defaultValues.grade_id ?? "",
          programme_id: defaultValues.programme_id ?? "",
          medium_id: "",
          school_unit_id: defaultValues.school_unit_id ?? "",
          stream: "",
        });
      } else {
        reset({
          name: "",
          grade_id: "",
          programme_id: "",
          medium_id: "",
          school_unit_id: "",
          stream: "",
        });
      }
    }
  }, [open, defaultValues, reset]);

  const handleFormSubmit = async (values: ClassFormValues) => {
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
          <DialogTitle>{isEdit ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>

        {/* Hidden academic_year_id — consumed by parent onSubmit */}
        <input type="hidden" value={academicYearId ?? ""} name="academic_year_id" readOnly />

        <form
          id="class-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid grid-cols-2 gap-4"
        >
          {/* Section name */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="class-name">
              Section name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="class-name"
              placeholder="e.g. A, B, C"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Grade */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-grade">
              Grade <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="grade_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="class-grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.grade_id && (
              <p className="text-xs text-destructive">{errors.grade_id.message}</p>
            )}
          </div>

          {/* School unit */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-unit">
              School unit <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="school_unit_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="class-unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.school_unit_id && (
              <p className="text-xs text-destructive">{errors.school_unit_id.message}</p>
            )}
          </div>

          {/* Programme */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-programme">
              Programme <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="programme_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="class-programme">
                    <SelectValue placeholder="Select programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.programme_id && (
              <p className="text-xs text-destructive">{errors.programme_id.message}</p>
            )}
          </div>

          {/* Medium */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-medium">Medium</Label>
            <Controller
              name="medium_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="class-medium">
                    <SelectValue placeholder="Select medium (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediums.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Stream — only for grades 11/12 (sequence >= 11) */}
          {showStream && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="class-stream">Stream</Label>
              <Controller
                name="stream"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="class-stream">
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAM_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
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
          <Button type="submit" form="class-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
