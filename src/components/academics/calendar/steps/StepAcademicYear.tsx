"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
} from "@/hooks/useAcademicYears";
import { useCreateCalendarDraft } from "@/hooks/useAcademicCalendar";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiGet, apiPatch } from "@/services/api";
import { toastError } from "@/lib/errorToast";
import type { AcademicYear } from "@/services/academicYearsService";

const yearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Academic year is required")
      .max(20, "Academic year must be 20 characters or fewer"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    set_as_current: z.boolean(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date > v.start_date, {
    message: "End date cannot be before start date",
    path: ["end_date"],
  });

type YearFormValues = z.infer<typeof yearSchema>;

interface AcademicSettingsShape {
  current_academic_year_id: string | null;
}

interface StepAcademicYearProps {
  /** Selected year when resuming; null on a fresh setup. */
  year: AcademicYear | null;
  /** Called once the year exists and its calendar draft is created. */
  onYearReady: (yearId: string) => void;
  onCancel: () => void;
}

export function StepAcademicYear({ year, onYearReady, onCancel }: StepAcademicYearProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const { data: years = [] } = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const updateYear = useUpdateAcademicYear();
  const createDraft = useCreateCalendarDraft();

  const { data: settings } = useQuery({
    queryKey: ["academic-settings", tenantId],
    queryFn: () => apiGet<AcademicSettingsShape>("/api/academics/settings"),
    enabled: !!tenantId,
  });

  const setCurrentYear = useMutation({
    mutationFn: (yearId: string) =>
      apiPatch<AcademicSettingsShape>("/api/academics/settings", {
        current_academic_year_id: yearId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academic-settings"] }),
  });

  const isCurrent = !!year && settings?.current_academic_year_id === year.id;

  const form = useForm<YearFormValues>({
    resolver: zodResolver(yearSchema),
    defaultValues: {
      name: year?.name ?? "",
      start_date: year?.start_date ?? "",
      end_date: year?.end_date ?? "",
      set_as_current: true,
    },
  });

  useEffect(() => {
    form.reset({
      name: year?.name ?? "",
      start_date: year?.start_date ?? "",
      end_date: year?.end_date ?? "",
      set_as_current: year ? isCurrent : true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year?.id, isCurrent]);

  const watchedName = form.watch("name");
  const duplicateName = useMemo(() => {
    const name = watchedName?.trim().toLowerCase();
    if (!name) return false;
    return years.some(
      (y) => y.name.trim().toLowerCase() === name && y.id !== year?.id,
    );
  }, [years, watchedName, year?.id]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (duplicateName) {
      toast.error("An academic year with this name already exists.");
      return;
    }
    try {
      let yearId = year?.id;
      if (year) {
        await updateYear.mutateAsync({
          id: year.id,
          data: {
            name: values.name.trim(),
            start_date: values.start_date,
            end_date: values.end_date,
          },
        });
      } else {
        const created = await createYear.mutateAsync({
          name: values.name.trim(),
          start_date: values.start_date,
          end_date: values.end_date,
        });
        yearId = created.id;
      }
      if (!yearId) return;
      if (values.set_as_current && settings?.current_academic_year_id !== yearId) {
        await setCurrentYear.mutateAsync(yearId);
      }
      await createDraft.mutateAsync(yearId);
      toast.success(year ? "Academic year updated" : "Academic year created");
      onYearReady(yearId);
    } catch (err) {
      toastError(err, "Could not save the academic year");
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Create Academic Year</CardTitle>
        <CardDescription>
          Create a new academic year with start and end dates. This will be the
          base year for your academic calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ay_name">Academic Year *</Label>
            <Input id="ay_name" {...form.register("name")} placeholder="e.g. 2026-2027" />
            <FieldError message={errors.name?.message} />
            {duplicateName && (
              <p className="text-xs text-destructive">
                An academic year with this name already exists.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ay_start">Start Date *</Label>
              <Input id="ay_start" type="date" {...form.register("start_date")} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ay_end">End Date *</Label>
              <Input id="ay_end" type="date" {...form.register("end_date")} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current Academic Year</Label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={form.watch("set_as_current")}
                onChange={(e) => form.setValue("set_as_current", e.target.checked)}
              />
              <span>Yes, set as current academic year</span>
            </label>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || duplicateName}>
              {isSubmitting ? "Saving…" : "Next →"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
