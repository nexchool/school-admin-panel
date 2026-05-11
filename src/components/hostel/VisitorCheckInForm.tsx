"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useStudents } from "@/hooks/useStudents";
import { useVisitorSearch } from "@/hooks/useHostel";

import {
  hostelService,
  type HostelVisitor,
  type HostelAllocation,
} from "@/services/hostelService";

const visitorCheckInSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7, "Phone is required (at least 7 digits)"),
  name: z.string().trim().min(1, "Visitor name is required"),
  relation_type: z.string().trim().optional().or(z.literal("")),
  student_id: z.string().min(1, "Select the student being visited"),
  purpose: z.string().trim().optional().or(z.literal("")),
});

export type VisitorCheckInValues = z.infer<typeof visitorCheckInSchema>;

type VisitorCheckInFormProps = {
  /** Called with the resolved input ready for the backend. */
  onSubmit: (input: {
    phone: string;
    name: string;
    relation_type?: string;
    student_id: string;
    hostel_id: string;
    room_id?: string;
    purpose?: string;
  }) => Promise<void>;
  saving?: boolean;
};

/**
 * Two-step visitor check-in flow:
 *   1. Phone (auto-suggest from past visits).
 *   2. Name / relation (pre-filled if visitor is recognised).
 *   3. Student (search + select). Hostel + room are auto-derived
 *      from the student's current allocation.
 */
export function VisitorCheckInForm({ onSubmit, saving }: VisitorCheckInFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VisitorCheckInValues>({
    resolver: zodResolver(visitorCheckInSchema),
    defaultValues: {
      phone: "",
      name: "",
      relation_type: "",
      student_id: "",
      purpose: "",
    },
  });

  const phoneValue = watch("phone").trim();
  const studentId = watch("student_id");

  // Phone auto-suggest.
  const visitorSearch = useVisitorSearch(phoneValue.length >= 3 ? phoneValue : "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  function applyVisitor(v: HostelVisitor) {
    setValue("phone", v.phone, { shouldValidate: true });
    setValue("name", v.name, { shouldValidate: true });
    if (v.relation_type) setValue("relation_type", v.relation_type);
    setSuggestionsOpen(false);
  }

  // Student search.
  const [studentSearch, setStudentSearch] = useState("");
  const studentsQuery = useStudents({
    search: studentSearch.trim() || undefined,
    per_page: 15,
  });

  // Once a student is selected, fetch their current allocation to
  // auto-resolve hostel + room.
  const [allocation, setAllocation] = useState<HostelAllocation | null>(null);
  const [resolvingAllocation, setResolvingAllocation] = useState(false);
  useEffect(() => {
    if (!studentId) {
      setAllocation(null);
      return;
    }
    let cancelled = false;
    setResolvingAllocation(true);
    hostelService
      .getStudentAllocation(studentId)
      .then((a) => {
        if (!cancelled) setAllocation(a);
      })
      .catch(() => {
        if (!cancelled) setAllocation(null);
      })
      .finally(() => {
        if (!cancelled) setResolvingAllocation(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const selectedStudent = useMemo(
    () => studentsQuery.data?.items.find((s) => s.id === studentId),
    [studentsQuery.data, studentId]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4 text-muted-foreground" />
          Check in a visitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(async (values) => {
            if (!allocation) {
              window.alert(
                "Selected student has no active allocation — cannot record a visit."
              );
              return;
            }
            await onSubmit({
              phone: values.phone.trim(),
              name: values.name.trim(),
              relation_type: values.relation_type?.trim() || undefined,
              student_id: values.student_id,
              hostel_id: allocation.hostel_id,
              room_id: allocation.room_id,
              purpose: values.purpose?.trim() || undefined,
            });
            reset();
            setStudentSearch("");
            setAllocation(null);
          })}
        >
          {/* Phone with auto-suggest */}
          <div className="relative grid gap-1.5 sm:col-span-1">
            <Label htmlFor="phone">Visitor phone</Label>
            <Input
              id="phone"
              placeholder="+91 98xxxxxxxx"
              autoComplete="off"
              aria-invalid={Boolean(errors.phone)}
              onFocus={() => setSuggestionsOpen(true)}
              {...register("phone", {
                onChange: () => setSuggestionsOpen(true),
              })}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
            {suggestionsOpen && (visitorSearch.data?.length ?? 0) > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow">
                <ul role="listbox">
                  {visitorSearch.data!.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => applyVisitor(v)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span>
                          <span className="font-medium">{v.name}</span>
                          <span className="ml-2 text-muted-foreground">
                            {v.phone}
                          </span>
                        </span>
                        {v.relation_type && (
                          <span className="text-xs text-muted-foreground">
                            {v.relation_type}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid gap-1.5 sm:col-span-1">
            <Label htmlFor="name">Visitor name</Label>
            <Input
              id="name"
              placeholder="Mr. Rajendra Kumar"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-1.5 sm:col-span-1">
            <Label htmlFor="relation">Relation (optional)</Label>
            <Input
              id="relation"
              placeholder="father, mother, sibling…"
              {...register("relation_type")}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-1">
            <Label htmlFor="purpose">Purpose (optional)</Label>
            <Input
              id="purpose"
              placeholder="General visit, document drop-off…"
              {...register("purpose")}
            />
          </div>

          {/* Student picker */}
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="student-search">Student being visited</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="student-search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or admission number…"
                className="pl-9"
              />
            </div>

            <Controller
              name="student_id"
              control={control}
              render={({ field }) => (
                <div className="max-h-44 overflow-y-auto rounded-md border bg-card">
                  {studentsQuery.isLoading ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : (studentsQuery.data?.items.length ?? 0) === 0 ? (
                    <p className="p-3 text-center text-sm text-muted-foreground">
                      No students match.
                    </p>
                  ) : (
                    <ul role="listbox">
                      {studentsQuery.data!.items.map((s) => {
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

          {/* Allocation summary / warning */}
          {studentId && (
            <div className="sm:col-span-2">
              {resolvingAllocation ? (
                <Skeleton className="h-12 w-full" />
              ) : allocation ? (
                <p className="rounded-md border bg-muted/30 p-3 text-sm">
                  <span className="font-medium">Allocation:</span>{" "}
                  {selectedStudent?.name ?? "Student"} is currently in this
                  hostel and room — visit will be recorded there.
                </p>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  This student has no active hostel allocation. Allocate them
                  first before recording a visit.
                </p>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={saving || !allocation}
              className="w-full sm:w-auto"
            >
              {saving ? "Checking in…" : "Check in visitor"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
