"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useStudentSearch } from "@/hooks/useStudents";

/**
 * Allocate a student to a specific bed.
 *
 * The dialog is opened with a known bed already selected (the caller
 * knows which bed the user clicked). The user picks the student via a
 * search-filtered list. Backend service rejects allocations when the
 * student already has an active allocation or the bed is occupied — we
 * surface those errors via onSubmit's rejection.
 */
const allocationFormSchema = z.object({
  student_id: z.string().min(1, "Pick a student to allocate."),
  check_in_at: z.string().min(1, "Check-in date is required."),
  notes: z.string().optional().or(z.literal("")),
});

export type AllocationFormValues = z.infer<typeof allocationFormSchema>;

type AllocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bedLabel: string; // e.g. "Bed A1"
  roomLabel?: string; // e.g. "Room 101"
  hostelName?: string;
  onSubmit: (values: AllocationFormValues) => Promise<void>;
  saving?: boolean;
};

export function AllocationDialog({
  open,
  onOpenChange,
  bedLabel,
  roomLabel,
  hostelName,
  onSubmit,
  saving,
}: AllocationDialogProps) {
  const [search, setSearch] = useState("");
  const studentsQuery = useStudentSearch({
    search: search.trim() || undefined,
    per_page: 25,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    register,
  } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      student_id: "",
      check_in_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        student_id: "",
        check_in_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setSearch("");
    }
  }, [open, reset]);

  const students = useMemo(
    () => studentsQuery.data?.items ?? [],
    [studentsQuery.data]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form
          onSubmit={handleSubmit(async (values) => {
            // The backend expects ISO 8601 datetime; check_in_at is a date
            // input. Anchor to noon UTC so the calendar date never shifts a day
            // when serialized (local midnight + toISOString() lands on the
            // previous day in IST / any positive-offset zone).
            const checkInIso = new Date(`${values.check_in_at}T12:00:00Z`).toISOString();
            await onSubmit({ ...values, check_in_at: checkInIso });
          })}
        >
          <DialogHeader>
            <DialogTitle>Allocate student to {bedLabel}</DialogTitle>
            <DialogDescription>
              {hostelName && roomLabel
                ? `${hostelName} · ${roomLabel}`
                : "Select a student from the list below."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Student search */}
            <div className="grid gap-1.5">
              <Label htmlFor="student-search">Student</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="student-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or admission number…"
                  className="pl-9"
                />
              </div>

              <Controller
                name="student_id"
                control={control}
                render={({ field }) => (
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-card">
                    {studentsQuery.isLoading ? (
                      <div className="space-y-2 p-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-9 w-full" />
                        ))}
                      </div>
                    ) : students.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        No students match.
                      </p>
                    ) : (
                      <ul role="listbox" aria-label="Students">
                        {students.map((s) => {
                          const selected = field.value === s.id;
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => field.onChange(s.id)}
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
                                  selected && "bg-primary/10"
                                )}
                              >
                                <span className="truncate">
                                  <span className="font-medium">{s.name}</span>
                                  <span className="ml-2 text-muted-foreground">
                                    {s.admission_number}
                                  </span>
                                </span>
                                {selected && (
                                  <span className="shrink-0 text-xs font-semibold text-primary">
                                    Selected
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              />
              {errors.student_id && (
                <p className="text-sm text-destructive">
                  {errors.student_id.message}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="check_in_at">Check-in date</Label>
              <Input
                id="check_in_at"
                type="date"
                aria-invalid={Boolean(errors.check_in_at)}
                {...register("check_in_at")}
              />
              {errors.check_in_at && (
                <p className="text-sm text-destructive">
                  {errors.check_in_at.message}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                placeholder="Any context for the warden (medical, transfer, etc.)"
                rows={3}
                className="flex min-h-[64px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                {...register("notes")}
              />
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
              {saving ? "Allocating…" : "Allocate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
