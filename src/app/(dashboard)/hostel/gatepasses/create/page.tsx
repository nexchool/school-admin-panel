"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Moon,
  Search,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useStudents } from "@/hooks/useStudents";
import { useCreateGatepass } from "@/hooks/useHostel";
import { hostelService } from "@/services/hostelService";
import type {
  GatepassType,
  HostelAllocation,
} from "@/services/hostelService";

/**
 * Screen 6 — Multi-step gatepass creation flow.
 *
 * Step 1: Pick student (warden flow). Auto-resolves their current hostel
 *         and parent phone via student profile + allocation.
 * Step 2: Pick type (day_out / night_out), departure + expected-return.
 * Step 3: Confirm parent contact + reason. Server-side validation
 *         ensures (a) the student has no in-flight gatepass and
 *         (b) expected_return is strictly after departure.
 *
 * On success: navigate to the gatepass detail page so the warden /
 * student can see the audit trail + status.
 */
const gatepassFormSchema = z
  .object({
    student_id: z.string().min(1, "Select a student"),
    type: z.enum(["day_out", "night_out"], { error: "Pick a gatepass type" }),
    departure_datetime: z.string().min(1, "Departure date/time is required"),
    expected_return_datetime: z
      .string()
      .min(1, "Expected return is required"),
    reason: z.string().trim().max(500, "Reason is too long").optional().or(z.literal("")),
    parent_phone: z
      .string()
      .trim()
      .min(7, "Parent phone is required (the gatekeeper will call this number)"),
  })
  .refine(
    (v) =>
      new Date(v.expected_return_datetime).getTime() >
      new Date(v.departure_datetime).getTime(),
    {
      message: "Expected return must be after departure",
      path: ["expected_return_datetime"],
    }
  );

type FormValues = z.infer<typeof gatepassFormSchema>;

