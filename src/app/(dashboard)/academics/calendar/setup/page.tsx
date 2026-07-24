"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAcademicCalendarState,
  usePublishCalendar,
  useUpdateCalendar,
} from "@/hooks/useAcademicCalendar";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { toastError } from "@/lib/errorToast";
import type { PublishResult } from "@/services/academicCalendarService";

import { SetupStepper } from "@/components/academics/calendar/SetupStepper";
import { StepAcademicYear } from "@/components/academics/calendar/steps/StepAcademicYear";
import { StepWeeklyHolidays } from "@/components/academics/calendar/steps/StepWeeklyHolidays";
import { StepPublicHolidays } from "@/components/academics/calendar/steps/StepPublicHolidays";
import { StepVacations } from "@/components/academics/calendar/steps/StepVacations";
import { StepSemesters } from "@/components/academics/calendar/steps/StepSemesters";
import { StepExamWindows } from "@/components/academics/calendar/steps/StepExamWindows";
import { StepSchoolEvents } from "@/components/academics/calendar/steps/StepSchoolEvents";
import { StepReview } from "@/components/academics/calendar/steps/StepReview";

// Step indices: 0..7 map to server wizard steps 1..8; 8 is the frontend-only
// generate/success stage.
const REVIEW_STEP = 7;
const GENERATE_STEP = 8;

function CalendarSetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");

  const [academicYearId, setAcademicYearId] = useState<string | null>(yearParam);
  const [step, setStep] = useState(0);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [resumed, setResumed] = useState(false);

  const { data: years = [] } = useAcademicYears();
  const { data: calendar, isLoading: calendarLoading } =
    useAcademicCalendarState(academicYearId ?? undefined);
  const updateCalendar = useUpdateCalendar();
  const publishCalendar = usePublishCalendar();

  const year = years.find((y) => y.id === academicYearId) ?? null;

  // Resume where the admin left off (adjust state during render, once, when
  // the calendar first arrives for an explicitly requested year).
  if (calendar && yearParam && !resumed) {
    setResumed(true);
    setStep(Math.min(calendar.current_step, REVIEW_STEP + 1) - 1);
  }

  const persistStep = (nextIndex: number) => {
    if (calendar) {
      updateCalendar.mutate({
        id: calendar.id,
        data: { current_step: Math.min(nextIndex + 1, REVIEW_STEP + 1) },
      });
    }
  };

  const goNext = () => {
    const next = Math.min(step + 1, REVIEW_STEP);
    persistStep(next);
    setStep(next);
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleGenerate = () => {
    if (!calendar) return;
    setStep(GENERATE_STEP);
    publishCalendar.mutate(calendar.id, {
      onSuccess: (result) => setPublishResult(result),
      onError: (err) => {
        toastError(err, "Calendar validation failed");
        setStep(REVIEW_STEP);
      },
    });
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <StepAcademicYear
          year={year}
          onCancel={() => router.push("/academics/calendar")}
          onYearReady={(yearId) => {
            setAcademicYearId(yearId);
            setStep(1);
          }}
        />
      );
    }

    if (!academicYearId) return null;
    if (calendarLoading || !calendar) {
      return <Skeleton className="mx-auto h-64 max-w-3xl" />;
    }

    switch (step) {
      case 1:
        return <StepWeeklyHolidays calendar={calendar} />;
      case 2:
        return <StepPublicHolidays academicYearId={academicYearId} />;
      case 3:
        return <StepVacations academicYearId={academicYearId} />;
      case 4:
        return <StepSemesters academicYearId={academicYearId} />;
      case 5:
        return <StepExamWindows academicYearId={academicYearId} />;
      case 6:
        return <StepSchoolEvents academicYearId={academicYearId} />;
      case REVIEW_STEP:
        return <StepReview calendar={calendar} />;
      case GENERATE_STEP:
        return renderGenerate();
      default:
        return null;
    }
  };

  const renderGenerate = () => {
    if (publishCalendar.isPending) {
      return (
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Generating calendar…</p>
              <p className="text-sm text-muted-foreground">
                Please wait, this may take a few seconds.
              </p>
            </div>
            <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
              Calendar will include working days, holidays, vacations, exams and events.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!publishResult) return null;
    const { summary } = publishResult;
    const stats = [
      { label: "Working Days", value: summary.working_days },
      { label: "Weekly Holidays", value: summary.weekly_holiday_days },
      { label: "Public Holidays", value: summary.public_holiday_days },
      { label: "Vacation Days", value: summary.vacation_days },
      { label: "Exam Days", value: summary.exam_days },
      { label: "Events", value: summary.event_count },
    ];

    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle>
                Academic Calendar — {summary.academic_year.name} is ready and active
              </CardTitle>
              <CardDescription>All modules will now use this calendar.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-md border border-border p-3 text-center">
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild>
              <Link href="/academics/calendar">
                <CalendarCheck className="mr-2 h-4 w-4" /> View Full Calendar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const showNav = step >= 1 && step <= REVIEW_STEP;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Academic Calendar Setup</h1>
        <p className="text-sm text-muted-foreground">
          Academics › Academic Calendar › Setup
        </p>
      </div>

      <SetupStepper activeStep={step} />

      {calendar?.status === "published" && step < GENERATE_STEP && (
        <p className="mx-auto max-w-3xl rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          This calendar is already published. Any changes here take effect after
          you generate the calendar again from the review step.
        </p>
      )}

      {renderStep()}

      {showNav && (
        <div className="mx-auto flex max-w-3xl justify-between">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step === REVIEW_STEP ? (
            <Button onClick={handleGenerate} disabled={publishCalendar.isPending}>
              Generate Calendar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={goNext}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CalendarSetupPage() {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96" />}>
      <CalendarSetupWizard />
    </Suspense>
  );
}