function isoLocalNow(offsetMinutes = 0) {
  // Returns "YYYY-MM-DDTHH:mm" suitable for <input type="datetime-local">.
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateGatepassPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [allocation, setAllocation] = useState<HostelAllocation | null>(null);
  const [resolvingAllocation, setResolvingAllocation] = useState(false);

  const studentsQuery = useStudents({
    search: studentSearch.trim() || undefined,
    per_page: 20,
  });
  const createGatepass = useCreateGatepass();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(gatepassFormSchema),
    defaultValues: {
      student_id: "",
      type: "day_out",
      departure_datetime: isoLocalNow(60), // default: an hour from now
      expected_return_datetime: isoLocalNow(60 * 8), // 8 hours later
      reason: "",
      parent_phone: "",
    },
  });

  const studentId = watch("student_id");
  const type = watch("type");

  // Pre-fill parent_phone from the picked student + resolve their allocation.
  useEffect(() => {
    if (!studentId) {
      setAllocation(null);
      return;
    }
    const picked = studentsQuery.data?.items.find((s) => s.id === studentId);
    if (picked?.guardian_phone) {
      setValue("parent_phone", picked.guardian_phone, { shouldValidate: false });
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
  }, [studentId, studentsQuery.data, setValue]);

  // Default departure to 10 PM today for night_out, current time for day_out.
  useEffect(() => {
    if (type === "night_out") {
      const d = new Date();
      d.setHours(22, 0, 0, 0);
      setValue(
        "departure_datetime",
        isoLocalNow(Math.round((d.getTime() - Date.now()) / 60_000))
      );
      const r = new Date(d);
      r.setDate(r.getDate() + 1);
      r.setHours(9, 0, 0, 0);
      setValue(
        "expected_return_datetime",
        isoLocalNow(Math.round((r.getTime() - Date.now()) / 60_000))
      );
    }
  }, [type, setValue]);

  const pickedStudent = useMemo(
    () => studentsQuery.data?.items.find((s) => s.id === studentId),
    [studentsQuery.data, studentId]
  );

  async function onSubmit(values: FormValues) {
    if (!allocation) {
      setError("student_id", {
        message:
          "Selected student has no active hostel allocation — allocate them first.",
      });
      return;
    }
    try {
      const gp = await createGatepass.mutateAsync({
        student_id: values.student_id,
        hostel_id: allocation.hostel_id,
        type: values.type as GatepassType,
        departure_datetime: new Date(values.departure_datetime).toISOString(),
        expected_return_datetime: new Date(
          values.expected_return_datetime
        ).toISOString(),
        reason: values.reason?.trim() || undefined,
        parent_phone: values.parent_phone.trim(),
      });
      router.push(`/hostel/gatepasses/${gp.id}`);
    } catch (err) {
      // The mutation already surfaces ApiException; show inline so the
      // user can correct (e.g., another pending request exists).
      const message = err instanceof Error ? err.message : "Failed to create.";
      setError("student_id", { message });
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/hostel/gatepasses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All gatepasses
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New gatepass</h1>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center gap-2 text-sm">
        <StepDot n={1} label="Student" active={step === 1} done={step > 1} />
        <ChevronRight className="size-4 text-muted-foreground" />
        <StepDot n={2} label="Type & time" active={step === 2} done={step > 2} />
        <ChevronRight className="size-4 text-muted-foreground" />
        <StepDot n={3} label="Confirm" active={step === 3} done={false} />
      </ol>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick the student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
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
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-card">
                    {studentsQuery.isLoading ? (
                      <div className="space-y-2 p-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-9 w-full" />
                        ))}
                      </div>
                    ) : (studentsQuery.data?.items.length ?? 0) === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
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
                                  <CheckCircle2 className="size-4 text-primary" />
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

              {studentId && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  {resolvingAllocation ? (
                    <Skeleton className="h-4 w-2/3" />
                  ) : allocation ? (
                    <p>
                      <CheckCircle2 className="mr-1.5 inline size-4 text-emerald-600" />
                      {pickedStudent?.name} has an active allocation — this gatepass
                      will be filed against their current hostel.
                    </p>
                  ) : (
                    <p className="text-amber-900 dark:text-amber-200">
                      <Info className="mr-1.5 inline size-4" />
                      No active allocation for this student. Allocate them before
                      creating a gatepass.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick the type and times</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <TypeRadio
                      label="Day out"
                      description="Daytime — return same evening"
                      icon={Sun}
                      selected={field.value === "day_out"}
                      onSelect={() => field.onChange("day_out")}
                    />
                    <TypeRadio
                      label="Night out"
                      description="Overnight — security guard calls parent before approval"
                      icon={Moon}
                      selected={field.value === "night_out"}
                      onSelect={() => field.onChange("night_out")}
                    />
                  </div>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="departure_datetime">Departure</Label>
                  <Input
                    id="departure_datetime"
                    type="datetime-local"
                    aria-invalid={Boolean(errors.departure_datetime)}
                    {...register("departure_datetime")}
                  />
                  {errors.departure_datetime && (
                    <p className="text-sm text-destructive">
                      {errors.departure_datetime.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="expected_return_datetime">Expected return</Label>
                  <Input
                    id="expected_return_datetime"
                    type="datetime-local"
                    aria-invalid={Boolean(errors.expected_return_datetime)}
                    {...register("expected_return_datetime")}
                  />
                  {errors.expected_return_datetime && (
                    <p className="text-sm text-destructive">
                      {errors.expected_return_datetime.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                <Info className="mr-1.5 inline size-4" />
                After return time passes, the system marks the gatepass{" "}
                <span className="font-medium">overdue</span> and alerts the warden.
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirm and submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="parent_phone">Parent phone</Label>
                <Input
                  id="parent_phone"
                  placeholder="+91 98xxxxxxxx"
                  aria-invalid={Boolean(errors.parent_phone)}
                  {...register("parent_phone")}
                />
                <p className="text-xs text-muted-foreground">
                  The security guard will call this number to verify before
                  approving night-out gatepasses.
                </p>
                {errors.parent_phone && (
                  <p className="text-sm text-destructive">
                    {errors.parent_phone.message}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="reason">Reason (optional)</Label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="Home visit, family function, hospital, …"
                  className="flex min-h-[64px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("reason")}
                />
              </div>

              <SummaryRow
                label="Student"
                value={
                  pickedStudent
                    ? `${pickedStudent.name} (${pickedStudent.admission_number})`
                    : "—"
                }
              />
              <SummaryRow
                label="Type"
                value={type === "night_out" ? "Night out" : "Day out"}
              />
              <SummaryRow
                label="Departure"
                value={new Date(watch("departure_datetime")).toLocaleString()}
              />
              <SummaryRow
                label="Expected return"
                value={new Date(watch("expected_return_datetime")).toLocaleString()}
              />
            </CardContent>
          </Card>
        )}

        {/* Wizard navigation */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))}
            disabled={step === 1}
          >
            <ChevronLeft className="mr-2 size-4" /> Back
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 1 && !studentId) return;
                setStep((s) => ((s + 1) as 2 | 3));
              }}
              disabled={step === 1 && (!studentId || !allocation)}
            >
              Next <ChevronRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={createGatepass.isPending || !allocation}
            >
              {createGatepass.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CalendarClock className="mr-2 size-4" />
                  Submit gatepass
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="size-3.5" /> : n}
      </span>
      <span className={active ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  );
}

function TypeRadio({
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  icon: typeof Sun;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border-2 p-3 text-left transition-colors hover:bg-muted/40",
        selected ? "border-primary bg-primary/5" : "border-input"
      )}
    >
      <span className="flex items-center gap-2 font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
